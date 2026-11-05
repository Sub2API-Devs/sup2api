
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t$}from"./chunk-5ythzcas.js";import{b$i,na}from"./chunk-a0xc6evk.js";import{W9}from"./chunk-1z79zgep.js";function q9n(t,r){na("user_prompt",{prompt_length:String(r?.length??0),...b$i(r),...t.attributes})}function xw(t){let r=t.trim();if(!r.startsWith("/"))return null;let{name:e,args:n}=W9(r);if(!e)return null;let o="(MCP)";if(n===o)return{commandName:`${e} ${o}`,args:"",isMcp:!0};if(n.startsWith(o)&&/\s/.test(n.charAt(o.length)))return{commandName:`${e} ${o}`,args:n.slice(o.length).trimStart(),isMcp:!0};return{commandName:e,args:n,isMcp:!1}}function DFe(t,r){if(!t.subcommands)return;let e=r.trimStart(),n=e.search(/\s/),o=n===-1?e:e.slice(0,n),s=o?t.subcommands[o.toLowerCase()]:void 0;if(s===void 0)return;let m=n===-1?"":e.slice(n+1).trim();if(t.subcommandsBareOnly&&m!=="")return;return{targetName:s,consumedToken:o,remainingArgs:m}}function zhn(t,r){let e=t$();if(r===void 0){q9n(t,t.text);return}r({text:t.text,attributes:{...e&&{"prompt.id":e},...t.attributes}})}var n2t=(t)=>typeof t==="string"?t:t.map((r)=>({...r}));
export{xw,DFe,q9n,zhn,n2t};
