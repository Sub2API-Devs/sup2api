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
import {
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
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
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
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
} from "path";
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
} from "fs/promises";
import { isAutoMemoryEnabled, getAutoMemEntrypoint, isMemoryRecallEnabled, getAutoMemPath } from "./paths.js";
import {
  MEMORY_INDEX_FILENAME,
  tto,
  LUe,
  normalizeMemoryText,
  MAX_ENTRYPOINT_BYTES,
  MAX_ENTRYPOINT_LINES,
  DUe,
  MEMORY_FILE_RECALL_BYTES,
  nfcLower as nfcLower_2,
} from "./memdir.js";
import { isInsideAgentMemoryDir } from "../tools/AgentTool/agentMemory.js";
import { env } from "../utils/env.js";
import { readFileRange as readFileRange_2 } from "../utils/fsOperations.js";
import { stripHtmlComments } from "../utils/claudemd.js";
import { parseFrontmatter, STRICT_FRONTMATTER_REGEX } from "../utils/frontmatterParser.js";
import { checkMemoryIndexReadLimit, pickMemorySizeBasis, memoryLimitPressure } from "./memoryIndex.js";
import { jEn } from "../services/orgMemory/memoryStores.js";
import { normalizeFrontmatter, T7n, CLAUDECODEITEM, HJs } from "../services/memoryStore/memoryFrontmatter.js";
import { parseMemoryFile } from "./memoryTypes.js";
import { readFileInRange } from "../utils/readFileInRange.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { isRecallCorpusFile } from "./memoryScan.js";
import { formatFileSize } from "../utils/format.js";

/**
 * 读取自动记忆索引（或 agent 记忆目录中的索引）时检查大小/行数上限，必要时按拼接后的内容计算，返回超限提示或 null。
 */
//@ chunk-e6aww6q8.js:1429809-1430559 placement
async function checkMemoryIndexReadSize(e) {
  if (!isAutoMemoryEnabled()) return null;
  let normalized = resolve_26(e).normalize("NFC"),
    r = normalized === resolve_26(getAutoMemEntrypoint()).normalize("NFC"),
    s = !r && basename_31(normalized) === MEMORY_INDEX_FILENAME && isInsideAgentMemoryDir(normalized);
  if (!r && !s) return null;
  let envClaudeCoworkMemoryIndexContent = process.env.CLAUDE_COWORK_MEMORY_INDEX_CONTENT,
    y = r ? YKo() : void 0,
    S = r && envClaudeCoworkMemoryIndexContent !== "" && !isMemoryRecallEnabled(),
    w = y !== void 0 && !env.CLAUDE_COWORK_MEMORY_GUIDELINES,
    L = y?.promptIndexMaxBytes,
    G = s || S || w;
  if (!G && L === void 0) return null;
  let q;
  try {
    q = await readFileRange_2(e, 0, tto);
  } catch {
    return null;
  }
  if (q === null) return null;
  let Z = LUe(w ? normalizeMemoryText(q.content) : q.content);
  if (S && q.bytesRead >= q.bytesTotal)
    try {
      Z = LUe(stripHtmlComments(parseFrontmatter(q.content).content).content);
    } catch {}
  return checkMemoryIndexReadLimit({
    label: "memory index",
    displayPath: MEMORY_INDEX_FILENAME,
    ...pickMemorySizeBasis({
      rawSizeBytes: q.bytesTotal,
      surfaceCap: L,
      splicedSizeBytes: Z.byteCount,
      spliceCap: MAX_ENTRYPOINT_BYTES,
      spliceActive: G,
    }),
    ...(G && { lineCount: Z.lineCount, lineCap: MAX_ENTRYPOINT_LINES }),
  });
}
//@ chunk-e6aww6q8.js:1430559-1430636 placement
function YKo() {
  return jEn()?.find((e) => e.scope === "user" && e.promptIndex === MEMORY_INDEX_FILENAME);
}
//@ chunk-e6aww6q8.js:1430752-1430773 placement
var XKo = 32,
  JKo = 32768;
//@ chunk-e6aww6q8.js:1430773-1430893 placement
function stripEmptyFrontmatterBlock(e) {
  let n = normalizeFrontmatter(e);
  if (n === void 0) return;
  let { frontmatter: frontmatter } = parseMemoryFile(n);
  return Object.keys(T7n(frontmatter)).length > 0 ? void 0 : n;
}
//@ chunk-e6aww6q8.js:1430893-1430970 placement
function e2o(e) {
  let match = STRICT_FRONTMATTER_REGEX.exec(e);
  return match === null ? void 0 : e.slice(match[0].length);
}
/**
 * 读取记忆文件用于召回：按行数与字节上限截断；（不可达分支）去掉 claudeCodeItem 块并计算视图大小。
 */
//@ chunk-e6aww6q8.js:1430970-1432259 placement
async function readMemoryFileForRecall(e, n) {
  {
    let we = await readFileInRange(e, 0, DUe, MEMORY_FILE_RECALL_BYTES, n, { truncateOnByteLimit: !0 });
    return {
      content: we.content,
      lineCount: we.lineCount,
      truncated: we.totalLines > DUe || we.truncatedByBytes,
      truncatedByBytes: we.truncatedByBytes,
      itemBlockRemoved: !1,
      viewBytes: we.totalBytes,
      viewLines: we.totalLines,
    };
  }
  let r = DUe + XKo,
    s = await readFileInRange(e, 0, r, MEMORY_FILE_RECALL_BYTES + JKo, n, { truncateOnByteLimit: !0 }),
    y = !s.content.includes(CLAUDECODEITEM) ? s.content : stripEmptyFrontmatterBlock(s.content),
    S = y === void 0 ? e2o(s.content) : void 0,
    w = y ?? S;
  if (w === void 0 || (S !== void 0 && HJs(S))) {
    (logForDebugging(`Recall skipped ${e}: its claudeCodeItem block could not be taken out`),
      logFeatureSad("laptop_memory_item_block", "recall_file_dropped"));
    return;
  }
  if (S !== void 0)
    (logForDebugging(
      `Recall showed ${e} without its header: its claudeCodeItem block could not be taken out`,
    ),
      logFeatureSad("laptop_memory_item_block", "recall_header_withheld"));
  let L =
      s.lineCount === 0
        ? []
        : w.split(`
`),
    G = [],
    q = 0,
    Z = !1;
  for (let we of L) {
    if (G.length === DUe) break;
    let Ee = q + (G.length > 0 ? 1 : 0) + Buffer.byteLength(we);
    if (Ee > MEMORY_FILE_RECALL_BYTES) {
      Z = !0;
      break;
    }
    ((q = Ee), G.push(we));
  }
  let Se = G.length < L.length,
    ke = s.truncatedByBytes || s.totalLines > r;
  return {
    content: G.join(`
`),
    lineCount: G.length,
    truncated: Se || ke,
    truncatedByBytes: Se ? Z : G.length < DUe && s.truncatedByBytes,
    itemBlockRemoved: w !== s.content,
    viewBytes: s.totalBytes - (Buffer.byteLength(s.content) - Buffer.byteLength(w)),
    viewLines: s.totalLines - (s.lineCount - L.length),
  };
}
//@ chunk-e6aww6q8.js:1432259-1432300 placement
var u2o = /^(.*\D)-(\d{1,2})\.md$/,
  y9t = 300;
/**
 * 写入记忆文件后检查是否超过召回大小上限，超过时返回提示，说明写入成功但召回只显示部分。
 */
//@ chunk-e6aww6q8.js:1432300-1434531 placement
async function checkMemoryRecallLimit(e, n) {
  if (!isMemoryRecallEnabled() || !isRecallCorpusFile(e)) return null;
  let replaced = relative_21(getAutoMemPath(), e).replaceAll(sep_36, "/"),
    s;
  try {
    s = await readMemoryFileForRecall(e);
  } catch {
    return null;
  }
  if (s === void 0) return null;
  let h = memoryLimitPressure({
    sizeBytes: s.truncatedByBytes ? s.viewBytes : Buffer.byteLength(s.content),
    byteCap: MEMORY_FILE_RECALL_BYTES,
    lineCount: s.viewLines,
    lineCap: DUe,
  });
  if (h !== null) {
    let G = h.dimension === "bytes" ? h.capDesc : `${DUe} lines`;
    return {
      kind: "size",
      overCap: h.over,
      text: h.over
        ? `Error: this write left the memory file at ${replaced} at ${h.sizeDesc}, over the ${h.capDesc} recall limit. The write succeeded, but recall shows other sessions only the first ${G} of a memory file, so everything past that is invisible unless they open it. Rewrite it to under ${h.targetDesc} now: keep one fact per file, split distinct facts into their own files, and summarize logs instead of appending. Do not continue it as a \`-2\` file.`
        : `The memory file at ${replaced} is ${h.sizeDesc}, approaching the ${h.capDesc} recall limit. Keep it to one fact under ${h.targetDesc}: summarize rather than append, and split distinct facts into their own files.`,
    };
  }
  let y = basename_32(e),
    [, S, w] = y.match(u2o) ?? [];
  if (S !== void 0 && w !== void 0 && Number(w) >= 2) {
    let G = String(Number(w) - 1),
      q = [`${S}.md`, `${S}-${G}.md`, `${S}-${G.padStart(w.length, "0")}.md`],
      Z = [];
    try {
      Z = await readdir_20(dirname_36(e));
    } catch {}
    if (q.some((Se) => Z.includes(Se)))
      return {
        kind: "lint",
        lint: "continuation_chain",
        text: `\`${y}\` looks like a continuation of \`${S}.md\`. Recall treats every file independently and shows only its first ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}, so chained parts are rarely found. Fold the durable facts back into \`${S}.md\` (summarized to under ${formatFileSize(MEMORY_FILE_RECALL_BYTES)}) or give this file its own one-fact name and description.`,
      };
  }
  if (n === void 0) return null;
  let { description: description } = parseMemoryFile(n).frontmatter;
  if (description === null)
    return {
      kind: "lint",
      lint: "missing_description",
      text: "This memory file has no frontmatter `description`, so recall cannot reliably select it for future sessions. Add the frontmatter block (name, description, metadata.type) at the top.",
    };
  if (description.length > y9t)
    return {
      kind: "lint",
      lint: "long_description",
      text: `This memory file's \`description\` is ${description.length} characters. Recall matches on it as a one-line summary; shorten it to one specific line (about ${y9t / 2} characters) that says what question the file answers.`,
    };
  return null;
}
/**
 * 团队记忆挂载点的索引文件读取大小检查，按挂载点配置的 promptIndexMaxBytes 判断。
 */
//@ chunk-e6aww6q8.js:1434576-1435230 placement
async function checkTeamMemoryIndexReadSize(e, n) {
  let r = jEn();
  if (r === null) return null;
  let s = nfcLower_2(resolve_27(e)),
    found = r.find(
      (G) =>
        G.scope === "team" &&
        G.promptIndex !== void 0 &&
        nfcLower_2(resolve_27(join_61(n, G.mount, ...G.promptIndex.split("/")))) === s,
    );
  if (found === void 0 || found.promptIndex === void 0) return null;
  let y;
  try {
    y = await readFileRange_2(e, 0, tto);
  } catch {
    return null;
  }
  if (y === null) return null;
  let S = LUe(y.content),
    promptIndexMaxBytes = found.promptIndexMaxBytes,
    L = !env.CLAUDE_COWORK_MEMORY_GUIDELINES;
  if (!L && promptIndexMaxBytes === void 0) return null;
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
    ...(L && { lineCount: S.lineCount, lineCap: MAX_ENTRYPOINT_LINES }),
  });
}

export {
  readMemoryFileForRecall,
  checkTeamMemoryIndexReadSize,
  checkMemoryIndexReadSize,
  checkMemoryRecallLimit,
};
