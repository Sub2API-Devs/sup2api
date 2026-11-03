/**
 * utils/fsRemove.ts
 *
 * 2.1.316 新增：文件/目录删除辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jhrww53q.js (8)
 * attribution: placement 7, layout 1
 */
import { unlink, rmdir, lstat, readdir } from "fs/promises";
import { join } from "path";
import { getErrnoCode, isENOENT } from "./errors.js";
import { safeResolvePath_2 } from "./fsOperations.js";
import { getPlatform } from "./platform.js";
import { readJunction } from "./fsJunctions.js";
import { classifyProtectedDir } from "./permissions/protectedDirs.js";

//@ chunk-jhrww53q.js:47118-47434 placement
async function removePathEntry(o) {
  try {
    await unlink(o);
    return "removed";
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return "absent";
    try {
      await rmdir(o);
      return "removed";
    } catch (error_2) {
      let errnoCode = getErrnoCode(error_2);
      if (errnoCode === "ENOTEMPTY" || errnoCode === "EEXIST") return "directory";
      if (errnoCode === "ENOENT") {
        if (
          await lstat(o).then(
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
//@ chunk-jhrww53q.js:47579-48073 placement
async function classifyDirEntry(o, t) {
  let _;
  if (!safeResolvePath_2(t))
    _ = {
      isDirectory: t.isDirectory(),
      isFile: t.isFile(),
      isSymbolicLink: t.isSymbolicLink(),
    };
  else {
    let E = await lstat(join(o, t.name));
    _ = {
      isDirectory: E.isDirectory(),
      isFile: E.isFile(),
      isSymbolicLink: E.isSymbolicLink(),
      size: E.size,
    };
  }
  if (_.isDirectory && getPlatform() === "windows") {
    let junction = await readJunction(join(o, t.name));
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
  return _;
}
//@ chunk-jhrww53q.js:48073-48156 placement
async function classifyDirEntrySafe(o, t) {
  try {
    return await classifyDirEntry(o, t);
  } catch (error) {
    if (isENOENT(error)) return;
    throw error;
  }
}
//@ chunk-jhrww53q.js:48156-48343 placement
async function removeLinkOrDir(o) {
  let t;
  try {
    t = await lstat(o);
  } catch (error) {
    if (getErrnoCode(error) !== "ENOENT") throw error;
    return;
  }
  if (t.isFile()) {
    if (t.nlink > 1) await unlink(o);
    return;
  }
  if (t.isSymbolicLink()) {
    await unlink(o);
    return;
  }
  await removeDirectoryTreeNoFollow(o);
}
//@ chunk-jhrww53q.js:48343-48352 layout
var RM_CONCURRENCY = 16;
//@ chunk-jhrww53q.js:48352-48857 placement = isLocalMarketplaceSource (0.272)
/**
 * 递归删除目录树（每批 16 个并发），不跟随符号链接（Windows 下也识别 junction）；删完发现目录又被写入时抛 ENOTEMPTY。旧版名 isLocalMarketplaceSource 是误配。
 */
async function removeDirectoryTreeNoFollow(source) {
  if ((await removePathEntry(source)) !== "directory") return;
  let _;
  try {
    _ = await lstat(source);
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    throw error;
  }
  if (
    !_.isDirectory() ||
    _.isSymbolicLink() ||
    (getPlatform() === "windows" && (await isWindowsJunction(source)))
  ) {
    await removePathEntry(source);
    return;
  }
  let E;
  try {
    E = await readdir(source);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") return;
    throw error;
  }
  for (let r = 0; r < E.length; r += RM_CONCURRENCY)
    await Promise.all(
      E.slice(r, r + RM_CONCURRENCY).map((n) => removeDirectoryTreeNoFollow(join(source, n))),
    );
  if ((await removePathEntry(source)) === "directory")
    throw Object.assign(Error("directory refilled during removal"), {
      code: "ENOTEMPTY",
      path: source,
    });
}
//@ chunk-jhrww53q.js:49040-49140 placement
/**
 * 检查路径类型，出错就抛，类型为 junction（Windows 目录联接）时返回 true。
 */
async function isWindowsJunction(source) {
  let junction = await readJunction(source);
  if (junction.kind === "error") throw junction.error;
  return junction.kind === "junction";
}
//@ chunk-jhrww53q.js:49190-49257 placement
/**
 * 从目录列表中过滤掉受保护的目录（当前无引用）。
 */
function filterUnprotectedDirs(o) {
  let cwd = process.cwd();
  return o.filter((_) => !classifyProtectedDir(_, cwd));
}
export {
  removeDirectoryTreeNoFollow,
  classifyDirEntry,
  classifyDirEntrySafe,
  removePathEntry,
  removeLinkOrDir,
};
