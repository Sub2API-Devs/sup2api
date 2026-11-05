
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{sq}from"./chunk-msyt5t42.js";import{pf,lLn,vW}from"./chunk-k0v80sg8.js";import{pe}from"./chunk-sbrfdm61.js";import{randomBytes as l}from"crypto";function hra(o,t){let e=o.mapToolResultToToolResultBlockParam(t.data,`toolu_serve_${l(12).toString("hex")}`);return OHr(e?.content??"",t.data,e?.is_error===!0)}function OHr(o,t,e=!1,r=[]){return vW({envelope:{v:pf,outcome:"completed",target:$Bt(),is_error:e,content:lLn(o),output:t,...r.length>0&&{notes:r}},content:o})}function $Bt(){return{name:sq(),working_dir:pe()}}
export{hra,OHr,$Bt};
