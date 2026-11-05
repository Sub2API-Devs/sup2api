
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Vc}from"./chunk-3zeyk1f5.js";import{ZS,Rg}from"./chunk-j8qkeqz1.js";function jae(e,t){return`${Vc(e)??""}/${Vc(t)??""}`}function Joi(e){return Vc(e)??""}function Ntr({serverName:e,toolName:t,mcpTaskId:o,toolUseId:s,pollIntervalMs:a,abortController:n,backgroundedToDeliverMessage:i,protocol:p,driveAbortController:c,ttlExpiresAt:l}){let r=ZS("mcp_task");return{...Rg(r,"mcp_task",jae(e,t),s),type:"mcp_task",status:"running",serverName:e,toolName:t,mcpTaskId:o??r,mcpStatus:"working",pollIntervalMs:a,abortController:n,backgroundedToDeliverMessage:i,protocol:p,driveAbortController:c,ttlExpiresAt:l}}
export{jae,Joi,Ntr};
