
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{i}from"./chunk-jhrww53q.js";import{Te,Oi,GK,Pu,Zd}from"./chunk-v9tcvh08.js";import{gc,KH}from"./chunk-aepeg2w5.js";import{U1e}from"./chunk-640x3zn9.js";import{oEe}from"./chunk-3wydcdvj.js";function T4t(r=Te()){if(r!=="firstParty"||!Oi())return!1;if(GK())return!0;return s()}function ute(r=Te()){if(r!=="firstParty"||!Pu())return!1;if(i.ANTHROPIC_BASE_URL!==void 0||!gc()||!KH())return!0;let t=oEe(),e=t===void 0?U1e()??null:t;return e===null||Zd(e)}function s(){if(i.ANTHROPIC_BASE_URL!==void 0||!KH())return!0;let r=oEe();return r===null||r!==void 0&&Zd(r)}function d9r(){if(i.ANTHROPIC_BASE_URL!==void 0)return i.ANTHROPIC_BASE_URL;try{if(KH()){let r=oEe();if(typeof r==="string")return r}}catch{}return"https://api.anthropic.com"}
export{T4t,ute,d9r};
