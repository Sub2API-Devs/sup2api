
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Bb,$Y}from"./chunk-m41h77x8.js";var n=/(?![\u200C\u200D])[\p{Cf}\u2028\u2029]/gu,o=/[\u001b\u0080-\u009f]/g,c=8;function vA(u){let e=u.replace(o,"").replace($Y,"").replace(/[\v\f\r]/g,"");for(let r=0;r<c;r++){let t=Bb(e.replace(n,""));if(t===e)return e;e=t}return e.replace(/[\ud800-\udfff]/g,"").replace(n,"")}
export{vA};
