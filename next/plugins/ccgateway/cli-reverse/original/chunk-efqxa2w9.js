
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var R6n=50;function x6n(o){let r=performance.now()+o,e=0,n=setInterval(()=>{let t=performance.now();e=Math.max(e,t-r),r=t+o},o);return n.unref(),{takeMaxMs(){let t=e;return e=0,t},stop(){return clearInterval(n),Math.max(e,performance.now()-r)}}}
export{R6n,x6n};
