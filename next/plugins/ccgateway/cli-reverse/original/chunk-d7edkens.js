
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{z}from"./chunk-t11pnrxp.js";import{_Wi,HE,Gt}from"./chunk-exfmq47h.js";import{kI}from"./chunk-40tjhgg3.js";import{Tc}from"./chunk-n53w6zq1.js";import{zvn,p6e}from"./chunk-5xgkngpb.js";import{M,Q,T_,j}from"./chunk-zsz062c7.js";j();function t(){let[o,e]=T_((s)=>s+1,0);return M(()=>_Wi(e),[]),o}function TFr(o,e){return zvn(o)??zvn(e)??HE()}function u$(o){return Gt(TFr(o.mainLoopModelForSession,o.mainLoopModel))}function gxe(){let o=z((n)=>n.mainLoopModel),e=z((n)=>n.mainLoopModelForSession),s=kI(),i=t(),r=Tc();return Q(()=>p6e(e,o),[e,o,s,r,i])}function gnt(){let o=z((n)=>n.mainLoopModel),e=z((n)=>n.mainLoopModelForSession),s=kI(),i=t(),r=Tc();return Q(()=>TFr(e,o),[e,o,s,r,i])}function Au(){let o=z((n)=>n.mainLoopModel),e=z((n)=>n.mainLoopModelForSession),s=kI(),i=t(),r=Tc();return Q(()=>u$({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,s,r,i])}
export{TFr,u$,gxe,gnt,Au};
