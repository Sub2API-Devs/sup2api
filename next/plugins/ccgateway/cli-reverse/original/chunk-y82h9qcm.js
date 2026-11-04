
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{B}from"./chunk-ndmse9kj.js";import{W}from"./chunk-x7vma94a.js";import{l}from"./chunk-bbtre4r8.js";import{i}from"./chunk-jhrww53q.js";import{lm,yo,BM}from"./chunk-y162pn60.js";var s="--inherit-permission-mode";function t(e){return e===s||e.startsWith(`${s}=`)}class m{mode}var u=new W(()=>new m);function f(){return u.of(B().host)}function vDs({inheritPermissionModeCli:e,resolvedMode:n,storageV5:r}){if(!e)return;f().mode=n,BM("--permission-mode",[s],n,void 0,r).catch((o)=>l(o))}async function kDs(e){let n=f(),r=n.mode;if(r===void 0)return;let o=i.CLAUDE_JOB_DIR;if(!o||i.CLAUDE_CODE_SESSION_KIND!=="bg"){n.mode=void 0;return}let d=await yo(o,e);if(!d?.respawnFlags)return;if(!d.respawnFlags.some(t)){n.mode=void 0;return}await BM("--permission-mode",[s],r,void 0,e,void 0,(p)=>p.some(t)),lm(o);let a=await yo(o,e);if(a?.respawnFlags&&!a.respawnFlags.some(t))n.mode=void 0}
export{vDs,kDs};
