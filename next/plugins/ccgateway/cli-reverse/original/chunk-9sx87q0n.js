
// @bun @bytecode
// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.318
import{u9,Put}from"./chunk-aexe35rn.js";import{EAe}from"./chunk-exfmq47h.js";import{bOe}from"./chunk-5xgkngpb.js";import{Mue}from"./chunk-7kayq7nc.js";function RGs(i){let n="client_platform"in i?i.client_platform:void 0;return!(EAe("origin"in i?i.origin:void 0,"isSynthetic"in i&&Boolean(i.isSynthetic))||("is_meta"in i)&&i.is_meta===!0||("seeded_summon"in i)&&i.seeded_summon===!0||("client_composed"in i)&&i.client_composed===!0||("inbound_origin"in i)&&i.inbound_origin!==void 0||n!==void 0&&!(typeof n==="string"&&(u9(n)||Put(n)))||Mue(i)||bOe("initiator"in i&&typeof i.initiator==="string"?i.initiator:void 0)!==void 0)}
export{RGs};
