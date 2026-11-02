
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{i}from"./chunk-jhrww53q.js";import{homedir as s}from"os";import{join as o}from"path";function r(e){return{env:e?.env??process.env,home:e?.homedir??i.HOME??s()}}function t_i(e){let{env:n,home:t}=r(e);return n.XDG_STATE_HOME??o(t,".local","state")}function n_i(e){let{env:n,home:t}=r(e);return n.XDG_CACHE_HOME??o(t,".cache")}function h5e(e){let{env:n,home:t}=r(e);return n.XDG_DATA_HOME??o(t,".local","share")}function LTn(e){return o(h5e(e),"claude","versions")}function jJ(e){let{home:n}=r(e);return o(n,".local","bin")}
export{t_i,n_i,h5e,LTn,jJ};
