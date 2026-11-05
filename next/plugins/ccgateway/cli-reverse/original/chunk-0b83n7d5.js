
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{rYn}from"./chunk-xd1cb3xs.js";import{S}from"./chunk-zt8d60ng.js";import{Kv,VG}from"./chunk-emhzq435.js";import{ne,e}from"./chunk-6n4z8qxn.js";import{Qt,Zt,j}from"./chunk-zsz062c7.js";import{Vn}from"./chunk-0eqmdcgk.js";j();import{PassThrough as u}from"stream";function m(){}var $jt=Qt(!1);function o0(r){let i=S(5),{children:t}=r,{exit:n}=Kv(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];Zt(a,o);let c;if(i[3]!==t)c=e(ne,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function s0(r,t){r.render(e(o0,{children:t})),await r.waitUntilExit()}async function Ant(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await VG(e(o0,{children:e($jt.Provider,{value:!0,children:e(rYn,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function l4n(r,t){let n=await Ant(r,t);return Vn(n)}
export{$jt,o0,s0,Ant,l4n};
