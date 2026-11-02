
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{K}from"./chunk-ndmse9kj.js";import{h_s}from"./chunk-7dqf31r1.js";import{xhe}from"./chunk-nsfjm4vg.js";var t=/^chat:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;function lHo(){let e=h_s();if(!e)return"unset";if(!t.test(e))return"malformed";return xhe()?"ignored":"used"}function o(){return lHo()==="used"?h_s():void 0}function dHo(){let e=o();return e===void 0?{key:K(),fromHost:!1}:{key:e,fromHost:!0}}function ycn(){return dHo().key}
export{lHo,dHo,ycn};
