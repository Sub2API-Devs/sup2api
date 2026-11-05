
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ln}from"./chunk-2jb250pa.js";import{lt}from"./chunk-p223w7hd.js";import{vP,Ke}from"./chunk-qg41pqt6.js";import{Ge}from"./chunk-fmsrw1pw.js";import{stripVTControlCharacters as i}from"util";function Nqt(t,e=3){let r=t.map((s)=>Ln(i(s)).trim()),o=r.slice(0,e).join(", "),n=r.length-e;return n>0?`${o} (${n} more)`:o}function a6r(t=Number.POSITIVE_INFINITY){try{if(!Ke.isSandboxingEnabled())return;let e=Ke.getDeniesDroppedForAnotherHost();if(e.length===0)return;let r=`The sandbox would contact that computer before each command, so it leaves these entries out. An entry that the list calls a ${Ge} rule or an ${lt} rule still applies to the file tools. To have the sandbox block the paths, start Claude Code in a folder on that computer.`;return{issue:`Sandbox deny paths on another computer are not enforced, so sandboxed commands are not blocked from them: ${Nqt(e,t)}`,fix:e.some((o)=>o.endsWith(" from policySettings"))?`${r} If an administrator manages the entries from policySettings, tell them that the sandbox does not enforce these.`:r}}catch(e){vP(e,"deniesOnAnotherHostNotDescribed");return}}function v6o(){let t=a6r(3);if(t)process.stderr.write(`
\u26A0 ${t.issue}
  ${t.fix} \`claude doctor\` lists every entry.

`)}
export{Nqt,a6r,v6o};
