
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{X}from"./chunk-ndmse9kj.js";import{d}from"./chunk-2g090z7k.js";import{J}from"./chunk-eabawhjj.js";import{le,t}from"./chunk-cgr0tezp.js";import{m}from"./chunk-8nhse09v.js";import{Ono}from"./chunk-aepeg2w5.js";import{_d}from"./chunk-bmbhxpfm.js";import{g$}from"./chunk-gwwacf44.js";import{join as f}from"path";var p=5;class $5t extends Error{constructor(){super("OAuth refresh lock contention: another process is holding the refresh lock");this.name="OauthSlotLockContendedError"}}async function Ccr(o,n){if(X())throw m("oauth_token_refresh","oauth_slot_refresh_diskless"),Error("This hosted session (claude-code-server) cannot refresh an OAuth token");let s=g$();await le().mkdir(s);let i=f(s,o),a=!1,r,l=0;while(!r){l++;try{r=await _d(i,{lockfilePath:i,realpath:!1,stale:60000,update:5000,onCompromised:(e)=>{a=!0,t(`OAuth refresh lock ${o} compromised: ${e.message}`,{level:"error"})}})}catch(e){if(e.code==="ELOCKED"){if(l<p){await J(1000+Math.random()*1000);continue}throw new $5t}throw e}}let c={isCompromised:()=>a},h=Ono();try{return await n(c)}finally{try{try{await r()}catch(e){t(`OAuth refresh lock ${o} release failed: ${d(e)}`,{level:"error"})}}finally{h()}}}
export{$5t,Ccr};
