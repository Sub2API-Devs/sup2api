
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
class S7{turnOf=new Map;endedTurns=new WeakSet;endedLoops=new Set;add(n,e){this.turnOf.set(n,e)}forget(n){for(let[e,t]of this.turnOf)if(t.signal===n)this.turnOf.delete(e)}end(n,e){let t=n===void 0?void 0:this.turnOf.get(n);if(t!==void 0)this.endedTurns.add(t.signal);return this.endedLoops.add(e),t}}
export{S7};
