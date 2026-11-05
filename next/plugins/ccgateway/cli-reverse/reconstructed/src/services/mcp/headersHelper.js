/**
 * services/mcp/headersHelper.ts
 *
 * 并入已有模块：包装 fetch：按需附加 MCP 动态头并处理重试；headersHelper 失败原因的消息等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/headersHelper.ts
 * pieces: chunk-b60e6mnx.js (1), chunk-ge66f009.js (15)
 * attribution: placement 11, layout 4, fingerprint 1
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
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
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
import { scrubbedEnvKeys, expandMcpCredentialEnvVars } from "../../utils/envExpansion.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { isMcpAppsHost } from "./mcpClientCapabilities.js";
import { sameOrigin, urlFromRequestOptions } from "../../utils/network/privateHostCheck.js";
import { recordPresentedHeaderSecrets } from "./discoveryCache.js";
import { fromEnumOpt, fromEnum } from "../analytics/safeMetadata.js";
import { ConfigScopeSchema } from "./types.js";
import { marketplaceOf, marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";

//@ chunk-ge66f009.js:4500-4746 placement (2.1.88 match: AGENT_SOURCE_GROUPS, 0.642)
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
//@ chunk-ge66f009.js:4746-4927 layout
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
//@ chunk-ge66f009.js:4927-5019 layout
/**
 * 判断 scope/agentSource 是否属于仓库可信组。
 */
function isRepoTrustedScope(config) {
  return (
    scopeTrustGroup(config.scope) === "repo" ||
    (config.agentSource !== undefined && getAgentSourceTrustGroup(config.agentSource) === "repo")
  );
}
//@ chunk-ge66f009.js:5019-5151 layout
function needsWorkspaceTrust(config, pluginRoot) {
  if (pluginRoot !== undefined) return true;
  if (config.scope === "project") return true;
  return config.agentSource !== undefined && getAgentSourceTrustGroup(config.agentSource) !== "operator";
}
//@ chunk-ge66f009.js:5151-6948 fingerprint (2.1.88 match: getMcpHeadersFromHelper, 0.443)
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
//@ chunk-ge66f009.js:6948-7202 layout
/**
 * expandEnvVarsInString（实为批量展开 headers）：对 headers 每个值做 ${VAR} 展开（远程目的地模式），返回 {staticHeaders, missingVars}。
 */
function expandHeaderEnvVars(headers) {
  let blankList;
  let staticHeaders = {};
  let headerEntries = [];
  for (let [key, value] of Object.entries(headers ?? {})) {
    if (typeof value === "string" && value.includes("${")) blankList ??= scrubbedEnvKeys();
    let { expanded, missingVars } = expandMcpCredentialEnvVars(value, undefined, undefined, {
      remoteSink: true,
      blankList,
    });
    staticHeaders[key] = expanded;
    headerEntries.push(...missingVars);
  }
  return {
    staticHeaders,
    missingVars: headerEntries,
  };
}
//@ chunk-ge66f009.js:7202-7626 placement
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
//@ chunk-ge66f009.js:7626-8027 placement
/**
 * 计算 MCP 服务器请求头（静态头、环境变量、headersHelper）。
 */
async function getMcpServerHeaders(serverName, config) {
  let { staticHeaders, missingVars } = runWithPluginWriteScope(config, () =>
    expandHeaderEnvVars(config.headers),
  );
  if (missingVars.length > 0)
    logMCPDebug(
      serverName,
      `Header values reference unset environment variables: ${normalizeCaseForComparison_2(missingVars).join(", ")}`,
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
//@ chunk-ge66f009.js:8027-8035 placement
/**
 * 重定向时最多重试次数（5）。
 */
var MAX_REDIRECTS = 5;
//@ chunk-ge66f009.js:8035-8525 placement
/**
 * 包装 fetch：按需附加 MCP 动态头并处理重试。
 */
function wrapFetchWithHeaders(serverName, serverConfig, authFetch) {
  let dynamicHeadersPromise;
  return async (input, init) => {
    let isGet = (init?.method ?? "GET").toUpperCase() === "GET";
    let currentUrl = input;
    for (let k = 0; ; k++) {
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
      if (!(response.status >= 300 && response.status < 400) || !location || k === MAX_REDIRECTS)
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
//@ chunk-ge66f009.js:8525-8601 placement
/**
 * 给请求附加动态请求头（仅同源且有配置时）。
 */
async function dynamicHeadersForRequest(serverName, serverConfig, url) {
  return canAttachDynamicHeaders(serverConfig, url)
    ? Object.fromEntries(await buildDynamicHeaders(serverName, serverConfig))
    : {};
}
//@ chunk-ge66f009.js:8601-8700 placement
/**
 * 返回重定向守卫：跨源重定向直接报错。
 */
function sameOriginRedirectGuard(endpoint) {
  return (requestOptions) => {
    if (!sameOrigin(urlFromRequestOptions(requestOptions), endpoint))
      throw Error("Refused a redirect to another origin");
  };
}
//@ chunk-ge66f009.js:8700-8777 placement
/**
 * 判断能否给该请求加动态头（有 headers 或 headersHelper 且同源）。
 */
function canAttachDynamicHeaders(serverConfig, url) {
  return (
    (!!serverConfig.headers || !!serverConfig.headersHelper) && sameOrigin(String(url), serverConfig.url)
  );
}
//@ chunk-ge66f009.js:8777-8946 placement
async function buildDynamicHeaders(serverName, serverConfig) {
  let headers = new Headers();
  for (let [key, value] of Object.entries(await getMcpServerHeaders(serverName, serverConfig)))
    headers.set(key, value);
  headers.delete("authorization");
  recordPresentedHeaderSecrets(serverConfig.headers, Object.fromEntries(headers));
  return headers;
}
//@ chunk-ge66f009.js:8946-9283 placement
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
//@ chunk-b60e6mnx.js:441-476 placement
/**
 * 设置层级名单 ["project","local","user"]：v$s = (kind) => !bMr.includes(kind)，用来判断某个 kind 是否属于这三层设置；导出为 bMr。
 */
var MCP_SETTINGS_SCOPE_KINDS = ["project", "local", "user"];
export {
  getMcpServerHeaders,
  sameOriginRedirectGuard,
  wrapFetchWithHeaders,
  dynamicHeadersForRequest,
  mcpServerTelemetry,
  MCP_SETTINGS_SCOPE_KINDS,
};
