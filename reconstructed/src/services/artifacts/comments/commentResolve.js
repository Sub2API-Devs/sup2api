/**
 * services/artifacts/comments/commentResolve.ts
 *
 * 2.1.316 新增：解决/重开评论线程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b0a246e7.js (6)
 * attribution: placement 6
 */
import {
  COMMENT_ERROR_TEXT,
  frameRequestOptions,
  networkOffRefusal,
  errorMessage,
  errorReason,
  SUMMON_FOREIGN_SENDER,
  W,
  ve,
} from "./commentReply.js";
import { ARTIFACT_SLUG_RE } from "../../../tools/ArtifactTool/constants.js";
import {
  frameApi,
  accountBotMayRelay,
  COMMENTS_RELAY_FAMILY,
  frameVerbRelayActive,
  relayDeclined,
  threwOnRelayLeg,
} from "../frameRelay.js";
import { isCancel } from "../../../../vendor/axios/dist/esm/axios.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../analytics/featureTelemetry.js";
import { getTransportErrorProps } from "../frameApi.js";
import { describeArtifactAuthFailure } from "../frameFlags.js";
import { isOutsideOrgNotFound } from "../shareEntries.js";

//@ chunk-b0a246e7.js:32199-32336 placement
var EDIT_STALE_REASON = "the artifact changed since this edit",
  EDIT_GRANT_INACTIVE_REASON = "this thread's edit grant is no longer active",
  NOT_OWN_CREDENTIAL_REASON = "not published under your credential";
//@ chunk-b0a246e7.js:32336-32688 placement
function classifyResolveError(e, t) {
  if (e === 409 && t.includes(EDIT_STALE_REASON)) return { kind: "superseded" };
  if (e === 403) {
    if (t.includes(EDIT_GRANT_INACTIVE_REASON)) return { kind: "grant_inactive" };
    if (t.includes(NOT_OWN_CREDENTIAL_REASON)) return { kind: "principal_mismatch" };
    if (t.includes(COMMENT_ERROR_TEXT)) return { kind: "not_activated" };
  }
  return {
    kind: "error",
    message: `thread resolve failed (status ${e})`,
    reason: e === 404 ? "not_found" : e === 429 ? "rate_limited" : "http",
  };
}
/**
 * 把 artifact 评论线程标记为已解决（/api/frame/comments/.../resolve），校验 slug 与线程 id。
 */
//@ chunk-b0a246e7.js:32688-34137 placement
async function resolveCommentThread(e) {
  let {
    slug: slug,
    threadId: threadId,
    afterVersion: afterVersion,
    signal: signal,
    credentials: credentials,
  } = e;
  if (!ARTIFACT_SLUG_RE.test(slug) || !ARTIFACT_SLUG_RE.test(threadId))
    return { kind: "error", message: "invalid slug or thread id", reason: "input" };
  let startTime = performance.now(),
    a;
  try {
    a = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}/resolve`,
      { resolved: !0, after_version: afterVersion },
      frameRequestOptions(signal, credentials),
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    return (
      logFeatureBad("artifact_comment_resolve", "request_error", getTransportErrorProps(error, startTime)),
      { kind: "error", message: "thread resolve failed (network error)", reason: "request_error" }
    );
  }
  if (!a.ok) {
    if (a.reason === "relay-unavailable")
      return (
        logFeatureBad("artifact_comment_resolve", "relay_unavailable", { status: a.status }),
        { kind: "error", message: "thread resolve not sent (relay unavailable)", reason: "relay_unavailable" }
      );
    return (
      logFeatureBad("artifact_comment_resolve", a.reason.replace(/-/g, "_")),
      { kind: "error", message: `thread resolve unavailable: ${a.reason}`, reason: "transport" }
    );
  }
  if (a.status === 200) return (logFeatureOk("artifact_comment_resolve"), { kind: "ok" });
  let d = networkOffRefusal(a, "thread resolve");
  if (d) return (logFeatureSad("artifact_comment_resolve", "network_off"), d);
  if (!a.fromFrame)
    return (
      logFeatureBad("artifact_comment_resolve", "relay_error", { status: a.status }),
      {
        kind: "error",
        message: `thread resolve outcome unknown (relay HTTP ${a.status})`,
        reason: "relay_error",
      }
    );
  let l = classifyResolveError(a.status, errorMessage(a.data));
  if (l.kind === "error") logFeatureBad("artifact_comment_resolve", l.reason);
  else if (l.kind === "principal_mismatch") logFeatureBad("artifact_comment_resolve", l.kind);
  else logFeatureSad("artifact_comment_resolve", l.kind);
  return l;
}
//@ chunk-b0a246e7.js:34137-34182 placement
var jt = "only the thread starter or a writer";
//@ chunk-b0a246e7.js:34182-34627 placement
var RESOLVE_ERROR_TEXT = "requires a claude.ai session",
  RELAYED_CREDENTIAL = "relayed_credential",
  THREAD_NOT_FOUND = "thread_not_found",
  Xt = "CCR agent tokens cannot call this route",
  q =
    "thread resolve not confirmed (this session's comment connection failed on this attempt, so the thread may or may not be resolved) \u2014 retry the resolve once if you have not already, it is safe to repeat; if it fails again, leave the thread unresolved and, if you addressed it, say so in a reply on the thread";
//@ chunk-b0a246e7.js:34627-37756 placement
async function reopenCommentThread({ slug: slug, threadId: threadId, credentials: credentials }, r) {
  if (!ARTIFACT_SLUG_RE.test(slug) || !ARTIFACT_SLUG_RE.test(threadId))
    return { kind: "error", message: "invalid slug or thread id", reason: "input" };
  let o = (E) => `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}/${E}`,
    u = (E) => frameApi.post(o(E), { resolved: !0 }, frameRequestOptions(r, credentials)),
    startTime = performance.now(),
    a = accountBotMayRelay(COMMENTS_RELAY_FAMILY),
    d;
  try {
    if (frameVerbRelayActive(COMMENTS_RELAY_FAMILY) && !(a && relayDeclined(COMMENTS_RELAY_FAMILY))) {
      if (
        ((d = await frameApi.postRelayOnly(
          o("resolve"),
          { resolved: !0 },
          frameRequestOptions(r, credentials),
        )),
        a && !d.ok && d.reason === "relay-unavailable")
      )
        (logFeatureSad("artifact_comment_session_resolve", "relay_declined", { status: d.status }),
          (d = void 0));
    }
    if (d === void 0) {
      ((startTime = performance.now()), (d = await u("session-resolve")));
      let E = d.ok && d.status === 404 && errorReason(d.data) !== THREAD_NOT_FOUND,
        y = d.ok && d.status === 403 && errorMessage(d.data).includes(Xt);
      if (E || y)
        (logFeatureSad(
          "artifact_comment_session_resolve",
          y ? "session_route_ccr_denied" : "session_route_fell_back",
        ),
          (startTime = performance.now()),
          (d = await u("resolve")));
    }
  } catch (error) {
    if (isCancel(error)) throw error;
    if (threwOnRelayLeg(error))
      return (
        logFeatureBad("artifact_comment_session_resolve", "relay_request_error"),
        { kind: "error", message: q, reason: "relay_request_error" }
      );
    return (
      logFeatureBad(
        "artifact_comment_session_resolve",
        "request_error",
        getTransportErrorProps(error, startTime),
      ),
      { kind: "error", message: "thread resolve failed (network error)", reason: "request_error" }
    );
  }
  if (!d.ok) {
    if (d.reason === "relay-unavailable")
      return (
        logFeatureBad("artifact_comment_session_resolve", "relay_unavailable", { status: d.status }),
        { kind: "error", message: q, reason: "relay_unavailable" }
      );
    return (
      logFeatureBad("artifact_comment_session_resolve", d.reason.replace(/-/g, "_")),
      {
        kind: "error",
        message:
          d.reason === "no-auth"
            ? describeArtifactAuthFailure(d.detail)
            : `thread resolve unavailable: ${d.reason}`,
        reason: "transport",
      }
    );
  }
  if (d.status === 200) return (logFeatureOk("artifact_comment_session_resolve"), { kind: "ok" });
  let l = networkOffRefusal(d, "thread resolve");
  if (l) return (logFeatureSad("artifact_comment_session_resolve", "network_off"), l);
  if (!d.fromFrame)
    return (
      logFeatureBad("artifact_comment_session_resolve", "relay_error", { status: d.status }),
      { kind: "error", message: q, reason: "relay_error" }
    );
  let A = errorMessage(d.data);
  if (d.status === 403) {
    if (A.includes(COMMENT_ERROR_TEXT))
      return (logFeatureSad("artifact_comment_session_resolve", "not_activated"), { kind: "not_activated" });
    if (A.includes(jt))
      return (
        logFeatureSad("artifact_comment_session_resolve", "not_authorized"),
        { kind: "not_authorized" }
      );
    if (errorReason(d.data) === SUMMON_FOREIGN_SENDER)
      return (
        logFeatureSad("artifact_comment_session_resolve", "summon_foreign_sender"),
        { kind: "summon_foreign" }
      );
    if (A.includes(RESOLVE_ERROR_TEXT) || errorReason(d.data) === RELAYED_CREDENTIAL)
      return (
        logFeatureSad("artifact_comment_session_resolve", "relayed_credential"),
        { kind: "relayed_credential" }
      );
    if (A.includes(W))
      return (
        logFeatureSad("artifact_comment_session_resolve", "service_key_credential"),
        { kind: "error", message: `thread resolve refused: ${ve}`, reason: "service_key_credential" }
      );
  }
  let h =
    d.status === 403
      ? "forbidden"
      : d.status === 404
        ? "not_found"
        : d.status === 429
          ? "rate_limited"
          : d.status === 503
            ? "unavailable"
            : "http";
  if (isOutsideOrgNotFound(slug, h))
    logFeatureSad("artifact_comment_session_resolve", "not_found_outside_org", { status: d.status });
  else logFeatureBad("artifact_comment_session_resolve", h, { status: d.status });
  let s = A !== "" ? `: ${A}` : "";
  return {
    kind: "error",
    message:
      d.status === 404
        ? "artifact or comment thread not found \u2014 it may have been deleted, or you may not have access"
        : d.status === 429
          ? "rate limited \u2014 do not retry now"
          : d.status === 503
            ? `thread resolve temporarily unavailable${s} \u2014 retry later if still needed`
            : `thread resolve refused (HTTP ${d.status})${s}`,
    reason: h,
  };
}

export { reopenCommentThread, resolveCommentThread };
