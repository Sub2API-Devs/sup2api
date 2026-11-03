/**
 * tools/WebFetchTool/fetchHistory.ts
 *
 * WebFetch 历史（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (2)
 * attribution: placement 2
 */
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";

//@ chunk-s61vbvea.js:514928-514950 placement
/**
 * WebFetch 抓取历史缓存条目的有效期（1 小时）。
 */
var WEBFETCH_HISTORY_TTL_MS = 3600000;
var MAX_PROMPT_HASHES_PER_URL = 32;
//@ chunk-s61vbvea.js:514950-515018 placement
class WebFetchHistory {
  urls = new LRUCache({
    max: 1024,
    ttl: WEBFETCH_HISTORY_TTL_MS,
  });
  clear() {
    this.urls.clear();
  }
}
export { WebFetchHistory, MAX_PROMPT_HASHES_PER_URL };
