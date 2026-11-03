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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { mcpGateError } from "../../services/mcp/mcpToggleMessages.js";
import { listMcpTools } from "../../services/mcp/mcpWireUtils.js";
import { YM } from "../../services/mcp/redactMcpErrors.js";
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
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { M1e } from "../../services/mcp/envExpansion.js";
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
import { Cln, blockingSettingsErrors } from "../../utils/settings/settingsNotices.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { collectProjectMcpServerNames } from "../../services/mcpServerApproval.js";
import { formatMcpServerLabel } from "../../utils/plugins/lspPluginIntegration.js";

//@ chunk-h2rjy0z4.js:20032-20063 sole-consumer
function ht(v) {
  return v !== null;
}
//@ chunk-h2rjy0z4.js:20063-20115 sole-consumer
function me() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-h2rjy0z4.js:20115-20156 sole-consumer
function F() {
  return me().mcpAuthModule();
}
//@ chunk-h2rjy0z4.js:20156-20200 sole-consumer
function fe() {
  return me().mcpClientModule();
}
//@ chunk-h2rjy0z4.js:20200-20253 sole-consumer
function at() {
  return me().mcpIsListAuthErrorModule();
}
//@ chunk-h2rjy0z4.js:20253-20523 sole-consumer
function formatMcpHealthError(serverName, config, error) {
  let u = error?.issues,
    l = errorMessage(error);
  if (Array.isArray(u) && u.length > 0) {
    let a = u[0],
      f = typeof a.message === "string" ? a.message : l,
      i = Array.isArray(a.path) && a.path.length > 0 ? ` (at ${a.path.join(".")})` : "",
      _ = u.length > 1 ? ` (+${u.length - 1} more)` : "";
    l = f + i + _;
  }
  return sanitizeErrorDetail(redactMcpErrorDetail(serverName, config, l));
}
//@ chunk-h2rjy0z4.js:20523-21290 sole-consumer
async function checkMcpServerHealth(m, o, p) {
  try {
    let u = mcpDialBlockCause(m, o);
    if (u)
      return {
        status:
          u === "project-approval" ? PENDING_APPROVAL_STATUS : `${re.cross} ${mcpGateError(u, m, o).error}`,
      };
    let connectToServer = await fe().connectToServer(m, o, void 0, p);
    if (connectToServer.type === "connected") {
      if (connectToServer.capabilities.tools)
        try {
          await listMcpTools(connectToServer, { timeout: 5000 });
        } catch (error) {
          if (at().isListAuthError(error)) return { status: "! Needs authentication" };
          return { status: "! Connected \xB7 tools fetch failed", issue: formatMcpHealthError(m, o, error) };
        }
      return { status: `${re.tick} Connected` };
    } else if (connectToServer.type === "needs-auth") return { status: "! Needs authentication" };
    else if (YM(connectToServer)) return { status: "- Not configured" };
    else if (connectToServer.type === "failed") {
      let a = formatMcpHealthError_2(connectToServer);
      return { status: `${re.cross} Failed to connect`, ...(a !== "" && { issue: a }) };
    } else return { status: `${re.cross} Failed to connect` };
  } catch (error) {
    return { status: `${re.cross} Connection error` };
  }
}
/**
 * claude mcp remove：按作用域删除服务器并清理其安全存储里的认证缓存。
 */
//@ chunk-h2rjy0z4.js:21290-23358 fingerprint = mcpRemoveHandler (0.333)
async function mcpRemoveHandler(m, o, p, u) {
  let l = null,
    a = (g) => {
      let found = MCP_SETTINGS_SCOPES.find((h) => h === g);
      l = found ? (getMcpConfigsByScope(found).servers[o] ?? null) : null;
    },
    cleanupSecureStorage = async () => {
      if ((await fe().removeMcpAuthCacheEntry(o, u), l && (l.type === "sse" || l.type === "http")))
        try {
          (await F().clearServerTokensFromLocalStorage(o, l), await F().clearMcpClientConfig(o, l));
        } catch (error) {
          logForDebugging(`mcp remove: secure-storage cleanup for "${o}" failed: ${errorMessage(error)}`, {
            level: "warn",
          });
        }
    },
    i;
  try {
    let g = isMcpServerLoggableInAnalytics(o, getSettingsMcpConfigByName(o) ?? void 0);
    if (p.scope) {
      let scope = ensureConfigScope(p.scope);
      (await logEventAsync("tengu_mcp_delete", {
        name: mcpNameForAnalytics_GATE_EVALUATED(o, g),
        scope: fromEnum(scope),
      }),
        a(scope),
        await removeMcpConfig(o, scope, u),
        await cleanupSecureStorage(),
        (i = scope));
    } else {
      let projectConfig = getCurrentProjectConfig(),
        globalConfig = getGlobalConfig(),
        x = await readRawMcpJsonServersFromCwd().catch((N) => {
          if (
            N instanceof TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS ||
            getErrnoCode(N) !== void 0
          )
            throw N;
          return {};
        }),
        hasOwn = Object.hasOwn(x, o),
        scopes = [];
      if (projectConfig.mcpServers?.[o]) scopes.push("local");
      if (hasOwn) scopes.push("project");
      if (globalConfig.mcpServers?.[o]) scopes.push("user");
      if (scopes.length === 0) {
        await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !1 });
        let N = getSettingsMcpConfigByName(o)?.scope;
        if (N && isManagedConfigScope(N))
          return cliErrorAfterAnalyticsFlush(
            `MCP server "${o}" is provided by your organization (${N === "managed" ? "managed settings" : describeMcpConfigFilePath("enterprise")}) and cannot be removed locally.`,
          );
        let E = [
          ...Object.keys(projectConfig.mcpServers ?? {}),
          ...Object.keys(x),
          ...Object.keys(globalConfig.mcpServers ?? {}),
        ];
        return (
          await logFeatureBadAsync("cli_mcp_remove", "cli_mcp_remove_not_found"),
          cliErrorAfterAnalyticsFlush(formatUnknownMcpServerHint(o, uniq(E)))
        );
      } else if (scopes.length === 1) {
        let scope = scopes[0];
        (await logEventAsync("tengu_mcp_delete", {
          name: mcpNameForAnalytics_GATE_EVALUATED(o, g),
          scope: fromEnum(scope),
        }),
          a(scope),
          await removeMcpConfig(o, scope, u),
          await cleanupSecureStorage(),
          (i = scope));
      } else {
        (process.stderr.write(`MCP server "${o}" exists in multiple scopes:
`),
          scopes.forEach((scope) => {
            process.stderr.write(`  - ${getScopeLabel(scope)} (${describeMcpConfigFilePath(scope)})
`);
          }));
        let filtered = scopes
          .map((scope) => claudeCommand("mcp remove", o, `-s ${scope}`))
          .filter((E) => E !== null);
        if (filtered.length > 0)
          (process.stderr.write(`
To remove from a specific scope, use:
`),
            filtered.forEach((E) =>
              process.stderr.write(`  ${E}
`),
            ));
        else
          process.stderr.write(`
Specify a scope with -s to remove from a specific one.
`);
        return (
          await logFeatureBadAsync("cli_mcp_remove", "cli_mcp_remove_ambiguous_scope"),
          cliErrorAfterAnalyticsFlush()
        );
      }
    }
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_mcp_remove", "cli_mcp_remove_failed"),
      cliErrorAfterAnalyticsFlush(errorMessage(error))
    );
  }
  await logFeatureOkAsync("cli_mcp_remove");
  let _ = p.scope ? o : `"${o}"`;
  await renderAndRun(
    m,
    r(Box, {
      flexDirection: "column",
      children: [
        r(Text, { children: ["Removed MCP server ", _, " from ", i, " config"] }),
        r(Text, { children: ["File modified: ", describeMcpConfigFilePath(i)] }),
      ],
    }),
  );
}
//@ chunk-h2rjy0z4.js:23358-23482 layout
function redactEnvRefs(m) {
  let o = (p) =>
    typeof p === "string" ? M1e(p) : Array.isArray(p) ? p.map(o) : p && typeof p === "object" ? xr(p, o) : p;
  return o(m);
}
//@ chunk-h2rjy0z4.js:23482-23822 layout
function redactServerConfig(m) {
  let o = redactSecretsDeep(m),
    p = mcpTransportType(m);
  if ("url" in o)
    return {
      ...o,
      url: p,
      ...("headers" in o &&
        o.headers && { headers: Object.fromEntries(Object.keys(o.headers).map((u) => [u, "[REDACTED]"])) }),
    };
  if ("command" in o)
    return {
      ...o,
      command: p,
      ...(o.args && { args: [] }),
      ...("env" in o &&
        o.env && { env: Object.fromEntries(Object.keys(o.env).map((u) => [u, "[REDACTED]"])) }),
    };
  return o;
}
//@ chunk-h2rjy0z4.js:23822-24167 layout
function toDisplayServerConfigs(m) {
  let o = new Map(),
    p = {};
  for (let [u, l] of Object.entries(m)) {
    let found = MCP_SETTINGS_SCOPES.find((f) => f === l.scope);
    if (found !== void 0) {
      let f = o.get(found);
      if (!f) ((f = getMcpConfigsByScope(found, { expandVars: !1 }).servers), o.set(found, f));
      let i = f[u],
        _ = i && matchesOriginalConfig(i, l) ? redactEnvRefs(i) : redactServerConfig(l);
      if (_.scope !== "managed") {
        p[u] = _;
        continue;
      }
      let g = redactSecretsDeep(_);
      p[u] = "url" in g ? redactManagedMcpServerConfig(g, _.scope) : g;
    } else p[u] = l.type === "ws" ? redactServerConfig(l) : redactSecretsDeep(l);
  }
  return p;
}
//@ chunk-h2rjy0z4.js:24167-24497 layout
function formatServerStatusLine({ name: name, server: server, status: status, issue: issue }) {
  let l = issue ? `${status} \u2014 ${issue}` : status;
  if (isRemoteTransport(server)) return `${name}: ${server.url} (${server.type.toUpperCase()}) - ${l}`;
  if (server.type === "claudeai-proxy") return `${name}: ${server.url} - ${l}`;
  if (!server.type || server.type === "stdio") {
    let a = Array.isArray(server.args) ? server.args : [];
    return `${name}: ${server.command} ${a.join(" ")} - ${l}`;
  }
  return null;
}
//@ chunk-h2rjy0z4.js:24497-24848 layout
function ServerStatusList(m) {
  let u = w(10),
    { promise: promise } = m,
    p = Qr(promise),
    l,
    a,
    f;
  if (u[0] !== p) {
    let mapped = p.map(formatServerStatusLine).filter(ht).map(replaceControlChars);
    a = RenderOnceAndExit;
    l = Text;
    f = mapped.join(`
`);
    ((u[0] = p), (u[1] = l), (u[2] = a), (u[3] = f));
  } else ((l = u[1]), (a = u[2]), (f = u[3]));
  let _;
  if (u[4] !== l || u[5] !== f) ((_ = e(l, { children: f })), (u[4] = l), (u[5] = f), (u[6] = _));
  else _ = u[6];
  let g;
  if (u[7] !== a || u[8] !== _) ((g = e(a, { children: _ })), (u[7] = a), (u[8] = _), (u[9] = g));
  else g = u[9];
  return g;
}
//@ chunk-h2rjy0z4.js:24848-25033 layout
var PENDING_APPROVAL_STATUS = "\u23F8 Pending approval (run `claude` to approve)",
  REJECTED_STATUS = `${re.cross} Rejected (see disabledMcpjsonServers in settings)`,
  DISABLED_FOR_PROJECT_STATUS = "\u2298 Disabled for this project (re-enable via /mcp)";
/**
 * claude mcp list：列出全部 MCP 服务器并逐个做健康检查。
 */
//@ chunk-h2rjy0z4.js:25033-25903 fingerprint = mcpListHandler (0.423)
async function mcpListHandler(m, o, p) {
  (await logEventAsync("tengu_mcp_list", {}), await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !1 }));
  let { servers: servers, pendingProjectServers: pendingProjectServers } = await getAllMcpConfigs({
    includePendingProjectServers: !0,
    storageV5: o,
    credentials: p,
  });
  await logFeatureOkAsync("cli_mcp_list");
  let a = e(McpParsingWarnings, {});
  if (Object.keys(servers).length === 0) {
    (await renderAndRun(
      m,
      r(Box, {
        flexDirection: "column",
        children: [
          e(Text, { children: "No MCP servers configured. Use `claude mcp add` to add a server." }),
          a,
        ],
      }),
    ),
      await gracefulShutdown(0));
    return;
  }
  let f = toDisplayServerConfigs(servers),
    i = pMap(
      Object.entries(servers),
      async ([_, g]) => {
        let args = pendingProjectServers.has(_)
          ? { status: PENDING_APPROVAL_STATUS }
          : isMcpServerDisabled(_)
            ? { status: DISABLED_FOR_PROJECT_STATUS }
            : await checkMcpServerHealth(_, g, o);
        return {
          name: _,
          server: f[_] ?? redactServerConfig(g),
          status: args.status,
          ...(args.issue !== void 0 && { issue: args.issue }),
        };
      },
      { concurrency: fe().getMcpServerConnectionBatchSize() },
    );
  (m.render(
    e(fo, {
      fallback: r(Text, {
        children: [
          "Checking MCP server health\u2026",
          `

`,
        ],
      }),
      children: r(Box, { flexDirection: "column", children: [e(ServerStatusList, { promise: i }), a] }),
    }),
  ),
    await m.waitUntilExit(),
    await gracefulShutdown(0));
}
/**
 * claude mcp get <name>：单个服务器的配置、作用域与连接状态（密钥脱敏）。
 */
//@ chunk-h2rjy0z4.js:25903-28016 fingerprint = mcpGetHandler (0.567)
async function mcpGetHandler(m, o, p, u) {
  (await logEventAsync("tengu_mcp_get", {
    name: mcpNameForAnalytics_GATE_EVALUATED(
      o,
      isMcpServerLoggableInAnalytics(o, getSettingsMcpConfigByName(o) ?? void 0),
    ),
  }),
    await awaitMcpPolicyColdStart({ hasDynamicMcpConfig: !1 }));
  let {
      servers: servers,
      pendingProjectServers: pendingProjectServers,
      rejectedProjectServers: rejectedProjectServers,
    } = await getAllMcpConfigs({
      includePendingProjectServers: !0,
      includeRejectedProjectServers: !0,
      storageV5: p,
      credentials: u,
    }),
    i = servers[o] ?? null,
    _ = pendingProjectServers.has(o) ? "pending" : rejectedProjectServers.has(o) ? "rejected" : null;
  if (!i) {
    await logFeatureBadAsync("cli_mcp_get", "cli_mcp_get_not_found");
    let filtered = Object.keys(servers).filter(
      (A) => !pendingProjectServers.has(A) && !rejectedProjectServers.has(A),
    );
    return cliErrorAfterAnalyticsFlush(
      formatMcpServerNotFoundMessage(o, filtered, pendingProjectServers.size > 0),
    );
  }
  let g =
      _ === "pending"
        ? { status: PENDING_APPROVAL_STATUS }
        : _ === "rejected"
          ? { status: REJECTED_STATUS }
          : isMcpServerDisabled(o)
            ? { status: DISABLED_FOR_PROJECT_STATUS }
            : await checkMcpServerHealth(o, i, p),
    h =
      isStdioConfig(i) && !MCP_SETTINGS_SCOPE_SET.has(i.scope)
        ? redactServerConfig(i)
        : (toDisplayServerConfigs({ [o]: i })[o] ?? redactServerConfig(i)),
    x = [
      `${o}:`,
      `  Scope: ${getScopeLabel(i.scope)}`,
      `  Status: ${g.status}`,
      ...(g.issue ? [`  Issue: ${g.issue}`] : []),
    ];
  if (isRemoteTransport(i) && isRemoteTransport(h)) {
    if ((x.push(`  Type: ${i.type}`), x.push(`  URL: ${h.url}`), h.headers)) {
      x.push("  Headers:");
      for (let [E, A] of Object.entries(h.headers)) x.push(`    ${E}: ${A}`);
    }
    if (i.type !== "ws" && (i.oauth?.clientId || i.oauth?.callbackPort)) {
      let E = [];
      if (i.oauth.clientId) {
        if ((E.push("client_id configured"), (await F().getMcpClientConfig(o, i))?.clientSecret))
          E.push("client_secret configured");
      }
      if (i.oauth.callbackPort) E.push(`callback_port ${i.oauth.callbackPort}`);
      x.push(`  OAuth: ${E.join(", ")}`);
    }
  } else if (isStdioConfig(i) && isStdioConfig(h)) {
    (x.push("  Type: stdio"), x.push(`  Command: ${h.command}`));
    let E = Array.isArray(h.args) ? h.args : [];
    if ((x.push(`  Args: ${E.join(" ")}`), h.env)) {
      x.push("  Environment:");
      for (let [A, J] of Object.entries(h.env)) x.push(`    ${A}=${J}`);
    }
  }
  if (i.timeout !== void 0)
    x.push(`  Timeout: ${i.timeout}ms${i.timeout < 1000 ? " (ignored: below 1000ms minimum)" : ""}`);
  let M =
      i.scope === "local" || i.scope === "project" || i.scope === "user"
        ? claudeCommand("mcp remove", o, `-s ${i.scope}`)
        : null,
    N = null;
  if (M) N = `To remove this server, run: ${M}`;
  else if (i.scope === "user" || i.scope === "project" || i.scope === "local" || i.scope === "enterprise")
    N = `To remove this server, edit ${describeMcpConfigFilePath(i.scope)}`;
  else if (i.scope === "managed")
    N = "This server is provided by your organization's managed settings and cannot be removed locally.";
  if (N) (x.push(""), x.push(N));
  (await logFeatureOkAsync("cli_mcp_get"),
    await renderAndRun(
      m,
      e(Text, {
        children: x.map(replaceControlChars).join(`
`),
      }),
    ),
    await gracefulShutdown(0));
}
/**
 * claude mcp add-json：从 JSON 添加服务器（可带 client secret）。
 */
//@ chunk-h2rjy0z4.js:28016-29211 fingerprint = mcpAddJsonHandler (0.498)
async function mcpAddJsonHandler(m, o, p, u, l) {
  let a, f;
  try {
    a = ensureConfigScope(u.scope);
    let i = safeParseJSON(p, !1);
    if (i === null)
      logForDebugging("mcp add-json: user-provided JSON was empty, invalid, or null", { level: "error" });
    let g =
      u.clientSecret &&
      i &&
      typeof i === "object" &&
      "type" in i &&
      (i.type === "sse" || i.type === "http" || i.type === "streamable-http") &&
      "url" in i &&
      typeof i.url === "string" &&
      "oauth" in i &&
      i.oauth &&
      typeof i.oauth === "object" &&
      "clientId" in i.oauth
        ? await F().readClientSecret()
        : void 0;
    await addMcpConfig(o, i, a, l);
    let safeParse = McpServerConfigSchema().safeParse(i);
    if (
      ((f = (safeParse.success ? safeParse.data.type : void 0) ?? "stdio"),
      g &&
        i &&
        typeof i === "object" &&
        "type" in i &&
        (i.type === "sse" || i.type === "http" || i.type === "streamable-http") &&
        "url" in i &&
        typeof i.url === "string")
    ) {
      let saveMcpClientSecret = await F().saveMcpClientSecret(
        o,
        { type: i.type === "sse" ? "sse" : "http", url: i.url },
        g,
      );
      if (!saveMcpClientSecret.success)
        process.stderr
          .write(`Server added, but the client secret could not be stored${saveMcpClientSecret.warning ? ` (${saveMcpClientSecret.warning})` : ""}. Re-run with --client-secret once secure storage is available.
`);
    }
    let h = a,
      x = f;
    await logEventAsync("tengu_mcp_add", { scope: fromEnum(h), source: lit("json"), type: fromEnum(x) });
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_mcp_add_json", "cli_mcp_add_json_failed"),
      cliErrorAfterAnalyticsFlush(errorMessage(error))
    );
  }
  (await logFeatureOkAsync("cli_mcp_add_json"),
    await renderAndRun(m, r(Text, { children: ["Added ", f, " MCP server ", o, " to ", a, " config"] })));
}
/**
 * claude mcp add-from-claude-desktop：从 Claude Desktop 配置导入服务器。
 */
//@ chunk-h2rjy0z4.js:29211-29853 fingerprint = mcpAddFromDesktopHandler (0.737)
async function mcpAddFromDesktopHandler(m, o) {
  try {
    let scope = ensureConfigScope(m.scope),
      platform = getPlatform();
    await logEventAsync("tengu_mcp_add", {
      scope: fromEnum(scope),
      platform: fromEnum(platform),
      source: lit("desktop"),
    });
    let { readClaudeDesktopMcpServers: readClaudeDesktopMcpServers } = await import("./chunk-2sv0rqj8.js"),
      servers = await readClaudeDesktopMcpServers();
    if (Object.keys(servers).length === 0)
      return (
        await logFeatureOkAsync("cli_mcp_add_from_desktop"),
        cliOkAfterAnalyticsFlush(
          "No MCP servers found in Claude Desktop configuration or configuration file does not exist.",
        )
      );
    await logFeatureOkAsync("cli_mcp_add_from_desktop");
    let { unmount: unmount } = await render(
      e(AppRoot, {
        storageV5: o,
        children: e(MCPServerDesktopImportDialog, {
          servers: servers,
          scope: scope,
          onDone: () => {
            unmount();
          },
        }),
      }),
      { exitOnCtrlC: !0, patchConsole: !1 },
    );
  } catch (error) {
    return (
      await logFeatureBadAsync("cli_mcp_add_from_desktop", "cli_mcp_add_from_desktop_failed"),
      cliErrorAfterAnalyticsFlush(errorMessage(error))
    );
  }
}
/**
 * claude mcp reset-project-choices：重置 .mcp.json 项目服务器的批准/拒绝记录。
 */
//@ chunk-h2rjy0z4.js:29853-32744 callgraph-fingerprint = mcpResetChoicesHandler (0.217)
async function mcpResetChoicesHandler(m, o) {
  if (
    (await logEventAsync("tengu_mcp_reset_mcpjson_choices", {}),
    !(await deleteCurrentProjectConfigFields(
      ["enabledMcpjsonServers", "disabledMcpjsonServers", "enableAllProjectMcpServers"],
      o,
    )))
  )
    return (
      printCliError(
        "Error: Failed to reset project choices: legacy approvals in ~/.claude.json could not be cleared (is the file writable?). Nothing was changed.",
      ),
      await logFeatureBadAsync("cli_mcp_reset_choices", "cli_mcp_reset_choices_projectconfig_delete_failed"),
      await flushAnalyticsSinks(),
      cliError()
    );
  let u = getSettingsForSourceForUpkeep("localSettings");
  if (
    u
      ? u.enabledMcpjsonServers !== void 0 ||
        u.disabledMcpjsonServers !== void 0 ||
        u.enableAllProjectMcpServers !== void 0
      : getLocalSettingsValidationErrors().length > 0
  ) {
    if (u !== null && Cln().length > 0)
      return (
        printCliError(
          "Error: Failed to reset project choices: settings.local.json carries validation warnings, and rewriting it would delete the warned entries \u2014 run `claude doctor` to list them, fix them, then re-run (legacy approvals in ~/.claude.json were cleared; local settings were not)",
        ),
        await logFeatureBadAsync("cli_mcp_reset_choices", "cli_mcp_reset_choices_settings_warnings_blocked"),
        await flushAnalyticsSinks(),
        cliError()
      );
    let { error: error } = await updateSettingsForSource(
      "localSettings",
      { enabledMcpjsonServers: void 0, disabledMcpjsonServers: void 0, enableAllProjectMcpServers: void 0 },
      void 0,
      o,
    );
    if (error)
      return (
        printCliError(
          `Error: Failed to reset project choices: ${error.message} (legacy approvals in ~/.claude.json were cleared; local settings were not)`,
        ),
        await logFeatureBadAsync("cli_mcp_reset_choices", "cli_mcp_reset_choices_settings_write_failed"),
        await flushAnalyticsSinks(),
        cliError()
      );
  }
  await logFeatureOkAsync("cli_mcp_reset_choices");
  let a = null;
  try {
    let f = isRestrictedToPluginOnly("mcp");
    if (!doesEnterpriseMcpConfigExist()) {
      let {
          serverNames: serverNames,
          pluginServerNames: pluginServerNames,
          rootServers: rootServers,
        } = await collectProjectMcpServerNames(o),
        v = (current) => formatMcpServerLabel(current, pluginServerNames.has(current)),
        h = [],
        x = [],
        R = 0;
      for (let M of serverNames) {
        if (f && !pluginServerNames.has(M)) continue;
        let N = getProjectMcpServerStatus(M);
        if (N === "approved") {
          if (isMcpServerDisabled(M)) continue;
          let E = rootServers[M];
          if (E && !isMcpServerAllowedByPolicy(M, E)) continue;
          h.push(v(M));
        } else if (N === "rejected") x.push(v(M));
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
    (logForDebugging(`mcp reset-project-choices: post-reset disclosure scan failed: ${errorMessage(error)}`, {
      level: "warn",
    }),
      (a = null));
  }
  (m.render(
    e(RenderOnceAndExit, {
      children: r(Box, {
        flexDirection: "column",
        children: [
          e(Text, {
            children:
              "Project-scoped (.mcp.json) server approvals and rejections stored for this project have been reset.",
          }),
          a &&
            a.autoApprovedServers.length > 0 &&
            e(Text, {
              children: describeServerList(
                a.autoApprovedServers,
                "is still approved by other settings and will connect automatically without prompting.",
                "are still approved by other settings and will connect automatically without prompting.",
              ),
            }),
          a &&
            a.stillRejectedServers.length > 0 &&
            e(Text, {
              children: describeServerList(
                a.stillRejectedServers,
                "remains rejected by other settings and will not prompt.",
                "remain rejected by other settings and will not prompt.",
              ),
            }),
          a &&
            a.pendingCount > 0 &&
            (a.gatingErrors > 0
              ? e(Text, {
                  children:
                    "Settings errors are currently blocking the approval prompt \u2014 run `claude doctor` to list them, fix them, then restart Claude Code to be prompted.",
                })
              : e(Text, { children: "You will be prompted for approval next time you start Claude Code." })),
        ],
      }),
    }),
  ),
    await m.waitUntilExit());
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
      return !0;
    case void 0:
    case "stdio":
    case "sdk":
    case "sse-ide":
    case "ws-ide":
    case "claudeai-proxy":
      return !1;
    default:
      return !1;
  }
}
/**
 * checkMcpServerHealth（实为缓存行可被替换判定）：cached 行在已有 connected/disabled/needs-auth 时不覆盖。
 */
//@ chunk-dcmhvw5a.js:71956-72082 fingerprint = checkMcpServerHealth (0.518)
function checkMcpServerHealth_2(name, server) {
  if (server.type !== "cached" || !name) return !0;
  return !(name.type === "connected" || name.type === "disabled" || name.type === "needs-auth");
}

export { checkMcpServerHealth_2 };
