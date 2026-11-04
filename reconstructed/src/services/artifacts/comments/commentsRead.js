/**
 * services/artifacts/comments/commentsRead.ts
 *
 * 2.1.316 新增：读取 artifact 评论（含重试与错误分类）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-b0a246e7.js (11)
 * attribution: placement 11
 */
import { errorMessage, NO_USER_CREDENTIAL_TEXT, ORG_SERVICE_KEY_READ_TEXT } from "./commentReply.js";
import { logFeatureSad, logFeatureBad } from "../../analytics/featureTelemetry.js";
import { parseCommentThreads, isCommentId, cleanAnchorText } from "./commentFormatting.js";
import { parseRetryAfterMs } from "../../../bridge/debugUtils.js";
import { commentsAuthContext, rememberPrincipalTokens } from "./commentAuthorship.js";
import { frameApi } from "../frameRelay.js";
import { buildFrameHeaders, getTransportErrorProps } from "../frameApi.js";
import { MAX_FRAME_HTML_BYTES } from "../frameComments.js";
import { isCancel } from "../../../../vendor/axios/dist/esm/axios.js";
import { describeArtifactAuthFailure } from "../frameFlags.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { sleep } from "../../../utils/sleep.js";
import { AbortError } from "../../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { fetchArtifactBootWithProbe } from "../boot.js";
import { getShareEntry, typeLockedFor, mayBeShared, triState } from "../shareEntries.js";
import { LIVE_DOC, isMeaningfulFlag } from "../textSanitize.js";

//@ chunk-b0a246e7.js:18315-18765 placement
function classifyCommentsReadError(response, featureName) {
  if (response.status === 403 && errorMessage(response.data).includes(NO_USER_CREDENTIAL_TEXT)) {
    logFeatureSad(featureName, "service_key_credential");
    return {
      err: ORG_SERVICE_KEY_READ_TEXT,
      unavailable: true,
    };
  }
  if (response.status < 200 || response.status >= 300) {
    logFeatureSad(featureName, "server_read_unavailable", {
      status: response.status,
    });
    return commentsUnavailable(response.status);
  }
  let commentThreads = parseCommentThreads(response.data, featureName);
  if (commentThreads === null) {
    logFeatureBad(featureName, "malformed_body");
    return {
      err: "comments fetch failed (unexpected response)",
    };
  }
  return {
    err: null,
    threads: commentThreads.threads,
    ...(commentThreads.threadsDegraded && {
      threadsDegraded: true,
    }),
    ...(commentThreads.threadsDropped && {
      threadsDropped: true,
    }),
  };
}
//@ chunk-b0a246e7.js:18765-18800 placement
var READ_RETRY_JITTER_MS = {
  min: 300,
  max: 800,
};
var MAX_READ_RETRY_WAIT_MS = 120000;
//@ chunk-b0a246e7.js:18800-18929 placement
function getRetryAfterCap(status, headerValue) {
  if (status !== 429 && status !== 503) return;
  let retryAfterMs = parseRetryAfterMs(typeof headerValue === "string" ? headerValue : undefined);
  return retryAfterMs === undefined || retryAfterMs <= 0
    ? undefined
    : Math.min(retryAfterMs, MAX_READ_RETRY_WAIT_MS);
}
//@ chunk-b0a246e7.js:18929-19006 placement
function readRetryJitter() {
  let { min, max } = READ_RETRY_JITTER_MS;
  return min + Math.floor(Math.random() * (max - min + 1));
}
//@ chunk-b0a246e7.js:19006-20935 placement
async function fetchComments(slug, signal, featureName, credentials, withNames) {
  let authContext = await commentsAuthContext(credentials);
  let startTime = performance.now();
  let response;
  try {
    response = await frameApi.getRelayBound(
      `/api/frame/comments/${encodeURIComponent(slug)}${withNames ? "?names=1" : ""}`,
      {
        refreshOAuth: true,
        credentials,
        headers: buildFrameHeaders(),
        timeout: 15000,
        maxContentLength: MAX_FRAME_HTML_BYTES,
        signal,
        reportSentAuth: true,
      },
    );
  } catch (error) {
    if (isCancel(error)) throw error;
    let transportErrorProps = getTransportErrorProps(error, startTime);
    let failRetryable = () => {
      logFeatureBad(featureName, "server_read_request_error", transportErrorProps);
      return transportErrorProps.transport
        ? {
            err: "comments fetch failed (network error)",
            retryable: true,
          }
        : {
            err: "comments fetch failed (the response could not be read)",
          };
    };
    return transportErrorProps.transport
      ? {
          kind: "retryable",
          miss: transportErrorProps,
          fail: failRetryable,
        }
      : {
          kind: "done",
          result: failRetryable(),
        };
  }
  if (!response.ok) {
    if (response.reason === "relay-unavailable") {
      let { status } = response;
      logFeatureBad(featureName, "server_read_relay_unavailable", {
        status,
      });
      let retryableStatus = status === 0 || status === 429 || status >= 500;
      return {
        kind: "done",
        result: {
          err: `comments fetch failed (this session's comment connection did not carry the read${status !== 0 ? `, HTTP ${status}` : ""}; nothing was read) \u2014 retry once; if it fails again, tell the user comments cannot be read from this session right now`,
          ...(retryableStatus && {
            retryable: true,
          }),
        },
      };
    }
    logFeatureBad(featureName, response.reason.replace(/-/g, "_"));
    return {
      kind: "done",
      result: {
        err:
          response.reason === "no-auth"
            ? describeArtifactAuthFailure(response.detail)
            : `comments read unavailable: ${response.reason}`,
      },
    };
  }
  if (!response.fromFrame) {
    let { status } = response;
    let retryableStatus = status >= 500 || status === 499;
    let failRetryable = () => {
      logFeatureBad(featureName, "server_read_relay_error", {
        status,
      });
      return {
        err: `comments fetch failed (relay HTTP ${status})`,
        ...((retryableStatus || status === 429) && {
          retryable: true,
        }),
      };
    };
    return retryableStatus
      ? {
          kind: "retryable",
          miss: {
            relay_status: status,
          },
          fail: failRetryable,
        }
      : {
          kind: "done",
          result: failRetryable(),
        };
  }
  if (response.status >= 500 || response.status === 429) {
    let { status } = response;
    let retryAfterCap = getRetryAfterCap(status, response.response?.headers?.["retry-after"]);
    let unavailable = status === 429 || retryAfterCap !== undefined;
    let collectResult = () => {
      if (unavailable)
        logFeatureSad(featureName, "server_read_unavailable", {
          status,
        });
      else
        logFeatureBad(featureName, "server_read_unavailable", {
          status,
        });
      return commentsUnavailable(status, {
        retryable: true,
        retryAfterMs: retryAfterCap,
      });
    };
    return status === 503 || unavailable
      ? {
          kind: "done",
          result: collectResult(),
        }
      : {
          kind: "retryable",
          miss: {
            status,
          },
          fail: collectResult,
        };
  }
  let classified = classifyCommentsReadError(response, featureName);
  if (classified.err === null) {
    rememberPrincipalTokens(
      viewerFromResponse(response.data),
      authContext,
      response.sentAuthFingerprint,
      response.route,
    );
    let anchorNames = withNames ? parseCommentAnchorNames(response.data) : undefined;
    if (anchorNames !== undefined)
      return {
        kind: "done",
        result: {
          ...classified,
          names: anchorNames,
        },
      };
  }
  return {
    kind: "done",
    result: classified,
  };
}
//@ chunk-b0a246e7.js:20935-21017 placement
function viewerFromResponse(payload) {
  return typeof payload === "object" && payload !== null && "viewer" in payload ? payload.viewer : undefined;
}
//@ chunk-b0a246e7.js:21017-21028 placement
var MAX_COMMENT_THREADS = 64;
//@ chunk-b0a246e7.js:21028-21249 placement
function parseCommentAnchorNames(payload) {
  if (!isPlainObject(payload) || !isPlainObject(payload.names)) return;
  let names = [];
  for (let [key, value] of Object.entries(payload.names)) {
    let cleaned = isCommentId(key) ? cleanAnchorText(value) : undefined;
    if (cleaned !== undefined) {
      names.push([key, cleaned]);
      if (names.length === MAX_COMMENT_THREADS) break;
    }
  }
  return names.length > 0 ? Object.fromEntries(names) : undefined;
}
//@ chunk-b0a246e7.js:21249-21492 placement
function commentsUnavailable(status, extra = {}) {
  return {
    err: `comments are not available on this artifact right now (the comments service answered HTTP ${status})`,
    unavailable: true,
    status,
    ...(extra.retryable && {
      retryable: true,
    }),
    ...(extra.retryAfterMs !== undefined && {
      retryAfterMs: extra.retryAfterMs,
    }),
  };
}
//@ chunk-b0a246e7.js:21492-21759 placement
async function fetchCommentsWithRetry(slug, signal, featureName, credentials, withNames) {
  let comments = await fetchComments(slug, signal, featureName, credentials, withNames);
  if (comments.kind === "done") return comments.result;
  await sleep(readRetryJitter(), signal);
  if (signal.aborted) throw new AbortError();
  let comments_2 = await fetchComments(slug, signal, featureName, credentials, withNames);
  if (comments_2.kind === "done") {
    if (comments_2.result.err === null) logFeatureSad(featureName, "server_read_retried", comments.miss);
    return comments_2.result;
  }
  return comments_2.fail();
}
//@ chunk-b0a246e7.js:21759-23031 placement
/**
 * 读取 artifact 的评论线程（tengu_onyx_sluice 开关），处理中继/直连、重试与权限探测。
 */
async function readArtifactComments(
  artifactId,
  signal,
  credentials,
  featureName = "artifact_comments_read",
  { skipBootProbe = false, probeToolUseId, withNames = false } = {},
) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_onyx_sluice", false)) {
    logFeatureSad(featureName, "cp_read_disabled");
    return {
      err: "comments are not available on this artifact right now",
      unavailable: true,
    };
  }
  let version;
  let isExternal = false;
  let error;
  if (!skipBootProbe) {
    let artifactBootWithProbe = await fetchArtifactBootWithProbe(artifactId, featureName, signal, {
      credentials,
      probeToolUseId,
    });
    if (artifactBootWithProbe.err !== null) {
      let retryable =
        artifactBootWithProbe.errorCode === "boot_request_error" ||
        (artifactBootWithProbe.errorCode === "boot_relay_error" &&
          artifactBootWithProbe.status === undefined) ||
        (artifactBootWithProbe.status !== undefined &&
          (artifactBootWithProbe.status >= 500 || artifactBootWithProbe.status === 429));
      return {
        err: artifactBootWithProbe.err,
        ...(retryable && {
          retryable: true,
        }),
      };
    }
    if (artifactBootWithProbe.assetToken === undefined)
      return {
        err: "comments are not readable on a public artifact serve",
      };
    isExternal = artifactBootWithProbe.data.mode === "external";
    let shareEntry = getShareEntry(artifactId.slug);
    let ready =
      (Array.isArray(artifactBootWithProbe.data.docs) && artifactBootWithProbe.data.docs.length > 0) ||
      (shareEntry?.livePaths?.length ?? 0) > 0;
    if (
      artifactBootWithProbe.data.artifactKind !== LIVE_DOC &&
      shareEntry?.artifactKind !== LIVE_DOC &&
      artifactBootWithProbe.data.headSeq === undefined &&
      !ready
    )
      version = artifactBootWithProbe.ver;
    error =
      artifactBootWithProbe.data.authoredByOthers === true ||
      shareEntry?.authoredByOthers === true ||
      isMeaningfulFlag(artifactBootWithProbe.data.outsidersMayHaveWritten) ||
      shareEntry?.outsidersMayHaveWritten === true ||
      artifactBootWithProbe.data.perm?.role !== "owner" ||
      artifactBootWithProbe.data.cowritten === true ||
      shareEntry?.cowritten === true ||
      typeLockedFor(artifactId.slug, artifactBootWithProbe.data.type) ||
      mayBeShared(
        artifactBootWithProbe.data.perm?.role === "owner",
        triState(artifactBootWithProbe.data.outsideWriter),
        shareEntry?.outsideWriter,
      ) ||
      version === undefined;
  }
  let commentsWithRetry = await fetchCommentsWithRetry(
    artifactId.slug,
    signal,
    featureName,
    credentials,
    withNames,
  );
  return commentsWithRetry.err === null
    ? {
        ...commentsWithRetry,
        ...(version !== undefined && {
          ver: version,
        }),
        ...(isExternal && {
          external: true,
        }),
        ...(error !== undefined && {
          pageForeign: error,
        }),
      }
    : commentsWithRetry;
}
export { MAX_COMMENT_THREADS, readArtifactComments };
