
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{ve}from"./chunk-5ythzcas.js";import{$Re}from"./chunk-za46rn2f.js";import{i}from"./chunk-xjnnz630.js";import{P}from"./chunk-bb1a67wr.js";import{Bd}from"./chunk-gb7aq6sf.js";import{homedir as o}from"os";var M1o="CLAUDE_CODE_RELAUNCH_HOME_TRUST";async function XJs(){let r=await Bd(process.pid);if(r===void 0)return{};return{[M1o]:`${process.pid}:${r}`}}async function JJs(){let r=/^(\d{1,10}):(.{1,64})$/.exec(i.CLAUDE_CODE_RELAUNCH_HOME_TRUST??"");if(!r)return!1;let e=P()==="windows"?process.ppid:process.pid;if(Number(r[1])!==e)return!1;if(!$Re(ve(),o()))return!1;let t=await Bd(e,{skipCache:!0});return t!==void 0&&t===r[2]}
export{M1o,XJs,JJs};
