
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.316
import{ve}from"./chunk-ndmse9kj.js";import{Pke}from"./chunk-aat7wt0p.js";import{i}from"./chunk-jhrww53q.js";import{I}from"./chunk-znrryf4y.js";import{gd}from"./chunk-qg0af0yq.js";import{homedir as o}from"os";var zCo="CLAUDE_CODE_RELAUNCH_HOME_TRUST";async function xFs(){let r=await gd(process.pid);if(r===void 0)return{};return{[zCo]:`${process.pid}:${r}`}}async function PFs(){let r=/^(\d{1,10}):(.{1,64})$/.exec(i.CLAUDE_CODE_RELAUNCH_HOME_TRUST??"");if(!r)return!1;let e=I()==="windows"?process.ppid:process.pid;if(Number(r[1])!==e)return!1;if(!Pke(ve(),o()))return!1;let t=await gd(e,{skipCache:!0});return t!==void 0&&t===r[2]}
export{zCo,xFs,PFs};
