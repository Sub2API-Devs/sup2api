
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{oBn}from"./chunk-5fn9rb8r.js";import{t}from"./chunk-6hadbefe.js";import{Os,fFt}from"./chunk-z20c443b.js";import{q0e}from"./chunk-f33rhb46.js";import{Ybo,DX}from"./chunk-ex0jqs9a.js";import{w5,Pp}from"./chunk-71parphm.js";import{hXt}from"./chunk-91xvghb6.js";function dIn(n){return n!==void 0&&fFt(n)}function qct(n,r){if(dIn(n)){if(q0e().some((l)=>l.toUpperCase()==="BUN_OPTIONS"))return"--install=disable";let e=DX(r,"BUN_OPTIONS"),i=r[e],o=Os(hXt(),"BUN_OPTIONS"),d=Os(Pp()??{},"BUN_OPTIONS"),a=i===void 0||i===o||o===void 0&&(i===d||!w5(e,i))&&i!==Ybo("BUN_OPTIONS"),s=o??d,u=a?i:s!==void 0&&!oBn("BUN_OPTIONS",s)?s:void 0;return u?`--install=disable ${u}`:"--install=disable"}return}function hds(n,r){for(let e of Object.keys(n))if(e.toUpperCase()==="BUN_OPTIONS")delete n[e];n.BUN_OPTIONS=r}function Lre(n,r,e){{let i=qct(n,e);if(i===void 0)return;if(r[DX(r,"BUN_OPTIONS")]!==e[DX(e,"BUN_OPTIONS")])t(`Plugin ${n} set BUN_OPTIONS for a program it starts; Claude Code replaced it, because programs of Anthropic Directory plugins run with Bun's automatic install off and must ship the packages they import`);hds(r,i)}}
export{dIn,qct,hds,Lre};
