
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Z}from"./chunk-8824h7w7.js";import{hae}from"./chunk-hf5txq1x.js";import{ZS,Rg}from"./chunk-j8qkeqz1.js";var i=200,tJi="started by Claude";function A1o(r,{description:s,toolUseId:o,abortController:t}){let e=hae(s,i)||tJi,n=Z(e,i),a=ZS("local_script"),l={...Rg(a,"local_script",n.length<e.length?`${n}\u2026`:e,o),type:"local_script",status:"running",outputFile:"",abortController:t};return r.register(l),a}function C1o(r,s,o){if(s.get(r)?.status!=="running")return!1;return s.update(r,(t)=>t.status!=="running"?t:{...t,status:o,endTime:Date.now(),notified:!0,abortController:void 0}),!0}var Tia={name:"ScriptTask",type:"local_script",async kill(r,s,o,t){let e=s.get(r);if(e?.type!=="local_script"||e.status!=="running")return;e.abortController?.abort(t)}};
export{tJi,A1o,C1o,Tia};
