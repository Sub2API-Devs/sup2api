
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Oo}from"./chunk-5ythzcas.js";import{g,m}from"./chunk-47b8txen.js";import{UWn}from"./chunk-2jb250pa.js";import{fV}from"./chunk-rmva59md.js";import{i$}from"./chunk-z0gd899m.js";function kra(e,r){let{shell:t}=i$.of(r),{cwd:i,originalCwd:o}=Oo(r);if(!t.isWatched)t.isWatched=!0,t.hasMoved=i!==o,r.subscribe(()=>{if(t.hasMoved||=r.project?.cwd!==o,r.project?.cwd!==t.taken)t.taken=void 0});if(e===void 0||e===i||t.hasMoved)return;if(typeof e!=="string"||!UWn(e)){m("mcp_serve_shell_directory_held","not_a_plain_directory");return}if(!e.startsWith(`${o}/`)){m("mcp_serve_shell_directory_held","outside_launch_directory");return}t.taken=e,r.setCwd(e),fV(),g("mcp_serve_shell_directory_held")}function GHr(e,r){return i$.peek(e)?.shell.taken===r}
export{kra,GHr};
