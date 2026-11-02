
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Sn}from"./chunk-knckn35w.js";var _="Claude Preview",c="Claude Browser",E=Sn(_),l=Sn(c),u=new Set([E,l]);function OHe(e){return u.has(Sn(e))}var U_t=["file_upload"],AYn="anthropic/hostAsksPerUploadedFile",d=new Set(["description","activeForm"]);function CYn(e,o,n,i){let t=`mcp__${Sn(e)}__${o}`;return{async checkPermissions(){return{behavior:"ask",message:`${e} requires permission.`,suggestions:[{type:"addRules",rules:[{toolName:t,ruleContent:void 0}],behavior:"allow",destination:"session"}],metadata:{command:{name:t,chrome:{hostHandlesOriginConsent:!0}}}}},...n!==void 0&&Object.hasOwn(n,"code")&&{toAutoClassifierInput(r){let a=Object.keys(r).filter((s)=>!d.has(s));return i(Object.fromEntries(a.map((s)=>[s,r[s]])),o)}}}}
export{OHe,U_t,AYn,CYn};
