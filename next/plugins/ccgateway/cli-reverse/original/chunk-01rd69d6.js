
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{Wo}from"./chunk-1524p9jf.js";import{o,O,u,Pr,T}from"./chunk-m4y44r15.js";function x1t(e,t){return t?`Create the project \u201C${e}\u201D and send this message?`:`Send this message to ${e}?`}var P1t="Choose Send again to confirm.",s=p(()=>u({projectName:o(),creates:O(),message:o()})),n=p(()=>Pr("choice",[u({choice:T("send")}),u({choice:T("cancel")})])),Fra=Wo({kind:"continue_in_projects_message",payload:s,result:n,default:{choice:"cancel"},hideWhile:[]});
export{x1t,P1t,Fra};
