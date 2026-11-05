/**
 * utils/plugins/pluginStartupCheck.ts
 *
 * 启动时的启用插件清单、每个插件由哪个可编辑作用域决定、别名插件 ID 解析。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginStartupCheck.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-f2v3cjkz.js (1), chunk-j8f885h1.js (1), chunk-tt36reb3.js (4)
 * attribution: fingerprint 3, facade-exports 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getInitialSettings, getSettingsForSourceForUpkeep } from "../settings/settings.js";
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

//@ chunk-j8f885h1.js:255792-255806 fingerprint (2.1.88 match: isPersistableScope, 1)
var FLAG_SCOPE = "flag";
//@ chunk-tt36reb3.js:2959-2993 facade-exports
/**
 * 返回当前启用的插件 id 列表（启动检查用的薄封装）。
 */
async function checkEnabledPlugins() {
  return enabledPluginIds();
}
//@ chunk-tt36reb3.js:2993-3314 facade-exports (2.1.88 match: checkEnabledPlugins, 1)
/**
 * 启动时列出设置（含 --add-dir）中启用的插件 ID。
 */
function enabledPluginIds() {
  let settings = getInitialSettings();
  let enabledPlugins = [];
  let addDirPlugins = getAddDirEnabledPlugins();
  for (let [pluginId, value] of Object.entries(addDirPlugins)) {
    if (hasTrustedOnlyBuiltinPlugin(pluginId)) continue;
    if (pluginId.includes("@") && value) enabledPlugins.push(pluginId);
  }
  if (settings.enabledPlugins)
    for (let [pluginId, value] of Object.entries(settings.enabledPlugins)) {
      if (!pluginId.includes("@")) continue;
      let value_2 = hasTrustedOnlyBuiltinPlugin(pluginId) ? trustedEnabledPlugins(pluginId) : value;
      let idx = enabledPlugins.indexOf(pluginId);
      if (value_2) {
        if (idx === -1) enabledPlugins.push(pluginId);
      } else if (idx !== -1) enabledPlugins.splice(idx, 1);
    }
  return enabledPlugins;
}
//@ chunk-tt36reb3.js:3314-4138 facade-exports (2.1.88 match: getPluginEditableScopes, 1)
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
//@ chunk-tt36reb3.js:4138-4261 facade-exports
/**
 * 在"插件 id → 可编辑作用域"映射中查找；精确找不到且 id 允许大小写不敏感时按规范化后的 id 再找。
 */
function editableScopeOf(map, pluginId) {
  let found = map.get(pluginId);
  if (found !== undefined || !isOfficialPluginId(pluginId)) return found;
  let lowered = nfcLower(pluginId);
  for (let [key, value] of map) if (nfcLower(key) === lowered) return value;
  return;
}
//@ chunk-f2v3cjkz.js:26489-26774 fingerprint (2.1.88 match: findMissingPlugins, 0.514)
async function batchReadWithFallback(sessionIds, pathFor, storageV5, parse) {
  if (sessionIds.length === 0) return [];
  let batch = await storageV5.read(sessionIds.map(pathFor));
  if (!batch.ok && sessionIds.length > 1)
    return (
      await Promise.all(
        sessionIds.map((sessionId) => batchReadWithFallback([sessionId], pathFor, storageV5, parse)),
      )
    ).map(([result]) => result ?? null);
  return Promise.all(
    sessionIds.map(async (sessionId, index) => {
      let item = batch.ok ? batch.value.items[index] : undefined;
      return item?.found ? parse(item.value, sessionId) : null;
    }),
  );
}
//@ chunk-5xgkngpb.js:4565156-4565763 fingerprint (2.1.88 match: installSelectedPlugins, 0.466)
/**
 * 如果输入的插件 ID 是某已安装插件的别名（同一插件在另一市场/ID），返回已安装的那个 ID。
 */
async function installSelectedPlugins(pluginId, storageV5) {
  {
    let marketplaceName = marketplaceNameOfId(pluginId);
    if (!marketplaceName || !isPluginDirectoryAvailable()) return;
    let plugins = (
      isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync()
    ).plugins;
    let pluginName = findPluginName(Object.keys(plugins), pluginId);
    if (pluginName !== undefined && plugins[pluginName]?.some(isInstallationRelevantToCurrentProject)) return;
    let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(pluginId, storageV5);
    let repositoryKey = pluginByIdCacheOnly
      ? samePluginSource(
          pluginByIdCacheOnly.entry.source,
          sourceUrlAndRef(knownMarketplaces[marketplaceName]?.source),
        )
      : undefined;
    if (!pluginByIdCacheOnly || repositoryKey === undefined) return;
    let [firstOther, ...restOthers] = await describeOtherMarketplaceInstalls(
      pluginId,
      pluginByIdCacheOnly.entry,
      knownMarketplaces,
      storageV5,
    );
    if (firstOther === undefined || restOthers.length > 0) return;
    let settingSource = marketplaceNameOfId(firstOther.pluginId);
    if (settingSource === OFFICIAL_MARKETPLACE_NAME) {
      let pluginByIdCacheOnly = await getPluginByIdCacheOnly(firstOther.pluginId, storageV5);
      let others = pluginByIdCacheOnly
        ? await describeOtherMarketplaceInstalls(
            firstOther.pluginId,
            pluginByIdCacheOnly.entry,
            knownMarketplaces,
            storageV5,
          )
        : [];
      if (!pluginByIdCacheOnly || others.length > 0) return;
    }
    if (
      !isMarketplaceNamed(marketplaceName, settingSource) ||
      isPluginBlockedByPolicy(pluginId) ||
      isPluginBlockedByPolicy(firstOther.pluginId) ||
      findBlockedMarketplace(pluginId, knownMarketplaces) !== undefined ||
      findBlockedMarketplace(firstOther.pluginId, knownMarketplaces) !== undefined
    )
      return;
    return {
      installed: firstOther,
      repositoryKey,
    };
  }
  return;
}
export {
  getPluginEditableScopes,
  editableScopeOf,
  enabledPluginIds,
  checkEnabledPlugins,
  installSelectedPlugins,
  batchReadWithFallback,
  FLAG_SCOPE,
};
