
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p_}from"./chunk-8n1fbght.js";import{p}from"./chunk-k6qypy1d.js";import{Wo}from"./chunk-1524p9jf.js";import{o,E,O,A,u,Pr,B,T}from"./chunk-m4y44r15.js";var gzt=200;function yzt(e,t){return e===null?"no messages yet":`active ${p_(new Date(e),{now:t})}`}var n=p(()=>u({sends:B(["message","brief"]),newProjectName:o(),projects:A(u({id:o(),name:o(),lastMessageAtMs:E().nullable()})).max(gzt),truncated:O(),listError:o().optional()})),r=p(()=>Pr("choice",[u({choice:T("new")}),u({choice:T("existing"),projectId:o()}),u({choice:T("cancel")})])),LUo=Wo({kind:"continue_in_projects_target",payload:n,result:r,default:{choice:"cancel"},hideWhile:[]});
export{gzt,yzt,LUo};
