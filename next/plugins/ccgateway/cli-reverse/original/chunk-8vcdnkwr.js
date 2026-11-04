
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{K,O7t}from"./chunk-ndmse9kj.js";import{b,c}from"./chunk-0wqny7vr.js";import{i}from"./chunk-jhrww53q.js";import{Vfe,kd,Ql,yo,nl}from"./chunk-y162pn60.js";import{a}from"./chunk-8kte1b36.js";import{g}from"./chunk-8nhse09v.js";import{ye}from"./chunk-eweqvj83.js";import{Ft,DEe}from"./chunk-aepeg2w5.js";import{er}from"./chunk-e6aww6q8.js";import{OGn}from"./chunk-12p23jte.js";function p(){return i.CLAUDE_JOB_DIR}async function IGn(n,e,s){a("tengu_bg_agent_action",{action:b("stop"),source:c(n),jobSessionId:ye(K())}),O7t(void 0);let o=p();if(Ft()&&o){let r=new Date().toISOString(),t=await yo(o,e);if(t&&!nl(t))await kd(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Ql);else await OGn(o,e);if(DEe())process.stdout.write(Vfe(s??"Session stopped."))}return g("job_stop_self"),er(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{IGn};
