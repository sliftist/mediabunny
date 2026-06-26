/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AudioCodec, VideoCodec } from '../codec.js';
import { Demuxer } from '../demuxer.js';
import { Input } from '../input.js';
import { InputTrackBacking } from '../input-track.js';
import { PacketRetrievalOptions } from '../media-sink.js';
import { MetadataTags } from '../metadata.js';
import { Reader } from '../reader.js';
type AviStream = {
    index: number;
    type: 'video' | 'audio' | 'other';
    fccHandler: string;
    scale: number;
    rate: number;
    start: number;
    length: number;
    sampleSize: number;
    width: number;
    height: number;
    compression: string;
    codecPrivate: Uint8Array | null;
    formatTag: number;
    channels: number;
    sampleRate: number;
    avgBytesPerSec: number;
    blockAlign: number;
    superIndex: {
        offset: number;
        size: number;
    }[];
    samples: AviSample[];
    backing: InputTrackBacking | null;
};
type AviSample = {
    offset: number;
    size: number;
    key: boolean;
    timestamp: number;
    duration: number;
    sequenceNumber: number;
};
export declare class AviDemuxer extends Demuxer {
    reader: Reader;
    metadataPromise: Promise<void> | null;
    streams: AviStream[];
    trackBackings: InputTrackBacking[];
    metadataTags: MetadataTags;
    constructor(input: Input);
    private slice;
    readMetadata(): Promise<void>;
    private parseHdrl;
    private parseStrl;
    private parseSuperIndex;
    private parseOpenDmlIndex;
    private parseIdx1;
    private scanMovi;
    private assignTimestamps;
    private assignInterleavedAudioTimestamps;
    private assignByteClockAudioTimestamps;
    private buildTrackBackings;
    videoCodecFor(stream: AviStream): VideoCodec | null;
    audioCodecFor(stream: AviStream): AudioCodec | null;
    readSampleData(sample: AviSample, options: PacketRetrievalOptions): Promise<Uint8Array>;
    getMimeType(): Promise<string>;
    getTrackBackings(): Promise<InputTrackBacking[]>;
    getMetadataTags(): Promise<MetadataTags>;
}
export {};
//# sourceMappingURL=avi-demuxer.d.ts.map