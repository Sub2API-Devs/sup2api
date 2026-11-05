
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Np,uE}from"./chunk-9ys74nhz.js";import{Ti}from"./chunk-evj8g37g.js";import{ABe}from"./chunk-5xgkngpb.js";var i="tengu_hazel_sluice";function M0o(){return(Np()||uE())&&ABe(i)==="on"}function D0o(e,o,s){if(o.mcpInfo===void 0||s.length===0||!M0o())return;let t=Ti(o);if(!s.some((n)=>n.type==="addRules"&&n.behavior==="allow"&&n.destination==="session"&&n.rules.some((r)=>r.toolName===t&&r.ruleContent===void 0)))return;e.setSessionToolPermissionContext((n)=>n.alwaysAllowRules.session?.includes(t)!==!0||n.connectorCardAllows?.has(t)===!0?n:{...n,connectorCardAllows:new Set([...n.connectorCardAllows??[],t])})}function Q5s(e){let o=hpn(e.toolPermissionContext);return o===e.toolPermissionContext?e:{...e,toolPermissionContext:o}}function hpn(e,o){let s=e.connectorCardAllows;if(s===void 0||o!==void 0&&!s.has(o))return e;let t=new Set(o===void 0?[]:s);if(o!==void 0)t.delete(o);return{...e,connectorCardAllows:t.size===0?void 0:t}}
export{M0o,D0o,Q5s,hpn};
