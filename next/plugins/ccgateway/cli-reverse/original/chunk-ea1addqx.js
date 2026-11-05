
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{t}from"./chunk-6hadbefe.js";import{i}from"./chunk-xjnnz630.js";var RKr="[3P telemetry] OTEL diag error:";class EGo{error(r,...e){if(i.CLAUDE_CODE_OTEL_DIAG_STDERR)process.stderr.write(`${RKr} ${r}
`);t(`${RKr} ${r}`,{level:"error"})}warn(r,...e){t(`[3P telemetry] OTEL diag warn: ${r}`,{level:"warn"})}info(r,...e){return}debug(r,...e){return}verbose(r,...e){return}}
export{RKr,EGo};
