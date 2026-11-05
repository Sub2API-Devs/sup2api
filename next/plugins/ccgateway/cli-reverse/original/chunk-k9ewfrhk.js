
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var VQn=new Set(["agents.md","agents.override.md","gemini.md",".cursorrules"]),n={instructions:0,setting:1,subagent:2,command:3,mcp:4,skill:5};function FKt(e){return e.scope==="user"&&!e.warning&&e.kind!=="skill"}function cst(e){if(e.scope==="project")return"project";if(e.warning||e.kind==="skill")return"warned";return null}function _Vo(e,t){let r=n[e.kind]-n[t.kind];if(r!==0)return r;if(e.scope!==t.scope)return e.scope==="project"?-1:1;return e.label.localeCompare(t.label)}
export{VQn,FKt,cst,_Vo};
