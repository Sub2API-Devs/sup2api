
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{b4}from"./chunk-efc34qfz.js";import{Af,Yvn,T1}from"./chunk-g54kbxqw.js";import{fe}from"./chunk-fnk5kvbf.js";import{randomBytes as l}from"crypto";function Sji(o,t){let e=o.mapToolResultToToolResultBlockParam(t.data,`toolu_serve_${l(12).toString("hex")}`);return Hvr(e?.content??"",t.data,e?.is_error===!0)}function Hvr(o,t,e=!1,r=[]){return T1({envelope:{v:Af,outcome:"completed",target:yLt(),is_error:e,content:Yvn(o),output:t,...r.length>0&&{notes:r}},content:o})}function yLt(){return{name:b4(),working_dir:fe()}}
export{Sji,Hvr,yLt};
