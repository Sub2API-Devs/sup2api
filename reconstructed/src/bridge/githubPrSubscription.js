/**
 * bridge/githubPrSubscription.ts
 *
 * 2.1.316 新增：云会话订阅 GitHub PR 事件（/v1/code/github/<repo>/subscribe-pull-request）与项目文件写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sdydyf7y.js (10)
 * attribution: placement 10
 */
import { logForDebugging } from "../utils/debug.js";
import { logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { toCompatSessionId } from "./sessionIdCompat.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";
import { errorMessage, classifyAxiosError } from "../utils/errors.js";
import { lacksAuthorizationHeader, bearerOf } from "../services/oauth/sessionsBearerHooks.js";
import { extractErrorDetail, extractPlainErrorDetail } from "./debugUtils.js";
import { getClientPlatform, claudeCodeUserAgent } from "../utils/http.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, A, o } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-sdydyf7y.js:565-639 placement
var y = "2023-06-01",
  B4e = "https://github.com/apps/claude/installations/new";
/**
 * 从响应体（或其 error 字段）取 reason 字符串。
 */
//@ chunk-sdydyf7y.js:639-808 placement
function getErrorReason(e) {
  if (!e || typeof e !== "object") return;
  let r = "error" in e ? e.error : e;
  if (r && typeof r === "object" && "reason" in r && typeof r.reason === "string") return r.reason;
  return;
}
//@ chunk-sdydyf7y.js:808-836 placement = CCR_BYOC_BETA_HEADER (1)
var CCR_BYOC_BETA_HEADER = "ccr-byoc-2025-07-29";
/**
 * 订阅/取消订阅 PR（未安装 GitHub App 时给出安装链接）。
 */
//@ chunk-sdydyf7y.js:836-1862 placement
async function subscribeGithubPullRequest(e, r) {
  let {
      sessionId: sessionId,
      repo: repo,
      prNumber: prNumber,
      baseUrl: baseUrl,
      getAccessToken: getAccessToken,
      getTrustedDeviceToken: getTrustedDeviceToken,
      onUnauthorized: onUnauthorized,
    } = r,
    s = tXo(e),
    h = getAccessToken();
  if (!h)
    return (
      logForDebugging(`[bridge] No access token for ${e}-pr`),
      logFeatureBad(s, "no_token"),
      { ok: !1, reason: "no_token" }
    );
  let w = `${baseUrl}/v1/code/github/${e}-pull-request`,
    P = { session_id: toCompatSessionId(sessionId), repo: repo, pr_number: prNumber },
    n;
  try {
    n = await Dt.post(w, P, {
      headers: buildAuthHeaders(h, { trustedDeviceToken: await getTrustedDeviceToken?.() }),
      timeout: 1e4,
      validateStatus: (a) => a < 500,
      skipSessionsBearerReport: !0,
    });
  } catch (error) {
    return (
      logForDebugging(`[bridge] ${e}-pr request failed: ${errorMessage(error)}`),
      logFeatureBad(s, "request_failed"),
      { ok: !1, reason: "request_failed" }
    );
  }
  if (!((n.status >= 200 && n.status < 300) || n.status === 409)) {
    let a = getErrorReason(n.data);
    if (n.status === 401 && !a?.startsWith("github_")) {
      if (!lacksAuthorizationHeader(n.config))
        onUnauthorized?.(bearerOf(n.config?.headers?.get?.("Authorization")) ?? h).catch(() => {});
    }
    let R = extractErrorDetail(n.data);
    return (
      logForDebugging(`[bridge] ${e}-pr failed ${n.status}${a ? ` [${a}]` : ""}${R ? `: ${R}` : ""}`),
      logFeatureBad(s, a === "github_app_not_installed" ? a : "http_error"),
      { ok: !1, reason: a, detail: extractPlainErrorDetail(n.data) }
    );
  }
  return (logForDebugging(`[bridge] ${e}-pr ${repo}#${prNumber} ok`), logFeatureOk(s), { ok: !0 });
}
//@ chunk-sdydyf7y.js:1862-1947 placement
function tXo(e) {
  return e === "subscribe" ? "bridge_pr_subscribe" : "bridge_pr_unsubscribe";
}
//@ chunk-sdydyf7y.js:1947-2255 placement
function buildAuthHeaders(e, { orgUUID: r, trustedDeviceToken: c } = {}) {
  let i = {
    Authorization: `Bearer ${e}`,
    "Content-Type": "application/json",
    "anthropic-version": y,
    "anthropic-beta": CCR_BYOC_BETA_HEADER,
    "anthropic-client-platform": getClientPlatform(),
    "User-Agent": claudeCodeUserAgent(),
  };
  if (r !== void 0) i["x-organization-uuid"] = r;
  if (c !== void 0) i["X-Trusted-Device-Token"] = c;
  return i;
}
//@ chunk-sdydyf7y.js:2255-2291 placement
var nXo = "/worker/record-created-pr";
//@ chunk-sdydyf7y.js:2291-2727 placement
async function buildJsonHeaders(e) {
  let r = `${e.sessionUrl.replace(/\/+$/, "")}${nXo}`;
  try {
    return {
      ok: !0,
      status: (
        await Dt.post(
          r,
          { owner: e.owner, repo: e.repo, pr_number: e.prNumber, head_ref: e.headRef },
          {
            headers: {
              Authorization: `Bearer ${e.workerToken}`,
              "Content-Type": "application/json",
              "anthropic-version": y,
              "anthropic-client-platform": getClientPlatform(),
              "User-Agent": claudeCodeUserAgent(),
            },
            timeout: e.timeoutMs,
          },
        )
      ).status,
    };
  } catch (error) {
    let { kind: kind, status: status } = classifyAxiosError(error);
    return { ok: !1, kind: kind, status: status };
  }
}
//@ chunk-sdydyf7y.js:2727-2830 placement
var projectFileWriteResultSchema = DoctorLazy(() =>
    u({ results: A(u({ path: o(), error_reason: o().optional() })) }),
  ),
  CHANNEL_ID_RE = /^chan_[A-Za-z0-9_-]{1,120}$/;
//@ chunk-sdydyf7y.js:2830-4169 placement
async function writeProjectFiles(e) {
  let { door: door, items: items, signal: signal } = e;
  if (!CHANNEL_ID_RE.test(door.channelId))
    return (
      logFeatureBad("bridge_project_files_write", "invalid_channel"),
      { ok: !1, reason: "invalid_channel" }
    );
  let bearerToken = door.getBearerToken();
  if (!bearerToken)
    return (logFeatureBad("bridge_project_files_write", "no_token"), { ok: !1, reason: "no_token" });
  let b = `${door.apiBaseUrl}/v1/code/sessions/${encodeURIComponent(door.sessionId)}/worker/channels/${encodeURIComponent(door.channelId)}/files:write`,
    k = {
      session_id: door.sessionId,
      channel_id: door.channelId,
      worker_epoch: door.getWorkerEpoch(),
      files: items.map((s) => ({ path: s.path, content: s.content.toString("base64") })),
    },
    l;
  try {
    l = await Dt.post(b, k, {
      headers: buildAuthHeaders(bearerToken),
      timeout: 90000,
      maxBodyLength: 1 / 0,
      signal: signal,
      validateStatus: (s) => s < 500,
    });
  } catch (error) {
    if (Dt.isCancel(error))
      return (logFeatureBad("bridge_project_files_write", "aborted"), { ok: !1, reason: "aborted" });
    return (
      logForDebugging(`[bridge] project files write request failed: ${errorMessage(error)}`),
      logFeatureBad("bridge_project_files_write", "request_failed"),
      { ok: !1, reason: "request_failed" }
    );
  }
  if (l.status !== 200) {
    let s = getErrorReason(l.data);
    return (
      logForDebugging(`[bridge] project files write refused: status=${l.status}${s ? ` [${s}]` : ""}`),
      logFeatureBad("bridge_project_files_write", "http_error"),
      { ok: !1, reason: "http_error", status: l.status, code: s }
    );
  }
  let safeParse = projectFileWriteResultSchema().safeParse(l.data);
  if (!safeParse.success)
    return (logFeatureBad("bridge_project_files_write", "bad_response"), { ok: !1, reason: "bad_response" });
  return (logFeatureOk("bridge_project_files_write"), { ok: !0, results: safeParse.data.results });
}

export {
  B4e,
  subscribeGithubPullRequest,
  buildJsonHeaders,
  writeProjectFiles,
  nXo,
  getErrorReason,
  buildAuthHeaders,
  tXo,
};
