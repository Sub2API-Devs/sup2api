/**
 * memdir/memoryScan.ts
 *
 * 扫描记忆目录下的 .md 记忆文件，读取 frontmatter（描述、类型、mtime）并格式化为清单。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/memoryScan.ts
 * pieces: chunk-s61vbvea.js (20)
 * attribution: placement 20
 */
import { join, sep, resolve, basename, relative, isAbsolute } from "path";
import { lstat, readdir } from "fs/promises";
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

//@ chunk-s61vbvea.js:417201-417225 placement
/**
 * 200
 */
var MAX_RECALL_HEADERS = 200;
var ACCOUNT = "account";
//@ chunk-s61vbvea.js:417225-417624 placement = getTeamMemEntrypoint (0.566)
/**
 * 根据 CLAUDE_MEMORY_STORES 计算扫描时要排除的索引文件（各 store 的 promptIndex、MEMORY.md）和 skills 目录前缀。
 */
function loadedIndexExclusions() {
  let e;
  try {
    e = parseMemoryStoresEnv();
  } catch {
    return null;
  }
  if (e === null) return null;
  let n = new Set(["MEMORY.md"]);
  let r = [];
  for (let s of e) {
    for (let y of s.skillsDirs ?? []) {
      let parts = y.split("/");
      r.push((s.scope === "user" ? join(...parts) : join("team", s.mount, ...parts)) + sep);
    }
    if (s.promptIndex === undefined) continue;
    let parts = s.promptIndex.split("/");
    n.add(s.scope === "user" ? join(...parts) : join("team", s.mount, ...parts));
  }
  return {
    excluded: n,
    excludedPrefixes: r,
  };
}
//@ chunk-s61vbvea.js:417624-417778 placement = isTeamSubscriber (0.758)
function recallVisibleTeamMounts(e) {
  if (resolve(e) !== resolve(getAutoMemPath())) return null;
  let n = new Set();
  try {
    for (let r of parseMemoryStoresEnv() ?? []) if (r.scope === "team" && r.mount !== ACCOUNT) n.add(r.mount);
  } catch {}
  return n;
}
//@ chunk-s61vbvea.js:417778-417916 placement = isTeamSubscriber (1)
function isRecallVisiblePath(e, n) {
  if (n === null) return true;
  let parts = e.split(/[\\/]/);
  if (normalizeKeySegment(parts[0]) === "team") return parts.length < 3 || n.has(parts[1]);
  return !isExcludedMemoryKey(parts.join("/"));
}
//@ chunk-s61vbvea.js:417916-418062 placement
function isRecallableMemoryFile(e, n, r) {
  return (
    e.endsWith(".md") &&
    (n
      ? !n.excluded.has(e) && !n.excludedPrefixes.some((excludedPrefix) => e.startsWith(excludedPrefix))
      : basename(e) !== "MEMORY.md") &&
    isRecallVisiblePath(e, r)
  );
}
//@ chunk-s61vbvea.js:418062-418173 placement = isSessionPlanFile (1)
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
//@ chunk-s61vbvea.js:418173-418184 placement
var MAX_MEMORY_TITLE_CHARS = 120;
//@ chunk-s61vbvea.js:418184-418304 placement
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
//@ chunk-s61vbvea.js:418304-419514 placement = scanMemoryFiles (0.316)
/**
 * 扫描记忆目录下的 .md 文件（排除 MEMORY.md 与 memory store 的索引/skills），读取头部 frontmatter 得到 filename/description/type/mtime；可要求 no-follow 打开且单硬链接。
 */
async function scanMemoryHeaders(e, n, r = {}, s) {
  if (s) {
    let x = projectKeyFromMemoryDir(e);
    if (x !== undefined && (await isTeamMemoryDirAbsent(e)))
      return await readMemoryHeads(s, x, e, n, r.regularFilesOnly ?? false);
  }
  let h = loadedIndexExclusions();
  let y = recallVisibleTeamMounts(e);
  let mdFiles = (await readMemoryDirEntries(e, r.regularFilesOnly ?? false)).filter((x) =>
    isRecallableMemoryFile(x, h, y),
  );
  return (
    await Promise.allSettled(
      mdFiles.map(async (relativePath) => {
        let filePath = join(e, relativePath);
        let j;
        if (r.regularFilesOnly ?? false) {
          let noFollow = await openNoFollow_2(filePath);
          if (!noFollow.ok) throw Error("not opened no-follow for the head read");
          j = noFollow.value;
        }
        try {
          let G = j ? await j.stat() : undefined;
          if (G && (!G.isFile() || G.nlink !== 1))
            throw Error("not a single-named regular file at read time");
          if (j && NOFOLLOW_NONBLOCK_FLAGS === 0) {
            let [se, re] = await Promise.all([
              j.stat({
                bigint: true,
              }),
              lstat(filePath, {
                bigint: true,
              }),
            ]);
            if (!(
              se.isFile() &&
              re.isFile() &&
              (!hasInode(se.ino) || !hasInode(re.ino) || (se.dev === re.dev && se.ino === re.ino))
            ))
              throw Error("not the regular file at the name at read time");
          }
          let { content, mtimeMs } = await readFileInRange(
            filePath,
            0,
            MAX_UNTRUSTED_FRONTMATTER_LINES,
            MAX_UNTRUSTED_FRONTMATTER_BYTES,
            n,
            {
              truncateOnByteLimit: true,
              handle: j,
              handleStats: G,
            },
          );
          let { frontmatter, body } = parseMemoryFile(content, filePath);
          let memoryMetadata = getMemoryMetadata(frontmatter, "modified");
          let ae = memoryMetadata === null ? NaN : Date.parse(memoryMetadata);
          return {
            filename: relativePath,
            filePath,
            mtimeMs,
            modifiedMs: Number.isNaN(ae) ? mtimeMs : ae,
            description: frontmatter.description ?? (h ? firstHeadingOrLine(body) : null),
            type: parseMemoryType(getMemoryMetadata(frontmatter, "type")),
          };
        } finally {
          await j?.close().catch(() => {});
        }
      }),
    )
  )
    .filter((x) => x.status === "fulfilled")
    .map((x) => x.value)
    .sort((x, P) => P.mtimeMs - x.mtimeMs);
}
//@ chunk-s61vbvea.js:419514-419730 placement
async function scanMemoryFiles(e, n, r, s = {}) {
  try {
    let sliced = (await scanMemoryHeaders(e, n, s, r)).slice(0, MAX_RECALL_HEADERS);
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
//@ chunk-s61vbvea.js:419730-419804 placement
/**
 * 按是否只要普通文件决定用归一化读取还是递归 readdir 列出记忆目录。
 */
async function readMemoryDirEntries(source, n) {
  return n
    ? await normalizeSource_3(source, "")
    : await readdir(source, {
        recursive: true,
      });
}
//@ chunk-s61vbvea.js:419804-420044 placement = normalizeSource (0.771)
/**
 * 读目录项（名字配错）。
 */
async function normalizeSource_3(source, projectRoot) {
  let r = await readdir(join(source, projectRoot), {
    withFileTypes: true,
  });
  return (
    await Promise.all(
      r.map(async (h) => {
        let projectRoot_2 = projectRoot ? join(projectRoot, h.name) : h.name;
        let S = await entryKind(source, projectRoot_2, h);
        if (S === "directory") return await normalizeSource_3(source, projectRoot_2).catch(skipUnreadableDir);
        return S === "file" ? [projectRoot_2] : [];
      }),
    )
  ).flat();
}
//@ chunk-s61vbvea.js:420044-420152 placement
function skipUnreadableDir(e) {
  if (isFsInaccessible(e)) {
    if (!isENOENT(e)) logForDebugging(`memory scan: skipping unreadable subfolder: ${errorMessage(e)}`);
    return [];
  }
  throw e;
}
//@ chunk-s61vbvea.js:420152-420492 placement
/**
 * 判定目录项类型（file/directory/other）；Dirent 类型未知时用 lstat 再判断，文件已消失返回 other。
 */
async function entryKind(source, n, r) {
  if (r.isFile()) return "file";
  if (r.isDirectory()) return "directory";
  if (r.isSymbolicLink() || r.isBlockDevice() || r.isCharacterDevice() || r.isFIFO() || r.isSocket())
    return "other";
  let s = await lstat(join(source, n)).catch((error) => {
    if (isENOENT(error)) return null;
    throw error;
  });
  if (!s) return "other";
  return s.isFile() ? "file" : s.isDirectory() ? "directory" : "other";
}
//@ chunk-s61vbvea.js:420492-420509 placement
/**
 * 4 倍 frontmatter 上限 + 256
 */
var MAX_FRONTMATTER_READ_BYTES = 4 * MAX_UNTRUSTED_FRONTMATTER_BYTES + 256;
//@ chunk-s61vbvea.js:420509-420529 placement
/**
 * 记忆扫描失败时抛出的错误类型（区分存储列表失败与 readdir 失败）。
 */
class MemoryScanError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-s61vbvea.js:420529-420955 placement
/**
 * 通过存储接口列出记忆目录
 */
async function listMemoryFiles(e, projectKey, r) {
  let s = [];
  let h;
  do {
    let y = await e.listRecursive(
      {
        namespace: "memory",
        projectKey,
      },
      {
        cursor: h,
        skipKeyStats: true,
      },
    );
    if (!y.ok)
      throw new MemoryScanError(
        `memory scan listing failed: ${formatStorageError(y.error)}`,
        "memory scan listing failed (storage v5)",
      );
    for (let item of y.value.items) {
      if (item.key.namespace !== "memory" || (r && item.viaSymlink === true)) continue;
      s.push({
        relativePath: join(...item.key.relPath),
        key: item.key,
      });
    }
    h = y.value.cursor;
  } while (h !== undefined);
  return s;
}
//@ chunk-s61vbvea.js:420955-421449 placement
/**
 * 从不可信记忆文件的字节中取出前若干行（去 BOM、去行尾 \r），总字节不超过上限；内容被截断时最后一行不完整则丢弃。
 */
function parseUntrustedFrontmatter(e, totalBytes) {
  let r = totalBytes <= e.byteLength;
  let str = Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8");
  let y = str.charCodeAt(0) === 65279 ? str.slice(1) : str;
  let S = [];
  let w = 0;
  let R = false;
  function x(L) {
    let q = S.length > 0 ? 1 : 0;
    let Q = w + q + Buffer.byteLength(L);
    if (Q > MAX_UNTRUSTED_FRONTMATTER_BYTES) {
      R = true;
      return;
    }
    w = Q;
    S.push(L);
  }
  let P = 0;
  let j = 0;
  let G;
  while (
    (G = y.indexOf(
      `
`,
      j,
    )) !== -1
  ) {
    if (P < MAX_UNTRUSTED_FRONTMATTER_LINES && !R) {
      let sliced = y.slice(j, G);
      if (sliced.endsWith("\r")) sliced = sliced.slice(0, -1);
      x(sliced);
    }
    P++;
    j = G + 1;
  }
  if (P < MAX_UNTRUSTED_FRONTMATTER_LINES && !R)
    if (r) {
      let sliced = y.slice(j);
      if (sliced.endsWith("\r")) sliced = sliced.slice(0, -1);
      x(sliced);
    } else R = true;
  return S.join(`
`);
}
//@ chunk-s61vbvea.js:421449-422368 placement
/**
 * 读取记忆文件头（frontmatter），处理文件在列出与读取间消失
 */
async function readMemoryHeads(e, projectKey, r, s, h) {
  let y = loadedIndexExclusions();
  let S = recallVisibleTeamMounts(r);
  let filtered = (await listMemoryFiles(e, projectKey, h)).filter((P) =>
    isRecallableMemoryFile(P.relativePath, y, S),
  );
  return (
    await Promise.allSettled(
      filtered.map(async (P) => {
        s.throwIfAborted();
        let j = join(r, P.relativePath);
        let G = await e.read([
          {
            key: P.key,
            offset: 0,
            length: MAX_FRONTMATTER_READ_BYTES,
          },
        ]);
        s.throwIfAborted();
        if (!G.ok)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `memory head read failed: ${formatStorageError(G.error)}`,
            "memory head read failed (storage v5)",
          );
        let L = G.value.items[0];
        if (!L.found) throw Error("memory file vanished between list and read");
        if (!Number.isFinite(L.mtimeMs)) throw Error("memory head read carried no mtime");
        let untrustedFrontmatter = parseUntrustedFrontmatter(L.value, L.totalBytes);
        let { frontmatter, body } = parseMemoryFile(untrustedFrontmatter, j);
        let memoryMetadata = getMemoryMetadata(frontmatter, "modified");
        let ae = memoryMetadata === null ? NaN : Date.parse(memoryMetadata);
        return {
          filename: P.relativePath,
          filePath: j,
          mtimeMs: L.mtimeMs,
          modifiedMs: Number.isNaN(ae) ? L.mtimeMs : ae,
          description: frontmatter.description ?? (y ? firstHeadingOrLine(body) : null),
          type: parseMemoryType(getMemoryMetadata(frontmatter, "type")),
        };
      }),
    )
  )
    .filter((P) => P.status === "fulfilled")
    .map((P) => P.value)
    .sort((P, j) => j.mtimeMs - P.mtimeMs);
}
//@ chunk-s61vbvea.js:422368-422561 placement = formatMemoryManifest (1)
/**
 * 把记忆列表格式化为 `- [type] file (ISO 时间): description` 清单，供提取/选择提示使用。
 */
function formatMemoryManifest(memories) {
  return memories.map((m) => {
    let tag = m.type ? `[${m.type}] ` : "";
    let ts = new Date(m.mtimeMs).toISOString();
    let h = `- ${tag}${m.filename} (${ts})`;
    return m.description ? `${h}: ${m.description}` : h;
  }).join(`
`);
}
export {
  formatMemoryManifest,
  scanMemoryFiles,
  scanMemoryHeaders,
  isRecallCorpusFile,
  recallVisibleTeamMounts,
  loadedIndexExclusions,
  isRecallVisiblePath,
};
