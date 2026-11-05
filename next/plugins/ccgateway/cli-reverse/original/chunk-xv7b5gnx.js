
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{RR}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";import{Xp}from"./chunk-exfmq47h.js";import{F0o,U0o}from"./chunk-wyc3ddyy.js";import{wd}from"./chunk-rmd7n4gq.js";class i{activePark=null}var s=new W(()=>new i);async function RSt(r,e,n,a){if(!Xp())return!1;let o=s.of(r),t=await F0o(e,n,a);switch(t.kind){case"refused":return!1;case"already":if(o.activePark?.needs!==e)d(o,e,{tempo:"idle",needs:void 0,detail:""},a);return!0;case"wrote":return d(o,e,t.prior,a),!0}}function d(r,e,n,a){r.activePark?.unsubscribe();let o=RR(()=>{if(Xp())return;let t=r.activePark;if(!t||t.needs!==e)return;r.activePark=null,t.unsubscribe(),U0o(e,t.prior,t.storageV5).catch(wd)});r.activePark={needs:e,prior:n,storageV5:a,unsubscribe:o}}
export{RSt};
