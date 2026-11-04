
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{FDn}from"./chunk-w5sk7e3v.js";import{oDt}from"./chunk-9m6032j0.js";import{Be}from"./chunk-rshven70.js";import{ge}from"./chunk-886baxky.js";var o_r="HKLM\\SOFTWARE\\Policies\\ClaudeCode",s_r="HKCU\\SOFTWARE\\Policies\\ClaudeCode",IIn="Settings";var axi=5000,Pfs=2097152,z3e="/mnt/c/Windows/System32/reg.exe",lxi="unable to find the specified registry key or value",qO="/mnt/c/Program Files/ClaudeCode",o=ge({isCoworkCloud:void 0},(e)=>{e.isCoworkCloud=void 0});function NXt(){if(o.isCoworkCloud===void 0){let e=process.env.CLAUDE_CODE_ENTRYPOINT;o.isCoworkCloud=FDn.some((r)=>r===e)}return o.isCoworkCloud}function dxi(){o.isCoworkCloud=void 0,NXt()}function $Xt(){let e=NXt();if(process.env.WSL_DISTRO_NAME&&!e)return!0;try{let r=Be("fs").readFileSync("/proc/version","utf8").toLowerCase();return oDt(r)}catch{return!1}}
export{o_r,s_r,IIn,axi,Pfs,z3e,lxi,qO,NXt,dxi,$Xt};
