/**
 * bridge/forkHistoryUpload.ts
 *
 * 2.1.316 新增。Remote Control 分叉会话上传显示历史，失败时发通知并归档。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vx1xamz5.js (5)
 * attribution: placement 5
 */
import { randomUUID } from "crypto";
import { sliceTailKeepingGroups } from "./remoteBridgeArchive.js";
import { isEligibleBridgeMessage } from "./bridgeMessaging.js";
import { createRemoteBridgeRedactor } from "./remoteBridgeSettle.js";
import { HNo } from "./remoteBridgeCloseCodes.js";
import { createMemoryServerVerifier } from "../services/mcp/memoryServerVerification.js";
import { qHt } from "../utils/transcriptWithholding.js";
import { toSDKMessages } from "../utils/messages/mappers.js";
import { DISPLAY_ONLY } from "./controlRequests.js";
import { sendSessionHistoryEvents, prepareApiRequest, trustedDeviceHeaders } from "../utils/teleport/api.js";
import { toInfraSessionId } from "./sessionIdCompat.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { errorMessage } from "../utils/errors.js";
import { archiveCodeSession } from "./codeSessionApi.js";
import { getOauthConfig } from "../constants/oauth.js";
import { isCcrV2SessionCrudEnabled } from "./bridgeGates.js";

//@ chunk-vx1xamz5.js:716-726 placement
var y = 200;
/**
 * Remote Control 分叉会话上传显示历史，失败时发通知并归档。
 */
//@ chunk-vx1xamz5.js:726-1320 placement
async function uploadForkDisplayHistory(o, r, e, i, s, u) {
  let p = sliceTailKeepingGroups(r.filter(isEligibleBridgeMessage), y),
    g = void 0,
    a = createRemoteBridgeRedactor({
      mode: HNo,
      placeAccountMemoryTool: createMemoryServerVerifier(() => u),
      accountMemoryInPlay: () => qHt(s),
    });
  a.note(r);
  let flattened = a
    .redact(toSDKMessages(a.withoutMemoryCallAttachments(p), void 0))
    .flatMap((m) =>
      typeof m.uuid === "string" ? [{ ...m, uuid: m.uuid, session_id: o, [DISPLAY_ONLY]: !0 }] : [],
    );
  if (flattened.length === 0) return null;
  let n = await sendSessionHistoryEvents(toInfraSessionId(o), flattened, e);
  if (!n.ok || n.droppedEvents === flattened.length)
    return (
      logForDebugging(`[rc-fork] History upload to ${o} failed: ${n.ok ? "every event refused" : n.reason}`, {
        level: "error",
      }),
      "history_upload_failed"
    );
  if (n.droppedEvents > 0) logFeatureSad(i, "history_events_dropped");
  return null;
}
//@ chunk-vx1xamz5.js:1320-1408 placement
var v = "This forked session could not be started. Fork the conversation again to retry.";
//@ chunk-vx1xamz5.js:1408-1785 placement
async function postForkFailureNotice(o, r) {
  try {
    let e = await sendSessionHistoryEvents(
      toInfraSessionId(o),
      [
        {
          type: "system",
          subtype: "informational",
          content: v,
          level: "warning",
          uuid: randomUUID(),
          session_id: o,
          [DISPLAY_ONLY]: !0,
        },
      ],
      r,
    );
    if (!e.ok || e.droppedEvents > 0)
      logForDebugging(
        `[rc-fork] Could not post the failure notice to ${o}: ${e.ok ? "event refused" : e.reason}`,
        { level: "warn" },
      );
  } catch (error) {
    logForDebugging(`[rc-fork] Could not post the failure notice to ${o}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
/**
 * 远程控制分叉时尝试登记推荐兑换。
 */
//@ chunk-vx1xamz5.js:1785-2171 placement = fetchReferralRedemptions (0.233)
async function archiveAbandonedForkSession(o, r) {
  try {
    let { accessToken: accessToken, orgUUID: orgUUID } = await prepareApiRequest(r),
      s = await archiveCodeSession(getOauthConfig().BASE_API_URL, accessToken, o, 1e4, {
        useV2: isCcrV2SessionCrudEnabled(),
        orgUUID: orgUUID,
        trustedDeviceToken: (await trustedDeviceHeaders())["X-Trusted-Device-Token"],
      });
    if (s !== 200 && s !== 409)
      logForDebugging(`[rc-fork] Could not archive abandoned fork session ${o}: ${s}`, { level: "warn" });
  } catch (error) {
    logForDebugging(`[rc-fork] Could not archive abandoned fork session ${o}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}

export { uploadForkDisplayHistory, archiveAbandonedForkSession, postForkFailureNotice };
