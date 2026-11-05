/**
 * components/PromptInput/promptFlags.ts
 *
 * 2.1.316 新增：输入框状态标志（如粘贴、队列）辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: placement 4
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-5xgkngpb.js:586325-586374 placement
/**
 * 函数 isQueuedSendNowEnabled（tengu_jiggly_mochi：排队消息立即发送开关）。
 */
function isQueuedSendNowEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jiggly_mochi", false);
}
//@ chunk-5xgkngpb.js:586374-586423 placement
/**
 * 函数 isSendNowKeyEnabled（tengu_velvet_panda：立即发送键开关）。
 */
function isSendNowKeyEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_panda", true);
}
//@ chunk-5xgkngpb.js:586423-586480 placement
/**
 * 函数 isDetachedToolCallsEnabled（两个开关都开时才行）。
 */
function isDetachedToolCallsEnabled() {
  return isSendNowKeyEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bubbly_meteor", true);
}
//@ chunk-5xgkngpb.js:586480-586537 placement
/**
 * 判断 SendMessage 的「立即发送」路径是否可用：需要 send-now 键开关与 tengu_mellow_minsky 同时打开。
 */
function isSendNowAndMellowMinskyOnce() {
  return isSendNowKeyEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_mellow_minsky", true);
}
export {
  isDetachedToolCallsEnabled,
  isSendNowAndMellowMinskyOnce,
  isQueuedSendNowEnabled,
  isSendNowKeyEnabled,
};
