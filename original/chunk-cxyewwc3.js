
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{o,E,M,u}from"./chunk-7vp249v4.js";var c=p(()=>u({file_uuid:o(),file_name:o(),is_image:M().nullish(),sha256:o().nullish().catch(null),file_size:E().nullish().catch(void 0)})),s=256;function WP(t){if(typeof t!=="object"||t===null||!("file_attachments"in t))return[];let e=t.file_attachments;if(!Array.isArray(e))return[];let a=c();return e.slice(0,s).flatMap((r)=>{let n=a.safeParse(r);return n.success?[n.data]:[]})}var i=p(()=>u({shouldQuery:M().optional()}));function sEn(t){return i().safeParse(t).data?.shouldQuery}
export{WP,sEn};
