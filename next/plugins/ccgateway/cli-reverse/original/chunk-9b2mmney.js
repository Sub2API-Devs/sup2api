
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{as,eI}from"./chunk-f3md3zsc.js";import{vp}from"./chunk-9ys74nhz.js";import{Nn}from"./chunk-5m8x0kb6.js";import{cUe}from"./chunk-r28w8ktt.js";import{egr}from"./chunk-xbyvnehm.js";class r{reader=void 0;register(e){this.reader=e}read(){return this.reader?.()??!1}}var o=new r;function fKo(e){o.register(e)}function est(){let e=eI("allow_plugin_skill_search");if(e==="org_denied"||e==="latched"||e==="unregistered"||e!==null&&as("hipaa"))return!1;if(cUe())return!0;return vp()&&Nn()&&o.read()}function Iaa(e){if(!egr.includes(e))return!0;return est()}
export{fKo,est,Iaa};
