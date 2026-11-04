/**
 * utils/permissions/classifierApprovalRules.ts
 *
 * 2.1.316 新增：分类器批准规则（固定摘要/通配）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f25sswmp.js (3)
 * attribution: placement 3
 */
import { hasPinnedDigest, SHA256_DIGEST_SUFFIX_RE } from "../../cli/transports/ccrMessageMapping.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";

//@ chunk-f25sswmp.js:14170-14217 placement
/**
 * isPinnedOrWildcardRule：规则带固定摘要或以 :* 结尾。
 */
function isPinnedOrWildcardRule(rule) {
  return hasPinnedDigest(rule) || rule.endsWith(":*");
}
//@ chunk-f25sswmp.js:14217-14453 placement
/**
 * 若建议只有一条 Skill 的 allow 规则且内容带 SHA-256 摘要后缀，返回该规则内容。
 */
function getSkillDigestRule(permissionResult) {
  let [firstSuggestion, ...otherSuggestions] = permissionResult.suggestions ?? [];
  let rule =
    otherSuggestions.length === 0 &&
    firstSuggestion?.type === "addRules" &&
    firstSuggestion.behavior === "allow" &&
    firstSuggestion.rules.length === 1
      ? firstSuggestion.rules[0]
      : undefined;
  return rule?.toolName === SKILL &&
    rule.ruleContent !== undefined &&
    SHA256_DIGEST_SUFFIX_RE.test(rule.ruleContent)
    ? rule.ruleContent
    : undefined;
}
//@ chunk-f25sswmp.js:14453-14476 placement
var USERSETTINGS = "userSettings";
export { isPinnedOrWildcardRule, USERSETTINGS, getSkillDigestRule };
