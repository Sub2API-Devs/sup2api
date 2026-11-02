
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import"./chunk-x4hefdgz.js";import"./chunk-333ft0yv.js";import"./chunk-9z4e25ww.js";import"./chunk-0wqny7vr.js";import{C}from"./chunk-2g090z7k.js";import{Tue}from"./chunk-pjt9hgpa.js";var o=new Set(["ClaudeAiProxyBearerRejectedError","McpAuthError","McpError","McpResponseSchemaError","McpToolCallError","ProtocolError","SdkError","SdkHttpError","StreamableHTTPError","TelemetrySafeError"]);function a(r){if(r instanceof DOMException)return r.name==="TimeoutError";if(!(r instanceof Error))return!1;if(r instanceof C)return!0;if(r instanceof Tue)return!0;if((("errorCode"in r)&&typeof r.errorCode==="string"||("code"in r)&&typeof r.code==="string")&&/^HTTP 40[13]\b/.test(r.message))return!0;let e=r.name!=="Error"?r.name:r.constructor?.name??"";return o.has(e)}export{a as isExpectedMcpCallError};
