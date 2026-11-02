
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{isAbsolute as n,relative as o,sep as s}from"path";function hm(r,i,e){let t=o(r,i);if(t==="")return e;return t!==".."&&!t.startsWith(`..${s}`)&&!n(t)}
export{hm};
