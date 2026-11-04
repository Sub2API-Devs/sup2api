
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{et,Vd,On}from"./chunk-ndmse9kj.js";import{us}from"./chunk-v9tcvh08.js";import{vt,an,gr,JA,Ft}from"./chunk-aepeg2w5.js";import{JR,CT}from"./chunk-e6aww6q8.js";import{randomUUID as o}from"crypto";function t(e,r){switch(e){case"pro":return"pro";case"max":switch(r){case"default_claude_max_5x":return"max_5x";case"default_claude_max_20x":return"max_20x";default:return"max_other"}default:return"other"}}var i="You can continue now. Continue the task you were working on when the usage limit was reached; do not repeat work that is already complete.";function Qce(){return vt()&&an()?.billingType!=="usage_based"&&us()&&Vd()&&!On()&&!Ft()}function WQe(e){return Qce()&&JR(e)&&e.rateLimitType==="five_hour"}var n=["five_hour","seven_day","seven_day_overage_included","seven_day_opus","seven_day_sonnet"];function hin(e){return Qce()&&JR(e)&&e.rateLimitType!==void 0&&n.includes(e.rateLimitType)}function JTe(){return t(gr(),JA())}function Xht(){CT({agentId:et(),mode:"prompt",priority:"later",value:i,uuid:o(),origin:{kind:"auto-continuation"},isMeta:!0,skipSlashCommands:!0})}
export{Qce,WQe,hin,JTe,Xht};
