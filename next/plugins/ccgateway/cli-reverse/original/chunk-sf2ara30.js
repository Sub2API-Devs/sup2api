
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{J}from"./chunk-yxxb6qww.js";import{W}from"./chunk-0qffyy27.js";import{CAe}from"./chunk-exfmq47h.js";class r{stampMs=0;detachedSinceLastAttach=!1;reset(){this.stampMs=0,this.detachedSinceLastAttach=!1}}var s=new W(()=>new r);function a(){return s.of(F().host)}function G0o(e){let t=a();if(e===0){t.reset();return}if(t.detachedSinceLastAttach||t.stampMs===0)t.stampMs=e;t.detachedSinceLastAttach=!1}function _pn(){a().detachedSinceLastAttach=!0}function z0o(){return a().detachedSinceLastAttach}function yrt(){return a().stampMs}function bpn(e){return!1}async function g6n(){for(;;){let e=Date.now();if(!bpn(e))return;let{detachedSinceLastAttach:t,stampMs:o}=a(),c=t||o===0?500:o+500-e;await J(Math.max(25,c)+25)}}
export{G0o,_pn,z0o,yrt,bpn,g6n};
