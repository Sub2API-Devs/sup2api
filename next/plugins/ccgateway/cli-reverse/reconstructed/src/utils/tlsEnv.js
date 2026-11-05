/**
 * utils/tlsEnv.ts
 *
 * 2.1.316 新增：TLS 环境变量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f33rhb46.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-f33rhb46.js:1502-1576 placement
/**
 * 会影响 TLS 校验的环境变量名。
 */
var TLS_ENV_VARS = ["NODE_TLS_REJECT_UNAUTHORIZED", "BUN_TLS_REFUSE_DISTRUSTED_KEYS"];
export { TLS_ENV_VARS };
