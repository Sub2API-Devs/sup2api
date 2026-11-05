
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{wt}from"./chunk-cdyva2jv.js";var s=null;function coi(e){let n=s;return s=e,n}function mtr(){return s}var r=null;function uoi(e){let n=r;return r=e,n}async function Fae(e){return await r?.(e)??!1}class EYe extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function foi(e){let n=t;return t=e,n}function $st(){return t}function htr(e){let n=wt();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function Lqo(){let e=wt(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function poi(){let e=Lqo();if(e)process.stderr.write(`${e}
`)}
export{coi,mtr,uoi,Fae,EYe,foi,$st,htr,Lqo,poi};
