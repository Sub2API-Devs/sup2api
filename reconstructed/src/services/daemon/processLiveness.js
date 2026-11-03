/**
 * services/daemon/processLiveness.ts
 *
 * 2.1.316 新增：进程存活检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y162pn60.js (4)
 * attribution: placement 4
 */
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { isSameProcessAsync, isExitedProcessAsync } from "../../utils/processIdentity.js";

//@ chunk-y162pn60.js:17913-18053 placement
/**
 * 检查进程存活：pid 不存在、启动时间不符、僵尸或存活。
 */
async function checkProcessLiveness(pid, n) {
  if (!isProcessRunning(pid)) return "dead_pid";
  if (!(await isSameProcessAsync(pid, n))) return "procstart_mismatch";
  if (await isExitedProcessAsync(pid)) return "zombie";
  return "live";
}
//@ chunk-y162pn60.js:18053-18108 placement
/**
 * 判断进程是否存活（"live"）。
 */
async function isProcessLive(pid, procStart) {
  return (await checkProcessLiveness(pid, procStart)) === "live";
}
//@ chunk-y162pn60.js:18108-18150 placement
/**
 * 匹配 “以 - 开头或带协议前缀” 的正则。
 */
var UNSAFE_MODEL_ARG_RE = /^-|^[A-Za-z][A-Za-z0-9+.-]+:\/\//;
//@ chunk-y162pn60.js:18150-18205 placement
/**
 * 判断字符串是否可作为模型参数（非选项、非 URL、无 NUL）。
 */
function isAcceptableModelArg(e) {
  return !UNSAFE_MODEL_ARG_RE.test(e) && !e.includes("\x00");
}
export { isAcceptableModelArg, checkProcessLiveness, isProcessLive };
