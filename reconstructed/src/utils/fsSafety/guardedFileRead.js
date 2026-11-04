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
async function readFileGuarded(filePath, maxBytes, options) {
  let refusalFallback = options?.fromTail === true ? "unreadable" : null;
  let handle;
  try {
    let noFollowFlag = options?.noFollow ? (constants.O_NOFOLLOW ?? 0) : 0;
    handle = await fsPromisesModule.open(filePath, getPdfOpenFlags("linux") | noFollowFlag);
    let stats = await handle.stat();
    if (!stats.isFile()) return refusalFallback;
    if (options?.requireNlink1 && stats.nlink !== 1) return refusalFallback;
    if (options?.verifyHandlePath) {
      let fdPath = null;
      fdPath = await fsPromisesModule.readlink(`/proc/self/fd/${handle.fd}`).catch(() => null);
      if (fdPath !== null && fdPath.endsWith(" (deleted)")) return refusalFallback;
      if (fdPath === null) {
        fdPath = await fsPromisesModule.realpath(filePath);
        let stats_2 = await fsPromisesModule.stat(fdPath);
        if (stats_2.dev !== stats.dev || stats_2.ino !== stats.ino) return refusalFallback;
      }
      if (!options.verifyHandlePath(fdPath)) return refusalFallback;
    }
    if (options?.fromTail === true) {
      let tailStart = stats.size > maxBytes ? stats.size - maxBytes : 0;
      let tailBuffer = Buffer.alloc(stats.size - tailStart);
      let intoBuffer = await readIntoBuffer(handle, tailBuffer, tailStart);
      let tailText = decodeText(tailBuffer.subarray(0, intoBuffer), options.sniffEncoding);
      let end = tailStart + intoBuffer;
      if (tailStart === 0)
        return {
          content: tailText,
          truncated: false,
          end,
        };
      let index = tailText.indexOf(`
`);
      return {
        content: index === -1 ? "" : tailText.slice(index + 1),
        truncated: true,
        end,
      };
    }
    let min = Math.min(stats.size, maxBytes + 1);
    let headBuffer = Buffer.alloc(min);
    let intoBuffer = await readIntoBuffer(handle, headBuffer, 0);
    if (options?.sniffEncoding === true) {
      let prefixBytes = stats.size > maxBytes ? Math.min(intoBuffer, maxBytes) : intoBuffer;
      let buffer = headBuffer.subarray(0, prefixBytes);
      let prefixText = decodeText(buffer, true);
      let isTruncated = stats.size > maxBytes;
      let content = isTruncated
        ? `${prefixText}
\u2026[truncated at ${maxBytes} bytes of ${stats.size} bytes]`
        : prefixText;
      return options.withBytes === true
        ? {
            content,
            bytes: buffer,
            truncated: isTruncated,
          }
        : content;
    }
    let decoded = decodeText(headBuffer.subarray(0, intoBuffer), false);
    return decoded.length > maxBytes
      ? `${decoded.slice(0, maxBytes)}
\u2026[truncated at ${maxBytes} chars of ${stats.size} bytes]`
      : decoded;
  } catch (error) {
    return isMissingPathError(error) ? null : refusalFallback;
  } finally {
    await handle?.close().catch(() => {
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
async function readIntoBuffer(handle, buffer, startOffset) {
  let totalRead = 0;
  while (totalRead < buffer.length) {
    let { bytesRead } = await handle.read(
      buffer,
      totalRead,
      buffer.length - totalRead,
      startOffset + totalRead,
    );
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return totalRead;
}
//@ chunk-t0gq9gyw.js:58709-59039 placement
/**
 * 按 BOM/编码检测解码文本。
 */
function decodeText(buffer, sniffEncoding) {
  if (sniffEncoding !== true) return buffer.toString("utf8");
  let encodingFromBom = detectEncodingFromBom(buffer);
  let byteOffset = 0;
  if (encodingFromBom === "utf8") {
    let chunk = buffer.subarray(0, Math.min(buffer.length, 512));
    let evenNulCount = 0;
    let oddNulCount = 0;
    for (let j = 0; j < chunk.length; j++)
      if (chunk[j] === 0)
        if (j % 2 === 0) evenNulCount++;
        else oddNulCount++;
    if (chunk.length >= 8 && (evenNulCount + oddNulCount) * 4 > chunk.length) {
      encodingFromBom = "utf16le";
      byteOffset = evenNulCount > oddNulCount ? 1 : 0;
    }
  }
  let str = buffer.subarray(byteOffset).toString(encodingFromBom);
  return str.charCodeAt(0) === 65279 ? str.slice(1) : str;
}
//@ chunk-t0gq9gyw.js:59262-59360 placement
/**
 * 安全地注册文件监听（watchFile），回调异常只记录不外抛，返回包装后的回调。
 */
function watchFileSafe(filePath, options, listener) {
  let safeListener = (curr, prev) => {
    try {
      listener(curr, prev);
    } catch (error) {
      logError(error);
    }
  };
  try {
    watchFile(filePath, options, safeListener);
  } catch (error) {
    logError(error);
  }
  return safeListener;
}
//@ chunk-t0gq9gyw.js:59360-59431 placement
/**
 * 判断配置监听事件开关是否开启且平台为 linux。
 */
function isConfigWatchEventsEnabled() {
  return env.CLAUDE_CODE_CONFIG_WATCH_EVENTS && getPlatform() === "linux";
}
export { isConfigWatchEventsEnabled, watchFileSafe, isMissingPathError, readFileGuarded };
