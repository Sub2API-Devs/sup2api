
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ro}from"./chunk-bfve2jm9.js";import{i}from"./chunk-xjnnz630.js";var n=3;var _="tengu_hazel_trellis";function GA(){let e=i.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH;if(e!==void 0)return e;let t=ro();if(t.maxSubagentSpawnDepthFromGrowthBook===void 0){let{getFeatureValue_CACHED_MAY_BE_STALE:a}=require("./chunk-nxm9th57.js"),{getCachedClientData:A}=require("./chunk-ksn8xqse.js"),o=A()?.[_],r=u(o)?o:a(_,n);t.maxSubagentSpawnDepthFromGrowthBook=u(r)?r:n}return t.maxSubagentSpawnDepthFromGrowthBook}function u(e){return typeof e==="number"&&Number.isInteger(e)&&e>=1}
export{GA};
