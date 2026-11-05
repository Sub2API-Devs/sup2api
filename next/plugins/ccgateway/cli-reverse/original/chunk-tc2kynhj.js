
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{Wo}from"./chunk-1524p9jf.js";import{u,Pr,T}from"./chunk-m4y44r15.js";var gGr="Remote Control is off, so this session can\u2019t be sent",yGr="/send-to-project needs Remote Control so a Claude Project can read this session.",_Gr="Turn on Remote Control and send",o=p(()=>u({})),e=p(()=>Pr("choice",[u({choice:T("turn_on")}),u({choice:T("no")})])),yUo=Wo({kind:"continue_in_projects_remote_control",payload:o,result:e,default:{choice:"no"},hideWhile:["panel","draft"]});
export{gGr,yGr,_Gr,yUo};
