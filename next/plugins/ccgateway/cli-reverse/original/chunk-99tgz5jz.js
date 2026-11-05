
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Fi,Yi,MC,Ac,uL}from"./chunk-qq5knpkd.js";function dYe(r){return r instanceof Error&&"code"in r&&r.code==="CLAUDEAI_BEARER_REJECTED"}function U_n(r){if(r instanceof uL)return!0;if(dYe(r))return!1;if(r instanceof MC&&(r.status===403||r.status===401))return r.code!==Fi.ClientHttpAuthentication&&r.code!==Fi.ClientHttpForbidden;if(r instanceof Error&&!(r instanceof Ac)&&!(r instanceof Yi)&&"code"in r&&(r.code===403||r.code===401))return!0;return!1}
export{dYe,U_n};
