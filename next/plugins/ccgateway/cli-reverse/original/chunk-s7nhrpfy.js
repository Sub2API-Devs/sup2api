
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ti,Hi,AA,Yd,kM}from"./chunk-r1g76qsy.js";function Pze(r){return r instanceof Error&&"code"in r&&r.code==="CLAUDEAI_BEARER_REJECTED"}function mdn(r){if(r instanceof kM)return!0;if(Pze(r))return!1;if(r instanceof AA&&(r.status===403||r.status===401))return r.code!==Ti.ClientHttpAuthentication&&r.code!==Ti.ClientHttpForbidden;if(r instanceof Error&&!(r instanceof Yd)&&!(r instanceof Hi)&&"code"in r&&(r.code===403||r.code===401))return!0;return!1}
export{Pze,mdn};
