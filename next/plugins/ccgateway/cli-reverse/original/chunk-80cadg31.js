
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{hl,SI,Ef,o$}from"./chunk-za46rn2f.js";import{t}from"./chunk-6hadbefe.js";import{i}from"./chunk-xjnnz630.js";import{delimiter as a,isAbsolute as u,resolve as s}from"path";var ZGr="CLAUDE_CODE_PLUGIN_DIRS",tBo="Unset CLAUDE_CODE_PLUGIN_DIRS (in the environment, or in the settings `env` block that sets it) to run without those folders.";function ezr(){let n=(i.CLAUDE_CODE_PLUGIN_DIRS??"").split(a).map((e)=>Ef(e.trim())).filter((e)=>e!==""),r=n.filter((e)=>!l(e));if(r.length>0)t(`${ZGr}: skipped ${r.join(", ")}: a plugin folder here is an absolute local path or starts with ~`,{level:"warn"});return n.filter(l).map((e)=>s(e))}function nBo(){let n=ezr();if(i.CLAUDE_CODE_PLUGIN_DIRS!==void 0)i.set("CLAUDE_CODE_PLUGIN_DIRS",n.join(a));return n}function JG(...n){let r=new Map;for(let e of n.flat()){let o=s(e);if(!r.has(o))r.set(o,e)}return[...r.values()]}function sPe(n,r){let e=new Set(r.map((o)=>s(o)));return n.filter((o)=>!e.has(s(o)))}function l(n){return u(n)&&!o$(n)&&!hl(n)&&!SI(n)}
export{ZGr,tBo,ezr,nBo,JG,sPe};
