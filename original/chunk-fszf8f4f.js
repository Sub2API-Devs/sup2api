
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{Vt}from"./chunk-kcjh5jnz.js";import{i}from"./chunk-jhrww53q.js";import{Mm,iu}from"./chunk-aepeg2w5.js";function DNo({storedAccountUuid:t,hostAccountUuid:e}){if(!e)return t?{status:"resolved",accountUuid:t,source:"stored"}:{status:"missing"};if(!t)return{status:"resolved",accountUuid:e,source:"env"};return t.trim().toLowerCase()===e.toLowerCase()?{status:"resolved",accountUuid:t,source:"env"}:{status:"mismatch"}}async function LNo(t){let e=Vt(i.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();if(e===void 0)return;try{let n=await Mm(t);return n==="env"||n==="fd"?e:void 0}catch{return}}async function wZ(t){let e;try{e=iu()?.accountUuid}catch{e=void 0}return DNo({storedAccountUuid:e,hostAccountUuid:await LNo(t)})}
export{DNo,LNo,wZ};
