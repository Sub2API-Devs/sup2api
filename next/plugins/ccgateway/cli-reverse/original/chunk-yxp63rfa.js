
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Oo}from"./chunk-5ythzcas.js";import{m,c}from"./chunk-47b8txen.js";import{Jl}from"./chunk-2c3jp4kn.js";import{jRe}from"./chunk-y6nystvv.js";import{jCo}from"./chunk-ejn7s5p2.js";var OSe="repo_rules_unread";function ura(e,o){let t=jRe(e,o.meta);return t instanceof Promise?t.then((r)=>s(r,o)):s(t,o)}function s(e,o){if(e.refused!==void 0)return(e.refused.cause==="repo_rules_read_failed"?m:c)("mcp_serve_file_call",e.refused.cause),OSe;return e.repoRules===void 0?o.launchPermissionContext:n(o.launchPermissionContext,e.repoRules,o)}function n(e,o,{session:t}){let r=e??Jl();return{...r,...jCo({alwaysDenyRules:{},alwaysAskRules:{}},r,Oo(t).originalCwd,o,"upload")}}
export{OSe,ura};
