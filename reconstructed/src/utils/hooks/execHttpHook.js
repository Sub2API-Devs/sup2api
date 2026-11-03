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
import { ide } from "../tlsEnv.js";
import { getInitialSettings_2, getMachineAdminTierSettings } from "../settings/settings.js";
import { logForDebugging } from "../debug.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { ADt, isBlockedForExpansion, scrubbedEnvKeys } from "../envExpansion.js";
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

//@ chunk-e6aww6q8.js:3405872-3406153 sole-consumer
var NETWORK_ENV_KEYS = [
  "NODE_EXTRA_CA_CERTS",
  "CLAUDE_CODE_CERT_STORE",
  "CLAUDE_CODE_DISABLE_LOOPED_CROSS_CERT_DROP",
  "CLAUDE_CODE_DISABLE_SELF_NAMED_CERT_DROP",
  "CLAUDE_CODE_CLIENT_CERT",
  "CLAUDE_CODE_CLIENT_KEY",
  "CLAUDE_CODE_CLIENT_KEY_PASSPHRASE",
  ...ide,
  "LOCALDOMAIN",
  "HOSTALIASES",
  "RES_OPTIONS",
];
/**
 * 沙箱网络开启时返回 HTTP 钩子使用的本地代理配置（127.0.0.1:port，带 srt 认证）。
 */
//@ chunk-e6aww6q8.js:3406153-3406459 fingerprint = getSandboxProxyConfig (0.683)
async function getSandboxProxyConfig() {
  let { SandboxManager: SandboxManager } = await import("./chunk-y0my07fj.js");
  if (!SandboxManager.isSandboxingEnabled()) return;
  await SandboxManager.waitForNetworkInitialization();
  let proxyPort = SandboxManager.getProxyPort();
  if (!proxyPort) return;
  let proxyAuthToken = SandboxManager.getProxyAuthToken();
  return {
    host: "127.0.0.1",
    port: proxyPort,
    protocol: "http",
    ...(proxyAuthToken && { auth: { username: "srt", password: proxyAuthToken } }),
  };
}
/**
 * 读取 HTTP 钩子策略：allowedHttpHookUrls 与 httpHookAllowedEnvVars。
 */
//@ chunk-e6aww6q8.js:3406459-3406567 fingerprint = getHttpHookPolicy (1)
function getHttpHookPolicy() {
  let e = getInitialSettings_2();
  return { allowedUrls: e.allowedHttpHookUrls, allowedEnvVars: e.httpHookAllowedEnvVars };
}
//@ chunk-e6aww6q8.js:3406567-3406618 file-local
function sanitizeHeaderValue(value) {
  return value.replace(/[\r\n\x00]/g, "");
}
/**
 * 在 header 值里插值 $VAR/${VAR}：不在 allowedEnvVars 的变量与凭证类变量替换为空串，结果去掉 CR/LF/NUL。
 */
//@ chunk-e6aww6q8.js:3406618-3407035 fingerprint = interpolateEnvVars (0.8)
function interpolateEnvVars(e, n, r, s, h) {
  let interpolated = e.replace(/\$\{([A-Z_][A-Z0-9_]*)\}|\$([A-Z_][A-Z0-9_]*)/g, (S, braced, unbraced) => {
    let varName = braced ?? unbraced;
    if (!n.has(varName))
      return (
        logForDebugging(`Hooks: env var $${varName} not in allowedEnvVars, skipping interpolation`, {
          level: "warn",
        }),
        ""
      );
    let q = (s ?? subprocessEnv())[varName];
    if (ADt(varName) || (!r.has(varName) && isBlockedForExpansion(varName, q, h)))
      return (
        logForDebugging(
          `Hooks: env var $${varName} is a credential and is not interpolated into an HTTP hook header`,
          { level: "warn" },
        ),
        ""
      );
    return q ?? "";
  });
  return sanitizeHeaderValue(interpolated);
}
//@ chunk-e6aww6q8.js:3407035-3407087 layout
function getProcessEnvForHttpHook() {
  return { env: { ...subprocessEnv() }, blankList: scrubbedEnvKeys() };
}
/**
 * 执行 http 钩子：POST JSON 到 url；受 allowedHttpHookUrls 白名单约束，headers 中只插值 allowedEnvVars（且与策略 httpHookAllowedEnvVars 取交集，凭证类变量不插值）；不跟随重定向；经沙箱代理或 SSRF 防护的 DNS 查询发送；返回 ok/statusCode/body。
 */
//@ chunk-e6aww6q8.js:3407087-3409333 fingerprint = execHttpHook (0.84)
async function execHttpHook(e, n, r, s, h = TOOL_HOOK_EXECUTION_TIMEOUT_MS, y, S) {
  if (isHttpMcpServeInvocation())
    return (
      logForDebugging("HTTP hook not sent: claude mcp serve --transport http never sends HTTP hooks.", {
        level: "warn",
      }),
      {
        ok: !1,
        body: "",
        error: "HTTP hook not sent: claude mcp serve --transport http never sends HTTP hooks.",
        withheld: !0,
      }
    );
  if (isDiskless())
    return (
      logError(Error("an HTTP hook got past keepWhileDiskless in a diskless session and was not sent")),
      { ok: !1, body: "", withheld: !0, error: `HTTP hook not sent: ${CLOUD_HOOK_UNSUPPORTED_REASON}` }
    );
  let policy = getHttpHookPolicy();
  if (policy.allowedUrls !== void 0) {
    if (!policy.allowedUrls.some((allowedUrl) => buildHostPatternRegex(e.url, allowedUrl))) {
      let msg = `HTTP hook blocked: ${e.url} does not match any pattern in allowedHttpHookUrls`;
      return (logForDebugging(msg, { level: "warn" }), { ok: !1, body: "", error: msg });
    }
  }
  let L = e.timeout ? e.timeout * 1000 : h,
    { signal: combinedSignal, cleanup: cleanup } = createCombinedAbortSignal(s, { timeoutMs: L });
  try {
    let headers = { "Content-Type": "application/json" };
    if (e.headers) {
      let Me = e.allowedEnvVars ?? [],
        We = policy.allowedEnvVars !== void 0 ? Me.filter((nt) => policy.allowedEnvVars.includes(nt)) : Me,
        allowedEnvVars = new Set(We),
        lt = new Set(getMachineAdminTierSettings().flatMap((nt) => nt.httpHookAllowedEnvVars ?? [])),
        Je = S?.blankList ?? scrubbedEnvKeys();
      for (let [nt, pt] of Object.entries(e.headers))
        headers[nt] = interpolateEnvVars(pt, allowedEnvVars, lt, y ?? S?.env, Je);
    }
    let sandboxProxy = await getSandboxProxyConfig(),
      ke = !sandboxProxy && getUsableProxyUrl() !== void 0 && !shouldBypassProxy_2(e.url),
      we = getUsableProxyUrl(),
      Ee = y === void 0 ? void 0 : getUsableProxyUrl(y);
    if (
      y !== void 0 &&
      (we !== Ee ||
        ((we !== void 0 || Ee !== void 0) &&
          shouldBypassProxy_2(e.url, getNoProxy() ?? "") !==
            shouldBypassProxy_2(e.url, getNoProxy(y) ?? "")) ||
        NETWORK_ENV_KEYS.some((Me) => process.env[Me] !== y[Me]))
    )
      return (
        logForDebugging(
          "HTTP hook not sent: this process's proxy, TLS trust or resolver settings differ from the person's own environment",
          { level: "warn" },
        ),
        cleanup(),
        {
          ok: !1,
          body: "",
          error:
            "HTTP hook not sent: this process's proxy, TLS trust or resolver settings differ from the person's own environment",
        }
      );
    if (sandboxProxy)
      logForDebugging(`Hooks: HTTP hook POST to ${e.url} (via sandbox proxy :${sandboxProxy.port})`);
    else if (ke) logForDebugging(`Hooks: HTTP hook POST to ${e.url} (via env-var proxy)`);
    else logForDebugging(`Hooks: HTTP hook POST to ${e.url}`);
    let response = await externalHttp.post(e.url, r, {
      headers: headers,
      signal: combinedSignal,
      responseType: "text",
      validateStatus: () => !0,
      maxRedirects: 0,
      proxy: sandboxProxy ?? !1,
      lookup: sandboxProxy || ke ? void 0 : ssrfGuardedLookup,
    });
    cleanup();
    let Ie = response.data ?? "";
    return (
      logForDebugging(`Hooks: HTTP hook response status ${response.status}, body length ${Ie.length}`),
      { ok: response.status >= 200 && response.status < 300, statusCode: response.status, body: Ie }
    );
  } catch (error) {
    if ((cleanup(), combinedSignal.aborted)) return { ok: !1, body: "", aborted: !0 };
    let errorMsg = errorMessage(error);
    return (
      logForDebugging(`Hooks: HTTP hook error: ${errorMsg}`, { level: "error" }),
      { ok: !1, body: "", error: errorMsg }
    );
  }
}

export { getProcessEnvForHttpHook, execHttpHook };
