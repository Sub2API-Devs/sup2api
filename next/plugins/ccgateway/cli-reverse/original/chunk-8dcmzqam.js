
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ze}from"./chunk-5qsfbz2c.js";import{Sg,vLs}from"./chunk-85eyj5gy.js";import{YCi}from"./chunk-3xs5443t.js";function rgn(a,t){return YCi(a,(e)=>e.replace(/\.jsonl$/,t),(e)=>{if(e.namespace!=="transcript"||e.agentId===void 0)return;let n=["subagents",...e.agentRelPath??[],`agent-${e.agentId}${t}`],r=ze.sidecar(e.projectKey,e.sessionId,n);return n.length<=vLs&&Sg(r)===void 0?r:void 0})}
export{rgn};
