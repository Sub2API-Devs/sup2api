/**
 * memdir/memoryRecall.ts
 *
 * 2.1.316 新增：记忆召回大小上限检查与提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { resolve as resolve_2, basename, relative, sep, dirname, join } from "path";
import { readdir } from "fs/promises";
import { isAutoMemoryEnabled, getAutoMemEntrypoint, isMemoryRecallEnabled, getAutoMemPath } from "./paths.js";
import {
  MEMORY_INDEX_FILENAME,
  MAX_ENTRYPOINT_READ_BYTES,
  measureEntrypoint,
  normalizeMemoryText,
  MAX_ENTRYPOINT_BYTES,
  MAX_ENTRYPOINT_LINES,
  MAX_ENTRYPOINT_TAIL_LINES,
  MEMORY_FILE_RECALL_BYTES,
  nfcLower as nfcLower_2,
} from "./memdir.js";
import { isInsideAgentMemoryDir } from "../tools/AgentTool/agentMemory.js";
import { env } from "../utils/env.js";
import { readFileRange as readFileRange_2 } from "../utils/fsOperations.js";
import { stripHtmlComments } from "../utils/claudemd.js";
import { parseFrontmatter, STRICT_FRONTMATTER_REGEX } from "../utils/frontmatterParser.js";
import { checkMemoryIndexReadLimit, pickMemorySizeBasis, memoryLimitPressure } from "./memoryIndex.js";
import { tryParseMemoryStoresEnv } from "../services/orgMemory/memoryStores.js";
import {
  normalizeFrontmatter,
  claudeCodeItemMeta,
  CLAUDECODEITEM,
  matchesFrontmatter,
} from "../services/memoryStore/memoryFrontmatter.js";
import { parseMemoryFile } from "./memoryTypes.js";
import { readFileInRange } from "../utils/readFileInRange.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { isRecallCorpusFile } from "./memoryScan.js";
import { formatFileSize } from "../utils/format.js";

//@ chunk-e6aww6q8.js:1429809-1430559 placement
/**
 * 读取自动记忆索引（或 agent 记忆目录中的索引）时检查大小/行数上限，必要时按拼接后的内容计算，返回超限提示或 null。
 */
async function checkMemoryIndexReadSize(e) {
  if (!isAutoMemoryEnabled()) return null;
  let normalized = resolve_2(e).normalize("NFC");
  let r = normalized === resolve_2(getAutoMemEntrypoint()).normalize("NFC");
  let s = !r && basename(normalized) === MEMORY_INDEX_FILENAME && isInsideAgentMemoryDir(normalized);
  if (!r && !s) return null;
  let envClaudeCoworkMemoryIndexContent = process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT;
  let y = r ? userMemoryIndexEntry() : undefined;
  let S = r && envClaudeCoworkMemoryIndexContent !== "" && !isMemoryRecallEnabled();
  let w = y !== undefined && !env.CLAUDE_COWORK_MEMORY_GUIDELINES;
  let promptIndexMaxBytes = y?.promptIndexMaxBytes;
  let G = s || S || w;
  if (!G && promptIndexMaxBytes === undefined) return null;
  let q;
  try {
    q = await readFileRange_2(e, 0, MAX_ENTRYPOINT_READ_BYTES);
  } catch {
    return null;
  }
  if (q === null) return null;
  let Z = measureEntrypoint(w ? normalizeMemoryText(q.content) : q.content);
  if (S && q.bytesRead >= q.bytesTotal)
    try {
      Z = measureEntrypoint(stripHtmlComments(parseFrontmatter(q.content).content).content);
    } catch {}
  return checkMemoryIndexReadLimit({
    label: "memory index",
    displayPath: MEMORY_INDEX_FILENAME,
    ...pickMemorySizeBasis({
      rawSizeBytes: q.bytesTotal,
      surfaceCap: promptIndexMaxBytes,
      splicedSizeBytes: Z.byteCount,
      spliceCap: MAX_ENTRYPOINT_BYTES,
      spliceActive: G,
    }),
    ...(G && {
      lineCount: Z.lineCount,
      lineCap: MAX_ENTRYPOINT_LINES,
    }),
  });
}
//@ chunk-e6aww6q8.js:1430559-1430636 placement
/**
 * 从记忆条目里找出作用域为 user、文件名是 MEMORY.md 的那一条。
 */
function userMemoryIndexEntry() {
  return tryParseMemoryStoresEnv()?.find(
    (e) => e.scope === "user" && e.promptIndex === MEMORY_INDEX_FILENAME,
  );
}
//@ chunk-e6aww6q8.js:1430752-1430773 placement
/**
 * 32
 */
var RECALL_LINE_SLACK = 32;
var RECALL_BYTE_SLACK = 32768;
//@ chunk-e6aww6q8.js:1430773-1430893 placement
function stripEmptyFrontmatterBlock(content) {
  let n = normalizeFrontmatter(content);
  if (n === undefined) return;
  let { frontmatter } = parseMemoryFile(n);
  return Object.keys(claudeCodeItemMeta(frontmatter)).length > 0 ? undefined : n;
}
//@ chunk-e6aww6q8.js:1430893-1430970 placement
/**
 * 用严格 frontmatter 正则去掉记忆文件开头的元数据块，返回正文。
 */
function stripFrontmatterOfMemory(content) {
  let match = STRICT_FRONTMATTER_REGEX.exec(content);
  return match === null ? undefined : content.slice(match[0].length);
}
//@ chunk-e6aww6q8.js:1430970-1432259 placement
/**
 * 读取记忆文件用于召回：按行数与字节上限截断；（不可达分支）去掉 claudeCodeItem 块并计算视图大小。
 */
async function readMemoryFileForRecall(e, signal) {
  {
    let fileInRange = await readFileInRange(
      e,
      0,
      MAX_ENTRYPOINT_TAIL_LINES,
      MEMORY_FILE_RECALL_BYTES,
      signal,
      {
        truncateOnByteLimit: true,
      },
    );
    return {
      content: fileInRange.content,
      lineCount: fileInRange.lineCount,
      truncated: fileInRange.totalLines > MAX_ENTRYPOINT_TAIL_LINES || fileInRange.truncatedByBytes,
      truncatedByBytes: fileInRange.truncatedByBytes,
      itemBlockRemoved: false,
      viewBytes: fileInRange.totalBytes,
      viewLines: fileInRange.totalLines,
    };
  }
  let r = MAX_ENTRYPOINT_TAIL_LINES + RECALL_LINE_SLACK;
  let fileInRange = await readFileInRange(e, 0, r, MEMORY_FILE_RECALL_BYTES + RECALL_BYTE_SLACK, signal, {
    truncateOnByteLimit: true,
  });
  let y = !fileInRange.content.includes(CLAUDECODEITEM)
    ? fileInRange.content
    : stripEmptyFrontmatterBlock(fileInRange.content);
  let S = y === undefined ? stripFrontmatterOfMemory(fileInRange.content) : undefined;
  let w = y ?? S;
  if (w === undefined || (S !== undefined && matchesFrontmatter(S))) {
    logForDebugging(`Recall skipped ${e}: its claudeCodeItem block could not be taken out`);
    logFeatureSad("laptop_memory_item_block", "recall_file_dropped");
    return;
  }
  if (S !== undefined) {
    logForDebugging(`Recall showed ${e} without its header: its claudeCodeItem block could not be taken out`);
    logFeatureSad("laptop_memory_item_block", "recall_header_withheld");
  }
  let L =
    fileInRange.lineCount === 0
      ? []
      : w.split(`
`);
  let G = [];
  let q = 0;
  let Z = false;
  for (let we of L) {
    if (G.length === MAX_ENTRYPOINT_TAIL_LINES) break;
    let Ee = q + (G.length > 0 ? 1 : 0) + Buffer.byteLength(we);
    if (Ee > MEMORY_FILE_RECALL_BYTES) {
      Z = true;
      break;
    }
    q = Ee;
    G.push(we);
  }
  let Se = G.length < L.length;
  let ke = fileInRange.truncatedByBytes || fileInRange.totalLines > r;
  return {
    content: G.join(`
`),
    lineCount: G.length,
    truncated: Se || ke,
    truncatedByBytes: Se ? Z : G.length < MAX_ENTRYPOINT_TAIL_LINES && fileInRange.truncatedByBytes,
    itemBlockRemoved: w !== fileInRange.content,
    viewBytes: fileInRange.totalBytes - (Buffer.byteLength(fileInRange.content) - Buffer.byteLength(w)),
    viewLines: fileInRange.totalLines - (fileInRange.lineCount - L.length),
  };
}
//@ chunk-e6aww6q8.js:1432259-1432300 placement
/**
 * 带序号后缀的记忆文件名
 */
var MEMORY_FILE_NUMBERED_RE = /^(.*\D)-(\d{1,2})\.md$/;
var MAX_MEMORY_DESCRIPTION_CHARS = 300;
//@ chunk-e6aww6q8.js:1432300-1434531 placement
/**
 * 写入记忆文件后检查是否超过召回大小上限，超过时返回提示，说明写入成功但召回只显示部分。
 */
async function checkMemoryRecallLimit(absolutePath, n) {
  if (!isMemoryRecallEnabled() || !isRecallCorpusFile(absolutePath)) return null;
  let replaced = relative(getAutoMemPath(), absolutePath).replaceAll(sep, "/");
  let s;
  try {
    s = await readMemoryFileForRecall(absolutePath);
  } catch {
    return null;
  }
  if (s === undefined) return null;
  let h = memoryLimitPressure({
    sizeBytes: s.truncatedByBytes ? s.viewBytes : Buffer.byteLength(s.content),
    byteCap: MEMORY_FILE_RECALL_BYTES,
    lineCount: s.viewLines,
    lineCap: MAX_ENTRYPOINT_TAIL_LINES,
  });
  if (h !== null) {
    let G = h.dimension === "bytes" ? h.capDesc : `${MAX_ENTRYPOINT_TAIL_LINES} lines`;
    return {
      kind: "size",
      overCap: h.over,
      text: h.over
        ? `Error: this write left the memory file at ${replaced} at ${h.sizeDesc}, over the ${h.capDesc} recall limit. The write succeeded, but recall shows other sessions only the first ${G} of a memory file, so everything past that is invisible unless they open it. Rewrite it to under ${h.targetDesc} now: keep one fact per file, split distinct facts into their own files, and summarize logs instead of appending. Do not continue it as a \`-2\` file.`
        : `The memory file at ${replaced} is ${h.sizeDesc}, approaching the ${h.capDesc} recall limit. Keep it to one fact under ${h.targetDesc}: summarize rather than append, and split distinct facts into their own files.`,
    };
  }
  let y = basename(absolutePath);
  let [, S, w] = y.match(MEMORY_FILE_NUMBERED_RE) ?? [];
  if (S !== undefined && w !== undefined && Number(w) >= 2) {
    let G = String(Number(w) - 1);
    let q = [`${S}.md`, `${S}-${G}.md`, `${S}-${G.padStart(w.length, "0")}.md`];
    let Z = [];
    try {
      Z = await readdir(dirname(absolutePath));
    } catch {}
    if (q.some((Se) => Z.includes(Se)))
      return {
        kind: "lint",
        lint: "continuation_chain",
        text: `\`${y}\` looks like a continuation of \`${S}.md\`. Recall treats every file independently and shows only its first ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}, so chained parts are rarely found. Fold the durable facts back into \`${S}.md\` (summarized to under ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}) or give this file its own one-fact name and description.`,
      };
  }
  if (n === undefined) return null;
  let { description } = parseMemoryFile(n).frontmatter;
  if (description === null)
    return {
      kind: "lint",
      lint: "missing_description",
      text: "This memory file has no frontmatter `description`, so recall cannot reliably select it for future sessions. Add the frontmatter block (name, description, metadata.type) at the top.",
    };
  if (description.length > MAX_MEMORY_DESCRIPTION_CHARS)
    return {
      kind: "lint",
      lint: "long_description",
      text: `This memory file's \`description\` is ${description.length} characters. Recall matches on it as a one-line summary; shorten it to one specific line (about ${MAX_MEMORY_DESCRIPTION_CHARS / 2} characters) that says what question the file answers.`,
    };
  return null;
}
//@ chunk-e6aww6q8.js:1434576-1435230 placement
/**
 * 团队记忆挂载点的索引文件读取大小检查，按挂载点配置的 promptIndexMaxBytes 判断。
 */
async function checkTeamMemoryIndexReadSize(e, memoryDirNfc) {
  let r = tryParseMemoryStoresEnv();
  if (r === null) return null;
  let s = nfcLower_2(resolve_2(e));
  let found = r.find(
    (G) =>
      G.scope === "team" &&
      G.promptIndex !== undefined &&
      nfcLower_2(resolve_2(join(memoryDirNfc, G.mount, ...G.promptIndex.split("/")))) === s,
  );
  if (found === undefined || found.promptIndex === undefined) return null;
  let y;
  try {
    y = await readFileRange_2(e, 0, MAX_ENTRYPOINT_READ_BYTES);
  } catch {
    return null;
  }
  if (y === null) return null;
  let S = measureEntrypoint(y.content);
  let promptIndexMaxBytes = found.promptIndexMaxBytes;
  let L = !env.CLAUDE_COWORK_MEMORY_GUIDELINES;
  if (!L && promptIndexMaxBytes === undefined) return null;
  return checkMemoryIndexReadLimit({
    label: "memory index",
    displayPath: `team/${found.mount}/${found.promptIndex}`,
    ...pickMemorySizeBasis({
      rawSizeBytes: y.bytesTotal,
      surfaceCap: promptIndexMaxBytes,
      splicedSizeBytes: S.byteCount,
      spliceCap: MAX_ENTRYPOINT_BYTES,
      spliceActive: L,
    }),
    ...(L && {
      lineCount: S.lineCount,
      lineCap: MAX_ENTRYPOINT_LINES,
    }),
  });
}
export {
  readMemoryFileForRecall,
  checkTeamMemoryIndexReadSize,
  checkMemoryIndexReadSize,
  checkMemoryRecallLimit,
};
