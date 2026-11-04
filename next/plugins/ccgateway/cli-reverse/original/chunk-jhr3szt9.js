
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
class N7e extends Error{label;timeoutMs;constructor(e,r){super(`${e} timed out after ${r}ms`);this.label=e;this.timeoutMs=r;this.name="BoundedTimeoutError"}}async function Xl(e,r,n){let t,o=new Promise((c,i)=>{t=setTimeout((s,u,m)=>s(new N7e(u,m)),Math.min(r,2147483647),i,n,r)});try{return await Promise.race([e,o])}finally{if(t)clearTimeout(t);e.catch(()=>{})}}var Hln=5000;function z_(e,r){return Xl(e,Hln,`[runner:stuck] fs op '${r}' (check TMPDIR mount health)`)}
export{N7e,Xl,Hln,z_};
