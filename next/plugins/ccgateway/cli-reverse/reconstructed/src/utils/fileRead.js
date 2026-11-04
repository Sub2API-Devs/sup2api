/**
 * utils/fileRead.ts
 *
 * 同步读文件元数据、行尾检测与 CRLF 还原
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fileRead.ts
 * pieces: chunk-7r5y3c3p.js (18)
 * attribution: fingerprint 2, placement 16
 */
import { isUtf8 } from "buffer";
import { open } from "fs/promises";
import { mayWriteDebugLog, logForDebugging } from "./debug.js";
import {
  safeResolvePath,
  getFsImplementation,
  nonblockingReadFlags,
  readHandleUpTo,
} from "./fsOperations.js";
import { detectLineEndings } from "./file.js";

//@ chunk-7r5y3c3p.js:310-431 fingerprint (2.1.88 match: readFileSyncWithMetadata, 0.755)
/**
 * 读取文件时若经过符号链接则记调试日志。
 */
function readFileSyncWithMetadata(fsImplementation, filePath) {
  if (!mayWriteDebugLog()) return;
  let { resolvedPath, isSymlink } = safeResolvePath(fsImplementation, filePath);
  if (isSymlink) logForDebugging(`Reading through symlink: ${filePath} -> ${resolvedPath}`);
}
//@ chunk-7r5y3c3p.js:431-489 placement (2.1.88 match: isFileWithinReadSizeLimit, 1)
/**
 * statSync 后校验大小上限并返回 stats。
 */
function isFileWithinReadSizeLimit(fsImplementation, filePath, maxBytes) {
  let stats = fsImplementation.statSync(filePath);
  assertReadableFile(stats, filePath, maxBytes);
  return stats;
}
//@ chunk-7r5y3c3p.js:489-920 placement
/**
 * 校验是普通文件且不超大小。
 */
function assertReadableFile(stats, path, maxBytes) {
  if (stats.isDirectory())
    throw Object.assign(Error("EISDIR: illegal operation on a directory, read"), {
      code: "EISDIR",
      errno: -21,
      syscall: "read",
      path,
    });
  if (!stats.isFile())
    throw Object.assign(Error("Not a regular file (device, FIFO, or socket)"), {
      code: "ERR_NOT_REGULAR_FILE",
      path,
    });
  if (maxBytes !== undefined && stats.size > maxBytes)
    throw Object.assign(Error("File exceeds maxBytes limit"), {
      code: "ERR_FILE_TOO_LARGE",
      path,
      size: stats.size,
      maxBytes,
    });
}
//@ chunk-7r5y3c3p.js:920-1069 placement
/**
 * 拒绝多硬链接文件。
 */
function assertSingleLink(stats, path) {
  if (stats.isFile() && Number(stats.nlink) > 1)
    throw Object.assign(Error("File has more than one hard link"), {
      code: "ERR_MULTIPLE_LINKS",
      path,
    });
}
//@ chunk-7r5y3c3p.js:1069-1228 placement
/**
 * 校验大小上限。
 */
function assertWithinMaxBytes(size, path, maxBytes) {
  if (maxBytes === undefined) return;
  if (size > maxBytes)
    throw Object.assign(Error("File exceeds maxBytes limit"), {
      code: "ERR_FILE_TOO_LARGE",
      path,
      size,
      maxBytes,
    });
}
//@ chunk-7r5y3c3p.js:1228-1325 placement
/**
 * 判断错误是否为 ERR_NOT_REGULAR_FILE（不是普通文件）。
 */
function isNotRegularFileError(error) {
  return (
    error != null && typeof error === "object" && "code" in error && error.code === "ERR_NOT_REGULAR_FILE"
  );
}
//@ chunk-7r5y3c3p.js:1325-1419 placement
/**
 * 判断错误是否为 ERR_FILE_TOO_LARGE（文件过大）。
 */
function isFileTooLargeError(error) {
  return error != null && typeof error === "object" && "code" in error && error.code === "ERR_FILE_TOO_LARGE";
}
//@ chunk-7r5y3c3p.js:1419-1611 placement (2.1.88 match: encodePowerShellCommand, 0.748)
/**
 * 按 BOM 判断缓冲区编码（FF FE → utf16le，否则 utf8）；切分误归。
 */
function detectEncodingFromBom(psCommand) {
  if (psCommand.byteLength === 0) return "utf8";
  if (psCommand.byteLength >= 2) {
    if (psCommand[0] === 255 && psCommand[1] === 254) return "utf16le";
  }
  if (psCommand.byteLength >= 3 && psCommand[0] === 239 && psCommand[1] === 187 && psCommand[2] === 191)
    return "utf8";
  return "utf8";
}
//@ chunk-7r5y3c3p.js:1611-1629 placement
/**
 * 读取文件时用于嗅探 BOM 的头部字节数。
 */
var BOM_SNIFF_BYTES = 4096;
var NUL_SCAN_BYTES = 8000;
//@ chunk-7r5y3c3p.js:1629-1680 placement
/**
 * 判断文件头部（前 NUL_SCAN_BYTES 字节）是否含 NUL，用于识别二进制文件。
 */
function hasNulByteInHead(buffer) {
  return buffer.subarray(0, NUL_SCAN_BYTES).includes(0);
}
//@ chunk-7r5y3c3p.js:1680-1936 placement
function detectTextEncoding(buffer) {
  let encodingFromBom = detectEncodingFromBom(buffer.subarray(0, BOM_SNIFF_BYTES));
  if (encodingFromBom !== "utf8")
    return {
      encoding: encodingFromBom,
    };
  if (buffer.byteLength >= 2 && buffer[0] === 254 && buffer[1] === 255)
    return {
      encoding: encodingFromBom,
      notText: "utf16be",
    };
  if (hasNulByteInHead(buffer))
    return {
      encoding: encodingFromBom,
      notText: "nul",
    };
  return isUtf8(buffer)
    ? {
        encoding: encodingFromBom,
      }
    : {
        encoding: encodingFromBom,
        notText: "not_utf8",
      };
}
//@ chunk-7r5y3c3p.js:1936-2034 placement
/**
 * 若原文本有 BOM 而解码结果丢了，重新补上 BOM 前缀。
 */
function preserveBomPrefix(originalText, decodedText) {
  return decodedText !== "" && originalText?.charCodeAt(0) === 65279 && decodedText.charCodeAt(0) !== 65279
    ? `\uFEFF${decodedText}`
    : decodedText;
}
//@ chunk-7r5y3c3p.js:2034-2166 placement
/**
 * 按 BOM 解码并把 CRLF 换成 LF。
 */
function decodeTextBuffer(buffer) {
  let encodingFromBom = detectEncodingFromBom(buffer.subarray(0, BOM_SNIFF_BYTES));
  return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    .toString(encodingFromBom)
    .replaceAll(
      `\r
`,
      `
`,
    );
}
//@ chunk-7r5y3c3p.js:2264-2391 fingerprint (2.1.88 match: detectLineEndingsForString, 1)
/**
 * 统计 CRLF 与 LF 数量，多数为 CRLF 时返回 "CRLF"，否则 "LF"。
 */
function detectLineEndingsForString(content) {
  let crlfCount = 0;
  let lfCount = 0;
  for (let index = 0; index < content.length; index++)
    if (
      content[index] ===
      `
`
    )
      if (index > 0 && content[index - 1] === "\r") crlfCount++;
      else lfCount++;
  return crlfCount > lfCount ? "CRLF" : "LF";
}
//@ chunk-7r5y3c3p.js:2391-2704 placement
function detectEncodingForResolvedPath(filePath, maxBytes, onStats) {
  let fsImplementation = getFsImplementation();
  readFileSyncWithMetadata(fsImplementation, filePath);
  let stats = isFileWithinReadSizeLimit(fsImplementation, filePath, maxBytes);
  onStats?.(stats);
  let encoding = detectLineEndings(filePath);
  let raw;
  if (maxBytes === undefined)
    raw = fsImplementation.readFileSync(filePath, {
      encoding,
    });
  else {
    let { buffer, bytesRead } = fsImplementation.readSync(filePath, {
      length: maxBytes + 1,
    });
    assertWithinMaxBytes(bytesRead, filePath, maxBytes);
    raw = buffer.subarray(0, bytesRead).toString(encoding);
  }
  let lineEndings = detectLineEndingsForString(raw.slice(0, 4096));
  return {
    content: raw.replaceAll(
      `\r
`,
      `
`,
    ),
    encoding,
    lineEndings,
  };
}
//@ chunk-7r5y3c3p.js:2704-2749 placement
function readFileSync(filePath, maxBytes, onStats) {
  return detectEncodingForResolvedPath(filePath, maxBytes, onStats).content;
}
//@ chunk-7r5y3c3p.js:2749-2870 placement
/**
 * 校验后读取文件。
 */
async function readFileChecked(filePath, maxBytes) {
  let fsImplementation = getFsImplementation();
  readFileSyncWithMetadata(fsImplementation, filePath);
  assertReadableFile(await fsImplementation.stat(filePath), filePath, maxBytes);
  await using handle = await open(filePath, nonblockingReadFlags());
  return await readFileHandleChecked(handle, filePath, maxBytes);
}
//@ chunk-7r5y3c3p.js:2870-3152 placement
async function readFileHandleChecked(handle, path, maxBytes) {
  assertReadableFile(await handle.stat(), path, maxBytes);
  let buffer =
    maxBytes === undefined ? await handle.readFile() : await readHandleUpTo(handle, maxBytes + 1, "file");
  assertWithinMaxBytes(buffer.length, path, maxBytes);
  let { encoding, notText } = detectTextEncoding(buffer);
  let str = buffer.toString(encoding);
  let lineEndings = detectLineEndingsForString(str.slice(0, 4096));
  return {
    content: str.replaceAll(
      `\r
`,
      `
`,
    ),
    encoding,
    lineEndings,
    ...(notText && {
      notText,
    }),
  };
}
export {
  detectEncodingFromBom,
  detectEncodingForResolvedPath,
  readFileSync,
  isNotRegularFileError,
  detectLineEndingsForString,
  readFileChecked,
  decodeTextBuffer,
  isFileTooLargeError,
  BOM_SNIFF_BYTES,
  assertReadableFile,
  assertWithinMaxBytes,
  readFileHandleChecked,
  detectTextEncoding,
  preserveBomPrefix,
  hasNulByteInHead,
  assertSingleLink,
};
