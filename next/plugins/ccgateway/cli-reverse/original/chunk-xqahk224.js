
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{Wo}from"./chunk-1524p9jf.js";import{B,sf}from"./chunk-m4y44r15.js";var nne=Wo({kind:"mcp_elicitation",payload:p(()=>sf((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>sf((t)=>typeof t==="object"&&t!==null)),default:{action:"cancel"},holdsTop:!0}),Vwe=Wo({kind:"mcp_elicitation_waiting",payload:p(()=>sf((t)=>typeof t==="object"&&t!==null&&("serverName"in t)&&("params"in t))),result:p(()=>B(["dismiss","retry","cancel","cancelled"])),default:"cancelled"});function Eqo(t){return t===nne.kind||t===Vwe.kind}
export{nne,Vwe,Eqo};
