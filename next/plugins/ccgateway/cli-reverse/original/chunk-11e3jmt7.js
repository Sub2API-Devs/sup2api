
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{xo}from"./chunk-ndmse9kj.js";import{m,f}from"./chunk-8nhse09v.js";import{id}from"./chunk-g54kbxqw.js";import{Dke}from"./chunk-y12tyg2v.js";import{vfo}from"./chunk-4kzs0ch0.js";var sye="repo_rules_unread";function uji(e,o){let t=Dke(e,o.meta);return t instanceof Promise?t.then((r)=>s(r,o)):s(t,o)}function s(e,o){if(e.refused!==void 0)return(e.refused.cause==="repo_rules_read_failed"?m:f)("mcp_serve_file_call",e.refused.cause),sye;return e.repoRules===void 0?o.launchPermissionContext:n(o.launchPermissionContext,e.repoRules,o)}function n(e,o,{session:t}){let r=e??id();return{...r,...vfo({alwaysDenyRules:{},alwaysAskRules:{}},r,xo(t).originalCwd,o,"upload")}}
export{sye,uji};
