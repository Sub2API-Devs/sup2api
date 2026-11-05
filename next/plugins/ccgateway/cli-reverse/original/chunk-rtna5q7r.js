
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import"./chunk-c8yxp647.js";import"./chunk-z18kt4r5.js";import"./chunk-6dff51n3.js";import"./chunk-vwtpw18x.js";import{C}from"./chunk-63094ahz.js";import{qme}from"./chunk-6gs34xvs.js";var o=new Set(["ClaudeAiProxyBearerRejectedError","McpAuthError","McpError","McpResponseSchemaError","McpToolCallError","ProtocolError","SdkError","SdkHttpError","StreamableHTTPError","TelemetrySafeError"]);function a(r){if(r instanceof DOMException)return r.name==="TimeoutError";if(!(r instanceof Error))return!1;if(r instanceof C)return!0;if(r instanceof qme)return!0;if((("errorCode"in r)&&typeof r.errorCode==="string"||("code"in r)&&typeof r.code==="string")&&/^HTTP 40[13]\b/.test(r.message))return!0;let e=r.name!=="Error"?r.name:r.constructor?.name??"";return o.has(e)}export{a as isExpectedMcpCallError};
