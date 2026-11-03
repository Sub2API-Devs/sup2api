/**
 * utils/pathSegments.ts
 *
 * 2.1.316 新增：规范化路径段用于比较（去不可见字符、统一大小写、去掉末尾点和空格），以及路径段集合匹配与 node_modules 判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (3)
 * attribution: placement 3
 */
import { foldCase_2 } from "./networkPaths.js";
import { isOwnTempName } from "./atomicPublishWrite.js";

//@ chunk-f3qhjfah.js:4444-4493 placement
/**
 * 规范化路径段用于比较：去掉不可见字符并统一大小写，再去掉末尾的点和空格（Windows 文件名语义）。
 */
function normalizePathSegment(e) {
  return foldCase_2(e).replace(/[. ]+$/, "");
}
//@ chunk-f3qhjfah.js:4493-4588 placement
/**
 * 判断路径段（规范化后）是否在给定集合中或与集合任一项等价。
 */
function matchesSegmentOrTempName(name, n) {
  let r = normalizePathSegment(name);
  if (n.has(r)) return true;
  for (let s of n) if (isOwnTempName(r, s)) return true;
  return false;
}
//@ chunk-f3qhjfah.js:4588-4634 placement
/**
 * 判断路径段规范化后是否是 node_modules。
 */
function isNodeModulesSegment(e) {
  return normalizePathSegment(e) === "node_modules";
}
export { matchesSegmentOrTempName, isNodeModulesSegment, normalizePathSegment };
