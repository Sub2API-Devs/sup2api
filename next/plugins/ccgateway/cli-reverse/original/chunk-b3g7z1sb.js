
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
var rws="runner-declares";var d0n="diff-finds-nested-repository",ows="no-repository-checked-out";function sws(e){return"--runner-declares="+e.join(",")}async function Gca(e){if(!e.startsWith("--runner-declares="))return;let E=e.slice(18).split(","),n=E.includes("diff-finds-nested-repository"),t=!1;if(!n&&!t)return;let{setRunnerDeclaredFreshMachinePerSession:R,setRunnerDeclaredNestedRepositoryDiff:r,setRunnerDeclaredNoRepositoryCheckedOut:s}=await import("./chunk-pfp3j087.js");if(n){if(r(!0),E.includes("no-repository-checked-out"))s(!0)}if(t)R(!0)}
export{rws,d0n,ows,sws,Gca};
