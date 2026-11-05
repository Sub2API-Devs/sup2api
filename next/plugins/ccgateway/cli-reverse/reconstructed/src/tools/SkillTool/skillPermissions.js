/**
 * tools/SkillTool/skillPermissions.ts
 *
 * 2.1.316 新增：Skill 工具的权限检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 12, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { getInitialSettings } from "../../utils/settings/settings.js";
import {
  isBuiltinSkillGated,
  isBundledSkillsDisabled,
  bundledSkillsDeniedReason,
} from "../../skills/bundledSkillsGate.js";
import { getDenyRuleForTool, getContentRulesMapForToolName } from "../../utils/permissions/permissions.js";
import { urlPatternToRegex as urlPatternToRegex_2 } from "../../utils/stringUtils.js";

//@ chunk-5xgkngpb.js:3338448-3338656 placement
/**
 * 判断 Skill 权限规则是否匹配某技能：按普通名称（名称、别名、未限定名等）与打包名称（带插件前缀的需满足命名空间条件）逐一比对。
 */
function matchesSkillRule(ruleContent, skillName, command) {
  let { ordinary, packaging } = skillRuleNames(skillName, command);
  if (matchesWildcardSkillRule(ruleContent, ordinary, packaging, command)) return true;
  return (
    ordinary.some((name) => skillMatchesPermissionRule(ruleContent, name)) ||
    packaging.some((name) => {
      if (!skillMatchesPermissionRule(ruleContent, name)) return false;
      let { prefix } = parseSkillPermissionRule(ruleContent);
      return (
        prefix === undefined ||
        prefix === name ||
        isSkillPluginSurfaceEnabled(isUntrustedSkillSource(command))
      );
    })
  );
}
//@ chunk-5xgkngpb.js:3338656-3338750 layout
function matchesSkillRuleOrBaseName(ruleContent, skillName, candidateCommands, ruleBaseName) {
  return (
    (ruleContent.startsWith("/") ? ruleContent.substring(1) : ruleContent) === ruleBaseName ||
    candidateCommands.some((candidate) => matchesSkillRule(ruleContent, skillName, candidate))
  );
}
//@ chunk-5xgkngpb.js:3338750-3338830 placement
/**
 * 判断技能名是否匹配任一条技能规则。
 */
function skillAllowedByRules(ruleContent, skillName, command) {
  let { ordinary, packaging } = skillRuleNames(skillName, command, true);
  return matchesWildcardSkillRule(ruleContent, ordinary, packaging, command);
}
//@ chunk-5xgkngpb.js:3338830-3338992 placement
function matchesWildcardSkillRule(ruleContent, ordinary, packaging, command) {
  let match = SKILL_RULE_PREFIX_RE.exec(ruleContent);
  if (match === null) return false;
  let trimmed = match[1].trim();
  return (
    ordinary.some((name) => matchWildcard(trimmed, name)) ||
    ((!trimmed.includes("*") || isSkillPluginSurfaceEnabled(isUntrustedSkillSource(command))) &&
      packaging.some((name) => matchWildcard(trimmed, name)))
  );
}
//@ chunk-5xgkngpb.js:3338992-3339022 placement
/**
 * 解析 “skill:” 前缀的技能规则内容。
 */
var SKILL_RULE_PREFIX_RE = /^\s*skill\s*:(.*)$/s;
//@ chunk-5xgkngpb.js:3339022-3339425 placement
/**
 * 列出技能用于权限规则匹配的名称：普通名称（规则名、全名、命令名、别名、未限定名、旧别名、拒绝匹配名、目录名）与打包名称。
 */
function skillRuleNames(skillName, command, packagingOnly = false) {
  if (command === undefined)
    return {
      ordinary: [skillName],
      packaging: [],
    };
  return {
    ordinary: [
      skillName,
      command.name,
      ...(packagingOnly ? [] : [getCommandName_2(command)]),
      ...(command.aliases ?? []),
      ...(command.type === "prompt" && !packagingOnly && command.unqualifiedName != null
        ? [command.unqualifiedName]
        : []),
      ...(command.type === "prompt" && !packagingOnly ? (command.shedAliases ?? []) : []),
      ...(command.type === "prompt" && !packagingOnly ? (command.denyMatchNames ?? []) : []),
      ...(command.type === "prompt" && !packagingOnly && command.directoryListingName !== undefined
        ? [command.directoryListingName]
        : []),
    ],
    packaging: skillAliasesForList(command),
  };
}
//@ chunk-5xgkngpb.js:3339425-3339753 placement
/**
 * 判断允许规则对保留命名空间技能的匹配结果：allow、no-match，或因非持有者/命名空间边界而被暂缓。
 */
function reservedSkillRuleMatch(ruleContent, skillName, command) {
  let syncedAlias = command && getSyncedSkillUnqualifiedAlias(command);
  let names = [
    skillName,
    ...(command !== undefined ? [command.name] : []),
    ...(syncedAlias !== undefined ? [syncedAlias] : []),
  ];
  let any = names.some((name) => skillMatchesPermissionRule(ruleContent, name));
  if (!isPlaidHarborOn()) return any ? "allow" : "no-match";
  let isSyncedOrManaged = command !== undefined && isSyncedOrManagedSkill(command);
  let any_2 = names.some((name) => skillRuleMatches(ruleContent, name));
  if (
    names.some(
      (name) =>
        skillRuleMatches(ruleContent, name) && (isSyncedOrManaged || !usesReservedSkillNamespace(name)),
    )
  )
    return "allow";
  if (!any) return "no-match";
  return any_2 ? "held-back-nonholder" : "held-back-boundary";
}
//@ chunk-5xgkngpb.js:3339753-3340589 placement
function describeSyncedSkillRuleScope(rule, skillName, state) {
  let { prefix } = parseSkillPermissionRule(rule);
  let lower = prefix?.toLowerCase();
  let coversSynced =
    lower !== undefined
      ? SYNCED_SKILL_PREFIXES.includes(lower) || hasSyncedSkillPrefix(lower)
      : hasSyncedSkillPrefix(rule.toLowerCase());
  let namespace = getReservedSkillNamespace(skillName) ?? skillName;
  let scopeNote = coversSynced
    ? `Skill(${rule}) only covers skills synced from your claude.ai account.`
    : `Skill(${rule}) does not cover "${namespace}:" names, which are reserved for skills synced from your claude.ai account.`;
  switch (state.kind) {
    case "nonholder":
      return `${scopeNote} ${skillName} ${state.pluginName !== undefined ? `comes from the plugin "${state.pluginName}"` : "is not synced"}, so no rule for that name can pre-approve it; it needs approval each time.`;
    case "boundary":
      return lower !== undefined && SYNCED_SKILL_PREFIXES.includes(lower)
        ? `Skill(${rule}) only covers names starting with "${prefix}:". Add Skill(${skillName}) to allow ${skillName} without asking.`
        : coversSynced
          ? `Skill(${rule}) only covers ${prefix} and names starting with "${prefix}:". Add Skill(${skillName}) to allow ${skillName} without asking.`
          : `${scopeNote} Add Skill(${skillName}) to allow ${skillName} without asking.`;
  }
}
//@ chunk-5xgkngpb.js:3340589-3341010 placement
/**
 * 技能不能由 Skill 工具调用时给模型的提示：请用户自己运行，或在协调模式下说明协调者与 worker 都不能调用。
 */
function notInvocableHint(commandName, isWorker = false) {
  if (!isCoordinatorMode_2())
    return `Ask the user to run /${commandName} themselves \u2014 it cannot be invoked via the ${SKILL} tool.`;
  return isWorker
    ? `It cannot be invoked via the ${SKILL} tool in this session, by the coordinator or by workers \u2014 the user can run /${commandName} by typing it themselves.`
    : `It cannot be invoked via the ${SKILL} tool in this session, by the coordinator or by workers \u2014 tell the user /${commandName} is not available here.`;
}
//@ chunk-5xgkngpb.js:3341010-3343303 placement
/**
 * Skill 工具权限检查：技能未加载、禁止模型调用等情况。
 */
function checkSkillPermission(command, options) {
  let { commandName, userTypedThisTurn, isMainSession, permissionContext } = options;
  if (command.type === "prompt" && command.loadDefinition !== undefined && !userTypedThisTurn)
    return {
      reason: "not_loaded",
      message: `Skill ${commandName} could not be loaded. Proceed without it.`,
      errorCode: 10,
    };
  if (command.disableModelInvocation && !userTypedThisTurn)
    return {
      reason: "disable_model_invocation",
      message: `Skill ${commandName} cannot be used with ${SKILL} tool due to disable-model-invocation. ${notInvocableHint(commandName)} Do not replicate this skill's workflow by other means \u2014 it is reserved for explicit user invocation.`,
      errorCode: 4,
    };
  if (isMainSession) {
    let sessionSkillAllowlist = getSessionSkillAllowlist();
    if (
      sessionSkillAllowlist !== undefined &&
      filterCommandsByAllowlist([command], sessionSkillAllowlist).length === 0
    )
      return {
        reason: "not_allowlisted",
        message: `Skill ${commandName} is not in this session's skills allowlist`,
        errorCode: 8,
      };
  }
  let hiddenBehindPluginNote = describeSkillHiddenBehindPlugin(command);
  if (hiddenBehindPluginNote !== undefined)
    return {
      reason: "override_disabled",
      message: hiddenBehindPluginNote,
      errorCode: 7,
      killSwitchOnly: false,
      hiddenBehindPlugin: true,
    };
  let skillOverrideState = getSkillOverrideState(command);
  if (skillOverrideState === "off" || (skillOverrideState === "user-invocable-only" && !userTypedThisTurn)) {
    let context = getInitialSettings();
    let isBundledGated = isBuiltinSkillGated(command, context);
    let skillOverrideAll = resolveSkillOverrideAll(command);
    let alsoOverridden = skillOverrideAll === "user-invocable-only" || skillOverrideAll === "off";
    let bundledDeniedReason =
      isBundledGated && !isBundledSkillsDisabled(context) ? bundledSkillsDeniedReason() : null;
    let denySourceText = "by the disableBundledSkills setting or CLAUDE_CODE_DISABLE_BUNDLED_SKILLS env var";
    return {
      reason: "override_disabled",
      message:
        bundledDeniedReason !== null
          ? `Skill ${commandName} is disabled for model invocation: ${bundledDeniedReason}${alsoOverridden ? " It is also turned off by an explicit skillOverrides entry." : ""}`
          : `Skill ${commandName} is disabled for model invocation ${isBundledGated ? (alsoOverridden ? "by the disableBundledSkills setting or CLAUDE_CODE_DISABLE_BUNDLED_SKILLS env var, and by an explicit skillOverrides entry" : "by the disableBundledSkills setting or CLAUDE_CODE_DISABLE_BUNDLED_SKILLS env var") : "in skillOverrides settings"}`,
      errorCode: 7,
      killSwitchOnly: isBundledGated && !alsoOverridden,
    };
  }
  if (command.type !== "prompt") {
    let commandTypeLabel = command.type === "local-jsx" ? "UI" : "built-in CLI";
    return {
      reason: "not_prompt_type",
      message: `${commandName} is a ${commandTypeLabel} command, not a skill. ${notInvocableHint(commandName, true)}`,
      errorCode: 5,
    };
  }
  if (command.isMcp && command.loadedFrom !== "mcp")
    return {
      reason: "mcp_prompt",
      message: `${commandName} is an MCP prompt, not a skill. ${notInvocableHint(commandName)}`,
      errorCode: 12,
    };
  if (permissionContext !== undefined) {
    let denyRule =
      getDenyRuleForTool(permissionContext, {
        name: SKILL,
      }) ??
      getDenyRuleForTool(
        permissionContext,
        {
          name: normalizedSkillToolName(command.name),
          aliasSkillToolNames: skillAlternateNames(command),
          packagingAliasSkillToolNames: otherSkillAliases(command),
        },
        undefined,
        isUntrustedSkillSource(command),
      );
    if (denyRule)
      return {
        reason: "deny_rule",
        message: "Skill execution blocked by permission rules",
        errorCode: 11,
        rule: denyRule,
      };
    let contentRulesMapForToolName = getContentRulesMapForToolName(permissionContext, SKILL, "deny");
    for (let [ruleContent, rule] of contentRulesMapForToolName.entries())
      if (matchesSkillRule(ruleContent, commandName, command))
        return {
          reason: "deny_rule",
          message: "Skill execution blocked by permission rules",
          errorCode: 11,
          rule,
        };
  }
  return null;
}
//@ chunk-5xgkngpb.js:3343303-3343367 placement
/**
 * 把技能名转成 “/name” 形式的匹配正则（前后要是词边界）。
 */
function slashSkillRuleRegex(commandName) {
  return new RegExp(`(?<!\\S)/${urlPatternToRegex_2(commandName)}(?=$|\\s)`);
}
//@ chunk-5xgkngpb.js:3343367-3343453 placement
/**
 * 判断给定位置前后是否为词边界（空白或首尾）。
 */
function isWordBoundaryAt(text, start, end) {
  return (start === 0 || /\s/.test(text[start - 1])) && (end === text.length || /\s/.test(text[end]));
}
//@ chunk-5xgkngpb.js:3343453-3343496 placement
/**
 * 判断技能来源不可信（不是受信来源）。
 */
function isUntrustedSkillSource(source) {
  return source !== undefined && !isTrustedSkillSource(source);
}
export {
  slashSkillRuleRegex,
  checkSkillPermission,
  matchesSkillRuleOrBaseName,
  skillAllowedByRules,
  reservedSkillRuleMatch,
  describeSyncedSkillRuleScope,
  isWordBoundaryAt,
};
