
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Vt}from"./chunk-kcjh5jnz.js";import{K,X}from"./chunk-ndmse9kj.js";import{d,k}from"./chunk-2g090z7k.js";import{t}from"./chunk-cgr0tezp.js";import{Un}from"./chunk-k176arn3.js";import{ci}from"./chunk-c1qgdbhd.js";import{Xk}from"./chunk-6mwt0myy.js";import{NP}from"./chunk-nw7jbebs.js";import{PT}from"./chunk-s61vbvea.js";import{R4t}from"./chunk-1dp9p908.js";import{mkdir as f}from"fs/promises";import{dirname as m,join as c}from"path";var tVn="session",_0r=".session-list",sOo=64;function uln(o){let e=Vt(o)?o.slice(0,8):Xk(o)??o;return`${tVn}-${e}`}function b0r(o){let e=`${tVn}-`,r=o.startsWith(e)?o.slice(e.length):void 0;return R4t(o)||R4t(r)||/^[0-9a-f]{8}$/i.test(r??"")}async function Yzi(){let{leaderTeamName:o,sessionListId:e}=ci().taskList,r=e??o;if(!r||X())return;try{let i=NP(uln(K())),s=m(i);for(let n of[s,i])if(await f(n).catch((a)=>{if(k(a)!=="EEXIST")throw a}),await PT(m(s),n)!=="ok"){t("[sessionTeam] Not noting the task list of the cleared session: its folder is not a plain directory",{level:"warn"});return}await Un(c(i,_0r),r)}catch(i){t(`[sessionTeam] Could not note the task list of the cleared session: ${d(i)}`,{level:"warn"})}}
export{tVn,_0r,sOo,uln,b0r,Yzi};
