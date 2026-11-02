
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
function fLe(t,r){switch(r){case"bash":return`!${t}`;default:return t}}function vw(t){if(t.startsWith("!"))return"bash";return"prompt"}function $I(t){if(vw(t)==="prompt")return t;return t.slice(1)}function FNt(t){return t==="!"}function PDs({nextValue:t,value:r,cursorOffset:n,mode:o}){let e=vw(t);if(n!==0||e==="prompt"||e===o)return!1;return t.length===r.length+1||r.length===0}
export{fLe,vw,$I,FNt,PDs};
