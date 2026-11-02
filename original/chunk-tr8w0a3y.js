
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{hAn}from"./chunk-np4q44aj.js";import{Ol}from"./chunk-bwbq4xvm.js";import{x}from"./chunk-rshven70.js";var o=x(function(c){Object.defineProperty(c,"__esModule",{value:!0});c.getMachineId=void 0;var i=hAn(),n=Ol();async function u(){try{let t=(await i.execAsync('ioreg -rd1 -c "IOPlatformExpertDevice"')).stdout.split(`
`).find((d)=>d.includes("IOPlatformUUID"));if(!t)return;let r=t.split('" = "');if(r.length===2)return r[1].slice(0,-1)}catch(e){n.diag.debug(`error reading machine id: ${e}`)}return}c.getMachineId=u});export default o();
