
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{be}from"./chunk-h88kgep4.js";import{r4e,fS}from"./chunk-1jphxy9b.js";import{$dt}from"./chunk-hhr6kfwg.js";import{Vn}from"./chunk-0eqmdcgk.js";var E8n="\x1B]8;;",v8n="\x07";function uS(e,r,t){let s=r===void 0?void 0:Vn(r),n=s===void 0||FUo(e,s);if(!(n&&(t?.assumeSupport??!1)&&process.stdout.isTTY===!0&&(r4e()??!0)||(t?.supportsHyperlinks??fS()))){let i=t?.shownUrlStart??"";if(r!==void 0&&!n)return`${r}${i} (${e})`;return`${i}${e}`}let o=(((t?.themeName)?$dt(t.themeName):!1)?be.blue:be.blueBright)(r??e);return`${E8n}${e}${v8n}${o}${E8n}${v8n}`}function FUo(e,r){return r===e||e===`http://${r}`||e===`https://${r}`}
export{E8n,v8n,uS,FUo};
