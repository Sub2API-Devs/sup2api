
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Vr}from"./chunk-5ythzcas.js";import{dn,sr,jt}from"./chunk-exfmq47h.js";import{Ome}from"./chunk-peqtdyy5.js";import{_$e,J1t,oxe}from"./chunk-s4h0q5es.js";import{v2n,k2n}from"./chunk-czq1j3j2.js";import{e}from"./chunk-6n4z8qxn.js";import{Pvt,Thn,pae}from"./chunk-ph8hmbrf.js";async function PSt(s,n){let t=Ome(s);if(Thn())return e(k2n,{onDone:t});let o=await pae({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(jt())return t(Pvt),null;return e(v2n,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=sr();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=dn(),u=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},l=Vr();return e(oxe,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,c,m)=>{let g=await _$e(n,a,{setAppState:m,previousAccount:u,previousGatewayAuth:l});t(...J1t(n,a,g))}})}
export{PSt};
