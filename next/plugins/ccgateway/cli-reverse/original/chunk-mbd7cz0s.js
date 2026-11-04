
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{hAn}from"./chunk-np4q44aj.js";import{Ol}from"./chunk-bwbq4xvm.js";import{x,Be}from"./chunk-rshven70.js";var u=x(function(n){Object.defineProperty(n,"__esModule",{value:!0});n.getMachineId=void 0;var r=Be("fs"),i=hAn(),t=Ol();async function c(){try{return(await r.promises.readFile("/etc/hostid",{encoding:"utf8"})).trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}try{return(await i.execAsync("kenv -q smbios.system.uuid")).stdout.trim()}catch(e){t.diag.debug(`error reading machine id: ${e}`)}return}n.getMachineId=c});export default u();
