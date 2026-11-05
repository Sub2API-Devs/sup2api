
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{dp}from"./chunk-sq9ffh11.js";import{xy}from"./chunk-fwzx45c8.js";import{BGe}from"./chunk-9mafwvrf.js";import{bc}from"./chunk-z20c443b.js";function TXn(o){if(!o||Object.keys(o).length===0)return!1;for(let n of bc){let e=o[n];if(!e||e.length===0)continue;for(let r of e)if((r.hooks?.length??0)>0)return!0}return!1}function z7s(o,n,e,r,m=!1,l=!1,u=!1,p){if(!e||Object.keys(e).length===0)return;BGe(e,p);let s=0;for(let i of bc){let f=e[i];if(!f||f.length===0)continue;let a=i;if(m&&i==="Stop")a="SubagentStop",t(`Converting Stop hook to SubagentStop for ${r} (subagents trigger SubagentStop)`);for(let c of f){let S=c.matcher??"",g=c.hooks;if(!g||g.length===0)continue;for(let h of g)o.add(n,a,S,h,{personal:l,checkout:u}),s++}}if(s>0)t(`Registered ${s} frontmatter hook(s) from ${r} for session ${n}`)}function Vvt(o){return xy()&&o!==void 0&&dp.has(o)}
export{TXn,z7s,Vvt};
