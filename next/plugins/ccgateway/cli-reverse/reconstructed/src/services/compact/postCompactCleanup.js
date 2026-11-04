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
  return require("../teleport/relayState.js");
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
function cleanupAfterCompaction(session, querySource, setAppState, agentId, stickyBetas, storageV5) {
  let isMainThread = isMainQuerySource(querySource);
  if (isMainThread && agentId === undefined) expectPromptCacheDrop(MAIN_2);
  noopLedger(stickyBetas ?? getStickyBetas(), "compaction");
  clearAdvisorHeld(stickyBetas ?? getStickyBetas());
  discardPrecompute(session.precompute, agentId, "post_compact_cleanup", querySource, storageV5);
  if (isMainThread) {
    invalidateUserContext(session, "compaction");
    nextEagerLoadReason("compact");
    resetNoticeBudgets();
    clearSystemPromptSectionState("compaction");
    if (stickyBetas === undefined) {
      clearBetaHeaderLatches();
      if (!isFoamySpringEnabled_2()) {
        getStickyBetas().declaredTools = undefined;
        getStickyBetas().noChannelTools = undefined;
      }
    }
    clearBetaTracingState();
    resetClassifierApprovals(setAppState ? makeClassifierApprovalsSetter(setAppState) : undefined);
  }
  if (isMainThread) {
    let cleanupHelpers = loadCleanupHelpers();
    if (cleanupHelpers?.getTeleportCacheState().status === "active")
      cleanupHelpers.revertTeleportCache("compaction", "main");
  }
  if (isMainThread) session.autonomousLoopPreamble.reset();
  if (isMainThread && setAppState) {
    let totalOutputTokens = getTotalOutputTokens();
    setAppState((state) => {
      if (state.cacheMissAckedAtOutputTokens === totalOutputTokens) return state;
      return {
        ...state,
        cacheMissAckedAtOutputTokens: totalOutputTokens,
      };
    });
  }
  if (getIsInteractive() ? !isFullscreenActive() : isMainThread && consumeFailedTranscriptWrite())
    clearSessionMessagesCache();
}
export { cleanupAfterCompaction, isMainQueryCompaction, loadCleanupHelpers };
