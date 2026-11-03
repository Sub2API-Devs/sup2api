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
import { hDt } from "../pastedContent.js";
import { Xq } from "../../services/api/requestFingerprint.js";

/**
 * 自动模式拒绝上限：连续 3 次或累计 20 次后回退到人工确认。
 */
//@ chunk-e6aww6q8.js:1297367-1297416 fingerprint = DENIAL_LIMITS (1)
var DENIAL_LIMITS = { maxConsecutive: 3, maxTotal: 20 },
  TIMED_FALLBACK_AUTO_DENY_MS = 120000;
/**
 * 初始拒绝跟踪状态 {consecutiveDenials:0, totalDenials:0}。
 */
//@ chunk-e6aww6q8.js:1297416-1297475 fingerprint = createDenialTrackingState (1)
function createDenialTrackingState() {
  return { consecutiveDenials: 0, totalDenials: 0 };
}
/**
 * 连续与累计拒绝数各加一。
 */
//@ chunk-e6aww6q8.js:1297475-1297576 layout = createDenialTrackingState (1)
function incrementDenialCounts(state) {
  return { ...state, consecutiveDenials: state.consecutiveDenials + 1, totalDenials: state.totalDenials + 1 };
}
/**
 * 记录一次被分类器拦下的调用：同一条 assistant 消息内只累计一次连续拒绝（按 lastRewriteMessageId 去重，只更新指纹）；新消息则连续数与 rewriteDenials 加一。
 */
//@ chunk-e6aww6q8.js:1297576-1297890 file-local
function recordRewriteDenial(state, messageId, fingerprint, countTotal = !1) {
  let next = countTotal ? { ...state, totalDenials: state.totalDenials + 1 } : state;
  if (next.lastRewriteMessageId === messageId)
    return fingerprint === next.lastRewriteFingerprint
      ? next
      : { ...next, lastRewriteFingerprint: fingerprint };
  return {
    ...next,
    consecutiveDenials: next.consecutiveDenials + 1,
    rewriteDenials: (next.rewriteDenials ?? 0) + 1,
    lastRewriteMessageId: messageId,
    lastRewriteFingerprint: fingerprint,
  };
}
/**
 * 若当前放行的调用与最近一次被拒调用指纹一致（模型改写后重试成功），把该消息贡献的连续拒绝数退回并清空重写记录。
 */
//@ chunk-e6aww6q8.js:1297890-1298160 layout
function undoRewriteDenialIfRetried(state, toolName, input) {
  if (
    state.lastRewriteFingerprint === void 0 ||
    state.lastRewriteFingerprint !== fingerprintToolCall(toolName, input)
  )
    return state;
  return {
    ...state,
    consecutiveDenials: Math.max(0, state.consecutiveDenials - (state.rewriteDenials ?? 0)),
    rewriteDenials: void 0,
    lastRewriteMessageId: void 0,
    lastRewriteFingerprint: void 0,
  };
}
/**
 * 工具名 + 输入的指纹（hDt），出错返回 undefined。
 */
//@ chunk-e6aww6q8.js:1298160-1298216 layout
function fingerprintToolCall(toolName, input) {
  try {
    return hDt(toolName, Xq(input));
  } catch {
    return;
  }
}
/**
 * 清零连续拒绝数及限时回退/重写相关字段（累计数保留）；已是干净状态时返回原对象。
 */
//@ chunk-e6aww6q8.js:1298216-1298534 layout
function resetConsecutiveDenials(state) {
  if (
    state.consecutiveDenials === 0 &&
    state.timedFallbackShown === void 0 &&
    state.lastRewriteMessageId === void 0 &&
    state.lastRewriteFingerprint === void 0 &&
    state.rewriteDenials === void 0
  )
    return state;
  return {
    ...state,
    consecutiveDenials: 0,
    timedFallbackShown: void 0,
    lastRewriteMessageId: void 0,
    lastRewriteFingerprint: void 0,
    rewriteDenials: void 0,
  };
}
/**
 * 连续拒绝 ≥3 或累计 ≥20 时需回退到人工确认。
 */
//@ chunk-e6aww6q8.js:1298534-1298626 fingerprint = shouldFallbackToPrompting (1)
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
