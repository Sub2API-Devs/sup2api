
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ut}from"./chunk-3jnp0k38.js";import{i}from"./chunk-xjnnz630.js";import{ym,Ud}from"./chunk-exfmq47h.js";function J5o({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function Q5o(t){let e=Ut(i.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await ym(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function une(t){let e;try{e=Ud()?.accountUuid}catch{e=void 0}return J5o({storedAccountUuid:e,hostAccountUuid:await Q5o(t)})}
export{J5o,Q5o,une};
