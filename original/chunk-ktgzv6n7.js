
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ty}from"./chunk-tw8fk0yz.js";import{p}from"./chunk-kpa9nk58.js";import{qo}from"./chunk-tc95s49z.js";import{o,E,M,A,u,Ir,U,T}from"./chunk-7vp249v4.js";var N$t=200;function $$t(e,t){return e===null?"no messages yet":`active ${Ty(new Date(e),{now:t})}`}var n=p(()=>u({sends:U(["message","brief"]),newProjectName:o(),projects:A(u({id:o(),name:o(),lastMessageAtMs:E().nullable()})).max(N$t),truncated:M(),listError:o().optional()})),r=p(()=>Ir("choice",[u({choice:T("new")}),u({choice:T("existing"),projectId:o()}),u({choice:T("cancel")})])),UTo=qo({kind:"continue_in_projects_target",payload:n,result:r,default:{choice:"cancel"},hideWhile:[]});
export{N$t,$$t,UTo};
