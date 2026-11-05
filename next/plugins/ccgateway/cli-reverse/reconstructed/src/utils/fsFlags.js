/**
 * utils/fsFlags.ts
 *
 * 2.1.316 新增：文件系统标志
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8bm19qvs.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { constants } from "fs";

//@ chunk-8bm19qvs.js:222-263 placement (2.1.88 match: O_NOFOLLOW, 0.658)
/**
 * O_NONBLOCK 常量；同语句导出 O_NOFOLLOW|O_NONBLOCK 的组合。
 */
var O_NONBLOCK = constants.O_NONBLOCK;
var NOFOLLOW_NONBLOCK_FLAGS = constants.O_NOFOLLOW | O_NONBLOCK;
export { NOFOLLOW_NONBLOCK_FLAGS, O_NONBLOCK };
