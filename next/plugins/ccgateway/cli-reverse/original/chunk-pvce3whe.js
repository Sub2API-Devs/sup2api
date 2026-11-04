
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
function rTn(e){return(e.denyMatchNames??[]).filter((t)=>t.includes(":"))}function Ihi(e,t){let a;return e.map((n)=>{if(n.loadedFrom!=="mcp")return n;let s=rTn(n);if(s.length===0)return n;a??=new Set([...t.map((r)=>r.name),...e.map((r)=>r.name)]);let i=s.filter((r)=>r!==n.name&&a.has(r)),l=n.reservedLabels??[];if(i.length===l.length&&i.every((r,d)=>r===l[d]))return n;return{...n,reservedLabels:i.length===0?void 0:i}})}var qr="Skill",oK="skill__";function t5e(e){return oK+e.replaceAll(":","__").replace(/[^a-zA-Z0-9_-]/g,"_")}function Ohi(e){let t=[...e.aliases??[],...e.shedAliases??[],...e.unqualifiedName!=null?[e.unqualifiedName]:[],...rTn(e),...e.directoryListingName!==void 0?[e.directoryListingName]:[]];return t.length?t.map(t5e):void 0}
export{rTn,Ihi,qr,oK,t5e,Ohi};
