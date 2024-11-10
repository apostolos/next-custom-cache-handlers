//@ts-check
/** @typedef {import("next/dist/server/lib/cache-handlers/types").CacheHandler} CacheHandler */
import { styleText } from 'node:util';

// Wrap custom cache handler for debugging
import cacheHandler from './CustomCacheHandler.mjs';

/** @type {CacheHandler} */
const DebugCacheHandler = {
  async get(cacheKey, softTags) {
    log('CustomCacheHandler::Get', cacheKey, softTags);
    return cacheHandler.get(cacheKey, softTags);
  },

  async set(cacheKey, pendingEntry) {
    log('CustomCacheHandler::Set', cacheKey);
    return cacheHandler.set(cacheKey, pendingEntry);
  },

  // No-op(s)
  async expireTags(...tags) {},
  async receiveExpiredTags(...tags) {},
};

export default DebugCacheHandler;

/**
 * Prepends the log message with colored `[DEBUG] `
 * @param {string} text
 * @param {...any} rest
 */
function log(text, ...rest) {
  console.debug(`${styleText('yellow', '[DEBUG]')} ${text}`, ...rest);
}
