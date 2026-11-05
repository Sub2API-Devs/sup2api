/**
 * utils/permissions/denialTracking.ts
 *
 * auto 模式分类器拒绝计数（连续 3 / 累计 20 上限）、按 assistant 消息去重的重写拒绝、成功后清零。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/denialTracking.ts
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: fingerprint 3, layout 4, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { bunHashPair } from "../pastedContent.js";
import { canonicalFingerprint } from "../../services/api/requestFingerprint.js";

//@ chunk-5xgkngpb.js:1296241-1296290 fingerprint (2.1.88 match: DENIAL_LIMITS, 1)
/**
 * 自动模式拒绝上限：连续 3 次或累计 20 次后回退到人工确认。
 */
var DENIAL_LIMITS = {
  maxConsecutive: 3,
  maxTotal: 20,
};
var TIMED_FALLBACK_AUTO_DENY_MS = 120000;
//@ chunk-5xgkngpb.js:1296290-1296349 fingerprint (2.1.88 match: createDenialTrackingState, 1)
/**
 * 初始拒绝跟踪状态 {consecutiveDenials:0, totalDenials:0}。
 */
function createDenialTrackingState() {
  return {
    consecutiveDenials: 0,
    totalDenials: 0,
  };
}
//@ chunk-5xgkngpb.js:1296349-1296450 layout (2.1.88 match: createDenialTrackingState, 1)
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
//@ chunk-5xgkngpb.js:1296450-1296764 file-local
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
//@ chunk-5xgkngpb.js:1296764-1297034 layout
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
//@ chunk-5xgkngpb.js:1297034-1297090 layout
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
//@ chunk-5xgkngpb.js:1297090-1297408 layout
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
//@ chunk-5xgkngpb.js:1297408-1297500 fingerprint (2.1.88 match: shouldFallbackToPrompting, 1)
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
