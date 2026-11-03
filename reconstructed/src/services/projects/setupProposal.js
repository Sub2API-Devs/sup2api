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
import { channelPath, apiErrorBody, W, de, checkChannelResponse, ChannelApiError } from "./channelApi.js";
import { printableName } from "../../utils/printableName.js";
import { apiClient } from "../routines/routinesApi.js";

//@ chunk-dz3q485w.js:34702-34739 placement
var bs = /^cmsg_[A-Za-z0-9_-]{1,160}$/;
//@ chunk-dz3q485w.js:34739-34790 placement
function Ss(e, n) {
  return channelPath(e, "/setup-proposals", n);
}
//@ chunk-dz3q485w.js:34790-34877 placement
function fn(e) {
  let n = apiErrorBody(e),
    s = n?.reason ?? n?.code;
  return typeof s === "string" ? printableName(s, 64) : "";
}
//@ chunk-dz3q485w.js:34877-35080 placement
var TRANSIENT_SUBMIT_ERRORS = new Set(["channel_session_unavailable"]),
  NO_RETRY_SUBMIT_ERRORS = new Set([
    "channel_disabled",
    "channel_session_unavailable",
    "invalid_client_request_id",
    "invalid_proposal",
    "proposal_too_large",
    "setup_submit_disabled",
  ]);
/**
 * 提交项目设置提案：先带来源会话 id 提交，400 且错误码不在已知集合时去掉来源会话重试；非 2xx 归为 unavailable（区分未部署、瞬时、可能已存储），成功时返回被丢弃的部分与是否已提交过。
 */
//@ chunk-dz3q485w.js:35080-36213 placement
async function submitSetupProposal(
  channelId,
  proposal,
  clientRequestId,
  sourceSessionId,
  signal,
  credentials,
) {
  let headers = await W(),
    post = (L) =>
      apiClient.post(
        Ss(channelId, "submit the setup proposal"),
        {
          proposal: proposal,
          client_request_id: clientRequestId,
          ...(L && { source_session_id: sourceSessionId }),
        },
        {
          auth: "teleport-org",
          ...headers,
          validateStatus: () => !0,
          timeout: de,
          signal: signal,
          credentials: credentials,
        },
      ),
    withSource = sourceSessionId !== null,
    response = await post(withSource);
  if (withSource && response.ok && response.status === 400 && !NO_RETRY_SUBMIT_ERRORS.has(fn(response.data)))
    ((withSource = !1), (response = await post(!1)));
  if (!response.ok) checkChannelResponse(response, "submit the setup proposal");
  if (response.ok && response.status >= 300) {
    if (response.status === 401 || response.status === 403)
      checkChannelResponse(response, "submit the setup proposal");
    let L = fn(response.data),
      R = response.status === 404 || response.status === 501,
      B = response.status >= 500 && response.status !== 501;
    return {
      kind: "unavailable",
      reason: R ? "not_deployed" : L !== "" ? L : `status_${response.status}`,
      transient: response.status === 429 || B || TRANSIENT_SUBMIT_ERRORS.has(L),
      mayHaveStored: B,
      detail: `the server answered ${response.status}${L !== "" ? ` (${L})` : ""}`,
    };
  }
  let { data: j } = checkChannelResponse(response, "submit the setup proposal"),
    body = j,
    messageId = body?.message?.id;
  if (typeof messageId !== "string" || !bs.test(messageId))
    throw new ChannelApiError(
      "submit the setup proposal",
      null,
      "the server\u2019s answer did not name the setup card",
      "bad_response",
    );
  return {
    kind: "submitted",
    dropped: Array.isArray(body?.dropped) ? body.dropped.filter((L) => typeof L === "string") : [],
    alreadySubmitted: body?.already_submitted === !0,
    sourceSessionSent: withSource,
  };
}
//@ chunk-dz3q485w.js:36213-36337 placement
function droppedSourceSession(e) {
  return e.some((n) =>
    /^(?:CHANNEL_SETUP_PROPOSAL_DROPPED_PART_)?SOURCE_SESSION$/.test(n.trim().toUpperCase()),
  );
}
//@ chunk-dz3q485w.js:36337-36455 placement
function droppedSessions(e) {
  return e.some((n) => /^(?:CHANNEL_SETUP_PROPOSAL_DROPPED_PART_)?SESSIONS$/.test(n.trim().toUpperCase()));
}

export { submitSetupProposal, droppedSourceSession, droppedSessions };
