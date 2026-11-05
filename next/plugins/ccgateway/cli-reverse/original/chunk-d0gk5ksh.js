
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{nt}from"./chunk-aj4djjd6.js";import{p}from"./chunk-k6qypy1d.js";import{ae}from"./chunk-gcy2kcsb.js";import{Wk}from"./chunk-tz1164x0.js";import{o,E,Rt,T}from"./chunk-m4y44r15.js";var l=p(()=>Rt({eval:E().refine(Number.isSafeInteger),status:o().optional().catch(void 0)})),m=p(()=>Rt({kind:T(Wk),fields:l()}));function Oyn(n,r){if(!ae())return;let t=m().safeParse(r);if(t.success)return u(t.data.fields);let a=/^<event\b([^>]*)>(?:\n(\{[^\n]*\})\n<\/event(?: nonce="([A-Za-z0-9_-]+)")?>$)?/,[,e,d,f]=a.exec(n)??[];if(e===void 0||!e.includes(` kind="${Wk}"`))return;let s=/ eval="(\d+)"/.exec(e)?.[1];if(s!==void 0)return{evalId:Number(s),status:/ status="([^"]*)"/.exec(e)?.[1]};if(d===void 0||f!==/ nonce="([A-Za-z0-9_-]+)"/.exec(e)?.[1])return;let i=l().safeParse(nt(d,!1));return i.success?u(i.data):void 0}function jti(n){if(!ae())return[];let r=/<event\b[^>]*>(?:\n\{[^\n]*\}\n<\/event(?: nonce="[A-Za-z0-9_-]+")?>)?/g,t=[];for(let[a]of n.matchAll(r)){let e=Oyn(a,void 0);if(e!==void 0)t.push(e)}return t}function u(n){return{evalId:n.eval,status:n.status}}
export{Oyn,jti};
