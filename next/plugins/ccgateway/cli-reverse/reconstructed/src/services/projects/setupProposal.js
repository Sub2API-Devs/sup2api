/**
 * services/projects/setupProposal.ts
 *
 * 2.1.316 新增：Projects 设置提案
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dz3q485w.js (7)
 * attribution: placement 7
 */
import {
  channelPath,
  apiErrorBody,
  withTrustedDeviceHeaders,
  CHANNEL_REQUEST_TIMEOUT_MS,
  checkChannelResponse,
  ChannelApiError,
} from "./channelApi.js";
import { printableName } from "../../utils/printableName.js";
import { apiClient } from "../routines/routinesApi.js";

//@ chunk-dz3q485w.js:34702-34739 placement
var CHANNEL_MESSAGE_ID_REGEX = /^cmsg_[A-Za-z0-9_-]{1,160}$/;
//@ chunk-dz3q485w.js:34739-34790 placement
function setupProposalsPath(channelId, action) {
  return channelPath(channelId, "/setup-proposals", action);
}
//@ chunk-dz3q485w.js:34790-34877 placement
function apiErrorReasonCode(error) {
  let body = apiErrorBody(error);
  let rawCode = body?.reason ?? body?.code;
  return typeof rawCode === "string" ? printableName(rawCode, 64) : "";
}
//@ chunk-dz3q485w.js:34877-35080 placement
var TRANSIENT_SUBMIT_ERRORS = new Set(["channel_session_unavailable"]);
var NO_RETRY_SUBMIT_ERRORS = new Set([
  "channel_disabled",
  "channel_session_unavailable",
  "invalid_client_request_id",
  "invalid_proposal",
  "proposal_too_large",
  "setup_submit_disabled",
]);
//@ chunk-dz3q485w.js:35080-36213 placement
/**
 * 提交项目设置提案：先带来源会话 id 提交，400 且错误码不在已知集合时去掉来源会话重试；非 2xx 归为 unavailable（区分未部署、瞬时、可能已存储），成功时返回被丢弃的部分与是否已提交过。
 */
async function submitSetupProposal(
  channelId,
  proposal,
  clientRequestId,
  sourceSessionId,
  signal,
  credentials,
) {
  let headers = await withTrustedDeviceHeaders();
  let post = (withSource) =>
    apiClient.post(
      setupProposalsPath(channelId, "submit the setup proposal"),
      {
        proposal,
        client_request_id: clientRequestId,
        ...(withSource && {
          source_session_id: sourceSessionId,
        }),
      },
      {
        auth: "teleport-org",
        ...headers,
        validateStatus: () => true,
        timeout: CHANNEL_REQUEST_TIMEOUT_MS,
        signal,
        credentials,
      },
    );
  let withSource = sourceSessionId !== null;
  let response = await post(withSource);
  if (
    withSource &&
    response.ok &&
    response.status === 400 &&
    !NO_RETRY_SUBMIT_ERRORS.has(apiErrorReasonCode(response.data))
  ) {
    withSource = false;
    response = await post(false);
  }
  if (!response.ok) checkChannelResponse(response, "submit the setup proposal");
  if (response.ok && response.status >= 300) {
    if (response.status === 401 || response.status === 403)
      checkChannelResponse(response, "submit the setup proposal");
    let reasonCode = apiErrorReasonCode(response.data);
    let notDeployed = response.status === 404 || response.status === 501;
    let serverError = response.status >= 500 && response.status !== 501;
    return {
      kind: "unavailable",
      reason: notDeployed ? "not_deployed" : reasonCode !== "" ? reasonCode : `status_${response.status}`,
      transient: response.status === 429 || serverError || TRANSIENT_SUBMIT_ERRORS.has(reasonCode),
      mayHaveStored: serverError,
      detail: `the server answered ${response.status}${reasonCode !== "" ? ` (${reasonCode})` : ""}`,
    };
  }
  let { data: payload } = checkChannelResponse(response, "submit the setup proposal");
  let body = payload;
  let messageId = body?.message?.id;
  if (typeof messageId !== "string" || !CHANNEL_MESSAGE_ID_REGEX.test(messageId))
    throw new ChannelApiError(
      "submit the setup proposal",
      null,
      "the server\u2019s answer did not name the setup card",
      "bad_response",
    );
  return {
    kind: "submitted",
    dropped: Array.isArray(body?.dropped) ? body.dropped.filter((part) => typeof part === "string") : [],
    alreadySubmitted: body?.already_submitted === true,
    sourceSessionSent: withSource,
  };
}
//@ chunk-dz3q485w.js:36213-36337 placement
function droppedSourceSession(dropped) {
  return dropped.some((part) =>
    /^(?:CHANNEL_SETUP_PROPOSAL_DROPPED_PART_)?SOURCE_SESSION$/.test(part.trim().toUpperCase()),
  );
}
//@ chunk-dz3q485w.js:36337-36455 placement
function droppedSessions(dropped) {
  return dropped.some((part) =>
    /^(?:CHANNEL_SETUP_PROPOSAL_DROPPED_PART_)?SESSIONS$/.test(part.trim().toUpperCase()),
  );
}
export { submitSetupProposal, droppedSourceSession, droppedSessions };
