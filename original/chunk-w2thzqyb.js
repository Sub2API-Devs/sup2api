
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{vc}from"./chunk-s1p2wv8d.js";import{$v,ay}from"./chunk-c0cahhqh.js";function joe(e,t){return`${vc(e)??""}/${vc(t)??""}`}function o2s(e){return vc(e)??""}function a5n({serverName:e,toolName:t,mcpTaskId:o,toolUseId:s,pollIntervalMs:a,abortController:n,backgroundedToDeliverMessage:i,protocol:p,driveAbortController:c,ttlExpiresAt:l}){let r=$v("mcp_task");return{...ay(r,"mcp_task",joe(e,t),s),type:"mcp_task",status:"running",serverName:e,toolName:t,mcpTaskId:o??r,mcpStatus:"working",pollIntervalMs:a,abortController:n,backgroundedToDeliverMessage:i,protocol:p,driveAbortController:c,ttlExpiresAt:l}}
export{joe,o2s,a5n};
