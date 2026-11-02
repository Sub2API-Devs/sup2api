
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{J}from"./chunk-eabawhjj.js";import{so,au}from"./chunk-6mwt0myy.js";import{Npe}from"./chunk-3pdgd98q.js";import{Ua}from"./chunk-96sthk2s.js";function A3r(o,e){if(o.type!=="pending")return!1;let n=so(o.name);return!e.some((t)=>au(t,o.name,n))}async function C3r(o,e,n){let{maxWaitMs:t,until:s,pollMs:l=50}=n,i=(r)=>r.clients.some((c)=>e(c,r));if(!i(o()))return;let p=Date.now()+t;while(Date.now()<p){await J(l);let r=o();if(s?.(r)||!i(r))return}}function X3o(o){return o.some(Vxe)}function Vxe(o){return"role"in o.config&&o.config.role==="comms"}function ETt(o){return o.mcpInfo?.role==="comms"}function qxe(o){if(Ua())return o.filter((e)=>!ETt(e));return o}async function Bot(o){if(!Ua())return;await C3r(o,(e,n)=>A3r(e,n.tools)&&!Vxe(e),{maxWaitMs:Npe})}
export{A3r,C3r,X3o,Vxe,ETt,qxe,Bot};
