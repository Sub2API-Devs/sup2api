/**
 * services/compact/postCompactCleanup.ts
 *
 * 判断压缩后是否需要做主线程清理（querySource 为主线程/sdk/compact 且非代理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/compact/postCompactCleanup.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { isMainQuerySource } from "../api/requestHeaders.js";
import { expectPromptCacheDrop, MAIN as MAIN_2 } from "../api/promptCacheBreakDetection.js";
import { lse } from "../api/promptPrefixLedger.js";
import {
  getStickyBetas,
  clearSystemPromptSectionState,
  clearBetaHeaderLatches,
  getTotalOutputTokens,
  getIsInteractive,
} from "../../bootstrap/state.js";
import { xDt } from "../../bootstrap/stateSlices.js";
import { discardPrecompute } from "./precomputedCompact.js";
import { invalidateUserContext } from "../../context.js";
import { nextEagerLoadReason } from "../../utils/claudemd.js";
import { resetNoticeBudgets } from "../liveReplica/liveReplica.js";
import { MSe } from "../mcp/mcpToolAvailability.js";
import { Moi } from "../../utils/telemetry/betaSessionTracing.js";
import {
  resetClassifierApprovals,
  makeClassifierApprovalsSetter,
} from "../../utils/permissions/permissions.js";
import { isFullscreenActive } from "../../utils/fullscreen.js";
import { consumeFailedTranscriptWrite, clearSessionMessagesCache } from "../../utils/sessionStorage.js";

//@ chunk-e6aww6q8.js:2475667-2475720 placement
function Ywt() {
  return require("./chunk-1cnesc1e.js");
}
//@ chunk-e6aww6q8.js:2475720-2475764 placement
function hfe(e, n) {
  return n === void 0 && isMainQuerySource(e);
}
/**
 * 压缩后的清理：预期缓存失效、重置 beta 锁存与 system prompt 段、丢弃预计算压缩、重置提示预算与 teleport 缓存、记录缓存未命中确认点、必要时清空消息缓存。
 */
//@ chunk-e6aww6q8.js:2475764-2476386 placement
function cleanupAfterCompaction(e, n, r, s, h, y) {
  let S = isMainQuerySource(n);
  if (S && s === void 0) expectPromptCacheDrop(MAIN_2);
  if (
    (lse(h ?? getStickyBetas(), "compaction"),
    xDt(h ?? getStickyBetas()),
    discardPrecompute(e.precompute, s, "post_compact_cleanup", n, y),
    S)
  ) {
    if (
      (invalidateUserContext(e, "compaction"),
      nextEagerLoadReason("compact"),
      resetNoticeBudgets(),
      clearSystemPromptSectionState("compaction"),
      h === void 0)
    ) {
      if ((clearBetaHeaderLatches(), !MSe()))
        ((getStickyBetas().declaredTools = void 0), (getStickyBetas().noChannelTools = void 0));
    }
    (Moi(), resetClassifierApprovals(r ? makeClassifierApprovalsSetter(r) : void 0));
  }
  if (S) {
    let w = Ywt();
    if (w?.getTeleportCacheState().status === "active") w.revertTeleportCache("compaction", "main");
  }
  if (S) e.autonomousLoopPreamble.reset();
  if (S && r) {
    let w = getTotalOutputTokens();
    r((L) => {
      if (L.cacheMissAckedAtOutputTokens === w) return L;
      return { ...L, cacheMissAckedAtOutputTokens: w };
    });
  }
  if (getIsInteractive() ? !isFullscreenActive() : S && consumeFailedTranscriptWrite())
    clearSessionMessagesCache();
}

export { cleanupAfterCompaction, hfe, Ywt };
