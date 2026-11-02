
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Bco}from"./chunk-ndmse9kj.js";var mH={red:"red_FOR_SUBAGENTS_ONLY",blue:"blue_FOR_SUBAGENTS_ONLY",green:"green_FOR_SUBAGENTS_ONLY",yellow:"yellow_FOR_SUBAGENTS_ONLY",purple:"purple_FOR_SUBAGENTS_ONLY",orange:"orange_FOR_SUBAGENTS_ONLY",pink:"pink_FOR_SUBAGENTS_ONLY",cyan:"cyan_FOR_SUBAGENTS_ONLY"},rS=Object.keys(mH);function Vq(e){return e!==void 0&&rS.includes(e)}function C$e(e){return e.userOverride??e.agentDefinitionColor}function R$e(e){if(e==="general-purpose")return;let n=Bco().get(e);if(n&&rS.includes(n))return mH[n];return}function Gkt(e,o){let n=Bco();if(!o){n.delete(e);return}if(rS.includes(o))n.set(e,o)}
export{mH,rS,Vq,C$e,R$e,Gkt};
