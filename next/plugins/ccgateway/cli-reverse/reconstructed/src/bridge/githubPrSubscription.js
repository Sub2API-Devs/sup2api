/**
 * bridge/githubPrSubscription.ts
 *
 * 2.1.316 新增：云会话订阅 GitHub PR 事件（/v1/code/github/<repo>/subscribe-pull-request）与项目文件写入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q13e45p8.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { objectSchema, array, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-q13e45p8.js:565-639 placement
/**
 * GitHub 相关常量：API 版本 "2023-06-01" 与 GitHub App 安装地址 https://github.com/apps/claude/installations/new。
 */
var GITHUB_API_VERSION = "2023-06-01";
var GITHUB_APP_INSTALL_URL = "https://github.com/apps/claude/installations/new";
//@ chunk-q13e45p8.js:639-808 placement
/**
 * 从响应体（或其 error 字段）取 reason 字符串。
 */
function getErrorReason(body) {
  if (!body || typeof body !== "object") return;
  let error = "error" in body ? body.error : body;
  if (error && typeof error === "object" && "reason" in error && typeof error.reason === "string")
    return error.reason;
  return;
}
//@ chunk-q13e45p8.js:808-836 placement (2.1.88 match: CCR_BYOC_BETA_HEADER, 1)
var CCR_BYOC_BETA_HEADER = "ccr-byoc-2025-07-29";
//@ chunk-q13e45p8.js:836-1862 placement
/**
 * 订阅/取消订阅 PR（未安装 GitHub App 时给出安装链接）。
 */
async function subscribeGithubPullRequest(action, options) {
  let { sessionId, repo, prNumber, baseUrl, getAccessToken, getTrustedDeviceToken, onUnauthorized } = options;
  let eventName = prSubscriptionEventName(action);
  let accessToken = getAccessToken();
  if (!accessToken) {
    logForDebugging(`[bridge] No access token for ${action}-pr`);
    logFeatureBad(eventName, "no_token");
    return {
      ok: false,
      reason: "no_token",
    };
  }
  let url = `${baseUrl}/v1/code/github/${action}-pull-request`;
  let body = {
    session_id: toCompatSessionId(sessionId),
    repo,
    pr_number: prNumber,
  };
  let response;
  try {
    response = await axios_default.post(url, body, {
      headers: buildAuthHeaders(accessToken, {
        trustedDeviceToken: await getTrustedDeviceToken?.(),
      }),
      timeout: 1e4,
      validateStatus: (status) => status < 500,
      skipSessionsBearerReport: true,
    });
  } catch (error) {
    logForDebugging(`[bridge] ${action}-pr request failed: ${errorMessage(error)}`);
    logFeatureBad(eventName, "request_failed");
    return {
      ok: false,
      reason: "request_failed",
    };
  }
  if (!((response.status >= 200 && response.status < 300) || response.status === 409)) {
    let errorReason = getErrorReason(response.data);
    if (response.status === 401 && !errorReason?.startsWith("github_")) {
      if (!lacksAuthorizationHeader(response.config))
        onUnauthorized?.(bearerOf(response.config?.headers?.get?.("Authorization")) ?? accessToken).catch(
          () => {},
        );
    }
    let errorDetail = extractErrorDetail(response.data);
    logForDebugging(
      `[bridge] ${action}-pr failed ${response.status}${errorReason ? ` [${errorReason}]` : ""}${errorDetail ? `: ${errorDetail}` : ""}`,
    );
    logFeatureBad(eventName, errorReason === "github_app_not_installed" ? errorReason : "http_error");
    return {
      ok: false,
      reason: errorReason,
      detail: extractPlainErrorDetail(response.data),
    };
  }
  logForDebugging(`[bridge] ${action}-pr ${repo}#${prNumber} ok`);
  logFeatureOk(eventName);
  return {
    ok: true,
  };
}
//@ chunk-q13e45p8.js:1862-1947 placement
/**
 * 把订阅动作映射成埋点事件名：subscribe → bridge_pr_subscribe，其余 → bridge_pr_unsubscribe。
 */
function prSubscriptionEventName(action) {
  return action === "subscribe" ? "bridge_pr_subscribe" : "bridge_pr_unsubscribe";
}
//@ chunk-q13e45p8.js:1947-2255 placement
function buildAuthHeaders(accessToken, { orgUUID, trustedDeviceToken } = {}) {
  let headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": GITHUB_API_VERSION,
    "anthropic-beta": CCR_BYOC_BETA_HEADER,
    "anthropic-client-platform": getClientPlatform(),
    "User-Agent": claudeCodeUserAgent(),
  };
  if (orgUUID !== undefined) headers["x-organization-uuid"] = orgUUID;
  if (trustedDeviceToken !== undefined) headers["X-Trusted-Device-Token"] = trustedDeviceToken;
  return headers;
}
//@ chunk-q13e45p8.js:2255-2291 placement
/**
 * 云会话回报"已创建 PR"的 worker 接口路径 /worker/record-created-pr。
 */
var RECORD_CREATED_PR_PATH = "/worker/record-created-pr";
//@ chunk-q13e45p8.js:2291-2727 placement
async function buildJsonHeaders(options) {
  let url = `${options.sessionUrl.replace(/\/+$/, "")}${RECORD_CREATED_PR_PATH}`;
  try {
    return {
      ok: true,
      status: (
        await axios_default.post(
          url,
          {
            owner: options.owner,
            repo: options.repo,
            pr_number: options.prNumber,
            head_ref: options.headRef,
          },
          {
            headers: {
              Authorization: `Bearer ${options.workerToken}`,
              "Content-Type": "application/json",
              "anthropic-version": GITHUB_API_VERSION,
              "anthropic-client-platform": getClientPlatform(),
              "User-Agent": claudeCodeUserAgent(),
            },
            timeout: options.timeoutMs,
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
//@ chunk-q13e45p8.js:2727-2830 placement
var projectFileWriteResultSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CHANNEL_ID_RE;
deferInit("chunk-q13e45p8.js:2727", () => {
  projectFileWriteResultSchema = DoctorLazy(() =>
    objectSchema({
      results: array(
        objectSchema({
          path: stringSchema(),
          error_reason: stringSchema().optional(),
        }),
      ),
    }),
  );
  CHANNEL_ID_RE = /^chan_[A-Za-z0-9_-]{1,120}$/;
});
//@ chunk-q13e45p8.js:2830-4169 placement
async function writeProjectFiles(options) {
  let { door, items, signal } = options;
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
  let url = `${door.apiBaseUrl}/v1/code/sessions/${encodeURIComponent(door.sessionId)}/worker/channels/${encodeURIComponent(door.channelId)}/files:write`;
  let body = {
    session_id: door.sessionId,
    channel_id: door.channelId,
    worker_epoch: door.getWorkerEpoch(),
    files: items.map((item) => ({
      path: item.path,
      content: item.content.toString("base64"),
    })),
  };
  let response;
  try {
    response = await axios_default.post(url, body, {
      headers: buildAuthHeaders(bearerToken),
      timeout: 90000,
      maxBodyLength: 1 / 0,
      signal,
      validateStatus: (status) => status < 500,
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
  if (response.status !== 200) {
    let errorReason = getErrorReason(response.data);
    logForDebugging(
      `[bridge] project files write refused: status=${response.status}${errorReason ? ` [${errorReason}]` : ""}`,
    );
    logFeatureBad("bridge_project_files_write", "http_error");
    return {
      ok: false,
      reason: "http_error",
      status: response.status,
      code: errorReason,
    };
  }
  let parsed = projectFileWriteResultSchema().safeParse(response.data);
  if (!parsed.success) {
    logFeatureBad("bridge_project_files_write", "bad_response");
    return {
      ok: false,
      reason: "bad_response",
    };
  }
  logFeatureOk("bridge_project_files_write");
  return {
    ok: true,
    results: parsed.data.results,
  };
}
export {
  writeProjectFiles,
  buildAuthHeaders,
  getErrorReason,
  subscribeGithubPullRequest,
  buildJsonHeaders,
  GITHUB_APP_INSTALL_URL,
  prSubscriptionEventName,
  RECORD_CREATED_PR_PATH,
};
