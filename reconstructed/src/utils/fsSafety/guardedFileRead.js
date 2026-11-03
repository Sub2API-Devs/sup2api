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
import { constants, watchFile } from "fs";
import * as fsPromisesModule from "fs/promises";
import { getPdfOpenFlags } from "../pdf.js";
import { getErrnoCode } from "../errors.js";
import { detectEncodingFromBom } from "../fileRead.js";
import { logError } from "../log.js";
import { env } from "../env.js";
import { getPlatform } from "../platform.js";

//@ chunk-t0gq9gyw.js:57275-58517 placement
/**
 * 带校验地读取文件（不跟随链接、nlink、句柄路径核对）。
 */
async function readFileGuarded(e, n, r) {
  let o = r?.fromTail === true ? "unreadable" : null;
  let s;
  try {
    let a = r?.noFollow ? (constants.O_NOFOLLOW ?? 0) : 0;
    s = await fsPromisesModule.open(e, getPdfOpenFlags("linux") | a);
    let stats = await s.stat();
    if (!stats.isFile()) return o;
    if (r?.requireNlink1 && stats.nlink !== 1) return o;
    if (r?.verifyHandlePath) {
      let E = null;
      E = await fsPromisesModule.readlink(`/proc/self/fd/${s.fd}`).catch(() => null);
      if (E !== null && E.endsWith(" (deleted)")) return o;
      if (E === null) {
        E = await fsPromisesModule.realpath(e);
        let stats_2 = await fsPromisesModule.stat(E);
        if (stats_2.dev !== stats.dev || stats_2.ino !== stats.ino) return o;
      }
      if (!r.verifyHandlePath(E)) return o;
    }
    if (r?.fromTail === true) {
      let E = stats.size > n ? stats.size - n : 0;
      let h = Buffer.alloc(stats.size - E);
      let intoBuffer = await readIntoBuffer(s, h, E);
      let v = decodeText(h.subarray(0, intoBuffer), r.sniffEncoding);
      let end = E + intoBuffer;
      if (E === 0)
        return {
          content: v,
          truncated: false,
          end,
        };
      let index = v.indexOf(`
`);
      return {
        content: index === -1 ? "" : v.slice(index + 1),
        truncated: true,
        end,
      };
    }
    let min = Math.min(stats.size, n + 1);
    let p = Buffer.alloc(min);
    let intoBuffer = await readIntoBuffer(s, p, 0);
    if (r?.sniffEncoding === true) {
      let E = stats.size > n ? Math.min(intoBuffer, n) : intoBuffer;
      let chunk = p.subarray(0, E);
      let b = decodeText(chunk, true);
      let v = stats.size > n;
      let _ = v
        ? `${b}
\u2026[truncated at ${n} bytes of ${stats.size} bytes]`
        : b;
      return r.withBytes === true
        ? {
            content: _,
            bytes: chunk,
            truncated: v,
          }
        : _;
    }
    let w = decodeText(p.subarray(0, intoBuffer), false);
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
//@ chunk-t0gq9gyw.js:58517-58579 placement = isRealPathWithinTeamDir (1)
/**
 * 错误是否为路径不存在。
 */
function isMissingPathError(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-t0gq9gyw.js:58579-58709 placement
/**
 * 从句柄指定位置读满缓冲区，返回实际读取的字节数。
 */
async function readIntoBuffer(e, n, r) {
  let o = 0;
  while (o < n.length) {
    let { bytesRead } = await e.read(n, o, n.length - o, r + o);
    if (bytesRead === 0) break;
    o += bytesRead;
  }
  return o;
}
//@ chunk-t0gq9gyw.js:58709-59039 placement
/**
 * 按 BOM/编码检测解码文本。
 */
function decodeText(e, n) {
  if (n !== true) return e.toString("utf8");
  let encodingFromBom = detectEncodingFromBom(e);
  let o = 0;
  if (encodingFromBom === "utf8") {
    let chunk = e.subarray(0, Math.min(e.length, 512));
    let c = 0;
    let u = 0;
    for (let j = 0; j < chunk.length; j++)
      if (chunk[j] === 0)
        if (j % 2 === 0) c++;
        else u++;
    if (chunk.length >= 8 && (c + u) * 4 > chunk.length) {
      encodingFromBom = "utf16le";
      o = c > u ? 1 : 0;
    }
  }
  let str = e.subarray(o).toString(encodingFromBom);
  return str.charCodeAt(0) === 65279 ? str.slice(1) : str;
}
//@ chunk-t0gq9gyw.js:59262-59360 placement
/**
 * 安全地注册文件监听（watchFile），回调异常只记录不外抛，返回包装后的回调。
 */
function watchFileSafe(e, n, r) {
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
/**
 * 判断配置监听事件开关是否开启且平台为 linux。
 */
function isConfigWatchEventsEnabled() {
  return env.CLAUDE_CODE_CONFIG_WATCH_EVENTS && getPlatform() === "linux";
}
export { isConfigWatchEventsEnabled, watchFileSafe, isMissingPathError, readFileGuarded };
