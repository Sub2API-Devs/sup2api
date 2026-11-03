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
import { _0o } from "../frameComments.js";
import { parseRetryAfterMs } from "../../../bridge/debugUtils.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { create, create_2, create_6 } from "../../../../vendor/zod/lib/index.mjs";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import { scrubServerLine } from "../../../tools/ArtifactTool/artifactUrls.js";
import { buildFrameHeaders, getTransportErrorProps, Xor } from "../frameApi.js";
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
var COMMENT_ERROR_TEXT = "not activated on this thread",
  W = "comments require a user-scoped credential",
  St =
    "this session's credential is an organization service key with no Claude agent grant; comments are readable only by a user login or by the agent that created the Artifact \u2014 tell the user that comments can't be read from this session",
  Tt =
    "network access for this session is turned off or could not be confirmed, so nothing was posted or resolved \u2014 do not retry; tell the user they can do it on the artifact's own page",
  ve =
    "this session's credential is an organization service key with no Claude agent grant, so it cannot post or resolve comments (only a user login can, or the agent that created the Artifact on threads a person activated for Claude) \u2014 tell the user that; don't write replies into the page itself",
  SUMMON_ALREADY_ANSWERED = "summon_already_answered",
  SUMMON_FOREIGN_SENDER = "summon_foreign_sender",
  ID_IN_USE = "id_in_use",
  Se = _0o,
  Mt = { min: 800, max: 1500 },
  Pt = 5000;
//@ chunk-b0a246e7.js:23954-24116 placement
function computeRetryDelay(e) {
  let { min: min, max: max } = Mt,
    floored = Math.floor(Math.random() * (max - min + 1)),
    o = parseRetryAfterMs(typeof e === "string" ? e : void 0);
  return o === void 0 || o <= 0 ? min + floored : Math.min(Math.max(o, min), Pt) + floored;
}
//@ chunk-b0a246e7.js:24116-24518 placement
var COMMENT_REPLY_TEXT =
    "an earlier attempt may already have posted this reply; re-read the comments before retrying",
  Ft =
    "comment reply not sent (this session's comment connection did not carry it on this attempt, so nothing was posted) \u2014 retry the reply once; if it fails again, tell the user you could not post the reply from this session",
  Lt = DoctorLazy(() =>
    create({ thread_id: create_2(), comment_id: create_2(), replayed: create_6().optional() }),
  );
//@ chunk-b0a246e7.js:24518-24699 placement
function pickErrorFields(e) {
  if (!e || typeof e !== "object") return {};
  return {
    ...("error" in e && typeof e.error === "string" && { error: e.error }),
    ...("reason" in e && typeof e.reason === "string" && { reason: e.reason }),
  };
}
//@ chunk-b0a246e7.js:24699-24739 placement
function errorReason(e) {
  return pickErrorFields(e).reason ?? null;
}
//@ chunk-b0a246e7.js:24739-24797 placement
var Bt = DoctorLazy(() => create({ standing_reply: create({ id: create_2(), own: create_6() }) }));
//@ chunk-b0a246e7.js:24797-24922 placement
function parseStandingReply(e) {
  let safeParse = Bt().safeParse(e);
  if (!safeParse.success || !ARTIFACT_SLUG_RE.test(safeParse.data.standing_reply.id)) return;
  return safeParse.data.standing_reply;
}
//@ chunk-b0a246e7.js:24922-24997 placement
function errorMessage(e) {
  let t = pickErrorFields(e).error ?? e;
  return typeof t === "string" ? scrubServerLine(t, 300) : "";
}
//@ chunk-b0a246e7.js:24997-25107 placement
function frameRequestOptions(e, t) {
  return {
    refreshOAuth: !0,
    credentials: t,
    headers: buildFrameHeaders(),
    timeout: 30000,
    maxContentLength: Se,
    signal: e,
  };
}
//@ chunk-b0a246e7.js:25107-25165 placement
async function readRecordedDecl(e, t) {
  return (await readFrameDeclForComments(e, t)).orRecorded;
}
//@ chunk-b0a246e7.js:25165-25525 placement
async function readFrameDeclForComments(e, t) {
  let n = relayIsOnlyRoute()
      ? { err: "not read" }
      : await readFrameDecl(e, t.abortController.signal, t.credentials).catch(() => null),
    r = (u) => {
      let c = isPlainObject(u) ? u.comments : void 0;
      return isPlainObject(c) && c.headless === !0;
    };
  if (n === null) return { readNow: void 0, orRecorded: !1 };
  if ("err" in n) return { readNow: void 0, orRecorded: r(getShareEntry(e)?.capabilities) };
  let o = r(n.capabilities);
  return { readNow: o, orRecorded: o };
}
//@ chunk-b0a246e7.js:25525-25658 placement
function needsCapsReadForReply(e) {
  if (!relayIsOnlyRoute()) return !1;
  let t = getShareEntry(e);
  if (isReaderRole(t?.role)) return !1;
  return t?.lastCapsReadAt === void 0 || t.capabilitiesUnknown === !0;
}
//@ chunk-b0a246e7.js:25658-25792 placement
function networkOffRefusal(e, t) {
  return relayIsOnlyRoute() && e.gatewayPolicy === "network-off"
    ? { kind: "error", message: `${t} refused: ${Tt}`, reason: "network_off" }
    : void 0;
}
/**
 * 向 artifact 评论线程发表回复（直连或经会话中继），处理重发/幂等与授权错误。
 */
//@ chunk-b0a246e7.js:25792-27233 placement
async function postCommentReply(
  {
    slug: slug,
    threadId: threadId,
    text: text,
    clientId: clientId,
    answersSummon: answersSummon,
    continuesReplyId: continuesReplyId,
    resend: resend,
    credentials: credentials,
  },
  d,
) {
  let l,
    A = !1,
    h = resend ? { resend: resend } : {};
  if (continuesReplyId !== void 0 && answersSummon !== !0)
    if (ARTIFACT_SLUG_RE.test(continuesReplyId)) l = continuesReplyId;
    else A = !0;
  let accountEpoch = getLiveState().accountEpoch,
    x = {
      slug: slug,
      threadId: threadId,
      text: text,
      answersSummon: answersSummon,
      continues: l,
      markerDropped: A,
      epoch: accountEpoch,
      tag: h,
      credentials: credentials,
      signal: d,
    },
    E = clientId,
    y = await sendCommentReply(x, E, !0);
  if (y.kind === "id_unknown") ((E = void 0), (h.idless = !0), (y = await sendCommentReply(x, E, !1)));
  if (y.kind !== "retryable") return y.kind === "id_unknown" ? y.fail() : y;
  if ((await sleep(y.waitMs, d), d.aborted)) throw new AbortError();
  ((h.retried = !0), (h.first_status = y.status));
  let S = await sendCommentReply(x, E, !1);
  if (S.kind === "retryable" || S.kind === "id_unknown") return y.fail();
  if (S.kind === "error" && !S.unknownOutcome) {
    let T = y.status === 0 ? "an earlier attempt drew no answer" : `an earlier attempt met HTTP ${y.status}`,
      b =
        S.reason === "relay_unavailable"
          ? "the retry was not carried"
          : S.reason === "request_error"
            ? "the retry failed on the network"
            : void 0;
    return {
      ...S,
      message:
        S.reason === "network_off"
          ? `comment reply outcome unknown (${T}, and the retry was refused because network access for this session is turned off or could not be confirmed) \u2014 it may have posted; re-read the comments to find out, and do not retry: if it is not there, tell the user they can reply on the artifact's own page`
          : b !== void 0
            ? `comment reply outcome unknown (${T}, and ${b}) \u2014 it may have posted; re-read the comments before retrying`
            : `${S.message} \u2014 ${COMMENT_REPLY_TEXT}`,
      unknownOutcome: !0,
    };
  }
  return S;
}
/**
 * 回复 artifact 评论线程：校验激活与凭证、构建请求、处理召唤与续写标记。
 */
//@ chunk-b0a246e7.js:27233-31546 placement
async function sendCommentReply(
  {
    slug: slug,
    threadId: threadId,
    text: text,
    answersSummon: answersSummon,
    continues: continues,
    markerDropped: markerDropped,
    epoch: epoch,
    tag: tag,
    credentials: credentials,
    signal: signal,
  },
  A,
  h,
) {
  let s = Object.keys(tag).length > 0 ? [{ ...tag }] : [],
    x = h && A !== void 0,
    startTime = performance.now(),
    y;
  try {
    y = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}`,
      {
        ...(A !== void 0 && { id: A }),
        text: text,
        ...(answersSummon === !0 && { answers_summon: !0 }),
        ...(continues !== void 0 && { continues_reply_id: continues }),
      },
      frameRequestOptions(signal, credentials),
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    let C = getTransportErrorProps(error, startTime),
      O = threwOnRelayLeg(error);
    if (O || C.transport) {
      let N = O ? "relay_request_error" : "request_error",
        F = () => (
          logFeatureBad("artifact_comment_reply", N, { ...C, ...tag }),
          {
            kind: "error",
            message: `comment reply outcome unknown (${O ? "relay request failed" : "no answer: network error or timeout"}) \u2014 it may have posted; re-read the comments before retrying`,
            reason: N,
            unknownOutcome: !0,
          }
        );
      return x ? { kind: "retryable", waitMs: computeRetryDelay(void 0), status: 0, fail: F } : F();
    }
    return (
      logFeatureBad("artifact_comment_reply", "request_error", { ...C, ...tag }),
      { kind: "error", message: "comment reply failed (network error)", reason: "request_error" }
    );
  }
  if (!y.ok) {
    if (y.reason === "relay-unavailable")
      return (
        logFeatureBad("artifact_comment_reply", "relay_unavailable", { status: y.status, ...tag }),
        { kind: "error", message: Ft, reason: "relay_unavailable" }
      );
    return (
      logFeatureBad("artifact_comment_reply", y.reason.replace(/-/g, "_"), ...s),
      {
        kind: "error",
        message:
          y.reason === "no-auth"
            ? describeArtifactAuthFailure(y.detail)
            : `comment reply unavailable: ${y.reason}`,
        reason: "transport",
      }
    );
  }
  if (y.status === 201) {
    let safeParse = Lt().safeParse(y.data);
    if (!safeParse.success)
      return (
        logFeatureSad("artifact_comment_reply", "malformed_echo", ...s),
        { kind: "ok", threadId: threadId, commentId: "" }
      );
    let C = safeParse.data.replayed === !0,
      matches = ARTIFACT_SLUG_RE.test(safeParse.data.thread_id),
      matches_2 = COMMENT_ID_RE.test(safeParse.data.comment_id);
    if (!matches || !matches_2) logFeatureSad("artifact_comment_reply", "malformed_echo", ...s);
    else if (markerDropped) logFeatureSad("artifact_comment_reply", "continues_reply_id_malformed", ...s);
    else logFeatureOk("artifact_comment_reply", ...(C ? [{ ...tag, replayed: C }] : s));
    if (matches_2 && epoch === getLiveState().accountEpoch) rememberPostedReplyId(safeParse.data.comment_id);
    return {
      kind: "ok",
      threadId: matches ? safeParse.data.thread_id : threadId,
      commentId: matches_2 ? safeParse.data.comment_id : "",
      ...(C && { replayed: C }),
    };
  }
  let S = networkOffRefusal(y, "comment reply");
  if (S) return (logFeatureSad("artifact_comment_reply", "network_off", ...s), S);
  if (!y.fromFrame) {
    let { status: status } = y,
      C = () => (
        logFeatureBad("artifact_comment_reply", "relay_error", { status: status, ...tag }),
        {
          kind: "error",
          message: `comment reply outcome unknown (relay HTTP ${status}) \u2014 it may have posted; re-read the comments before retrying`,
          reason: "relay_error",
          unknownOutcome: !0,
        }
      );
    return x && (status >= 500 || status === 499)
      ? {
          kind: "retryable",
          waitMs: computeRetryDelay(y.response?.headers?.["retry-after"]),
          status: status,
          fail: C,
        }
      : C();
  }
  let T = errorMessage(y.data);
  if (y.status === 403 && T.includes(COMMENT_ERROR_TEXT))
    return (logFeatureSad("artifact_comment_reply", "not_activated", ...s), { kind: "not_activated" });
  if (y.status === 403 && T.includes(W))
    return (
      logFeatureSad("artifact_comment_reply", "service_key_credential", ...s),
      { kind: "error", message: `comment reply refused: ${ve}`, reason: "service_key_credential" }
    );
  if (A !== void 0 && y.status === 409 && errorReason(y.data) === ID_IN_USE) {
    if ((logFeatureSad("artifact_comment_reply", "id_in_use", ...s), epoch === getLiveState().accountEpoch))
      rememberPostedReplyId(A);
    return { kind: "ok", threadId: threadId, commentId: A, replayed: !0 };
  }
  if (y.status === 409 && errorReason(y.data) === SUMMON_ALREADY_ANSWERED) {
    let R = epoch === getLiveState().accountEpoch ? parseStandingReply(y.data) : void 0;
    return (
      logFeatureSad(
        "artifact_comment_reply",
        R?.own === !0 ? "summon_answered_own" : "summon_answered_elsewhere",
        ...s,
      ),
      { kind: "summon_answered", ...(R && { standing: R }) }
    );
  }
  if (y.status === 403 && errorReason(y.data) === SUMMON_FOREIGN_SENDER)
    return (
      logFeatureSad("artifact_comment_reply", "summon_foreign_sender", ...s),
      { kind: "summon_foreign" }
    );
  let { status: status } = y,
    M = status === 502 || status === 503 || status === 504,
    P = () => {
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
        logFeatureSad("artifact_comment_reply", "not_found_outside_org", { status: status, ...tag });
      else logFeatureBad("artifact_comment_reply", R, { status: status, ...tag });
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
        ...(M && { unknownOutcome: !0 }),
      };
    };
  if (A !== void 0 && status === 400 && Xor(y.data, "id")) return { kind: "id_unknown", fail: P };
  if (x && M)
    return {
      kind: "retryable",
      waitMs: computeRetryDelay(y.response?.headers?.["retry-after"]),
      status: status,
      fail: P,
    };
  return P();
}
//@ chunk-b0a246e7.js:31546-32199 placement
async function readSummonStatus(e, t, n) {
  let r;
  try {
    r = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(e)}/${encodeURIComponent(t)}/summon-status`,
      n,
      { isBackground: !0, headers: buildFrameHeaders(), timeout: 5000, maxContentLength: Se },
    );
  } catch {
    return { kind: "failed", reason: "request_error" };
  }
  if (!r.ok) {
    if (r.reason === "relay-unavailable" || r.reason === "relay-not-served")
      return { kind: "unsent", status: r.status };
    return { kind: "skipped", reason: r.reason };
  }
  if (!r.fromFrame) return { kind: "failed", reason: "relay_error", status: r.status };
  if (r.status === 404) return { kind: "route_absent" };
  if (r.status < 200 || r.status >= 300) return { kind: "failed", reason: "http_failed", status: r.status };
  return { kind: "accepted" };
}

export {
  needsCapsReadForReply,
  readFrameDeclForComments,
  readRecordedDecl,
  postCommentReply,
  errorMessage,
  W,
  St,
  COMMENT_ERROR_TEXT,
  frameRequestOptions,
  networkOffRefusal,
  errorReason,
  SUMMON_FOREIGN_SENDER,
  ve,
  readSummonStatus,
};
