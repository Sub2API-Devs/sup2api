
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{_w}from"./chunk-ndmse9kj.js";import{vr}from"./chunk-cgcrer2m.js";import{Do}from"./chunk-3a1caa6f.js";import{ls}from"./chunk-khngy9cs.js";import{t1e}from"./chunk-q8cqcff6.js";import{xw,QZ,lE,Lo}from"./chunk-e6aww6q8.js";import{eAs}from"./chunk-weh04swb.js";import{kA}from"./chunk-3z3sb58b.js";function OZt(){return QZ(ls)}async function Apo(){await Promise.all([kA(),t1e()])}function Cpo(e,r){return eAs(r.scope)&&!Lo(e)}function eWe(e,r){return Cpo(e,r)&&!t(r)}function t(e){return require("./chunk-asne9cp8.js").mcpClientModule().isFirstPartyDesignServerConfig(e)}function Rpo(e){switch(e.type){case void 0:case"stdio":case"http":case"sse":case"ws":return!0;case"sdk":case"sse-ide":case"ws-ide":case"claudeai-proxy":return!1}}function i(e){return Object.assign(xw(),Do(e,Rpo))}async function xpo({storageV5:e}={}){if(_w()||vr())return{configs:xw(),deniedBySettings:!1};await Apo();let{servers:r}=await lE({},{purpose:"deviceBridge",storageV5:e});return{configs:i(r),deniedBySettings:OZt()}}async function h0n(e={}){let{configs:r,deniedBySettings:o}=await xpo(e);return o?xw():r}
export{OZt,Apo,Cpo,eWe,Rpo,xpo,h0n};
