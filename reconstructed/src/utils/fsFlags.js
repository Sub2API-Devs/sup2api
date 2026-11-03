/**
 * utils/fsFlags.ts
 *
 * 2.1.316 新增：文件系统标志
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q9xx23ay.js (1)
 * attribution: placement 1
 */
import { constants } from "fs";

//@ chunk-q9xx23ay.js:222-263 placement
/**
 * O_NONBLOCK 常量；同语句导出 O_NOFOLLOW|O_NONBLOCK 的组合。
 */
var O_NONBLOCK = constants.O_NONBLOCK;
var NOFOLLOW_NONBLOCK_FLAGS = constants.O_NOFOLLOW | O_NONBLOCK;
export { NOFOLLOW_NONBLOCK_FLAGS, O_NONBLOCK };
