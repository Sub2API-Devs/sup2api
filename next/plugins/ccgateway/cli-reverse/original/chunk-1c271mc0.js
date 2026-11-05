
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{i0n}from"./chunk-fne1d3en.js";import{Ql}from"./chunk-7kayq7nc.js";import{I,je}from"./chunk-gehzbwn8.js";var u=I(function(n){Object.defineProperty(n,"__esModule",{value:!0});n.getMachineId=void 0;var r=je("fs"),i=i0n(),t=Ql();async function c(){try{return(await r.promises.readFile("/etc/hostid",{encoding:"utf8"})).trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}try{return(await i.execAsync("kenv -q smbios.system.uuid")).stdout.trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}return}n.getMachineId=c});export default u();
