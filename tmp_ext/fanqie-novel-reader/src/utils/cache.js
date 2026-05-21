import localforage from 'localforage';
import { INDEXEDDB_STORE_NAME, DIRECTORY_CACHE_KEY, CHAPTER_CACHE_KEY, DETAIL_CACHE_KEY } from './constants';

const store = localforage.createInstance({ name: INDEXEDDB_STORE_NAME });

/**
 * IndexedDB-backed cache for directory, detail, and chapter data.
 * Uses localforage; get/set/remove are async.
 */
export function createCacheHelpers(cacheKeyPrefix) {
  return {
    get: (id) => store.getItem(`${cacheKeyPrefix}-${id}`),
    set: (id, data) => store.setItem(`${cacheKeyPrefix}-${id}`, data),
    remove: (id) => store.removeItem(`${cacheKeyPrefix}-${id}`),
  };
}

export const directoryCache = createCacheHelpers(DIRECTORY_CACHE_KEY);
export const chapterCache = createCacheHelpers(CHAPTER_CACHE_KEY);
export const detailCache = createCacheHelpers(DETAIL_CACHE_KEY);
