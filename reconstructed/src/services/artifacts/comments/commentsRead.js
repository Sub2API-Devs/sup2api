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
function classifyCommentsReadError(e, t) {
  if (e.status === 403 && errorMessage(e.data).includes(NO_USER_CREDENTIAL_TEXT)) {
    logFeatureSad(t, "service_key_credential");
    return {
      err: ORG_SERVICE_KEY_READ_TEXT,
      unavailable: true,
    };
  }
  if (e.status < 200 || e.status >= 300) {
    logFeatureSad(t, "server_read_unavailable", {
      status: e.status,
    });
    return commentsUnavailable(e.status);
  }
  let commentThreads = parseCommentThreads(e.data, t);
  if (commentThreads === null) {
    logFeatureBad(t, "malformed_body");
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
function getRetryAfterCap(status, t) {
  if (status !== 429 && status !== 503) return;
  let retryAfterMs = parseRetryAfterMs(typeof t === "string" ? t : undefined);
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
async function fetchComments(e, signal, n, r, o) {
  let u = await commentsAuthContext(r);
  let startTime = performance.now();
  let a;
  try {
    a = await frameApi.getRelayBound(`/api/frame/comments/${encodeURIComponent(e)}${o ? "?names=1" : ""}`, {
      refreshOAuth: true,
      credentials: r,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: MAX_FRAME_HTML_BYTES,
      signal,
      reportSentAuth: true,
    });
  } catch (error) {
    if (isCancel(error)) throw error;
    let transportErrorProps = getTransportErrorProps(error, startTime);
    let h = () => {
      logFeatureBad(n, "server_read_request_error", transportErrorProps);
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
          fail: h,
        }
      : {
          kind: "done",
          result: h(),
        };
  }
  if (!a.ok) {
    if (a.reason === "relay-unavailable") {
      let { status } = a;
      logFeatureBad(n, "server_read_relay_unavailable", {
        status,
      });
      let A = status === 0 || status === 429 || status >= 500;
      return {
        kind: "done",
        result: {
          err: `comments fetch failed (this session's comment connection did not carry the read${status !== 0 ? `, HTTP ${status}` : ""}; nothing was read) \u2014 retry once; if it fails again, tell the user comments cannot be read from this session right now`,
          ...(A && {
            retryable: true,
          }),
        },
      };
    }
    logFeatureBad(n, a.reason.replace(/-/g, "_"));
    return {
      kind: "done",
      result: {
        err:
          a.reason === "no-auth"
            ? describeArtifactAuthFailure(a.detail)
            : `comments read unavailable: ${a.reason}`,
      },
    };
  }
  if (!a.fromFrame) {
    let { status } = a;
    let A = status >= 500 || status === 499;
    let h = () => {
      logFeatureBad(n, "server_read_relay_error", {
        status,
      });
      return {
        err: `comments fetch failed (relay HTTP ${status})`,
        ...((A || status === 429) && {
          retryable: true,
        }),
      };
    };
    return A
      ? {
          kind: "retryable",
          miss: {
            relay_status: status,
          },
          fail: h,
        }
      : {
          kind: "done",
          result: h(),
        };
  }
  if (a.status >= 500 || a.status === 429) {
    let { status } = a;
    let retryAfterCap = getRetryAfterCap(status, a.response?.headers?.["retry-after"]);
    let h = status === 429 || retryAfterCap !== undefined;
    let s = () => {
      if (h)
        logFeatureSad(n, "server_read_unavailable", {
          status,
        });
      else
        logFeatureBad(n, "server_read_unavailable", {
          status,
        });
      return commentsUnavailable(status, {
        retryable: true,
        retryAfterMs: retryAfterCap,
      });
    };
    return status === 503 || h
      ? {
          kind: "done",
          result: s(),
        }
      : {
          kind: "retryable",
          miss: {
            status,
          },
          fail: s,
        };
  }
  let d = classifyCommentsReadError(a, n);
  if (d.err === null) {
    rememberPrincipalTokens(viewerFromResponse(a.data), u, a.sentAuthFingerprint, a.route);
    let l = o ? parseCommentAnchorNames(a.data) : undefined;
    if (l !== undefined)
      return {
        kind: "done",
        result: {
          ...d,
          names: l,
        },
      };
  }
  return {
    kind: "done",
    result: d,
  };
}
//@ chunk-b0a246e7.js:20935-21017 placement
function viewerFromResponse(e) {
  return typeof e === "object" && e !== null && "viewer" in e ? e.viewer : undefined;
}
//@ chunk-b0a246e7.js:21017-21028 placement
var MAX_COMMENT_THREADS = 64;
//@ chunk-b0a246e7.js:21028-21249 placement
function parseCommentAnchorNames(e) {
  if (!isPlainObject(e) || !isPlainObject(e.names)) return;
  let t = [];
  for (let [key, value] of Object.entries(e.names)) {
    let o = isCommentId(key) ? cleanAnchorText(value) : undefined;
    if (o !== undefined) {
      t.push([key, o]);
      if (t.length === MAX_COMMENT_THREADS) break;
    }
  }
  return t.length > 0 ? Object.fromEntries(t) : undefined;
}
//@ chunk-b0a246e7.js:21249-21492 placement
function commentsUnavailable(status, t = {}) {
  return {
    err: `comments are not available on this artifact right now (the comments service answered HTTP ${status})`,
    unavailable: true,
    status,
    ...(t.retryable && {
      retryable: true,
    }),
    ...(t.retryAfterMs !== undefined && {
      retryAfterMs: t.retryAfterMs,
    }),
  };
}
//@ chunk-b0a246e7.js:21492-21759 placement
async function fetchCommentsWithRetry(slug, signal, n, r, o) {
  let comments = await fetchComments(slug, signal, n, r, o);
  if (comments.kind === "done") return comments.result;
  await sleep(readRetryJitter(), signal);
  if (signal.aborted) throw new AbortError();
  let comments_2 = await fetchComments(slug, signal, n, r, o);
  if (comments_2.kind === "done") {
    if (comments_2.result.err === null) logFeatureSad(n, "server_read_retried", comments.miss);
    return comments_2.result;
  }
  return comments_2.fail();
}
//@ chunk-b0a246e7.js:21759-23031 placement
/**
 * 读取 artifact 的评论线程（tengu_onyx_sluice 开关），处理中继/直连、重试与权限探测。
 */
async function readArtifactComments(
  e,
  signal,
  credentials,
  r = "artifact_comments_read",
  { skipBootProbe: o = false, probeToolUseId: u, withNames: c = false } = {},
) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_onyx_sluice", false)) {
    logFeatureSad(r, "cp_read_disabled");
    return {
      err: "comments are not available on this artifact right now",
      unavailable: true,
    };
  }
  let a;
  let d = false;
  let l;
  if (!o) {
    let artifactBootWithProbe = await fetchArtifactBootWithProbe(e, r, signal, {
      credentials,
      probeToolUseId: u,
    });
    if (artifactBootWithProbe.err !== null) {
      let E =
        artifactBootWithProbe.errorCode === "boot_request_error" ||
        (artifactBootWithProbe.errorCode === "boot_relay_error" &&
          artifactBootWithProbe.status === undefined) ||
        (artifactBootWithProbe.status !== undefined &&
          (artifactBootWithProbe.status >= 500 || artifactBootWithProbe.status === 429));
      return {
        err: artifactBootWithProbe.err,
        ...(E && {
          retryable: true,
        }),
      };
    }
    if (artifactBootWithProbe.assetToken === undefined)
      return {
        err: "comments are not readable on a public artifact serve",
      };
    d = artifactBootWithProbe.data.mode === "external";
    let shareEntry = getShareEntry(e.slug);
    let x =
      (Array.isArray(artifactBootWithProbe.data.docs) && artifactBootWithProbe.data.docs.length > 0) ||
      (shareEntry?.livePaths?.length ?? 0) > 0;
    if (
      artifactBootWithProbe.data.artifactKind !== LIVE_DOC &&
      shareEntry?.artifactKind !== LIVE_DOC &&
      artifactBootWithProbe.data.headSeq === undefined &&
      !x
    )
      a = artifactBootWithProbe.ver;
    l =
      artifactBootWithProbe.data.authoredByOthers === true ||
      shareEntry?.authoredByOthers === true ||
      isMeaningfulFlag(artifactBootWithProbe.data.outsidersMayHaveWritten) ||
      shareEntry?.outsidersMayHaveWritten === true ||
      artifactBootWithProbe.data.perm?.role !== "owner" ||
      artifactBootWithProbe.data.cowritten === true ||
      shareEntry?.cowritten === true ||
      typeLockedFor(e.slug, artifactBootWithProbe.data.type) ||
      mayBeShared(
        artifactBootWithProbe.data.perm?.role === "owner",
        triState(artifactBootWithProbe.data.outsideWriter),
        shareEntry?.outsideWriter,
      ) ||
      a === undefined;
  }
  let commentsWithRetry = await fetchCommentsWithRetry(e.slug, signal, r, credentials, c);
  return commentsWithRetry.err === null
    ? {
        ...commentsWithRetry,
        ...(a !== undefined && {
          ver: a,
        }),
        ...(d && {
          external: true,
        }),
        ...(l !== undefined && {
          pageForeign: l,
        }),
      }
    : commentsWithRetry;
}
export { MAX_COMMENT_THREADS, readArtifactComments };
