
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ot,Rl,Pn}from"./chunk-5ythzcas.js";import{ws}from"./chunk-5m8x0kb6.js";import{vt,dn,sr,qk,jt}from"./chunk-exfmq47h.js";import{sP,OT}from"./chunk-5xgkngpb.js";import{randomUUID as o}from"crypto";function t(e,r){switch(e){case"pro":return"pro";case"max":switch(r){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}var i="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function Eme(){return vt()&&dn()?.billingType!=="usage_based"&&ws()&&Rl()&&!Pn()&&!jt()}function rot(e){return Eme()&&sP(e)&&e.rateLimitType==="five_hour"}var n=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function Phn(e){return Eme()&&sP(e)&&e.rateLimitType!==void 0&&n.includes(e.rateLimitType)}function cPe(){return t(sr(),qk())}function Ivt(){OT({agentId:ot(),mode:"prompt",priority:"later",value:i,uuid:o(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{Eme,rot,Phn,cPe,Ivt};
