
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{WTo}from"./chunk-5ythzcas.js";var N0={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},tw=Object.keys(N0);function qY(e){return e!==void 0&&tw.includes(e)}function Dje(e){return e.userOverride??e.agentDefinitionColor}function Lje(e){if(e==="general-purpose")return;let n=WTo().get(e);if(n&&tw.includes(n))return N0[n];return}function tOt(e,o){let n=WTo();if(!o){n.delete(e);return}if(tw.includes(o))n.set(e,o)}
export{N0,tw,qY,Dje,Lje,tOt};
