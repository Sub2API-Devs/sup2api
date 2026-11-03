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
import { Na } from "../services/gateway/constants.js";
import { Dt } from "../../vendor/axios/dist/esm/axios.js";

//@ chunk-aepeg2w5.js:592522-592568 placement
function DRn(e, n) {
  return workloadStorage.run(e, () => cliError_2(n));
}
/**
 * API 请求 User-Agent：claude-cli/<版本> (external, <entrypoint>[, agent-sdk/<CLAUDE_AGENT_SDK_VERSION>][, client-app/<CLAUDE_AGENT_SDK_CLIENT_APP>][, workload/<workload>])，entrypoint 默认 cli。
 */
//@ chunk-aepeg2w5.js:592568-593403 facade-exports = getUserAgent (0.584)
function getUserAgent(e) {
  let n = (e?.ownEntrypoint ? void 0 : getEntrypointOnRequests()) ?? env.CLAUDE_CODE_ENTRYPOINT ?? "cli",
    r = process.env.CLAUDE_AGENT_SDK_VERSION ? `, agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}` : "",
    s = env.CLAUDE_AGENT_SDK_CLIENT_APP ? `, client-app/${env.CLAUDE_AGENT_SDK_CLIENT_APP}` : "",
    workload = getWorkload(),
    y = workload ? `, workload/${workload}` : "";
  return `claude-cli/${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} (external, ${n}${r}${s}${y})`;
}
/**
 * MCP 请求的 User-Agent（claude-code/<版本>，带 agent-sdk/client-app 后缀）。
 */
//@ chunk-aepeg2w5.js:593403-594216 facade-exports = getMCPUserAgent (0.567)
function getMCPUserAgent() {
  let parts = [],
    n = getEntrypointOnRequests() ?? env.CLAUDE_CODE_ENTRYPOINT;
  if (n) parts.push(n);
  if (process.env.CLAUDE_AGENT_SDK_VERSION) parts.push(`agent-sdk/${process.env.CLAUDE_AGENT_SDK_VERSION}`);
  if (env.CLAUDE_AGENT_SDK_CLIENT_APP) parts.push(`client-app/${env.CLAUDE_AGENT_SDK_CLIENT_APP}`);
  let suffix = parts.length > 0 ? ` (${parts.join(", ")})` : "";
  return `claude-code/${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}${suffix}`;
}
/**
 * WebFetch 用 UA：Claude-User (claude-code/<版本>; +https://support.anthropic.com/)。
 */
//@ chunk-aepeg2w5.js:594216-594294 facade-exports = getWebFetchUserAgent (1)
function getWebFetchUserAgent() {
  return `Claude-User (${claudeCodeUserAgent()}; +https://support.anthropic.com/)`;
}
/**
 * WIF（workload identity federation，profile 来源）时取联合身份令牌作为认证头。
 */
//@ chunk-aepeg2w5.js:594294-594774 facade-exports
async function getAuthHeadersAsync(e = {}) {
  if (!getAnthropicApiKeySafe() && shouldUseWIFAuth())
    try {
      let { getWIFCredentials: getWIFCredentials, getWIFTokenCache: getWIFTokenCache } =
          await import("./chunk-7k61ne1e.js"),
        [s, h] = await Promise.all([getWIFTokenCache(), getWIFCredentials()]);
      if (s !== null)
        return {
          headers: {
            ...h?.extraHeaders,
            Authorization: `Bearer ${await s.getToken()}`,
            "anthropic-beta": OAUTH_BETA_HEADER,
          },
        };
    } catch (error) {
      return (
        logForDebugging(
          `WIF auth header resolution failed: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        ),
        {
          headers: {},
          error: error instanceof Error ? error.message : String(error),
          reasonCode: "wif_error",
        }
      );
    }
  return getAuthHeaders(e);
}
/**
 * Anthropic 自有 API（profile、remote settings、sessions 等）的认证头：第三方提供方返回错误；订阅用户用 Bearer OAuth + oauth-2025-04-20 beta；网关不可用；否则 x-api-key，可选回退 ANTHROPIC_AUTH_TOKEN Bearer。
 */
//@ chunk-aepeg2w5.js:594774-595468 facade-exports = getAuthHeaders (0.621)
function getAuthHeaders(e = {}) {
  if (isUsing3PServices())
    return {
      headers: {},
      error: "Anthropic auth not used on third-party providers",
      reasonCode: "third_party",
    };
  if (isClaudeAISubscriber()) {
    let oauthTokens = getClaudeAIOAuthTokens();
    if (!oauthTokens?.accessToken)
      return { headers: {}, error: "No OAuth token available", reasonCode: "no_oauth_token" };
    return {
      headers: { Authorization: `Bearer ${oauthTokens.accessToken}`, "anthropic-beta": OAUTH_BETA_HEADER },
    };
  }
  if (getAPIProvider() === "gateway")
    return { headers: {}, error: "Not available when using a Cloud gateway", reasonCode: "gateway" };
  let apiKey = getAnthropicApiKeySafe();
  if (!apiKey) {
    let envBearerFallbackFor = e.envBearerFallbackFor,
      s = envBearerFallbackFor ? effectiveAuthTokenEnv() : void 0;
    if (
      s &&
      envBearerFallbackFor &&
      isActualFirstPartyAnthropicBaseUrl() &&
      Na(envBearerFallbackFor) &&
      !env.ANTHROPIC_UNIX_SOCKET
    )
      return { headers: { Authorization: `Bearer ${s}` } };
    return { headers: {}, error: "No API key available", reasonCode: "no_api_key" };
  }
  return { headers: { "x-api-key": apiKey } };
}
//@ chunk-aepeg2w5.js:595468-595593 facade-exports
async function countOAuth401Recovery(e, n) {
  let r = e?.recoveries;
  if (!r) return n();
  (r.begun++, r.running++);
  try {
    return await n();
  } finally {
    r.running--;
  }
}
//@ chunk-aepeg2w5.js:595593-595643 facade-exports
function oauthRefreshLatchStamp(e) {
  return e.running > 0 ? void 0 : e.begun;
}
//@ chunk-aepeg2w5.js:595643-595702 facade-exports
function restoreOAuthRefreshLatch(e, n) {
  if (n === e.recoveries.begun) e.attempted = !1;
}
//@ chunk-aepeg2w5.js:595702-596653 facade-exports
async function withOAuth401Retry(e, n) {
  let r;
  if (n?.gateToSessionOAuthCredential) {
    let s = getClaudeAIOAuthTokens(),
      h = await getAuthHeadersAsync();
    r =
      s?.accessToken && s.refreshToken && h.headers.Authorization === `Bearer ${s.accessToken}`
        ? s.accessToken
        : void 0;
  }
  try {
    return await e();
  } catch (error) {
    if (!Dt.isAxiosError(error)) throw error;
    let h = error.response?.status;
    if (
      !(
        h === 401 ||
        (n?.also403Revoked &&
          h === 403 &&
          typeof error.response?.data === "string" &&
          error.response.data.includes("OAuth token has been revoked"))
      ) ||
      n?.signal?.aborted
    )
      throw error;
    if (n?.gateToSessionOAuthCredential) {
      if (!r) throw error;
      let w = getClaudeAIOAuthTokens()?.accessToken;
      if (w && w !== r) return await e();
      let oauthRefreshLatch = n.oauthRefreshLatch;
      if (oauthRefreshLatch?.attempted) throw error;
      if (oauthRefreshLatch) oauthRefreshLatch.attempted = !0;
      let onForcedRefreshOutcome = n.onForcedRefreshOutcome,
        P = !1;
      if (
        (await countOAuth401Recovery(oauthRefreshLatch, () =>
          handleOAuth401Error(r, n?.credentials, void 0, {
            onForcedRefreshOutcome:
              oauthRefreshLatch || onForcedRefreshOutcome
                ? (L) => {
                    if (((P = !0), oauthRefreshLatch && TOKEN_REFRESH_OUTCOMES_BEFORE_POST.has(L)))
                      oauthRefreshLatch.attempted = !1;
                    onForcedRefreshOutcome?.(L);
                  }
                : void 0,
          }),
        ),
        !P)
      )
        onForcedRefreshOutcome?.(void 0);
      let F = getClaudeAIOAuthTokens()?.accessToken;
      if (!F || F === r) throw error;
      return await e();
    }
    let S = getClaudeAIOAuthTokens()?.accessToken;
    if (!S) throw error;
    return (await handleOAuth401Error(S, n?.credentials), await e());
  }
}
/**
 * 返回 claude-code/<版本> 形式的 User-Agent。
 */
//@ chunk-zs9sd2e8.js:191-715 placement
function claudeCodeUserAgent() {
  return `claude-code/${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}`;
}
//@ chunk-zs9sd2e8.js:715-1361 facade-exports
function getClientPlatform(e = process.env.CLAUDE_CODE_ENTRYPOINT) {
  switch (e) {
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
/**
 * 生成 AI_AGENT 环境变量值 claude-code_<版本（点换成横线）>_<后缀>。
 */
//@ chunk-zs9sd2e8.js:1361-1911 placement
function aiAgentEnvValue(suffix) {
  return `claude-code_${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION.replace(/\./g, "-")}_${suffix}`;
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
//@ chunk-bvbc7k4d.js:191-204 placement
var Dun = 3000;
//@ chunk-bvbc7k4d.js:204-243 placement
function d(t) {
  t.cancel().catch(() => {});
}
/**
 * 读完并丢弃响应体（可设字节上限与超时，超过时取消读取），用于释放连接。
 */
//@ chunk-bvbc7k4d.js:243-552 placement
async function drainResponseBody(t, { maxBytes: o = 65536, timeoutMs: i } = {}) {
  let e;
  try {
    let n = t.body?.getReader();
    if (!n) return;
    if (i !== void 0) ((e = setTimeout(d, i, n)), e.unref?.());
    let r = o;
    for (;;) {
      let { done: a, value: c } = await n.read();
      if (a) return;
      if (((r -= c.byteLength), r < 0)) {
        await n.cancel();
        return;
      }
    }
  } catch {
  } finally {
    if (e !== void 0) clearTimeout(e);
  }
}
/**
 * 包装请求：遇 401 触发 OAuth 刷新后重试一次（令牌被吊销时报错）。
 */
//@ chunk-9vvvg0d3.js:24960-25161 fingerprint = withOAuth401Retry (0.79)
function withOAuth401Retry_2(e) {
  if (!Dt.isAxiosError(e)) return !1;
  let status = e.response?.status;
  if (status === 401) return !0;
  return (
    status === 403 &&
    typeof e.response?.data === "string" &&
    e.response.data.includes("OAuth token has been revoked")
  );
}

export {
  drainResponseBody,
  getClientPlatform,
  claudeCodeUserAgent,
  withOAuth401Retry,
  getAuthHeaders,
  setAiAgentEnv,
  getMCPUserAgent,
  DRn,
  getUserAgent,
  oauthRefreshLatchStamp,
  getAuthHeadersAsync,
  restoreOAuthRefreshLatch,
  getWebFetchUserAgent,
  countOAuth401Recovery,
  withOAuth401Retry_2,
  Dun,
  aiAgentEnvValue,
};
