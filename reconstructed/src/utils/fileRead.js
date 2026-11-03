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

/**
 * 读取文件时若经过符号链接则记调试日志。
 */
//@ chunk-7r5y3c3p.js:310-431 fingerprint = readFileSyncWithMetadata (0.755)
function readFileSyncWithMetadata(n, e) {
  if (!mayWriteDebugLog()) return;
  let { resolvedPath: resolvedPath, isSymlink: isSymlink } = safeResolvePath(n, e);
  if (isSymlink) logForDebugging(`Reading through symlink: ${e} -> ${resolvedPath}`);
}
/**
 * statSync 后校验大小上限并返回 stats。
 */
//@ chunk-7r5y3c3p.js:431-489 placement = isFileWithinReadSizeLimit (1)
function isFileWithinReadSizeLimit(n, e, r) {
  let stats = n.statSync(e);
  return (assertReadableFile(stats, e, r), stats);
}
/**
 * 校验是普通文件且不超大小。
 */
//@ chunk-7r5y3c3p.js:489-920 placement
function assertReadableFile(n, e, r) {
  if (n.isDirectory())
    throw Object.assign(Error("EISDIR: illegal operation on a directory, read"), {
      code: "EISDIR",
      errno: -21,
      syscall: "read",
      path: e,
    });
  if (!n.isFile())
    throw Object.assign(Error("Not a regular file (device, FIFO, or socket)"), {
      code: "ERR_NOT_REGULAR_FILE",
      path: e,
    });
  if (r !== void 0 && n.size > r)
    throw Object.assign(Error("File exceeds maxBytes limit"), {
      code: "ERR_FILE_TOO_LARGE",
      path: e,
      size: n.size,
      maxBytes: r,
    });
}
/**
 * 拒绝多硬链接文件。
 */
//@ chunk-7r5y3c3p.js:920-1069 placement
function assertSingleLink(n, e) {
  if (n.isFile() && Number(n.nlink) > 1)
    throw Object.assign(Error("File has more than one hard link"), { code: "ERR_MULTIPLE_LINKS", path: e });
}
/**
 * 校验大小上限。
 */
//@ chunk-7r5y3c3p.js:1069-1228 placement
function assertWithinMaxBytes(n, e, r) {
  if (r === void 0) return;
  if (n > r)
    throw Object.assign(Error("File exceeds maxBytes limit"), {
      code: "ERR_FILE_TOO_LARGE",
      path: e,
      size: n,
      maxBytes: r,
    });
}
//@ chunk-7r5y3c3p.js:1228-1325 placement
function bde(n) {
  return n != null && typeof n === "object" && "code" in n && n.code === "ERR_NOT_REGULAR_FILE";
}
//@ chunk-7r5y3c3p.js:1325-1419 placement
function Cj(n) {
  return n != null && typeof n === "object" && "code" in n && n.code === "ERR_FILE_TOO_LARGE";
}
/**
 * 按 BOM 判断缓冲区编码（FF FE → utf16le，否则 utf8）；切分误归。
 */
//@ chunk-7r5y3c3p.js:1419-1611 placement = encodePowerShellCommand (0.748)
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
var c = 4096,
  E = 8000;
//@ chunk-7r5y3c3p.js:1629-1680 placement
function Vys(n) {
  return n.subarray(0, E).includes(0);
}
//@ chunk-7r5y3c3p.js:1680-1936 placement
function detectTextEncoding(n) {
  let e = detectEncodingFromBom(n.subarray(0, c));
  if (e !== "utf8") return { encoding: e };
  if (n.byteLength >= 2 && n[0] === 254 && n[1] === 255) return { encoding: e, notText: "utf16be" };
  if (Vys(n)) return { encoding: e, notText: "nul" };
  return isUtf8(n) ? { encoding: e } : { encoding: e, notText: "not_utf8" };
}
//@ chunk-7r5y3c3p.js:1936-2034 placement
function swr(n, e) {
  return e !== "" && n?.charCodeAt(0) === 65279 && e.charCodeAt(0) !== 65279 ? `\uFEFF${e}` : e;
}
/**
 * 按 BOM 解码并把 CRLF 换成 LF。
 */
//@ chunk-7r5y3c3p.js:2034-2166 placement
function decodeTextBuffer(n) {
  let e = detectEncodingFromBom(n.subarray(0, c));
  return Buffer.from(n.buffer, n.byteOffset, n.byteLength)
    .toString(e)
    .replaceAll(
      `\r
`,
      `
`,
    );
}
/**
 * 统计 CRLF 与 LF 数量，多数为 CRLF 时返回 "CRLF"，否则 "LF"。
 */
//@ chunk-7r5y3c3p.js:2264-2391 fingerprint = detectLineEndingsForString (1)
function detectLineEndingsForString(content) {
  let e = 0,
    r = 0;
  for (let i = 0; i < content.length; i++)
    if (
      content[i] ===
      `
`
    )
      if (i > 0 && content[i - 1] === "\r") e++;
      else r++;
  return e > r ? "CRLF" : "LF";
}
//@ chunk-7r5y3c3p.js:2391-2704 placement
function detectEncodingForResolvedPath(n, e, r) {
  let i = getFsImplementation();
  readFileSyncWithMetadata(i, n);
  let a = isFileWithinReadSizeLimit(i, n, e);
  r?.(a);
  let s = detectLineEndings(n),
    o;
  if (e === void 0) o = i.readFileSync(n, { encoding: s });
  else {
    let { buffer: buffer, bytesRead: bytesRead } = i.readSync(n, { length: e + 1 });
    (assertWithinMaxBytes(bytesRead, n, e), (o = buffer.subarray(0, bytesRead).toString(s)));
  }
  let u = detectLineEndingsForString(o.slice(0, 4096));
  return {
    content: o.replaceAll(
      `\r
`,
      `
`,
    ),
    encoding: s,
    lineEndings: u,
  };
}
//@ chunk-7r5y3c3p.js:2704-2749 placement
function readFileSync(n, e, r) {
  return detectEncodingForResolvedPath(n, e, r).content;
}
/**
 * 校验后读取文件。
 */
//@ chunk-7r5y3c3p.js:2749-2870 placement
async function readFileChecked(n, e) {
  let r = getFsImplementation();
  (readFileSyncWithMetadata(r, n), assertReadableFile(await r.stat(n), n, e));
  await using i = await open(n, nonblockingReadFlags());
  return await readFileHandleChecked(i, n, e);
}
//@ chunk-7r5y3c3p.js:2870-3152 placement
async function readFileHandleChecked(n, e, r) {
  assertReadableFile(await n.stat(), e, r);
  let i = r === void 0 ? await n.readFile() : await readHandleUpTo(n, r + 1, "file");
  assertWithinMaxBytes(i.length, e, r);
  let { encoding: encoding, notText: notText } = detectTextEncoding(i),
    str = i.toString(encoding),
    u = detectLineEndingsForString(str.slice(0, 4096));
  return {
    content: str.replaceAll(
      `\r
`,
      `
`,
    ),
    encoding: encoding,
    lineEndings: u,
    ...(notText && { notText: notText }),
  };
}

export {
  detectEncodingFromBom,
  detectEncodingForResolvedPath,
  readFileSync,
  bde,
  detectLineEndingsForString,
  readFileChecked,
  decodeTextBuffer,
  Cj,
  c,
  assertReadableFile,
  assertWithinMaxBytes,
  readFileHandleChecked,
  detectTextEncoding,
  swr,
  Vys,
  assertSingleLink,
};
