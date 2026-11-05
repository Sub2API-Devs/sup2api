
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{d}from"./chunk-63094ahz.js";import{Qo}from"./chunk-ndkzc8d3.js";import{_,t}from"./chunk-6hadbefe.js";import{jn}from"./chunk-n44f9pt7.js";import{mEe}from"./chunk-20my5zt1.js";import{s$i}from"./chunk-5jjtf7jy.js";import{unlinkSync as s}from"fs";import{mkdir as c}from"fs/promises";import{join as i}from"path";function k6o(){return i(s$i(),"claude","locks")}function r5e(){return!Qo(void 0)}async function Crr(){let r=mEe(process.execPath);if(r===void 0||!r5e())return;try{let o=k6o(),e=i(o,`${r}@${process.pid}.lock`),n={pid:process.pid,version:r,execPath:process.execPath,acquiredAt:Date.now()};await c(o,{recursive:!0}),await jn(e,_(n,null,2)),process.on("exit",()=>{try{s(e)}catch{}})}catch(o){t(`Could not write this process's version lock, so a later update may delete the app bundle it runs from: ${d(o)}`,{level:"warn"})}}
export{k6o,r5e,Crr};
