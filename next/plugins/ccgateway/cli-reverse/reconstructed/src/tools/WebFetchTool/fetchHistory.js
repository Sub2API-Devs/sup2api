/**
 * tools/WebFetchTool/fetchHistory.ts
 *
 * WebFetch 历史（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";

//@ chunk-7jxyna5q.js:432031-432053 placement
/**
 * WebFetch 抓取历史缓存条目的有效期（1 小时）。
 */
var WEBFETCH_HISTORY_TTL_MS = 3600000;
var MAX_PROMPT_HASHES_PER_URL = 32;
//@ chunk-7jxyna5q.js:432053-432121 placement
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
