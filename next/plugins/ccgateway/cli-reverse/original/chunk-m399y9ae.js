
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ge}from"./chunk-77hsvag5.js";class i{wait=null}var n=new i;class r{untilDeadline=null;exitBeganAtMs=null}var t=ge(new r,(e)=>{e.untilDeadline=null,e.exitBeganAtMs=null});function cbe(e=!0){t.untilDeadline=e&&t.untilDeadline!==!1}function Tbo(){return t.untilDeadline===!0}function Wht(){let e=Tbo();if(e)t.exitBeganAtMs??=Date.now();return e}function cCs(){let{exitBeganAtMs:e}=t;return e===null?0:Date.now()-e}function uCs(e){let u=n.wait;return n.wait=e,u}async function yrn(e){try{await n.wait?.(e)}catch{}}
export{cbe,Tbo,Wht,cCs,uCs,yrn};
