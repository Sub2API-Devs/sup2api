
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{na}from"./chunk-x4hefdgz.js";import{AM}from"./chunk-9z4e25ww.js";function NQe(r){return r instanceof Error&&"code"in r&&r.code==="CLAUDEAI_BEARER_REJECTED"}function $sn(r){if(r instanceof AM)return!0;if(NQe(r))return!1;if(r instanceof Error&&!(r instanceof na)&&"code"in r){if(r.code===403)return!r.message.includes("Server returned 403 after trying upscoping");if(r.code===401)return!r.message.includes("Server returned 401 after successful authentication")}return!1}
export{NQe,$sn};
