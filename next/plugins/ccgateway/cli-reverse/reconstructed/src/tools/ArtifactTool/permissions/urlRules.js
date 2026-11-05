/**
 * tools/ArtifactTool/permissions/urlRules.ts
 *
 * 2.1.316 新增：URL 权限规则
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzmy9dn4.js (9)
 * attribution: placement 7, layout 2
 */
import { typeNameWithoutQuotes, typeNameMatchKey } from "../../../services/artifacts/artifactTypes.js";
import { deniedBashRules, askedBashRules, toolMatchesRule } from "../../../utils/permissions/permissions.js";
import { hasWildcard } from "../../../utils/permissions/permissionRuleParser.js";
import { parseArtifactUrlInput } from "../constants.js";
import { getShareEntry, entryContentByOthers } from "../../../services/artifacts/shareEntries.js";

//@ chunk-xzmy9dn4.js:94354-94451 placement (2.1.88 match: extractErrorTypeFromData, 1)
function parseTypePrefixedValue(data) {
  let index = data.indexOf(":");
  return index > 0 && data.slice(0, index).trim() === "type" ? data.slice(index + 1) : undefined;
}
//@ chunk-xzmy9dn4.js:94451-94634 placement (2.1.88 match: urlPatternToRegex, 1)
function matchesWildcardPattern(ruleContent, agentType) {
  let keys = typeRuleMatchKeys(ruleContent);
  if (keys === undefined) return false;
  let regExp = new RegExp(
    `^${keys.map((key) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`,
    "su",
  );
  return agentType.some((value) => value !== "" && regExp.test(value));
}
//@ chunk-xzmy9dn4.js:94634-94766 layout (2.1.88 match: getDenyRuleForAgent, 1)
/**
 * URL 类规则的精确域名：解析带类型前缀的规则内容，取出不含通配的域名；属于 WebFetch/浏览器类工具的规则族，误归入本模块。
 */
function getRuleExactDomain(askTypeRule) {
  let typePrefixedValue = parseTypePrefixedValue(askTypeRule.ruleValue.ruleContent ?? "");
  let domain = typePrefixedValue === undefined ? undefined : typeNameWithoutQuotes(typePrefixedValue);
  return domain === undefined || domain === "" || domain.includes("*") ? undefined : domain;
}
//@ chunk-xzmy9dn4.js:94766-94851 layout (2.1.88 match: getDenyRuleForAgent, 1)
/**
 * 取该工具的 URL 规则中与给定 URL 匹配的那些；属于 WebFetch/浏览器类工具的规则族。
 */
function filterRulesMatchingUrls(context, agentToolName, agentType, agentType_2) {
  return getUrlRulesForTool(context, agentToolName, agentType_2).filter((rule) =>
    matchesWildcardPattern(rule.ruleValue.ruleContent ?? "", agentType),
  );
}
//@ chunk-xzmy9dn4.js:94851-94911 placement
function getDenyAndAskUrlRules(context, agentToolName) {
  return [
    ...getUrlRulesForTool(context, agentToolName, "deny"),
    ...getUrlRulesForTool(context, agentToolName, "ask"),
  ];
}
//@ chunk-xzmy9dn4.js:94911-95072 placement
function findTypeRule(toolPermissionContext, tool, input, behavior) {
  let typeName = typeof input === "object" && input !== null ? input.type : undefined;
  if (typeof typeName !== "string") return null;
  let matchKey = typeNameMatchKey(typeName);
  return matchKey === ""
    ? null
    : (filterRulesMatchingUrls(toolPermissionContext, tool, [matchKey], behavior)[0] ?? null);
}
//@ chunk-xzmy9dn4.js:95072-95244 placement (2.1.88 match: getDenyRuleForAgent, 1)
function getUrlRulesForTool(context, agentToolName, agentType) {
  return (agentType === "deny" ? deniedBashRules(context) : askedBashRules(context)).filter(
    (rule) =>
      rule.ruleValue.ruleContent !== undefined &&
      typeRuleMatchKeys(rule.ruleValue.ruleContent) !== undefined &&
      !hasWildcard(rule.ruleValue.toolName) &&
      toolMatchesRule(context, agentToolName, rule),
  );
}
//@ chunk-xzmy9dn4.js:95244-95365 placement
function typeRuleMatchKeys(ruleContent) {
  let typePrefixedValue = parseTypePrefixedValue(ruleContent);
  if (typePrefixedValue === undefined) return;
  let mapped = typeNameWithoutQuotes(typePrefixedValue).split("*").map(typeNameMatchKey);
  return mapped.length === 1 && mapped[0] === "" ? undefined : mapped;
}
//@ chunk-xzmy9dn4.js:95365-95450 placement
/**
 * 判断 Artifact 链接是否指向他人共享的内容。
 */
function isUrlOfOthersContent(url) {
  let slug = parseArtifactUrlInput(url)?.slug;
  let shareEntry = slug === undefined ? undefined : getShareEntry(slug);
  return shareEntry !== undefined && entryContentByOthers(shareEntry);
}
export {
  isUrlOfOthersContent,
  findTypeRule,
  getDenyAndAskUrlRules,
  getRuleExactDomain,
  filterRulesMatchingUrls,
  matchesWildcardPattern,
};
