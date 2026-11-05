/**
 * utils/wildcardMapLookup.ts
 *
 * 2.1.316 新增：通配符映射查找
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mrcnh9sb.js (4)
 * attribution: placement 3, layout 1
 */
import { pathListSignature } from "../hooks/fileSuggestions.js";
import { matchRuleSegments } from "./permissions/permissionRuleParser.js";

//@ chunk-mrcnh9sb.js:228-396 placement
/**
 * 精确或通配匹配域名规则。
 */
function lookupDomainRule(rules, key) {
  let exactMatch = rules.get(key);
  if (exactMatch) return exactMatch;
  let normalizedKey = normalizeDomainKey(key);
  let wildcardMatch;
  for (let [ruleKey, ruleValue] of rules) {
    let normalizedRuleKey = normalizeDomainKey(ruleKey);
    if (!normalizedRuleKey.includes("*")) {
      if (normalizedRuleKey === normalizedKey) return ruleValue;
    } else if (wildcardMatch === undefined && domainRuleMatches(normalizedRuleKey, normalizedKey))
      wildcardMatch = ruleValue;
  }
  return wildcardMatch;
}
//@ chunk-mrcnh9sb.js:396-530 layout
function normalizeDomainKey(key) {
  if (!key.startsWith("domain:")) return key;
  return `domain:${key
    .slice(7)
    .toLowerCase()
    .replace(/(?<=[^*.])\.+(?=(:\d+)?$)/, "")}`;
}
//@ chunk-mrcnh9sb.js:530-541 placement
var DOMAIN_SEPARATORS = ".:";
//@ chunk-mrcnh9sb.js:541-960 placement
/**
 * domain: 规则匹配
 */
function domainRuleMatches(ruleKey, domainKey) {
  if (!ruleKey.startsWith("domain:") || !domainKey.startsWith("domain:")) return false;
  if (ruleKey === "domain:*") return true;
  let ruleDomain = pathListSignature(ruleKey.slice(7));
  let targetDomain = pathListSignature(domainKey.slice(7));
  if (!ruleDomain.startsWith("*.")) return matchRuleSegments(ruleDomain, targetDomain, DOMAIN_SEPARATORS);
  let pattern = ruleDomain.slice(2);
  let remainingLabels = 1;
  for (let char of pattern) if (DOMAIN_SEPARATORS.includes(char)) remainingLabels++;
  let cutIndex = targetDomain.length;
  while (remainingLabels > 0 && cutIndex > 0) {
    cutIndex--;
    if (DOMAIN_SEPARATORS.includes(targetDomain.charAt(cutIndex))) remainingLabels--;
  }
  let sliced = targetDomain.slice(0, cutIndex + 1);
  return (
    remainingLabels === 0 &&
    !sliced.startsWith(".") &&
    !sliced.includes("..") &&
    !sliced.includes(":") &&
    matchRuleSegments(pattern, targetDomain.slice(cutIndex + 1), DOMAIN_SEPARATORS)
  );
}
export { lookupDomainRule, normalizeDomainKey, domainRuleMatches };
