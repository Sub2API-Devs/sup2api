
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{G,dbt}from"./chunk-5ythzcas.js";import{BWe,DDt,PXe,LDt,HDt}from"./chunk-bjf8bvwf.js";import{g,c}from"./chunk-47b8txen.js";import{uW}from"./chunk-vn3g7zt8.js";import{u8,cat,dYt,zBe,$t,uV,Ib}from"./chunk-5xgkngpb.js";import{Qcr,Zcr}from"./chunk-fazwv9v4.js";import{Wut}from"./chunk-xc4g26h5.js";import{oz}from"./chunk-peqtdyy5.js";import{_3}from"./chunk-h13zwtby.js";import{_Vn}from"./chunk-7swgcwav.js";import{Zbr}from"./chunk-mxsrzv5n.js";import{HXe}from"./chunk-f14qge9c.js";function yVn(e,o,m,a){oz("conversation_reset"),uW("conversation_reset"),Ib(uV),LDt(),PXe(),BWe(),HDt(),DDt(),Wut();let r=G();for(let s of HXe(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);m(),cat(),e.markConversationRemote?.(),Zbr(e.readFileState),u8(e.memorySelector),dbt(),zBe(o);let t=Zcr(o);if(t)c("teleport_resume_history","summarized_rows_absent");else g("teleport_resume_history");let i=t?[$t(Qcr,"warning")]:[];_Vn(a,r,[...o,...i].map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:[...dYt(o),...i]}),_3(!0)}
export{yVn};
