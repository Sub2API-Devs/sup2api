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
import { Wq } from "./loadPluginHooks.js";
import { trustedEnabledPlugins, TRUSTED_SETTING_SOURCES } from "./pluginConfigSources.js";
import { logForDebugging } from "../debug.js";
import { isOfficialPluginId, findPluginName } from "./pluginIdentifier.js";
import { nfcLower } from "../stringUtils.js";
import { mE } from "./headersHelper.js";
import { Eq, loadKnownMarketplacesSafe, getPluginByIdCacheOnly } from "./marketplaceManager.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  isInstallationRelevantToCurrentProject,
} from "./installedPluginsManager.js";
import { samePluginSource, sourceUrlAndRef } from "./pluginSourceUrl.js";
import { describeOtherMarketplaceInstalls, jqn, findBlockedMarketplace } from "./pluginDependencies.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { isPluginBlockedByPolicy } from "./marketplacePolicy.js";
import { _Bt } from "../../services/mcp/needsAuthCache.js";
import { jsonParse } from "../slowOperations.js";

/**
 * 返回当前启用的插件 id 列表（启动检查用的薄封装）。
 */
//@ chunk-pd0t5xas.js:2621-2655 facade-exports
async function checkEnabledPlugins() {
  return enabledPluginIds();
}
/**
 * 启动时列出设置（含 --add-dir）中启用的插件 ID。
 */
//@ chunk-pd0t5xas.js:2655-2976 facade-exports = checkEnabledPlugins (1)
function enabledPluginIds() {
  let settings = getInitialSettings_2(),
    enabledPlugins = [],
    addDirPlugins = getAddDirEnabledPlugins();
  for (let [r, i] of Object.entries(addDirPlugins)) {
    if (Wq(r)) continue;
    if (r.includes("@") && i) enabledPlugins.push(r);
  }
  if (settings.enabledPlugins)
    for (let [r, i] of Object.entries(settings.enabledPlugins)) {
      if (!r.includes("@")) continue;
      let d = Wq(r) ? trustedEnabledPlugins(r) : i,
        idx = enabledPlugins.indexOf(r);
      if (d) {
        if (idx === -1) enabledPlugins.push(r);
      } else if (idx !== -1) enabledPlugins.splice(idx, 1);
    }
  return enabledPlugins;
}
/**
 * 每个已启用插件 ID 当前由哪个可编辑作用域（user/project/local）决定，优先级 local > project > user。
 */
//@ chunk-pd0t5xas.js:2976-3800 facade-exports = getPluginEditableScopes (1)
function getPluginEditableScopes() {
  let result = new Map(),
    addDirPlugins = getAddDirEnabledPlugins();
  for (let [r, i] of Object.entries(addDirPlugins)) {
    if (!r.includes("@")) continue;
    if (Wq(r)) continue;
    if (i === !0) result.set(r, "flag");
    else if (i === !1) result.delete(r);
  }
  let scopeSources = [
    { scope: "managed", source: "policySettings" },
    { scope: "user", source: "userSettings" },
    { scope: "project", source: "projectSettings" },
    { scope: "local", source: "localSettings" },
    { scope: "flag", source: "flagSettings" },
  ];
  for (let { scope: scope, source: source } of scopeSources) {
    let settings = getSettingsForSourceForUpkeep(source);
    if (!settings?.enabledPlugins) continue;
    for (let [s, u] of Object.entries(settings.enabledPlugins)) {
      if (!s.includes("@")) continue;
      if (s in addDirPlugins && addDirPlugins[s] !== u)
        logForDebugging(`Plugin ${s} from --add-dir (${addDirPlugins[s]}) overridden by ${source} (${u})`);
      if (!TRUSTED_SETTING_SOURCES.includes(source) && Wq(s)) continue;
      if (u === !0) result.set(s, scope);
      else if (u === !1) result.delete(s);
    }
  }
  return (
    logForDebugging(
      `Found ${result.size} enabled plugins with scopes: ${Array.from(result.entries())
        .map(([r, i]) => `${r}(${i})`)
        .join(", ")}`,
    ),
    result
  );
}
/**
 * 在"插件 id → 可编辑作用域"映射中查找；精确找不到且 id 允许大小写不敏感时按规范化后的 id 再找。
 */
//@ chunk-pd0t5xas.js:3800-3923 facade-exports
function editableScopeOf(e, n) {
  let o = e.get(n);
  if (o !== void 0 || !isOfficialPluginId(n)) return o;
  let r = nfcLower(n);
  for (let [i, d] of e) if (nfcLower(i) === r) return d;
  return;
}
//@ chunk-4121qate.js:274600-274614 fingerprint = isPersistableScope (1)
var isPersistableScope = "flag";
/**
 * 如果输入的插件 ID 是某已安装插件的别名（同一插件在另一市场/ID），返回已安装的那个 ID。
 */
//@ chunk-e6aww6q8.js:4458476-4459079 fingerprint = installSelectedPlugins (0.466)
async function installSelectedPlugins(e, n) {
  {
    let r = mE(e);
    if (!r || !Eq()) return;
    let plugins = (
        isStorageV5Enabled() && n !== void 0 ? await loadInstalledPlugins(n) : loadInstalledPluginsSync()
      ).plugins,
      h = findPluginName(Object.keys(plugins), e);
    if (h !== void 0 && plugins[h]?.some(isInstallationRelevantToCurrentProject)) return;
    let y = await loadKnownMarketplacesSafe(n),
      S = await getPluginByIdCacheOnly(e, n),
      w = S ? samePluginSource(S.entry.source, sourceUrlAndRef(y[r]?.source)) : void 0;
    if (!S || w === void 0) return;
    let [L, ...G] = await describeOtherMarketplaceInstalls(e, S.entry, y, n);
    if (L === void 0 || G.length > 0) return;
    let settingSource = mE(L.pluginId);
    if (settingSource === OFFICIAL_MARKETPLACE_NAME) {
      let Z = await getPluginByIdCacheOnly(L.pluginId, n),
        Se = Z ? await describeOtherMarketplaceInstalls(L.pluginId, Z.entry, y, n) : [];
      if (!Z || Se.length > 0) return;
    }
    if (
      !jqn(r, settingSource) ||
      isPluginBlockedByPolicy(e) ||
      isPluginBlockedByPolicy(L.pluginId) ||
      findBlockedMarketplace(e, y) !== void 0 ||
      findBlockedMarketplace(L.pluginId, y) !== void 0
    )
      return;
    return { installed: L, repositoryKey: w };
  }
  return;
}
/**
 * 经存储层读取一个 JSON 文件（失败返回空对象）。名字配错，见 lead 建议。
 */
//@ chunk-rbwn7je9.js:1925-2104 fingerprint = findMissingPlugins (0.515)
async function findMissingPlugins(enabledPlugins) {
  try {
    let read = await enabledPlugins.read([_Bt()]);
    if (!read.ok) return {};
    let n = read.value.items[0];
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
