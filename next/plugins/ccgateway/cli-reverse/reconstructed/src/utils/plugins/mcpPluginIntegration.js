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
import { formatWithheldEnvNotice } from "../settings/hostEnvWrites.js";
import { isManagedPluginScope, runWithPluginWriteScope } from "./pluginScopedWrite.js";
import { readMcpServerNames, resolveComponentPath, objectKeysOf } from "./pluginInventory.js";
import { hasDotDotWithSpaceSegment } from "../pathClassification.js";
import { deferInit } from "../../../runtime/deferred-init.js";

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
function isSyncedMarketplacePluginEnabled(plugin) {
  return marketplaceOf(plugin.source) === SYNCED && twinklyPrismOn();
}
//@ chunk-e6aww6q8.js:3808670-3808697 placement
var mcpPluginIntegrationSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3808670", () => {
  mcpPluginIntegrationSlot = new HostScoped(() => new Set());
});
//@ chunk-e6aww6q8.js:3808697-3808887 placement
function getMcpRegistrationOfferState(serverName, config, store) {
  let entry = store?.[getServerKey(serverName, config)];
  if (!isRegistrationPendingEntry(entry) || entry.clientId) return "unknown";
  let registrationNotOfferedAt = entry.discoveryState?.registrationNotOfferedAt;
  if (registrationNotOfferedAt === undefined) return "unknown";
  return isFreshTimestamp(registrationNotOfferedAt) ? "unable" : "recheck";
}
//@ chunk-e6aww6q8.js:3808887-3810244 placement
/**
 * 按凭据存储判断插件提供的 MCP 服务器哪些可用。
 */
async function filterPluginMcpServersByCredentials(plugin, servers, { sessionLoad }) {
  for (let [key, value] of Object.entries(servers))
    if ("redialToRelearnRegistration" in value) {
      let stripped = {
        ...value,
      };
      delete stripped.redialToRelearnRegistration;
      servers[key] = stripped;
    }
  if (
    marketplaceOf(plugin.source) !== SYNCED ||
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STARRY_LOCKET, false) !== true ||
    (recursiveLobsterOn() && getIsInteractive())
  )
    return;
  let candidates = [];
  for (let [key, value] of Object.entries(servers)) {
    if (
      (value.type !== "http" && value.type !== "sse") ||
      value.oauth?.clientId ||
      value.oauth?.xaa ||
      usesNonOAuthAuth(value) ||
      value.url.includes("${") ||
      !URL.canParse(value.url)
    )
      continue;
    let parsedUrl = new URL(value.url);
    if (parsedUrl.username === "" && parsedUrl.password === "") candidates.push([key, value]);
  }
  if (candidates.length === 0 || !isFlagSyncWanted()) return;
  let store;
  try {
    store = await readMcpOAuthStore();
  } catch (error) {
    logForDebugging(
      `Could not read the credentials store to judge ${plugin.name}'s MCP servers; keeping them all: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
  for (let [name, config] of candidates) {
    let mcpRegistrationOfferState = getMcpRegistrationOfferState(
      `plugin:${plugin.name}:${name}`,
      config,
      store,
    );
    if (mcpRegistrationOfferState === "recheck" && sessionLoad) {
      servers[name] = {
        ...config,
        redialToRelearnRegistration: true,
      };
      logForDebugging(
        `MCP server "${name}" of synced plugin ${plugin.name} is due a fresh sign-in check: its record that a terminal cannot register is more than ${MAX_REGISTRATION_AGE_MS / 86400000} days old or dated in the future`,
      );
    }
    if (mcpRegistrationOfferState !== "unable") continue;
    delete servers[name];
    if (!sessionLoad) continue;
    let seen = onProcessRootHost(mcpPluginIntegrationSlot);
    let key = `${plugin.source}
${name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    logForDebugging(
      `Left out MCP server "${name}" of synced plugin ${plugin.name}: its last sign-in attempt found no way for a terminal to register (GrowthBook flag ${TENGU_STARRY_LOCKET})`,
    );
    logEvent("tengu_plugins_sync_mcp_server_left_out", {
      transportType: fromEnumOpt(config.type),
      mcpServerBaseUrl: safeOrigin(getLoggingSafeMcpBaseUrl(config)),
      ...buildPluginSourceFields({
        pluginSource: plugin.source,
      }),
    });
  }
}
//@ chunk-e6aww6q8.js:3810244-3811399 fingerprint = loadMcpServersFromMcpb (0.907)
/**
 * 从插件里的 .mcpb/.dxt 包加载 MCP 服务器：loadMcpbFile 解压与生成配置，需要用户配置时返回 needs-config 状态。
 */
async function loadMcpServersFromMcpb(plugin, source, errors, warnings, storageV5, credentials) {
  let mcpbPath = redactUrlQuery(source);
  try {
    logForDebugging(`Loading MCP servers from MCPB: ${mcpbPath}`);
    let pluginId = plugin.repository;
    let result = await loadMcpbFile(
      source,
      plugin.path,
      pluginId,
      (status) => {
        logForDebugging(`MCPB [${plugin.name}]: ${status}`);
      },
      undefined,
      undefined,
      storageV5,
      credentials,
    );
    if ("status" in result && result.status === "needs-config") {
      logForDebugging(
        `MCPB ${mcpbPath} requires user configuration; MCP server "${quotedPrintable(result.manifest.name)}" not started. ` +
          `Configure via: /plugin \u2192 Installed \u2192 ${plugin.name} \u2192 Configure`,
      );
      warnings.push(mcpbNeedsConfigWarning(plugin, result.manifest.name));
      return null;
    }
    let successResult = result;
    let serverName = successResult.manifest.name;
    logForDebugging(
      `Loaded MCP server "${serverName}" from MCPB (extracted to ${successResult.extractedPath})`,
    );
    let mcpConfig =
      source.startsWith("http") || mcpbNeedsUserConfig(successResult.manifest)
        ? {
            ...successResult.mcpConfig,
            pluginEndpointTemplated: true,
          }
        : successResult.mcpConfig;
    return {
      [serverName]: mcpConfig,
    };
  } catch (error) {
    let errorMsg = redactUrlsInMessage(errorMessage(error));
    logForDebugging(`Failed to load MCPB ${mcpbPath}: ${errorMsg}`, {
      level: "error",
    });
    let source_2 = plugin.repository;
    if (source.startsWith("http") && (errorMsg.includes("download") || errorMsg.includes("network")))
      errors.push({
        type: "mcpb-download-failed",
        source: source_2,
        plugin: plugin.name,
        url: mcpbPath,
        reason: errorMsg,
      });
    else if (errorMsg.includes("manifest") || errorMsg.includes("user configuration"))
      errors.push({
        type: "mcpb-invalid-manifest",
        source: source_2,
        plugin: plugin.name,
        mcpbPath,
        validationError: errorMsg,
      });
    else
      errors.push({
        type: "mcpb-extract-failed",
        source: source_2,
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
function isExemptFromSkipPluginMcp(plugin, { fullIdsOnly }) {
  let exemptList = env.CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS_EXCEPT;
  if (!exemptList) return false;
  let isProjectLocal = isProjectLocalPlugin(plugin);
  if (fullIdsOnly && isProjectLocal) return false;
  let allowBareName = !fullIdsOnly && !isProjectLocal;
  return exemptList.split(",").some((entry) => {
    let trimmed = entry.trim();
    if (!trimmed) return false;
    return trimmed.includes("@")
      ? pluginNamesEqual(trimmed, plugin.repository)
      : allowBareName && pluginNamesEqual(trimmed, plugin.name);
  });
}
//@ chunk-e6aww6q8.js:3811812-3815254 layout
/**
 * 发现一个插件提供的 MCP 服务器：.mcp.json + manifest.mcpServers（路径/内联/MCPB 包），受 CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS(_EXCEPT)、CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES 等控制；返回 名字→配置。
 */
async function loadPluginMcpServersFromSources(
  plugin,
  errors = [],
  storageV5,
  credentials,
  { readOnlyListing = false, warnings = [] } = {},
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
  let fullIdExempt = isExemptFromSkipPluginMcp(plugin, {
    fullIdsOnly: true,
  });
  let skipLocal = !fullIdExempt && env.CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS;
  let skipBundles = skipLocal || (!fullIdExempt && env.CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES);
  let servers = {};
  let specWarnings = [];
  let isProjectLocal = isProjectLocalPlugin(plugin);
  let readOnlyDirPlugin = readOnlyListing && hasMarketplaceAlias(plugin.source);
  let omittedCount = 0;
  let isSkippedSpec = (spec) => {
    if (skipBundles && isMcpbSource(spec)) {
      logForDebugging(
        `Skipping MCPB source "${redactUrlQuery(spec)}" of plugin "${plugin.name}" (CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS or CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES is set)`,
      );
      return true;
    }
    if (readOnlyDirPlugin) {
      omittedCount++;
      return true;
    }
    if (!isProjectLocal) return false;
    if (isMcpbSource(spec)) {
      logForDebugging(
        `Skipping MCPB source "${redactUrlQuery(spec)}" for directory-loaded plugin "${plugin.name}": ` +
          "not resolved without a pre-approval download here \u2014 declare MCP servers inline or via a local in-dir .mcp.json.",
        {
          level: "warn",
        },
      );
      return true;
    }
    if (containsPathTraversal(spec) || spec.split(/[/\\]/).some((segment) => /^\.\. [ .]*$/.test(segment))) {
      logForDebugging(
        `Skipping out-of-directory MCP source "${redactUrlQuery(spec)}" for directory-loaded plugin "${plugin.name}": it may only reference files inside the plugin directory here.`,
        {
          level: "warn",
        },
      );
      return true;
    }
    return false;
  };
  let fileServers = readOnlyDirPlugin
    ? null
    : await loadMcpServersFromFile(plugin, ".mcp.json", storageV5, {
        confine: isProjectLocal,
      });
  if (fileServers)
    servers = {
      ...servers,
      ...fileServers,
    };
  if (plugin.manifest.mcpServers) {
    let mcpServers = plugin.manifest.mcpServers;
    if (typeof mcpServers === "string") {
      if (isSkippedSpec(mcpServers));
      else if (isMcpbSource(mcpServers)) {
        let mcpServersFromMcpb = await loadMcpServersFromMcpb(
          plugin,
          mcpServers,
          errors,
          specWarnings,
          storageV5,
          credentials,
        );
        if (mcpServersFromMcpb)
          servers = {
            ...servers,
            ...mcpServersFromMcpb,
          };
      } else {
        let mcpServersFromFile = await loadMcpServersFromFile(plugin, mcpServers, storageV5, {
          confine: isProjectLocal,
        });
        if (mcpServersFromFile)
          servers = {
            ...servers,
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
              if (isSkippedSpec(spec)) return null;
              if (isMcpbSource(spec))
                return await loadMcpServersFromMcpb(
                  plugin,
                  spec,
                  errors,
                  specWarnings,
                  storageV5,
                  credentials,
                );
              return await loadMcpServersFromFile(plugin, spec, storageV5, {
                confine: isProjectLocal,
              });
            }
            return spec;
          } catch (error) {
            let message =
              typeof spec === "string"
                ? replaceAll(String(error), join(plugin.path, spec), join(plugin.path, redactUrlQuery(spec)))
                : String(error);
            logForDebugging(
              `Failed to load MCP servers from spec for plugin ${plugin.name}: ${redactUrlsInMessage(message)}`,
              {
                level: "error",
              },
            );
            return null;
          }
        }),
      );
      for (let result of results)
        if (result)
          servers = {
            ...servers,
            ...result,
          };
      specWarnings.push(...mapped.flatMap(({ specWarnings }) => specWarnings));
    } else
      servers = {
        ...servers,
        ...mcpServers,
      };
  }
  if (omittedCount > 0)
    logForDebugging(
      `Read-only listing: omitted ${omittedCount} file / bundle MCP server source(s) of directory-loaded plugin "${plugin.name}" (inline declarations only; a session load resolves them).`,
    );
  for (let [key, value] of Object.entries(servers)) {
    let reason = unaddableTransportReason(value.type);
    if (reason === null) {
      if (skipLocal && value.type !== "sse" && value.type !== "http" && value.type !== "ws") {
        delete servers[key];
        logForDebugging(
          `Skipping MCP server "${key}" of plugin "${plugin.name}": only sse, http and ws servers load while CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS is set`,
        );
      }
      continue;
    }
    delete servers[key];
    errors.push({
      type: "mcp-config-invalid",
      source: plugin.source,
      plugin: plugin.name,
      serverName: key,
      validationError:
        reason === "host-only"
          ? `type "${value.type}" servers cannot be declared by a plugin; only the host application registers them`
          : `type "${value.type}" servers cannot be declared by a plugin; only claude.ai connectors use that type`,
    });
    logForDebugging(
      `Dropped MCP server "${key}" of plugin ${plugin.name}: ${reason} transport type "${value.type}"`,
      {
        level: "warn",
      },
    );
  }
  warnings.push(...specWarnings);
  let flattened = specWarnings.flatMap((warning) =>
    warning.type === "mcpb-needs-config" ? [warning.serverName] : [],
  );
  plugin.mcpServersNeedingConfig = flattened.length > 0 ? flattened : undefined;
  await filterPluginMcpServersByCredentials(plugin, servers, {
    sessionLoad: !readOnlyListing,
  });
  return Object.keys(servers).length > 0 ? servers : undefined;
}
//@ chunk-e6aww6q8.js:3815254-3815416 file-local
/**
 * 返回插件的 MCP 服务器（已缓存在插件对象上则直接用，否则发现后写回）。
 */
async function extractMcpServersFromPlugins(plugin, errors, storageV5, { warnings = [] } = {}) {
  if (plugin.mcpServers) {
    pushMcpbNeedsConfigWarnings(plugin, warnings);
    return plugin.mcpServers;
  }
  let pluginMcpServersFromSources = await loadPluginMcpServersFromSources(
    plugin,
    errors,
    storageV5,
    undefined,
    {
      warnings,
    },
  );
  if (pluginMcpServersFromSources) plugin.mcpServers = pluginMcpServersFromSources;
  return pluginMcpServersFromSources;
}
//@ chunk-e6aww6q8.js:3815416-3815494 layout
function pushMcpbNeedsConfigWarnings(plugin, warnings) {
  for (let serverName of plugin.mcpServersNeedingConfig ?? [])
    warnings.push(mcpbNeedsConfigWarning(plugin, serverName));
}
//@ chunk-e6aww6q8.js:3815494-3815592 layout
function mcpbNeedsConfigWarning(plugin, serverName) {
  return {
    type: "mcpb-needs-config",
    source: plugin.repository,
    plugin: plugin.name,
    serverName,
  };
}
//@ chunk-e6aww6q8.js:3815592-3816522 fingerprint = loadMcpServersFromFile (0.864)
/**
 * 读取插件内一个 MCP 配置文件（.mcp.json 形状），可限定不逃出插件目录；存储后端模式下经存储层读。
 */
async function loadMcpServersFromFile(plugin, relPath, storageV5, { confine = false } = {}) {
  let fs = getFsImplementation();
  let filePath = join(plugin.path, relPath);
  let redact = (message) =>
    replaceAll(message, join(plugin.path, relPath), join(plugin.path, redactUrlQuery(relPath)));
  if (confine) {
    let pluginDirComponentPath = await resolvePluginDirComponentPath(plugin, relPath);
    if (pluginDirComponentPath === null) return null;
    filePath = pluginDirComponentPath;
  }
  let content;
  let storageKey =
    isStorageV5Enabled() && storageV5 !== undefined
      ? cacheStorageKeyOrFallback(filePath, projectPluginCacheDir())
      : null;
  if (storageV5 !== undefined && storageKey !== null) {
    let readResult = await storageV5.read([storageKey]);
    if (!readResult.ok) {
      logForDebugging(
        redact(`Failed to load MCP servers from ${filePath}: ${formatStorageError(readResult.error)}`),
        {
          level: "error",
        },
      );
      return null;
    }
    let item = readResult.value.items[0];
    if (!item?.found) return null;
    content = Buffer.from(item.value).toString("utf-8");
  } else
    try {
      content = await fs.readFile(filePath, {
        encoding: "utf-8",
      });
    } catch (e) {
      if (isENOENT(e)) return null;
      logForDebugging(redact(`Failed to load MCP servers from ${filePath}: ${e}`), {
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
        logForDebugging(
          redact(`Invalid MCP server config for ${name} in ${filePath}: ${result.error.message}`),
          {
            level: "error",
          },
        );
    }
    return validatedServers;
  } catch (error) {
    logForDebugging(redact(`Failed to load MCP servers from ${filePath}: ${error}`), {
      level: "error",
    });
    return null;
  }
}
//@ chunk-e6aww6q8.js:3816522-3816871 fingerprint = getUnconfiguredChannels (1)
/**
 * 列出插件 manifest.channels 中缺少必填用户配置的频道（供启用时弹出配置对话框）。
 */
async function getUnconfiguredChannels(plugin, storageV5) {
  let channels = plugin.manifest.channels;
  if (!channels || channels.length === 0) return [];
  let pluginId = plugin.repository;
  let unconfigured = [];
  for (let channel of channels) {
    if (!channel.userConfig || Object.keys(channel.userConfig).length === 0) continue;
    let saved = (await loadMcpServerUserConfig(pluginId, channel.server, storageV5)) ?? {};
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
function addPluginScopeToServers_2(servers, name, pluginSource, pluginPath, officialVouched = false) {
  let scopedServers = {};
  let displayName = pluginDisplayKey(name, pluginSource);
  for (let [name, config] of Object.entries(servers)) {
    let scopedName = `plugin:${displayName}:${name}`;
    let scoped = {
      ...config,
      scope: "dynamic",
      pluginSource,
      pluginPath,
    };
    if (officialVouched) scoped.pluginOfficialSourceVouched = true;
    else delete scoped.pluginOfficialSourceVouched;
    scopedServers[scopedName] = scoped;
  }
  return scopedServers;
}
//@ chunk-e6aww6q8.js:3817125-3817371 fingerprint = loadChannelUserConfig (1)
/**
 * 合并插件级 userConfig 与频道级 userConfig 的已保存值（含默认值），供替换 ${user_config.X}。
 */
async function loadChannelUserConfig(plugin, serverName, storageV5) {
  let userConfig = plugin.manifest.userConfig;
  let userConfig_2 = plugin.manifest.channels?.find((channel) => channel.server === serverName)?.userConfig;
  if (!userConfig && !userConfig_2) return;
  let pluginOptions = userConfig ? await loadPluginOptions(marketplaceSource(plugin), storageV5) : undefined;
  let channelConfig = userConfig_2
    ? ((await loadMcpServerUserConfig(plugin.repository, serverName, storageV5)) ?? undefined)
    : undefined;
  return applyUserConfigDefaults(
    {
      ...pluginOptions,
      ...channelConfig,
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
  let missingVars = [];
  let configError;
  let originalUrl;
  let urlMissingVars = [];
  let stdioDiff;
  let blankList = scrubbedEnvKeys();
  let endpointTemplated = "pluginEndpointTemplated" in config && config.pluginEndpointTemplated === true;
  let resolveValue = (value, { remoteSink = false, selectsEndpoint = false } = {}) => {
    if (selectsEndpoint && value.includes("${CLAUDE_PROJECT_DIR}")) endpointTemplated = true;
    let resolved = substitutePluginVariables(value, plugin);
    let substituted = resolved;
    if (userConfig) resolved = substituteUserConfigVariables(resolved, userConfig);
    let { expanded, missingVars: missingVars_2 } = expandMcpCredentialEnvVars(
      resolved,
      undefined,
      undefined,
      {
        remoteSink,
        blankList,
      },
    );
    missingVars.push(...missingVars_2);
    if (selectsEndpoint && (expanded !== substituted || missingVars_2.length > 0)) endpointTemplated = true;
    return expanded;
  };
  let resolved;
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
      stdioDiff = stdioIdentityDiff(config, stdioConfig);
      resolved = stdioConfig;
      break;
    }
    case "sse":
    case "http":
    case "ws": {
      let remoteConfig = {
        ...config,
      };
      originalUrl = remoteConfig.url;
      let beforeCount = missingVars.length;
      if (remoteConfig.url)
        remoteConfig.url = resolveValue(remoteConfig.url, {
          remoteSink: true,
          selectsEndpoint: true,
        });
      urlMissingVars = missingVars.slice(beforeCount);
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
          configError = `headersHelper for MCP server '${serverName ?? "<unnamed>"}' references \${user_config.*}. The substituted value would be passed to a shell; read the value inside the helper script instead (e.g. from an env var set in the server's "env" block).`;
          if (errors && pluginName && serverName)
            errors.push({
              type: "mcp-config-invalid",
              source: plugin.source,
              plugin: pluginName,
              serverName,
              validationError: configError,
            });
        } else {
          let substitutedHelper = substitutePluginVariables(remoteConfig.headersHelper, plugin);
          let baseEnv = subprocessEnv();
          let scrubbedEnv = {
            ...baseEnv,
          };
          let secretNames = new Set(listSecretEnvNames(baseEnv));
          for (let name of secretNames) delete scrubbedEnv[name];
          Object.assign(scrubbedEnv, sanitizeEnvCredentials(scrubbedEnv).respelled);
          let replaced = substitutedHelper.replace(new RegExp(ENV_REF_PATTERN, "g"), (wholeRef, varName) =>
            secretNames.has(varName)
              ? wholeRef.includes(":-")
                ? wholeRef.slice(wholeRef.indexOf(":-") + 2, -1)
                : ""
              : wholeRef,
          );
          let { expanded, missingVars: missingVars_2 } = expandMcpCredentialEnvVars(
            replaced,
            scrubbedEnv,
            undefined,
            {
              blankAsLive: true,
              blankList,
            },
          );
          missingVars.push(...missingVars_2);
          remoteConfig.headersHelper = expanded;
        }
      resolved = remoteConfig;
      break;
    }
    case "sse-ide":
    case "ws-ide":
    case "sdk":
    case "claudeai-proxy":
      resolved = config;
      endpointTemplated = true;
      break;
  }
  if (errors && missingVars.length > 0) {
    let uniqueVars = uniq(missingVars);
    let varList = uniqueVars.join(", ");
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
          uniqueVars,
          isManagedPluginScope({
            pluginSource: plugin.source,
          }),
        ),
      });
  }
  let errorReason;
  if ((resolved.type === "sse" || resolved.type === "http" || resolved.type === "ws") && "url" in resolved) {
    let isValid = false;
    try {
      new URL(resolved.url);
      isValid = true;
    } catch {}
    if (!isValid) {
      if (!originalUrl?.trim()) {
        errorReason = "url_empty";
        configError = "No URL configured for this server";
      } else if (urlMissingVars.length > 0) {
        errorReason = "env_missing";
        configError = formatWithheldEnvNotice(
          uniq(urlMissingVars),
          isManagedPluginScope({
            pluginSource: plugin.source,
          }),
        );
      } else {
        errorReason = originalUrl.includes("${user_config.") ? "user_config_missing" : "url_invalid";
        configError =
          errorReason === "user_config_missing"
            ? `URL is unset or invalid \u2014 open /plugin manage and configure ${pluginName ?? "the plugin"} options`
            : `Plugin ${pluginName ?? plugin.source} has an invalid MCP url`;
        if (errors && pluginName && serverName)
          errors.push({
            type: "mcp-config-invalid",
            source: plugin.source,
            plugin: pluginName,
            serverName,
            validationError: configError,
          });
      }
    }
  }
  let resolvedConfig = {
    ...(stdioDiff && {
      configuredCommand: stdioDiff,
    }),
    ...resolved,
    ...(configError && {
      configError,
      configErrorReason: errorReason,
    }),
  };
  return endpointTemplated
    ? {
        ...resolvedConfig,
        pluginEndpointTemplated: true,
      }
    : resolvedConfig;
}
//@ chunk-e6aww6q8.js:3820347-3820777 fingerprint = getPluginMcpServers (0.644)
/**
 * 已启用插件的最终 MCP 服务器配置（变量已解析）；供 MCP 配置合并（services/mcp/config）使用。
 */
async function getPluginMcpServers(plugin, errors = [], storageV5, credentials, warnings = []) {
  if (!plugin.enabled) return;
  if (plugin.mcpServers) pushMcpbNeedsConfigWarnings(plugin, warnings);
  let servers =
    plugin.mcpServers ||
    (await loadPluginMcpServersFromSources(plugin, errors, storageV5, credentials, {
      warnings,
    }));
  if (!servers) return;
  let resolvedServers = {};
  for (let [name, config] of Object.entries(servers)) {
    let userConfig = await loadChannelUserConfig(plugin, name, credentials);
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
//@ chunk-k9mgeeff.js:3581-3828 fingerprint = loadPluginMcpServers (0.615)
/**
 * 列出插件声明的 MCP 服务器配置（.mcp.json 与 manifest.mcpServers 中的文件/内联项，不含 MCPB 包），用于展示。
 */
async function loadPluginMcpServers(plugin) {
  if (plugin.isBuiltin) return [];
  let nameLists = [await readMcpServerNames(await resolveComponentPath(plugin, ".mcp.json"))];
  for (let declaration of [plugin.manifest.mcpServers ?? []].flat())
    if (typeof declaration !== "string") nameLists.push(objectKeysOf(declaration));
    else if (
      !isMcpbSource(declaration) &&
      !containsPathTraversal(declaration) &&
      !hasDotDotWithSpaceSegment(declaration)
    )
      nameLists.push(await readMcpServerNames(await resolvePluginDirComponentPath(plugin, declaration)));
  return nameLists.flat();
}
//@ chunk-d4eg9at2.js:46214-46302 fingerprint = buildMcpUserConfig (1)
/**
 * 插件是否声明了 userConfig（名字配错，见 lead 建议）。
 */
function hasPluginUserConfig(plugin) {
  let userConfig = plugin?.manifest.userConfig;
  return userConfig && Object.keys(userConfig).length > 0 ? true : undefined;
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
