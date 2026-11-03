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
import { hasPinnedDigest, SHA256_DIGEST_SUFFIX } from "../../cli/transports/ccrMessageMapping.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";

//@ chunk-f25sswmp.js:14170-14217 placement
/**
 * isPinnedOrWildcardRule：规则带固定摘要或以 :* 结尾。
 */
function isPinnedOrWildcardRule(e) {
  return hasPinnedDigest(e) || e.endsWith(":*");
}
//@ chunk-f25sswmp.js:14217-14453 placement
/**
 * 若建议只有一条 Skill 的 allow 规则且内容带 SHA-256 摘要后缀，返回该规则内容。
 */
function getSkillDigestRule(permissionResult) {
  let [n, ...r] = permissionResult.suggestions ?? [];
  let s =
    r.length === 0 && n?.type === "addRules" && n.behavior === "allow" && n.rules.length === 1
      ? n.rules[0]
      : undefined;
  return s?.toolName === SKILL && s.ruleContent !== undefined && SHA256_DIGEST_SUFFIX.test(s.ruleContent)
    ? s.ruleContent
    : undefined;
}
//@ chunk-f25sswmp.js:14453-14476 placement
var USERSETTINGS = "userSettings";
export { isPinnedOrWildcardRule, USERSETTINGS, getSkillDigestRule };
