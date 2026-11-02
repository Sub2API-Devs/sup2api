
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{zs}from"./chunk-b29hdd5e.js";import{NO,zi}from"./chunk-cyj440je.js";async function Qen(n,i){if(await NO()===zs)return{cleared:!1,reason:"credential_store_failed"};let c=require("./chunk-asne9cp8.js").mcpAuthModule(),t=new Set,e={cleared:!0};for(let r of i){if(r.type!=="http"&&r.type!=="sse")continue;let a=zi(n,r);if(t.has(a))continue;t.add(a);let o=await c.revokeServerTokens(n,r);if(!o.cleared&&(e.cleared||o.reason==="credential_store_failed"))e=o}if(!e.cleared&&e.reason==="credential_store_failed")return e;let s=await NO();if(s===zs||[...t].some((r)=>s?.mcpOAuth?.[r]!==void 0))return{cleared:!1,reason:"credential_store_failed"};return e}
export{Qen};
