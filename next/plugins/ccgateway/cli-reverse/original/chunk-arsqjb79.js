
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var o=new RegExp("^(?:settings|(?:plugin|skill)(?::[A-Za-z0-9][A-Za-z0-9._-]{0,63})?)$"),t=new RegExp("^[A-Za-z0-9][A-Za-z0-9._-]{0,63}@[A-Za-z0-9][A-Za-z0-9._-]{0,63}$");function f6n(n){return typeof n==="string"&&o.test(n)?n:void 0}function p6n(n){return typeof n==="string"&&t.test(n)?n:void 0}function X5s(n,e){if(n===`PreToolUse:${e}`)return"PreToolUse";return n==="tool.check"?"tool.check":void 0}function J5s(n){return n==="PreToolUse"||n==="tool.check"?n:void 0}
export{f6n,p6n,X5s,J5s};
