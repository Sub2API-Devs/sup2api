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
import { errorMessage, W, St } from "./commentReply.js";
import { logFeatureSad, logFeatureBad } from "../../analytics/featureTelemetry.js";
import { parseCommentThreads, isCommentId, cleanAnchorText } from "./commentFormatting.js";
import { parseRetryAfterMs } from "../../../bridge/debugUtils.js";
import { commentsAuthContext, rememberPrincipalTokens } from "./commentAuthorship.js";
import { frameApi } from "../frameRelay.js";
import { buildFrameHeaders, getTransportErrorProps } from "../frameApi.js";
import { _0o } from "../frameComments.js";
import { isCancel } from "../../../../vendor/axios/dist/esm/axios.js";
import { describeArtifactAuthFailure } from "../frameFlags.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { sleep } from "../../../utils/sleep.js";
import { AbortError } from "../../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../analytics/growthbook.js";
import { fetchArtifactBootWithProbe } from "../boot.js";
import { getShareEntry, typeLockedFor, mayBeShared, triState } from "../shareEntries.js";
import { LIVE_DOC, aK } from "../textSanitize.js";

//@ chunk-b0a246e7.js:18315-18765 placement
function classifyCommentsReadError(e, t) {
  if (e.status === 403 && errorMessage(e.data).includes(W))
    return (logFeatureSad(t, "service_key_credential"), { err: St, unavailable: !0 });
  if (e.status < 200 || e.status >= 300)
    return (logFeatureSad(t, "server_read_unavailable", { status: e.status }), commentsUnavailable(e.status));
  let n = parseCommentThreads(e.data, t);
  if (n === null)
    return (logFeatureBad(t, "malformed_body"), { err: "comments fetch failed (unexpected response)" });
  return {
    err: null,
    threads: n.threads,
    ...(n.threadsDegraded && { threadsDegraded: !0 }),
    ...(n.threadsDropped && { threadsDropped: !0 }),
  };
}
//@ chunk-b0a246e7.js:18765-18800 placement
var Rt = { min: 300, max: 800 },
  bt = 120000;
//@ chunk-b0a246e7.js:18800-18929 placement
function getRetryAfterCap(e, t) {
  if (e !== 429 && e !== 503) return;
  let n = parseRetryAfterMs(typeof t === "string" ? t : void 0);
  return n === void 0 || n <= 0 ? void 0 : Math.min(n, bt);
}
//@ chunk-b0a246e7.js:18929-19006 placement
function Et() {
  let { min: min, max: max } = Rt;
  return min + Math.floor(Math.random() * (max - min + 1));
}
//@ chunk-b0a246e7.js:19006-20935 placement
async function fetchComments(e, t, n, r, o) {
  let u = await commentsAuthContext(r),
    startTime = performance.now(),
    a;
  try {
    a = await frameApi.getRelayBound(`/api/frame/comments/${encodeURIComponent(e)}${o ? "?names=1" : ""}`, {
      refreshOAuth: !0,
      credentials: r,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: _0o,
      signal: t,
      reportSentAuth: !0,
    });
  } catch (error) {
    if (isCancel(error)) throw error;
    let A = getTransportErrorProps(error, startTime),
      h = () => (
        logFeatureBad(n, "server_read_request_error", A),
        A.transport
          ? { err: "comments fetch failed (network error)", retryable: !0 }
          : { err: "comments fetch failed (the response could not be read)" }
      );
    return A.transport ? { kind: "retryable", miss: A, fail: h } : { kind: "done", result: h() };
  }
  if (!a.ok) {
    if (a.reason === "relay-unavailable") {
      let { status: status } = a;
      logFeatureBad(n, "server_read_relay_unavailable", { status: status });
      let A = status === 0 || status === 429 || status >= 500;
      return {
        kind: "done",
        result: {
          err: `comments fetch failed (this session's comment connection did not carry the read${status !== 0 ? `, HTTP ${status}` : ""}; nothing was read) \u2014 retry once; if it fails again, tell the user comments cannot be read from this session right now`,
          ...(A && { retryable: !0 }),
        },
      };
    }
    return (
      logFeatureBad(n, a.reason.replace(/-/g, "_")),
      {
        kind: "done",
        result: {
          err:
            a.reason === "no-auth"
              ? describeArtifactAuthFailure(a.detail)
              : `comments read unavailable: ${a.reason}`,
        },
      }
    );
  }
  if (!a.fromFrame) {
    let { status: status } = a,
      A = status >= 500 || status === 499,
      h = () => (
        logFeatureBad(n, "server_read_relay_error", { status: status }),
        {
          err: `comments fetch failed (relay HTTP ${status})`,
          ...((A || status === 429) && { retryable: !0 }),
        }
      );
    return A ? { kind: "retryable", miss: { relay_status: status }, fail: h } : { kind: "done", result: h() };
  }
  if (a.status >= 500 || a.status === 429) {
    let { status: status } = a,
      A = getRetryAfterCap(status, a.response?.headers?.["retry-after"]),
      h = status === 429 || A !== void 0,
      s = () => {
        if (h) logFeatureSad(n, "server_read_unavailable", { status: status });
        else logFeatureBad(n, "server_read_unavailable", { status: status });
        return commentsUnavailable(status, { retryable: !0, retryAfterMs: A });
      };
    return status === 503 || h
      ? { kind: "done", result: s() }
      : { kind: "retryable", miss: { status: status }, fail: s };
  }
  let d = classifyCommentsReadError(a, n);
  if (d.err === null) {
    rememberPrincipalTokens(wt(a.data), u, a.sentAuthFingerprint, a.route);
    let l = o ? parseCommentAnchorNames(a.data) : void 0;
    if (l !== void 0) return { kind: "done", result: { ...d, names: l } };
  }
  return { kind: "done", result: d };
}
//@ chunk-b0a246e7.js:20935-21017 placement
function wt(e) {
  return typeof e === "object" && e !== null && "viewer" in e ? e.viewer : void 0;
}
//@ chunk-b0a246e7.js:21017-21028 placement
var MAX_COMMENT_THREADS = 64;
//@ chunk-b0a246e7.js:21028-21249 placement
function parseCommentAnchorNames(e) {
  if (!isPlainObject(e) || !isPlainObject(e.names)) return;
  let t = [];
  for (let [n, r] of Object.entries(e.names)) {
    let o = isCommentId(n) ? cleanAnchorText(r) : void 0;
    if (o !== void 0) {
      if ((t.push([n, o]), t.length === MAX_COMMENT_THREADS)) break;
    }
  }
  return t.length > 0 ? Object.fromEntries(t) : void 0;
}
//@ chunk-b0a246e7.js:21249-21492 placement
function commentsUnavailable(e, t = {}) {
  return {
    err: `comments are not available on this artifact right now (the comments service answered HTTP ${e})`,
    unavailable: !0,
    status: e,
    ...(t.retryable && { retryable: !0 }),
    ...(t.retryAfterMs !== void 0 && { retryAfterMs: t.retryAfterMs }),
  };
}
//@ chunk-b0a246e7.js:21492-21759 placement
async function fetchCommentsWithRetry(e, t, n, r, o) {
  let u = await fetchComments(e, t, n, r, o);
  if (u.kind === "done") return u.result;
  if ((await sleep(Et(), t), t.aborted)) throw new AbortError();
  let c = await fetchComments(e, t, n, r, o);
  if (c.kind === "done") {
    if (c.result.err === null) logFeatureSad(n, "server_read_retried", u.miss);
    return c.result;
  }
  return c.fail();
}
/**
 * 读取 artifact 的评论线程（tengu_onyx_sluice 开关），处理中继/直连、重试与权限探测。
 */
//@ chunk-b0a246e7.js:21759-23031 placement
async function readArtifactComments(
  e,
  t,
  n,
  r = "artifact_comments_read",
  { skipBootProbe: o = !1, probeToolUseId: u, withNames: c = !1 } = {},
) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_onyx_sluice", !1))
    return (
      logFeatureSad(r, "cp_read_disabled"),
      { err: "comments are not available on this artifact right now", unavailable: !0 }
    );
  let a,
    d = !1,
    l;
  if (!o) {
    let h = await fetchArtifactBootWithProbe(e, r, t, { credentials: n, probeToolUseId: u });
    if (h.err !== null) {
      let E =
        h.errorCode === "boot_request_error" ||
        (h.errorCode === "boot_relay_error" && h.status === void 0) ||
        (h.status !== void 0 && (h.status >= 500 || h.status === 429));
      return { err: h.err, ...(E && { retryable: !0 }) };
    }
    if (h.assetToken === void 0) return { err: "comments are not readable on a public artifact serve" };
    d = h.data.mode === "external";
    let s = getShareEntry(e.slug),
      x = (Array.isArray(h.data.docs) && h.data.docs.length > 0) || (s?.livePaths?.length ?? 0) > 0;
    if (h.data.artifactKind !== LIVE_DOC && s?.artifactKind !== LIVE_DOC && h.data.headSeq === void 0 && !x)
      a = h.ver;
    l =
      h.data.authoredByOthers === !0 ||
      s?.authoredByOthers === !0 ||
      aK(h.data.outsidersMayHaveWritten) ||
      s?.outsidersMayHaveWritten === !0 ||
      h.data.perm?.role !== "owner" ||
      h.data.cowritten === !0 ||
      s?.cowritten === !0 ||
      typeLockedFor(e.slug, h.data.type) ||
      mayBeShared(h.data.perm?.role === "owner", triState(h.data.outsideWriter), s?.outsideWriter) ||
      a === void 0;
  }
  let A = await fetchCommentsWithRetry(e.slug, t, r, n, c);
  return A.err === null
    ? {
        ...A,
        ...(a !== void 0 && { ver: a }),
        ...(d && { external: !0 }),
        ...(l !== void 0 && { pageForeign: l }),
      }
    : A;
}

export { MAX_COMMENT_THREADS, readArtifactComments };
