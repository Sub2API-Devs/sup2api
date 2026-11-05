/**
 * services/daemon/processLiveness.ts
 *
 * 2.1.316 新增：进程存活检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rmd7n4gq.js (4)
 * attribution: placement 4
 */
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { isSameProcessAsync, isExitedProcessAsync } from "../../utils/processIdentity.js";

//@ chunk-rmd7n4gq.js:18121-18261 placement
/**
 * 检查进程存活：pid 不存在、启动时间不符、僵尸或存活。
 */
async function checkProcessLiveness(pid, procStart) {
  if (!isProcessRunning(pid)) return "dead_pid";
  if (!(await isSameProcessAsync(pid, procStart))) return "procstart_mismatch";
  if (await isExitedProcessAsync(pid)) return "zombie";
  return "live";
}
//@ chunk-rmd7n4gq.js:18261-18316 placement
/**
 * 判断进程是否存活（"live"）。
 */
async function isProcessLive(pid, procStart) {
  return (await checkProcessLiveness(pid, procStart)) === "live";
}
//@ chunk-rmd7n4gq.js:18316-18358 placement
/**
 * 匹配 “以 - 开头或带协议前缀” 的正则。
 */
var UNSAFE_MODEL_ARG_RE = /^-|^[A-Za-z][A-Za-z0-9+.-]+:\/\//;
//@ chunk-rmd7n4gq.js:18358-18413 placement
/**
 * 判断字符串是否可作为模型参数（非选项、非 URL、无 NUL）。
 */
function isAcceptableModelArg(value) {
  return !UNSAFE_MODEL_ARG_RE.test(value) && !value.includes("\x00");
}
export { isAcceptableModelArg, checkProcessLiveness, isProcessLive };
