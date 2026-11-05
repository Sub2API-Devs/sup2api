
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Lt}from"./chunk-8824h7w7.js";import{S}from"./chunk-zt8d60ng.js";import{s,n}from"./chunk-emhzq435.js";import{b_}from"./chunk-my2nvh4x.js";import{Ve}from"./chunk-h40h7b8f.js";import{e,r}from"./chunk-6n4z8qxn.js";import{Ci,MAn}from"./chunk-a99d5w8y.js";import{WLt,ULe}from"./chunk-d342dwxg.js";import{ml}from"./chunk-0eqmdcgk.js";function twt(p){return p.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g,"")}function V(p){let o=p.flatMap((t)=>{if(!ULe(t))return[];let u=ml(t.text);return[MAn(u)??u]}).join(`
`);return o.trim()===""?void 0:o}function Jg(p){let l=S(28),{result:o,verbose:t,verbatim:u}=p,w=u===void 0?!1:u,b,v,g,y,T,h,k;if(l[0]!==o||l[1]!==w||l[2]!==t){let a;let I=Array.isArray(o);let m;if(l[10]!==I||l[11]!==o)m=typeof o==="string"?o:I?V(o):void 0,l[10]=I,l[11]=o,l[12]=m;else m=l[12];let P=m;let R=w||I;if(P===void 0)a="Tool execution failed";else{let d=(R?ml(P):twt(ml(Ci(P,"tool_use_error")??P)).replace(/<\/?error>/g,"")).trim();if(!t&&!R&&d.startsWith("InputValidationError: "))a="Invalid tool parameters";else if(d.startsWith("Error: ")||d.startsWith("Cancelled: "))a=d;else a=`Error: ${d}`}y=Lt(a,`
`)+1-WLt;g=Ve;v=s;k="column";b=n;T="error";h=t?a:a.split(`
`).slice(0,WLt).join(`
`);l[0]=o,l[1]=w,l[2]=t,l[3]=b,l[4]=v,l[5]=g,l[6]=y,l[7]=T,l[8]=h,l[9]=k}else b=l[3],v=l[4],g=l[5],y=l[6],T=l[7],h=l[8],k=l[9];let m;if(l[13]!==b||l[14]!==T||l[15]!==h)m=e(b,{color:T,children:h}),l[13]=b,l[14]=T,l[15]=h,l[16]=m;else m=l[16];let B;if(l[17]!==y||l[18]!==t)B=!t&&e(b_,{count:y,expandable:!0}),l[17]=y,l[18]=t,l[19]=B;else B=l[19];let W;if(l[20]!==v||l[21]!==k||l[22]!==m||l[23]!==B)W=r(v,{flexDirection:k,children:[m,B]}),l[20]=v,l[21]=k,l[22]=m,l[23]=B,l[24]=W;else W=l[24];let U;if(l[25]!==g||l[26]!==W)U=e(g,{children:W}),l[25]=g,l[26]=W,l[27]=U;else U=l[27];return U}
export{twt,Jg};
