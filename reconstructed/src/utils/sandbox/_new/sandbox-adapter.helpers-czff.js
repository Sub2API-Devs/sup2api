/**
 * utils/sandbox/_new/sandbox-adapter.helpers-czff.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-czffketc.js (1)
 * attribution: sole-consumer-new 1
 */
import { normalizeDomainKey, domainRuleMatches } from "../../wildcardMapLookup.js";

//@ chunk-czffketc.js:1080-1176 sole-consumer-new
function Hai(t, e) {
  let n = normalizeDomainKey(`domain:${t}`),
    i = normalizeDomainKey(`domain:${e}`);
  return n.includes("*") ? domainRuleMatches(n, i) : n === i;
}

export { Hai };
