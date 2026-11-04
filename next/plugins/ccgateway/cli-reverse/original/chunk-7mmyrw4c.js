
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ga,na}from"./chunk-x4hefdgz.js";var o=new Set([-32002,ga.InvalidParams]);function e(n){return n instanceof na?n.code:void 0}function t(n){return n instanceof na&&n.code===ga.MethodNotFound}function i(n){return n instanceof na&&(n.code===ga.MethodNotFound||n.code===ga.InvalidParams)}function c(n){return n instanceof na&&o.has(n.code)}function u(n){return n instanceof na&&n.code===ga.InvalidParams}function d(n){return n instanceof na&&n.code===ga.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,u as isMcpNotADirectoryError,c as isMcpResourceNotFoundError,i as isMcpUnknownMethodError,d as isUrlElicitationRequiredMcpError};
