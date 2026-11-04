/**
 * @alcalzone/ansi-tokenize/build/diff.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @alcalzone/ansi-tokenize@0.2.2
 * pieces: chunk-m4dvt8pp.js (1)
 * attribution: esm-fingerprint 1
 */
import { undoAnsiCodes } from "./undo.js";

//@ chunk-m4dvt8pp.js:3845-4012 esm-fingerprint
/**
 * 计算从一组活动 ANSI 样式切换到另一组所需的码：先关闭不再需要的，再开启新增的（StylePool.transition 使用）。
 */
function diffAnsiCodes(from, to) {
  let endCodesInTo = new Set(to.map((code) => code.endCode));
  let startCodesInFrom = new Set(from.map((code) => code.code));
  return [
    ...undoAnsiCodes(from.filter((code) => !endCodesInTo.has(code.endCode))),
    ...to.filter((code) => !startCodesInFrom.has(code.code)),
  ];
}
export { diffAnsiCodes };
