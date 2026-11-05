/**
 * utils/fsRemove.ts
 *
 * 2.1.316 新增：文件/目录删除辅助。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xjnnz630.js (7)
 * attribution: placement 6, layout 1
 */
import { unlink, rmdir, lstat, readdir } from "fs/promises";
import { join } from "path";
import { getErrnoCode, isENOENT } from "./errors.js";
import { safeResolvePath_2 } from "./fsOperations.js";
import { getPlatform } from "./platform.js";
import { readJunction } from "./fsJunctions.js";

//@ chunk-xjnnz630.js:48472-48788 placement
async function removePathEntry(entryPath) {
  try {
    await unlink(entryPath);
    return "removed";
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return "absent";
    try {
      await rmdir(entryPath);
      return "removed";
    } catch (error_2) {
      let errnoCode = getErrnoCode(error_2);
      if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "directory";
      if (errnoCode === "ENOENT") {
        if (
          await lstat(entryPath).then(
            () => false,
            (error) => getErrnoCode(error) === "ENOENT",
          )
        )
          return "absent";
        throw error;
      }
      throw errnoCode === "ENOTDIR" ? error : error_2;
    }
  }
}
//@ chunk-xjnnz630.js:48933-49428 placement
async function classifyDirEntry(dirPath, dirent) {
  let entryInfo;
  if (!safeResolvePath_2(dirent))
    entryInfo = {
      isDirectory: dirent.isDirectory(),
      isFile: dirent.isFile(),
      isSymbolicLink: dirent.isSymbolicLink(),
    };
  else {
    let stats = await lstat(join(dirPath, dirent.name));
    entryInfo = {
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      isSymbolicLink: stats.isSymbolicLink(),
      size: stats.size,
    };
  }
  if (entryInfo.isDirectory && getPlatform() === "windows") {
    let junction = await readJunction(join(dirPath, dirent.name));
    switch (junction.kind) {
      case "junction":
        return {
          isDirectory: false,
          isFile: false,
          isSymbolicLink: true,
          linkTarget: junction.target,
        };
      case "directory":
        break;
      case "absent":
        break;
      case "error":
        throw junction.error;
    }
  }
  return entryInfo;
}
//@ chunk-xjnnz630.js:49755-49838 placement
async function classifyDirEntrySafe(dirPath, dirent) {
  try {
    return await classifyDirEntry(dirPath, dirent);
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
//@ chunk-xjnnz630.js:49838-50025 placement
async function removeLinkOrDir(entryPath) {
  let stats;
  try {
    stats = await lstat(entryPath);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
    return;
  }
  if (stats.isFile()) {
    if (stats.nlink > 1) await unlink(entryPath);
    return;
  }
  if (stats.isSymbolicLink()) {
    await unlink(entryPath);
    return;
  }
  await removeDirectoryTreeNoFollow(entryPath);
}
//@ chunk-xjnnz630.js:50025-50034 layout
var RM_CONCURRENCY = 16;
//@ chunk-xjnnz630.js:50034-50539 placement (2.1.88 match: isLocalMarketplaceSource, 0.272)
/**
 * 递归删除目录树（每批 16 个并发），不跟随符号链接（Windows 下也识别 junction）；删完发现目录又被写入时抛 ENOTEMPTY。旧版名 isLocalMarketplaceSource 是误配。
 */
async function removeDirectoryTreeNoFollow(source) {
  if ((await removePathEntry(source)) !== "directory") return;
  let stats;
  try {
    stats = await lstat(source);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
  if (
    !stats.isDirectory() ||
    stats.isSymbolicLink() ||
    (getPlatform() === "windows" && (await isWindowsJunction(source)))
  ) {
    await removePathEntry(source);
    return;
  }
  let names;
  try {
    names = await readdir(source);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  for (let offset = 0; offset < names.length; offset += RM_CONCURRENCY)
    await Promise.all(
      names
        .slice(offset, offset + RM_CONCURRENCY)
        .map((childName) => removeDirectoryTreeNoFollow(join(source, childName))),
    );
  if ((await removePathEntry(source)) === "directory")
    throw Object.assign(Error("directory refilled during removal"), {
      code: "ENOTEMPTY",
      path: source,
    });
}
//@ chunk-xjnnz630.js:50722-50823 placement
/**
 * 检查路径类型，出错就抛，类型为 junction（Windows 目录联接）时返回 true。
 */
async function isWindowsJunction(source) {
  let junction = await readJunction(source);
  if (junction.kind === "error") throw junction.error;
  return junction.kind === "junction";
}
export {
  removePathEntry,
  removeDirectoryTreeNoFollow,
  classifyDirEntry,
  classifyDirEntrySafe,
  removeLinkOrDir,
};
