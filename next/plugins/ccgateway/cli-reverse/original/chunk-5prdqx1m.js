
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
var o=new RegExp("^(?:settings|(?:plugin|skill)(?::[A-Za-z0-9][A-Za-z0-9._-]{0,63})?)$"),t=new RegExp("^[A-Za-z0-9][A-Za-z0-9._-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$");function sjn(n){return typeof n==="string"&&o.test(n)?n:void 0}function ijn(n){return typeof n==="string"&&t.test(n)?n:void 0}function OLs(n,e){if(n===`PreToolUse:${e}`)return"PreToolUse";return n==="tool.check"?"tool.check":void 0}function MLs(n){return n==="PreToolUse"||n==="tool.check"?n:void 0}
export{sjn,ijn,OLs,MLs};
