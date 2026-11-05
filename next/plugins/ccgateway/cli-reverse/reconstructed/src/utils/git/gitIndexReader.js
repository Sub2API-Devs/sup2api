/**
 * utils/git/gitIndexReader.ts
 *
 * 2.1.316 新增：直接解析 .git/index（DIRC）二进制并结合 cat-file 批量读取，得到工作区 diff。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-01kgd7xg.js (56), chunk-7wx1ncrk.js (1)
 * attribution: placement 57
 */
import { createHash } from "crypto";
import { sep } from "path";
import { open, lstat, readlink } from "fs/promises";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { gitExe } from "../git.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./gitSafeEnv.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { getErrnoCode } from "../errors.js";
import { readHandleBounded } from "../fsSafety/boundOpen.js";
import { stripTrailingDotsSpaces } from "../ignorePatterns.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { getFileExtensionsFromBashCommand } from "../../services/analytics/metadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7wx1ncrk.js:231-311 placement
var DEV_NULL = "/dev/null";
var ISOLATED_GIT_CONFIG_ENV = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};
//@ chunk-01kgd7xg.js:27200-27352 placement
function resolveEolConversion(attr, autocrlf) {
  let eol = attr?.eol;
  return (
    textAttrToConversion(attr?.text) ??
    textAttrToConversion(attr?.crlf) ??
    (eol === "lf" || eol === "crlf"
      ? "always"
      : autocrlf?.toLowerCase() === "input" || parseGitBool(autocrlf) === true
        ? "if-text"
        : "never")
  );
}
//@ chunk-01kgd7xg.js:27352-27488 placement
function textAttrToConversion(attr) {
  switch (attr) {
    case "set":
    case "input":
      return "always";
    case "unset":
      return "never";
    case "auto":
      return "if-text";
    default:
      return null;
  }
}
//@ chunk-01kgd7xg.js:27488-27731 placement
function parseGitBool(value) {
  switch (value?.toLowerCase()) {
    case "true":
    case "yes":
    case "on":
      return true;
    case "false":
    case "no":
    case "off":
    case "":
      return false;
    default: {
      let match = /^\s*[+-]?(?:0x([0-9a-f]+)|(\d+))[kmg]?$/i.exec(value ?? "");
      return match === null ? null : /[^0]/.test(match[1] ?? match[2]);
    }
  }
}
//@ chunk-01kgd7xg.js:27731-27747 placement
var CARRIAGE_RETURN_CODE = 13;
var LINE_FEED_CODE = 10;
//@ chunk-01kgd7xg.js:27747-27999 placement
function looksBinary(bytes) {
  let printableCount = 0;
  let nonPrintableCount = 0;
  for (let j = 0; j < bytes.length; j++) {
    let byte = bytes[j];
    if (byte === CARRIAGE_RETURN_CODE) {
      if (bytes[j + 1] !== LINE_FEED_CODE) return true;
      j++;
    } else if (byte === 0) return true;
    else if (byte === LINE_FEED_CODE) continue;
    else if (byte === 127 || (byte < 32 && byte !== 8 && byte !== 9 && byte !== 12 && byte !== 27))
      nonPrintableCount++;
    else printableCount++;
  }
  if (bytes.at(-1) === 26) nonPrintableCount--;
  return printableCount >> 7 < nonPrintableCount;
}
//@ chunk-01kgd7xg.js:27999-28209 placement
function normalizeCrlf(buffer) {
  let index = buffer.indexOf(`\r
`);
  if (index === -1) return null;
  let normalized = Buffer.allocUnsafe(buffer.length - 1);
  buffer.copy(normalized, 0, 0, index);
  let writeIndex = index;
  for (let readIndex = index; readIndex < buffer.length; readIndex++)
    if (buffer[readIndex] !== CARRIAGE_RETURN_CODE || buffer[readIndex + 1] !== LINE_FEED_CODE)
      normalized[writeIndex++] = buffer[readIndex];
  return normalized.subarray(0, writeIndex);
}
//@ chunk-01kgd7xg.js:28209-28332 placement
function normalizeWorktreeBytes(bytes, conversion, indexText) {
  if (
    conversion === "never" ||
    (conversion === "if-text" &&
      (looksBinary(bytes) ||
        (indexText !== undefined &&
          indexText.includes(`\r
`) &&
          !looksBinary(indexText))))
  )
    return null;
  return normalizeCrlf(bytes);
}
//@ chunk-01kgd7xg.js:28332-28551 placement
function parseCheckAttrOutput(stdout) {
  let parts = stdout.split("\x00");
  if (parts.pop() !== "" || parts.length % 3 !== 0) return null;
  let attrByPath = new Map();
  for (let index = 0; index < parts.length; index += 3) {
    let path = parts[index];
    let attrs = attrByPath.get(path);
    if (attrs === undefined) {
      attrs = Object.create(null);
      attrByPath.set(path, attrs);
    }
    attrs[parts[index + 1]] = parts[index + 2];
  }
  return attrByPath;
}
//@ chunk-01kgd7xg.js:28588-28865 placement
var MAX_INDEX_ENTRIES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_PATH_BYTES;
var MAX_EXTENSIONS;
var HASH_LENGTHS;
var HASH_CHUNK_BYTES;
var INDEX_HEADER_BYTES;
var MAX_INDEX_ENTRIES;
var INDEX_CTIME_OFFSET;
var INDEX_MODE_OFFSET;
var INDEX_SIZE_OFFSET;
var INDEX_OID_OFFSET;
var ASSUME_VALID_FLAG;
var EXTENDED_FLAG;
var PATH_LENGTH_MASK;
var SKIP_WORKTREE_FLAG;
var INTENT_TO_ADD_FLAG;
var INDEX_MODE_KINDS;
var SUPPORTED_INDEX_VERSIONS;
var EXTENSION_HEADER_BYTES;
var EMPTY_BUFFER;
var SLASH_CODE;
var DOT_CODE;
deferInit("chunk-01kgd7xg.js:28588", () => {
  MAX_INDEX_ENTRIES_2 = 1e6;
  MAX_PATH_BYTES = 67108864;
  MAX_EXTENSIONS = 1024;
  HASH_LENGTHS = {
    sha1: 20,
    sha256: 32,
  };
  HASH_CHUNK_BYTES = 8388608;
  INDEX_HEADER_BYTES = 12;
  MAX_INDEX_ENTRIES = 8;
  INDEX_CTIME_OFFSET = 20;
  INDEX_MODE_OFFSET = 24;
  INDEX_SIZE_OFFSET = 36;
  INDEX_OID_OFFSET = 40;
  ASSUME_VALID_FLAG = 32768;
  EXTENDED_FLAG = 16384;
  PATH_LENGTH_MASK = 4095;
  SKIP_WORKTREE_FLAG = 16384;
  INTENT_TO_ADD_FLAG = 8192;
  INDEX_MODE_KINDS = new Map([
    [33188, "file"],
    [33261, "executable"],
    [40960, "symlink"],
    [57344, "gitlink"],
  ]);
  SUPPORTED_INDEX_VERSIONS = [0, 1, 2, 3];
  EXTENSION_HEADER_BYTES = 8;
  EMPTY_BUFFER = Buffer.alloc(0);
  SLASH_CODE = 47;
  DOT_CODE = 46;
});
//@ chunk-01kgd7xg.js:28865-29784 placement
/**
 * 解析 .git/index（DIRC）二进制：版本、条目、扩展（EOIE/IEOT），超限或格式不支持时返回 refused。
 */
async function parseGitIndex(buffer, objectFormat, signal) {
  if (signal.aborted)
    return {
      refused: "aborted",
    };
  let trailerStart = buffer.length - HASH_LENGTHS[objectFormat];
  if (trailerStart < INDEX_HEADER_BYTES || buffer.toString("latin1", 0, 4) !== "DIRC")
    return {
      refused: "malformed",
    };
  let version = buffer.readUInt32BE(4);
  if (version !== 2 && version !== 3 && version !== 4)
    return {
      refused: "unsupported",
    };
  let uInt32BE = buffer.readUInt32BE(8);
  if (uInt32BE > MAX_INDEX_ENTRIES_2)
    return {
      refused: "too-large",
    };
  let buffer_2 = buffer.subarray(0, trailerStart);
  if (
    !isAllZeroBytes(buffer, trailerStart, buffer.length) &&
    !(await hashBufferChunked(buffer_2, objectFormat)).equals(buffer.subarray(trailerStart))
  )
    return {
      refused: "wrong-checksum",
    };
  if (signal.aborted)
    return {
      refused: "aborted",
    };
  let entries = [];
  let entryOffsets = [];
  let keptNames = [];
  let offset = INDEX_HEADER_BYTES;
  let pathBytesTotal = 0;
  while (entries.length < uInt32BE) {
    if (entries.length % MAX_EXTENSIONS === 0) await yieldToEventLoop();
    if (signal.aborted)
      return {
        refused: "aborted",
      };
    entryOffsets.push(offset);
    let indexEntry = parseIndexEntry(
      buffer_2,
      offset,
      version,
      HASH_LENGTHS[objectFormat],
      entries.at(-1)?.pathBytes ?? EMPTY_BUFFER,
    );
    if (typeof indexEntry === "string")
      return {
        refused: indexEntry,
      };
    pathBytesTotal += indexEntry.entry.pathBytes.length;
    if (pathBytesTotal > MAX_PATH_BYTES)
      return {
        refused: "too-large",
      };
    entries.push(indexEntry.entry);
    keptNames.push(indexEntry.kept);
    offset = indexEntry.next;
  }
  let failure =
    validateExtensionChain(buffer_2, offset) ??
    checkIndexExtensions(buffer_2, offset, entryOffsets, keptNames, objectFormat);
  if (failure !== null)
    return {
      refused: failure,
    };
  return entries.every(
    (entry, index) =>
      isSafeIndexPath(entry.pathBytes) && (index === 0 || isIndexEntryBefore(entries[index - 1], entry)),
  )
    ? {
        entries,
      }
    : {
        refused: "malformed",
      };
}
//@ chunk-01kgd7xg.js:29784-30530 placement
function parseIndexEntry(buffer, entryStart, version, hashLength, previousPath) {
  let flagsOffset = entryStart + INDEX_OID_OFFSET + hashLength;
  if (flagsOffset + 4 > buffer.length) return "malformed";
  let uInt16BE = buffer.readUInt16BE(flagsOffset);
  let extendsEntry = (uInt16BE & EXTENDED_FLAG) !== 0;
  let extendedFlags = extendsEntry ? buffer.readUInt16BE(flagsOffset + 2) : 0;
  if (
    (extendedFlags & ~(SKIP_WORKTREE_FLAG | INTENT_TO_ADD_FLAG)) !== 0 ||
    (extendsEntry && (version === 2 || extendedFlags === 0))
  )
    return "unsupported";
  let kind = INDEX_MODE_KINDS.get(buffer.readUInt32BE(entryStart + INDEX_MODE_OFFSET));
  if (kind === undefined || isAllZeroBytes(buffer, entryStart + INDEX_OID_OFFSET, flagsOffset))
    return "unsupported";
  let pathOffset = flagsOffset + (extendsEntry ? 4 : 2);
  let pathLength = uInt16BE & PATH_LENGTH_MASK;
  let pathResult =
    version === 4
      ? readCompressedEntryPath(buffer, pathOffset, previousPath)
      : readIndexEntryPath(buffer, entryStart, pathOffset, pathLength);
  if (typeof pathResult === "string") return pathResult;
  if (Math.min(pathResult.pathBytes.length, PATH_LENGTH_MASK) !== pathLength) return "malformed";
  return {
    entry: {
      pathBytes: pathResult.pathBytes,
      kind,
      id: buffer.toString("hex", entryStart + INDEX_OID_OFFSET, flagsOffset),
      stage: SUPPORTED_INDEX_VERSIONS[(uInt16BE >> 12) & 3],
      isSkipWorktree: (extendedFlags & SKIP_WORKTREE_FLAG) !== 0,
      isIntentToAdd: (extendedFlags & INTENT_TO_ADD_FLAG) !== 0,
      stat: {
        changedSeconds: buffer.readUInt32BE(entryStart),
        modifiedSeconds: buffer.readUInt32BE(entryStart + MAX_INDEX_ENTRIES),
        inode: buffer.readUInt32BE(entryStart + INDEX_CTIME_OFFSET),
        size: buffer.readUInt32BE(entryStart + INDEX_SIZE_OFFSET),
        isAssumedUnchanged: (uInt16BE & ASSUME_VALID_FLAG) !== 0,
      },
    },
    next: pathResult.next,
    kept: pathResult.kept ?? 0,
  };
}
//@ chunk-01kgd7xg.js:30530-30705 placement
function readIndexEntryPath(buffer, entryStart, pathOffset, pathLength) {
  let pathEnd = pathLength < PATH_LENGTH_MASK ? pathOffset + pathLength : buffer.indexOf(0, pathOffset);
  if (pathEnd === -1) return "malformed";
  let nextOffset = entryStart + ((pathEnd - entryStart + 8) & -8);
  return nextOffset <= buffer.length && isAllZeroBytes(buffer, pathEnd, nextOffset)
    ? {
        pathBytes: buffer.subarray(pathOffset, pathEnd),
        next: nextOffset,
      }
    : "malformed";
}
//@ chunk-01kgd7xg.js:30705-30965 placement
function readCompressedEntryPath(buffer, pathOffset, previousPath) {
  let offsetVarint = readOffsetVarint(buffer, pathOffset, previousPath.length);
  let nulIndex = offsetVarint === null ? -1 : buffer.indexOf(0, offsetVarint.next);
  if (offsetVarint === null || nulIndex === -1) return "malformed";
  let keptPrefix = previousPath.length - offsetVarint.value;
  if (keptPrefix + nulIndex - offsetVarint.next > MAX_PATH_BYTES) return "too-large";
  return {
    pathBytes: Buffer.concat([
      previousPath.subarray(0, keptPrefix),
      buffer.subarray(offsetVarint.next, nulIndex),
    ]),
    next: nulIndex + 1,
    kept: keptPrefix,
  };
}
//@ chunk-01kgd7xg.js:30965-31118 placement
function readOffsetVarint(buffer, start, limit) {
  let value = -1;
  for (let index = start; index < buffer.length; index++) {
    value = (value + 1) * 128 + (buffer[index] & 127);
    if (value > limit) return null;
    if ((buffer[index] & 128) === 0)
      return {
        value,
        next: index + 1,
      };
  }
  return null;
}
//@ chunk-01kgd7xg.js:31118-31306 placement
function isSafeIndexPath(pathBytes) {
  let segmentStart = 0;
  for (let j = 0; j <= pathBytes.length; j++)
    if (j === pathBytes.length || pathBytes[j] === SLASH_CODE) {
      let segmentLength = j - segmentStart;
      if (
        segmentLength === 0 ||
        (pathBytes[segmentStart] === DOT_CODE &&
          (segmentLength === 1 || (segmentLength === 2 && pathBytes[segmentStart + 1] === DOT_CODE)))
      )
        return false;
      segmentStart = j + 1;
    } else if (pathBytes[j] === 0) return false;
  return true;
}
//@ chunk-01kgd7xg.js:31306-31404 placement
function isIndexEntryBefore(previous, entry) {
  let order = Buffer.compare(previous.pathBytes, entry.pathBytes);
  return order < 0 || (order === 0 && previous.stage < entry.stage);
}
//@ chunk-01kgd7xg.js:31404-31583 placement
function validateExtensionChain(buffer, start) {
  let offset = start;
  while (offset < buffer.length) {
    if (offset + EXTENSION_HEADER_BYTES > buffer.length) return "malformed";
    if (buffer[offset] < 65 || buffer[offset] > 90) return "unsupported";
    offset += EXTENSION_HEADER_BYTES + buffer.readUInt32BE(offset + 4);
  }
  return offset === buffer.length ? null : "malformed";
}
//@ chunk-01kgd7xg.js:31583-32531 placement
/**
 * 校验 EOIE/IEOT 扩展（哈希一致）。
 */
function checkIndexExtensions(buffer, extensionStart, entryOffsets, keptNames, objectFormat) {
  let hashLength = HASH_LENGTHS[objectFormat];
  let hasEndOfIndexEntry = (candidateLength) => {
    let headerOffset = buffer.length - EXTENSION_HEADER_BYTES - 4 - candidateLength;
    return (
      headerOffset >= INDEX_HEADER_BYTES &&
      buffer.toString("latin1", headerOffset, headerOffset + 4) === "EOIE" &&
      buffer.readUInt32BE(headerOffset + 4) === 4 + candidateLength
    );
  };
  let any = Object.values(HASH_LENGTHS).some(
    (candidateLength) => candidateLength !== hashLength && hasEndOfIndexEntry(candidateLength),
  );
  let endOfIndexEntry = hasEndOfIndexEntry(hashLength);
  if (any) return "unsupported";
  let extensions = [];
  for (let offset = extensionStart; offset < buffer.length;) {
    let uInt32BE = buffer.readUInt32BE(offset + 4);
    extensions.push({
      name: buffer.toString("latin1", offset, offset + 4),
      at: offset,
      size: uInt32BE,
    });
    offset += EXTENSION_HEADER_BYTES + uInt32BE;
  }
  let last = extensions.at(-1);
  let expectedExtensionEnd = buffer.length - EXTENSION_HEADER_BYTES - 4 - hashLength;
  if (endOfIndexEntry) {
    if (last?.at !== expectedExtensionEnd || last.name !== "EOIE") return "unsupported";
    let hash = createHash(objectFormat);
    for (let extension of extensions.slice(0, -1))
      hash.update(buffer.subarray(extension.at, extension.at + EXTENSION_HEADER_BYTES));
    let bodyOffset = expectedExtensionEnd + EXTENSION_HEADER_BYTES;
    if (
      buffer.readUInt32BE(bodyOffset) !== extensionStart ||
      !hash.digest().equals(buffer.subarray(bodyOffset + 4, bodyOffset + 4 + hashLength))
    )
      return "unsupported";
  }
  let filtered = extensions.filter((extension) => extension.name === "IEOT");
  if (filtered.length === 0) return null;
  if (!endOfIndexEntry || filtered.length > 1) return "unsupported";
  let { at, size } = filtered[0];
  let bodyStart = at + EXTENSION_HEADER_BYTES;
  if (size < 4 || (size - 4) % 8 !== 0 || buffer.readUInt32BE(bodyStart) !== 1) return "unsupported";
  let entryCount = 0;
  for (let offset = bodyStart + 4; offset < bodyStart + size; offset += 8) {
    if (buffer.readUInt32BE(offset) !== entryOffsets[entryCount] || (keptNames[entryCount] ?? 0) > 0)
      return "unsupported";
    entryCount += buffer.readUInt32BE(offset + 4);
  }
  return entryCount === entryOffsets.length ? null : "unsupported";
}
//@ chunk-01kgd7xg.js:32531-32600 placement
function isAllZeroBytes(buffer, start, end) {
  for (let index = start; index < end; index++) if (buffer[index] !== 0) return false;
  return true;
}
//@ chunk-01kgd7xg.js:32600-32722 placement
async function hashBufferChunked(buffer, objectFormat) {
  let hash = createHash(objectFormat);
  for (let offset = 0; offset < buffer.length; offset += HASH_CHUNK_BYTES) {
    hash.update(buffer.subarray(offset, offset + HASH_CHUNK_BYTES));
    await yieldToEventLoop();
  }
  return hash.digest();
}
//@ chunk-01kgd7xg.js:32722-32777 placement
function yieldToEventLoop() {
  return new Promise((resolve) => setImmediate(resolve));
}
//@ chunk-01kgd7xg.js:32777-33161 placement
/**
 * 读工作区 diff 的各种上限与模式常量。
 */
var MAX_GIT_OUTPUT_BYTES_2 = 268435456;
var MAX_GIT_BUFFER = 100663296;
var MAX_HELD_FILE_BYTES = 1e7;
var MAX_TOTAL_HELD_BYTES = 67108864;
var BATCH_SIZE = 500;
var MAX_GIT_OUTPUT_BYTES = 40000000;
var MAX_DIFF_FILE_BYTES = 200000000;
var MAX_MYERS_EDIT_DISTANCE = 2000000;
var DIFF_COST_PER_LINE = 32;
var MAX_DIFF_LINES = 5000000;
var STAT_BATCH = 256;
var READ_CHUNK_BYTES = 1048576;
var BINARY_SNIFF_BYTES = 8000;
var MODE_FILE = 33188;
var MODE_EXECUTABLE = 33261;
var MODE_SYMLINK = 40960;
var MODE_GITLINK = 57344;
var MODE_TYPE_MASK = 61440;
var MODE_BY_KIND = {
  file: MODE_FILE,
  executable: MODE_EXECUTABLE,
  symlink: MODE_SYMLINK,
  gitlink: MODE_GITLINK,
};
var RELEVANT_CONFIG_PATTERN =
  "^(core\\.(autocrlf|filemode|symlinks|trustctime|checkstat|quotepath|sparsecheckout)|sparse\\.expectfilesoutsideofpatterns|extensions\\.objectformat)$";
//@ chunk-01kgd7xg.js:33161-35080 placement
/**
 * 不跑 git diff、直接读索引与工作区文件来计算改动（commit/work-tree/index 三方），供 diff 面板与工作区差异使用。
 */
async function readWorkTreeDiffViaIndex(repoDir, spawn, range, timeoutMs, signal, onWindows = sep === "\\") {
  let context = {
    repoDir,
    onWindows,
    spawn,
    signal,
    deadline: Date.now() + timeoutMs,
  };
  let indexPromise = weakMap.get(spawn);
  if (indexPromise === undefined) {
    indexPromise = readIndexWithSettings(context);
    weakMap.set(spawn, indexPromise);
  }
  let [indexInfo, treeSides] = await Promise.all([
    indexPromise,
    range.from === "commit" ? lsTree(context, range.revision) : new Map(),
  ]);
  if (!indexInfo || !treeSides) return null;
  let { settings, index } = indexInfo;
  if (range.to === "work-tree")
    indexInfo.workTree ??= statWorktreeEntries(context, settings, index).catch(() => null);
  let targetSides =
    range.to === "index"
      ? {
          sides: index.sides,
          unseen: new Set(),
        }
      : await indexInfo.workTree;
  if (!targetSides) return null;
  let { sides, unseen } = targetSides;
  let fromSides =
    range.from === "index"
      ? new Map(
          [...index.sides, ...Array.from(index.intended).filter(([path]) => !sides.has(path))].filter(
            ([path]) => !unseen.has(path),
          ),
        )
      : treeSides;
  let candidates = [];
  for (let [path, entry] of sides) {
    let other = fromSides.get(path);
    if (other?.mode !== entry.mode || other?.id !== entry.id || entry.bytes !== undefined)
      candidates.push(path);
  }
  for (let key of fromSides.keys()) if (!sides.has(key)) candidates.push(key);
  candidates.sort();
  let symlinkMemo = new Map();
  if (
    (
      await Promise.all(
        candidates.map((path) =>
          isUnderSymlink(context.repoDir, dirnamePosix(path), symlinkMemo, context.onWindows).catch(
            () => true,
          ),
        ),
      )
    ).includes(true)
  )
    return null;
  let attrs = await gitCheckAttr(context, candidates);
  if (attrs === null) return null;
  let emptyBlobId = gitBlobId(Buffer.alloc(0), settings.objectFormat);
  let rawLines = [];
  let numstatLines = [];
  let held = {
    bytes: 0,
  };
  let heldBytes = 0;
  let diffBudget = MAX_DIFF_FILE_BYTES;
  let linesSinceYield = 0;
  for (let batchStart = 0; batchStart < candidates.length; batchStart += BATCH_SIZE) {
    let sliced = candidates.slice(batchStart, batchStart + BATCH_SIZE);
    await new Promise((resolve) => setImmediate(resolve));
    if (isCancelledOrExpired(context)) heldBytes = BATCH_SIZE;
    let blobs =
      heldBytes < BATCH_SIZE
        ? await catFileBatch(
            context,
            sliced.flatMap((path) =>
              [fromSides.get(path), sides.get(path), index.sides.get(path)].flatMap((entry) =>
                entry !== undefined &&
                entry.mode !== MODE_GITLINK &&
                !entry.bytes &&
                !entry.uncounted &&
                entry.id !== emptyBlobId
                  ? [entry.id]
                  : [],
              ),
            ),
            held,
          )
        : new Map();
    if (blobs === null) return null;
    blobs.set(emptyBlobId, "");
    for (let path of sliced) {
      let pathAttrs = attrs.get(path);
      let fromEntry = fromSides.get(path);
      let toEntry = sides.get(path);
      let id = index.sides.get(path)?.id ?? "";
      let converted = applyEolToEntry(
        toEntry,
        resolveEolConversion(pathAttrs, settings.autocrlf),
        blobs.get(id) ?? (toEntry?.id === id ? toEntry.bytes?.toString("latin1") : undefined),
        settings.objectFormat,
      );
      if (fromEntry?.mode === converted?.mode && fromEntry?.id === converted?.id) continue;
      let [fromText, toText] = [entryText(fromEntry, blobs), entryText(converted, blobs)];
      let quotedPath = quoteGitPath(path, settings.quotesPaths);
      rawLines.push(formatRawDiffLine(fromEntry, converted, quotedPath));
      if (
        heldBytes >= BATCH_SIZE ||
        fromText === null ||
        toText === null ||
        isBinaryEntry(fromEntry, fromText, pathAttrs?.diff) ||
        isBinaryEntry(converted, toText, pathAttrs?.diff)
      ) {
        numstatLines.push(`-	-	${quotedPath}`);
        continue;
      }
      let min = Math.min(MAX_GIT_OUTPUT_BYTES, diffBudget);
      let budget = {
        left: min,
      };
      let { added, removed } = countLineChanges(fromText, toText, budget);
      numstatLines.push(`${added}	${removed}	${quotedPath}`);
      heldBytes++;
      diffBudget -= min - Math.max(0, budget.left);
      linesSinceYield += min - Math.max(0, budget.left);
      if (linesSinceYield > MAX_DIFF_LINES) {
        linesSinceYield = 0;
        await new Promise((resolve) => setImmediate(resolve));
        if (isCancelledOrExpired(context)) heldBytes = BATCH_SIZE;
      }
    }
  }
  return [...rawLines, ...numstatLines].join(`
`);
}
//@ chunk-01kgd7xg.js:35080-35252 placement
function formatRawDiffLine(fromEntry, toEntry, quotedPath) {
  let statusCode = !fromEntry
    ? "A"
    : !toEntry
      ? "D"
      : (fromEntry.mode & MODE_TYPE_MASK) !== (toEntry.mode & MODE_TYPE_MASK)
        ? "T"
        : "M";
  let modeText = (mode) => (mode?.mode ?? 0).toString(8).padStart(6, "0");
  return `:${modeText(fromEntry)} ${modeText(toEntry)} 0000000 0000000 ${statusCode}	${quotedPath}`;
}
//@ chunk-01kgd7xg.js:35252-35271 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-01kgd7xg.js:35252", () => {
  weakMap = new WeakMap();
});
//@ chunk-01kgd7xg.js:35271-35376 placement
async function readIndexWithSettings(context) {
  let objectFormat = await readObjectFormat(context);
  let index = objectFormat && (await readIndexFile(context, objectFormat.objectFormat));
  return (
    objectFormat &&
    index && {
      settings: objectFormat,
      index,
    }
  );
}
//@ chunk-01kgd7xg.js:35376-35448 placement
function isCancelledOrExpired({ signal, deadline }) {
  return signal?.aborted === true || Date.now() > deadline;
}
//@ chunk-01kgd7xg.js:35448-35734 placement
function runGitLiteral({ repoDir, spawn, signal, deadline }, args, input) {
  return execFileNoThrowWithCwd(gitExe(), ["--literal-pathspecs", ...GIT_SAFE_GLOBAL_ARGS, ...args], {
    ...spawn,
    cwd: repoDir,
    timeout: Math.max(1, deadline - Date.now()),
    abortSignal: signal,
    preserveOutputOnError: false,
    maxBuffer: MAX_GIT_BUFFER,
    encoding: "latin1",
    stripFinalNewline: false,
    ...(input === undefined
      ? {
          stdin: "ignore",
        }
      : {
          input,
        }),
  });
}
//@ chunk-01kgd7xg.js:35734-36427 placement
async function readObjectFormat(context) {
  let { stdout, exitCode } = await runGitLiteral(context, [
    "config",
    "-z",
    "--get-regexp",
    RELEVANT_CONFIG_PATTERN,
  ]);
  if (exitCode !== 0 && exitCode !== 1) return null;
  let config = new Map();
  for (let line of stdout.split("\x00")) {
    let [key = "", value] = line.split(
      `
`,
      2,
    );
    config.set(key, value ?? "true");
  }
  return {
    objectFormat: config.get("extensions.objectformat") === "sha256" ? "sha256" : "sha1",
    autocrlf: config.get("core.autocrlf") ?? null,
    trustsExecutableBit: configBoolNotFalse(config.get("core.filemode")),
    hasSymlinks: configBoolNotFalse(config.get("core.symlinks")),
    trustsChangeTime: configBoolNotFalse(config.get("core.trustctime")),
    checksWholeStat: config.get("core.checkstat")?.toLowerCase() !== "minimal",
    quotesPaths: configBoolNotFalse(config.get("core.quotepath")),
    looksAtSkippedFilesThatAreThere:
      parseGitBool(config.get("core.sparsecheckout")) === true &&
      parseGitBool(config.get("sparse.expectfilesoutsideofpatterns")) !== true,
  };
}
//@ chunk-01kgd7xg.js:36427-36460 placement
function configBoolNotFalse(value) {
  return parseGitBool(value) !== false;
}
//@ chunk-01kgd7xg.js:36460-37346 placement
async function readIndexFile({ spawn, signal }, objectFormat) {
  let GIT_INDEX_FILE = spawn.env.GIT_INDEX_FILE;
  if (GIT_INDEX_FILE === undefined) return null;
  let handle;
  try {
    handle = await open(GIT_INDEX_FILE, readOnlyNoFollowFlags());
  } catch (error) {
    return getErrnoCode(error) === "ENOENT"
      ? {
          entries: [],
          sides: new Map(),
          intended: new Map(),
          modifiedSeconds: 0,
        }
      : null;
  }
  try {
    let stats = await handle.stat();
    let handleBounded = await readHandleBounded(handle, MAX_GIT_OUTPUT_BYTES_2, stats.size);
    let parsed = handleBounded.overLimit
      ? null
      : await parseGitIndex(handleBounded.bytes, objectFormat, signal ?? new AbortController().signal);
    if (parsed === null || "refused" in parsed) return null;
    let mapped = parsed.entries.map((entry) => ({
      path: entry.pathBytes.toString("latin1"),
      entry,
      stat: entry.stat,
    }));
    if (!mapped.every(({ path }) => isSafeRelativePath(path))) return null;
    let mapped_2 = mapped
      .filter(({ entry }) => entry.stage === 0)
      .map(({ path, entry }) => ({
        isIntended: entry.isIntentToAdd,
        row: [
          path,
          {
            mode: MODE_BY_KIND[entry.kind],
            id: entry.id,
          },
        ],
      }));
    return {
      entries: mapped,
      sides: new Map(mapped_2.filter((row) => !row.isIntended).map((row) => row.row)),
      intended: new Map(mapped_2.filter((row) => row.isIntended).map((row) => row.row)),
      modifiedSeconds: Math.floor(stats.mtimeMs / 1000),
    };
  } catch {
    return null;
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-01kgd7xg.js:37346-37385 placement
var GIT_METADATA_NAME_RE = /^(?:\.git|git~1)[. ]*(?::|$)/i;
//@ chunk-01kgd7xg.js:37385-37636 placement
function isSafeRelativePath(path, onWindows = sep === "\\") {
  if (/^\/|\/\/|\/$/.test(path)) return false;
  if (!/\.\.|\.git|git~1|[\\:]/i.test(path)) return true;
  let parts = path.split(/[/\\]/);
  if (parts.some((part) => GIT_METADATA_NAME_RE.test(part))) return false;
  return onWindows
    ? !/[:\\]/.test(path) && parts.every((part) => stripTrailingDotsSpaces(part) !== "..")
    : !path.split("/").includes("..");
}
//@ chunk-01kgd7xg.js:37636-37956 placement
async function lsTree(context, revision) {
  let { stdout, code } = await runGitLiteral(context, ["ls-tree", "-r", "-z", "--full-tree", revision]);
  if (code !== 0) return null;
  let entries = new Map();
  for (let line of stdout.split("\x00")) {
    let match = /^(\d{6}) \S+ ([0-9a-f]{40,64})\t(.+)$/s.exec(line);
    if (match)
      entries.set(match[3], {
        mode: parseInt(match[1], 8),
        id: match[2],
      });
  }
  if (![...entries.keys()].every((key) => isSafeRelativePath(key))) return null;
  return entries;
}
//@ chunk-01kgd7xg.js:37956-38950 placement
/**
 * 批量检查索引条目对应的工作区文件。
 */
async function statWorktreeEntries(context, settings, index) {
  let { repoDir } = context;
  let sides = new Map();
  let unseen = new Set();
  let realPathMemo = new Map([["", Promise.resolve(true)]]);
  let held = {
    bytes: 0,
  };
  let toStat = [];
  for (let [index_2, record] of index.entries.entries()) {
    let { path, entry, stat } = record;
    if (
      entry.stage === 0 &&
      (stat.isAssumedUnchanged || (entry.isSkipWorktree && !settings.looksAtSkippedFilesThatAreThere))
    )
      sides.set(path, {
        mode: MODE_BY_KIND[entry.kind],
        id: entry.id,
      });
    else if (path !== index.entries[index_2 - 1]?.path) toStat.push(record);
  }
  for (let batchStart = 0; batchStart < toStat.length; batchStart += STAT_BATCH) {
    if (isCancelledOrExpired(context)) return null;
    let sliced = toStat.slice(batchStart, batchStart + STAT_BATCH);
    let dirStates = new Map(
      await Promise.all(
        normalizeCaseForComparison_2(sliced.map(({ path }) => dirnamePosix(path))).map(async (dir) => [
          dir,
          await isRealPathWithinTeamDir(repoDir, dir, realPathMemo).catch(() => {
            return;
          }),
        ]),
      ),
    );
    if (context.onWindows && [...dirStates.values()].includes(undefined)) return null;
    let results = await Promise.all(
      sliced.map(({ path }) =>
        dirStates.get(dirnamePosix(path)) === false
          ? "ENOTDIR"
          : dirStates.get(dirnamePosix(path)) === undefined
            ? "EACCES"
            : lstat(joinPathLatin1(repoDir, path)).catch(getErrnoCode),
      ),
    );
    let results_2 = await Promise.all(
      sliced.map((record, statResult) =>
        resolveWorktreeEntry(record, results[statResult], {
          lookup: context,
          settings,
          indexModifiedSeconds: index.modifiedSeconds,
          held,
        }),
      ),
    );
    for (let [index, result] of results_2.entries()) {
      if (result === "cannot-tell") return null;
      if (result === "unseen") unseen.add(sliced[index].path);
      else if (result !== null) sides.set(sliced[index].path, result);
    }
  }
  return {
    sides,
    unseen,
  };
}
//@ chunk-01kgd7xg.js:38950-39600 placement
/**
 * 由 stat 结果推断工作区条目（未变用索引 id，否则读文件）。
 */
function resolveWorktreeEntry({ path, entry, stat }, statResult, context) {
  let indexEntry = {
    mode: MODE_BY_KIND[entry.kind],
    id: entry.id,
  };
  if (statResult === undefined || typeof statResult === "string") {
    if (statResult !== "ENOENT" && statResult !== "ENOTDIR") return "unseen";
    return entry.isSkipWorktree ? indexEntry : null;
  }
  if (statResult.isDirectory()) return entry.kind === "gitlink" ? indexEntry : null;
  if (!statResult.isFile() && !statResult.isSymbolicLink()) return null;
  let { settings } = context;
  let isLink = statResult.isSymbolicLink() || (!settings.hasSymlinks && entry.kind === "symlink");
  let isExecutable = settings.trustsExecutableBit
    ? (statResult.mode & 64) !== 0
    : entry.kind === "executable";
  let mode = isLink ? MODE_SYMLINK : isExecutable ? MODE_EXECUTABLE : MODE_FILE;
  if (
    entry.stage === 0 &&
    mode === indexEntry.mode &&
    isStatUnchanged(stat, statResult, settings, context.indexModifiedSeconds)
  )
    return indexEntry;
  if (statResult.isSymbolicLink()) return hashWorktreeFile(path, mode, indexEntry.id, "link", context);
  let size =
    statResult.size <= MAX_HELD_FILE_BYTES && context.held.bytes + statResult.size <= MAX_TOTAL_HELD_BYTES
      ? statResult.size
      : 0;
  context.held.bytes += size;
  return hashWorktreeFile(path, mode, indexEntry.id, size, context);
}
//@ chunk-01kgd7xg.js:39600-39983 placement
/**
 * 读工作区文件或链接并计算对象 id。
 */
async function hashWorktreeFile(path, mode, expectedId, heldSize, { lookup, settings, held }) {
  let filePath = joinPathLatin1(lookup.repoDir, path);
  try {
    if (heldSize === "link") {
      let linkBytes = await readlink(filePath, {
        encoding: "buffer",
      });
      return {
        mode,
        id: gitBlobId(linkBytes, settings.objectFormat),
        bytes: linkBytes,
      };
    }
    let result = await readAndHashFile(filePath, mode, expectedId, lookup, settings, heldSize);
    if (result === null || result === "cannot-tell" || !result.bytes) held.bytes -= heldSize;
    return result;
  } catch (error) {
    held.bytes -= heldSize === "link" ? 0 : heldSize;
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || errnoCode === "ELOOP" ? null : "cannot-tell";
  }
}
//@ chunk-01kgd7xg.js:39983-40526 placement
/**
 * 读文件内容并计算 blob id（大文件只哈希不保留）。
 */
async function readAndHashFile(filePath, mode, expectedId, lookup, { objectFormat }, heldSize) {
  let handle = await open(filePath, readOnlyNoFollowFlags());
  try {
    let stats = await handle.stat();
    if (!stats.isFile()) return null;
    let { size } = stats;
    if (size > heldSize) {
      let hash = createHash(objectFormat).update(`blob ${size}\x00`);
      let buffer = Buffer.allocUnsafe(READ_CHUNK_BYTES);
      for (let offset = 0; offset < size;) {
        if (isCancelledOrExpired(lookup)) return "cannot-tell";
        let { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
        if (bytesRead === 0) break;
        hash.update(buffer.subarray(0, bytesRead));
        offset += bytesRead;
      }
      return {
        mode,
        id: hash.digest("hex"),
        uncounted: true,
      };
    }
    let { bytes } = await readHandleBounded(handle, size, size);
    let blobId = gitBlobId(bytes, objectFormat);
    return blobId === expectedId &&
      !bytes.includes(`\r
`)
      ? {
          mode,
          id: blobId,
        }
      : {
          mode,
          id: blobId,
          bytes,
        };
  } finally {
    await handle.close().catch(() => {
      return;
    });
  }
}
//@ chunk-01kgd7xg.js:40526-40801 placement
function isStatUnchanged(stat, stats, { trustsChangeTime, checksWholeStat }, indexModifiedSeconds) {
  return (
    stat.size !== 0 &&
    stat.size === stats.size % 4294967296 &&
    stat.modifiedSeconds === Math.floor(stats.mtimeMs / 1000) &&
    stat.modifiedSeconds < indexModifiedSeconds &&
    (!checksWholeStat ||
      ((!trustsChangeTime || stat.changedSeconds === Math.floor(stats.ctimeMs / 1000)) &&
        (stat.inode === 0 || stat.inode === stats.ino % 4294967296)))
  );
}
//@ chunk-01kgd7xg.js:40801-40865 placement
function dirnamePosix(path) {
  return path.slice(0, Math.max(0, path.lastIndexOf("/")));
}
//@ chunk-01kgd7xg.js:40865-41130 placement
function isUnderSymlink(repoDir, dirPath, memo, onWindows) {
  if (dirPath === "") return Promise.resolve(false);
  let underSymlink = memo.get(dirPath);
  if (underSymlink === undefined) {
    underSymlink = isUnderSymlink(repoDir, dirnamePosix(dirPath), memo, onWindows).then(
      (parentUnderSymlink) =>
        parentUnderSymlink ||
        lstat(joinPathLatin1(repoDir, dirPath)).then(
          (stats) => stats.isSymbolicLink(),
          (error) => {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR" || (errnoCode === "EACCES" && !onWindows))
              return false;
            throw error;
          },
        ),
    );
    memo.set(dirPath, underSymlink);
  }
  return underSymlink;
}
//@ chunk-01kgd7xg.js:41130-41333 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isRealPathWithinTeamDir(repoDir, dirPath, memo) {
  let underRealDir = memo.get(dirPath);
  if (underRealDir === undefined) {
    underRealDir = isRealPathWithinTeamDir(repoDir, dirnamePosix(dirPath), memo).then(
      (parentUnderRealDir) =>
        parentUnderRealDir &&
        lstat(joinPathLatin1(repoDir, dirPath)).then(
          (dirStats) => dirStats.isDirectory(),
          (error) => {
            let code = getErrnoCode(error);
            if (code === "ENOENT" || code === "ENOTDIR") return false;
            throw error;
          },
        ),
    );
    memo.set(dirPath, underRealDir);
  }
  return underRealDir;
}
//@ chunk-01kgd7xg.js:41333-41455 placement
function joinPathLatin1(repoDir, path) {
  return Buffer.byteLength(path) === path.length
    ? repoDir + sep + path
    : Buffer.concat([Buffer.from(repoDir + sep), Buffer.from(path, "latin1")]);
}
//@ chunk-01kgd7xg.js:41455-41677 placement
async function gitCheckAttr(context, paths) {
  if (paths.length === 0) return new Map();
  let { stdout, code } = await runGitLiteral(
    context,
    ["check-attr", "-z", "--stdin", "text", "crlf", "eol", "diff"],
    Buffer.from(paths.map((path) => `${path}\x00`).join(""), "latin1"),
  );
  return code === 0 ? parseCheckAttrOutput(stdout) : null;
}
//@ chunk-01kgd7xg.js:41677-42443 placement
async function catFileBatch(context, ids, held) {
  let uniqueIds = normalizeCaseForComparison_2(ids);
  if (uniqueIds.length === 0) return new Map();
  let checkResult = await runGitLiteral(
    context,
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    Buffer.from(
      uniqueIds
        .map(
          (id) => `${id}
`,
        )
        .join(""),
    ),
  );
  if (checkResult.code !== 0 || / missing$/m.test(checkResult.stdout)) return null;
  let flattened = checkResult.stdout
    .split(
      `
`,
    )
    .flatMap((line) => {
      let match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(line);
      let size = Number(match?.[2]);
      if (!match || size > MAX_HELD_FILE_BYTES || held.bytes + size > MAX_TOTAL_HELD_BYTES) return [];
      held.bytes += size;
      return [match[1]];
    });
  let blobs = new Map();
  if (flattened.length === 0) return blobs;
  let { stdout, code } = await runGitLiteral(
    context,
    ["cat-file", "--batch"],
    Buffer.from(
      flattened
        .map(
          (id) => `${id}
`,
        )
        .join(""),
    ),
  );
  if (code !== 0) return null;
  for (let offset = 0; offset < stdout.length;) {
    let index = stdout.indexOf(
      `
`,
      offset,
    );
    let match = /^([0-9a-f]{40,64}) blob (\d+)$/.exec(stdout.slice(offset, index));
    if (index === -1 || !match) return null;
    let contentEnd = index + 1 + Number(match[2]);
    blobs.set(match[1], stdout.slice(index + 1, contentEnd));
    offset = contentEnd + 1;
  }
  return blobs;
}
//@ chunk-01kgd7xg.js:42443-42643 placement
function applyEolToEntry(entry, conversion, indexText, objectFormat) {
  if (entry?.bytes === undefined || entry.mode === MODE_SYMLINK) return entry;
  let normalized = normalizeWorktreeBytes(
    entry.bytes,
    conversion,
    conversion === "if-text" &&
      indexText?.includes(`\r
`)
      ? Buffer.from(indexText, "latin1")
      : undefined,
  );
  return normalized === null
    ? entry
    : {
        mode: entry.mode,
        id: gitBlobId(normalized, objectFormat),
        bytes: normalized,
      };
}
//@ chunk-01kgd7xg.js:42643-42728 placement
function gitBlobId(buffer, objectFormat) {
  return createHash(objectFormat).update(`blob ${buffer.length}\x00`).update(buffer).digest("hex");
}
//@ chunk-01kgd7xg.js:42728-42899 placement
function entryText(entry, blobs) {
  if (entry === undefined) return "";
  if (entry.mode === MODE_GITLINK)
    return `Subproject commit ${entry.id}
`;
  if (entry.uncounted) return null;
  return entry.bytes?.toString("latin1") ?? blobs.get(entry.id) ?? null;
}
//@ chunk-01kgd7xg.js:42899-43039 placement
function isBinaryEntry(entry, text, diff) {
  if ((entry?.mode === MODE_FILE || entry?.mode === MODE_EXECUTABLE) && (diff === "set" || diff === "unset"))
    return diff === "unset";
  let index = text.indexOf("\x00");
  return index !== -1 && index < BINARY_SNIFF_BYTES;
}
//@ chunk-01kgd7xg.js:43039-43731 placement
/**
 * 统计增删行数（Myers 差分，带预算，超出时按唯一行锚点分治）。
 */
function countLineChanges(command, simulatedSedEditFilePath, budget) {
  let [oldText, newText] = getFileExtensionsFromBashCommand(command, simulatedSedEditFilePath);
  let lineCounts = {
    added: countLines(newText),
    removed: countLines(oldText),
  };
  budget.left -= (lineCounts.added + lineCounts.removed) * DIFF_COST_PER_LINE;
  if (budget.left < 0) return lineCounts;
  let [oldLines, newLines] = [splitKeepingNewlines(oldText), splitKeepingNewlines(newText)];
  let changes = {
    added: 0,
    removed: 0,
  };
  let pendingRanges = [[0, oldLines.length, 0, newLines.length]];
  for (let range = pendingRanges.pop(); range !== undefined; range = pendingRanges.pop()) {
    let [oldStart = 0, oldEnd = 0, newStart = 0, newEnd = 0] = range;
    while (oldStart < oldEnd && newStart < newEnd && oldLines[oldStart] === newLines[newStart]) {
      oldStart++;
      newStart++;
    }
    while (oldStart < oldEnd && newStart < newEnd && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    let [oldLen, newLen] = [oldEnd - oldStart, newEnd - newStart];
    if (oldLen === 0 || newLen === 0) {
      changes.removed += oldLen;
      changes.added += newLen;
      continue;
    }
    let [oldSlice, newSlice] = [oldLines.slice(oldStart, oldEnd), newLines.slice(newStart, newEnd)];
    let distance = myersDistance(oldSlice, newSlice, budget, MAX_MYERS_EDIT_DISTANCE);
    if (distance === null) {
      budget.left -= (oldLen + newLen) * DIFF_COST_PER_LINE;
      let anchors = budget.left < 0 ? [] : uniqueLineAnchors(oldSlice, newSlice);
      if (anchors.length > 0) {
        let [nextOldStart, nextNewStart] = [oldStart, newStart];
        for (let [oldAt, newAt] of anchors) {
          pendingRanges.push([nextOldStart, oldStart + oldAt, nextNewStart, newStart + newAt]);
          nextOldStart = oldStart + oldAt + 1;
          nextNewStart = newStart + newAt + 1;
        }
        pendingRanges.push([nextOldStart, oldEnd, nextNewStart, newEnd]);
        continue;
      }
      distance = myersDistance(oldSlice, newSlice, budget, budget.left) ?? oldLen + newLen;
    }
    changes.added += (distance + newLen - oldLen) / 2;
    changes.removed += (distance - newLen + oldLen) / 2;
  }
  return changes;
}
//@ chunk-01kgd7xg.js:43731-44129 placement
/**
 * Myers 算法求编辑距离（受预算限制）。
 */
function myersDistance(oldLines, newLines, budget, limit) {
  let min = Math.min(limit, budget.left);
  let cost = 0;
  let min_2 = Math.min(oldLines.length + newLines.length, Math.ceil(Math.sqrt(2 * Math.max(0, min))));
  let int32Array = new Int32Array(2 * min_2 + 3);
  let midIndex = min_2 + 1;
  for (let j = 0; j <= min_2 && cost <= min; j++)
    for (let diagonal = -j; diagonal <= j; diagonal += 2) {
      let [leftValue, rightValue] = [
        int32Array[midIndex + diagonal - 1],
        int32Array[midIndex + diagonal + 1],
      ];
      let startX = diagonal === -j || (diagonal !== j && leftValue < rightValue) ? rightValue : leftValue + 1;
      let x = startX;
      while (x < oldLines.length && x - diagonal < newLines.length && oldLines[x] === newLines[x - diagonal])
        x++;
      int32Array[midIndex + diagonal] = x;
      cost += 1 + x - startX;
      if (x >= oldLines.length && x - diagonal >= newLines.length) {
        budget.left -= cost;
        return j;
      }
    }
  budget.left -= cost;
  return null;
}
//@ chunk-01kgd7xg.js:44129-44602 placement
/**
 * 两侧唯一行的最长递增匹配（patience 锚点）。
 */
function uniqueLineAnchors(oldLines, newLines) {
  let newIndexByLine = new Map();
  for (let [index, line] of newLines.entries())
    newIndexByLine.set(line, newIndexByLine.has(line) ? -1 : index);
  let oldIndexByLine = new Map();
  for (let [index, line] of oldLines.entries())
    oldIndexByLine.set(line, oldIndexByLine.has(line) ? -1 : index);
  let anchors = [];
  let chainTails = [];
  for (let [line, oldIndex] of oldIndexByLine) {
    let newIndex = newIndexByLine.get(line) ?? -1;
    if (oldIndex === -1 || newIndex === -1) continue;
    let low = 0;
    let high = chainTails.length;
    while (low < high) {
      let mid = (low + high) >> 1;
      if (anchors[chainTails[mid]].newAt < newIndex) low = mid + 1;
      else high = mid;
    }
    anchors.push({
      oldAt: oldIndex,
      newAt: newIndex,
      previous: low === 0 ? -1 : chainTails[low - 1],
    });
    chainTails[low] = anchors.length - 1;
  }
  let pairs = [];
  for (let chainIndex = chainTails.at(-1) ?? -1; chainIndex !== -1; chainIndex = anchors[chainIndex].previous)
    pairs.push([anchors[chainIndex].oldAt, anchors[chainIndex].newAt]);
  return pairs.reverse();
}
//@ chunk-01kgd7xg.js:44938-45051 placement
function countLines(text) {
  let count =
    text === "" ||
    text.endsWith(`
`)
      ? 0
      : 1;
  for (let j = 0; j < text.length; j++) if (text.charCodeAt(j) === 10) count++;
  return count;
}
//@ chunk-01kgd7xg.js:45051-45116 placement
function splitKeepingNewlines(text) {
  return text === "" ? [] : (text.match(/[^\n]*\n|[^\n]+$/g) ?? []);
}
//@ chunk-01kgd7xg.js:45116-45232 placement
var C_ESCAPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-01kgd7xg.js:45116", () => {
  C_ESCAPES = new Map([
    [7, "\\a"],
    [8, "\\b"],
    [9, "\\t"],
    [10, "\\n"],
    [11, "\\v"],
    [12, "\\f"],
    [13, "\\r"],
    [34, '\\"'],
    [92, "\\\\"],
  ]);
});
//@ chunk-01kgd7xg.js:45232-45560 placement
function quoteGitPath(path, quotesPaths) {
  if (!(quotesPaths ? /[^\x20-\x7e]|["\\]/ : /[^\x20-\x7e\x80-\xff]|["\\]/).test(path))
    return Buffer.from(path, "latin1").toString("utf8");
  let joined = Array.from(path, (char) => {
    let code = char.charCodeAt(0);
    return (
      C_ESCAPES.get(code) ??
      (code < 32 || code === 127 || (quotesPaths && code >= 128)
        ? `\\${code.toString(8).padStart(3, "0")}`
        : char)
    );
  }).join("");
  return `"${Buffer.from(joined, "latin1").toString("utf8")}"`;
}
export { readWorkTreeDiffViaIndex, ISOLATED_GIT_CONFIG_ENV, normalizeCrlf, DEV_NULL };
