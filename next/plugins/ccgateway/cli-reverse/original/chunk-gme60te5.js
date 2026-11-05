
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{WOs}from"./chunk-z20c443b.js";import{oCe,k2e,Wq}from"./chunk-5fn9rb8r.js";function zTe(){if(!oCe())throw Error("the MDM settings have not been read yet");if(Wq())throw Error("an admin-owned settings document could not be read");if(WOs()!==void 0)throw Error("the managed-settings path was overridden");let e=k2e()[0]?.forceLoginOrgUUID;if(e===void 0)return;return typeof e==="string"?[e]:e}
export{zTe};
