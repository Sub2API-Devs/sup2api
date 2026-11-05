/**
 * components/FeedbackSurvey/useMemorySurvey.tsx
 *
 * 记忆召回调查：读取过记忆文件后询问召回质量。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/useMemorySurvey.tsx
 * pieces: chunk-czq1j3j2.js (25)
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
import { countWhere } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber, fromEnum, fromEnumOpt, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { truncateToLines } from "../../utils/stringUtils.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { extractMemoryCitations } from "../../services/orgMemory/promptIndex.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { memoryWatchers } from "../../services/memorySync/memoryWatcher.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useRef, useLayoutEffect, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { saveGlobalConfig } from "../../utils/config.js";
import { collectTranscriptShareWithPolicy } from "./submitTranscriptShare.js";
import { useSurveyState } from "./useSurveyState.js";
import { getLastAssistantMessage } from "../../utils/messages.js";
import { isFeedbackSurveyAllowed } from "../../services/policyLimits/index.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";

//@ chunk-czq1j3j2.js:1027974-1028051 placement
var MEMORY_SURVEY_HEADER = "Claude recalled a memory:";
var MEMORY_SURVEY_QUESTION = "How was Claude's recollection?";
var MEMORY_SURVEY_MAX_LINES = 4;
//@ chunk-czq1j3j2.js:1073501-1073531 placement
var MAX_MEMORY_FILES_PER_SURVEY = 16;
var SURVEYRATING = "surveyRating";
//@ chunk-czq1j3j2.js:1073531-1073896 placement
/**
 * 校验记忆文件 frontmatter 里的 surveyRating（count/mean/total）；total 不合理时按 mean×count 估算并夹在 [count, 3count]。
 */
function parseSurveyRating(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  let { count, mean, total } = value;
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
//@ chunk-czq1j3j2.js:1073896-1074054 placement
function accumulateSurveyRating(previous, rating) {
  let surveyRating = parseSurveyRating(previous);
  if (surveyRating === null)
    return {
      count: 1,
      mean: rating,
      total: rating,
    };
  let count = surveyRating.count + 1;
  let total = surveyRating.total + rating;
  return {
    count,
    mean: Math.round((total / count) * 100) / 100,
    total,
  };
}
//@ chunk-czq1j3j2.js:1074054-1074087 placement
var MAX_MEMORY_SCAN_FILES = 1e4;
var MAX_MEMORY_SCAN_LEAVES = 4 * MAX_MEMORY_SCAN_FILES;
var MAX_MEMORY_FILE_BYTES = 262144;
//@ chunk-czq1j3j2.js:1074087-1074192 placement
function isExcludedMemoryPath(root, path) {
  let relativePath = relative(root, path);
  if (relativePath === "" || relativePath.startsWith("..")) return true;
  return isExcludedMemoryKey(relativePath.split(sep).join("/"));
}
//@ chunk-czq1j3j2.js:1074192-1074969 placement
async function listMemoryFilesForSurvey(options) {
  let files = [];
  let fileCount = 0;
  let wasCapped = false;
  let hadOmittedEntries = false;
  let allPages = await readAllPages(
    async (cursor) => {
      let page = await options.storageV5.listRecursive(
        {
          namespace: "memory",
          projectKey: options.projectKey,
        },
        {
          cursor,
          skipKeyStats: true,
          links: "skip",
          maxLeaves: MAX_MEMORY_SCAN_LEAVES,
        },
      );
      let skipped = page.ok ? page.value.skipped : undefined;
      if (skipped !== undefined && (skipped.unrepresentable > 0 || skipped.reserved > 0))
        hadOmittedEntries = true;
      return page;
    },
    (leaves) => {
      for (let leaf of leaves) {
        let relPath =
          leaf.kind === "key" && leaf.key.namespace === "memory" ? leaf.key.relPath.join("/") : undefined;
        if (relPath !== undefined && isExcludedMemoryKey(relPath)) continue;
        if (fileCount >= MAX_MEMORY_SCAN_FILES) {
          wasCapped = true;
          return;
        }
        fileCount += 1;
        if (relPath === undefined || leaf.viaSymlink || !relPath.endsWith(".md")) continue;
        files.push(relPath);
      }
    },
    {
      until: () => wasCapped,
    },
  );
  let isTruncated = wasCapped || hadOmittedEntries || allPages.status !== "done";
  if (isTruncated)
    logForDebugging(
      `memorySurveyRating: v5 scan failed closed: ${wasCapped ? "capped" : hadOmittedEntries ? "entries omitted by the listing" : allPages.status === "error" ? allPages.error.code : allPages.status}`,
    );
  return {
    files,
    truncated: isTruncated,
  };
}
//@ chunk-czq1j3j2.js:1074969-1075379 placement (2.1.88 match: replaceFromSnapshot, 0.683)
/**
 * 递归列出目录中的 .md 文件（跳过符号链接与忽略路径，超过上限标记 truncated）。
 */
async function listMarkdownFilesRecursive(rootDir) {
  let files = [];
  let pendingDirs = [""];
  while (pendingDirs.length > 0) {
    let relativeDir = pendingDirs.pop();
    let entries;
    try {
      entries = await readdir(join(rootDir, relativeDir), {
        withFileTypes: true,
      });
    } catch {
      continue;
    }
    for (let dirent of entries) {
      if (dirent.isSymbolicLink()) continue;
      let relativePath = relativeDir === "" ? dirent.name : `${relativeDir}/${dirent.name}`;
      if (dirent.isDirectory()) {
        if (!isExcludedMemoryKey(relativePath)) pendingDirs.push(relativePath);
      } else if (dirent.isFile() && dirent.name.endsWith(".md") && !isExcludedMemoryKey(relativePath)) {
        if (files.length >= MAX_MEMORY_SCAN_FILES)
          return {
            files,
            truncated: true,
          };
        files.push(relativePath);
      }
    }
  }
  return {
    files,
    truncated: false,
  };
}
//@ chunk-czq1j3j2.js:1075379-1075765 sole-consumer (2.1.88 match: isSessionPlanFile, 0.802)
async function resolveMemoryFileReference(fileRef, baseDir, listFiles) {
  if (!fileRef.endsWith(".md")) return null;
  let isAllowedPath = (candidatePath) =>
    isAutoMemPath(candidatePath) &&
    !isTeamMemPath(candidatePath) &&
    !isExcludedMemoryPath(baseDir, candidatePath);
  if (isAbsolute(fileRef)) {
    let absolutePath = normalize(fileRef);
    return isAllowedPath(absolutePath) ? absolutePath : null;
  }
  if (fileRef.includes("/") || fileRef.includes(sep)) {
    let joinedPath = normalize(join(baseDir, fileRef));
    return isAllowedPath(joinedPath) ? joinedPath : null;
  }
  let listing = await listFiles();
  if (listing.truncated) return null;
  let filtered = listing.files.filter((file) => basename(file) === fileRef);
  if (filtered.length !== 1) return null;
  let normalizedPath = normalize(join(baseDir, filtered[0]));
  return isAllowedPath(normalizedPath) ? normalizedPath : null;
}
//@ chunk-czq1j3j2.js:1075994-1077360 affinity
/**
 * 在 frontmatter 文本里写入或替换 surveyRating 块：已有则替换该缩进块，有 metadata: 则插在其下，否则在结尾 --- 前新建 metadata；保留原换行风格，结构异常返回 null。
 */
function writeSurveyRatingIntoFrontmatter(content, frontmatterBlock, rating) {
  let lineEnding = frontmatterBlock.includes(`\r
`)
    ? `\r
`
    : `
`;
  let frontmatterLength = frontmatterBlock.length;
  let lines = content.slice(0, frontmatterLength).split(`
`);
  let surveyRatingLineRegex = /^(\s*)surveyRating:/;
  let ratingLineIndexes = [];
  for (let idx = 1; idx < lines.length - 1; idx++)
    if (surveyRatingLineRegex.test(lines[idx])) ratingLineIndexes.push(idx);
  if (ratingLineIndexes.length > 1) return null;
  let renderRatingBlock = (indent) =>
    `${indent}surveyRating:${lineEnding}${indent}  count: ${rating.count}${lineEnding}${indent}  mean: ${rating.mean}${lineEnding}${indent}  total: ${rating.total}`;
  if (ratingLineIndexes.length === 1) {
    let ratingLineIndex = ratingLineIndexes[0];
    let ratingIndent = lines[ratingLineIndex].match(surveyRatingLineRegex)[1];
    let blockEnd = ratingLineIndex + 1;
    while (blockEnd < lines.length - 1) {
      let replaced = lines[blockEnd].replace(/\r$/, "");
      if (/^\s*(#|$)/.test(replaced)) {
        let nextContentLine = blockEnd + 1;
        while (
          nextContentLine < lines.length - 1 &&
          /^\s*(#|$)/.test(lines[nextContentLine].replace(/\r$/, ""))
        )
          nextContentLine++;
        if (
          nextContentLine < lines.length - 1 &&
          /\S/.test(lines[nextContentLine]) &&
          lines[nextContentLine].match(/^(\s*)/)[1].length > ratingIndent.length
        ) {
          blockEnd = nextContentLine;
          continue;
        }
        break;
      }
      if (replaced.match(/^(\s*)/)[1].length > ratingIndent.length) {
        blockEnd++;
        continue;
      }
      break;
    }
    return (
      [...lines.slice(0, ratingLineIndex), renderRatingBlock(ratingIndent), ...lines.slice(blockEnd)].join(`
`) + content.slice(frontmatterLength)
    );
  }
  let index = lines.findIndex(
    (line, lineIndex) => lineIndex > 0 && /^metadata:/.test(line.replace(/\r$/, "")),
  );
  let index_2 = lines.findIndex(
    (line, lineIndex) => lineIndex > 0 && /^metadata:\s*$/.test(line.replace(/\r$/, "")),
  );
  if (index !== -1 && index_2 === -1) return null;
  if (index_2 !== -1) {
    let childLineIndex = index_2 + 1;
    while (childLineIndex < lines.length - 1 && /^\s*(#|$)/.test(lines[childLineIndex].replace(/\r$/, "")))
      childLineIndex++;
    let match = lines[childLineIndex]?.match(/^(\s+)\S/);
    let childIndent = match ? match[1] : "  ";
    return (
      [...lines.slice(0, index_2 + 1), renderRatingBlock(childIndent), ...lines.slice(index_2 + 1)].join(`
`) + content.slice(frontmatterLength)
    );
  }
  let closingFenceIndex = lines.length - 1;
  while (closingFenceIndex > 0 && lines[closingFenceIndex].trim() !== "---") closingFenceIndex--;
  if (closingFenceIndex === 0) return null;
  return (
    [
      ...lines.slice(0, closingFenceIndex),
      `metadata:${lineEnding}${renderRatingBlock("  ")}`,
      ...lines.slice(closingFenceIndex),
    ].join(`
`) + content.slice(frontmatterLength)
  );
}
//@ chunk-czq1j3j2.js:1077360-1077468 placement (2.1.88 match: isSessionPlanFile, 1)
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
//@ chunk-czq1j3j2.js:1077468-1078363 layout
/**
 * 把评分写回一个记忆文件：确认是自动记忆目录下的 .md 且不超大，storage v5 时通过后端 updateText 写入，否则读改写本地文件，最后恢复原 atime/mtime。
 */
async function writeBackMemoryRating(context, realPath, rating, memoryOptions) {
  return runWithFileWriteContext(context, async () => {
    let keySegments;
    try {
      let [resolvedPath, memoryDir, excludedDir] = await Promise.all([
        realpath(realPath),
        resolveRealAutoMemPath(),
        resolveRealAutoMemPath("team"),
      ]);
      if (resolvedPath !== realPath || !isMemoryDirMarkdownFile(realPath, memoryDir, excludedDir))
        return false;
      keySegments = relative(memoryDir, realPath).split(sep);
    } catch {
      return false;
    }
    let mtime;
    let atime;
    try {
      let stats = await stat(realPath);
      if (stats.size > MAX_MEMORY_FILE_BYTES) return false;
      mtime = stats.mtime;
      atime = stats.atime;
    } catch {
      return false;
    }
    if (memoryOptions !== undefined && areValidKeySegments(keySegments)) {
      let updateResult = await memoryOptions.storageV5.updateText(
        STORAGE_SPACES.memory(memoryOptions.projectKey, keySegments),
        (existing) => {
          if (existing === undefined || Buffer.byteLength(existing.value, "utf8") > MAX_MEMORY_FILE_BYTES)
            return {
              skip: true,
            };
          let updatedContent = applySurveyRatingToMemory(existing.value, realPath, rating);
          return updatedContent === null
            ? {
                skip: true,
              }
            : {
                write: detectLineEndingsForString(
                  updatedContent,
                  detectLineEndingsForString_2(existing.value),
                ),
                result: existing.mtimeMs,
              };
        },
      );
      if (!updateResult.ok) {
        logForDebugging(`memorySurveyRating: backend update failed: ${updateResult.error.code}`);
        return false;
      }
      if (!updateResult.value.written) return false;
      if (updateResult.value.result !== undefined) mtime = new Date(updateResult.value.result);
    } else {
      let writeResult;
      try {
        writeResult = await readFile(realPath, "utf8");
      } catch {
        return false;
      }
      let current = applySurveyRatingToMemory(writeResult, realPath, rating);
      if (current === null) return false;
      await writeTextContentVerified(realPath, current, "utf8", detectLineEndingsForString_2(writeResult));
    }
    try {
      await utimes(realPath, atime, mtime);
    } catch {}
    return true;
  });
}
//@ chunk-czq1j3j2.js:1078363-1079092 layout
/**
 * 生成带新评分的记忆文件内容：校验 frontmatter 能被宽松与严格两种正则解析且一致，写入后确认正文与其他字段不变，否则返回 null。
 */
function applySurveyRatingToMemory(content, filePath, rating) {
  let match = content.match(FRONTMATTER_REGEX);
  let match_2 = content.match(STRICT_FRONTMATTER_REGEX);
  if (match === null || match_2 === null || match[1].trim() !== match_2[1].trim()) return null;
  let frontmatter = parseFrontmatter(content, filePath);
  if (frontmatter.parseError || Object.keys(frontmatter.frontmatter).length === 0) return null;
  let memoryFile = parseMemoryFile(content, filePath);
  let { frontmatter: frontmatter_2 } = memoryFile;
  let nextRating = accumulateSurveyRating(frontmatter_2.metadata[SURVEYRATING], rating);
  let updatedContent = writeSurveyRatingIntoFrontmatter(content, match_2[0], nextRating);
  if (updatedContent === null) return null;
  let memoryFile_2 = parseMemoryFile(updatedContent, filePath);
  let wasBundled = isInBundledMode({
    name: memoryFile.frontmatter.name,
    description: memoryFile.frontmatter.description,
    metadata: {
      ...memoryFile.frontmatter.metadata,
      [SURVEYRATING]: {
        count: nextRating.count,
        mean: nextRating.mean,
        total: nextRating.total,
      },
    },
  });
  if (
    isInBundledMode({
      name: memoryFile_2.frontmatter.name,
      description: memoryFile_2.frontmatter.description,
      metadata: memoryFile_2.frontmatter.metadata,
    }) !== wasBundled ||
    memoryFile_2.body !== memoryFile.body
  )
    return null;
  let match_3 = updatedContent.match(STRICT_FRONTMATTER_REGEX);
  if (match_3 === null || updatedContent.slice(match_3[0].length) !== content.slice(match_2[0].length))
    return null;
  return updatedContent;
}
//@ chunk-czq1j3j2.js:1079092-1079873 layout
/**
 * 记忆调查回答后，把评分（1–3）写回被引用的记忆文件：解析最多 16 个引用、去重真实路径、并行写回，记录 tengu_memory_rating_writeback。
 */
async function writeBackMemorySurveyRatings(context, filenames, rating, storageV5) {
  try {
    if (!Number.isInteger(rating) || rating < 1 || rating > 3) return;
    let autoMemPath = getAutoMemPath();
    let projectKey = storageV5 === undefined ? undefined : projectKeyFromMemoryDir(autoMemPath);
    let memoryOptions =
      isStorageV5Enabled() &&
      storageV5 !== undefined &&
      projectKey !== undefined &&
      (await isTeamMemoryDirAbsent(autoMemPath))
        ? {
            storageV5,
            projectKey,
          }
        : undefined;
    let filesPromise = null;
    let listFiles = () => {
      filesPromise ??=
        memoryOptions === undefined
          ? listMarkdownFilesRecursive(autoMemPath)
          : listMemoryFilesForSurvey(memoryOptions);
      return filesPromise;
    };
    let resolvedFiles = new Map();
    for (let filename of filenames.slice(0, MAX_MEMORY_FILES_PER_SURVEY)) {
      let memoryFileReference = await resolveMemoryFileReference(filename.trim(), autoMemPath, listFiles);
      if (memoryFileReference === null) continue;
      let realPath = await realpath(memoryFileReference).catch(() => null);
      if (realPath !== null && !resolvedFiles.has(realPath)) resolvedFiles.set(realPath, memoryFileReference);
    }
    let settled = await Promise.allSettled(
      [...resolvedFiles].map(async ([realPath, displayPath]) => {
        if (await writeBackMemoryRating(displayPath, realPath, rating, memoryOptions)) {
          context.notifyWrite(displayPath);
          return true;
        }
        return false;
      }),
    );
    let writtenCount = countWhere(
      settled,
      (settled) => settled.status === "fulfilled" && settled.value === true,
    );
    logEvent("tengu_memory_rating_writeback", {
      cited_count: fromNumber(filenames.length),
      resolved_count: fromNumber(resolvedFiles.size),
      written_count: fromNumber(writtenCount),
    });
  } catch (error) {
    logForDebugging(`memorySurveyRating: write-back failed: ${String(error)}`);
  }
}
//@ chunk-czq1j3j2.js:1079873-1079897 layout
function shouldShowTranscriptPrompt() {
  return false;
}
//@ chunk-czq1j3j2.js:1079897-1080070 layout
function logMemorySurveyEvent(eventType, appearanceId, response) {
  logEvent(TENGU_MEMORY_SURVEY_EVENT, {
    event_type: fromEnum(eventType),
    appearance_id: sanitizeMarkName(appearanceId),
    response: fromEnumOpt(response),
  });
  logOTelEvent("feedback_survey", {
    event_type: eventType,
    appearance_id: appearanceId,
    response,
    survey_type: "memory",
  });
}
//@ chunk-czq1j3j2.js:1080070-1080306 layout
function logMemoryTranscriptPromptShown(appearanceId, response) {
  logEvent(TENGU_MEMORY_SURVEY_EVENT, {
    event_type: lit_2("transcript_prompt_appeared"),
    appearance_id: sanitizeMarkName(appearanceId),
    trigger: fromEnum(MEMORY_SURVEY),
    response: fromEnumOpt(response),
  });
  logOTelEvent("feedback_survey", {
    event_type: "transcript_prompt_appeared",
    appearance_id: appearanceId,
    survey_type: "memory",
    response,
  });
}
//@ chunk-czq1j3j2.js:1080306-1080365 layout
function markTranscriptShareDismissed(state) {
  return {
    ...state,
    transcriptShareDismissed: true,
  };
}
//@ chunk-czq1j3j2.js:1080365-1080462 layout
function isMemoryCitationEligible(ref) {
  return (
    !ref.incomplete &&
    ref.sentence.length <= MAX_CITATION_LENGTH &&
    truncateToLines(ref.sentence, MEMORY_SURVEY_MAX_LINES) === ref.sentence
  );
}
//@ chunk-czq1j3j2.js:1080462-1080508 layout
function isMemoryCitationTooLong(ref) {
  return ref.sentence.length > MAX_CITATION_LENGTH;
}
//@ chunk-czq1j3j2.js:1080508-1080663 fingerprint (2.1.88 match: MEMORY_SURVEY_GATE, 0.312)
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
//@ chunk-czq1j3j2.js:1080663-1080696 affinity
function getMemorySurveyProbability() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELVET_MOTH, 0.2);
}
//@ chunk-czq1j3j2.js:1080696-1080720 affinity
function isMemorySurveyForced() {
  return false;
}
//@ chunk-czq1j3j2.js:1080835-1081000 sole-consumer
function extractCitedMemoryRefs(message) {
  let content = message.message.content;
  if (!Array.isArray(content)) return [];
  return content
    .filter((block) => typeof block === "object" && block !== null && block.type === "text")
    .flatMap((block) => extractMemoryCitations(block.text));
}
//@ chunk-czq1j3j2.js:1081000-1084389 fingerprint (2.1.88 match: useMemorySurvey, 0.602)
function useMemorySurvey(messages, isLoading, hasActivePrompt, options) {
  let $ = useMemoCache(43);
  let hasActivePromptFlag = hasActivePrompt === undefined ? false : hasActivePrompt;
  let resolvedOptions;
  if ($[0] !== options) {
    resolvedOptions = options === undefined ? {} : options;
    $[0] = options;
    $[1] = resolvedOptions;
  } else resolvedOptions = $[1];
  let { enabled, otherSurveyActive } = resolvedOptions;
  let isEnabled = enabled === undefined ? true : enabled;
  let otherSurveyActiveFlag = otherSurveyActive === undefined ? false : otherSurveyActive;
  let { storageV5, credentials } = useTheme_2();
  let host = useHost();
  let watcherCached;
  if ($[2] !== host) {
    watcherCached = memoryWatchers.of(host);
    $[2] = host;
    $[3] = watcherCached;
  } else watcherCached = $[3];
  let watcher = watcherCached;
  let emptySeenSet;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    emptySeenSet = new Set();
    $[4] = emptySeenSet;
  } else emptySeenSet = $[4];
  let memoryReadSeen = useRef(emptySeenSet);
  let messagesRef = useRef(null);
  let messagesRef_2 = useRef(messages);
  let syncMessages;
  let syncMessagesDeps;
  if ($[5] !== messages) {
    syncMessages = () => {
      messagesRef_2.current = messages;
    };
    syncMessagesDeps = [messages];
    $[5] = messages;
    $[6] = syncMessages;
    $[7] = syncMessagesDeps;
  } else {
    syncMessages = $[6];
    syncMessagesDeps = $[7];
  }
  useLayoutEffect(syncMessages, syncMessagesDeps);
  let [citation, setCitation] = useState(null);
  let citationRef = useRef(null);
  let logEvent_2 = logMemorySurveyEvent;
  let onOpen;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    onOpen = (appearanceId) => logEvent_2("appeared", appearanceId);
    $[8] = onOpen;
  } else onOpen = $[8];
  let onOpen_2 = onOpen;
  let onAutoDismiss;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    onAutoDismiss = (selected_0) => logEvent_2("timeout", selected_0);
    $[9] = onAutoDismiss;
  } else onAutoDismiss = $[9];
  let onAutoDismiss_2 = onAutoDismiss;
  let onAbandon;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    onAbandon = (appearanceId_1) => logEvent_2("abandoned", appearanceId_1);
    $[10] = onAbandon;
  } else onAbandon = $[10];
  let onAbandon_2 = onAbandon;
  let onSelect;
  if ($[11] !== watcher || $[12] !== storageV5) {
    onSelect = (appearanceId_2, selected_1) => {
      logEvent_2("responded", appearanceId_2, selected_1);
      let currentCitation = citationRef.current;
      let score = MEMORY_SURVEY_SCORES[selected_1];
      if (score !== undefined && currentCitation && currentCitation.filenames.length > 0)
        writeBackMemorySurveyRatings(watcher, currentCitation.filenames, score, storageV5);
    };
    $[11] = watcher;
    $[12] = storageV5;
    $[13] = onSelect;
  } else onSelect = $[13];
  let onSelect_2 = onSelect;
  let onTranscriptPromptShown = logMemoryTranscriptPromptShown;
  let onTranscriptSelect;
  if ($[14] !== credentials || $[15] !== host || $[16] !== storageV5) {
    onTranscriptSelect = async (appearanceId, selected, surveyResponse) => {
      logEvent(TENGU_MEMORY_SURVEY_EVENT, {
        event_type: fromEnum(`transcript_share_${selected}`),
        appearance_id: sanitizeMarkName(appearanceId),
        trigger: fromEnum(MEMORY_SURVEY),
        response: fromEnumOpt(surveyResponse),
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
          response: fromEnumOpt(surveyResponse),
        });
        return result.success;
      }
      return false;
    };
    $[14] = credentials;
    $[15] = host;
    $[16] = storageV5;
    $[17] = onTranscriptSelect;
  } else onTranscriptSelect = $[17];
  let onTranscriptSelect_2 = onTranscriptSelect;
  let surveyStateOptions;
  if ($[18] !== onSelect_2 || $[19] !== onTranscriptSelect_2 || $[20] !== otherSurveyActiveFlag) {
    surveyStateOptions = {
      otherSurveyActive: otherSurveyActiveFlag,
      hideThanksAfterMs: MEMORY_SURVEY_DELAY_MS,
      autoDismissAfterMs: MEMORY_SURVEY_TIMEOUT_MS,
      onOpen: onOpen_2,
      onSelect: onSelect_2,
      onAutoDismiss: onAutoDismiss_2,
      onAbandon: onAbandon_2,
      shouldShowTranscriptPrompt,
      onTranscriptPromptShown,
      onTranscriptSelect: onTranscriptSelect_2,
    };
    $[18] = onSelect_2;
    $[19] = onTranscriptSelect_2;
    $[20] = otherSurveyActiveFlag;
    $[21] = surveyStateOptions;
  } else surveyStateOptions = $[21];
  let { state, lastResponse, appearanceId, open, abandon, handleSelect, handleUndo, handleTranscriptSelect } =
    useSurveyState(surveyStateOptions);
  let lastMessageCached;
  if ($[22] !== messages) {
    lastMessageCached = getLastAssistantMessage(messages);
    $[22] = messages;
    $[23] = lastMessageCached;
  } else lastMessageCached = $[23];
  let lastMessage = lastMessageCached;
  let maybeOpenEffect;
  let maybeOpenDeps;
  if (
    $[24] !== isEnabled ||
    $[25] !== hasActivePromptFlag ||
    $[26] !== isLoading ||
    $[27] !== lastMessage ||
    $[28] !== messages ||
    $[29] !== open ||
    $[30] !== otherSurveyActiveFlag ||
    $[31] !== state
  ) {
    maybeOpenEffect = () => {
      if (messages.length === 0) {
        memoryReadSeen.current.clear();
        messagesRef.current = null;
        setCitation(null);
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
      if (state !== "closed" || isLoading || hasActivePromptFlag) {
        return;
      }
      if (otherSurveyActiveFlag) {
        return;
      }
      if (!isEnabled || !isFeedbackSurveyAllowed()) {
        return;
      }
      if (!lastMessage || memoryReadSeen.current.has(lastMessage.uuid)) {
        return;
      }
      let citedMemoryRefs = extractCitedMemoryRefs(lastMessage);
      if (citedMemoryRefs.length === 0) {
        return;
      }
      memoryReadSeen.current.add(lastMessage.uuid);
      let filtered = citedMemoryRefs.filter(isMemoryCitationEligible);
      let droppedCount = citedMemoryRefs.length - filtered.length;
      if (droppedCount > 0)
        logEvent(TENGU_MEMORY_SURVEY_EVENT, {
          event_type: lit_2("citation_ineligible"),
          dropped_citation_count: droppedCount,
          dropped_too_long_count: countWhere(citedMemoryRefs, isMemoryCitationTooLong),
          eligible_citation_count: filtered.length,
        });
      let [firstCitation] = filtered;
      if (firstCitation === undefined) {
        return;
      }
      if (!isMemorySurveyForced() && Math.random() >= getMemorySurveyProbability()) {
        return;
      }
      let pendingCitation = {
        sentence: firstCitation.sentence,
        filenames: normalizeCaseForComparison_2(firstCitation.filenames),
      };
      citationRef.current = pendingCitation;
      setCitation(pendingCitation);
      open();
    };
    maybeOpenDeps = [
      isEnabled,
      otherSurveyActiveFlag,
      state,
      isLoading,
      hasActivePromptFlag,
      lastMessage,
      messages,
      open,
    ];
    $[24] = isEnabled;
    $[25] = hasActivePromptFlag;
    $[26] = isLoading;
    $[27] = lastMessage;
    $[28] = messages;
    $[29] = open;
    $[30] = otherSurveyActiveFlag;
    $[31] = state;
    $[32] = maybeOpenEffect;
    $[33] = maybeOpenDeps;
  } else {
    maybeOpenEffect = $[32];
    maybeOpenDeps = $[33];
  }
  useEffect(maybeOpenEffect, maybeOpenDeps);
  let surveyState;
  if (
    $[34] !== abandon ||
    $[35] !== citation ||
    $[36] !== appearanceId ||
    $[37] !== handleSelect ||
    $[38] !== handleTranscriptSelect ||
    $[39] !== handleUndo ||
    $[40] !== lastResponse ||
    $[41] !== state
  ) {
    surveyState = {
      state,
      lastResponse,
      appearanceId,
      citation,
      abandon,
      handleSelect,
      handleUndo,
      handleTranscriptSelect,
    };
    $[34] = abandon;
    $[35] = citation;
    $[36] = appearanceId;
    $[37] = handleSelect;
    $[38] = handleTranscriptSelect;
    $[39] = handleUndo;
    $[40] = lastResponse;
    $[41] = state;
    $[42] = surveyState;
  } else surveyState = $[42];
  return surveyState;
}
export {
  TENGU_DUNWICH_BELL,
  useMemorySurvey,
  MEMORY_SURVEY_MAX_LINES,
  MEMORY_SURVEY_HEADER,
  MEMORY_SURVEY_QUESTION,
};
