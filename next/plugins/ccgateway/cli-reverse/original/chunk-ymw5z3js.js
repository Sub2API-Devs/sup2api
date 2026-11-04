
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Dn}from"./chunk-rvwp1taf.js";var gy="SubagentHandback";var mt="Agent",Xdr="Launch a new agent to handle complex, multi-step tasks",nhi="The task for the agent to perform",rhi="A short (3-5 word) description of the task",ohi=["sonnet","opus","haiku","fable"],FZo="Name for the spawned agent.",shi=`${FZo} Makes it addressable via ${Dn}({to: name}) while running.`,aR="fork",ihi=`agent:builtin:${aR}`,UZo=200,ahi=5,cf="Task",GCt=1e5,x5t=new Set(["Explore","Plan"]),zFe="NOTE: this agent stopped at its ",nQr=`; ${Dn} to task-id to continue`,Jdr=` Send the agent a message (${Dn}) to let it continue from where it stopped.`,Qdr=`The subagent ended without delivering a report through ${gy}, so no report was delivered.`,Zdr=` Send the agent a message (${Dn}) to ask it to deliver its report.`,BZo=` Once its requests are accepted again, send the agent a message (${Dn}) to let it continue from where it stopped instead of starting a new agent.`,ecr="subagent_type is required: the general-purpose agent is not available in this session";
export{gy,mt,Xdr,nhi,rhi,ohi,FZo,shi,aR,ihi,UZo,ahi,cf,GCt,x5t,zFe,nQr,Jdr,Qdr,Zdr,BZo,ecr};
