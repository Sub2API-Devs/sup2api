
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{EE}from"./chunk-83tv5s1x.js";import{Xur}from"./chunk-k63efphf.js";import{yat}from"./chunk-kyj1a8d5.js";import{SD}from"./chunk-wr5gyt6x.js";import{$h}from"./chunk-bjd2sxgw.js";import{Kg}from"./chunk-hq88884p.js";import{Re}from"./chunk-rshven70.js";var a=Re(SD());var c=Kg(),d=EE(),l=$h(),u=SD(),S=yat();var g=(e)=>`AWS_BEARER_TOKEN_${e.replace(/[\s-]/g,"_").toUpperCase()}`;var r=g;var s=Re($h()),Vur=({logger:e,signingName:n}={})=>async()=>{if(e?.debug?.("@aws-sdk/token-providers - fromEnvSigningName"),!n)throw new s.TokenProviderError("Please pass 'signingName' to compute environment variable key",{logger:e});let t=r(n);if(!(t in process.env))throw new s.TokenProviderError(`Token not present in '${t}' environment variable`,{logger:e});let o={token:process.env[t]};return a.setTokenFeature(o,"BEARER_SERVICE_ENV_VARS","3"),o};var i=Re($h());var qur=(e={})=>i.memoize(i.chain(Xur(e),async()=>{throw new i.TokenProviderError("Could not load token from any providers",!1)}),(n)=>n.expiration!==void 0&&n.expiration.getTime()-Date.now()<300000,(n)=>n.expiration!==void 0);
export{Vur,qur};
