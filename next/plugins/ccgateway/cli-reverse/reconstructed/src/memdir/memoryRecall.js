/**
 * memdir/memoryRecall.ts
 *
 * 2.1.316 新增：记忆召回大小上限检查与提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
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

//@ chunk-5xgkngpb.js:1429379-1430133 placement
/**
 * 读取自动记忆索引（或 agent 记忆目录中的索引）时检查大小/行数上限，必要时按拼接后的内容计算，返回超限提示或 null。
 */
async function checkMemoryIndexReadSize(filePath) {
  if (!isAutoMemoryEnabled()) return null;
  let normalized = resolve_2(filePath).normalize("NFC");
  let isAutoEntrypoint = normalized === resolve_2(getAutoMemEntrypoint()).normalize("NFC");
  let isAgentIndex =
    !isAutoEntrypoint && basename(normalized) === MEMORY_INDEX_FILENAME && isInsideAgentMemoryDir(normalized);
  if (!isAutoEntrypoint && !isAgentIndex) return null;
  let envClaudeCoworkMemoryIndexContent = process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT;
  let userIndexEntry = isAutoEntrypoint ? userMemoryIndexEntry() : undefined;
  let indexSpliced = isAutoEntrypoint && envClaudeCoworkMemoryIndexContent !== "" && !isMemoryRecallEnabled();
  let needsNormalize = userIndexEntry !== undefined && !env.CLAUDE_COWORK_MEMORY_GUIDELINES;
  let promptIndexMaxBytes = userIndexEntry?.promptIndexMaxBytes;
  let spliceActive = isAgentIndex || indexSpliced || needsNormalize;
  if (!spliceActive && promptIndexMaxBytes === undefined) return null;
  let fileContent;
  try {
    fileContent = await readFileRange_2(filePath, 0, MAX_ENTRYPOINT_READ_BYTES);
  } catch {
    return null;
  }
  if (fileContent === null) return null;
  let measurement = measureEntrypoint(
    needsNormalize ? normalizeMemoryText(fileContent.content) : fileContent.content,
  );
  if (indexSpliced && fileContent.bytesRead >= fileContent.bytesTotal)
    try {
      measurement = measureEntrypoint(
        stripHtmlComments(parseFrontmatter(fileContent.content).content).content,
      );
    } catch {}
  return checkMemoryIndexReadLimit({
    label: "memory index",
    displayPath: MEMORY_INDEX_FILENAME,
    ...pickMemorySizeBasis({
      rawSizeBytes: fileContent.bytesTotal,
      surfaceCap: promptIndexMaxBytes,
      splicedSizeBytes: measurement.byteCount,
      spliceCap: MAX_ENTRYPOINT_BYTES,
      spliceActive,
    }),
    ...(spliceActive && {
      lineCount: measurement.lineCount,
      lineCap: MAX_ENTRYPOINT_LINES,
    }),
  });
}
//@ chunk-5xgkngpb.js:1430133-1430210 placement
/**
 * 从记忆条目里找出作用域为 user、文件名是 MEMORY.md 的那一条。
 */
function userMemoryIndexEntry() {
  return tryParseMemoryStoresEnv()?.find(
    (store) => store.scope === "user" && store.promptIndex === MEMORY_INDEX_FILENAME,
  );
}
//@ chunk-5xgkngpb.js:1430326-1430347 placement
/**
 * 32
 */
var RECALL_LINE_SLACK = 32;
var RECALL_BYTE_SLACK = 32768;
//@ chunk-5xgkngpb.js:1430347-1430467 placement
function stripEmptyFrontmatterBlock(text) {
  let withoutEmptyBlock = normalizeFrontmatter(text);
  if (withoutEmptyBlock === undefined) return;
  let { frontmatter } = parseMemoryFile(withoutEmptyBlock);
  return Object.keys(claudeCodeItemMeta(frontmatter)).length > 0 ? undefined : withoutEmptyBlock;
}
//@ chunk-5xgkngpb.js:1430467-1430544 placement
/**
 * 用严格 frontmatter 正则去掉记忆文件开头的元数据块，返回正文。
 */
function stripFrontmatterOfMemory(content) {
  let match = STRICT_FRONTMATTER_REGEX.exec(content);
  return match === null ? undefined : content.slice(match[0].length);
}
//@ chunk-5xgkngpb.js:1430544-1431836 placement
/**
 * 读取记忆文件用于召回：按行数与字节上限截断；（不可达分支）去掉 claudeCodeItem 块并计算视图大小。
 */
async function readMemoryFileForRecall(filePath, signal) {
  {
    let fileInRange = await readFileInRange(
      filePath,
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
  let lineBudget = MAX_ENTRYPOINT_TAIL_LINES + RECALL_LINE_SLACK;
  let fileInRange = await readFileInRange(
    filePath,
    0,
    lineBudget,
    MEMORY_FILE_RECALL_BYTES + RECALL_BYTE_SLACK,
    signal,
    {
      truncateOnByteLimit: true,
    },
  );
  let strippedContent = !fileInRange.content.includes(CLAUDECODEITEM)
    ? fileInRange.content
    : stripEmptyFrontmatterBlock(fileInRange.content);
  let fallbackContent =
    strippedContent === undefined ? stripFrontmatterOfMemory(fileInRange.content) : undefined;
  let body = strippedContent ?? fallbackContent;
  if (body === undefined || (fallbackContent !== undefined && matchesFrontmatter(fallbackContent))) {
    logForDebugging(`Recall skipped ${filePath}: its claudeCodeItem block could not be taken out`);
    logFeatureSad("laptop_memory_item_block", "recall_file_dropped");
    return;
  }
  if (fallbackContent !== undefined) {
    logForDebugging(
      `Recall showed ${filePath} without its header: its claudeCodeItem block could not be taken out`,
    );
    logFeatureSad("laptop_memory_item_block", "recall_header_withheld");
  }
  let sourceLines =
    fileInRange.lineCount === 0
      ? []
      : body.split(`
`);
  let keptLines = [];
  let byteCount = 0;
  let stoppedByBytes = false;
  for (let line of sourceLines) {
    if (keptLines.length === MAX_ENTRYPOINT_TAIL_LINES) break;
    let nextByteCount = byteCount + (keptLines.length > 0 ? 1 : 0) + Buffer.byteLength(line);
    if (nextByteCount > MEMORY_FILE_RECALL_BYTES) {
      stoppedByBytes = true;
      break;
    }
    byteCount = nextByteCount;
    keptLines.push(line);
  }
  let linesDropped = keptLines.length < sourceLines.length;
  let readTruncated = fileInRange.truncatedByBytes || fileInRange.totalLines > lineBudget;
  return {
    content: keptLines.join(`
`),
    lineCount: keptLines.length,
    truncated: linesDropped || readTruncated,
    truncatedByBytes: linesDropped
      ? stoppedByBytes
      : keptLines.length < MAX_ENTRYPOINT_TAIL_LINES && fileInRange.truncatedByBytes,
    itemBlockRemoved: body !== fileInRange.content,
    viewBytes: fileInRange.totalBytes - (Buffer.byteLength(fileInRange.content) - Buffer.byteLength(body)),
    viewLines: fileInRange.totalLines - (fileInRange.lineCount - sourceLines.length),
  };
}
//@ chunk-5xgkngpb.js:1431836-1431877 placement
/**
 * 带序号后缀的记忆文件名
 */
var MEMORY_FILE_NUMBERED_RE = /^(.*\D)-(\d{1,2})\.md$/;
var MAX_MEMORY_DESCRIPTION_CHARS = 300;
//@ chunk-5xgkngpb.js:1431877-1434111 placement
/**
 * 写入记忆文件后检查是否超过召回大小上限，超过时返回提示，说明写入成功但召回只显示部分。
 */
async function checkMemoryRecallLimit(filePath, fileContent) {
  if (!isMemoryRecallEnabled() || !isRecallCorpusFile(filePath)) return null;
  let replaced = relative(getAutoMemPath(), filePath).replaceAll(sep, "/");
  let recalled;
  try {
    recalled = await readMemoryFileForRecall(filePath);
  } catch {
    return null;
  }
  if (recalled === undefined) return null;
  let pressure = memoryLimitPressure({
    sizeBytes: recalled.truncatedByBytes ? recalled.viewBytes : Buffer.byteLength(recalled.content),
    byteCap: MEMORY_FILE_RECALL_BYTES,
    lineCount: recalled.viewLines,
    lineCap: MAX_ENTRYPOINT_TAIL_LINES,
  });
  if (pressure !== null) {
    let capText = pressure.dimension === "bytes" ? pressure.capDesc : `${MAX_ENTRYPOINT_TAIL_LINES} lines`;
    return {
      kind: "size",
      overCap: pressure.over,
      text: pressure.over
        ? `Error: this write left the memory file at ${replaced} at ${pressure.sizeDesc}, over the ${pressure.capDesc} recall limit. The write succeeded, but recall shows other sessions only the first ${capText} of a memory file, so everything past that is invisible unless they open it. Rewrite it to under ${pressure.targetDesc} now: keep one fact per file, split distinct facts into their own files, and summarize logs instead of appending. Do not continue it as a \`-2\` file.`
        : `The memory file at ${replaced} is ${pressure.sizeDesc}, approaching the ${pressure.capDesc} recall limit. Keep it to one fact under ${pressure.targetDesc}: summarize rather than append, and split distinct facts into their own files.`,
    };
  }
  let fileName = basename(filePath);
  let [, baseName, partNumber] = fileName.match(MEMORY_FILE_NUMBERED_RE) ?? [];
  if (baseName !== undefined && partNumber !== undefined && Number(partNumber) >= 2) {
    let prevPartNumber = String(Number(partNumber) - 1);
    let candidateNames = [
      `${baseName}.md`,
      `${baseName}-${prevPartNumber}.md`,
      `${baseName}-${prevPartNumber.padStart(partNumber.length, "0")}.md`,
    ];
    let siblingNames = [];
    try {
      siblingNames = await readdir(dirname(filePath));
    } catch {}
    if (candidateNames.some((candidateName) => siblingNames.includes(candidateName)))
      return {
        kind: "lint",
        lint: "continuation_chain",
        text: `\`${fileName}\` looks like a continuation of \`${baseName}.md\`. Recall treats every file independently and shows only its first ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}, so chained parts are rarely found. Fold the durable facts back into \`${baseName}.md\` (summarized to under ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}) or give this file its own one-fact name and description.`,
      };
  }
  if (fileContent === undefined) return null;
  let { description } = parseMemoryFile(fileContent).frontmatter;
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
//@ chunk-5xgkngpb.js:1434156-1434810 placement
/**
 * 团队记忆挂载点的索引文件读取大小检查，按挂载点配置的 promptIndexMaxBytes 判断。
 */
async function checkTeamMemoryIndexReadSize(filePath, memoryDirNfc) {
  let stores = tryParseMemoryStoresEnv();
  if (stores === null) return null;
  let normalizedPath = nfcLower_2(resolve_2(filePath));
  let found = stores.find(
    (store) =>
      store.scope === "team" &&
      store.promptIndex !== undefined &&
      nfcLower_2(resolve_2(join(memoryDirNfc, store.mount, ...store.promptIndex.split("/")))) ===
        normalizedPath,
  );
  if (found === undefined || found.promptIndex === undefined) return null;
  let fileContent;
  try {
    fileContent = await readFileRange_2(filePath, 0, MAX_ENTRYPOINT_READ_BYTES);
  } catch {
    return null;
  }
  if (fileContent === null) return null;
  let measurement = measureEntrypoint(fileContent.content);
  let promptIndexMaxBytes = found.promptIndexMaxBytes;
  let spliceActive = !env.CLAUDE_COWORK_MEMORY_GUIDELINES;
  if (!spliceActive && promptIndexMaxBytes === undefined) return null;
  return checkMemoryIndexReadLimit({
    label: "memory index",
    displayPath: `team/${found.mount}/${found.promptIndex}`,
    ...pickMemorySizeBasis({
      rawSizeBytes: fileContent.bytesTotal,
      surfaceCap: promptIndexMaxBytes,
      splicedSizeBytes: measurement.byteCount,
      spliceCap: MAX_ENTRYPOINT_BYTES,
      spliceActive,
    }),
    ...(spliceActive && {
      lineCount: measurement.lineCount,
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
