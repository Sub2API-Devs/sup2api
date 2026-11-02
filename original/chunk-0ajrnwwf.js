
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{d}from"./chunk-2g090z7k.js";import{t}from"./chunk-cgr0tezp.js";import{v}from"./chunk-aepeg2w5.js";import{Ame,vRt}from"./chunk-1qpz7qcd.js";import{aIe}from"./chunk-0jk9tmkx.js";import{jqo,Ui,w_n}from"./chunk-s61vbvea.js";function gSo(){if(!jqo())return"off";try{return v("tengu_vast_tulip",!1)===!0?"enforce":"observe"}catch{return t("tool host attestation: reading tengu_vast_tulip threw; observing",{level:"warn"}),"observe"}}function s(e){let o=aIe(),{status:r,meetsLevel:n,configException:i}=vRt(e,o,{isCloudWorker:!1});return{status:r,verdict:!o.enforce?"not_policed":n?"pass":i?"config_exception":"below_floor"}}function Cye(e){let o=gSo();return o==="off"?void 0:{mode:o,...s(Ame(e))}}function PTe(e){return e?.mode==="enforce"&&e.verdict==="below_floor"}function BBn(){let e=Cye("UNSPECIFIED");return{attestation:e,heldBack:PTe(e)}}function _Ms(e){try{e?.(w_n,Ui["repository_trust.served_calls.unattested"])}catch(o){t(`[remote-tools] the notice sink threw on ${w_n}: ${d(o)}`,{level:"error"})}}
export{gSo,Cye,PTe,BBn,_Ms};
