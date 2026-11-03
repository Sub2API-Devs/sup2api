/**
 * utils/attachments/pluginSkillAttachments.ts
 *
 * 2.1.316 新增：插件技能附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
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
import { uniq } from "../collections.js";

//@ chunk-e6aww6q8.js:3252567-3252635 placement
/**
 * 允许使用本地插件技能的会话入口（cli）。
 */
var CLI_ENTRYPOINTS = new Set(["cli"]);
var EXCLUDED_MARKETPLACES = new Set(["local-desktop-app-uploads"]);
//@ chunk-e6aww6q8.js:3252635-3252973 placement
/**
 * 判断插件技能是否来自第三方 marketplace（非保留名、非 claude.ai 前缀、不在排除表），且会话入口在允许集合内、使用默认插件目录。
 */
function isListablePluginSkill(e) {
  if (e.loadedFrom !== "plugin" || e.pluginInfo === undefined) return false;
  if (e.pluginInfo.accountSkillsWrapper === true) return false;
  let { repository } = e.pluginInfo;
  let r = marketplaceSuffix(repository);
  if (r === undefined || repository.lastIndexOf("@") === 0) return false;
  let s = canonicalMarketplaceKey(r.trim());
  if (
    s === "" ||
    isReservedMarketplaceName(s) ||
    hasClaudeAiReservedPrefix(r) ||
    EXCLUDED_MARKETPLACES.has(s)
  )
    return false;
  let sessionEntrypoint = getSessionEntrypoint();
  if (sessionEntrypoint === undefined || !CLI_ENTRYPOINTS.has(sessionEntrypoint)) return false;
  return isUsingDefaultPluginsDirectory();
}
//@ chunk-e6aww6q8.js:3252973-3253214 placement
/**
 * 判断技能来源是否可信（非插件、账号技能、官方或保留 marketplace、非默认插件目录）。
 */
function isTrustedSkillSource(e) {
  let repository = e.pluginInfo?.repository ?? "";
  let r = marketplaceSuffix(repository);
  if (
    e.loadedFrom !== "plugin" ||
    e.pluginInfo?.accountSkillsWrapper === true ||
    r === undefined ||
    repository.lastIndexOf("@") === 0
  )
    return true;
  let s = canonicalMarketplaceKey(r.trim());
  return (
    s === "" ||
    isOfficialMarketplace_2(s) ||
    hasClaudeAiReservedPrefix(r) ||
    EXCLUDED_MARKETPLACES.has(s) ||
    !isUsingDefaultPluginsDirectory()
  );
}
//@ chunk-e6aww6q8.js:3253214-3253288 placement
/**
 * 技能在列表里展示的全部别名：可列出时只给同步技能别名，否则再并入插件别名。
 */
function skillAliasesForList(e) {
  let n = pluginSkillAliases(e);
  return [...(n.length > 0 && isListablePluginSkill(e) ? [] : n), ...syncedSkillAliases_2(e)];
}
//@ chunk-e6aww6q8.js:3253288-3253387 placement
/**
 * 去掉自身名后的其他技能别名，没有则返回 undefined。
 */
function otherSkillAliases(e) {
  let n = normalizedSkillToolName(e.name);
  let filtered = uniq(skillAliasesForList(e).map(normalizedSkillToolName)).filter((s) => s !== n);
  return filtered.length ? filtered : undefined;
}
//@ chunk-e6aww6q8.js:3253387-3253525 placement
/**
 * 解析技能权限规则：去掉前导 /，以 :* 或空格 * 结尾时视为前缀规则。
 */
function parseSkillPermissionRule(e) {
  let n = e.startsWith("/") ? e.substring(1) : e;
  return n.endsWith(":*") || n.endsWith(" *")
    ? {
        name: n,
        prefix: n.slice(0, -2),
      }
    : {
        name: n,
      };
}
//@ chunk-e6aww6q8.js:3253525-3253613 placement
/**
 * 判断技能名是否匹配某条技能权限规则（前缀规则用前缀比较）。
 */
function skillMatchesPermissionRule(e, n) {
  let { name: r, prefix } = parseSkillPermissionRule(e);
  return r === n || (prefix !== undefined && n.startsWith(prefix));
}
//@ chunk-e6aww6q8.js:3253613-3253818 placement
/**
 * 判断技能名是否匹配权限规则（前缀规则需考虑同步技能前缀）。
 */
function skillRuleMatches(e, n) {
  let { prefix } = parseSkillPermissionRule(e);
  if (prefix === undefined) return skillMatchesPermissionRule(e, n);
  let lower = prefix.toLowerCase();
  let included = SYNCED_SKILL_PREFIXES.includes(lower);
  let y = hasSyncedSkillPrefix(lower);
  if (!included && !y) return !hasSyncedSkillPrefix(n.toLowerCase()) && skillMatchesPermissionRule(e, n);
  return (!included && n === prefix) || n.startsWith(`${prefix}:`);
}
export {
  skillMatchesPermissionRule,
  parseSkillPermissionRule,
  skillAliasesForList,
  skillRuleMatches,
  otherSkillAliases,
  isTrustedSkillSource,
};
