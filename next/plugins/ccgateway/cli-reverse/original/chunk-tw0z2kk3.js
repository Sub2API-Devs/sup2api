
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{jf,Sgr}from"./chunk-aepeg2w5.js";import{ne}from"./chunk-m41h77x8.js";import{Nm}from"./chunk-cgr0tezp.js";import{Rc}from"./chunk-ptag3qm7.js";import{Zl}from"./chunk-wztb57wq.js";import{myr}from"./chunk-1wpnxx5r.js";import{cp}from"./chunk-6vnxsn99.js";var g="claudecode/agentId",p="claudecode/agentType",d="claudecode/isObserver",c=128,f=64;function bdn(r){let{name:e,config:n}=r;if(e!==Rc)return!1;return Zl(n)||n.scope==="dynamic"&&"url"in n&&typeof n.url==="string"&&myr(n.url)}function x4n(r,e){let n=Sgr(e.agentId,e.agentContext);if(n===void 0||!bdn(r))return{};let t=ne(Nm(e.agentType??""),c);return{[g]:n,...t!==""&&{[p]:t},...u(n,e)&&{[d]:!0}}}function u(r,{agentContext:e,taskRegistry:n}){let t=[r],s=new Set;for(let i=t.pop();i!==void 0;i=t.pop()){if(s.has(i))continue;if(s.size>=f)return!0;s.add(i);let o=n.get(i);if(o!==void 0&&cp(o))return!0;if(o!==void 0&&"parentAgentId"in o&&typeof o.parentAgentId==="string")t.push(o.parentAgentId);if(!jf(e)){let a=i===e.agentId?e.parentAgentId:i===r?e.agentId:void 0;if(a!==void 0)t.push(a)}}return!1}
export{bdn,x4n};
