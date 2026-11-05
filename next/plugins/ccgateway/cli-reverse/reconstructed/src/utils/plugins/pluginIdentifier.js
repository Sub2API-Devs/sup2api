/**
 * utils/plugins/pluginIdentifier.ts
 *
 * 并入已有模块：在各层设置中找插件的启用记录；解析 npm 来源的插件 id等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginIdentifier.ts
 * pieces: chunk-z20c443b.js (42)
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:137495-137540 placement
/**
 * 是否为官方市场名。
 */
function isOfficialMarketplace(marketplace) {
  return marketplace === INLINE_PLUGIN_MARKETPLACE || marketplace === SKILLS_DIR || marketplace === SYNCED;
}
//@ chunk-z20c443b.js:137540-137647 placement
/**
 * 规范化插件 id（市场名部分）。
 */
function normalizePluginId(pluginId) {
  let index = pluginId.lastIndexOf("@");
  if (index <= 0) return pluginId;
  return canonicalPluginId(
    `${pluginId.slice(0, index)}@${normalizeReservedMarketplaceCase(pluginId.slice(index + 1))}`,
  );
}
//@ chunk-z20c443b.js:137647-137807 placement
/**
 * 取插件的规范 id（重命名映射）。
 */
function canonicalPluginId(pluginId) {
  let withoutBuiltin = stripBuiltinSuffix(pluginId);
  if (withoutBuiltin === undefined) return pluginId;
  let externalPluginSkillMap = getExternalPluginSkillMap();
  let firstAlias = identifierOrLower(withoutBuiltin)[0];
  let canonicalBase =
    externalPluginSkillMap.get(withoutBuiltin) ??
    externalPluginSkillMap.get(nfcLower(withoutBuiltin)) ??
    (firstAlias === undefined ? undefined : externalPluginSkillMap.get(firstAlias));
  return canonicalBase === undefined ? pluginId : `${canonicalBase}@${BUILTIN}`;
}
//@ chunk-z20c443b.js:137807-137881 placement
/**
 * 插件在官方市场下的 id。
 */
function officialPluginId(pluginId) {
  let withoutBuiltin = stripBuiltinSuffix(pluginId);
  return withoutBuiltin === undefined
    ? undefined
    : canonicalPluginId(`${nfcLower(withoutBuiltin)}@${BUILTIN}`);
}
//@ chunk-z20c443b.js:137881-137976 placement
function stripBuiltinSuffix(pluginId) {
  let index = pluginId.lastIndexOf("@");
  return index > 0 && normalizeReservedMarketplaceCase(pluginId.slice(index + 1)) === BUILTIN
    ? pluginId.slice(0, index)
    : undefined;
}
//@ chunk-z20c443b.js:137976-138039 placement
/**
 * 插件显示键。
 */
function pluginDisplayKey(pluginName, source) {
  return source.endsWith(`@${BUILTIN}`)
    ? (identifierOrLower(pluginName)[0] ?? firstSkillNameForPlugin(pluginName))
    : pluginName;
}
//@ chunk-z20c443b.js:138039-138116 placement
/**
 * 插件名的别名列表。
 */
function pluginNameAliases({ name, source }) {
  return source.endsWith(`@${BUILTIN}`) ? [name, ...identifierOrLower(name)] : [name];
}
//@ chunk-z20c443b.js:138116-138252 placement
/**
 * 内置插件名的别名列表（规范名与旧名）。
 */
function pluginNameAliases_2({ name, marketplace }) {
  if (normalizeReservedMarketplaceCase(marketplace) !== BUILTIN) return [name];
  let sliced = canonicalPluginId(`${name}@${BUILTIN}`).slice(0, -`@${BUILTIN}`.length);
  return normalizeCaseForComparison_2([name, sliced, ...identifierOrLower(sliced)]);
}
//@ chunk-z20c443b.js:138252-138342 placement
/**
 * 插件的旧 id 列表。
 */
function legacyPluginIds(pluginId) {
  let withoutBuiltin = stripBuiltinSuffix(pluginId);
  return withoutBuiltin === undefined
    ? []
    : identifierOrLower(withoutBuiltin)
        .map((alias) => `${alias}@${BUILTIN}`)
        .toReversed();
}
//@ chunk-z20c443b.js:138342-138399 placement
function identifierOrLower(pluginName) {
  let aliases = skillNamesForPlugin(pluginName);
  return aliases.length > 0 ? aliases : skillNamesForPlugin(nfcLower(pluginName));
}
//@ chunk-z20c443b.js:138399-138454 placement
/**
 * normalizeReservedMarketplaceCase：保留市场名小写化。
 */
function normalizeReservedMarketplaceCase(marketplace) {
  let lower = marketplace.toLowerCase();
  return isReservedMarketplaceName(lower) ? lower : marketplace;
}
//@ chunk-z20c443b.js:138454-138492 placement
/**
 * 是否能识别出市场。
 */
function hasMarketplaceAlias(pluginSource) {
  return marketplaceOf(pluginSource) !== undefined;
}
//@ chunk-z20c443b.js:138492-138642 placement
/**
 * 取插件来源的市场名。
 */
function marketplaceOf(pluginSource) {
  let suffix = marketplaceSuffix(pluginSource);
  if (isOfficialMarketplace(suffix)) return suffix;
  if (pluginSource.includes("@")) return;
  if (pluginSource.startsWith(`${INLINE_PLUGIN_MARKETPLACE}[`)) return INLINE_PLUGIN_MARKETPLACE;
  if (pluginSource.startsWith(`${SYNCED}[`)) return SYNCED;
  return;
}
//@ chunk-z20c443b.js:138642-138714 placement
/**
 * 插件是否来自内置市场。
 */
function isFromBuiltinMarketplace(command) {
  return command.pluginSource !== undefined && marketplaceSuffix(command.pluginSource) === SYNCED;
}
//@ chunk-z20c443b.js:138714-138752 placement
/**
 * pluginSettingAt：按启用插件名单查设置。
 */
function pluginSettingAt(pluginId, settings) {
  return findPluginSetting(pluginId, groupEnabledPluginsList(settings));
}
//@ chunk-z20c443b.js:138752-138811 placement
function groupEnabledPluginsList(settingsList) {
  return settingsList.map((settings) => (settings === undefined ? undefined : groupEnabledPlugins(settings)));
}
//@ chunk-z20c443b.js:138811-139055 placement
/**
 * 按规范名归并 enabledPlugins。
 */
function groupEnabledPlugins(record, { managed = false } = {}) {
  let byFold = new Map();
  for (let [key, value] of Object.entries(record)) {
    if (value === undefined) continue;
    let foldedKey = nfcLower(key);
    let enabledValue = isInlineMarketplacePlugin(key, value);
    let existing = byFold.get(foldedKey);
    if (existing === undefined || existing.enabled)
      byFold.set(foldedKey, {
        key,
        enabled: enabledValue && (existing?.enabled ?? true),
      });
  }
  return {
    record,
    byFold,
    managed,
  };
}
//@ chunk-z20c443b.js:139055-139147 placement
function isInlineMarketplacePlugin(key, value) {
  if (value === undefined) return false;
  let suffix = marketplaceSuffix(normalizePluginId(key));
  return suffix === INLINE_PLUGIN_MARKETPLACE || suffix === SKILLS_DIR ? value !== false : value === true;
}
//@ chunk-z20c443b.js:139147-139201 placement
/**
 * 插件 id 是否属于官方市场。
 */
function isOfficialPluginId(pluginId) {
  let suffix = marketplaceSuffix(normalizePluginId(pluginId));
  return suffix === INLINE_PLUGIN_MARKETPLACE || suffix === SYNCED;
}
//@ chunk-z20c443b.js:139201-139726 placement
/**
 * 在各层设置中找插件的启用记录。
 */
function findPluginSetting(pluginId, settingsList) {
  if (!isOfficialPluginId(pluginId)) {
    let canonical = canonicalPluginId(pluginId);
    let candidates = normalizeCaseForComparison_2([canonical, ...legacyPluginIds(canonical), pluginId]);
    for (let [index, entry] of settingsList.entries()) {
      let key = candidates.find((candidate) => entry?.record[candidate] !== undefined);
      if (key !== undefined)
        return {
          index,
          enabled: isInlineMarketplacePlugin(key, entry?.record[key]),
          key,
        };
    }
    return;
  }
  let foldedId = nfcLower(pluginId);
  let normalized = normalizePluginId(pluginId);
  let inlineKey =
    marketplaceSuffix(normalized) === SYNCED
      ? nfcLower(`${normalized.slice(0, normalized.lastIndexOf("@"))}@${INLINE_PLUGIN_MARKETPLACE}`)
      : undefined;
  for (let [index, entry] of settingsList.entries()) {
    if (entry === undefined) continue;
    let match = entry.byFold.get(foldedId);
    if (match !== undefined)
      return {
        index,
        enabled: match.enabled,
        key: match.key,
      };
    if (inlineKey !== undefined) {
      let inlineMatch = entry.byFold.get(inlineKey);
      if (inlineMatch !== undefined && !inlineMatch.enabled)
        return {
          index,
          enabled: false,
          key: inlineMatch.key,
        };
    }
  }
  return;
}
//@ chunk-z20c443b.js:139726-139769 placement
/**
 * isPluginEnabled：插件是否启用。
 */
function isPluginEnabled(pluginId, settingsList) {
  return pluginSettingAt(pluginId, settingsList)?.enabled;
}
//@ chunk-z20c443b.js:139769-139824 placement
/**
 * 是否为必需插件。
 */
function isRequiredPlugin(pluginId, installationPreference) {
  return installationPreference === "required" && marketplaceSuffix(normalizePluginId(pluginId)) === SYNCED;
}
//@ chunk-z20c443b.js:139824-139954 placement
/**
 * 插件是否启用（托管禁用优先）。
 */
function isPluginEnabled_2(pluginId, settingsList, defaultEnabled, installationPreference) {
  let pluginSetting = findPluginSetting(pluginId, settingsList);
  if (pluginSetting !== undefined && !pluginSetting.enabled && settingsList[pluginSetting.index]?.managed)
    return false;
  return (
    isRequiredPlugin(pluginId, installationPreference) || (pluginSetting?.enabled ?? defaultEnabled !== false)
  );
}
//@ chunk-z20c443b.js:139954-139991 placement
/**
 * isOfficialOrBuiltinMarketplace：官方市场或内置。
 */
function isOfficialOrBuiltinMarketplace(marketplace) {
  return isOfficialMarketplace(marketplace) || marketplace === BUILTIN;
}
//@ chunk-z20c443b.js:139991-140062 placement
/**
 * 是否为项目本地插件。
 */
function isProjectLocalPlugin(plugin) {
  return plugin.scope === "project" && plugin.source.endsWith(`@${SKILLS_DIR}`);
}
//@ chunk-z20c443b.js:140062-140185 fingerprint (2.1.88 match: SETTING_SOURCE_TO_SCOPE, 1)
var SETTING_SOURCE_TO_SCOPE = {
  policySettings: "managed",
  userSettings: "user",
  projectSettings: "project",
  localSettings: "local",
  flagSettings: "flag",
};
//@ chunk-z20c443b.js:140185-140405 placement (2.1.88 match: isChannelAllowlisted, 0.686)
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
//@ chunk-z20c443b.js:140405-140518 placement
/**
 * 拆分插件 id 为名字和市场。
 */
function splitPluginId(pluginId) {
  let index = pluginId.lastIndexOf("@");
  if (index < 0)
    return {
      name: pluginId,
    };
  return {
    name: pluginId.slice(0, index),
    marketplace: pluginId.slice(index + 1),
  };
}
//@ chunk-z20c443b.js:140518-140654 placement
/**
 * 解析插件 id（npm 包、市场）。
 */
function parsePluginId(pluginId) {
  let normalized = normalizePluginId(pluginId);
  let npmPluginId = parseNpmPluginId(normalized);
  if (npmPluginId !== null)
    return {
      name: npmPluginId.packageName,
      marketplace: pluginManifestPathSchemas,
    };
  let split = splitPluginId(normalized);
  return isOfficialMarketplace(split.marketplace) ? split : parsePluginIdentifier(normalized);
}
//@ chunk-z20c443b.js:140654-140973 placement
/**
 * 解析 npm 来源的插件 id。
 */
function parseNpmPluginId(pluginId) {
  let normalized = normalizePluginId(pluginId);
  let suffix = `@${pluginManifestPathSchemas}`;
  if (!normalized.endsWith(suffix) || normalized.length <= suffix.length) return null;
  let sliced = normalized.slice(0, -suffix.length);
  let atIndex = sliced.startsWith("@") ? sliced.indexOf("@", 1) : sliced.indexOf("@");
  let packageName = atIndex < 0 ? sliced : sliced.slice(0, atIndex);
  let versionSpec = atIndex < 0 ? undefined : sliced.slice(atIndex + 1);
  if (!isValidNpmPackageName(packageName) || versionSpec === "") return null;
  return {
    packageName,
    ...(versionSpec !== undefined && {
      versionSpec,
    }),
    pluginId: `${packageName}${suffix}`,
  };
}
//@ chunk-z20c443b.js:140973-141014 placement
/**
 * 拼接插件 id。
 */
function joinPluginId(name, marketplace) {
  return marketplace ? `${name}@${marketplace}` : name;
}
//@ chunk-z20c443b.js:141014-141110 placement
/**
 * 取 @ 后的市场名。
 */
function marketplaceSuffix(pluginId) {
  let index = pluginId.lastIndexOf("@");
  if (index < 0) return;
  let sliced = pluginId.slice(index + 1);
  return sliced === "" ? undefined : sliced;
}
//@ chunk-z20c443b.js:141110-141257 callgraph-witnessed (2.1.88 match: parsePluginIdentifier, 1)
/**
 * 把 "name@marketplace" 拆成 {name, marketplace}；官方/内置/插件目录市场且 ID 不合法时只返回 name。
 */
function parsePluginIdentifier_2(plugin) {
  let { name, marketplace } = splitPluginId(plugin);
  if (
    (isOfficialOrCommunityMarketplace(marketplace) ||
      marketplace === BUILTIN ||
      marketplace === OFFICIAL_MARKETPLACE_NAME) &&
    !PluginIdSchema().safeParse(plugin).success
  )
    return {
      name,
    };
  return {
    name,
    marketplace,
  };
}
//@ chunk-z20c443b.js:141257-141322 placement
/**
 * 名字比较：完全相等或大小写不敏感相等（插件/市场名匹配用）。
 */
function pluginNamesEqual(left, right) {
  return left === right || left.toLowerCase() === right.toLowerCase();
}
//@ chunk-z20c443b.js:141377-141442 placement
/**
 * 在名字列表中找目标：先精确匹配，再大小写不敏感匹配。
 */
function findPluginName(names, name) {
  return (
    names.find((candidateName) => candidateName === name) ??
    names.find((candidateName) => pluginNamesEqual(candidateName, name))
  );
}
//@ chunk-z20c443b.js:141442-141499 layout
/**
 * 筛出插件名部分与给定名字（大小写不敏感）相同的插件 id。
 */
function pluginsNamed(ids, name) {
  return ids.filter((id) => pluginNamesEqual(parsePluginIdentifier(id).name, name));
}
//@ chunk-z20c443b.js:141499-141558 callgraph-witnessed (2.1.88 match: isOfficialMarketplaceName, 0)
/**
 * 市场名是否为官方市场（ALLOWED_OFFICIAL_MARKETPLACE_NAMES，忽略大小写）。
 */
function isOfficialMarketplaceName_3(marketplace) {
  return marketplace !== undefined && ALLOWED_OFFICIAL_MARKETPLACE_NAMES.has(marketplace.toLowerCase());
}
//@ chunk-z20c443b.js:141558-141625 layout
/**
 * 是否为官方或社区市场名。
 */
function isOfficialOrCommunityMarketplace(marketplace) {
  return (
    isOfficialMarketplaceName_3(marketplace) ||
    (marketplace !== undefined && COMMUNITY_MARKETPLACE_NAMES.has(marketplace.toLowerCase()))
  );
}
//@ chunk-z20c443b.js:141625-142471 layout
var OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z20c443b.js:141625", () => {
  OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES = new Set([
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
});
//@ chunk-z20c443b.js:142471-142513 layout
/**
 * 官方市场中的已知官方插件名（knowledge-work 等清单）。
 */
function isKnownOfficialPluginName(marketplace, marketplace_2) {
  return isInlineOrSyncedSource(marketplace_2) && OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES.has(marketplace);
}
//@ chunk-z20c443b.js:142513-142590 fingerprint (2.1.88 match: SCOPE_TO_EDITABLE_SOURCE, 1)
var SCOPE_TO_EDITABLE_SOURCE = {
  user: "userSettings",
  project: "projectSettings",
  local: "localSettings",
};
//@ chunk-z20c443b.js:142590-142690 fingerprint (2.1.88 match: scopeToSettingSource, 1)
/**
 * 作用域 → 可写设置源（user→userSettings、project→projectSettings、local→localSettings）；managed 不可安装，抛错。
 */
function scopeToSettingSource(scope) {
  if (scope === "managed") throw Error("Cannot install plugins to managed scope");
  return SCOPE_TO_EDITABLE_SOURCE[scope];
}
export {
  isOfficialMarketplaceName_3,
  parsePluginIdentifier_2,
  marketplaceSuffix,
  parsePluginIdentifier,
  marketplaceOf,
  hasMarketplaceAlias,
  isFromBuiltinMarketplace,
  isOfficialMarketplace,
  isRequiredPlugin,
  findPluginSetting,
  isPluginEnabled_2,
  pluginNameAliases,
  normalizePluginId,
  splitPluginId,
  parseNpmPluginId,
  SETTING_SOURCE_TO_SCOPE,
  officialPluginId,
  isProjectLocalPlugin,
  pluginNamesEqual,
  pluginDisplayKey,
  canonicalPluginId,
  groupEnabledPlugins,
  legacyPluginIds,
  isOfficialOrBuiltinMarketplace,
  findPluginName,
  scopeToSettingSource,
  parsePluginId,
  joinPluginId,
  pluginsNamed,
  isPluginEnabled,
  pluginSettingAt,
  pluginNameAliases_2,
  isOfficialPluginId,
  isOfficialOrCommunityMarketplace,
  isKnownOfficialPluginName,
  normalizeReservedMarketplaceCase,
};
