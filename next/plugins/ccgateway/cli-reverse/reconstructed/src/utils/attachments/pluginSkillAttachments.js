/**
 * utils/attachments/pluginSkillAttachments.ts
 *
 * 2.1.316 新增：插件技能附件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: placement 8
 */
import {
  marketplaceSuffix,
  isOfficialMarketplace as isOfficialMarketplace_2,
} from "../plugins/pluginIdentifier.js";
import {
  canonicalMarketplaceKey,
  hasClaudeAiReservedPrefix,
  isUsingDefaultPluginsDirectory,
} from "../plugins/pluginDirectories.js";
import { isReservedMarketplaceName } from "../plugins/schemas.js";
import { getSessionEntrypoint } from "../sessionShape.js";
import {
  pluginSkillAliases,
  syncedSkillAliases as syncedSkillAliases_2,
  SYNCED_SKILL_PREFIXES,
  hasSyncedSkillPrefix,
} from "../../skills/syncedSkills.js";
import { normalizedSkillToolName } from "../../tools/SkillTool/skillToolNames.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3337197-3337265 placement
/**
 * 允许使用本地插件技能的会话入口（cli）。
 */
var CLI_ENTRYPOINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXCLUDED_MARKETPLACES;
deferInit("chunk-5xgkngpb.js:3337197", () => {
  CLI_ENTRYPOINTS = new Set(["cli"]);
  EXCLUDED_MARKETPLACES = new Set(["local-desktop-app-uploads"]);
});
//@ chunk-5xgkngpb.js:3337265-3337603 placement
/**
 * 判断插件技能是否来自第三方 marketplace（非保留名、非 claude.ai 前缀、不在排除表），且会话入口在允许集合内、使用默认插件目录。
 */
function isListablePluginSkill(skill) {
  if (skill.loadedFrom !== "plugin" || skill.pluginInfo === undefined) return false;
  if (skill.pluginInfo.accountSkillsWrapper === true) return false;
  let { repository } = skill.pluginInfo;
  let marketplace = marketplaceSuffix(repository);
  if (marketplace === undefined || repository.lastIndexOf("@") === 0) return false;
  let marketplaceKey = canonicalMarketplaceKey(marketplace.trim());
  if (
    marketplaceKey === "" ||
    isReservedMarketplaceName(marketplaceKey) ||
    hasClaudeAiReservedPrefix(marketplace) ||
    EXCLUDED_MARKETPLACES.has(marketplaceKey)
  )
    return false;
  let sessionEntrypoint = getSessionEntrypoint();
  if (sessionEntrypoint === undefined || !CLI_ENTRYPOINTS.has(sessionEntrypoint)) return false;
  return isUsingDefaultPluginsDirectory();
}
//@ chunk-5xgkngpb.js:3337603-3337844 placement
/**
 * 判断技能来源是否可信（非插件、账号技能、官方或保留 marketplace、非默认插件目录）。
 */
function isTrustedSkillSource(skill) {
  let repository = skill.pluginInfo?.repository ?? "";
  let marketplace = marketplaceSuffix(repository);
  if (
    skill.loadedFrom !== "plugin" ||
    skill.pluginInfo?.accountSkillsWrapper === true ||
    marketplace === undefined ||
    repository.lastIndexOf("@") === 0
  )
    return true;
  let marketplaceKey = canonicalMarketplaceKey(marketplace.trim());
  return (
    marketplaceKey === "" ||
    isOfficialMarketplace_2(marketplaceKey) ||
    hasClaudeAiReservedPrefix(marketplace) ||
    EXCLUDED_MARKETPLACES.has(marketplaceKey) ||
    !isUsingDefaultPluginsDirectory()
  );
}
//@ chunk-5xgkngpb.js:3337844-3337918 placement
/**
 * 技能在列表里展示的全部别名：可列出时只给同步技能别名，否则再并入插件别名。
 */
function skillAliasesForList(skill) {
  let pluginAliases = pluginSkillAliases(skill);
  return [
    ...(pluginAliases.length > 0 && isListablePluginSkill(skill) ? [] : pluginAliases),
    ...syncedSkillAliases_2(skill),
  ];
}
//@ chunk-5xgkngpb.js:3337918-3338017 placement
/**
 * 去掉自身名后的其他技能别名，没有则返回 undefined。
 */
function otherSkillAliases(skill) {
  let primaryName = normalizedSkillToolName(skill.name);
  let filtered = normalizeCaseForComparison_2(skillAliasesForList(skill).map(normalizedSkillToolName)).filter(
    (alias) => alias !== primaryName,
  );
  return filtered.length ? filtered : undefined;
}
//@ chunk-5xgkngpb.js:3338017-3338155 placement
/**
 * 解析技能权限规则：去掉前导 /，以 :* 或空格 * 结尾时视为前缀规则。
 */
function parseSkillPermissionRule(rule) {
  let normalizedRule = rule.startsWith("/") ? rule.substring(1) : rule;
  return normalizedRule.endsWith(":*") || normalizedRule.endsWith(" *")
    ? {
        name: normalizedRule,
        prefix: normalizedRule.slice(0, -2),
      }
    : {
        name: normalizedRule,
      };
}
//@ chunk-5xgkngpb.js:3338155-3338243 placement
/**
 * 判断技能名是否匹配某条技能权限规则（前缀规则用前缀比较）。
 */
function skillMatchesPermissionRule(rule, skillName) {
  let { name: ruleName, prefix } = parseSkillPermissionRule(rule);
  return ruleName === skillName || (prefix !== undefined && skillName.startsWith(prefix));
}
//@ chunk-5xgkngpb.js:3338243-3338448 placement
/**
 * 判断技能名是否匹配权限规则（前缀规则需考虑同步技能前缀）。
 */
function skillRuleMatches(rule, skillName) {
  let { prefix } = parseSkillPermissionRule(rule);
  if (prefix === undefined) return skillMatchesPermissionRule(rule, skillName);
  let lower = prefix.toLowerCase();
  let included = SYNCED_SKILL_PREFIXES.includes(lower);
  let isSyncedPrefix = hasSyncedSkillPrefix(lower);
  if (!included && !isSyncedPrefix)
    return !hasSyncedSkillPrefix(skillName.toLowerCase()) && skillMatchesPermissionRule(rule, skillName);
  return (!included && skillName === prefix) || skillName.startsWith(`${prefix}:`);
}
export {
  skillMatchesPermissionRule,
  parseSkillPermissionRule,
  skillAliasesForList,
  skillRuleMatches,
  otherSkillAliases,
  isTrustedSkillSource,
};
