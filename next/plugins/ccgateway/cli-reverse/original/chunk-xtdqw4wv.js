
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{F}from"./chunk-5ythzcas.js";import{f}from"./chunk-vwtpw18x.js";import{W}from"./chunk-0qffyy27.js";import{l}from"./chunk-nkv493nm.js";import{Bd}from"./chunk-gb7aq6sf.js";import{nE}from"./chunk-exfmq47h.js";import{readFile as s}from"fs/promises";class o{firedSites=new Set;fire(e){if(this.firedSites.has(e))return;this.firedSites.add(e),l("tengu_dead_probe_adopt_ticks_token",{site:f(e)})}reset(){this.firedSites.clear()}}var a=new W(()=>new o);function u(){return a.of(F().host)}function RMo(e){u().fire(e)}async function xun(e){try{let t=await s(`/proc/${e}/stat`,"utf-8"),r=t.lastIndexOf(")"),n=t.slice(r+2).split(" "),i=Number(n[19]);return Number.isFinite(i)?i:null}catch{return null}}async function kwt(e,t,r){if(r!==void 0){if(await Bd(e,{skipCache:!0})!==r)return}else if(t!==void 0){if(RMo("kill_gate"),await xun(e)!==t)return}else return;await nE(e,"SIGTERM",{groupMembersByPidToo:!0}).catch(()=>{})}
export{RMo,xun,kwt};
