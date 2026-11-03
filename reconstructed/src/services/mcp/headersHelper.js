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
import { $Fo } from "../../tools/AgentTool/agentTrust.js";
import { describeGlobalConfigFile } from "../../utils/env.js";
import { firstGatedTrustDiagnosticFor } from "../../utils/permissions/permissionsLoader.js";
import { writeToStderr } from "../../utils/process.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { logEvent } from "../analytics/index.js";
import { errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { expandEnvVarsInString } from "./envExpansion.js";
import { uniq } from "../../utils/collections.js";
import { DSn } from "./mcpClientCapabilities.js";
import { sameOrigin, urlFromRequestOptions } from "../../utils/network/privateHostCheck.js";
import { recordPresentedHeaderSecrets } from "./discoveryCache.js";
import { fromEnumOpt, fromEnum } from "../analytics/safeMetadata.js";
import { ConfigScopeSchema } from "./types.js";
import { marketplaceOf, marketplaceSuffix } from "../../utils/plugins/pluginIdentifier.js";
import { BUILTIN } from "../../utils/telemetry/pluginTelemetry.js";

/**
 * 代理/配置来源分组：projectSettings/localSettings → repo，plugin/additionalDirectory → thirdParty，user/flag/policy/built-in → operator。
 */
//@ chunk-g2rygg7v.js:6768-7014 placement = AGENT_SOURCE_GROUPS (0.642)
function getAgentSourceTrustGroup(e) {
  switch (e) {
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
      return e;
  }
}
//@ chunk-g2rygg7v.js:7014-7195 layout
function scopeTrustGroup(e) {
  switch (e) {
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
      return e;
  }
}
//@ chunk-g2rygg7v.js:7195-7287 layout
function z(e) {
  return (
    scopeTrustGroup(e.scope) === "repo" ||
    (e.agentSource !== void 0 && getAgentSourceTrustGroup(e.agentSource) === "repo")
  );
}
//@ chunk-g2rygg7v.js:7287-7419 layout
function needsWorkspaceTrust(e, r) {
  if (r !== void 0) return !0;
  if (e.scope === "project") return !0;
  return e.agentSource !== void 0 && getAgentSourceTrustGroup(e.agentSource) !== "operator";
}
/**
 * getMcpHeadersFromHelper：运行配置的 headersHelper 命令取动态请求头。仓库内配置需要已持久化的工作区信任；cwd 为插件根或项目根；注入 CLAUDE_CODE_MCP_SERVER_NAME/URL、CLAUDE_PLUGIN_ROOT。失败返回 null 并记日志。
 */
//@ chunk-g2rygg7v.js:7419-9217 fingerprint = getMcpHeadersFromHelper (0.442)
async function getMcpHeadersFromHelper(serverName, config) {
  if (!config.headersHelper) return null;
  let pluginRoot =
    typeof config.pluginPath === "string" && isAbsolute(config.pluginPath) ? config.pluginPath : void 0;
  try {
    logMCPDebug(serverName, "Executing headersHelper to get dynamic headers");
    let isRepoResident =
        config.scope !== void 0 && z({ scope: config.scope, agentSource: config.agentSource }),
      helperResult = await classifyCommandSourceFailure({
        command: config.headersHelper,
        isRepoResidentConfig: isRepoResident,
        repoResidentOrigin: config.declaredIn,
        cwd:
          pluginRoot ??
          (isRepoResident
            ? (getProjectConfigRoot() ?? config.declaredIn ?? getOriginalCwd())
            : config.scope === "dynamic" && config.agentSource === void 0
              ? (getProjectConfigRoot() ?? getOriginalCwd())
              : getClaudeConfigDir()),
        scrubCredentialEnv: needsWorkspaceTrust(config, pluginRoot),
        pluginId: config.pluginSource,
        readEnvAsStarts: (u) => runWithPluginWriteScope(config, u),
        env: {
          CLAUDE_CODE_MCP_SERVER_NAME: serverName,
          CLAUDE_CODE_MCP_SERVER_URL: config.url,
          ...(pluginRoot && { CLAUDE_PLUGIN_ROOT: pluginRoot }),
        },
      });
    if (helperResult.ok)
      return (
        logMCPDebug(
          serverName,
          `Successfully retrieved ${Object.keys(helperResult.headers).length} headers from headersHelper`,
        ),
        logFeatureOk("mcp_headers_helper"),
        helperResult.headers
      );
    if (helperResult.reason === "missing_trust") {
      let u = ignoresPersistedTrust()
        ? `${PERSISTED_TRUST_IGNORED}, so add the server at user scope or in a managed MCP config instead`
        : isHomeDirectorySession()
          ? "not available to a session rooted at the home directory without a person present (home trust is session-only): run Claude Code interactively here and accept the trust dialog for that session, or work from a project directory you have trusted"
          : `accept the trust dialog here once interactively, or set projects[${$Fo(getWorkspacePersistedTrustKey())}].hasTrustDialogAccepted in ${describeGlobalConfigFile()}`;
      if (
        (logMCPDebug(serverName, `headersHelper not run: this workspace has no persisted trust; ${u}.`),
        getIsNonInteractiveSession() && firstGatedTrustDiagnosticFor(`mcp headersHelper ${serverName}`))
      )
        writeToStderr(`MCP server '${replaceControlChars(serverName)}': headersHelper not run \u2014 this workspace has no persisted trust; ${u}.
`);
      return (
        logEvent("tengu_mcp_headersHelper_missing_trust", {}),
        logFeatureSad("mcp_headers_helper", "missing_trust"),
        null
      );
    }
    throw (
      logFeatureBad("mcp_headers_helper", helperResult.reason),
      Error(headersHelperErrorMessage(serverName, helperResult.reason))
    );
  } catch (error) {
    return (
      logMCPError(serverName, `Error getting headers from headersHelper: ${errorMessage(error)}`),
      logForDebugging(
        `Error getting MCP headers from headersHelper for server '${serverName}': ${errorMessage(error)}`,
        { level: "error" },
      ),
      null
    );
  }
}
/**
 * headersHelper 失败原因的消息。
 */
//@ chunk-g2rygg7v.js:9450-9874 placement
function headersHelperErrorMessage(e, r) {
  switch (r) {
    case "exec_failed":
      return `headersHelper for MCP server '${e}' did not return a valid value`;
    case "parse_failed":
      return `headersHelper for MCP server '${e}' did not return valid JSON`;
    case "non_object":
      return `headersHelper for MCP server '${e}' must return a JSON object with string key-value pairs`;
    case "non_string_value":
      return `headersHelper for MCP server '${e}' returned a non-string header value`;
  }
}
/**
 * 计算 MCP 服务器请求头（静态头、环境变量、headersHelper）。
 */
//@ chunk-g2rygg7v.js:9874-10275 placement
async function getMcpServerHeaders(e, r) {
  let { staticHeaders: staticHeaders, missingVars: missingVars } = runWithPluginWriteScope(r, () =>
    expandEnvVarsInString(r.headers),
  );
  if (missingVars.length > 0)
    logMCPDebug(e, `Header values reference unset environment variables: ${uniq(missingVars).join(", ")}`);
  let s = (await getMcpHeadersFromHelper(e, r)) || {},
    u = { ...staticHeaders, ...s };
  if (
    DSn() &&
    URL.parse(r.url)?.hostname === "api.githubcopilot.com" &&
    !Object.keys(u).some((l) => l.toLowerCase() === "x-mcp-features")
  )
    u["X-MCP-Features"] = "mcp_apps_disable_form_deferral";
  return u;
}
//@ chunk-g2rygg7v.js:10275-10283 placement
var V = 5;
/**
 * 包装 fetch：按需附加 MCP 动态头并处理重试。
 */
//@ chunk-g2rygg7v.js:10283-10773 placement
function wrapFetchWithHeaders(e, r, n) {
  let o;
  return async (s, u) => {
    let l = (u?.method ?? "GET").toUpperCase() === "GET",
      i = s;
    for (let h = 0; ; h++) {
      if (!T(r, i)) return n(i, u);
      o ??= buildDynamicHeaders(e, r);
      let headers = new Headers(await o);
      new Headers(u?.headers).forEach((U, O) => headers.set(O, U));
      let S = await n(i, { ...u, headers: headers, redirect: "manual" }),
        p = S.headers.get("location");
      if (!(S.status >= 300 && S.status < 400) || !p || h === V) return S;
      let _ = new URL(p, i);
      if (
        !(l
          ? _.protocol === "https:" || _.protocol === "http:"
          : (S.status === 307 || S.status === 308) && T(r, _))
      )
        return S;
      i = _;
    }
  };
}
//@ chunk-g2rygg7v.js:10773-10849 placement
async function W4n(e, r, n) {
  return T(r, n) ? Object.fromEntries(await buildDynamicHeaders(e, r)) : {};
}
//@ chunk-g2rygg7v.js:10849-10947 placement
function G4n(e) {
  return (r) => {
    if (!sameOrigin(urlFromRequestOptions(r), e)) throw Error("Refused a redirect to another origin");
  };
}
//@ chunk-g2rygg7v.js:10947-11023 placement
function T(e, r) {
  return (!!e.headers || !!e.headersHelper) && sameOrigin(String(r), e.url);
}
//@ chunk-g2rygg7v.js:11023-11192 placement
async function buildDynamicHeaders(e, r) {
  let headers = new Headers();
  for (let [o, s] of Object.entries(await getMcpServerHeaders(e, r))) headers.set(o, s);
  return (
    headers.delete("authorization"),
    recordPresentedHeaderSecrets(r.headers, Object.fromEntries(headers)),
    headers
  );
}
/**
 * MCP 服务器遥测字段（作用域、插件来源）。
 */
//@ chunk-g2rygg7v.js:11192-11529 placement
function mcpServerTelemetry(e, r) {
  let n = typeof e.pluginSource === "string" ? e.pluginSource : void 0;
  return {
    scope: fromEnumOpt(ConfigScopeSchema().safeParse(e.scope).data),
    isPlugin: e.pluginSource !== void 0,
    plugin_marketplace_kind: fromEnumOpt(
      n === void 0
        ? void 0
        : (marketplaceOf(n) ?? (marketplaceSuffix(n) === BUILTIN ? "builtin" : "marketplace")),
    ),
    has_config_client_id: Boolean(e.oauth?.clientId),
    redirect_kind: fromEnum(r ? "custom" : "loopback"),
  };
}
//@ chunk-16jhn3ak.js:441-476 fingerprint = isMcpServerFromProjectOrLocalSettings (1)
var isMcpServerFromProjectOrLocalSettings = ["project", "local", "user"];

export {
  isMcpServerFromProjectOrLocalSettings,
  getMcpServerHeaders,
  G4n,
  wrapFetchWithHeaders,
  W4n,
  mcpServerTelemetry,
};
