
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{w}from"./chunk-s89ma3n1.js";import{s,n}from"./chunk-x6v6jz2y.js";import{ze}from"./chunk-wq9366y3.js";import{e,r}from"./chunk-nn4p932b.js";import{en}from"./chunk-xkeryp4t.js";function ZAr(){return e(ze,{height:1,children:e(n,{dimColor:!0,children:"Fetching\u2026"})})}function zHt(g){let u=w(7),{bytes:a,status:p}=g,m;if(u[0]!==a)m=en(a),u[0]=a,u[1]=m;else m=u[1];let t;if(u[2]!==m)t=e(n,{bold:!0,children:m}),u[2]=m,u[3]=t;else t=u[3];const o=p!==void 0&&` (${p})`;let c;if(u[4]!==t||u[5]!==o)c=e(ze,{height:1,children:r(n,{children:["Received ",t,o]})}),u[4]=t,u[5]=o,u[6]=c;else c=u[6];return c}function aPs({bytes:g,code:a,codeText:p,result:u},m,{verbose:t}){let o=e(zHt,{bytes:g,status:`${a} ${p}`});if(t)return r(s,{flexDirection:"column",children:[o,e(s,{flexDirection:"column",children:e(n,{children:u})})]});return o}
export{ZAr,zHt,aPs};
