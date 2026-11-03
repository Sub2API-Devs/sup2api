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
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { errorMessage, classifyAxiosError } from "../utils/errors.js";
import { lacksAuthorizationHeader, bearerOf } from "../services/oauth/sessionsBearerHooks.js";
import { extractErrorDetail, extractPlainErrorDetail } from "./debugUtils.js";
import { getClientPlatform, claudeCodeUserAgent } from "../utils/http.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, array, string } from "../../vendor/zod/v4/classic/schemas.js";

//@ chunk-sdydyf7y.js:565-639 placement
/**
 * GitHub 相关常量：API 版本 "2023-06-01" 与 GitHub App 安装地址 https://github.com/apps/claude/installations/new。
 */
var GITHUB_API_VERSION = "2023-06-01";
var GITHUB_APP_INSTALL_URL = "https://github.com/apps/claude/installations/new";
//@ chunk-sdydyf7y.js:639-808 placement
/**
 * 从响应体（或其 error 字段）取 reason 字符串。
 */
function getErrorReason(e) {
  if (!e || typeof e !== "object") return;
  let r = "error" in e ? e.error : e;
  if (r && typeof r === "object" && "reason" in r && typeof r.reason === "string") return r.reason;
  return;
}
//@ chunk-sdydyf7y.js:808-836 placement = CCR_BYOC_BETA_HEADER (1)
var CCR_BYOC_BETA_HEADER = "ccr-byoc-2025-07-29";
//@ chunk-sdydyf7y.js:836-1862 placement
/**
 * 订阅/取消订阅 PR（未安装 GitHub App 时给出安装链接）。
 */
async function subscribeGithubPullRequest(e, r) {
  let { sessionId, repo, prNumber, baseUrl, getAccessToken, getTrustedDeviceToken, onUnauthorized } = r;
  let s = prSubscriptionEventName(e);
  let accessToken = getAccessToken();
  if (!accessToken) {
    logForDebugging(`[bridge] No access token for ${e}-pr`);
    logFeatureBad(s, "no_token");
    return {
      ok: false,
      reason: "no_token",
    };
  }
  let w = `${baseUrl}/v1/code/github/${e}-pull-request`;
  let P = {
    session_id: toCompatSessionId(sessionId),
    repo,
    pr_number: prNumber,
  };
  let n;
  try {
    n = await axios_default.post(w, P, {
      headers: buildAuthHeaders(accessToken, {
        trustedDeviceToken: await getTrustedDeviceToken?.(),
      }),
      timeout: 1e4,
      validateStatus: (a) => a < 500,
      skipSessionsBearerReport: true,
    });
  } catch (error) {
    logForDebugging(`[bridge] ${e}-pr request failed: ${errorMessage(error)}`);
    logFeatureBad(s, "request_failed");
    return {
      ok: false,
      reason: "request_failed",
    };
  }
  if (!((n.status >= 200 && n.status < 300) || n.status === 409)) {
    let errorReason = getErrorReason(n.data);
    if (n.status === 401 && !errorReason?.startsWith("github_")) {
      if (!lacksAuthorizationHeader(n.config))
        onUnauthorized?.(bearerOf(n.config?.headers?.get?.("Authorization")) ?? accessToken).catch(() => {});
    }
    let errorDetail = extractErrorDetail(n.data);
    logForDebugging(
      `[bridge] ${e}-pr failed ${n.status}${errorReason ? ` [${errorReason}]` : ""}${errorDetail ? `: ${errorDetail}` : ""}`,
    );
    logFeatureBad(s, errorReason === "github_app_not_installed" ? errorReason : "http_error");
    return {
      ok: false,
      reason: errorReason,
      detail: extractPlainErrorDetail(n.data),
    };
  }
  logForDebugging(`[bridge] ${e}-pr ${repo}#${prNumber} ok`);
  logFeatureOk(s);
  return {
    ok: true,
  };
}
//@ chunk-sdydyf7y.js:1862-1947 placement
/**
 * 把订阅动作映射成埋点事件名：subscribe → bridge_pr_subscribe，其余 → bridge_pr_unsubscribe。
 */
function prSubscriptionEventName(e) {
  return e === "subscribe" ? "bridge_pr_subscribe" : "bridge_pr_unsubscribe";
}
//@ chunk-sdydyf7y.js:1947-2255 placement
function buildAuthHeaders(accessToken, { orgUUID: r, trustedDeviceToken: c } = {}) {
  let i = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": GITHUB_API_VERSION,
    "anthropic-beta": CCR_BYOC_BETA_HEADER,
    "anthropic-client-platform": getClientPlatform(),
    "User-Agent": claudeCodeUserAgent(),
  };
  if (r !== undefined) i["x-organization-uuid"] = r;
  if (c !== undefined) i["X-Trusted-Device-Token"] = c;
  return i;
}
//@ chunk-sdydyf7y.js:2255-2291 placement
/**
 * 云会话回报"已创建 PR"的 worker 接口路径 /worker/record-created-pr。
 */
var RECORD_CREATED_PR_PATH = "/worker/record-created-pr";
//@ chunk-sdydyf7y.js:2291-2727 placement
async function buildJsonHeaders(e) {
  let r = `${e.sessionUrl.replace(/\/+$/, "")}${RECORD_CREATED_PR_PATH}`;
  try {
    return {
      ok: true,
      status: (
        await axios_default.post(
          r,
          {
            owner: e.owner,
            repo: e.repo,
            pr_number: e.prNumber,
            head_ref: e.headRef,
          },
          {
            headers: {
              Authorization: `Bearer ${e.workerToken}`,
              "Content-Type": "application/json",
              "anthropic-version": GITHUB_API_VERSION,
              "anthropic-client-platform": getClientPlatform(),
              "User-Agent": claudeCodeUserAgent(),
            },
            timeout: e.timeoutMs,
          },
        )
      ).status,
    };
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    return {
      ok: false,
      kind,
      status,
    };
  }
}
//@ chunk-sdydyf7y.js:2727-2830 placement
var projectFileWriteResultSchema = DoctorLazy(() =>
  u({
    results: array(
      u({
        path: string(),
        error_reason: string().optional(),
      }),
    ),
  }),
);
var CHANNEL_ID_RE = /^chan_[A-Za-z0-9_-]{1,120}$/;
//@ chunk-sdydyf7y.js:2830-4169 placement
async function writeProjectFiles(e) {
  let { door, items, signal } = e;
  if (!CHANNEL_ID_RE.test(door.channelId)) {
    logFeatureBad("bridge_project_files_write", "invalid_channel");
    return {
      ok: false,
      reason: "invalid_channel",
    };
  }
  let bearerToken = door.getBearerToken();
  if (!bearerToken) {
    logFeatureBad("bridge_project_files_write", "no_token");
    return {
      ok: false,
      reason: "no_token",
    };
  }
  let b = `${door.apiBaseUrl}/v1/code/sessions/${encodeURIComponent(door.sessionId)}/worker/channels/${encodeURIComponent(door.channelId)}/files:write`;
  let k = {
    session_id: door.sessionId,
    channel_id: door.channelId,
    worker_epoch: door.getWorkerEpoch(),
    files: items.map((item) => ({
      path: item.path,
      content: item.content.toString("base64"),
    })),
  };
  let l;
  try {
    l = await axios_default.post(b, k, {
      headers: buildAuthHeaders(bearerToken),
      timeout: 90000,
      maxBodyLength: 1 / 0,
      signal,
      validateStatus: (s) => s < 500,
    });
  } catch (error) {
    if (axios_default.isCancel(error)) {
      logFeatureBad("bridge_project_files_write", "aborted");
      return {
        ok: false,
        reason: "aborted",
      };
    }
    logForDebugging(`[bridge] project files write request failed: ${errorMessage(error)}`);
    logFeatureBad("bridge_project_files_write", "request_failed");
    return {
      ok: false,
      reason: "request_failed",
    };
  }
  if (l.status !== 200) {
    let errorReason = getErrorReason(l.data);
    logForDebugging(
      `[bridge] project files write refused: status=${l.status}${errorReason ? ` [${errorReason}]` : ""}`,
    );
    logFeatureBad("bridge_project_files_write", "http_error");
    return {
      ok: false,
      reason: "http_error",
      status: l.status,
      code: errorReason,
    };
  }
  let _ = projectFileWriteResultSchema().safeParse(l.data);
  if (!_.success) {
    logFeatureBad("bridge_project_files_write", "bad_response");
    return {
      ok: false,
      reason: "bad_response",
    };
  }
  logFeatureOk("bridge_project_files_write");
  return {
    ok: true,
    results: _.data.results,
  };
}
export {
  GITHUB_APP_INSTALL_URL,
  subscribeGithubPullRequest,
  buildJsonHeaders,
  writeProjectFiles,
  RECORD_CREATED_PR_PATH,
  getErrorReason,
  buildAuthHeaders,
  prSubscriptionEventName,
};
