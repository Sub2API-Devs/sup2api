
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{km}from"./chunk-ndmse9kj.js";import{ee,dK}from"./chunk-enbhzjw4.js";import{wl}from"./chunk-khngy9cs.js";var n="Error POSTing to endpoint: MCP server not allowed";function Kii(t){if(!(t instanceof Error))return!1;let e=t.message.trimEnd();if(e===`Streamable HTTP error: ${n}`)return"code"in t&&t.code===403;if(e!==n)return!1;return"status"in t?t.status===403:("telemetryMessage"in t)&&typeof t.telemetryMessage==="string"&&t.telemetryMessage.startsWith("SdkHttpError ")}function USn(){return(km()??[]).find((t)=>t.name===wl)}function G6o(){return dK()?ee().mcpEntryRowNotServed:null}function n4e(t){return G6o()===t}
export{Kii,USn,G6o,n4e};
