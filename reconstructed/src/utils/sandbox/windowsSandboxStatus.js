/**
 * utils/sandbox/windowsSandboxStatus.ts
 *
 * 2.1.316 新增。Windows 沙箱状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-62v3yavp.js (3)
 * attribution: placement 3
 */
import { getPlatform } from "../platform.js";
import { checkWindowsSandboxStatusAsync } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { tD } from "./windowsSandbox.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

/**
 * Windows 辅助登录服务（seclogon）被禁用或缺失时的提示文案。
 */
//@ chunk-62v3yavp.js:336-673 placement
var SECLOGON_STATUS_MESSAGES = {
  disabled:
    "The Windows Secondary Logon service (seclogon) is disabled; an administrator must set its startup type to Manual (`sc.exe config seclogon start= demand`). The sandbox cannot start without it.",
  missing:
    "The Windows Secondary Logon service (seclogon) is not present on this machine; the sandbox cannot start without it.",
};
//@ chunk-62v3yavp.js:673-767 placement
function $6n(n) {
  return n?.seclogon === "disabled" || n?.seclogon === "missing"
    ? SECLOGON_STATUS_MESSAGES[n.seclogon]
    : void 0;
}
/**
 * Windows 下读取沙箱状态并给出用户可见的说明，读取失败只记日志。
 */
//@ chunk-62v3yavp.js:767-960 placement
async function getWindowsSandboxUserStatus() {
  if (getPlatform() !== "windows") return;
  let n = await checkWindowsSandboxStatusAsync({ srtWin: tD() }).catch((o) => {
    logForDebugging(`[sandbox] could not read the sandbox status: ${errorMessage(o)}`, { level: "error" });
    return;
  });
  return $6n(n?.user);
}

export { $6n, getWindowsSandboxUserStatus };
