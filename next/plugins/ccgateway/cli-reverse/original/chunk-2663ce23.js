
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{K,Aft}from"./chunk-ndmse9kj.js";import{oUe,gRt,m5e,hRt,yRt}from"./chunk-enbhzjw4.js";import{g,f}from"./chunk-8nhse09v.js";import{g1}from"./chunk-hwmsct5x.js";import{Wir}from"./chunk-82kqcve8.js";import{i6,Ket,bWt,U0e,Nt,Oq,kb}from"./chunk-e6aww6q8.js";import{uZn,fZn}from"./chunk-s1zey0a9.js";import{mst}from"./chunk-yjaa68dq.js";import{iW}from"./chunk-3y22eg7d.js";import{g$n}from"./chunk-tw3rx20q.js";import{LTe}from"./chunk-0h6s23my.js";import{LYe}from"./chunk-bnwcqde4.js";function Nen(e,o,m,a){iW("conversation_reset"),g1("conversation_reset"),kb(Oq),hRt(),m5e(),oUe(),yRt(),gRt(),mst();let r=K();for(let s of LYe(e.sessionHooksRegistry,r))e.sessionHooksRegistry.remove(r,"Stop",s);m(),Ket(),e.markConversationRemote?.(),Wir(e.readFileState),i6(e.memorySelector),Aft(),U0e(o);let t=fZn(o);if(t)f("teleport_resume_history","summarized_rows_absent");else g("teleport_resume_history");let i=t?[Nt(uZn,"warning")]:[];g$n(a,r,[...o,...i].map((s)=>s.uuid)),e.applyMessageOp({type:"replace-all",messages:[...bWt(o),...i]}),LTe(!0)}
export{Nen};
