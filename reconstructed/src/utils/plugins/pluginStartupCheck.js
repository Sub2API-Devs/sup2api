/**
 * utils/plugins/pluginStartupCheck.ts
 *
 * 启动时的启用插件清单、每个插件由哪个可编辑作用域决定、别名插件 ID 解析。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginStartupCheck.ts
 * pieces: chunk-4121qate.js (1), chunk-e6aww6q8.js (1), chunk-pd0t5xas.js (4), chunk-rbwn7je9.js (1)
 * attribution: fingerprint 3, facade-exports 4
 */
import { getInitialSettings_2, getSettingsForSourceForUpkeep } from "../settings/settings.js";
import { getAddDirEnabledPlugins } from "./addDirPluginSettings.js";
import { hasTrustedOnlyBuiltinPlugin } from "./loadPluginHooks.js";
import { trustedEnabledPlugins, TRUSTED_SETTING_SOURCES } from "./pluginConfigSources.js";
import { logForDebugging } from "../debug.js";
import { isOfficialPluginId, findPluginName } from "./pluginIdentifier.js";
import { nfcLower } from "../stringUtils.js";
import { marketplaceNameOfId } from "./headersHelper.js";
import {
  isPluginDirectoryAvailable,
  loadKnownMarketplacesSafe,
  getPluginByIdCacheOnly,
} from "./marketplaceManager.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  isInstallationRelevantToCurrentProject,
} from "./installedPluginsManager.js";
import { samePluginSource, sourceUrlAndRef } from "./pluginSourceUrl.js";
import {
  describeOtherMarketplaceInstalls,
  isMarketplaceNamed,
  findBlockedMarketplace,
} from "./pluginDependencies.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { isPluginBlockedByPolicy } from "./marketplacePolicy.js";
import { needsAuthCacheSpace } from "../../services/mcp/needsAuthCache.js";
import { jsonParse } from "../slowOperations.js";

//@ chunk-pd0t5xas.js:2621-2655 facade-exports
/**
 * 返回当前启用的插件 id 列表（启动检查用的薄封装）。
 */
async function checkEnabledPlugins() {
  return enabledPluginIds();
}
//@ chunk-pd0t5xas.js:2655-2976 facade-exports = checkEnabledPlugins (1)
/**
 * 启动时列出设置（含 --add-dir）中启用的插件 ID。
 */
function enabledPluginIds() {
  let settings = getInitialSettings_2();
  let enabledPlugins = [];
  let addDirPlugins = getAddDirEnabledPlugins();
  for (let [pluginId, value] of Object.entries(addDirPlugins)) {
    if (hasTrustedOnlyBuiltinPlugin(pluginId)) continue;
    if (pluginId.includes("@") && value) enabledPlugins.push(pluginId);
  }
  if (settings.enabledPlugins)
    for (let [pluginId, value] of Object.entries(settings.enabledPlugins)) {
      if (!pluginId.includes("@")) continue;
      let d = hasTrustedOnlyBuiltinPlugin(pluginId) ? trustedEnabledPlugins(pluginId) : value;
      let idx = enabledPlugins.indexOf(pluginId);
      if (d) {
        if (idx === -1) enabledPlugins.push(pluginId);
      } else if (idx !== -1) enabledPlugins.splice(idx, 1);
    }
  return enabledPlugins;
}
//@ chunk-pd0t5xas.js:2976-3800 facade-exports = getPluginEditableScopes (1)
/**
 * 每个已启用插件 ID 当前由哪个可编辑作用域（user/project/local）决定，优先级 local > project > user。
 */
function getPluginEditableScopes() {
  let result = new Map();
  let addDirPlugins = getAddDirEnabledPlugins();
  for (let [pluginId, value] of Object.entries(addDirPlugins)) {
    if (!pluginId.includes("@")) continue;
    if (hasTrustedOnlyBuiltinPlugin(pluginId)) continue;
    if (value === true) result.set(pluginId, "flag");
    else if (value === false) result.delete(pluginId);
  }
  let scopeSources = [
    {
      scope: "managed",
      source: "policySettings",
    },
    {
      scope: "user",
      source: "userSettings",
    },
    {
      scope: "project",
      source: "projectSettings",
    },
    {
      scope: "local",
      source: "localSettings",
    },
    {
      scope: "flag",
      source: "flagSettings",
    },
  ];
  for (let { scope, source } of scopeSources) {
    let settings = getSettingsForSourceForUpkeep(source);
    if (!settings?.enabledPlugins) continue;
    for (let [pluginId, value] of Object.entries(settings.enabledPlugins)) {
      if (!pluginId.includes("@")) continue;
      if (pluginId in addDirPlugins && addDirPlugins[pluginId] !== value)
        logForDebugging(
          `Plugin ${pluginId} from --add-dir (${addDirPlugins[pluginId]}) overridden by ${source} (${value})`,
        );
      if (!TRUSTED_SETTING_SOURCES.includes(source) && hasTrustedOnlyBuiltinPlugin(pluginId)) continue;
      if (value === true) result.set(pluginId, scope);
      else if (value === false) result.delete(pluginId);
    }
  }
  logForDebugging(
    `Found ${result.size} enabled plugins with scopes: ${Array.from(result.entries())
      .map(([id, scope]) => `${id}(${scope})`)
      .join(", ")}`,
  );
  return result;
}
//@ chunk-pd0t5xas.js:3800-3923 facade-exports
/**
 * 在"插件 id → 可编辑作用域"映射中查找；精确找不到且 id 允许大小写不敏感时按规范化后的 id 再找。
 */
function editableScopeOf(e, n) {
  let o = e.get(n);
  if (o !== undefined || !isOfficialPluginId(n)) return o;
  let r = nfcLower(n);
  for (let [i, d] of e) if (nfcLower(i) === r) return d;
  return;
}
//@ chunk-4121qate.js:274600-274614 fingerprint = isPersistableScope (1)
var isPersistableScope = "flag";
//@ chunk-e6aww6q8.js:4458476-4459079 fingerprint = installSelectedPlugins (0.466)
/**
 * 如果输入的插件 ID 是某已安装插件的别名（同一插件在另一市场/ID），返回已安装的那个 ID。
 */
async function installSelectedPlugins(e, n) {
  {
    let r = marketplaceNameOfId(e);
    if (!r || !isPluginDirectoryAvailable()) return;
    let plugins = (
      isStorageV5Enabled() && n !== undefined ? await loadInstalledPlugins(n) : loadInstalledPluginsSync()
    ).plugins;
    let pluginName = findPluginName(Object.keys(plugins), e);
    if (pluginName !== undefined && plugins[pluginName]?.some(isInstallationRelevantToCurrentProject)) return;
    let knownMarketplaces = await loadKnownMarketplacesSafe(n);
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(e, n);
    let w = pluginByIdCacheOnly
      ? samePluginSource(pluginByIdCacheOnly.entry.source, sourceUrlAndRef(knownMarketplaces[r]?.source))
      : undefined;
    if (!pluginByIdCacheOnly || w === undefined) return;
    let [L, ...G] = await describeOtherMarketplaceInstalls(
      e,
      pluginByIdCacheOnly.entry,
      knownMarketplaces,
      n,
    );
    if (L === undefined || G.length > 0) return;
    let settingSource = marketplaceNameOfId(L.pluginId);
    if (settingSource === OFFICIAL_MARKETPLACE_NAME) {
      let pluginByIdCacheOnly = await getPluginByIdCacheOnly(L.pluginId, n);
      let Se = pluginByIdCacheOnly
        ? await describeOtherMarketplaceInstalls(L.pluginId, pluginByIdCacheOnly.entry, knownMarketplaces, n)
        : [];
      if (!pluginByIdCacheOnly || Se.length > 0) return;
    }
    if (
      !isMarketplaceNamed(r, settingSource) ||
      isPluginBlockedByPolicy(e) ||
      isPluginBlockedByPolicy(L.pluginId) ||
      findBlockedMarketplace(e, knownMarketplaces) !== undefined ||
      findBlockedMarketplace(L.pluginId, knownMarketplaces) !== undefined
    )
      return;
    return {
      installed: L,
      repositoryKey: w,
    };
  }
  return;
}
//@ chunk-rbwn7je9.js:1925-2104 fingerprint = findMissingPlugins (0.515)
/**
 * 经存储层读取一个 JSON 文件（失败返回空对象）。名字配错，见 lead 建议。
 */
async function findMissingPlugins(enabledPlugins) {
  try {
    let r = await enabledPlugins.read([needsAuthCacheSpace()]);
    if (!r.ok) return {};
    let n = r.value.items[0];
    if (!n.found) return {};
    return jsonParse(Buffer.from(n.value).toString("utf8"));
  } catch {
    return {};
  }
}
export {
  checkEnabledPlugins,
  installSelectedPlugins,
  getPluginEditableScopes,
  isPersistableScope,
  editableScopeOf,
  enabledPluginIds,
  findMissingPlugins,
};
