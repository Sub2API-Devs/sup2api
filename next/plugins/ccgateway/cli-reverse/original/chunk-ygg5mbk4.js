
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{W}from"./chunk-0qffyy27.js";import{a}from"./chunk-my2r02mp.js";import{i}from"./chunk-xjnnz630.js";import{Zm,xo,PL}from"./chunk-rmd7n4gq.js";var s="--inherit-permission-mode";function t(e){return e===s||e.startsWith(`${s}=`)}class f{mode}var c=new W(()=>new f);function p(){return c.of(F().host)}function WYs({inheritPermissionModeCli:e,resolvedMode:n,storageV5:r}){if(!e)return;p().mode=n,PL("--permission-mode",[s],n,void 0,r).catch((o)=>a(o))}async function GYs(e){let n=p(),r=n.mode;if(r===void 0)return;let o=i.CLAUDE_JOB_DIR;if(!o||i.CLAUDE_CODE_SESSION_KIND!=="bg"){n.mode=void 0;return}let d=await xo(o,e);if(!d?.respawnFlags)return;if(!d.respawnFlags.some(t)){n.mode=void 0;return}await PL("--permission-mode",[s],r,void 0,e,void 0,(u)=>u.some(t)),Zm(o);let m=await xo(o,e);if(m?.respawnFlags&&!m.respawnFlags.some(t))n.mode=void 0}
export{WYs,GYs};
