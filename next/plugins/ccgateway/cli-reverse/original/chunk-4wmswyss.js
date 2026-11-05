
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{nS}from"./chunk-5ythzcas.js";import{te,qM}from"./chunk-bjf8bvwf.js";import{ca}from"./chunk-89fdmwf8.js";var n="Error POSTing to endpoint: MCP server not allowed";function nLi(t){if(!(t instanceof Error))return!1;let e=t.message.trimEnd();if(e===`Streamable HTTP error: ${n}`)return"code"in t&&t.code===403;if(e!==n)return!1;return"status"in t?t.status===403:("telemetryMessage"in t)&&typeof t.telemetryMessage==="string"&&t.telemetryMessage.startsWith("SdkHttpError ")}function gLe(){return(nS()??[]).find((t)=>t.name===ca)}function Nhs(){return qM()?te().mcpEntryRowNotServed:null}function hTe(t){return Nhs()===t}
export{nLi,gLe,Nhs,hTe};
