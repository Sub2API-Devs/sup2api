
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{G,Aan}from"./chunk-5ythzcas.js";import{b,f}from"./chunk-vwtpw18x.js";import{i}from"./chunk-xjnnz630.js";import{hge,nc,wd,xo,bl}from"./chunk-rmd7n4gq.js";import{l}from"./chunk-nkv493nm.js";import{g}from"./chunk-47b8txen.js";import{_e}from"./chunk-eehtd1bk.js";import{jt,CAe}from"./chunk-exfmq47h.js";import{er}from"./chunk-5xgkngpb.js";import{r9n}from"./chunk-v6svdz69.js";function p(){return i.CLAUDE_JOB_DIR}async function n9n(n,e,s){l("tengu_bg_agent_action",{action:b("stop"),source:f(n),jobSessionId:_e(G())}),Aan(void 0);let o=p();if(jt()&&o){let r=new Date().toISOString(),t=await xo(o,e);if(t&&!bl(t))await nc(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(wd);else await r9n(o,e);if(CAe())process.stdout.write(hge(s??"Session stopped."))}return g("job_stop_self"),er(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{n9n};
