/**
 * utils/remoteFileState.ts
 *
 * 远程文件状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mxsrzv5n.js (19)
 * attribution: placement 19
 */
import { createHash } from "crypto";
import { normalize } from "path";
import { FILE_UNEXPECTEDLY_MODIFIED_ERROR } from "../tools/FileEditTool/constants.js";
import { countCharInString } from "./stringUtils.js";
import { LRUCache } from "../../vendor/lru-cache/dist/esm/index.min.js";
import { isRemoteToolsForwardEnabled2 } from "../bridge/deviceRegistration.js";

//@ chunk-mxsrzv5n.js:405-511 placement
function contentDigest(content) {
  return {
    sha256: createHash("sha256").update(content, "utf8").digest("hex"),
    bytes: Buffer.byteLength(content, "utf8"),
  };
}
//@ chunk-mxsrzv5n.js:511-598 placement
/**
 * matchesContentDigest：内容与记录的大小和 sha256 一致。
 */
function matchesContentDigest(readBaseline, content) {
  return (
    Buffer.byteLength(content, "utf8") === readBaseline.bytes &&
    contentDigest(content).sha256 === readBaseline.sha256
  );
}
//@ chunk-mxsrzv5n.js:598-721 placement
var FILE_MODIFIED_SINCE_READ_ERROR =
  "File has been modified since read, either by the user or by a linter. Read it again before attempting to write it.";
//@ chunk-mxsrzv5n.js:721-897 placement
function REMOTE_FILE_MODIFIED_ERROR(host) {
  return host === undefined
    ? FILE_MODIFIED_SINCE_READ_ERROR
    : `File has been modified on ${host} since this session read it. Read it again there (Read with "_host": "${host}") before attempting to write it.`;
}
//@ chunk-mxsrzv5n.js:897-1059 placement
/**
 * 文件自读取后被修改的错误文案（远程主机时提示用 _host 在该主机重新读取）。
 */
function fileModifiedErrorFor(servedOn) {
  return servedOn === undefined
    ? FILE_UNEXPECTEDLY_MODIFIED_ERROR
    : `File content on ${servedOn} has changed since this session read it. Read it again there (Read with "_host": "${servedOn}"), then retry.`;
}
//@ chunk-mxsrzv5n.js:1059-1089 placement
/**
 * READ_FILE_STATE_CACHE_SIZE：读文件状态缓存的最大条目数；MAX_READ_FILE_CACHE_BYTES：读文件状态缓存的字节上限；MAX_INLINE_READ_CONTENT_BYTES：缓存里保留内容的字节上限（同一声明共 3 个绑定）。
 */
var READ_FILE_STATE_CACHE_SIZE = 5000;
var MAX_READ_FILE_CACHE_BYTES = 26214400;
var MAX_INLINE_READ_CONTENT_BYTES = 4096;
//@ chunk-mxsrzv5n.js:1089-1137 placement
/**
 * contentHashOf：用 Bun.hash 计算内容哈希。
 */
function contentHashOf(content) {
  return Bun.hash(content).toString(36);
}
//@ chunk-mxsrzv5n.js:1137-1277 placement
/**
 * 判断读取记录是否覆盖了整个文件（从开头读且未达行数上限、非部分视图）。
 */
function isFullFileView(readResult) {
  if ((readResult.offset ?? 1) > 1 || readResult.isPartialView) return false;
  if (readResult.limit === undefined) return true;
  return (
    readResult.content !== "" &&
    countCharInString(
      readResult.content,
      `
`,
    ) +
      1 <
      readResult.limit
  );
}
//@ chunk-mxsrzv5n.js:1277-1347 placement
/**
 * hasFullFileContent：读取记录含完整文件内容。
 */
function hasFullFileContent(readResult) {
  return readResult !== undefined && isFullFileView(readResult) && !readResult.contentNotInModelContext;
}
//@ chunk-mxsrzv5n.js:1347-1441 placement
/**
 * matchesContentHash：内容哈希或原文与记录一致。
 */
function matchesContentHash(fileState, content) {
  if (fileState.contentHash !== undefined) return fileState.contentHash === contentHashOf(content);
  return fileState.content === content;
}
//@ chunk-mxsrzv5n.js:1441-1540 placement
/**
 * 判断当前文件内容是否与读取记录一致（来自转录的内容允许末尾多一个换行）。
 */
function matchesReadContent(fileState, content) {
  return (
    matchesReadBaseline(fileState, content) ||
    (fileState.contentFromTranscript === true &&
      content.endsWith(`
`) &&
      matchesReadBaseline(fileState, content.slice(0, -1)))
  );
}
//@ chunk-mxsrzv5n.js:1540-1617 placement
function matchesReadBaseline(fileState, content) {
  return fileState.readBaseline !== undefined
    ? matchesContentDigest(fileState.readBaseline, content)
    : matchesContentHash(fileState, content);
}
//@ chunk-mxsrzv5n.js:1617-1676 placement
/**
 * stripBom：去掉文件开头的 BOM。
 */
function stripBom(text) {
  return text.charCodeAt(0) === 65279 ? text.slice(1) : text;
}
//@ chunk-mxsrzv5n.js:1676-1726 placement
/**
 * stripBomAndCarriageReturn：去掉 BOM 与裸回车。
 */
function stripBomAndCarriageReturn(text) {
  return stripBom(text).replaceAll(
    `\r
`,
    `
`,
  );
}
//@ chunk-mxsrzv5n.js:1726-1763 placement
/**
 * matchesNormalizedContent：规范化后内容一致。
 */
function matchesNormalizedContent(fileState, content) {
  return matchesContentHash(fileState, stripBomAndCarriageReturn(content));
}
//@ chunk-mxsrzv5n.js:1763-3409 placement
class RemoteFileState {
  keepsReadBaselines;
  cache;
  everHeld = new Set();
  startOnly = new Set();
  constructor(max, maxSize, keepsReadBaselines = false) {
    this.keepsReadBaselines = keepsReadBaselines;
    this.cache = new LRUCache({
      max,
      maxSize,
      sizeCalculation: (fileState) => Math.max(1, Buffer.byteLength(fileState.content)),
    });
  }
  get(path) {
    return this.cache.get(normalize(path));
  }
  markStartOnly(path) {
    this.startOnly.add(normalize(path));
  }
  startOnlyPaths() {
    return [...this.startOnly];
  }
  holdsOnlyStartOf(path) {
    let normalizedPath = normalize(path);
    return this.startOnly.has(normalizedPath) && !hasFullFileContent(this.cache.get(normalizedPath));
  }
  set(path, entry) {
    let normalizedPath = normalize(path);
    let existing = this.cache.get(normalizedPath);
    let keepContent = entry.keepContent ?? existing?.keepContent;
    let contentHash = entry.contentHash ?? contentHashOf(entry.content);
    let contentLength = entry.contentLength ?? entry.content.length;
    let hasNewContent = entry.content !== "" || entry.contentHash === undefined;
    let readBaseline = !(this.keepsReadBaselines || isRemoteToolsForwardEnabled2())
      ? undefined
      : hasNewContent && !entry.contentFromTranscript && isFullFileView(entry)
        ? contentDigest(entry.content)
        : (entry.readBaseline ??
          (contentHash === existing?.contentHash ? existing?.readBaseline : undefined));
    let content =
      keepContent && entry.content === "" && contentHash === existing?.contentHash && existing.content
        ? existing.content
        : entry.content;
    let content_2 = keepContent || Buffer.byteLength(content) <= MAX_INLINE_READ_CONTENT_BYTES ? content : "";
    this.cache.set(normalizedPath, {
      ...entry,
      keepContent,
      contentHash,
      contentLength,
      content: content_2,
      readBaseline,
    });
    this.remember(normalizedPath);
    return this;
  }
  remember(path) {
    this.everHeld.delete(path);
    this.everHeld.add(path);
    if (this.everHeld.size > this.cache.max)
      for (let oldestPath of this.everHeld) {
        this.everHeld.delete(oldestPath);
        break;
      }
  }
  has(path) {
    return this.cache.has(normalize(path));
  }
  delete(path) {
    return this.cache.delete(normalize(path));
  }
  clear() {
    this.cache.clear();
  }
  get size() {
    return this.cache.size;
  }
  get max() {
    return this.cache.max;
  }
  get maxSize() {
    return this.cache.maxSize;
  }
  get calculatedSize() {
    return this.cache.calculatedSize;
  }
  keys() {
    return this.cache.keys();
  }
  everHeldPaths() {
    return new Set([...this.everHeld, ...this.cache.keys()]);
  }
  entries() {
    return this.cache.entries();
  }
  dump() {
    return this.cache.dump();
  }
  load(dump) {
    this.cache.load(dump);
    for (let path of this.cache.rkeys()) this.remember(path);
  }
}
//@ chunk-mxsrzv5n.js:3409-3453 placement
/**
 * createRemoteFileState：创建远程文件读取状态。
 */
function createRemoteFileState(max, maxSize = MAX_READ_FILE_CACHE_BYTES, keepsReadBaselines = false) {
  return new RemoteFileState(max, maxSize, keepsReadBaselines);
}
//@ chunk-mxsrzv5n.js:3453-3508 placement
/**
 * remoteFileStateToObject：读文件状态转普通对象。
 */
function remoteFileStateToObject(readFileState) {
  return Object.fromEntries(readFileState.entries());
}
//@ chunk-mxsrzv5n.js:3508-3552 placement
/**
 * remoteFileStateKeys：读文件状态的路径列表。
 */
function remoteFileStateKeys(readFileState) {
  return Array.from(readFileState.keys());
}
export {
  READ_FILE_STATE_CACHE_SIZE,
  createRemoteFileState,
  stripBomAndCarriageReturn,
  isFullFileView,
  matchesContentHash,
  remoteFileStateKeys,
  hasFullFileContent,
  matchesReadContent,
  matchesContentDigest,
  stripBom,
  fileModifiedErrorFor,
  REMOTE_FILE_MODIFIED_ERROR,
  matchesNormalizedContent,
  remoteFileStateToObject,
  contentHashOf,
};
