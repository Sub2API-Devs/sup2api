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

//@ chunk-enbs5qcy.js:227-553 placement
/**
 * 由 Dirent/Stats 判断文件类型（dir、symlink、file、other）；类型未知时再 lstat 一次，失败返回给定默认值。
 */
async function getFileKind(dirent, filePath, fallbackKind) {
  if (dirent.isDirectory()) return "dir";
  if (dirent.isSymbolicLink()) return "symlink";
  if (dirent.isFile()) return "file";
  if (dirent.isFIFO() || dirent.isSocket() || dirent.isBlockDevice() || dirent.isCharacterDevice())
    return "other";
  try {
    let stats = await lstat(filePath);
    return stats.isDirectory()
      ? "dir"
      : stats.isSymbolicLink()
        ? "symlink"
        : stats.isFile()
          ? "file"
          : "other";
  } catch {
    return fallbackKind;
  }
}
export { getFileKind };
