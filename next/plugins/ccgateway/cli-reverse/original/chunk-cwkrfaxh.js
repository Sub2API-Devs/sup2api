
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{_p}from"./chunk-5d1nwe9e.js";function*i(n){for(let s of n)if(s.type==="assistant"&&Array.isArray(s.message.content)){for(let e of s.message.content)if(e.type==="tool_use"&&_p.includes(e.name)){let{input:t}=e;if(typeof t==="object"&&t!==null&&"command"in t&&typeof t.command==="string")yield t.command}}}function _8n(n){let s=new Set;for(let e of i(n)){let t=m(e);if(t)s.add(t)}return s}var a=/https?:\/\/([^\s/?#'"`<>\\)\];&|(,]+)/gi;function c(n){if(!n)return[];let s=[];for(let e of n.matchAll(a)){let t=e[1].toLowerCase(),o=t.lastIndexOf("@");if(o!==-1)t=t.slice(o+1);let r=t.indexOf(":");if(r!==-1)t=t.slice(0,r);if(t)s.push(t)}return s}function b8n(n){let s=new Set;for(let e of i(n))for(let t of c(e))s.add(t);return s}function dXs(n){let s=new Set;for(let e of n)if(e.type==="assistant"&&Array.isArray(e.message.content)){for(let t of e.message.content)if(t.type==="tool_use")s.add(t.name)}return s}var f=new Set(["sudo"]);function m(n){if(!n)return;let s=n.trim().split(/\s+/);for(let e of s){if(/^[A-Za-z_]\w*=/.test(e))continue;if(f.has(e))continue;return e}return}
export{_8n,b8n,dXs};
