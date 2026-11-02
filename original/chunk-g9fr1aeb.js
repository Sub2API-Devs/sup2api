
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Go}from"./chunk-0777tkjc.js";var g=/^[A-Za-z0-9][A-Za-z0-9-]*$/,a=new Set(["restricted"]),rOs=["system-prompt-file","append-system-prompt-file","append-subagent-system-prompt-file"];function RC(t,e){return`${t}=${e}`}function mxr(t,e){let n=String(e);if(n.length>1&&n.startsWith("-"))return[RC(t,n)];return[t,n]}function wrn(t,e,n){t.push(...mxr(`--${e}`,n))}function _Bn(t,e,n,o){let i=0;for(let[r,s]of Object.entries(e)){if(!g.test(r)){o("malformed",JSON.stringify(r));continue}if(n.has(r)){o("blocked",r);continue}if(a.has(r)){if(!Go(String(s)))t.push(`--${r}`),i++;continue}if(s!=="")wrn(t,r,s),i++}return i}
export{rOs,RC,mxr,wrn,_Bn};
