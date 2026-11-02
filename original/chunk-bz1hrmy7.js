
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ht}from"./chunk-wztb57wq.js";var s=null;function Czs(e){let n=s;return s=e,n}function kYn(){return s}var r=null;function Rzs(e){let n=r;return r=e,n}async function Foe(e){return await r?.(e)??!1}class Bze extends Error{consent;constructor(e){super("first-party design MCP server requires consent");this.consent=e;this.name="FirstPartyDesignNeedsConsentError"}}var t=null;function xzs(e){let n=t;return t=e,n}function SZe(){return t}function TYn(e){let n=ht();if(n.scopeExpansionDisclosed)return;n.scopeExpansionDisclosed=!0,n.pendingScopeExpansionNotice=e}function yLo(){let e=ht(),n=e.pendingScopeExpansionNotice;return e.pendingScopeExpansionNotice=void 0,n}function Pzs(){let e=yLo();if(e)process.stderr.write(`${e}
`)}
export{Czs,kYn,Rzs,Foe,Bze,xzs,SZe,TYn,yLo,Pzs};
