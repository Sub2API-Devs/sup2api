/**
 * skills/bundledSkillsGate.ts
 *
 * 内置技能开关（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a413a8v6.js (9)
 * attribution: placement 9
 */
import { env } from "../utils/env.js";
import { getInitialSettings } from "../utils/settings/settings.js";
import {
  isPolicyAllowed,
  rememberedCoreSkills,
  policyDeniedReason,
} from "../services/policyLimits/policyVerdicts.js";
import { BUILTIN_SKILL_NAMES } from "./bundled/builtinSkillNames.js";

//@ chunk-a413a8v6.js:342-438 placement
/**
 * 判断内置技能是否被环境变量或设置关闭。
 */
function isBundledSkillsDisabled(context) {
  return (
    env.CLAUDE_CODE_DISABLE_BUNDLED_SKILLS || (context ?? getInitialSettings()).disableBundledSkills === true
  );
}
//@ chunk-a413a8v6.js:438-469 placement
var ALLOW_BUNDLED_SKILLS = "allow_bundled_skills";
//@ chunk-a413a8v6.js:469-499 placement
/**
 * 判断组织策略是否禁止内置技能。
 */
function isBundledSkillsPolicyDenied() {
  return !isPolicyAllowed(ALLOW_BUNDLED_SKILLS);
}
//@ chunk-a413a8v6.js:499-530 placement
function coreSkillNames() {
  return rememberedCoreSkills() ?? BUILTIN_SKILL_NAMES;
}
//@ chunk-a413a8v6.js:530-576 placement
/**
 * 判断某技能名是否在策略生效时被排除（不在核心名单）。
 */
function isSkillOutsideCorePolicy(name) {
  return isBundledSkillsPolicyDenied() && !coreSkillNames().includes(name);
}
//@ chunk-a413a8v6.js:576-614 placement
/**
 * 内置技能的综合门控判断（全局关闭或按名被挡）。
 */
function isBundledSkillGatedOff(skillName, context) {
  return isBundledSkillsDisabled(context) || isSkillOutsideCorePolicy(skillName);
}
//@ chunk-a413a8v6.js:614-667 placement
/**
 * 组织策略拒绝内置技能时给用户的说明。
 */
function bundledSkillsDeniedReason() {
  return policyDeniedReason(ALLOW_BUNDLED_SKILLS, "Bundled skills", "are");
}
//@ chunk-a413a8v6.js:667-739 placement
/**
 * 由关闭状态与核心名单拼出的门控缓存键。
 */
function bundledSkillsGateKey(context) {
  let isPolicyDenied = isBundledSkillsPolicyDenied();
  return `${isBundledSkillsDisabled(context)}:${isPolicyDenied}:${isPolicyDenied ? coreSkillNames().join(",") : ""}`;
}
//@ chunk-a413a8v6.js:739-819 placement
/**
 * 判断某内置技能条目是否被门控关闭。
 */
function isBuiltinSkillGated(command, context) {
  return (
    command.type === "prompt" && command.source === "builtin" && isBundledSkillGatedOff(command.name, context)
  );
}
export {
  isBundledSkillsDisabled,
  bundledSkillsGateKey,
  isBundledSkillGatedOff,
  isBuiltinSkillGated,
  isSkillOutsideCorePolicy,
  isBundledSkillsPolicyDenied,
  bundledSkillsDeniedReason,
  ALLOW_BUNDLED_SKILLS,
};
