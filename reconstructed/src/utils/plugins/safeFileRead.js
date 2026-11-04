/**
 * utils/plugins/safeFileRead.ts
 *
 * 插件文件安全读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (6)
 * attribution: placement 6
 */
import { lstat, realpath, open } from "fs/promises";
import "path";
import * as pathModule_2 from "path";
import { getErrnoCode } from "../errors.js";
import { isSubpathOf } from "../pathPrefix.js";
import { ONE_MIB } from "./schemas.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";

//@ chunk-s61vbvea.js:459495-459508 placement
var MAX_SAFE_FILE_READ_BYTES = 65536;
//@ chunk-s61vbvea.js:459508-459585 placement
/**
 * isDirectoryOrFalse：目录判断（失败为假）。
 */
async function isDirectoryOrFalse(path) {
  return (await lstat(path).catch(() => null))?.isDirectory() === true;
}
//@ chunk-s61vbvea.js:459585-460009 placement
async function readPluginFileSafe(root, target) {
  let current = root;
  for (let segment of pathModule_2.relative(root, target).split(pathModule_2.sep).filter(Boolean)) {
    current = pathModule_2.join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "refused";
    }
    if (!stat.isDirectory()) return stat.isSymbolicLink() ? "refused" : "not-a-directory";
  }
  let [realRoot, realTarget] = await Promise.all([
    realpath(root).catch(() => null),
    realpath(target).catch(() => null),
  ]);
  if (realRoot === null || realTarget === null) return "refused";
  return isSubpathOf(realRoot, realTarget, true) ? "ok" : "refused";
}
//@ chunk-s61vbvea.js:460009-460086 placement
/**
 * mcpAuthCacheContent：MCP 认证缓存内容。
 */
async function readSmallFileText(path) {
  let mcpAuthCache = await getMcpAuthCache(path);
  return mcpAuthCache.kind === "ok" ? mcpAuthCache.content : undefined;
}
//@ chunk-s61vbvea.js:460086-460202 placement = getMcpAuthCache (0.79)
async function getMcpAuthCache(path, maxBytes = ONE_MIB) {
  let regularFileUpTo = await readRegularFileUpTo(path, maxBytes);
  return regularFileUpTo.kind === "ok"
    ? {
        kind: "ok",
        content: regularFileUpTo.bytes.toString("utf-8"),
      }
    : regularFileUpTo;
}
//@ chunk-s61vbvea.js:460202-460728 placement
/**
 * 读取普通文件（lstat 与打开后都确认是普通文件），分块读到上限 n；不存在返回 absent，非普通文件 refused，超限 too-large，否则 ok 与内容。
 */
async function readRegularFileUpTo(path, maxBytes) {
  let stat;
  try {
    stat = await lstat(path);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return {
        kind: "absent",
        code: errnoCode,
      };
    throw error;
  }
  if (!stat.isFile())
    return {
      kind: "refused",
    };
  let handle;
  try {
    handle = await open(path, readOnlyNoFollowFlags());
    if (!(await handle.stat()).isFile())
      return {
        kind: "refused",
      };
    let chunks = [];
    let total = 0;
    while (total <= maxBytes) {
      let chunk = Buffer.alloc(Math.min(MAX_SAFE_FILE_READ_BYTES, maxBytes + 1 - total));
      let { bytesRead } = await handle.read(chunk, 0, chunk.length);
      if (bytesRead === 0) break;
      chunks.push(chunk.subarray(0, bytesRead));
      total += bytesRead;
    }
    if (total > maxBytes)
      return {
        kind: "too-large",
      };
    return {
      kind: "ok",
      bytes: Buffer.concat(chunks, total),
    };
  } finally {
    await handle?.close().catch(() => {
      return;
    });
  }
}
export { getMcpAuthCache, readRegularFileUpTo, isDirectoryOrFalse, readPluginFileSafe, readSmallFileText };
