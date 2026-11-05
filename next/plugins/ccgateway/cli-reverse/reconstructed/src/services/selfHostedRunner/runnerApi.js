/**
 * services/selfHostedRunner/runnerApi.ts
 *
 * 2.1.316 新增：调用自托管 runner 管理 API（base URL 变化时重试）；获取 runner 管理用的访问令牌等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n0yckbmr.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { getOauthConfig } from "../../constants/oauth.js";
import {
  checkAndRefreshOAuthTokenIfNeeded,
  getClaudeAIOAuthTokensAsync,
  getClaudeAIOAuthTokens,
  getClaudeAIOAuthTokenOriginAsync,
  isLoginStashedInTokenSlot,
} from "../../utils/auth.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  isStoredLoginRefused,
  storedLoginRefusalReason,
  settleStoredLoginRefusal,
} from "../../utils/auth/storedLoginRefused.js";
import { isOauthTokenFromBgSnapshot } from "../../bootstrap/state.js";
import { StoredLoginHeldBackError } from "../oauth/storedLoginRefusal.js";
import { isLauncherHostLoginRefusedNow } from "../../utils/auth/launcherHostLogin.js";
import { axios_default } from "../../../vendor/axios/dist/esm/axios.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { describeUnparsedInput } from "../../utils/json.js";

//@ chunk-n0yckbmr.js:643-1013 placement
/**
 * 自托管 runner 认证失败的提示。
 */
var RUNNER_AUTH_HINT =
  " \u2014 run `claude login` to refresh your session, or verify ANTHROPIC_BASE_URL matches your login environment";
var API_KEY_HELPER_BLOCKS_LOGIN_TEXT =
  "Self-hosted runner tools need your claude.ai login, and Claude Code didn't send it to the configured API address because your administrator set an API key helper. Ask your administrator to remove the key helper or to use Anthropic's API address.";
//@ chunk-n0yckbmr.js:1013-1120 placement
class SelfHostedRunnerApiError extends Error {
  status;
  constructor(status, message) {
    super(message);
    this.name = "SelfHostedRunnerApiError";
    this.status = status;
  }
}
//@ chunk-n0yckbmr.js:1120-1133 placement
/**
 * 自托管 runner 默认端口。
 */
var DEFAULT_RUNNER_PORT = 8080;
//@ chunk-n0yckbmr.js:1133-1331 placement
function assertFirstPartyRunnerApi() {
  let { getAPIProvider } = require("../../utils/model/providers.js");
  if (getAPIProvider() !== "firstParty")
    throw new SelfHostedRunnerApiError(
      403,
      "Self-hosted runner management is only available on the first-party Anthropic API provider.",
    );
}
//@ chunk-n0yckbmr.js:1331-1532 placement
var NOT_LOGGED_IN_RUNNER_TEXT =
  "Not logged in. Environment-management endpoints require the operator OAuth session \u2014 run `claude login`, then re-invoke this tool. (`ANTHROPIC_API_KEY` will not work for these endpoints.)";
//@ chunk-n0yckbmr.js:1532-1633 placement (2.1.88 match: getBridgeBaseUrl, 1)
/**
 * API 基址：ANTHROPIC_BASE_URL（去尾部 /），否则 OAuth 配置的 BASE_API_URL。
 */
function runnerApiBaseUrl() {
  let replaced = env.ANTHROPIC_BASE_URL?.replace(/\/+$/, "");
  if (replaced) return replaced;
  return getOauthConfig().BASE_API_URL;
}
//@ chunk-n0yckbmr.js:1633-1677 placement
/**
 * 取 OAuth 配置里的 claude.ai 源地址。
 */
function claudeAiOrigin() {
  return getOauthConfig().CLAUDE_AI_ORIGIN;
}
//@ chunk-n0yckbmr.js:1677-2199 placement
/**
 * 获取 runner 管理用的访问令牌。
 */
async function runnerAccessToken(credentials, baseUrl = runnerApiBaseUrl()) {
  assertFirstPartyRunnerApi();
  let oauth = require("../../utils/teleport/api.js");
  if (oauth.isConsoleProfileSessionsCredential()) {
    let token = await oauth.sessionsApiAccessToken(true);
    if (!token) throw new SelfHostedRunnerApiError(401, oauth.cloudSessionsSignInRefusal());
    return token;
  }
  await checkAndRefreshOAuthTokenIfNeeded({
    credentials,
  }).catch(() => {});
  let accessToken =
    isStorageV5Enabled() && credentials !== undefined
      ? (await getClaudeAIOAuthTokensAsync(credentials))?.accessToken
      : getClaudeAIOAuthTokens()?.accessToken;
  if (!accessToken) throw new SelfHostedRunnerApiError(401, NOT_LOGGED_IN_RUNNER_TEXT);
  if (isStoredLoginRefused(baseUrl, true)) {
    let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(credentials);
    if (
      (claudeAIOAuthTokenOrigin === "env" || claudeAIOAuthTokenOrigin === "fd") &&
      !isOauthTokenFromBgSnapshot() &&
      !isLoginStashedInTokenSlot() &&
      getClaudeAIOAuthTokens()?.accessToken === accessToken
    )
      return accessToken;
    let refusalReason = storedLoginRefusalReason();
    throw new SelfHostedRunnerApiError(
      403,
      refusalReason === "admin"
        ? API_KEY_HELPER_BLOCKS_LOGIN_TEXT
        : new StoredLoginHeldBackError(refusalReason).message,
    );
  }
  return accessToken;
}
//@ chunk-n0yckbmr.js:2199-2228 placement
/**
 * 包装 UI 字段。
 */
function withUi(ui) {
  return {
    ui,
  };
}
//@ chunk-n0yckbmr.js:2228-2959 placement
/**
 * 调用自托管 runner 管理 API（base URL 变化时重试）。
 */
async function runnerApiRequest(method, path, body, signal, credentials) {
  await settleStoredLoginRefusal({
    url: runnerApiBaseUrl(),
    signal,
  });
  assertFirstPartyRunnerApi();
  let baseUrl = runnerApiBaseUrl();
  let token = await runnerAccessToken(credentials, baseUrl);
  if (runnerApiBaseUrl() !== baseUrl) return runnerApiRequest(method, path, body, signal, credentials);
  if (isLauncherHostLoginRefusedNow(token))
    throw new SelfHostedRunnerApiError(401, NOT_LOGGED_IN_RUNNER_TEXT);
  let response = await axios_default
    .request({
      method,
      url: `${runnerApiBaseUrl()}${path}`,
      data: body,
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      timeout: 20000,
      signal,
      validateStatus: (status) => status < 500,
    })
    .catch((error) => {
      if (axios_default.isAxiosError(error) && !axios_default.isCancel(error) && error.response === undefined)
        throw new SelfHostedRunnerApiError(0, `${method} ${path}: ${error.message}`);
      throw error;
    });
  if (response.status >= 400) {
    let message = response.data?.error?.message ?? jsonStringify(response.data);
    let text = `HTTP ${response.status} ${method} ${path}: ${message}`;
    if ([401, 403, 404, 409, 429].includes(response.status)) {
      let hint = response.status === 401 || response.status === 403 ? RUNNER_AUTH_HINT : "";
      throw new SelfHostedRunnerApiError(response.status, text + hint);
    }
    throw Error(text);
  }
  return response.data;
}
//@ chunk-n0yckbmr.js:2959-3035 placement
/**
 * 生成 tool_result 块。
 */
function toolResultBlock(toolUseId, result) {
  return {
    tool_use_id: toolUseId,
    type: "tool_result",
    content: redactSecretsInText(jsonStringify(result)),
  };
}
//@ chunk-n0yckbmr.js:3035-3197 placement
/**
 * 把参数对象格式化为 key=value。
 */
function describeArgs(args) {
  let problem = describeUnparsedInput(args);
  if (problem !== null) return problem;
  return Object.entries(args)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${typeof value === "string" ? value : jsonStringify(value)}`)
    .join(" ");
}
export {
  claudeAiOrigin,
  runnerApiBaseUrl,
  runnerApiRequest,
  withUi,
  toolResultBlock,
  describeArgs,
  DEFAULT_RUNNER_PORT,
};
