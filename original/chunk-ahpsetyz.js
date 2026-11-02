
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{t}from"./chunk-cgr0tezp.js";import{Mf}from"./chunk-5hsd6qen.js";import{hy}from"./chunk-rsktsadk.js";import{HUe}from"./chunk-gvva3ecm.js";import{yc}from"./chunk-dcmhvw5a.js";function w2n(o){if(!o||Object.keys(o).length===0)return!1;for(let n of yc){let e=o[n];if(!e||e.length===0)continue;for(let r of e)if((r.hooks?.length??0)>0)return!0}return!1}function xBs(o,n,e,r,m=!1,l=!1,u=!1,p){if(!e||Object.keys(e).length===0)return;HUe(e,p);let s=0;for(let i of yc){let f=e[i];if(!f||f.length===0)continue;let a=i;if(m&&i==="Stop")a="SubagentStop",t(`Converting Stop hook to SubagentStop for ${r} (subagents trigger SubagentStop)`);for(let c of f){let S=c.matcher??"",g=c.hooks;if(!g||g.length===0)continue;for(let h of g)o.add(n,a,S,h,{personal:l,checkout:u}),s++}}if(s>0)t(`Registered ${s} frontmatter hook(s) from ${r} for session ${n}`)}function yyt(o){return hy()&&o!==void 0&&Mf.has(o)}
export{w2n,xBs,yyt};
