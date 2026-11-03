/**
 * utils/structuredCloneLimits.ts
 *
 * 2.1.316 新增。structuredClone 限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cmb6vxf9.js (1)
 * attribution: placement 1
 */

/**
 * 跨 VM 边界复制值时的嵌套深度上限、栈耗尽相关的错误文字与引擎的栈溢出消息。
 */
//@ chunk-cmb6vxf9.js:191-480 placement
var CLONE_DEPTH_THRESHOLD = 4096,
  MAX_NESTING_DEPTH = 1e5,
  MAX_STACK_NESTING_DEPTH = 28000,
  NESTING_TOO_DEEP_MESSAGE = "nesting deeper than 100000 levels is not supported",
  STACK_NESTING_TOO_DEEP_MESSAGE = "nesting deeper than 28000 levels is not supported",
  STACK_EXHAUSTED_MESSAGE = "the stack ran out while copying a value across the VM boundary",
  STACK_OVERFLOW_MESSAGES = ["Maximum call stack size exceeded.", "Maximum call stack size exceeded"];

export {
  CLONE_DEPTH_THRESHOLD,
  STACK_OVERFLOW_MESSAGES,
  STACK_EXHAUSTED_MESSAGE,
  MAX_STACK_NESTING_DEPTH,
  MAX_NESTING_DEPTH,
  STACK_NESTING_TOO_DEEP_MESSAGE,
  NESTING_TOO_DEEP_MESSAGE,
};
