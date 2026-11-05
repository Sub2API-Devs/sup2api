
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Qi}from"./chunk-z20c443b.js";import{Uxr}from"./chunk-hfc4cfnt.js";function Fst(t){let r=[];for(let o of t){if(!Qi(o))continue;let{config:e}=o,n=e&&typeof e==="object"&&"url"in e&&typeof e.url==="string"?e.url:null;if(n!==null&&Uxr(n))r.push(o)}return r.length===1?r[0]:null}
export{Fst};
