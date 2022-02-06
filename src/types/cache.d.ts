/**
 * Represents an asset's entry in the cache manifest
 */
export interface CacheEntry {
    /** External URL from where this asset was downloaded */
    url: string;
    /** Local absolute path */
    path: string;
    /** Hash of the asset as a base64 string */
    hash: string;
    /** Timestamp of when the asset was saved */
    time: number;
}

/**
 * The cache manifest contains all external assets that have been downloaded and cached
 */
export type CacheManifest = CacheEntry[];
