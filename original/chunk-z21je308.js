
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{EK,vK,Z_,zy,Ug,$k}from"./chunk-aepeg2w5.js";function n(){let e=Z_();if(e==="opus"&&EK()&&!$k(zy()))return{alias:"opus[1m]",name:"Opus 1M",multiplier:5};else if(e==="sonnet"&&vK()&&!$k(Ug()))return{alias:"sonnet[1m]",name:"Sonnet 1M",multiplier:5};return null}function YTe(e){let t=n();if(!t)return null;switch(e){case"warning":return`/model ${t.alias}`;case"tip":return`Tip: You have access to ${t.name} with ${t.multiplier}x more context`;default:return null}}
export{YTe};
