
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
function r(n){return n}function b(n){return r(n)}function c(n){return r(n)}function de(n){return n==null?void 0:r(n)}function Xr(n){return r(String(n))}function ZY(n){return n==null?void 0:r(String(n))}function Sf(...n){return r(n.join(""))}function cvr(n){return r(n.join(","))}function pa(n){return r([...n].sort().join(","))}function PS(n,e){return r(n.join(e??","))}function Gn(n){return r(n)}function NE(n,e){return e?Gn(n):void 0}function wks(n,e){return n!==void 0&&e.includes(n)&&/^[a-z0-9-]{1,64}$/.test(n)?Gn(n):b("none")}function Gre(n,e){return e?Gn(n):b("custom")}function rye(n){return Gre(n.agentType,n.source==="built-in")}function Uuo(n,e){return e?Gn(n):b("third-party")}
export{b,c,de,Xr,ZY,Sf,cvr,pa,PS,Gn,NE,wks,Gre,rye,Uuo};
