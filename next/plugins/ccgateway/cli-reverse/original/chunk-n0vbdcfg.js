
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Lm,TZ}from"./chunk-5s0qaz1x.js";import{ff}from"./chunk-2c3jp4kn.js";import{mhr}from"./chunk-q1gbn2mn.js";import{basename as o,sep as n}from"path";function Yti(s){let e=ff(),{listedOwnerships:i}=e;i.clear(),e.listedSkillsAnswer="none_yet";for(let t of s){let l;try{l=Lm(o(TZ(t.name,n)))}catch{continue}if(!i.has(l))i.set(l,{listedName:t.name,ownership:mhr(t),savedFromAChat:typeof t.backing_plugin_id==="string"})}e.listedSkillsAnswer="a_list",e.lastRoundCouldNotAsk=!1}function sqr(s){return ff().listedOwnerships.get(Lm(s))}
export{Yti,sqr};
