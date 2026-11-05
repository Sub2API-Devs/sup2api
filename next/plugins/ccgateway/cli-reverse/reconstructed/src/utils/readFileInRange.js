/**
 * utils/readFileInRange.ts
 *
 * 按行区间读文件（小文件整读、大文件流式），字节/选区上限错误
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/readFileInRange.ts
 * pieces: chunk-z68qgrbt.js (20)
 * attribution: fingerprint 7, layout 3, placement 10
 */
import { stat, readFile, open, readlink } from "fs/promises";
import { fstat, createReadStream, constants } from "fs";
import { StringDecoder } from "string_decoder";
import { Readable } from "stream";
import { formatFileSize } from "./format.js";
import { MAX_PANE_UPLOAD_BYTES, MAX_CHROME_UPLOAD_BYTES } from "./claudeInChrome/fileUpload.js";
import { detectTextEncoding, detectEncodingFromBom, readFileChecked } from "./fileRead.js";
import { STREAM_DECODE_OPTS_2 } from "../cli/transports/SSETransport.js";
import { toError, AbortError, getErrnoCode } from "./errors.js";
import { isDiskless } from "../bootstrap/state.js";
import { reportOnce } from "./reportOnce.js";
import { getFileModificationTimeAsync } from "./file.js";
import { stripBom, isFullFileView, matchesContentHash } from "./remoteFileState.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { DEFAULT_OUTPUTS_ROOT, DEFAULT_ATTACH_OUTPUTS_ROOT } from "./stageFileRoots.js";
import { nonblockingReadFlags } from "./fsOperations.js";
import { getPlatform } from "./platform.js";
import { probeNoFollowAny } from "./fsBoundRead.js";
import { statChain, openNoFollow } from "./fsSafety/pathRevalidation.js";
import { isSentinelInode } from "./slowOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z68qgrbt.js:897-1253 fingerprint (2.1.88 match: FileTooLargeError, 0.888)
/**
 * 文件总大小超过 maxSizeBytes 的错误（带 sizeInBytes/maxSizeBytes）。
 */
class FileTooLargeError extends Error {
  sizeInBytes;
  maxSizeBytes;
  constructor(sizeInBytes, maxSizeBytes, allowLargeHint = "") {
    super(
      `File content (${formatFileSize(sizeInBytes)}) exceeds maximum allowed size (${formatFileSize(maxSizeBytes)}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.${allowLargeHint}`,
    );
    this.sizeInBytes = sizeInBytes;
    this.maxSizeBytes = maxSizeBytes;
    this.name = "FileTooLargeError";
  }
}
//@ chunk-z68qgrbt.js:1253-1636 layout
/**
 * 所选行区间字节数超过上限的错误。
 */
class SelectedRangeTooLargeError extends Error {
  selectedBytes;
  maxSelectedBytes;
  constructor(selectedBytes, maxSelectedBytes, allowLargeHint = "") {
    super(
      `The requested line range contains over ${formatFileSize(maxSelectedBytes)} of text, more than a read can return. Use a smaller limit \u2014 or, if a single line is this large, no limit will fit it: search for specific content instead.${allowLargeHint}`,
    );
    this.selectedBytes = selectedBytes;
    this.maxSelectedBytes = maxSelectedBytes;
    this.name = "SelectedRangeTooLargeError";
  }
}
//@ chunk-z68qgrbt.js:1636-2416 fingerprint (2.1.88 match: readFileInRange, 0.506)
/**
 * 按行区间读文件：目录报 EISDIR；小于快速路径阈值的普通文件整读（超过 maxBytes 抛 FileTooLargeError），检测编码后切行；否则流式读取。返回内容、行数、总行数、字节数、mtime、notText。
 */
async function readFileInRange(filePath, offset = 0, maxLines, maxBytes, signal, options) {
  signal?.throwIfAborted();
  let truncateOnByteLimit = options?.truncateOnByteLimit ?? false;
  let maxSelectedBytes = options?.maxSelectedBytes;
  let handle = options?.handle;
  let stats = handle ? (options?.handleStats ?? (await handle.stat())) : await stat(filePath);
  if (maxSelectedBytes !== undefined && stats.isFile() && stats.size <= maxSelectedBytes)
    maxSelectedBytes = undefined;
  if (stats.isDirectory())
    throw Object.assign(Error(`EISDIR: illegal operation on a directory, read '${filePath}'`), {
      code: "EISDIR",
      errno: -21,
      syscall: "read",
      path: filePath,
    });
  if (stats.isFile() && stats.size < MAX_PANE_UPLOAD_BYTES) {
    if (!truncateOnByteLimit && maxBytes !== undefined && stats.size > maxBytes)
      throw new FileTooLargeError(stats.size, maxBytes);
    let bytes = handle
      ? await handle.readFile({
          signal,
        })
      : await readFile(filePath, {
          signal,
        });
    if (!truncateOnByteLimit && maxBytes !== undefined) {
      if (bytes.length > maxBytes) throw new FileTooLargeError(bytes.length, maxBytes);
    }
    let { encoding, notText } = detectTextEncoding(bytes);
    return {
      ...readFileInRangeFast(
        bytes.toString(encoding),
        stats.size,
        stats.mtimeMs,
        offset,
        maxLines,
        truncateOnByteLimit ? maxBytes : undefined,
        maxSelectedBytes,
      ),
      ...(notText && {
        notText,
      }),
    };
  }
  return readFileInRangeStreaming(
    filePath,
    offset,
    maxLines,
    maxBytes,
    maxSelectedBytes,
    stats.isFile() ? undefined : MAX_CHROME_UPLOAD_BYTES,
    truncateOnByteLimit,
    signal,
    handle
      ? {
          handle,
          mtimeMs: stats.mtimeMs,
          positional: stats.isFile(),
        }
      : undefined,
  );
}
//@ chunk-z68qgrbt.js:2416-3406 fingerprint (2.1.88 match: readFileInRangeFast, 1)
/**
 * 内存中按行切片（处理 BOM、CRLF、字节截断与选区上限）。
 */
function readFileInRangeFast(text, totalBytes, mtimeMs, offset, maxLines, maxBytes, maxSelectedBytes) {
  let hasBom = text.charCodeAt(0) === 65279;
  if (hasBom) totalBytes -= 3;
  let text_2 = hasBom ? text.slice(1) : text;
  if (offset === 0 && maxLines === undefined && maxBytes === undefined && maxSelectedBytes === undefined) {
    let normalizedText = text_2.includes("\r")
      ? text_2.replaceAll(
          `\r
`,
          `
`,
        )
      : text_2;
    if (normalizedText.endsWith("\r")) normalizedText = normalizedText.slice(0, -1);
    let lineCount = 1;
    let index = normalizedText.indexOf(`
`);
    while (index !== -1) {
      lineCount++;
      index = normalizedText.indexOf(
        `
`,
        index + 1,
      );
    }
    return {
      content: normalizedText,
      lineCount,
      totalLines: lineCount,
      totalBytes,
      readBytes: Buffer.byteLength(normalizedText, "utf8"),
      mtimeMs,
      truncatedByBytes: false,
    };
  }
  let endLine = maxLines !== undefined ? offset + maxLines : 1 / 0;
  let selectedLines = [];
  let lineIndex = 0;
  let startPos = 0;
  let newlinePos;
  let selectedBytes = 0;
  let truncatedByBytes = false;
  function tryPush(line) {
    if (maxSelectedBytes !== undefined || maxBytes !== undefined) {
      let sep = selectedLines.length > 0 ? 1 : 0;
      let lineBytes = selectedBytes + sep + Buffer.byteLength(line);
      if (maxBytes !== undefined && lineBytes > maxBytes) {
        truncatedByBytes = true;
        return false;
      }
      if (maxSelectedBytes !== undefined && lineBytes > maxSelectedBytes)
        throw new SelectedRangeTooLargeError(lineBytes, maxSelectedBytes);
      selectedBytes = lineBytes;
    }
    selectedLines.push(line);
    return true;
  }
  while (
    (newlinePos = text_2.indexOf(
      `
`,
      startPos,
    )) !== -1
  ) {
    if (lineIndex >= offset && lineIndex < endLine && !truncatedByBytes) {
      let line = text_2.slice(startPos, newlinePos);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      tryPush(line);
    }
    lineIndex++;
    startPos = newlinePos + 1;
  }
  if (lineIndex >= offset && lineIndex < endLine && !truncatedByBytes) {
    let line = text_2.slice(startPos);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    tryPush(line);
  }
  lineIndex++;
  let content = selectedLines.join(`
`);
  return {
    content,
    lineCount: selectedLines.length,
    totalLines: lineIndex,
    totalBytes,
    readBytes: Buffer.byteLength(content, "utf8"),
    mtimeMs,
    truncatedByBytes,
  };
}
//@ chunk-z68qgrbt.js:3406-3467 fingerprint (2.1.88 match: streamOnOpen, 1)
function streamOnOpen(fd) {
  fstat(fd, (err, stats) => {
    this.resolveMtime(err ? 0 : stats.mtimeMs);
  });
}
//@ chunk-z68qgrbt.js:3467-3609 layout
/**
 * 流式读取的数据回调：首块检测 UTF-16LE 后切换解码器。
 */
function streamOnDataWithBomDetection(chunk) {
  if (this.isFirstChunk && detectEncodingFromBom(chunk) === "utf16le")
    this.decoder = new StringDecoder("utf16le");
  let decoded = this.decoder.write(chunk);
  if (decoded.length > 0) streamOnData.call(this, decoded);
}
//@ chunk-z68qgrbt.js:3609-5382 fingerprint (2.1.88 match: streamOnData, 0.885)
function streamOnData(chunk) {
  let chunk_2 = chunk;
  if (this.isFirstChunk) {
    this.isFirstChunk = false;
    if (chunk_2.charCodeAt(0) === 65279) chunk_2 = chunk_2.slice(1);
  }
  let chunkBytes = Buffer.byteLength(chunk_2);
  this.totalBytesRead += chunkBytes;
  if (this.hardCapBytes !== undefined && this.totalBytesRead > this.hardCapBytes) {
    this.stream.destroy(new FileTooLargeError(this.totalBytesRead, this.hardCapBytes));
    return;
  }
  if (!this.truncateOnByteLimit && this.maxBytes !== undefined && this.totalBytesRead > this.maxBytes) {
    this.stream.destroy(new FileTooLargeError(this.totalBytesRead, this.maxBytes));
    return;
  }
  let data = this.partial.length > 0 ? this.partial + chunk_2 : chunk_2;
  let pendingBytes = this.partialBytes + chunkBytes;
  this.partial = "";
  this.partialBytes = 0;
  let startPos = 0;
  let newlinePos;
  while (
    (newlinePos = data.indexOf(
      `
`,
      startPos,
    )) !== -1
  ) {
    if (this.currentLineIndex >= this.offset && this.currentLineIndex < this.endLine) {
      let line = data.slice(startPos, newlinePos);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      let byteLimitOn = this.truncateOnByteLimit && this.maxBytes !== undefined;
      if (byteLimitOn || this.maxSelectedBytes !== undefined) {
        let sep = this.selectedLines.length > 0 ? 1 : 0;
        let lineBytes = this.selectedBytes + sep + Buffer.byteLength(line);
        if (byteLimitOn && lineBytes > this.maxBytes) {
          this.truncatedByBytes = true;
          this.endLine = this.currentLineIndex;
        } else if (this.maxSelectedBytes !== undefined && lineBytes > this.maxSelectedBytes) {
          this.stream.destroy(new SelectedRangeTooLargeError(lineBytes, this.maxSelectedBytes));
          return;
        } else {
          this.selectedBytes = lineBytes;
          this.selectedLines.push(line);
        }
      } else this.selectedLines.push(line);
    }
    this.currentLineIndex++;
    startPos = newlinePos + 1;
  }
  if (startPos < data.length) {
    if (this.currentLineIndex >= this.offset && this.currentLineIndex < this.endLine) {
      let fragment = data.slice(startPos);
      let fragmentBytes = startPos === 0 ? pendingBytes : Buffer.byteLength(fragment);
      let byteLimitOn = this.truncateOnByteLimit && this.maxBytes !== undefined;
      if (byteLimitOn || this.maxSelectedBytes !== undefined) {
        let sep = this.selectedLines.length > 0 ? 1 : 0;
        let lineBytes = this.selectedBytes + sep + fragmentBytes;
        if (byteLimitOn && lineBytes > this.maxBytes) {
          this.truncatedByBytes = true;
          this.endLine = this.currentLineIndex;
          return;
        }
        if (this.maxSelectedBytes !== undefined && lineBytes > this.maxSelectedBytes) {
          this.stream.destroy(new SelectedRangeTooLargeError(lineBytes, this.maxSelectedBytes));
          return;
        }
      }
      this.partial = fragment;
      this.partialBytes = fragmentBytes;
    }
  }
}
//@ chunk-z68qgrbt.js:5382-6155 fingerprint (2.1.88 match: streamOnEnd, 0.923)
/**
 * 流式读取结束：冲刷解码器与最后一行，完成统计。
 */
function streamOnEnd() {
  let trailing = this.decoder.end();
  if (trailing.length > 0) {
    streamOnData.call(this, trailing);
    if (this.stream.destroyed) return;
  }
  let line = this.partial;
  if (line.endsWith("\r")) line = line.slice(0, -1);
  if (this.currentLineIndex >= this.offset && this.currentLineIndex < this.endLine)
    if (this.truncateOnByteLimit && this.maxBytes !== undefined) {
      let sep = this.selectedLines.length > 0 ? 1 : 0;
      if (this.selectedBytes + sep + Buffer.byteLength(line) > this.maxBytes) this.truncatedByBytes = true;
      else this.selectedLines.push(line);
    } else this.selectedLines.push(line);
  this.currentLineIndex++;
  let content = this.selectedLines.join(`
`);
  let truncated = this.truncatedByBytes;
  this.mtimeReady.then((mtimeMs) => {
    this.resolve({
      content,
      lineCount: this.selectedLines.length,
      totalLines: this.currentLineIndex,
      totalBytes: this.totalBytesRead,
      readBytes: Buffer.byteLength(content, "utf8"),
      mtimeMs,
      truncatedByBytes: truncated,
    });
  });
}
//@ chunk-z68qgrbt.js:6155-6817 fingerprint (2.1.88 match: readFileInRangeStreaming, 0.846)
function readFileInRangeStreaming(
  filePath,
  offset,
  maxLines,
  maxBytes,
  maxSelectedBytes,
  hardCapBytes,
  truncateOnByteLimit,
  signal,
  handleInfo,
) {
  return new Promise((resolve, reject) => {
    let state = {
      stream: handleInfo
        ? createAbortableStream(handleInfo.handle, handleInfo.positional, signal)
        : createReadStream(filePath, {
            highWaterMark: 524288,
            ...(signal
              ? {
                  signal,
                }
              : undefined),
          }),
      decoder: new StringDecoder("utf8"),
      offset,
      endLine: maxLines !== undefined ? offset + maxLines : 1 / 0,
      maxBytes,
      maxSelectedBytes,
      hardCapBytes,
      truncateOnByteLimit,
      resolve,
      totalBytesRead: 0,
      selectedBytes: 0,
      truncatedByBytes: false,
      currentLineIndex: 0,
      selectedLines: [],
      partial: "",
      partialBytes: 0,
      isFirstChunk: true,
      resolveMtime: () => {},
      mtimeReady: null,
    };
    state.mtimeReady = new Promise((resolve) => {
      state.resolveMtime = resolve;
    });
    if (handleInfo) state.resolveMtime(handleInfo.mtimeMs);
    else state.stream.once("open", streamOnOpen.bind(state));
    state.stream.on("data", decodeWithBomDetection.bind(state));
    state.stream.once("end", decodeStreamEnd.bind(state));
    state.stream.once("error", reject);
  });
}
//@ chunk-z68qgrbt.js:6910-6928 placement
var decodeWithBomDetection; // deferred: uses STREAM_DECODE_OPTS_2 (../cli/transports/SSETransport.js) of its import cycle while loading; runs once the cycle is complete
var decodeStreamEnd;
deferInit("chunk-z68qgrbt.js:6910", () => {
  decodeWithBomDetection = STREAM_DECODE_OPTS_2(streamOnDataWithBomDetection);
  decodeStreamEnd = STREAM_DECODE_OPTS_2(streamOnEnd);
});
//@ chunk-z68qgrbt.js:6928-7420 placement
function createAbortableStream(handle, fileHandle, signal) {
  let buffer = Buffer.allocUnsafe(524288);
  let position = fileHandle ? 0 : null;
  let reading = false;
  let stream = new Readable({
    read() {
      if (reading) return;
      reading = true;
      handle
        .read(buffer, 0, 524288, position)
        .then(({ bytesRead }) => {
          reading = false;
          if (stream.destroyed) return;
          if (bytesRead === 0) {
            stream.push(null);
            return;
          }
          if (position !== null) position += bytesRead;
          stream.push(Buffer.from(buffer.subarray(0, bytesRead)));
        })
        .catch((error) => {
          reading = false;
          stream.destroy(toError(error));
        });
    },
  });
  if (signal) {
    let onAbort = () => {
      stream.destroy(signal.reason instanceof Error ? signal.reason : new AbortError());
    };
    if (signal.aborted) onAbort();
    else {
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
      stream.once("close", () => signal.removeEventListener("abort", onAbort));
    }
  }
  return stream;
}
//@ chunk-z68qgrbt.js:7500-7797 placement
async function logFileStateResync(fileState, filePath, options = {}) {
  if (isDiskless()) {
    if (fileState.has(filePath)) reportOnce("file_state_resync");
    return null;
  }
  let previous = fullReadState(fileState, filePath);
  if (!previous) return null;
  try {
    let timestamp = await getFileModificationTimeAsync(filePath);
    if (timestamp <= previous.timestamp) return null;
    let content = stripBom((await readFileChecked(filePath)).content);
    if (fileState.get(filePath) !== previous) return null;
    return compareFileContent(
      fileState,
      filePath,
      previous,
      timestamp,
      content,
      options.requireReadBeforeWrite === true,
    );
  } catch {
    return null;
  }
}
//@ chunk-z68qgrbt.js:7797-7932 placement
/**
 * 取该文件的完整读取状态（或从头开始的部分视图）。
 */
function fullReadState(fileState, filePath) {
  let state = fileState.get(filePath);
  if (!state) return null;
  let fullPartial = state.isPartialView === true && (state.offset ?? 1) <= 1 && state.limit === undefined;
  return isFullFileView(state) || fullPartial ? state : null;
}
//@ chunk-z68qgrbt.js:7932-8335 placement
function compareFileContent(fileState, filePath, previous, timestamp, content, requireReadBeforeWrite) {
  let unchanged = matchesContentHash(previous, content);
  fileState.set(filePath, {
    content,
    timestamp,
    offset: undefined,
    limit: undefined,
    ...((!unchanged || previous.contentNotInModelContext) && {
      contentNotInModelContext: true,
    }),
    ...((previous.isPartialView || (requireReadBeforeWrite && !unchanged)) && {
      isPartialView: true,
    }),
    ...(((requireReadBeforeWrite && !unchanged) || previous.refreshedBehindModel) && {
      refreshedBehindModel: true,
    }),
    ...(previous.startupMemorySeed && {
      startupMemorySeed: true,
    }),
    ...(unchanged &&
      previous.seededFromContext && {
        seededFromContext: true,
      }),
  });
  return unchanged ? "unchanged" : "changed";
}
//@ chunk-z68qgrbt.js:8335-8572 placement
/**
 * 磁盘大小与记录的内容长度（考虑换行转换）是否不符。
 */
function isSizeInconsistent(state, actualSize) {
  if (state.content === "" && state.contentHash !== undefined) {
    let contentLength = state.contentLength ?? 0;
    return actualSize < contentLength || actualSize > contentLength * 4 + 3;
  }
  let contentBytes = Buffer.byteLength(state.content);
  let newlineCount = 0;
  for (
    let index = state.content.indexOf(`
`);
    index !== -1;
  ) {
    newlineCount++;
    index = state.content.indexOf(
      `
`,
      index + 1,
    );
  }
  return actualSize < contentBytes || actualSize > contentBytes + newlineCount + 3;
}
//@ chunk-z68qgrbt.js:8572-8631 placement
/**
 * defaultOutputRoots：默认输出根目录。
 */
function defaultOutputRoots() {
  return isRemoteManagedEnvironment()
    ? {
        product: DEFAULT_OUTPUTS_ROOT,
        attach: DEFAULT_ATTACH_OUTPUTS_ROOT,
      }
    : undefined;
}
//@ chunk-z68qgrbt.js:8631-8808 placement
/**
 * 路径是否在产品同步目录下且与附件路径对应。
 */
function isSyncedAttachPath(outputPath, attachPath, outputsLink) {
  let productPrefix = `${outputsLink.product}/`;
  if (!outputPath.startsWith(productPrefix)) return false;
  let sliced = outputPath.slice(productPrefix.length);
  return (
    sliced.split("/").every((segment) => segment !== "" && segment !== "." && segment !== "..") &&
    attachPath === `${outputsLink.attach}/${sliced}`
  );
}
//@ chunk-z68qgrbt.js:8808-8935 layout
function isThroughOutputsLink(productPath, attachPath, options) {
  let roots = defaultOutputRoots();
  if (roots === undefined) return false;
  return (
    isSyncedAttachPath(productPath, attachPath, roots) ||
    (options?.orTheLinkItself === true && productPath === roots.product && attachPath === roots.attach)
  );
}
//@ chunk-z68qgrbt.js:8935-9102 placement
/**
 * 检查文件状态是否需要重新同步，结果只回调一次。
 */
async function checkFileStateResyncOnce(fileState, filePath, previous, maxBytes, signal, outputs = {}) {
  let reported = false;
  let report = (outcome, viaLink, size) => {
    if (!reported && !signal.aborted) {
      reported = true;
      outputs.onOutcome?.(outcome, viaLink, size);
    }
  };
  try {
    return await checkFileStateResync(fileState, filePath, previous, maxBytes, signal, outputs, report);
  } catch (error) {
    report("other", false);
    throw error;
  }
}
//@ chunk-z68qgrbt.js:9102-10415 placement
/**
 * 检查读过的文件是否在别处被改动（部分视图、链接、超大、同/异）。
 */
async function checkFileStateResync(fileState, filePath, previous, maxBytes, signal, outputs, report) {
  let reject = (reason) => {
    report(reason, false);
    return false;
  };
  if (!isFullFileView(previous)) return reject("partial_view");
  if (previous.touchCompared) return reject("already_compared");
  signal.throwIfAborted();
  let flags = nonblockingReadFlags();
  let platform = getPlatform();
  let isLinux = platform === "linux" || platform === "wsl";
  let canOpenDirect =
    typeof flags === "number" && (isLinux || (platform === "macos" && !(await probeNoFollowAny())));
  let handle;
  try {
    if (!canOpenDirect && (await statChain(filePath)) === undefined) return reject("other");
    handle =
      typeof flags === "number"
        ? await openNoFollow(filePath, flags | constants.O_NOFOLLOW, platform)
        : await open(filePath, flags);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ELOOP")
      return reject(errnoCode === "ENOENT" ? "enoent" : "leaf_link");
    throw error;
  }
  try {
    let stats = await handle.stat();
    let resolvedPath = isLinux
      ? await readlink(`/proc/self/fd/${handle.fd}`).catch(() => {
          return;
        })
      : filePath;
    let isSyncedOutput =
      resolvedPath !== filePath &&
      resolvedPath !== undefined &&
      outputs.outputsLink !== undefined &&
      isSyncedAttachPath(filePath, resolvedPath, outputs.outputsLink) &&
      outputs.isLandingJudged?.(resolvedPath) === true;
    if (!stats.isFile()) return reject("not_regular");
    if (stats.size > maxBytes) return reject("oversize");
    if (stats.nlink > 1) return reject("nlink");
    if (resolvedPath === undefined) return reject("other");
    if (resolvedPath !== filePath && !isSyncedOutput) return reject("link_on_path");
    if (!canOpenDirect) {
      let stats = await handle.stat({
        bigint: true,
      });
      let chainStats = await statChain(filePath);
      if (
        chainStats === undefined ||
        chainStats.dev !== stats.dev ||
        chainStats.ino !== stats.ino ||
        isSentinelInode(chainStats.ino)
      )
        return reject("link_on_path");
    }
    let sameContent = false;
    let reported = false;
    try {
      sameContent =
        !isSizeInconsistent(previous, stats.size) &&
        matchesContentHash(
          previous,
          (
            await readFileInRange(filePath, 0, undefined, maxBytes, signal, {
              handle,
              handleStats: stats,
            })
          ).content,
        );
      reported = true;
    } finally {
      if (!signal.aborted && fileState.get(filePath) === previous) {
        fileState.set(filePath, {
          ...previous,
          ...(sameContent && {
            timestamp: Math.floor(stats.mtimeMs),
          }),
          touchCompared: true,
        });
        if (reported) report(sameContent ? "same" : "differs", isSyncedOutput, stats.size);
      } else {
        sameContent = false;
        report("other", false);
      }
    }
    return sameContent;
  } finally {
    let closing = handle.close();
    if (signal.aborted) closing.catch(() => {});
    else await closing;
  }
}
export {
  FileTooLargeError,
  SelectedRangeTooLargeError,
  readFileInRange,
  isThroughOutputsLink,
  readFileInRangeFast,
  defaultOutputRoots,
  checkFileStateResyncOnce,
  isSyncedAttachPath,
  logFileStateResync,
  createAbortableStream,
};
