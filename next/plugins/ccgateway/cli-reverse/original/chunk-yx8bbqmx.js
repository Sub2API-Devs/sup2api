
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{b,f}from"./chunk-vwtpw18x.js";import{l}from"./chunk-nkv493nm.js";import{$4e,jte,M3,_Vr,bVr}from"./chunk-fcmdaxcr.js";var H4e={accepted:"Allowed",declined:"Not allowed",unset:"Not asked yet"},t="Turned off by your organization's settings (remoteTools.allowUnattendedServing)",o="Turned off in your user settings (remoteTools.allowUnattendedServing: false in ~/.claude/settings.json) \u2014 remove it there to re-enable";function ryn(){return _Vr()==="user"?o:t}function XJn(e){return jte()!=="unset"||bVr()||e}function JJn(){return jte()==="accepted"||bVr()}async function QJn(e){if(e==="accepted"&&M3())return"forbidden";let n=e==="accepted"?"accepted":jte()==="accepted"?"revoked":"declined";if(!await $4e(e))return"not_saved";return l("tengu_served_unattended_consent",{action:f(n),surface:b("cli")}),"saved"}
export{H4e,ryn,XJn,JJn,QJn};
