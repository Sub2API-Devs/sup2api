/**
 * utils/flushOnRemote.ts
 *
 * 2.1.316 新增：远程会话下的刷新钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ts9rfgqd.js (1)
 * attribution: placement 1
 */
import { isStorageV5Enabled } from "./hoverRest.js";
import { primeFileDescriptorCredentials } from "./fileDescriptorCredentials.js";

//@ chunk-ts9rfgqd.js:1383-1435 placement
async function flushRemoteCredentials(credentials) {
  if (isStorageV5Enabled() && credentials !== undefined) await primeFileDescriptorCredentials(credentials);
}
export { flushRemoteCredentials };
