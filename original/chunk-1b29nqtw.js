
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{U9n,xBo}from"./chunk-e6aww6q8.js";import{randomUUID as n}from"crypto";function mze(t){let e=xBo(t,U9n(t,t));return e===null?t:[...t,r(e)]}var pOo=(t)=>r(xBo(t,U9n(t,t))??{type:"session_cron_carry",tasks:[]}),r=(t)=>({attachment:t,type:"attachment",uuid:n(),timestamp:new Date().toISOString()});
export{mze,pOo};
