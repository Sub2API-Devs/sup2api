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
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { redactSecretsDeep } from "../../services/teamMemorySync/secretScanner.js";
import { mcpTransportType } from "../../services/mcp/mcpServerEndpoint.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { use, suspenseTypeExport } from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:71956-72082 fingerprint = checkMcpServerHealth (0.518)
/**
 * checkMcpServerHealth（实为缓存行可被替换判定）：cached 行在已有 connected/disabled/needs-auth 时不覆盖。
 */
function checkMcpServerHealth_2(name, server) {
  if (server.type !== "cached" || !name) return true;
  return !(name.type === "connected" || name.type === "disabled" || name.type === "needs-auth");
}
//@ chunk-h2rjy0z4.js:20032-20063 sole-consumer
function isNotNull(value) {
  return value !== null;
}
//@ chunk-h2rjy0z4.js:20063-20115 sole-consumer
function mcpModulesChunk_2() {
  return require("../../services/mcp/emitTripwireEvent.lazy.js");
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
  let detail = errorMessage(error);
  if (Array.isArray(issues) && issues.length > 0) {
    let firstIssue = issues[0];
    let issueMessage = typeof firstIssue.message === "string" ? firstIssue.message : detail;
    let pathSuffix =
      Array.isArray(firstIssue.path) && firstIssue.path.length > 0
        ? ` (at ${firstIssue.path.join(".")})`
        : "";
    let moreSuffix = issues.length > 1 ? ` (+${issues.length - 1} more)` : "";
    detail = issueMessage + pathSuffix + moreSuffix;
  }
  return sanitizeErrorDetail(redactMcpErrorDetail(serverName, config, detail));
}
//@ chunk-h2rjy0z4.js:20523-21290 sole-consumer
async function checkMcpServerHealth(serverName, config, options) {
  try {
    let blockCause = mcpDialBlockCause(serverName, config);
    if (blockCause)
      return {
        status:
          blockCause === "project-approval"
            ? PENDING_APPROVAL_STATUS
            : `${figures_default.cross} ${mcpGateError(blockCause, serverName, config).error}`,
      };
    let result = await mcpClientModule_4().connectToServer(serverName, config, undefined, options);
    if (result.type === "connected") {
      if (result.capabilities.tools)
        try {
          await listMcpTools(result, {
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
    } else if (result.type === "needs-auth")
      return {
        status: "! Needs authentication",
      };
    else if (isUnconfiguredFailure(result))
      return {
        status: "- Not configured",
      };
    else if (result.type === "failed") {
      let issue = formatMcpHealthError_2(result);
      return {
        status: `${figures_default.cross} Failed to connect`,
        ...(issue !== "" && {
          issue,
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
async function mcpRemoveHandler(root, serverName, options, storage) {
  let serverBeforeRemoval = null;
  let recordScopeServer = (scope) => {
    let found = MCP_SETTINGS_SCOPES.find((scopeName) => scopeName === scope);
    serverBeforeRemoval = found ? (getMcpConfigsByScope(found).servers[serverName] ?? null) : null;
  };
  let cleanupSecureStorage = async () => {
    await mcpClientModule_4().removeMcpAuthCacheEntry(serverName, storage);
    if (serverBeforeRemoval && (serverBeforeRemoval.type === "sse" || serverBeforeRemoval.type === "http"))
      try {
        await mcpAuthModule().clearServerTokensFromLocalStorage(serverName, serverBeforeRemoval);
        await mcpAuthModule().clearMcpClientConfig(serverName, serverBeforeRemoval);
      } catch (error) {
        logForDebugging(
          `mcp remove: secure-storage cleanup for "${serverName}" failed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
  };
  let removedScope;
  try {
    let isLoggable = isMcpServerLoggableInAnalytics(
      serverName,
      getSettingsMcpConfigByName(serverName) ?? undefined,
    );
    if (options.scope) {
      let scope = ensureConfigScope(options.scope);
      await logEventAsync("tengu_mcp_delete", {
        name: mcpNameForAnalytics_GATE_EVALUATED(serverName, isLoggable),
        scope: fromEnum(scope),
      });
      recordScopeServer(scope);
      await removeMcpConfig(serverName, scope, storage);
      await cleanupSecureStorage();
      removedScope = scope;
    } else {
      let projectConfig = getCurrentProjectConfig();
      let globalConfig = getGlobalConfig();
      let mcpJsonServers = await readRawMcpJsonServersFromCwd().catch((error) => {
        if (
          error instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
          getErrnoCode(error) !== undefined
        )
          throw error;
        return {};
      });
      let mcpJsonExists = Object.hasOwn(mcpJsonServers, serverName);
      let scopes = [];
      if (projectConfig.mcpServers?.[serverName]) scopes.push("local");
      if (mcpJsonExists) scopes.push("project");
      if (globalConfig.mcpServers?.[serverName]) scopes.push("user");
      if (scopes.length === 0) {
        await awaitMcpPolicyColdStart({
          hasDynamicMcpConfig: false,
        });
        let scope = getSettingsMcpConfigByName(serverName)?.scope;
        if (scope && isManagedConfigScope(scope))
          return cliErrorAfterAnalyticsFlush(
            `MCP server "${serverName}" is provided by your organization (${scope === "managed" ? "managed settings" : describeMcpConfigFilePath("enterprise")}) and cannot be removed locally.`,
          );
        let knownNames = [
          ...Object.keys(projectConfig.mcpServers ?? {}),
          ...Object.keys(mcpJsonServers),
          ...Object.keys(globalConfig.mcpServers ?? {}),
        ];
        await logFeatureBadAsync("cli_mcp_remove", "cli_mcp_remove_not_found");
        return cliErrorAfterAnalyticsFlush(formatUnknownMcpServerHint(serverName, uniq(knownNames)));
      } else if (scopes.length === 1) {
        let scope = scopes[0];
        await logEventAsync("tengu_mcp_delete", {
          name: mcpNameForAnalytics_GATE_EVALUATED(serverName, isLoggable),
          scope: fromEnum(scope),
        });
        recordScopeServer(scope);
        await removeMcpConfig(serverName, scope, storage);
        await cleanupSecureStorage();
        removedScope = scope;
      } else {
        process.stderr.write(`MCP server "${serverName}" exists in multiple scopes:
`);
        scopes.forEach((scope) => {
          process.stderr.write(`  - ${getScopeLabel(scope)} (${describeMcpConfigFilePath(scope)})
`);
        });
        let filtered = scopes
          .map((scope) => claudeCommand("mcp remove", serverName, `-s ${scope}`))
          .filter((commandLine) => commandLine !== null);
        if (filtered.length > 0) {
          process.stderr.write(`
To remove from a specific scope, use:
`);
          filtered.forEach((commandLine) =>
            process.stderr.write(`  ${commandLine}
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
  let displayName = options.scope ? serverName : `"${serverName}"`;
  await renderAndRun(
    root,
    jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Text, {
          children: ["Removed MCP server ", displayName, " from ", removedScope, " config"],
        }),
        jsxProd_default_2(Text, {
          children: ["File modified: ", describeMcpConfigFilePath(removedScope)],
        }),
      ],
    }),
  );
}
//@ chunk-h2rjy0z4.js:23358-23482 layout
function redactEnvRefs(value) {
  let walk = (item) =>
    typeof item === "string"
      ? normalizeEnvRefs(item)
      : Array.isArray(item)
        ? item.map(walk)
        : item && typeof item === "object"
          ? import_mapValues(item, walk)
          : item;
  return walk(value);
}
//@ chunk-h2rjy0z4.js:23482-23822 layout
function redactServerConfig(config) {
  let redacted = redactSecretsDeep(config);
  let transportType = mcpTransportType(config);
  if ("url" in redacted)
    return {
      ...redacted,
      url: transportType,
      ...("headers" in redacted &&
        redacted.headers && {
          headers: Object.fromEntries(Object.keys(redacted.headers).map((key) => [key, "[REDACTED]"])),
        }),
    };
  if ("command" in redacted)
    return {
      ...redacted,
      command: transportType,
      ...(redacted.args && {
        args: [],
      }),
      ...("env" in redacted &&
        redacted.env && {
          env: Object.fromEntries(Object.keys(redacted.env).map((key) => [key, "[REDACTED]"])),
        }),
    };
  return redacted;
}
//@ chunk-h2rjy0z4.js:23822-24167 layout
function toDisplayServerConfigs(servers) {
  let scopeServers = new Map();
  let result = {};
  for (let [key, value] of Object.entries(servers)) {
    let found = MCP_SETTINGS_SCOPES.find((scopeName) => scopeName === value.scope);
    if (found !== undefined) {
      let serversOfScope = scopeServers.get(found);
      if (!serversOfScope) {
        serversOfScope = getMcpConfigsByScope(found, {
          expandVars: false,
        }).servers;
        scopeServers.set(found, serversOfScope);
      }
      let original = serversOfScope[key];
      let displayed =
        original && matchesOriginalConfig(original, value)
          ? redactEnvRefs(original)
          : redactServerConfig(value);
      if (displayed.scope !== "managed") {
        result[key] = displayed;
        continue;
      }
      let redacted = redactSecretsDeep(displayed);
      result[key] = "url" in redacted ? redactManagedMcpServerConfig(redacted, displayed.scope) : redacted;
    } else result[key] = value.type === "ws" ? redactServerConfig(value) : redactSecretsDeep(value);
  }
  return result;
}
//@ chunk-h2rjy0z4.js:24167-24497 layout
function formatServerStatusLine({ name, server, status, issue }) {
  let statusText = issue ? `${status} \u2014 ${issue}` : status;
  if (isRemoteTransport(server))
    return `${name}: ${server.url} (${server.type.toUpperCase()}) - ${statusText}`;
  if (server.type === "claudeai-proxy") return `${name}: ${server.url} - ${statusText}`;
  if (!server.type || server.type === "stdio") {
    let args = Array.isArray(server.args) ? server.args : [];
    return `${name}: ${server.command} ${args.join(" ")} - ${statusText}`;
  }
  return null;
}
//@ chunk-h2rjy0z4.js:24497-24848 layout
function ServerStatusList(props) {
  let $ = useMemoCache(10);
  let { promise } = props;
  let statuses = use(promise);
  let Component;
  let element;
  let children;
  if ($[0] !== statuses) {
    let mapped = statuses.map(formatServerStatusLine).filter(isNotNull).map(replaceControlChars);
    element = RenderOnceAndExit;
    Component = Text;
    children = mapped.join(`
`);
    $[0] = statuses;
    $[1] = Component;
    $[2] = element;
    $[3] = children;
  } else {
    Component = $[1];
    element = $[2];
    children = $[3];
  }
  let children_2;
  if ($[4] !== Component || $[5] !== children) {
    children_2 = jsxProd_default(Component, {
      children,
    });
    $[4] = Component;
    $[5] = children;
    $[6] = children_2;
  } else children_2 = $[6];
  let entry;
  if ($[7] !== element || $[8] !== children_2) {
    entry = jsxProd_default(element, {
      children: children_2,
    });
    $[7] = element;
    $[8] = children_2;
    $[9] = entry;
  } else entry = $[9];
  return entry;
}
//@ chunk-h2rjy0z4.js:24848-25033 layout
var PENDING_APPROVAL_STATUS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REJECTED_STATUS;
var DISABLED_FOR_PROJECT_STATUS;
deferInit("chunk-h2rjy0z4.js:24848", () => {
  PENDING_APPROVAL_STATUS = "\u23F8 Pending approval (run `claude` to approve)";
  REJECTED_STATUS = `${figures_default.cross} Rejected (see disabledMcpjsonServers in settings)`;
  DISABLED_FOR_PROJECT_STATUS = "\u2298 Disabled for this project (re-enable via /mcp)";
});
//@ chunk-h2rjy0z4.js:25033-25903 fingerprint = mcpListHandler (0.423)
/**
 * claude mcp list：列出全部 MCP 服务器并逐个做健康检查。
 */
async function mcpListHandler(root, storage, credentials) {
  await logEventAsync("tengu_mcp_list", {});
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: false,
  });
  let { servers, pendingProjectServers } = await getAllMcpConfigs({
    includePendingProjectServers: true,
    storageV5: storage,
    credentials,
  });
  await logFeatureOkAsync("cli_mcp_list");
  let warnings = jsxProd_default(McpParsingWarnings, {});
  if (Object.keys(servers).length === 0) {
    await renderAndRun(
      root,
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            children: "No MCP servers configured. Use `claude mcp add` to add a server.",
          }),
          warnings,
        ],
      }),
    );
    await gracefulShutdown(0);
    return;
  }
  let displayServerConfigs = toDisplayServerConfigs(servers);
  let promise = pMap(
    Object.entries(servers),
    async ([name, config]) => {
      let args = pendingProjectServers.has(name)
        ? {
            status: PENDING_APPROVAL_STATUS,
          }
        : isMcpServerDisabled(name)
          ? {
              status: DISABLED_FOR_PROJECT_STATUS,
            }
          : await checkMcpServerHealth(name, config, storage);
      return {
        name,
        server: displayServerConfigs[name] ?? redactServerConfig(config),
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
  root.render(
    jsxProd_default(suspenseTypeExport, {
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
          warnings,
        ],
      }),
    }),
  );
  await root.waitUntilExit();
  await gracefulShutdown(0);
}
//@ chunk-h2rjy0z4.js:25903-28016 fingerprint = mcpGetHandler (0.567)
/**
 * claude mcp get <name>：单个服务器的配置、作用域与连接状态（密钥脱敏）。
 */
async function mcpGetHandler(root, name, storage, credentials) {
  await logEventAsync("tengu_mcp_get", {
    name: mcpNameForAnalytics_GATE_EVALUATED(
      name,
      isMcpServerLoggableInAnalytics(name, getSettingsMcpConfigByName(name) ?? undefined),
    ),
  });
  await awaitMcpPolicyColdStart({
    hasDynamicMcpConfig: false,
  });
  let { servers, pendingProjectServers, rejectedProjectServers } = await getAllMcpConfigs({
    includePendingProjectServers: true,
    includeRejectedProjectServers: true,
    storageV5: storage,
    credentials,
  });
  let config = servers[name] ?? null;
  let projectState = pendingProjectServers.has(name)
    ? "pending"
    : rejectedProjectServers.has(name)
      ? "rejected"
      : null;
  if (!config) {
    await logFeatureBadAsync("cli_mcp_get", "cli_mcp_get_not_found");
    let knownNames = Object.keys(servers).filter(
      (key) => !pendingProjectServers.has(key) && !rejectedProjectServers.has(key),
    );
    return cliErrorAfterAnalyticsFlush(
      formatMcpServerNotFoundMessage(name, knownNames, pendingProjectServers.size > 0),
    );
  }
  let health =
    projectState === "pending"
      ? {
          status: PENDING_APPROVAL_STATUS,
        }
      : projectState === "rejected"
        ? {
            status: REJECTED_STATUS,
          }
        : isMcpServerDisabled(name)
          ? {
              status: DISABLED_FOR_PROJECT_STATUS,
            }
          : await checkMcpServerHealth(name, config, storage);
  let config_2 =
    isStdioConfig(config) && !MCP_SETTINGS_SCOPE_SET.has(config.scope)
      ? redactServerConfig(config)
      : (toDisplayServerConfigs({
          [name]: config,
        })[name] ?? redactServerConfig(config));
  let lines = [
    `${name}:`,
    `  Scope: ${getScopeLabel(config.scope)}`,
    `  Status: ${health.status}`,
    ...(health.issue ? [`  Issue: ${health.issue}`] : []),
  ];
  if (isRemoteTransport(config) && isRemoteTransport(config_2)) {
    lines.push(`  Type: ${config.type}`);
    lines.push(`  URL: ${config_2.url}`);
    if (config_2.headers) {
      lines.push("  Headers:");
      for (let [key, value] of Object.entries(config_2.headers)) lines.push(`    ${key}: ${value}`);
    }
    if (config.type !== "ws" && (config.oauth?.clientId || config.oauth?.callbackPort)) {
      let oauthParts = [];
      if (config.oauth.clientId) {
        oauthParts.push("client_id configured");
        if ((await mcpAuthModule().getMcpClientConfig(name, config))?.clientSecret)
          oauthParts.push("client_secret configured");
      }
      if (config.oauth.callbackPort) oauthParts.push(`callback_port ${config.oauth.callbackPort}`);
      lines.push(`  OAuth: ${oauthParts.join(", ")}`);
    }
  } else if (isStdioConfig(config) && isStdioConfig(config_2)) {
    lines.push("  Type: stdio");
    lines.push(`  Command: ${config_2.command}`);
    let args = Array.isArray(config_2.args) ? config_2.args : [];
    lines.push(`  Args: ${args.join(" ")}`);
    if (config_2.env) {
      lines.push("  Environment:");
      for (let [key, value] of Object.entries(config_2.env)) lines.push(`    ${key}=${value}`);
    }
  }
  if (config.timeout !== undefined)
    lines.push(
      `  Timeout: ${config.timeout}ms${config.timeout < 1000 ? " (ignored: below 1000ms minimum)" : ""}`,
    );
  let removeCommand =
    config.scope === "local" || config.scope === "project" || config.scope === "user"
      ? claudeCommand("mcp remove", name, `-s ${config.scope}`)
      : null;
  let removeHint = null;
  if (removeCommand) removeHint = `To remove this server, run: ${removeCommand}`;
  else if (
    config.scope === "user" ||
    config.scope === "project" ||
    config.scope === "local" ||
    config.scope === "enterprise"
  )
    removeHint = `To remove this server, edit ${describeMcpConfigFilePath(config.scope)}`;
  else if (config.scope === "managed")
    removeHint =
      "This server is provided by your organization's managed settings and cannot be removed locally.";
  if (removeHint) {
    lines.push("");
    lines.push(removeHint);
  }
  await logFeatureOkAsync("cli_mcp_get");
  await renderAndRun(
    root,
    jsxProd_default(Text, {
      children: lines.map(replaceControlChars).join(`
`),
    }),
  );
  await gracefulShutdown(0);
}
//@ chunk-h2rjy0z4.js:28016-29211 fingerprint = mcpAddJsonHandler (0.498)
/**
 * claude mcp add-json：从 JSON 添加服务器（可带 client secret）。
 */
async function mcpAddJsonHandler(root, name, json, options, storage) {
  let scope;
  let type;
  try {
    scope = ensureConfigScope(options.scope);
    let parsedJson = safeParseJSON(json, false);
    if (parsedJson === null)
      logForDebugging("mcp add-json: user-provided JSON was empty, invalid, or null", {
        level: "error",
      });
    let clientSecret =
      options.clientSecret &&
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
    await addMcpConfig(name, parsedJson, scope, storage);
    let parsedServer = McpServerConfigSchema().safeParse(parsedJson);
    type = (parsedServer.success ? parsedServer.data.type : undefined) ?? "stdio";
    if (
      clientSecret &&
      parsedJson &&
      typeof parsedJson === "object" &&
      "type" in parsedJson &&
      (parsedJson.type === "sse" || parsedJson.type === "http" || parsedJson.type === "streamable-http") &&
      "url" in parsedJson &&
      typeof parsedJson.url === "string"
    ) {
      let storeResult = await mcpAuthModule().saveMcpClientSecret(
        name,
        {
          type: parsedJson.type === "sse" ? "sse" : "http",
          url: parsedJson.url,
        },
        clientSecret,
      );
      if (!storeResult.success)
        process.stderr
          .write(`Server added, but the client secret could not be stored${storeResult.warning ? ` (${storeResult.warning})` : ""}. Re-run with --client-secret once secure storage is available.
`);
    }
    let loggedScope = scope;
    let loggedType = type;
    await logEventAsync("tengu_mcp_add", {
      scope: fromEnum(loggedScope),
      source: lit("json"),
      type: fromEnum(loggedType),
    });
  } catch (error) {
    await logFeatureBadAsync("cli_mcp_add_json", "cli_mcp_add_json_failed");
    return cliErrorAfterAnalyticsFlush(errorMessage(error));
  }
  await logFeatureOkAsync("cli_mcp_add_json");
  await renderAndRun(
    root,
    jsxProd_default_2(Text, {
      children: ["Added ", type, " MCP server ", name, " to ", scope, " config"],
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
    let { readClaudeDesktopMcpServers } = await import("../../utils/claudeDesktop.js");
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
async function mcpResetChoicesHandler(root, store) {
  await logEventAsync("tengu_mcp_reset_mcpjson_choices", {});
  if (
    !(await deleteCurrentProjectConfigFields(
      ["enabledMcpjsonServers", "disabledMcpjsonServers", "enableAllProjectMcpServers"],
      store,
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
      store,
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
  let disclosure = null;
  try {
    let isPluginOnly = isRestrictedToPluginOnly("mcp");
    if (!doesEnterpriseMcpConfigExist()) {
      let { serverNames, pluginServerNames, rootServers } = await collectProjectMcpServerNames(store);
      let label = (current) => formatMcpServerLabel(current, pluginServerNames.has(current));
      let approved = [];
      let rejected = [];
      let pendingCount = 0;
      for (let serverName of serverNames) {
        if (isPluginOnly && !pluginServerNames.has(serverName)) continue;
        let projectMcpServerStatus = getProjectMcpServerStatus(serverName);
        if (projectMcpServerStatus === "approved") {
          if (isMcpServerDisabled(serverName)) continue;
          let serverConfig = rootServers[serverName];
          if (serverConfig && !isMcpServerAllowedByPolicy(serverName, serverConfig)) continue;
          approved.push(label(serverName));
        } else if (projectMcpServerStatus === "rejected") rejected.push(label(serverName));
        else pendingCount++;
      }
      disclosure = {
        autoApprovedServers: approved,
        stillRejectedServers: rejected,
        pendingCount,
        gatingErrors: blockingSettingsErrors().length,
      };
    }
  } catch (error) {
    logForDebugging(`mcp reset-project-choices: post-reset disclosure scan failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    disclosure = null;
  }
  root.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default(Text, {
            children:
              "Project-scoped (.mcp.json) server approvals and rejections stored for this project have been reset.",
          }),
          disclosure &&
            disclosure.autoApprovedServers.length > 0 &&
            jsxProd_default(Text, {
              children: describeServerList(
                disclosure.autoApprovedServers,
                "is still approved by other settings and will connect automatically without prompting.",
                "are still approved by other settings and will connect automatically without prompting.",
              ),
            }),
          disclosure &&
            disclosure.stillRejectedServers.length > 0 &&
            jsxProd_default(Text, {
              children: describeServerList(
                disclosure.stillRejectedServers,
                "remains rejected by other settings and will not prompt.",
                "remain rejected by other settings and will not prompt.",
              ),
            }),
          disclosure &&
            disclosure.pendingCount > 0 &&
            (disclosure.gatingErrors > 0
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
  await root.waitUntilExit();
}
//@ chunk-h2rjy0z4.js:32744-32854 affinity
function describeServerList(names, singleVerb, pluralVerb) {
  return names.length === 1
    ? `1 server (${names[0]}) ${singleVerb}`
    : `${names.length} servers (${names.join(", ")}) ${pluralVerb}`;
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
export {
  checkMcpServerHealth_2,
  mcpAddFromDesktopHandler,
  mcpAddJsonHandler,
  mcpGetHandler,
  mcpListHandler,
  mcpRemoveHandler,
  mcpResetChoicesHandler,
};
