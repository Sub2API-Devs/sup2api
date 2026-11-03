/**
 * utils/toolUseErrorText.ts
 *
 * 2.1.316 新增：工具调用错误文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8eppk1se.js (2)
 * attribution: placement 2
 */

//@ chunk-8eppk1se.js:227-314 placement
var x = /^\s*<tool_use_error>([\s\S]*)<\/tool_use_error>\s*$/i,
  f = /<\/?tool_use_error\b/i;
//@ chunk-8eppk1se.js:753-829 placement
function Dhn(n) {
  let e = x.exec(n)?.[1];
  return e !== void 0 && !f.test(e) ? e : void 0;
}

export { Dhn };
