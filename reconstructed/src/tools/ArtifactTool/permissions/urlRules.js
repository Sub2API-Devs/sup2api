/**
 * tools/ArtifactTool/permissions/urlRules.ts
 *
 * 2.1.316 新增：URL 权限规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8wvtd8sr.js (7)
 * attribution: placement 7
 */
import { typeNameMatchKey, typeNameWithoutQuotes } from "../../../services/artifacts/artifactTypes.js";
import {
  filterRulesMatchingUrls,
  getDenyRules,
  getAskRules,
  toolMatchesRule,
} from "../../../utils/permissions/permissions.js";
import { hasWildcard } from "../../../utils/permissions/permissionRuleParser.js";
import { parseArtifactUrlInput } from "../constants.js";
import { getShareEntry, entryContentByOthers } from "../../../services/artifacts/shareEntries.js";

//@ chunk-8wvtd8sr.js:94022-94119 placement = extractErrorTypeFromData (1)
function parseTypePrefixedValue(data) {
  let index = data.indexOf(":");
  return index > 0 && data.slice(0, index).trim() === "type" ? data.slice(index + 1) : undefined;
}
//@ chunk-8wvtd8sr.js:94119-94302 placement = urlPatternToRegex (1)
function matchesWildcardPattern(e, agentType) {
  let s = typeRuleMatchKeys(e);
  if (s === undefined) return false;
  let regExp = new RegExp(`^${s.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "su");
  return agentType.some((h) => h !== "" && regExp.test(h));
}
//@ chunk-8wvtd8sr.js:94519-94579 placement
function getDenyAndAskUrlRules(context, agentToolName) {
  return [
    ...getUrlRulesForTool(context, agentToolName, "deny"),
    ...getUrlRulesForTool(context, agentToolName, "ask"),
  ];
}
//@ chunk-8wvtd8sr.js:94579-94740 placement
function findTypeRule(toolPermissionContext, tool, s, r) {
  let h = typeof s === "object" && s !== null ? s.type : undefined;
  if (typeof h !== "string") return null;
  let y = typeNameMatchKey(h);
  return y === "" ? null : (filterRulesMatchingUrls(toolPermissionContext, tool, [y], r)[0] ?? null);
}
//@ chunk-8wvtd8sr.js:94740-94912 placement = getDenyRuleForAgent (1)
function getUrlRulesForTool(context, agentToolName, agentType) {
  return (agentType === "deny" ? getDenyRules(context) : getAskRules(context)).filter(
    (rule) =>
      rule.ruleValue.ruleContent !== undefined &&
      typeRuleMatchKeys(rule.ruleValue.ruleContent) !== undefined &&
      !hasWildcard(rule.ruleValue.toolName) &&
      toolMatchesRule(context, agentToolName, rule),
  );
}
//@ chunk-8wvtd8sr.js:94912-95033 placement
function typeRuleMatchKeys(e) {
  let typePrefixedValue = parseTypePrefixedValue(e);
  if (typePrefixedValue === undefined) return;
  let mapped = typeNameWithoutQuotes(typePrefixedValue).split("*").map(typeNameMatchKey);
  return mapped.length === 1 && mapped[0] === "" ? undefined : mapped;
}
//@ chunk-8wvtd8sr.js:95033-95118 placement
/**
 * 判断 Artifact 链接是否指向他人共享的内容。
 */
function isUrlOfOthersContent(url) {
  let slug = parseArtifactUrlInput(url)?.slug;
  let s = slug === undefined ? undefined : getShareEntry(slug);
  return s !== undefined && entryContentByOthers(s);
}
export {
  parseTypePrefixedValue,
  getUrlRulesForTool,
  matchesWildcardPattern,
  isUrlOfOthersContent,
  findTypeRule,
  getDenyAndAskUrlRules,
};
