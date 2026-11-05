
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{p}from"./chunk-k6qypy1d.js";import{Wo}from"./chunk-1524p9jf.js";import{Ly}from"./chunk-60gvymh4.js";var t="Claude wants to send this session\u2019s work to a Claude Project",r=Wo({kind:"permission_continue_in_projects",payload:p(()=>Ly((e)=>typeof e==="object"&&e!==null&&("requestId"in e)&&("toolName"in e)&&("permissionResult"in e))),result:p(()=>Ly((e)=>typeof e==="object"&&e!==null&&("behavior"in e))),default:{behavior:"cancelled"}});export{t as CONTINUE_NOTIFICATION,r as projectContinuePermissionDialog};
