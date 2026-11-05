
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{G}from"./chunk-5ythzcas.js";import{JHs}from"./chunk-9ys74nhz.js";import{jee}from"./chunk-23ta5myf.js";var t=/^chat:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;function SVo(){let e=JHs();if(!e)return"unset";if(!t.test(e))return"malformed";return jee()?"ignored":"used"}function o(){return SVo()==="used"?JHs():void 0}function wVo(){let e=o();return e===void 0?{key:G(),fromHost:!1}:{key:e,fromHost:!0}}function b_n(){return wVo().key}
export{SVo,wVo,b_n};
