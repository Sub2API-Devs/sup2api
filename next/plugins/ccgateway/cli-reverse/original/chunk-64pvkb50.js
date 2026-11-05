
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var _1o={killed:"Stopped because the workflow was stopped",failed:"Stopped because the workflow failed",completed:"Stopped because the workflow finished without waiting for it"},d=new Set(Object.values(_1o));function k9n(e){return e!==void 0&&d.has(e)}var b1o="error details withheld for this workflow",S1o="This workflow run hides its script, and its record of that could not be read or written, so nothing was run.";function Nzr(e){return e.type!=="workflow_log"}function w1o(e){let{promptPreview:o,phaseTitle:r,...t}=e,n=r!==void 0&&t.phaseIndex!==void 0;return{...t,...n&&{phaseTitle:`phase ${t.phaseIndex}`},...t.error!==void 0&&{error:"error details withheld for this workflow"}}}function s(e){return e.map((o)=>o.type==="workflow_phase"?{...o,title:`phase ${o.index}`}:w1o(o))}function Gzt(e,o){let r=e.filter(Nzr);return o?s(r):r}function Ehn({startedAt:e,queuedAt:o,tokens:r}){return e!==void 0||o===void 0||(r??0)>0}
export{_1o,k9n,b1o,S1o,Nzr,w1o,Gzt,Ehn};
