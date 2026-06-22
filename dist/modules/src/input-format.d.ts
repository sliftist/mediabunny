/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { Demuxer } from './demuxer';
import { Input } from './input';
import { IsobmffDemuxer } from './isobmff/isobmff-demuxer';
import type { PsshBox } from './isobmff/isobmff-misc';
import { MatroskaDemuxer } from './matroska/matroska-demuxer';
import { Mp3Demuxer } from './mp3/mp3-demuxer';
import { OggDemuxer } from './ogg/ogg-demuxer';
import { WaveDemuxer } from './wave/wave-demuxer';
import { AviDemuxer } from './avi/avi-demuxer';
import { AdtsDemuxer } from './adts/adts-demuxer';
import { MpegTsDemuxer } from './mpeg-ts/mpeg-ts-demuxer';
import { HlsDemuxer } from './hls/hls-demuxer';
import { MaybePromise } from './misc';
/**
 * Base class representing an input media file format.
 * @group Input formats
 * @public
 */
export declare abstract class InputFormat {
    /** @internal */
    abstract _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    abstract _createDemuxer(input: Input): Demuxer;
    /** Returns the name of the input format. */
    abstract get name(): string;
    /** Returns the typical base MIME type of the input format. */
    abstract get mimeType(): string;
    /**
     * Provided for tree-shakable checking.
     * @internal
     */
    _isIsobmff: boolean;
}
/**
 * Format representing files compatible with the ISO base media file format (ISOBMFF), like MP4 or MOV files.
 *
 * This format can make use of {@link InputOptions.initInput}. When the file contents are fragmented but no track
 * initialization info is provided (no `moov` atom), then it must be provided via `initInput`.
 *
 * @group Input formats
 * @public
 */
export declare abstract class IsobmffInputFormat extends InputFormat {
    /** @internal */
    protected _getMajorBrand(input: Input): Promise<string | null>;
    /** @internal */
    _createDemuxer(input: Input): IsobmffDemuxer;
    /** @internal */
    _isIsobmff: boolean;
}
/**
 * MPEG-4 Part 14 (MP4) file format.
 *
 * Do not instantiate this class; use the {@link MP4} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class Mp4InputFormat extends IsobmffInputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    get name(): string;
    get mimeType(): string;
}
/**
 * QuickTime File Format (QTFF), often called MOV.
 *
 * Do not instantiate this class; use the {@link QTFF} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class QuickTimeInputFormat extends IsobmffInputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    get name(): string;
    get mimeType(): string;
}
/**
 * Matroska file format.
 *
 * Do not instantiate this class; use the {@link MATROSKA} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class MatroskaInputFormat extends InputFormat {
    /** @internal */
    protected isSupportedEBMLOfDocType(input: Input, desiredDocType: string): Promise<boolean>;
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): MatroskaDemuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * WebM file format, based on Matroska.
 *
 * Do not instantiate this class; use the {@link WEBM} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class WebMInputFormat extends MatroskaInputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    get name(): string;
    get mimeType(): string;
}
/**
 * MP3 file format.
 *
 * Do not instantiate this class; use the {@link MP3} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class Mp3InputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): Mp3Demuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * WAVE file format, based on RIFF.
 *
 * Do not instantiate this class; use the {@link WAVE} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class WaveInputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): WaveDemuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * AVI (Audio Video Interleave) file format, based on RIFF.
 *
 * Do not instantiate this class; use the {@link AVI} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class AviInputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): AviDemuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * Ogg file format.
 *
 * Do not instantiate this class; use the {@link OGG} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class OggInputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): OggDemuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * FLAC file format.
 *
 * Do not instantiate this class; use the {@link FLAC} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class FlacInputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    get name(): string;
    get mimeType(): string;
    /** @internal */
    _createDemuxer(input: Input): Demuxer;
}
/**
 * ADTS file format.
 *
 * Do not instantiate this class; use the {@link ADTS} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class AdtsInputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): AdtsDemuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * MPEG Transport Stream (MPEG-TS) file format.
 *
 * This format can make use of {@link InputOptions.initInput} to initialize track information even when no
 * initialization information is provided for the track, for example because it has no key frames. In this case, tracks
 * are matched to each other based on their PID.
 *
 * Do not instantiate this class; use the {@link MPEG_TS} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class MpegTsInputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): MpegTsDemuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * Media described using the HTTP Live Streaming (HLS) protocol, with playlists in the M3U8 format.
 *
 * Do not instantiate this class; use the {@link HLS} singleton instead.
 *
 * @group Input formats
 * @public
 */
export declare class HlsInputFormat extends InputFormat {
    /** @internal */
    _canReadInput(input: Input): Promise<boolean>;
    /** @internal */
    _createDemuxer(input: Input): HlsDemuxer;
    get name(): string;
    get mimeType(): string;
}
/**
 * MP4 input format singleton.
 * @group Input formats
 * @public
 */
export declare const MP4: Mp4InputFormat;
/**
 * QuickTime File Format input format singleton.
 * @group Input formats
 * @public
 */
export declare const QTFF: QuickTimeInputFormat;
/**
 * Matroska input format singleton.
 * @group Input formats
 * @public
 */
export declare const MATROSKA: MatroskaInputFormat;
/**
 * WebM input format singleton.
 * @group Input formats
 * @public
 */
export declare const WEBM: WebMInputFormat;
/**
 * MP3 input format singleton.
 * @group Input formats
 * @public
 */
export declare const MP3: Mp3InputFormat;
/**
 * WAVE input format singleton.
 * @group Input formats
 * @public
 */
export declare const WAVE: WaveInputFormat;
/**
 * AVI input format singleton.
 * @group Input formats
 * @public
 */
export declare const AVI: AviInputFormat;
/**
 * Ogg input format singleton.
 * @group Input formats
 * @public
 */
export declare const OGG: OggInputFormat;
/**
 * ADTS input format singleton.
 * @group Input formats
 * @public
 */
export declare const ADTS: AdtsInputFormat;
/**
 * FLAC input format singleton.
 * @group Input formats
 * @public
 */
export declare const FLAC: FlacInputFormat;
/**
 * MPEG-TS input format singleton.
 * @group Input formats
 * @public
 */
export declare const MPEG_TS: MpegTsInputFormat;
/**
 * HLS input format singleton.
 * @group Input formats
 * @public
 */
export declare const HLS: HlsInputFormat;
/**
 * List of all input format singletons. If you don't need to support all input formats, you should specify the
 * formats individually for better tree shaking.
 * @group Input formats
 * @public
 */
export declare const ALL_FORMATS: InputFormat[];
/**
 * List of input formats required for playback of typical HLS manifests. Includes HLS itself as well as the typical
 * segment formats: MPEG Transport Stream (.ts), MP4 (CMAF), ADTS (.aac) and MP3.
 * @group Input formats
 * @public
 */
export declare const HLS_FORMATS: InputFormat[];
/**
 * Additional per-format configuration.
 * @group Input formats
 * @public
 */
export type InputFormatOptions = {
    /** ISOBMFF-specific configuration. */
    isobmff?: IsobmffInputFormatOptions;
    /** HLS-specific configuration. */
    hls?: HlsInputFormatOptions;
};
/**
 * Additional ISOBMFF input configuration.
 * @group Input formats
 * @public
 */
export type IsobmffInputFormatOptions = {
    /**
     * A callback that gets invoked for each key ID required for sample content decryption. The key ID is provided as a
     * 32-character lowercase hexadecimal string.
     *
     * Must return or resolve to a 32-character hexadecimal string or a 16-byte `Uint8Array`.
     */
    resolveKeyId?: (options: {
        /** The key ID that is to be resolved to a key. This is a 32-character lowercase hexadecimal string. */
        keyId: string;
        /**
         * Protection System Specific Header (pssh) boxes that apply to this key ID. Can be used to obtain a
         * description key from a DRM license server.
         */
        psshBoxes: PsshBox[];
    }) => MaybePromise<Uint8Array | string>;
    /** @internal */
    _suppressPsshParsing?: boolean;
};
/**
 * Additional HLS input configuration.
 * @group Input formats
 * @public
 */
export type HlsInputFormatOptions = {
    /**
     * Whether, in the presence of `#EXT-X-PROGRAM-DATE-TIME` tags, to offset track and packet timestamps to be relative
     * to the Unix epoch.
     *
     * Defaults to `true`, meaning packet timestamps map directly to wall-clock time. This guarantees AV sync across
     * multiple tracks, even with gaps present.
     *
     * When you don't want this mapping, you can set this value to `false`. In addition to timestamps not being Unix
     * timestamps anymore, any gaps in the playlist are also naturally removed. When `false`, you can still access the
     * wall-clock Unix timestamps via {@link InputTrack.getUnixTimeForTimestamp}.
     */
    offsetTimestampsByDateTime?: boolean;
};
export declare const validateInputFormatOptions: (options: InputFormatOptions, prefix: string) => void;
//# sourceMappingURL=input-format.d.ts.map