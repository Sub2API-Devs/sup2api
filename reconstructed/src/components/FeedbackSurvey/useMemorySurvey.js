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
import {
  relative,
  relative as relative_2,
  relative as relative_3,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
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
  isAbsolute,
  normalize,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
} from "path";
import { readdir, realpath, realpath as realpath_2, stat, readFile, utimes } from "fs/promises";
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
import { uA, STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
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
import { ye } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { truncateToLines } from "../../utils/stringUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { extractMemoryCitations } from "../../services/orgMemory/promptIndex.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { memoryWatchers } from "../../services/memorySync/memoryWatcher.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { R, zt, y, P } from "../../../vendor/react/cjs/react.production.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { yve } from "./submitTranscriptShare.js";
import { useSurveyState } from "./useSurveyState.js";
import { getLastAssistantMessage } from "../../utils/messages.js";
import { isFeedbackSurveyAllowed } from "../../services/policyLimits/index.js";

//@ chunk-18hwfzwa.js:993940-994017 placement
var MEMORY_SURVEY_HEADER = "Claude recalled a memory:",
  t4 = "How was Claude's recollection?",
  y$ = 4;
//@ chunk-18hwfzwa.js:1039472-1039502 placement
var kgo = 16,
  SURVEYRATING = "surveyRating";
/**
 * 校验记忆文件 frontmatter 里的 surveyRating（count/mean/total）；total 不合理时按 mean×count 估算并夹在 [count, 3count]。
 */
//@ chunk-18hwfzwa.js:1039502-1039867 placement
function parseSurveyRating(h) {
  if (typeof h !== "object" || h === null || Array.isArray(h)) return null;
  let { count: count, mean: mean, total: total } = h;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1) return null;
  if (typeof mean !== "number" || !Number.isFinite(mean)) return null;
  let ee =
    typeof total === "number" && Number.isInteger(total) && total >= count && total <= 3 * count
      ? total
      : Math.min(3 * count, Math.max(count, Math.round(mean * count)));
  return { count: count, mean: mean, total: ee };
}
//@ chunk-18hwfzwa.js:1039867-1040025 placement
function accumulateSurveyRating(h, x) {
  let D = parseSurveyRating(h);
  if (D === null) return { count: 1, mean: x, total: x };
  let L = D.count + 1,
    ee = D.total + x;
  return { count: L, mean: Math.round((ee / L) * 100) / 100, total: ee };
}
//@ chunk-18hwfzwa.js:1040025-1040058 placement
var Eve = 1e4,
  _go = 4 * Eve,
  Fot = 262144;
//@ chunk-18hwfzwa.js:1040058-1040163 placement
function isExcludedMemoryPath(h, x) {
  let D = relative_3(h, x);
  if (D === "" || D.startsWith("..")) return !0;
  return isExcludedMemoryKey(D.split(sep_3).join("/"));
}
//@ chunk-18hwfzwa.js:1040163-1040940 placement
async function listMemoryFilesForSurvey(h) {
  let x = [],
    D = 0,
    L = !1,
    ee = !1,
    ke = await readAllPages(
      async (Be) => {
        let listRecursive = await h.storageV5.listRecursive(
            { namespace: "memory", projectKey: h.projectKey },
            { cursor: Be, skipKeyStats: !0, links: "skip", maxLeaves: _go },
          ),
          We = listRecursive.ok ? listRecursive.value.skipped : void 0;
        if (We !== void 0 && (We.unrepresentable > 0 || We.reserved > 0)) ee = !0;
        return listRecursive;
      },
      (Be) => {
        for (let He of Be) {
          let We = He.kind === "key" && He.key.namespace === "memory" ? He.key.relPath.join("/") : void 0;
          if (We !== void 0 && isExcludedMemoryKey(We)) continue;
          if (D >= Eve) {
            L = !0;
            return;
          }
          if (((D += 1), We === void 0 || He.viaSymlink || !We.endsWith(".md"))) continue;
          x.push(We);
        }
      },
      { until: () => L },
    ),
    Re = L || ee || ke.status !== "done";
  if (Re)
    logForDebugging(
      `memorySurveyRating: v5 scan failed closed: ${L ? "capped" : ee ? "entries omitted by the listing" : ke.status === "error" ? ke.error.code : ke.status}`,
    );
  return { files: x, truncated: Re };
}
/**
 * 递归列出目录中的 .md 文件（跳过符号链接与忽略路径，超过上限标记 truncated）。
 */
//@ chunk-18hwfzwa.js:1040940-1041350 placement = replaceFromSnapshot (0.683)
async function listMarkdownFilesRecursive(h) {
  let x = [],
    D = [""];
  while (D.length > 0) {
    let L = D.pop(),
      ee;
    try {
      ee = await readdir(join_9(h, L), { withFileTypes: !0 });
    } catch {
      continue;
    }
    for (let dirent of ee) {
      if (dirent.isSymbolicLink()) continue;
      let Re = L === "" ? dirent.name : `${L}/${dirent.name}`;
      if (dirent.isDirectory()) {
        if (!isExcludedMemoryKey(Re)) D.push(Re);
      } else if (dirent.isFile() && dirent.name.endsWith(".md") && !isExcludedMemoryKey(Re)) {
        if (x.length >= Eve) return { files: x, truncated: !0 };
        x.push(Re);
      }
    }
  }
  return { files: x, truncated: !1 };
}
//@ chunk-18hwfzwa.js:1041350-1041736 sole-consumer = isSessionPlanFile (0.801)
async function resolveMemoryFileReference(fileRef, baseDir, listFiles) {
  if (!fileRef.endsWith(".md")) return null;
  let L = (Be) => isAutoMemPath(Be) && !isTeamMemPath(Be) && !isExcludedMemoryPath(baseDir, Be);
  if (isAbsolute(fileRef)) {
    let Be = normalize(fileRef);
    return L(Be) ? Be : null;
  }
  if (fileRef.includes("/") || fileRef.includes(sep_3)) {
    let Be = normalize(join_9(baseDir, fileRef));
    return L(Be) ? Be : null;
  }
  let ee = await listFiles();
  if (ee.truncated) return null;
  let filtered = ee.files.filter((file) => basename_6(file) === fileRef);
  if (filtered.length !== 1) return null;
  let normalizedPath = normalize(join_9(baseDir, filtered[0]));
  return L(normalizedPath) ? normalizedPath : null;
}
/**
 * 在 frontmatter 文本里写入或替换 surveyRating 块：已有则替换该缩进块，有 metadata: 则插在其下，否则在结尾 --- 前新建 metadata；保留原换行风格，结构异常返回 null。
 */
//@ chunk-18hwfzwa.js:1041965-1043331 affinity
function writeSurveyRatingIntoFrontmatter(h, x, D) {
  let L = x.includes(`\r
`)
      ? `\r
`
      : `
`,
    ee = x.length,
    parts = h.slice(0, ee).split(`
`),
    Be = /^(\s*)surveyRating:/,
    He = [];
  for (let At = 1; At < parts.length - 1; At++) if (Be.test(parts[At])) He.push(At);
  if (He.length > 1) return null;
  let We = (At) =>
    `${At}surveyRating:${L}${At}  count: ${D.count}${L}${At}  mean: ${D.mean}${L}${At}  total: ${D.total}`;
  if (He.length === 1) {
    let At = He[0],
      It = parts[At].match(Be)[1],
      Ot = At + 1;
    while (Ot < parts.length - 1) {
      let replaced = parts[Ot].replace(/\r$/, "");
      if (/^\s*(#|$)/.test(replaced)) {
        let Lt = Ot + 1;
        while (Lt < parts.length - 1 && /^\s*(#|$)/.test(parts[Lt].replace(/\r$/, ""))) Lt++;
        if (
          Lt < parts.length - 1 &&
          /\S/.test(parts[Lt]) &&
          parts[Lt].match(/^(\s*)/)[1].length > It.length
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
      [...parts.slice(0, At), We(It), ...parts.slice(Ot)].join(`
`) + h.slice(ee)
    );
  }
  let index = parts.findIndex((At, It) => It > 0 && /^metadata:/.test(At.replace(/\r$/, ""))),
    index_2 = parts.findIndex((At, It) => It > 0 && /^metadata:\s*$/.test(At.replace(/\r$/, "")));
  if (index !== -1 && index_2 === -1) return null;
  if (index_2 !== -1) {
    let At = index_2 + 1;
    while (At < parts.length - 1 && /^\s*(#|$)/.test(parts[At].replace(/\r$/, ""))) At++;
    let It = parts[At]?.match(/^(\s+)\S/),
      Ot = It ? It[1] : "  ";
    return (
      [...parts.slice(0, index_2 + 1), We(Ot), ...parts.slice(index_2 + 1)].join(`
`) + h.slice(ee)
    );
  }
  let rt = parts.length - 1;
  while (rt > 0 && parts[rt].trim() !== "---") rt--;
  if (rt === 0) return null;
  return (
    [...parts.slice(0, rt), `metadata:${L}${We("  ")}`, ...parts.slice(rt)].join(`
`) + h.slice(ee)
  );
}
/**
 * 判断路径是否是记忆目录下的 .md 文件（排除指定子目录和若干特殊文件）。旧版名 isSessionPlanFile 误配，应归 memdir。
 */
//@ chunk-18hwfzwa.js:1043331-1043439 placement = isSessionPlanFile (1)
function isMemoryDirMarkdownFile(path, memoryDir, excludedDir) {
  return (
    path.endsWith(".md") &&
    path.startsWith(memoryDir + sep_3) &&
    !path.startsWith(excludedDir + sep_3) &&
    !isTeamMemPath(path) &&
    !isExcludedMemoryPath(memoryDir + sep_3, path)
  );
}
/**
 * 把评分写回一个记忆文件：确认是自动记忆目录下的 .md 且不超大，storage v5 时通过后端 updateText 写入，否则读改写本地文件，最后恢复原 atime/mtime。
 */
//@ chunk-18hwfzwa.js:1043439-1044334 layout
async function writeBackMemoryRating(h, x, D, L) {
  return runWithFileWriteContext(h, async () => {
    let ee;
    try {
      let [Be, He, We] = await Promise.all([
        realpath(x),
        resolveRealAutoMemPath(),
        resolveRealAutoMemPath("team"),
      ]);
      if (Be !== x || !isMemoryDirMarkdownFile(x, He, We)) return !1;
      ee = relative_3(He, x).split(sep_3);
    } catch {
      return !1;
    }
    let ke, Re;
    try {
      let Be = await stat(x);
      if (Be.size > Fot) return !1;
      ((ke = Be.mtime), (Re = Be.atime));
    } catch {
      return !1;
    }
    if (L !== void 0 && uA(ee)) {
      let updateText = await L.storageV5.updateText(STORAGE_SPACES.memory(L.projectKey, ee), (He) => {
        if (He === void 0 || Buffer.byteLength(He.value, "utf8") > Fot) return { skip: !0 };
        let We = applySurveyRatingToMemory(He.value, x, D);
        return We === null
          ? { skip: !0 }
          : {
              write: detectLineEndingsForString(We, detectLineEndingsForString_2(He.value)),
              result: He.mtimeMs,
            };
      });
      if (!updateText.ok)
        return (logForDebugging(`memorySurveyRating: backend update failed: ${updateText.error.code}`), !1);
      if (!updateText.value.written) return !1;
      if (updateText.value.result !== void 0) ke = new Date(updateText.value.result);
    } else {
      let Be;
      try {
        Be = await readFile(x, "utf8");
      } catch {
        return !1;
      }
      let He = applySurveyRatingToMemory(Be, x, D);
      if (He === null) return !1;
      await writeTextContentVerified(x, He, "utf8", detectLineEndingsForString_2(Be));
    }
    try {
      await utimes(x, Re, ke);
    } catch {}
    return !0;
  });
}
/**
 * 生成带新评分的记忆文件内容：校验 frontmatter 能被宽松与严格两种正则解析且一致，写入后确认正文与其他字段不变，否则返回 null。
 */
//@ chunk-18hwfzwa.js:1044334-1045063 layout
function applySurveyRatingToMemory(h, x, D) {
  let match = h.match(FRONTMATTER_REGEX),
    match_2 = h.match(STRICT_FRONTMATTER_REGEX);
  if (match === null || match_2 === null || match[1].trim() !== match_2[1].trim()) return null;
  let ke = parseFrontmatter(h, x);
  if (ke.parseError || Object.keys(ke.frontmatter).length === 0) return null;
  let Re = parseMemoryFile(h, x),
    { frontmatter: frontmatter } = Re,
    He = accumulateSurveyRating(frontmatter.metadata[SURVEYRATING], D),
    We = writeSurveyRatingIntoFrontmatter(h, match_2[0], He);
  if (We === null) return null;
  let ze = parseMemoryFile(We, x),
    Xe = isInBundledMode({
      name: Re.frontmatter.name,
      description: Re.frontmatter.description,
      metadata: {
        ...Re.frontmatter.metadata,
        [SURVEYRATING]: { count: He.count, mean: He.mean, total: He.total },
      },
    });
  if (
    isInBundledMode({
      name: ze.frontmatter.name,
      description: ze.frontmatter.description,
      metadata: ze.frontmatter.metadata,
    }) !== Xe ||
    ze.body !== Re.body
  )
    return null;
  let match_3 = We.match(STRICT_FRONTMATTER_REGEX);
  if (match_3 === null || We.slice(match_3[0].length) !== h.slice(match_2[0].length)) return null;
  return We;
}
/**
 * 记忆调查回答后，把评分（1–3）写回被引用的记忆文件：解析最多 16 个引用、去重真实路径、并行写回，记录 tengu_memory_rating_writeback。
 */
//@ chunk-18hwfzwa.js:1045063-1045844 layout
async function writeBackMemorySurveyRatings(h, x, D, L) {
  try {
    if (!Number.isInteger(D) || D < 1 || D > 3) return;
    let ee = getAutoMemPath(),
      ke = L === void 0 ? void 0 : projectKeyFromMemoryDir(ee),
      Re =
        isStorageV5Enabled() && L !== void 0 && ke !== void 0 && (await isTeamMemoryDirAbsent(ee))
          ? { storageV5: L, projectKey: ke }
          : void 0,
      Be = null,
      He = () => ((Be ??= Re === void 0 ? listMarkdownFilesRecursive(ee) : listMemoryFilesForSurvey(Re)), Be),
      We = new Map();
    for (let rt of x.slice(0, kgo)) {
      let kt = await resolveMemoryFileReference(rt.trim(), ee, He);
      if (kt === null) continue;
      let At = await realpath(kt).catch(() => null);
      if (At !== null && !We.has(At)) We.set(At, kt);
    }
    let settled = await Promise.allSettled(
        [...We].map(async ([rt, kt]) => {
          if (await writeBackMemoryRating(kt, rt, D, Re)) return (h.notifyWrite(kt), !0);
          return !1;
        }),
      ),
      Xe = count(settled, (rt) => rt.status === "fulfilled" && rt.value === !0);
    logEvent("tengu_memory_rating_writeback", {
      cited_count: fromNumber(x.length),
      resolved_count: fromNumber(We.size),
      written_count: fromNumber(Xe),
    });
  } catch (error) {
    logForDebugging(`memorySurveyRating: write-back failed: ${String(error)}`);
  }
}
//@ chunk-18hwfzwa.js:1045844-1045868 layout
function Ove() {
  return !1;
}
//@ chunk-18hwfzwa.js:1045868-1046041 layout
function logMemorySurveyEvent(Ur, Zr, wr) {
  (logEvent(TENGU_MEMORY_SURVEY_EVENT, {
    event_type: fromEnum(Ur),
    appearance_id: ye(Zr),
    response: fromEnumOpt(wr),
  }),
    logOTelEvent("feedback_survey", {
      event_type: Ur,
      appearance_id: Zr,
      response: wr,
      survey_type: "memory",
    }));
}
//@ chunk-18hwfzwa.js:1046041-1046277 layout
function logMemoryTranscriptPromptShown(zr, _r) {
  (logEvent(TENGU_MEMORY_SURVEY_EVENT, {
    event_type: lit_2("transcript_prompt_appeared"),
    appearance_id: ye(zr),
    trigger: fromEnum(MEMORY_SURVEY),
    response: fromEnumOpt(_r),
  }),
    logOTelEvent("feedback_survey", {
      event_type: "transcript_prompt_appeared",
      appearance_id: zr,
      survey_type: "memory",
      response: _r,
    }));
}
//@ chunk-18hwfzwa.js:1046277-1046336 layout
function cho(fr) {
  return { ...fr, transcriptShareDismissed: !0 };
}
//@ chunk-18hwfzwa.js:1046336-1046433 layout
function uho($r) {
  return !$r.incomplete && $r.sentence.length <= I4 && truncateToLines($r.sentence, y$) === $r.sentence;
}
//@ chunk-18hwfzwa.js:1046433-1046479 layout
function mho(Yr) {
  return Yr.sentence.length > I4;
}
//@ chunk-18hwfzwa.js:1046479-1046634 fingerprint = MEMORY_SURVEY_GATE (0.312)
var MEMORY_SURVEY_DELAY_MS = 5000,
  MEMORY_SURVEY_TIMEOUT_MS = 60000,
  TENGU_DUNWICH_BELL = "tengu_dunwich_bell",
  TENGU_MEMORY_SURVEY_EVENT = "tengu_memory_survey_event",
  TENGU_VELVET_MOTH = "tengu_velvet_moth",
  MEMORY_SURVEY = "memory_survey",
  I4 = 250,
  MEMORY_SURVEY_SCORES = { bad: 1, fine: 2, good: 3 };
//@ chunk-18hwfzwa.js:1046634-1046667 affinity
function Vot() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_MOTH, 0.2);
}
//@ chunk-18hwfzwa.js:1046667-1046691 affinity
function Kot() {
  return !1;
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
  let $ = w(43),
    ee = hasActivePrompt === void 0 ? !1 : hasActivePrompt,
    Re;
  if ($[0] !== L) ((Re = L === void 0 ? {} : L), ($[0] = L), ($[1] = Re));
  else Re = $[1];
  let { enabled: enabled, otherSurveyActive: otherSurveyActive } = Re,
    We = enabled === void 0 ? !0 : enabled,
    ze = otherSurveyActive === void 0 ? !1 : otherSurveyActive,
    { storageV5: storageV5, credentials: credentials } = Me(),
    kt = useHost(),
    At;
  if ($[2] !== kt) ((At = memoryWatchers.of(kt)), ($[2] = kt), ($[3] = At));
  else At = $[3];
  let It = At,
    Ot;
  if ($[4] === MEMO_CACHE_SENTINEL) ((Ot = new Set()), ($[4] = Ot));
  else Ot = $[4];
  let memoryReadSeen = R(Ot),
    messagesRef = R(null),
    Lt = R(messages),
    oo,
    Xt;
  if ($[5] !== messages)
    ((oo = () => {
      Lt.current = messages;
    }),
      (Xt = [messages]),
      ($[5] = messages),
      ($[6] = oo),
      ($[7] = Xt));
  else ((oo = $[6]), (Xt = $[7]));
  zt(oo, Xt);
  let [io, so] = y(null),
    po = R(null),
    ao = logMemorySurveyEvent,
    co;
  if ($[8] === MEMO_CACHE_SENTINEL) ((co = (appearanceId) => ao("appeared", appearanceId)), ($[8] = co));
  else co = $[8];
  let Ao = co,
    Bo;
  if ($[9] === MEMO_CACHE_SENTINEL) ((Bo = (selected_0) => ao("timeout", selected_0)), ($[9] = Bo));
  else Bo = $[9];
  let Ho = Bo,
    Io;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((Io = (appearanceId_1) => ao("abandoned", appearanceId_1)), ($[10] = Io));
  else Io = $[10];
  let mn = Io,
    Cn;
  if ($[11] !== It || $[12] !== storageV5)
    ((Cn = (appearanceId_2, selected_1) => {
      ao("responded", appearanceId_2, selected_1);
      let Yo = po.current;
      let kn = MEMORY_SURVEY_SCORES[selected_1];
      if (kn !== void 0 && Yo && Yo.filenames.length > 0)
        writeBackMemorySurveyRatings(It, Yo.filenames, kn, storageV5);
    }),
      ($[11] = It),
      ($[12] = storageV5),
      ($[13] = Cn));
  else Cn = $[13];
  let Fn = Cn,
    bn = logMemoryTranscriptPromptShown,
    Go;
  if ($[14] !== credentials || $[15] !== kt || $[16] !== storageV5)
    ((Go = async (hn, Mn, Xo) => {
      if (
        (logEvent(TENGU_MEMORY_SURVEY_EVENT, {
          event_type: fromEnum(`transcript_share_${Mn}`),
          appearance_id: ye(hn),
          trigger: fromEnum(MEMORY_SURVEY),
          response: fromEnumOpt(Xo),
        }),
        Mn === "dont_ask_again")
      )
        await saveGlobalConfig(cho, storageV5);
      if (Mn === "yes") {
        let Sn = await yve(Lt.current, MEMORY_SURVEY, hn, storageV5, kt, credentials);
        return (
          logEvent(TENGU_MEMORY_SURVEY_EVENT, {
            event_type: lit_2(Sn.success ? "transcript_share_submitted" : "transcript_share_failed"),
            appearance_id: ye(hn),
            trigger: fromEnum(MEMORY_SURVEY),
            error_code: Sn.errorCode,
            response: fromEnumOpt(Xo),
          }),
          Sn.success
        );
      }
      return !1;
    }),
      ($[14] = credentials),
      ($[15] = kt),
      ($[16] = storageV5),
      ($[17] = Go));
  else Go = $[17];
  let $n = Go,
    on;
  if ($[18] !== Fn || $[19] !== $n || $[20] !== ze)
    ((on = {
      otherSurveyActive: ze,
      hideThanksAfterMs: MEMORY_SURVEY_DELAY_MS,
      autoDismissAfterMs: MEMORY_SURVEY_TIMEOUT_MS,
      onOpen: Ao,
      onSelect: Fn,
      onAutoDismiss: Ho,
      onAbandon: mn,
      shouldShowTranscriptPrompt: Ove,
      onTranscriptPromptShown: bn,
      onTranscriptSelect: $n,
    }),
      ($[18] = Fn),
      ($[19] = $n),
      ($[20] = ze),
      ($[21] = on));
  else on = $[21];
  let {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      open: open,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
      handleTranscriptSelect: handleTranscriptSelect,
    } = useSurveyState(on),
    Zn;
  if ($[22] !== messages) ((Zn = getLastAssistantMessage(messages)), ($[22] = messages), ($[23] = Zn));
  else Zn = $[23];
  let Un = Zn,
    dr,
    or;
  if (
    $[24] !== We ||
    $[25] !== ee ||
    $[26] !== isLoading ||
    $[27] !== Un ||
    $[28] !== messages ||
    $[29] !== open ||
    $[30] !== ze ||
    $[31] !== state
  )
    ((dr = () => {
      if (messages.length === 0) {
        (memoryReadSeen.current.clear(), (messagesRef.current = null), so(null));
        return;
      }
      if (messagesRef.current !== messages[0].uuid) {
        ((messagesRef.current = messages[0].uuid), memoryReadSeen.current.clear());
        for (const pr of messages) {
          if (pr.type === "assistant") memoryReadSeen.current.add(pr.uuid);
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
      let Qn = extractCitedMemoryRefs(Un);
      if (Qn.length === 0) {
        return;
      }
      memoryReadSeen.current.add(Un.uuid);
      let filtered = Qn.filter(uho);
      let Ir = Qn.length - filtered.length;
      if (Ir > 0)
        logEvent(TENGU_MEMORY_SURVEY_EVENT, {
          event_type: lit_2("citation_ineligible"),
          dropped_citation_count: Ir,
          dropped_too_long_count: count(Qn, mho),
          eligible_citation_count: filtered.length,
        });
      let [Pr] = filtered;
      if (Pr === void 0) {
        return;
      }
      if (!Kot() && Math.random() >= Vot()) {
        return;
      }
      let ts = { sentence: Pr.sentence, filenames: uniq(Pr.filenames) };
      ((po.current = ts), so(ts), open());
    }),
      (or = [We, ze, state, isLoading, ee, Un, messages, open]),
      ($[24] = We),
      ($[25] = ee),
      ($[26] = isLoading),
      ($[27] = Un),
      ($[28] = messages),
      ($[29] = open),
      ($[30] = ze),
      ($[31] = state),
      ($[32] = dr),
      ($[33] = or));
  else ((dr = $[32]), (or = $[33]));
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
  )
    ((Gn = {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      citation: io,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
      handleTranscriptSelect: handleTranscriptSelect,
    }),
      ($[34] = abandon),
      ($[35] = io),
      ($[36] = appearanceId),
      ($[37] = handleSelect),
      ($[38] = handleTranscriptSelect),
      ($[39] = handleUndo),
      ($[40] = lastResponse),
      ($[41] = state),
      ($[42] = Gn));
  else Gn = $[42];
  return Gn;
}

export { useMemorySurvey, y$, MEMORY_SURVEY_HEADER, t4, TENGU_DUNWICH_BELL };
