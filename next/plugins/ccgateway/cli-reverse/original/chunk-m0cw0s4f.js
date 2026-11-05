
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var n=new WeakMap;function r(e,o){let t=n.get(e);if(t===void 0)t=new Set,n.set(e,t);t.add(o)}function i(e,o){return n.get(e)?.has(o)===!0}export{i as isScriptRowUUID,r as rememberScriptRowUUID};
