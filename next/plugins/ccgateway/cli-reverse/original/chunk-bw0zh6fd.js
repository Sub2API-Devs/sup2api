
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{G,B_}from"./chunk-5ythzcas.js";import{b,f}from"./chunk-vwtpw18x.js";import{l}from"./chunk-nkv493nm.js";import{c}from"./chunk-47b8txen.js";import{cLn,Tce,Zgs,uLn}from"./chunk-f14qge9c.js";function fNo(a,s,d,i){let e=cLn(a),r=e!==null?uLn():null,n=r?.code==="hooks_held"?null:r;if(n!==null)c("goal_set",n.code,{origin:f("restored")});let t;if(e===null||n!==null){if(s((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)Tce(t,"resume_swap");return}if(d.add(G(),"Stop","",Zgs(e)),s((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:i?.iterations??0,setAt:i?.setAt??Date.now(),...i?.lastReason!==void 0&&{lastReason:i.lastReason},origin:"restored",tokensAtStart:B_()}})),t!==void 0)Tce(t,"resume_swap");l("tengu_goal_restored_on_resume",{promptLength:e.length}),l("tengu_stop_hook_added",{promptLength:e.length,via:b("goal"),origin:f("restored")})}
export{fNo};
