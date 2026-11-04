
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ln}from"./chunk-tw8fk0yz.js";import{yn}from"./chunk-x6v6jz2y.js";import{un}from"./chunk-yzt83vwd.js";import{ce,yt,j}from"./chunk-p86mcgbc.js";j();function cB(r,o,t=1000,n=0,a){let e=yn(),u=()=>ln(Math.max(0,(a??Date.now())-r-n)),l=ce((f)=>{if(!o)return()=>{};let i,s=()=>{try{f()}finally{i=e.setTimeout(s,t)}};return i=e.setTimeout(s,t),()=>i()},[o,t,e]);return yt(l,u,u)}function MV({onClose:r,onBack:o,onKill:t,onEnter:n}){return un({"confirm:yes":n??r},{context:"Confirmation"}),function(e){if(e.key===" ")e.preventDefault(),r();else if(e.key==="left"&&o)e.preventDefault(),o();else if(e.key==="x"&&!e.ctrl&&!e.meta&&t)e.preventDefault(),t()}}
export{cB,MV};
