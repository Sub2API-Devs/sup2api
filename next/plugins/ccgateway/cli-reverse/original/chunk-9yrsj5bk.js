
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function lFe(t,r){switch(r){case"bash":return`!${t}`;default:return t}}function wE(t){if(t.startsWith("!"))return"bash";return"prompt"}function pM(t){if(wE(t)==="prompt")return t;return t.slice(1)}function wGt(t){return t==="!"}function e6s({nextValue:t,value:r,cursorOffset:n,mode:o}){let e=wE(t);if(n!==0||e==="prompt"||e===o)return!1;return t.length===r.length+1||r.length===0}
export{lFe,wE,pM,wGt,e6s};
