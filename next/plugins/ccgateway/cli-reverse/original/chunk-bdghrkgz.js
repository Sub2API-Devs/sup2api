
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{An}from"./chunk-5qhxezvs.js";var _h="SubagentHandback";var ut="Agent",Mvr="Launch a new agent to handle complex, multi-step tasks",lFi="The task for the agent to perform",dFi="A short (3-5 word) description of the task",cFi=["sonnet","opus","haiku","fable"],ubs="Name for the spawned agent.",uFi=`${ubs} Makes it addressable via ${An}({to: name}) while running.`,VT="fork",fFi=`agent:builtin:${VT}`,fbs=200,pFi=5,mc="Task",GLt=1e5,LZt=new Set(["Explore","Plan"]),fGe="NOTE: this agent stopped at its ",Ufo="harness",Bfo="subagent",Dvr="system-reminder",jfo=`; ${An} to task-id to continue`,Lvr=` Send the agent a message (${An}) to let it continue from where it stopped.`,Hvr=`The subagent ended without delivering a report through ${_h}, so no report was delivered.`,Nvr=` Send the agent a message (${An}) to ask it to deliver its report.`,pbs=` Once its requests are accepted again, send the agent a message (${An}) to let it continue from where it stopped instead of starting a new agent.`,$vr="subagent_type is required: the general-purpose agent is not available in this session";
export{_h,ut,Mvr,lFi,dFi,cFi,ubs,uFi,VT,fFi,fbs,pFi,mc,GLt,LZt,fGe,Ufo,Bfo,Dvr,jfo,Lvr,Hvr,Nvr,pbs,$vr};
