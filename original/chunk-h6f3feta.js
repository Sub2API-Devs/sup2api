
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{qUn}from"./chunk-24t3dkzb.js";import{w}from"./chunk-s89ma3n1.js";import{SA,qj}from"./chunk-x6v6jz2y.js";import{Z,e}from"./chunk-nn4p932b.js";import{qt,zt,j}from"./chunk-p86mcgbc.js";import{Yn}from"./chunk-58wc6nbw.js";j();import{PassThrough as u}from"stream";function m(){}var a0t=qt(!1);function ML(r){let i=w(5),{children:t}=r,{exit:n}=SA(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];zt(a,o);let c;if(i[3]!==t)c=e(Z,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function DL(r,t){r.render(e(ML,{children:t})),await r.waitUntilExit()}async function SJe(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await qj(e(ML,{children:e(a0t.Provider,{value:!0,children:e(qUn,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function QFn(r,t){let n=await SJe(r,t);return Yn(n)}
export{a0t,ML,DL,SJe,QFn};
