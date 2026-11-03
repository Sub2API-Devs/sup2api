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

//@ chunk-5a30rzw4.js:305-361 placement = TRUSTED_SETTING_SOURCES (1)
var TRUSTED_SETTING_SOURCES = ["userSettings", "flagSettings", "policySettings"];
//@ chunk-5a30rzw4.js:361-664 placement
function trustedPluginSetting(t) {
  let i = new Set(getEnabledSettingSources());
  let e = pluginIdAliases(t);
  let n;
  let r;
  for (let s of TRUSTED_SETTING_SOURCES) {
    if (!i.has(s)) continue;
    let pluginConfigs = getSettingsForSource(s)?.pluginConfigs;
    for (let u of e) {
      let o = pluginConfigs?.[u];
      if (o?.options)
        n = {
          ...n,
          ...o.options,
        };
      if (o?.mcpServers) {
        r = r ?? {};
        for (let [key, value] of Object.entries(o.mcpServers))
          r[key] = {
            ...r[key],
            ...value,
          };
      }
    }
  }
  return {
    options: n,
    mcpServers: r,
  };
}
//@ chunk-5a30rzw4.js:664-831 placement
function pluginIdAliases(t) {
  let i = legacyPluginIds(t);
  if (i.length > 0) return [...i.toReversed(), t];
  let e = `@${INLINE_PLUGIN_MARKETPLACE}`;
  let n = t.endsWith(e) ? t.slice(0, -e.length) : "";
  return n !== "" && !n.includes("@") ? [n, t] : [t];
}
//@ chunk-5a30rzw4.js:831-969 placement
function trustedEnabledPlugins(pluginId) {
  let i = new Set(getEnabledSettingSources());
  let e;
  for (let n of TRUSTED_SETTING_SOURCES) {
    if (!i.has(n)) continue;
    let r = lookupByPluginAliases(getSettingsForSource(n)?.enabledPlugins, pluginId);
    if (r !== undefined) e = r;
  }
  return e;
}
//@ chunk-5a30rzw4.js:969-1165 placement
function pluginSettingWriteTarget(t, i) {
  let e = canonicalPluginId(i);
  let n = legacyPluginIds(e);
  if (n.length === 0)
    return {
      deciding: i,
      written: i,
      replaced: [],
    };
  let filtered = n.filter((s) => t?.[s] !== undefined);
  return {
    deciding: t?.[e] === undefined ? (filtered[0] ?? e) : e,
    written: e,
    replaced: filtered,
  };
}
//@ chunk-5a30rzw4.js:1165-1254 placement
function lookupByPluginAliases(enabledPlugins, i) {
  let e = canonicalPluginId(i);
  return [e, ...legacyPluginIds(e), i].map((n) => enabledPlugins?.[n]).find((n) => n !== undefined);
}
export {
  pluginSettingWriteTarget,
  lookupByPluginAliases,
  TRUSTED_SETTING_SOURCES,
  trustedEnabledPlugins,
  trustedPluginSetting,
  pluginIdAliases,
};
