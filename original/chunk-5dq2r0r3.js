
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{$d}from"./chunk-bbtre4r8.js";import{KPe}from"./chunk-rmf8afvh.js";var NZo="PostCompact [",XYe="This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.";function r(o){return o.startsWith(`<${$d}>`)&&o.includes(NZo)}function Vkn(o){if(typeof o==="string")return r(o);if(!Array.isArray(o)||o.length!==1)return!1;let t=o[0];return KPe(t)&&r(t.text)}
export{NZo,XYe,Vkn};
