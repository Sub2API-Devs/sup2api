
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Xe,N}from"./chunk-63094ahz.js";import{a}from"./chunk-my2r02mp.js";import{bee}from"./chunk-5fn9rb8r.js";import{z2,Fn}from"./chunk-z20c443b.js";import{Kwr}from"./chunk-r7hswen6.js";function Dre(r,o){a(Xe(N(r),o))}function Vct(r){if(r.scope!==void 0&&z2(r.scope))return!0;return r.pluginSource!==void 0&&Kwr(r.pluginSource)}function $0(r,o){if(!Vct(r))return o();let{pluginSource:e}=r;return bee(o,e===void 0?{}:{keepsWrite:(n)=>Fn(n)===Fn(e)})}
export{Vct,$0,Dre};
