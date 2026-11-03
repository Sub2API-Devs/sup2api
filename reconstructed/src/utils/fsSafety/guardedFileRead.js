/**
 * utils/fsSafety/guardedFileRead.ts
 *
 * 2.1.316 新增：带校验地读取文件（不跟随链接、nlink、句柄路径核对）；按 BOM/编码检测解码文本等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (6)
 * attribution: placement 6
 */
import {
  constants,
  constants as constants_2,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  watchFile,
} from "fs";
import * as fsPromisesModule from "fs/promises";
import { getPdfOpenFlags } from "../pdf.js";
import { getErrnoCode } from "../errors.js";
import { detectEncodingFromBom } from "../fileRead.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { getPlatform } from "../platform.js";

/**
 * 带校验地读取文件（不跟随链接、nlink、句柄路径核对）。
 */
//@ chunk-t0gq9gyw.js:57275-58517 placement
async function readFileGuarded(e, n, r) {
  let o = r?.fromTail === !0 ? "unreadable" : null,
    s;
  try {
    let a = r?.noFollow ? (constants_2.O_NOFOLLOW ?? 0) : 0;
    s = await fsPromisesModule.open(e, getPdfOpenFlags("linux") | a);
    let stats = await s.stat();
    if (!stats.isFile()) return o;
    if (r?.requireNlink1 && stats.nlink !== 1) return o;
    if (r?.verifyHandlePath) {
      let E = null;
      if (
        ((E = await fsPromisesModule.readlink(`/proc/self/fd/${s.fd}`).catch(() => null)),
        E !== null && E.endsWith(" (deleted)"))
      )
        return o;
      if (E === null) {
        E = await fsPromisesModule.realpath(e);
        let stats_2 = await fsPromisesModule.stat(E);
        if (stats_2.dev !== stats.dev || stats_2.ino !== stats.ino) return o;
      }
      if (!r.verifyHandlePath(E)) return o;
    }
    if (r?.fromTail === !0) {
      let E = stats.size > n ? stats.size - n : 0,
        alloc = Buffer.alloc(stats.size - E),
        b = await readIntoBuffer(s, alloc, E),
        v = decodeText(alloc.subarray(0, b), r.sniffEncoding),
        _ = E + b;
      if (E === 0) return { content: v, truncated: !1, end: _ };
      let index = v.indexOf(`
`);
      return { content: index === -1 ? "" : v.slice(index + 1), truncated: !0, end: _ };
    }
    let min = Math.min(stats.size, n + 1),
      alloc = Buffer.alloc(min),
      y = await readIntoBuffer(s, alloc, 0);
    if (r?.sniffEncoding === !0) {
      let E = stats.size > n ? Math.min(y, n) : y,
        chunk = alloc.subarray(0, E),
        b = decodeText(chunk, !0),
        v = stats.size > n,
        _ = v
          ? `${b}
\u2026[truncated at ${n} bytes of ${stats.size} bytes]`
          : b;
      return r.withBytes === !0 ? { content: _, bytes: chunk, truncated: v } : _;
    }
    let w = decodeText(alloc.subarray(0, y), !1);
    return w.length > n
      ? `${w.slice(0, n)}
\u2026[truncated at ${n} chars of ${stats.size} bytes]`
      : w;
  } catch (error) {
    return isMissingPathError(error) ? null : o;
  } finally {
    await s?.close().catch(() => {
      return;
    });
  }
}
/**
 * 错误是否为路径不存在。
 */
//@ chunk-t0gq9gyw.js:58517-58579 placement = isRealPathWithinTeamDir (1)
function isMissingPathError(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
/**
 * 从句柄指定位置读满缓冲区，返回实际读取的字节数。
 */
//@ chunk-t0gq9gyw.js:58579-58709 placement
async function readIntoBuffer(e, n, r) {
  let o = 0;
  while (o < n.length) {
    let { bytesRead: bytesRead } = await e.read(n, o, n.length - o, r + o);
    if (bytesRead === 0) break;
    o += bytesRead;
  }
  return o;
}
/**
 * 按 BOM/编码检测解码文本。
 */
//@ chunk-t0gq9gyw.js:58709-59039 placement
function decodeText(e, n) {
  if (n !== !0) return e.toString("utf8");
  let r = detectEncodingFromBom(e),
    o = 0;
  if (r === "utf8") {
    let chunk = e.subarray(0, Math.min(e.length, 512)),
      c = 0,
      u = 0;
    for (let p = 0; p < chunk.length; p++)
      if (chunk[p] === 0)
        if (p % 2 === 0) c++;
        else u++;
    if (chunk.length >= 8 && (c + u) * 4 > chunk.length) ((r = "utf16le"), (o = c > u ? 1 : 0));
  }
  let str = e.subarray(o).toString(r);
  return str.charCodeAt(0) === 65279 ? str.slice(1) : str;
}
//@ chunk-t0gq9gyw.js:59262-59360 placement
function NMn(e, n, r) {
  let o = (s, a) => {
    try {
      r(s, a);
    } catch (error) {
      logError(error);
    }
  };
  try {
    watchFile(e, n, o);
  } catch (error) {
    logError(error);
  }
  return o;
}
//@ chunk-t0gq9gyw.js:59360-59431 placement
function uQt() {
  return env.CLAUDE_CODE_CONFIG_WATCH_EVENTS && getPlatform() === "linux";
}

export { uQt, NMn, isMissingPathError, readFileGuarded };
