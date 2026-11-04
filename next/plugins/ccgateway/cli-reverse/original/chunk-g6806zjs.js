
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Gp,DJ}from"./chunk-f3qhjfah.js";import{sf}from"./chunk-g54kbxqw.js";import{yrr}from"./chunk-f9asxqh1.js";import{basename as o,sep as n}from"path";function DWs(s){let e=sf(),{listedOwnerships:i}=e;i.clear(),e.listedSkillsAnswer="none_yet";for(let t of s){let l;try{l=Gp(o(DJ(t.name,n)))}catch{continue}if(!i.has(l))i.set(l,{listedName:t.name,ownership:yrr(t),savedFromAChat:typeof t.backing_plugin_id==="string"})}e.listedSkillsAnswer="a_list",e.lastRoundCouldNotAsk=!1}function I0r(s){return sf().listedOwnerships.get(Gp(s))}
export{DWs,I0r};
