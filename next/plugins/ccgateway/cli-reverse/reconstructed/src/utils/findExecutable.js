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
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_ignore } from "../../vendor/ignore/index.js";
import { bunWhichSync } from "./which.js";

//@ chunk-fq0cr76a.js:877365-877414 placement
/**
 * 按下标逐项比较两个数组是否全等。
 */
function arraysEqualByIndex(left, right) {
  return left.every((item, index) => item === right[index]);
}
//@ chunk-fq0cr76a.js:877414-877468 placement
/**
 * 判断两个数组长度与内容是否完全相同。
 */
function isSameArray(leftArray, configHome) {
  return leftArray.length === configHome.length && arraysEqualByIndex(leftArray, configHome);
}
//@ chunk-fq0cr76a.js:877468-877487 placement
/**
 * path 模块（Node 内置 path）的引用。
 */
var pathModule = __toESM(require_ignore(), 1);
//@ chunk-fq0cr76a.js:877818-877863 fingerprint (2.1.88 match: findExecutable, 1)
function findExecutable(exe, args) {
  return {
    cmd: bunWhichSync(exe) ?? exe,
    args,
  };
}
export { findExecutable, pathModule, arraysEqualByIndex, isSameArray };
