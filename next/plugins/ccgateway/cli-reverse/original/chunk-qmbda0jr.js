
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{B}from"./chunk-ndmse9kj.js";import{J}from"./chunk-eabawhjj.js";import{W}from"./chunk-x7vma94a.js";import{DEe}from"./chunk-aepeg2w5.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new W(()=>new r);function a(){return s.of(B().host)}function oEo(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function aon(){a().detachedSinceLastAttach=!0}function sEo(){return a().detachedSinceLastAttach}function oQe(){return a().stampMs}function lon(e){return!1}async function B1n(){for(;;){let e=Date.now();if(!lon(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await J(Math.max(25,c)+25)}}
export{oEo,aon,sEo,oQe,lon,B1n};
