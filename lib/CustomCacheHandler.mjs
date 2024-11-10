//@ts-check
import process from 'node:process';
import { LRUCache } from 'next/dist/server/lib/lru-cache.js';

/**
 * @typedef {import("next/dist/server/lib/cache-handlers/types").CacheHandler} CacheHandler
 * @typedef {import("next/dist/server/lib/cache-handlers/types").CacheEntry} CacheEntry
 */

/**
 * @typedef {Object} PrivateCacheEntry
 * @property {CacheEntry} entry
 * @property {boolean} isErrored
 * @property {number} errorRetryCount
 * @property {number} size
 */

// LRU cache default to max 50 MB
const memoryCache = new LRUCache(process.env.LRU_MAX_SIZE ? parseInt(process.env.LRU_MAX_SIZE) : 50_000_000);

/** @type {Map<string, Promise<void>>} */
const pendingSets = new Map();

/** @type {CacheHandler} */
const MemoryCacheHandler = {
  async get(cacheKey, softTags) {
    await pendingSets.get(cacheKey);

    const privateEntry = memoryCache.get(cacheKey);

    if (!privateEntry) {
      return undefined;
    }

    const entry = privateEntry.entry;
    if (getTimestamp() > entry.timestamp + entry.revalidate * 1000) {
      // In memory caches should expire after revalidate time because it is unlikely that
      // a new entry will be able to be used before it is dropped from the cache.
      return undefined;
    }

    const [returnStream, newSaved] = entry.value.tee();
    entry.value = newSaved;

    return {
      ...entry,
      value: returnStream,
    };
  },

  async set(cacheKey, pendingEntry) {
    /** @type {(value?: any) => void} */
    let resolvePending = () => {};
    const pending = new Promise((resolve) => {
      resolvePending = resolve;
    });
    pendingSets.set(cacheKey, pending);

    const entry = await pendingEntry;

    let size = 0;

    try {
      const [value, clonedValue] = entry.value.tee();
      entry.value = value;
      const reader = clonedValue.getReader();

      for (let chunk; !(chunk = await reader.read()).done; ) {
        size += Buffer.from(chunk.value).byteLength;
      }

      memoryCache.set(cacheKey, {
        entry,
        isErrored: false,
        errorRetryCount: 0,
        size,
      });
    } catch (err) {
      console.error(`Error while saving cache key: ${cacheKey}`, err);
      // TODO: store partial buffer with error after we retry 3 times
    } finally {
      resolvePending();
      pendingSets.delete(cacheKey);
    }
  },

  // Tag invalidation not supported in memory cache
  async expireTags(...tags) {
    // noop
  },
  async receiveExpiredTags(...tags) {
    // noop
  },
};

export default MemoryCacheHandler;

function getTimestamp() {
  return performance.timeOrigin + performance.now();
}
