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
async function isDirectoryOrFalse(e) {
  return (await lstat(e).catch(() => null))?.isDirectory() === true;
}
//@ chunk-s61vbvea.js:459585-460009 placement
async function readPluginFileSafe(e, n) {
  let r = e;
  for (let y of pathModule_2.relative(e, n).split(pathModule_2.sep).filter(Boolean)) {
    r = pathModule_2.join(r, y);
    let S;
    try {
      S = await lstat(r);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "absent" : "refused";
    }
    if (!S.isDirectory()) return S.isSymbolicLink() ? "refused" : "not-a-directory";
  }
  let [s, h] = await Promise.all([realpath(e).catch(() => null), realpath(n).catch(() => null)]);
  if (s === null || h === null) return "refused";
  return isSubpathOf(s, h, true) ? "ok" : "refused";
}
//@ chunk-s61vbvea.js:460009-460086 placement
/**
 * mcpAuthCacheContent：MCP 认证缓存内容。
 */
async function mcpAuthCacheContent(e) {
  let mcpAuthCache = await getMcpAuthCache(e);
  return mcpAuthCache.kind === "ok" ? mcpAuthCache.content : undefined;
}
//@ chunk-s61vbvea.js:460086-460202 placement = getMcpAuthCache (0.79)
async function getMcpAuthCache(e, n = ONE_MIB) {
  let regularFileUpTo = await readRegularFileUpTo(e, n);
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
async function readRegularFileUpTo(e, n) {
  let r;
  try {
    r = await lstat(e);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
      return {
        kind: "absent",
        code: errnoCode,
      };
    throw error;
  }
  if (!r.isFile())
    return {
      kind: "refused",
    };
  let s;
  try {
    s = await open(e, readOnlyNoFollowFlags());
    if (!(await s.stat()).isFile())
      return {
        kind: "refused",
      };
    let y = [];
    let S = 0;
    while (S <= n) {
      let w = Buffer.alloc(Math.min(MAX_SAFE_FILE_READ_BYTES, n + 1 - S));
      let { bytesRead } = await s.read(w, 0, w.length);
      if (bytesRead === 0) break;
      y.push(w.subarray(0, bytesRead));
      S += bytesRead;
    }
    if (S > n)
      return {
        kind: "too-large",
      };
    return {
      kind: "ok",
      bytes: Buffer.concat(y, S),
    };
  } finally {
    await s?.close().catch(() => {
      return;
    });
  }
}
export { getMcpAuthCache, readRegularFileUpTo, isDirectoryOrFalse, readPluginFileSafe, mcpAuthCacheContent };
