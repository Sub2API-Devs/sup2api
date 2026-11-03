/**
 * utils/claudeInChrome/browserHints.ts
 *
 * 2.1.316 新增。记录 Claude in Chrome 桥给出的浏览器提示（首选设备、本机设备 id、主机平台），会话内已选的浏览器优先于重发的提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-09jqgwgm.js (5)
 * attribution: placement 5
 */
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { logForDebugging } from "../debug.js";
import { releaseBrowserSelection } from "./chromeMcpServer.js";

//@ chunk-09jqgwgm.js:299-959 placement
/**
 * 记录 Claude in Chrome 桥给出的浏览器提示（首选设备、本机设备 id、主机平台），会话内已选的浏览器优先于重发的提示。
 */
function setChromeBrowserHints(e) {
  let r = claudeInChromeSession();
  let lastSentPreferredDeviceId = r.lastSentPreferredDeviceId;
  let i =
    r.browserHints !== undefined &&
    r.browserHints.preferredDeviceId === undefined &&
    lastSentPreferredDeviceId !== undefined &&
    e.preferredDeviceId === lastSentPreferredDeviceId;
  r.lastSentPreferredDeviceId = e.preferredDeviceId;
  r.browserHints =
    e.preferredDeviceId === undefined && e.localDeviceIds.length === 0
      ? undefined
      : i
        ? {
            ...e,
            preferredDeviceId: undefined,
          }
        : e;
  logForDebugging(
    `[Claude in Chrome] browser hints: preferred=${e.preferredDeviceId?.slice(0, 8) ?? "none"} local=${e.localDeviceIds.length}${i ? " (re-send; in-session pick stands)" : ""}`,
  );
  let bridgeBinding = r.bridgeBinding;
  if (
    bridgeBinding &&
    e.preferredDeviceId !== undefined &&
    e.preferredDeviceId !== lastSentPreferredDeviceId &&
    bridgeBinding.socketClient.getSelectedDeviceId?.() !== e.preferredDeviceId
  )
    releaseBrowserSelection(bridgeBinding.socketClient);
}
//@ chunk-09jqgwgm.js:959-1118 placement
function supersedeHintedPreferredDeviceId(deviceId) {
  let r = claudeInChromeSession();
  let browserHints = r.browserHints;
  if (
    !browserHints ||
    browserHints.preferredDeviceId === undefined ||
    browserHints.preferredDeviceId === deviceId
  )
    return;
  r.browserHints = {
    ...browserHints,
    preferredDeviceId: undefined,
  };
}
//@ chunk-09jqgwgm.js:1118-1183 placement
function hintedPreferredDeviceId(e) {
  return claudeInChromeSession().browserHints?.preferredDeviceId ?? e();
}
//@ chunk-09jqgwgm.js:1183-1289 placement
function hintedLocalDeviceIds() {
  let browserHints = claudeInChromeSession().browserHints;
  if (!browserHints) return;
  return new Map(browserHints.localDeviceIds.map((localDeviceId) => [localDeviceId, "live"]));
}
//@ chunk-09jqgwgm.js:1289-1343 placement
function hintedHostPlatform() {
  return claudeInChromeSession().browserHints?.hostPlatform;
}
export {
  supersedeHintedPreferredDeviceId,
  hintedPreferredDeviceId,
  hintedLocalDeviceIds,
  hintedHostPlatform,
};
