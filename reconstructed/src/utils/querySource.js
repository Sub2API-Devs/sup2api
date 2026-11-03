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
import { tpn, use } from "../services/compact/autoCompact.js";
import { oR, CACHE_TTL_5M_MS } from "../services/api/promptCacheBreakDetection.js";
import { getLastMainThreadRequestAt } from "../bootstrap/state.js";

//@ chunk-e6aww6q8.js:2076386-2076482 placement = isMainThreadSource (1)
function isMainThreadSource(e, n = Date.now()) {
  if (!getPromptCachingEnabled(getMainLoopModel())) return !1;
  return !tpn(e, isOneHourCacheTtl("repl_main_thread") ? oR : CACHE_TTL_5M_MS, n);
}
/**
 * 主线程来源下，返回最近一次响应（仅当它不早于最后一次主线程请求）。
 */
//@ chunk-e6aww6q8.js:2076482-2076624 placement
function lastMainThreadResponse(e, n = Date.now()) {
  if (!isMainThreadSource(e, n)) return;
  let r = use(e);
  return {
    response:
      (r !== void 0 ? Date.parse(r.timestamp) : NaN) >= (getLastMainThreadRequestAt() ?? -1 / 0) ? r : void 0,
  };
}

export { isMainThreadSource, lastMainThreadResponse };
