
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import"./chunk-kcjh5jnz.js";import"./chunk-0777tkjc.js";import"./chunk-ndmse9kj.js";import"./chunk-vk5xfx8n.js";import"./chunk-0wqny7vr.js";import"./chunk-2g090z7k.js";import"./chunk-eabawhjj.js";import"./chunk-aat7wt0p.js";import"./chunk-x7vma94a.js";import"./chunk-bbtre4r8.js";import"./chunk-cgcrer2m.js";import"./chunk-6ysndsgz.js";import"./chunk-cgr0tezp.js";import"./chunk-cmr2yp8m.js";import"./chunk-j3nx1xyn.js";import"./chunk-m41h77x8.js";import"./chunk-fq90vph4.js";import"./chunk-jhrww53q.js";import"./chunk-znrryf4y.js";import"./chunk-1rckdhfn.js";import"./chunk-qnshrmd1.js";import"./chunk-7dqf31r1.js";import"./chunk-f5te1san.js";import{fa}from"./chunk-yxnffbzs.js";import"./chunk-p5akk6be.js";import"./chunk-4eww0w8n.js";import{_o}from"./chunk-0stm8h1s.js";import"./chunk-58wc6nbw.js";function c(t,o,a,d){let e=(i,r)=>typeof i==="string"&&typeof r==="string"&&i===a(r),s=e(t.saved_pages_dir,o)?`[A quickstart in this conversation saved reference pages of this type on disk in ${_o([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`:"";if(t.not_listed===!0)return s===""?"":`

${s}`;let n=s===""?"":` ${s}`;if(typeof t.saved_system==="string"&&e(t.saved_system_dir,t.saved_system))return`

[A quickstart in this conversation already listed the design systems and saved the files of ${fa(t.saved_system,"(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;return s===""?null:`${d}${n}`}export{c as afterQuickstartSavedLine};
