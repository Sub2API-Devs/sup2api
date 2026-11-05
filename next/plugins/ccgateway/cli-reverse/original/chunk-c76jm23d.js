
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{J}from"./chunk-yxxb6qww.js";import{io,Gd}from"./chunk-evj8g37g.js";import{aye}from"./chunk-eeh1dqm6.js";import{Ga}from"./chunk-ghnsph6v.js";function uao(o,e){if(o.type!=="pending")return!1;let n=io(o.name);return!e.some((t)=>Gd(t,o.name,n))}async function fao(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await J(l);let r=o();if(s?.(r)||!i(r))return}}function Ncs(o){return o.some(ADe)}function ADe(o){return"role"in o.config&&o.config.role==="comms"}function FOt(o){return o.mcpInfo?.role==="comms"}function CDe(o){if(Ga())return o.filter((e)=>!FOt(e));return o}async function put(o){if(!Ga())return;await fao(o,(e,n)=>uao(e,n.tools)&&!ADe(e),{maxWaitMs:aye})}
export{uao,fao,Ncs,ADe,FOt,CDe,put};
