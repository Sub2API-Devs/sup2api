
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
function Mee(n){return n.replace(/[-_]/g,"").toLowerCase()}function _Or(n){return new Map(n.map((t)=>[Mee(t),t]))}function Kt(n){if(typeof n!=="object"||n===null)return!1;let t=Object.getPrototypeOf(n);return t===Object.prototype||t===null}
export{Mee,_Or,Kt};
