
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{_F}from"./chunk-2c3jp4kn.js";import{m9r,Dhe,Z_}from"./chunk-5xgkngpb.js";import{qd}from"./chunk-2men1beb.js";import{ONo}from"./chunk-v7crmwhb.js";import{Ni}from"./chunk-8nzbdydx.js";import{Zr}from"./chunk-gg17c06d.js";function LSt(o,e=!1){return l(o,[...Ni()?Dhe():[],...m9r()?[Z_]:[],...qd()?(_F()??[]).filter(ONo):[],...e?s():[]])}function s(){return[]}function p2s(o,e){return l(o,[...Ni()?Dhe():[],...m9r()&&!i.CLAUDE_CODE_SIMPLE?[Z_]:[]].filter((t)=>t.isEnabled()&&!Zr(e,t)))}function l(o,e){if(e.length===0)return o;let t=new Set(o.map((n)=>n.name)),r=e.filter((n)=>!t.has(n.name));return r.length>0?[...o,...r]:o}
export{LSt,p2s};
