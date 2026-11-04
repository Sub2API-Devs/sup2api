/**
 * utils/permissions/denialTracking.ts
 *
 * auto 模式分类器拒绝计数（连续 3 / 累计 20 上限）、按 assistant 消息去重的重写拒绝、成功后清零。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/denialTracking.ts
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: fingerprint 3, layout 4, file-local 1
 */
import { bunHashPair } from "../pastedContent.js";
import { canonicalFingerprint } from "../../services/api/requestFingerprint.js";

//@ chunk-e6aww6q8.js:1297367-1297416 fingerprint (2.1.88 match: DENIAL_LIMITS, 1)
/**
 * 自动模式拒绝上限：连续 3 次或累计 20 次后回退到人工确认。
 */
var DENIAL_LIMITS = {
  maxConsecutive: 3,
  maxTotal: 20,
};
var TIMED_FALLBACK_AUTO_DENY_MS = 120000;
//@ chunk-e6aww6q8.js:1297416-1297475 fingerprint (2.1.88 match: createDenialTrackingState, 1)
/**
 * 初始拒绝跟踪状态 {consecutiveDenials:0, totalDenials:0}。
 */
function createDenialTrackingState() {
  return {
    consecutiveDenials: 0,
    totalDenials: 0,
  };
}
//@ chunk-e6aww6q8.js:1297475-1297576 layout (2.1.88 match: createDenialTrackingState, 1)
/**
 * 连续与累计拒绝数各加一。
 */
function incrementDenialCounts(state) {
  return {
    ...state,
    consecutiveDenials: state.consecutiveDenials + 1,
    totalDenials: state.totalDenials + 1,
  };
}
//@ chunk-e6aww6q8.js:1297576-1297890 file-local
/**
 * 记录一次被分类器拦下的调用：同一条 assistant 消息内只累计一次连续拒绝（按 lastRewriteMessageId 去重，只更新指纹）；新消息则连续数与 rewriteDenials 加一。
 */
function recordRewriteDenial(state, messageId, fingerprint, countTotal = false) {
  let next = countTotal
    ? {
        ...state,
        totalDenials: state.totalDenials + 1,
      }
    : state;
  if (next.lastRewriteMessageId === messageId)
    return fingerprint === next.lastRewriteFingerprint
      ? next
      : {
          ...next,
          lastRewriteFingerprint: fingerprint,
        };
  return {
    ...next,
    consecutiveDenials: next.consecutiveDenials + 1,
    rewriteDenials: (next.rewriteDenials ?? 0) + 1,
    lastRewriteMessageId: messageId,
    lastRewriteFingerprint: fingerprint,
  };
}
//@ chunk-e6aww6q8.js:1297890-1298160 layout
/**
 * 若当前放行的调用与最近一次被拒调用指纹一致（模型改写后重试成功），把该消息贡献的连续拒绝数退回并清空重写记录。
 */
function undoRewriteDenialIfRetried(state, toolName, input) {
  if (
    state.lastRewriteFingerprint === undefined ||
    state.lastRewriteFingerprint !== fingerprintToolCall(toolName, input)
  )
    return state;
  return {
    ...state,
    consecutiveDenials: Math.max(0, state.consecutiveDenials - (state.rewriteDenials ?? 0)),
    rewriteDenials: undefined,
    lastRewriteMessageId: undefined,
    lastRewriteFingerprint: undefined,
  };
}
//@ chunk-e6aww6q8.js:1298160-1298216 layout
/**
 * 工具名 + 输入的指纹（hDt），出错返回 undefined。
 */
function fingerprintToolCall(toolName, input) {
  try {
    return bunHashPair(toolName, canonicalFingerprint(input));
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:1298216-1298534 layout
/**
 * 清零连续拒绝数及限时回退/重写相关字段（累计数保留）；已是干净状态时返回原对象。
 */
function resetConsecutiveDenials(state) {
  if (
    state.consecutiveDenials === 0 &&
    state.timedFallbackShown === undefined &&
    state.lastRewriteMessageId === undefined &&
    state.lastRewriteFingerprint === undefined &&
    state.rewriteDenials === undefined
  )
    return state;
  return {
    ...state,
    consecutiveDenials: 0,
    timedFallbackShown: undefined,
    lastRewriteMessageId: undefined,
    lastRewriteFingerprint: undefined,
    rewriteDenials: undefined,
  };
}
//@ chunk-e6aww6q8.js:1298534-1298626 fingerprint (2.1.88 match: shouldFallbackToPrompting, 1)
/**
 * 连续拒绝 ≥3 或累计 ≥20 时需回退到人工确认。
 */
function shouldFallbackToPrompting(state) {
  return (
    state.consecutiveDenials >= DENIAL_LIMITS.maxConsecutive || state.totalDenials >= DENIAL_LIMITS.maxTotal
  );
}
export {
  TIMED_FALLBACK_AUTO_DENY_MS,
  createDenialTrackingState,
  resetConsecutiveDenials,
  undoRewriteDenialIfRetried,
  recordRewriteDenial,
  fingerprintToolCall,
  incrementDenialCounts,
  shouldFallbackToPrompting,
  DENIAL_LIMITS,
};
