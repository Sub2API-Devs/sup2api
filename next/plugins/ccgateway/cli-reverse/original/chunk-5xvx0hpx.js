
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ni}from"./chunk-5me9t3vk.js";import{SD,da}from"./chunk-fmy4vc7c.js";async function Wdn(n,i){if(await SD()===ni)return{cleared:!1,reason:"credential_store_failed"};let c=require("./chunk-9hx1mne2.js").mcpAuthModule(),t=new Set,e={cleared:!0};for(let r of i){if(r.type!=="http"&&r.type!=="sse")continue;let a=da(n,r);if(t.has(a))continue;t.add(a);let o=await c.revokeServerTokens(n,r);if(!o.cleared&&(e.cleared||o.reason==="credential_store_failed"))e=o}if(!e.cleared&&e.reason==="credential_store_failed")return e;let s=await SD();if(s===ni||[...t].some((r)=>s?.mcpOAuth?.[r]!==void 0))return{cleared:!1,reason:"credential_store_failed"};return e}
export{Wdn};
