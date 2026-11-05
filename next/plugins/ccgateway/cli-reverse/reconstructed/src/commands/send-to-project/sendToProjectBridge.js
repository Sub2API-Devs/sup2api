/**
 * commands/send-to-project/sendToProjectBridge.ts
 *
 * 发送到项目前把 Remote Control 开起来：先征询、预检设备与账号，再等连接（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-46zjpx8m.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isBridgeEnabledInbound,
  bridgeAskedAs,
  checkBridgePrerequisites,
  enableRemoteControlWithConsent,
  waitForBridgeConnected,
} from "../bridge/bridge.js";
import { continueInProjectsRemoteControlDialog } from "./remoteControlOffRequest.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";

//@ chunk-46zjpx8m.js:13767-13785 placement
var ENABLE_CONNECT_TIMEOUT_MS = 45000;
var ALREADY_ON_CONNECT_TIMEOUT_MS = 1e4;
//@ chunk-46zjpx8m.js:13785-15299 placement
/**
 * 发送到项目前确保 Remote Control 可用：未开启先征询并预检设备与账号，再等连接结果。
 */
async function ensureBridgeForSendToProject({
  interactive,
  requestDialog,
  dialogStore,
  toggle,
  credentials,
  storageV5,
  signal,
}) {
  if (!interactive || requestDialog === undefined || toggle === undefined)
    return {
      kind: "not_asked",
    };
  let turnedOnHere = false;
  if (!isBridgeEnabledInbound(toggle.get())) {
    let consent = bridgeAskedAs();
    let dialogAnswer = await requestDialog(
      continueInProjectsRemoteControlDialog,
      {},
      {
        signal,
        place: "under",
      },
    );
    signal.throwIfAborted();
    if (dialogAnswer.choice !== "turn_on")
      return {
        kind: "declined",
      };
    let prerequisiteRefusal = await checkBridgePrerequisites(credentials);
    signal.throwIfAborted();
    if (prerequisiteRefusal !== null)
      switch (prerequisiteRefusal.kind) {
        case "error":
          logEvent("tengu_bridge_command", {
            action: lit("preflight_failed"),
            via: lit("send_to_project"),
          });
          return {
            kind: "unavailable",
            text: `Remote Control can\u2019t be turned on, so nothing was sent. ${prerequisiteRefusal.message.trim()}`,
          };
        case "unenrolled-trusted-device":
          logEvent("tengu_bridge_command", {
            action: lit("preflight_unenrolled_device"),
            via: lit("send_to_project"),
          });
          return {
            kind: "unavailable",
            text: "Remote Control needs this device enrolled first, so nothing was sent. Run /remote-control, which signs you in to enroll it, then /send-to-project again.",
          };
      }
    switch (
      ((turnedOnHere = !isBridgeEnabledInbound(toggle.get())),
      (
        await enableRemoteControlWithConsent({
          setAppState: toggle.set,
          requestDialog,
          dialogStore,
          storageV5,
          via: "send_to_project",
          consent,
        })
      ).kind)
    ) {
      case "declined":
        return {
          kind: "declined",
        };
      case "account_changed":
        return {
          kind: "account_changed",
        };
      case "cannot_ask":
      case "already_asking":
        return {
          kind: "unavailable",
          text: "Remote Control is already asking to be turned on in another dialog, so nothing was sent. Answer that dialog, then run /send-to-project again.",
        };
      case "enabled":
      case "already_on_project_fixed":
        break;
    }
  }
  let connectResult = await waitForBridgeConnected({
    getAppState: toggle.get,
    signal,
    timeoutMs: turnedOnHere ? ENABLE_CONNECT_TIMEOUT_MS : ALREADY_ON_CONNECT_TIMEOUT_MS,
  });
  return connectResult === "connected"
    ? {
        kind: "connected",
        turnedOn: turnedOnHere,
      }
    : {
        kind: connectResult,
      };
}
export { ensureBridgeForSendToProject };
