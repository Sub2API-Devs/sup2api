/**
 * utils/abortSignalUtils.ts
 *
 * 2.1.316 新增：中止信号小工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j7w6w6jx.js (1)
 * attribution: placement 1
 */

//@ chunk-j7w6w6jx.js:191-229 placement
/**
 * 判断中止信号是否已经中止（未给信号视为未中止）。
 */
function isAborted(signal) {
  return signal?.aborted === true;
}
export { isAborted };
