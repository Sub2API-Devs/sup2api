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
import { strayDropMode } from "./remoteBridgeCloseCodes.js";
import { createMemoryServerVerifier } from "../services/mcp/memoryServerVerification.js";
import { hasRecordedTextForHost } from "../utils/transcriptWithholding.js";
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
var MAX_FORK_HISTORY_MESSAGES = 200;
//@ chunk-vx1xamz5.js:726-1320 placement
/**
 * Remote Control 分叉会话上传显示历史，失败时发通知并归档。
 */
async function uploadForkDisplayHistory(sessionId, messages, credentials, featureName, host, tools) {
  let tail = sliceTailKeepingGroups(messages.filter(isEligibleBridgeMessage), MAX_FORK_HISTORY_MESSAGES);
  let redactor = undefined;
  let remoteBridgeRedactor = createRemoteBridgeRedactor({
    mode: strayDropMode,
    placeAccountMemoryTool: createMemoryServerVerifier(() => tools),
    accountMemoryInPlay: () => hasRecordedTextForHost(host),
  });
  remoteBridgeRedactor.note(messages);
  let events = remoteBridgeRedactor
    .redact(toSDKMessages(remoteBridgeRedactor.withoutMemoryCallAttachments(tail), undefined))
    .flatMap((message) =>
      typeof message.uuid === "string"
        ? [
            {
              ...message,
              uuid: message.uuid,
              session_id: sessionId,
              [DISPLAY_ONLY]: true,
            },
          ]
        : [],
    );
  if (events.length === 0) return null;
  let result = await sendSessionHistoryEvents(toInfraSessionId(sessionId), events, credentials);
  if (!result.ok || result.droppedEvents === events.length) {
    logForDebugging(
      `[rc-fork] History upload to ${sessionId} failed: ${result.ok ? "every event refused" : result.reason}`,
      {
        level: "error",
      },
    );
    return "history_upload_failed";
  }
  if (result.droppedEvents > 0) logFeatureSad(featureName, "history_events_dropped");
  return null;
}
//@ chunk-vx1xamz5.js:1320-1408 placement
var FORK_FAILED_NOTICE_TEXT =
  "This forked session could not be started. Fork the conversation again to retry.";
//@ chunk-vx1xamz5.js:1408-1785 placement
async function postForkFailureNotice(sessionId, credentials) {
  try {
    let result = await sendSessionHistoryEvents(
      toInfraSessionId(sessionId),
      [
        {
          type: "system",
          subtype: "informational",
          content: FORK_FAILED_NOTICE_TEXT,
          level: "warning",
          uuid: randomUUID(),
          session_id: sessionId,
          [DISPLAY_ONLY]: true,
        },
      ],
      credentials,
    );
    if (!result.ok || result.droppedEvents > 0)
      logForDebugging(
        `[rc-fork] Could not post the failure notice to ${sessionId}: ${result.ok ? "event refused" : result.reason}`,
        {
          level: "warn",
        },
      );
  } catch (error) {
    logForDebugging(`[rc-fork] Could not post the failure notice to ${sessionId}: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-vx1xamz5.js:1785-2171 placement (2.1.88 match: fetchReferralRedemptions, 0.233)
/**
 * 远程控制分叉时尝试登记推荐兑换。
 */
async function archiveAbandonedForkSession(sessionId, credentials) {
  try {
    let { accessToken, orgUUID } = await prepareApiRequest(credentials);
    let status = await archiveCodeSession(getOauthConfig().BASE_API_URL, accessToken, sessionId, 1e4, {
      useV2: isCcrV2SessionCrudEnabled(),
      orgUUID,
      trustedDeviceToken: (await trustedDeviceHeaders())["X-Trusted-Device-Token"],
    });
    if (status !== 200 && status !== 409)
      logForDebugging(`[rc-fork] Could not archive abandoned fork session ${sessionId}: ${status}`, {
        level: "warn",
      });
  } catch (error) {
    logForDebugging(
      `[rc-fork] Could not archive abandoned fork session ${sessionId}: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
}
export { uploadForkDisplayHistory, archiveAbandonedForkSession, postForkFailureNotice };
