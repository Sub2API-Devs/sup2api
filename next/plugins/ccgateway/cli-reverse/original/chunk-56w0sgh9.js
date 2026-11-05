
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{P}from"./chunk-bb1a67wr.js";import{sep as i}from"path";function Jge(t,r){let e=r.endsWith(i)?r:r+i;if(P()==="windows")return t.toLowerCase().startsWith(e.toLowerCase());return t.startsWith(e)}function t9(t,r){if(P()==="windows")return t.toLowerCase()===r.toLowerCase()||Jge(t,r);return t===r||Jge(t,r)}function a(t){return t.startsWith("/")?"/":"\\"}function U0(t,r,e){let n=e?t.toLowerCase():t,o=e?r.toLowerCase():r;if(n===o)return!0;let s=a(o),f=o.endsWith(s)?o:o+s;return n.startsWith(f)}
export{Jge,t9,U0};
