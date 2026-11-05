/**
 * memdir/memoryIndex.ts
 *
 * 2.1.316 新增：记忆索引的补建与维护
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10), chunk-kbw92gv8.js (12)
 * attribution: placement 21, affinity 1
 */
import { sep, basename, join, resolve } from "path";
import { readdir, open, unlink, lstat, realpath } from "fs/promises";
import { randomBytes } from "crypto";
import { formatFileSize } from "../utils/format.js";
import { MEMORY_SIZE_SOFT_RATIO, MEMORY_SIZE_WARN_RATIO } from "../utils/claudemd.js";
import {
  MAX_ENTRYPOINT_LINES,
  MAX_ENTRYPOINT_BYTES,
  singleLineMemoryText,
  sanitizeMemoryText,
  MEMORY_INDEX_FILENAME,
} from "./memdir.js";
import { HostScoped } from "../utils/hostScoped.js";
import { truncateAtWord } from "../utils/stringUtils.js";
import {
  isExcludedMemoryKey,
  EXCLUDED_TOP_LEVEL_DIRS,
  normalizeKeySegment,
} from "../services/memoryStore/memoryKeys.js";
import { getErrnoCode, errorMessage, isENOENT } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import {
  verifyLinkTarget,
  isErrnoCode as isErrnoCode_2,
  errorKindLabel,
} from "../utils/fsSafety/hardenedRead.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";
import { assertPathSafeAsync, writeFileAtomic } from "../utils/atomicPublishWrite.js";
import { scanMemoryHeaders } from "./memoryScan.js";
import { createAbortController } from "../utils/abortController.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { memoizeWithLRU, retainCacheKey, memoizeWithTTLAsync } from "../utils/memoize.js";
import { countWhere } from "../utils/collections.js";
import { normalizeCaseForComparison_2 } from "../utils/permissions/filesystem.js";
import {
  DEFAULT_SYNC_OPTIONS,
  scanStoreFiles,
  classifyReadError,
  TRANSIENT_READ_FAILURE_2,
  isExcludedPath,
  isMissingNonFileOrOversized,
  readFileGuarded,
  isNotRegularFileError,
  NOT_A_REGULAR_FILE,
  existsAsRegularFile,
  hashContent,
  readAndVerifyStoreEntry,
} from "../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { jsonStringify, jsonParse } from "../utils/slowOperations.js";
import { readOnlyNoFollowFlags } from "../utils/platformTargets.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1311084-1311256 placement
function pickMemorySizeBasis({ rawSizeBytes, surfaceCap, splicedSizeBytes, spliceCap, spliceActive }) {
  return surfaceCap !== undefined &&
    (!spliceActive || rawSizeBytes / surfaceCap >= splicedSizeBytes / spliceCap)
    ? {
        sizeBytes: rawSizeBytes,
        byteCap: surfaceCap,
      }
    : {
        sizeBytes: splicedSizeBytes,
        byteCap: spliceCap,
      };
}
//@ chunk-5xgkngpb.js:1311256-1311746 placement
/**
 * 计算记忆文件（字节、行数）中离上限最近的维度，占比低于阈值返回 null，否则给出超限与否及大小/上限/目标的可读描述。
 */
function memoryLimitPressure(indexSize) {
  let dimensions = [
    {
      frac: indexSize.sizeBytes / indexSize.byteCap,
      dimension: "bytes",
      over: indexSize.sizeBytes > indexSize.byteCap,
      sizeDesc: formatFileSize(indexSize.sizeBytes),
      capDesc: formatFileSize(indexSize.byteCap),
      targetDesc: formatFileSize(Math.floor(indexSize.byteCap * MEMORY_SIZE_SOFT_RATIO)),
    },
  ];
  if (indexSize.lineCap !== undefined && indexSize.lineCount !== undefined)
    dimensions.push({
      frac: indexSize.lineCount / indexSize.lineCap,
      dimension: "lines",
      over: indexSize.lineCount > indexSize.lineCap,
      sizeDesc: `${indexSize.lineCount} lines`,
      capDesc: `${indexSize.lineCap}-line`,
      targetDesc: `${Math.floor(indexSize.lineCap * MEMORY_SIZE_SOFT_RATIO)} lines`,
    });
  let { frac, ...worstDimension } = dimensions.reduce((acc, dimension) =>
    dimension.frac > acc.frac ? dimension : acc,
  );
  return frac < MEMORY_SIZE_WARN_RATIO ? null : worstDimension;
}
//@ chunk-5xgkngpb.js:1311746-1312354 placement
/**
 * 记忆索引超过读取上限时的提示：超出部分每次加载都会被丢弃。
 */
function checkMemoryIndexReadLimit(readLimitInfo) {
  let pressure = memoryLimitPressure(readLimitInfo);
  if (pressure === null) return null;
  return {
    text: `${pressure.over ? `Error: this write left the ${readLimitInfo.label} at ${readLimitInfo.displayPath} at ${pressure.sizeDesc}, over its ${pressure.capDesc} read limit. The write succeeded, but everything past the limit ` + "is silently dropped each time the index is loaded \u2014 entries at the end are already invisible " + "to readers. Rewrite it" : `The ${readLimitInfo.label} at ${readLimitInfo.displayPath} is ${pressure.sizeDesc}, approaching the ${pressure.capDesc} read limit. Compact it`} to under ${pressure.targetDesc} now: keep one line per entry, move detail into topic files, and merge or drop stale entries.`,
    overCap: pressure.over,
  };
}
//@ chunk-5xgkngpb.js:1312354-1312503 placement
var MAX_INDEX_LINE_CHARS; // deferred: uses MEMORY_INDEX_FILENAME (./memdir.js) of its import cycle while loading; runs once the cycle is complete
var BACKFILL_MAX_LINES;
var BACKFILL_MAX_BYTES;
var UNSAFE_INDEX_NAME_REGEX;
var UNWRITABLE_ERRNOS;
var backfillState;
deferInit("chunk-5xgkngpb.js:1312354", () => {
  MAX_INDEX_LINE_CHARS = 150;
  BACKFILL_MAX_LINES = Math.floor(MAX_ENTRYPOINT_LINES * MEMORY_SIZE_SOFT_RATIO);
  BACKFILL_MAX_BYTES = Math.floor(MAX_ENTRYPOINT_BYTES * MEMORY_SIZE_SOFT_RATIO);
  UNSAFE_INDEX_NAME_REGEX = /[[\]()\n\r\u2028\u2029]/;
  UNWRITABLE_ERRNOS = new Set(["EROFS", "EACCES", "EPERM"]);
  backfillState = new HostScoped(() => new Map());
});
//@ chunk-5xgkngpb.js:1312503-1312760 placement
function memoryIndexLine(entry) {
  let text = entry.filename.split(sep).join("/");
  if (UNSAFE_INDEX_NAME_REGEX.test(text) || singleLineMemoryText(text) !== text) return null;
  let linkLine = `- [${basename(text, ".md")}](${text})`;
  let trimmed = sanitizeMemoryText(entry.description ?? "")
    .replace(/\s+/g, " ")
    .trim();
  let descriptionBudget = MAX_INDEX_LINE_CHARS - linkLine.length - 3;
  if (trimmed === "" || descriptionBudget <= 1) return linkLine;
  return `${linkLine} \u2014 ${sanitizeMemoryText(truncateAtWord(trimmed, descriptionBudget))}`;
}
//@ chunk-5xgkngpb.js:1312760-1312944 placement
function buildMemoryIndexContent(entries) {
  let content = "";
  let lineCount = 0;
  let limitReached = false;
  let skippedCount = 0;
  for (let entry of entries) {
    let line = memoryIndexLine(entry);
    if (line === null) {
      skippedCount++;
      continue;
    }
    limitReached ||=
      lineCount + 1 > BACKFILL_MAX_LINES || content.length + line.length + 1 > BACKFILL_MAX_BYTES;
    if (!limitReached) {
      content += `${line}
`;
      lineCount++;
    }
  }
  return {
    content,
    skippedCount,
  };
}
//@ chunk-5xgkngpb.js:1312944-1313264 placement
/**
 * 判断记忆目录是否需要补建索引：已有索引、有候选 .md 文件或子目录，或没有可索引内容。
 */
async function memoryIndexBackfillState(memoryDir) {
  let dirents = await readdir(memoryDir, {
    withFileTypes: true,
  });
  if (dirents.some((dirent) => dirent.name === MEMORY_INDEX_FILENAME)) return "exists";
  return dirents.some((dirent) => {
    if (isExcludedMemoryKey(dirent.name)) return false;
    if (dirent.isFile()) return dirent.name.endsWith(".md");
    if (
      dirent.isSymbolicLink() ||
      dirent.isFIFO() ||
      dirent.isSocket() ||
      dirent.isBlockDevice() ||
      dirent.isCharacterDevice()
    )
      return false;
    return true;
  })
    ? "candidates"
    : "none";
}
//@ chunk-5xgkngpb.js:1313264-1314263 placement
/**
 * 写入记忆索引补建结果：先写临时文件再改名，不可写时就地写。
 */
async function writeMemoryIndexBackfill(memoryDir, content) {
  let tempPath = join(
    memoryDir,
    `.${MEMORY_INDEX_FILENAME}.backfill-${process.pid}-${randomBytes(4).toString("hex")}.tmp`,
  );
  let indexPath = join(memoryDir, MEMORY_INDEX_FILENAME);
  let tempFile;
  try {
    tempFile = await open(tempPath, "wx");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== undefined && UNWRITABLE_ERRNOS.has(errnoCode)) return "unwritable";
    logForDebugging(`memory index backfill: temp create failed, creating in place: ${errorMessage(error)}`);
    return writeMemoryIndexExclusive(memoryDir, content);
  }
  try {
    let tempStat;
    try {
      await tempFile.writeFile(content, "utf8");
      tempStat = await tempFile
        .stat({
          bigint: true,
        })
        .catch(() => null);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== undefined && UNWRITABLE_ERRNOS.has(errnoCode)) return "unwritable";
      await tempFile.close().catch(() => {});
      await unlink(tempPath).catch(() => {});
      logForDebugging(`memory index backfill: temp write failed, creating in place: ${errorMessage(error)}`);
      return await writeMemoryIndexExclusive(memoryDir, content);
    } finally {
      await tempFile.close().catch(() => {});
    }
    if (tempStat === null) return await writeMemoryIndexExclusive(memoryDir, content);
    let linkResult = await verifyLinkTarget(
      tempPath,
      {
        device: tempStat.dev,
        inode: tempStat.ino,
      },
      indexPath,
    );
    if (linkResult.ok) return "written";
    if (linkResult.error.kind === "fs" && isErrnoCode_2(linkResult.error.error, "EEXIST")) return "exists";
    logForDebugging(
      `memory index backfill: link did not publish (${linkResult.error.kind === "classified" ? formatStorageError(linkResult.error.error) : errorKindLabel(linkResult.error)}), creating in place`,
    );
    return await writeMemoryIndexExclusive(memoryDir, content);
  } finally {
    await unlink(tempPath).catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:1314263-1314709 placement
/**
 * 用 wx 独占方式创建记忆索引文件并写入；已存在返回 exists，只读/权限错误返回 unwritable；写入失败时删掉自己刚创建的文件。
 */
async function writeMemoryIndexExclusive(memoryDir, content) {
  let indexPath = join(memoryDir, MEMORY_INDEX_FILENAME);
  let indexFile;
  try {
    await assertPathSafeAsync(indexPath);
    indexFile = await open(indexPath, "wx");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "EEXIST") return "exists";
    if (errnoCode !== undefined && UNWRITABLE_ERRNOS.has(errnoCode)) return "unwritable";
    throw error;
  }
  let fileStat = await indexFile.stat().catch(() => null);
  try {
    await indexFile.writeFile(content, "utf8");
    await indexFile.close();
    return "written";
  } catch (error) {
    await indexFile.close().catch(() => {});
    let currentStat = await lstat(indexPath).catch(() => null);
    if (
      fileStat !== null &&
      currentStat !== null &&
      fileStat.ino === currentStat.ino &&
      fileStat.dev === currentStat.dev
    )
      await unlink(indexPath).catch(() => {});
    throw error;
  }
}
//@ chunk-5xgkngpb.js:1314709-1315871 placement
/**
 * 补建记忆索引：扫描记忆目录中索引缺少的条目并写回，记录遥测。
 */
async function backfillMemoryIndex(memoryDir, onNothing, onExists) {
  try {
    let state;
    try {
      state = await memoryIndexBackfillState(memoryDir);
    } catch (error) {
      onNothing();
      logForDebugging(`memory index backfill: ${errorMessage(error)}`);
      return false;
    }
    switch (state) {
      case "exists":
        onExists();
        return true;
      case "none":
        onNothing();
        return false;
      case "candidates":
        break;
    }
    let headers;
    try {
      headers = await scanMemoryHeaders(memoryDir, createAbortController().signal, {
        regularFilesOnly: true,
      });
    } catch (error) {
      logForDebugging(`memory index backfill: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("memory_index_backfill", "scan_failed");
      return false;
    }
    headers = headers.filter(
      (header) =>
        !header.filename
          .split(sep)
          .some(
            (segment) =>
              segment.startsWith(".") || EXCLUDED_TOP_LEVEL_DIRS.includes(normalizeKeySegment(segment)),
          ),
    );
    let { content, skippedCount } = buildMemoryIndexContent(headers);
    if (content === "") {
      if (headers.length > 0) {
        logForDebugging(
          `memory index backfill: nothing linkable among ${headers.length} topic files (${skippedCount} skipped)`,
        );
        logFeatureSad("memory_index_backfill", "nothing_linkable");
      }
      return false;
    }
    let writeResult;
    try {
      writeResult = await writeMemoryIndexBackfill(memoryDir, content);
    } catch (error) {
      logForDebugging(`memory index backfill: ${errorMessage(error)}`, {
        level: "warn",
      });
      logFeatureSad("memory_index_backfill", "write_failed");
      return false;
    }
    switch (writeResult) {
      case "written":
        logEvent("tengu_memdir_index_backfilled", {
          file_count: headers.length,
          skipped_count: skippedCount,
        });
        logFeatureOk("memory_index_backfill");
        return true;
      case "exists":
        return true;
      case "unwritable":
        logForDebugging("memory index backfill: memory directory is not writable");
        return false;
    }
  } catch (error) {
    logForDebugging(`memory index backfill: ${errorMessage(error)}`, {
      level: "warn",
    });
    logFeatureSad("memory_index_backfill", "unexpected");
    return false;
  }
}
//@ chunk-kbw92gv8.js:1274-3780 placement
/**
 * 波特词干化：辅音/元音判定与各个步骤。注意 trimTrailingDoubleL（原 stemWord）只是第 5 步后的双辅音 l 去重，porterStemWord（原 measureWord）才是主流程，memoizedStemWord 是它的 5 万条 LRU 包装。
 */
var porterStemmer; // deferred: uses memoizeWithLRU (../utils/memoize.js) of its import cycle while loading; runs once the cycle is complete
var isConsonantAt;
var countConsonantSequences;
var hasVowel;
var endsWithDoubleConsonant;
var endsWithCVC;
var replaceSuffixList;
var porterStep1a;
var porterStep1b;
var porterStep1c;
var porterStep2;
var porterStep3;
var porterStep4;
var porterStep5;
var porterStem;
var trimTrailingDoubleL;
var porterStemWord;
var memoizedStemWord;
var stemAlias;
var stemWithOptions;
deferInit("chunk-kbw92gv8.js:1274", () => {
  porterStemmer = (char) => char === "a" || char === "e" || char === "i" || char === "o" || char === "u";
  isConsonantAt = (word, index) => {
    let char = word[index];
    if (porterStemmer(char)) return true;
    if (char !== "y") return false;
    let scanIndex = index;
    while (scanIndex > 0 && word[scanIndex - 1] === "y") scanIndex--;
    let precedingIsVowel = scanIndex === 0 ? true : porterStemmer(word[scanIndex - 1]);
    return (index - scanIndex) % 2 === 0 ? !precedingIsVowel : precedingIsVowel;
  };
  countConsonantSequences = (word) => {
    let count = 0;
    let prevIsVowel = false;
    for (let i = 0; i < word.length; i++) {
      let char = word[i];
      let isVowel = porterStemmer(char) || (char === "y" && i > 0 && !prevIsVowel);
      if (!isVowel && prevIsVowel) count++;
      prevIsVowel = isVowel;
    }
    return count;
  };
  hasVowel = (word) => {
    let foundVowel = false;
    for (let i = 0; i < word.length; i++) {
      let char = word[i];
      foundVowel = porterStemmer(char) || (char === "y" && i > 0 && !foundVowel);
      if (foundVowel) return true;
    }
    return false;
  };
  endsWithDoubleConsonant = (word) =>
    word.length >= 2 && word.at(-1) === word.at(-2) && !isConsonantAt(word, word.length - 1);
  endsWithCVC = (word) => {
    if (word.length < 3) return false;
    let last = word.at(-1);
    return (
      !isConsonantAt(word, word.length - 3) &&
      isConsonantAt(word, word.length - 2) &&
      !isConsonantAt(word, word.length - 1) &&
      last !== "w" &&
      last !== "x" &&
      last !== "y"
    );
  };
  replaceSuffixList = (word, rules) => {
    for (let [suffix, replacement, minMeasure] of rules) {
      if (!word.endsWith(suffix)) continue;
      let sliced = word.slice(0, word.length - suffix.length);
      return countConsonantSequences(sliced) > minMeasure ? sliced + replacement : word;
    }
    return word;
  };
  porterStep1a = (word) => {
    if (word.endsWith("sses")) return word.slice(0, -2);
    if (word.endsWith("ies")) return word.slice(0, -2);
    if (word.endsWith("ss")) return word;
    if (word.endsWith("s")) return word.slice(0, -1);
    return word;
  };
  porterStep1b = (word) => {
    if (word.endsWith("eed")) {
      let sliced = word.slice(0, -3);
      return countConsonantSequences(sliced) > 0 ? word.slice(0, -1) : word;
    }
    let stem = word.endsWith("ed") ? word.slice(0, -2) : word.endsWith("ing") ? word.slice(0, -3) : undefined;
    if (stem === undefined || !hasVowel(stem)) return word;
    if (stem.endsWith("at") || stem.endsWith("bl") || stem.endsWith("iz")) return stem + "e";
    let last = stem.at(-1);
    if (endsWithDoubleConsonant(stem) && last !== "l" && last !== "s" && last !== "z")
      return stem.slice(0, -1);
    if (countConsonantSequences(stem) === 1 && endsWithCVC(stem)) return stem + "e";
    return stem;
  };
  porterStep1c = (word) =>
    word.endsWith("y") && hasVowel(word.slice(0, -1)) ? word.slice(0, -1) + "i" : word;
  porterStep2 = [
    ["ational", "ate", 0],
    ["tional", "tion", 0],
    ["enci", "ence", 0],
    ["anci", "ance", 0],
    ["izer", "ize", 0],
    ["abli", "able", 0],
    ["bli", "ble", 0],
    ["alli", "al", 0],
    ["entli", "ent", 0],
    ["eli", "e", 0],
    ["ousli", "ous", 0],
    ["ization", "ize", 0],
    ["ation", "ate", 0],
    ["ator", "ate", 0],
    ["alism", "al", 0],
    ["iveness", "ive", 0],
    ["fulness", "ful", 0],
    ["ousness", "ous", 0],
    ["aliti", "al", 0],
    ["iviti", "ive", 0],
    ["biliti", "ble", 0],
    ["logi", "log", 0],
  ];
  porterStep3 = [
    ["icate", "ic", 0],
    ["ative", "", 0],
    ["alize", "al", 0],
    ["iciti", "ic", 0],
    ["ical", "ic", 0],
    ["ful", "", 0],
    ["ness", "", 0],
  ];
  porterStep4 = [
    "al",
    "ance",
    "ence",
    "er",
    "ic",
    "able",
    "ible",
    "ant",
    "ement",
    "ment",
    "ent",
    "ion",
    "ou",
    "ism",
    "ate",
    "iti",
    "ous",
    "ive",
    "ize",
  ];
  porterStep5 = (word) => {
    for (let suffix of porterStep4) {
      if (!word.endsWith(suffix)) continue;
      let sliced = word.slice(0, word.length - suffix.length);
      let isValidRemoval = suffix !== "ion" || sliced.endsWith("s") || sliced.endsWith("t");
      return countConsonantSequences(sliced) > 1 && isValidRemoval ? sliced : word;
    }
    return word;
  };
  porterStem = (word) => {
    if (!word.endsWith("e")) return word;
    let word_2 = word.slice(0, -1);
    let measure = countConsonantSequences(word_2);
    if (measure > 1) return word_2;
    if (measure === 1 && !endsWithCVC(word_2)) return word_2;
    return word;
  };
  trimTrailingDoubleL = (word) =>
    countConsonantSequences(word) > 1 && endsWithDoubleConsonant(word) && word.endsWith("l")
      ? word.slice(0, -1)
      : word;
  porterStemWord = (word) => {
    if (word.length <= 2) return word;
    let stemmed = porterStep1a(word);
    stemmed = porterStep1b(stemmed);
    stemmed = porterStep1c(stemmed);
    stemmed = replaceSuffixList(stemmed, porterStep2);
    stemmed = replaceSuffixList(stemmed, porterStep3);
    stemmed = porterStep5(stemmed);
    stemmed = porterStem(stemmed);
    stemmed = trimTrailingDoubleL(stemmed);
    return stemmed;
  };
  memoizedStemWord = memoizeWithLRU(porterStemWord, (word) => word, 50000);
  stemAlias = retainCacheKey(memoizedStemWord.cache);
  stemWithOptions = (text) => (text.length <= 2 ? text : memoizedStemWord(text));
});
//@ chunk-kbw92gv8.js:3780-7502 placement
/**
 * 记忆索引的分词流程：按 Unicode 字母/数字切分、拆驼峰与数字、技术词改写（c++→cpp 等）、CJK 边界、去所有格与停用词，再按选项做词干化与复合词拆分。
 */
var tokenizeForIndex; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var isUpperAscii;
var isLowerAscii;
var isDigitAscii;
var isAlnumAscii;
var splitCamelAndDigits;
var normalizeForIndex;
var isLowerWord;
var tokenizeWithCompounds;
var CJK_BOUNDARY_LEFT;
var CJK_BOUNDARY_RIGHT;
var TECH_TERM_REWRITES;
var regExp;
var CJK_CHAR_CLASS;
var CJK_CHAR_TEST;
var trimCjkEdges;
var replaceTechTerms;
var HALFWIDTH_KATAKANA_RE;
var DIGITS_ONLY_RE;
var stripPossessive;
var SINGLE_LETTER_RE;
var dropStopword;
var tokenizeWord;
var stemTokens;
var tokenizeForSearch;
var tokenizeStrict;
var tokenizeDualStem;
var tokenizeNoCompounds;
deferInit("chunk-kbw92gv8.js:3780", () => {
  tokenizeForIndex = /[\p{L}\p{M}\p{N}]+/gu;
  isUpperAscii = (char) => char >= "A" && char <= "Z";
  isLowerAscii = (char) => char >= "a" && char <= "z";
  isDigitAscii = (char) => char >= "0" && char <= "9";
  isAlnumAscii = (char) => isUpperAscii(char) || isLowerAscii(char);
  splitCamelAndDigits = (text) => {
    let parts = [];
    let partStart = 0;
    for (let j = 1; j < text.length; j++) {
      let prevChar = text[j - 1] ?? "";
      let char = text[j] ?? "";
      let nextChar = text[j + 1] ?? "";
      let isTrailingS = nextChar === "s" && j + 2 === text.length;
      if (
        ((isLowerAscii(prevChar) || isDigitAscii(prevChar)) && isUpperAscii(char)) ||
        (isUpperAscii(prevChar) && isUpperAscii(char) && isLowerAscii(nextChar) && !isTrailingS) ||
        (isAlnumAscii(prevChar) && isDigitAscii(char)) ||
        (isDigitAscii(prevChar) && isAlnumAscii(char))
      ) {
        parts.push(text.slice(partStart, j));
        partStart = j;
      }
    }
    parts.push(text.slice(partStart));
    return parts;
  };
  normalizeForIndex = (text) =>
    text
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  isLowerWord = (text) => /^[a-z]+$/.test(text);
  tokenizeWithCompounds = (text) => {
    let parts = splitCamelAndDigits(text);
    return parts.length > 1
      ? [
          {
            text,
            compound: true,
          },
          ...parts.map((text) => ({
            text,
            compound: false,
          })),
        ]
      : [
          {
            text,
            compound: false,
          },
        ];
  };
  CJK_BOUNDARY_LEFT = String.raw`(^|[^\p{L}\p{N}]|[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])`;
  CJK_BOUNDARY_RIGHT = String.raw`(?!(?![\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])[\p{L}\p{N}])`;
  TECH_TERM_REWRITES = [
    [new RegExp(CJK_BOUNDARY_LEFT + String.raw`[cC]\+\+` + CJK_BOUNDARY_RIGHT, "gu"), " cpp "],
    [new RegExp(CJK_BOUNDARY_LEFT + String.raw`[cC]#` + CJK_BOUNDARY_RIGHT, "gu"), " csharp "],
    [new RegExp(CJK_BOUNDARY_LEFT + String.raw`[fF]#` + CJK_BOUNDARY_RIGHT, "gu"), " fsharp "],
    [new RegExp(CJK_BOUNDARY_LEFT + String.raw`\.[nN][eE][tT]` + CJK_BOUNDARY_RIGHT, "gu"), " dotnet "],
  ];
  regExp = new RegExp(CJK_BOUNDARY_LEFT + String.raw`([vV]?\d+(?:\.\d+)+)`, "gu");
  CJK_CHAR_CLASS = /^(?![\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF])[\p{L}\p{N}]/u;
  CJK_CHAR_TEST = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]/;
  trimCjkEdges =
    /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+|[^\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF]+/gu;
  replaceTechTerms = (text) => {
    let chars = [...text];
    if (chars.length <= 2) return [text];
    let variants = [text];
    for (let i = 0; i < chars.length - 1; i++) variants.push(chars[i] + chars[i + 1]);
    return variants;
  };
  HALFWIDTH_KATAKANA_RE = /[\uFF66-\uFF9F]/;
  DIGITS_ONLY_RE = /^\p{N}+$/u;
  stripPossessive = (chars) => {
    let groups = [];
    let prevWasDigits = false;
    let prevWasCjk = false;
    for (let char of chars) {
      let last = groups.at(-1);
      if (last !== undefined && DIGITS_ONLY_RE.test(char) && prevWasCjk) {
        last.push(char);
        prevWasDigits = true;
        continue;
      }
      if (last !== undefined && prevWasDigits && CJK_CHAR_TEST.test(char)) {
        last.push(char);
        prevWasDigits = false;
        prevWasCjk = true;
        continue;
      }
      groups.push([char]);
      prevWasDigits = DIGITS_ONLY_RE.test(char);
      prevWasCjk = CJK_CHAR_TEST.test(char);
    }
    return groups.map((group) => (group.length === 1 ? group[0] : group.join("")));
  };
  SINGLE_LETTER_RE = /^\p{L}$/u;
  dropStopword = (chunks) => {
    let groups = [];
    for (let chunk of chunks) {
      let last = groups.at(-1);
      let isLoneLetter = SINGLE_LETTER_RE.test(chunk) && !CJK_CHAR_TEST.test(chunk);
      if (last !== undefined) {
        let last_2 = last.at(-1);
        if (isLoneLetter && CJK_CHAR_TEST.test(last_2)) {
          last.push(chunk);
          continue;
        }
        if (CJK_CHAR_TEST.test(chunk) && SINGLE_LETTER_RE.test(last_2) && !CJK_CHAR_TEST.test(last_2)) {
          last.push(chunk);
          continue;
        }
      }
      groups.push([chunk]);
    }
    return groups.map((group) => (group.length === 1 ? group[0] : group.join("")));
  };
  tokenizeWord = (chars) => {
    let words = [];
    for (let j = 0; j < chars.length; j++) {
      let char = chars[j];
      if (!CJK_CHAR_TEST.test(char) || [...char].length !== 1) continue;
      let prevChar = j > 0 ? chars[j - 1] : undefined;
      let nextChar = j + 1 < chars.length ? chars[j + 1] : undefined;
      let word =
        prevChar !== undefined && !CJK_CHAR_TEST.test(prevChar) && [...normalizeForIndex(prevChar)].length > 1
          ? prevChar + char
          : nextChar !== undefined &&
              !CJK_CHAR_TEST.test(nextChar) &&
              [...normalizeForIndex(nextChar)].length > 1
            ? char + nextChar
            : undefined;
      if (word !== undefined)
        words.push({
          text: word,
          compound: true,
        });
    }
    return words;
  };
  stemTokens = (text, options) => {
    let replaced = text.replace(/\[\[([^[\]]*)\]\]/g, " $1 ");
    for (let [pattern, replacement] of TECH_TERM_REWRITES)
      replaced = replaced.replace(pattern, (match, charGroup) => charGroup + replacement);
    replaced = replaced.replace(regExp, (match, prefix, version, versionOffset, input) => {
      let codePoint = input.codePointAt(versionOffset + match.length);
      if (codePoint !== undefined && CJK_CHAR_CLASS.test(String.fromCodePoint(codePoint))) return match;
      return `${prefix}${version} ${version.replaceAll(".", "")}`;
    });
    let tokens = replaced.match(tokenizeForIndex) ?? [];
    let flattened = tokens
      .flatMap((token) => {
        let normalized = HALFWIDTH_KATAKANA_RE.test(token) ? token.normalize("NFKC") : token;
        if (CJK_CHAR_TEST.test(normalized)) {
          let cjkChunks = dropStopword(stripPossessive(normalized.match(trimCjkEdges) ?? []));
          let cjkWords = options.compounds ? tokenizeWord(cjkChunks) : [];
          let flattened = cjkChunks.flatMap((chunk) => {
            if (!CJK_CHAR_TEST.test(chunk)) {
              let chunkTokens = tokenizeWithCompounds(chunk);
              return options.compounds ? chunkTokens : chunkTokens.filter((token) => !token.compound);
            }
            let variants = replaceTechTerms(chunk);
            let isCompound = variants.length > 1;
            let mapped = (chunk.match(/\p{N}{3,}/gu) ?? []).map((text) => ({
              text,
              compound: true,
            }));
            return [
              ...variants.map((text, variantIndex) => ({
                text,
                compound: isCompound && variantIndex === 0,
              })),
              ...mapped,
            ].filter((token) => !token.compound || options.compounds);
          });
          flattened.push(...cjkWords);
          return [
            ...flattened.filter((token) => token.compound),
            ...flattened.filter((token) => !token.compound),
          ];
        }
        let chunkTokens = tokenizeWithCompounds(normalized);
        return options.compounds ? chunkTokens : chunkTokens.filter((token) => !token.compound);
      })
      .map(({ text, compound }) => ({
        text: normalizeForIndex(text),
        compound,
      }))
      .filter(({ text }) => text.length > 1)
      .flatMap(({ text, compound }) => {
        if (compound) {
          let stemmed = options.dualStem && isLowerWord(text) ? stemWithOptions(text) : text;
          return stemmed !== text ? [text, stemmed] : [text];
        }
        if (!isLowerWord(text)) return [text];
        let stemmed = stemWithOptions(text);
        return options.dualStem && stemmed !== text ? [stemmed, text] : [stemmed];
      });
    if (flattened.length > 0 || tokens.length === 0 || options.singleCharFallback === false) return flattened;
    return tokens.map(normalizeForIndex);
  };
  tokenizeForSearch = (text) =>
    stemTokens(text, {
      dualStem: false,
      compounds: true,
    });
  tokenizeStrict = (text) =>
    stemTokens(text, {
      dualStem: false,
      compounds: true,
      singleCharFallback: false,
    });
  tokenizeDualStem = (text) =>
    stemTokens(text, {
      dualStem: true,
      compounds: true,
    });
  tokenizeNoCompounds = (text) =>
    stemTokens(text, {
      dualStem: false,
      compounds: false,
    });
});
//@ chunk-kbw92gv8.js:7502-8685 placement
/**
 * 把记忆文件拆成索引字段：文件名、frontmatter、各级标题、正文（含代码块跳过），并给出各字段文本。
 */
var extractMemoryFields = ["filename", "frontmatter", "headings", "body"];
var FRONTMATTER_RE = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;
var YAML_KEY_LINE_RE = /^[\w-]+:/m;
var MARKDOWN_HEADING_RE = /^#{1,6}\s+(.*)$/;
var FENCE_OPEN_RE = /^(`{3,}|~{3,})(.*)$/;
var basenameWithoutExt = (filePath) => {
  let sliced = filePath.slice(filePath.lastIndexOf("/") + 1);
  let index = sliced.lastIndexOf(".");
  return index > 0 ? sliced.slice(0, index) : sliced;
};
var parseMemoryDocument = (lines) => {
  let doc = {
    headings: [],
    body: [[]],
  };
  let fenceMarker;
  for (let line of lines) {
    let match = line.match(FENCE_OPEN_RE);
    if (match !== null) {
      let fence = match[1];
      if (fenceMarker === undefined) {
        fenceMarker = fence;
        doc.body.at(-1).push(line);
        continue;
      }
      if (fence[0] === fenceMarker[0] && fence.length >= fenceMarker.length && match[2].trim() === "") {
        fenceMarker = undefined;
        doc.body.at(-1).push(line);
        continue;
      }
    }
    let heading = fenceMarker !== undefined ? undefined : line.match(MARKDOWN_HEADING_RE)?.[1];
    if (heading === undefined) doc.body.at(-1).push(line);
    else {
      doc.headings.push(heading);
      doc.body.push([]);
    }
  }
  return doc;
};
var stripFrontmatter = (headings) => {
  let filtered = headings.map((heading) => tokenizeStrict(heading)).filter((tokens) => tokens.length > 0);
  if (filtered.length > 0) return filtered.flatMap((tokens) => [...tokens, ""]);
  return tokenizeForSearch(
    headings.join(`
`),
  );
};
var splitHeadingSections = (body) => {
  let filtered = body
    .map((sectionLines) =>
      tokenizeStrict(
        sectionLines.join(`
`),
      ),
    )
    .filter((tokens) => tokens.length > 0);
  if (filtered.length > 0)
    return filtered.flatMap((tokens, sectionIndex) => (sectionIndex === 0 ? tokens : ["", ...tokens]));
  return tokenizeForSearch(
    body.map((sectionLines) =>
      sectionLines.join(`
`),
    ).join(`
`),
  );
};
var extractMemoryFieldsFromFile = (filePath, text) => {
  let replaced = text.replace(/^\uFEFF/, "");
  let match = replaced.match(FRONTMATTER_RE);
  let hasYamlKeys = match !== null && YAML_KEY_LINE_RE.test(match[1] ?? "");
  let frontmatterText = hasYamlKeys ? (match[1] ?? "") : "";
  let bodyText = hasYamlKeys ? replaced.slice(match[0].length) : replaced;
  let { headings, body } = parseMemoryDocument(bodyText.split(/\r?\n/));
  return {
    path: filePath,
    fields: {
      filename: tokenizeForSearch(basenameWithoutExt(filePath)),
      frontmatter: tokenizeForSearch(frontmatterText),
      headings: stripFrontmatter(headings),
      body: splitHeadingSections(body),
    },
  };
};
//@ chunk-kbw92gv8.js:8685-12192 placement
/**
 * 倒排索引的增删查：每词一篇 posting（docIds/offsets/positions 三个 Uint32Array），字段编号表与 posting 二分查找。SMALL_DELETION_THRESHOLD=16 决定删文档时逐个标未验证还是重建词表。
 */
var buildInvertedIndex; // deferred: uses extractMemoryFields of its import cycle while loading; runs once the cycle is complete
var FIELD_INDEX;
var MAX_DOC_ID;
var emptyFieldCounters;
var createEmptyIndex;
var growUint32Array;
var indexDocumentFields;
var addDocumentToIndex;
var removeDocumentFromIndex;
var rebuildFieldsForDoc;
var docIdsOfTerm;
var appendDocId;
var removeDocIdFromTerm;
var termDocCount;
var addPostingPosition;
var removePosting;
var upsertDocument;
var markUnverified;
var isUnverified;
var hasDocumentPath;
var documentIdForPath;
var SMALL_DELETION_THRESHOLD;
var dropDocuments;
var emptyIndexSnapshot;
deferInit("chunk-kbw92gv8.js:8685", () => {
  buildInvertedIndex = extractMemoryFields.length;
  FIELD_INDEX = Object.fromEntries(
    extractMemoryFields.map((extractMemoryField, fieldIndex) => [extractMemoryField, fieldIndex]),
  );
  MAX_DOC_ID = 4294967295;
  emptyFieldCounters = () =>
    Object.fromEntries(extractMemoryFields.map((extractMemoryField) => [extractMemoryField, 0]));
  createEmptyIndex = () => ({
    terms: new Map(),
    docs: new Map(),
    pathToId: new Map(),
    unverified: new Set(),
    fieldLengthTotals: emptyFieldCounters(),
    fieldDocCounts: emptyFieldCounters(),
    nextDocId: 0,
  });
  growUint32Array = (array, minLength) => {
    if (array.length >= minLength) return array;
    let uint32Array = new Uint32Array(Math.max(minLength, array.length * 2));
    uint32Array.set(array);
    return uint32Array;
  };
  indexDocumentFields = (doc) => {
    let termFieldPositions = new Map();
    extractMemoryFields.forEach((extractMemoryField, fieldIndex) => {
      doc.fields[extractMemoryField].forEach((token, position) => {
        if (token === "") return;
        let fieldPositions = termFieldPositions.get(token) ?? extractMemoryFields.map(() => []);
        fieldPositions[fieldIndex].push(position);
        termFieldPositions.set(token, fieldPositions);
      });
    });
    return termFieldPositions;
  };
  addDocumentToIndex = (index, term, docId, fieldPositions) => {
    let posting = index.terms.get(term) ?? {
      docIds: new Uint32Array(2),
      offsets: new Uint32Array(2 * buildInvertedIndex + 1),
      positions: new Uint32Array(8),
      size: 0,
    };
    let size = posting.size;
    let positionOffset = posting.offsets[buildInvertedIndex * size];
    let reduced = fieldPositions.reduce((acc, positions) => acc + positions.length, 0);
    if (positionOffset + reduced > MAX_DOC_ID) throw Error("position space exhausted");
    if (size > 0 && posting.docIds[size - 1] >= docId) throw Error("posting docId out of order");
    posting.docIds = growUint32Array(posting.docIds, size + 1);
    posting.offsets = growUint32Array(posting.offsets, buildInvertedIndex * (size + 1) + 1);
    posting.positions = growUint32Array(posting.positions, positionOffset + reduced);
    posting.docIds[size] = docId;
    let cursor = positionOffset;
    fieldPositions.forEach((positions, fieldIndex) => {
      posting.offsets[buildInvertedIndex * size + fieldIndex] = cursor;
      posting.positions.set(positions, cursor);
      cursor += positions.length;
    });
    posting.offsets[buildInvertedIndex * (size + 1)] = cursor;
    posting.size = size + 1;
    if (size === 0) index.terms.set(term, posting);
  };
  removeDocumentFromIndex = (posting, docSlot) => {
    let startOffset = posting.offsets[buildInvertedIndex * docSlot];
    let endOffset = posting.offsets[buildInvertedIndex * (docSlot + 1)];
    let positionsEnd = posting.offsets[buildInvertedIndex * posting.size];
    posting.positions.copyWithin(startOffset, endOffset, positionsEnd);
    posting.docIds.copyWithin(docSlot, docSlot + 1, posting.size);
    for (let i = buildInvertedIndex * (docSlot + 1); i <= buildInvertedIndex * posting.size; i++)
      posting.offsets[i - buildInvertedIndex] = posting.offsets[i] - (endOffset - startOffset);
    posting.size--;
  };
  rebuildFieldsForDoc = (posting, docId) => {
    let low = 0;
    let high = posting.size - 1;
    while (low <= high) {
      let mid = (low + high) >> 1;
      let midDocId = posting.docIds[mid];
      if (midDocId === docId) return mid;
      if (midDocId < docId) low = mid + 1;
      else high = mid - 1;
    }
    return -1;
  };
  docIdsOfTerm = (posting) => posting.docIds.subarray(0, posting.size);
  appendDocId = (posting, docSlot, extractMemoryField) =>
    posting.offsets[buildInvertedIndex * docSlot + FIELD_INDEX[extractMemoryField] + 1] -
    posting.offsets[buildInvertedIndex * docSlot + FIELD_INDEX[extractMemoryField]];
  removeDocIdFromTerm = (entry, docSlot, extractMemoryField) => {
    let start = entry.offsets[buildInvertedIndex * docSlot + FIELD_INDEX[extractMemoryField]];
    let end = entry.offsets[buildInvertedIndex * docSlot + FIELD_INDEX[extractMemoryField] + 1];
    return start === end ? undefined : entry.positions.subarray(start, end);
  };
  termDocCount = (index, term) => index.terms.get(term)?.size ?? 0;
  addPostingPosition = (index, term) => {
    let posting = index.terms.get(term);
    return posting?.size === 1 ? posting.docIds[0] : undefined;
  };
  removePosting = (posting) => {
    posting.docIds = posting.docIds.slice(0, posting.size);
    posting.offsets = posting.offsets.slice(0, buildInvertedIndex * posting.size + 1);
    posting.positions = posting.positions.slice(0, posting.offsets[buildInvertedIndex * posting.size]);
  };
  upsertDocument = (index, doc, meta) => {
    if (index.nextDocId > MAX_DOC_ID) throw Error("docId space exhausted");
    if (index.pathToId.has(doc.path)) hasDocumentPath(index, doc.path);
    let docId = index.nextDocId++;
    for (let [term, fieldPositions] of indexDocumentFields(doc))
      addDocumentToIndex(index, term, docId, fieldPositions);
    let fieldLengths = Object.fromEntries(
      extractMemoryFields.map((extractMemoryField) => [
        extractMemoryField,
        countWhere(doc.fields[extractMemoryField], (token) => token !== ""),
      ]),
    );
    for (let extractMemoryField of extractMemoryFields) {
      index.fieldLengthTotals[extractMemoryField] += fieldLengths[extractMemoryField];
      if (fieldLengths[extractMemoryField] > 0) index.fieldDocCounts[extractMemoryField]++;
    }
    index.docs.set(docId, {
      path: doc.path,
      hash: meta.hash,
      size: meta.size,
      mtimeMs: meta.mtimeMs,
      fieldLengths,
    });
    index.pathToId.set(doc.path, docId);
    return docId;
  };
  markUnverified = (index, docId, doc) => {
    for (let extractMemoryField of extractMemoryFields) {
      index.fieldLengthTotals[extractMemoryField] -= doc.fieldLengths[extractMemoryField];
      if (doc.fieldLengths[extractMemoryField] > 0) index.fieldDocCounts[extractMemoryField]--;
    }
    index.docs.delete(docId);
    index.pathToId.delete(doc.path);
    index.unverified.delete(docId);
  };
  isUnverified = (index, docId, doc) => {
    for (let [term, posting] of index.terms) {
      let docSlot = rebuildFieldsForDoc(posting, docId);
      if (docSlot < 0) continue;
      removeDocumentFromIndex(posting, docSlot);
      if (posting.size === 0) index.terms.delete(term);
    }
    markUnverified(index, docId, doc);
  };
  hasDocumentPath = (index, path) => {
    let docId = index.pathToId.get(path);
    let doc = docId === undefined ? undefined : index.docs.get(docId);
    if (docId === undefined || doc === undefined) return false;
    isUnverified(index, docId, doc);
    return true;
  };
  documentIdForPath = (posting, keepDocIds) => {
    let readIndex = 0;
    while (readIndex < posting.size && !keepDocIds.has(posting.docIds[readIndex])) readIndex++;
    if (readIndex === posting.size) return;
    let writeIndex = readIndex;
    let writeOffset = posting.offsets[buildInvertedIndex * readIndex];
    for (; readIndex < posting.size; readIndex++) {
      let docId = posting.docIds[readIndex];
      let startOffset = posting.offsets[buildInvertedIndex * readIndex];
      let endOffset = posting.offsets[buildInvertedIndex * (readIndex + 1)];
      if (keepDocIds.has(docId)) continue;
      let removedBytes = startOffset - writeOffset;
      posting.positions.copyWithin(writeOffset, startOffset, endOffset);
      posting.docIds[writeIndex] = docId;
      for (let j = 0; j < buildInvertedIndex; j++)
        posting.offsets[buildInvertedIndex * writeIndex + j] =
          posting.offsets[buildInvertedIndex * readIndex + j] - removedBytes;
      writeOffset += endOffset - startOffset;
      writeIndex++;
    }
    posting.offsets[buildInvertedIndex * writeIndex] = writeOffset;
    posting.size = writeIndex;
  };
  SMALL_DELETION_THRESHOLD = 16;
  dropDocuments = (index, paths) => {
    let docIds = new Map();
    for (let path of paths) {
      let docId = index.pathToId.get(path);
      let doc = docId === undefined ? undefined : index.docs.get(docId);
      if (docId !== undefined && doc !== undefined) docIds.set(docId, doc);
    }
    if (docIds.size < SMALL_DELETION_THRESHOLD) {
      for (let [docId, doc] of docIds) isUnverified(index, docId, doc);
      return docIds.size;
    }
    let docIdSet = new Set(docIds.keys());
    for (let [term, posting] of index.terms) {
      documentIdForPath(posting, docIdSet);
      if (posting.size === 0) index.terms.delete(term);
    }
    for (let [docId, doc] of docIds) markUnverified(index, docId, doc);
    return docIds.size;
  };
  emptyIndexSnapshot = (index) => ({
    docCount: index.docs.size,
    avgFieldLength: Object.fromEntries(
      extractMemoryFields.map((extractMemoryField) => [
        extractMemoryField,
        index.fieldDocCounts[extractMemoryField] === 0
          ? 0
          : index.fieldLengthTotals[extractMemoryField] / index.fieldDocCounts[extractMemoryField],
      ]),
    ),
  });
});
//@ chunk-kbw92gv8.js:12192-15535 placement
/**
 * BM25 打分：字段权重（filename/frontmatter 3、headings 2.5、body 1）、长度归一化与短语/邻近加成；其中 bm25Idf 是 log((N-df+0.5)/(df+0.5))，fieldLengthBoost 才是 k1 加权。
 */
var bm25Search = {
  k1: 1.2,
  fieldWeights: {
    filename: 3,
    frontmatter: 3,
    headings: 2.5,
    body: 1,
  },
  fieldB: {
    filename: 0.75,
    frontmatter: 0.75,
    headings: 0.75,
    body: 0.75,
  },
  proximityWeight: 0,
  phraseBoost: 0.5,
};
var parseQueryTerms = (query) => {
  let plainTerms = tokenizeNoCompounds(query);
  if (plainTerms.length === 0) return [];
  let searchTerms = tokenizeForSearch(query);
  let phrases = [];
  let currentPhrase = [];
  let plainIndex = 0;
  for (let term of searchTerms) {
    if (plainIndex < plainTerms.length && term === plainTerms[plainIndex]) {
      currentPhrase.push(term);
      plainIndex++;
      continue;
    }
    if (currentPhrase.length > 0) {
      phrases.push(currentPhrase);
      currentPhrase = [];
    }
  }
  if (currentPhrase.length > 0) phrases.push(currentPhrase);
  for (; plainIndex < plainTerms.length; plainIndex++) phrases.push([plainTerms[plainIndex]]);
  return phrases;
};
var idfForTerm = (query) => {
  let phrases =
    ((query.match(/"/g) ?? []).length & 1) === 0
      ? [...query.matchAll(/"([^"]*)"/g)]
          .flatMap((quotedMatch) => parseQueryTerms(quotedMatch[1] ?? ""))
          .filter((phrase) => phrase.length > 1 && phrase.every((term) => term.length > 1))
      : [];
  return {
    terms: normalizeCaseForComparison_2(tokenizeDualStem(query)),
    phrases,
    boostPhrases: [],
  };
};
var bm25Idf = (docCount, docFreq) => {
  let idf = Math.log((docCount - docFreq + 0.5) / (docFreq + 0.5));
  return idf <= 0 ? 0.000001 : idf;
};
var BM25_K1 = 0.7;
var MIN_FIELD_LENGTH_FOR_BOOST = 16;
var fieldLengthBoost = (fieldLength) =>
  fieldLength < MIN_FIELD_LENGTH_FOR_BOOST ? 0 : BM25_K1 * bm25Idf(fieldLength, 1);
var scoreDocument = (index, term, fieldLengths, avgFieldLength, options) =>
  extractMemoryFields.reduce((acc, extractMemoryField) => {
    let termFreq = appendDocId(index, term, extractMemoryField);
    if (termFreq === 0 || avgFieldLength[extractMemoryField] === 0) return acc;
    let fieldB = options.fieldB[extractMemoryField];
    let lengthNorm =
      1 - fieldB + (fieldB * fieldLengths[extractMemoryField]) / avgFieldLength[extractMemoryField];
    return acc + (options.fieldWeights[extractMemoryField] * termFreq) / lengthNorm;
  }, 0);
var phraseMatchBonus = (index, docId, phraseTerms) => {
  let mapped = phraseTerms.map((term) => proximityBonus(index, term, docId));
  if (mapped.some((hit) => hit === undefined)) return false;
  return extractMemoryFields.some((extractMemoryField) => {
    let positionsPerTerm = [];
    for (let hit of mapped) {
      let positions =
        hit === undefined ? undefined : removeDocIdFromTerm(hit.entry, hit.slot, extractMemoryField);
      if (positions === undefined) return false;
      positionsPerTerm.push(positions);
    }
    let [firstPositions, ...restPositions] = positionsPerTerm;
    if (firstPositions === undefined) return false;
    return firstPositions.some((position) =>
      restPositions.every((positions, offset) => collectFieldScores(positions, position + offset + 1)),
    );
  });
};
var proximityBonus = (index, term, docId) => {
  let posting = index.terms.get(term);
  let docSlot = posting === undefined ? -1 : rebuildFieldsForDoc(posting, docId);
  return posting === undefined || docSlot < 0
    ? undefined
    : {
        entry: posting,
        slot: docSlot,
      };
};
var collectFieldScores = (sortedPositions, target) => {
  let low = 0;
  let high = sortedPositions.length - 1;
  while (low <= high) {
    let mid = (low + high) >> 1;
    let position = sortedPositions[mid];
    if (position === target) return true;
    if (position < target) low = mid + 1;
    else high = mid - 1;
  }
  return false;
};
var EMPTY_BEST_SPAN = {
  span: 1 / 0,
  termCount: 0,
};
var bestSpanForTerm = (index, docId, phraseTerms) => {
  let filtered = phraseTerms
    .map((term) => {
      let hit = proximityBonus(index, term, docId);
      return hit === undefined ? undefined : removeDocIdFromTerm(hit.entry, hit.slot, "body");
    })
    .filter((positions) => positions !== undefined);
  if (filtered.length < 2) return EMPTY_BEST_SPAN;
  let sorted = filtered
    .flatMap((positions, termIdx) =>
      Array.from(positions, (pos) => ({
        pos,
        termIdx,
      })),
    )
    .sort((entryA, entryB) => entryA.pos - entryB.pos);
  let termCounts = new Map();
  let windowEntries = [];
  let distinctTerms = 0;
  let bestSpan = 1 / 0;
  for (let entry of sorted) {
    windowEntries.push(entry);
    let count = termCounts.get(entry.termIdx) ?? 0;
    termCounts.set(entry.termIdx, count + 1);
    if (count === 0) distinctTerms++;
    while (distinctTerms === filtered.length) {
      let dropped = windowEntries.shift();
      if (dropped === undefined) break;
      bestSpan = Math.min(bestSpan, entry.pos - dropped.pos + 1);
      let count = termCounts.get(dropped.termIdx) ?? 0;
      termCounts.set(dropped.termIdx, count - 1);
      if (count === 1) distinctTerms--;
    }
  }
  return {
    span: bestSpan,
    termCount: filtered.length,
  };
};
var mergeSpans = (exactTerms, conceptualKeywords) => {
  let flattened = exactTerms.flatMap((entry) => parseQueryTerms(entry));
  let terms = normalizeCaseForComparison_2([
    ...exactTerms.flatMap((entry) => tokenizeDualStem(entry)),
    ...conceptualKeywords.flatMap((keyword) => tokenizeDualStem(keyword)),
  ]);
  let filtered = flattened.filter((phrase) => phrase.length > 1);
  let seenPhrases = new Set();
  let boostPhrases = filtered.filter((phrase) => {
    let joined = phrase.join(" ");
    if (seenPhrases.has(joined)) return false;
    seenPhrases.add(joined);
    return true;
  });
  return {
    terms,
    phrases: [],
    boostPhrases,
  };
};
var searchIndex = (index, query, limit, options = bm25Search) => {
  let { terms, phrases, boostPhrases } = typeof query === "string" ? idfForTerm(query) : query;
  let snapshot = emptyIndexSnapshot(index);
  if (snapshot.docCount === 0 || terms.length === 0) return [];
  let mapped = terms.map((term) => index.terms.get(term));
  let idfByTerm = new Map(
    terms.map((term, index) => [term, bm25Idf(snapshot.docCount, mapped[index]?.size ?? 0)]),
  );
  let boostIdfByTerm = new Map(
    boostPhrases
      .flat()
      .filter((term) => !idfByTerm.has(term))
      .map((term) => [term, bm25Idf(snapshot.docCount, index.terms.get(term)?.size ?? 0)]),
  );
  let candidateDocIds = new Set(
    mapped.flatMap((posting) => (posting === undefined ? [] : [...docIdsOfTerm(posting)])),
  );
  for (let boostPhrase of boostPhrases) {
    let mapped = boostPhrase.map((term) => index.terms.get(term));
    if (mapped.some((posting) => posting === undefined)) continue;
    let [firstPosting, ...restPostings] = mapped;
    let mapped_2 = restPostings.map((posting) => new Set(docIdsOfTerm(posting)));
    for (let docId of docIdsOfTerm(firstPosting))
      if (mapped_2.every((idSet) => idSet.has(docId))) candidateDocIds.add(docId);
  }
  return [...candidateDocIds]
    .filter((docId) => phrases.every((phrase) => phraseMatchBonus(index, docId, phrase)))
    .map((docId) => {
      let doc = index.docs.get(docId);
      let mapped_2 = mapped.map((posting) =>
        posting === undefined ? -1 : rebuildFieldsForDoc(posting, docId),
      );
      let phraseTerms = terms.filter((term, termIndex) => mapped_2[termIndex] >= 0);
      let reduced = terms.reduce((acc, term, termIndex) => {
        if (mapped_2[termIndex] < 0) return acc;
        let rawScore = scoreDocument(
          mapped[termIndex],
          mapped_2[termIndex],
          doc.fieldLengths,
          snapshot.avgFieldLength,
          options,
        );
        return acc + idfByTerm.get(term) * (rawScore / (options.k1 + rawScore));
      }, 0);
      let reduced_2 = boostPhrases.reduce(
        (acc, phraseTerms) =>
          phraseMatchBonus(index, docId, phraseTerms)
            ? acc +
              options.phraseBoost *
                phraseTerms.reduce(
                  (acc, term) => acc + (idfByTerm.get(term) ?? boostIdfByTerm.get(term) ?? 0),
                  0,
                )
            : acc,
        0,
      );
      let { span, termCount } =
        options.proximityWeight > 0 ? bestSpanForTerm(index, docId, phraseTerms) : EMPTY_BEST_SPAN;
      let proximityScore =
        span === 1 / 0 ? 0 : (options.proximityWeight * reduced) / Math.max(1, 1 + span - termCount);
      return {
        path: doc.path,
        score: reduced + reduced_2 + proximityScore,
        matchedTerms: phraseTerms,
      };
    })
    .filter((hit) => hit.score > 0)
    .sort((hitA, hitB) => hitB.score - hitA.score || (hitA.path < hitB.path ? -1 : 1))
    .slice(0, limit);
};
//@ chunk-kbw92gv8.js:19575-21490 affinity
/**
 * 记忆 BM25 索引与磁盘同步：An 比较扫描结果找出需重建与需删除的文档；yt 扫描目录、确认失踪文件确实不存在后删除，读入新增/变化的 .md 并更新哈希，返回增删改与跳过的统计。
 */
var diffMemoryIndex = (index, files, skipped = new Set(), skippedSubtrees = new Set(), isAlwaysRemoved) => {
  let filePaths = new Set(files.map((file) => file.path));
  let mapped = [...skippedSubtrees].map((subtree) => subtree + "/");
  let isInSkippedSubtree = (path) => mapped.length > 0 && mapped.some((prefix) => path.startsWith(prefix));
  let toRemove = [...index.pathToId.keys()].filter(
    (key) =>
      isAlwaysRemoved?.(key) === true ||
      (!filePaths.has(key) && !skipped.has(key) && !isInSkippedSubtree(key)),
  );
  let filtered = files.filter((file) => {
    let docId = index.pathToId.get(file.path);
    if (docId === undefined) return true;
    let doc = index.docs.get(docId);
    return doc.size !== file.size || doc.mtimeMs !== file.mtimeMs;
  });
  return {
    toIndex: filtered,
    toRemove,
    unchangedCount: files.length - filtered.length,
  };
};
var syncMemoryIndex = async (index, rootDir, scanOptions = DEFAULT_SYNC_OPTIONS, signal) => {
  let stats = {
    added: 0,
    updated: 0,
    removed: 0,
    unchanged: index.docs.size,
    rehashedUnchanged: 0,
    transientSkips: 0,
    scanCompleted: false,
  };
  if (signal?.aborted) return stats;
  let scan = await scanStoreFiles(rootDir, scanOptions).catch(() => {
    return;
  });
  if (scan === undefined) return stats;
  if (scan.rootMissing && index.docs.size > 0) return stats;
  let realPath = await realpath(rootDir).catch((error) =>
    classifyReadError(error) === "structural" ? undefined : TRANSIENT_READ_FAILURE_2,
  );
  if (realPath === TRANSIENT_READ_FAILURE_2) return stats;
  let diff = diffMemoryIndex(index, scan.files, scan.skipped, scan.skippedSubtrees, (path) =>
    isExcludedPath(path, scanOptions),
  );
  let alwaysRemoved = [];
  let removablePaths = [];
  await Promise.all(
    diff.toRemove.map(async (path) => {
      if (isExcludedPath(path, scanOptions) || scan.capDropped.has(path)) alwaysRemoved.push(path);
      else if (await isMissingNonFileOrOversized(rootDir, path, scanOptions.maxFileBytes))
        removablePaths.push(path);
    }),
  );
  let removedPaths =
    removablePaths.length === 0 ||
    (await realpath(rootDir).then(
      () => true,
      () => false,
    ))
      ? [...alwaysRemoved, ...removablePaths]
      : alwaysRemoved;
  let skippedRemovalCount = diff.toRemove.length - removedPaths.length;
  let removedCount = dropDocuments(index, removedPaths);
  let addedCount = 0;
  let updatedCount = 0;
  let rehashedCount = 0;
  let unavailableCount = 0;
  let transientSkipCount = 0;
  let aborted = false;
  for (let file of diff.toIndex) {
    if (signal?.aborted) {
      aborted = true;
      break;
    }
    let content = await readFileGuarded(join(rootDir, file.path), {
      withinReal: realPath,
      maxBytes: scanOptions.maxFileBytes,
    }).catch((error) =>
      isNotRegularFileError(error)
        ? NOT_A_REGULAR_FILE
        : classifyReadError(error) === "structural"
          ? undefined
          : TRANSIENT_READ_FAILURE_2,
    );
    if (content === TRANSIENT_READ_FAILURE_2) {
      transientSkipCount++;
      continue;
    }
    if (content === NOT_A_REGULAR_FILE) {
      if (hasDocumentPath(index, file.path)) unavailableCount++;
      continue;
    }
    if (content === undefined) {
      if (!(await existsAsRegularFile(rootDir, file.path))) {
        transientSkipCount++;
        continue;
      }
      if (hasDocumentPath(index, file.path)) unavailableCount++;
      continue;
    }
    if (content.byteLength > scanOptions.maxFileBytes) {
      if (hasDocumentPath(index, file.path)) unavailableCount++;
      continue;
    }
    let text = new TextDecoder().decode(content);
    let hash = hashContent(text);
    let docId = index.pathToId.get(file.path);
    let doc = docId === undefined ? undefined : index.docs.get(docId);
    if (doc?.hash === hash && !index.unverified.has(docId)) {
      index.docs.set(docId, {
        ...doc,
        size: file.size,
        mtimeMs: file.mtimeMs,
      });
      rehashedCount++;
      continue;
    }
    upsertDocument(index, extractMemoryFieldsFromFile(file.path, text), {
      hash,
      size: file.size,
      mtimeMs: file.mtimeMs,
    });
    if (doc === undefined) addedCount++;
    else updatedCount++;
  }
  return {
    added: addedCount,
    updated: updatedCount,
    removed: removedCount + unavailableCount,
    unchanged: diff.unchangedCount,
    rehashedUnchanged: rehashedCount,
    transientSkips: transientSkipCount + skippedRemovalCount + scan.skipped.size + scan.skippedSubtrees.size,
    scanCompleted: !aborted,
  };
};
//@ chunk-kbw92gv8.js:21490-21656 placement
var logRecallIndexSad = async (event, extra = {}) => {
  let { logFeatureSad } = await import("../services/analytics/featureTelemetry.js").catch(() => ({
    logFeatureSad: undefined,
  }));
  logFeatureSad?.("memory_recall_select", event, {
    via_index: true,
    ...extra,
  });
};
//@ chunk-kbw92gv8.js:21774-26144 placement
/**
 * BM25 索引文件（.bm25-index.json）的读写：序列化成紧凑数组、解析回内存结构，超过 64 MiB 视为超大并重建。
 */
var deserializeIndex; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var serializeIndex;
var toTypedArray;
var encodePostings;
var decodeIndex;
var readIndexFile;
var TRANSIENT_READ_FAILURE;
var INDEX_JSON_PREFIX;
var MAX_INDEX_FILE_BYTES;
var INDEX_OVERSIZED;
var readIndexFileRaw;
var tryParseIndex;
var loadIndexFromDisk;
var readCachedIndex;
deferInit("chunk-kbw92gv8.js:21774", () => {
  deserializeIndex = 10;
  serializeIndex = (index) => {
    let sorted = [...index.docs.keys()].sort((docIdA, docIdB) => docIdA - docIdB);
    let docIdRemap = new Map(sorted.map((docId, newDocId) => [docId, newDocId]));
    let docs = sorted.map((docId) => {
      let doc = index.docs.get(docId);
      return [
        doc.path,
        doc.hash,
        doc.size,
        doc.mtimeMs,
        extractMemoryFields.map((extractMemoryField) => doc.fieldLengths[extractMemoryField]),
      ];
    });
    let terms = [...index.terms.entries()].map(([term, posting]) => {
      let encoded = [];
      let prevDocId = -1;
      docIdsOfTerm(posting).forEach((postingDocId, postingIndex) => {
        let mappedDocId = docIdRemap.get(postingDocId);
        if (mappedDocId === undefined) throw Error("posting references unknown docId");
        encoded.push(prevDocId < 0 ? mappedDocId : mappedDocId - prevDocId);
        prevDocId = mappedDocId;
        let mapped = extractMemoryFields.map((extractMemoryField) =>
          removeDocIdFromTerm(posting, postingIndex, extractMemoryField),
        );
        for (let positions of mapped) encoded.push(positions?.length ?? 0);
        for (let positions of mapped)
          positions?.forEach((position, positionIndex) => {
            encoded.push(positionIndex === 0 ? position : position - positions[positionIndex - 1]);
          });
      });
      return [term, encoded];
    });
    return {
      version: deserializeIndex,
      docs,
      terms,
    };
  };
  toTypedArray = (data, offset) => {
    let value = data[offset];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > MAX_DOC_ID)
      throw Error("malformed posting data");
    return value;
  };
  encodePostings = (index, term, posting, docCount) => {
    let mapped = extractMemoryFields.map(() => 0);
    let fieldPositions = extractMemoryFields.map(() => []);
    let offset = 0;
    let prevDocId = -1;
    while (offset < posting.length) {
      let typedArray = toTypedArray(posting, offset++);
      let docId = prevDocId < 0 ? typedArray : prevDocId + typedArray;
      if (docId >= docCount) throw Error("posting references unknown docId");
      if (prevDocId >= 0 && typedArray === 0) throw Error("repeated posting docId");
      prevDocId = docId;
      let positionCount = 0;
      extractMemoryFields.forEach((extractMemoryField, fieldIndex) => {
        mapped[fieldIndex] = toTypedArray(posting, offset + fieldIndex);
        positionCount += mapped[fieldIndex];
      });
      offset += extractMemoryFields.length;
      if (positionCount === 0 || offset + positionCount > posting.length)
        throw Error("malformed posting positions");
      extractMemoryFields.forEach((extractMemoryField, fieldIndex) => {
        let positions = fieldPositions[fieldIndex];
        positions.length = 0;
        let position = -1;
        for (let j = 0; j < mapped[fieldIndex]; j++) {
          let typedArray = toTypedArray(posting, offset++);
          position = position < 0 ? typedArray : position + typedArray;
          if ((j > 0 && typedArray === 0) || position > MAX_DOC_ID)
            throw Error("malformed posting positions");
          positions.push(position);
        }
      });
      addDocumentToIndex(index, term, docId, fieldPositions);
    }
    let termEntry = index.terms.get(term);
    if (termEntry === undefined) throw Error("empty term entry");
    removePosting(termEntry);
  };
  decodeIndex = (rawIndex) => {
    if (rawIndex.version !== deserializeIndex) throw Error("unsupported index format version");
    if (!Array.isArray(rawIndex.docs) || !Array.isArray(rawIndex.terms)) throw Error("malformed index shape");
    let emptyIndex = createEmptyIndex();
    for (let [docId, docEntry] of rawIndex.docs.entries()) {
      if (!Array.isArray(docEntry) || docEntry.length !== 5) throw Error("malformed doc entry");
      let [path, hash, size, mtimeMs, fieldLengths] = docEntry;
      if (
        typeof hash !== "string" ||
        !Number.isFinite(size) ||
        !Number.isFinite(mtimeMs) ||
        !Array.isArray(fieldLengths) ||
        fieldLengths.length !== extractMemoryFields.length ||
        fieldLengths.some((length) => !Number.isInteger(length) || length < 0 || length > MAX_DOC_ID)
      )
        throw Error("malformed doc metadata");
      if (
        typeof path !== "string" ||
        path.length === 0 ||
        path.startsWith("/") ||
        (sep === "\\" && (path.includes("\\") || /^[A-Za-z]:/.test(path))) ||
        path.includes("\x00") ||
        path.split("/").some((segment) => segment === ".." || segment === "" || segment === ".")
      )
        throw Error("non-contained doc path");
      if (emptyIndex.pathToId.has(path)) throw Error("duplicate doc entry");
      let fieldLengthMap = Object.fromEntries(
        extractMemoryFields.map((extractMemoryField, fieldIndex) => [
          extractMemoryField,
          fieldLengths[fieldIndex],
        ]),
      );
      emptyIndex.docs.set(docId, {
        path,
        hash,
        size,
        mtimeMs,
        fieldLengths: fieldLengthMap,
      });
      emptyIndex.pathToId.set(path, docId);
      emptyIndex.unverified.add(docId);
      for (let extractMemoryField of extractMemoryFields) {
        emptyIndex.fieldLengthTotals[extractMemoryField] += fieldLengthMap[extractMemoryField];
        if (fieldLengthMap[extractMemoryField] > 0) emptyIndex.fieldDocCounts[extractMemoryField]++;
      }
    }
    if (
      extractMemoryFields.some(
        (extractMemoryField) => !Number.isSafeInteger(emptyIndex.fieldLengthTotals[extractMemoryField]),
      )
    )
      throw Error("malformed doc metadata");
    emptyIndex.nextDocId = rawIndex.docs.length;
    for (let term of rawIndex.terms) {
      if (!Array.isArray(term) || term.length !== 2) throw Error("malformed term entry");
      let [termEntry, posting] = term;
      if (
        typeof termEntry !== "string" ||
        termEntry.length === 0 ||
        !Array.isArray(posting) ||
        emptyIndex.terms.has(termEntry)
      )
        throw Error("malformed term entry");
      encodePostings(emptyIndex, termEntry, posting, rawIndex.docs.length);
    }
    return emptyIndex;
  };
  readIndexFile = async (index, indexPath, maxBytes = MAX_INDEX_FILE_BYTES) => {
    let json = jsonStringify(serializeIndex(index));
    let byteLength = Buffer.byteLength(json);
    if (byteLength > maxBytes) {
      logRecallIndexSad("index_persist_skipped_oversized");
      let existingStat = await lstat(indexPath).catch(() => {
        return;
      });
      if (existingStat !== undefined && existingStat.size > maxBytes) await unlink(indexPath).catch(() => {});
      return 0;
    }
    await writeFileAtomic(indexPath, json, 384);
    return byteLength;
  };
  TRANSIENT_READ_FAILURE = Symbol("transient-index-read-failure");
  INDEX_JSON_PREFIX = '{"version"';
  MAX_INDEX_FILE_BYTES = 67108864;
  INDEX_OVERSIZED = Symbol("index-file-oversized");
  readIndexFileRaw = async (indexPath) => {
    let file = await open(indexPath, readOnlyNoFollowFlags());
    try {
      let stats = await file.stat();
      if (!stats.isFile())
        throw Object.assign(Error("not a regular file"), {
          code: "ENOTREG",
        });
      if (stats.size > MAX_INDEX_FILE_BYTES) {
        let headChunk = Buffer.alloc(64);
        let { bytesRead } = await file.read(headChunk, 0, 64, 0);
        throw Object.assign(Error("index file oversized"), {
          code: INDEX_OVERSIZED,
          head: headChunk.subarray(0, bytesRead).toString("utf8"),
        });
      }
      let content = await file.readFile({
        encoding: "utf8",
      });
      if (Buffer.byteLength(content) > MAX_INDEX_FILE_BYTES)
        throw Object.assign(Error("index file oversized"), {
          code: INDEX_OVERSIZED,
          head: content.slice(0, 64),
        });
      return content;
    } finally {
      await file.close();
    }
  };
  tryParseIndex = (error) => {
    let indexError = error;
    if (indexError.code !== INDEX_OVERSIZED) return;
    return (typeof indexError.head === "string" ? indexError.head.trim() : "").startsWith(INDEX_JSON_PREFIX);
  };
  loadIndexFromDisk = async (indexPath) => {
    let ownedIndex;
    let rawContent = await readIndexFileRaw(indexPath).catch((error) => {
      ownedIndex = tryParseIndex(error);
      return isENOENT(error) ? undefined : TRANSIENT_READ_FAILURE;
    });
    if (rawContent === TRANSIENT_READ_FAILURE)
      return {
        owned: ownedIndex ?? false,
        absent: false,
      };
    if (rawContent === undefined)
      return {
        owned: true,
        absent: true,
      };
    try {
      let parsed = jsonParse(rawContent);
      return {
        owned: typeof parsed === "object" && parsed !== null && typeof parsed.version === "number",
        absent: false,
      };
    } catch {
      let sliced = rawContent.trim().slice(0, INDEX_JSON_PREFIX.length);
      return {
        owned: sliced === "" || INDEX_JSON_PREFIX.startsWith(sliced),
        absent: false,
      };
    }
  };
  readCachedIndex = async (indexPath) => {
    let ownedIndex;
    let rawContent = await readIndexFileRaw(indexPath).catch((error) => {
      ownedIndex = tryParseIndex(error);
      return isENOENT(error) ? undefined : TRANSIENT_READ_FAILURE;
    });
    if (rawContent === TRANSIENT_READ_FAILURE)
      return {
        index: undefined,
        pathOwned: ownedIndex ?? false,
      };
    if (rawContent === undefined)
      return {
        index: undefined,
        pathOwned: true,
      };
    let parsed;
    try {
      parsed = jsonParse(rawContent);
    } catch {
      let sliced = rawContent.trim().slice(0, INDEX_JSON_PREFIX.length);
      return {
        index: undefined,
        pathOwned: sliced === "" || INDEX_JSON_PREFIX.startsWith(sliced),
      };
    }
    if (typeof parsed !== "object" || parsed === null || typeof parsed.version !== "number")
      return {
        index: undefined,
        pathOwned: false,
      };
    try {
      return {
        index: decodeIndex(parsed),
        pathOwned: true,
      };
    } catch {
      return {
        index: undefined,
        pathOwned: true,
      };
    }
  };
});
//@ chunk-kbw92gv8.js:26144-27282 placement
/**
 * 记忆索引的打开/建立入口：读取已有索引并同步目录，扫描未完成时退回空索引。
 */
var memoryIndexPath = ".bm25-index.json";
var openMemoryIndex = async (dir, scanOptions = DEFAULT_SYNC_OPTIONS, signal, useCache = true) => {
  let indexPath = join(dir, memoryIndexPath);
  let cached = useCache
    ? await readCachedIndex(indexPath)
    : {
        index: undefined,
        pathOwned: false,
      };
  let index = cached.index ?? createEmptyIndex();
  let syncStats = await syncMemoryIndex(index, dir, scanOptions, signal);
  let isIncomplete = cached.index !== undefined && !syncStats.scanCompleted;
  return {
    dir,
    indexPath,
    index: isIncomplete ? createEmptyIndex() : index,
    lastSync: isIncomplete
      ? {
          added: 0,
          updated: 0,
          removed: 0,
          unchanged: 0,
          rehashedUnchanged: 0,
          transientSkips: 0,
          scanCompleted: false,
        }
      : syncStats,
    loadedFromDisk: cached.index !== undefined,
    persistable: cached.pathOwned && !isIncomplete,
    options: scanOptions,
  };
};
var buildMemoryIndex = async (memoryIndex) => {
  if (!memoryIndex.persistable || !memoryIndex.lastSync.scanCompleted) return 0;
  let indexFromDisk = await loadIndexFromDisk(memoryIndex.indexPath);
  if (!indexFromDisk.owned || (memoryIndex.loadedFromDisk && indexFromDisk.absent)) return 0;
  return readIndexFile(memoryIndex.index, memoryIndex.indexPath);
};
var ensureMemoryIndex = async (store, query, limit = 5, options = bm25Search) => {
  let excludedPaths = new Set();
  let withoutExcluded = (hits) => hits.filter((hit) => !excludedPaths.has(hit.path));
  for (let attempt = 0; attempt < 8; attempt++) {
    let sliced = withoutExcluded(searchIndex(store.index, query, limit + excludedPaths.size, options)).slice(
      0,
      limit,
    );
    let filtered = sliced.filter((hit) => {
      let docId = store.index.pathToId.get(hit.path);
      return docId !== undefined && store.index.unverified.has(docId);
    });
    if (filtered.length === 0) return sliced;
    for (let hit of filtered) {
      let docId = store.index.pathToId.get(hit.path);
      if (
        !(await readAndVerifyStoreEntry(store.index, store.dir, hit.path, store.options)) &&
        docId !== undefined &&
        store.index.unverified.has(docId)
      )
        excludedPaths.add(hit.path);
    }
  }
  return withoutExcluded(searchIndex(store.index, query, limit + excludedPaths.size, options))
    .filter((hit) => {
      let docId = store.index.pathToId.get(hit.path);
      return docId === undefined || !store.index.unverified.has(docId);
    })
    .slice(0, limit);
};
//@ chunk-kbw92gv8.js:27282-29376 placement
/**
 * 目录到索引的增量同步：比对大小/mtime 找新增与改动、删除已消失文件、抽取短语与加权短语、统计各项计数。
 */
var syncMemoryIndex_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var indexDidChange;
var dedupePhrases;
var MAX_PHRASE_CHARS;
var DEFAULT_PHRASE_CHARS;
var MIN_PHRASE_CHARS;
var phraseMatches;
var snapSurrogateStart;
var collectPhrases;
var MAX_BOOST_PHRASES;
var truncatePhraseTerms;
var MIN_PHRASE_TERMS;
var MAX_PHRASE_TERMS;
var PHRASE_TERM_PADDING;
var syncIndexFromDirectory;
var indexFileIfChanged;
var syncResult;
var indexCacheKey;
deferInit("chunk-kbw92gv8.js:27282", () => {
  syncMemoryIndex_2 = Symbol("transient-realpath-failure");
  indexDidChange = (lastSync) =>
    lastSync.added > 0 || lastSync.updated > 0 || lastSync.removed > 0 || lastSync.rehashedUnchanged > 0;
  dedupePhrases = (queryTerms) => {
    let allPhrases = [...queryTerms.boostPhrases, ...queryTerms.phrases];
    let seenPhrases = new Set();
    let uniquePhrases = [];
    for (let j = allPhrases.length - 1; j >= 0; j--) {
      let phrase = allPhrases[j];
      let joined = phrase.join(" ");
      if (!seenPhrases.has(joined)) {
        seenPhrases.add(joined);
        uniquePhrases.push(phrase);
      }
    }
    uniquePhrases.reverse();
    return {
      terms: queryTerms.terms,
      phrases: [],
      boostPhrases: uniquePhrases,
    };
  };
  MAX_PHRASE_CHARS = 4096;
  DEFAULT_PHRASE_CHARS = 3072;
  MIN_PHRASE_CHARS = 1024;
  phraseMatches = (text, fromEnd) => {
    if (((text.match(/"/g) ?? []).length & 1) === 0) return text;
    let quoteIndex = fromEnd ? text.lastIndexOf('"') : text.indexOf('"');
    return text.slice(0, quoteIndex) + " " + text.slice(quoteIndex + 1);
  };
  snapSurrogateStart = (text, index) =>
    index > 0 && index < text.length && (text.charCodeAt(index) & 64512) === 56320 ? index - 1 : index;
  collectPhrases = (query) => {
    if (query.length <= MAX_PHRASE_CHARS) return query;
    let headEnd = snapSurrogateStart(query, DEFAULT_PHRASE_CHARS);
    let tailStart = snapSurrogateStart(query, query.length - MIN_PHRASE_CHARS);
    let truncated = `${phraseMatches(query.slice(0, headEnd), true)}
${phraseMatches(query.slice(tailStart), false)}`;
    return ((query.match(/"/g) ?? []).length & 1) === 0 ? truncated : truncated.replaceAll('"', " ");
  };
  MAX_BOOST_PHRASES = 64;
  truncatePhraseTerms = (boostPhrases) =>
    boostPhrases.slice(-8).map((phrase) => (phrase.length <= 16 ? phrase : phrase.slice(0, 16)));
  MIN_PHRASE_TERMS = 8;
  MAX_PHRASE_TERMS = 24;
  PHRASE_TERM_PADDING = 4;
  syncIndexFromDirectory = (terms, termPriority, termGroup, orderedTerms, phraseTerms) => {
    let termSet = new Set(terms);
    let selectedTerms = new Set();
    let groupUsage = new Map();
    let shouldIncludeTerm = (term) => {
      let priority = termPriority(term);
      if (priority === 0) return false;
      if (priority === 1) {
        let group = termGroup(term);
        if (group !== undefined) {
          let usedCount = groupUsage.get(group) ?? 0;
          if (usedCount >= PHRASE_TERM_PADDING) return false;
          groupUsage.set(group, usedCount + 1);
        }
      }
      return true;
    };
    for (let term of phraseTerms) if (termSet.has(term) && shouldIncludeTerm(term)) selectedTerms.add(term);
    let size = selectedTerms.size;
    for (let term of orderedTerms) {
      if (selectedTerms.size >= size + MIN_PHRASE_TERMS) break;
      if (termSet.has(term) && !selectedTerms.has(term) && shouldIncludeTerm(term)) selectedTerms.add(term);
    }
    let size_2 = selectedTerms.size;
    for (let j = orderedTerms.length - 1; j >= 0 && selectedTerms.size < size_2 + MAX_PHRASE_TERMS; j--) {
      let term = orderedTerms[j];
      if (termSet.has(term) && !selectedTerms.has(term) && shouldIncludeTerm(term)) selectedTerms.add(term);
    }
    let sorted = terms
      .filter((term) => !selectedTerms.has(term))
      .map((term) => {
        let priority = termPriority(term);
        if (priority === 0)
          return {
            t: term,
            key: Number.MAX_SAFE_INTEGER,
          };
        if (priority === 1) {
          let group = termGroup(term);
          if (group !== undefined) {
            let usedCount = groupUsage.get(group) ?? 0;
            groupUsage.set(group, usedCount + 1);
            if (usedCount >= PHRASE_TERM_PADDING)
              return {
                t: term,
                key: Number.MAX_SAFE_INTEGER - 1,
              };
          }
          return {
            t: term,
            key: 1,
          };
        }
        return {
          t: term,
          key: priority,
        };
      })
      .sort((entryA, entryB) => entryA.key - entryB.key);
    for (let { t: term } of sorted) {
      if (selectedTerms.size >= MAX_BOOST_PHRASES) break;
      selectedTerms.add(term);
    }
    return terms.filter((term) => selectedTerms.has(term));
  };
  indexFileIfChanged = (queryTerms, index, getAllTerms) => {
    if (
      queryTerms.terms.length <= MAX_BOOST_PHRASES &&
      queryTerms.boostPhrases.every((boostPhrase) => boostPhrase.length <= 16) &&
      queryTerms.boostPhrases.length <= 8
    )
      return queryTerms;
    let truncatedBoostPhrases = truncatePhraseTerms(queryTerms.boostPhrases);
    return {
      terms: syncIndexFromDirectory(
        queryTerms.terms,
        (term) => termDocCount(index, term),
        (term) => addPostingPosition(index, term),
        getAllTerms(),
        new Set(truncatedBoostPhrases.flat()),
      ),
      phrases: queryTerms.phrases,
      boostPhrases: truncatedBoostPhrases,
    };
  };
  syncResult = (exclusions, excludeLog, isRecallVisible) => ({
    ...(exclusions === null
      ? DEFAULT_SYNC_OPTIONS
      : {
          ...DEFAULT_SYNC_OPTIONS,
          excludePaths: new Set(
            [...exclusions.excluded].map((excludedPath) => excludedPath.split(sep).join("/")),
          ),
          excludePrefixes: exclusions.excludedPrefixes.map((excludedPrefix) =>
            excludedPrefix.split(sep).join("/"),
          ),
        }),
    excludeLog,
    isRecallVisible,
  });
  indexCacheKey = (dir, persist) => `${persist ? "persist" : "no-persist"}:${dir}`;
});
//@ chunk-kbw92gv8.js:29376-29863 placement
/**
 * 记忆索引的打开缓存：按目录与存储空间缓存打开的索引（带 TTL），扫描完成后持久化，并支持释放当前缓存项。
 */
class MemoryIndexCache {
  open = memoizeWithTTLAsync(
    async (dir, exclusions, excludeLog, isRecallVisible, persist) => {
      let startTime = performance.now();
      let memoryIndex = await openMemoryIndex(
        dir,
        syncResult(exclusions, excludeLog, isRecallVisible),
        undefined,
        persist,
      );
      if (
        persist &&
        memoryIndex.lastSync.scanCompleted &&
        (!memoryIndex.loadedFromDisk ? memoryIndex.index.docs.size > 0 : indexDidChange(memoryIndex.lastSync))
      )
        if (memoryIndex.persistable)
          await buildMemoryIndex(memoryIndex).catch(() => {
            logRecallIndexSad("index_persist_failed");
          });
        else logRecallIndexSad("index_path_foreign");
      return {
        store: memoryIndex,
        openMs: performance.now() - startTime,
      };
    },
    (dir, exclusions, excludeLog, isRecallVisible, persist) => indexCacheKey(dir, persist),
  );
  isHeld(dir, persist) {
    return this.open.cache.has(indexCacheKey(dir, persist));
  }
  releaseIfCurrent(dir, persist, pending) {
    let cacheKey = indexCacheKey(dir, persist);
    if (this.open.cache.get(cacheKey) === pending) this.open.cache.delete(cacheKey);
  }
}
//@ chunk-kbw92gv8.js:29863-32309 placement
/**
 * 按会话根缓存记忆索引：打开、按路径取、释放过期实例；扫描不完整时释放并重建。
 */
var searchMemoryIndex; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var withMemoryIndex;
var memoryIndexFor;
var releaseMemoryIndex;
deferInit("chunk-kbw92gv8.js:29863", () => {
  searchMemoryIndex = new SessionRootSlot(() => new MemoryIndexCache());
  withMemoryIndex = async (slot, dir, exclusions, excludeLog, isRecallVisible, persist) => {
    let pending = slot.open(dir, exclusions, excludeLog, isRecallVisible, persist);
    let result = await pending;
    if (
      !result.store.lastSync.scanCompleted ||
      result.store.lastSync.transientSkips > 0 ||
      result.store.index.docs.size === 0
    )
      slot.releaseIfCurrent(dir, persist, pending);
    return result;
  };
  memoryIndexFor = (sessionRoot, dir, isRecallVisible, persist) => {
    withMemoryIndex(searchMemoryIndex.of(sessionRoot), dir, null, isRecallVisible, persist, true)
      .then(({ store }) => {
        if (!store.lastSync.scanCompleted)
          logRecallIndexSad("index_prewarm_failed", {
            prewarm: true,
            sweep_incomplete: true,
          });
        else if (store.lastSync.transientSkips > 0)
          logRecallIndexSad("index_prewarm_failed", {
            prewarm: true,
            transient_skips: true,
          });
      })
      .catch(() => {
        logRecallIndexSad("index_prewarm_failed", {
          prewarm: true,
        });
      });
  };
  releaseMemoryIndex = async (
    sessionRoot,
    query,
    dir,
    signal,
    limit = 5,
    excludeLog = null,
    isRecallVisible,
    persist = false,
    options,
  ) => {
    let startTime = performance.now();
    let cache = searchMemoryIndex.of(sessionRoot);
    let storeWasHeld = cache.isHeld(dir, persist);
    let { store, openMs } = await withMemoryIndex(cache, dir, excludeLog, isRecallVisible, options, persist);
    let openWaitMs = performance.now() - startTime;
    let getRelevanceFloor = () => fieldLengthBoost(store.index.docs.size);
    let buildStats = (sync, ranked = [], queryTermCount = 0) => {
      let topScore = ranked[0]?.score ?? 0;
      let relevanceFloor = getRelevanceFloor();
      let belowFloorCount = countWhere(ranked, (hit) => hit.score < relevanceFloor);
      return {
        docCount: store.index.docs.size,
        termCount: store.index.terms.size,
        loadedFromDisk: store.loadedFromDisk,
        sync,
        tookMs: performance.now() - startTime,
        storeWasHeld,
        openWaitMs,
        storeOpenMs: openMs,
        topScore,
        relevanceFloor,
        hitCount: ranked.length,
        belowFloorCount,
        suppressedByFloor: ranked.length > 0 && belowFloorCount === ranked.length,
        queryTermCount,
      };
    };
    if (signal.aborted)
      return {
        ranked: [],
        stats: buildStats(store.lastSync),
      };
    if (store.loadedFromDisk && !store.lastSync.scanCompleted)
      return {
        ranked: [],
        stats: buildStats(store.lastSync),
      };
    let phraseQuery = typeof query === "string" ? collectPhrases(query) : "";
    let queryObject =
      typeof query === "string"
        ? indexFileIfChanged(dedupePhrases(idfForTerm(phraseQuery)), store.index, () =>
            tokenizeDualStem(phraseQuery),
          )
        : mergeSpans(query.exact_terms, query.conceptual_keywords);
    let memoryIndex = await ensureMemoryIndex(store, queryObject, limit + 5);
    let candidateHits =
      options === undefined
        ? isRecallVisible === undefined
          ? memoryIndex
          : memoryIndex.filter((hit) => !isRecallVisible(hit.path))
        : memoryIndex.filter(
            (hit) => (isRecallVisible === undefined || !isRecallVisible(hit.path)) && options(hit.path),
          );
    let realDir = await realpath(dir).catch(() => {
      return;
    });
    let resolvedDir = resolve(dir);
    let missingPaths = [];
    let outsidePaths = [];
    let results = await Promise.all(
      candidateHits.map(async (hit) => {
        let docId = store.index.pathToId.get(hit.path);
        let doc = docId === undefined ? undefined : store.index.docs.get(docId);
        let filePath = resolve(dir, hit.path);
        let realFilePath = await realpath(filePath).catch((error) =>
          classifyReadError(error) === "structural" ? undefined : syncMemoryIndex_2,
        );
        if (realFilePath === undefined) {
          if (realDir !== undefined) missingPaths.push(hit.path);
          return [];
        }
        if (realFilePath === syncMemoryIndex_2) return [];
        if (!realFilePath.startsWith((realDir ?? resolvedDir) + sep)) {
          if (realDir !== undefined) outsidePaths.push(hit.path);
          return [];
        }
        let fileStat = await lstat(filePath).catch((error) =>
          classifyReadError(error) === "structural" ? undefined : syncMemoryIndex_2,
        );
        if (fileStat === syncMemoryIndex_2) return [];
        if (fileStat === undefined) {
          if (realDir !== undefined) missingPaths.push(hit.path);
          return [];
        }
        if (!fileStat.isFile()) {
          if (realDir !== undefined) outsidePaths.push(hit.path);
          return [];
        }
        return [
          {
            path: filePath,
            mtimeMs: doc?.mtimeMs ?? 0,
            score: hit.score,
          },
        ];
      }),
    );
    if (missingPaths.length > 0 || outsidePaths.length > 0) {
      let results = await Promise.all(
        missingPaths.map(async (path) =>
          (await realpath(resolve(dir, path)).then(
            () => false,
            (error) => classifyReadError(error) === "structural",
          ))
            ? path
            : undefined,
        ),
      );
      let realDirNow = await realpath(dir).catch(() => {
        return;
      });
      if (realDirNow !== undefined && realDirNow === realDir) {
        for (let path of outsidePaths) hasDocumentPath(store.index, path);
        for (let path of results) if (path !== undefined) hasDocumentPath(store.index, path);
      }
    }
    let validHits = results.flat();
    let relevanceFloor = getRelevanceFloor();
    return {
      ranked: validHits.filter((hit) => hit.score >= relevanceFloor).slice(0, limit),
      stats: buildStats(store.lastSync, validHits, queryObject.terms.length),
    };
  };
});
export {
  backfillState,
  backfillMemoryIndex,
  checkMemoryIndexReadLimit,
  pickMemorySizeBasis,
  memoryLimitPressure,
  hasDocumentPath,
  upsertDocument,
  extractMemoryFieldsFromFile,
  memoryIndexFor,
  releaseMemoryIndex,
};
