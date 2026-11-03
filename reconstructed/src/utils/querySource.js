/**
 * utils/querySource.ts
 *
 * 2.1.316 新增：查询来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { getPromptCachingEnabled, isOneHourCacheTtl } from "../services/api/claude.js";
import { getMainLoopModel } from "./model/model.js";
import { isCacheCold, findLastRealAssistantMessage } from "../services/compact/autoCompact.js";
import { CACHE_TTL_1H_MS, CACHE_TTL_5M_MS } from "../services/api/promptCacheBreakDetection.js";
import { getLastMainThreadRequestAt } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:2076386-2076482 placement = isMainThreadSource (1)
function isMainThreadSource(messages, n = Date.now()) {
  if (!getPromptCachingEnabled(getMainLoopModel())) return false;
  return !isCacheCold(messages, isOneHourCacheTtl("repl_main_thread") ? CACHE_TTL_1H_MS : CACHE_TTL_5M_MS, n);
}
//@ chunk-e6aww6q8.js:2076482-2076624 placement
/**
 * 主线程来源下，返回最近一次响应（仅当它不早于最后一次主线程请求）。
 */
function lastMainThreadResponse(messages, n = Date.now()) {
  if (!isMainThreadSource(messages, n)) return;
  let lastRealAssistantMessage = findLastRealAssistantMessage(messages);
  return {
    response:
      (lastRealAssistantMessage !== undefined ? Date.parse(lastRealAssistantMessage.timestamp) : NaN) >=
      (getLastMainThreadRequestAt() ?? -1 / 0)
        ? lastRealAssistantMessage
        : undefined,
  };
}
export { isMainThreadSource, lastMainThreadResponse };
