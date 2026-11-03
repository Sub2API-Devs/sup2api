/**
 * utils/plugins/mcpPluginIntegration.ts
 *
 * 插件 MCP 服务器：发现 .mcp.json/manifest.mcpServers/MCPB 包，解析 ${CLAUDE_PLUGIN_ROOT}/${user_config.*} 等变量，名字加 plugin:<插件>: 前缀，频道（channels）用户配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/mcpPluginIntegration.ts
 * pieces: chunk-d4eg9at2.js (1), chunk-e6aww6q8.js (22), chunk-k9mgeeff.js (1)
 * attribution: fingerprint 9, placement 8, layout 6, file-local 1
 */
import { join } from "path";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isFlagSyncWanted } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import {
  marketplaceOf,
  isProjectLocalPlugin,
  pluginNamesEqual,
  hasMarketplaceAlias,
  pluginDisplayKey,
} from "./pluginIdentifier.js";
import { SYNCED, buildPluginSourceFields } from "../telemetry/pluginTelemetry.js";
import { HostScoped } from "../hostScoped.js";
import { getServerKey, usesNonOAuthAuth } from "../../services/mcp/auth.js";
import {
  isRegistrationPendingEntry,
  isFreshTimestamp,
  MAX_REGISTRATION_AGE_MS,
} from "../../services/mcp/registrationStatus.js";
import { getIsInteractive, onProcessRootHost } from "../../bootstrap/state.js";
import { readMcpOAuthStore } from "../../services/mcp/credentialStoreRead.js";
import { logForDebugging } from "../debug.js";
import { errorMessage, isENOENT } from "../errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { safeOrigin } from "../../services/mcp/ccrMcpUrls.js";
import { getLoggingSafeMcpBaseUrl } from "../../services/mcp/utils.js";
import { redactUrlQuery, redactUrlsInMessage, replaceAll } from "../redaction/urlRedaction.js";
import { loadMcpbFile, isMcpbSource, loadMcpServerUserConfig, validateUserConfig } from "./mcpbHandler.js";
import { quotedPrintable, printableMessage } from "../printableName.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { env } from "../env.js";
import { containsPathTraversal } from "../path.js";
import { unaddableTransportReason } from "../../services/mcp/config.js";
import { getFsImplementation } from "../fsOperations.js";
import { resolvePluginDirComponentPath } from "./pluginPathContainment.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { cacheStorageKeyOrFallback, ensurePluginDataDir } from "./pluginDirectories.js";
import { projectPluginCacheDir } from "./pluginCachePaths.js";
import { formatStorageError } from "../storage/storageErrors.js";
import { McpServerConfigSchema } from "../../services/mcp/types.js";
import { trimmedOrUndefined } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import {
  loadPluginOptions,
  marketplaceSource,
  applyUserConfigDefaults,
  substitutePluginVariables,
  substituteUserConfigVariables,
  hasUserConfigVariables,
} from "./pluginOptionsStorage.js";
import { scrubbedEnvKeys, expandMcpCredentialEnvVars } from "../envExpansion.js";
import { PLUGIN_ENV_VAR_SET } from "./lspPluginIntegration.js";
import { stdioIdentityDiff } from "../../services/mcp/serverIdentity.js";
import { subprocessEnv } from "../subprocessEnv.js";
import { listSecretEnvNames } from "../settings/policyHelper/helperEnv.js";
import { sanitizeEnvCredentials } from "../settings/policyHelper/helperExec.js";
import { ENV_REF_PATTERN } from "../../services/mcp/envExpansion.js";
import { uniq } from "../collections.js";
import { formatWithheldEnvNotice } from "../settings/managedSettingsFiles.js";
import { isManagedPluginScope, runWithPluginWriteScope } from "./pluginScopedWrite.js";
import { readMcpServerNames, resolveComponentPath, objectKeysOf } from "./pluginInventory.js";
import { hasDotDotWithSpaceSegment } from "../pathClassification.js";

//@ chunk-e6aww6q8.js:605143-605292 fingerprint = addPluginScopeToServers (1)
/**
 * 给插件 MCP 服务器加作用域前缀：名字改为 plugin:<插件名>:<服务器名>，scope=dynamic，记录来源插件。
 */
function addPluginScopeToServers(servers, pluginName, pluginSource) {
  let scopedServers = {};
  for (let [name, config] of Object.entries(servers)) {
    let scopedName = `plugin:${pluginName}:${name}`;
    scopedServers[scopedName] = {
      ...config,
      scope: "dynamic",
      source: pluginName,
      pluginSource,
    };
  }
  return scopedServers;
}
//@ chunk-e6aww6q8.js:3808451-3808485 placement
var TENGU_RECURSIVE_LOBSTER = "tengu_recursive_lobster";
//@ chunk-e6aww6q8.js:3808485-3808522 placement
/**
 * recursiveLobsterOn：开关 tengu_recursive_lobster。
 */
function recursiveLobsterOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RECURSIVE_LOBSTER, false) === true;
}
//@ chunk-e6aww6q8.js:3808522-3808578 placement
var TENGU_STARRY_LOCKET = "tengu_starry_locket";
var TENGU_TWINKLY_PRISM = "tengu_twinkly_prism";
//@ chunk-e6aww6q8.js:3808578-3808622 placement
function twinklyPrismOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_TWINKLY_PRISM, false) === true && isFlagSyncWanted();
}
//@ chunk-e6aww6q8.js:3808622-3808670 placement
function isSyncedMarketplacePluginEnabled(e) {
  return marketplaceOf(e.source) === SYNCED && twinklyPrismOn();
}
//@ chunk-e6aww6q8.js:3808670-3808697 placement
var mcpPluginIntegrationSlot = new HostScoped(() => new Set());
//@ chunk-e6aww6q8.js:3808697-3808887 placement
function getMcpRegistrationOfferState(e, n, r) {
  let s = r?.[getServerKey(e, n)];
  if (!isRegistrationPendingEntry(s) || s.clientId) return "unknown";
  let registrationNotOfferedAt = s.discoveryState?.registrationNotOfferedAt;
  if (registrationNotOfferedAt === undefined) return "unknown";
  return isFreshTimestamp(registrationNotOfferedAt) ? "unable" : "recheck";
}
//@ chunk-e6aww6q8.js:3808887-3810244 placement
/**
 * 按凭据存储判断插件提供的 MCP 服务器哪些可用。
 */
async function filterPluginMcpServersByCredentials(e, n, { sessionLoad }) {
  for (let [key, value] of Object.entries(n))
    if ("redialToRelearnRegistration" in value) {
      let w = {
        ...value,
      };
      delete w.redialToRelearnRegistration;
      n[key] = w;
    }
  if (
    marketplaceOf(e.source) !== SYNCED ||
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STARRY_LOCKET, false) !== true ||
    (recursiveLobsterOn() && getIsInteractive())
  )
    return;
  let s = [];
  for (let [key, value] of Object.entries(n)) {
    if (
      (value.type !== "http" && value.type !== "sse") ||
      value.oauth?.clientId ||
      value.oauth?.xaa ||
      usesNonOAuthAuth(value) ||
      value.url.includes("${") ||
      !URL.canParse(value.url)
    )
      continue;
    let w = new URL(value.url);
    if (w.username === "" && w.password === "") s.push([key, value]);
  }
  if (s.length === 0 || !isFlagSyncWanted()) return;
  let h;
  try {
    h = await readMcpOAuthStore();
  } catch (error) {
    logForDebugging(
      `Could not read the credentials store to judge ${e.name}'s MCP servers; keeping them all: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
  for (let [y, S] of s) {
    let mcpRegistrationOfferState = getMcpRegistrationOfferState(`plugin:${e.name}:${y}`, S, h);
    if (mcpRegistrationOfferState === "recheck" && sessionLoad) {
      n[y] = {
        ...S,
        redialToRelearnRegistration: true,
      };
      logForDebugging(
        `MCP server "${y}" of synced plugin ${e.name} is due a fresh sign-in check: its record that a terminal cannot register is more than ${MAX_REGISTRATION_AGE_MS / 86400000} days old or dated in the future`,
      );
    }
    if (mcpRegistrationOfferState !== "unable") continue;
    delete n[y];
    if (!sessionLoad) continue;
    let L = onProcessRootHost(mcpPluginIntegrationSlot);
    let G = `${e.source}
${y}`;
    if (L.has(G)) continue;
    L.add(G);
    logForDebugging(
      `Left out MCP server "${y}" of synced plugin ${e.name}: its last sign-in attempt found no way for a terminal to register (GrowthBook flag ${TENGU_STARRY_LOCKET})`,
    );
    logEvent("tengu_plugins_sync_mcp_server_left_out", {
      transportType: fromEnumOpt(S.type),
      mcpServerBaseUrl: safeOrigin(getLoggingSafeMcpBaseUrl(S)),
      ...buildPluginSourceFields({
        pluginSource: e.source,
      }),
    });
  }
}
//@ chunk-e6aww6q8.js:3810244-3811399 fingerprint = loadMcpServersFromMcpb (0.907)
/**
 * 从插件里的 .mcpb/.dxt 包加载 MCP 服务器：loadMcpbFile 解压与生成配置，需要用户配置时返回 needs-config 状态。
 */
async function loadMcpServersFromMcpb(plugin, n, errors, s, h, y) {
  let mcpbPath = redactUrlQuery(n);
  try {
    logForDebugging(`Loading MCP servers from MCPB: ${mcpbPath}`);
    let pluginId = plugin.repository;
    let result = await loadMcpbFile(
      n,
      plugin.path,
      pluginId,
      (status) => {
        logForDebugging(`MCPB [${plugin.name}]: ${status}`);
      },
      undefined,
      undefined,
      h,
      y,
    );
    if ("status" in result && result.status === "needs-config") {
      logForDebugging(
        `MCPB ${mcpbPath} requires user configuration; MCP server "${quotedPrintable(result.manifest.name)}" not started. ` +
          `Configure via: /plugin \u2192 Installed \u2192 ${plugin.name} \u2192 Configure`,
      );
      s.push(mcpbNeedsConfigWarning(plugin, result.manifest.name));
      return null;
    }
    let successResult = result;
    let serverName = successResult.manifest.name;
    logForDebugging(
      `Loaded MCP server "${serverName}" from MCPB (extracted to ${successResult.extractedPath})`,
    );
    let Z =
      n.startsWith("http") || mcpbNeedsUserConfig(successResult.manifest)
        ? {
            ...successResult.mcpConfig,
            pluginEndpointTemplated: true,
          }
        : successResult.mcpConfig;
    return {
      [serverName]: Z,
    };
  } catch (error) {
    let errorMsg = redactUrlsInMessage(errorMessage(error));
    logForDebugging(`Failed to load MCPB ${mcpbPath}: ${errorMsg}`, {
      level: "error",
    });
    let source = plugin.repository;
    if (n.startsWith("http") && (errorMsg.includes("download") || errorMsg.includes("network")))
      errors.push({
        type: "mcpb-download-failed",
        source,
        plugin: plugin.name,
        url: mcpbPath,
        reason: errorMsg,
      });
    else if (errorMsg.includes("manifest") || errorMsg.includes("user configuration"))
      errors.push({
        type: "mcpb-invalid-manifest",
        source,
        plugin: plugin.name,
        mcpbPath,
        validationError: errorMsg,
      });
    else
      errors.push({
        type: "mcpb-extract-failed",
        source,
        plugin: plugin.name,
        mcpbPath,
        reason: errorMsg,
      });
    return null;
  }
}
//@ chunk-e6aww6q8.js:3811399-3811551 layout
function mcpbNeedsUserConfig(manifest) {
  if (manifest.user_config && Object.keys(manifest.user_config).length > 0) return true;
  return /\$\{(?:HOME|DESKTOP|DOCUMENTS|DOWNLOADS)\}/.test(jsonStringify(manifest.server ?? {}));
}
//@ chunk-e6aww6q8.js:3811551-3811812 layout
function isExemptFromSkipPluginMcp(e, { fullIdsOnly }) {
  let r = env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT;
  if (!r) return false;
  let s = isProjectLocalPlugin(e);
  if (fullIdsOnly && s) return false;
  let h = !fullIdsOnly && !s;
  return r.split(",").some((y) => {
    let trimmed = y.trim();
    if (!trimmed) return false;
    return trimmed.includes("@")
      ? pluginNamesEqual(trimmed, e.repository)
      : h && pluginNamesEqual(trimmed, e.name);
  });
}
//@ chunk-e6aww6q8.js:3811812-3815254 layout
/**
 * 发现一个插件提供的 MCP 服务器：.mcp.json + manifest.mcpServers（路径/内联/MCPB 包），受 CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS(_EXCEPT)、CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES 等控制；返回 名字→配置。
 */
async function loadPluginMcpServersFromSources(
  plugin,
  errors = [],
  r,
  s,
  { readOnlyListing: h = false, warnings: y = [] } = {},
) {
  if (plugin.isBuiltin) return;
  if (env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS) {
    if (
      !isExemptFromSkipPluginMcp(plugin, {
        fullIdsOnly: false,
      })
    ) {
      logForDebugging(
        `Skipping plugin MCP server discovery for "${plugin.name}" (CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS is set)`,
      );
      return;
    }
    logForDebugging(
      `Loading MCP servers for "${plugin.name}" despite CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS (exempted via CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT)`,
    );
  }
  if (plugin.skipMcpDiscovery) return {};
  if (isSyncedMarketplacePluginEnabled(plugin)) {
    logForDebugging(
      `Skipping MCP server discovery for claude.ai-synced plugin "${plugin.name}": the GrowthBook flag ${TENGU_TWINKLY_PRISM} is on`,
    );
    return;
  }
  let S = isExemptFromSkipPluginMcp(plugin, {
    fullIdsOnly: true,
  });
  let w = !S && env.CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS;
  let L = w || (!S && env.CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES);
  let G = {};
  let q = [];
  let Z = isProjectLocalPlugin(plugin);
  let Se = h && hasMarketplaceAlias(plugin.source);
  let ke = 0;
  let we = (Ie) => {
    if (L && isMcpbSource(Ie)) {
      logForDebugging(
        `Skipping MCPB source "${redactUrlQuery(Ie)}" of plugin "${plugin.name}" (CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS or CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES is set)`,
      );
      return true;
    }
    if (Se) {
      ke++;
      return true;
    }
    if (!Z) return false;
    if (isMcpbSource(Ie)) {
      logForDebugging(
        `Skipping MCPB source "${redactUrlQuery(Ie)}" for directory-loaded plugin "${plugin.name}": ` +
          "not resolved without a pre-approval download here \u2014 declare MCP servers inline or via a local in-dir .mcp.json.",
        {
          level: "warn",
        },
      );
      return true;
    }
    if (containsPathTraversal(Ie) || Ie.split(/[/\\]/).some((Me) => /^\.\. [ .]*$/.test(Me))) {
      logForDebugging(
        `Skipping out-of-directory MCP source "${redactUrlQuery(Ie)}" for directory-loaded plugin "${plugin.name}": it may only reference files inside the plugin directory here.`,
        {
          level: "warn",
        },
      );
      return true;
    }
    return false;
  };
  let Ee = Se
    ? null
    : await loadMcpServersFromFile(plugin, ".mcp.json", r, {
        confine: Z,
      });
  if (Ee)
    G = {
      ...G,
      ...Ee,
    };
  if (plugin.manifest.mcpServers) {
    let mcpServers = plugin.manifest.mcpServers;
    if (typeof mcpServers === "string") {
      if (we(mcpServers));
      else if (isMcpbSource(mcpServers)) {
        let mcpServersFromMcpb = await loadMcpServersFromMcpb(plugin, mcpServers, errors, q, r, s);
        if (mcpServersFromMcpb)
          G = {
            ...G,
            ...mcpServersFromMcpb,
          };
      } else {
        let mcpServersFromFile = await loadMcpServersFromFile(plugin, mcpServers, r, {
          confine: Z,
        });
        if (mcpServersFromFile)
          G = {
            ...G,
            ...mcpServersFromFile,
          };
      }
    } else if (Array.isArray(mcpServers)) {
      let mapped = mcpServers.map((spec) => ({
        spec,
        specWarnings: [],
      }));
      let results = await Promise.all(
        mapped.map(async ({ spec, specWarnings }) => {
          try {
            if (typeof spec === "string") {
              if (we(spec)) return null;
              if (isMcpbSource(spec))
                return await loadMcpServersFromMcpb(plugin, spec, errors, specWarnings, r, s);
              return await loadMcpServersFromFile(plugin, spec, r, {
                confine: Z,
              });
            }
            return spec;
          } catch (error) {
            let nt =
              typeof spec === "string"
                ? replaceAll(String(error), join(plugin.path, spec), join(plugin.path, redactUrlQuery(spec)))
                : String(error);
            logForDebugging(
              `Failed to load MCP servers from spec for plugin ${plugin.name}: ${redactUrlsInMessage(nt)}`,
              {
                level: "error",
              },
            );
            return null;
          }
        }),
      );
      for (let ze of results)
        if (ze)
          G = {
            ...G,
            ...ze,
          };
      q.push(...mapped.flatMap(({ specWarnings }) => specWarnings));
    } else
      G = {
        ...G,
        ...mcpServers,
      };
  }
  if (ke > 0)
    logForDebugging(
      `Read-only listing: omitted ${ke} file / bundle MCP server source(s) of directory-loaded plugin "${plugin.name}" (inline declarations only; a session load resolves them).`,
    );
  for (let [key, value] of Object.entries(G)) {
    let We = unaddableTransportReason(value.type);
    if (We === null) {
      if (w && value.type !== "sse" && value.type !== "http" && value.type !== "ws") {
        delete G[key];
        logForDebugging(
          `Skipping MCP server "${key}" of plugin "${plugin.name}": only sse, http and ws servers load while CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS is set`,
        );
      }
      continue;
    }
    delete G[key];
    errors.push({
      type: "mcp-config-invalid",
      source: plugin.source,
      plugin: plugin.name,
      serverName: key,
      validationError:
        We === "host-only"
          ? `type "${value.type}" servers cannot be declared by a plugin; only the host application registers them`
          : `type "${value.type}" servers cannot be declared by a plugin; only claude.ai connectors use that type`,
    });
    logForDebugging(
      `Dropped MCP server "${key}" of plugin ${plugin.name}: ${We} transport type "${value.type}"`,
      {
        level: "warn",
      },
    );
  }
  y.push(...q);
  let flattened = q.flatMap((Ie) => (Ie.type === "mcpb-needs-config" ? [Ie.serverName] : []));
  plugin.mcpServersNeedingConfig = flattened.length > 0 ? flattened : undefined;
  await filterPluginMcpServersByCredentials(plugin, G, {
    sessionLoad: !h,
  });
  return Object.keys(G).length > 0 ? G : undefined;
}
//@ chunk-e6aww6q8.js:3815254-3815416 file-local
/**
 * 返回插件的 MCP 服务器（已缓存在插件对象上则直接用，否则发现后写回）。
 */
async function extractMcpServersFromPlugins(e, n, r, { warnings: s = [] } = {}) {
  if (e.mcpServers) {
    pushMcpbNeedsConfigWarnings(e, s);
    return e.mcpServers;
  }
  let pluginMcpServersFromSources = await loadPluginMcpServersFromSources(e, n, r, undefined, {
    warnings: s,
  });
  if (pluginMcpServersFromSources) e.mcpServers = pluginMcpServersFromSources;
  return pluginMcpServersFromSources;
}
//@ chunk-e6aww6q8.js:3815416-3815494 layout
function pushMcpbNeedsConfigWarnings(e, n) {
  for (let r of e.mcpServersNeedingConfig ?? []) n.push(mcpbNeedsConfigWarning(e, r));
}
//@ chunk-e6aww6q8.js:3815494-3815592 layout
function mcpbNeedsConfigWarning(e, serverName) {
  return {
    type: "mcpb-needs-config",
    source: e.repository,
    plugin: e.name,
    serverName,
  };
}
//@ chunk-e6aww6q8.js:3815592-3816522 fingerprint = loadMcpServersFromFile (0.864)
/**
 * 读取插件内一个 MCP 配置文件（.mcp.json 形状），可限定不逃出插件目录；存储后端模式下经存储层读。
 */
async function loadMcpServersFromFile(e, n, r, { confine: s = false } = {}) {
  let fs = getFsImplementation();
  let filePath = join(e.path, n);
  let S = (G) => replaceAll(G, join(e.path, n), join(e.path, redactUrlQuery(n)));
  if (s) {
    let pluginDirComponentPath = await resolvePluginDirComponentPath(e, n);
    if (pluginDirComponentPath === null) return null;
    filePath = pluginDirComponentPath;
  }
  let content;
  let L =
    isStorageV5Enabled() && r !== undefined
      ? cacheStorageKeyOrFallback(filePath, projectPluginCacheDir())
      : null;
  if (r !== undefined && L !== null) {
    let G = await r.read([L]);
    if (!G.ok) {
      logForDebugging(S(`Failed to load MCP servers from ${filePath}: ${formatStorageError(G.error)}`), {
        level: "error",
      });
      return null;
    }
    let q = G.value.items[0];
    if (!q?.found) return null;
    content = Buffer.from(q.value).toString("utf-8");
  } else
    try {
      content = await fs.readFile(filePath, {
        encoding: "utf-8",
      });
    } catch (e) {
      if (isENOENT(e)) return null;
      logForDebugging(S(`Failed to load MCP servers from ${filePath}: ${e}`), {
        level: "error",
      });
      return null;
    }
  try {
    let parsed = jsonParse(content);
    let mcpServers = parsed.mcpServers || parsed;
    let validatedServers = {};
    for (let [name, config] of Object.entries(mcpServers)) {
      let result = McpServerConfigSchema().safeParse(config);
      if (result.success) validatedServers[name] = result.data;
      else
        logForDebugging(S(`Invalid MCP server config for ${name} in ${filePath}: ${result.error.message}`), {
          level: "error",
        });
    }
    return validatedServers;
  } catch (error) {
    logForDebugging(S(`Failed to load MCP servers from ${filePath}: ${error}`), {
      level: "error",
    });
    return null;
  }
}
//@ chunk-e6aww6q8.js:3816522-3816871 fingerprint = getUnconfiguredChannels (1)
/**
 * 列出插件 manifest.channels 中缺少必填用户配置的频道（供启用时弹出配置对话框）。
 */
async function getUnconfiguredChannels(plugin, n) {
  let channels = plugin.manifest.channels;
  if (!channels || channels.length === 0) return [];
  let pluginId = plugin.repository;
  let unconfigured = [];
  for (let channel of channels) {
    if (!channel.userConfig || Object.keys(channel.userConfig).length === 0) continue;
    let saved = (await loadMcpServerUserConfig(pluginId, channel.server, n)) ?? {};
    if (!validateUserConfig(saved, channel.userConfig).valid)
      unconfigured.push({
        server: channel.server,
        displayName: trimmedOrUndefined(channel.displayName) ?? channel.server,
        configSchema: channel.userConfig,
      });
  }
  return unconfigured;
}
//@ chunk-e6aww6q8.js:3816871-3817125 layout = addPluginScopeToServers (0.786)
/**
 * 给插件 MCP 服务器加 plugin:<插件>:<服务器> 前缀并标 scope=dynamic、pluginSource/pluginPath，官方背书时标 pluginOfficialSourceVouched。
 */
function addPluginScopeToServers_2(servers, name, pluginSource, pluginPath, h = false) {
  let scopedServers = {};
  let S = pluginDisplayKey(name, pluginSource);
  for (let [name, config] of Object.entries(servers)) {
    let scopedName = `plugin:${S}:${name}`;
    let scoped = {
      ...config,
      scope: "dynamic",
      pluginSource,
      pluginPath,
    };
    if (h) scoped.pluginOfficialSourceVouched = true;
    else delete scoped.pluginOfficialSourceVouched;
    scopedServers[scopedName] = scoped;
  }
  return scopedServers;
}
//@ chunk-e6aww6q8.js:3817125-3817371 fingerprint = loadChannelUserConfig (1)
/**
 * 合并插件级 userConfig 与频道级 userConfig 的已保存值（含默认值），供替换 ${user_config.X}。
 */
async function loadChannelUserConfig(plugin, serverName, r) {
  let userConfig = plugin.manifest.userConfig;
  let userConfig_2 = plugin.manifest.channels?.find((channel) => channel.server === serverName)?.userConfig;
  if (!userConfig && !userConfig_2) return;
  let S = userConfig ? await loadPluginOptions(marketplaceSource(plugin), r) : undefined;
  let w = userConfig_2
    ? ((await loadMcpServerUserConfig(plugin.repository, serverName, r)) ?? undefined)
    : undefined;
  return applyUserConfigDefaults(
    {
      ...S,
      ...w,
    },
    {
      ...userConfig,
      ...userConfig_2,
    },
  );
}
//@ chunk-e6aww6q8.js:3817440-3820347 fingerprint = resolvePluginMcpEnvironment (0.42)
/**
 * 解析插件 MCP 服务器配置中的变量：${CLAUDE_PLUGIN_ROOT}/${CLAUDE_PLUGIN_DATA}/${CLAUDE_PROJECT_DIR}/${user_config.X}/${ENV}，并为 stdio 服务器注入 CLAUDE_PLUGIN_ROOT/CLAUDE_PLUGIN_DATA 环境变量；缺失变量记错误。
 */
function resolvePluginMcpEnvironment(config, plugin, userConfig, errors, pluginName, serverName) {
  let S = [];
  let w;
  let L;
  let G = [];
  let q;
  let blankList = scrubbedEnvKeys();
  let Se = "pluginEndpointTemplated" in config && config.pluginEndpointTemplated === true;
  let resolveValue = (Ie, { remoteSink: Me = false, selectsEndpoint: We = false } = {}) => {
    if (We && Ie.includes("${CLAUDE_PROJECT_DIR}")) Se = true;
    let resolved = substitutePluginVariables(Ie, plugin);
    let lt = resolved;
    if (userConfig) resolved = substituteUserConfigVariables(resolved, userConfig);
    let { expanded, missingVars } = expandMcpCredentialEnvVars(resolved, undefined, undefined, {
      remoteSink: Me,
      blankList,
    });
    S.push(...missingVars);
    if (We && (expanded !== lt || missingVars.length > 0)) Se = true;
    return expanded;
  };
  let we;
  switch (config.type) {
    case undefined:
    case "stdio": {
      let stdioConfig = {
        ...config,
      };
      if (stdioConfig.command)
        stdioConfig.command = resolveValue(stdioConfig.command, {
          selectsEndpoint: true,
        });
      if (stdioConfig.args)
        stdioConfig.args = stdioConfig.args.map((arg) =>
          resolveValue(arg, {
            selectsEndpoint: true,
          }),
        );
      let resolvedEnv = {
        CLAUDE_PLUGIN_ROOT: plugin.path,
        CLAUDE_PLUGIN_DATA: ensurePluginDataDir(plugin.source),
        ...(stdioConfig.env || {}),
      };
      for (let [key, value] of Object.entries(resolvedEnv))
        if (!PLUGIN_ENV_VAR_SET.has(key))
          resolvedEnv[key] = resolveValue(value, {
            selectsEndpoint: true,
          });
      stdioConfig.env = resolvedEnv;
      q = stdioIdentityDiff(config, stdioConfig);
      we = stdioConfig;
      break;
    }
    case "sse":
    case "http":
    case "ws": {
      let remoteConfig = {
        ...config,
      };
      L = remoteConfig.url;
      let Me = S.length;
      if (remoteConfig.url)
        remoteConfig.url = resolveValue(remoteConfig.url, {
          remoteSink: true,
          selectsEndpoint: true,
        });
      G = S.slice(Me);
      if (remoteConfig.headers) {
        let resolvedHeaders = {};
        for (let [key, value] of Object.entries(remoteConfig.headers))
          resolvedHeaders[key] = resolveValue(value, {
            remoteSink: true,
          });
        remoteConfig.headers = resolvedHeaders;
      }
      if (remoteConfig.headersHelper)
        if (userConfig && hasUserConfigVariables(remoteConfig.headersHelper, userConfig)) {
          w = `headersHelper for MCP server '${serverName ?? "<unnamed>"}' references \${user_config.*}. The substituted value would be passed to a shell; read the value inside the helper script instead (e.g. from an env var set in the server's "env" block).`;
          if (errors && pluginName && serverName)
            errors.push({
              type: "mcp-config-invalid",
              source: plugin.source,
              plugin: pluginName,
              serverName,
              validationError: w,
            });
        } else {
          let We = substitutePluginVariables(remoteConfig.headersHelper, plugin);
          let ze = subprocessEnv();
          let lt = {
            ...ze,
          };
          let Je = new Set(listSecretEnvNames(ze));
          for (let yt of Je) delete lt[yt];
          Object.assign(lt, sanitizeEnvCredentials(lt).respelled);
          let replaced = We.replace(new RegExp(ENV_REF_PATTERN, "g"), (yt, gt) =>
            Je.has(gt) ? (yt.includes(":-") ? yt.slice(yt.indexOf(":-") + 2, -1) : "") : yt,
          );
          let { expanded, missingVars } = expandMcpCredentialEnvVars(replaced, lt, undefined, {
            blankAsLive: true,
            blankList,
          });
          S.push(...missingVars);
          remoteConfig.headersHelper = expanded;
        }
      we = remoteConfig;
      break;
    }
    case "sse-ide":
    case "ws-ide":
    case "sdk":
    case "claudeai-proxy":
      we = config;
      Se = true;
      break;
  }
  if (errors && S.length > 0) {
    let Ie = uniq(S);
    let varList = Ie.join(", ");
    logForDebugging(`Missing environment variables in plugin MCP config: ${varList}`, {
      level: "warn",
    });
    if (pluginName && serverName)
      errors.push({
        type: "mcp-config-invalid",
        source: plugin.source,
        plugin: pluginName,
        serverName,
        validationError: formatWithheldEnvNotice(
          Ie,
          isManagedPluginScope({
            pluginSource: plugin.source,
          }),
        ),
      });
  }
  let Ee;
  if ((we.type === "sse" || we.type === "http" || we.type === "ws") && "url" in we) {
    let Ie = false;
    try {
      new URL(we.url);
      Ie = true;
    } catch {}
    if (!Ie) {
      if (!L?.trim()) {
        Ee = "url_empty";
        w = "No URL configured for this server";
      } else if (G.length > 0) {
        Ee = "env_missing";
        w = formatWithheldEnvNotice(
          uniq(G),
          isManagedPluginScope({
            pluginSource: plugin.source,
          }),
        );
      } else {
        Ee = L.includes("${user_config.") ? "user_config_missing" : "url_invalid";
        w =
          Ee === "user_config_missing"
            ? `URL is unset or invalid \u2014 open /plugin manage and configure ${pluginName ?? "the plugin"} options`
            : `Plugin ${pluginName ?? plugin.source} has an invalid MCP url`;
        if (errors && pluginName && serverName)
          errors.push({
            type: "mcp-config-invalid",
            source: plugin.source,
            plugin: pluginName,
            serverName,
            validationError: w,
          });
      }
    }
  }
  let Ae = {
    ...(q && {
      configuredCommand: q,
    }),
    ...we,
    ...(w && {
      configError: w,
      configErrorReason: Ee,
    }),
  };
  return Se
    ? {
        ...Ae,
        pluginEndpointTemplated: true,
      }
    : Ae;
}
//@ chunk-e6aww6q8.js:3820347-3820777 fingerprint = getPluginMcpServers (0.644)
/**
 * 已启用插件的最终 MCP 服务器配置（变量已解析）；供 MCP 配置合并（services/mcp/config）使用。
 */
async function getPluginMcpServers(plugin, errors = [], r, s, warnings = []) {
  if (!plugin.enabled) return;
  if (plugin.mcpServers) pushMcpbNeedsConfigWarnings(plugin, warnings);
  let servers =
    plugin.mcpServers ||
    (await loadPluginMcpServersFromSources(plugin, errors, r, s, {
      warnings,
    }));
  if (!servers) return;
  let resolvedServers = {};
  for (let [name, config] of Object.entries(servers)) {
    let userConfig = await loadChannelUserConfig(plugin, name, s);
    try {
      resolvedServers[name] = runWithPluginWriteScope(
        {
          pluginSource: plugin.source,
        },
        () => resolvePluginMcpEnvironment(config, plugin, userConfig, errors, plugin.name, name),
      );
    } catch (err) {
      errors?.push({
        type: "generic-error",
        source: name,
        plugin: plugin.name,
        error: printableMessage(err),
      });
    }
  }
  return addPluginScopeToServers_2(
    resolvedServers,
    plugin.name,
    plugin.source,
    plugin.path,
    plugin.officialMarketplaceSourceVouched === true,
  );
}
//@ chunk-d4eg9at2.js:46214-46302 fingerprint = buildMcpUserConfig (1)
/**
 * 插件是否声明了 userConfig（名字配错，见 lead 建议）。
 */
function hasPluginUserConfig(s) {
  let userConfig = s?.manifest.userConfig;
  return userConfig && Object.keys(userConfig).length > 0 ? true : undefined;
}
//@ chunk-k9mgeeff.js:3581-3828 fingerprint = loadPluginMcpServers (0.615)
/**
 * 列出插件声明的 MCP 服务器配置（.mcp.json 与 manifest.mcpServers 中的文件/内联项，不含 MCPB 包），用于展示。
 */
async function loadPluginMcpServers(n) {
  if (n.isBuiltin) return [];
  let e = [await readMcpServerNames(await resolveComponentPath(n, ".mcp.json"))];
  for (let r of [n.manifest.mcpServers ?? []].flat())
    if (typeof r !== "string") e.push(objectKeysOf(r));
    else if (!isMcpbSource(r) && !containsPathTraversal(r) && !hasDotDotWithSpaceSegment(r))
      e.push(await readMcpServerNames(await resolvePluginDirComponentPath(n, r)));
  return e.flat();
}
export {
  getPluginMcpServers,
  extractMcpServersFromPlugins,
  addPluginScopeToServers,
  loadPluginMcpServersFromSources,
  hasPluginUserConfig,
  recursiveLobsterOn,
  getUnconfiguredChannels,
  loadPluginMcpServers,
  addPluginScopeToServers_2,
};
