/**
 * utils/plugins/lspRecommendation.ts
 *
 * 按文件扩展名推荐提供 LSP 服务器的市场插件，记录忽略/永不推荐。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/lspRecommendation.ts
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: affinity 1, fingerprint 7, file-local 1
 */
import { extname } from "path";
import { logForDebugging } from "../debug.js";
import { loadKnownMarketplacesWithDeclared, getMarketplaceOrDirectoryCatalog } from "./marketplaceManager.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { isPluginInstalled } from "./installedPluginsManager.js";
import { isBinaryInstalled } from "../binaryCheck.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";

//@ chunk-czq1j3j2.js:1846218-1846228 affinity
var MAX_LSP_RECOMMENDATIONS = 5;
//@ chunk-czq1j3j2.js:1846228-1846508 fingerprint (2.1.88 match: extractLspInfoFromManifest, 1)
function extractLspInfoFromManifest(lspServers) {
  if (!lspServers) return null;
  if (typeof lspServers === "string") {
    logForDebugging("[lspRecommendation] Skipping string path lspServers (not readable from marketplace)");
    return null;
  }
  if (Array.isArray(lspServers)) {
    for (let item of lspServers) {
      if (typeof item === "string") continue;
      let info = extractFromServerConfigRecord(item);
      if (info) return info;
    }
    return null;
  }
  return extractFromServerConfigRecord(lspServers);
}
//@ chunk-czq1j3j2.js:1846508-1846561 file-local
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-czq1j3j2.js:1846561-1846859 fingerprint (2.1.88 match: extractFromServerConfigRecord, 1)
function extractFromServerConfigRecord(serverConfigs) {
  let extensions = new Set();
  let command = null;
  for (let [_serverName, config] of Object.entries(serverConfigs)) {
    if (!isRecord(config)) continue;
    if (!command && typeof config.command === "string") command = config.command;
    let extMapping = config.extensionToLanguage;
    if (isRecord(extMapping)) for (let ext of Object.keys(extMapping)) extensions.add(ext.toLowerCase());
  }
  if (!command || extensions.size === 0) return null;
  return {
    extensions,
    command,
  };
}
//@ chunk-czq1j3j2.js:1846859-1847392 fingerprint (2.1.88 match: getLspPluginsFromMarketplaces, 1)
async function getLspPluginsFromMarketplaces(storageV5) {
  let result = new Map();
  try {
    let config = await loadKnownMarketplacesWithDeclared(storageV5);
    for (let [marketplaceName, value] of Object.entries(config)) {
      if (!isSourceAllowedByPolicy(value.source)) continue;
      try {
        let marketplace = await getMarketplaceOrDirectoryCatalog(marketplaceName, storageV5);
        let isOfficial = isOfficialMarketplaceName_3(marketplaceName);
        for (let entry of marketplace.plugins) {
          if (!entry.lspServers) continue;
          let lspInfo = extractLspInfoFromManifest(entry.lspServers);
          if (!lspInfo) continue;
          let pluginId = `${entry.name}@${marketplaceName}`;
          result.set(pluginId, {
            entry,
            marketplaceName,
            extensions: lspInfo.extensions,
            command: lspInfo.command,
            isOfficial,
          });
        }
      } catch (error) {
        logForDebugging(`[lspRecommendation] Failed to load marketplace ${marketplaceName}: ${error}`);
      }
    }
  } catch (error) {
    logForDebugging(`[lspRecommendation] Failed to load marketplaces config: ${error}`);
  }
  return result;
}
//@ chunk-czq1j3j2.js:1847392-1848576 fingerprint (2.1.88 match: getMatchingLspPlugins, 1)
/**
 * 按文件扩展名在市场中找提供对应 LSP 服务器的插件（排除已安装和用户拒绝过的），用于“安装 LSP 插件？”提示。
 */
async function getMatchingLspPlugins(session, filePath, storageV5) {
  if (isLspRecommendationsDisabled()) {
    logForDebugging("[lspRecommendation] Recommendations are disabled");
    return [];
  }
  let ext = extname(filePath).toLowerCase();
  if (!ext) {
    logForDebugging("[lspRecommendation] No file extension found");
    return [];
  }
  logForDebugging(`[lspRecommendation] Looking for LSP plugins for ${ext}`);
  let allLspPlugins = await getLspPluginsFromMarketplaces(storageV5);
  let neverPlugins = getGlobalConfig().lspRecommendationNeverPlugins ?? [];
  let matchingPlugins = [];
  for (let [pluginId, info] of allLspPlugins) {
    if (!info.extensions.has(ext)) continue;
    if (neverPlugins.includes(pluginId)) {
      logForDebugging(`[lspRecommendation] Skipping ${pluginId} (in never suggest list)`);
      continue;
    }
    if (isPluginInstalled(pluginId)) {
      logForDebugging(`[lspRecommendation] Skipping ${pluginId} (already installed)`);
      continue;
    }
    matchingPlugins.push({
      info,
      pluginId,
    });
  }
  let pluginsWithBinary = [];
  for (let { info, pluginId } of matchingPlugins)
    if (await isBinaryInstalled(session, info.command)) {
      pluginsWithBinary.push({
        info,
        pluginId,
      });
      logForDebugging(`[lspRecommendation] Binary '${info.command}' found for ${pluginId}`);
    } else logForDebugging(`[lspRecommendation] Skipping ${pluginId} (binary '${info.command}' not found)`);
  pluginsWithBinary.sort((left, right) => {
    if (left.info.isOfficial && !right.info.isOfficial) return -1;
    if (!left.info.isOfficial && right.info.isOfficial) return 1;
    return 0;
  });
  return pluginsWithBinary.map(({ info, pluginId }) => ({
    pluginId,
    pluginName: getPluginDisplayName(info.entry),
    marketplaceName: info.marketplaceName,
    description: info.entry.description,
    isOfficial: info.isOfficial,
    extensions: Array.from(info.extensions),
    command: info.command,
  }));
}
//@ chunk-czq1j3j2.js:1848576-1848780 fingerprint (2.1.88 match: addToNeverSuggest, 1)
/**
 * 把插件加入 LSP 推荐“永不推荐”列表（全局 lspRecommendationNeverPlugins）。
 */
function addToNeverSuggest(pluginId, storageV5) {
  saveGlobalConfig((currentConfig) => {
    let current = currentConfig.lspRecommendationNeverPlugins ?? [];
    if (current.includes(pluginId)) return currentConfig;
    return {
      ...currentConfig,
      lspRecommendationNeverPlugins: [...current, pluginId],
    };
  }, storageV5);
  logForDebugging(`[lspRecommendation] Added ${pluginId} to never suggest`);
}
//@ chunk-czq1j3j2.js:1848780-1848950 fingerprint (2.1.88 match: incrementIgnoredCount, 1)
/**
 * LSP 推荐被忽略次数 +1（多次忽略后自动关闭）。
 */
function incrementIgnoredCount(storageV5) {
  saveGlobalConfig((currentConfig) => {
    let newCount = (currentConfig.lspRecommendationIgnoredCount ?? 0) + 1;
    return {
      ...currentConfig,
      lspRecommendationIgnoredCount: newCount,
    };
  }, storageV5);
  logForDebugging("[lspRecommendation] Incremented ignored count");
}
//@ chunk-czq1j3j2.js:1848950-1849059 fingerprint (2.1.88 match: isLspRecommendationsDisabled, 1)
function isLspRecommendationsDisabled() {
  let config = getGlobalConfig();
  return (
    config.lspRecommendationDisabled === true ||
    (config.lspRecommendationIgnoredCount ?? 0) >= MAX_LSP_RECOMMENDATIONS
  );
}
export { getMatchingLspPlugins, incrementIgnoredCount, addToNeverSuggest };
