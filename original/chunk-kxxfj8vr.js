
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{G}from"./chunk-gq18jh8s.js";import{nvi,Bw,Ut}from"./chunk-aepeg2w5.js";import{IL}from"./chunk-byj4f9x7.js";import{qd}from"./chunk-vc5p26w2.js";import{emn,CKe}from"./chunk-e6aww6q8.js";import{P,Q,Uy,j}from"./chunk-p86mcgbc.js";j();function t(){let[o,e]=Uy((s)=>s+1,0);return P(()=>nvi(e),[]),o}function vCr(o,e){return emn(o)??emn(e)??Bw()}function H0(o){return Ut(vCr(o.mainLoopModelForSession,o.mainLoopModel))}function iTe(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),s=IL(),i=t(),r=qd();return Q(()=>CKe(e,o),[e,o,s,r,i])}function dJe(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),s=IL(),i=t(),r=qd();return Q(()=>vCr(e,o),[e,o,s,r,i])}function Gc(){let o=G((n)=>n.mainLoopModel),e=G((n)=>n.mainLoopModelForSession),s=IL(),i=t(),r=qd();return Q(()=>H0({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,s,r,i])}
export{vCr,H0,iTe,dJe,Gc};
