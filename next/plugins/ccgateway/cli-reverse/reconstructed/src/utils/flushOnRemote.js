/**
 * utils/flushOnRemote.ts
 *
 * 2.1.316 新增：远程会话下的刷新钩子
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ke6sf0r9.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isStorageV5Enabled } from "./hoverRest.js";
import { primeFileDescriptorCredentials } from "./fileDescriptorCredentials.js";

//@ chunk-ke6sf0r9.js:1467-1519 placement
async function flushRemoteCredentials(credentials) {
  if (isStorageV5Enabled() && credentials !== undefined) await primeFileDescriptorCredentials(credentials);
}
export { flushRemoteCredentials };
