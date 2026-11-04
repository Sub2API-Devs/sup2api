/**
 * utils/hooks/execHttpHook.ts
 *
 * http 型钩子：URL 白名单、header 环境变量插值、沙箱代理/SSRF 防护下 POST JSON。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/execHttpHook.ts
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: sole-consumer 1, fingerprint 4, file-local 1, layout 1
 */
import { TLS_ENV_VARS } from "../tlsEnv.js";
import { getInitialSettings_2, getMachineAdminTierSettings } from "../settings/settings.js";
import { logForDebugging } from "../debug.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { isBlockedForExpansion_2, isBlockedForExpansion, scrubbedEnvKeys } from "../envExpansion.js";
import { TOOL_HOOK_EXECUTION_TIMEOUT_MS } from "./hookEvents.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import { isDiskless } from "../../bootstrap/state.js";
import { logError } from "../log.js";
import { CLOUD_HOOK_UNSUPPORTED_REASON } from "../hooks.js";
import { buildHostPatternRegex, ssrfGuardedLookup } from "./ssrfGuard.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { getUsableProxyUrl, shouldBypassProxy as shouldBypassProxy_2, getNoProxy } from "../proxy.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { errorMessage } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3405872-3406153 sole-consumer
var NETWORK_ENV_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3405872", () => {
  NETWORK_ENV_KEYS = [
    "NODE_EXTRA_CA_CERTS",
    "CLAUDE_CODE_CERT_STORE",
    "CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP",
    "CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP",
    "CLAUDE_CODE_CLIENT_CERT",
    "CLAUDE_CODE_CLIENT_KEY",
    "CLAUDE_CODE_CLIENT_KEY_PASSPHRASE",
    ...TLS_ENV_VARS,
    "LOCALDOMAIN",
    "HOSTALIASES",
    "RES_OPTIONS",
  ];
});
//@ chunk-e6aww6q8.js:3406153-3406459 fingerprint (2.1.88 match: getSandboxProxyConfig, 0.683)
/**
 * 沙箱网络开启时返回 HTTP 钩子使用的本地代理配置（127.0.0.1:port，带 srt 认证）。
 */
async function getSandboxProxyConfig() {
  let { SandboxManager } = await import("../sandbox/REFUSED_UNTIL_RESTART.lazy.js");
  if (!SandboxManager.isSandboxingEnabled()) return;
  await SandboxManager.waitForNetworkInitialization();
  let proxyPort = SandboxManager.getProxyPort();
  if (!proxyPort) return;
  let proxyAuthToken = SandboxManager.getProxyAuthToken();
  return {
    host: "127.0.0.1",
    port: proxyPort,
    protocol: "http",
    ...(proxyAuthToken && {
      auth: {
        username: "srt",
        password: proxyAuthToken,
      },
    }),
  };
}
//@ chunk-e6aww6q8.js:3406459-3406567 fingerprint (2.1.88 match: getHttpHookPolicy, 1)
/**
 * 读取 HTTP 钩子策略：allowedHttpHookUrls 与 httpHookAllowedEnvVars。
 */
function getHttpHookPolicy() {
  let settings = getInitialSettings_2();
  return {
    allowedUrls: settings.allowedHttpHookUrls,
    allowedEnvVars: settings.httpHookAllowedEnvVars,
  };
}
//@ chunk-e6aww6q8.js:3406567-3406618 file-local
function sanitizeHeaderValue(value) {
  return value.replace(/[\r\n\x00]/g, "");
}
//@ chunk-e6aww6q8.js:3406618-3407035 fingerprint (2.1.88 match: interpolateEnvVars, 0.8)
/**
 * 在 header 值里插值 $VAR/${VAR}：不在 allowedEnvVars 的变量与凭证类变量替换为空串，结果去掉 CR/LF/NUL。
 */
function interpolateEnvVars(value, allowedEnvVars, adminVars, env, blockedKeys) {
  let interpolated = value.replace(
    /\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g,
    (match, braced, unbraced) => {
      let varName = braced ?? unbraced;
      if (!allowedEnvVars.has(varName)) {
        logForDebugging(`Hooks: env var $${varName} not in allowedEnvVars, skipping interpolation`, {
          level: "warn",
        });
        return "";
      }
      let varValue = (env ?? subprocessEnv())[varName];
      if (
        isBlockedForExpansion_2(varName) ||
        (!adminVars.has(varName) && isBlockedForExpansion(varName, varValue, blockedKeys))
      ) {
        logForDebugging(
          `Hooks: env var $${varName} is a credential and is not interpolated into an HTTP hook header`,
          {
            level: "warn",
          },
        );
        return "";
      }
      return varValue ?? "";
    },
  );
  return sanitizeHeaderValue(interpolated);
}
//@ chunk-e6aww6q8.js:3407035-3407087 layout
function getProcessEnvForHttpHook() {
  return {
    env: {
      ...subprocessEnv(),
    },
    blankList: scrubbedEnvKeys(),
  };
}
//@ chunk-e6aww6q8.js:3407087-3409333 fingerprint (2.1.88 match: execHttpHook, 0.84)
/**
 * 执行 http 钩子：POST JSON 到 url；受 allowedHttpHookUrls 白名单约束，headers 中只插值 allowedEnvVars（且与策略 httpHookAllowedEnvVars 取交集，凭证类变量不插值）；不跟随重定向；经沙箱代理或 SSRF 防护的 DNS 查询发送；返回 ok/statusCode/body。
 */
async function execHttpHook(
  hook,
  _hookEvent,
  jsonInput,
  signal,
  timeoutMs = TOOL_HOOK_EXECUTION_TIMEOUT_MS,
  env,
  envContext,
) {
  if (isHttpMcpServeInvocation()) {
    logForDebugging("HTTP hook not sent: claude mcp serve --transport http never sends HTTP hooks.", {
      level: "warn",
    });
    return {
      ok: false,
      body: "",
      error: "HTTP hook not sent: claude mcp serve --transport http never sends HTTP hooks.",
      withheld: true,
    };
  }
  if (isDiskless()) {
    logError(Error("an HTTP hook got past keepWhileDiskless in a diskless session and was not sent"));
    return {
      ok: false,
      body: "",
      withheld: true,
      error: `HTTP hook not sent: ${CLOUD_HOOK_UNSUPPORTED_REASON}`,
    };
  }
  let policy = getHttpHookPolicy();
  if (policy.allowedUrls !== undefined) {
    if (!policy.allowedUrls.some((allowedUrl) => buildHostPatternRegex(hook.url, allowedUrl))) {
      let msg = `HTTP hook blocked: ${hook.url} does not match any pattern in allowedHttpHookUrls`;
      logForDebugging(msg, {
        level: "warn",
      });
      return {
        ok: false,
        body: "",
        error: msg,
      };
    }
  }
  let timeoutMs_2 = hook.timeout ? hook.timeout * 1000 : timeoutMs;
  let { signal: combinedSignal, cleanup } = createCombinedAbortSignal(signal, {
    timeoutMs: timeoutMs_2,
  });
  try {
    let headers = {
      "Content-Type": "application/json",
    };
    if (hook.headers) {
      let hookVars = hook.allowedEnvVars ?? [];
      let allowedHookVars =
        policy.allowedEnvVars !== undefined
          ? hookVars.filter((v) => policy.allowedEnvVars.includes(v))
          : hookVars;
      let allowedEnvVars = new Set(allowedHookVars);
      let adminTierVars = new Set(
        getMachineAdminTierSettings().flatMap((settings) => settings.httpHookAllowedEnvVars ?? []),
      );
      let blockedKeys = envContext?.blankList ?? scrubbedEnvKeys();
      for (let [name, value] of Object.entries(hook.headers))
        headers[name] = interpolateEnvVars(
          value,
          allowedEnvVars,
          adminTierVars,
          env ?? envContext?.env,
          blockedKeys,
        );
    }
    let sandboxProxy = await getSandboxProxyConfig();
    let envProxyActive = !sandboxProxy && getUsableProxyUrl() !== undefined && !shouldBypassProxy_2(hook.url);
    let usableProxyUrl = getUsableProxyUrl();
    let envProxyUrl = env === undefined ? undefined : getUsableProxyUrl(env);
    if (
      env !== undefined &&
      (usableProxyUrl !== envProxyUrl ||
        ((usableProxyUrl !== undefined || envProxyUrl !== undefined) &&
          shouldBypassProxy_2(hook.url, getNoProxy() ?? "") !==
            shouldBypassProxy_2(hook.url, getNoProxy(env) ?? "")) ||
        NETWORK_ENV_KEYS.some((key) => process.env[key] !== env[key]))
    ) {
      logForDebugging(
        "HTTP hook not sent: this process's proxy, TLS trust or resolver settings differ from the person's own environment",
        {
          level: "warn",
        },
      );
      cleanup();
      return {
        ok: false,
        body: "",
        error:
          "HTTP hook not sent: this process's proxy, TLS trust or resolver settings differ from the person's own environment",
      };
    }
    if (sandboxProxy)
      logForDebugging(`Hooks: HTTP hook POST to ${hook.url} (via sandbox proxy :${sandboxProxy.port})`);
    else if (envProxyActive) logForDebugging(`Hooks: HTTP hook POST to ${hook.url} (via env-var proxy)`);
    else logForDebugging(`Hooks: HTTP hook POST to ${hook.url}`);
    let response = await externalHttp.post(hook.url, jsonInput, {
      headers,
      signal: combinedSignal,
      responseType: "text",
      validateStatus: () => true,
      maxRedirects: 0,
      proxy: sandboxProxy ?? false,
      lookup: sandboxProxy || envProxyActive ? undefined : ssrfGuardedLookup,
    });
    cleanup();
    let body = response.data ?? "";
    logForDebugging(`Hooks: HTTP hook response status ${response.status}, body length ${body.length}`);
    return {
      ok: response.status >= 200 && response.status < 300,
      statusCode: response.status,
      body,
    };
  } catch (error) {
    cleanup();
    if (combinedSignal.aborted)
      return {
        ok: false,
        body: "",
        aborted: true,
      };
    let errorMsg = errorMessage(error);
    logForDebugging(`Hooks: HTTP hook error: ${errorMsg}`, {
      level: "error",
    });
    return {
      ok: false,
      body: "",
      error: errorMsg,
    };
  }
}
export { getProcessEnvForHttpHook, execHttpHook };
