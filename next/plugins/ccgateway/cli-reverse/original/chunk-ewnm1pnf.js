
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function vHn(e){return(e.denyMatchNames??[]).filter((t)=>t.includes(":"))}function mFi(e,t){let a;return e.map((n)=>{if(n.loadedFrom!=="mcp")return n;let s=vHn(n);if(s.length===0)return n;a??=new Set([...t.map((r)=>r.name),...e.map((r)=>r.name)]);let i=s.filter((r)=>r!==n.name&&a.has(r)),l=n.reservedLabels??[];if(i.length===l.length&&i.every((r,d)=>r===l[d]))return n;return{...n,reservedLabels:i.length===0?void 0:i}})}var Hr="Skill",rD="skill__";function cJe(e){return rD+e.replaceAll(":","__").replace(/[^a-zA-Z0-9_-]/g,"_")}function hFi(e){let t=[...e.aliases??[],...e.shedAliases??[],...e.unqualifiedName!=null?[e.unqualifiedName]:[],...vHn(e),...e.directoryListingName!==void 0?[e.directoryListingName]:[]];return t.length?t.map(cJe):void 0}
export{vHn,mFi,Hr,rD,cJe,hFi};
