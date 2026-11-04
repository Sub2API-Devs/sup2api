/**
 * components/PromptInput/promptFlags.ts
 *
 * 2.1.316 新增：输入框状态标志（如粘贴、队列）辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-e6aww6q8.js:3877861-3877910 placement
/**
 * 函数 isQueuedSendNowEnabled（tengu_jiggly_mochi：排队消息立即发送开关）。
 */
function isQueuedSendNowEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jiggly_mochi", false);
}
//@ chunk-e6aww6q8.js:3877910-3877959 placement
/**
 * 函数 isSendNowKeyEnabled（tengu_velvet_panda：立即发送键开关）。
 */
function isSendNowKeyEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_panda", true);
}
//@ chunk-e6aww6q8.js:3877959-3878016 placement
/**
 * 函数 isDetachedToolCallsEnabled（两个开关都开时才行）。
 */
function isDetachedToolCallsEnabled() {
  return isSendNowKeyEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_bubbly_meteor", true);
}
export { isQueuedSendNowEnabled, isSendNowKeyEnabled, isDetachedToolCallsEnabled };
