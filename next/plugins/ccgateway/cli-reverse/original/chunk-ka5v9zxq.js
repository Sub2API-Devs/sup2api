
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{jo}from"./chunk-sq9ffh11.js";import{tp,Mv,OD}from"./chunk-z20c443b.js";import{Se}from"./chunk-5fn9rb8r.js";var D5=["userSettings","flagSettings","policySettings"];function nAe(t){let i=new Set(jo()),e=R_e(t),n,r;for(let s of D5){if(!i.has(s))continue;let g=Se(s)?.pluginConfigs;for(let u of e){let o=g?.[u];if(o?.options)n={...n,...o.options};if(o?.mcpServers){r=r??{};for(let[l,c]of Object.entries(o.mcpServers))r[l]={...r[l],...c}}}}return{options:n,mcpServers:r}}function R_e(t){let i=OD(t);if(i.length>0)return[...i.toReversed(),t];let e=`@${tp}`,n=t.endsWith(e)?t.slice(0,-e.length):"";return n!==""&&!n.includes("@")?[n,t]:[t]}function qTr(t){let i=new Set(jo()),e;for(let n of D5){if(!i.has(n))continue;let r=jZ(Se(n)?.enabledPlugins,t);if(r!==void 0)e=r}return e}function etn(t,i){let e=Mv(i),n=OD(e);if(n.length===0)return{deciding:i,written:i,replaced:[]};let r=n.filter((s)=>t?.[s]!==void 0);return{deciding:t?.[e]===void 0?r[0]??e:e,written:e,replaced:r}}function jZ(t,i){let e=Mv(i);return[e,...OD(e),i].map((n)=>t?.[n]).find((n)=>n!==void 0)}
export{D5,nAe,R_e,qTr,etn,jZ};
