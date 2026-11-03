/**
 * utils/readFileInRange.ts
 *
 * 按行区间读文件（小文件整读、大文件流式），字节/选区上限错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/readFileInRange.ts
 * pieces: chunk-wn385gmf.js (19)
 * attribution: fingerprint 7, layout 2, placement 10
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

//@ chunk-wn385gmf.js:19715-20071 fingerprint = FileTooLargeError (0.887)
/**
 * 文件总大小超过 maxSizeBytes 的错误（带 sizeInBytes/maxSizeBytes）。
 */
class FileTooLargeError extends Error {
  sizeInBytes;
  maxSizeBytes;
  constructor(n, e, allowLargeHint = "") {
    super(
      `File content (${formatFileSize(n)}) exceeds maximum allowed size (${formatFileSize(e)}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.${allowLargeHint}`,
    );
    this.sizeInBytes = n;
    this.maxSizeBytes = e;
    this.name = "FileTooLargeError";
  }
}
//@ chunk-wn385gmf.js:20071-20454 layout
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
//@ chunk-wn385gmf.js:20454-21238 fingerprint = readFileInRange (0.505)
/**
 * 按行区间读文件：目录报 EISDIR；小于快速路径阈值的普通文件整读（超过 maxBytes 抛 FileTooLargeError），检测编码后切行；否则流式读取。返回内容、行数、总行数、字节数、mtime、notText。
 */
async function readFileInRange(filePath, offset = 0, maxLines, maxBytes, signal, options) {
  signal?.throwIfAborted();
  let truncateOnByteLimit = options?.truncateOnByteLimit ?? false;
  let maxSelectedBytes = options?.maxSelectedBytes;
  let handle = options?.handle;
  let f = handle ? (options?.handleStats ?? (await handle.stat())) : await stat(filePath);
  if (maxSelectedBytes !== undefined && f.isFile() && f.size <= maxSelectedBytes)
    maxSelectedBytes = undefined;
  if (f.isDirectory())
    throw Object.assign(Error(`EISDIR: illegal operation on a directory, read '${filePath}'`), {
      code: "EISDIR",
      errno: -21,
      syscall: "read",
      path: filePath,
    });
  if (f.isFile() && f.size < MAX_PANE_UPLOAD_BYTES) {
    if (!truncateOnByteLimit && maxBytes !== undefined && f.size > maxBytes)
      throw new FileTooLargeError(f.size, maxBytes);
    let h = handle
      ? await handle.readFile({
          signal,
        })
      : await readFile(filePath, {
          signal,
        });
    if (!truncateOnByteLimit && maxBytes !== undefined) {
      if (h.length > maxBytes) throw new FileTooLargeError(h.length, maxBytes);
    }
    let { encoding, notText } = detectTextEncoding(h);
    return {
      ...readFileInRangeFast(
        h.toString(encoding),
        f.size,
        f.mtimeMs,
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
    f.isFile() ? undefined : MAX_CHROME_UPLOAD_BYTES,
    truncateOnByteLimit,
    signal,
    handle
      ? {
          handle,
          mtimeMs: f.mtimeMs,
          positional: f.isFile(),
        }
      : undefined,
  );
}
//@ chunk-wn385gmf.js:21238-22228 fingerprint = readFileInRangeFast (1)
/**
 * 内存中按行切片（处理 BOM、CRLF、字节截断与选区上限）。
 */
function readFileInRangeFast(n, totalBytes, mtimeMs, s, o, a, u) {
  let l = n.charCodeAt(0) === 65279;
  if (l) totalBytes -= 3;
  let text = l ? n.slice(1) : n;
  if (s === 0 && o === undefined && a === undefined && u === undefined) {
    let y = text.includes("\r")
      ? text.replaceAll(
          `\r
`,
          `
`,
        )
      : text;
    if (y.endsWith("\r")) y = y.slice(0, -1);
    let S = 1;
    let index = y.indexOf(`
`);
    while (index !== -1) {
      S++;
      index = y.indexOf(
        `
`,
        index + 1,
      );
    }
    return {
      content: y,
      lineCount: S,
      totalLines: S,
      totalBytes,
      readBytes: Buffer.byteLength(y, "utf8"),
      mtimeMs,
      truncatedByBytes: false,
    };
  }
  let f = o !== undefined ? s + o : 1 / 0;
  let selectedLines = [];
  let lineIndex = 0;
  let startPos = 0;
  let newlinePos;
  let selectedBytes = 0;
  let truncatedByBytes = false;
  function tryPush(line) {
    if (u !== undefined || a !== undefined) {
      let sep = selectedLines.length > 0 ? 1 : 0;
      let O = selectedBytes + sep + Buffer.byteLength(line);
      if (a !== undefined && O > a) {
        truncatedByBytes = true;
        return false;
      }
      if (u !== undefined && O > u) throw new SelectedRangeTooLargeError(O, u);
      selectedBytes = O;
    }
    selectedLines.push(line);
    return true;
  }
  while (
    (newlinePos = text.indexOf(
      `
`,
      startPos,
    )) !== -1
  ) {
    if (lineIndex >= s && lineIndex < f && !truncatedByBytes) {
      let line = text.slice(startPos, newlinePos);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      tryPush(line);
    }
    lineIndex++;
    startPos = newlinePos + 1;
  }
  if (lineIndex >= s && lineIndex < f && !truncatedByBytes) {
    let line = text.slice(startPos);
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
//@ chunk-wn385gmf.js:22228-22291 fingerprint = streamOnOpen (1)
function streamOnOpen(n) {
  fstat(n, (err, stats) => {
    this.resolveMtime(err ? 0 : stats.mtimeMs);
  });
}
//@ chunk-wn385gmf.js:22291-22436 layout
/**
 * 流式读取的数据回调：首块检测 UTF-16LE 后切换解码器。
 */
function streamOnDataWithBomDetection(n) {
  if (this.isFirstChunk && detectEncodingFromBom(n) === "utf16le")
    this.decoder = new StringDecoder("utf16le");
  let e = this.decoder.write(n);
  if (e.length > 0) streamOnData.call(this, e);
}
//@ chunk-wn385gmf.js:22436-24210 fingerprint = streamOnData (0.885)
function streamOnData(n) {
  let chunk = n;
  if (this.isFirstChunk) {
    this.isFirstChunk = false;
    if (chunk.charCodeAt(0) === 65279) chunk = chunk.slice(1);
  }
  let r = Buffer.byteLength(chunk);
  this.totalBytesRead += r;
  if (this.hardCapBytes !== undefined && this.totalBytesRead > this.hardCapBytes) {
    this.stream.destroy(new FileTooLargeError(this.totalBytesRead, this.hardCapBytes));
    return;
  }
  if (!this.truncateOnByteLimit && this.maxBytes !== undefined && this.totalBytesRead > this.maxBytes) {
    this.stream.destroy(new FileTooLargeError(this.totalBytesRead, this.maxBytes));
    return;
  }
  let data = this.partial.length > 0 ? this.partial + chunk : chunk;
  let o = this.partialBytes + r;
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
      let c = this.truncateOnByteLimit && this.maxBytes !== undefined;
      if (c || this.maxSelectedBytes !== undefined) {
        let sep = this.selectedLines.length > 0 ? 1 : 0;
        let h = this.selectedBytes + sep + Buffer.byteLength(line);
        if (c && h > this.maxBytes) {
          this.truncatedByBytes = true;
          this.endLine = this.currentLineIndex;
        } else if (this.maxSelectedBytes !== undefined && h > this.maxSelectedBytes) {
          this.stream.destroy(new SelectedRangeTooLargeError(h, this.maxSelectedBytes));
          return;
        } else {
          this.selectedBytes = h;
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
      let c = startPos === 0 ? o : Buffer.byteLength(fragment);
      let f = this.truncateOnByteLimit && this.maxBytes !== undefined;
      if (f || this.maxSelectedBytes !== undefined) {
        let sep = this.selectedLines.length > 0 ? 1 : 0;
        let g = this.selectedBytes + sep + c;
        if (f && g > this.maxBytes) {
          this.truncatedByBytes = true;
          this.endLine = this.currentLineIndex;
          return;
        }
        if (this.maxSelectedBytes !== undefined && g > this.maxSelectedBytes) {
          this.stream.destroy(new SelectedRangeTooLargeError(g, this.maxSelectedBytes));
          return;
        }
      }
      this.partial = fragment;
      this.partialBytes = c;
    }
  }
}
//@ chunk-wn385gmf.js:24210-24985 fingerprint = streamOnEnd (0.923)
/**
 * 流式读取结束：冲刷解码器与最后一行，完成统计。
 */
function streamOnEnd() {
  let n = this.decoder.end();
  if (n.length > 0) {
    streamOnData.call(this, n);
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
//@ chunk-wn385gmf.js:24985-25653 fingerprint = readFileInRangeStreaming (0.846)
function readFileInRangeStreaming(
  filePath,
  offset,
  maxLines,
  maxBytes,
  maxSelectedBytes,
  hardCapBytes,
  truncateOnByteLimit,
  signal,
  c,
) {
  return new Promise((resolve, reject) => {
    let state = {
      stream: c
        ? createAbortableStream(c.handle, c.positional, signal)
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
    if (c) state.resolveMtime(c.mtimeMs);
    else state.stream.once("open", streamOnOpen.bind(state));
    state.stream.on("data", decodeWithBomDetection.bind(state));
    state.stream.once("end", decodeStreamEnd.bind(state));
    state.stream.once("error", reject);
  });
}
//@ chunk-wn385gmf.js:25747-25771 placement
var decodeWithBomDetection = STREAM_DECODE_OPTS_2(streamOnDataWithBomDetection);
var decodeStreamEnd = STREAM_DECODE_OPTS_2(streamOnEnd);
//@ chunk-wn385gmf.js:25771-26264 placement
function createAbortableStream(handle, e, r) {
  let o = Buffer.allocUnsafe(524288);
  let a = e ? 0 : null;
  let u = false;
  let l = new Readable({
    read() {
      if (u) return;
      u = true;
      handle
        .read(o, 0, 524288, a)
        .then(({ bytesRead }) => {
          u = false;
          if (l.destroyed) return;
          if (bytesRead === 0) {
            l.push(null);
            return;
          }
          if (a !== null) a += bytesRead;
          l.push(Buffer.from(o.subarray(0, bytesRead)));
        })
        .catch((error) => {
          u = false;
          l.destroy(toError(error));
        });
    },
  });
  if (r) {
    let c = () => {
      l.destroy(r.reason instanceof Error ? r.reason : new AbortError());
    };
    if (r.aborted) c();
    else {
      r.addEventListener("abort", c, {
        once: true,
      });
      l.once("close", () => r.removeEventListener("abort", c));
    }
  }
  return l;
}
//@ chunk-wn385gmf.js:26347-26646 placement
async function logFileStateResync(n, e, r = {}) {
  if (isDiskless()) {
    if (n.has(e)) reportOnce("file_state_resync");
    return null;
  }
  let s = fullReadState(n, e);
  if (!s) return null;
  try {
    let timestamp = await getFileModificationTimeAsync(e);
    if (timestamp <= s.timestamp) return null;
    let a = stripBom((await readFileChecked(e)).content);
    if (n.get(e) !== s) return null;
    return compareFileContent(n, e, s, timestamp, a, r.requireReadBeforeWrite === true);
  } catch {
    return null;
  }
}
//@ chunk-wn385gmf.js:26646-26782 placement
/**
 * 取该文件的完整读取状态（或从头开始的部分视图）。
 */
function fullReadState(n, e) {
  let r = n.get(e);
  if (!r) return null;
  let s = r.isPartialView === true && (r.offset ?? 1) <= 1 && r.limit === undefined;
  return isFullFileView(r) || s ? r : null;
}
//@ chunk-wn385gmf.js:26782-27186 placement
function compareFileContent(n, e, r, timestamp, o, a) {
  let u = matchesContentHash(r, o);
  n.set(e, {
    content: o,
    timestamp,
    offset: undefined,
    limit: undefined,
    ...((!u || r.contentNotInModelContext) && {
      contentNotInModelContext: true,
    }),
    ...((r.isPartialView || (a && !u)) && {
      isPartialView: true,
    }),
    ...(((a && !u) || r.refreshedBehindModel) && {
      refreshedBehindModel: true,
    }),
    ...(r.startupMemorySeed && {
      startupMemorySeed: true,
    }),
    ...(u &&
      r.seededFromContext && {
        seededFromContext: true,
      }),
  });
  return u ? "unchanged" : "changed";
}
//@ chunk-wn385gmf.js:27186-27424 placement
/**
 * 磁盘大小与记录的内容长度（考虑换行转换）是否不符。
 */
function isSizeInconsistent(n, e) {
  if (n.content === "" && n.contentHash !== undefined) {
    let contentLength = n.contentLength ?? 0;
    return e < contentLength || e > contentLength * 4 + 3;
  }
  let r = Buffer.byteLength(n.content);
  let s = 0;
  for (
    let index = n.content.indexOf(`
`);
    index !== -1;
  ) {
    s++;
    index = n.content.indexOf(
      `
`,
      index + 1,
    );
  }
  return e < r || e > r + s + 3;
}
//@ chunk-wn385gmf.js:27424-27483 placement
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
//@ chunk-wn385gmf.js:27483-27660 placement
/**
 * 路径是否在产品同步目录下且与附件路径对应。
 */
function isSyncedAttachPath(n, e, r) {
  let s = `${r.product}/`;
  if (!n.startsWith(s)) return false;
  let sliced = n.slice(s.length);
  return sliced.split("/").every((u) => u !== "" && u !== "." && u !== "..") && e === `${r.attach}/${sliced}`;
}
//@ chunk-wn385gmf.js:27660-27828 placement
/**
 * 检查文件状态是否需要重新同步，结果只回调一次。
 */
async function checkFileStateResyncOnce(readFileState, normalizedPath, fileState, s, signal, a = {}) {
  let u = false;
  let l = (c, f, h) => {
    if (!u && !signal.aborted) {
      u = true;
      a.onOutcome?.(c, f, h);
    }
  };
  try {
    return await checkFileStateResync(readFileState, normalizedPath, fileState, s, signal, a, l);
  } catch (error) {
    l("other", false);
    throw error;
  }
}
//@ chunk-wn385gmf.js:27828-29146 placement
/**
 * 检查读过的文件是否在别处被改动（部分视图、链接、超大、同/异）。
 */
async function checkFileStateResync(n, e, r, s, o, a, u) {
  let l = (m) => {
    u(m, false);
    return false;
  };
  if (!isFullFileView(r)) return l("partial_view");
  if (r.touchCompared) return l("already_compared");
  o.throwIfAborted();
  let c = nonblockingReadFlags();
  let platform = getPlatform();
  let h = platform === "linux" || platform === "wsl";
  let g = typeof c === "number" && (h || (platform === "macos" && !(await probeNoFollowAny())));
  let p;
  try {
    if (!g && (await statChain(e)) === undefined) return l("other");
    p = typeof c === "number" ? await openNoFollow(e, c | constants.O_NOFOLLOW, platform) : await open(e, c);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ELOOP")
      return l(errnoCode === "ENOENT" ? "enoent" : "leaf_link");
    throw error;
  }
  try {
    let stats = await p.stat();
    let w = h
      ? await readlink(`/proc/self/fd/${p.fd}`).catch(() => {
          return;
        })
      : e;
    let b =
      w !== e &&
      w !== undefined &&
      a.outputsLink !== undefined &&
      isSyncedAttachPath(e, w, a.outputsLink) &&
      a.isLandingJudged?.(w) === true;
    if (!stats.isFile()) return l("not_regular");
    if (stats.size > s) return l("oversize");
    if (stats.nlink > 1) return l("nlink");
    if (w === undefined) return l("other");
    if (w !== e && !b) return l("link_on_path");
    if (!g) {
      let stats = await p.stat({
        bigint: true,
      });
      let S = await statChain(e);
      if (S === undefined || S.dev !== stats.dev || S.ino !== stats.ino || isSentinelInode(S.ino))
        return l("link_on_path");
    }
    let R = false;
    let _ = false;
    try {
      R =
        !isSizeInconsistent(r, stats.size) &&
        matchesContentHash(
          r,
          (
            await readFileInRange(e, 0, undefined, s, o, {
              handle: p,
              handleStats: stats,
            })
          ).content,
        );
      _ = true;
    } finally {
      if (!o.aborted && n.get(e) === r) {
        n.set(e, {
          ...r,
          ...(R && {
            timestamp: Math.floor(stats.mtimeMs),
          }),
          touchCompared: true,
        });
        if (_) u(R ? "same" : "differs", b, stats.size);
      } else {
        R = false;
        u("other", false);
      }
    }
    return R;
  } finally {
    let m = p.close();
    if (o.aborted) m.catch(() => {});
    else await m;
  }
}
export {
  isSyncedAttachPath,
  readFileInRange,
  logFileStateResync,
  FileTooLargeError,
  SelectedRangeTooLargeError,
  readFileInRangeFast,
  defaultOutputRoots,
  checkFileStateResyncOnce,
  createAbortableStream,
};
