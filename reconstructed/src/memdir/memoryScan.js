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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
} from "fs/promises";
import { parseMemoryStoresEnv } from "../services/orgMemory/memoryStores.js";
import { getAutoMemPath } from "./paths.js";
import { normalizeKeySegment, isExcludedMemoryKey } from "../services/memoryStore/memoryKeys.js";
import { projectKeyFromMemoryDir, isTeamMemoryDirAbsent } from "./teamMemPrompts.js";
import { openNoFollow_2, hasInode } from "../utils/fsSafety/hardenedRead.js";
import { ws } from "../utils/fsFlags.js";
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
var KL = 200,
  ACCOUNT = "account";
/**
 * 根据 CLAUDE_MEMORY_STORES 计算扫描时要排除的索引文件（各 store 的 promptIndex、MEMORY.md）和 skills 目录前缀。
 */
//@ chunk-s61vbvea.js:417225-417624 placement = getTeamMemEntrypoint (0.566)
function loadedIndexExclusions() {
  let e;
  try {
    e = parseMemoryStoresEnv();
  } catch {
    return null;
  }
  if (e === null) return null;
  let n = new Set(["MEMORY.md"]),
    r = [];
  for (let s of e) {
    for (let y of s.skillsDirs ?? []) {
      let parts = y.split("/");
      r.push((s.scope === "user" ? join_12(...parts) : join_12("team", s.mount, ...parts)) + sep_6);
    }
    if (s.promptIndex === void 0) continue;
    let parts = s.promptIndex.split("/");
    n.add(s.scope === "user" ? join_12(...parts) : join_12("team", s.mount, ...parts));
  }
  return { excluded: n, excludedPrefixes: r };
}
//@ chunk-s61vbvea.js:417624-417778 placement = isTeamSubscriber (0.758)
function recallVisibleTeamMounts(e) {
  if (resolve_6(e) !== resolve_6(getAutoMemPath())) return null;
  let n = new Set();
  try {
    for (let r of parseMemoryStoresEnv() ?? []) if (r.scope === "team" && r.mount !== ACCOUNT) n.add(r.mount);
  } catch {}
  return n;
}
//@ chunk-s61vbvea.js:417778-417916 placement = isTeamSubscriber (1)
function isRecallVisiblePath(e, n) {
  if (n === null) return !0;
  let parts = e.split(/[\\/]/);
  if (normalizeKeySegment(parts[0]) === "team") return parts.length < 3 || n.has(parts[1]);
  return !isExcludedMemoryKey(parts.join("/"));
}
//@ chunk-s61vbvea.js:417916-418062 placement
function isRecallableMemoryFile(e, n, r) {
  return (
    e.endsWith(".md") &&
    (n
      ? !n.excluded.has(e) && !n.excludedPrefixes.some((excludedPrefixe) => e.startsWith(excludedPrefixe))
      : basename_3(e) !== "MEMORY.md") &&
    isRecallVisiblePath(e, r)
  );
}
//@ chunk-s61vbvea.js:418062-418173 placement = isSessionPlanFile (1)
function isRecallCorpusFile(absolutePath) {
  let n = getAutoMemPath(),
    expectedPrefix = relative_6(n, absolutePath);
  return (
    expectedPrefix.endsWith(".md") &&
    !expectedPrefix.startsWith("..") &&
    !isAbsolute_9(expectedPrefix) &&
    isRecallableMemoryFile(expectedPrefix, loadedIndexExclusions(), recallVisibleTeamMounts(n))
  );
}
//@ chunk-s61vbvea.js:418173-418184 placement
var MAX_MEMORY_TITLE_CHARS = 120;
/**
 * 取文本第一行非空内容（去掉标题井号），截断到 120 字，作为记忆标题。
 */
//@ chunk-s61vbvea.js:418184-418304 placement
function firstHeadingOrLine(e) {
  for (let n of e.split(`
`)) {
    let trimmed = n.replace(/^#{1,6}\s+/, "").trim();
    if (trimmed) return trimmed.slice(0, MAX_MEMORY_TITLE_CHARS);
  }
  return null;
}
/**
 * 扫描记忆目录下的 .md 文件（排除 MEMORY.md 与 memory store 的索引/skills），读取头部 frontmatter 得到 filename/description/type/mtime；可要求 no-follow 打开且单硬链接。
 */
//@ chunk-s61vbvea.js:418304-419514 placement = scanMemoryFiles (0.316)
async function scanMemoryHeaders(e, n, r = {}, s) {
  if (s) {
    let x = projectKeyFromMemoryDir(e);
    if (x !== void 0 && (await isTeamMemoryDirAbsent(e)))
      return await readMemoryHeads(s, x, e, n, r.regularFilesOnly ?? !1);
  }
  let h = loadedIndexExclusions(),
    y = recallVisibleTeamMounts(e),
    mdFiles = (await qL(e, r.regularFilesOnly ?? !1)).filter((x) => isRecallableMemoryFile(x, h, y));
  return (
    await Promise.allSettled(
      mdFiles.map(async (relativePath) => {
        let filePath = join_12(e, relativePath),
          j;
        if (r.regularFilesOnly ?? !1) {
          let G = await openNoFollow_2(filePath);
          if (!G.ok) throw Error("not opened no-follow for the head read");
          j = G.value;
        }
        try {
          let G = j ? await j.stat() : void 0;
          if (G && (!G.isFile() || G.nlink !== 1))
            throw Error("not a single-named regular file at read time");
          if (j && ws === 0) {
            let [se, re] = await Promise.all([j.stat({ bigint: !0 }), lstat_3(filePath, { bigint: !0 })]);
            if (!(
              se.isFile() &&
              re.isFile() &&
              (!hasInode(se.ino) || !hasInode(re.ino) || (se.dev === re.dev && se.ino === re.ino))
            ))
              throw Error("not the regular file at the name at read time");
          }
          let { content: content, mtimeMs: mtimeMs } = await readFileInRange(
              filePath,
              0,
              MAX_UNTRUSTED_FRONTMATTER_LINES,
              MAX_UNTRUSTED_FRONTMATTER_BYTES,
              n,
              { truncateOnByteLimit: !0, handle: j, handleStats: G },
            ),
            { frontmatter: frontmatter, body: body } = parseMemoryFile(content, filePath),
            ee = getMemoryMetadata(frontmatter, "modified"),
            ae = ee === null ? NaN : Date.parse(ee);
          return {
            filename: relativePath,
            filePath: filePath,
            mtimeMs: mtimeMs,
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
    let sliced = (await scanMemoryHeaders(e, n, s, r)).slice(0, KL);
    return (logFeatureOk("memory_scan"), sliced);
  } catch (error) {
    return (
      logFeatureSad(
        "memory_scan",
        error instanceof Mf ? "memory_scan_storage_list_failed" : "memory_scan_readdir_failed",
      ),
      []
    );
  }
}
//@ chunk-s61vbvea.js:419730-419804 placement
async function qL(e, n) {
  return n ? await normalizeSource_3(e, "") : await readdir_4(e, { recursive: !0 });
}
/**
 * 读目录项（名字配错）。
 */
//@ chunk-s61vbvea.js:419804-420044 placement = normalizeSource (0.771)
async function normalizeSource_3(source, projectRoot) {
  let r = await readdir_4(join_12(source, projectRoot), { withFileTypes: !0 });
  return (
    await Promise.all(
      r.map(async (h) => {
        let y = projectRoot ? join_12(projectRoot, h.name) : h.name,
          S = await entryKind(source, y, h);
        if (S === "directory") return await normalizeSource_3(source, y).catch(skipUnreadableDir);
        return S === "file" ? [y] : [];
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
/**
 * 判定目录项类型（file/directory/other）；Dirent 类型未知时用 lstat 再判断，文件已消失返回 other。
 */
//@ chunk-s61vbvea.js:420152-420492 placement
async function entryKind(e, n, r) {
  if (r.isFile()) return "file";
  if (r.isDirectory()) return "directory";
  if (r.isSymbolicLink() || r.isBlockDevice() || r.isCharacterDevice() || r.isFIFO() || r.isSocket())
    return "other";
  let s = await lstat_3(join_12(e, n)).catch((h) => {
    if (isENOENT(h)) return null;
    throw h;
  });
  if (!s) return "other";
  return s.isFile() ? "file" : s.isDirectory() ? "directory" : "other";
}
//@ chunk-s61vbvea.js:420492-420509 placement
var QL = 4 * MAX_UNTRUSTED_FRONTMATTER_BYTES + 256;
//@ chunk-s61vbvea.js:420509-420529 placement
class Mf extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
/**
 * 通过存储接口列出记忆目录
 */
//@ chunk-s61vbvea.js:420529-420955 placement
async function listMemoryFiles(e, n, r) {
  let s = [],
    h;
  do {
    let listRecursive = await e.listRecursive(
      { namespace: "memory", projectKey: n },
      { cursor: h, skipKeyStats: !0 },
    );
    if (!listRecursive.ok)
      throw new Mf(
        `memory scan listing failed: ${formatStorageError(listRecursive.error)}`,
        "memory scan listing failed (storage v5)",
      );
    for (let item of listRecursive.value.items) {
      if (item.key.namespace !== "memory" || (r && item.viaSymlink === !0)) continue;
      s.push({ relativePath: join_12(...item.key.relPath), key: item.key });
    }
    h = listRecursive.value.cursor;
  } while (h !== void 0);
  return s;
}
/**
 * 从不可信记忆文件的字节中取出前若干行（去 BOM、去行尾 \r），总字节不超过上限；内容被截断时最后一行不完整则丢弃。
 */
//@ chunk-s61vbvea.js:420955-421449 placement
function parseUntrustedFrontmatter(e, n) {
  let r = n <= e.byteLength,
    str = Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8"),
    y = str.charCodeAt(0) === 65279 ? str.slice(1) : str,
    S = [],
    w = 0,
    R = !1;
  function x(L) {
    let q = S.length > 0 ? 1 : 0,
      Q = w + q + Buffer.byteLength(L);
    if (Q > MAX_UNTRUSTED_FRONTMATTER_BYTES) {
      R = !0;
      return;
    }
    ((w = Q), S.push(L));
  }
  let P = 0,
    j = 0,
    G;
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
    (P++, (j = G + 1));
  }
  if (P < MAX_UNTRUSTED_FRONTMATTER_LINES && !R)
    if (r) {
      let sliced = y.slice(j);
      if (sliced.endsWith("\r")) sliced = sliced.slice(0, -1);
      x(sliced);
    } else R = !0;
  return S.join(`
`);
}
/**
 * 读取记忆文件头（frontmatter），处理文件在列出与读取间消失
 */
//@ chunk-s61vbvea.js:421449-422368 placement
async function readMemoryHeads(e, n, r, s, h) {
  let y = loadedIndexExclusions(),
    S = recallVisibleTeamMounts(r),
    filtered = (await listMemoryFiles(e, n, h)).filter((P) => isRecallableMemoryFile(P.relativePath, y, S));
  return (
    await Promise.allSettled(
      filtered.map(async (P) => {
        s.throwIfAborted();
        let j = join_12(r, P.relativePath),
          read = await e.read([{ key: P.key, offset: 0, length: QL }]);
        if ((s.throwIfAborted(), !read.ok))
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `memory head read failed: ${formatStorageError(read.error)}`,
            "memory head read failed (storage v5)",
          );
        let L = read.value.items[0];
        if (!L.found) throw Error("memory file vanished between list and read");
        if (!Number.isFinite(L.mtimeMs)) throw Error("memory head read carried no mtime");
        let q = parseUntrustedFrontmatter(L.value, L.totalBytes),
          { frontmatter: frontmatter, body: body } = parseMemoryFile(q, j),
          ee = getMemoryMetadata(frontmatter, "modified"),
          ae = ee === null ? NaN : Date.parse(ee);
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
/**
 * 把记忆列表格式化为 `- [type] file (ISO 时间): description` 清单，供提取/选择提示使用。
 */
//@ chunk-s61vbvea.js:422368-422561 placement = formatMemoryManifest (1)
function formatMemoryManifest(memories) {
  return memories.map((n) => {
    let tag = n.type ? `[${n.type}] ` : "",
      ts = new Date(n.mtimeMs).toISOString(),
      h = `- ${tag}${n.filename} (${ts})`;
    return n.description ? `${h}: ${n.description}` : h;
  }).join(`
`);
}

export {
  scanMemoryFiles,
  scanMemoryHeaders,
  isRecallCorpusFile,
  recallVisibleTeamMounts,
  loadedIndexExclusions,
  isRecallVisiblePath,
  formatMemoryManifest,
};
