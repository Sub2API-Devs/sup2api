
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{yn,v}from"./chunk-exfmq47h.js";import{Oe}from"./chunk-ndkzc8d3.js";import{i}from"./chunk-xjnnz630.js";import{P}from"./chunk-bb1a67wr.js";import{dg}from"./chunk-a434vn9q.js";function Ja(e="send"){if(e==="send"&&dg().messagingBeyondOwnAgentsDisabled)return!1;let r=i.CLAUDE_CODE_HARBOR_KITE;if(r!==void 0)return Oe(r);if(P()==="windows"&&!v("tengu_harbor_kite_win",!0))return!1;return v("tengu_harbor_kite",!0)}function gce(e){if(e?.flagsSettled===!1&&yn("tengu_cuddly_willow",!0).source==="fallback")return!1;return v("tengu_cuddly_willow",!0)}var kDn="Cross-session messaging is not available in this session.";
export{Ja,gce,kDn};
