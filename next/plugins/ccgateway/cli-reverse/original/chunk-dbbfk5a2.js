
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ss,Nx}from"./chunk-1rckdhfn.js";import{Gf}from"./chunk-7dqf31r1.js";import{Hn}from"./chunk-v9tcvh08.js";import{gHe}from"./chunk-m00wdbj6.js";import{zrr}from"./chunk-b85cz7hw.js";class r{reader=void 0;register(e){this.reader=e}read(){return this.reader?.()??!1}}var o=new r;function yMo(e){o.register(e)}function B7e(){let e=Nx("allow_plugin_skill_search");if(e==="org_denied"||e==="latched"||e==="unregistered"||e!==null&&Ss("hipaa"))return!1;if(gHe())return!0;return Gf()&&Hn()&&o.read()}function p2i(e){if(!zrr.includes(e))return!0;return B7e()}
export{yMo,B7e,p2i};
