
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{Wo}from"./chunk-1524p9jf.js";import{o,O,u,Pr,T}from"./chunk-m4y44r15.js";var mGr="What should the message say?";function hGr(e){return e.creates?`Sent as you to a new Claude Project, \u201C${e.projectName}\u201D, after you confirm it.`:`Sent as you to ${e.projectName}, after you confirm it.`}var t=p(()=>u({projectName:o(),creates:O()})),c=p(()=>Pr("choice",[u({choice:T("send"),message:o()}),u({choice:T("cancel")})])),gUo=Wo({kind:"continue_in_projects_compose",payload:t,result:c,default:{choice:"cancel"},hideWhile:[]});
export{mGr,hGr,gUo};
