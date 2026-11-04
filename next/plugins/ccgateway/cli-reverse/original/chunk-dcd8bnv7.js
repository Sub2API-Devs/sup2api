
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{tt,B}from"./chunk-ndmse9kj.js";import{t}from"./chunk-cgr0tezp.js";var r=new tt(()=>({store:void 0})),s={maxBytes:0,save:async()=>null};function W5o(e){return r.peek(e)?.store??(e.host.launchOptions.diskless()?s:void 0)}function dy(){return W5o(B())}async function Wqe(e,o){try{return await e.save(o)}catch{return t("A result could not be saved where the model reads files",{level:"error"}),null}}
export{W5o,dy,Wqe};
