
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{t}from"./chunk-cgr0tezp.js";import{Qp,sa}from"./chunk-hq88884p.js";import{OOe}from"./chunk-rtnapjwv.js";import{readFile as f}from"fs/promises";async function UAe(e){if(!Qp()){let r=OOe();if(r.HTTPS_PROXY&&URL.parse(e)?.protocol==="https:"){let n={url:r.HTTPS_PROXY,noProxy:r.NO_PROXY},a=sa({url:e,fallbackProxy:n});if(a.proxy===void 0||!r.SSL_CERT_FILE)return a;let i;try{i=await f(r.SSL_CERT_FILE,"utf8")}catch(o){t(`MCP agent-proxy fallback: failed to read CA bundle: ${o instanceof Error?o.message:String(o)}`,{level:"warn"})}return sa({url:e,fallbackProxy:{...n,ca:i}})}}return sa({url:e})}
export{UAe};
