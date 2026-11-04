
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ma,Yd}from"./chunk-r1g76qsy.js";import"./chunk-333ft0yv.js";var n=new Set([-32002,ma.InvalidParams]);function e(o){return o instanceof Yd?o.code:void 0}function t(o){return o instanceof Yd&&o.code===ma.MethodNotFound}function c(o){return o instanceof Yd&&(o.code===ma.MethodNotFound||o.code===ma.InvalidParams)}function i(o){return o instanceof Yd&&n.has(o.code)}function u(o){return o instanceof Yd&&o.code===ma.InvalidParams}function d(o){return o instanceof Yd&&o.code===ma.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,u as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,c as isMcpUnknownMethodError,d as isUrlElicitationRequiredMcpError};
