
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{TRe,YH}from"./chunk-5ythzcas.js";import{i}from"./chunk-xjnnz630.js";import{L1}from"./chunk-wtzc5s1n.js";function D1(){return i.CLAUDE_CODE_REMOTE_SESSION_ORIGIN==="review"}function fI(){return L1()&&D1()}function eLs(){return fI()?["CLAUDE_CODE_SESSION_ACCESS_TOKEN","CLAUDE_SESSION_INGRESS_TOKEN_FILE"]:[]}function b5i(r,e){if(!fI())return!1;if(r==="CLAUDE_CODE_SESSION_ACCESS_TOKEN"){if(e!=="")TRe(e);return!0}if(r==="CLAUDE_CODE_OAUTH_TOKEN"){if(e!=="")YH(e);return!0}return!1}
export{D1,fI,eLs,b5i};
