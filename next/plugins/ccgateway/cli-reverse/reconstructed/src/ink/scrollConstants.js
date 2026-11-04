/**
 * ink/scrollConstants.ts
 *
 * 滚动相关常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w6s5y86e.js (1)
 * attribution: placement 1
 */
//@ chunk-w6s5y86e.js:191-232 placement
/**
 * 滚动相关常量：一次跳 16 行、每 tick 最多 50 行、最少 4 行、历史上限 16384 行、tick 间隔 250ms。
 */
var SCROLL_JUMP_LINES = 16;
var SCROLL_MAX_ROWS_PER_TICK = 50;
var SCROLL_MIN_ROWS = 4;
var SCROLL_HISTORY_LIMIT = 16384;
var SCROLL_TICK_MS = 250;
export { SCROLL_JUMP_LINES, SCROLL_MAX_ROWS_PER_TICK, SCROLL_MIN_ROWS, SCROLL_HISTORY_LIMIT, SCROLL_TICK_MS };
