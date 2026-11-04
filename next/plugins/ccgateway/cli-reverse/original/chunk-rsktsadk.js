
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Oe}from"./chunk-0777tkjc.js";import{i}from"./chunk-jhrww53q.js";var t=null;function c_i(e){t=e}function hy(){return i.CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG===!0||Oe(t?.()?.CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)}var o=300;function c6t(){let e=t?.(),n=(e===void 0?i.CLAUDE_CODE_PERSONAL_CONFIG_FIX:e.CLAUDE_CODE_PERSONAL_CONFIG_FIX)?.trim();if(n===void 0||n===""||n.length>o||/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(n))return;return n}
export{c_i,hy,c6t};
