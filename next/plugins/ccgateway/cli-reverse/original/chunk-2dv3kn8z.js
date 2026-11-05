
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{M2}from"./chunk-gb7aq6sf.js";import{Me}from"./chunk-5xgkngpb.js";import{op,Dlt}from"./chunk-01kgd7xg.js";import{EFe}from"./chunk-94s4dsgm.js";import{Vo}from"./chunk-j8qkeqz1.js";function dGr(e,a,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(n)=>({...n,messages:Dlt(n.messages,a)}))}function uzt(e,a,s,n){let o=s.get(e);if(!o||Vo(o.status)){t(`Dropping message for teammate task ${e}: task status is "${o?.status}"`);return}let i=Me({content:a,origin:n});s.update(e,(r)=>({...r,pendingUserMessages:[...r.pendingUserMessages,{text:a,origin:n,shownAs:i.uuid}]})),s.updateTranscript(e,(r)=>({...r,messages:Dlt(r.messages,i)}))}function iUo(e,a){let s=a.get(e);if(!op(s)||!s.awaitingPlanApproval)return;a.update(e,(n)=>({...n,awaitingPlanApproval:!1,pendingPlanApproval:void 0})),uzt(e,"The person moved you out of plan mode. Continue your work.",a,{kind:"task-notification"})}function aUo(e,a,s){let n=EFe(M2(a,s),e);if(n?.status==="running")n.retryWake?.emit()}
export{dGr,uzt,iUo,aUo};
