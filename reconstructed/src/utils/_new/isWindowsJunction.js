/**
 * utils/_new/isWindowsJunction.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jhrww53q.js (2)
 * attribution: sole-consumer-new 2
 */
import { readJunction } from "../fsJunctions.js";
import { classifyProtectedDir } from "../permissions/protectedDirs.js";

/**
 * 检查路径类型，出错就抛，类型为 junction（Windows 目录联接）时返回 true。
 */
//@ chunk-jhrww53q.js:49040-49140 sole-consumer-new
async function isWindowsJunction(o) {
  let t = await readJunction(o);
  if (t.kind === "error") throw t.error;
  return t.kind === "junction";
}
/**
 * 从路径列表里去掉与当前工作目录满足某关系（如位于 cwd 内）的项。
 */
//@ chunk-jhrww53q.js:49190-49257 sole-consumer-new
function d_(o) {
  let cwd = process.cwd();
  return o.filter((_) => !classifyProtectedDir(_, cwd));
}

export { isWindowsJunction };
