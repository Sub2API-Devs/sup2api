/**
 * services/artifacts/comments/commentReply.ts
 *
 * 2.1.316 新增：回复 artifact 评论线程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b0a246e7.js (16)
 * attribution: placement 16
 */
import { MAX_FRAME_HTML_BYTES } from "../frameComments.js";
import { parseRetryAfterMs } from "../../../bridge/debugUtils.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { create, create_2, create_6 } from "../../../../vendor/zod/lib/index.mjs";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import { scrubServerLine } from "../../../tools/ArtifactTool/artifactUrls.js";
import { buildFrameHeaders, getTransportErrorProps, isUnknownFieldErrorFor } from "../frameApi.js";
import { relayIsOnlyRoute, frameApi, threwOnRelayLeg } from "../frameRelay.js";
import { readFrameDecl } from "../readBack.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { getShareEntry, isOutsideOrgNotFound } from "../shareEntries.js";
import { isReaderRole } from "../audience.js";
import { getLiveState } from "../../liveReplica/liveReplica.js";
import { sleep } from "../../../utils/sleep.js";
import { AbortError } from "../../../utils/errors.js";
import { isCancel } from "../../../../vendor/axios/dist/esm/axios.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../analytics/featureTelemetry.js";
import { describeArtifactAuthFailure } from "../frameFlags.js";
import { COMMENT_ID_RE } from "./commentFormatting.js";
import { rememberPostedReplyId } from "./commentState.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-b0a246e7.js:23031-23954 placement
/**
 * 评论回复相关的错误说明：未激活、需要用户级凭证、组织服务键无法读/写评论、网络关闭、已回复、他人召唤、id 占用等。
 */
var COMMENT_ERROR_TEXT = "not activated on this thread";
var NO_USER_CREDENTIAL_TEXT = "comments require a user-scoped credential";
var ORG_SERVICE_KEY_READ_TEXT =
  "this session's credential is an organization service key with no Claude agent grant; comments are readable only by a user login or by the agent that created the Artifact \u2014 tell the user that comments can't be read from this session";
var NO_NETWORK_ACCESS_TEXT =
  "network access for this session is turned off or could not be confirmed, so nothing was posted or resolved \u2014 do not retry; tell the user they can do it on the artifact's own page";
var ORG_SERVICE_KEY_WRITE_TEXT =
  "this session's credential is an organization service key with no Claude agent grant, so it cannot post or resolve comments (only a user login can, or the agent that created the Artifact on threads a person activated for Claude) \u2014 tell the user that; don't write replies into the page itself";
var SUMMON_ALREADY_ANSWERED = "summon_already_answered";
var SUMMON_FOREIGN_SENDER = "summon_foreign_sender";
var ID_IN_USE = "id_in_use";
var MAX_COMMENT_RESPONSE_BYTES = MAX_FRAME_HTML_BYTES;
var REPLY_RETRY_DELAY_RANGE_MS = {
  min: 800,
  max: 1500,
};
var MAX_REPLY_RETRY_DELAY_MS = 5000;
//@ chunk-b0a246e7.js:23954-24116 placement
function computeRetryDelay(retryAfter) {
  let { min, max } = REPLY_RETRY_DELAY_RANGE_MS;
  let floored = Math.floor(Math.random() * (max - min + 1));
  let retryAfterMs = parseRetryAfterMs(typeof retryAfter === "string" ? retryAfter : undefined);
  return retryAfterMs === undefined || retryAfterMs <= 0
    ? min + floored
    : Math.min(Math.max(retryAfterMs, min), MAX_REPLY_RETRY_DELAY_MS) + floored;
}
//@ chunk-b0a246e7.js:24116-24518 placement
/**
 * 评论回复不确定性的两段说明（可能已发出/连接未承载）与回复结果 schema。
 */
var COMMENT_REPLY_TEXT; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RELAY_UNAVAILABLE_REPLY_TEXT;
var replyResultSchema;
deferInit("chunk-b0a246e7.js:24116", () => {
  COMMENT_REPLY_TEXT =
    "an earlier attempt may already have posted this reply; re-read the comments before retrying";
  RELAY_UNAVAILABLE_REPLY_TEXT =
    "comment reply not sent (this session's comment connection did not carry it on this attempt, so nothing was posted) \u2014 retry the reply once; if it fails again, tell the user you could not post the reply from this session";
  replyResultSchema = DoctorLazy(() =>
    create({
      thread_id: create_2(),
      comment_id: create_2(),
      replayed: create_6().optional(),
    }),
  );
});
//@ chunk-b0a246e7.js:24518-24699 placement
function pickErrorFields(error) {
  if (!error || typeof error !== "object") return {};
  return {
    ...("error" in error &&
      typeof error.error === "string" && {
        error: error.error,
      }),
    ...("reason" in error &&
      typeof error.reason === "string" && {
        reason: error.reason,
      }),
  };
}
//@ chunk-b0a246e7.js:24699-24739 placement
function errorReason(error) {
  return pickErrorFields(error).reason ?? null;
}
//@ chunk-b0a246e7.js:24739-24797 placement
var standingReplySchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b0a246e7.js:24739", () => {
  standingReplySchema = DoctorLazy(() =>
    create({
      standing_reply: create({
        id: create_2(),
        own: create_6(),
      }),
    }),
  );
});
//@ chunk-b0a246e7.js:24797-24922 placement
function parseStandingReply(value) {
  let parsed = standingReplySchema().safeParse(value);
  if (!parsed.success || !ARTIFACT_SLUG_RE.test(parsed.data.standing_reply.id)) return;
  return parsed.data.standing_reply;
}
//@ chunk-b0a246e7.js:24922-24997 placement
function errorMessage(error) {
  let error_2 = pickErrorFields(error).error ?? error;
  return typeof error_2 === "string" ? scrubServerLine(error_2, 300) : "";
}
//@ chunk-b0a246e7.js:24997-25107 placement
function frameRequestOptions(signal, credentials) {
  return {
    refreshOAuth: true,
    credentials,
    headers: buildFrameHeaders(),
    timeout: 30000,
    maxContentLength: MAX_COMMENT_RESPONSE_BYTES,
    signal,
  };
}
//@ chunk-b0a246e7.js:25107-25165 placement
async function readRecordedDecl(slug, context) {
  return (await readFrameDeclForComments(slug, context)).orRecorded;
}
//@ chunk-b0a246e7.js:25165-25525 placement
async function readFrameDeclForComments(artifactId, frameOptions) {
  let route = relayIsOnlyRoute()
    ? {
        err: "not read",
      }
    : await readFrameDecl(artifactId, frameOptions.abortController.signal, frameOptions.credentials).catch(
        () => null,
      );
  let readNowFor = (capabilities) => {
    let comments = isPlainObject(capabilities) ? capabilities.comments : undefined;
    return isPlainObject(comments) && comments.headless === true;
  };
  if (route === null)
    return {
      readNow: undefined,
      orRecorded: false,
    };
  if ("err" in route)
    return {
      readNow: undefined,
      orRecorded: readNowFor(getShareEntry(artifactId)?.capabilities),
    };
  let readNow = readNowFor(route.capabilities);
  return {
    readNow,
    orRecorded: readNow,
  };
}
//@ chunk-b0a246e7.js:25525-25658 placement
function needsCapsReadForReply(slug) {
  if (!relayIsOnlyRoute()) return false;
  let shareEntry = getShareEntry(slug);
  if (isReaderRole(shareEntry?.role)) return false;
  return shareEntry?.lastCapsReadAt === undefined || shareEntry.capabilitiesUnknown === true;
}
//@ chunk-b0a246e7.js:25658-25792 placement
function networkOffRefusal(shareEntry, action) {
  return relayIsOnlyRoute() && shareEntry.gatewayPolicy === "network-off"
    ? {
        kind: "error",
        message: `${action} refused: ${NO_NETWORK_ACCESS_TEXT}`,
        reason: "network_off",
      }
    : undefined;
}
//@ chunk-b0a246e7.js:25792-27233 placement
/**
 * 向 artifact 评论线程发表回复（直连或经会话中继），处理重发/幂等与授权错误。
 */
async function postCommentReply(
  { slug, threadId, text, clientId, answersSummon, continuesReplyId, resend, credentials },
  signal,
) {
  let continues;
  let markerDropped = false;
  let tag = resend
    ? {
        resend,
      }
    : {};
  if (continuesReplyId !== undefined && answersSummon !== true)
    if (ARTIFACT_SLUG_RE.test(continuesReplyId)) continues = continuesReplyId;
    else markerDropped = true;
  let epoch = getLiveState().accountEpoch;
  let request = {
    slug,
    threadId,
    text,
    answersSummon,
    continues,
    markerDropped,
    epoch,
    tag,
    credentials,
    signal,
  };
  let replyClientId = clientId;
  let firstResult = await sendCommentReply(request, replyClientId, true);
  if (firstResult.kind === "id_unknown") {
    replyClientId = undefined;
    tag.idless = true;
    firstResult = await sendCommentReply(request, replyClientId, false);
  }
  if (firstResult.kind !== "retryable")
    return firstResult.kind === "id_unknown" ? firstResult.fail() : firstResult;
  await sleep(firstResult.waitMs, signal);
  if (signal.aborted) throw new AbortError();
  tag.retried = true;
  tag.first_status = firstResult.status;
  let retryResult = await sendCommentReply(request, replyClientId, false);
  if (retryResult.kind === "retryable" || retryResult.kind === "id_unknown") return firstResult.fail();
  if (retryResult.kind === "error" && !retryResult.unknownOutcome) {
    let firstAttemptText =
      firstResult.status === 0
        ? "an earlier attempt drew no answer"
        : `an earlier attempt met HTTP ${firstResult.status}`;
    let retryText =
      retryResult.reason === "relay_unavailable"
        ? "the retry was not carried"
        : retryResult.reason === "request_error"
          ? "the retry failed on the network"
          : undefined;
    return {
      ...retryResult,
      message:
        retryResult.reason === "network_off"
          ? `comment reply outcome unknown (${firstAttemptText}, and the retry was refused because network access for this session is turned off or could not be confirmed) \u2014 it may have posted; re-read the comments to find out, and do not retry: if it is not there, tell the user they can reply on the artifact's own page`
          : retryText !== undefined
            ? `comment reply outcome unknown (${firstAttemptText}, and ${retryText}) \u2014 it may have posted; re-read the comments before retrying`
            : `${retryResult.message} \u2014 ${COMMENT_REPLY_TEXT}`,
      unknownOutcome: true,
    };
  }
  return retryResult;
}
//@ chunk-b0a246e7.js:27233-31546 placement
/**
 * 回复 artifact 评论线程：校验激活与凭证、构建请求、处理召唤与续写标记。
 */
async function sendCommentReply(
  { slug, threadId, text, answersSummon, continues, markerDropped, epoch, tag, credentials, signal },
  replyClientId,
  allowRetry,
) {
  let tagArgs =
    Object.keys(tag).length > 0
      ? [
          {
            ...tag,
          },
        ]
      : [];
  let mayRetry = allowRetry && replyClientId !== undefined;
  let startTime = performance.now();
  let response;
  try {
    response = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}`,
      {
        ...(replyClientId !== undefined && {
          id: replyClientId,
        }),
        text,
        ...(answersSummon === true && {
          answers_summon: true,
        }),
        ...(continues !== undefined && {
          continues_reply_id: continues,
        }),
      },
      frameRequestOptions(signal, credentials),
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    let transportErrorProps = getTransportErrorProps(error, startTime);
    let relayThrew = threwOnRelayLeg(error);
    if (relayThrew || transportErrorProps.transport) {
      let reason = relayThrew ? "relay_request_error" : "request_error";
      let failUnknown = () => {
        logFeatureBad("artifact_comment_reply", reason, {
          ...transportErrorProps,
          ...tag,
        });
        return {
          kind: "error",
          message: `comment reply outcome unknown (${relayThrew ? "relay request failed" : "no answer: network error or timeout"}) \u2014 it may have posted; re-read the comments before retrying`,
          reason,
          unknownOutcome: true,
        };
      };
      return mayRetry
        ? {
            kind: "retryable",
            waitMs: computeRetryDelay(undefined),
            status: 0,
            fail: failUnknown,
          }
        : failUnknown();
    }
    logFeatureBad("artifact_comment_reply", "request_error", {
      ...transportErrorProps,
      ...tag,
    });
    return {
      kind: "error",
      message: "comment reply failed (network error)",
      reason: "request_error",
    };
  }
  if (!response.ok) {
    if (response.reason === "relay-unavailable") {
      logFeatureBad("artifact_comment_reply", "relay_unavailable", {
        status: response.status,
        ...tag,
      });
      return {
        kind: "error",
        message: RELAY_UNAVAILABLE_REPLY_TEXT,
        reason: "relay_unavailable",
      };
    }
    logFeatureBad("artifact_comment_reply", response.reason.replace(/-/g, "_"), ...tagArgs);
    return {
      kind: "error",
      message:
        response.reason === "no-auth"
          ? describeArtifactAuthFailure(response.detail)
          : `comment reply unavailable: ${response.reason}`,
      reason: "transport",
    };
  }
  if (response.status === 201) {
    let parsed = replyResultSchema().safeParse(response.data);
    if (!parsed.success) {
      logFeatureSad("artifact_comment_reply", "malformed_echo", ...tagArgs);
      return {
        kind: "ok",
        threadId,
        commentId: "",
      };
    }
    let replayed = parsed.data.replayed === true;
    let matches = ARTIFACT_SLUG_RE.test(parsed.data.thread_id);
    let matches_2 = COMMENT_ID_RE.test(parsed.data.comment_id);
    if (!matches || !matches_2) logFeatureSad("artifact_comment_reply", "malformed_echo", ...tagArgs);
    else if (markerDropped)
      logFeatureSad("artifact_comment_reply", "continues_reply_id_malformed", ...tagArgs);
    else
      logFeatureOk(
        "artifact_comment_reply",
        ...(replayed
          ? [
              {
                ...tag,
                replayed,
              },
            ]
          : tagArgs),
      );
    if (matches_2 && epoch === getLiveState().accountEpoch) rememberPostedReplyId(parsed.data.comment_id);
    return {
      kind: "ok",
      threadId: matches ? parsed.data.thread_id : threadId,
      commentId: matches_2 ? parsed.data.comment_id : "",
      ...(replayed && {
        replayed,
      }),
    };
  }
  let refusal = networkOffRefusal(response, "comment reply");
  if (refusal) {
    logFeatureSad("artifact_comment_reply", "network_off", ...tagArgs);
    return refusal;
  }
  if (!response.fromFrame) {
    let { status } = response;
    let failNow = () => {
      logFeatureBad("artifact_comment_reply", "relay_error", {
        status,
        ...tag,
      });
      return {
        kind: "error",
        message: `comment reply outcome unknown (relay HTTP ${status}) \u2014 it may have posted; re-read the comments before retrying`,
        reason: "relay_error",
        unknownOutcome: true,
      };
    };
    return mayRetry && (status >= 500 || status === 499)
      ? {
          kind: "retryable",
          waitMs: computeRetryDelay(response.response?.headers?.["retry-after"]),
          status,
          fail: failNow,
        }
      : failNow();
  }
  let message = errorMessage(response.data);
  if (response.status === 403 && message.includes(COMMENT_ERROR_TEXT)) {
    logFeatureSad("artifact_comment_reply", "not_activated", ...tagArgs);
    return {
      kind: "not_activated",
    };
  }
  if (response.status === 403 && message.includes(NO_USER_CREDENTIAL_TEXT)) {
    logFeatureSad("artifact_comment_reply", "service_key_credential", ...tagArgs);
    return {
      kind: "error",
      message: `comment reply refused: ${ORG_SERVICE_KEY_WRITE_TEXT}`,
      reason: "service_key_credential",
    };
  }
  if (replyClientId !== undefined && response.status === 409 && errorReason(response.data) === ID_IN_USE) {
    logFeatureSad("artifact_comment_reply", "id_in_use", ...tagArgs);
    if (epoch === getLiveState().accountEpoch) rememberPostedReplyId(replyClientId);
    return {
      kind: "ok",
      threadId,
      commentId: replyClientId,
      replayed: true,
    };
  }
  if (response.status === 409 && errorReason(response.data) === SUMMON_ALREADY_ANSWERED) {
    let standing = epoch === getLiveState().accountEpoch ? parseStandingReply(response.data) : undefined;
    logFeatureSad(
      "artifact_comment_reply",
      standing?.own === true ? "summon_answered_own" : "summon_answered_elsewhere",
      ...tagArgs,
    );
    return {
      kind: "summon_answered",
      ...(standing && {
        standing,
      }),
    };
  }
  if (response.status === 403 && errorReason(response.data) === SUMMON_FOREIGN_SENDER) {
    logFeatureSad("artifact_comment_reply", "summon_foreign_sender", ...tagArgs);
    return {
      kind: "summon_foreign",
    };
  }
  let { status } = response;
  let retryableStatus = status === 502 || status === 503 || status === 504;
  let failIdUnknown = () => {
    let body =
      status === 403
        ? "forbidden"
        : status === 404
          ? "not_found"
          : status === 409
            ? "conflict"
            : status === 422
              ? "unembeddable"
              : status === 429
                ? "rate_limited"
                : retryableStatus
                  ? "unavailable"
                  : "http_failed";
    if (isOutsideOrgNotFound(slug, body))
      logFeatureSad("artifact_comment_reply", "not_found_outside_org", {
        status,
        ...tag,
      });
    else
      logFeatureBad("artifact_comment_reply", body, {
        status,
        ...tag,
      });
    let suffix = message !== "" ? `: ${message}` : "";
    return {
      kind: "error",
      message:
        status === 404
          ? "artifact or comment thread not found \u2014 it may have been deleted, or you may not have access"
          : status === 429
            ? "rate limited \u2014 comment replies spend the user's budget; do not retry now"
            : retryableStatus
              ? `comment reply temporarily unavailable (HTTP ${status})${suffix} \u2014 it may still have posted; re-read the comments before retrying later`
              : status === 409
                ? `comment reply conflicted${suffix} \u2014 re-read the comments before retrying`
                : `comment reply refused (HTTP ${status})${suffix}`,
      reason: body,
      ...(retryableStatus && {
        unknownOutcome: true,
      }),
    };
  };
  if (replyClientId !== undefined && status === 400 && isUnknownFieldErrorFor(response.data, "id"))
    return {
      kind: "id_unknown",
      fail: failIdUnknown,
    };
  if (mayRetry && retryableStatus)
    return {
      kind: "retryable",
      waitMs: computeRetryDelay(response.response?.headers?.["retry-after"]),
      status,
      fail: failIdUnknown,
    };
  return failIdUnknown();
}
//@ chunk-b0a246e7.js:31546-32199 placement
async function readSummonStatus(slug, threadId, cursor) {
  let response;
  try {
    response = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}/summon-status`,
      cursor,
      {
        isBackground: true,
        headers: buildFrameHeaders(),
        timeout: 5000,
        maxContentLength: MAX_COMMENT_RESPONSE_BYTES,
      },
    );
  } catch {
    return {
      kind: "failed",
      reason: "request_error",
    };
  }
  if (!response.ok) {
    if (response.reason === "relay-unavailable" || response.reason === "relay-not-served")
      return {
        kind: "unsent",
        status: response.status,
      };
    return {
      kind: "skipped",
      reason: response.reason,
    };
  }
  if (!response.fromFrame)
    return {
      kind: "failed",
      reason: "relay_error",
      status: response.status,
    };
  if (response.status === 404)
    return {
      kind: "route_absent",
    };
  if (response.status < 200 || response.status >= 300)
    return {
      kind: "failed",
      reason: "http_failed",
      status: response.status,
    };
  return {
    kind: "accepted",
  };
}
export {
  needsCapsReadForReply,
  readFrameDeclForComments,
  readRecordedDecl,
  postCommentReply,
  errorMessage,
  NO_USER_CREDENTIAL_TEXT,
  ORG_SERVICE_KEY_READ_TEXT,
  COMMENT_ERROR_TEXT,
  frameRequestOptions,
  networkOffRefusal,
  errorReason,
  SUMMON_FOREIGN_SENDER,
  ORG_SERVICE_KEY_WRITE_TEXT,
  readSummonStatus,
};
