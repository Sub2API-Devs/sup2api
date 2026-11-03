/**
 * utils/findExecutable.ts
 *
 * 查找可执行文件路径的薄封装（返回命令与参数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/findExecutable.ts
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { Re } from "../../runtime/bun-runtime.js";
import { Vpe } from "../../vendor/ignore/index.js";
import { w0 } from "./which.js";

//@ chunk-fq0cr76a.js:877365-877414 placement
function QM(e, n) {
  return e.every((r, s) => r === n[s]);
}
//@ chunk-fq0cr76a.js:877414-877468 placement
function _le(e, n) {
  return e.length === n.length && QM(e, n);
}
//@ chunk-fq0cr76a.js:877468-877487 placement
var o4 = Re(Vpe(), 1);
//@ chunk-fq0cr76a.js:877818-877863 fingerprint = findExecutable (1)
function findExecutable(exe, args) {
  return { cmd: w0(exe) ?? exe, args: args };
}

export { findExecutable, o4, QM, _le };
