
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{t}from"./chunk-6hadbefe.js";import{Je}from"./chunk-r4yj9pae.js";var r=new Je(()=>({store:void 0})),s={maxBytes:0,save:async()=>null};function Qxn(e){return r.peek(e)?.store??(e.host.launchOptions.diskless()?s:void 0)}function Pg(){return Qxn(F())}async function P8e(e,o){try{return await e.save(o)}catch{return t("A result could not be saved where the model reads files",{level:"error"}),null}}
export{Qxn,Pg,P8e};
