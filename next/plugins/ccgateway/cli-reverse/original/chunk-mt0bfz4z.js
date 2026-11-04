
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Ye,N}from"./chunk-2g090z7k.js";import{l}from"./chunk-bbtre4r8.js";import{GG,$n}from"./chunk-dcmhvw5a.js";import{AQ}from"./chunk-q8cqcff6.js";import{sdr}from"./chunk-czx62zen.js";function Wee(r,o){l(Ye(N(r),o))}function bot(r){if(r.scope!==void 0&&GG(r.scope))return!0;return r.pluginSource!==void 0&&sdr(r.pluginSource)}function hH(r,o){if(!bot(r))return o();let{pluginSource:e}=r;return AQ(o,e===void 0?{}:{keepsWrite:(n)=>$n(n)===$n(e)})}
export{bot,hH,Wee};
