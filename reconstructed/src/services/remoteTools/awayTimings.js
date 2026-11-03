/**
 * services/remoteTools/awayTimings.ts
 *
 * 2.1.316 新增：远程工具离开检测的时间常量
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bcesxe71.js (2)
 * attribution: placement 2
 */

//@ chunk-bcesxe71.js:191-205 placement
/**
 * 会话存活判定超时。
 */
var SESSION_LIVENESS_TIMEOUT_MS = 45000;
//@ chunk-bcesxe71.js:205-218 placement
/**
 * 重连退避的起始间隔。
 */
var RECONNECT_BACKOFF_BASE_MS = 1000;
export { RECONNECT_BACKOFF_BASE_MS, SESSION_LIVENESS_TIMEOUT_MS };
