/**
 * utils/querySource.ts
 *
 * 2.1.316 新增：查询来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getPromptCachingEnabled, isOneHourCacheTtl } from "../services/api/claude.js";
import { getMainLoopModel } from "./model/model.js";
import { isCacheCold, findLastRealAssistantMessage } from "../services/compact/autoCompact.js";
import { CACHE_TTL_1H_MS, CACHE_TTL_5M_MS } from "../services/api/promptCacheBreakDetection.js";
import { getLastMainThreadRequestAt } from "../bootstrap/state.js";

//@ chunk-5xgkngpb.js:2132783-2132878 placement (2.1.88 match: isMainThreadSource, 1)
function isMainThreadSource(messages, now = Date.now()) {
  if (!getPromptCachingEnabled(getMainLoopModel())) return false;
  return !isCacheCold(
    messages,
    isOneHourCacheTtl("repl_main_thread") ? CACHE_TTL_1H_MS : CACHE_TTL_5M_MS,
    now,
  );
}
//@ chunk-5xgkngpb.js:2132878-2133020 placement (2.1.88 match: _temp, 0.664)
/**
 * 主线程来源下，返回最近一次响应（仅当它不早于最后一次主线程请求）。
 */
function lastMainThreadResponse(messages, now = Date.now()) {
  if (!isMainThreadSource(messages, now)) return;
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
