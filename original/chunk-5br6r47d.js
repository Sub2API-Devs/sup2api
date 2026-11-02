
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{wn}from"./chunk-aepeg2w5.js";import{c}from"./chunk-0wqny7vr.js";import{i}from"./chunk-jhrww53q.js";import{t}from"./chunk-cgr0tezp.js";import{a}from"./chunk-8kte1b36.js";import{ge}from"./chunk-886baxky.js";class f{latched=void 0;latch(e){this.latched=e}reset(){this.latched=void 0}}var d=ge(new f,(e)=>e.reset());function rD(){{if(d.latched!==void 0)return d.latched;let e=i.MCP_SDK_GENERATION,o=e==="v1"||e==="v2"?e:void 0;if(e!==void 0&&o===void 0)t(`MCP_SDK_GENERATION=${e} is invalid; expected 'v1' or 'v2' \u2014 ignoring`,{level:"warn"});let n=o===void 0?wn("tengu_brindle_causeway",!0):void 0,r=o??(n?.value===!1?"v1":"v2"),u=n===void 0?"env":n.source==="disabled"||n.source==="fallback"?"default":"growthbook";return d.latch(r),t(`mcp runtime arm: ${r} (source: ${u})`),a("tengu_mcp_sdk_generation",{generation:c(r),source:c(u)}),r}return"v1"}
export{rD};
