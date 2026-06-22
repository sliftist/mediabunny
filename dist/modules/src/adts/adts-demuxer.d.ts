/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { AudioCodec } from '../codec';
import { Demuxer } from '../demuxer';
import { Input } from '../input';
import { InputAudioTrackBacking } from '../input-track';
import { PacketRetrievalOptions } from '../media-sink';
import { MetadataTags } from '../metadata';
import { AsyncMutex } from '../misc';
import { EncodedPacket } from '../packet';
import { Reader } from '../reader';
import { AdtsFrameHeader } from './adts-reader';
export declare const SAMPLES_PER_AAC_FRAME = 1024;
type Sample = {
    timestamp: number;
    duration: number;
    dataStart: number;
    dataSize: number;
};
export declare class AdtsDemuxer extends Demuxer {
    reader: Reader;
    metadataPromise: Promise<void> | null;
    firstFrameHeader: AdtsFrameHeader | null;
    loadedSamples: Sample[];
    metadataTags: MetadataTags | null;
    trackBackings: AdtsAudioTrackBacking[];
    readingMutex: AsyncMutex;
    lastSampleLoaded: boolean;
    lastLoadedPos: number;
    nextTimestampInSamples: number;
    constructor(input: Input);
    readMetadata(): Promise<void>;
    advanceReader(): Promise<void>;
    getMimeType(): Promise<string>;
    getTrackBackings(): Promise<AdtsAudioTrackBacking[]>;
    getMetadataTags(): Promise<MetadataTags>;
}
declare class AdtsAudioTrackBacking implements InputAudioTrackBacking {
    demuxer: AdtsDemuxer;
    constructor(demuxer: AdtsDemuxer);
    getType(): "audio";
    getId(): number;
    getNumber(): number;
    getTimeResolution(): number;
    isRelativeToUnixEpoch(): boolean;
    getUnixTimeForTimestamp(): null;
    getPairingMask(): bigint;
    getBitrate(): null;
    getAverageBitrate(): null;
    getDurationFromMetadata(): Promise<null>;
    getLiveRefreshInterval(): Promise<null>;
    getName(): null;
    getLanguageCode(): string;
    getCodec(): AudioCodec;
    getInternalCodecId(): number;
    getNumberOfChannels(): number;
    getSampleRate(): number;
    getDisposition(): {
        default: boolean;
        primary: boolean;
        forced: boolean;
        original: boolean;
        commentary: boolean;
        hearingImpaired: boolean;
        visuallyImpaired: boolean;
    };
    getDecoderConfig(): Promise<AudioDecoderConfig>;
    getPacketAtIndex(sampleIndex: number, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getFirstPacket(options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getNextPacket(packet: EncodedPacket, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getPacket(timestamp: number, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getKeyPacket(timestamp: number, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
    getNextKeyPacket(packet: EncodedPacket, options: PacketRetrievalOptions): Promise<EncodedPacket | null>;
}
export {};
//# sourceMappingURL=adts-demuxer.d.ts.map