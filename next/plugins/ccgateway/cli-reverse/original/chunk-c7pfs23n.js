
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{Ya,Me}from"./chunk-5xgkngpb.js";import{uo}from"./chunk-1ectaxf9.js";import{randomUUID as a}from"crypto";var u="repl-error-";function PGt(e,{clientsDrawCalls:t,shownOnCall:s,stoppedBy:o,withheldScriptToolUseId:r}){let n=`${u}${a()}`,i=t&&{visibleToRemoteClients:!0};return[{...Ya({content:[{type:"tool_use",id:n,name:uo,input:{}}],isVirtual:!0}),...i,...s&&{scriptErrorCopy:!0}},{...Me({content:[{type:"tool_result",tool_use_id:n,content:e,is_error:!0}],toolUseResult:{error:e,...o!==void 0&&{stoppedBy:o},...s&&{shownOnCall:!0}},isVirtual:!0}),turnCompanion:!0,...i,...t&&{remoteToolResult:{kind:"stored",text:e}},...r!==void 0&&{withheldScriptToolUseId:r}}]}
export{PGt};
