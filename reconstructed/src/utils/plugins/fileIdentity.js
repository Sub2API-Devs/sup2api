/**
 * utils/plugins/fileIdentity.ts
 *
 * 2.1.316 新增：文件身份
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: placement 4
 */
import { lstat, readdir } from "fs/promises";
import { dirname, join } from "path";
import { isSentinelInode } from "../slowOperations.js";
import { stripInvisibleChars as stripInvisibleChars_3 } from "./syncedItems.js";
import { foldName } from "../permissions/protectedDirNames.js";

//@ chunk-e6aww6q8.js:611860-611915 placement
/**
 * isSameFileIdentity：两路径是否为同一文件。
 */
async function isSameFileIdentity(e, n) {
  return (await compareFileIdentity(e, n)) === "same";
}
//@ chunk-e6aww6q8.js:611915-612263 placement
/**
 * 用 bigint lstat 比较两路径的 dev/ino；inode 是哨兵值或与父目录相同时退回比较去掉不可见字符后的路径。返回 same/different/unknown。
 */
async function compareFileIdentity(e, n) {
  if (e === n) return "same";
  try {
    let [r, s, h] = await Promise.all([
      lstat(e, {
        bigint: true,
      }),
      lstat(n, {
        bigint: true,
      }),
      lstat(dirname(e), {
        bigint: true,
      }),
    ]);
    if (isSentinelInode(r.ino) !== isSentinelInode(s.ino)) return "unknown";
    if (isSentinelInode(r.ino) || (r.dev === h.dev && r.ino === h.ino))
      return stripInvisibleChars_3(e) === stripInvisibleChars_3(n) ? "same" : "different";
    return r.dev === s.dev && r.ino === s.ino ? "same" : "different";
  } catch {
    return "different";
  }
}
//@ chunk-e6aww6q8.js:612263-612543 placement
/**
 * 返回判定同步条目是否仍指向已知目标的函数（live/not-live/indeterminate）。
 */
function createLiveEntryClassifier(liveDirs) {
  let n = new Map(Array.from(liveDirs, (r) => [stripInvisibleChars_3(r), r]));
  return async (r) => {
    let s = n.get(stripInvisibleChars_3(r));
    if (s === undefined) return "not-live";
    let h = await compareFileIdentity(r, s);
    if (h === "same") return "live";
    if (h === "unknown") return "indeterminate";
    try {
      await lstat(s);
      return "not-live";
    } catch {
      return "indeterminate";
    }
  };
}
//@ chunk-e6aww6q8.js:612543-612828 placement
/**
 * 递归查找是否含 git 目录（HEAD + commondir/refs）。
 */
async function containsGitDirectory(e) {
  let n = [e];
  while (n.length > 0) {
    let r = n.pop();
    let s;
    try {
      s = await readdir(r, {
        withFileTypes: true,
      });
    } catch {
      continue;
    }
    let h = new Set(s.map((y) => foldName(y.name)));
    if (h.has("head") && (h.has("commondir") || h.has("refs"))) return true;
    for (let y of s) if (y.isDirectory()) n.push(join(r, y.name));
  }
  return false;
}
export { containsGitDirectory, isSameFileIdentity, createLiveEntryClassifier };
