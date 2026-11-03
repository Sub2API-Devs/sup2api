/**
 * cli/handlers/mcp.tsx
 *
 * claude mcp 子命令处理器：add/remove/list/get/add-json/add-from-claude-desktop/serve/reset-project-choices、健康检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/mcp.tsx
 * pieces: chunk-dcmhvw5a.js (1), chunk-h2rjy0z4.js (21)
 * attribution: fingerprint 6, sole-consumer 7, layout 6, callgraph-fingerprint 1, affinity 2
 */
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  getErrnoCode,
} from "../../utils/errors.js";
import { sanitizeErrorDetail } from "../../services/api/deferredToolsState.js";
import { redactMcpErrorDetail, matchesOriginalConfig } from "../../services/mcp/mcpServerOrigin.js";
import {
  mcpDialBlockCause,
  MCP_SETTINGS_SCOPES,
  getMcpConfigsByScope,
  getSettingsMcpConfigByName,
  removeMcpConfig,
  readRawMcpJsonServersFromCwd,
  redactManagedMcpServerConfig,
  getAllMcpConfigs,
  isMcpServerDisabled,
  MCP_SETTINGS_SCOPE_SET,
  addMcpConfig,
  doesEnterpriseMcpConfigExist,
  isMcpServerAllowedByPolicy,
} from "../../services/mcp/config.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { mcpGateError } from "../../services/mcp/mcpToggleMessages.js";
import { listMcpTools } from "../../services/mcp/mcpWireUtils.js";
import { isUnconfiguredFailure } from "../../services/mcp/redactMcpErrors.js";
import { formatMcpHealthError as formatMcpHealthError_2 } from "../../components/mcp/utils/reconnectHelpers.js";
import { logForDebugging } from "../../utils/debug.js";
import { isMcpServerLoggableInAnalytics } from "../../services/analytics/metadata.js";
import {
  ensureConfigScope,
  describeMcpConfigFilePath,
  getScopeLabel,
  isStdioConfig,
  getProjectMcpServerStatus,
} from "../../services/mcp/utils.js";
import { logEventAsync } from "../../services/analytics/index.js";
import { mcpNameForAnalytics_GATE_EVALUATED, fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import {
  getCurrentProjectConfig,
  getGlobalConfig,
  deleteCurrentProjectConfigFields,
} from "../../utils/config.js";
import { awaitMcpPolicyColdStart } from "../../services/mcp/mcpPolicyColdStart.js";
import { isManagedConfigScope, McpServerConfigSchema } from "../../services/mcp/types.js";
import { cliErrorAfterAnalyticsFlush, cliOkAfterAnalyticsFlush, printCliError, cliError } from "../exit.js";
import { logFeatureBadAsync, logFeatureOkAsync } from "../../services/analytics/featureTelemetry.js";
import { formatUnknownMcpServerHint, formatMcpServerNotFoundMessage } from "./mcpHints.js";
import { uniq } from "../../utils/collections.js";
import { claudeCommand } from "../../utils/worktreeResumeHint.js";
import { renderAndRun, RenderOnceAndExit } from "../../utils/staticRender.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { normalizeEnvRefs } from "../../services/mcp/envExpansion.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { redactSecretsDeep } from "../../services/teamMemorySync/secretScanner.js";
import { mcpTransportType } from "../../services/mcp/mcpServerEndpoint.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Qr, fo } from "../../../vendor/react/cjs/react.production.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { McpParsingWarnings } from "../../components/mcp/McpParsingWarnings.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { safeParseJSON } from "../../utils/json.js";
import { getPlatform } from "../../utils/platform.js";
import { render } from "../../ink/hooks/useTerminalHooks.js";
import { AppRoot } from "../../components/AppRoot.js";
import { MCPServerDesktopImportDialog } from "../../components/MCPServerDesktopImportDialog.js";
import { flushAnalyticsSinks } from "../../services/analytics/flushSinks.js";
import {
  getSettingsForSourceForUpkeep,
  getLocalSettingsValidationErrors,
  updateSettingsForSource,
} from "../../utils/settings/settings.js";
import { blockingLocalSettingsErrors, blockingSettingsErrors } from "../../utils/settings/settingsNotices.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { collectProjectMcpServerNames } from "../../services/mcpServerApproval.js";
import { formatMcpServerLabel } from "../../utils/plugins/lspPluginIntegration.js";

//@ chunk-h2rjy0z4.js:20032-20063 sole-consumer
function isNotNull(v) {
  return v !== null;
}
//@ chunk-h2rjy0z4.js:20063-20115 sole-consumer
function mcpModulesChunk_2() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-h2rjy0z4.js:20115-20156 sole-consumer
function mcpAuthModule() {
  return mcpModulesChunk_2().mcpAuthModule();
}
//@ chunk-h2rjy0z4.js:20156-20200 sole-consumer
function mcpClientModule_4() {
  return mcpModulesChunk_2().mcpClientModule();
}
//@ chunk-h2rjy0z4.js:20200-20253 sole-consumer
function mcpListAuthErrorModule() {
  return mcpModulesChunk_2().mcpIsListAuthErrorModule();
}
//@ chunk-h2rjy0z4.js:20253-20523 sole-consumer
function formatMcpHealthError(serverName, config, error) {
  let issues = error?.issues;
  let l = errorMessage(error);
  if (Array.isArray(issues) && issues.length > 0) {
    let a = issues[0];
    let f = typeof a.message === "string" ? a.message : l;
    let i = Array.isArray(a.path) && a.path.length > 0 ? ` (at ${a.path.join(".")})` : "";
    let _ = issues.length > 1 ? ` (+${issues.length - 1} more)` : "";
    l = f + i + _;
  }
  return sanitizeErrorDetail(redactMcpErrorDetail(serverName, config, l));
}
//@ chunk-h2rjy0z4.js:20523-21290 sole-consumer
async function checkMcpServerHealth(serverName, config, p) {
  try {
    let u = mcpDialBlockCause(serverName, config);
    if (u)
      return {
        status:
          u === "project-approval"
            ? PENDING_APPROVAL_STATUS
            : `${figures_default.cross} ${mcpGateError(u, serverName, config).error}`,
      };
    let l = await mcpClientModule_4().connectToServer(serverName, config, undefined, p);
    if (l.type === "connected") {
      if (l.capabilities.tools)
        try {
          await listMcpTools(l, {
            timeout: 5000,
          });
        } catch (error) {
          if (mcpListAuthErrorModule().isListAuthError(error))
            return {
              status: "! Needs authentication",
            };
          return {
            status: "! Connected \xB7 tools fetch failed",
            issue: formatMcpHealthError(serverName, config, error),
          };
        }
      return {
        status: `${figures_default.tick} Connected`,
      };
    } else if (l.type === "needs-auth")
      return {
        status: "! Needs authentication",
      };
    else if (isUnconfiguredFailure(l))
      return {
        status: "- Not configured",
      };
    else if (l.type === "failed") {
      let a = formatMcpHealthError_2(l);
      return {
        status: `${figures_default.cross} Failed to connect`,
        ...(a !== "" && {
          issue: a,
        }),
      };
    } else
      return {
        status: `${figures_default.cross} Failed to connect`,
      };
  } catch (error) {
    return {
      status: `${figures_default.cross} Connection error`,
    };
  }
}
//@ chunk-h2rjy0z4.js:21290-23358 fingerprint = mcpRemoveHandler (0.333)
/**
 * claude mcp remove：按作用域删除服务器并清理其安全存储里的认证缓存。
 */
async function mcpRemoveHandler(m, name, p, u) {
  let serverBeforeRemoval = null;
  let a = (scope) => {
    let found = MCP_SETTINGS_SCOPES.find((h) => h === scope);
    serverBeforeRemoval = found ? (getMcpConfigsByScope(found).servers[name] ?? null) : null;
  };
  let cleanupSecureStorage = async () => {
    await mcpClientModule_4().removeMcpAuthCacheEntry(name, u);
    if (serverBeforeRemoval && (serverBeforeRemoval.type === "sse" || serverBeforeRemoval.type === "http"))
      try {
        await mcpAuthModule().clearServerTokensFromLocalStorage(name, serverBeforeRemoval);
        await mcpAuthModule().clearMcpClientConfig(name, serverBeforeRemoval);
      } catch (error) {
        logForDebugging(`mcp remove: secure-storage cleanup for "${name}" failed: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
  };
  let i;
  try {
    let g = isMcpServerLoggableInAnalytics(name, getSettingsMcpConfigByName(name) ?? undefined);
    if (p.scope) {
      let scope = ensureConfigScope(p.scope);
      await logEventAsync("tengu_mcp_delete", {
        name: mcpNameForAnalytics_GATE_EVALUATED(name, g),
        scope: fromEnum(scope),
      });
      a(scope);
      await removeMcpConfig(name, scope, u);
      await cleanupSecureStorage();
      i = scope;
    } else {
      let projectConfig = getCurrentProjectConfig();
      let globalConfig = getGlobalConfig();
      let x = await readRawMcpJsonServersFromCwd().catch((error) => {
        if (
          error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
          getErrnoCode(error) !== undefined
        )
          throw error;
        return {};
      });
      let mcpJsonExists = Object.hasOwn(x, name);
      let scopes = [];
      if (projectConfig.mcpServers?.[name]) scopes.push("local");
      if (mcpJsonExists) scopes.push("project");
      if (globalConfig.mcpServers?.[name]) scopes.push("user");
      if (scopes.length === 0) {
        await awaitMcpPolicyColdStart({
          hasDynamicMcpConfig: false,
        });
        let scope = getSettingsMcpConfigByName(name)?.scope;
        if (scope && isManagedConfigScope(scope))
          return cliErrorAfterAnalyticsFlush(
            `MCP server "${name}" is provided by your organization (${scope === "managed" ? "managed settings" : describeMcpConfigFilePath("enterprise")}) and cannot be removed locally.`,
          );
        let E = [
          ...Object.keys(projectConfig.mcpServers ?? {}),
          ...Object.keys(x),
          ...Object.keys(globalConfig.mcpServers ?? {}),
        ];
        await logFeatureBadAsync("cli_mcp_remove", "cli_mcp_remove_not_found");
        return cliErrorAfterAnalyticsFlush(formatUnknownMcpServerHint(name, uniq(E)));
      } else if (scopes.length === 1) {
        let scope = scopes[0];
        await logEventAsync("tengu_mcp_delete", {
          name: mcpNameForAnalytics_GATE_EVALUATED(name, g),
          scope: fromEnum(scope),
        });
        a(scope);
        await removeMcpConfig(name, scope, u);
        await cleanupSecureStorage();
        i = scope;
      } else {
        process.stderr.write(`MCP server "${name}" exists in multiple scopes:
`);
        scopes.forEach((scope) => {
          process.stderr.write(`  - ${getScopeLabel(scope)} (${describeMcpConfigFilePath(scope)})
`);
        });
        let filtered = scopes
          .map((scope) => claudeCommand("mcp remove", name, `-s ${scope}`))
          .filter((E) => E !== null);
        if (filtered.length > 0) {
          process.stderr.write(`
To remove from a specific scope, use:
`);
          filtered.forEach((E) =>
            process.stderr.write(`  ${E}
`),
          );
        } else
          process.stderr.write(`
Specify a scope with -s to remove from a specific one.
`);
        await logFeatureBadAsync("cli_mcp_remove", "cli_mcp_remove_ambiguous_scope");
        return cliErrorAfterAnalyticsFlush();
      }
    }
  } catch (error) {
    await logFeatureBadAsync("cli_mcp_remove", "cli_mcp_remove_failed");
    return cliErrorAfterAnalyticsFlush(errorMessage(error));
  }
  await logFeatureOkAsync("cli_mcp_remove");
  let _ = p.scope ? name : `"${name}"`;
  await renderAndRun(
    m,
    jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          children: ["Removed MCP server ", _, " from ", i, " config"],
        }),
        jsxProd_default_2(Text, {
          children: ["File modified: ", describeMcpConfigFilePath(i)],
        }),
      ],
    }),
  );
}
//@ chunk-h2rjy0z4.js:23358-23482 layout
function redactEnvRefs(m) {
  let o = (p) =>
    typeof p === "string"
      ? normalizeEnvRefs(p)
      : Array.isArray(p)
        ? p.map(o)
        : p && typeof p === "object"
          ? xr(p, o)
          : p;
  return o(m);
}
//@ chunk-h2rjy0z4.js:23482-23822 layout
function redactServerConfig(m) {
  let o = redactSecretsDeep(m);
  let p = mcpTransportType(m);
  if ("url" in o)
    return {
      ...o,
      url: p,
      ...("headers" in o &&
        o.headers && {
          headers: Object.fromEntries(Object.keys(o.headers).map((key) => [key, "[REDACTED]"])),
        }),
    };
  if ("command" in o)
    return {
      ...o,
      command: p,
      ...(o.args && {
        args: [],
      }),
      ...("env" in o &&
        o.env && {
          env: Object.fromEntries(Object.keys(o.env).map((key) => [key, "[REDACTED]"])),
        }),
    };
  return o;
}
//@ chunk-h2rjy0z4.js:23822-24167 layout
function toDisplayServerConfigs(servers) {
  let o = new Map();
  let p = {};
  for (let [key, value] of Object.entries(servers)) {
    let found = MCP_SETTINGS_SCOPES.find((f) => f === value.scope);
    if (found !== undefined) {
      let f = o.get(found);
      if (!f) {
        f = getMcpConfigsByScope(found, {
          expandVars: false,
        }).servers;
        o.set(found, f);
      }
      let original = f[key];
      let _ =
        original && matchesOriginalConfig(original, value)
          ? redactEnvRefs(original)
          : redactServerConfig(value);
      if (_.scope !== "managed") {
        p[key] = _;
        continue;
      }
      let g = redactSecretsDeep(_);
      p[key] = "url" in g ? redactManagedMcpServerConfig(g, _.scope) : g;
    } else p[key] = value.type === "ws" ? redactServerConfig(value) : redactSecretsDeep(value);
  }
  return p;
}
//@ chunk-h2rjy0z4.js:24167-24497 layout
function formatServerStatusLine({ name, server, status, issue }) {
  let l = issue ? `${status} \u2014 ${issue}` : status;
  if (isRemoteTransport(server)) return `${name}: ${server.url} (${server.type.toUpperCase()}) - ${l}`;
  if (server.type === "claudeai-proxy") return `${name}: ${server.url} - ${l}`;
  if (!server.type || server.type === "stdio") {
    let args = Array.isArray(server.args) ? server.args : [];
    return `${name}: ${server.command} ${args.join(" ")} - ${l}`;
  }
  return null;
}
//@ chunk-h2rjy0z4.js:24497-24848 layout
function ServerStatusList(props) {
  let u = w(10);
  let { promise } = props;
  let p = Qr(promise);
  let l;
  let a;
  let children;
  if (u[0] !== p) {
    let mapped = p.map(formatServerStatusLine).filter(isNotNull).map(replaceControlChars);
    a = RenderOnceAndExit;
    l = Text;
    children = mapped.join(`
`);
    u[0] = p;
    u[1] = l;
    u[2] = a;
    u[3] = children;
  } else {
    l = u[1];
    a = u[2];
    children = u[3];
  }
  let children_2;
  if (u[4] !== l || u[5] !== children) {
    children_2 = jsxProd_default(l, {
      children,
    });
    u[4] = l;
    u[5] = children;
    u[6] = children_2;
  } else children_2 = u[6];
  let g;
  if (u[7] !== a || u[8] !== children_2) {
    g = jsxProd_default(a, {
      children: children_2,
    });
    u[7] = a;
    u[8] = children_2;
    u[9] = g;
  } else g = u[9];
  return g;
}
//@ chunk-h2rjy0z4.js:24848-25033 layout
var PENDING_APPROVAL_STATUS = "\u23F8 Pending approval (run `claude` to approve)";
var REJECTED_STATUS = `${figures_default.cross} Rejected (see disabledMcpjsonServers in settings)`;
var DISABLED_FOR_PROJECT_STATUS = "\u2298 Disabled for this project (re-enable via /mcp)";
//@ chunk-h2rjy0z4.js:25033-25903 fingerprint = mcpListHandler (0.423)
/**
 * claude mcp list：列出全部 MCP 服务器并逐个做健康检查。
 */
async function mcpListHandler(m, o, credentials) {
  await logEventAsync("tengu_mcp_list", {});
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: false,
  });
  let { servers, pendingProjectServers } = await getAllMcpConfigs({
    includePendingProjectServers: true,
    storageV5: o,
    credentials,
  });
  await logFeatureOkAsync("cli_mcp_list");
  let a = jsxProd_default(McpParsingWarnings, {});
  if (Object.keys(servers).length === 0) {
    await renderAndRun(
      m,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            children: "No MCP servers configured. Use `claude mcp add` to add a server.",
          }),
          a,
        ],
      }),
    );
    await gracefulShutdown(0);
    return;
  }
  let displayServerConfigs = toDisplayServerConfigs(servers);
  let promise = pMap(
    Object.entries(servers),
    async ([_, g]) => {
      let args = pendingProjectServers.has(_)
        ? {
            status: PENDING_APPROVAL_STATUS,
          }
        : isMcpServerDisabled(_)
          ? {
              status: DISABLED_FOR_PROJECT_STATUS,
            }
          : await checkMcpServerHealth(_, g, o);
      return {
        name: _,
        server: displayServerConfigs[_] ?? redactServerConfig(g),
        status: args.status,
        ...(args.issue !== undefined && {
          issue: args.issue,
        }),
      };
    },
    {
      concurrency: mcpClientModule_4().getMcpServerConnectionBatchSize(),
    },
  );
  m.render(
    jsxProd_default(fo, {
      fallback: jsxProd_default_2(Text, {
        children: [
          "Checking MCP server health\u2026",
          `

`,
        ],
      }),
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(ServerStatusList, {
            promise,
          }),
          a,
        ],
      }),
    }),
  );
  await m.waitUntilExit();
  await gracefulShutdown(0);
}
//@ chunk-h2rjy0z4.js:25903-28016 fingerprint = mcpGetHandler (0.567)
/**
 * claude mcp get <name>：单个服务器的配置、作用域与连接状态（密钥脱敏）。
 */
async function mcpGetHandler(m, o, p, credentials) {
  await logEventAsync("tengu_mcp_get", {
    name: mcpNameForAnalytics_GATE_EVALUATED(
      o,
      isMcpServerLoggableInAnalytics(o, getSettingsMcpConfigByName(o) ?? undefined),
    ),
  });
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: false,
  });
  let { servers, pendingProjectServers, rejectedProjectServers } = await getAllMcpConfigs({
    includePendingProjectServers: true,
    includeRejectedProjectServers: true,
    storageV5: p,
    credentials,
  });
  let config = servers[o] ?? null;
  let _ = pendingProjectServers.has(o) ? "pending" : rejectedProjectServers.has(o) ? "rejected" : null;
  if (!config) {
    await logFeatureBadAsync("cli_mcp_get", "cli_mcp_get_not_found");
    let filtered = Object.keys(servers).filter(
      (key) => !pendingProjectServers.has(key) && !rejectedProjectServers.has(key),
    );
    return cliErrorAfterAnalyticsFlush(
      formatMcpServerNotFoundMessage(o, filtered, pendingProjectServers.size > 0),
    );
  }
  let g =
    _ === "pending"
      ? {
          status: PENDING_APPROVAL_STATUS,
        }
      : _ === "rejected"
        ? {
            status: REJECTED_STATUS,
          }
        : isMcpServerDisabled(o)
          ? {
              status: DISABLED_FOR_PROJECT_STATUS,
            }
          : await checkMcpServerHealth(o, config, p);
  let config_2 =
    isStdioConfig(config) && !MCP_SETTINGS_SCOPE_SET.has(config.scope)
      ? redactServerConfig(config)
      : (toDisplayServerConfigs({
          [o]: config,
        })[o] ?? redactServerConfig(config));
  let x = [
    `${o}:`,
    `  Scope: ${getScopeLabel(config.scope)}`,
    `  Status: ${g.status}`,
    ...(g.issue ? [`  Issue: ${g.issue}`] : []),
  ];
  if (isRemoteTransport(config) && isRemoteTransport(config_2)) {
    x.push(`  Type: ${config.type}`);
    x.push(`  URL: ${config_2.url}`);
    if (config_2.headers) {
      x.push("  Headers:");
      for (let [key, value] of Object.entries(config_2.headers)) x.push(`    ${key}: ${value}`);
    }
    if (config.type !== "ws" && (config.oauth?.clientId || config.oauth?.callbackPort)) {
      let E = [];
      if (config.oauth.clientId) {
        E.push("client_id configured");
        if ((await mcpAuthModule().getMcpClientConfig(o, config))?.clientSecret)
          E.push("client_secret configured");
      }
      if (config.oauth.callbackPort) E.push(`callback_port ${config.oauth.callbackPort}`);
      x.push(`  OAuth: ${E.join(", ")}`);
    }
  } else if (isStdioConfig(config) && isStdioConfig(config_2)) {
    x.push("  Type: stdio");
    x.push(`  Command: ${config_2.command}`);
    let args = Array.isArray(config_2.args) ? config_2.args : [];
    x.push(`  Args: ${args.join(" ")}`);
    if (config_2.env) {
      x.push("  Environment:");
      for (let [key, value] of Object.entries(config_2.env)) x.push(`    ${key}=${value}`);
    }
  }
  if (config.timeout !== undefined)
    x.push(
      `  Timeout: ${config.timeout}ms${config.timeout < 1000 ? " (ignored: below 1000ms minimum)" : ""}`,
    );
  let M =
    config.scope === "local" || config.scope === "project" || config.scope === "user"
      ? claudeCommand("mcp remove", o, `-s ${config.scope}`)
      : null;
  let N = null;
  if (M) N = `To remove this server, run: ${M}`;
  else if (
    config.scope === "user" ||
    config.scope === "project" ||
    config.scope === "local" ||
    config.scope === "enterprise"
  )
    N = `To remove this server, edit ${describeMcpConfigFilePath(config.scope)}`;
  else if (config.scope === "managed")
    N = "This server is provided by your organization's managed settings and cannot be removed locally.";
  if (N) {
    x.push("");
    x.push(N);
  }
  await logFeatureOkAsync("cli_mcp_get");
  await renderAndRun(
    m,
    jsxProd_default(Text, {
      children: x.map(replaceControlChars).join(`
`),
    }),
  );
  await gracefulShutdown(0);
}
//@ chunk-h2rjy0z4.js:28016-29211 fingerprint = mcpAddJsonHandler (0.498)
/**
 * claude mcp add-json：从 JSON 添加服务器（可带 client secret）。
 */
async function mcpAddJsonHandler(m, o, p, u, l) {
  let a;
  let f;
  try {
    a = ensureConfigScope(u.scope);
    let parsedJson = safeParseJSON(p, false);
    if (parsedJson === null)
      logForDebugging("mcp add-json: user-provided JSON was empty, invalid, or null", {
        level: "error",
      });
    let g =
      u.clientSecret &&
      parsedJson &&
      typeof parsedJson === "object" &&
      "type" in parsedJson &&
      (parsedJson.type === "sse" || parsedJson.type === "http" || parsedJson.type === "streamable-http") &&
      "url" in parsedJson &&
      typeof parsedJson.url === "string" &&
      "oauth" in parsedJson &&
      parsedJson.oauth &&
      typeof parsedJson.oauth === "object" &&
      "clientId" in parsedJson.oauth
        ? await mcpAuthModule().readClientSecret()
        : undefined;
    await addMcpConfig(o, parsedJson, a, l);
    let v = McpServerConfigSchema().safeParse(parsedJson);
    f = (v.success ? v.data.type : undefined) ?? "stdio";
    if (
      g &&
      parsedJson &&
      typeof parsedJson === "object" &&
      "type" in parsedJson &&
      (parsedJson.type === "sse" || parsedJson.type === "http" || parsedJson.type === "streamable-http") &&
      "url" in parsedJson &&
      typeof parsedJson.url === "string"
    ) {
      let R = await mcpAuthModule().saveMcpClientSecret(
        o,
        {
          type: parsedJson.type === "sse" ? "sse" : "http",
          url: parsedJson.url,
        },
        g,
      );
      if (!R.success)
        process.stderr
          .write(`Server added, but the client secret could not be stored${R.warning ? ` (${R.warning})` : ""}. Re-run with --client-secret once secure storage is available.
`);
    }
    let h = a;
    let x = f;
    await logEventAsync("tengu_mcp_add", {
      scope: fromEnum(h),
      source: lit("json"),
      type: fromEnum(x),
    });
  } catch (error) {
    await logFeatureBadAsync("cli_mcp_add_json", "cli_mcp_add_json_failed");
    return cliErrorAfterAnalyticsFlush(errorMessage(error));
  }
  await logFeatureOkAsync("cli_mcp_add_json");
  await renderAndRun(
    m,
    jsxProd_default_2(Text, {
      children: ["Added ", f, " MCP server ", o, " to ", a, " config"],
    }),
  );
}
//@ chunk-h2rjy0z4.js:29211-29853 fingerprint = mcpAddFromDesktopHandler (0.737)
/**
 * claude mcp add-from-claude-desktop：从 Claude Desktop 配置导入服务器。
 */
async function mcpAddFromDesktopHandler(options, storageV5) {
  try {
    let scope = ensureConfigScope(options.scope);
    let platform = getPlatform();
    await logEventAsync("tengu_mcp_add", {
      scope: fromEnum(scope),
      platform: fromEnum(platform),
      source: lit("desktop"),
    });
    let { readClaudeDesktopMcpServers } = await import("./chunk-2sv0rqj8.js");
    let servers = await readClaudeDesktopMcpServers();
    if (Object.keys(servers).length === 0) {
      await logFeatureOkAsync("cli_mcp_add_from_desktop");
      return cliOkAfterAnalyticsFlush(
        "No MCP servers found in Claude Desktop configuration or configuration file does not exist.",
      );
    }
    await logFeatureOkAsync("cli_mcp_add_from_desktop");
    let { unmount } = await render(
      jsxProd_default(AppRoot, {
        storageV5,
        children: jsxProd_default(MCPServerDesktopImportDialog, {
          servers,
          scope,
          onDone: () => {
            unmount();
          },
        }),
      }),
      {
        exitOnCtrlC: true,
        patchConsole: false,
      },
    );
  } catch (error) {
    await logFeatureBadAsync("cli_mcp_add_from_desktop", "cli_mcp_add_from_desktop_failed");
    return cliErrorAfterAnalyticsFlush(errorMessage(error));
  }
}
//@ chunk-h2rjy0z4.js:29853-32744 callgraph-fingerprint = mcpResetChoicesHandler (0.217)
/**
 * claude mcp reset-project-choices：重置 .mcp.json 项目服务器的批准/拒绝记录。
 */
async function mcpResetChoicesHandler(m, root) {
  await logEventAsync("tengu_mcp_reset_mcpjson_choices", {});
  if (
    !(await deleteCurrentProjectConfigFields(
      ["enabledMcpjsonServers", "disabledMcpjsonServers", "enableAllProjectMcpServers"],
      root,
    ))
  ) {
    printCliError(
      "Error: Failed to reset project choices: legacy approvals in ~/.claude.json could not be cleared (is the file writable?). Nothing was changed.",
    );
    await logFeatureBadAsync("cli_mcp_reset_choices", "cli_mcp_reset_choices_projectconfig_delete_failed");
    await flushAnalyticsSinks();
    return cliError();
  }
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("localSettings");
  if (
    settingsForSourceForUpkeep
      ? settingsForSourceForUpkeep.enabledMcpjsonServers !== undefined ||
        settingsForSourceForUpkeep.disabledMcpjsonServers !== undefined ||
        settingsForSourceForUpkeep.enableAllProjectMcpServers !== undefined
      : getLocalSettingsValidationErrors().length > 0
  ) {
    if (settingsForSourceForUpkeep !== null && blockingLocalSettingsErrors().length > 0) {
      printCliError(
        "Error: Failed to reset project choices: settings.local.json carries validation warnings, and rewriting it would delete the warned entries \u2014 run `claude doctor` to list them, fix them, then re-run (legacy approvals in ~/.claude.json were cleared; local settings were not)",
      );
      await logFeatureBadAsync("cli_mcp_reset_choices", "cli_mcp_reset_choices_settings_warnings_blocked");
      await flushAnalyticsSinks();
      return cliError();
    }
    let { error } = await updateSettingsForSource(
      "localSettings",
      {
        enabledMcpjsonServers: undefined,
        disabledMcpjsonServers: undefined,
        enableAllProjectMcpServers: undefined,
      },
      undefined,
      root,
    );
    if (error) {
      printCliError(
        `Error: Failed to reset project choices: ${error.message} (legacy approvals in ~/.claude.json were cleared; local settings were not)`,
      );
      await logFeatureBadAsync("cli_mcp_reset_choices", "cli_mcp_reset_choices_settings_write_failed");
      await flushAnalyticsSinks();
      return cliError();
    }
  }
  await logFeatureOkAsync("cli_mcp_reset_choices");
  let a = null;
  try {
    let f = isRestrictedToPluginOnly("mcp");
    if (!doesEnterpriseMcpConfigExist()) {
      let { serverNames, pluginServerNames, rootServers } = await collectProjectMcpServerNames(root);
      let v = (current) => formatMcpServerLabel(current, pluginServerNames.has(current));
      let h = [];
      let x = [];
      let R = 0;
      for (let serverName of serverNames) {
        if (f && !pluginServerNames.has(serverName)) continue;
        let projectMcpServerStatus = getProjectMcpServerStatus(serverName);
        if (projectMcpServerStatus === "approved") {
          if (isMcpServerDisabled(serverName)) continue;
          let E = rootServers[serverName];
          if (E && !isMcpServerAllowedByPolicy(serverName, E)) continue;
          h.push(v(serverName));
        } else if (projectMcpServerStatus === "rejected") x.push(v(serverName));
        else R++;
      }
      a = {
        autoApprovedServers: h,
        stillRejectedServers: x,
        pendingCount: R,
        gatingErrors: blockingSettingsErrors().length,
      };
    }
  } catch (error) {
    logForDebugging(`mcp reset-project-choices: post-reset disclosure scan failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    a = null;
  }
  m.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            children:
              "Project-scoped (.mcp.json) server approvals and rejections stored for this project have been reset.",
          }),
          a &&
            a.autoApprovedServers.length > 0 &&
            jsxProd_default(Text, {
              children: describeServerList(
                a.autoApprovedServers,
                "is still approved by other settings and will connect automatically without prompting.",
                "are still approved by other settings and will connect automatically without prompting.",
              ),
            }),
          a &&
            a.stillRejectedServers.length > 0 &&
            jsxProd_default(Text, {
              children: describeServerList(
                a.stillRejectedServers,
                "remains rejected by other settings and will not prompt.",
                "remain rejected by other settings and will not prompt.",
              ),
            }),
          a &&
            a.pendingCount > 0 &&
            (a.gatingErrors > 0
              ? jsxProd_default(Text, {
                  children:
                    "Settings errors are currently blocking the approval prompt \u2014 run `claude doctor` to list them, fix them, then restart Claude Code to be prompted.",
                })
              : jsxProd_default(Text, {
                  children: "You will be prompted for approval next time you start Claude Code.",
                })),
        ],
      }),
    }),
  );
  await m.waitUntilExit();
}
//@ chunk-h2rjy0z4.js:32744-32854 affinity
function describeServerList(m, o, p) {
  return m.length === 1 ? `1 server (${m[0]}) ${o}` : `${m.length} servers (${m.join(", ")}) ${p}`;
}
//@ chunk-h2rjy0z4.js:32854-33032 affinity = expandEnvVars (0.913)
function isRemoteTransport(config) {
  switch (config.type) {
    case "sse":
    case "http":
    case "ws":
      return true;
    case undefined:
    case "stdio":
    case "sdk":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return false;
    default:
      return false;
  }
}
//@ chunk-dcmhvw5a.js:71956-72082 fingerprint = checkMcpServerHealth (0.518)
/**
 * checkMcpServerHealth（实为缓存行可被替换判定）：cached 行在已有 connected/disabled/needs-auth 时不覆盖。
 */
function checkMcpServerHealth_2(name, server) {
  if (server.type !== "cached" || !name) return true;
  return !(name.type === "connected" || name.type === "disabled" || name.type === "needs-auth");
}
export { checkMcpServerHealth_2 };
