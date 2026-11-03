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
  NO_USER_CREDENTIAL_TEXT,
  ORG_SERVICE_KEY_WRITE_TEXT,
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
var EDIT_STALE_REASON = "the artifact changed since this edit";
var EDIT_GRANT_INACTIVE_REASON = "this thread's edit grant is no longer active";
var NOT_OWN_CREDENTIAL_REASON = "not published under your credential";
//@ chunk-b0a246e7.js:32336-32688 placement
function classifyResolveError(status, t) {
  if (status === 409 && t.includes(EDIT_STALE_REASON))
    return {
      kind: "superseded",
    };
  if (status === 403) {
    if (t.includes(EDIT_GRANT_INACTIVE_REASON))
      return {
        kind: "grant_inactive",
      };
    if (t.includes(NOT_OWN_CREDENTIAL_REASON))
      return {
        kind: "principal_mismatch",
      };
    if (t.includes(COMMENT_ERROR_TEXT))
      return {
        kind: "not_activated",
      };
  }
  return {
    kind: "error",
    message: `thread resolve failed (status ${status})`,
    reason: status === 404 ? "not_found" : status === 429 ? "rate_limited" : "http",
  };
}
//@ chunk-b0a246e7.js:32688-34137 placement
/**
 * 把 artifact 评论线程标记为已解决（/api/frame/comments/.../resolve），校验 slug 与线程 id。
 */
async function resolveCommentThread(e) {
  let { slug, threadId, afterVersion, signal, credentials } = e;
  if (!ARTIFACT_SLUG_RE.test(slug) || !ARTIFACT_SLUG_RE.test(threadId))
    return {
      kind: "error",
      message: "invalid slug or thread id",
      reason: "input",
    };
  let startTime = performance.now();
  let a;
  try {
    a = await frameApi.postRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}/resolve`,
      {
        resolved: true,
        after_version: afterVersion,
      },
      frameRequestOptions(signal, credentials),
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    logFeatureBad("artifact_comment_resolve", "request_error", getTransportErrorProps(error, startTime));
    return {
      kind: "error",
      message: "thread resolve failed (network error)",
      reason: "request_error",
    };
  }
  if (!a.ok) {
    if (a.reason === "relay-unavailable") {
      logFeatureBad("artifact_comment_resolve", "relay_unavailable", {
        status: a.status,
      });
      return {
        kind: "error",
        message: "thread resolve not sent (relay unavailable)",
        reason: "relay_unavailable",
      };
    }
    logFeatureBad("artifact_comment_resolve", a.reason.replace(/-/g, "_"));
    return {
      kind: "error",
      message: `thread resolve unavailable: ${a.reason}`,
      reason: "transport",
    };
  }
  if (a.status === 200) {
    logFeatureOk("artifact_comment_resolve");
    return {
      kind: "ok",
    };
  }
  let d = networkOffRefusal(a, "thread resolve");
  if (d) {
    logFeatureSad("artifact_comment_resolve", "network_off");
    return d;
  }
  if (!a.fromFrame) {
    logFeatureBad("artifact_comment_resolve", "relay_error", {
      status: a.status,
    });
    return {
      kind: "error",
      message: `thread resolve outcome unknown (relay HTTP ${a.status})`,
      reason: "relay_error",
    };
  }
  let l = classifyResolveError(a.status, errorMessage(a.data));
  if (l.kind === "error") logFeatureBad("artifact_comment_resolve", l.reason);
  else if (l.kind === "principal_mismatch") logFeatureBad("artifact_comment_resolve", l.kind);
  else logFeatureSad("artifact_comment_resolve", l.kind);
  return l;
}
//@ chunk-b0a246e7.js:34137-34182 placement
var ONLY_STARTER_OR_WRITER_TEXT = "only the thread starter or a writer";
//@ chunk-b0a246e7.js:34182-34627 placement
/**
 * 线程解决的错误文案：需要 claude.ai 会话、CCR agent token 不可用、中继失败时不确认的说明。
 */
var RESOLVE_ERROR_TEXT = "requires a claude.ai session";
var RELAYED_CREDENTIAL = "relayed_credential";
var THREAD_NOT_FOUND = "thread_not_found";
var CCR_TOKEN_DENIED_TEXT = "CCR agent tokens cannot call this route";
var RESOLVE_NOT_CONFIRMED_TEXT =
  "thread resolve not confirmed (this session's comment connection failed on this attempt, so the thread may or may not be resolved) \u2014 retry the resolve once if you have not already, it is safe to repeat; if it fails again, leave the thread unresolved and, if you addressed it, say so in a reply on the thread";
//@ chunk-b0a246e7.js:34627-37756 placement
async function reopenCommentThread({ slug, threadId, credentials }, signal) {
  if (!ARTIFACT_SLUG_RE.test(slug) || !ARTIFACT_SLUG_RE.test(threadId))
    return {
      kind: "error",
      message: "invalid slug or thread id",
      reason: "input",
    };
  let o = (E) => `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}/${E}`;
  let u = (E) =>
    frameApi.post(
      o(E),
      {
        resolved: true,
      },
      frameRequestOptions(signal, credentials),
    );
  let startTime = performance.now();
  let a = accountBotMayRelay(COMMENTS_RELAY_FAMILY);
  let d;
  try {
    if (frameVerbRelayActive(COMMENTS_RELAY_FAMILY) && !(a && relayDeclined(COMMENTS_RELAY_FAMILY))) {
      d = await frameApi.postRelayOnly(
        o("resolve"),
        {
          resolved: true,
        },
        frameRequestOptions(signal, credentials),
      );
      if (a && !d.ok && d.reason === "relay-unavailable") {
        logFeatureSad("artifact_comment_session_resolve", "relay_declined", {
          status: d.status,
        });
        d = undefined;
      }
    }
    if (d === undefined) {
      startTime = performance.now();
      d = await u("session-resolve");
      let E = d.ok && d.status === 404 && errorReason(d.data) !== THREAD_NOT_FOUND;
      let y = d.ok && d.status === 403 && errorMessage(d.data).includes(CCR_TOKEN_DENIED_TEXT);
      if (E || y) {
        logFeatureSad(
          "artifact_comment_session_resolve",
          y ? "session_route_ccr_denied" : "session_route_fell_back",
        );
        startTime = performance.now();
        d = await u("resolve");
      }
    }
  } catch (error) {
    if (isCancel(error)) throw error;
    if (threwOnRelayLeg(error)) {
      logFeatureBad("artifact_comment_session_resolve", "relay_request_error");
      return {
        kind: "error",
        message: RESOLVE_NOT_CONFIRMED_TEXT,
        reason: "relay_request_error",
      };
    }
    logFeatureBad(
      "artifact_comment_session_resolve",
      "request_error",
      getTransportErrorProps(error, startTime),
    );
    return {
      kind: "error",
      message: "thread resolve failed (network error)",
      reason: "request_error",
    };
  }
  if (!d.ok) {
    if (d.reason === "relay-unavailable") {
      logFeatureBad("artifact_comment_session_resolve", "relay_unavailable", {
        status: d.status,
      });
      return {
        kind: "error",
        message: RESOLVE_NOT_CONFIRMED_TEXT,
        reason: "relay_unavailable",
      };
    }
    logFeatureBad("artifact_comment_session_resolve", d.reason.replace(/-/g, "_"));
    return {
      kind: "error",
      message:
        d.reason === "no-auth"
          ? describeArtifactAuthFailure(d.detail)
          : `thread resolve unavailable: ${d.reason}`,
      reason: "transport",
    };
  }
  if (d.status === 200) {
    logFeatureOk("artifact_comment_session_resolve");
    return {
      kind: "ok",
    };
  }
  let l = networkOffRefusal(d, "thread resolve");
  if (l) {
    logFeatureSad("artifact_comment_session_resolve", "network_off");
    return l;
  }
  if (!d.fromFrame) {
    logFeatureBad("artifact_comment_session_resolve", "relay_error", {
      status: d.status,
    });
    return {
      kind: "error",
      message: RESOLVE_NOT_CONFIRMED_TEXT,
      reason: "relay_error",
    };
  }
  let A = errorMessage(d.data);
  if (d.status === 403) {
    if (A.includes(COMMENT_ERROR_TEXT)) {
      logFeatureSad("artifact_comment_session_resolve", "not_activated");
      return {
        kind: "not_activated",
      };
    }
    if (A.includes(ONLY_STARTER_OR_WRITER_TEXT)) {
      logFeatureSad("artifact_comment_session_resolve", "not_authorized");
      return {
        kind: "not_authorized",
      };
    }
    if (errorReason(d.data) === SUMMON_FOREIGN_SENDER) {
      logFeatureSad("artifact_comment_session_resolve", "summon_foreign_sender");
      return {
        kind: "summon_foreign",
      };
    }
    if (A.includes(RESOLVE_ERROR_TEXT) || errorReason(d.data) === RELAYED_CREDENTIAL) {
      logFeatureSad("artifact_comment_session_resolve", "relayed_credential");
      return {
        kind: "relayed_credential",
      };
    }
    if (A.includes(NO_USER_CREDENTIAL_TEXT)) {
      logFeatureSad("artifact_comment_session_resolve", "service_key_credential");
      return {
        kind: "error",
        message: `thread resolve refused: ${ORG_SERVICE_KEY_WRITE_TEXT}`,
        reason: "service_key_credential",
      };
    }
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
    logFeatureSad("artifact_comment_session_resolve", "not_found_outside_org", {
      status: d.status,
    });
  else
    logFeatureBad("artifact_comment_session_resolve", h, {
      status: d.status,
    });
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
