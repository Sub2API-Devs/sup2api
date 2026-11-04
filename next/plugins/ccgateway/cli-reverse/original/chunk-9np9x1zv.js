
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ce}from"./chunk-eabawhjj.js";import{vr}from"./chunk-cgcrer2m.js";import{Nyr,ive,lY,UOe,vRi,kRi}from"./chunk-gwwacf44.js";import{execFile as c}from"child_process";var l=1e4,rus=250,o=null,u;function U4i(){return u===!0}function B4i(){return UOe().lastKnown}function j4i(n){UOe().lastKnown=n}function s(n){return new Promise((e)=>{try{c("security",["find-generic-password","-a",lY(),"-w","-s",n],{encoding:"utf-8",timeout:l,windowsHide:!0},(t,i)=>{let a=Boolean(t&&"killed"in t&&t.killed);e(a?null:{stdout:t?null:i?.trim()||null})})}catch{e(null)}})}function ous(){let n=vr();if(o||n)return;let e=UOe(),t=e.generation;return}async function oIn(n){if(!o)return;await(n===void 0?o:Ce(o,n))}function Fso(){UOe().legacyApiKeyPrefetch=null}
export{rus,U4i,B4i,j4i,ous,oIn,Fso};
