/**
 * utils/taskDescription.ts
 *
 * 2.1.316 新增：后台任务描述的清洗与截断
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s1p2wv8d.js (2)
 * attribution: placement 2
 */
import { Dr, truncateToLength } from "./stringUtils.js";
import { Yn } from "./stripAnsi.js";
import { truncateToWidth } from "./format.js";

//@ chunk-s1p2wv8d.js:302-374 placement
var i = 200,
  o = i * 4,
  r = /[\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu;
//@ chunk-s1p2wv8d.js:374-469 placement
function vc(n) {
  let e = n === void 0 ? "" : Dr(Yn(n).replace(r, " "));
  return e === "" ? void 0 : truncateToWidth(truncateToLength(e, o), i);
}

export { vc };
