/**
 * utils/wildcardMapLookup.ts
 *
 * 2.1.316 新增：通配符映射查找
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-czffketc.js (4)
 * attribution: placement 3, layout 1
 */
import { pathListSignature } from "../hooks/fileSuggestions.js";
import { matchRuleSegments } from "./permissions/permissionRuleParser.js";

//@ chunk-czffketc.js:228-396 placement
/**
 * 精确或通配匹配域名规则。
 */
function lookupDomainRule(t, e) {
  let n = t.get(e);
  if (n) return n;
  let i = normalizeDomainKey(e);
  let o;
  for (let [c, s] of t) {
    let r = normalizeDomainKey(c);
    if (!r.includes("*")) {
      if (r === i) return s;
    } else if (o === undefined && domainRuleMatches(r, i)) o = s;
  }
  return o;
}
//@ chunk-czffketc.js:396-530 layout
function normalizeDomainKey(t) {
  if (!t.startsWith("domain:")) return t;
  return `domain:${t
    .slice(7)
    .toLowerCase()
    .replace(/(?<=[^*.])\.+(?=(:\d+)?$)/, "")}`;
}
//@ chunk-czffketc.js:530-541 placement
var DOMAIN_SEPARATORS = ".:";
//@ chunk-czffketc.js:541-960 placement
/**
 * domain: 规则匹配
 */
function domainRuleMatches(t, e) {
  if (!t.startsWith("domain:") || !e.startsWith("domain:")) return false;
  if (t === "domain:*") return true;
  let n = pathListSignature(t.slice(7));
  let i = pathListSignature(e.slice(7));
  if (!n.startsWith("*.")) return matchRuleSegments(n, i, DOMAIN_SEPARATORS);
  let sliced = n.slice(2);
  let c = 1;
  for (let d of sliced) if (DOMAIN_SEPARATORS.includes(d)) c++;
  let s = i.length;
  while (c > 0 && s > 0) {
    s--;
    if (DOMAIN_SEPARATORS.includes(i.charAt(s))) c--;
  }
  let sliced_2 = i.slice(0, s + 1);
  return (
    c === 0 &&
    !sliced_2.startsWith(".") &&
    !sliced_2.includes("..") &&
    !sliced_2.includes(":") &&
    matchRuleSegments(sliced, i.slice(s + 1), DOMAIN_SEPARATORS)
  );
}
export { normalizeDomainKey, domainRuleMatches, lookupDomainRule };
