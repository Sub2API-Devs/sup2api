
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{i}from"./chunk-jhrww53q.js";import{cC}from"./chunk-hq88884p.js";import{EU,v}from"./chunk-aepeg2w5.js";import{pAt}from"./chunk-1p1fwh3h.js";import{isDeepStrictEqual as c}from"util";function YDo(){return i.CLAUDE_CODE_CCR_OWN_CONNECTION_POOL||v("tengu_reactive_quilt",!1)}async function C4n(t,e={}){if(e.proxy!==void 0||EU()!=="hosted_worker"||!YDo())return fetch(String(t),e);let r=cC(void 0).tls;if(c(e.tls,r))return pAt(String(t),e,()=>!0);let o=new Set([r?.ca??[]].flat()),n=[e.tls?.ca??[]].flat().filter((s)=>o.has(s));if(n.length===0)throw Error("MCP request not sent: its list of trusted CA certificates has nothing in common with the one Claude Code uses now, most likely because Claude Code's TLS settings changed after the server connected. Reconnect the server to use the new settings.");return fetch(String(t),{...e,tls:{...r,ca:n}})}
export{YDo,C4n};
