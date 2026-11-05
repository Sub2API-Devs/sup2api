
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
class Xot extends Error{label;timeoutMs;constructor(e,r){super(`${e} timed out after ${r}ms`);this.label=e;this.timeoutMs=r;this.name="BoundedTimeoutError"}}async function Vl(e,r,n){let t,o=new Promise((c,i)=>{t=setTimeout((s,u,m)=>s(new Xot(u,m)),Math.min(r,2147483647),i,n,r)});try{return await Promise.race([e,o])}finally{if(t)clearTimeout(t);e.catch(()=>{})}}var Vyn=5000;function Rb(e,r){return Vl(e,Vyn,`[runner:stuck] fs op '${r}' (check TMPDIR mount health)`)}
export{Xot,Vl,Vyn,Rb};
