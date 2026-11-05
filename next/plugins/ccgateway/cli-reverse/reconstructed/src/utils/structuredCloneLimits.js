/**
 * utils/structuredCloneLimits.ts
 *
 * 2.1.316 新增。structuredClone 限制。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fy6tvjpf.js (1)
 * attribution: placement 1
 */
//@ chunk-fy6tvjpf.js:191-480 placement
/**
 * 跨 VM 边界复制值时的嵌套深度上限、栈耗尽相关的错误文字与引擎的栈溢出消息。
 */
var CLONE_DEPTH_THRESHOLD = 4096;
var MAX_NESTING_DEPTH = 1e5;
var MAX_STACK_NESTING_DEPTH = 28000;
var NESTING_TOO_DEEP_MESSAGE = "nesting deeper than 100000 levels is not supported";
var STACK_NESTING_TOO_DEEP_MESSAGE = "nesting deeper than 28000 levels is not supported";
var STACK_EXHAUSTED_MESSAGE = "the stack ran out while copying a value across the VM boundary";
var STACK_OVERFLOW_MESSAGES = ["Maximum call stack size exceeded.", "Maximum call stack size exceeded"];
export {
  MAX_NESTING_DEPTH,
  NESTING_TOO_DEEP_MESSAGE,
  CLONE_DEPTH_THRESHOLD,
  STACK_OVERFLOW_MESSAGES,
  STACK_EXHAUSTED_MESSAGE,
  MAX_STACK_NESTING_DEPTH,
  STACK_NESTING_TOO_DEEP_MESSAGE,
};
