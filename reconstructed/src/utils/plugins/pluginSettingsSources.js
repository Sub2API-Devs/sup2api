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
import { Wq } from "./loadPluginHooks.js";
import {
  TRUSTED_SETTING_SOURCES as TRUSTED_SETTING_SOURCES_2,
  lookupByPluginAliases,
} from "./pluginConfigSources.js";
import {
  canonicalPluginId,
  groupEnabledPlugins,
  marketplaceSuffix,
  normalizePluginId,
  isOfficialMarketplace,
} from "./pluginIdentifier.js";
import { BUILTIN } from "../telemetry/pluginTelemetry.js";
import { getAddDirEnabledPlugins } from "./addDirPluginSettings.js";

/**
 * 遍历用户设置中值为 false 的 enabledPlugins，找出被其他（内置插件只看受信）设置源重新启用的插件，返回 {pluginId, overriddenBy}。
 */
//@ chunk-e6aww6q8.js:696163-696593 placement
function findUserDisabledOverrides() {
  let e = getEnabledSettingSources();
  if (!e.includes("userSettings")) return [];
  let n = getSettingsForSource("userSettings")?.enabledPlugins;
  if (!n) return [];
  let filtered = e.filter((h) => h !== "userSettings"),
    s = [];
  for (let [h, y] of Object.entries(n)) {
    if (y !== !1) continue;
    let S = Wq(h) ? filtered.filter((L) => TRUSTED_SETTING_SOURCES_2.includes(L)) : filtered,
      w = null;
    for (let L of S) {
      let G = lookupByPluginAliases(getSettingsForSource(L)?.enabledPlugins, canonicalPluginId(h));
      if (G === void 0) continue;
      w = G === !1 ? null : L;
    }
    if (w === null) continue;
    s.push({ pluginId: h, overriddenBy: w });
  }
  return s;
}
//@ chunk-e6aww6q8.js:696593-696633 placement
function F8() {
  return [...getEnabledSettingSources()].reverse();
}
//@ chunk-e6aww6q8.js:696633-696712 placement
function djt() {
  return F8().map((e) => ({ source: e, record: getSettingsForSource(e)?.enabledPlugins }));
}
/**
 * 各设置源 enabledPlugins 的分组视图（policy 标为 managed）。
 */
//@ chunk-e6aww6q8.js:696712-696824 placement
function getEnabledPluginsBySource() {
  return djt().map(({ source: source, record: record }) =>
    record === void 0 ? void 0 : groupEnabledPlugins(record, { managed: source === "policySettings" }),
  );
}
//@ chunk-e6aww6q8.js:696824-696877 placement
function l_o(e) {
  let n = marketplaceSuffix(normalizePluginId(e));
  return !isOfficialMarketplace(n) && n !== BUILTIN;
}
/**
 * 内置插件只保留受信设置源的值。
 */
//@ chunk-e6aww6q8.js:696877-697002 placement
function filterTrustedForBuiltin(e, n) {
  if (!Wq(e)) return n;
  let r = F8();
  return n.map((s, h) => {
    let y = r[h];
    return y !== void 0 && TRUSTED_SETTING_SOURCES_2.includes(y) ? s : void 0;
  });
}
//@ chunk-e6aww6q8.js:697002-697053 placement
function _Br(e) {
  let n = djt();
  return l_o(e) ? j$o(n) : n;
}
//@ chunk-e6aww6q8.js:697053-697113 placement
function j$o(e) {
  return [...e, { source: "addDir", record: getAddDirEnabledPlugins() }];
}
/**
 * 两份按源分组的 enabledPlugins 是否等价。
 */
//@ chunk-e6aww6q8.js:697113-697392 placement
function enabledPluginsEqual(e, n) {
  if (e.length !== n.length) return !1;
  return e.every((r, s) => {
    let h = n[s];
    if (r === void 0 || h === void 0) return r === h;
    let keys = Object.keys(r.record);
    if (keys.length !== Object.keys(h.record).length) return !1;
    return keys.every((S) => S in h.record && YNt(h.record[S]) === YNt(r.record[S]));
  });
}
//@ chunk-e6aww6q8.js:697392-697490 placement
function YNt(e) {
  if (e === void 0) return "absent";
  if (e === !1) return "false";
  return e === !0 ? "true" : "other";
}

export {
  filterTrustedForBuiltin,
  getEnabledPluginsBySource,
  djt,
  _Br,
  j$o,
  F8,
  findUserDisabledOverrides,
  enabledPluginsEqual,
};
