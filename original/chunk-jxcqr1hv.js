
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{b,c}from"./chunk-0wqny7vr.js";import{a}from"./chunk-8kte1b36.js";import{ize,tZ,x5,MHr,DHr}from"./chunk-dw613xrm.js";var oze={accepted:"Allowed",declined:"Not allowed",unset:"Not asked yet"},t="Turned off by your organization's settings (remoteTools.allowUnattendedServing)",o="Turned off in your user settings (remoteTools.allowUnattendedServing: false in ~/.claude/settings.json) \u2014 remove it there to re-enable";function Ban(){return MHr()==="user"?o:t}function _Kn(e){return tZ()!=="unset"||DHr()||e}function bKn(){return tZ()==="accepted"||DHr()}async function SKn(e){if(e==="accepted"&&x5())return"forbidden";let n=e==="accepted"?"accepted":tZ()==="accepted"?"revoked":"declined";if(!await ize(e))return"not_saved";return a("tengu_served_unattended_consent",{action:c(n),surface:b("cli")}),"saved"}
export{oze,Ban,_Kn,bKn,SKn};
