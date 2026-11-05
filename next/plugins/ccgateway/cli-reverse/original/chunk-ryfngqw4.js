
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Zu}from"./chunk-exfmq47h.js";import{ge}from"./chunk-77hsvag5.js";var wBo=Object.freeze({isKept:!0,isDenied:!1,context:Object.freeze([])});function m(){let o=Zu();return{setPromptMentionRunner:o.set,runPromptMention:(r)=>{let e=o.get();return e?e(r):r.read(r.raised,"unhooked").then(()=>wBo)}}}var t=ge(m(),(o)=>o.setPromptMentionRunner(null));var GXi=t.runPromptMention;var zXi=t.setPromptMentionRunner;export{wBo,GXi,zXi};
