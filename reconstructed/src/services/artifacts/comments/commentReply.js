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
function computeRetryDelay(e) {
  let { min, max } = REPLY_RETRY_DELAY_RANGE_MS;
  let floored = Math.floor(Math.random() * (max - min + 1));
  let retryAfterMs = parseRetryAfterMs(typeof e === "string" ? e : undefined);
  return retryAfterMs === undefined || retryAfterMs <= 0
    ? min + floored
    : Math.min(Math.max(retryAfterMs, min), MAX_REPLY_RETRY_DELAY_MS) + floored;
}
//@ chunk-b0a246e7.js:24116-24518 placement
/**
 * 评论回复不确定性的两段说明（可能已发出/连接未承载）与回复结果 schema。
 */
var COMMENT_REPLY_TEXT =
  "an earlier attempt may already have posted this reply; re-read the comments before retrying";
var RELAY_UNAVAILABLE_REPLY_TEXT =
  "comment reply not sent (this session's comment connection did not carry it on this attempt, so nothing was posted) \u2014 retry the reply once; if it fails again, tell the user you could not post the reply from this session";
var replyResultSchema = DoctorLazy(() =>
  create({
    thread_id: create_2(),
    comment_id: create_2(),
    replayed: create_6().optional(),
  }),
);
//@ chunk-b0a246e7.js:24518-24699 placement
function pickErrorFields(e) {
  if (!e || typeof e !== "object") return {};
  return {
    ...("error" in e &&
      typeof e.error === "string" && {
        error: e.error,
      }),
    ...("reason" in e &&
      typeof e.reason === "string" && {
        reason: e.reason,
      }),
  };
}
//@ chunk-b0a246e7.js:24699-24739 placement
function errorReason(e) {
  return pickErrorFields(e).reason ?? null;
}
//@ chunk-b0a246e7.js:24739-24797 placement
var standingReplySchema = DoctorLazy(() =>
  create({
    standing_reply: create({
      id: create_2(),
      own: create_6(),
    }),
  }),
);
//@ chunk-b0a246e7.js:24797-24922 placement
function parseStandingReply(e) {
  let t = standingReplySchema().safeParse(e);
  if (!t.success || !ARTIFACT_SLUG_RE.test(t.data.standing_reply.id)) return;
  return t.data.standing_reply;
}
//@ chunk-b0a246e7.js:24922-24997 placement
function errorMessage(e) {
  let error = pickErrorFields(e).error ?? e;
  return typeof error === "string" ? scrubServerLine(error, 300) : "";
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
async function readFrameDeclForComments(e, t) {
  let n = relayIsOnlyRoute()
    ? {
        err: "not read",
      }
    : await readFrameDecl(e, t.abortController.signal, t.credentials).catch(() => null);
  let r = (capabilities) => {
    let comments = isPlainObject(capabilities) ? capabilities.comments : undefined;
    return isPlainObject(comments) && comments.headless === true;
  };
  if (n === null)
    return {
      readNow: undefined,
      orRecorded: false,
    };
  if ("err" in n)
    return {
      readNow: undefined,
      orRecorded: r(getShareEntry(e)?.capabilities),
    };
  let o = r(n.capabilities);
  return {
    readNow: o,
    orRecorded: o,
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
function networkOffRefusal(e, t) {
  return relayIsOnlyRoute() && e.gatewayPolicy === "network-off"
    ? {
        kind: "error",
        message: `${t} refused: ${NO_NETWORK_ACCESS_TEXT}`,
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
  let h = resend
    ? {
        resend,
      }
    : {};
  if (continuesReplyId !== undefined && answersSummon !== true)
    if (ARTIFACT_SLUG_RE.test(continuesReplyId)) continues = continuesReplyId;
    else markerDropped = true;
  let epoch = getLiveState().accountEpoch;
  let x = {
    slug,
    threadId,
    text,
    answersSummon,
    continues,
    markerDropped,
    epoch,
    tag: h,
    credentials,
    signal,
  };
  let E = clientId;
  let y = await sendCommentReply(x, E, true);
  if (y.kind === "id_unknown") {
    E = undefined;
    h.idless = true;
    y = await sendCommentReply(x, E, false);
  }
  if (y.kind !== "retryable") return y.kind === "id_unknown" ? y.fail() : y;
  await sleep(y.waitMs, signal);
  if (signal.aborted) throw new AbortError();
  h.retried = true;
  h.first_status = y.status;
  let S = await sendCommentReply(x, E, false);
  if (S.kind === "retryable" || S.kind === "id_unknown") return y.fail();
  if (S.kind === "error" && !S.unknownOutcome) {
    let T = y.status === 0 ? "an earlier attempt drew no answer" : `an earlier attempt met HTTP ${y.status}`;
    let b =
      S.reason === "relay_unavailable"
        ? "the retry was not carried"
        : S.reason === "request_error"
          ? "the retry failed on the network"
          : undefined;
    return {
      ...S,
      message:
        S.reason === "network_off"
          ? `comment reply outcome unknown (${T}, and the retry was refused because network access for this session is turned off or could not be confirmed) \u2014 it may have posted; re-read the comments to find out, and do not retry: if it is not there, tell the user they can reply on the artifact's own page`
          : b !== undefined
            ? `comment reply outcome unknown (${T}, and ${b}) \u2014 it may have posted; re-read the comments before retrying`
            : `${S.message} \u2014 ${COMMENT_REPLY_TEXT}`,
      unknownOutcome: true,
    };
  }
  return S;
}
//@ chunk-b0a246e7.js:27233-31546 placement
/**
 * 回复 artifact 评论线程：校验激活与凭证、构建请求、处理召唤与续写标记。
 */
async function sendCommentReply(
  { slug, threadId, text, answersSummon, continues, markerDropped, epoch, tag, credentials, signal },
  replyId,
  h,
) {
  let s =
    Object.keys(tag).length > 0
      ? [
          {
            ...tag,
          },
        ]
      : [];
  let x = h && replyId !== undefined;
  let startTime = performance.now();
  let y;
  try {
    y = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}`,
      {
        ...(replyId !== undefined && {
          id: replyId,
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
    let O = threwOnRelayLeg(error);
    if (O || transportErrorProps.transport) {
      let N = O ? "relay_request_error" : "request_error";
      let F = () => {
        logFeatureBad("artifact_comment_reply", N, {
          ...transportErrorProps,
          ...tag,
        });
        return {
          kind: "error",
          message: `comment reply outcome unknown (${O ? "relay request failed" : "no answer: network error or timeout"}) \u2014 it may have posted; re-read the comments before retrying`,
          reason: N,
          unknownOutcome: true,
        };
      };
      return x
        ? {
            kind: "retryable",
            waitMs: computeRetryDelay(undefined),
            status: 0,
            fail: F,
          }
        : F();
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
  if (!y.ok) {
    if (y.reason === "relay-unavailable") {
      logFeatureBad("artifact_comment_reply", "relay_unavailable", {
        status: y.status,
        ...tag,
      });
      return {
        kind: "error",
        message: RELAY_UNAVAILABLE_REPLY_TEXT,
        reason: "relay_unavailable",
      };
    }
    logFeatureBad("artifact_comment_reply", y.reason.replace(/-/g, "_"), ...s);
    return {
      kind: "error",
      message:
        y.reason === "no-auth"
          ? describeArtifactAuthFailure(y.detail)
          : `comment reply unavailable: ${y.reason}`,
      reason: "transport",
    };
  }
  if (y.status === 201) {
    let R = replyResultSchema().safeParse(y.data);
    if (!R.success) {
      logFeatureSad("artifact_comment_reply", "malformed_echo", ...s);
      return {
        kind: "ok",
        threadId,
        commentId: "",
      };
    }
    let C = R.data.replayed === true;
    let matches = ARTIFACT_SLUG_RE.test(R.data.thread_id);
    let matches_2 = COMMENT_ID_RE.test(R.data.comment_id);
    if (!matches || !matches_2) logFeatureSad("artifact_comment_reply", "malformed_echo", ...s);
    else if (markerDropped) logFeatureSad("artifact_comment_reply", "continues_reply_id_malformed", ...s);
    else
      logFeatureOk(
        "artifact_comment_reply",
        ...(C
          ? [
              {
                ...tag,
                replayed: C,
              },
            ]
          : s),
      );
    if (matches_2 && epoch === getLiveState().accountEpoch) rememberPostedReplyId(R.data.comment_id);
    return {
      kind: "ok",
      threadId: matches ? R.data.thread_id : threadId,
      commentId: matches_2 ? R.data.comment_id : "",
      ...(C && {
        replayed: C,
      }),
    };
  }
  let S = networkOffRefusal(y, "comment reply");
  if (S) {
    logFeatureSad("artifact_comment_reply", "network_off", ...s);
    return S;
  }
  if (!y.fromFrame) {
    let { status } = y;
    let C = () => {
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
    return x && (status >= 500 || status === 499)
      ? {
          kind: "retryable",
          waitMs: computeRetryDelay(y.response?.headers?.["retry-after"]),
          status,
          fail: C,
        }
      : C();
  }
  let T = errorMessage(y.data);
  if (y.status === 403 && T.includes(COMMENT_ERROR_TEXT)) {
    logFeatureSad("artifact_comment_reply", "not_activated", ...s);
    return {
      kind: "not_activated",
    };
  }
  if (y.status === 403 && T.includes(NO_USER_CREDENTIAL_TEXT)) {
    logFeatureSad("artifact_comment_reply", "service_key_credential", ...s);
    return {
      kind: "error",
      message: `comment reply refused: ${ORG_SERVICE_KEY_WRITE_TEXT}`,
      reason: "service_key_credential",
    };
  }
  if (replyId !== undefined && y.status === 409 && errorReason(y.data) === ID_IN_USE) {
    logFeatureSad("artifact_comment_reply", "id_in_use", ...s);
    if (epoch === getLiveState().accountEpoch) rememberPostedReplyId(replyId);
    return {
      kind: "ok",
      threadId,
      commentId: replyId,
      replayed: true,
    };
  }
  if (y.status === 409 && errorReason(y.data) === SUMMON_ALREADY_ANSWERED) {
    let R = epoch === getLiveState().accountEpoch ? parseStandingReply(y.data) : undefined;
    logFeatureSad(
      "artifact_comment_reply",
      R?.own === true ? "summon_answered_own" : "summon_answered_elsewhere",
      ...s,
    );
    return {
      kind: "summon_answered",
      ...(R && {
        standing: R,
      }),
    };
  }
  if (y.status === 403 && errorReason(y.data) === SUMMON_FOREIGN_SENDER) {
    logFeatureSad("artifact_comment_reply", "summon_foreign_sender", ...s);
    return {
      kind: "summon_foreign",
    };
  }
  let { status } = y;
  let M = status === 502 || status === 503 || status === 504;
  let P = () => {
    let R =
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
                : M
                  ? "unavailable"
                  : "http_failed";
    if (isOutsideOrgNotFound(slug, R))
      logFeatureSad("artifact_comment_reply", "not_found_outside_org", {
        status,
        ...tag,
      });
    else
      logFeatureBad("artifact_comment_reply", R, {
        status,
        ...tag,
      });
    let C = T !== "" ? `: ${T}` : "";
    return {
      kind: "error",
      message:
        status === 404
          ? "artifact or comment thread not found \u2014 it may have been deleted, or you may not have access"
          : status === 429
            ? "rate limited \u2014 comment replies spend the user's budget; do not retry now"
            : M
              ? `comment reply temporarily unavailable (HTTP ${status})${C} \u2014 it may still have posted; re-read the comments before retrying later`
              : status === 409
                ? `comment reply conflicted${C} \u2014 re-read the comments before retrying`
                : `comment reply refused (HTTP ${status})${C}`,
      reason: R,
      ...(M && {
        unknownOutcome: true,
      }),
    };
  };
  if (replyId !== undefined && status === 400 && isUnknownFieldErrorFor(y.data, "id"))
    return {
      kind: "id_unknown",
      fail: P,
    };
  if (x && M)
    return {
      kind: "retryable",
      waitMs: computeRetryDelay(y.response?.headers?.["retry-after"]),
      status,
      fail: P,
    };
  return P();
}
//@ chunk-b0a246e7.js:31546-32199 placement
async function readSummonStatus(slug, threadId, n) {
  let r;
  try {
    r = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}/summon-status`,
      n,
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
  if (!r.ok) {
    if (r.reason === "relay-unavailable" || r.reason === "relay-not-served")
      return {
        kind: "unsent",
        status: r.status,
      };
    return {
      kind: "skipped",
      reason: r.reason,
    };
  }
  if (!r.fromFrame)
    return {
      kind: "failed",
      reason: "relay_error",
      status: r.status,
    };
  if (r.status === 404)
    return {
      kind: "route_absent",
    };
  if (r.status < 200 || r.status >= 300)
    return {
      kind: "failed",
      reason: "http_failed",
      status: r.status,
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
