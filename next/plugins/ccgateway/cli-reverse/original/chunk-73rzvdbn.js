
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ga}from"./chunk-c8yxp647.js";import{pL}from"./chunk-6dff51n3.js";function Jrt(r){return r instanceof Error&&"code"in r&&r.code==="CLAUDEAI_BEARER_REJECTED"}function Xmn(r){if(r instanceof pL)return!0;if(Jrt(r))return!1;if(r instanceof Error&&!(r instanceof ga)&&"code"in r){if(r.code===403)return!r.message.includes("Server returned 403 after trying upscoping");if(r.code===401)return!r.message.includes("Server returned 401 after successful authentication")}return!1}
export{Jrt,Xmn};
