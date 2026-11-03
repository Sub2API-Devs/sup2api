/**
 * utils/suggestions/suggestionCache.ts
 *
 * 2.1.316 新增：建议缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { createDomainCache } from "../../tools/WebFetchTool/utils.js";
import { createSignal } from "../signal.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-e6aww6q8.js:2313500-2313874 placement
/**
 * 输入建议的缓存状态：命令匹配索引、目录/路径扫描缓存、shell 历史、Slack 频道查询与已知频道、技能使用写入时间与调用信号。
 */
class SuggestionCacheState {
  commandMatcherIndex = null;
  internalOnlyCommandNames = undefined;
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
//@ chunk-e6aww6q8.js:2313874-2313901 placement
/**
 * 按会话根缓存的建议缓存状态。
 */
var suggestionCacheBySessionRoot = new SessionRootSlot(() => new SuggestionCacheState());
//@ chunk-e6aww6q8.js:2313901-2313915 placement
var SUGGESTION_CACHE_TTL_MS = 60000;
export { suggestionCacheBySessionRoot, SUGGESTION_CACHE_TTL_MS };
