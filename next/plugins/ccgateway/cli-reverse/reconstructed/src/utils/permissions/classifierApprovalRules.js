/**
 * utils/permissions/classifierApprovalRules.ts
 *
 * 2.1.316 新增：分类器批准规则（固定摘要/通配）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vr5v4gzz.js (3)
 * attribution: placement 3
 */
import { SHA256_DIGEST_SUFFIX_RE } from "../../cli/transports/ccrMessageMapping.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";

//@ chunk-vr5v4gzz.js:14760-14794 placement
/**
 * isPinnedOrWildcardRule：规则带固定摘要或以 :* 结尾。
 */
function isPinnedOrWildcardRule(rule) {
  return SHA256_DIGEST_SUFFIX_RE.test(rule);
}
//@ chunk-vr5v4gzz.js:14794-15030 placement
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
//@ chunk-vr5v4gzz.js:15030-15053 placement
var USERSETTINGS = "userSettings";
export { isPinnedOrWildcardRule, USERSETTINGS, getSkillDigestRule };
