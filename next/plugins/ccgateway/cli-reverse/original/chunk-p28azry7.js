
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ap,V0t}from"./chunk-exfmq47h.js";import{Z}from"./chunk-8824h7w7.js";import{Ah}from"./chunk-2jb250pa.js";import{yc}from"./chunk-0z575c9w.js";import{md}from"./chunk-cdyva2jv.js";import{Uxr}from"./chunk-hfc4cfnt.js";import{jp}from"./chunk-01kgd7xg.js";var g="claudecode/agentId",p="claudecode/agentType",d="claudecode/isObserver",c=128,f=64;function z_n(r){let{name:e,config:n}=r;if(e!==yc)return!1;return md(n)||n.scope==="dynamic"&&"url"in n&&typeof n.url==="string"&&Uxr(n.url)}function ber(r,e){let n=V0t(e.agentId,e.agentContext);if(n===void 0||!z_n(r))return{};let t=Z(Ah(e.agentType??""),c);return{[g]:n,...t!==""&&{[p]:t},...u(n,e)&&{[d]:!0}}}function u(r,{agentContext:e,taskRegistry:n}){let t=[r],s=new Set;for(let i=t.pop();i!==void 0;i=t.pop()){if(s.has(i))continue;if(s.size>=f)return!0;s.add(i);let o=n.get(i);if(o!==void 0&&jp(o))return!0;if(o!==void 0&&"parentAgentId"in o&&typeof o.parentAgentId==="string")t.push(o.parentAgentId);if(!ap(e)){let a=i===e.agentId?e.parentAgentId:i===r?e.agentId:void 0;if(a!==void 0)t.push(a)}}return!1}
export{z_n,ber};
