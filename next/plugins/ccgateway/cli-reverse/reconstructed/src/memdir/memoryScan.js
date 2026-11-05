/**
 * memdir/memoryScan.ts
 *
 * 扫描记忆目录下的 .md 记忆文件，读取 frontmatter（描述、类型、mtime）并格式化为清单。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/memoryScan.ts
 * pieces: chunk-7jxyna5q.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, sep, resolve, basename, relative, isAbsolute } from "path";
import { lstat as lstat_2, readdir } from "fs/promises";
import { parseMemoryStoresEnv } from "../services/orgMemory/memoryStores.js";
import { getAutoMemPath } from "./paths.js";
import { normalizeKeySegment, isExcludedMemoryKey } from "../services/memoryStore/memoryKeys.js";
import { projectKeyFromMemoryDir, isTeamMemoryDirAbsent } from "./teamMemPrompts.js";
import { openNoFollow_2, hasInode } from "../utils/fsSafety/hardenedRead.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../utils/fsFlags.js";
import { readFileInRange } from "../utils/readFileInRange.js";
import {
  MAX_UNTRUSTED_FRONTMATTER_LINES,
  MAX_UNTRUSTED_FRONTMATTER_BYTES,
} from "../utils/frontmatterParser.js";
import { parseMemoryFile, getMemoryMetadata, parseMemoryType } from "./memoryTypes.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import {
  isFsInaccessible,
  isENOENT,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:341592-341616 placement
/**
 * 200
 */
var MAX_RECALL_HEADERS = 200;
var ACCOUNT = "account";
//@ chunk-7jxyna5q.js:341616-342015 placement (2.1.88 match: getTeamMemEntrypoint, 0.567)
/**
 * 根据 CLAUDE_MEMORY_STORES 计算扫描时要排除的索引文件（各 store 的 promptIndex、MEMORY.md）和 skills 目录前缀。
 */
function loadedIndexExclusions() {
  let stores;
  try {
    stores = parseMemoryStoresEnv();
  } catch {
    return null;
  }
  if (stores === null) return null;
  let excluded = new Set(["MEMORY.md"]);
  let excludedPrefixes = [];
  for (let store of stores) {
    for (let skillsDir of store.skillsDirs ?? []) {
      let parts = skillsDir.split("/");
      excludedPrefixes.push(
        (store.scope === "user" ? join(...parts) : join("team", store.mount, ...parts)) + sep,
      );
    }
    if (store.promptIndex === undefined) continue;
    let parts = store.promptIndex.split("/");
    excluded.add(store.scope === "user" ? join(...parts) : join("team", store.mount, ...parts));
  }
  return {
    excluded,
    excludedPrefixes,
  };
}
//@ chunk-7jxyna5q.js:342015-342169 placement (2.1.88 match: isTeamSubscriber, 0.758)
function recallVisibleTeamMounts(dir) {
  if (resolve(dir) !== resolve(getAutoMemPath())) return null;
  let mounts = new Set();
  try {
    for (let store of parseMemoryStoresEnv() ?? [])
      if (store.scope === "team" && store.mount !== ACCOUNT) mounts.add(store.mount);
  } catch {}
  return mounts;
}
//@ chunk-7jxyna5q.js:342169-342307 placement (2.1.88 match: isTeamSubscriber, 1)
function isRecallVisiblePath(relativePath, teamMounts) {
  if (teamMounts === null) return true;
  let parts = relativePath.split(/[\\/]/);
  if (normalizeKeySegment(parts[0]) === "team") return parts.length < 3 || teamMounts.has(parts[1]);
  return !isExcludedMemoryKey(parts.join("/"));
}
//@ chunk-7jxyna5q.js:342307-342453 placement
function isRecallableMemoryFile(relativePath, exclusions, teamMounts) {
  return (
    relativePath.endsWith(".md") &&
    (exclusions
      ? !exclusions.excluded.has(relativePath) &&
        !exclusions.excludedPrefixes.some((excludedPrefix) => relativePath.startsWith(excludedPrefix))
      : basename(relativePath) !== "MEMORY.md") &&
    isRecallVisiblePath(relativePath, teamMounts)
  );
}
//@ chunk-7jxyna5q.js:342453-342564 placement (2.1.88 match: isSessionPlanFile, 1)
function isRecallCorpusFile(absolutePath) {
  let autoMemPath = getAutoMemPath();
  let expectedPrefix = relative(autoMemPath, absolutePath);
  return (
    expectedPrefix.endsWith(".md") &&
    !expectedPrefix.startsWith("..") &&
    !isAbsolute(expectedPrefix) &&
    isRecallableMemoryFile(expectedPrefix, loadedIndexExclusions(), recallVisibleTeamMounts(autoMemPath))
  );
}
//@ chunk-7jxyna5q.js:342564-342575 placement
var MAX_MEMORY_TITLE_CHARS = 120;
//@ chunk-7jxyna5q.js:342575-342695 placement
/**
 * 取文本第一行非空内容（去掉标题井号），截断到 120 字，作为记忆标题。
 */
function firstHeadingOrLine(body) {
  for (let line of body.split(`
`)) {
    let trimmed = line.replace(/^#{1,6}\s+/, "").trim();
    if (trimmed) return trimmed.slice(0, MAX_MEMORY_TITLE_CHARS);
  }
  return null;
}
//@ chunk-7jxyna5q.js:342695-343905 placement
/**
 * 扫描记忆目录下的 .md 文件（排除 MEMORY.md 与 memory store 的索引/skills），读取头部 frontmatter 得到 filename/description/type/mtime；可要求 no-follow 打开且单硬链接。
 */
async function scanMemoryHeaders(dir, client, options = {}, storeClient) {
  if (storeClient) {
    let projectKey = projectKeyFromMemoryDir(dir);
    if (projectKey !== undefined && (await isTeamMemoryDirAbsent(dir)))
      return await readMemoryHeads(storeClient, projectKey, dir, client, options.regularFilesOnly ?? false);
  }
  let exclusions = loadedIndexExclusions();
  let teamMounts = recallVisibleTeamMounts(dir);
  let filtered = (await readMemoryDirEntries(dir, options.regularFilesOnly ?? false)).filter((relativePath) =>
    isRecallableMemoryFile(relativePath, exclusions, teamMounts),
  );
  return (
    await Promise.allSettled(
      filtered.map(async (relativePath) => {
        let filePath = join(dir, relativePath);
        let handle;
        if (options.regularFilesOnly ?? false) {
          let noFollow = await openNoFollow_2(filePath);
          if (!noFollow.ok) throw Error("not opened no-follow for the head read");
          handle = noFollow.value;
        }
        try {
          let handleStat = handle ? await handle.stat() : undefined;
          if (handleStat && (!handleStat.isFile() || handleStat.nlink !== 1))
            throw Error("not a single-named regular file at read time");
          if (handle && NOFOLLOW_NONBLOCK_FLAGS === 0) {
            let [fstat, lstat] = await Promise.all([
              handle.stat({
                bigint: true,
              }),
              lstat_2(filePath, {
                bigint: true,
              }),
            ]);
            if (!(
              fstat.isFile() &&
              lstat.isFile() &&
              (!hasInode(fstat.ino) ||
                !hasInode(lstat.ino) ||
                (fstat.dev === lstat.dev && fstat.ino === lstat.ino))
            ))
              throw Error("not the regular file at the name at read time");
          }
          let { content, mtimeMs } = await readFileInRange(
            filePath,
            0,
            MAX_UNTRUSTED_FRONTMATTER_LINES,
            MAX_UNTRUSTED_FRONTMATTER_BYTES,
            client,
            {
              truncateOnByteLimit: true,
              handle,
              handleStats: handleStat,
            },
          );
          let { frontmatter, body } = parseMemoryFile(content, filePath);
          let memoryMetadata = getMemoryMetadata(frontmatter, "modified");
          let modifiedMs = memoryMetadata === null ? NaN : Date.parse(memoryMetadata);
          return {
            filename: relativePath,
            filePath,
            mtimeMs,
            modifiedMs: Number.isNaN(modifiedMs) ? mtimeMs : modifiedMs,
            description: frontmatter.description ?? (exclusions ? firstHeadingOrLine(body) : null),
            type: parseMemoryType(getMemoryMetadata(frontmatter, "type")),
          };
        } finally {
          await handle?.close().catch(() => {});
        }
      }),
    )
  )
    .filter((settled) => settled.status === "fulfilled")
    .map((settled) => settled.value)
    .sort((headA, headB) => headB.mtimeMs - headA.mtimeMs);
}
//@ chunk-7jxyna5q.js:343905-344121 placement
async function scanMemoryFiles(memoryDir, signal, storageV5, options = {}) {
  try {
    let sliced = (await scanMemoryHeaders(memoryDir, signal, options, storageV5)).slice(
      0,
      MAX_RECALL_HEADERS,
    );
    logFeatureOk("memory_scan");
    return sliced;
  } catch (error) {
    logFeatureSad(
      "memory_scan",
      error instanceof MemoryScanError ? "memory_scan_storage_list_failed" : "memory_scan_readdir_failed",
    );
    return [];
  }
}
//@ chunk-7jxyna5q.js:344121-344195 placement
/**
 * 按是否只要普通文件决定用归一化读取还是递归 readdir 列出记忆目录。
 */
async function readMemoryDirEntries(source, normalize) {
  return normalize
    ? await normalizeSource(source, "")
    : await readdir(source, {
        recursive: true,
      });
}
//@ chunk-7jxyna5q.js:344195-344435 placement (2.1.88 match: normalizeSource, 0.77)
/**
 * 读目录项（名字配错）。
 */
async function normalizeSource(source, projectRoot) {
  let dirents = await readdir(join(source, projectRoot), {
    withFileTypes: true,
  });
  return (
    await Promise.all(
      dirents.map(async (dirent) => {
        let relativePath = projectRoot ? join(projectRoot, dirent.name) : dirent.name;
        let kind = await entryKind(source, relativePath, dirent);
        if (kind === "directory") return await normalizeSource(source, relativePath).catch(skipUnreadableDir);
        return kind === "file" ? [relativePath] : [];
      }),
    )
  ).flat();
}
//@ chunk-7jxyna5q.js:344435-344543 placement
function skipUnreadableDir(error) {
  if (isFsInaccessible(error)) {
    if (!isENOENT(error))
      logForDebugging(`memory scan: skipping unreadable subfolder: ${errorMessage(error)}`);
    return [];
  }
  throw error;
}
//@ chunk-7jxyna5q.js:344543-344883 placement
/**
 * 判定目录项类型（file/directory/other）；Dirent 类型未知时用 lstat 再判断，文件已消失返回 other。
 */
async function entryKind(source, relativePath, dirent) {
  if (dirent.isFile()) return "file";
  if (dirent.isDirectory()) return "directory";
  if (
    dirent.isSymbolicLink() ||
    dirent.isBlockDevice() ||
    dirent.isCharacterDevice() ||
    dirent.isFIFO() ||
    dirent.isSocket()
  )
    return "other";
  let entryStat = await lstat_2(join(source, relativePath)).catch((error) => {
    if (isENOENT(error)) return null;
    throw error;
  });
  if (!entryStat) return "other";
  return entryStat.isFile() ? "file" : entryStat.isDirectory() ? "directory" : "other";
}
//@ chunk-7jxyna5q.js:344883-344900 placement
/**
 * 4 倍 frontmatter 上限 + 256
 */
var MAX_FRONTMATTER_READ_BYTES = 4 * MAX_UNTRUSTED_FRONTMATTER_BYTES + 256;
//@ chunk-7jxyna5q.js:344900-344920 placement
/**
 * 记忆扫描失败时抛出的错误类型（区分存储列表失败与 readdir 失败）。
 */
let MemoryScanError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../utils/errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:344900", () => {
  MemoryScanError = class MemoryScanError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {};
});
//@ chunk-7jxyna5q.js:344920-345346 placement
/**
 * 通过存储接口列出记忆目录
 */
async function listMemoryFiles(storeClient, projectKey, skipSymlinks) {
  let files = [];
  let cursor;
  do {
    let page = await storeClient.listRecursive(
      {
        namespace: "memory",
        projectKey,
      },
      {
        cursor,
        skipKeyStats: true,
      },
    );
    if (!page.ok)
      throw new MemoryScanError(
        `memory scan listing failed: ${formatStorageError(page.error)}`,
        "memory scan listing failed (storage v5)",
      );
    for (let item of page.value.items) {
      if (item.key.namespace !== "memory" || (skipSymlinks && item.viaSymlink === true)) continue;
      files.push({
        relativePath: join(...item.key.relPath),
        key: item.key,
      });
    }
    cursor = page.value.cursor;
  } while (cursor !== undefined);
  return files;
}
//@ chunk-7jxyna5q.js:345346-345840 placement
/**
 * 从不可信记忆文件的字节中取出前若干行（去 BOM、去行尾 \r），总字节不超过上限；内容被截断时最后一行不完整则丢弃。
 */
function parseUntrustedFrontmatter(buffer, totalBytes) {
  let fitsInBuffer = totalBytes <= buffer.byteLength;
  let str = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength).toString("utf8");
  let text = str.charCodeAt(0) === 65279 ? str.slice(1) : str;
  let lines = [];
  let byteCount = 0;
  let overflowed = false;
  function pushLine(line) {
    let separatorBytes = lines.length > 0 ? 1 : 0;
    let nextByteCount = byteCount + separatorBytes + Buffer.byteLength(line);
    if (nextByteCount > MAX_UNTRUSTED_FRONTMATTER_BYTES) {
      overflowed = true;
      return;
    }
    byteCount = nextByteCount;
    lines.push(line);
  }
  let lineIndex = 0;
  let lineStart = 0;
  let newlineIndex;
  while (
    (newlineIndex = text.indexOf(
      `
`,
      lineStart,
    )) !== -1
  ) {
    if (lineIndex < MAX_UNTRUSTED_FRONTMATTER_LINES && !overflowed) {
      let line = text.slice(lineStart, newlineIndex);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      pushLine(line);
    }
    lineIndex++;
    lineStart = newlineIndex + 1;
  }
  if (lineIndex < MAX_UNTRUSTED_FRONTMATTER_LINES && !overflowed)
    if (fitsInBuffer) {
      let line = text.slice(lineStart);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      pushLine(line);
    } else overflowed = true;
  return lines.join(`
`);
}
//@ chunk-7jxyna5q.js:345840-346761 placement (2.1.88 match: scanMemoryFiles, 0.321)
/**
 * 读取记忆文件头（frontmatter），处理文件在列出与读取间消失
 */
async function readMemoryHeads(storeClient, projectKey, memoryDir, signal, includeSymlinks) {
  let exclusions = loadedIndexExclusions();
  let visibleTeamMounts = recallVisibleTeamMounts(memoryDir);
  let mdFiles = (await listMemoryFiles(storeClient, projectKey, includeSymlinks)).filter((file) =>
    isRecallableMemoryFile(file.relativePath, exclusions, visibleTeamMounts),
  );
  return (
    await Promise.allSettled(
      mdFiles.map(async (file) => {
        signal.throwIfAborted();
        let filePath = join(memoryDir, file.relativePath);
        let readResult = await storeClient.read([
          {
            key: file.key,
            offset: 0,
            length: MAX_FRONTMATTER_READ_BYTES,
          },
        ]);
        signal.throwIfAborted();
        if (!readResult.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `memory head read failed: ${formatStorageError(readResult.error)}`,
            "memory head read failed (storage v5)",
          );
        let head = readResult.value.items[0];
        if (!head.found) throw Error("memory file vanished between list and read");
        if (!Number.isFinite(head.mtimeMs)) throw Error("memory head read carried no mtime");
        let untrustedFrontmatter = parseUntrustedFrontmatter(head.value, head.totalBytes);
        let { frontmatter, body } = parseMemoryFile(untrustedFrontmatter, filePath);
        let memoryMetadata = getMemoryMetadata(frontmatter, "modified");
        let modifiedMs = memoryMetadata === null ? NaN : Date.parse(memoryMetadata);
        return {
          filename: file.relativePath,
          filePath,
          mtimeMs: head.mtimeMs,
          modifiedMs: Number.isNaN(modifiedMs) ? head.mtimeMs : modifiedMs,
          description: frontmatter.description ?? (exclusions ? firstHeadingOrLine(body) : null),
          type: parseMemoryType(getMemoryMetadata(frontmatter, "type")),
        };
      }),
    )
  )
    .filter((settled) => settled.status === "fulfilled")
    .map((fulfilled) => fulfilled.value)
    .sort((memoryA, memoryB) => memoryB.mtimeMs - memoryA.mtimeMs);
}
//@ chunk-7jxyna5q.js:346761-346954 placement (2.1.88 match: formatMemoryManifest, 1)
/**
 * 把记忆列表格式化为 `- [type] file (ISO 时间): description` 清单，供提取/选择提示使用。
 */
function formatMemoryManifest(memories) {
  return memories.map((m) => {
    let tag = m.type ? `[${m.type}] ` : "";
    let ts = new Date(m.mtimeMs).toISOString();
    let prefix = `- ${tag}${m.filename} (${ts})`;
    return m.description ? `${prefix}: ${m.description}` : prefix;
  }).join(`
`);
}
export {
  scanMemoryHeaders,
  isRecallCorpusFile,
  scanMemoryFiles,
  recallVisibleTeamMounts,
  loadedIndexExclusions,
  isRecallVisiblePath,
  formatMemoryManifest,
};
