
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{d8r}from"./chunk-5xgkngpb.js";import{t}from"./chunk-6hadbefe.js";import{em,fa}from"./chunk-355mdh7x.js";import{l0e}from"./chunk-ex0jqs9a.js";import{readFile as p}from"fs/promises";async function eIe(r){if(d8r()?.serves?.(r))return{...fa({url:r}),proxy:!1,redirect:"error"};if(!em()){let e=l0e();if(e.HTTPS_PROXY&&URL.parse(r)?.protocol==="https:"){let n={url:e.HTTPS_PROXY,noProxy:e.NO_PROXY},i=fa({url:r,fallbackProxy:n});if(i.proxy===void 0||!e.SSL_CERT_FILE)return i;let a;try{a=await p(e.SSL_CERT_FILE,"utf8")}catch(o){t(`MCP agent-proxy fallback: failed to read CA bundle: ${o instanceof Error?o.message:String(o)}`,{level:"warn"})}return fa({url:r,fallbackProxy:{...n,ca:a}})}}return fa({url:r})}
export{eIe};
