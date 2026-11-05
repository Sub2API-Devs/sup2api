
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Pa,ga}from"./chunk-c8yxp647.js";var o=new Set([-32002,Pa.InvalidParams]);function e(n){return n instanceof ga?n.code:void 0}function t(n){return n instanceof ga&&n.code===Pa.MethodNotFound}function i(n){return n instanceof ga&&(n.code===Pa.MethodNotFound||n.code===Pa.InvalidParams)}function c(n){return n instanceof ga&&o.has(n.code)}function u(n){return n instanceof ga&&n.code===Pa.InvalidParams}function d(n){return n instanceof ga&&n.code===Pa.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,u as isMcpNotADirectoryError,c as isMcpResourceNotFoundError,i as isMcpUnknownMethodError,d as isUrlElicitationRequiredMcpError};
