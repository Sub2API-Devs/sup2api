
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{he}from"./chunk-4ymxyb4g.js";import{TGe,bb}from"./chunk-avfhvhz8.js";import{_rt}from"./chunk-g3xfp0ds.js";import{Yn}from"./chunk-58wc6nbw.js";var ZWn="\x1B]8;;",eGn="\x07";function kw(e,r,t){let s=r===void 0?void 0:Yn(r),n=s===void 0||nAo(e,s);if(!(n&&(t?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(TGe()??!0)||(t?.supportsHyperlinks??bb()))){let i=t?.shownUrlStart??"";if(r!==void 0&&!n)return`${r}${i} (${e})`;return`${i}${e}`}let o=(((t?.themeName)?_rt(t.themeName):!1)?he.blue:he.blueBright)(r??e);return`${ZWn}${e}${eGn}${o}${ZWn}${eGn}`}function nAo(e,r){return r===e||e===`http://${r}`||e===`https://${r}`}
export{ZWn,eGn,kw,nAo};
