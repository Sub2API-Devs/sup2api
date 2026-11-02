
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
var yhe="claude.ai ",YK="claude_ai_";function Sn(t){let r=t.replace(/[^a-zA-Z0-9_-]/g,"_");if(t.startsWith("claude.ai "))r=r.replace(/_+/g,"_").replace(/^_|_$/g,"");return r}var e="claudeai_";function _Y(t){return Sn(t).toLowerCase().replace(/[-_]+/g,"_").replace(/^_|_$/g,"")}var oIi="org-connector-",$gs=128;function fMt(t){if(t.length>$gs)return!1;let r=`${_Y(t)}_`;return r.startsWith("org_connector_")||r.startsWith("orgconnector_")}function tMn(t){let r=`${_Y(t)}_`;return r.startsWith("claude_ai_")||r.startsWith(e)}
export{yhe,YK,Sn,_Y,oIi,$gs,fMt,tMn};
