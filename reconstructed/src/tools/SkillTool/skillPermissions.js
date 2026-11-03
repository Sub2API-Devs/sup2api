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
  jne,
  parseSkillPermissionRule,
  WZe,
  skillRuleMatches,
  gRn,
  isTrustedSkillSource,
} from "../../utils/attachments/pluginSkillAttachments.js";
import { Dar } from "../../utils/permissions/permissionRulePayload.js";
import { matchWildcard } from "../../utils/permissions/permissionRuleParser.js";
import {
  getCommandName as getCommandName_2,
  filterCommandsByAllowlist,
  describeSkillHiddenBehindPlugin,
} from "../../commands.js";
import {
  getSyncedSkillUnqualifiedAlias,
  V1t,
  isSyncedOrManagedSkill,
  getSkillOverrideState,
  iGe,
} from "../../utils/commandPredicates.js";
import { vZ, getReservedSkillNamespace } from "../../skills/reservedSkillNames.js";
import { SYNCED_SKILL_PREFIXES, hasSyncedSkillPrefix } from "../../skills/syncedSkills.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { SKILL, t5e, skillAlternateNames } from "./skillToolNames.js";
import { getSessionSkillAllowlist } from "../../bootstrap/state.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { eto, I3, WSi } from "../../skills/bundledSkillsGate.js";
import { getDenyRuleForTool, getContentRulesMapForToolName } from "../../utils/permissions/permissions.js";
import { urlPatternToRegex as urlPatternToRegex_2 } from "../../utils/stringUtils.js";

/**
 * 判断 Skill 权限规则是否匹配某技能：按普通名称（名称、别名、未限定名等）与打包名称（带插件前缀的需满足命名空间条件）逐一比对。
 */
//@ chunk-e6aww6q8.js:3253818-3254026 placement
function matchesSkillRule(e, n, r) {
  let { ordinary: ordinary, packaging: packaging } = skillRuleNames(n, r);
  if (matchesWildcardSkillRule(e, ordinary, packaging, r)) return !0;
  return (
    ordinary.some((y) => jne(e, y)) ||
    packaging.some((y) => {
      if (!jne(e, y)) return !1;
      let { prefix: prefix } = parseSkillPermissionRule(e);
      return prefix === void 0 || prefix === y || Dar(zZe(r));
    })
  );
}
//@ chunk-e6aww6q8.js:3254026-3254106 placement
function P8s(e, n, r) {
  let { ordinary: ordinary, packaging: packaging } = skillRuleNames(n, r, !0);
  return matchesWildcardSkillRule(e, ordinary, packaging, r);
}
//@ chunk-e6aww6q8.js:3254106-3254268 placement
function matchesWildcardSkillRule(e, n, r, s) {
  let match = IAr.exec(e);
  if (match === null) return !1;
  let trimmed = match[1].trim();
  return (
    n.some((S) => matchWildcard(trimmed, S)) ||
    ((!trimmed.includes("*") || Dar(zZe(s))) && r.some((S) => matchWildcard(trimmed, S)))
  );
}
//@ chunk-e6aww6q8.js:3254268-3254298 placement
var IAr = /^\s*skill\s*:(.*)$/s;
/**
 * 列出技能用于权限规则匹配的名称：普通名称（规则名、全名、命令名、别名、未限定名、旧别名、拒绝匹配名、目录名）与打包名称。
 */
//@ chunk-e6aww6q8.js:3254298-3254701 placement
function skillRuleNames(e, n, r = !1) {
  if (n === void 0) return { ordinary: [e], packaging: [] };
  return {
    ordinary: [
      e,
      n.name,
      ...(r ? [] : [getCommandName_2(n)]),
      ...(n.aliases ?? []),
      ...(n.type === "prompt" && !r && n.unqualifiedName != null ? [n.unqualifiedName] : []),
      ...(n.type === "prompt" && !r ? (n.shedAliases ?? []) : []),
      ...(n.type === "prompt" && !r ? (n.denyMatchNames ?? []) : []),
      ...(n.type === "prompt" && !r && n.directoryListingName !== void 0 ? [n.directoryListingName] : []),
    ],
    packaging: WZe(n),
  };
}
/**
 * 判断允许规则对保留命名空间技能的匹配结果：allow、no-match，或因非持有者/命名空间边界而被暂缓。
 */
//@ chunk-e6aww6q8.js:3254701-3255028 placement
function reservedSkillRuleMatch(e, n, r) {
  let s = r && getSyncedSkillUnqualifiedAlias(r),
    h = [n, ...(r !== void 0 ? [r.name] : []), ...(s !== void 0 ? [s] : [])],
    any = h.some((G) => jne(e, G));
  if (!V1t()) return any ? "allow" : "no-match";
  let S = r !== void 0 && isSyncedOrManagedSkill(r),
    any_2 = h.some((G) => skillRuleMatches(e, G));
  if (h.some((G) => skillRuleMatches(e, G) && (S || !vZ(G)))) return "allow";
  if (!any) return "no-match";
  return any_2 ? "held-back-nonholder" : "held-back-boundary";
}
//@ chunk-e6aww6q8.js:3255028-3255864 placement
function describeSyncedSkillRuleScope(e, n, r) {
  let { prefix: prefix } = parseSkillPermissionRule(e),
    h = prefix?.toLowerCase(),
    y =
      h !== void 0
        ? SYNCED_SKILL_PREFIXES.includes(h) || hasSyncedSkillPrefix(h)
        : hasSyncedSkillPrefix(e.toLowerCase()),
    S = getReservedSkillNamespace(n) ?? n,
    w = y
      ? `Skill(${e}) only covers skills synced from your claude.ai account.`
      : `Skill(${e}) does not cover "${S}:" names, which are reserved for skills synced from your claude.ai account.`;
  switch (r.kind) {
    case "nonholder":
      return `${w} ${n} ${r.pluginName !== void 0 ? `comes from the plugin "${r.pluginName}"` : "is not synced"}, so no rule for that name can pre-approve it; it needs approval each time.`;
    case "boundary":
      return h !== void 0 && SYNCED_SKILL_PREFIXES.includes(h)
        ? `Skill(${e}) only covers names starting with "${prefix}:". Add Skill(${n}) to allow ${n} without asking.`
        : y
          ? `Skill(${e}) only covers ${prefix} and names starting with "${prefix}:". Add Skill(${n}) to allow ${n} without asking.`
          : `${w} Add Skill(${n}) to allow ${n} without asking.`;
  }
}
/**
 * 技能不能由 Skill 工具调用时给模型的提示：请用户自己运行，或在协调模式下说明协调者与 worker 都不能调用。
 */
//@ chunk-e6aww6q8.js:3255864-3256285 placement
function notInvocableHint(e, n = !1) {
  if (!isCoordinatorMode_2())
    return `Ask the user to run /${e} themselves \u2014 it cannot be invoked via the ${SKILL} tool.`;
  return n
    ? `It cannot be invoked via the ${SKILL} tool in this session, by the coordinator or by workers \u2014 the user can run /${e} by typing it themselves.`
    : `It cannot be invoked via the ${SKILL} tool in this session, by the coordinator or by workers \u2014 tell the user /${e} is not available here.`;
}
/**
 * Skill 工具权限检查：技能未加载、禁止模型调用等情况。
 */
//@ chunk-e6aww6q8.js:3256285-3258572 placement
function checkSkillPermission(e, n) {
  let {
    commandName: commandName,
    userTypedThisTurn: userTypedThisTurn,
    isMainSession: isMainSession,
    permissionContext: permissionContext,
  } = n;
  if (e.type === "prompt" && e.loadDefinition !== void 0 && !userTypedThisTurn)
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
    let L = getSessionSkillAllowlist();
    if (L !== void 0 && filterCommandsByAllowlist([e], L).length === 0)
      return {
        reason: "not_allowlisted",
        message: `Skill ${commandName} is not in this session's skills allowlist`,
        errorCode: 8,
      };
  }
  let S = describeSkillHiddenBehindPlugin(e);
  if (S !== void 0)
    return {
      reason: "override_disabled",
      message: S,
      errorCode: 7,
      killSwitchOnly: !1,
      hiddenBehindPlugin: !0,
    };
  let w = getSkillOverrideState(e);
  if (w === "off" || (w === "user-invocable-only" && !userTypedThisTurn)) {
    let L = getInitialSettings_2(),
      G = eto(e, L),
      q = iGe(e),
      Z = q === "user-invocable-only" || q === "off",
      Se = G && !I3(L) ? WSi() : null,
      ke = "by the disableBundledSkills setting or CLAUDE_CODE_DISABLE_BUNDLED_SKILLS env var";
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
      message: `${commandName} is a ${L} command, not a skill. ${notInvocableHint(commandName, !0)}`,
      errorCode: 5,
    };
  }
  if (e.isMcp && e.loadedFrom !== "mcp")
    return {
      reason: "mcp_prompt",
      message: `${commandName} is an MCP prompt, not a skill. ${notInvocableHint(commandName)}`,
      errorCode: 12,
    };
  if (permissionContext !== void 0) {
    let L =
      getDenyRuleForTool(permissionContext, { name: SKILL }) ??
      getDenyRuleForTool(
        permissionContext,
        {
          name: t5e(e.name),
          aliasSkillToolNames: skillAlternateNames(e),
          packagingAliasSkillToolNames: gRn(e),
        },
        void 0,
        zZe(e),
      );
    if (L)
      return {
        reason: "deny_rule",
        message: "Skill execution blocked by permission rules",
        errorCode: 11,
        rule: L,
      };
    let G = getContentRulesMapForToolName(permissionContext, SKILL, "deny");
    for (let [q, Z] of G.entries())
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
function M8s(e) {
  return new RegExp(`(?<!\\S)/${urlPatternToRegex_2(e)}(?=$|\\s)`);
}
//@ chunk-e6aww6q8.js:3258636-3258722 placement
function SRn(e, n, r) {
  return (n === 0 || /\s/.test(e[n - 1])) && (r === e.length || /\s/.test(e[r]));
}
//@ chunk-e6aww6q8.js:3258722-3258765 placement
function zZe(e) {
  return e !== void 0 && !isTrustedSkillSource(e);
}

export {
  checkSkillPermission,
  M8s,
  matchesSkillRule,
  P8s,
  reservedSkillRuleMatch,
  describeSyncedSkillRuleScope,
  SRn,
};
