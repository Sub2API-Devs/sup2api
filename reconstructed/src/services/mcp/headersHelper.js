/**
 * services/mcp/headersHelper.ts
 *
 * 并入已有模块：包装 fetch：按需附加 MCP 动态头并处理重试；headersHelper 失败原因的消息等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/headersHelper.ts
 * pieces: chunk-16jhn3ak.js (1), chunk-g2rygg7v.js (14)
 * attribution: fingerprint 2, placement 10, layout 3
 */
import { isAbsolute } from "path";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import { classifyCommandSourceFailure } from "../../utils/plugins/commandSource.js";
import {
  getProjectConfigRoot,
  getOriginalCwd,
  isHomeDirectorySession,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { runWithPluginWriteScope } from "../../utils/plugins/pluginScopedWrite.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  ignoresPersistedTrust,
  PERSISTED_TRUST_IGNORED,
  getWorkspacePersistedTrustKey,
} from "../../utils/config.js";
import { escapedJsonStringify } from "../../tools/AgentTool/agentTrust.js";
import { describeGlobalConfigFile } from "../../utils/env.js";
import { firstGatedTrustDiagnosticFor } from "../../utils/permissions/permissionsLoader.js";
import { writeToStderr } from "../../utils/process.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { logEvent } from "../analytics/index.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { expandEnvVarsInString } from "./envExpansion.js";
import { uniq } from "../../utils/collections.js";
import { isMcpAppsHost } from "./mcpClientCapabilities.js";
import { sameOrigin, urlFromRequestOptions } from "../../utils/network/privateHostCheck.js";
import { recordPresentedHeaderSecrets } from "./discoveryCache.js";
import { fromEnumOpt, fromEnum } from "../analytics/safeMetadata.js";
import { ConfigScopeSchema } from "./types.js";
import { marketplaceOf, marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";

//@ chunk-g2rygg7v.js:6768-7014 placement = AGENT_SOURCE_GROUPS (0.642)
/**
 * 代理/配置来源分组：projectSettings/localSettings → repo，plugin/additionalDirectory → thirdParty，user/flag/policy/built-in → operator。
 */
function getAgentSourceTrustGroup(agentSource) {
  switch (agentSource) {
    case "projectSettings":
    case "localSettings":
      return "repo";
    case "plugin":
    case "additionalDirectory":
      return "thirdParty";
    case "userSettings":
    case "flagSettings":
    case "policySettings":
    case "built-in":
      return "operator";
    default:
      return agentSource;
  }
}
//@ chunk-g2rygg7v.js:7014-7195 layout
function scopeTrustGroup(scope) {
  switch (scope) {
    case "project":
    case "local":
      return "repo";
    case "user":
    case "dynamic":
    case "enterprise":
    case "claudeai":
    case "managed":
    case "agent":
      return "operator";
    default:
      return scope;
  }
}
//@ chunk-g2rygg7v.js:7195-7287 layout
/**
 * 判断 scope/agentSource 是否属于仓库可信组。
 */
function isRepoTrustedScope(config) {
  return (
    scopeTrustGroup(config.scope) === "repo" ||
    (config.agentSource !== undefined && getAgentSourceTrustGroup(config.agentSource) === "repo")
  );
}
//@ chunk-g2rygg7v.js:7287-7419 layout
function needsWorkspaceTrust(config, pluginRoot) {
  if (pluginRoot !== undefined) return true;
  if (config.scope === "project") return true;
  return config.agentSource !== undefined && getAgentSourceTrustGroup(config.agentSource) !== "operator";
}
//@ chunk-g2rygg7v.js:7419-9217 fingerprint = getMcpHeadersFromHelper (0.442)
/**
 * getMcpHeadersFromHelper：运行配置的 headersHelper 命令取动态请求头。仓库内配置需要已持久化的工作区信任；cwd 为插件根或项目根；注入 CLAUDE_CODE_MCP_SERVER_NAME/URL、CLAUDE_PLUGIN_ROOT。失败返回 null 并记日志。
 */
async function getMcpHeadersFromHelper(serverName, config) {
  if (!config.headersHelper) return null;
  let pluginRoot =
    typeof config.pluginPath === "string" && isAbsolute(config.pluginPath) ? config.pluginPath : undefined;
  try {
    logMCPDebug(serverName, "Executing headersHelper to get dynamic headers");
    let isRepoResident =
      config.scope !== undefined &&
      isRepoTrustedScope({
        scope: config.scope,
        agentSource: config.agentSource,
      });
    let helperResult = await classifyCommandSourceFailure({
      command: config.headersHelper,
      isRepoResidentConfig: isRepoResident,
      repoResidentOrigin: config.declaredIn,
      cwd:
        pluginRoot ??
        (isRepoResident
          ? (getProjectConfigRoot() ?? config.declaredIn ?? getOriginalCwd())
          : config.scope === "dynamic" && config.agentSource === undefined
            ? (getProjectConfigRoot() ?? getOriginalCwd())
            : getClaudeConfigDir()),
      scrubCredentialEnv: needsWorkspaceTrust(config, pluginRoot),
      pluginId: config.pluginSource,
      readEnvAsStarts: (fn) => runWithPluginWriteScope(config, fn),
      env: {
        CLAUDE_CODE_MCP_SERVER_NAME: serverName,
        CLAUDE_CODE_MCP_SERVER_URL: config.url,
        ...(pluginRoot && {
          CLAUDE_PLUGIN_ROOT: pluginRoot,
        }),
      },
    });
    if (helperResult.ok) {
      logMCPDebug(
        serverName,
        `Successfully retrieved ${Object.keys(helperResult.headers).length} headers from headersHelper`,
      );
      logFeatureOk("mcp_headers_helper");
      return helperResult.headers;
    }
    if (helperResult.reason === "missing_trust") {
      let hint = ignoresPersistedTrust()
        ? `${PERSISTED_TRUST_IGNORED}, so add the server at user scope or in a managed MCP config instead`
        : isHomeDirectorySession()
          ? "not available to a session rooted at the home directory without a person present (home trust is session-only): run Claude Code interactively here and accept the trust dialog for that session, or work from a project directory you have trusted"
          : `accept the trust dialog here once interactively, or set projects[${escapedJsonStringify(getWorkspacePersistedTrustKey())}].hasTrustDialogAccepted in ${describeGlobalConfigFile()}`;
      logMCPDebug(serverName, `headersHelper not run: this workspace has no persisted trust; ${hint}.`);
      if (getIsNonInteractiveSession() && firstGatedTrustDiagnosticFor(`mcp headersHelper ${serverName}`))
        writeToStderr(`MCP server '${replaceControlChars(serverName)}': headersHelper not run \u2014 this workspace has no persisted trust; ${hint}.
`);
      logEvent("tengu_mcp_headersHelper_missing_trust", {});
      logFeatureSad("mcp_headers_helper", "missing_trust");
      return null;
    }
    logFeatureBad("mcp_headers_helper", helperResult.reason);
    throw Error(headersHelperErrorMessage(serverName, helperResult.reason));
  } catch (error) {
    logMCPError(serverName, `Error getting headers from headersHelper: ${errorMessage(error)}`);
    logForDebugging(
      `Error getting MCP headers from headersHelper for server '${serverName}': ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return null;
  }
}
//@ chunk-g2rygg7v.js:9450-9874 placement
/**
 * headersHelper 失败原因的消息。
 */
function headersHelperErrorMessage(serverName, reason) {
  switch (reason) {
    case "exec_failed":
      return `headersHelper for MCP server '${serverName}' did not return a valid value`;
    case "parse_failed":
      return `headersHelper for MCP server '${serverName}' did not return valid JSON`;
    case "non_object":
      return `headersHelper for MCP server '${serverName}' must return a JSON object with string key-value pairs`;
    case "non_string_value":
      return `headersHelper for MCP server '${serverName}' returned a non-string header value`;
  }
}
//@ chunk-g2rygg7v.js:9874-10275 placement
/**
 * 计算 MCP 服务器请求头（静态头、环境变量、headersHelper）。
 */
async function getMcpServerHeaders(serverName, config) {
  let { staticHeaders, missingVars } = runWithPluginWriteScope(config, () =>
    expandEnvVarsInString(config.headers),
  );
  if (missingVars.length > 0)
    logMCPDebug(
      serverName,
      `Header values reference unset environment variables: ${uniq(missingVars).join(", ")}`,
    );
  let helperHeaders = (await getMcpHeadersFromHelper(serverName, config)) || {};
  let headers = {
    ...staticHeaders,
    ...helperHeaders,
  };
  if (
    isMcpAppsHost() &&
    URL.parse(config.url)?.hostname === "api.githubcopilot.com" &&
    !Object.keys(headers).some((key) => key.toLowerCase() === "x-mcp-features")
  )
    headers["X-MCP-Features"] = "mcp_apps_disable_form_deferral";
  return headers;
}
//@ chunk-g2rygg7v.js:10275-10283 placement
/**
 * 重定向时最多重试次数（5）。
 */
var MAX_REDIRECTS = 5;
//@ chunk-g2rygg7v.js:10283-10773 placement
/**
 * 包装 fetch：按需附加 MCP 动态头并处理重试。
 */
function wrapFetchWithHeaders(serverName, serverConfig, authFetch) {
  let dynamicHeadersPromise;
  return async (input, init) => {
    let isGet = (init?.method ?? "GET").toUpperCase() === "GET";
    let currentUrl = input;
    for (let idx = 0; ; idx++) {
      if (!canAttachDynamicHeaders(serverConfig, currentUrl)) return authFetch(currentUrl, init);
      dynamicHeadersPromise ??= buildDynamicHeaders(serverName, serverConfig);
      let headers = new Headers(await dynamicHeadersPromise);
      new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
      let response = await authFetch(currentUrl, {
        ...init,
        headers,
        redirect: "manual",
      });
      let location = response.headers.get("location");
      if (!(response.status >= 300 && response.status < 400) || !location || idx === MAX_REDIRECTS)
        return response;
      let nextUrl = new URL(location, currentUrl);
      if (
        !(isGet
          ? nextUrl.protocol === "https:" || nextUrl.protocol === "http:"
          : (response.status === 307 || response.status === 308) &&
            canAttachDynamicHeaders(serverConfig, nextUrl))
      )
        return response;
      currentUrl = nextUrl;
    }
  };
}
//@ chunk-g2rygg7v.js:10773-10849 placement
/**
 * 给请求附加动态请求头（仅同源且有配置时）。
 */
async function dynamicHeadersForRequest(serverName, serverConfig, url) {
  return canAttachDynamicHeaders(serverConfig, url)
    ? Object.fromEntries(await buildDynamicHeaders(serverName, serverConfig))
    : {};
}
//@ chunk-g2rygg7v.js:10849-10947 placement
/**
 * 返回重定向守卫：跨源重定向直接报错。
 */
function sameOriginRedirectGuard(endpoint) {
  return (requestOptions) => {
    if (!sameOrigin(urlFromRequestOptions(requestOptions), endpoint))
      throw Error("Refused a redirect to another origin");
  };
}
//@ chunk-g2rygg7v.js:10947-11023 placement
/**
 * 判断能否给该请求加动态头（有 headers 或 headersHelper 且同源）。
 */
function canAttachDynamicHeaders(serverConfig, url) {
  return (
    (!!serverConfig.headers || !!serverConfig.headersHelper) && sameOrigin(String(url), serverConfig.url)
  );
}
//@ chunk-g2rygg7v.js:11023-11192 placement
async function buildDynamicHeaders(serverName, serverConfig) {
  let headers = new Headers();
  for (let [key, value] of Object.entries(await getMcpServerHeaders(serverName, serverConfig)))
    headers.set(key, value);
  headers.delete("authorization");
  recordPresentedHeaderSecrets(serverConfig.headers, Object.fromEntries(headers));
  return headers;
}
//@ chunk-g2rygg7v.js:11192-11529 placement
/**
 * MCP 服务器遥测字段（作用域、插件来源）。
 */
function mcpServerTelemetry(serverConfig, redirectUri) {
  let pluginSource = typeof serverConfig.pluginSource === "string" ? serverConfig.pluginSource : undefined;
  return {
    scope: fromEnumOpt(ConfigScopeSchema().safeParse(serverConfig.scope).data),
    isPlugin: serverConfig.pluginSource !== undefined,
    plugin_marketplace_kind: fromEnumOpt(
      pluginSource === undefined
        ? undefined
        : (marketplaceOf(pluginSource) ??
            (marketplaceSuffix(pluginSource) === BUILTIN ? "builtin" : "marketplace")),
    ),
    has_config_client_id: Boolean(serverConfig.oauth?.clientId),
    redirect_kind: fromEnum(redirectUri ? "custom" : "loopback"),
  };
}
//@ chunk-16jhn3ak.js:441-476 fingerprint = isMcpServerFromProjectOrLocalSettings (1)
/**
 * 设置层级名单 ["project","local","user"]：v$s = (kind) => !bMr.includes(kind)，用来判断某个 kind 是否属于这三层设置；导出为 bMr。
 */
var MCP_SETTINGS_SCOPE_KINDS = ["project", "local", "user"];
export {
  MCP_SETTINGS_SCOPE_KINDS,
  getMcpServerHeaders,
  sameOriginRedirectGuard,
  wrapFetchWithHeaders,
  dynamicHeadersForRequest,
  mcpServerTelemetry,
};
