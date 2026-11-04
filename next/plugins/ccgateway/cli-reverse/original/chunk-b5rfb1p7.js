
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{A0}from"./chunk-ndmse9kj.js";import{Syi,$i}from"./chunk-p52gp8zk.js";import{BX}from"./chunk-s61vbvea.js";function Nzn(t,r){$i("user_prompt",{prompt_length:String(r?.length??0),...Syi(r),...t.attributes})}function HS(t){let r=t.trim();if(!r.startsWith("/"))return null;let{name:e,args:n}=BX(r);if(!e)return null;let o="(MCP)";if(n===o)return{commandName:`${e} ${o}`,args:"",isMcp:!0};if(n.startsWith(o)&&/\s/.test(n.charAt(o.length)))return{commandName:`${e} ${o}`,args:n.slice(o.length).trimStart(),isMcp:!0};return{commandName:e,args:n,isMcp:!1}}function BLe(t,r){if(!t.subcommands)return;let e=r.trimStart(),n=e.search(/\s/),o=n===-1?e:e.slice(0,n),s=o?t.subcommands[o.toLowerCase()]:void 0;if(s===void 0)return;let m=n===-1?"":e.slice(n+1).trim();if(t.subcommandsBareOnly&&m!=="")return;return{targetName:s,consumedToken:o,remainingArgs:m}}function Uin(t,r){let e=A0();if(r===void 0){Nzn(t,t.text);return}r({text:t.text,attributes:{...e&&{"prompt.id":e},...t.attributes}})}var EFt=(t)=>typeof t==="string"?t:t.map((r)=>({...r}));
export{HS,BLe,Nzn,Uin,EFt};
