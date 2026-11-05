
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{_f,bU,H6,j1,KKe,zE,wb}from"./chunk-my2r02mp.js";var oOt="next";function Ore(e,s,r){let n=!1,i;return s.update(e,(t)=>{if(i=t,t.notified)return t;if(n=!0,r?.skipStampIfRunning&&t.status==="running")return t;return{...t,notified:!0}}),{claimed:n,task:i}}var UPn=new RegExp(`^<${_f}>\\n<${bU}>([^<]+)</${bU}>`+[H6,j1,KKe].map((e)=>`(?:\\n<${e}>[^<]*</${e}>)?`).join("")+`\\n<${zE}>`);function Ui({taskId:e,toolUseId:s,taskType:r,outputFile:n,status:i,summary:t,body:u,trailing:p}){let d=[[bU,e],[H6,s],[j1,r],[KKe,n],[zE,i],[wb,t]],o=`<${_f}>`;for(let[a,T]of d)if(T)o+=`
<${a}>${T}</${a}>`;let f=(p??"").replaceAll(new RegExp(`<(?=\\s*/\\s*${_f}\\b)`,"gi"),"&lt;");return`${o}${u??""}
</${_f}>${f}`}
export{oOt,Ore,UPn,Ui};
