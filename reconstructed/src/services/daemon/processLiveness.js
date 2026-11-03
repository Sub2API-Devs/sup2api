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

/**
 * 检查进程存活：pid 不存在、启动时间不符、僵尸或存活。
 */
//@ chunk-y162pn60.js:17913-18053 placement
async function checkProcessLiveness(e, n) {
  if (!isProcessRunning(e)) return "dead_pid";
  if (!(await isSameProcessAsync(e, n))) return "procstart_mismatch";
  if (await isExitedProcessAsync(e)) return "zombie";
  return "live";
}
//@ chunk-y162pn60.js:18053-18108 placement
async function oyn(e, n) {
  return (await checkProcessLiveness(e, n)) === "live";
}
//@ chunk-y162pn60.js:18108-18150 placement
var Ft = /^-|^[A-Za-z][A-Za-z0-9+.-]+:\/\//;
//@ chunk-y162pn60.js:18150-18205 placement
function Xse(e) {
  return !Ft.test(e) && !e.includes("\x00");
}

export { Xse, checkProcessLiveness, oyn };
