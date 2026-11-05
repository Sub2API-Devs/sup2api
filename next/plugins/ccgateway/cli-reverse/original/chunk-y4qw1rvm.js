
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ol}from"./chunk-my2r02mp.js";import{ULe}from"./chunk-d342dwxg.js";var dbs="PostCompact [",dJe="This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.";function r(o){return o.startsWith(`<${Ol}>`)&&o.includes(dbs)}function EHn(o){if(typeof o==="string")return r(o);if(!Array.isArray(o)||o.length!==1)return!1;let t=o[0];return ULe(t)&&r(t.text)}
export{dbs,dJe,EHn};
