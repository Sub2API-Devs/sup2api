
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{IWn}from"./chunk-23wtzxhc.js";import{IUt}from"./chunk-j9w0w3wz.js";import{je}from"./chunk-gehzbwn8.js";import{ge}from"./chunk-77hsvag5.js";var KPr="HKLM\\SOFTWARE\\Policies\\ClaudeCode",VPr="HKCU\\SOFTWARE\\Policies\\ClaudeCode",SBn="Settings";var Aqi=5000,WPs=2097152,FQe="/mnt/c/Windows/System32/reg.exe",Cqi="unable to find the specified registry key or value",PD="/mnt/c/Program Files/ClaudeCode",o=ge({isCoworkCloud:void 0},(e)=>{e.isCoworkCloud=void 0});function Eon(){if(o.isCoworkCloud===void 0){let e=process.env.CLAUDE_CODE_ENTRYPOINT;o.isCoworkCloud=IWn.some((r)=>r===e)}return o.isCoworkCloud}function Rqi(){o.isCoworkCloud=void 0,Eon()}function von(){let e=Eon();if(process.env.WSL_DISTRO_NAME&&!e)return!0;try{let r=je("fs").readFileSync("/proc/version","utf8").toLowerCase();return IUt(r)}catch{return!1}}
export{KPr,VPr,SBn,Aqi,WPs,FQe,Cqi,PD,Eon,Rqi,von};
