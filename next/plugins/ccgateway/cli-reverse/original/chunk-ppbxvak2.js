
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{A$}from"./chunk-1rg94zzn.js";import{Je}from"./chunk-r4yj9pae.js";var d=["take_in"];class r{visitors=new Map}var l=new Je(()=>new r);function a(o){try{return o.pending()===!0}catch{return!1}}function _4s(o){let e=l.peek(o)?.visitors;return e!==void 0&&[...e.values()].some(a)}async function b4s(o,e){let n=l.peek(o)?.visitors;if(n===void 0)return;let p=(async()=>{for(let s of d){let i=n.get(s);if(i!==void 0&&!A$(e)&&a(i))try{await i.visit(e)}catch{}}})();if(A$(e))return;let t=()=>{},c=new Promise((s)=>{t=()=>s()});e.addEventListener("abort",t,{once:!0});try{await Promise.race([p,c])}finally{e.removeEventListener("abort",t)}}
export{_4s,b4s};
