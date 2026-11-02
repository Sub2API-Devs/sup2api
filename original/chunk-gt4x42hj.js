
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{_e}from"./chunk-ndmse9kj.js";import{ot,Qe,v,Id}from"./chunk-aepeg2w5.js";import{i}from"./chunk-jhrww53q.js";function n(t){let e=t?.pewter_owl_model;if(typeof e==="string"&&e!=="")return e;return v("tengu_pewter_owl_model","")}function o(t){if(i.CLAUDE_CODE_PEWTER_OWL!==void 0)return i.CLAUDE_CODE_PEWTER_OWL;if(_e())return!1;let e=Id(),r=n(e);if(r!==""&&!Qe(ot()).includes(r))return!1;return v(`tengu_${t}`,!1)||e?.[t]===!0}function Mqe(){if(i.CLAUDE_CODE_PEWTER_OWL_TOOL!==void 0)return i.CLAUDE_CODE_PEWTER_OWL_TOOL;return o("pewter_owl_tool")}function d5o(){return o("pewter_owl_brief")}
export{Mqe,d5o};
