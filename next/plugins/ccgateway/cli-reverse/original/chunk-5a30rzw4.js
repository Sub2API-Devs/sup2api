
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Po}from"./chunk-5hsd6qen.js";import{yf,RE,JO}from"./chunk-dcmhvw5a.js";import{be}from"./chunk-q8cqcff6.js";var H4=["userSettings","flagSettings","policySettings"];function mEe(t){let i=new Set(Po()),e=Zme(t),n,r;for(let s of H4){if(!i.has(s))continue;let g=be(s)?.pluginConfigs;for(let u of e){let o=g?.[u];if(o?.options)n={...n,...o.options};if(o?.mcpServers){r=r??{};for(let[l,c]of Object.entries(o.mcpServers))r[l]={...r[l],...c}}}}return{options:n,mcpServers:r}}function Zme(t){let i=JO(t);if(i.length>0)return[...i.toReversed(),t];let e=`@${yf}`,n=t.endsWith(e)?t.slice(0,-e.length):"";return n!==""&&!n.includes("@")?[n,t]:[t]}function gpr(t){let i=new Set(Po()),e;for(let n of H4){if(!i.has(n))continue;let r=eQ(be(n)?.enabledPlugins,t);if(r!==void 0)e=r}return e}function C3t(t,i){let e=RE(i),n=JO(e);if(n.length===0)return{deciding:i,written:i,replaced:[]};let r=n.filter((s)=>t?.[s]!==void 0);return{deciding:t?.[e]===void 0?r[0]??e:e,written:e,replaced:r}}function eQ(t,i){let e=RE(i);return[e,...JO(e),i].map((n)=>t?.[n]).find((n)=>n!==void 0)}
export{H4,mEe,Zme,gpr,C3t,eQ};
