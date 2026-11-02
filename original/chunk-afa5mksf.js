
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{je}from"./chunk-3g8vhh6f.js";import{Ig,Vhs}from"./chunk-t0gq9gyw.js";import{$ii}from"./chunk-nw7jbebs.js";function tan(a,t){return $ii(a,(e)=>e.replace(/\.jsonl$/,t),(e)=>{if(e.namespace!=="transcript"||e.agentId===void 0)return;let n=["subagents",...e.agentRelPath??[],`agent-${e.agentId}${t}`],r=je.sidecar(e.projectKey,e.sessionId,n);return n.length<=Vhs&&Ig(r)===void 0?r:void 0})}
export{tan};
