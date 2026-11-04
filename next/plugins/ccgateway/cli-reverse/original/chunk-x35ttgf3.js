
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ce,P,y,j}from"./chunk-p86mcgbc.js";j();function B_(r){let[t,n]=y({attempts:0,refused:null}),s=ce((e)=>{n((a)=>({attempts:a.attempts+1,refused:e}))},[]),u=ce((e)=>{if(r(e)===!1)return s(e),!1;return!0},[r,s]);return P(()=>{if(t.refused!==null)n((e)=>({attempts:e.attempts,refused:null}))},[t.refused]),{answer:u,refuse:s,refused:t.refused,attempts:t.attempts}}
export{B_};
