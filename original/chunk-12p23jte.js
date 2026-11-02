
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{d}from"./chunk-2g090z7k.js";import{t}from"./chunk-cgr0tezp.js";import{kd,yo,nl,Fv}from"./chunk-y162pn60.js";import{Zee}from"./chunk-pghq0ca2.js";async function OGn(r,o){if(!Zee())return;try{let e=await yo(r,o);if(!e||!nl(e)||e.state==="stopped"||Fv(e))return;await kd(r,{...e,state:"stopped",updatedAt:new Date().toISOString()},o)}catch(e){t(`stop not recorded on the job's row: ${d(e)}`,{level:"error"})}}
export{OGn};
