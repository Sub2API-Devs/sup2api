
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{d}from"./chunk-63094ahz.js";import{t}from"./chunk-6hadbefe.js";import{v}from"./chunk-exfmq47h.js";import{n_e,JLt}from"./chunk-ck4jrdtf.js";import{jLe}from"./chunk-csb2jdt5.js";import{vos,ta,_Rn}from"./chunk-7jxyna5q.js";function aLo(){if(!vos())return"off";try{return v("tengu_vast_tulip",!1)===!0?"enforce":"observe"}catch{return t("tool host attestation: reading tengu_vast_tulip threw; observing",{level:"warn"}),"observe"}}function s(e){let o=jLe(),{status:r,meetsLevel:n,configException:i}=JLt(e,o,{isCloudWorker:!1});return{status:r,verdict:!o.enforce?"not_policed":n?"pass":i?"config_exception":"below_floor"}}function iwe(e){let o=aLo();return o==="off"?void 0:{mode:o,...s(n_e(e))}}function Uxe(e){return e?.mode==="enforce"&&e.verdict==="below_floor"}function WYn(){let e=iwe("UNSPECIFIED");return{attestation:e,heldBack:Uxe(e)}}function S4s(e){try{e?.(_Rn,ta["repository_trust.served_calls.unattested"])}catch(o){t(`[remote-tools] the notice sink threw on ${_Rn}: ${d(o)}`,{level:"error"})}}
export{aLo,iwe,Uxe,WYn,S4s};
