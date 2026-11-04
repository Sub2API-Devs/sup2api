/**
 * utils/http.ts
 *
 * HTTP 头：User-Agent（claude-cli/<版本> (external, entrypoint…)）、MCP/WebFetch UA、Anthropic 自有 API 的认证头、WIF 头、401 重试包装。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/http.ts
 * pieces: chunk-9vvvg0d3.js (1), chunk-aepeg2w5.js (10), chunk-bvbc7k4d.js (3), chunk-zs9sd2e8.js (4)
 * attribution: fingerprint 1, placement 7, facade-exports 10
 */
import { workloadStorage, getWorkload } from "./workloadContext.js";
import { cliError_2 } from "../cli/exit.js";
import { getEntrypointOnRequests } from "../bootstrap/state.js";
import { env } from "./env.js";
import {
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  isUsing3PServices,
  isClaudeAISubscriber,
  getClaudeAIOAuthTokens,
  effectiveAuthTokenEnv,
  handleOAuth401Error,
  TOKEN_REFRESH_OUTCOMES_BEFORE_POST,
} from "./auth.js";
import { OAUTH_BETA_HEADER } from "../constants/oauth.js";
import { logForDebugging } from "./debug.js";
import { getAPIProvider, isActualFirstPartyAnthropicBaseUrl } from "./model/providers.js";
import { isGatewayUrlAllowed } from "../services/gateway/constants.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { runDeferredInits } from "../../runtime/deferred-init.js";

//@ chunk-zs9sd2e8.js:191-715 placement
/**
 * 返回 claude-code/<版本> 形式的 User-Agent。
 */
function claudeCodeUserAgent() {
  return `claude-code/${
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION
  }`;
}
//@ chunk-zs9sd2e8.js:715-1361 facade-exports
function getClientPlatform(entrypoint = process.env.CLAUDE_CODE_ENTRYPOINT) {
  switch (entrypoint) {
    case "claude-vscode":
      return "claude_code_vscode";
    case "remote":
    case "remote_baku":
    case "remote_cowork":
    case "remote_desktop":
    case "remote_mobile":
    case "remote_projects":
      return "claude_code_remote";
    case "claude-in-teams":
      return "claude_code_remote";
    case "sdk-cli":
    case "sdk-ts":
    case "sdk-py":
      return "claude_code_sdk";
    case "mcp":
      return "claude_code_mcp";
    case "claude-code-github-action":
      return "claude_code_github_action";
    case "local-agent":
      return "claude_code_local_agent";
    case "claude_in_slack":
      return "claude_in_slack";
    case "claude-in-slack":
      return "claude-in-slack";
    case "cli":
    default:
      return "claude_code_cli";
  }
}
//@ chunk-zs9sd2e8.js:1361-1911 placement
/**
 * 生成 AI_AGENT 环境变量值 claude-code_<版本（点换成横线）>_<后缀>。
 */
function aiAgentEnvValue(suffix) {
  return `claude-code_${{
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION.replace(/\./g, "-")}_${suffix}`;
}
//@ chunk-zs9sd2e8.js:1911-2085 placement
function setAiAgentEnv() {
  if (
    !process.env.AI_AGENT ||
    process.env.AI_AGENT.startsWith("claude-code_") ||
    process.env.AI_AGENT.startsWith("claude-code/")
  )
    process.env.AI_AGENT = aiAgentEnvValue("harness");
}
//@ chunk-aepeg2w5.js:592522-592568 placement
/**
 * 在指定 workload 的 AsyncLocalStorage 中运行回调，用于生成带 workload 的 User-Agent。
 */
function withWorkloadStorage(storage, msg) {
  return workloadStorage.run(storage, () => cliError_2(msg));
}
//@ chunk-aepeg2w5.js:592568-593403 facade-exports = getUserAgent (0.584)
/**
 * API 请求 User-Agent：claude-cli/<版本> (external, <entrypoint>[, agent-sdk/<CLAUDE_AGENT_SDK_VERSION>][, client-app/<CLAUDE_AGENT_SDK_CLIENT_APP>][, workload/<workload>])，entrypoint 默认 cli。
 */
function getUserAgent(options) {
  let entrypoint =
    (options?.ownEntrypoint ? undefined : getEntrypointOnRequests()) ?? env.CLAUDE_CODE_ENTRYPOINT ?? "cli";
  let sdkSuffix = process.env.CLAUDE_AGENT_SDK_VERSION
    ? `, agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}`
    : "";
  let clientApp = env.CLAUDE_AGENT_SDK_CLIENT_APP ? `, client-app/${env.CLAUDE_AGENT_SDK_CLIENT_APP}` : "";
  let workload = getWorkload();
  let workloadSuffix = workload ? `, workload/${workload}` : "";
  return `claude-cli/${
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION
  } (external, ${entrypoint}${sdkSuffix}${clientApp}${workloadSuffix})`;
}
//@ chunk-aepeg2w5.js:593403-594216 facade-exports = getMCPUserAgent (0.567)
/**
 * MCP 请求的 User-Agent（claude-code/<版本>，带 agent-sdk/client-app 后缀）。
 */
function getMCPUserAgent() {
  let parts = [];
  let entrypoint = getEntrypointOnRequests() ?? env.CLAUDE_CODE_ENTRYPOINT;
  if (entrypoint) parts.push(entrypoint);
  if (process.env.CLAUDE_AGENT_SDK_VERSION) parts.push(`agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}`);
  if (env.CLAUDE_AGENT_SDK_CLIENT_APP) parts.push(`client-app/${env.CLAUDE_AGENT_SDK_CLIENT_APP}`);
  let suffix = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return `claude-code/${
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.316",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-10-30T23:28:13Z",
      GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION
  }${suffix}`;
}
//@ chunk-aepeg2w5.js:594216-594294 facade-exports = getWebFetchUserAgent (1)
/**
 * WebFetch 用 UA：Claude-User (claude-code/<版本>; +https://support.anthropic.com/)。
 */
function getWebFetchUserAgent() {
  return `Claude-User (${claudeCodeUserAgent()}; +https://support.anthropic.com/)`;
}
//@ chunk-aepeg2w5.js:594294-594774 facade-exports
/**
 * WIF（workload identity federation，profile 来源）时取联合身份令牌作为认证头。
 */
async function getAuthHeadersAsync(options = {}) {
  if (!getAnthropicApiKeySafe() && shouldUseWIFAuth())
    try {
      let { getWIFCredentials, getWIFTokenCache } =
        await import("../../vendor/@anthropic-ai/sdk/lib/credentials/TokenCache.lazy.js");
      let [wifTokenCache, wifCredentials] = await Promise.all([getWIFTokenCache(), getWIFCredentials()]);
      if (wifTokenCache !== null)
        return {
          headers: {
            ...wifCredentials?.extraHeaders,
            Authorization: `Bearer ${await wifTokenCache.getToken()}`,
            "anthropic-beta": OAUTH_BETA_HEADER,
          },
        };
    } catch (error) {
      logForDebugging(
        `WIF auth header resolution failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      return {
        headers: {},
        error: error instanceof Error ? error.message : String(error),
        reasonCode: "wif_error",
      };
    }
  return getAuthHeaders(options);
}
//@ chunk-aepeg2w5.js:594774-595468 facade-exports = getAuthHeaders (0.621)
/**
 * Anthropic 自有 API（profile、remote settings、sessions 等）的认证头：第三方提供方返回错误；订阅用户用 Bearer OAuth + oauth-2025-04-20 beta；网关不可用；否则 x-api-key，可选回退 ANTHROPIC_AUTH_TOKEN Bearer。
 */
function getAuthHeaders(options = {}) {
  if (isUsing3PServices())
    return {
      headers: {},
      error: "Anthropic auth not used on third-party providers",
      reasonCode: "third_party",
    };
  if (isClaudeAISubscriber()) {
    let oauthTokens = getClaudeAIOAuthTokens();
    if (!oauthTokens?.accessToken)
      return {
        headers: {},
        error: "No OAuth token available",
        reasonCode: "no_oauth_token",
      };
    return {
      headers: {
        Authorization: `Bearer ${oauthTokens.accessToken}`,
        "anthropic-beta": OAUTH_BETA_HEADER,
      },
    };
  }
  if (getAPIProvider() === "gateway")
    return {
      headers: {},
      error: "Not available when using a Cloud gateway",
      reasonCode: "gateway",
    };
  let apiKey = getAnthropicApiKeySafe();
  if (!apiKey) {
    let envBearerFallbackFor = options.envBearerFallbackFor;
    let fallbackBearer = envBearerFallbackFor ? effectiveAuthTokenEnv() : undefined;
    if (
      fallbackBearer &&
      envBearerFallbackFor &&
      isActualFirstPartyAnthropicBaseUrl() &&
      isGatewayUrlAllowed(envBearerFallbackFor) &&
      !env.ANTHROPIC_UNIX_SOCKET
    )
      return {
        headers: {
          Authorization: `Bearer ${fallbackBearer}`,
        },
      };
    return {
      headers: {},
      error: "No API key available",
      reasonCode: "no_api_key",
    };
  }
  return {
    headers: {
      "x-api-key": apiKey,
    },
  };
}
//@ chunk-aepeg2w5.js:595468-595593 facade-exports
async function countOAuth401Recovery(latch, fn) {
  let recoveries = latch?.recoveries;
  if (!recoveries) return fn();
  recoveries.begun++;
  recoveries.running++;
  try {
    return await fn();
  } finally {
    recoveries.running--;
  }
}
//@ chunk-aepeg2w5.js:595593-595643 facade-exports
function oauthRefreshLatchStamp(recoveries) {
  return recoveries.running > 0 ? undefined : recoveries.begun;
}
//@ chunk-aepeg2w5.js:595643-595702 facade-exports
function restoreOAuthRefreshLatch(options, begunCount) {
  if (begunCount === options.recoveries.begun) options.attempted = false;
}
//@ chunk-aepeg2w5.js:595702-596653 facade-exports
async function withOAuth401Retry(fn, options) {
  let gatedAccessToken;
  if (options?.gateToSessionOAuthCredential) {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    let authHeaders = await getAuthHeadersAsync();
    gatedAccessToken =
      claudeAIOAuthTokens?.accessToken &&
      claudeAIOAuthTokens.refreshToken &&
      authHeaders.headers.Authorization === `Bearer ${claudeAIOAuthTokens.accessToken}`
        ? claudeAIOAuthTokens.accessToken
        : undefined;
  }
  try {
    return await fn();
  } catch (error) {
    if (!axios_default.isAxiosError(error)) throw error;
    let status = error.response?.status;
    if (
      !(
        status === 401 ||
        (options?.also403Revoked &&
          status === 403 &&
          typeof error.response?.data === "string" &&
          error.response.data.includes("OAuth token has been revoked"))
      ) ||
      options?.signal?.aborted
    )
      throw error;
    if (options?.gateToSessionOAuthCredential) {
      if (!gatedAccessToken) throw error;
      let accessToken = getClaudeAIOAuthTokens()?.accessToken;
      if (accessToken && accessToken !== gatedAccessToken) return await fn();
      let oauthRefreshLatch = options.oauthRefreshLatch;
      if (oauthRefreshLatch?.attempted) throw error;
      if (oauthRefreshLatch) oauthRefreshLatch.attempted = true;
      let onForcedRefreshOutcome = options.onForcedRefreshOutcome;
      let outcomeReported = false;
      await countOAuth401Recovery(oauthRefreshLatch, () =>
        handleOAuth401Error(gatedAccessToken, options?.credentials, undefined, {
          onForcedRefreshOutcome:
            oauthRefreshLatch || onForcedRefreshOutcome
              ? (outcome) => {
                  outcomeReported = true;
                  if (oauthRefreshLatch && TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(outcome))
                    oauthRefreshLatch.attempted = false;
                  onForcedRefreshOutcome?.(outcome);
                }
              : undefined,
        }),
      );
      if (!outcomeReported) onForcedRefreshOutcome?.(undefined);
      let accessToken_2 = getClaudeAIOAuthTokens()?.accessToken;
      if (!accessToken_2 || accessToken_2 === gatedAccessToken) throw error;
      return await fn();
    }
    let accessToken = getClaudeAIOAuthTokens()?.accessToken;
    if (!accessToken) throw error;
    await handleOAuth401Error(accessToken, options?.credentials);
    return await fn();
  }
}
//@ chunk-bvbc7k4d.js:191-204 placement
/**
 * 排空响应体的默认超时（毫秒）。
 */
var DEFAULT_DRAIN_TIMEOUT_MS = 3000;
//@ chunk-bvbc7k4d.js:204-243 placement
function cancelBody(body) {
  body.cancel().catch(() => {});
}
//@ chunk-bvbc7k4d.js:243-552 placement
/**
 * 读完并丢弃响应体（可设字节上限与超时，超过时取消读取），用于释放连接。
 */
async function drainResponseBody(response, { maxBytes = 65536, timeoutMs } = {}) {
  let timeoutHandle;
  try {
    let reader = response.body?.getReader();
    if (!reader) return;
    if (timeoutMs !== undefined) {
      timeoutHandle = setTimeout(cancelBody, timeoutMs, reader);
      timeoutHandle.unref?.();
    }
    let remaining = maxBytes;
    for (;;) {
      let { done, value: chunk } = await reader.read();
      if (done) return;
      remaining -= chunk.byteLength;
      if (remaining < 0) {
        await reader.cancel();
        return;
      }
    }
  } catch {
  } finally {
    if (timeoutHandle !== undefined) clearTimeout(timeoutHandle);
  }
}
//@ chunk-9vvvg0d3.js:24960-25161 fingerprint = withOAuth401Retry (0.79)
/**
 * 包装请求：遇 401 触发 OAuth 刷新后重试一次（令牌被吊销时报错）。
 */
function withOAuth401Retry_2(error) {
  if (!axios_default.isAxiosError(error)) return false;
  let status = error.response?.status;
  if (status === 401) return true;
  return (
    status === 403 &&
    typeof error.response?.data === "string" &&
    error.response.data.includes("OAuth token has been revoked")
  );
}

// The import cycle this module closes (3677 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("src/utils/http.js");
export {
  drainResponseBody,
  getClientPlatform,
  claudeCodeUserAgent,
  withOAuth401Retry,
  getAuthHeaders,
  setAiAgentEnv,
  getMCPUserAgent,
  withWorkloadStorage,
  getUserAgent,
  oauthRefreshLatchStamp,
  getAuthHeadersAsync,
  restoreOAuthRefreshLatch,
  getWebFetchUserAgent,
  countOAuth401Recovery,
  withOAuth401Retry_2,
  DEFAULT_DRAIN_TIMEOUT_MS,
  aiAgentEnvValue,
};
