
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{at}from"./chunk-bwbq4xvm.js";import{l}from"./chunk-bbtre4r8.js";import{tn}from"./chunk-hwmn0xfn.js";var e="claudecode/editResult",u="1";function wfo(o,t){return o===at&&tn(t)&&t[e]===u}async function Efo(o,t){if(o.isError===!0||t.subagentFrameResult===void 0)return o;try{if(await t.subagentFrameResultHolds?.()===!1)return o}catch(r){return l(r),o}return{...o,_meta:{...o._meta,[e]:t.subagentFrameResult}}}
export{wfo,Efo};
