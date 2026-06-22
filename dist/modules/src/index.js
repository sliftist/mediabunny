/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
/// <reference types="dom-mediacapture-transform" preserve="true" />
/// <reference types="dom-webcodecs" preserve="true" />
import { Logging } from './logging';
const MEDIABUNNY_LOADED_SYMBOL = Symbol.for('mediabunny loaded');
if (globalThis[MEDIABUNNY_LOADED_SYMBOL]) {
    Logging._error('[WARNING]\nMediabunny was loaded twice.'
        + ' This will likely cause Mediabunny not to work correctly.'
        + ' Check if multiple dependencies are importing different versions of Mediabunny,'
        + ' or if something is being bundled incorrectly.');
}
globalThis[MEDIABUNNY_LOADED_SYMBOL] = true;
export { Output, OutputTrack, OutputVideoTrack, OutputAudioTrack, OutputSubtitleTrack, OutputTrackGroup, } from './output';
export { OutputFormat, AdtsOutputFormat, CmafOutputFormat, FlacOutputFormat, HlsOutputFormat, IsobmffOutputFormat, MkvOutputFormat, MovOutputFormat, Mp3OutputFormat, Mp4OutputFormat, MpegTsOutputFormat, OggOutputFormat, WavOutputFormat, WebMOutputFormat, } from './output-format';
export { MediaSource, VideoSource, AudioSource, SubtitleSource, AudioBufferSource, AudioSampleSource, CanvasSource, EncodedAudioPacketSource, EncodedVideoPacketSource, MediaStreamAudioTrackSource, MediaStreamVideoTrackSource, TextSubtitleSource, VideoSampleSource, } from './media-source';
export { VIDEO_CODECS, AUDIO_CODECS, PCM_AUDIO_CODECS, NON_PCM_AUDIO_CODECS, SUBTITLE_CODECS, } from './codec';
export { canDecode, canDecodeVideo, canDecodeAudio, getDecodableCodecs, getDecodableVideoCodecs, getDecodableAudioCodecs, } from './decode';
export { canEncode, canEncodeVideo, canEncodeAudio, canEncodeSubtitles, getEncodableCodecs, getEncodableVideoCodecs, getEncodableAudioCodecs, getEncodableSubtitleCodecs, getFirstEncodableVideoCodec, getFirstEncodableAudioCodec, getFirstEncodableSubtitleCodec, Quality, QUALITY_VERY_LOW, QUALITY_LOW, QUALITY_MEDIUM, QUALITY_HIGH, QUALITY_VERY_HIGH, } from './encode';
export { Target, AppendOnlyStreamTarget, BufferTarget, FilePathTarget, NullTarget, PathedTarget, RangedTarget, StreamTarget, } from './target';
export { ConcurrentRunner, EventEmitter, } from './misc';
export { Logging, LogLevel, } from './logging';
export { ALL_TRACK_TYPES, } from './output';
export { Source, SourceRef, BlobSource, BufferSource, CustomPathedSource, CustomSource, FilePathSource, PathedSource, 
// eslint-disable-next-line @typescript-eslint/no-deprecated
StreamSource, RangedSource, ReadableStreamSource, UrlSource, } from './source';
export { InputFormat, AdtsInputFormat, FlacInputFormat, IsobmffInputFormat, HlsInputFormat, MatroskaInputFormat, Mp3InputFormat, Mp4InputFormat, MpegTsInputFormat, OggInputFormat, QuickTimeInputFormat, WaveInputFormat, WebMInputFormat, AviInputFormat, ALL_FORMATS, HLS_FORMATS, ADTS, FLAC, HLS, MATROSKA, MP3, MP4, MPEG_TS, OGG, QTFF, WAVE, WEBM, AVI, } from './input-format';
export { Input, InputDisposedError, UnsupportedInputFormatError, } from './input';
export { InputTrack, InputVideoTrack, InputAudioTrack, asc, desc, prefer, } from './input-track';
export { EncodedPacket, } from './packet';
export { AudioSample, AudioSampleResource, VideoSample, VideoSampleColorSpace, VideoSampleResource, VIDEO_SAMPLE_PIXEL_FORMATS, registerVideoSampleTransformer, } from './sample';
export { AudioBufferSink, AudioSampleSink, BaseMediaSampleSink, CanvasSink, EncodedPacketSink, VideoSampleSink, } from './media-sink';
export { Conversion, ConversionCanceledError, } from './conversion';
export { CustomVideoDecoder, CustomVideoEncoder, CustomAudioDecoder, CustomAudioEncoder, registerDecoder, registerEncoder, } from './custom-coder';
export { RichImageData, AttachedFile, } from './metadata';
// 🐡🦔
