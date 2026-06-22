/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Demuxer } from '../demuxer';
import { DEFAULT_TRACK_DISPOSITION } from '../metadata';
import { assert, binarySearchLessOrEqual, UNDETERMINED_LANGUAGE } from '../misc';
import { EncodedPacket, PLACEHOLDER_DATA } from '../packet';
import { readAscii, readBytes, readI32Le, readU16, readU32 } from '../reader';
const AVIIF_KEYFRAME = 0x10;
const WAVE_FORMAT_MP3 = 0x0055;
const WAVE_FORMAT_MP3_ALT = 0x0050; // MPEG Layer-1/2 tag, occasionally seen for layer 3 too
// FourCCs (in biCompression / strh fccHandler) that denote MPEG-4 Part 2 (ASP).
const MP4V_FOURCCS = new Set([
    'XVID', 'xvid', 'DIVX', 'divx', 'DX50', 'dx50', 'MP4V', 'mp4v',
    'FMP4', 'fmp4', 'XVIX', '3IV2', 'DXGM', 'MP4S', 'M4S2', 'DM4V',
]);
export class AviDemuxer extends Demuxer {
    constructor(input) {
        super(input);
        this.metadataPromise = null;
        this.streams = [];
        this.trackBackings = [];
        this.metadataTags = {};
        this.reader = input._reader;
    }
    async slice(pos, len) {
        let s = this.reader.requestSlice(pos, len);
        if (s instanceof Promise)
            s = await s;
        return s;
    }
    async readMetadata() {
        return this.metadataPromise ??= (async () => {
            const head = await this.slice(0, 12);
            assert(head);
            const riff = readAscii(head, 4);
            if (riff !== 'RIFF') {
                throw new Error('Invalid AVI file - missing RIFF header');
            }
            readU32(head, true); // overall size (unreliable, ignore)
            const formType = readAscii(head, 4);
            if (formType !== 'AVI ' && formType !== 'AVIX') {
                throw new Error('Invalid AVI file - form type is not "AVI "');
            }
            const fileSize = this.reader.fileSize ?? Infinity;
            let pos = 12;
            let moviDataStart = -1;
            let idx1Pos = -1;
            let idx1Size = 0;
            // Walk the top-level RIFF chunks: hdrl (LIST), movi (LIST), idx1.
            while (pos + 8 <= fileSize) {
                const hdr = await this.slice(pos, 8);
                if (!hdr)
                    break;
                const ckId = readAscii(hdr, 4);
                const ckSize = readU32(hdr, true);
                const dataStart = pos + 8;
                if (ckId === 'LIST') {
                    const listHdr = await this.slice(dataStart, 4);
                    if (!listHdr)
                        break;
                    const listType = readAscii(listHdr, 4);
                    if (listType === 'hdrl') {
                        await this.parseHdrl(dataStart + 4, ckSize - 4);
                    }
                    else if (listType === 'movi') {
                        moviDataStart = dataStart + 4;
                    }
                }
                else if (ckId === 'idx1') {
                    idx1Pos = dataStart;
                    idx1Size = ckSize;
                }
                pos = dataStart + ckSize + (ckSize & 1); // word-aligned padding
            }
            if (this.streams.length === 0) {
                throw new Error('Invalid AVI file - no streams found');
            }
            if (moviDataStart === -1) {
                throw new Error('Invalid AVI file - missing "movi" list');
            }
            if (idx1Pos !== -1) {
                await this.parseIdx1(idx1Pos, idx1Size, moviDataStart);
            }
            else {
                await this.scanMovi(moviDataStart, fileSize);
            }
            this.assignTimestamps();
            this.buildTrackBackings();
        })();
    }
    async parseHdrl(start, size) {
        let pos = start;
        const end = start + size;
        let currentStream = null;
        while (pos + 8 <= end) {
            const hdr = await this.slice(pos, 8);
            if (!hdr)
                break;
            const ckId = readAscii(hdr, 4);
            const ckSize = readU32(hdr, true);
            const dataStart = pos + 8;
            if (ckId === 'LIST') {
                const listHdr = await this.slice(dataStart, 4);
                if (listHdr && readAscii(listHdr, 4) === 'strl') {
                    currentStream = {
                        index: this.streams.length,
                        type: 'other', fccHandler: '', scale: 1, rate: 1, start: 0, length: 0, sampleSize: 0,
                        width: 0, height: 0, compression: '', codecPrivate: null,
                        formatTag: 0, channels: 0, sampleRate: 0, avgBytesPerSec: 0, blockAlign: 0,
                        samples: [], backing: null,
                    };
                    this.streams.push(currentStream);
                    await this.parseStrl(dataStart + 4, ckSize - 4, currentStream);
                }
            }
            // (avih is parsed implicitly; we don't currently need its fields.)
            pos = dataStart + ckSize + (ckSize & 1);
        }
    }
    async parseStrl(start, size, stream) {
        let pos = start;
        const end = start + size;
        while (pos + 8 <= end) {
            const hdr = await this.slice(pos, 8);
            if (!hdr)
                break;
            const ckId = readAscii(hdr, 4);
            const ckSize = readU32(hdr, true);
            const dataStart = pos + 8;
            if (ckId === 'strh') {
                const s = await this.slice(dataStart, ckSize);
                if (s) {
                    const fccType = readAscii(s, 4);
                    stream.fccHandler = readAscii(s, 4);
                    readU32(s, true); // flags
                    readU16(s, true); // priority
                    readU16(s, true); // language
                    readU32(s, true); // initial frames
                    stream.scale = readU32(s, true) || 1;
                    stream.rate = readU32(s, true) || 1;
                    stream.start = readU32(s, true);
                    stream.length = readU32(s, true);
                    readU32(s, true); // suggested buffer size
                    readU32(s, true); // quality
                    stream.sampleSize = readU32(s, true);
                    stream.type = fccType === 'vids' ? 'video' : fccType === 'auds' ? 'audio' : 'other';
                }
            }
            else if (ckId === 'strf') {
                const s = await this.slice(dataStart, ckSize);
                if (s) {
                    if (stream.type === 'video') {
                        const biSize = readU32(s, true);
                        stream.width = readI32Le(s);
                        stream.height = readI32Le(s);
                        readU16(s, true); // planes
                        readU16(s, true); // bit count
                        stream.compression = readAscii(s, 4);
                        // Extra bytes after the 40-byte BITMAPINFOHEADER are codec
                        // private data (e.g. an MPEG-4 VOL header).
                        if (biSize > 40 && ckSize > 40) {
                            const extra = await this.slice(dataStart + 40, Math.min(biSize, ckSize) - 40);
                            if (extra) {
                                stream.codecPrivate = readBytes(extra, Math.min(biSize, ckSize) - 40);
                            }
                        }
                    }
                    else if (stream.type === 'audio') {
                        stream.formatTag = readU16(s, true);
                        stream.channels = readU16(s, true);
                        stream.sampleRate = readU32(s, true);
                        stream.avgBytesPerSec = readU32(s, true);
                        stream.blockAlign = readU16(s, true);
                    }
                }
            }
            pos = dataStart + ckSize + (ckSize & 1);
        }
    }
    async parseIdx1(idx1Pos, idx1Size, moviDataStart) {
        const count = Math.floor(idx1Size / 16);
        if (count === 0) {
            return;
        }
        const s = await this.slice(idx1Pos, count * 16);
        if (!s) {
            return await this.scanMovi(moviDataStart, this.reader.fileSize ?? Infinity);
        }
        // idx1 offsets are usually relative to the start of the 'movi' list
        // (the 4 bytes 'movi'), i.e. base = moviDataStart - 4. But some muxers
        // write absolute file offsets. Detect by checking the first entry.
        const firstStart = s.filePos;
        readAscii(s, 4);
        readU32(s, true);
        const firstOffset = readU32(s, true);
        s.filePos = firstStart;
        const baseRelative = moviDataStart - 4;
        // Probe: does base+offset land on a chunk header matching the entry id?
        let base = baseRelative;
        {
            const probe = await this.slice(baseRelative + firstOffset, 4);
            const probeAbs = await this.slice(firstOffset, 4);
            const entryId = (() => { const t = s.filePos; const id = readAscii(s, 4); s.filePos = t; return id; })();
            if (probe && readAscii(probe, 4) === entryId) {
                base = baseRelative;
            }
            else if (probeAbs && readAscii(probeAbs, 4) === entryId) {
                base = 0;
            }
        }
        for (let i = 0; i < count; i++) {
            const ckId = readAscii(s, 4);
            const flags = readU32(s, true);
            const offset = readU32(s, true);
            const size = readU32(s, true);
            const streamIdx = parseInt(ckId.substring(0, 2), 10);
            const stream = this.streams[streamIdx];
            if (!stream || Number.isNaN(streamIdx) || size === 0) {
                continue; // skip empty/padding chunks (e.g. 0-byte audio entries)
            }
            // offset points at the chunk header (4cc + size); data follows 8 bytes later.
            stream.samples.push({
                offset: base + offset + 8,
                size,
                key: (flags & AVIIF_KEYFRAME) !== 0,
                timestamp: 0,
                duration: 0,
                sequenceNumber: stream.samples.length,
            });
        }
    }
    // Fallback when there's no idx1: linearly walk the movi chunk headers.
    async scanMovi(moviDataStart, fileSize) {
        let pos = moviDataStart;
        while (pos + 8 <= fileSize) {
            const hdr = await this.slice(pos, 8);
            if (!hdr)
                break;
            const ckId = readAscii(hdr, 4);
            const ckSize = readU32(hdr, true);
            const dataStart = pos + 8;
            if (ckId === 'LIST') {
                // 'rec ' grouping — descend into it.
                pos = dataStart + 4;
                continue;
            }
            const streamIdx = parseInt(ckId.substring(0, 2), 10);
            const stream = this.streams[streamIdx];
            if (stream && !Number.isNaN(streamIdx) && ckSize > 0) {
                stream.samples.push({
                    offset: dataStart, size: ckSize, key: true,
                    timestamp: 0, duration: 0, sequenceNumber: stream.samples.length,
                });
            }
            pos = dataStart + ckSize + (ckSize & 1);
        }
    }
    assignTimestamps() {
        for (const stream of this.streams) {
            if (stream.type === 'video') {
                const frameDur = stream.scale / stream.rate;
                for (let i = 0; i < stream.samples.length; i++) {
                    stream.samples[i].timestamp = (stream.start + i) * frameDur;
                    stream.samples[i].duration = frameDur;
                }
            }
            else if (stream.type === 'audio') {
                // CBR byte-clock timing: timestamp = bytes-so-far / avgBytesPerSec.
                const bps = stream.avgBytesPerSec
                    || (stream.sampleRate * stream.channels * 2)
                    || 1;
                let cumBytes = 0;
                for (const sample of stream.samples) {
                    sample.timestamp = cumBytes / bps;
                    sample.duration = sample.size / bps;
                    cumBytes += sample.size;
                }
            }
        }
    }
    buildTrackBackings() {
        for (const stream of this.streams) {
            if (stream.type === 'video' && stream.samples.length > 0) {
                stream.backing = new AviVideoTrackBacking(this, stream);
                this.trackBackings.push(stream.backing);
            }
            else if (stream.type === 'audio' && stream.samples.length > 0) {
                stream.backing = new AviAudioTrackBacking(this, stream);
                this.trackBackings.push(stream.backing);
            }
        }
    }
    videoCodecFor(stream) {
        const fourcc = stream.compression || stream.fccHandler;
        if (MP4V_FOURCCS.has(fourcc)) {
            return 'mp4v';
        }
        return null;
    }
    audioCodecFor(stream) {
        if (stream.formatTag === WAVE_FORMAT_MP3 || stream.formatTag === WAVE_FORMAT_MP3_ALT) {
            return 'mp3';
        }
        return null;
    }
    async readSampleData(sample, options) {
        if (options.metadataOnly) {
            return PLACEHOLDER_DATA;
        }
        const s = await this.slice(sample.offset, sample.size);
        assert(s);
        return readBytes(s, sample.size);
    }
    async getMimeType() {
        return 'video/x-msvideo';
    }
    async getTrackBackings() {
        await this.readMetadata();
        return this.trackBackings;
    }
    async getMetadataTags() {
        await this.readMetadata();
        return this.metadataTags;
    }
}
// --- shared packet-table logic for both track types ---
const makePacket = (demuxer, stream, index, options) => {
    const sample = stream.samples[index];
    if (!sample) {
        return Promise.resolve(null);
    }
    return demuxer.readSampleData(sample, options).then(data => new EncodedPacket(data, sample.key ? 'key' : 'delta', sample.timestamp, sample.duration, sample.sequenceNumber, sample.size));
};
const packetIndexForTimestamp = (stream, timestamp) => {
    // samples are in increasing timestamp order (decode order == file order)
    return binarySearchLessOrEqual(stream.samples, timestamp, s => s.timestamp);
};
class AviVideoTrackBacking {
    constructor(demuxer, stream) {
        this.demuxer = demuxer;
        this.stream = stream;
    }
    getType() { return 'video'; }
    getId() { return this.stream.index + 1; }
    getNumber() { return this.stream.index + 1; }
    getCodec() { return this.demuxer.videoCodecFor(this.stream); }
    getInternalCodecId() { return this.stream.compression || this.stream.fccHandler; }
    getCodedWidth() { return this.stream.width; }
    getCodedHeight() { return Math.abs(this.stream.height); }
    getSquarePixelWidth() { return this.stream.width; }
    getSquarePixelHeight() { return Math.abs(this.stream.height); }
    getRotation() { return 0; }
    async getColorSpace() { return {}; }
    async canBeTransparent() { return false; }
    async getDecoderConfig() {
        const codec = this.demuxer.videoCodecFor(this.stream);
        if (!codec) {
            return null;
        }
        return {
            codec,
            codedWidth: this.stream.width,
            codedHeight: Math.abs(this.stream.height),
            description: this.stream.codecPrivate ?? undefined,
        };
    }
    getName() { return null; }
    getLanguageCode() { return UNDETERMINED_LANGUAGE; }
    getTimeResolution() { return this.stream.rate / this.stream.scale; }
    isRelativeToUnixEpoch() { return false; }
    getUnixTimeForTimestamp() { return null; }
    getDisposition() { return { ...DEFAULT_TRACK_DISPOSITION }; }
    getPairingMask() { return 1n << BigInt(this.stream.index); }
    getBitrate() { return null; }
    getAverageBitrate() { return null; }
    async getLiveRefreshInterval() { return null; }
    async getDurationFromMetadata() {
        const last = this.stream.samples[this.stream.samples.length - 1];
        return last ? last.timestamp + last.duration : 0;
    }
    getFirstPacket(options) {
        return makePacket(this.demuxer, this.stream, 0, options);
    }
    getPacket(timestamp, options) {
        const i = packetIndexForTimestamp(this.stream, timestamp);
        if (i < 0) {
            return Promise.resolve(null);
        }
        return makePacket(this.demuxer, this.stream, i, options);
    }
    getNextPacket(packet, options) {
        return makePacket(this.demuxer, this.stream, packet.sequenceNumber + 1, options);
    }
    async getKeyPacket(timestamp, options) {
        let i = packetIndexForTimestamp(this.stream, timestamp);
        while (i >= 0 && !this.stream.samples[i].key) {
            i--;
        }
        if (i < 0) {
            return null;
        }
        return makePacket(this.demuxer, this.stream, i, options);
    }
    async getNextKeyPacket(packet, options) {
        let i = packet.sequenceNumber + 1;
        while (i < this.stream.samples.length && !this.stream.samples[i].key) {
            i++;
        }
        if (i >= this.stream.samples.length) {
            return null;
        }
        return makePacket(this.demuxer, this.stream, i, options);
    }
}
class AviAudioTrackBacking {
    constructor(demuxer, stream) {
        this.demuxer = demuxer;
        this.stream = stream;
    }
    getType() { return 'audio'; }
    getId() { return this.stream.index + 1; }
    getNumber() { return this.stream.index + 1; }
    getCodec() { return this.demuxer.audioCodecFor(this.stream); }
    getInternalCodecId() { return this.stream.formatTag; }
    getNumberOfChannels() { return this.stream.channels; }
    getSampleRate() { return this.stream.sampleRate; }
    async getDecoderConfig() {
        const codec = this.demuxer.audioCodecFor(this.stream);
        if (!codec) {
            return null;
        }
        return {
            codec,
            numberOfChannels: this.stream.channels,
            sampleRate: this.stream.sampleRate,
        };
    }
    getName() { return null; }
    getLanguageCode() { return UNDETERMINED_LANGUAGE; }
    getTimeResolution() { return this.stream.sampleRate || 1; }
    isRelativeToUnixEpoch() { return false; }
    getUnixTimeForTimestamp() { return null; }
    getDisposition() { return { ...DEFAULT_TRACK_DISPOSITION }; }
    getPairingMask() { return 1n << BigInt(this.stream.index); }
    getBitrate() { return null; }
    getAverageBitrate() { return this.stream.avgBytesPerSec ? this.stream.avgBytesPerSec * 8 : null; }
    async getLiveRefreshInterval() { return null; }
    async getDurationFromMetadata() {
        const last = this.stream.samples[this.stream.samples.length - 1];
        return last ? last.timestamp + last.duration : 0;
    }
    getFirstPacket(options) {
        return makePacket(this.demuxer, this.stream, 0, options);
    }
    getPacket(timestamp, options) {
        const i = packetIndexForTimestamp(this.stream, timestamp);
        if (i < 0) {
            return Promise.resolve(null);
        }
        return makePacket(this.demuxer, this.stream, i, options);
    }
    getNextPacket(packet, options) {
        return makePacket(this.demuxer, this.stream, packet.sequenceNumber + 1, options);
    }
    getKeyPacket(timestamp, options) {
        return this.getPacket(timestamp, options);
    }
    getNextKeyPacket(packet, options) {
        return this.getNextPacket(packet, options);
    }
}
