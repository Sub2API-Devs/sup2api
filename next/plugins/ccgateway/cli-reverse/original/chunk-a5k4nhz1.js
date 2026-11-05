
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{xa,Ac}from"./chunk-qq5knpkd.js";import"./chunk-z18kt4r5.js";var n=new Set([-32002,xa.InvalidParams]);function e(o){return o instanceof Ac?o.code:void 0}function t(o){return o instanceof Ac&&o.code===xa.MethodNotFound}function c(o){return o instanceof Ac&&(o.code===xa.MethodNotFound||o.code===xa.InvalidParams)}function i(o){return o instanceof Ac&&n.has(o.code)}function u(o){return o instanceof Ac&&o.code===xa.InvalidParams}function d(o){return o instanceof Ac&&o.code===xa.UrlElicitationRequired}export{e as getMcpErrorCode,t as isMcpMethodNotFoundError,u as isMcpNotADirectoryError,i as isMcpResourceNotFoundError,c as isMcpUnknownMethodError,d as isUrlElicitationRequiredMcpError};
