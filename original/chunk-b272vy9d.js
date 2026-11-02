
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Le}from"./chunk-0777tkjc.js";var a=50;function gze(){let s=Le(),t=[],n=0;return{publish(e,i,r){let u=r===void 0?{line:e,level:i}:{line:e,level:i,notice:r};if(n===0){t=[...t,u].slice(-a);return}s.emit(u)},takeBacklog(){let e=t;return t=[],e},subscribe(e){n+=1;let i=s.subscribe(e);return()=>{n-=1,i()}}}}
export{gze};
