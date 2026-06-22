/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Muxer } from '../muxer';
import { Output, OutputAudioTrack } from '../output';
import { FlacOutputFormat } from '../output-format';
import { EncodedPacket } from '../packet';
import { AttachedImage } from '../metadata';
export declare class FlacMuxer extends Muxer {
    private writer;
    private metadataWritten;
    private blockSizes;
    private frameSizes;
    private sampleRate;
    private channels;
    private bitsPerSample;
    private format;
    constructor(output: Output, format: FlacOutputFormat);
    start(): Promise<void>;
    writeHeader({ bitsPerSample, minimumBlockSize, maximumBlockSize, minimumFrameSize, maximumFrameSize, sampleRate, channels, totalSamples, }: {
        minimumBlockSize: number;
        maximumBlockSize: number;
        minimumFrameSize: number;
        maximumFrameSize: number;
        sampleRate: number;
        channels: number;
        bitsPerSample: number;
        totalSamples: number;
    }): void;
    writePictureBlock(picture: AttachedImage): void;
    writeVorbisCommentAndPictureBlock(): void;
    getMimeType(): Promise<string>;
    addEncodedVideoPacket(): Promise<void>;
    addEncodedAudioPacket(track: OutputAudioTrack, packet: EncodedPacket, meta?: EncodedAudioChunkMetadata): Promise<void>;
    addSubtitleCue(): Promise<void>;
    finalize(): Promise<void>;
}
//# sourceMappingURL=flac-muxer.d.ts.map