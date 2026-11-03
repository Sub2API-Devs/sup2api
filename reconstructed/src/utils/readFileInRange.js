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
import {
  stat,
  stat as stat_2,
  readFile,
  open,
  open as open_2,
  readlink,
  readlink as readlink_2,
} from "fs/promises";
import { fstat, createReadStream, constants, constants as constants_2 } from "fs";
import { StringDecoder } from "string_decoder";
import { Readable } from "stream";
import { formatFileSize } from "./format.js";
import { Ue, y3o } from "./claudeInChrome/fileUpload.js";
import { detectTextEncoding, detectEncodingFromBom, readFileChecked } from "./fileRead.js";
import { STREAM_DECODE_OPTS_2 } from "../cli/transports/SSETransport.js";
import { toError, AbortError, getErrnoCode } from "./errors.js";
import { isDiskless } from "../bootstrap/state.js";
import { reportOnce } from "./reportOnce.js";
import { getFileModificationTimeAsync } from "./file.js";
import { tv, isFullFileView, y1 } from "./remoteFileState.js";
import { mn } from "./remoteEnvironment.js";
import { DEFAULT_OUTPUTS_ROOT, DEFAULT_ATTACH_OUTPUTS_ROOT } from "./stageFileRoots.js";
import { nonblockingReadFlags } from "./fsOperations.js";
import { getPlatform } from "./platform.js";
import { probeNoFollowAny } from "./fsBoundRead.js";
import { statChain, openNoFollow } from "./fsSafety/pathRevalidation.js";
import { isSentinelInode } from "./slowOperations.js";

/**
 * 文件总大小超过 maxSizeBytes 的错误（带 sizeInBytes/maxSizeBytes）。
 */
//@ chunk-wn385gmf.js:19715-20071 fingerprint = FileTooLargeError (0.887)
class FileTooLargeError extends Error {
  sizeInBytes;
  maxSizeBytes;
  constructor(n, e, r = "") {
    super(
      `File content (${formatFileSize(n)}) exceeds maximum allowed size (${formatFileSize(e)}). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.${r}`,
    );
    this.sizeInBytes = n;
    this.maxSizeBytes = e;
    this.name = "FileTooLargeError";
  }
}
/**
 * 所选行区间字节数超过上限的错误。
 */
//@ chunk-wn385gmf.js:20071-20454 layout
class SelectedRangeTooLargeError extends Error {
  selectedBytes;
  maxSelectedBytes;
  constructor(n, e, r = "") {
    super(
      `The requested line range contains over ${formatFileSize(e)} of text, more than a read can return. Use a smaller limit \u2014 or, if a single line is this large, no limit will fit it: search for specific content instead.${r}`,
    );
    this.selectedBytes = n;
    this.maxSelectedBytes = e;
    this.name = "SelectedRangeTooLargeError";
  }
}
/**
 * 按行区间读文件：目录报 EISDIR；小于快速路径阈值的普通文件整读（超过 maxBytes 抛 FileTooLargeError），检测编码后切行；否则流式读取。返回内容、行数、总行数、字节数、mtime、notText。
 */
//@ chunk-wn385gmf.js:20454-21238 fingerprint = readFileInRange (0.505)
async function readFileInRange(filePath, offset = 0, maxLines, maxBytes, signal, options) {
  signal?.throwIfAborted();
  let truncateOnByteLimit = options?.truncateOnByteLimit ?? !1,
    l = options?.maxSelectedBytes,
    c = options?.handle,
    f = c ? (options?.handleStats ?? (await c.stat())) : await stat_2(filePath);
  if (l !== void 0 && f.isFile() && f.size <= l) l = void 0;
  if (f.isDirectory())
    throw Object.assign(Error(`EISDIR: illegal operation on a directory, read '${filePath}'`), {
      code: "EISDIR",
      errno: -21,
      syscall: "read",
      path: filePath,
    });
  if (f.isFile() && f.size < Ue) {
    if (!truncateOnByteLimit && maxBytes !== void 0 && f.size > maxBytes)
      throw new FileTooLargeError(f.size, maxBytes);
    let h = c ? await c.readFile({ signal: signal }) : await readFile(filePath, { signal: signal });
    if (!truncateOnByteLimit && maxBytes !== void 0) {
      if (h.length > maxBytes) throw new FileTooLargeError(h.length, maxBytes);
    }
    let { encoding: encoding, notText: notText } = detectTextEncoding(h);
    return {
      ...readFileInRangeFast(
        h.toString(encoding),
        f.size,
        f.mtimeMs,
        offset,
        maxLines,
        truncateOnByteLimit ? maxBytes : void 0,
        l,
      ),
      ...(notText && { notText: notText }),
    };
  }
  return readFileInRangeStreaming(
    filePath,
    offset,
    maxLines,
    maxBytes,
    l,
    f.isFile() ? void 0 : y3o,
    truncateOnByteLimit,
    signal,
    c ? { handle: c, mtimeMs: f.mtimeMs, positional: f.isFile() } : void 0,
  );
}
/**
 * 内存中按行切片（处理 BOM、CRLF、字节截断与选区上限）。
 */
//@ chunk-wn385gmf.js:21238-22228 fingerprint = readFileInRangeFast (1)
function readFileInRangeFast(n, e, r, s, o, a, u) {
  let l = n.charCodeAt(0) === 65279;
  if (l) e -= 3;
  let c = l ? n.slice(1) : n;
  if (s === 0 && o === void 0 && a === void 0 && u === void 0) {
    let y = c.includes("\r")
      ? c.replaceAll(
          `\r
`,
          `
`,
        )
      : c;
    if (y.endsWith("\r")) y = y.slice(0, -1);
    let S = 1,
      index = y.indexOf(`
`);
    while (index !== -1)
      (S++,
        (index = y.indexOf(
          `
`,
          index + 1,
        )));
    return {
      content: y,
      lineCount: S,
      totalLines: S,
      totalBytes: e,
      readBytes: Buffer.byteLength(y, "utf8"),
      mtimeMs: r,
      truncatedByBytes: !1,
    };
  }
  let f = o !== void 0 ? s + o : 1 / 0,
    selectedLines = [],
    g = 0,
    p = 0,
    newlinePos,
    w = 0,
    b = !1;
  function tryPush(line) {
    if (u !== void 0 || a !== void 0) {
      let S = selectedLines.length > 0 ? 1 : 0,
        O = w + S + Buffer.byteLength(line);
      if (a !== void 0 && O > a) return ((b = !0), !1);
      if (u !== void 0 && O > u) throw new SelectedRangeTooLargeError(O, u);
      w = O;
    }
    return (selectedLines.push(line), !0);
  }
  while (
    (newlinePos = c.indexOf(
      `
`,
      p,
    )) !== -1
  ) {
    if (g >= s && g < f && !b) {
      let line = c.slice(p, newlinePos);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      tryPush(line);
    }
    (g++, (p = newlinePos + 1));
  }
  if (g >= s && g < f && !b) {
    let line = c.slice(p);
    if (line.endsWith("\r")) line = line.slice(0, -1);
    tryPush(line);
  }
  g++;
  let joined = selectedLines.join(`
`);
  return {
    content: joined,
    lineCount: selectedLines.length,
    totalLines: g,
    totalBytes: e,
    readBytes: Buffer.byteLength(joined, "utf8"),
    mtimeMs: r,
    truncatedByBytes: b,
  };
}
//@ chunk-wn385gmf.js:22228-22291 fingerprint = streamOnOpen (1)
function streamOnOpen(n) {
  fstat(n, (err, stats) => {
    this.resolveMtime(err ? 0 : stats.mtimeMs);
  });
}
/**
 * 流式读取的数据回调：首块检测 UTF-16LE 后切换解码器。
 */
//@ chunk-wn385gmf.js:22291-22436 layout
function streamOnDataWithBomDetection(n) {
  if (this.isFirstChunk && detectEncodingFromBom(n) === "utf16le")
    this.decoder = new StringDecoder("utf16le");
  let write = this.decoder.write(n);
  if (write.length > 0) streamOnData.call(this, write);
}
//@ chunk-wn385gmf.js:22436-24210 fingerprint = streamOnData (0.885)
function streamOnData(n) {
  let e = n;
  if (this.isFirstChunk) {
    if (((this.isFirstChunk = !1), e.charCodeAt(0) === 65279)) e = e.slice(1);
  }
  let byteLength = Buffer.byteLength(e);
  if (
    ((this.totalBytesRead += byteLength),
    this.hardCapBytes !== void 0 && this.totalBytesRead > this.hardCapBytes)
  ) {
    this.stream.destroy(new FileTooLargeError(this.totalBytesRead, this.hardCapBytes));
    return;
  }
  if (!this.truncateOnByteLimit && this.maxBytes !== void 0 && this.totalBytesRead > this.maxBytes) {
    this.stream.destroy(new FileTooLargeError(this.totalBytesRead, this.maxBytes));
    return;
  }
  let s = this.partial.length > 0 ? this.partial + e : e,
    o = this.partialBytes + byteLength;
  ((this.partial = ""), (this.partialBytes = 0));
  let startPos = 0,
    newlinePos;
  while (
    (newlinePos = s.indexOf(
      `
`,
      startPos,
    )) !== -1
  ) {
    if (this.currentLineIndex >= this.offset && this.currentLineIndex < this.endLine) {
      let line = s.slice(startPos, newlinePos);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      let c = this.truncateOnByteLimit && this.maxBytes !== void 0;
      if (c || this.maxSelectedBytes !== void 0) {
        let f = this.selectedLines.length > 0 ? 1 : 0,
          h = this.selectedBytes + f + Buffer.byteLength(line);
        if (c && h > this.maxBytes) ((this.truncatedByBytes = !0), (this.endLine = this.currentLineIndex));
        else if (this.maxSelectedBytes !== void 0 && h > this.maxSelectedBytes) {
          this.stream.destroy(new SelectedRangeTooLargeError(h, this.maxSelectedBytes));
          return;
        } else ((this.selectedBytes = h), this.selectedLines.push(line));
      } else this.selectedLines.push(line);
    }
    (this.currentLineIndex++, (startPos = newlinePos + 1));
  }
  if (startPos < s.length) {
    if (this.currentLineIndex >= this.offset && this.currentLineIndex < this.endLine) {
      let fragment = s.slice(startPos),
        c = startPos === 0 ? o : Buffer.byteLength(fragment),
        f = this.truncateOnByteLimit && this.maxBytes !== void 0;
      if (f || this.maxSelectedBytes !== void 0) {
        let h = this.selectedLines.length > 0 ? 1 : 0,
          g = this.selectedBytes + h + c;
        if (f && g > this.maxBytes) {
          ((this.truncatedByBytes = !0), (this.endLine = this.currentLineIndex));
          return;
        }
        if (this.maxSelectedBytes !== void 0 && g > this.maxSelectedBytes) {
          this.stream.destroy(new SelectedRangeTooLargeError(g, this.maxSelectedBytes));
          return;
        }
      }
      ((this.partial = fragment), (this.partialBytes = c));
    }
  }
}
/**
 * 流式读取结束：冲刷解码器与最后一行，完成统计。
 */
//@ chunk-wn385gmf.js:24210-24985 fingerprint = streamOnEnd (0.923)
function streamOnEnd() {
  let end = this.decoder.end();
  if (end.length > 0) {
    if ((streamOnData.call(this, end), this.stream.destroyed)) return;
  }
  let line = this.partial;
  if (line.endsWith("\r")) line = line.slice(0, -1);
  if (this.currentLineIndex >= this.offset && this.currentLineIndex < this.endLine)
    if (this.truncateOnByteLimit && this.maxBytes !== void 0) {
      let sep = this.selectedLines.length > 0 ? 1 : 0;
      if (this.selectedBytes + sep + Buffer.byteLength(line) > this.maxBytes) this.truncatedByBytes = !0;
      else this.selectedLines.push(line);
    } else this.selectedLines.push(line);
  this.currentLineIndex++;
  let joined = this.selectedLines.join(`
`),
    truncated = this.truncatedByBytes;
  this.mtimeReady.then((mtimeMs) => {
    this.resolve({
      content: joined,
      lineCount: this.selectedLines.length,
      totalLines: this.currentLineIndex,
      totalBytes: this.totalBytesRead,
      readBytes: Buffer.byteLength(joined, "utf8"),
      mtimeMs: mtimeMs,
      truncatedByBytes: truncated,
    });
  });
}
//@ chunk-wn385gmf.js:24985-25653 fingerprint = readFileInRangeStreaming (0.846)
function readFileInRangeStreaming(n, e, r, s, o, a, u, l, c) {
  return new Promise((resolve, reject) => {
    let g = {
      stream: c
        ? createAbortableStream(c.handle, c.positional, l)
        : createReadStream(n, { highWaterMark: 524288, ...(l ? { signal: l } : void 0) }),
      decoder: new StringDecoder("utf8"),
      offset: e,
      endLine: r !== void 0 ? e + r : 1 / 0,
      maxBytes: s,
      maxSelectedBytes: o,
      hardCapBytes: a,
      truncateOnByteLimit: u,
      resolve: resolve,
      totalBytesRead: 0,
      selectedBytes: 0,
      truncatedByBytes: !1,
      currentLineIndex: 0,
      selectedLines: [],
      partial: "",
      partialBytes: 0,
      isFirstChunk: !0,
      resolveMtime: () => {},
      mtimeReady: null,
    };
    if (
      ((g.mtimeReady = new Promise((p) => {
        g.resolveMtime = p;
      })),
      c)
    )
      g.resolveMtime(c.mtimeMs);
    else g.stream.once("open", streamOnOpen.bind(g));
    (g.stream.on("data", je.bind(g)), g.stream.once("end", We.bind(g)), g.stream.once("error", reject));
  });
}
//@ chunk-wn385gmf.js:25747-25771 placement
var je = STREAM_DECODE_OPTS_2(streamOnDataWithBomDetection),
  We = STREAM_DECODE_OPTS_2(streamOnEnd);
//@ chunk-wn385gmf.js:25771-26264 placement
function createAbortableStream(n, e, r) {
  let allocUnsafe = Buffer.allocUnsafe(524288),
    a = e ? 0 : null,
    u = !1,
    l = new Readable({
      read() {
        if (u) return;
        ((u = !0),
          n
            .read(allocUnsafe, 0, 524288, a)
            .then(({ bytesRead: bytesRead }) => {
              if (((u = !1), l.destroyed)) return;
              if (bytesRead === 0) {
                l.push(null);
                return;
              }
              if (a !== null) a += bytesRead;
              l.push(Buffer.from(allocUnsafe.subarray(0, bytesRead)));
            })
            .catch((c) => {
              ((u = !1), l.destroy(toError(c)));
            }));
      },
    });
  if (r) {
    let c = () => {
      l.destroy(r.reason instanceof Error ? r.reason : new AbortError());
    };
    if (r.aborted) c();
    else
      (r.addEventListener("abort", c, { once: !0 }),
        l.once("close", () => r.removeEventListener("abort", c)));
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
    let o = await getFileModificationTimeAsync(e);
    if (o <= s.timestamp) return null;
    let a = tv((await readFileChecked(e)).content);
    if (n.get(e) !== s) return null;
    return compareFileContent(n, e, s, o, a, r.requireReadBeforeWrite === !0);
  } catch {
    return null;
  }
}
/**
 * 取该文件的完整读取状态（或从头开始的部分视图）。
 */
//@ chunk-wn385gmf.js:26646-26782 placement
function fullReadState(n, e) {
  let r = n.get(e);
  if (!r) return null;
  let s = r.isPartialView === !0 && (r.offset ?? 1) <= 1 && r.limit === void 0;
  return isFullFileView(r) || s ? r : null;
}
//@ chunk-wn385gmf.js:26782-27186 placement
function compareFileContent(n, e, r, s, o, a) {
  let u = y1(r, o);
  return (
    n.set(e, {
      content: o,
      timestamp: s,
      offset: void 0,
      limit: void 0,
      ...((!u || r.contentNotInModelContext) && { contentNotInModelContext: !0 }),
      ...((r.isPartialView || (a && !u)) && { isPartialView: !0 }),
      ...(((a && !u) || r.refreshedBehindModel) && { refreshedBehindModel: !0 }),
      ...(r.startupMemorySeed && { startupMemorySeed: !0 }),
      ...(u && r.seededFromContext && { seededFromContext: !0 }),
    }),
    u ? "unchanged" : "changed"
  );
}
/**
 * 磁盘大小与记录的内容长度（考虑换行转换）是否不符。
 */
//@ chunk-wn385gmf.js:27186-27424 placement
function isSizeInconsistent(n, e) {
  if (n.content === "" && n.contentHash !== void 0) {
    let o = n.contentLength ?? 0;
    return e < o || e > o * 4 + 3;
  }
  let byteLength = Buffer.byteLength(n.content),
    s = 0;
  for (
    let index = n.content.indexOf(`
`);
    index !== -1;
  )
    (s++,
      (index = n.content.indexOf(
        `
`,
        index + 1,
      )));
  return e < byteLength || e > byteLength + s + 3;
}
//@ chunk-wn385gmf.js:27424-27483 placement
function mor() {
  return mn() ? { product: DEFAULT_OUTPUTS_ROOT, attach: DEFAULT_ATTACH_OUTPUTS_ROOT } : void 0;
}
/**
 * 路径是否在产品同步目录下且与附件路径对应。
 */
//@ chunk-wn385gmf.js:27483-27660 placement
function isSyncedAttachPath(n, e, r) {
  let s = `${r.product}/`;
  if (!n.startsWith(s)) return !1;
  let sliced = n.slice(s.length);
  return sliced.split("/").every((u) => u !== "" && u !== "." && u !== "..") && e === `${r.attach}/${sliced}`;
}
/**
 * 检查文件状态是否需要重新同步，结果只回调一次。
 */
//@ chunk-wn385gmf.js:27660-27828 placement
async function checkFileStateResyncOnce(n, e, r, s, o, a = {}) {
  let u = !1,
    l = (c, f, h) => {
      if (!u && !o.aborted) ((u = !0), a.onOutcome?.(c, f, h));
    };
  try {
    return await checkFileStateResync(n, e, r, s, o, a, l);
  } catch (error) {
    throw (l("other", !1), error);
  }
}
/**
 * 检查读过的文件是否在别处被改动（部分视图、链接、超大、同/异）。
 */
//@ chunk-wn385gmf.js:27828-29146 placement
async function checkFileStateResync(n, e, r, s, o, a, u) {
  let l = (m) => (u(m, !1), !1);
  if (!isFullFileView(r)) return l("partial_view");
  if (r.touchCompared) return l("already_compared");
  o.throwIfAborted();
  let c = nonblockingReadFlags(),
    f = getPlatform(),
    h = f === "linux" || f === "wsl",
    g = typeof c === "number" && (h || (f === "macos" && !(await probeNoFollowAny()))),
    p;
  try {
    if (!g && (await statChain(e)) === void 0) return l("other");
    p = typeof c === "number" ? await openNoFollow(e, c | constants_2.O_NOFOLLOW, f) : await open_2(e, c);
  } catch (error) {
    let w = getErrnoCode(error);
    if (w === "ENOENT" || w === "ELOOP") return l(w === "ENOENT" ? "enoent" : "leaf_link");
    throw error;
  }
  try {
    let stats = await p.stat(),
      w = h
        ? await readlink_2(`/proc/self/fd/${p.fd}`).catch(() => {
            return;
          })
        : e,
      b =
        w !== e &&
        w !== void 0 &&
        a.outputsLink !== void 0 &&
        isSyncedAttachPath(e, w, a.outputsLink) &&
        a.isLandingJudged?.(w) === !0;
    if (!stats.isFile()) return l("not_regular");
    if (stats.size > s) return l("oversize");
    if (stats.nlink > 1) return l("nlink");
    if (w === void 0) return l("other");
    if (w !== e && !b) return l("link_on_path");
    if (!g) {
      let stats = await p.stat({ bigint: !0 }),
        S = await statChain(e);
      if (S === void 0 || S.dev !== stats.dev || S.ino !== stats.ino || isSentinelInode(S.ino))
        return l("link_on_path");
    }
    let R = !1,
      _ = !1;
    try {
      ((R =
        !isSizeInconsistent(r, stats.size) &&
        y1(r, (await readFileInRange(e, 0, void 0, s, o, { handle: p, handleStats: stats })).content)),
        (_ = !0));
    } finally {
      if (!o.aborted && n.get(e) === r) {
        if ((n.set(e, { ...r, ...(R && { timestamp: Math.floor(stats.mtimeMs) }), touchCompared: !0 }), _))
          u(R ? "same" : "differs", b, stats.size);
      } else ((R = !1), u("other", !1));
    }
    return R;
  } finally {
    let close = p.close();
    if (o.aborted) close.catch(() => {});
    else await close;
  }
}

export {
  isSyncedAttachPath,
  readFileInRange,
  FileTooLargeError,
  SelectedRangeTooLargeError,
  readFileInRangeFast,
  mor,
  checkFileStateResyncOnce,
  createAbortableStream,
  logFileStateResync,
};
