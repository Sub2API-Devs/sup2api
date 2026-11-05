
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{mE}from"./chunk-5ythzcas.js";import{Lr}from"./chunk-2k62t388.js";import{zo}from"./chunk-89fdmwf8.js";import{S2e}from"./chunk-5fn9rb8r.js";import{Nw,dQ,qS,Do}from"./chunk-5xgkngpb.js";import{aWs}from"./chunk-rpcghvjh.js";import{DA}from"./chunk-rmxjvkzd.js";import{wo}from"./chunk-j7eg9eb6.js";function Eln(){return dQ(zo)}async function SRo(){await Promise.all([DA(),S2e()])}function wRo(e,r){return aWs(r.scope)&&!Do(e)}function RVe(e,r){return wRo(e,r)&&!t(r)}function t(e){return require("./chunk-9hx1mne2.js").mcpClientModule().isFirstPartyDesignServerConfig(e)}function ERo(e){switch(e.type){case void 0:case"stdio":case"http":case"sse":case"ws":return!0;case"sdk":case"sse-ide":case"ws-ide":case"claudeai-proxy":return!1}}function i(e){return Object.assign(Nw(),wo(e,ERo))}async function vRo({storageV5:e}={}){if(mE()||Lr())return{configs:Nw(),deniedBySettings:!1};await SRo();let{servers:r}=await qS({},{purpose:"deviceBridge",storageV5:e});return{configs:i(r),deniedBySettings:Eln()}}async function f2n(e={}){let{configs:r,deniedBySettings:o}=await vRo(e);return o?Nw():r}
export{Eln,SRo,wRo,RVe,ERo,vRo,f2n};
