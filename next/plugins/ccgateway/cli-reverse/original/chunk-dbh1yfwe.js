
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{pu}from"./chunk-aepeg2w5.js";import{ge}from"./chunk-886baxky.js";var TAo=Object.freeze({isKept:!0,isDenied:!1,context:Object.freeze([])});function m(){let o=pu();return{setPromptMentionRunner:o.set,runPromptMention:(r)=>{let e=o.get();return e?e(r):r.read(r.raised,"unhooked").then(()=>TAo)}}}var t=ge(m(),(o)=>o.setPromptMentionRunner(null));var i0i=t.runPromptMention;var a0i=t.setPromptMentionRunner;export{TAo,i0i,a0i};
