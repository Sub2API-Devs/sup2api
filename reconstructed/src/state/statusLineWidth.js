/**
 * state/statusLineWidth.ts
 *
 * 2.1.316 新增：状态栏宽度状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */

//@ chunk-e6aww6q8.js:85537-85601 placement
var jNe = ["w25", "w50", "w100", "w200", "unlimited"],
  UNLIMITED = "unlimited";
//@ chunk-e6aww6q8.js:85601-85695 placement
function g$o(e, n) {
  let index = jNe.indexOf(e),
    max = Math.max(0, Math.min(jNe.length - 1, index + n));
  return jNe[max];
}

export { UNLIMITED, g$o };
