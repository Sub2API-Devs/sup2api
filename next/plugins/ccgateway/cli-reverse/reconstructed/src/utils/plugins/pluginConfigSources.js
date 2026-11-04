/**
 * utils/plugins/pluginConfigSources.ts
 *
 * 2.1.316 新增：插件设置的可信来源与别名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5a30rzw4.js (6)
 * attribution: placement 6
 */
import { getEnabledSettingSources } from "../settings/constants.js";
import { getSettingsForSource } from "../settings/settings.js";
import { legacyPluginIds, canonicalPluginId } from "./pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE } from "../telemetry/pluginTelemetry.js";

//@ chunk-5a30rzw4.js:305-361 placement (2.1.88 match: TRUSTED_SETTING_SOURCES, 1)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"];
//@ chunk-5a30rzw4.js:361-664 placement
function trustedPluginSetting(pluginId) {
  let enabledSources = new Set(getEnabledSettingSources());
  let aliases = pluginIdAliases(pluginId);
  let options;
  let mcpServers;
  for (let source of TRUSTED_SETTING_SOURCES) {
    if (!enabledSources.has(source)) continue;
    let pluginConfigs = getSettingsForSource(source)?.pluginConfigs;
    for (let alias of aliases) {
      let config = pluginConfigs?.[alias];
      if (config?.options)
        options = {
          ...options,
          ...config.options,
        };
      if (config?.mcpServers) {
        mcpServers = mcpServers ?? {};
        for (let [key, value] of Object.entries(config.mcpServers))
          mcpServers[key] = {
            ...mcpServers[key],
            ...value,
          };
      }
    }
  }
  return {
    options,
    mcpServers,
  };
}
//@ chunk-5a30rzw4.js:664-831 placement
function pluginIdAliases(pluginId) {
  let legacyIds = legacyPluginIds(pluginId);
  if (legacyIds.length > 0) return [...legacyIds.toReversed(), pluginId];
  let suffix = `@${INLINE_PLUGIN_MARKETPLACE}`;
  let bareName = pluginId.endsWith(suffix) ? pluginId.slice(0, -suffix.length) : "";
  return bareName !== "" && !bareName.includes("@") ? [bareName, pluginId] : [pluginId];
}
//@ chunk-5a30rzw4.js:831-969 placement
function trustedEnabledPlugins(pluginId) {
  let enabledSources = new Set(getEnabledSettingSources());
  let value;
  for (let source of TRUSTED_SETTING_SOURCES) {
    if (!enabledSources.has(source)) continue;
    let enabledValue = lookupByPluginAliases(getSettingsForSource(source)?.enabledPlugins, pluginId);
    if (enabledValue !== undefined) value = enabledValue;
  }
  return value;
}
//@ chunk-5a30rzw4.js:969-1165 placement
function pluginSettingWriteTarget(record, pluginId) {
  let canonical = canonicalPluginId(pluginId);
  let legacyIds = legacyPluginIds(canonical);
  if (legacyIds.length === 0)
    return {
      deciding: pluginId,
      written: pluginId,
      replaced: [],
    };
  let filtered = legacyIds.filter((id) => record?.[id] !== undefined);
  return {
    deciding: record?.[canonical] === undefined ? (filtered[0] ?? canonical) : canonical,
    written: canonical,
    replaced: filtered,
  };
}
//@ chunk-5a30rzw4.js:1165-1254 placement
function lookupByPluginAliases(enabledPlugins, pluginId) {
  let canonical = canonicalPluginId(pluginId);
  return [canonical, ...legacyPluginIds(canonical), pluginId]
    .map((id) => enabledPlugins?.[id])
    .find((value) => value !== undefined);
}
export {
  pluginSettingWriteTarget,
  lookupByPluginAliases,
  TRUSTED_SETTING_SOURCES,
  trustedEnabledPlugins,
  trustedPluginSetting,
  pluginIdAliases,
};
