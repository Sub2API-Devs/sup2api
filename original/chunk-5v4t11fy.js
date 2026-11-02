
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ee}from"./chunk-enbhzjw4.js";import{Xu,zU}from"./chunk-7dqf31r1.js";import{G3o,YSe,XF,STt}from"./chunk-5nrcp6t7.js";function I1t(){let n=Xu();return n?{entrypoint:n.toLowerCase().slice(0,64)}:{}}function qFr(){let n=G3o();return n&&!zU()?{session_id:n}:{}}var lNo=3600000;function V5n(){let n=ee().sessionHintsRefusedAt;if(n!==void 0&&Date.now()-n<lNo)return{};return{...I1t(),...qFr()}}function q5n(){ee().sessionHintsRefusedAt=Date.now()}var YFr=["entrypoint","session_id","request_id"],u=new Set(YFr);function Y5n(n,s,i){let o=YFr.filter((t)=>i[t]!==void 0);if(n!==400||o.length===0)return[];let e=XF(s);if(!YSe.test(e))return[];let r=o.filter((t)=>STt(e,t));if(r.length>0)return r;return Object.keys(i).some((t)=>!u.has(t)&&STt(e,t))?[]:o}function yun(n){return n.includes("entrypoint")||n.includes("session_id")}function iKs(n){let{entrypoint:s,session_id:i,request_id:o,...e}=n;return e}
export{I1t,qFr,lNo,V5n,q5n,YFr,Y5n,yun,iKs};
