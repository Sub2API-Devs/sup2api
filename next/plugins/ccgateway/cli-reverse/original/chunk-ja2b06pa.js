
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var Vbe="claude.ai ",Jq="claude_ai_";function En(t){let r=t.replace(/[^a-zA-Z0-9_-]/g,"_");if(t.startsWith("claude.ai "))r=r.replace(/_+/g,"_").replace(/^_|_$/g,"");return r}var e="claudeai_";function M1(t){return En(t).toLowerCase().replace(/[-_]+/g,"_").replace(/^_|_$/g,"")}var xYi="org-connector-",nDs=128;function aKe(t){if(t.length>nDs)return!1;let r=`${M1(t)}_`;return r.startsWith("org_connector_")||r.startsWith("orgconnector_")}function Lyt(t){let r=`${M1(t)}_`;return r.startsWith("claude_ai_")||r.startsWith(e)}
export{Vbe,Jq,En,M1,xYi,nDs,aKe,Lyt};
