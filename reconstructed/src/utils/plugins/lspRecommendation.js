/**
 * utils/plugins/lspRecommendation.ts
 *
 * 按文件扩展名推荐提供 LSP 服务器的市场插件，记录忽略/永不推荐。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/lspRecommendation.ts
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: affinity 1, fingerprint 7, file-local 1
 */
import { extname, extname as extname_2 } from "path";
import { logForDebugging } from "../debug.js";
import { loadKnownMarketplacesWithDeclared, getMarketplaceOrDirectoryCatalog } from "./marketplaceManager.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { isPluginInstalled } from "./installedPluginsManager.js";
import { isBinaryInstalled } from "../binaryCheck.js";
import { getPluginDisplayName } from "../../components/ManagedSettingsSecurityDialog/utils.js";

//@ chunk-18hwfzwa.js:1798239-1798249 affinity
var FGo = 5;
//@ chunk-18hwfzwa.js:1798249-1798529 fingerprint = extractLspInfoFromManifest (1)
function extractLspInfoFromManifest(lspServers) {
  if (!lspServers) return null;
  if (typeof lspServers === "string")
    return (
      logForDebugging("[lspRecommendation] Skipping string path lspServers (not readable from marketplace)"),
      null
    );
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
//@ chunk-18hwfzwa.js:1798529-1798582 file-local
function isRecord(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-18hwfzwa.js:1798582-1798880 fingerprint = extractFromServerConfigRecord (1)
function extractFromServerConfigRecord(serverConfigs) {
  let extensions = new Set(),
    command = null;
  for (let [L, ee] of Object.entries(serverConfigs)) {
    if (!isRecord(ee)) continue;
    if (!command && typeof ee.command === "string") command = ee.command;
    let extMapping = ee.extensionToLanguage;
    if (isRecord(extMapping)) for (let ext of Object.keys(extMapping)) extensions.add(ext.toLowerCase());
  }
  if (!command || extensions.size === 0) return null;
  return { extensions: extensions, command: command };
}
//@ chunk-18hwfzwa.js:1798880-1799413 fingerprint = getLspPluginsFromMarketplaces (1)
async function getLspPluginsFromMarketplaces(h) {
  let result = new Map();
  try {
    let marketplace = await loadKnownMarketplacesWithDeclared(h);
    for (let [L, ee] of Object.entries(marketplace)) {
      if (!isSourceAllowedByPolicy(ee.source)) continue;
      try {
        let ke = await getMarketplaceOrDirectoryCatalog(L, h),
          isOfficial = isOfficialMarketplaceName_3(L);
        for (let entry of ke.plugins) {
          if (!entry.lspServers) continue;
          let lspInfo = extractLspInfoFromManifest(entry.lspServers);
          if (!lspInfo) continue;
          let pluginId = `${entry.name}@${L}`;
          result.set(pluginId, {
            entry: entry,
            marketplaceName: L,
            extensions: lspInfo.extensions,
            command: lspInfo.command,
            isOfficial: isOfficial,
          });
        }
      } catch (error) {
        logForDebugging(`[lspRecommendation] Failed to load marketplace ${L}: ${error}`);
      }
    }
  } catch (error) {
    logForDebugging(`[lspRecommendation] Failed to load marketplaces config: ${error}`);
  }
  return result;
}
/**
 * 按文件扩展名在市场中找提供对应 LSP 服务器的插件（排除已安装和用户拒绝过的），用于“安装 LSP 插件？”提示。
 */
//@ chunk-18hwfzwa.js:1799413-1800597 fingerprint = getMatchingLspPlugins (1)
async function getMatchingLspPlugins(h, x, D) {
  if (isLspRecommendationsDisabled())
    return (logForDebugging("[lspRecommendation] Recommendations are disabled"), []);
  let ext = extname_2(x).toLowerCase();
  if (!ext) return (logForDebugging("[lspRecommendation] No file extension found"), []);
  logForDebugging(`[lspRecommendation] Looking for LSP plugins for ${ext}`);
  let ee = await getLspPluginsFromMarketplaces(D),
    neverPlugins = getGlobalConfig().lspRecommendationNeverPlugins ?? [],
    Be = [];
  for (let [We, ze] of ee) {
    if (!ze.extensions.has(ext)) continue;
    if (neverPlugins.includes(We)) {
      logForDebugging(`[lspRecommendation] Skipping ${We} (in never suggest list)`);
      continue;
    }
    if (isPluginInstalled(We)) {
      logForDebugging(`[lspRecommendation] Skipping ${We} (already installed)`);
      continue;
    }
    Be.push({ info: ze, pluginId: We });
  }
  let He = [];
  for (let { info: info, pluginId: pluginId } of Be)
    if (await isBinaryInstalled(h, info.command))
      (He.push({ info: info, pluginId: pluginId }),
        logForDebugging(`[lspRecommendation] Binary '${info.command}' found for ${pluginId}`));
    else logForDebugging(`[lspRecommendation] Skipping ${pluginId} (binary '${info.command}' not found)`);
  return (
    He.sort((We, ze) => {
      if (We.info.isOfficial && !ze.info.isOfficial) return -1;
      if (!We.info.isOfficial && ze.info.isOfficial) return 1;
      return 0;
    }),
    He.map(({ info: info, pluginId: pluginId }) => ({
      pluginId: pluginId,
      pluginName: getPluginDisplayName(info.entry),
      marketplaceName: info.marketplaceName,
      description: info.entry.description,
      isOfficial: info.isOfficial,
      extensions: Array.from(info.extensions),
      command: info.command,
    }))
  );
}
/**
 * 把插件加入 LSP 推荐“永不推荐”列表（全局 lspRecommendationNeverPlugins）。
 */
//@ chunk-18hwfzwa.js:1800597-1800801 fingerprint = addToNeverSuggest (1)
function addToNeverSuggest(h, x) {
  (saveGlobalConfig((currentConfig) => {
    let current = currentConfig.lspRecommendationNeverPlugins ?? [];
    if (current.includes(h)) return currentConfig;
    return { ...currentConfig, lspRecommendationNeverPlugins: [...current, h] };
  }, x),
    logForDebugging(`[lspRecommendation] Added ${h} to never suggest`));
}
/**
 * LSP 推荐被忽略次数 +1（多次忽略后自动关闭）。
 */
//@ chunk-18hwfzwa.js:1800801-1800971 fingerprint = incrementIgnoredCount (1)
function incrementIgnoredCount(h) {
  (saveGlobalConfig((currentConfig) => {
    let newCount = (currentConfig.lspRecommendationIgnoredCount ?? 0) + 1;
    return { ...currentConfig, lspRecommendationIgnoredCount: newCount };
  }, h),
    logForDebugging("[lspRecommendation] Incremented ignored count"));
}
//@ chunk-18hwfzwa.js:1800971-1801080 fingerprint = isLspRecommendationsDisabled (1)
function isLspRecommendationsDisabled() {
  let config = getGlobalConfig();
  return config.lspRecommendationDisabled === !0 || (config.lspRecommendationIgnoredCount ?? 0) >= FGo;
}

export { getMatchingLspPlugins, incrementIgnoredCount, addToNeverSuggest };
