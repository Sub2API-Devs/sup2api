/**
 * components/FeedbackSurvey/useMemorySurvey.tsx
 *
 * 记忆召回调查：读取过记忆文件后询问召回质量。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/useMemorySurvey.tsx
 * pieces: chunk-18hwfzwa.js (25)
 * attribution: placement 9, sole-consumer 2, affinity 3, layout 9, fingerprint 2
 */
import { relative, sep, join, isAbsolute, normalize, basename } from "path";
import { readdir, realpath, stat, readFile, utimes } from "fs/promises";
import { isExcludedMemoryKey } from "../../services/memoryStore/memoryKeys.js";
import { readAllPages } from "../../utils/pagedRead.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAutoMemPath, getAutoMemPath } from "../../memdir/paths.js";
import { isTeamMemPath, resolveRealAutoMemPath } from "../../memdir/teamMemPaths.js";
import {
  runWithFileWriteContext,
  detectLineEndingsForString,
  writeTextContentVerified,
} from "../../utils/file.js";
import { areValidKeySegments, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { detectLineEndingsForString as detectLineEndingsForString_2 } from "../../utils/fileRead.js";
import {
  FRONTMATTER_REGEX,
  STRICT_FRONTMATTER_REGEX,
  parseFrontmatter,
} from "../../utils/frontmatterParser.js";
import { parseMemoryFile } from "../../memdir/memoryTypes.js";
import { isInBundledMode } from "../../utils/bundledMode.js";
import { projectKeyFromMemoryDir, isTeamMemoryDirAbsent } from "../../memdir/teamMemPrompts.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { count, uniq } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber, fromEnum, fromEnumOpt, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { truncateToLines } from "../../utils/stringUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { extractMemoryCitations } from "../../services/orgMemory/promptIndex.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { memoryWatchers } from "../../services/memorySync/memoryWatcher.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { R, zt, y, P } from "../../../vendor/react/cjs/react.production.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { collectTranscriptShareWithPolicy } from "./submitTranscriptShare.js";
import { useSurveyState } from "./useSurveyState.js";
import { getLastAssistantMessage } from "../../utils/messages.js";
import { isFeedbackSurveyAllowed } from "../../services/policyLimits/index.js";

//@ chunk-18hwfzwa.js:993940-994017 placement
var MEMORY_SURVEY_HEADER = "Claude recalled a memory:";
var MEMORY_SURVEY_QUESTION = "How was Claude's recollection?";
var MEMORY_SURVEY_MAX_LINES = 4;
//@ chunk-18hwfzwa.js:1039472-1039502 placement
var MAX_MEMORY_FILES_PER_SURVEY = 16;
var SURVEYRATING = "surveyRating";
//@ chunk-18hwfzwa.js:1039502-1039867 placement
/**
 * 校验记忆文件 frontmatter 里的 surveyRating（count/mean/total）；total 不合理时按 mean×count 估算并夹在 [count, 3count]。
 */
function parseSurveyRating(h) {
  if (typeof h !== "object" || h === null || Array.isArray(h)) return null;
  let { count, mean, total } = h;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) return null;
  if (typeof mean !== "number" || !Number.isFinite(mean)) return null;
  let total_2 =
    typeof total === "number" && Number.isInteger(total) && total >= count && total <= 3 * count
      ? total
      : Math.min(3 * count, Math.max(count, Math.round(mean * count)));
  return {
    count,
    mean,
    total: total_2,
  };
}
//@ chunk-18hwfzwa.js:1039867-1040025 placement
function accumulateSurveyRating(h, x) {
  let surveyRating = parseSurveyRating(h);
  if (surveyRating === null)
    return {
      count: 1,
      mean: x,
      total: x,
    };
  let L = surveyRating.count + 1;
  let ee = surveyRating.total + x;
  return {
    count: L,
    mean: Math.round((ee / L) * 100) / 100,
    total: ee,
  };
}
//@ chunk-18hwfzwa.js:1040025-1040058 placement
var MAX_MEMORY_SCAN_FILES = 1e4;
var MAX_MEMORY_SCAN_LEAVES = 4 * MAX_MEMORY_SCAN_FILES;
var MAX_MEMORY_FILE_BYTES = 262144;
//@ chunk-18hwfzwa.js:1040058-1040163 placement
function isExcludedMemoryPath(h, x) {
  let D = relative(h, x);
  if (D === "" || D.startsWith("..")) return true;
  return isExcludedMemoryKey(D.split(sep).join("/"));
}
//@ chunk-18hwfzwa.js:1040163-1040940 placement
async function listMemoryFilesForSurvey(h) {
  let x = [];
  let D = 0;
  let L = false;
  let ee = false;
  let allPages = await readAllPages(
    async (cursor) => {
      let He = await h.storageV5.listRecursive(
        {
          namespace: "memory",
          projectKey: h.projectKey,
        },
        {
          cursor,
          skipKeyStats: true,
          links: "skip",
          maxLeaves: MAX_MEMORY_SCAN_LEAVES,
        },
      );
      let skipped = He.ok ? He.value.skipped : undefined;
      if (skipped !== undefined && (skipped.unrepresentable > 0 || skipped.reserved > 0)) ee = true;
      return He;
    },
    (Be) => {
      for (let He of Be) {
        let We = He.kind === "key" && He.key.namespace === "memory" ? He.key.relPath.join("/") : undefined;
        if (We !== undefined && isExcludedMemoryKey(We)) continue;
        if (D >= MAX_MEMORY_SCAN_FILES) {
          L = true;
          return;
        }
        D += 1;
        if (We === undefined || He.viaSymlink || !We.endsWith(".md")) continue;
        x.push(We);
      }
    },
    {
      until: () => L,
    },
  );
  let Re = L || ee || allPages.status !== "done";
  if (Re)
    logForDebugging(
      `memorySurveyRating: v5 scan failed closed: ${L ? "capped" : ee ? "entries omitted by the listing" : allPages.status === "error" ? allPages.error.code : allPages.status}`,
    );
  return {
    files: x,
    truncated: Re,
  };
}
//@ chunk-18hwfzwa.js:1040940-1041350 placement = replaceFromSnapshot (0.683)
/**
 * 递归列出目录中的 .md 文件（跳过符号链接与忽略路径，超过上限标记 truncated）。
 */
async function listMarkdownFilesRecursive(h) {
  let x = [];
  let D = [""];
  while (D.length > 0) {
    let L = D.pop();
    let ee;
    try {
      ee = await readdir(join(h, L), {
        withFileTypes: true,
      });
    } catch {
      continue;
    }
    for (let dirent of ee) {
      if (dirent.isSymbolicLink()) continue;
      let Re = L === "" ? dirent.name : `${L}/${dirent.name}`;
      if (dirent.isDirectory()) {
        if (!isExcludedMemoryKey(Re)) D.push(Re);
      } else if (dirent.isFile() && dirent.name.endsWith(".md") && !isExcludedMemoryKey(Re)) {
        if (x.length >= MAX_MEMORY_SCAN_FILES)
          return {
            files: x,
            truncated: true,
          };
        x.push(Re);
      }
    }
  }
  return {
    files: x,
    truncated: false,
  };
}
//@ chunk-18hwfzwa.js:1041350-1041736 sole-consumer = isSessionPlanFile (0.801)
async function resolveMemoryFileReference(fileRef, baseDir, listFiles) {
  if (!fileRef.endsWith(".md")) return null;
  let L = (Be) => isAutoMemPath(Be) && !isTeamMemPath(Be) && !isExcludedMemoryPath(baseDir, Be);
  if (isAbsolute(fileRef)) {
    let Be = normalize(fileRef);
    return L(Be) ? Be : null;
  }
  if (fileRef.includes("/") || fileRef.includes(sep)) {
    let Be = normalize(join(baseDir, fileRef));
    return L(Be) ? Be : null;
  }
  let ee = await listFiles();
  if (ee.truncated) return null;
  let filtered = ee.files.filter((file) => basename(file) === fileRef);
  if (filtered.length !== 1) return null;
  let normalizedPath = normalize(join(baseDir, filtered[0]));
  return L(normalizedPath) ? normalizedPath : null;
}
//@ chunk-18hwfzwa.js:1041965-1043331 affinity
/**
 * 在 frontmatter 文本里写入或替换 surveyRating 块：已有则替换该缩进块，有 metadata: 则插在其下，否则在结尾 --- 前新建 metadata；保留原换行风格，结构异常返回 null。
 */
function writeSurveyRatingIntoFrontmatter(h, x, D) {
  let L = x.includes(`\r
`)
    ? `\r
`
    : `
`;
  let ee = x.length;
  let lines = h.slice(0, ee).split(`
`);
  let Be = /^(\s*)surveyRating:/;
  let He = [];
  for (let idx = 1; idx < lines.length - 1; idx++) if (Be.test(lines[idx])) He.push(idx);
  if (He.length > 1) return null;
  let We = (At) =>
    `${At}surveyRating:${L}${At}  count: ${D.count}${L}${At}  mean: ${D.mean}${L}${At}  total: ${D.total}`;
  if (He.length === 1) {
    let At = He[0];
    let It = lines[At].match(Be)[1];
    let Ot = At + 1;
    while (Ot < lines.length - 1) {
      let replaced = lines[Ot].replace(/\r$/, "");
      if (/^\s*(#|$)/.test(replaced)) {
        let Lt = Ot + 1;
        while (Lt < lines.length - 1 && /^\s*(#|$)/.test(lines[Lt].replace(/\r$/, ""))) Lt++;
        if (
          Lt < lines.length - 1 &&
          /\S/.test(lines[Lt]) &&
          lines[Lt].match(/^(\s*)/)[1].length > It.length
        ) {
          Ot = Lt;
          continue;
        }
        break;
      }
      if (replaced.match(/^(\s*)/)[1].length > It.length) {
        Ot++;
        continue;
      }
      break;
    }
    return (
      [...lines.slice(0, At), We(It), ...lines.slice(Ot)].join(`
`) + h.slice(ee)
    );
  }
  let index = lines.findIndex((line, It) => It > 0 && /^metadata:/.test(line.replace(/\r$/, "")));
  let index_2 = lines.findIndex((line, It) => It > 0 && /^metadata:\s*$/.test(line.replace(/\r$/, "")));
  if (index !== -1 && index_2 === -1) return null;
  if (index_2 !== -1) {
    let At = index_2 + 1;
    while (At < lines.length - 1 && /^\s*(#|$)/.test(lines[At].replace(/\r$/, ""))) At++;
    let match = lines[At]?.match(/^(\s+)\S/);
    let Ot = match ? match[1] : "  ";
    return (
      [...lines.slice(0, index_2 + 1), We(Ot), ...lines.slice(index_2 + 1)].join(`
`) + h.slice(ee)
    );
  }
  let rt = lines.length - 1;
  while (rt > 0 && lines[rt].trim() !== "---") rt--;
  if (rt === 0) return null;
  return (
    [...lines.slice(0, rt), `metadata:${L}${We("  ")}`, ...lines.slice(rt)].join(`
`) + h.slice(ee)
  );
}
//@ chunk-18hwfzwa.js:1043331-1043439 placement = isSessionPlanFile (1)
/**
 * 判断路径是否是记忆目录下的 .md 文件（排除指定子目录和若干特殊文件）。旧版名 isSessionPlanFile 误配，应归 memdir。
 */
function isMemoryDirMarkdownFile(path, memoryDir, excludedDir) {
  return (
    path.endsWith(".md") &&
    path.startsWith(memoryDir + sep) &&
    !path.startsWith(excludedDir + sep) &&
    !isTeamMemPath(path) &&
    !isExcludedMemoryPath(memoryDir + sep, path)
  );
}
//@ chunk-18hwfzwa.js:1043439-1044334 layout
/**
 * 把评分写回一个记忆文件：确认是自动记忆目录下的 .md 且不超大，storage v5 时通过后端 updateText 写入，否则读改写本地文件，最后恢复原 atime/mtime。
 */
async function writeBackMemoryRating(h, path, D, L) {
  return runWithFileWriteContext(h, async () => {
    let ee;
    try {
      let [Be, memoryDir, excludedDir] = await Promise.all([
        realpath(path),
        resolveRealAutoMemPath(),
        resolveRealAutoMemPath("team"),
      ]);
      if (Be !== path || !isMemoryDirMarkdownFile(path, memoryDir, excludedDir)) return false;
      ee = relative(memoryDir, path).split(sep);
    } catch {
      return false;
    }
    let ke;
    let Re;
    try {
      let Be = await stat(path);
      if (Be.size > MAX_MEMORY_FILE_BYTES) return false;
      ke = Be.mtime;
      Re = Be.atime;
    } catch {
      return false;
    }
    if (L !== undefined && areValidKeySegments(ee)) {
      let Be = await L.storageV5.updateText(STORAGE_SPACES.memory(L.projectKey, ee), (He) => {
        if (He === undefined || Buffer.byteLength(He.value, "utf8") > MAX_MEMORY_FILE_BYTES)
          return {
            skip: true,
          };
        let We = applySurveyRatingToMemory(He.value, path, D);
        return We === null
          ? {
              skip: true,
            }
          : {
              write: detectLineEndingsForString(We, detectLineEndingsForString_2(He.value)),
              result: He.mtimeMs,
            };
      });
      if (!Be.ok) {
        logForDebugging(`memorySurveyRating: backend update failed: ${Be.error.code}`);
        return false;
      }
      if (!Be.value.written) return false;
      if (Be.value.result !== undefined) ke = new Date(Be.value.result);
    } else {
      let Be;
      try {
        Be = await readFile(path, "utf8");
      } catch {
        return false;
      }
      let He = applySurveyRatingToMemory(Be, path, D);
      if (He === null) return false;
      await writeTextContentVerified(path, He, "utf8", detectLineEndingsForString_2(Be));
    }
    try {
      await utimes(path, Re, ke);
    } catch {}
    return true;
  });
}
//@ chunk-18hwfzwa.js:1044334-1045063 layout
/**
 * 生成带新评分的记忆文件内容：校验 frontmatter 能被宽松与严格两种正则解析且一致，写入后确认正文与其他字段不变，否则返回 null。
 */
function applySurveyRatingToMemory(h, x, D) {
  let match = h.match(FRONTMATTER_REGEX);
  let match_2 = h.match(STRICT_FRONTMATTER_REGEX);
  if (match === null || match_2 === null || match[1].trim() !== match_2[1].trim()) return null;
  let frontmatter = parseFrontmatter(h, x);
  if (frontmatter.parseError || Object.keys(frontmatter.frontmatter).length === 0) return null;
  let memoryFile = parseMemoryFile(h, x);
  let { frontmatter: frontmatter_2 } = memoryFile;
  let He = accumulateSurveyRating(frontmatter_2.metadata[SURVEYRATING], D);
  let We = writeSurveyRatingIntoFrontmatter(h, match_2[0], He);
  if (We === null) return null;
  let memoryFile_2 = parseMemoryFile(We, x);
  let Xe = isInBundledMode({
    name: memoryFile.frontmatter.name,
    description: memoryFile.frontmatter.description,
    metadata: {
      ...memoryFile.frontmatter.metadata,
      [SURVEYRATING]: {
        count: He.count,
        mean: He.mean,
        total: He.total,
      },
    },
  });
  if (
    isInBundledMode({
      name: memoryFile_2.frontmatter.name,
      description: memoryFile_2.frontmatter.description,
      metadata: memoryFile_2.frontmatter.metadata,
    }) !== Xe ||
    memoryFile_2.body !== memoryFile.body
  )
    return null;
  let match_3 = We.match(STRICT_FRONTMATTER_REGEX);
  if (match_3 === null || We.slice(match_3[0].length) !== h.slice(match_2[0].length)) return null;
  return We;
}
//@ chunk-18hwfzwa.js:1045063-1045844 layout
/**
 * 记忆调查回答后，把评分（1–3）写回被引用的记忆文件：解析最多 16 个引用、去重真实路径、并行写回，记录 tengu_memory_rating_writeback。
 */
async function writeBackMemorySurveyRatings(h, filenames, D, storageV5) {
  try {
    if (!Number.isInteger(D) || D < 1 || D > 3) return;
    let baseDir = getAutoMemPath();
    let ke = storageV5 === undefined ? undefined : projectKeyFromMemoryDir(baseDir);
    let Re =
      isStorageV5Enabled() &&
      storageV5 !== undefined &&
      ke !== undefined &&
      (await isTeamMemoryDirAbsent(baseDir))
        ? {
            storageV5,
            projectKey: ke,
          }
        : undefined;
    let Be = null;
    let listFiles = () => {
      Be ??= Re === undefined ? listMarkdownFilesRecursive(baseDir) : listMemoryFilesForSurvey(Re);
      return Be;
    };
    let We = new Map();
    for (let rt of filenames.slice(0, MAX_MEMORY_FILES_PER_SURVEY)) {
      let memoryFileReference = await resolveMemoryFileReference(rt.trim(), baseDir, listFiles);
      if (memoryFileReference === null) continue;
      let At = await realpath(memoryFileReference).catch(() => null);
      if (At !== null && !We.has(At)) We.set(At, memoryFileReference);
    }
    let settled = await Promise.allSettled(
      [...We].map(async ([rt, kt]) => {
        if (await writeBackMemoryRating(kt, rt, D, Re)) {
          h.notifyWrite(kt);
          return true;
        }
        return false;
      }),
    );
    let Xe = count(settled, (rt) => rt.status === "fulfilled" && rt.value === true);
    logEvent("tengu_memory_rating_writeback", {
      cited_count: fromNumber(filenames.length),
      resolved_count: fromNumber(We.size),
      written_count: fromNumber(Xe),
    });
  } catch (error) {
    logForDebugging(`memorySurveyRating: write-back failed: ${String(error)}`);
  }
}
//@ chunk-18hwfzwa.js:1045844-1045868 layout
function shouldShowTranscriptPrompt() {
  return false;
}
//@ chunk-18hwfzwa.js:1045868-1046041 layout
function logMemorySurveyEvent(Ur, Zr, wr) {
  logEvent(TENGU_MEMORY_SURVEY_EVENT, {
    event_type: fromEnum(Ur),
    appearance_id: sanitizeMarkName(Zr),
    response: fromEnumOpt(wr),
  });
  logOTelEvent("feedback_survey", {
    event_type: Ur,
    appearance_id: Zr,
    response: wr,
    survey_type: "memory",
  });
}
//@ chunk-18hwfzwa.js:1046041-1046277 layout
function logMemoryTranscriptPromptShown(zr, _r) {
  logEvent(TENGU_MEMORY_SURVEY_EVENT, {
    event_type: lit_2("transcript_prompt_appeared"),
    appearance_id: sanitizeMarkName(zr),
    trigger: fromEnum(MEMORY_SURVEY),
    response: fromEnumOpt(_r),
  });
  logOTelEvent("feedback_survey", {
    event_type: "transcript_prompt_appeared",
    appearance_id: zr,
    survey_type: "memory",
    response: _r,
  });
}
//@ chunk-18hwfzwa.js:1046277-1046336 layout
function markTranscriptShareDismissed(fr) {
  return {
    ...fr,
    transcriptShareDismissed: true,
  };
}
//@ chunk-18hwfzwa.js:1046336-1046433 layout
function isMemoryCitationEligible($r) {
  return (
    !$r.incomplete &&
    $r.sentence.length <= MAX_CITATION_LENGTH &&
    truncateToLines($r.sentence, MEMORY_SURVEY_MAX_LINES) === $r.sentence
  );
}
//@ chunk-18hwfzwa.js:1046433-1046479 layout
function isMemoryCitationTooLong(Yr) {
  return Yr.sentence.length > MAX_CITATION_LENGTH;
}
//@ chunk-18hwfzwa.js:1046479-1046634 fingerprint = MEMORY_SURVEY_GATE (0.312)
var MEMORY_SURVEY_DELAY_MS = 5000;
var MEMORY_SURVEY_TIMEOUT_MS = 60000;
var TENGU_DUNWICH_BELL = "tengu_dunwich_bell";
var TENGU_MEMORY_SURVEY_EVENT = "tengu_memory_survey_event";
var TENGU_VELVET_MOTH = "tengu_velvet_moth";
var MEMORY_SURVEY = "memory_survey";
var MAX_CITATION_LENGTH = 250;
var MEMORY_SURVEY_SCORES = {
  bad: 1,
  fine: 2,
  good: 3,
};
//@ chunk-18hwfzwa.js:1046634-1046667 affinity
function getMemorySurveyProbability() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_MOTH, 0.2);
}
//@ chunk-18hwfzwa.js:1046667-1046691 affinity
function isMemorySurveyForced() {
  return false;
}
//@ chunk-18hwfzwa.js:1046806-1046971 sole-consumer
function extractCitedMemoryRefs(h) {
  let content = h.message.content;
  if (!Array.isArray(content)) return [];
  return content
    .filter((D) => typeof D === "object" && D !== null && D.type === "text")
    .flatMap((D) => extractMemoryCitations(D.text));
}
//@ chunk-18hwfzwa.js:1046971-1050360 fingerprint = useMemorySurvey (0.602)
function useMemorySurvey(messages, isLoading, hasActivePrompt, L) {
  let $ = w(43);
  let ee = hasActivePrompt === undefined ? false : hasActivePrompt;
  let Re;
  if ($[0] !== L) {
    Re = L === undefined ? {} : L;
    $[0] = L;
    $[1] = Re;
  } else Re = $[1];
  let { enabled, otherSurveyActive } = Re;
  let We = enabled === undefined ? true : enabled;
  let ze = otherSurveyActive === undefined ? false : otherSurveyActive;
  let { storageV5, credentials } = useTheme_2();
  let host = useHost();
  let At;
  if ($[2] !== host) {
    At = memoryWatchers.of(host);
    $[2] = host;
    $[3] = At;
  } else At = $[3];
  let It = At;
  let Ot;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    Ot = new Set();
    $[4] = Ot;
  } else Ot = $[4];
  let memoryReadSeen = R(Ot);
  let messagesRef = R(null);
  let messagesRef_2 = R(messages);
  let oo;
  let Xt;
  if ($[5] !== messages) {
    oo = () => {
      messagesRef_2.current = messages;
    };
    Xt = [messages];
    $[5] = messages;
    $[6] = oo;
    $[7] = Xt;
  } else {
    oo = $[6];
    Xt = $[7];
  }
  zt(oo, Xt);
  let [io, so] = y(null);
  let po = R(null);
  let ao = logMemorySurveyEvent;
  let co;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    co = (appearanceId) => ao("appeared", appearanceId);
    $[8] = co;
  } else co = $[8];
  let onOpen = co;
  let Bo;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    Bo = (selected_0) => ao("timeout", selected_0);
    $[9] = Bo;
  } else Bo = $[9];
  let onAutoDismiss = Bo;
  let Io;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    Io = (appearanceId_1) => ao("abandoned", appearanceId_1);
    $[10] = Io;
  } else Io = $[10];
  let onAbandon = Io;
  let Cn;
  if ($[11] !== It || $[12] !== storageV5) {
    Cn = (appearanceId_2, selected_1) => {
      ao("responded", appearanceId_2, selected_1);
      let Yo = po.current;
      let kn = MEMORY_SURVEY_SCORES[selected_1];
      if (kn !== undefined && Yo && Yo.filenames.length > 0)
        writeBackMemorySurveyRatings(It, Yo.filenames, kn, storageV5);
    };
    $[11] = It;
    $[12] = storageV5;
    $[13] = Cn;
  } else Cn = $[13];
  let onSelect = Cn;
  let onTranscriptPromptShown = logMemoryTranscriptPromptShown;
  let Go;
  if ($[14] !== credentials || $[15] !== host || $[16] !== storageV5) {
    Go = async (appearanceId, selected, Xo) => {
      logEvent(TENGU_MEMORY_SURVEY_EVENT, {
        event_type: fromEnum(`transcript_share_${selected}`),
        appearance_id: sanitizeMarkName(appearanceId),
        trigger: fromEnum(MEMORY_SURVEY),
        response: fromEnumOpt(Xo),
      });
      if (selected === "dont_ask_again") await saveGlobalConfig(markTranscriptShareDismissed, storageV5);
      if (selected === "yes") {
        let result = await collectTranscriptShareWithPolicy(
          messagesRef_2.current,
          MEMORY_SURVEY,
          appearanceId,
          storageV5,
          host,
          credentials,
        );
        logEvent(TENGU_MEMORY_SURVEY_EVENT, {
          event_type: lit_2(result.success ? "transcript_share_submitted" : "transcript_share_failed"),
          appearance_id: sanitizeMarkName(appearanceId),
          trigger: fromEnum(MEMORY_SURVEY),
          error_code: result.errorCode,
          response: fromEnumOpt(Xo),
        });
        return result.success;
      }
      return false;
    };
    $[14] = credentials;
    $[15] = host;
    $[16] = storageV5;
    $[17] = Go;
  } else Go = $[17];
  let onTranscriptSelect = Go;
  let on;
  if ($[18] !== onSelect || $[19] !== onTranscriptSelect || $[20] !== ze) {
    on = {
      otherSurveyActive: ze,
      hideThanksAfterMs: MEMORY_SURVEY_DELAY_MS,
      autoDismissAfterMs: MEMORY_SURVEY_TIMEOUT_MS,
      onOpen,
      onSelect,
      onAutoDismiss,
      onAbandon,
      shouldShowTranscriptPrompt,
      onTranscriptPromptShown,
      onTranscriptSelect,
    };
    $[18] = onSelect;
    $[19] = onTranscriptSelect;
    $[20] = ze;
    $[21] = on;
  } else on = $[21];
  let { state, lastResponse, appearanceId, open, abandon, handleSelect, handleUndo, handleTranscriptSelect } =
    useSurveyState(on);
  let Zn;
  if ($[22] !== messages) {
    Zn = getLastAssistantMessage(messages);
    $[22] = messages;
    $[23] = Zn;
  } else Zn = $[23];
  let Un = Zn;
  let dr;
  let or;
  if (
    $[24] !== We ||
    $[25] !== ee ||
    $[26] !== isLoading ||
    $[27] !== Un ||
    $[28] !== messages ||
    $[29] !== open ||
    $[30] !== ze ||
    $[31] !== state
  ) {
    dr = () => {
      if (messages.length === 0) {
        memoryReadSeen.current.clear();
        messagesRef.current = null;
        so(null);
        return;
      }
      if (messagesRef.current !== messages[0].uuid) {
        messagesRef.current = messages[0].uuid;
        memoryReadSeen.current.clear();
        for (const message of messages) {
          if (message.type === "assistant") memoryReadSeen.current.add(message.uuid);
        }
        return;
      }
      if (state !== "closed" || isLoading || ee) {
        return;
      }
      if (ze) {
        return;
      }
      if (!We || !isFeedbackSurveyAllowed()) {
        return;
      }
      if (!Un || memoryReadSeen.current.has(Un.uuid)) {
        return;
      }
      let citedMemoryRefs = extractCitedMemoryRefs(Un);
      if (citedMemoryRefs.length === 0) {
        return;
      }
      memoryReadSeen.current.add(Un.uuid);
      let filtered = citedMemoryRefs.filter(isMemoryCitationEligible);
      let Ir = citedMemoryRefs.length - filtered.length;
      if (Ir > 0)
        logEvent(TENGU_MEMORY_SURVEY_EVENT, {
          event_type: lit_2("citation_ineligible"),
          dropped_citation_count: Ir,
          dropped_too_long_count: count(citedMemoryRefs, isMemoryCitationTooLong),
          eligible_citation_count: filtered.length,
        });
      let [Pr] = filtered;
      if (Pr === undefined) {
        return;
      }
      if (!isMemorySurveyForced() && Math.random() >= getMemorySurveyProbability()) {
        return;
      }
      let ts = {
        sentence: Pr.sentence,
        filenames: uniq(Pr.filenames),
      };
      po.current = ts;
      so(ts);
      open();
    };
    or = [We, ze, state, isLoading, ee, Un, messages, open];
    $[24] = We;
    $[25] = ee;
    $[26] = isLoading;
    $[27] = Un;
    $[28] = messages;
    $[29] = open;
    $[30] = ze;
    $[31] = state;
    $[32] = dr;
    $[33] = or;
  } else {
    dr = $[32];
    or = $[33];
  }
  P(dr, or);
  let Gn;
  if (
    $[34] !== abandon ||
    $[35] !== io ||
    $[36] !== appearanceId ||
    $[37] !== handleSelect ||
    $[38] !== handleTranscriptSelect ||
    $[39] !== handleUndo ||
    $[40] !== lastResponse ||
    $[41] !== state
  ) {
    Gn = {
      state,
      lastResponse,
      appearanceId,
      citation: io,
      abandon,
      handleSelect,
      handleUndo,
      handleTranscriptSelect,
    };
    $[34] = abandon;
    $[35] = io;
    $[36] = appearanceId;
    $[37] = handleSelect;
    $[38] = handleTranscriptSelect;
    $[39] = handleUndo;
    $[40] = lastResponse;
    $[41] = state;
    $[42] = Gn;
  } else Gn = $[42];
  return Gn;
}
export {
  useMemorySurvey,
  MEMORY_SURVEY_MAX_LINES,
  MEMORY_SURVEY_HEADER,
  MEMORY_SURVEY_QUESTION,
  TENGU_DUNWICH_BELL,
};
