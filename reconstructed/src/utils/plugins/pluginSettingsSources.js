/**
 * utils/plugins/pluginSettingsSources.ts
 *
 * 2.1.316 新增：插件设置来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { getEnabledSettingSources } from "../settings/constants.js";
import { getSettingsForSource } from "../settings/settings.js";
import { hasTrustedOnlyBuiltinPlugin } from "./loadPluginHooks.js";
import {
  TRUSTED_SETTING_SOURCES as TRUSTED_SETTING_SOURCES_2,
  lookupByPluginAliases,
} from "./pluginConfigSources.js";
import {
  canonicalPluginId,
  groupEnabledPlugins,
  marketplaceSuffix,
  normalizePluginId,
  isOfficialMarketplace as isOfficialMarketplace_2,
} from "./pluginIdentifier.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { getAddDirEnabledPlugins } from "./addDirPluginSettings.js";

//@ chunk-e6aww6q8.js:696163-696593 placement
/**
 * 遍历用户设置中值为 false 的 enabledPlugins，找出被其他（内置插件只看受信）设置源重新启用的插件，返回 {pluginId, overriddenBy}。
 */
function findUserDisabledOverrides() {
  let enabledSettingSources = getEnabledSettingSources();
  if (!enabledSettingSources.includes("userSettings")) return [];
  let enabledPlugins = getSettingsForSource("userSettings")?.enabledPlugins;
  if (!enabledPlugins) return [];
  let filtered = enabledSettingSources.filter(
    (enabledSettingSource) => enabledSettingSource !== "userSettings",
  );
  let s = [];
  for (let [key, value] of Object.entries(enabledPlugins)) {
    if (value !== false) continue;
    let S = hasTrustedOnlyBuiltinPlugin(key)
      ? filtered.filter((L) => TRUSTED_SETTING_SOURCES_2.includes(L))
      : filtered;
    let w = null;
    for (let L of S) {
      let G = lookupByPluginAliases(getSettingsForSource(L)?.enabledPlugins, canonicalPluginId(key));
      if (G === undefined) continue;
      w = G === false ? null : L;
    }
    if (w === null) continue;
    s.push({
      pluginId: key,
      overriddenBy: w,
    });
  }
  return s;
}
//@ chunk-e6aww6q8.js:696593-696633 placement
/**
 * settingsSourcesReversed：反向的已启用设置源。
 */
function settingsSourcesReversed() {
  return [...getEnabledSettingSources()].reverse();
}
//@ chunk-e6aww6q8.js:696633-696712 placement
/**
 * enabledPluginRecordsBySource：各设置源的启用插件表。
 */
function enabledPluginRecordsBySource() {
  return settingsSourcesReversed().map((e) => ({
    source: e,
    record: getSettingsForSource(e)?.enabledPlugins,
  }));
}
//@ chunk-e6aww6q8.js:696712-696824 placement
/**
 * 各设置源 enabledPlugins 的分组视图（policy 标为 managed）。
 */
function getEnabledPluginsBySource() {
  return enabledPluginRecordsBySource().map(({ source, record }) =>
    record === undefined
      ? undefined
      : groupEnabledPlugins(record, {
          managed: source === "policySettings",
        }),
  );
}
//@ chunk-e6aww6q8.js:696824-696877 placement
function isNonOfficialMarketplacePlugin(e) {
  let n = marketplaceSuffix(normalizePluginId(e));
  return !isOfficialMarketplace_2(n) && n !== BUILTIN;
}
//@ chunk-e6aww6q8.js:696877-697002 placement
/**
 * 内置插件只保留受信设置源的值。
 */
function filterTrustedForBuiltin(e, n) {
  if (!hasTrustedOnlyBuiltinPlugin(e)) return n;
  let r = settingsSourcesReversed();
  return n.map((s, h) => {
    let y = r[h];
    return y !== undefined && TRUSTED_SETTING_SOURCES_2.includes(y) ? s : undefined;
  });
}
//@ chunk-e6aww6q8.js:697002-697053 placement
/**
 * pluginSettingRecords：非官方插件追加 addDir 来源。
 */
function pluginSettingRecords(e) {
  let n = enabledPluginRecordsBySource();
  return isNonOfficialMarketplacePlugin(e) ? withAddDirPlugins(n) : n;
}
//@ chunk-e6aww6q8.js:697053-697113 placement
/**
 * withAddDirPlugins：追加 addDir 启用插件。
 */
function withAddDirPlugins(e) {
  return [
    ...e,
    {
      source: "addDir",
      record: getAddDirEnabledPlugins(),
    },
  ];
}
//@ chunk-e6aww6q8.js:697113-697392 placement
/**
 * 两份按源分组的 enabledPlugins 是否等价。
 */
function enabledPluginsEqual(e, n) {
  if (e.length !== n.length) return false;
  return e.every((r, s) => {
    let h = n[s];
    if (r === undefined || h === undefined) return r === h;
    let keys = Object.keys(r.record);
    if (keys.length !== Object.keys(h.record).length) return false;
    return keys.every(
      (S) => S in h.record && describePluginEnablement(h.record[S]) === describePluginEnablement(r.record[S]),
    );
  });
}
//@ chunk-e6aww6q8.js:697392-697490 placement
function describePluginEnablement(e) {
  if (e === undefined) return "absent";
  if (e === false) return "false";
  return e === true ? "true" : "other";
}
export {
  filterTrustedForBuiltin,
  getEnabledPluginsBySource,
  enabledPluginRecordsBySource,
  pluginSettingRecords,
  withAddDirPlugins,
  settingsSourcesReversed,
  findUserDisabledOverrides,
  enabledPluginsEqual,
};
