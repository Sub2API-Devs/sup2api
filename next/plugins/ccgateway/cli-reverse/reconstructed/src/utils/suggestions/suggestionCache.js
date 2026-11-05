/**
 * utils/suggestions/suggestionCache.ts
 *
 * 2.1.316 新增：建议缓存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createDomainCache } from "../../tools/WebFetchTool/utils.js";
import { createSignal } from "../signal.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2368900-2369262 placement
/**
 * 输入建议的缓存状态：命令匹配索引、目录/路径扫描缓存、shell 历史、Slack 频道查询与已知频道、技能使用写入时间与调用信号。
 */
class SuggestionCacheState {
  commandMatcherIndex = null;
  internalOnly = undefined;
  directoryScanCache = createDomainCache();
  pathScanCache = createDomainCache();
  shellHistoryCommands = null;
  shellHistoryLoadedAt = 0;
  slackChannelsByQuery = new Map();
  knownSlackChannels = new Set();
  knownSlackChannelsVersion = 0;
  knownSlackChannelsChanged = createSignal();
  inflightSlackQuery = null;
  inflightSlackPromise = null;
  skillUsageLastWriteAt = new Map();
  skillInvoked = createSignal();
}
//@ chunk-5xgkngpb.js:2369262-2369289 placement
/**
 * 按会话根缓存的建议缓存状态。
 */
var suggestionCacheBySessionRoot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:2369262", () => {
  suggestionCacheBySessionRoot = new SessionRootSlot(() => new SuggestionCacheState());
});
//@ chunk-5xgkngpb.js:2369289-2369303 placement
var SUGGESTION_CACHE_TTL_MS = 60000;
export { suggestionCacheBySessionRoot, SUGGESTION_CACHE_TTL_MS };
