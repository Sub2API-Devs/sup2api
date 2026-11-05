
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{qn}from"./chunk-8824h7w7.js";import{F6,fRe}from"./chunk-2jb250pa.js";var e=/[\p{Cc}\p{Cf}\p{Cs}\p{Mn}\p{Me}\p{Default_Ignorable_Code_Point}\u2028\u2029]/u;function hae(t,n){if(typeof t!=="string")return"";let r=qn(t).replace(/\r$/,"");if(e.test(r))return"";if(n!==void 0)return r.trim()===""?"":fRe(r,n).trim();return r.trim()===""?"":F6(r).trim()}
export{hae};
