
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function r(n){return n}function b(n){return r(n)}function f(n){return r(n)}function ce(n){return n==null?void 0:r(n)}function mo(n){return r(String(n))}function o3(n){return n==null?void 0:r(String(n))}function mp(...n){return r(n.join(""))}function cHr(n){return r(n.join(","))}function ha(n){return r([...n].sort().join(","))}function yE(n,e){return r(n.join(e??","))}function Yn(n){return r(n)}function Bv(n,e){return e?Yn(n):void 0}function p1s(n,e){return n!==void 0&&e.includes(n)&&/^[a-z0-9-]{1,64}$/.test(n)?Yn(n):b("none")}function Bie(n,e){return e?Yn(n):b("custom")}function xSe(n){return Bie(n.agentType,n.source==="built-in")}function jAo(n,e){return e?Yn(n):b("third-party")}
export{b,f,ce,mo,o3,mp,cHr,ha,yE,Yn,Bv,p1s,Bie,xSe,jAo};
