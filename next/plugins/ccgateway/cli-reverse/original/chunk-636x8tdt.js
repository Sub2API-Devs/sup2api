
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{_ke,SL}from"./chunk-ndmse9kj.js";import{i}from"./chunk-jhrww53q.js";import{ade}from"./chunk-4vzb3taj.js";function FU(){return i.CLAUDE_CODE_REMOTE_SESSION_ORIGIN==="review"}function eL(){return ade()&&FU()}function khs(){return eL()?["CLAUDE_CODE_SESSION_ACCESS_TOKEN","CLAUDE_SESSION_INGRESS_TOKEN_FILE"]:[]}function BIi(r,e){if(!eL())return!1;if(r==="CLAUDE_CODE_SESSION_ACCESS_TOKEN"){if(e!=="")_ke(e);return!0}if(r==="CLAUDE_CODE_OAUTH_TOKEN"){if(e!=="")SL(e);return!0}return!1}
export{FU,eL,khs,BIi};
