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
import {
  getExternalPluginSkillMap,
  firstSkillNameForPlugin,
  skillNamesForPlugin,
  ANTHROPIC_SKILLS,
  isInlineOrSyncedSource,
} from "../../skills/syncedSkills.js";
import { nfcLower } from "../stringUtils.js";
import { uniq } from "../collections.js";
import {
  isReservedMarketplaceName,
  isNpmPluginId,
  pluginManifestPathSchemas,
  isValidNpmPackageName,
  PluginIdSchema,
  ALLOWED_OFFICIAL_MARKETPLACE_NAMES,
  COMMUNITY_MARKETPLACE_NAMES,
} from "./schemas.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";

//@ chunk-dcmhvw5a.js:137350-137395 placement
/**
 * 是否为官方市场名。
 */
function isOfficialMarketplace(marketplace) {
  return marketplace === INLINE_PLUGIN_MARKETPLACE || marketplace === SKILLS_DIR || marketplace === SYNCED;
}
//@ chunk-dcmhvw5a.js:137395-137502 placement
/**
 * 规范化插件 id（市场名部分）。
 */
function normalizePluginId(e) {
  let index = e.lastIndexOf("@");
  if (index <= 0) return e;
  return canonicalPluginId(`${e.slice(0, index)}@${normalizeReservedMarketplaceCase(e.slice(index + 1))}`);
}
//@ chunk-dcmhvw5a.js:137502-137662 placement
/**
 * 取插件的规范 id（重命名映射）。
 */
function canonicalPluginId(e) {
  let n = stripBuiltinSuffix(e);
  if (n === undefined) return e;
  let externalPluginSkillMap = getExternalPluginSkillMap();
  let s = identifierOrLower(n)[0];
  let a =
    externalPluginSkillMap.get(n) ??
    externalPluginSkillMap.get(nfcLower(n)) ??
    (s === undefined ? undefined : externalPluginSkillMap.get(s));
  return a === undefined ? e : `${a}@${BUILTIN}`;
}
//@ chunk-dcmhvw5a.js:137662-137736 placement
/**
 * 插件在官方市场下的 id。
 */
function officialPluginId(e) {
  let n = stripBuiltinSuffix(e);
  return n === undefined ? undefined : canonicalPluginId(`${nfcLower(n)}@${BUILTIN}`);
}
//@ chunk-dcmhvw5a.js:137736-137831 placement
function stripBuiltinSuffix(e) {
  let index = e.lastIndexOf("@");
  return index > 0 && normalizeReservedMarketplaceCase(e.slice(index + 1)) === BUILTIN
    ? e.slice(0, index)
    : undefined;
}
//@ chunk-dcmhvw5a.js:137831-137894 placement
/**
 * 插件显示键。
 */
function pluginDisplayKey(e, n) {
  return n.endsWith(`@${BUILTIN}`) ? (identifierOrLower(e)[0] ?? firstSkillNameForPlugin(e)) : e;
}
//@ chunk-dcmhvw5a.js:137894-137971 placement
/**
 * 插件名的别名列表。
 */
function pluginNameAliases({ name: e, source }) {
  return source.endsWith(`@${BUILTIN}`) ? [e, ...identifierOrLower(e)] : [e];
}
//@ chunk-dcmhvw5a.js:137971-138107 placement
/**
 * 内置插件名的别名列表（规范名与旧名）。
 */
function pluginNameAliases_2({ name: e, marketplace }) {
  if (normalizeReservedMarketplaceCase(marketplace) !== BUILTIN) return [e];
  let sliced = canonicalPluginId(`${e}@${BUILTIN}`).slice(0, -`@${BUILTIN}`.length);
  return uniq([e, sliced, ...identifierOrLower(sliced)]);
}
//@ chunk-dcmhvw5a.js:138107-138197 placement
/**
 * 插件的旧 id 列表。
 */
function legacyPluginIds(e) {
  let n = stripBuiltinSuffix(e);
  return n === undefined
    ? []
    : identifierOrLower(n)
        .map((r) => `${r}@${BUILTIN}`)
        .toReversed();
}
//@ chunk-dcmhvw5a.js:138197-138254 placement
function identifierOrLower(e) {
  let n = skillNamesForPlugin(e);
  return n.length > 0 ? n : skillNamesForPlugin(nfcLower(e));
}
//@ chunk-dcmhvw5a.js:138254-138309 placement
/**
 * normalizeReservedMarketplaceCase：保留市场名小写化。
 */
function normalizeReservedMarketplaceCase(e) {
  let lower = e.toLowerCase();
  return isReservedMarketplaceName(lower) ? lower : e;
}
//@ chunk-dcmhvw5a.js:138309-138346 placement
/**
 * 是否能识别出市场。
 */
function hasMarketplaceAlias(e) {
  return marketplaceOf(e) !== undefined;
}
//@ chunk-dcmhvw5a.js:138346-138496 placement
/**
 * 取插件来源的市场名。
 */
function marketplaceOf(e) {
  let n = marketplaceSuffix(e);
  if (isOfficialMarketplace(n)) return n;
  if (e.includes("@")) return;
  if (e.startsWith(`${INLINE_PLUGIN_MARKETPLACE}[`)) return INLINE_PLUGIN_MARKETPLACE;
  if (e.startsWith(`${SYNCED}[`)) return SYNCED;
  return;
}
//@ chunk-dcmhvw5a.js:138496-138568 placement
/**
 * 插件是否来自内置市场。
 */
function isFromBuiltinMarketplace(e) {
  return e.pluginSource !== undefined && marketplaceSuffix(e.pluginSource) === SYNCED;
}
//@ chunk-dcmhvw5a.js:138568-138606 placement
/**
 * pluginSettingAt：按启用插件名单查设置。
 */
function pluginSettingAt(e, n) {
  return findPluginSetting(e, groupEnabledPluginsList(n));
}
//@ chunk-dcmhvw5a.js:138606-138665 placement
function groupEnabledPluginsList(e) {
  return e.map((n) => (n === undefined ? undefined : groupEnabledPlugins(n)));
}
//@ chunk-dcmhvw5a.js:138665-138909 placement
/**
 * 按规范名归并 enabledPlugins。
 */
function groupEnabledPlugins(e, { managed: n = false } = {}) {
  let r = new Map();
  for (let [key, value] of Object.entries(e)) {
    if (value === undefined) continue;
    let c = nfcLower(key);
    let g = isInlineMarketplacePlugin(key, value);
    let m = r.get(c);
    if (m === undefined || m.enabled)
      r.set(c, {
        key,
        enabled: g && (m?.enabled ?? true),
      });
  }
  return {
    record: e,
    byFold: r,
    managed: n,
  };
}
//@ chunk-dcmhvw5a.js:138909-139001 placement
function isInlineMarketplacePlugin(e, n) {
  if (n === undefined) return false;
  let r = marketplaceSuffix(normalizePluginId(e));
  return r === INLINE_PLUGIN_MARKETPLACE || r === SKILLS_DIR ? n !== false : n === true;
}
//@ chunk-dcmhvw5a.js:139001-139055 placement
/**
 * 插件 id 是否属于官方市场。
 */
function isOfficialPluginId(e) {
  let n = marketplaceSuffix(normalizePluginId(e));
  return n === INLINE_PLUGIN_MARKETPLACE || n === SYNCED;
}
//@ chunk-dcmhvw5a.js:139055-139580 placement
/**
 * 在各层设置中找插件的启用记录。
 */
function findPluginSetting(e, n) {
  if (!isOfficialPluginId(e)) {
    let c = canonicalPluginId(e);
    let g = uniq([c, ...legacyPluginIds(c), e]);
    for (let [m, f] of n.entries()) {
      let found = g.find((y) => f?.record[y] !== undefined);
      if (found !== undefined)
        return {
          index: m,
          enabled: isInlineMarketplacePlugin(found, f?.record[found]),
          key: found,
        };
    }
    return;
  }
  let r = nfcLower(e);
  let s = normalizePluginId(e);
  let a =
    marketplaceSuffix(s) === SYNCED
      ? nfcLower(`${s.slice(0, s.lastIndexOf("@"))}@${INLINE_PLUGIN_MARKETPLACE}`)
      : undefined;
  for (let [c, g] of n.entries()) {
    if (g === undefined) continue;
    let m = g.byFold.get(r);
    if (m !== undefined)
      return {
        index: c,
        enabled: m.enabled,
        key: m.key,
      };
    if (a !== undefined) {
      let f = g.byFold.get(a);
      if (f !== undefined && !f.enabled)
        return {
          index: c,
          enabled: false,
          key: f.key,
        };
    }
  }
  return;
}
//@ chunk-dcmhvw5a.js:139580-139623 placement
/**
 * isPluginEnabled：插件是否启用。
 */
function isPluginEnabled(e, n) {
  return pluginSettingAt(e, n)?.enabled;
}
//@ chunk-dcmhvw5a.js:139623-139678 placement
/**
 * 是否为必需插件。
 */
function isRequiredPlugin(e, installationPreference) {
  return installationPreference === "required" && marketplaceSuffix(normalizePluginId(e)) === SYNCED;
}
//@ chunk-dcmhvw5a.js:139678-139808 placement
/**
 * 插件是否启用（托管禁用优先）。
 */
function isPluginEnabled_2(source, n, defaultEnabled, installationPreference) {
  let pluginSetting = findPluginSetting(source, n);
  if (pluginSetting !== undefined && !pluginSetting.enabled && n[pluginSetting.index]?.managed) return false;
  return (
    isRequiredPlugin(source, installationPreference) || (pluginSetting?.enabled ?? defaultEnabled !== false)
  );
}
//@ chunk-dcmhvw5a.js:139808-139845 placement
/**
 * isOfficialOrBuiltinMarketplace：官方市场或内置。
 */
function isOfficialOrBuiltinMarketplace(marketplace) {
  return isOfficialMarketplace(marketplace) || marketplace === BUILTIN;
}
//@ chunk-dcmhvw5a.js:139845-139916 placement
/**
 * 是否为项目本地插件。
 */
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
//@ chunk-dcmhvw5a.js:140039-140259 placement = isChannelAllowlisted (0.684)
/**
 * isChannelAllowlisted（实为解析插件标识）：把 "name@marketplace"、npm 包名或裸名解析成 {name, marketplace?}。
 */
function parsePluginIdentifier(pluginSource) {
  if (isNpmPluginId(pluginSource))
    return {
      name: pluginSource.slice(0, pluginSource.lastIndexOf("@")),
      marketplace: pluginManifestPathSchemas,
    };
  if (pluginSource.startsWith("@") && isValidNpmPackageName(pluginSource))
    return {
      name: pluginSource,
    };
  if (pluginSource.includes("@")) {
    let parts = pluginSource.split("@");
    return {
      name: parts[0] || "",
      marketplace: parts[1],
    };
  }
  return {
    name: pluginSource,
  };
}
//@ chunk-dcmhvw5a.js:140259-140372 placement
/**
 * 拆分插件 id 为名字和市场。
 */
function splitPluginId(e) {
  let index = e.lastIndexOf("@");
  if (index < 0)
    return {
      name: e,
    };
  return {
    name: e.slice(0, index),
    marketplace: e.slice(index + 1),
  };
}
//@ chunk-dcmhvw5a.js:140372-140508 placement
/**
 * 解析插件 id（npm 包、市场）。
 */
function parsePluginId(e) {
  let n = normalizePluginId(e);
  let npmPluginId = parseNpmPluginId(n);
  if (npmPluginId !== null)
    return {
      name: npmPluginId.packageName,
      marketplace: pluginManifestPathSchemas,
    };
  let s = splitPluginId(n);
  return isOfficialMarketplace(s.marketplace) ? s : parsePluginIdentifier(n);
}
//@ chunk-dcmhvw5a.js:140508-140827 placement
/**
 * 解析 npm 来源的插件 id。
 */
function parseNpmPluginId(e) {
  let n = normalizePluginId(e);
  let r = `@${pluginManifestPathSchemas}`;
  if (!n.endsWith(r) || n.length <= r.length) return null;
  let sliced = n.slice(0, -r.length);
  let a = sliced.startsWith("@") ? sliced.indexOf("@", 1) : sliced.indexOf("@");
  let c = a < 0 ? sliced : sliced.slice(0, a);
  let g = a < 0 ? undefined : sliced.slice(a + 1);
  if (!isValidNpmPackageName(c) || g === "") return null;
  return {
    packageName: c,
    ...(g !== undefined && {
      versionSpec: g,
    }),
    pluginId: `${c}${r}`,
  };
}
//@ chunk-dcmhvw5a.js:140827-140868 placement
/**
 * 拼接插件 id。
 */
function joinPluginId(e, n) {
  return n ? `${e}@${n}` : e;
}
//@ chunk-dcmhvw5a.js:140868-140964 placement
/**
 * 取 @ 后的市场名。
 */
function marketplaceSuffix(e) {
  let index = e.lastIndexOf("@");
  if (index < 0) return;
  let sliced = e.slice(index + 1);
  return sliced === "" ? undefined : sliced;
}
//@ chunk-dcmhvw5a.js:140964-141111 callgraph-witnessed = parsePluginIdentifier (1)
/**
 * 把 "name@marketplace" 拆成 {name, marketplace}；官方/内置/插件目录市场且 ID 不合法时只返回 name。
 */
function parsePluginIdentifier_2(plugin) {
  let { name: n, marketplace } = splitPluginId(plugin);
  if (
    (isOfficialOrCommunityMarketplace(marketplace) ||
      marketplace === BUILTIN ||
      marketplace === OFFICIAL_MARKETPLACE_NAME) &&
    !PluginIdSchema().safeParse(plugin).success
  )
    return {
      name: n,
    };
  return {
    name: n,
    marketplace,
  };
}
//@ chunk-dcmhvw5a.js:141111-141176 placement
/**
 * 名字比较：完全相等或大小写不敏感相等（插件/市场名匹配用）。
 */
function pluginNamesEqual(e, n) {
  return e === n || e.toLowerCase() === n.toLowerCase();
}
//@ chunk-dcmhvw5a.js:141231-141296 placement
/**
 * 在名字列表中找目标：先精确匹配，再大小写不敏感匹配。
 */
function findPluginName(e, n) {
  return e.find((r) => r === n) ?? e.find((r) => pluginNamesEqual(r, n));
}
//@ chunk-dcmhvw5a.js:141296-141353 layout
/**
 * 筛出插件名部分与给定名字（大小写不敏感）相同的插件 id。
 */
function pluginsNamed(e, n) {
  return e.filter((r) => pluginNamesEqual(parsePluginIdentifier(r).name, n));
}
//@ chunk-dcmhvw5a.js:141353-141412 callgraph-witnessed = isOfficialMarketplaceName (0)
/**
 * 市场名是否为官方市场（ALLOWED_OFFICIAL_MARKETPLACE_NAMES，忽略大小写）。
 */
function isOfficialMarketplaceName_3(marketplace) {
  return marketplace !== undefined && ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(marketplace.toLowerCase());
}
//@ chunk-dcmhvw5a.js:141412-141479 layout
/**
 * 是否为官方或社区市场名。
 */
function isOfficialOrCommunityMarketplace(marketplace) {
  return (
    isOfficialMarketplaceName_3(marketplace) ||
    (marketplace !== undefined && COMMUNITY_MARKETPLACE_NAMES.has(marketplace.toLowerCase()))
  );
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
//@ chunk-dcmhvw5a.js:142325-142367 layout
/**
 * 官方市场中的已知官方插件名（knowledge-work 等清单）。
 */
function isKnownOfficialPluginName(marketplace, marketplace_2) {
  return isInlineOrSyncedSource(marketplace_2) && OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES.has(marketplace);
}
//@ chunk-dcmhvw5a.js:142367-142444 fingerprint = SCOPE_TO_EDITABLE_SOURCE (1)
var SCOPE_TO_EDITABLE_SOURCE = {
  user: "userSettings",
  project: "projectSettings",
  local: "localSettings",
};
//@ chunk-dcmhvw5a.js:142444-142544 fingerprint = scopeToSettingSource (1)
/**
 * 作用域 → 可写设置源（user→userSettings、project→projectSettings、local→localSettings）；managed 不可安装，抛错。
 */
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
  isOfficialOrBuiltinMarketplace,
  hasMarketplaceAlias,
  isKnownOfficialPluginName,
  findPluginName,
  parsePluginId,
  isPluginEnabled_2,
  joinPluginId,
  legacyPluginIds,
  pluginsNamed,
  normalizePluginId,
  isRequiredPlugin,
  splitPluginId,
  isPluginEnabled,
  pluginSettingAt,
  SETTING_SOURCE_TO_SCOPE,
  pluginNameAliases_2,
  groupEnabledPlugins,
  isOfficialPluginId,
  findPluginSetting,
  pluginNameAliases,
  normalizeReservedMarketplaceCase,
  isOfficialOrCommunityMarketplace,
  isFromBuiltinMarketplace,
};
