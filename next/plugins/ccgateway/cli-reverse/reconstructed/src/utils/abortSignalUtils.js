/**
 * utils/abortSignalUtils.ts
 *
 * 2.1.316 新增：中止信号小工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1rg94zzn.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-1rg94zzn.js:191-229 placement
/**
 * 判断中止信号是否已经中止（未给信号视为未中止）。
 */
function isAborted(signal) {
  return signal?.aborted === true;
}
export { isAborted };
