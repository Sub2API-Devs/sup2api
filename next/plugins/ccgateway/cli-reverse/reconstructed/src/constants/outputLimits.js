/**
 * constants/outputLimits.ts
 *
 * 2.1.316 新增：结果数量与字节上限常量；输出/结果大小相关常量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xzpphmw8.js (2)
 * attribution: placement 2
 */
//@ chunk-xzpphmw8.js:191-242 placement
/**
 * 输出/结果大小相关常量。
 */
var OUTPUT_SIZE_LIMITS = 50000;
var MAX_OUTPUT_CHARS_SMALL = 1e4;
var MIN_MAX_OUTPUT_LENGTH = 4000;
var MAX_CONTEXT_TOKENS = 128000;
var MAX_MCP_RESULT_CHARS = 500000;
//@ chunk-xzpphmw8.js:242-319 placement
/**
 * 结果数量与字节上限常量。
 */
var RESULT_LIMITS = 4;
var MAX_RESULT_CHARS = 400000;
var MAX_RESULT_BYTES = 200000;
var MAX_DESCRIPTION_CHARS = 50;
var MAX_RESULT_BUFFER_BYTES = 1073741824;
var RESULT_LIMIT_COUNT = 1e4;
var TRUNCATE_MIDDLE_CHARS = 1e4;
var MAX_MERGED_PROMPTS = 1e5;
export {
  OUTPUT_SIZE_LIMITS,
  MAX_RESULT_BUFFER_BYTES,
  MAX_RESULT_CHARS,
  RESULT_LIMITS,
  MAX_RESULT_BYTES,
  RESULT_LIMIT_COUNT,
  MAX_MCP_RESULT_CHARS,
  MAX_DESCRIPTION_CHARS,
  MAX_OUTPUT_CHARS_SMALL,
  MAX_MERGED_PROMPTS,
  MIN_MAX_OUTPUT_LENGTH,
  MAX_CONTEXT_TOKENS,
  TRUNCATE_MIDDLE_CHARS,
};
