/**
 * utils/pathSegments.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (3)
 * attribution: placement 3
 */
import { foldCase } from "./networkPaths.js";
import { isOwnTempName } from "./atomicPublishWrite.js";

/**
 * 规范化路径段用于比较：去掉不可见字符并统一大小写，再去掉末尾的点和空格（Windows 文件名语义）。
 */
//@ chunk-f3qhjfah.js:4444-4493 placement
function dU(e) {
  return foldCase(e).replace(/[. ]+$/, "");
}
/**
 * 判断路径段（规范化后）是否在给定集合中或与集合任一项等价。
 */
//@ chunk-f3qhjfah.js:4493-4588 placement
function OCt(e, n) {
  let r = dU(e);
  if (n.has(r)) return !0;
  for (let s of n) if (isOwnTempName(r, s)) return !0;
  return !1;
}
/**
 * 判断路径段规范化后是否是 node_modules。
 */
//@ chunk-f3qhjfah.js:4588-4634 placement
function MCt(e) {
  return dU(e) === "node_modules";
}

export { OCt, MCt, dU };
