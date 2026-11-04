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
  return settingsSourcesReversed().map((source) => ({
    source,
    record: getSettingsForSource(source)?.enabledPlugins,
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
function isNonOfficialMarketplacePlugin(pluginId) {
  let suffix = marketplaceSuffix(normalizePluginId(pluginId));
  return !isOfficialMarketplace_2(suffix) && suffix !== BUILTIN;
}
//@ chunk-e6aww6q8.js:696877-697002 placement
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
//@ chunk-e6aww6q8.js:697002-697053 placement
/**
 * pluginSettingRecords：非官方插件追加 addDir 来源。
 */
function pluginSettingRecords(pluginId) {
  let records = enabledPluginRecordsBySource();
  return isNonOfficialMarketplacePlugin(pluginId) ? withAddDirPlugins(records) : records;
}
//@ chunk-e6aww6q8.js:697053-697113 placement
/**
 * withAddDirPlugins：追加 addDir 启用插件。
 */
function withAddDirPlugins(records) {
  return [
    ...records,
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
//@ chunk-e6aww6q8.js:697392-697490 placement
function describePluginEnablement(value) {
  if (value === undefined) return "absent";
  if (value === false) return "false";
  return value === true ? "true" : "other";
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
