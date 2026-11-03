/**
 * utils/fsRemove.ts
 *
 * 2.1.316 新增：文件/目录删除辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jhrww53q.js (6)
 * attribution: placement 5, layout 1
 */
import {
  unlink,
  unlink as unlink_2,
  rmdir,
  lstat,
  lstat as lstat_2,
  readdir,
  readdir as readdir_2,
} from "fs/promises";
import { join, join as join_2 } from "path";
import { getErrnoCode, isENOENT } from "./errors.js";
import { safeResolvePath_2 } from "./fsOperations.js";
import { getPlatform } from "./platform.js";
import { readJunction } from "./fsJunctions.js";
import { isWindowsJunction } from "./_new/isWindowsJunction.js";

//@ chunk-jhrww53q.js:47118-47434 placement
async function removePathEntry(o) {
  try {
    return (await unlink_2(o), "removed");
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return "absent";
    try {
      return (await rmdir(o), "removed");
    } catch (error_2) {
      let E = getErrnoCode(error_2);
      if (E === "ENOTEMPTY" || E === "EEXIST") return "directory";
      if (E === "ENOENT") {
        if (
          await lstat_2(o).then(
            () => !1,
            (r) => getErrnoCode(r) === "ENOENT",
          )
        )
          return "absent";
        throw error;
      }
      throw E === "ENOTDIR" ? error : error_2;
    }
  }
}
//@ chunk-jhrww53q.js:47579-48073 placement
async function classifyDirEntry(o, t) {
  let _;
  if (!safeResolvePath_2(t))
    _ = { isDirectory: t.isDirectory(), isFile: t.isFile(), isSymbolicLink: t.isSymbolicLink() };
  else {
    let E = await lstat(join_2(o, t.name));
    _ = {
      isDirectory: E.isDirectory(),
      isFile: E.isFile(),
      isSymbolicLink: E.isSymbolicLink(),
      size: E.size,
    };
  }
  if (_.isDirectory && getPlatform() === "windows") {
    let E = await readJunction(join_2(o, t.name));
    switch (E.kind) {
      case "junction":
        return { isDirectory: !1, isFile: !1, isSymbolicLink: !0, linkTarget: E.target };
      case "directory":
        break;
      case "absent":
        break;
      case "error":
        throw E.error;
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
/**
 * 递归删除目录树（每批 16 个并发），不跟随符号链接（Windows 下也识别 junction）；删完发现目录又被写入时抛 ENOTEMPTY。旧版名 isLocalMarketplaceSource 是误配。
 */
//@ chunk-jhrww53q.js:48352-48857 placement = isLocalMarketplaceSource (0.272)
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
    E = await readdir_2(source);
  } catch (error) {
    let n = getErrnoCode(error);
    if (n === "ENOENT" || n === "ENOTDIR") return;
    throw error;
  }
  for (let r = 0; r < E.length; r += RM_CONCURRENCY)
    await Promise.all(
      E.slice(r, r + RM_CONCURRENCY).map((n) => removeDirectoryTreeNoFollow(join_2(source, n))),
    );
  if ((await removePathEntry(source)) === "directory")
    throw Object.assign(Error("directory refilled during removal"), { code: "ENOTEMPTY", path: source });
}

export {
  removeDirectoryTreeNoFollow,
  classifyDirEntry,
  classifyDirEntrySafe,
  removePathEntry,
  removeLinkOrDir,
};
