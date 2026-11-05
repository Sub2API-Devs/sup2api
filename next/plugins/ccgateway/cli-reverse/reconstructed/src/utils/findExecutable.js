/**
 * utils/findExecutable.ts
 *
 * 查找可执行文件路径的薄封装（返回命令与参数）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/findExecutable.ts
 * pieces: chunk-qg41pqt6.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_ignore } from "../../vendor/ignore/index.js";
import { bunWhichSync } from "./which.js";

//@ chunk-qg41pqt6.js:879075-879124 placement
/**
 * 按下标逐项比较两个数组是否全等。
 */
function arraysEqualByIndex(left, right) {
  return left.every((item, index) => item === right[index]);
}
//@ chunk-qg41pqt6.js:879124-879178 placement
/**
 * 判断两个数组长度与内容是否完全相同。
 */
function isSameArray(leftArray, configHome) {
  return leftArray.length === configHome.length && arraysEqualByIndex(leftArray, configHome);
}
//@ chunk-qg41pqt6.js:879178-879197 placement
/**
 * path 模块（Node 内置 path）的引用。
 */
var pathModule = __toESM(require_ignore(), 1);
//@ chunk-qg41pqt6.js:879527-879572 fingerprint (2.1.88 match: findExecutable, 1)
function findExecutable(exe, args) {
  return {
    cmd: bunWhichSync(exe) ?? exe,
    args,
  };
}
export { arraysEqualByIndex, isSameArray, findExecutable, pathModule };
