
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{_R}from"./chunk-355mdh7x.js";import{dD,v}from"./chunk-exfmq47h.js";import{MMt}from"./chunk-9xh6zw2q.js";import{isDeepStrictEqual as c}from"util";function fqo(){return i.CLAUDE_CODE_CCR_OWN_CONNECTION_POOL||v("tengu_reactive_quilt",!1)}async function fer(t,e={}){if(e.proxy!==void 0||dD()!=="hosted_worker"||!fqo())return fetch(String(t),e);let r=_R(void 0).tls;if(c(e.tls,r))return MMt(String(t),e,()=>!0);let o=new Set([r?.ca??[]].flat()),n=[e.tls?.ca??[]].flat().filter((s)=>o.has(s));if(n.length===0)throw Error("MCP request not sent: its list of trusted CA certificates has nothing in common with the one Claude Code uses now, most likely because Claude Code's TLS settings changed after the server connected. Reconnect the server to use the new settings.");return fetch(String(t),{...e,tls:{...r,ca:n}})}
export{fqo,fer};
