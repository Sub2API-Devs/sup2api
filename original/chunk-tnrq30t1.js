
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import"./chunk-kcjh5jnz.js";import"./chunk-0777tkjc.js";import"./chunk-ndmse9kj.js";import"./chunk-vk5xfx8n.js";import"./chunk-0wqny7vr.js";import"./chunk-2g090z7k.js";import"./chunk-eabawhjj.js";import"./chunk-aat7wt0p.js";import"./chunk-x7vma94a.js";import"./chunk-cgcrer2m.js";import"./chunk-fq90vph4.js";import"./chunk-jhrww53q.js";import"./chunk-6ysndsgz.js";import"./chunk-cgr0tezp.js";import"./chunk-cmr2yp8m.js";import"./chunk-j3nx1xyn.js";import"./chunk-m41h77x8.js";import"./chunk-bbtre4r8.js";import"./chunk-znrryf4y.js";import"./chunk-qnshrmd1.js";import"./chunk-4ymxyb4g.js";import"./chunk-tss4qggm.js";import{hn}from"./chunk-437rqrst.js";import"./chunk-58wc6nbw.js";async function a(r,t){let o=e(r.remote,r.inputPrompt);if(o===null)return hn("Error: claude -p --cloud needs a task: pass it as the prompt, as --cloud's value, or on stdin.");let{runHeadlessCloudPrint:s}=await import("./chunk-54xbtc53.js");return s(r,t,{prompt:o,outputFormat:r.outputFormat==="json"?"json":"text"})}function e(r,t){let o=[r??"",typeof t==="string"?t:""].filter((s)=>s.trim()!=="");return o.length===0?null:o.join(`
`)}export{a as runHeadlessCloudPrintArm};
