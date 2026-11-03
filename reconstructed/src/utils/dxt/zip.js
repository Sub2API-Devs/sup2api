/**
 * utils/dxt/zip.ts
 *
 * 并入已有模块：读取 ZIP 中央目录（含 ZIP64）；解压文件默认权限。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/dxt/zip.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-vr8smdd9.js (13)
 * attribution: fingerprint 5, layout 1, placement 8
 */
import { normalize, isAbsolute } from "path";
import { inflateRawSync } from "zlib";
import { containsPathTraversal } from "../path.js";
import { printableName } from "../printableName.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { getFsImplementation } from "../fsOperations.js";
import { extractZipToDirectory } from "../plugins/zipCache.js";

//@ chunk-vr8smdd9.js:6319-6421 fingerprint = LIMITS (1)
var LIMITS = {
  MAX_FILE_SIZE: 536870912,
  MAX_TOTAL_SIZE: 1073741824,
  MAX_FILE_COUNT: 1e5,
  MAX_COMPRESSION_RATIO: 50,
};
/**
 * zip 条目路径是否安全（无穿越、非绝对路径）。
 */
//@ chunk-vr8smdd9.js:6421-6559 layout
function isSafeZipPath(e) {
  if (containsPathTraversal(e)) return !1;
  for (let n of e.split(/[/\\]/)) if (/^\.\. [ .]*$/.test(n)) return !1;
  let r = normalize(e);
  if (isAbsolute(r)) return !1;
  return !0;
}
/**
 * 逐条校验 zip 条目：文件数、单文件与总解压大小、压缩比上限（LIMITS），路径必须安全。
 */
//@ chunk-vr8smdd9.js:6559-7438 fingerprint = validateZipFile (1)
function validateZipFile(file, state) {
  state.fileCount++;
  let error;
  if (state.fileCount > LIMITS.MAX_FILE_COUNT)
    error = `Archive contains too many files: ${state.fileCount} (max: ${LIMITS.MAX_FILE_COUNT})`;
  let s = printableName(file.name, 120);
  if (!isSafeZipPath(file.name))
    error = `Unsafe file path detected: "${s}". Path traversal or absolute paths are not allowed.`;
  let fileSize = file.originalSize || 0;
  if (fileSize > LIMITS.MAX_FILE_SIZE)
    error = `File "${s}" is too large: ${Math.round(fileSize / 1024 / 1024)}MB (max: ${Math.round(LIMITS.MAX_FILE_SIZE / 1024 / 1024)}MB)`;
  if (((state.totalUncompressedSize += fileSize), state.totalUncompressedSize > LIMITS.MAX_TOTAL_SIZE))
    error = `Archive total size is too large: ${Math.round(state.totalUncompressedSize / 1024 / 1024)}MB (max: ${Math.round(LIMITS.MAX_TOTAL_SIZE / 1024 / 1024)}MB)`;
  let currentRatio = state.totalUncompressedSize / state.compressedSize;
  if (currentRatio > LIMITS.MAX_COMPRESSION_RATIO)
    error = `Suspicious compression ratio detected: ${currentRatio.toFixed(1)}:1 (max: ${LIMITS.MAX_COMPRESSION_RATIO}:1). This may be a zip bomb.`;
  return error ? { isValid: !1, error: error } : { isValid: !0 };
}
/**
 * 解压 zip 字节为 {路径: 内容}，解压过程中逐条做安全校验（防 zip 炸弹与路径穿越）。
 */
//@ chunk-vr8smdd9.js:7438-7807 fingerprint = unzipFile (0.849)
async function unzipFile(zipData) {
  let state = { fileCount: 0, totalUncompressedSize: 0, compressedSize: zipData.length, errors: [] },
    result = readZipCentralDirectory(
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
  return (
    logForDebugging(
      `Zip extraction completed: ${state.fileCount} files, ${Math.round(state.totalUncompressedSize / 1024)}KB uncompressed`,
    ),
    result
  );
}
//@ chunk-vr8smdd9.js:7807-7889 placement
var ht = 101010256,
  yt = 101075792,
  kt = 117853008,
  xt = 33639248,
  wt = 65557,
  bt = 2048,
  Ht = 0,
  Et = 8;
/**
 * 无效 zip 数据错误（遥测安全）。
 */
//@ chunk-vr8smdd9.js:7889-7998 placement
function invalidZipError(e) {
  return e === void 0
    ? Error("invalid zip data")
    : new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `invalid zip data: ${e}`,
        "invalid zip data",
      );
}
//@ chunk-vr8smdd9.js:7998-8062 placement
function j(e, r) {
  if (r + 2 > e.length) throw invalidZipError();
  return e[r] | (e[r + 1] << 8);
}
//@ chunk-vr8smdd9.js:8062-8153 placement
function U(e, r) {
  if (r + 4 > e.length) throw invalidZipError();
  return (e[r] | (e[r + 1] << 8) | (e[r + 2] << 16) | (e[r + 3] << 24)) >>> 0;
}
//@ chunk-vr8smdd9.js:8153-8204 placement
function Ne(e, r) {
  return U(e, r) + U(e, r + 4) * 4294967296;
}
//@ chunk-vr8smdd9.js:8204-8318 placement = c (0.707)
function uint8ArrayToBinaryString(e) {
  let r = "";
  for (let n = 0; n < e.length; n += 16384) r += String.fromCharCode(...e.subarray(n, n + 16384));
  return r;
}
/**
 * 读取 ZIP 中央目录（含 ZIP64）。
 */
//@ chunk-vr8smdd9.js:8318-9561 placement
function readZipCentralDirectory(e, r) {
  let n = {},
    s = e.length - 22;
  while (s < 0 || U(e, s) !== ht) {
    if (s <= 0 || e.length - s > wt) throw invalidZipError();
    s--;
  }
  let a = j(e, s + 8);
  if (a === 0) return n;
  let f = U(e, s + 16),
    m = !1;
  if ((f === 4294967295 || a === 65535) && s >= 20 && U(e, s - 20) === kt) {
    let g = U(e, s - 12);
    if (g + 56 <= e.length && U(e, g) === yt) ((m = !0), (a = U(e, g + 32)), (f = U(e, g + 48)));
  }
  let textDecoder = new TextDecoder();
  for (let g = 0; g < a; g++) {
    if (U(e, f) !== xt) throw invalidZipError();
    let h = j(e, f + 8),
      x = j(e, f + 10),
      w = j(e, f + 28),
      y = j(e, f + 30),
      S = j(e, f + 32),
      b = f + 46;
    if (b + w > e.length) throw invalidZipError();
    let chunk = e.subarray(b, b + w),
      T = h & bt ? textDecoder.decode(chunk) : uint8ArrayToBinaryString(chunk),
      O = U(e, f + 20),
      F = U(e, f + 24),
      v = U(e, f + 42),
      P = b + w;
    if (m && O === 4294967295) {
      let L = P + y,
        R = P;
      while (R + 4 <= L && j(e, R) !== 1) R += 4 + j(e, R + 2);
      if (R + 28 > L) throw invalidZipError();
      ((F = Ne(e, R + 4)), (O = Ne(e, R + 12)), (v = Ne(e, R + 20)));
    }
    ((f = P + y + S), r({ name: T, originalSize: F }));
    let K = v + 30 + j(e, v + 26) + j(e, v + 28);
    if (K + O > e.length) throw invalidZipError();
    let chunk_2 = e.subarray(K, K + O);
    if (x === Ht) {
      if (O !== F) throw invalidZipError("stored entry size mismatch");
      n[T] = chunk_2.slice();
    } else if (x === Et) {
      if (O === 0 && F === 0) {
        n[T] = new Uint8Array(0);
        continue;
      }
      let L;
      try {
        L = inflateRawSync(chunk_2, {
          maxOutputLength: Math.max(F, 1),
          chunkSize: Math.min(Math.max(F, 64), 1048576),
        });
      } catch (error) {
        let code = error.code;
        throw invalidZipError(
          typeof code === "string" && code.startsWith("Z_") ? code : "entry larger than declared",
        );
      }
      n[T] = new Uint8Array(L.buffer, L.byteOffset, L.byteLength);
    } else throw invalidZipError(`unsupported compression method ${x}`);
  }
  return n;
}
/**
 * 解压文件默认权限。
 */
//@ chunk-vr8smdd9.js:9561-9573 placement
var DEFAULT_FILE_MODE = 493;
/**
 * 从 zip 中央目录读取每个条目的 Unix 权限位（用于恢复可执行位）。
 */
//@ chunk-vr8smdd9.js:9573-10116 fingerprint = parseZipModes (1)
function parseZipModes(data) {
  let buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength),
    modes = {},
    minEocd = Math.max(0, buf.length - 22 - 65535),
    eocd = -1;
  for (let c = buf.length - 22; c >= minEocd; c--)
    if (buf.readUInt32LE(c) === 101010256) {
      eocd = c;
      break;
    }
  if (eocd < 0) return modes;
  let entryCount = buf.readUInt16LE(eocd + 10),
    off = buf.readUInt32LE(eocd + 16);
  for (let c = 0; c < entryCount; c++) {
    if (off + 46 > buf.length || buf.readUInt32LE(off) !== 33639248) break;
    let versionMadeBy = buf.readUInt16LE(off + 4),
      nameLen = buf.readUInt16LE(off + 28),
      extraLen = buf.readUInt16LE(off + 30),
      commentLen = buf.readUInt16LE(off + 32),
      externalAttr = buf.readUInt32LE(off + 38),
      name = buf.toString("utf8", off + 46, off + 46 + nameLen);
    if (versionMadeBy >> 8 === 3) {
      let b = (externalAttr >>> 16) & 65535;
      if (b) modes[name] = b;
    }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return modes;
}
/**
 * 读文件并解压到目录。
 */
//@ chunk-e6aww6q8.js:610959-611035 fingerprint = readAndUnzipFile (1)
async function readAndUnzipFile(e, n, r) {
  let zipData = await getFsImplementation().readFileBytes(e);
  await extractZipToDirectory(zipData, n, r);
}

export { isSafeZipPath, DEFAULT_FILE_MODE, unzipFile, parseZipModes, readAndUnzipFile };
