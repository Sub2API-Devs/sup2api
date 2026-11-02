
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Pms}from"./chunk-dcmhvw5a.js";import{ave,o1e,Jge}from"./chunk-q8cqcff6.js";function rEe(){if(!ave())throw Error("the MDM settings have not been read yet");if(Jge())throw Error("an admin-owned settings document could not be read");if(Pms()!==void 0)throw Error("the managed-settings path was overridden");let e=o1e()[0]?.forceLoginOrgUUID;if(e===void 0)return;return typeof e==="string"?[e]:e}
export{rEe};
