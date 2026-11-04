
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{realpathSync as t}from"fs";import{cwd as e}from"process";function Fuo(n){return n}function bks(n){return n}function Sks(){let n="";if(typeof process<"u"&&typeof process.cwd==="function"&&typeof t==="function")try{let r=e();try{n=Fuo(bks(r))}catch{n=Fuo(r)}}catch{}return n}var PHn=Sks(),oZt=(()=>{if(typeof process>"u"||typeof process.cwd!=="function")return null;try{return process.cwd()}catch{return null}})();function oLt(){if(oZt===null)return null;let n=process.env.CLAUDE_CODE_SESSION_KIND;return n!==void 0&&String(n).trim()==="bg"?null:oZt}
export{Fuo,bks,Sks,PHn,oZt,oLt};
