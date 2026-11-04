
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{sp}from"./chunk-cgr0tezp.js";import{Om}from"./chunk-ch0vxh4c.js";import{LTn,jJ}from"./chunk-rk4wpr9g.js";import{Vy}from"./chunk-bwbq4xvm.js";import{Re}from"./chunk-rshven70.js";var o=Re(Vy(),1);import{readdir as c,stat as p}from"fs/promises";import{join as a,sep as f}from"path";function jee(){if(!sp())return!1;let r=LTn()+f;return process.execPath.startsWith(r)}function Bu(r={}){return aJ(o4e(r))}function o4e(r={}){if(!r.pinToCurrentBinary&&jee()){let t=_ot();return{cmd:t,prefixArgs:[],target:t}}if(sp())return{cmd:process.execPath,prefixArgs:[],target:process.execPath};let e=process.argv[1];if(!e)return{cmd:process.execPath,prefixArgs:[],target:process.execPath};return{cmd:process.execPath,prefixArgs:[e],target:e}}function _ot(){return a(jJ(),"claude")}function aJ(r){let e=Om();if(e.length===0||r.cmd===e[0])return r;return{cmd:e[0],prefixArgs:[...e.slice(1),r.cmd,...r.prefixArgs],target:r.target}}async function iqt(){let r=LTn(),e;try{e=await c(r)}catch{return null}let t=e.filter((n)=>!/\.tmp\.\d+\.\d+(\.\d+)?$/.test(n)&&o.valid(n)).sort(o.rcompare);for(let n of t){let i=a(r,n);try{let s=await p(i);if(s.isFile()&&s.size>0)return i}catch{}}return null}
export{jee,Bu,o4e,_ot,aJ,iqt};
