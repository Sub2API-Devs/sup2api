
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
var yce=8;function fCr(o,u){let e=[],n="",t=0;for(let r of o){let s=l(r);if(t+s>u&&n!=="")e.push(n),n="",t=0;n+=r,t+=s}return e.push(n),e}function l(o){return o.length===1&&o<"\x80"?1:2}
export{yce,fCr};
