
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{X0}from"./chunk-j7w6w6jx.js";import{tt}from"./chunk-ndmse9kj.js";var d=["take_in"];class r{visitors=new Map}var l=new tt(()=>new r);function a(o){try{return o.pending()===!0}catch{return!1}}function hMs(o){let e=l.peek(o)?.visitors;return e!==void 0&&[...e.values()].some(a)}async function yMs(o,e){let n=l.peek(o)?.visitors;if(n===void 0)return;let p=(async()=>{for(let s of d){let i=n.get(s);if(i!==void 0&&!X0(e)&&a(i))try{await i.visit(e)}catch{}}})();if(X0(e))return;let t=()=>{},c=new Promise((s)=>{t=()=>s()});e.addEventListener("abort",t,{once:!0});try{await Promise.race([p,c])}finally{e.removeEventListener("abort",t)}}
export{hMs,yMs};
