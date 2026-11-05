
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{S}from"./chunk-zt8d60ng.js";import{s,n}from"./chunk-emhzq435.js";import{Ve}from"./chunk-h40h7b8f.js";import{e,r}from"./chunk-6n4z8qxn.js";import{en}from"./chunk-j78f68ax.js";function nFr(){return e(Ve,{height:1,children:e(n,{dimColor:!0,children:"Fetching\u2026"})})}function vjt(g){let u=S(7),{bytes:a,status:p}=g,m;if(u[0]!==a)m=en(a),u[0]=a,u[1]=m;else m=u[1];let t;if(u[2]!==m)t=e(n,{bold:!0,children:m}),u[2]=m,u[3]=t;else t=u[3];const o=p!==void 0&&` (${p})`;let c;if(u[4]!==t||u[5]!==o)c=e(Ve,{height:1,children:r(n,{children:["Received ",t,o]})}),u[4]=t,u[5]=o,u[6]=c;else c=u[6];return c}function dKs({bytes:g,code:a,codeText:p,result:u},m,{verbose:t}){let o=e(vjt,{bytes:g,status:`${a} ${p}`});if(t)return r(s,{flexDirection:"column",children:[o,e(s,{flexDirection:"column",children:e(n,{children:u})})]});return o}
export{nFr,vjt,dKs};
