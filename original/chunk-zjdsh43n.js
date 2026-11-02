
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{IZ,n6}from"./chunk-e6aww6q8.js";import{qs}from"./chunk-dcmhvw5a.js";var r=[{pluginSource:`${n6}@${qs}`,serverName:IZ,title:"Claude Test (built into Claude Code)",personOnly:!0}];function sLo(i,n){return r.find((e)=>e.pluginSource===n&&e.serverName===i)?.title}function x_t(i,n){return sLo(i,n)!==void 0}function iYn(i,n){return r.some((e)=>e.personOnly&&e.serverName===i&&(!n||e.pluginSource===n))}function Idn(i,n,e,t){return e==="password"&&t.type==="string"&&!(("format"in t)&&t.format!==void 0)&&!("enum"in t)&&!("oneOf"in t)&&x_t(i,n)}
export{sLo,x_t,iYn,Idn};
