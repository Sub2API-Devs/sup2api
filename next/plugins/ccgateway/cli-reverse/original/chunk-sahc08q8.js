
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{qo}from"./chunk-tc95s49z.js";import{U,hu}from"./chunk-7vp249v4.js";var uZ=qo({kind:"mcp_elicitation",payload:p(()=>hu((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>hu((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),p_e=qo({kind:"mcp_elicitation_waiting",payload:p(()=>hu((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>U(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function oLo(t){return t===uZ.kind||t===p_e.kind}
export{uZ,p_e,oLo};
