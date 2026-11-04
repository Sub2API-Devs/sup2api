
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{$t}from"./chunk-m41h77x8.js";import{w}from"./chunk-s89ma3n1.js";import{s,n}from"./chunk-x6v6jz2y.js";import{Dy}from"./chunk-mt2ya4ef.js";import{ze}from"./chunk-wq9366y3.js";import{e,r}from"./chunk-nn4p932b.js";import{ui,Dhn}from"./chunk-8eppk1se.js";import{WCt,KPe}from"./chunk-rmf8afvh.js";import{qa}from"./chunk-58wc6nbw.js";function wmt(p){return p.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g,"")}function L(p){let o=p.flatMap((t)=>{if(!KPe(t))return[];let u=qa(t.text);return[Dhn(u)??u]}).join(`
`);return o.trim()===""?void 0:o}function eh(p){let l=w(28),{result:o,verbose:t,verbatim:u}=p,V=u===void 0?!1:u,b,v,g,y,T,h,k;if(l[0]!==o||l[1]!==V||l[2]!==t){let a;let I=Array.isArray(o);let m;if(l[10]!==I||l[11]!==o)m=typeof o==="string"?o:I?L(o):void 0,l[10]=I,l[11]=o,l[12]=m;else m=l[12];let P=m;let S=V||I;if(P===void 0)a="Tool execution failed";else{let d=(S?qa(P):wmt(qa(ui(P,"tool_use_error")??P)).replace(/<\/?error>/g,"")).trim();if(!t&&!S&&d.startsWith("InputValidationError: "))a="Invalid tool parameters";else if(d.startsWith("Error: ")||d.startsWith("Cancelled: "))a=d;else a=`Error: ${d}`}y=$t(a,`
`)+1-WCt;g=ze;v=s;k="column";b=n;T="error";h=t?a:a.split(`
`).slice(0,WCt).join(`
`);l[0]=o,l[1]=V,l[2]=t,l[3]=b,l[4]=v,l[5]=g,l[6]=y,l[7]=T,l[8]=h,l[9]=k}else b=l[3],v=l[4],g=l[5],y=l[6],T=l[7],h=l[8],k=l[9];let m;if(l[13]!==b||l[14]!==T||l[15]!==h)m=e(b,{color:T,children:h}),l[13]=b,l[14]=T,l[15]=h,l[16]=m;else m=l[16];let B;if(l[17]!==y||l[18]!==t)B=!t&&e(Dy,{count:y,expandable:!0}),l[17]=y,l[18]=t,l[19]=B;else B=l[19];let W;if(l[20]!==v||l[21]!==k||l[22]!==m||l[23]!==B)W=r(v,{flexDirection:k,children:[m,B]}),l[20]=v,l[21]=k,l[22]=m,l[23]=B,l[24]=W;else W=l[24];let U;if(l[25]!==g||l[26]!==W)U=e(g,{children:W}),l[25]=g,l[26]=W,l[27]=U;else U=l[27];return U}
export{wmt,eh};
