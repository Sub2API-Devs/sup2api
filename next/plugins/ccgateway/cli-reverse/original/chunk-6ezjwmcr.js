
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{G1}from"./chunk-ndcj3jv5.js";import{x}from"./chunk-8824h7w7.js";import{a}from"./chunk-my2r02mp.js";import{BHe}from"./chunk-exfmq47h.js";import{ole}from"./chunk-5xgkngpb.js";import{g}from"./chunk-47b8txen.js";import{tqn}from"./chunk-gdkqhwa0.js";var Bbt=(t,e)=>ole(e)&&!BHe(t,e);var s=86400000,d=3,u=7+d;function s2n(){try{let t=tqn();return t===null?{}:{credential_expires_at:t.toISOString()}}catch(t){return a(t),{}}}function Kjs(t=Date.now()){try{let e=tqn();if(e===null)return null;let{earliest:n,latest:r,daysToEarliest:o}=l(e,t);return`${e.getTime()<=t?`Sign-in may have ended: between ${n} and ${r}`:o<1?`Sign-in ends: any day now, by ${r}`:`Sign-in ends: between ${n} and ${r}`} (${e.toISOString()})`}catch(e){return a(e),null}}function Vjs(t=Date.now()){try{let e=tqn();if(e===null)return;let n=e.getTime()-t;if(n>=u*s)return;let{earliest:r,latest:o,daysToEarliest:i}=l(e,t);G1(n<=0?`Warning: this sign-in may have ended between ${r} and ${o}. If requests are refused, run claude auth login, or use claude setup-token for unattended jobs.
`:i<1?`Warning: this sign-in can end at any time from now until ${o}. Renewing it does not move that date. Run claude auth login now, or use claude setup-token for unattended jobs.
`:`Warning: this sign-in ends between ${r} and ${o} (in ${i} ${x(i,"day")} at the earliest). Renewing it does not move those dates. Run claude auth login before then, or use claude setup-token for unattended jobs.
`),g("oauth_expiry_warning")}catch(e){a(e)}}function l(t,e){let n=t.getTime()-d*s;return{earliest:new Date(n).toISOString().slice(0,10),latest:t.toISOString().slice(0,10),daysToEarliest:Math.floor(n/s)-Math.floor(e/s)}}
export{Bbt,s2n,Kjs,Vjs};
