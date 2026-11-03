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
import { Yi } from "../../commands/mobile/mobile.js";
import { logForDebugging } from "../debug.js";
import { W$r } from "./chromeMcpServer.js";

/**
 * 记录 Claude in Chrome 桥给出的浏览器提示（首选设备、本机设备 id、主机平台），会话内已选的浏览器优先于重发的提示。
 */
//@ chunk-09jqgwgm.js:299-959 placement
function setChromeBrowserHints(e) {
  let r = Yi(),
    lastSentPreferredDeviceId = r.lastSentPreferredDeviceId,
    i =
      r.browserHints !== void 0 &&
      r.browserHints.preferredDeviceId === void 0 &&
      lastSentPreferredDeviceId !== void 0 &&
      e.preferredDeviceId === lastSentPreferredDeviceId;
  ((r.lastSentPreferredDeviceId = e.preferredDeviceId),
    (r.browserHints =
      e.preferredDeviceId === void 0 && e.localDeviceIds.length === 0
        ? void 0
        : i
          ? { ...e, preferredDeviceId: void 0 }
          : e),
    logForDebugging(
      `[Claude in Chrome] browser hints: preferred=${e.preferredDeviceId?.slice(0, 8) ?? "none"} local=${e.localDeviceIds.length}${i ? " (re-send; in-session pick stands)" : ""}`,
    ));
  let bridgeBinding = r.bridgeBinding;
  if (
    bridgeBinding &&
    e.preferredDeviceId !== void 0 &&
    e.preferredDeviceId !== lastSentPreferredDeviceId &&
    bridgeBinding.socketClient.getSelectedDeviceId?.() !== e.preferredDeviceId
  )
    W$r(bridgeBinding.socketClient);
}
//@ chunk-09jqgwgm.js:959-1118 placement
function supersedeHintedPreferredDeviceId(e) {
  let r = Yi(),
    browserHints = r.browserHints;
  if (!browserHints || browserHints.preferredDeviceId === void 0 || browserHints.preferredDeviceId === e)
    return;
  r.browserHints = { ...browserHints, preferredDeviceId: void 0 };
}
//@ chunk-09jqgwgm.js:1118-1183 placement
function hintedPreferredDeviceId(e) {
  return Yi().browserHints?.preferredDeviceId ?? e();
}
//@ chunk-09jqgwgm.js:1183-1289 placement
function hintedLocalDeviceIds() {
  let browserHints = Yi().browserHints;
  if (!browserHints) return;
  return new Map(browserHints.localDeviceIds.map((localDeviceId) => [localDeviceId, "live"]));
}
//@ chunk-09jqgwgm.js:1289-1343 placement
function hintedHostPlatform() {
  return Yi().browserHints?.hostPlatform;
}

export {
  supersedeHintedPreferredDeviceId,
  hintedPreferredDeviceId,
  hintedLocalDeviceIds,
  hintedHostPlatform,
};
