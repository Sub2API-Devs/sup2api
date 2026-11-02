
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{wn,v}from"./chunk-aepeg2w5.js";import{Oe}from"./chunk-0777tkjc.js";import{i}from"./chunk-jhrww53q.js";import{I}from"./chunk-znrryf4y.js";import{Eg}from"./chunk-5xbkq5z7.js";function Pa(e="send"){if(e==="send"&&Eg().messagingBeyondOwnAgentsDisabled)return!1;let r=i.CLAUDE_CODE_HARBOR_KITE;if(r!==void 0)return Oe(r);if(I()==="windows"&&!v("tengu_harbor_kite_win",!0))return!1;return v("tengu_harbor_kite",!0)}function yae(e){if(e?.flagsSettled===!1&&wn("tengu_cuddly_willow",!0).source==="fallback")return!1;return v("tengu_cuddly_willow",!0)}var oTn="Cross-session messaging is not available in this session.";
export{Pa,yae,oTn};
