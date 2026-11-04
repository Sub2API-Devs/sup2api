
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{K,Qy}from"./chunk-ndmse9kj.js";import{b,c}from"./chunk-0wqny7vr.js";import{a}from"./chunk-8kte1b36.js";import{f}from"./chunk-8nhse09v.js";import{ckn,rae,P7o,ukn}from"./chunk-bnwcqde4.js";function VEo(l,s,d,i){let e=ckn(l),r=e!==null?ukn():null,n=r?.code==="hooks_held"?null:r;if(n!==null)f("goal_set",n.code,{origin:c("restored")});let t;if(e===null||n!==null){if(s((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)rae(t,"resume_swap");return}if(d.add(K(),"Stop","",P7o(e)),s((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:i?.iterations??0,setAt:i?.setAt??Date.now(),...i?.lastReason!==void 0&&{lastReason:i.lastReason},origin:"restored",tokensAtStart:Qy()}})),t!==void 0)rae(t,"resume_swap");a("tengu_goal_restored_on_resume",{promptLength:e.length}),a("tengu_stop_hook_added",{promptLength:e.length,via:b("goal"),origin:c("restored")})}
export{VEo};
