
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ke}from"./chunk-yxxb6qww.js";import{Lr}from"./chunk-2k62t388.js";import{CPr,rCe,l6,v0e,WVi,GVi}from"./chunk-rfqytzvf.js";import{execFile as c}from"child_process";var l=1e4,Sxs=250,o=null,u;function Dfa(){return u===!0}function Lfa(){return v0e().lastKnown}function Hfa(n){v0e().lastKnown=n}function s(n){return new Promise((e)=>{try{c("security",["find-generic-password","-a",l6(),"-w","-s",n],{encoding:"utf-8",timeout:l,windowsHide:!0},(t,i)=>{let a=Boolean(t&&"killed"in t&&t.killed);e(a?null:{stdout:t?null:i?.trim()||null})})}catch{e(null)}})}function wxs(){let n=Lr();if(o||n)return;let e=v0e(),t=e.generation;return}async function qUn(n){if(!o)return;await(n===void 0?o:ke(o,n))}function FSo(){v0e().legacyApiKeyPrefetch=null}
export{Sxs,Dfa,Lfa,Hfa,wxs,qUn,FSo};
