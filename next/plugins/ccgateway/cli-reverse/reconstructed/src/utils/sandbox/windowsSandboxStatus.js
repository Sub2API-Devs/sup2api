/**
 * utils/sandbox/windowsSandboxStatus.ts
 *
 * 2.1.316 新增。Windows 沙箱状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-kyyc5rrw.js (3)
 * attribution: placement 3
 */
import { getPlatform } from "../platform.js";
import { checkWindowsSandboxStatusAsync } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { rgRunner } from "./windowsSandbox.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";

//@ chunk-kyyc5rrw.js:336-673 placement
/**
 * Windows 辅助登录服务（seclogon）被禁用或缺失时的提示文案。
 */
var SECLOGON_STATUS_MESSAGES = {
  disabled:
    "The Windows Secondary Logon service (seclogon) is disabled; an administrator must set its startup type to Manual (`sc.exe config seclogon start= demand`). The sandbox cannot start without it.",
  missing:
    "The Windows Secondary Logon service (seclogon) is not present on this machine; the sandbox cannot start without it.",
};
//@ chunk-kyyc5rrw.js:673-767 placement
/**
 * seclogonStatusMessage：seclogon 服务禁用/缺失时的提示。
 */
function seclogonStatusMessage(user) {
  return user?.seclogon === "disabled" || user?.seclogon === "missing"
    ? SECLOGON_STATUS_MESSAGES[user.seclogon]
    : undefined;
}
//@ chunk-kyyc5rrw.js:767-960 placement
/**
 * Windows 下读取沙箱状态并给出用户可见的说明，读取失败只记日志。
 */
async function getWindowsSandboxUserStatus() {
  if (getPlatform() !== "windows") return;
  let status = await checkWindowsSandboxStatusAsync({
    srtWin: rgRunner(),
  }).catch((error) => {
    logForDebugging(`[sandbox] could not read the sandbox status: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  });
  return seclogonStatusMessage(status?.user);
}
export { seclogonStatusMessage, getWindowsSandboxUserStatus };
