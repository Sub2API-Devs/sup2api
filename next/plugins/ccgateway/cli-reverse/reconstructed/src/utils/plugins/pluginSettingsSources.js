/**
 * utils/plugins/pluginSettingsSources.ts
 *
 * 2.1.316 新增：插件设置来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
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

//@ chunk-5xgkngpb.js:706638-707068 placement
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
  let overrides = [];
  for (let [key, value] of Object.entries(enabledPlugins)) {
    if (value !== false) continue;
    let sources = hasTrustedOnlyBuiltinPlugin(key)
      ? filtered.filter((source) => TRUSTED_SETTING_SOURCES_2.includes(source))
      : filtered;
    let overridingSource = null;
    for (let source of sources) {
      let value = lookupByPluginAliases(getSettingsForSource(source)?.enabledPlugins, canonicalPluginId(key));
      if (value === undefined) continue;
      overridingSource = value === false ? null : source;
    }
    if (overridingSource === null) continue;
    overrides.push({
      pluginId: key,
      overriddenBy: overridingSource,
    });
  }
  return overrides;
}
//@ chunk-5xgkngpb.js:707068-707108 placement
/**
 * settingsSourcesReversed：反向的已启用设置源。
 */
function settingsSourcesReversed() {
  return [...getEnabledSettingSources()].reverse();
}
//@ chunk-5xgkngpb.js:707108-707187 placement
/**
 * enabledPluginRecordsBySource：各设置源的启用插件表。
 */
function enabledPluginRecordsBySource() {
  return settingsSourcesReversed().map((source) => ({
    source,
    record: getSettingsForSource(source)?.enabledPlugins,
  }));
}
//@ chunk-5xgkngpb.js:707187-707299 placement
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
//@ chunk-5xgkngpb.js:707299-707352 placement
function isNonOfficialMarketplacePlugin(pluginId) {
  let suffix = marketplaceSuffix(normalizePluginId(pluginId));
  return !isOfficialMarketplace_2(suffix) && suffix !== BUILTIN;
}
//@ chunk-5xgkngpb.js:707352-707477 placement
/**
 * 内置插件只保留受信设置源的值。
 */
function filterTrustedForBuiltin(pluginId, records) {
  if (!hasTrustedOnlyBuiltinPlugin(pluginId)) return records;
  let sources = settingsSourcesReversed();
  return records.map((record, index) => {
    let source = sources[index];
    return source !== undefined && TRUSTED_SETTING_SOURCES_2.includes(source) ? record : undefined;
  });
}
//@ chunk-5xgkngpb.js:707477-707532 placement
/**
 * pluginSettingRecords：非官方插件追加 addDir 来源。
 */
function pluginSettingRecords(pluginId, enabledFiles) {
  let records = enabledPluginRecordsBySource();
  return isNonOfficialMarketplacePlugin(pluginId) ? withAddDirPlugins(records, enabledFiles) : records;
}
//@ chunk-5xgkngpb.js:707532-707595 placement
/**
 * withAddDirPlugins：追加 addDir 启用插件。
 */
function withAddDirPlugins(records, enabledFiles) {
  return [
    ...records,
    {
      source: "addDir",
      record: getAddDirEnabledPlugins(enabledFiles),
    },
  ];
}
//@ chunk-5xgkngpb.js:707595-707874 placement
/**
 * 两份按源分组的 enabledPlugins 是否等价。
 */
function enabledPluginsEqual(left, right) {
  if (left.length !== right.length) return false;
  return left.every((leftRecord, index) => {
    let rightRecord = right[index];
    if (leftRecord === undefined || rightRecord === undefined) return leftRecord === rightRecord;
    let keys = Object.keys(leftRecord.record);
    if (keys.length !== Object.keys(rightRecord.record).length) return false;
    return keys.every(
      (key) =>
        key in rightRecord.record &&
        describePluginEnablement(rightRecord.record[key]) ===
          describePluginEnablement(leftRecord.record[key]),
    );
  });
}
//@ chunk-5xgkngpb.js:707874-707972 placement (2.1.88 match: semanticBoolean, 0.73)
function describePluginEnablement(value) {
  if (value === undefined) return "absent";
  if (value === false) return "false";
  return value === true ? "true" : "other";
}
export {
  settingsSourcesReversed,
  getEnabledPluginsBySource,
  findUserDisabledOverrides,
  withAddDirPlugins,
  enabledPluginRecordsBySource,
  pluginSettingRecords,
  filterTrustedForBuiltin,
  enabledPluginsEqual,
};
