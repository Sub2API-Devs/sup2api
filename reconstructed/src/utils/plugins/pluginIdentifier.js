/**
 * utils/plugins/pluginIdentifier.ts
 *
 * 并入已有模块：在各层设置中找插件的启用记录；解析 npm 来源的插件 id等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginIdentifier.ts
 * pieces: chunk-dcmhvw5a.js (42)
 * attribution: placement 33, fingerprint 3, callgraph-witnessed 2, layout 4
 */
import { INLINE_PLUGIN_MARKETPLACE, SKILLS_DIR, SYNCED, BUILTIN } from "../telemetry/pluginTelemetry.js";
import { Pt, la, _t, ANTHROPIC_SKILLS, da } from "../../skills/syncedSkills.js";
import { nfcLower } from "../stringUtils.js";
import { uniq } from "../collections.js";
import {
  isReservedMarketplaceName,
  isNpmPluginId,
  NPM,
  isValidNpmPackageName,
  PluginIdSchema,
  ALLOWED_OFFICIAL_MARKETPLACE_NAMES,
  COMMUNITY_MARKETPLACE_NAMES,
} from "./schemas.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";

/**
 * 是否为官方市场名。
 */
//@ chunk-dcmhvw5a.js:137350-137395 placement
function isOfficialMarketplace(e) {
  return e === INLINE_PLUGIN_MARKETPLACE || e === SKILLS_DIR || e === SYNCED;
}
/**
 * 规范化插件 id（市场名部分）。
 */
//@ chunk-dcmhvw5a.js:137395-137502 placement
function normalizePluginId(e) {
  let index = e.lastIndexOf("@");
  if (index <= 0) return e;
  return canonicalPluginId(`${e.slice(0, index)}@${mJt(e.slice(index + 1))}`);
}
/**
 * 取插件的规范 id（重命名映射）。
 */
//@ chunk-dcmhvw5a.js:137502-137662 placement
function canonicalPluginId(e) {
  let n = Hr(e);
  if (n === void 0) return e;
  let r = Pt(),
    s = nn(n)[0],
    a = r.get(n) ?? r.get(nfcLower(n)) ?? (s === void 0 ? void 0 : r.get(s));
  return a === void 0 ? e : `${a}@${BUILTIN}`;
}
/**
 * 插件在官方市场下的 id。
 */
//@ chunk-dcmhvw5a.js:137662-137736 placement
function officialPluginId(e) {
  let n = Hr(e);
  return n === void 0 ? void 0 : canonicalPluginId(`${nfcLower(n)}@${BUILTIN}`);
}
//@ chunk-dcmhvw5a.js:137736-137831 placement
function Hr(e) {
  let index = e.lastIndexOf("@");
  return index > 0 && mJt(e.slice(index + 1)) === BUILTIN ? e.slice(0, index) : void 0;
}
/**
 * 插件显示键。
 */
//@ chunk-dcmhvw5a.js:137831-137894 placement
function pluginDisplayKey(e, n) {
  return n.endsWith(`@${BUILTIN}`) ? (nn(e)[0] ?? la(e)) : e;
}
/**
 * 插件名的别名列表。
 */
//@ chunk-dcmhvw5a.js:137894-137971 placement
function pluginNameAliases({ name: e, source: source }) {
  return source.endsWith(`@${BUILTIN}`) ? [e, ...nn(e)] : [e];
}
/**
 * 内置插件名的别名列表（规范名与旧名）。
 */
//@ chunk-dcmhvw5a.js:137971-138107 placement
function pluginNameAliases_2({ name: e, marketplace: marketplace }) {
  if (mJt(marketplace) !== BUILTIN) return [e];
  let sliced = canonicalPluginId(`${e}@${BUILTIN}`).slice(0, -`@${BUILTIN}`.length);
  return uniq([e, sliced, ...nn(sliced)]);
}
/**
 * 插件的旧 id 列表。
 */
//@ chunk-dcmhvw5a.js:138107-138197 placement
function legacyPluginIds(e) {
  let n = Hr(e);
  return n === void 0
    ? []
    : nn(n)
        .map((r) => `${r}@${BUILTIN}`)
        .toReversed();
}
//@ chunk-dcmhvw5a.js:138197-138254 placement
function nn(e) {
  let n = _t(e);
  return n.length > 0 ? n : _t(nfcLower(e));
}
//@ chunk-dcmhvw5a.js:138254-138309 placement
function mJt(e) {
  let lower = e.toLowerCase();
  return isReservedMarketplaceName(lower) ? lower : e;
}
/**
 * 是否能识别出市场。
 */
//@ chunk-dcmhvw5a.js:138309-138346 placement
function hasMarketplaceAlias(e) {
  return marketplaceOf(e) !== void 0;
}
/**
 * 取插件来源的市场名。
 */
//@ chunk-dcmhvw5a.js:138346-138496 placement
function marketplaceOf(e) {
  let n = marketplaceSuffix(e);
  if (isOfficialMarketplace(n)) return n;
  if (e.includes("@")) return;
  if (e.startsWith(`${INLINE_PLUGIN_MARKETPLACE}[`)) return INLINE_PLUGIN_MARKETPLACE;
  if (e.startsWith(`${SYNCED}[`)) return SYNCED;
  return;
}
/**
 * 插件是否来自内置市场。
 */
//@ chunk-dcmhvw5a.js:138496-138568 placement
function isFromBuiltinMarketplace(e) {
  return e.pluginSource !== void 0 && marketplaceSuffix(e.pluginSource) === SYNCED;
}
//@ chunk-dcmhvw5a.js:138568-138606 placement
function Jps(e, n) {
  return findPluginSetting(e, Gy(n));
}
//@ chunk-dcmhvw5a.js:138606-138665 placement
function Gy(e) {
  return e.map((n) => (n === void 0 ? void 0 : groupEnabledPlugins(n)));
}
/**
 * 按规范名归并 enabledPlugins。
 */
//@ chunk-dcmhvw5a.js:138665-138909 placement
function groupEnabledPlugins(e, { managed: n = !1 } = {}) {
  let r = new Map();
  for (let [s, a] of Object.entries(e)) {
    if (a === void 0) continue;
    let c = nfcLower(s),
      g = ld(s, a),
      m = r.get(c);
    if (m === void 0 || m.enabled) r.set(c, { key: s, enabled: g && (m?.enabled ?? !0) });
  }
  return { record: e, byFold: r, managed: n };
}
//@ chunk-dcmhvw5a.js:138909-139001 placement
function ld(e, n) {
  if (n === void 0) return !1;
  let r = marketplaceSuffix(normalizePluginId(e));
  return r === INLINE_PLUGIN_MARKETPLACE || r === SKILLS_DIR ? n !== !1 : n === !0;
}
/**
 * 插件 id 是否属于官方市场。
 */
//@ chunk-dcmhvw5a.js:139001-139055 placement
function isOfficialPluginId(e) {
  let n = marketplaceSuffix(normalizePluginId(e));
  return n === INLINE_PLUGIN_MARKETPLACE || n === SYNCED;
}
/**
 * 在各层设置中找插件的启用记录。
 */
//@ chunk-dcmhvw5a.js:139055-139580 placement
function findPluginSetting(e, n) {
  if (!isOfficialPluginId(e)) {
    let c = canonicalPluginId(e),
      g = uniq([c, ...legacyPluginIds(c), e]);
    for (let [m, f] of n.entries()) {
      let found = g.find((y) => f?.record[y] !== void 0);
      if (found !== void 0) return { index: m, enabled: ld(found, f?.record[found]), key: found };
    }
    return;
  }
  let r = nfcLower(e),
    s = normalizePluginId(e),
    a =
      marketplaceSuffix(s) === SYNCED
        ? nfcLower(`${s.slice(0, s.lastIndexOf("@"))}@${INLINE_PLUGIN_MARKETPLACE}`)
        : void 0;
  for (let [c, g] of n.entries()) {
    if (g === void 0) continue;
    let m = g.byFold.get(r);
    if (m !== void 0) return { index: c, enabled: m.enabled, key: m.key };
    if (a !== void 0) {
      let f = g.byFold.get(a);
      if (f !== void 0 && !f.enabled) return { index: c, enabled: !1, key: f.key };
    }
  }
  return;
}
//@ chunk-dcmhvw5a.js:139580-139623 placement
function vPi(e, n) {
  return Jps(e, n)?.enabled;
}
/**
 * 是否为必需插件。
 */
//@ chunk-dcmhvw5a.js:139623-139678 placement
function isRequiredPlugin(e, n) {
  return n === "required" && marketplaceSuffix(normalizePluginId(e)) === SYNCED;
}
/**
 * 插件是否启用（托管禁用优先）。
 */
//@ chunk-dcmhvw5a.js:139678-139808 placement
function isPluginEnabled(e, n, r, s) {
  let a = findPluginSetting(e, n);
  if (a !== void 0 && !a.enabled && n[a.index]?.managed) return !1;
  return isRequiredPlugin(e, s) || (a?.enabled ?? r !== !1);
}
//@ chunk-dcmhvw5a.js:139808-139845 placement
function mbr(e) {
  return isOfficialMarketplace(e) || e === BUILTIN;
}
/**
 * 是否为项目本地插件。
 */
//@ chunk-dcmhvw5a.js:139845-139916 placement
function isProjectLocalPlugin(e) {
  return e.scope === "project" && e.source.endsWith(`@${SKILLS_DIR}`);
}
//@ chunk-dcmhvw5a.js:139916-140039 fingerprint = SETTING_SOURCE_TO_SCOPE (1)
var SETTING_SOURCE_TO_SCOPE = {
  policySettings: "managed",
  userSettings: "user",
  projectSettings: "project",
  localSettings: "local",
  flagSettings: "flag",
};
/**
 * isChannelAllowlisted（实为解析插件标识）：把 "name@marketplace"、npm 包名或裸名解析成 {name, marketplace?}。
 */
//@ chunk-dcmhvw5a.js:140039-140259 placement = isChannelAllowlisted (0.684)
function parsePluginIdentifier(pluginSource) {
  if (isNpmPluginId(pluginSource))
    return { name: pluginSource.slice(0, pluginSource.lastIndexOf("@")), marketplace: NPM };
  if (pluginSource.startsWith("@") && isValidNpmPackageName(pluginSource)) return { name: pluginSource };
  if (pluginSource.includes("@")) {
    let parts = pluginSource.split("@");
    return { name: parts[0] || "", marketplace: parts[1] };
  }
  return { name: pluginSource };
}
/**
 * 拆分插件 id 为名字和市场。
 */
//@ chunk-dcmhvw5a.js:140259-140372 placement
function splitPluginId(e) {
  let index = e.lastIndexOf("@");
  if (index < 0) return { name: e };
  return { name: e.slice(0, index), marketplace: e.slice(index + 1) };
}
/**
 * 解析插件 id（npm 包、市场）。
 */
//@ chunk-dcmhvw5a.js:140372-140508 placement
function parsePluginId(e) {
  let n = normalizePluginId(e),
    r = parseNpmPluginId(n);
  if (r !== null) return { name: r.packageName, marketplace: NPM };
  let s = splitPluginId(n);
  return isOfficialMarketplace(s.marketplace) ? s : parsePluginIdentifier(n);
}
/**
 * 解析 npm 来源的插件 id。
 */
//@ chunk-dcmhvw5a.js:140508-140827 placement
function parseNpmPluginId(e) {
  let n = normalizePluginId(e),
    r = `@${NPM}`;
  if (!n.endsWith(r) || n.length <= r.length) return null;
  let sliced = n.slice(0, -r.length),
    a = sliced.startsWith("@") ? sliced.indexOf("@", 1) : sliced.indexOf("@"),
    c = a < 0 ? sliced : sliced.slice(0, a),
    g = a < 0 ? void 0 : sliced.slice(a + 1);
  if (!isValidNpmPackageName(c) || g === "") return null;
  return { packageName: c, ...(g !== void 0 && { versionSpec: g }), pluginId: `${c}${r}` };
}
/**
 * 拼接插件 id。
 */
//@ chunk-dcmhvw5a.js:140827-140868 placement
function joinPluginId(e, n) {
  return n ? `${e}@${n}` : e;
}
/**
 * 取 @ 后的市场名。
 */
//@ chunk-dcmhvw5a.js:140868-140964 placement
function marketplaceSuffix(e) {
  let index = e.lastIndexOf("@");
  if (index < 0) return;
  let sliced = e.slice(index + 1);
  return sliced === "" ? void 0 : sliced;
}
/**
 * 把 "name@marketplace" 拆成 {name, marketplace}；官方/内置/插件目录市场且 ID 不合法时只返回 name。
 */
//@ chunk-dcmhvw5a.js:140964-141111 callgraph-witnessed = parsePluginIdentifier (1)
function parsePluginIdentifier_2(plugin) {
  let { name: n, marketplace: marketplace } = splitPluginId(plugin);
  if (
    (isOfficialOrCommunityMarketplace(marketplace) ||
      marketplace === BUILTIN ||
      marketplace === OFFICIAL_MARKETPLACE_NAME) &&
    !PluginIdSchema().safeParse(plugin).success
  )
    return { name: n };
  return { name: n, marketplace: marketplace };
}
/**
 * 名字比较：完全相等或大小写不敏感相等（插件/市场名匹配用）。
 */
//@ chunk-dcmhvw5a.js:141111-141176 placement
function pluginNamesEqual(e, n) {
  return e === n || e.toLowerCase() === n.toLowerCase();
}
/**
 * 在名字列表中找目标：先精确匹配，再大小写不敏感匹配。
 */
//@ chunk-dcmhvw5a.js:141231-141296 placement
function findPluginName(e, n) {
  return e.find((r) => r === n) ?? e.find((r) => pluginNamesEqual(r, n));
}
/**
 * 筛出插件名部分与给定名字（大小写不敏感）相同的插件 id。
 */
//@ chunk-dcmhvw5a.js:141296-141353 layout
function Qps(e, n) {
  return e.filter((r) => pluginNamesEqual(parsePluginIdentifier(r).name, n));
}
/**
 * 市场名是否为官方市场（ALLOWED_OFFICIAL_MARKETPLACE_NAMES，忽略大小写）。
 */
//@ chunk-dcmhvw5a.js:141353-141412 callgraph-witnessed = isOfficialMarketplaceName (0)
function isOfficialMarketplaceName_3(marketplace) {
  return marketplace !== void 0 && ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(marketplace.toLowerCase());
}
/**
 * 是否为官方或社区市场名。
 */
//@ chunk-dcmhvw5a.js:141412-141479 layout
function isOfficialOrCommunityMarketplace(e) {
  return isOfficialMarketplaceName_3(e) || (e !== void 0 && COMMUNITY_MARKETPLACE_NAMES.has(e.toLowerCase()));
}
//@ chunk-dcmhvw5a.js:141479-142325 layout
var OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES = new Set([
  ANTHROPIC_SKILLS,
  "core",
  "cowork-plugin-management",
  "data",
  "design",
  "engineering",
  "enterprise-search",
  "figma",
  "finance",
  "human-resources",
  "internal-apps",
  "legal",
  "marketing",
  "operations",
  "product-management",
  "productivity",
  "sales",
  "small-business",
  "ai-governance-legal",
  "cocounsel-legal",
  "commercial-legal",
  "corporate-legal",
  "employment-legal",
  "ip-legal",
  "law-student",
  "legal-builder-hub",
  "legal-clinic",
  "litigation-legal",
  "privacy-legal",
  "product-legal",
  "regulatory-legal",
  "healthcare",
  "fhir-developer",
  "npi-registry",
  "icd10-codes",
  "pubmed",
  "prior-auth-review",
  "cms-coverage",
  "clinical-trial-protocol",
  "documents",
  "asana",
  "bigquery",
  "claude-tag-data-viz",
  "claude-tag-oncall",
  "claude-tag-troubleshoot",
  "confluence",
  "datadog",
  "google-drive",
  "grafana",
  "hubspot",
  "jira",
  "linear",
  "notion",
  "pagerduty",
  "redshift",
  "salesforce",
  "sentry",
  "snowflake",
]);
/**
 * 官方市场中的已知官方插件名（knowledge-work 等清单）。
 */
//@ chunk-dcmhvw5a.js:142325-142367 layout
function isKnownOfficialPluginName(e, n) {
  return da(n) && OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES.has(e);
}
//@ chunk-dcmhvw5a.js:142367-142444 fingerprint = SCOPE_TO_EDITABLE_SOURCE (1)
var SCOPE_TO_EDITABLE_SOURCE = { user: "userSettings", project: "projectSettings", local: "localSettings" };
/**
 * 作用域 → 可写设置源（user→userSettings、project→projectSettings、local→localSettings）；managed 不可安装，抛错。
 */
//@ chunk-dcmhvw5a.js:142444-142544 fingerprint = scopeToSettingSource (1)
function scopeToSettingSource(scope) {
  if (scope === "managed") throw Error("Cannot install plugins to managed scope");
  return SCOPE_TO_EDITABLE_SOURCE[scope];
}

export {
  isOfficialMarketplaceName_3,
  officialPluginId,
  pluginDisplayKey,
  isProjectLocalPlugin,
  parsePluginIdentifier,
  marketplaceSuffix,
  parsePluginIdentifier_2,
  canonicalPluginId,
  pluginNamesEqual,
  marketplaceOf,
  scopeToSettingSource,
  parseNpmPluginId,
  isOfficialMarketplace,
  mbr,
  hasMarketplaceAlias,
  isKnownOfficialPluginName,
  findPluginName,
  parsePluginId,
  isPluginEnabled,
  joinPluginId,
  legacyPluginIds,
  Qps,
  normalizePluginId,
  isRequiredPlugin,
  splitPluginId,
  vPi,
  Jps,
  SETTING_SOURCE_TO_SCOPE,
  pluginNameAliases_2,
  groupEnabledPlugins,
  isOfficialPluginId,
  findPluginSetting,
  pluginNameAliases,
  mJt,
  isOfficialOrCommunityMarketplace,
  isFromBuiltinMarketplace,
};
