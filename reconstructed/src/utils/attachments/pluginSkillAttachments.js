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
import { marketplaceSuffix, isOfficialMarketplace } from "../plugins/pluginIdentifier.js";
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
import { t5e } from "../../tools/SkillTool/skillToolNames.js";
import { uniq } from "../collections.js";

//@ chunk-e6aww6q8.js:3252567-3252635 placement
var MAr = new Set(["cli"]),
  pRn = new Set(["local-desktop-app-uploads"]);
/**
 * 判断插件技能是否来自第三方 marketplace（非保留名、非 claude.ai 前缀、不在排除表），且会话入口在允许集合内、使用默认插件目录。
 */
//@ chunk-e6aww6q8.js:3252635-3252973 placement
function isListablePluginSkill(e) {
  if (e.loadedFrom !== "plugin" || e.pluginInfo === void 0) return !1;
  if (e.pluginInfo.accountSkillsWrapper === !0) return !1;
  let { repository: repository } = e.pluginInfo,
    r = marketplaceSuffix(repository);
  if (r === void 0 || repository.lastIndexOf("@") === 0) return !1;
  let s = canonicalMarketplaceKey(r.trim());
  if (s === "" || isReservedMarketplaceName(s) || hasClaudeAiReservedPrefix(r) || pRn.has(s)) return !1;
  let h = getSessionEntrypoint();
  if (h === void 0 || !MAr.has(h)) return !1;
  return isUsingDefaultPluginsDirectory();
}
/**
 * 判断技能来源是否可信（非插件、账号技能、官方或保留 marketplace、非默认插件目录）。
 */
//@ chunk-e6aww6q8.js:3252973-3253214 placement
function isTrustedSkillSource(e) {
  let n = e.pluginInfo?.repository ?? "",
    r = marketplaceSuffix(n);
  if (
    e.loadedFrom !== "plugin" ||
    e.pluginInfo?.accountSkillsWrapper === !0 ||
    r === void 0 ||
    n.lastIndexOf("@") === 0
  )
    return !0;
  let s = canonicalMarketplaceKey(r.trim());
  return (
    s === "" ||
    isOfficialMarketplace(s) ||
    hasClaudeAiReservedPrefix(r) ||
    pRn.has(s) ||
    !isUsingDefaultPluginsDirectory()
  );
}
//@ chunk-e6aww6q8.js:3253214-3253288 placement
function WZe(e) {
  let n = pluginSkillAliases(e);
  return [...(n.length > 0 && isListablePluginSkill(e) ? [] : n), ...syncedSkillAliases_2(e)];
}
//@ chunk-e6aww6q8.js:3253288-3253387 placement
function gRn(e) {
  let n = t5e(e.name),
    filtered = uniq(WZe(e).map(t5e)).filter((s) => s !== n);
  return filtered.length ? filtered : void 0;
}
/**
 * 解析技能权限规则：去掉前导 /，以 :* 或空格 * 结尾时视为前缀规则。
 */
//@ chunk-e6aww6q8.js:3253387-3253525 placement
function parseSkillPermissionRule(e) {
  let n = e.startsWith("/") ? e.substring(1) : e;
  return n.endsWith(":*") || n.endsWith(" *") ? { name: n, prefix: n.slice(0, -2) } : { name: n };
}
//@ chunk-e6aww6q8.js:3253525-3253613 placement
function jne(e, n) {
  let { name: r, prefix: prefix } = parseSkillPermissionRule(e);
  return r === n || (prefix !== void 0 && n.startsWith(prefix));
}
/**
 * 判断技能名是否匹配权限规则（前缀规则需考虑同步技能前缀）。
 */
//@ chunk-e6aww6q8.js:3253613-3253818 placement
function skillRuleMatches(e, n) {
  let { prefix: prefix } = parseSkillPermissionRule(e);
  if (prefix === void 0) return jne(e, n);
  let lower = prefix.toLowerCase(),
    included = SYNCED_SKILL_PREFIXES.includes(lower),
    y = hasSyncedSkillPrefix(lower);
  if (!included && !y) return !hasSyncedSkillPrefix(n.toLowerCase()) && jne(e, n);
  return (!included && n === prefix) || n.startsWith(`${prefix}:`);
}

export { jne, parseSkillPermissionRule, WZe, skillRuleMatches, gRn, isTrustedSkillSource };
