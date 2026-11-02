
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{PPt}from"./chunk-aepeg2w5.js";import{Rio,she}from"./chunk-dcmhvw5a.js";function t(e){if(!e?.length)return;let o=Object.create(null);for(let r of e){if(!r.org_max_permission||r.org_max_permission==="allow")continue;let s=she().safeParse(r.org_max_permission);o[r.name]=s.success?s.data:"blocked"}return Object.keys(o).length>0?o:void 0}function gDe(e){let o;if(e.type==="http"||e.type==="sse"){let{tools:r,...s}=e,i=Rio(s),n=t(r);o={...i,...n&&{toolPermissions:n},scope:"dynamic"}}else o={...e,scope:"dynamic"};return PPt(e,o)}
export{gDe};
