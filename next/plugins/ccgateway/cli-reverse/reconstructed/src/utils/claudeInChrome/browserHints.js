/**
 * utils/claudeInChrome/browserHints.ts
 *
 * 2.1.316 新增。记录 Claude in Chrome 桥给出的浏览器提示（首选设备、本机设备 id、主机平台），会话内已选的浏览器优先于重发的提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8ntqfva8.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { logForDebugging } from "../debug.js";
import { releaseBrowserSelection } from "./chromeMcpServer.js";

//@ chunk-8ntqfva8.js:299-959 placement
/**
 * 记录 Claude in Chrome 桥给出的浏览器提示（首选设备、本机设备 id、主机平台），会话内已选的浏览器优先于重发的提示。
 */
function setChromeBrowserHints(hints) {
  let session = claudeInChromeSession();
  let lastSentPreferredDeviceId = session.lastSentPreferredDeviceId;
  let isResend =
    session.browserHints !== undefined &&
    session.browserHints.preferredDeviceId === undefined &&
    lastSentPreferredDeviceId !== undefined &&
    hints.preferredDeviceId === lastSentPreferredDeviceId;
  session.lastSentPreferredDeviceId = hints.preferredDeviceId;
  session.browserHints =
    hints.preferredDeviceId === undefined && hints.localDeviceIds.length === 0
      ? undefined
      : isResend
        ? {
            ...hints,
            preferredDeviceId: undefined,
          }
        : hints;
  logForDebugging(
    `[Claude in Chrome] browser hints: preferred=${hints.preferredDeviceId?.slice(0, 8) ?? "none"} local=${hints.localDeviceIds.length}${isResend ? " (re-send; in-session pick stands)" : ""}`,
  );
  let bridgeBinding = session.bridgeBinding;
  if (
    bridgeBinding &&
    hints.preferredDeviceId !== undefined &&
    hints.preferredDeviceId !== lastSentPreferredDeviceId &&
    bridgeBinding.socketClient.getSelectedDeviceId?.() !== hints.preferredDeviceId
  )
    releaseBrowserSelection(bridgeBinding.socketClient);
}
//@ chunk-8ntqfva8.js:959-1118 placement
function supersedeHintedPreferredDeviceId(deviceId) {
  let session = claudeInChromeSession();
  let browserHints = session.browserHints;
  if (
    !browserHints ||
    browserHints.preferredDeviceId === undefined ||
    browserHints.preferredDeviceId === deviceId
  )
    return;
  session.browserHints = {
    ...browserHints,
    preferredDeviceId: undefined,
  };
}
//@ chunk-8ntqfva8.js:1118-1183 placement
function hintedPreferredDeviceId(fallbackDeviceId) {
  return claudeInChromeSession().browserHints?.preferredDeviceId ?? fallbackDeviceId();
}
//@ chunk-8ntqfva8.js:1183-1289 placement
function hintedLocalDeviceIds() {
  let browserHints = claudeInChromeSession().browserHints;
  if (!browserHints) return;
  return new Map(browserHints.localDeviceIds.map((localDeviceId) => [localDeviceId, "live"]));
}
//@ chunk-8ntqfva8.js:1289-1343 placement
function hintedHostPlatform() {
  return claudeInChromeSession().browserHints?.hostPlatform;
}
export {
  supersedeHintedPreferredDeviceId,
  hintedPreferredDeviceId,
  hintedLocalDeviceIds,
  hintedHostPlatform,
  setChromeBrowserHints,
};
