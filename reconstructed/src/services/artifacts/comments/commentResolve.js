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
function classifyResolveError(status, message) {
  if (status === 409 && message.includes(EDIT_STALE_REASON))
    return {
      kind: "superseded",
    };
  if (status === 403) {
    if (message.includes(EDIT_GRANT_INACTIVE_REASON))
      return {
        kind: "grant_inactive",
      };
    if (message.includes(NOT_OWN_CREDENTIAL_REASON))
      return {
        kind: "principal_mismatch",
      };
    if (message.includes(COMMENT_ERROR_TEXT))
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
async function resolveCommentThread(request) {
  let { slug, threadId, afterVersion, signal, credentials } = request;
  if (!ARTIFACT_SLUG_RE.test(slug) || !ARTIFACT_SLUG_RE.test(threadId))
    return {
      kind: "error",
      message: "invalid slug or thread id",
      reason: "input",
    };
  let startTime = performance.now();
  let response;
  try {
    response = await frameApi.postRelayBound(
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
  if (!response.ok) {
    if (response.reason === "relay-unavailable") {
      logFeatureBad("artifact_comment_resolve", "relay_unavailable", {
        status: response.status,
      });
      return {
        kind: "error",
        message: "thread resolve not sent (relay unavailable)",
        reason: "relay_unavailable",
      };
    }
    logFeatureBad("artifact_comment_resolve", response.reason.replace(/-/g, "_"));
    return {
      kind: "error",
      message: `thread resolve unavailable: ${response.reason}`,
      reason: "transport",
    };
  }
  if (response.status === 200) {
    logFeatureOk("artifact_comment_resolve");
    return {
      kind: "ok",
    };
  }
  let refusal = networkOffRefusal(response, "thread resolve");
  if (refusal) {
    logFeatureSad("artifact_comment_resolve", "network_off");
    return refusal;
  }
  if (!response.fromFrame) {
    logFeatureBad("artifact_comment_resolve", "relay_error", {
      status: response.status,
    });
    return {
      kind: "error",
      message: `thread resolve outcome unknown (relay HTTP ${response.status})`,
      reason: "relay_error",
    };
  }
  let classified = classifyResolveError(response.status, errorMessage(response.data));
  if (classified.kind === "error") logFeatureBad("artifact_comment_resolve", classified.reason);
  else if (classified.kind === "principal_mismatch")
    logFeatureBad("artifact_comment_resolve", classified.kind);
  else logFeatureSad("artifact_comment_resolve", classified.kind);
  return classified;
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
  let resolveUrl = (action) =>
    `/api/frame/comments/${encodeURIComponent(slug)}/${encodeURIComponent(threadId)}/${action}`;
  let resolveSession = (action) =>
    frameApi.post(
      resolveUrl(action),
      {
        resolved: true,
      },
      frameRequestOptions(signal, credentials),
    );
  let startTime = performance.now();
  let botMayRelay = accountBotMayRelay(COMMENTS_RELAY_FAMILY);
  let response;
  try {
    if (
      frameVerbRelayActive(COMMENTS_RELAY_FAMILY) &&
      !(botMayRelay && relayDeclined(COMMENTS_RELAY_FAMILY))
    ) {
      response = await frameApi.postRelayOnly(
        resolveUrl("resolve"),
        {
          resolved: true,
        },
        frameRequestOptions(signal, credentials),
      );
      if (botMayRelay && !response.ok && response.reason === "relay-unavailable") {
        logFeatureSad("artifact_comment_session_resolve", "relay_declined", {
          status: response.status,
        });
        response = undefined;
      }
    }
    if (response === undefined) {
      startTime = performance.now();
      response = await resolveSession("session-resolve");
      let retryable =
        response.ok && response.status === 404 && errorReason(response.data) !== THREAD_NOT_FOUND;
      let relayOnly =
        response.ok && response.status === 403 && errorMessage(response.data).includes(CCR_TOKEN_DENIED_TEXT);
      if (retryable || relayOnly) {
        logFeatureSad(
          "artifact_comment_session_resolve",
          relayOnly ? "session_route_ccr_denied" : "session_route_fell_back",
        );
        startTime = performance.now();
        response = await resolveSession("resolve");
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
  if (!response.ok) {
    if (response.reason === "relay-unavailable") {
      logFeatureBad("artifact_comment_session_resolve", "relay_unavailable", {
        status: response.status,
      });
      return {
        kind: "error",
        message: RESOLVE_NOT_CONFIRMED_TEXT,
        reason: "relay_unavailable",
      };
    }
    logFeatureBad("artifact_comment_session_resolve", response.reason.replace(/-/g, "_"));
    return {
      kind: "error",
      message:
        response.reason === "no-auth"
          ? describeArtifactAuthFailure(response.detail)
          : `thread resolve unavailable: ${response.reason}`,
      reason: "transport",
    };
  }
  if (response.status === 200) {
    logFeatureOk("artifact_comment_session_resolve");
    return {
      kind: "ok",
    };
  }
  let refusal = networkOffRefusal(response, "thread resolve");
  if (refusal) {
    logFeatureSad("artifact_comment_session_resolve", "network_off");
    return refusal;
  }
  if (!response.fromFrame) {
    logFeatureBad("artifact_comment_session_resolve", "relay_error", {
      status: response.status,
    });
    return {
      kind: "error",
      message: RESOLVE_NOT_CONFIRMED_TEXT,
      reason: "relay_error",
    };
  }
  let message = errorMessage(response.data);
  if (response.status === 403) {
    if (message.includes(COMMENT_ERROR_TEXT)) {
      logFeatureSad("artifact_comment_session_resolve", "not_activated");
      return {
        kind: "not_activated",
      };
    }
    if (message.includes(ONLY_STARTER_OR_WRITER_TEXT)) {
      logFeatureSad("artifact_comment_session_resolve", "not_authorized");
      return {
        kind: "not_authorized",
      };
    }
    if (errorReason(response.data) === SUMMON_FOREIGN_SENDER) {
      logFeatureSad("artifact_comment_session_resolve", "summon_foreign_sender");
      return {
        kind: "summon_foreign",
      };
    }
    if (message.includes(RESOLVE_ERROR_TEXT) || errorReason(response.data) === RELAYED_CREDENTIAL) {
      logFeatureSad("artifact_comment_session_resolve", "relayed_credential");
      return {
        kind: "relayed_credential",
      };
    }
    if (message.includes(NO_USER_CREDENTIAL_TEXT)) {
      logFeatureSad("artifact_comment_session_resolve", "service_key_credential");
      return {
        kind: "error",
        message: `thread resolve refused: ${ORG_SERVICE_KEY_WRITE_TEXT}`,
        reason: "service_key_credential",
      };
    }
  }
  let body =
    response.status === 403
      ? "forbidden"
      : response.status === 404
        ? "not_found"
        : response.status === 429
          ? "rate_limited"
          : response.status === 503
            ? "unavailable"
            : "http";
  if (isOutsideOrgNotFound(slug, body))
    logFeatureSad("artifact_comment_session_resolve", "not_found_outside_org", {
      status: response.status,
    });
  else
    logFeatureBad("artifact_comment_session_resolve", body, {
      status: response.status,
    });
  let reasonSuffix = message !== "" ? `: ${message}` : "";
  return {
    kind: "error",
    message:
      response.status === 404
        ? "artifact or comment thread not found \u2014 it may have been deleted, or you may not have access"
        : response.status === 429
          ? "rate limited \u2014 do not retry now"
          : response.status === 503
            ? `thread resolve temporarily unavailable${reasonSuffix} \u2014 retry later if still needed`
            : `thread resolve refused (HTTP ${response.status})${reasonSuffix}`,
    reason: body,
  };
}
export { reopenCommentThread, resolveCommentThread };
