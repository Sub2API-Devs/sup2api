
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{wv}from"./chunk-vhcq2g1g.js";import{Rkr}from"./chunk-t032zdr0.js";import{Qpt}from"./chunk-s8d82zme.js";import{oH}from"./chunk-d7rgbgn3.js";import{My}from"./chunk-f7zg61zb.js";import{Bg}from"./chunk-355mdh7x.js";import{Ie}from"./chunk-gehzbwn8.js";var a=Ie(oH());var c=Bg(),d=wv(),l=My(),u=oH(),S=Qpt();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=Ie(My()),Tkr=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=Ie(My());var Akr=(e={})=>i.memoize(i.chain(Rkr(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{Tkr,Akr};
