
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{t}from"./chunk-cgr0tezp.js";import{MG}from"./chunk-qg0af0yq.js";import{De}from"./chunk-e6aww6q8.js";import{Ef,int}from"./chunk-6vnxsn99.js";import{TLe}from"./chunk-v5mxhgy9.js";import{Vo}from"./chunk-c0cahhqh.js";function vOr(e,a,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(n)=>({...n,messages:int(n.messages,a)}))}function O$t(e,a,s,n){let o=s.get(e);if(!o||Vo(o.status)){t(`Dropping message for teammate task ${e}: task status is "${o?.status}"`);return}let i=De({content:a,origin:n});s.update(e,(r)=>({...r,pendingUserMessages:[...r.pendingUserMessages,{text:a,origin:n,shownAs:i.uuid}]})),s.updateTranscript(e,(r)=>({...r,messages:int(r.messages,i)}))}function nTo(e,a){let s=a.get(e);if(!Ef(s)||!s.awaitingPlanApproval)return;a.update(e,(n)=>({...n,awaitingPlanApproval:!1,pendingPlanApproval:void 0})),O$t(e,"The person moved you out of plan mode. Continue your work.",a,{kind:"task-notification"})}function rTo(e,a,s){let n=TLe(MG(a,s),e);if(n?.status==="running")n.retryWake?.emit()}
export{vOr,O$t,nTo,rTo};
