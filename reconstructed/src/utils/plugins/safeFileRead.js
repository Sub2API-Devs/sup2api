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
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  realpath,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
} from "fs/promises";
import * as pathModule from "path";
import * as pathModule_2 from "path";
import { getErrnoCode } from "../errors.js";
import { hm } from "../pathPrefix.js";
import { ONE_MIB } from "./schemas.js";
import { $c } from "../platformTargets.js";

//@ chunk-s61vbvea.js:459495-459508 placement
var iF = 65536;
//@ chunk-s61vbvea.js:459508-459585 placement
async function FF(e) {
  return (await lstat_6(e).catch(() => null))?.isDirectory() === !0;
}
//@ chunk-s61vbvea.js:459585-460009 placement
async function readPluginFileSafe(e, n) {
  let r = e;
  for (let y of pathModule.relative(e, n).split(pathModule.sep).filter(Boolean)) {
    r = pathModule.join(r, y);
    let S;
    try {
      S = await lstat_6(r);
    } catch (error) {
      let R = getErrnoCode(error);
      return R === "ENOENT" || R === "ENOTDIR" ? "absent" : "refused";
    }
    if (!S.isDirectory()) return S.isSymbolicLink() ? "refused" : "not-a-directory";
  }
  let [s, h] = await Promise.all([realpath_4(e).catch(() => null), realpath_4(n).catch(() => null)]);
  if (s === null || h === null) return "refused";
  return hm(s, h, !0) ? "ok" : "refused";
}
//@ chunk-s61vbvea.js:460009-460086 placement
async function ZB(e) {
  let n = await getMcpAuthCache(e);
  return n.kind === "ok" ? n.content : void 0;
}
//@ chunk-s61vbvea.js:460086-460202 placement = getMcpAuthCache (0.79)
async function getMcpAuthCache(e, n = ONE_MIB) {
  let r = await readRegularFileUpTo(e, n);
  return r.kind === "ok" ? { kind: "ok", content: r.bytes.toString("utf-8") } : r;
}
/**
 * 读取普通文件（lstat 与打开后都确认是普通文件），分块读到上限 n；不存在返回 absent，非普通文件 refused，超限 too-large，否则 ok 与内容。
 */
//@ chunk-s61vbvea.js:460202-460728 placement
async function readRegularFileUpTo(e, n) {
  let r;
  try {
    r = await lstat_6(e);
  } catch (error) {
    let y = getErrnoCode(error);
    if (y === "ENOENT" || y === "ENOTDIR") return { kind: "absent", code: y };
    throw error;
  }
  if (!r.isFile()) return { kind: "refused" };
  let s;
  try {
    if (((s = await open_7(e, $c())), !(await s.stat()).isFile())) return { kind: "refused" };
    let y = [],
      S = 0;
    while (S <= n) {
      let alloc = Buffer.alloc(Math.min(iF, n + 1 - S)),
        { bytesRead: bytesRead } = await s.read(alloc, 0, alloc.length);
      if (bytesRead === 0) break;
      (y.push(alloc.subarray(0, bytesRead)), (S += bytesRead));
    }
    if (S > n) return { kind: "too-large" };
    return { kind: "ok", bytes: Buffer.concat(y, S) };
  } finally {
    await s?.close().catch(() => {
      return;
    });
  }
}

export { getMcpAuthCache, readRegularFileUpTo, FF, readPluginFileSafe, ZB };
