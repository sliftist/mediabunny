/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import type { FileHandle } from 'node:fs/promises';
import { EventEmitter, FilePath, MaybePromise } from './misc';
/**
 * The events emitted by a {@link Target}.
 * @group Output targets
 * @public
 */
export type TargetEvents = {
    /** Emitted each time data is written to the target. */
    write: {
        /** The start of the written range, inclusive. */
        start: number;
        /** The end of the written range, exclusive. */
        end: number;
    };
    /** Emitted when the target is finalized. */
    finalized: void;
};
/**
 * Base class for targets, specifying where output files are written.
 * @group Output targets
 * @public
 */
export declare abstract class Target extends EventEmitter<TargetEvents> {
    /** @internal */
    _writerAcquired: boolean;
    /** @internal */
    _monotonicity: boolean | null;
    /** @internal */
    abstract _start(): void;
    /** @internal */
    abstract _write(data: Uint8Array, pos: number): void;
    /** @internal */
    abstract _flush(): Promise<void>;
    /** @internal */
    abstract _finalize(): Promise<void>;
    /** @internal */
    abstract _close(): Promise<void>;
    /**
     * Called each time data is written to the target. Will be called with the byte range into which data was written.
     *
     * Use this callback to track the size of the output file as it grows. But be warned, this function is chatty and
     * gets called *extremely* often.
     *
     * @deprecated Use `target.on('write', ({ start, end }) => ...)` instead.
     */
    onwrite: ((start: number, end: number) => unknown) | null;
    /** @internal */
    _setMonotonicity(monotonicity: boolean): void;
    /** @internal */
    _dispatchWrite(start: number, end: number): void;
    /**
     * Returns a new {@link RangedTarget} that writes data to this target using the given offset.
     *
     * Useful for writing a file into a section of a larger file.
     */
    slice(offset: number): RangedTarget;
}
/**
 * Options for {@link BufferTarget}.
 * @group Output targets
 * @public
 */
export type BufferTargetOptions = {
    /**
     * Called once the target has been finalized, with the complete output buffer. If you return a promise, it will be
     * used to apply backpressure internally.
     *
     * One use for this callback is for uploading to a server where the full buffer must be known before
     * sending (e.g. S3 PutObject) and stream-uploading is not an option.
     */
    onFinalize?: (buffer: ArrayBuffer) => MaybePromise<unknown>;
};
/**
 * A target that writes data directly into an ArrayBuffer in memory. Great for performance, but not suitable for very
 * large files. The buffer will be available once the output has been finalized.
 * @group Output targets
 * @public
 */
export declare class BufferTarget extends Target {
    /** Stores the final output buffer. Until the output is finalized, this will be `null`. */
    buffer: ArrayBuffer | null;
    /** @internal */
    _buffer: ArrayBuffer;
    /** @internal */
    _bytes: Uint8Array;
    /** @internal */
    _maxPos: number;
    /** @internal */
    _supportsResize: boolean;
    /** @internal */
    _options: BufferTargetOptions;
    /** Creates a new {@link BufferTarget}. The buffer holding the data will be created and managed internally. */
    constructor(options?: BufferTargetOptions);
    /** @internal */
    _ensureSize(size: number): void;
    /** @internal */
    _start(): void;
    /** @internal */
    _write(data: Uint8Array, pos: number): void;
    /** @internal */
    _flush(): Promise<void>;
    /** @internal */
    _finalize(): Promise<void>;
    /** @internal */
    _close(): Promise<void>;
    /** @internal */
    _getSlice(start: number, end: number): Uint8Array<ArrayBuffer>;
}
/**
 * A data chunk for {@link StreamTarget}.
 * @group Output targets
 * @public
 */
export type StreamTargetChunk = {
    /** The operation type. */
    type: 'write';
    /** The data to write. */
    data: Uint8Array<ArrayBuffer>;
    /** The byte offset in the output file at which to write the data. */
    position: number;
};
/**
 * Options for {@link StreamTarget}.
 * @group Output targets
 * @public
 */
export type StreamTargetOptions = {
    /**
     * When setting this to true, data created by the output will first be accumulated and only written out
     * once it has reached sufficient size, using a default chunk size of 16 MiB. This is useful for reducing the total
     * amount of writes, at the cost of latency.
     */
    chunked?: boolean;
    /** When using `chunked: true`, this specifies the maximum size of each chunk. Defaults to 16 MiB. */
    chunkSize?: number;
};
type Chunk = {
    start: number;
    written: ChunkSection[];
    data: Uint8Array<ArrayBuffer>;
    shouldFlush: boolean;
};
type ChunkSection = {
    start: number;
    end: number;
};
/**
 * This target writes data to a [`WritableStream`](https://developer.mozilla.org/en-US/docs/Web/API/WritableStream),
 * making it a general-purpose target for writing data anywhere. It is also compatible with
 * [`FileSystemWritableFileStream`](https://developer.mozilla.org/en-US/docs/Web/API/FileSystemWritableFileStream) for
 * use with the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API). The
 * `WritableStream` can also apply backpressure, which will propagate to the output and throttle the encoders.
 * @group Output targets
 * @public
 */
export declare class StreamTarget extends Target {
    /** @internal */
    _writable: WritableStream<StreamTargetChunk>;
    /** @internal */
    _options: StreamTargetOptions;
    /** @internal */
    _sections: {
        data: Uint8Array;
        start: number;
    }[];
    /** @internal */
    _lastWriteEnd: number;
    /** @internal */
    _lastFlushEnd: number;
    /** @internal */
    _streamWriter: WritableStreamDefaultWriter<StreamTargetChunk> | null;
    /** @internal */
    _writeError: unknown;
    /** @internal */
    _chunked: boolean;
    /** @internal */
    _chunkSize: number;
    /**
     * The data is divided up into fixed-size chunks, whose contents are first filled in RAM and then flushed out.
     * A chunk is flushed if all of its contents have been written.
     */
    /** @internal */
    _chunks: Chunk[];
    /** Creates a new {@link StreamTarget} which writes to the specified `writable`. */
    constructor(writable: WritableStream<StreamTargetChunk>, options?: StreamTargetOptions);
    /** @internal */
    _start(): void;
    /** @internal */
    _write(data: Uint8Array, pos: number): void;
    /** @internal */
    _flush(): Promise<void>;
    /** @internal */
    _writeDataIntoChunks(data: Uint8Array, position: number): void;
    /** @internal */
    _insertSectionIntoChunk(chunk: Chunk, section: ChunkSection): void;
    /** @internal */
    _createChunk(includesPosition: number): number;
    /** @internal */
    _tryToFlushChunks(force?: boolean): void;
    /** @internal */
    _finalize(): Promise<void>;
    /** @internal */
    _close(): Promise<void | undefined>;
}
/**
 * This target writes to a `WritableStream<Uint8Array>`, meaning all writes are necessarily append-only and involve no
 * seeking. Great for streaming data to a source that can only accept sequential data, like an HTTP server processing
 * an incoming upload.
 *
 * Note that using this target *requires* that the underlying format write data sequentially. Not all formats do this,
 * and this target will throw for the formats that don't. Check the guide for more.
 *
 * @group Output targets
 * @public
 */
export declare class AppendOnlyStreamTarget extends Target {
    /** @internal */
    _writable: WritableStream<Uint8Array>;
    /** @internal */
    _streamTarget: StreamTarget;
    /** @internal */
    _writer: WritableStreamDefaultWriter<Uint8Array> | null;
    /** @internal */
    _nextWritePos: number;
    constructor(writable: WritableStream<Uint8Array>);
    /** @internal */
    _start(): void;
    /** @internal */
    _write(data: Uint8Array, pos: number): void;
    /** @internal */
    _flush(): Promise<void>;
    /** @internal */
    _finalize(): Promise<void>;
    /** @internal */
    _close(): Promise<void>;
    /** @internal */
    _setMonotonicity(monotonicity: boolean): void;
}
/**
 * Options for {@link FilePathTarget}.
 * @group Output targets
 * @public
 */
export type FilePathTargetOptions = StreamTargetOptions;
/**
 * A target that writes to a file at the specified path. Intended for server-side usage in Node, Bun, or Deno.
 *
 * Writing is chunked by default. The internally held file handle will be closed when `.finalize()` or `.cancel()` are
 * called on the corresponding {@link Output}.
 * @group Output targets
 * @public
 */
export declare class FilePathTarget extends Target {
    /** @internal */
    _streamTarget: StreamTarget;
    /** @internal */
    _fileHandle: FileHandle | null;
    /** Creates a new {@link FilePathTarget} that writes to the file at the specified file path. */
    constructor(filePath: string, options?: FilePathTargetOptions);
    /** @internal */
    _start(): void;
    /** @internal */
    _write(data: Uint8Array, pos: number): void;
    /** @internal */
    _flush(): Promise<void>;
    /** @internal */
    _finalize(): Promise<void>;
    /** @internal */
    _close(): Promise<void | undefined>;
    /** @internal */
    _setMonotonicity(monotonicity: boolean): void;
}
/**
 * This target just discards all incoming data. It is useful for when you need an {@link Output} but extract data from
 * it differently, for example through format-specific callbacks (`onMoof`, `onMdat`, ...) or encoder events.
 * @group Output targets
 * @public
 */
export declare class NullTarget extends Target {
    /** @internal */
    _start(): void;
    /** @internal */
    _write(data: Uint8Array, pos: number): void;
    /** @internal */
    _flush(): Promise<void>;
    /** @internal */
    _finalize(): Promise<void>;
    /** @internal */
    _close(): Promise<void>;
}
/**
 * A target that writes to a subrange (defined by an offset) of another, underlying target. Useful for writing a file
 * into a section of a larger file.
 * @group Output targets
 * @public
 */
export declare class RangedTarget extends Target {
    /** @internal */
    _baseTarget: Target;
    /** @internal */
    _offset: number;
    /** @internal */
    constructor(baseTarget: Target, offset: number);
    /** @internal */
    _start(): void;
    /** @internal */
    _write(data: Uint8Array, pos: number): void;
    /** @internal */
    _flush(): Promise<void>;
    /** @internal */
    _finalize(): Promise<void>;
    /** @internal */
    _close(): Promise<void>;
    /** @internal */
    _setMonotonicity(monotonicity: boolean): void;
}
/**
 * A special target for writing multi-file media where each file is uniquely identified by a path.
 * @group Output targets
 * @public
 */
export declare class PathedTarget<T extends Target> {
    /** The path that points to the root file; the entry file of the media. */
    readonly rootPath: FilePath;
    /** The callback that is called for each file that needs to be written; must return a {@link Target}. */
    readonly getTarget: (request: TargetRequest) => MaybePromise<T>;
    /** Creates a new {@link PathedTarget} from a root path and a callback. */
    constructor(
    /** The path that points to the root file; the entry file of the media. */
    rootPath: FilePath, 
    /** The callback that is called for each file that needs to be written; must return a {@link Target}. */
    getTarget: (request: TargetRequest) => MaybePromise<T>);
}
/**
 * A request for a {@link Target} at the given path.
 * @group Output targets
 * @public
 */
export type TargetRequest = {
    /** The requested file path. */
    path: FilePath;
    /** Whether the to-be-written file will be the root file. */
    isRoot: boolean;
    /** The MIME type of the to-be-written file. */
    mimeType: string;
};
export {};
//# sourceMappingURL=target.d.ts.map