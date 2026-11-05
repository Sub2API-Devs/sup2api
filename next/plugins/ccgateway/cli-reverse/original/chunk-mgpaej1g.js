
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{kq,Tq,$b,M_,Hg,eA}from"./chunk-exfmq47h.js";function n(){let e=$b();if(e==="opus"&&kq()&&!eA(M_()))return{alias:"opus[1m]",name:"Opus 1M",multiplier:5};else if(e==="sonnet"&&Tq()&&!eA(Hg()))return{alias:"sonnet[1m]",name:"Sonnet 1M",multiplier:5};return null}function aPe(e){let t=n();if(!t)return null;switch(e){case"warning":return`/model ${t.alias}`;case"tip":return`Tip: You have access to ${t.name} with ${t.multiplier}x more context`;default:return null}}
export{aPe};
