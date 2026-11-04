
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{d}from"./chunk-2g090z7k.js";import{t}from"./chunk-cgr0tezp.js";import{I}from"./chunk-znrryf4y.js";import{Kee,tD}from"./chunk-fq0cr76a.js";var e={disabled:"The Windows Secondary Logon service (seclogon) is disabled; an administrator must set its startup type to Manual (`sc.exe config seclogon start= demand`). The sandbox cannot start without it.",missing:"The Windows Secondary Logon service (seclogon) is not present on this machine; the sandbox cannot start without it."};function $6n(n){return n?.seclogon==="disabled"||n?.seclogon==="missing"?e[n.seclogon]:void 0}async function F6n(){if(I()!=="windows")return;let n=await Kee({srtWin:tD()}).catch((o)=>{t(`[sandbox] could not read the sandbox status: ${d(o)}`,{level:"error"});return});return $6n(n?.user)}
export{$6n,F6n};
