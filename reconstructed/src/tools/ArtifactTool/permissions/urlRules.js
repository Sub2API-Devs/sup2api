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
  return index > 0 && data.slice(0, index).trim() === "type" ? data.slice(index + 1) : void 0;
}
//@ chunk-8wvtd8sr.js:94119-94302 placement = urlPatternToRegex (1)
function matchesWildcardPattern(e, n) {
  let s = typeRuleMatchKeys(e);
  if (s === void 0) return !1;
  let regExp = new RegExp(`^${s.map((h) => h.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`, "su");
  return n.some((h) => h !== "" && regExp.test(h));
}
//@ chunk-8wvtd8sr.js:94519-94579 placement
function getDenyAndAskUrlRules(e, n) {
  return [...getUrlRulesForTool(e, n, "deny"), ...getUrlRulesForTool(e, n, "ask")];
}
//@ chunk-8wvtd8sr.js:94579-94740 placement
function findTypeRule(e, n, s, r) {
  let h = typeof s === "object" && s !== null ? s.type : void 0;
  if (typeof h !== "string") return null;
  let y = typeNameMatchKey(h);
  return y === "" ? null : (filterRulesMatchingUrls(e, n, [y], r)[0] ?? null);
}
//@ chunk-8wvtd8sr.js:94740-94912 placement = getDenyRuleForAgent (1)
function getUrlRulesForTool(context, agentToolName, agentType) {
  return (agentType === "deny" ? getDenyRules(context) : getAskRules(context)).filter(
    (rule) =>
      rule.ruleValue.ruleContent !== void 0 &&
      typeRuleMatchKeys(rule.ruleValue.ruleContent) !== void 0 &&
      !hasWildcard(rule.ruleValue.toolName) &&
      toolMatchesRule(context, agentToolName, rule),
  );
}
//@ chunk-8wvtd8sr.js:94912-95033 placement
function typeRuleMatchKeys(e) {
  let n = parseTypePrefixedValue(e);
  if (n === void 0) return;
  let mapped = typeNameWithoutQuotes(n).split("*").map(typeNameMatchKey);
  return mapped.length === 1 && mapped[0] === "" ? void 0 : mapped;
}
//@ chunk-8wvtd8sr.js:95033-95118 placement
function Rl(e) {
  let n = parseArtifactUrlInput(e)?.slug,
    s = n === void 0 ? void 0 : getShareEntry(n);
  return s !== void 0 && entryContentByOthers(s);
}

export {
  parseTypePrefixedValue,
  getUrlRulesForTool,
  matchesWildcardPattern,
  Rl,
  findTypeRule,
  getDenyAndAskUrlRules,
};
