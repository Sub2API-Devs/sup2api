
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{yu,N$,HY,qU,wje,qw,H_}from"./chunk-bbtre4r8.js";var Vkt="next";function Uee(e,s,r){let n=!1,i;return s.update(e,(t)=>{if(i=t,t.notified)return t;if(n=!0,r?.skipStampIfRunning&&t.status==="running")return t;return{...t,notified:!0}}),{claimed:n,task:i}}var RSn=new RegExp(`^<${yu}>\\n<${N$}>([^<]+)</${N$}>`+[HY,qU,wje].map((e)=>`(?:\\n<${e}>[^<]*</${e}>)?`).join("")+`\\n<${qw}>`);function bi({taskId:e,toolUseId:s,taskType:r,outputFile:n,status:i,summary:t,body:u,trailing:p}){let d=[[N$,e],[HY,s],[qU,r],[wje,n],[qw,i],[H_,t]],o=`<${yu}>`;for(let[a,T]of d)if(T)o+=`
<${a}>${T}</${a}>`;let f=(p??"").replaceAll(new RegExp(`<(?=\\s*/\\s*${yu}\\b)`,"gi"),"&lt;");return`${o}${u??""}
</${yu}>${f}`}
export{Vkt,Uee,RSn,bi};
