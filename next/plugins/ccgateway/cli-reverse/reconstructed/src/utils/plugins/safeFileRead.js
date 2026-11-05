/**
 * utils/plugins/safeFileRead.ts
 *
 * 插件文件安全读取（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3xs5443t.js (6), chunk-xjnnz630.js (1)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, realpath, open } from "fs/promises";
import * as pathModule from "path";
import { getPlatform } from "../platform.js";
import { readJunction } from "../fsJunctions.js";
import { getErrnoCode } from "../errors.js";
import { isSubpathOf } from "../pathPrefix.js";
import { ONE_MIB } from "./schemas.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";

//@ chunk-xjnnz630.js:49676-49755 placement
/**
 * 路径是否为 Windows 目录联接（junction）。
 */
async function isJunction(path) {
  return getPlatform() === "windows" && (await readJunction(path)).kind === "junction";
}
//@ chunk-3xs5443t.js:4727-4740 placement
var MAX_SAFE_FILE_READ_BYTES = 65536;
//@ chunk-3xs5443t.js:4740-4832 placement
/**
 * isDirectoryOrFalse：目录判断（失败为假）。
 */
async function isDirectoryOrFalse(path) {
  return (await lstat(path).catch(() => null))?.isDirectory() === true && !(await isJunction(path));
}
//@ chunk-3xs5443t.js:4832-5285 placement
async function readPluginFileSafe(root, target) {
  let current = root;
  for (let segment of pathModule.relative(root, target).split(pathModule.sep).filter(Boolean)) {
    current = pathModule.join(current, segment);
    let stat;
    try {
      stat = await lstat(current);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "refused";
    }
    if (!stat.isDirectory()) return stat.isSymbolicLink() ? "refused" : "not-a-directory";
    if (await isJunction(current)) return "refused";
  }
  let [realRoot, realTarget] = await Promise.all([
    realpath(root).catch(() => null),
    realpath(target).catch(() => null),
  ]);
  if (realRoot === null || realTarget === null) return "refused";
  return isSubpathOf(realRoot, realTarget, true) ? "ok" : "refused";
}
//@ chunk-3xs5443t.js:5285-5362 placement
/**
 * mcpAuthCacheContent：MCP 认证缓存内容。
 */
async function readSmallFileText(path) {
  let mcpAuthCache = await getMcpAuthCache(path);
  return mcpAuthCache.kind === "ok" ? mcpAuthCache.content : undefined;
}
//@ chunk-3xs5443t.js:5362-5478 placement (2.1.88 match: getMcpAuthCache, 0.792)
async function getMcpAuthCache(path, maxBytes = ONE_MIB) {
  let regularFileUpTo = await readRegularFileUpTo(path, maxBytes);
  return regularFileUpTo.kind === "ok"
    ? {
        kind: "ok",
        content: regularFileUpTo.bytes.toString("utf-8"),
      }
    : regularFileUpTo;
}
//@ chunk-3xs5443t.js:5478-6004 placement
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
export { readPluginFileSafe, getMcpAuthCache, isDirectoryOrFalse, readSmallFileText, readRegularFileUpTo };
