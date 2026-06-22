/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import type { FileHandle } from 'node:fs/promises';
import { FilePath, MaybePromise, EventEmitter } from './misc';
export type ReadResult = {
    bytes: Uint8Array;
    view: DataView;
    /** The offset of the bytes in the file. */
    offset: number;
};
export declare const DEFAULT_MIN_READ_POSITION = 0;
export declare const DEFAULT_MAX_READ_POSITION: number;
/**
 * The events emitted by a {@link Source}, with each key being an event name and its value being the event data.
 * @group Input sources
 * @public
 */
export type SourceEvents = {
    /** Emitted each time data is retrieved from the source. */
    read: {
        /** The start of the retrieved range, inclusive. */
        start: number;
        /** The end of the retrieved range, exclusive. */
        end: number;
    };
};
/**
 * The source base class, representing a resource from which bytes can be read.
 * @group Input sources
 * @public
 */
export declare abstract class Source extends EventEmitter<SourceEvents> {
    /** @internal */
    abstract _getFileSize(): number | null | undefined;
    /** @internal */
    abstract _read(start: number, end: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    /** @internal */
    abstract _dispose(): void;
    /** @internal */
    _disposed: boolean;
    /** @internal */
    _refCount: number;
    /**
     * Used internally to mark if a source stems from an HLS reading operation. Used to suppress certain warnings.
     * @internal
     */
    _usedForHls: boolean;
    /**
     * FinalizationRegistry for rogue refs to this source that didn't get freed. It lives on the Source itself so that
     * in case the Source transitively points back to itself and forms a cycle (for example through a custom
     * CustomSource callback) that we're not leaking memory.
     * @internal
     */
    _refFinalizationRegistry: FinalizationRegistry<Source> | null;
    /** @internal */
    private _sizePromise;
    constructor();
    /**
     * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
     * will retrieve the size.
     *
     * Returns null if the source is unsized.
     */
    getSizeOrNull(): Promise<number | null>;
    /**
     * Resolves with the total size of the file in bytes. This function is memoized, meaning only the first call
     * will retrieve the size.
     *
     * Throws an error if the source is unsized.
     */
    getSize(): Promise<number>;
    /**
     * Returns a new {@link RangedSource} that maps data onto this source using the given offset and length. If a length
     * is not provided, the ranged source spans until the end of this source's data.
     *
     * Useful for reading files that are embedded within larger files.
     */
    slice(offset: number, length?: number): RangedSource;
    /**
     * Called each time data is retrieved from the source. Will be called with the retrieved range (end exclusive).
     *
     * @deprecated Use `source.on('read', ({ start, end }) => ...)` instead.
     */
    onread: ((start: number, end: number) => unknown) | null;
    /** @internal */
    _dispatchRead(start: number, end: number): void;
    /**
     * Creates a new `SourceRef` pointing to this source. You are expected to call `.free()` on said `SourceRef` when
     * you're done with it.
     */
    ref(): SourceRef<this>;
    /** @internal */
    _incrementRefCount(): void;
    /** @internal */
    _decrementRefCount(): void;
}
/**
 * A reference to a {@link Source}, used to manage a source's lifecycle. Creating a `SourceRef` via {@link Source.ref}
 * increases that source's internal reference count. As long as a source has a non-zero reference count, it is assumed
 * to still be in use. Once all references are freed via {@link SourceRef.free}, the source gets disposed.
 *
 * @group Input sources
 * @public
 */
export declare class SourceRef<S extends Source = Source> implements Disposable {
    /** @internal */
    private _source;
    /** @internal */
    private _freed;
    /** @internal */
    constructor(source: S);
    /** The {@link Source} this ref references. Accessing this field throws an error after having freed the ref. */
    get source(): S;
    /** Whether or not this reference has been freed via {@link SourceRef.free}. */
    get freed(): boolean;
    /**
     * Frees the ref, decrementing the source's internal reference count. If the source's internal reference count
     * reaches zero, it gets disposed. To catch bugs, this method throws if the ref is already freed.
     */
    free(): void;
    /**
     * Calls {@link SourceRef.free}.
     */
    [Symbol.dispose](): void;
}
/**
 * A source which can create new sources from file paths. Required for multi-file inputs such as HLS playlists.
 * @public
 * @group Input sources
 */
export declare abstract class PathedSource extends Source {
    /**
     * The path that points to the root file; the entry file of the media.
     *
     * This path may be modified by the source to indicate a redirect: an updated path to perform new requests
     * relative to.
     */
    rootPath: FilePath;
    /** The callback that is called for each requested file; must return a {@link Source} or {@link SourceRef}. */
    readonly requestHandler: (request: SourceRequest) => MaybePromise<Source | SourceRef>;
    constructor(
    /**
     * The path that points to the root file; the entry file of the media.
     *
     * This path may be modified by the source to indicate a redirect: an updated path to perform new requests
     * relative to.
     */
    rootPath: FilePath, 
    /** The callback that is called for each requested file; must return a {@link Source} or {@link SourceRef}. */
    requestHandler: (request: SourceRequest) => MaybePromise<Source | SourceRef>);
    /** @internal */
    _resolveRequest(request: SourceRequest): MaybePromise<SourceRef>;
}
/**
 * A request for a {@link Source} at the given path.
 * @group Input sources
 * @public
 */
export type SourceRequest = {
    /** The requested file path. */
    path: FilePath;
    /** Whether the requested file is the root file. */
    isRoot: boolean;
};
export declare const sourceRequestsAreEqual: (a: SourceRequest, b: SourceRequest) => boolean;
/**
 * A custom multi-file source where each file is uniquely identified by a {@link FilePath} and can be resolved to
 * an arbitrary {@link Source}.
 *
 * @public
 * @group Input sources
 */
export declare class CustomPathedSource extends PathedSource {
    /** @internal */
    _root: SourceRef | null;
    /** @internal */
    _rootRequest: Promise<SourceRef> | null;
    /** @internal */
    _read(start: number, end: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    /** @internal */
    _getFileSize(): number | null | undefined;
    /** @internal */
    _dispose(): void;
}
/**
 * A source backed by an ArrayBuffer or ArrayBufferView, with the entire file held in memory.
 * @group Input sources
 * @public
 */
export declare class BufferSource extends Source {
    /** @internal */
    _bytes: Uint8Array;
    /** @internal */
    _view: DataView;
    /** @internal */
    _onreadCalled: boolean;
    /**
     * Creates a new {@link BufferSource} backed by the specified `ArrayBuffer`, `SharedArrayBuffer`,
     * or `ArrayBufferView`.
     */
    constructor(buffer: AllowSharedBufferSource);
    /** @internal */
    _getFileSize(): number;
    /** @internal */
    _read(): ReadResult;
    /** @internal */
    _dispose(): void;
}
/**
 * Options for {@link BlobSource}.
 * @group Input sources
 * @public
 */
export type BlobSourceOptions = {
    /** The maximum number of bytes the cache is allowed to hold in memory. Defaults to 8 MiB. */
    maxCacheSize?: number;
    /**
     * Defaults to `true`. When `true`, Mediabunny will acquire a `ReadableStream` reader internally to efficiently read
     * data from the blob. Since this can lead to errors in some (very) rare cases due to browser bugs, you can set this
     * field to `false` to try a slower but more stable reading method.
     */
    useStreamReader?: boolean;
};
/**
 * A source backed by a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob). Since a
 * [`File`](https://developer.mozilla.org/en-US/docs/Web/API/File) is also a `Blob`, this is the source to use when
 * reading files off the disk.
 * @group Input sources
 * @public
 */
export declare class BlobSource extends Source {
    /** @internal */
    _blob: Blob;
    /** @internal */
    _options: BlobSourceOptions;
    /** @internal */
    _orchestrator: ReadOrchestrator;
    /**
     * Creates a new {@link BlobSource} backed by the specified
     * [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
     */
    constructor(blob: Blob, options?: BlobSourceOptions);
    /** @internal */
    _getFileSize(): number;
    /** @internal */
    _read(start: number, end: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    /** @internal */
    _readers: WeakMap<ReadWorker, ReadableStreamDefaultReader<Uint8Array<ArrayBufferLike>> | null>;
    /** @internal */
    private _runWorker;
    /** @internal */
    _dispose(): void;
}
/**
 * Options for {@link UrlSource}.
 * @group Input sources
 * @public
 */
export type UrlSourceOptions = {
    /**
     * The [`RequestInit`](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit) used by the Fetch API. Can be
     * used to further control the requests, such as setting custom headers.
     *
     * The `signal` field is not available, as Mediabunny controls request cancellation internally. If you want to
     * cancel ongoing requests, use {@link Input.dispose}.
     */
    requestInit?: Omit<RequestInit, 'signal'>;
    /**
     * A function that returns the delay (in seconds) before retrying a failed request. The function is called
     * with the number of previous, unsuccessful attempts, as well as with the error with which the previous request
     * failed. If the function returns `null`, no more retries will be made.
     *
     * By default, it uses an exponential backoff algorithm that never gives up unless
     * a CORS error is suspected (`fetch()` did reject, `navigator.onLine` is true and origin is different).
     */
    getRetryDelay?: (previousAttempts: number, error: unknown, url: string | URL | Request) => number | null;
    /** The maximum number of bytes the cache is allowed to hold in memory. Defaults to 64 MiB. */
    maxCacheSize?: number;
    /** The maximum number of parallel requests to use for fetching. Defaults to 2. */
    parallelism?: number;
    /**
     * A WHATWG-compatible fetch function. You can use this field to polyfill the `fetch` function, add missing
     * features, or use a custom implementation.
     */
    fetchFn?: typeof fetch;
};
/**
 * A source backed by a URL. This is useful for reading data from the network. Requests will be made using an optimized
 * reading and prefetching pattern to minimize request count and latency.
 * @group Input sources
 * @public
 */
export declare class UrlSource extends PathedSource {
    /** @internal */
    _url: string | URL | Request;
    /** @internal */
    _getRetryDelay: (previousAttempts: number, error: unknown, url: string | URL | Request) => number | null;
    /** @internal */
    _options: UrlSourceOptions;
    /** @internal */
    _requestInit: RequestInit;
    /** @internal */
    _offset: number;
    /** @internal */
    _length: number | null;
    /** @internal */
    _orchestrator: ReadOrchestrator;
    /**
     * Note that this value being true does NOT mean the file size can't change anymore; it just signals that we have at
     * least checked if we know the file size or not.
     * @internal
     */
    _fileSizeDetermined: boolean;
    /**
     * Creates a new {@link UrlSource} backed by the resource at the specified URL.
     *
     * When passing a `Request` instance, note that its `signal` will be overridden by Mediabunny; if you want to cancel
     * ongoing requests, use {@link Input.dispose}.
     */
    constructor(url: string | URL | Request, options?: UrlSourceOptions);
    /** @internal */
    _getFileSize(): number | null | undefined;
    /** @internal */
    _read(start: number, end: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    /** @internal */
    private _runWorker;
    /** @internal */
    _dispose(): void;
}
/**
 * Options for {@link FilePathSource}.
 * @group Input sources
 * @public
 */
export type FilePathSourceOptions = {
    /** The maximum number of bytes the cache is allowed to hold in memory. Defaults to 8 MiB. */
    maxCacheSize?: number;
};
/**
 * A source backed by a path to a file. Intended for server-side usage in Node, Bun, or Deno.
 *
 * Make sure to call `.dispose()` on the corresponding {@link Input} when done to explicitly free the internal file
 * handle acquired by this source.
 * @group Input sources
 * @public
 */
export declare class FilePathSource extends PathedSource {
    /** @internal */
    _customSource: CustomSource;
    /** @internal */
    _fileHandle: FileHandle | null;
    /** Creates a new {@link FilePathSource} backed by the file at the specified file path. */
    constructor(filePath: string, options?: FilePathSourceOptions);
    /** @internal */
    _read(start: number, end: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    /** @internal */
    _getFileSize(): number | null | undefined;
    /** @internal */
    _dispose(): void;
}
/**
 * Options for defining a {@link CustomSource}.
 * @group Input sources
 * @public
 */
export type CustomSourceOptions = {
    /**
     * Called when the size of the entire file is requested. Must return or resolve to the size in bytes. This function
     * is guaranteed to be called before `read`.
     */
    getSize: () => MaybePromise<number>;
    /**
     * Called when data is requested. Must return or resolve to the bytes from the specified byte range, or a stream
     * that yields these bytes.
     *
     * You are guaranteed that `0 <= start < end < fileSize`.
     */
    read: (start: number, end: number) => MaybePromise<Uint8Array | ReadableStream<Uint8Array>>;
    /**
     * Called when the {@link Input} driven by this source is disposed.
     */
    dispose?: () => unknown;
    /** The maximum number of bytes the cache is allowed to hold in memory. Defaults to 8 MiB. */
    maxCacheSize?: number;
    /**
     * Specifies the prefetch profile that the reader should use with this source. A prefetch profile specifies the
     * pattern with which bytes outside of the requested range are preloaded to reduce latency for future reads.
     *
     * - `'none'` (default): No prefetching; only the data needed in the moment is requested.
     * - `'fileSystem'`: File system-optimized prefetching: a small amount of data is prefetched bidirectionally,
     * aligned with page boundaries.
     * - `'network'`: Network-optimized prefetching, or more generally, prefetching optimized for any high-latency
     * environment: tries to minimize the amount of read calls and aggressively prefetches data when sequential access
     * patterns are detected.
     */
    prefetchProfile?: 'none' | 'fileSystem' | 'network';
};
/**
 * A general-purpose, callback-driven source that can get its data from anywhere. Use this source to implement your own
 * custom source if the other sources don't cover your case.
 * @group Input sources
 * @public
 */
export declare class CustomSource extends Source {
    /** @internal */
    _options: CustomSourceOptions;
    /** @internal */
    _orchestrator: ReadOrchestrator;
    /** Creates a new {@link CustomSource} whose behavior is specified by `options`.  */
    constructor(options: CustomSourceOptions);
    /** @internal */
    _getFileSize(): number | null | undefined;
    /** @internal */
    _read(start: number, end: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    /** @internal */
    private _runWorker;
    /** @internal */
    _dispose(): void;
}
/**
 * An alias for {@link CustomSource}.
 * @deprecated This name is misleading and will be removed in a future release. Please use {@link CustomSource} instead.
 *
 * @group Input sources
 * @public
 */
export declare const StreamSource: typeof CustomSource;
/**
 * An alias for {@link CustomSourceOptions}.
 * @deprecated This name is misleading and will be removed in a future release. Please use
 * {@link CustomSourceOptions} instead.
 *
 * @group Input sources
 * @public
 */
export type StreamSourceOptions = CustomSourceOptions;
type ReadableStreamSourcePendingSlice = {
    start: number;
    end: number;
    bytes: Uint8Array;
    resolve: (bytes: ReadResult | null) => void;
    reject: (error: unknown) => void;
};
/**
 * Options for {@link ReadableStreamSource}.
 * @group Input sources
 * @public
 */
export type ReadableStreamSourceOptions = {
    /** The maximum number of bytes the cache is allowed to hold in memory. Defaults to 32 MiB. */
    maxCacheSize?: number;
};
/**
 * A source backed by a [`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) of
 * `Uint8Array`, representing an append-only byte stream of unknown length. This is the source to use for incrementally
 * streaming in input files that are still being constructed and whose size we don't yet know, like for example the
 * output chunks of [MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder).
 *
 * This source is *unsized*, meaning calls to `.getSize()` will throw and readers are more limited due to the
 * lack of random file access. You should only use this source with sequential access patterns, such as reading all
 * packets from start to end. This source does not work well with random access patterns unless you increase its
 * max cache size.
 *
 * @group Input sources
 * @public
 */
export declare class ReadableStreamSource extends Source {
    /** @internal */
    _stream: ReadableStream<Uint8Array>;
    /** @internal */
    _reader: ReadableStreamDefaultReader<Uint8Array> | null;
    /** @internal */
    _cache: CacheEntry[];
    /** @internal */
    _maxCacheSize: number;
    /** @internal */
    _pendingSlices: ReadableStreamSourcePendingSlice[];
    /** @internal */
    _currentIndex: number;
    /** @internal */
    _targetIndex: number;
    /** @internal */
    _maxRequestedIndex: number;
    /** @internal */
    _endIndex: number | null;
    /** @internal */
    _pulling: boolean;
    /** Creates a new {@link ReadableStreamSource} backed by the specified `ReadableStream<Uint8Array>`. */
    constructor(stream: ReadableStream<Uint8Array>, options?: ReadableStreamSourceOptions);
    /** @internal */
    _getFileSize(): number | null;
    /** @internal */
    _read(start: number, end: number): MaybePromise<ReadResult | null>;
    /** @internal */
    _throwDueToCacheMiss(): void;
    /** @internal */
    _pull(): Promise<void>;
    /** @internal */
    _dispose(): void;
}
type PrefetchProfile = (start: number, end: number, workers: ReadWorker[]) => {
    start: number;
    end: number;
};
type PendingSlice = {
    start: number;
    bytes: Uint8Array;
    holes: Hole[];
    resolve: (bytes: Uint8Array | null) => void;
    reject: (error: unknown) => void;
};
type Hole = {
    start: number;
    end: number;
};
type CacheEntry = {
    start: number;
    end: number;
    bytes: Uint8Array;
    view: DataView;
    age: number;
};
type ReadWorker = {
    startPos: number;
    currentPos: number;
    targetPos: number;
    /** The target is considered _strict_ when it is an error for the worker to terminate before reaching the target. */
    strictTarget: boolean;
    running: boolean;
    aborted: boolean;
    pendingSlices: PendingSlice[];
    age: number;
};
/**
 * Godclass for orchestrating complex, cached read operations. The reading model is as follows: Any reading task is
 * delegated to a *worker*, which is a sequential reader positioned somewhere along the file. All workers run in
 * parallel and can be stopped and resumed in their forward movement. When read requests come in, this orchestrator will
 * first try to satisfy the request with only the cached data. If this isn't possible, workers are spun up for all
 * missing parts (or existing workers are repurposed), and these workers will then fill the holes in the data as they
 * march along the file.
 */
declare class ReadOrchestrator {
    options: {
        maxCacheSize: number;
        runWorker: (worker: ReadWorker) => Promise<void>;
        prefetchProfile: PrefetchProfile;
        maxWorkerCount: number;
    };
    fileSize: number | null;
    nextAge: number;
    workers: ReadWorker[];
    cache: CacheEntry[];
    currentCacheSize: number;
    disposed: boolean;
    queuedReads: {
        hole: Hole;
        strictTarget: boolean;
        pendingSlices: PendingSlice[];
        age: number;
    }[];
    constructor(options: {
        maxCacheSize: number;
        runWorker: (worker: ReadWorker) => Promise<void>;
        prefetchProfile: PrefetchProfile;
        maxWorkerCount: number;
    });
    read(innerStart: number, innerEnd: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    checkHoleAgainstWorker(worker: ReadWorker, hole: Hole, pendingSlices: PendingSlice[]): boolean;
    checkQueuedReadsAgainstWorker(worker: ReadWorker): void;
    createWorker(startPos: number, targetPos: number, strictTarget: boolean): ReadWorker | null;
    runWorker(worker: ReadWorker): void;
    consolidateEverythingIntoOneWorker(worker: ReadWorker): void;
    /** Called by a worker when it has read some data. */
    supplyWorkerData(worker: ReadWorker, bytes: Uint8Array): void;
    supplyFileSize(size: number): void;
    signalWorkerStoppedRunning(worker: ReadWorker): void;
    /** Called when a worker reaches the end of the underlying data and must be cleaned up. */
    onWorkerFinished(worker: ReadWorker): void;
    insertIntoCache(entry: CacheEntry): void;
    dispose(): void;
}
/**
 * A dummy source from which no data can be read. Can be used in conjunction with input formats that get their data
 * from another source.
 */
export declare class NullSource extends Source {
    _getFileSize(): number | null;
    _read(): MaybePromise<ReadResult | null>;
    _dispose(): void;
}
/**
 * A source that covers a range (offset + length) of another source. Useful for reading files that are embedded within
 * larger files.
 *
 * @group Input sources
 * @public
 */
export declare class RangedSource extends Source {
    /** @internal */
    _baseSource: Source;
    /** @internal */
    _ref: SourceRef | null;
    /** @internal */
    _offset: number;
    /** @internal */
    _length: number | null;
    /** @internal */
    constructor(baseSource: Source, offset: number, length?: number);
    /** @internal */
    _getFileSize(): number | null | undefined;
    /** @internal */
    _read(start: number, end: number, minReadPosition: number, maxReadPosition: number): MaybePromise<ReadResult | null>;
    /** @internal */
    _dispose(): void;
    ref(): SourceRef<this>;
}
export {};
//# sourceMappingURL=source.d.ts.map