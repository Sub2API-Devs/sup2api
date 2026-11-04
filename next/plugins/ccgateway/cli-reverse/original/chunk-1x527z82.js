
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Wb,VY}from"./chunk-ndmse9kj.js";import{i}from"./chunk-jhrww53q.js";import{ft}from"./chunk-q8cqcff6.js";import{Pt}from"./chunk-g54kbxqw.js";import{Sg}from"./chunk-hgfr0vx8.js";import{TN}from"./chunk-0y0w50mr.js";import{qr}from"./chunk-pvce3whe.js";import{I3,D4}from"./chunk-9acpp0pb.js";function RGe(o){return l()&&!D4(TN)&&(o===void 0||r(o))}function l(){if(!Sg())return!1;if(I3()||Wb())return!1;if(i.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=ft().skillOverrides?.[TN];if(o==="off"||o==="user-invocable-only")return!1;let e=VY();if(e!==void 0&&!e.includes(TN))return!1;return!0}function r(o){return o.some((e)=>Pt(e,qr))}
export{RGe};
