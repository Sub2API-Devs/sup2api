
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ya,tP,Lu,x0}from"./chunk-aat7wt0p.js";import{t}from"./chunk-cgr0tezp.js";import{i}from"./chunk-jhrww53q.js";import{delimiter as a,isAbsolute as u,resolve as s}from"path";var kMr="CLAUDE_CODE_PLUGIN_DIRS",bAo="Unset CLAUDE_CODE_PLUGIN_DIRS (in the environment, or in the settings `env` block that sets it) to run without those folders.";function TMr(){let n=(i.CLAUDE_CODE_PLUGIN_DIRS??"").split(a).map((e)=>Lu(e.trim())).filter((e)=>e!==""),r=n.filter((e)=>!l(e));if(r.length>0)t(`${kMr}: skipped ${r.join(", ")}: a plugin folder here is an absolute local path or starts with ~`,{level:"warn"});return n.filter(l).map((e)=>s(e))}function SAo(){let n=TMr();if(i.CLAUDE_CODE_PLUGIN_DIRS!==void 0)i.set("CLAUDE_CODE_PLUGIN_DIRS",n.join(a));return n}function Jj(...n){let r=new Map;for(let e of n.flat()){let o=s(e);if(!r.has(o))r.set(o,e)}return[...r.values()]}function qTe(n,r){let e=new Set(r.map((o)=>s(o)));return n.filter((o)=>!e.has(s(o)))}function l(n){return u(n)&&!x0(n)&&!Ya(n)&&!tP(n)}
export{kMr,bAo,TMr,SAo,Jj,qTe};
