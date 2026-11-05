
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i}from"./chunk-xjnnz630.js";import{homedir as s}from"os";import{join as o}from"path";function r(e){return{env:e?.env??process.env,home:e?.homedir??i.HOME??s()}}function s$i(e){let{env:n,home:t}=r(e);return n.XDG_STATE_HOME??o(t,".local","state")}function i$i(e){let{env:n,home:t}=r(e);return n.XDG_CACHE_HOME??o(t,".cache")}function tJe(e){let{env:n,home:t}=r(e);return n.XDG_DATA_HOME??o(t,".local","share")}function Tpt(e){return o(tJe(e),"claude","versions")}function AZ(e){let{home:n}=r(e);return o(n,".local","bin")}
export{s$i,i$i,tJe,Tpt,AZ};
