
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{wne,l8}from"./chunk-5xgkngpb.js";import{ai}from"./chunk-z20c443b.js";var r=[{pluginSource:`${l8}@${ai}`,serverName:wne,title:"Claude Test (built into Claude Code)",personOnly:!0}];function vqo(i,n){return r.find((e)=>e.pluginSource===n&&e.serverName===i)?.title}function yTt(i,n){return vqo(i,n)!==void 0}function Xer(i,n){return r.some((e)=>e.personOnly&&e.serverName===i&&(!n||e.pluginSource===n))}function rbn(i,n,e,t){return e==="password"&&t.type==="string"&&!(("format"in t)&&t.format!==void 0)&&!("enum"in t)&&!("oneOf"in t)&&yTt(i,n)}
export{vqo,yTt,Xer,rbn};
