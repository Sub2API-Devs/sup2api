
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{lt}from"./chunk-p223w7hd.js";import{a}from"./chunk-my2r02mp.js";import{Kt}from"./chunk-rqh4xyxp.js";var e="claudecode/editResult",l="1";function mCo(o,t){return o===lt&&Kt(t)&&t[e]===l}async function hCo(o,t){if(o.isError===!0||t.subagentFrameResult===void 0)return o;try{if(await t.subagentFrameResultHolds?.()===!1)return o}catch(r){return a(r),o}return{...o,_meta:{...o._meta,[e]:t.subagentFrameResult}}}
export{mCo,hCo};
