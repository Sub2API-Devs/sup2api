
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{g,c}from"./chunk-47b8txen.js";import{I$,gle,JK,yB}from"./chunk-5xgkngpb.js";import{Lme}from"./chunk-3n0n2sf6.js";async function Zot(){I$(),yB(),gle(),JK.emit();try{await Lme.rehome(),g("skill_directory_reload")}catch(r){t(`directory change: re-targeting the skill watcher failed (continuing with the previous watch): ${r}`,{level:"error"}),c("skill_directory_reload","rehome_failed")}}
export{Zot};
