/**
 * services/api/_new/isEffortHigherThan.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dcmhvw5a.js (1)
 * attribution: sole-consumer-new 1
 */
import { EFFORT_LEVELS } from "../../../utils/effort.js";

/**
 * 级别 a 是否高于 b（按 EFFORT_LEVELS 顺序）。
 */
//@ chunk-dcmhvw5a.js:189628-189681 sole-consumer-new
function isEffortHigherThan(e, n) {
  return EFFORT_LEVELS.indexOf(e) > EFFORT_LEVELS.indexOf(n);
}

export { isEffortHigherThan };
