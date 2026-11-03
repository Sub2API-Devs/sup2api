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
import { noopLedger } from "../api/promptPrefixLedger.js";
import {
  getStickyBetas,
  clearSystemPromptSectionState,
  clearBetaHeaderLatches,
  getTotalOutputTokens,
  getIsInteractive,
} from "../../bootstrap/state.js";
import { clearAdvisorHeld } from "../../bootstrap/stateSlices.js";
import { discardPrecompute } from "./precomputedCompact.js";
import { invalidateUserContext } from "../../context.js";
import { nextEagerLoadReason } from "../../utils/claudemd.js";
import { resetNoticeBudgets } from "../liveReplica/liveReplica.js";
import { isFoamySpringEnabled as isFoamySpringEnabled_2 } from "../mcp/mcpToolAvailability.js";
import { clearBetaTracingState } from "../../utils/telemetry/betaSessionTracing.js";
import {
  resetClassifierApprovals,
  makeClassifierApprovalsSetter,
} from "../../utils/permissions/permissions.js";
import { isFullscreenActive } from "../../utils/fullscreen.js";
import { consumeFailedTranscriptWrite, clearSessionMessagesCache } from "../../utils/sessionStorage.js";

//@ chunk-e6aww6q8.js:2475667-2475720 placement
/**
 * 惰性加载压缩后清理所需的辅助模块。
 */
function loadCleanupHelpers() {
  return require("./chunk-1cnesc1e.js");
}
//@ chunk-e6aww6q8.js:2475720-2475764 placement
/**
 * 判断这次压缩是否属于主查询（非子代理、非特定来源）。
 */
function isMainQueryCompaction(querySource, agentId) {
  return agentId === undefined && isMainQuerySource(querySource);
}
//@ chunk-e6aww6q8.js:2475764-2476386 placement
/**
 * 压缩后的清理：预期缓存失效、重置 beta 锁存与 system prompt 段、丢弃预计算压缩、重置提示预算与 teleport 缓存、记录缓存未命中确认点、必要时清空消息缓存。
 */
function cleanupAfterCompaction(session, n, setAppState, s, h, storageV5) {
  let S = isMainQuerySource(n);
  if (S && s === undefined) expectPromptCacheDrop(MAIN_2);
  noopLedger(h ?? getStickyBetas(), "compaction");
  clearAdvisorHeld(h ?? getStickyBetas());
  discardPrecompute(session.precompute, s, "post_compact_cleanup", n, storageV5);
  if (S) {
    invalidateUserContext(session, "compaction");
    nextEagerLoadReason("compact");
    resetNoticeBudgets();
    clearSystemPromptSectionState("compaction");
    if (h === undefined) {
      clearBetaHeaderLatches();
      if (!isFoamySpringEnabled_2()) {
        getStickyBetas().declaredTools = undefined;
        getStickyBetas().noChannelTools = undefined;
      }
    }
    clearBetaTracingState();
    resetClassifierApprovals(setAppState ? makeClassifierApprovalsSetter(setAppState) : undefined);
  }
  if (S) {
    let cleanupHelpers = loadCleanupHelpers();
    if (cleanupHelpers?.getTeleportCacheState().status === "active")
      cleanupHelpers.revertTeleportCache("compaction", "main");
  }
  if (S) session.autonomousLoopPreamble.reset();
  if (S && setAppState) {
    let totalOutputTokens = getTotalOutputTokens();
    setAppState((L) => {
      if (L.cacheMissAckedAtOutputTokens === totalOutputTokens) return L;
      return {
        ...L,
        cacheMissAckedAtOutputTokens: totalOutputTokens,
      };
    });
  }
  if (getIsInteractive() ? !isFullscreenActive() : S && consumeFailedTranscriptWrite())
    clearSessionMessagesCache();
}
export { cleanupAfterCompaction, isMainQueryCompaction, loadCleanupHelpers };
