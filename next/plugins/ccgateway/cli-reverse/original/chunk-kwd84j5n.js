
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{FS,Z6}from"./chunk-5ythzcas.js";import{i}from"./chunk-xjnnz630.js";import{gt}from"./chunk-5fn9rb8r.js";import{ht}from"./chunk-2c3jp4kn.js";import{qp}from"./chunk-sm7j62wg.js";import{oF}from"./chunk-dd0n67vs.js";import{Hr}from"./chunk-ewnm1pnf.js";import{Q9,I5}from"./chunk-a413a8v6.js";function s4e(o){return l()&&!I5(oF)&&(o===void 0||r(o))}function l(){if(!qp())return!1;if(Q9()||FS())return!1;if(i.CLAUDE_CODE_ENTRYPOINT==="local-agent")return!1;let o=gt().skillOverrides?.[oF];if(o==="off"||o==="user-invocable-only")return!1;let e=Z6();if(e!==void 0&&!e.includes(oF))return!1;return!0}function r(o){return o.some((e)=>ht(e,Hr))}
export{s4e};
