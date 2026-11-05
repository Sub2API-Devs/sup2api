
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{un}from"./chunk-8n1fbght.js";import{kn}from"./chunk-emhzq435.js";import{_n}from"./chunk-p762h6ag.js";import{ue,At,j}from"./chunk-zsz062c7.js";j();function t0(r,o,t=1000,n=0,a){let e=kn(),u=()=>un(Math.max(0,(a??Date.now())-r-n)),l=ue((f)=>{if(!o)return()=>{};let i,s=()=>{try{f()}finally{i=e.setTimeout(s,t)}};return i=e.setTimeout(s,t),()=>i()},[o,t,e]);return At(l,u,u)}function D4({onClose:r,onBack:o,onKill:t,onEnter:n}){return _n({"confirm:yes":n??r},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),r();else if(e.key==="left"&&o)e.preventDefault(),o();else if(e.key==="x"&&!e.ctrl&&!e.meta&&t)e.preventDefault(),t()}}
export{t0,D4};
