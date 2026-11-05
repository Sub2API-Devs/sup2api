
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{unlink as n}from"fs/promises";async function APr(e){if(!(e instanceof Error)||!("preservedTmp"in e)||typeof e.preservedTmp!=="string")return;if("targetOutcome"in e&&e.targetOutcome==="untouched")try{await n(e.preservedTmp);return}catch{}t(`The login was not saved: a temp file that holds the new one is left at ${e.preservedTmp}`,{level:"error"})}
export{APr};
