
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{realpathSync as t}from"fs";import{cwd as e}from"process";function BAo(n){return n}function u1s(n){return n}function f1s(){let n="";if(typeof process<"u"&&typeof process.cwd==="function"&&typeof t==="function")try{let r=e();try{n=BAo(u1s(r))}catch{n=BAo(r)}}catch{}return n}var Azn=f1s(),wVe=(()=>{if(typeof process>"u"||typeof process.cwd!=="function")return null;try{return process.cwd()}catch{return null}})();function xBt(){if(wVe===null)return null;let n=process.env.CLAUDE_CODE_SESSION_KIND;return n!==void 0&&String(n).trim()==="bg"?null:wVe}
export{BAo,u1s,f1s,Azn,wVe,xBt};
