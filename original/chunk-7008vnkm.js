
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{H4o}from"./chunk-qz53w8v8.js";import{N}from"./chunk-2g090z7k.js";import{bn}from"./chunk-aepeg2w5.js";import{l}from"./chunk-bbtre4r8.js";import{yje,KU}from"./chunk-7dqf31r1.js";import{Zvt}from"./chunk-fzty8e18.js";function rGn(e){let o=e.trim();return o!==""&&!o.startsWith("/")}var sAo=()=>!1;var iAo=()=>KU()&&!yje()&&bn("tengu_quiet_ember",sAo());var oGn={name:"cc-plugin-responsive-mode",description:"Responsive mode: Claude replies to you in a sentence before thinking or using tools, on every prompt",isAvailable:iAo,defaultEnabled:!1};function hMr({text:e,pastedContents:o,isSentByPerson:t,wait:r}){if(!t||r||!rGn(e))return!1;try{return H4o(e,o).length===0&&Zvt(oGn.name)}catch(i){return l(N(i)),!1}}
export{rGn,sAo,iAo,oGn,hMr};
