
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Rir,oXo}from"./chunk-5xgkngpb.js";import{randomUUID as n}from"crypto";function K4e(t){let e=oXo(t,Rir(t,t));return e===null?t:[...t,r(e)]}var c2o=(t)=>r(oXo(t,Rir(t,t))??{type:"session_cron_carry",tasks:[]}),r=(t)=>({attachment:t,type:"attachment",uuid:n(),timestamp:new Date().toISOString()});
export{K4e,c2o};
