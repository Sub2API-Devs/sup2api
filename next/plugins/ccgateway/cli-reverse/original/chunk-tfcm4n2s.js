
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{wC}from"./chunk-ndmse9kj.js";import{W}from"./chunk-x7vma94a.js";import{hp}from"./chunk-aepeg2w5.js";import{Zwo,eEo}from"./chunk-fd653dqq.js";import{Ql}from"./chunk-y162pn60.js";class i{activePark=null}var s=new W(()=>new i);async function Kpt(r,e,n,a){if(!hp())return!1;let o=s.of(r),t=await Zwo(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=wC(()=>{if(hp())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),eEo(e,t.prior,t.storageV5).catch(Ql)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{Kpt};
