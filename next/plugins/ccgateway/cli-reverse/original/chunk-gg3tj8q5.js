
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{B}from"./chunk-ndmse9kj.js";import{c}from"./chunk-0wqny7vr.js";import{W}from"./chunk-x7vma94a.js";import{a}from"./chunk-8kte1b36.js";import{gd}from"./chunk-qg0af0yq.js";import{vE}from"./chunk-aepeg2w5.js";import{readFile as s}from"fs/promises";class o{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),a("tengu_dead_probe_adopt_ticks_token",{site:c(e)})}reset(){this.firedSites.clear()}}var l=new W(()=>new o);function f(){return l.of(B().host)}function A_o(e){f().fire(e)}async function Nnn(e){try{let t=await s(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),n=t.slice(r+2).split(" "),i=Number(n[19]);return Number.isFinite(i)?i:null}catch{return null}}async function Gmt(e,t,r){if(r!==void 0){if(await gd(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(A_o("kill_gate"),await Nnn(e)!==t)return}else return;await vE(e,"SIGTERM").catch(()=>{})}
export{A_o,Nnn,Gmt};
