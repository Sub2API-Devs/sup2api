
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{p}from"./chunk-kpa9nk58.js";import{qo}from"./chunk-tc95s49z.js";import{o,M,u,Ir,T}from"./chunk-7vp249v4.js";function eHt(e,t){return t?`Create the project \u201C${e}\u201D and send this message?`:`Send this message to ${e}?`}var tHt="Choose Send again to confirm.",s=p(()=>u({projectName:o(),creates:M(),message:o()})),n=p(()=>Ir("choice",[u({choice:T("send")}),u({choice:T("cancel")})])),Bji=qo({kind:"continue_in_projects_message",payload:s,result:n,default:{choice:"cancel"},hideWhile:[]});
export{eHt,tHt,Bji};
