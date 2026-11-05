/**
 * utils/dxt/zip.ts
 *
 * 并入已有模块：读取 ZIP 中央目录（含 ZIP64）；解压文件默认权限。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/dxt/zip.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-pzdhtgn4.js (13)
 * attribution: fingerprint 5, layout 1, placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { normalize, isAbsolute } from "path";
import { inflateRawSync } from "zlib";
import { containsPathTraversal } from "../path.js";
import { printableName } from "../printableName.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { getFsImplementation } from "../fsOperations.js";
import { extractZipToDirectory } from "../plugins/zipCache.js";

//@ chunk-pzdhtgn4.js:6386-6488 fingerprint (2.1.88 match: LIMITS, 1)
var LIMITS = {
  MAX_FILE_SIZE: 536870912,
  MAX_TOTAL_SIZE: 1073741824,
  MAX_FILE_COUNT: 1e5,
  MAX_COMPRESSION_RATIO: 50,
};
//@ chunk-pzdhtgn4.js:6488-6626 layout
/**
 * zip 条目路径是否安全（无穿越、非绝对路径）。
 */
function isSafeZipPath(filePath) {
  if (containsPathTraversal(filePath)) return false;
  for (let segment of filePath.split(/[/\\]/)) if (/^\.\. [ .]*$/.test(segment)) return false;
  let normalized = normalize(filePath);
  if (isAbsolute(normalized)) return false;
  return true;
}
//@ chunk-pzdhtgn4.js:6626-7505 fingerprint (2.1.88 match: validateZipFile, 1)
/**
 * 逐条校验 zip 条目：文件数、单文件与总解压大小、压缩比上限（LIMITS），路径必须安全。
 */
function validateZipFile(file, state) {
  state.fileCount++;
  let error;
  if (state.fileCount > LIMITS.MAX_FILE_COUNT)
    error = `Archive contains too many files: ${state.fileCount} (max: ${LIMITS.MAX_FILE_COUNT})`;
  let name = printableName(file.name, 120);
  if (!isSafeZipPath(file.name))
    error = `Unsafe file path detected: "${name}". Path traversal or absolute paths are not allowed.`;
  let fileSize = file.originalSize || 0;
  if (fileSize > LIMITS.MAX_FILE_SIZE)
    error = `File "${name}" is too large: ${Math.round(fileSize / 1024 / 1024)}MB (max: ${Math.round(LIMITS.MAX_FILE_SIZE / 1024 / 1024)}MB)`;
  state.totalUncompressedSize += fileSize;
  if (state.totalUncompressedSize > LIMITS.MAX_TOTAL_SIZE)
    error = `Archive total size is too large: ${Math.round(state.totalUncompressedSize / 1024 / 1024)}MB (max: ${Math.round(LIMITS.MAX_TOTAL_SIZE / 1024 / 1024)}MB)`;
  let currentRatio = state.totalUncompressedSize / state.compressedSize;
  if (currentRatio > LIMITS.MAX_COMPRESSION_RATIO)
    error = `Suspicious compression ratio detected: ${currentRatio.toFixed(1)}:1 (max: ${LIMITS.MAX_COMPRESSION_RATIO}:1). This may be a zip bomb.`;
  return error
    ? {
        isValid: false,
        error,
      }
    : {
        isValid: true,
      };
}
//@ chunk-pzdhtgn4.js:7505-7874 fingerprint (2.1.88 match: unzipFile, 0.849)
/**
 * 解压 zip 字节为 {路径: 内容}，解压过程中逐条做安全校验（防 zip 炸弹与路径穿越）。
 */
async function unzipFile(zipData) {
  let state = {
    fileCount: 0,
    totalUncompressedSize: 0,
    compressedSize: zipData.length,
    errors: [],
  };
  let result = readZipCentralDirectory(
    new Uint8Array(zipData.buffer, zipData.byteOffset, zipData.byteLength),
    (file) => {
      let validationResult = validateZipFile(file, state);
      if (!validationResult.isValid)
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          validationResult.error,
          "MCPB zip entry validation failed",
        );
    },
  );
  logForDebugging(
    `Zip extraction completed: ${state.fileCount} files, ${Math.round(state.totalUncompressedSize / 1024)}KB uncompressed`,
  );
  return result;
}
//@ chunk-pzdhtgn4.js:7874-7956 placement
/**
 * ZIP 中央目录结束记录（EOCD）的签名。
 */
var ZIP_EOCD_SIGNATURE = 101010256;
var ZIP64_EOCD_SIGNATURE = 101075792;
var ZIP64_LOCATOR_SIGNATURE = 117853008;
var ZIP_CENTRAL_HEADER_SIGNATURE = 33639248;
var MAX_EOCD_SEARCH_BYTES = 65557;
var ZIP_FLAG_UTF8 = 2048;
var ZIP_METHOD_STORED = 0;
var ZIP_METHOD_DEFLATE = 8;
//@ chunk-pzdhtgn4.js:7956-8065 placement
/**
 * 无效 zip 数据错误（遥测安全）。
 */
function invalidZipError(detail) {
  return detail === undefined
    ? Error("invalid zip data")
    : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `invalid zip data: ${detail}`,
        "invalid zip data",
      );
}
//@ chunk-pzdhtgn4.js:8065-8129 placement
/**
 * 按小端读取 16 位整数（越界抛无效 zip 错误）。
 */
function readUInt16LE(bytes, offset) {
  if (offset + 2 > bytes.length) throw invalidZipError();
  return bytes[offset] | (bytes[offset + 1] << 8);
}
//@ chunk-pzdhtgn4.js:8129-8220 placement
/**
 * 按小端读取 32 位无符号整数（越界抛无效 zip 错误）。
 */
function readUInt32LE(bytes, offset) {
  if (offset + 4 > bytes.length) throw invalidZipError();
  return (
    (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0
  );
}
//@ chunk-pzdhtgn4.js:8220-8271 placement
/**
 * 按小端读取 64 位整数。
 */
function readUInt64LE(bytes, offset) {
  return readUInt32LE(bytes, offset) + readUInt32LE(bytes, offset + 4) * 4294967296;
}
//@ chunk-pzdhtgn4.js:8271-8385 placement (2.1.88 match: c, 0.707)
function uint8ArrayToBinaryString(bytes) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 16384)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
  return binary;
}
//@ chunk-pzdhtgn4.js:8385-9628 placement
/**
 * 读取 ZIP 中央目录（含 ZIP64）。
 */
function readZipCentralDirectory(bytes, limit) {
  let directory = {};
  let eocdSearchStart = bytes.length - 22;
  while (eocdSearchStart < 0 || readUInt32LE(bytes, eocdSearchStart) !== ZIP_EOCD_SIGNATURE) {
    if (eocdSearchStart <= 0 || bytes.length - eocdSearchStart > MAX_EOCD_SEARCH_BYTES)
      throw invalidZipError();
    eocdSearchStart--;
  }
  let commentLength = readUInt16LE(bytes, eocdSearchStart + 8);
  if (commentLength === 0) return directory;
  let centralDirOffset = readUInt32LE(bytes, eocdSearchStart + 16);
  let zip64 = false;
  if (
    (centralDirOffset === 4294967295 || commentLength === 65535) &&
    eocdSearchStart >= 20 &&
    readUInt32LE(bytes, eocdSearchStart - 20) === ZIP64_LOCATOR_SIGNATURE
  ) {
    let entryCount = readUInt32LE(bytes, eocdSearchStart - 12);
    if (entryCount + 56 <= bytes.length && readUInt32LE(bytes, entryCount) === ZIP64_EOCD_SIGNATURE) {
      zip64 = true;
      commentLength = readUInt32LE(bytes, entryCount + 32);
      centralDirOffset = readUInt32LE(bytes, entryCount + 48);
    }
  }
  let textDecoder = new TextDecoder();
  for (let idx = 0; idx < commentLength; idx++) {
    if (readUInt32LE(bytes, centralDirOffset) !== ZIP_CENTRAL_HEADER_SIGNATURE) throw invalidZipError();
    let flags = readUInt16LE(bytes, centralDirOffset + 8);
    let method = readUInt16LE(bytes, centralDirOffset + 10);
    let nameLength = readUInt16LE(bytes, centralDirOffset + 28);
    let extraLength = readUInt16LE(bytes, centralDirOffset + 30);
    let commentLength = readUInt16LE(bytes, centralDirOffset + 32);
    let cursor = centralDirOffset + 46;
    if (cursor + nameLength > bytes.length) throw invalidZipError();
    let bytes_2 = bytes.subarray(cursor, cursor + nameLength);
    let name = flags & ZIP_FLAG_UTF8 ? textDecoder.decode(bytes_2) : uint8ArrayToBinaryString(bytes_2);
    let compressedSize = readUInt32LE(bytes, centralDirOffset + 20);
    let uncompressedSize = readUInt32LE(bytes, centralDirOffset + 24);
    let localHeaderOffset = readUInt32LE(bytes, centralDirOffset + 42);
    let entryStart = cursor + nameLength;
    if (zip64 && compressedSize === 4294967295) {
      let dataStart = entryStart + extraLength;
      let headerStart = entryStart;
      while (headerStart + 4 <= dataStart && readUInt16LE(bytes, headerStart) !== 1)
        headerStart += 4 + readUInt16LE(bytes, headerStart + 2);
      if (headerStart + 28 > dataStart) throw invalidZipError();
      uncompressedSize = readUInt64LE(bytes, headerStart + 4);
      compressedSize = readUInt64LE(bytes, headerStart + 12);
      localHeaderOffset = readUInt64LE(bytes, headerStart + 20);
    }
    centralDirOffset = entryStart + extraLength + commentLength;
    limit({
      name,
      originalSize: uncompressedSize,
    });
    let nextOffset =
      localHeaderOffset +
      30 +
      readUInt16LE(bytes, localHeaderOffset + 26) +
      readUInt16LE(bytes, localHeaderOffset + 28);
    if (nextOffset + compressedSize > bytes.length) throw invalidZipError();
    let chunk = bytes.subarray(nextOffset, nextOffset + compressedSize);
    if (method === ZIP_METHOD_STORED) {
      if (compressedSize !== uncompressedSize) throw invalidZipError("stored entry size mismatch");
      directory[name] = chunk.slice();
    } else if (method === ZIP_METHOD_DEFLATE) {
      if (compressedSize === 0 && uncompressedSize === 0) {
        directory[name] = new Uint8Array(0);
        continue;
      }
      let result;
      try {
        result = inflateRawSync(chunk, {
          maxOutputLength: Math.max(uncompressedSize, 1),
          chunkSize: Math.min(Math.max(uncompressedSize, 64), 1048576),
        });
      } catch (error) {
        let code = error.code;
        throw invalidZipError(
          typeof code === "string" && code.startsWith("Z_") ? code : "entry larger than declared",
        );
      }
      directory[name] = new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
    } else throw invalidZipError(`unsupported compression method ${method}`);
  }
  return directory;
}
//@ chunk-pzdhtgn4.js:9628-9640 placement
/**
 * 解压文件默认权限。
 */
var DEFAULT_FILE_MODE = 493;
//@ chunk-pzdhtgn4.js:9640-10183 fingerprint (2.1.88 match: parseZipModes, 1)
/**
 * 从 zip 中央目录读取每个条目的 Unix 权限位（用于恢复可执行位）。
 */
function parseZipModes(data) {
  let buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  let modes = {};
  let minEocd = Math.max(0, buf.length - 22 - 65535);
  let eocd = -1;
  for (let i = buf.length - 22; i >= minEocd; i--)
    if (buf.readUInt32LE(i) === 101010256) {
      eocd = i;
      break;
    }
  if (eocd < 0) return modes;
  let entryCount = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let i = 0; i < entryCount; i++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 33639248) break;
    let versionMadeBy = buf.readUInt16LE(off + 4);
    let nameLen = buf.readUInt16LE(off + 28);
    let extraLen = buf.readUInt16LE(off + 30);
    let commentLen = buf.readUInt16LE(off + 32);
    let externalAttr = buf.readUInt32LE(off + 38);
    let name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    if (versionMadeBy >> 8 === 3) {
      let mode = (externalAttr >>> 16) & 65535;
      if (mode) modes[name] = mode;
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return modes;
}
//@ chunk-5xgkngpb.js:621045-621121 fingerprint (2.1.88 match: readAndUnzipFile, 1)
/**
 * 读文件并解压到目录。
 */
async function readAndUnzipFile(filePath, targetDir, options) {
  let zipData = await getFsImplementation().readFileBytes(filePath);
  await extractZipToDirectory(zipData, targetDir, options);
}
export { isSafeZipPath, unzipFile, parseZipModes, DEFAULT_FILE_MODE, readAndUnzipFile };
