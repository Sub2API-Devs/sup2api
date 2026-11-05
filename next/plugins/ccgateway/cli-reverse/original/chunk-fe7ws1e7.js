
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{q}from"./chunk-5ythzcas.js";import{d}from"./chunk-63094ahz.js";import{J}from"./chunk-yxxb6qww.js";import{le,t}from"./chunk-6hadbefe.js";import{m}from"./chunk-47b8txen.js";import{Tyo}from"./chunk-exfmq47h.js";import{zd}from"./chunk-3c7mkwg0.js";import{XF}from"./chunk-rfqytzvf.js";import{join as f}from"path";var p=5;class yZt extends Error{constructor(){super("OAuth refresh lock contention: another process is holding the refresh lock");this.name="OauthSlotLockContendedError"}}async function avr(o,n){if(q())throw m("oauth_token_refresh","oauth_slot_refresh_diskless"),Error("This hosted session (claude-code-server) cannot refresh an OAuth token");let s=XF();await le().mkdir(s);let i=f(s,o),a=!1,r,l=0;while(!r){l++;try{r=await zd(i,{lockfilePath:i,realpath:!1,stale:60000,update:5000,onCompromised:(e)=>{a=!0,t(`OAuth refresh lock ${o} compromised: ${e.message}`,{level:"error"})}})}catch(e){if(e.code==="ELOCKED"){if(l<p){await J(1000+Math.random()*1000);continue}throw new yZt}throw e}}let c={isCompromised:()=>a},h=Tyo();try{return await n(c)}finally{try{try{await r()}catch(e){t(`OAuth refresh lock ${o} release failed: ${d(e)}`,{level:"error"})}}finally{h()}}}
export{yZt,avr};
