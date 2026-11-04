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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function normalizePluginId(pluginId) {
  let index = pluginId.lastIndexOf("@");
  if (index <= 0) return pluginId;
  return canonicalPluginId(
    `${pluginId.slice(0, index)}@${normalizeReservedMarketplaceCase(pluginId.slice(index + 1))}`,
  );
}
//@ chunk-dcmhvw5a.js:137502-137662 placement
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
//@ chunk-dcmhvw5a.js:137662-137736 placement
/**
 * 插件在官方市场下的 id。
 */
function officialPluginId(pluginId) {
  let withoutBuiltin = stripBuiltinSuffix(pluginId);
  return withoutBuiltin === undefined
    ? undefined
    : canonicalPluginId(`${nfcLower(withoutBuiltin)}@${BUILTIN}`);
}
//@ chunk-dcmhvw5a.js:137736-137831 placement
function stripBuiltinSuffix(pluginId) {
  let index = pluginId.lastIndexOf("@");
  return index > 0 && normalizeReservedMarketplaceCase(pluginId.slice(index + 1)) === BUILTIN
    ? pluginId.slice(0, index)
    : undefined;
}
//@ chunk-dcmhvw5a.js:137831-137894 placement
/**
 * 插件显示键。
 */
function pluginDisplayKey(pluginName, source) {
  return source.endsWith(`@${BUILTIN}`)
    ? (identifierOrLower(pluginName)[0] ?? firstSkillNameForPlugin(pluginName))
    : pluginName;
}
//@ chunk-dcmhvw5a.js:137894-137971 placement
/**
 * 插件名的别名列表。
 */
function pluginNameAliases({ name, source }) {
  return source.endsWith(`@${BUILTIN}`) ? [name, ...identifierOrLower(name)] : [name];
}
//@ chunk-dcmhvw5a.js:137971-138107 placement
/**
 * 内置插件名的别名列表（规范名与旧名）。
 */
function pluginNameAliases_2({ name, marketplace }) {
  if (normalizeReservedMarketplaceCase(marketplace) !== BUILTIN) return [name];
  let sliced = canonicalPluginId(`${name}@${BUILTIN}`).slice(0, -`@${BUILTIN}`.length);
  return uniq([name, sliced, ...identifierOrLower(sliced)]);
}
//@ chunk-dcmhvw5a.js:138107-138197 placement
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
//@ chunk-dcmhvw5a.js:138197-138254 placement
function identifierOrLower(pluginName) {
  let aliases = skillNamesForPlugin(pluginName);
  return aliases.length > 0 ? aliases : skillNamesForPlugin(nfcLower(pluginName));
}
//@ chunk-dcmhvw5a.js:138254-138309 placement
/**
 * normalizeReservedMarketplaceCase：保留市场名小写化。
 */
function normalizeReservedMarketplaceCase(marketplace) {
  let lower = marketplace.toLowerCase();
  return isReservedMarketplaceName(lower) ? lower : marketplace;
}
//@ chunk-dcmhvw5a.js:138309-138346 placement
/**
 * 是否能识别出市场。
 */
function hasMarketplaceAlias(pluginSource) {
  return marketplaceOf(pluginSource) !== undefined;
}
//@ chunk-dcmhvw5a.js:138346-138496 placement
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
//@ chunk-dcmhvw5a.js:138496-138568 placement
/**
 * 插件是否来自内置市场。
 */
function isFromBuiltinMarketplace(command) {
  return command.pluginSource !== undefined && marketplaceSuffix(command.pluginSource) === SYNCED;
}
//@ chunk-dcmhvw5a.js:138568-138606 placement
/**
 * pluginSettingAt：按启用插件名单查设置。
 */
function pluginSettingAt(pluginId, settings) {
  return findPluginSetting(pluginId, groupEnabledPluginsList(settings));
}
//@ chunk-dcmhvw5a.js:138606-138665 placement
function groupEnabledPluginsList(settingsList) {
  return settingsList.map((settings) => (settings === undefined ? undefined : groupEnabledPlugins(settings)));
}
//@ chunk-dcmhvw5a.js:138665-138909 placement
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
//@ chunk-dcmhvw5a.js:138909-139001 placement
function isInlineMarketplacePlugin(key, value) {
  if (value === undefined) return false;
  let suffix = marketplaceSuffix(normalizePluginId(key));
  return suffix === INLINE_PLUGIN_MARKETPLACE || suffix === SKILLS_DIR ? value !== false : value === true;
}
//@ chunk-dcmhvw5a.js:139001-139055 placement
/**
 * 插件 id 是否属于官方市场。
 */
function isOfficialPluginId(pluginId) {
  let suffix = marketplaceSuffix(normalizePluginId(pluginId));
  return suffix === INLINE_PLUGIN_MARKETPLACE || suffix === SYNCED;
}
//@ chunk-dcmhvw5a.js:139055-139580 placement
/**
 * 在各层设置中找插件的启用记录。
 */
function findPluginSetting(pluginId, settingsList) {
  if (!isOfficialPluginId(pluginId)) {
    let canonical = canonicalPluginId(pluginId);
    let candidates = uniq([canonical, ...legacyPluginIds(canonical), pluginId]);
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
//@ chunk-dcmhvw5a.js:139580-139623 placement
/**
 * isPluginEnabled：插件是否启用。
 */
function isPluginEnabled(pluginId, settingsList) {
  return pluginSettingAt(pluginId, settingsList)?.enabled;
}
//@ chunk-dcmhvw5a.js:139623-139678 placement
/**
 * 是否为必需插件。
 */
function isRequiredPlugin(pluginId, installationPreference) {
  return installationPreference === "required" && marketplaceSuffix(normalizePluginId(pluginId)) === SYNCED;
}
//@ chunk-dcmhvw5a.js:139678-139808 placement
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
function isProjectLocalPlugin(plugin) {
  return plugin.scope === "project" && plugin.source.endsWith(`@${SKILLS_DIR}`);
}
//@ chunk-dcmhvw5a.js:139916-140039 fingerprint (2.1.88 match: SETTING_SOURCE_TO_SCOPE, 1)
var SETTING_SOURCE_TO_SCOPE = {
  policySettings: "managed",
  userSettings: "user",
  projectSettings: "project",
  localSettings: "local",
  flagSettings: "flag",
};
//@ chunk-dcmhvw5a.js:140039-140259 placement (2.1.88 match: isChannelAllowlisted, 0.684)
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
//@ chunk-dcmhvw5a.js:140372-140508 placement
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
//@ chunk-dcmhvw5a.js:140508-140827 placement
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
//@ chunk-dcmhvw5a.js:140827-140868 placement
/**
 * 拼接插件 id。
 */
function joinPluginId(name, marketplace) {
  return marketplace ? `${name}@${marketplace}` : name;
}
//@ chunk-dcmhvw5a.js:140868-140964 placement
/**
 * 取 @ 后的市场名。
 */
function marketplaceSuffix(pluginId) {
  let index = pluginId.lastIndexOf("@");
  if (index < 0) return;
  let sliced = pluginId.slice(index + 1);
  return sliced === "" ? undefined : sliced;
}
//@ chunk-dcmhvw5a.js:140964-141111 callgraph-witnessed (2.1.88 match: parsePluginIdentifier, 1)
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
//@ chunk-dcmhvw5a.js:141111-141176 placement
/**
 * 名字比较：完全相等或大小写不敏感相等（插件/市场名匹配用）。
 */
function pluginNamesEqual(left, right) {
  return left === right || left.toLowerCase() === right.toLowerCase();
}
//@ chunk-dcmhvw5a.js:141231-141296 placement
/**
 * 在名字列表中找目标：先精确匹配，再大小写不敏感匹配。
 */
function findPluginName(names, name) {
  return (
    names.find((candidateName) => candidateName === name) ??
    names.find((candidateName) => pluginNamesEqual(candidateName, name))
  );
}
//@ chunk-dcmhvw5a.js:141296-141353 layout
/**
 * 筛出插件名部分与给定名字（大小写不敏感）相同的插件 id。
 */
function pluginsNamed(ids, name) {
  return ids.filter((id) => pluginNamesEqual(parsePluginIdentifier(id).name, name));
}
//@ chunk-dcmhvw5a.js:141353-141412 callgraph-witnessed (2.1.88 match: isOfficialMarketplaceName, 0)
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
var OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-dcmhvw5a.js:141479", () => {
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
//@ chunk-dcmhvw5a.js:142325-142367 layout
/**
 * 官方市场中的已知官方插件名（knowledge-work 等清单）。
 */
function isKnownOfficialPluginName(marketplace, marketplace_2) {
  return isInlineOrSyncedSource(marketplace_2) && OFFICIAL_KNOWLEDGE_WORK_PLUGIN_NAMES.has(marketplace);
}
//@ chunk-dcmhvw5a.js:142367-142444 fingerprint (2.1.88 match: SCOPE_TO_EDITABLE_SOURCE, 1)
var SCOPE_TO_EDITABLE_SOURCE = {
  user: "userSettings",
  project: "projectSettings",
  local: "localSettings",
};
//@ chunk-dcmhvw5a.js:142444-142544 fingerprint (2.1.88 match: scopeToSettingSource, 1)
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
