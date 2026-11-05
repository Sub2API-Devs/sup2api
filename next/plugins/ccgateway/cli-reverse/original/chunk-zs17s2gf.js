
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{TF}from"./chunk-vfza76n9.js";function xZ(n){if(n?.kind!=="task-notification")return n;let e=TF(n.runId);return{kind:"task-notification",...n.subkind!==void 0&&{subkind:n.subkind},...n.fireReason!==void 0&&{fireReason:n.fireReason},...n.producer!==void 0&&{producer:n.producer},...e!==void 0&&{runId:e},...n.taskKind==="mcp-task"&&{taskKind:n.taskKind}}}function OW(n,e,t){let i=xZ(n)??(e==="task-notification"?{kind:"task-notification"}:void 0),d=TF(t);return d!==void 0&&i?.kind==="task-notification"&&i.runId===void 0?{...i,runId:d}:i}function G9(n){return n?.kind==="task-notification"&&n.producer==="session-task"}function v5(n){return n?.kind==="task-notification"&&Object.keys(n).every((e)=>e==="kind"||e==="producer"||e==="runId"||e==="taskKind")}function ITe(n,e){return v5(n)&&(G9(n)||e===!0)}
export{xZ,OW,G9,v5,ITe};
