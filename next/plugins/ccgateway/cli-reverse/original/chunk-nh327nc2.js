
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{oh}from"./chunk-wfxhhysk.js";import{Tpt,AZ}from"./chunk-5jjtf7jy.js";import{H_}from"./chunk-7kayq7nc.js";import{Ku}from"./chunk-trds6g68.js";import{Ie}from"./chunk-gehzbwn8.js";var o=Ie(H_(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function Mre(){if(!Ku())return!1;let r=Tpt()+f;return process.execPath.startsWith(r)}function Lc(r={}){return LV(Kge(r))}function Kge(r={}){if(!r.pinToCurrentBinary&&Mre()){let t=cDe();return{cmd:t,prefixArgs:[],target:t}}if(Ku())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function cDe(){return a(AZ(),"claude")}function LV(r){let e=oh();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function pXt(){let r=Tpt(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{Mre,Lc,Kge,cDe,LV,pXt};
