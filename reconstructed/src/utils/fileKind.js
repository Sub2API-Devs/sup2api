/**
 * utils/fileKind.ts
 *
 * 2.1.316 新增：文件类型判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-enbs5qcy.js (1)
 * attribution: placement 1
 */
import { lstat } from "fs/promises";

/**
 * 由 Dirent/Stats 判断文件类型（dir、symlink、file、other）；类型未知时再 lstat 一次，失败返回给定默认值。
 */
//@ chunk-enbs5qcy.js:227-553 placement
async function getFileKind(i, e, t) {
  if (i.isDirectory()) return "dir";
  if (i.isSymbolicLink()) return "symlink";
  if (i.isFile()) return "file";
  if (i.isFIFO() || i.isSocket() || i.isBlockDevice() || i.isCharacterDevice()) return "other";
  try {
    let r = await lstat(e);
    return r.isDirectory() ? "dir" : r.isSymbolicLink() ? "symlink" : r.isFile() ? "file" : "other";
  } catch {
    return t;
  }
}

export { getFileKind };
