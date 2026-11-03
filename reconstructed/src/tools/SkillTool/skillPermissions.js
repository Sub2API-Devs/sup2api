/**
 * tools/SkillTool/skillPermissions.ts
 *
 * 2.1.316 新增：Skill 工具的权限检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import {
  skillMatchesPermissionRule,
  parseSkillPermissionRule,
  skillAliasesForList,
  skillRuleMatches,
  otherSkillAliases,
  isTrustedSkillSource,
} from "../../utils/attachments/pluginSkillAttachments.js";
import { isSkillPluginSurfaceEnabled } from "../../utils/permissions/permissionRulePayload.js";
import { matchWildcard } from "../../utils/permissions/permissionRuleParser.js";
import {
  getCommandName as getCommandName_2,
  filterCommandsByAllowlist,
  describeSkillHiddenBehindPlugin,
} from "../../commands.js";
import {
  getSyncedSkillUnqualifiedAlias,
  isPlaidHarborOn,
  isSyncedOrManagedSkill,
  getSkillOverrideState,
  resolveSkillOverrideAll,
} from "../../utils/commandPredicates.js";
import { usesReservedSkillNamespace, getReservedSkillNamespace } from "../../skills/reservedSkillNames.js";
import { SYNCED_SKILL_PREFIXES, hasSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { SKILL, normalizedSkillToolName, skillAlternateNames } from "./skillToolNames.js";
import { getSessionSkillAllowlist } from "../../bootstrap/state.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import {
  isBuiltinSkillGated,
  isBundledSkillsDisabled,
  bundledSkillsDeniedReason,
} from "../../skills/bundledSkillsGate.js";
import { getDenyRuleForTool, getContentRulesMapForToolName } from "../../utils/permissions/permissions.js";
import { urlPatternToRegex as urlPatternToRegex_2 } from "../../utils/stringUtils.js";

//@ chunk-e6aww6q8.js:3253818-3254026 placement
/**
 * 判断 Skill 权限规则是否匹配某技能：按普通名称（名称、别名、未限定名等）与打包名称（带插件前缀的需满足命名空间条件）逐一比对。
 */
function matchesSkillRule(e, n, r) {
  let { ordinary, packaging } = skillRuleNames(n, r);
  if (matchesWildcardSkillRule(e, ordinary, packaging, r)) return true;
  return (
    ordinary.some((y) => skillMatchesPermissionRule(e, y)) ||
    packaging.some((y) => {
      if (!skillMatchesPermissionRule(e, y)) return false;
      let { prefix } = parseSkillPermissionRule(e);
      return prefix === undefined || prefix === y || isSkillPluginSurfaceEnabled(isUntrustedSkillSource(r));
    })
  );
}
//@ chunk-e6aww6q8.js:3254026-3254106 placement
/**
 * 判断技能名是否匹配任一条技能规则。
 */
function skillAllowedByRules(e, skillName, r) {
  let { ordinary, packaging } = skillRuleNames(skillName, r, true);
  return matchesWildcardSkillRule(e, ordinary, packaging, r);
}
//@ chunk-e6aww6q8.js:3254106-3254268 placement
function matchesWildcardSkillRule(e, ordinary, packaging, s) {
  let match = SKILL_RULE_PREFIX_RE.exec(e);
  if (match === null) return false;
  let trimmed = match[1].trim();
  return (
    ordinary.some((S) => matchWildcard(trimmed, S)) ||
    ((!trimmed.includes("*") || isSkillPluginSurfaceEnabled(isUntrustedSkillSource(s))) &&
      packaging.some((S) => matchWildcard(trimmed, S)))
  );
}
//@ chunk-e6aww6q8.js:3254268-3254298 placement
/**
 * 解析 “skill:” 前缀的技能规则内容。
 */
var SKILL_RULE_PREFIX_RE = /^\s*skill\s*:(.*)$/s;
//@ chunk-e6aww6q8.js:3254298-3254701 placement
/**
 * 列出技能用于权限规则匹配的名称：普通名称（规则名、全名、命令名、别名、未限定名、旧别名、拒绝匹配名、目录名）与打包名称。
 */
function skillRuleNames(e, n, r = false) {
  if (n === undefined)
    return {
      ordinary: [e],
      packaging: [],
    };
  return {
    ordinary: [
      e,
      n.name,
      ...(r ? [] : [getCommandName_2(n)]),
      ...(n.aliases ?? []),
      ...(n.type === "prompt" && !r && n.unqualifiedName != null ? [n.unqualifiedName] : []),
      ...(n.type === "prompt" && !r ? (n.shedAliases ?? []) : []),
      ...(n.type === "prompt" && !r ? (n.denyMatchNames ?? []) : []),
      ...(n.type === "prompt" && !r && n.directoryListingName !== undefined ? [n.directoryListingName] : []),
    ],
    packaging: skillAliasesForList(n),
  };
}
//@ chunk-e6aww6q8.js:3254701-3255028 placement
/**
 * 判断允许规则对保留命名空间技能的匹配结果：allow、no-match，或因非持有者/命名空间边界而被暂缓。
 */
function reservedSkillRuleMatch(e, skillName, command) {
  let s = command && getSyncedSkillUnqualifiedAlias(command);
  let h = [skillName, ...(command !== undefined ? [command.name] : []), ...(s !== undefined ? [s] : [])];
  let any = h.some((G) => skillMatchesPermissionRule(e, G));
  if (!isPlaidHarborOn()) return any ? "allow" : "no-match";
  let S = command !== undefined && isSyncedOrManagedSkill(command);
  let any_2 = h.some((G) => skillRuleMatches(e, G));
  if (h.some((G) => skillRuleMatches(e, G) && (S || !usesReservedSkillNamespace(G)))) return "allow";
  if (!any) return "no-match";
  return any_2 ? "held-back-nonholder" : "held-back-boundary";
}
//@ chunk-e6aww6q8.js:3255028-3255864 placement
function describeSyncedSkillRuleScope(rule, n, r) {
  let { prefix } = parseSkillPermissionRule(rule);
  let lower = prefix?.toLowerCase();
  let y =
    lower !== undefined
      ? SYNCED_SKILL_PREFIXES.includes(lower) || hasSyncedSkillPrefix(lower)
      : hasSyncedSkillPrefix(rule.toLowerCase());
  let S = getReservedSkillNamespace(n) ?? n;
  let w = y
    ? `Skill(${rule}) only covers skills synced from your claude.ai account.`
    : `Skill(${rule}) does not cover "${S}:" names, which are reserved for skills synced from your claude.ai account.`;
  switch (r.kind) {
    case "nonholder":
      return `${w} ${n} ${r.pluginName !== undefined ? `comes from the plugin "${r.pluginName}"` : "is not synced"}, so no rule for that name can pre-approve it; it needs approval each time.`;
    case "boundary":
      return lower !== undefined && SYNCED_SKILL_PREFIXES.includes(lower)
        ? `Skill(${rule}) only covers names starting with "${prefix}:". Add Skill(${n}) to allow ${n} without asking.`
        : y
          ? `Skill(${rule}) only covers ${prefix} and names starting with "${prefix}:". Add Skill(${n}) to allow ${n} without asking.`
          : `${w} Add Skill(${n}) to allow ${n} without asking.`;
  }
}
//@ chunk-e6aww6q8.js:3255864-3256285 placement
/**
 * 技能不能由 Skill 工具调用时给模型的提示：请用户自己运行，或在协调模式下说明协调者与 worker 都不能调用。
 */
function notInvocableHint(commandName, n = false) {
  if (!isCoordinatorMode_2())
    return `Ask the user to run /${commandName} themselves \u2014 it cannot be invoked via the ${SKILL} tool.`;
  return n
    ? `It cannot be invoked via the ${SKILL} tool in this session, by the coordinator or by workers \u2014 the user can run /${commandName} by typing it themselves.`
    : `It cannot be invoked via the ${SKILL} tool in this session, by the coordinator or by workers \u2014 tell the user /${commandName} is not available here.`;
}
//@ chunk-e6aww6q8.js:3256285-3258572 placement
/**
 * Skill 工具权限检查：技能未加载、禁止模型调用等情况。
 */
function checkSkillPermission(e, n) {
  let { commandName, userTypedThisTurn, isMainSession, permissionContext } = n;
  if (e.type === "prompt" && e.loadDefinition !== undefined && !userTypedThisTurn)
    return {
      reason: "not_loaded",
      message: `Skill ${commandName} could not be loaded. Proceed without it.`,
      errorCode: 10,
    };
  if (e.disableModelInvocation && !userTypedThisTurn)
    return {
      reason: "disable_model_invocation",
      message: `Skill ${commandName} cannot be used with ${SKILL} tool due to disable-model-invocation. ${notInvocableHint(commandName)} Do not replicate this skill's workflow by other means \u2014 it is reserved for explicit user invocation.`,
      errorCode: 4,
    };
  if (isMainSession) {
    let sessionSkillAllowlist = getSessionSkillAllowlist();
    if (
      sessionSkillAllowlist !== undefined &&
      filterCommandsByAllowlist([e], sessionSkillAllowlist).length === 0
    )
      return {
        reason: "not_allowlisted",
        message: `Skill ${commandName} is not in this session's skills allowlist`,
        errorCode: 8,
      };
  }
  let S = describeSkillHiddenBehindPlugin(e);
  if (S !== undefined)
    return {
      reason: "override_disabled",
      message: S,
      errorCode: 7,
      killSwitchOnly: false,
      hiddenBehindPlugin: true,
    };
  let skillOverrideState = getSkillOverrideState(e);
  if (skillOverrideState === "off" || (skillOverrideState === "user-invocable-only" && !userTypedThisTurn)) {
    let initialSettings = getInitialSettings_2();
    let G = isBuiltinSkillGated(e, initialSettings);
    let skillOverrideAll = resolveSkillOverrideAll(e);
    let Z = skillOverrideAll === "user-invocable-only" || skillOverrideAll === "off";
    let Se = G && !isBundledSkillsDisabled(initialSettings) ? bundledSkillsDeniedReason() : null;
    let ke = "by the disableBundledSkills setting or CLAUDE_CODE_DISABLE_BUNDLED_SKILLS env var";
    return {
      reason: "override_disabled",
      message:
        Se !== null
          ? `Skill ${commandName} is disabled for model invocation: ${Se}${Z ? " It is also turned off by an explicit skillOverrides entry." : ""}`
          : `Skill ${commandName} is disabled for model invocation ${G ? (Z ? "by the disableBundledSkills setting or CLAUDE_CODE_DISABLE_BUNDLED_SKILLS env var, and by an explicit skillOverrides entry" : "by the disableBundledSkills setting or CLAUDE_CODE_DISABLE_BUNDLED_SKILLS env var") : "in skillOverrides settings"}`,
      errorCode: 7,
      killSwitchOnly: G && !Z,
    };
  }
  if (e.type !== "prompt") {
    let L = e.type === "local-jsx" ? "UI" : "built-in CLI";
    return {
      reason: "not_prompt_type",
      message: `${commandName} is a ${L} command, not a skill. ${notInvocableHint(commandName, true)}`,
      errorCode: 5,
    };
  }
  if (e.isMcp && e.loadedFrom !== "mcp")
    return {
      reason: "mcp_prompt",
      message: `${commandName} is an MCP prompt, not a skill. ${notInvocableHint(commandName)}`,
      errorCode: 12,
    };
  if (permissionContext !== undefined) {
    let L =
      getDenyRuleForTool(permissionContext, {
        name: SKILL,
      }) ??
      getDenyRuleForTool(
        permissionContext,
        {
          name: normalizedSkillToolName(e.name),
          aliasSkillToolNames: skillAlternateNames(e),
          packagingAliasSkillToolNames: otherSkillAliases(e),
        },
        undefined,
        isUntrustedSkillSource(e),
      );
    if (L)
      return {
        reason: "deny_rule",
        message: "Skill execution blocked by permission rules",
        errorCode: 11,
        rule: L,
      };
    let contentRulesMapForToolName = getContentRulesMapForToolName(permissionContext, SKILL, "deny");
    for (let [q, Z] of contentRulesMapForToolName.entries())
      if (matchesSkillRule(q, commandName, e))
        return {
          reason: "deny_rule",
          message: "Skill execution blocked by permission rules",
          errorCode: 11,
          rule: Z,
        };
  }
  return null;
}
//@ chunk-e6aww6q8.js:3258572-3258636 placement
/**
 * 把技能名转成 “/name” 形式的匹配正则（前后要是词边界）。
 */
function slashSkillRuleRegex(e) {
  return new RegExp(`(?<!\\S)/${urlPatternToRegex_2(e)}(?=$|\\s)`);
}
//@ chunk-e6aww6q8.js:3258636-3258722 placement
/**
 * 判断给定位置前后是否为词边界（空白或首尾）。
 */
function isWordBoundaryAt(e, start, end) {
  return (start === 0 || /\s/.test(e[start - 1])) && (end === e.length || /\s/.test(e[end]));
}
//@ chunk-e6aww6q8.js:3258722-3258765 placement
/**
 * 判断技能来源不可信（不是受信来源）。
 */
function isUntrustedSkillSource(e) {
  return e !== undefined && !isTrustedSkillSource(e);
}
export {
  checkSkillPermission,
  slashSkillRuleRegex,
  matchesSkillRule,
  skillAllowedByRules,
  reservedSkillRuleMatch,
  describeSyncedSkillRuleScope,
  isWordBoundaryAt,
};
