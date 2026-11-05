/**
 * plugins/bundled/claudeTest/runFiles.ts
 *
 * 2.1.316 新增：Claude Test 运行目录的读写（fix.json、截图、live.html、made-here 标记、提议的规格）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mhn0amzz.js (36)
 * attribution: placement 36
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, resolve, basename, join, dirname } from "path";
import { realpath, lstat, writeFile, link, unlink, open, mkdir } from "fs/promises";
import { createHash, createHmac, timingSafeEqual, randomBytes } from "crypto";
import { pathToFileURL } from "url";
import { constants } from "fs";
import { RUN_ID_RE, toSpecPath, claudeTestState, filterWalled, parseConsentAnswer } from "./appFacts.js";
import { WIDE_CHAR_FACTOR, WRAP_FRACTION, MAX_NAME_CHARS } from "./panelView.js";
import { parseRunProgress, specStems } from "./progress.js";
import {
  SPECS_DIR,
  capitalize,
  compareRunIds,
  createRunFacts,
  RUNS_DIR,
  latestRunId,
  summarizeRunStart,
  earlierRunIds,
  parseRunFrom,
  findRunsInSameChain,
  parseFixedSpecs,
  countResults,
  findLatestFailingRun,
  longerOf,
  readSpecOutline,
  OUTLINE_SUFFIX,
  formatAskedSpecs,
  OUTLINE_ASKED_JSON,
  stripHtmlComments,
  resolveCodeReadingFlags,
} from "./runState.js";
import { getPlatform } from "../../../utils/platform.js";
import { retryTransient } from "../../../utils/atomicPublishWrite.js";
import { saveStatsCache } from "../../../utils/statsCache.js";
import { READ_LIMITS } from "../../../utils/fsBoundRead.js";
import { getErrnoCode } from "../../../utils/errors.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-mhn0amzz.js:47879-48132 placement
/**
 * 从 YYYY-MM-DDTHH-MM-SS 形式的名字里解析本地时间戳。与 cron 无关。
 */
function parseTimestampFromName(name) {
  let match = RUN_ID_RE.test(name) ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/.exec(name) : null;
  if (match === null) return null;
  let [year = NaN, month = NaN, day = NaN, hour = NaN, minute = NaN, second = NaN] = match
    .slice(1)
    .map(Number);
  let time = new Date(year, month - 1, day, hour, minute, second).getTime();
  return Number.isFinite(time) ? time : null;
}
//@ chunk-mhn0amzz.js:67954-68244 placement
/**
 * 按终端列数与可用行数计算截图显示尺寸与左边距；太小时返回 null。
 */
function fitScreenshotSize(columns, maxRows = Number.POSITIVE_INFINITY) {
  let min = Math.min(255, Math.max(1, Math.floor(columns)));
  let max = Math.max(1, Math.round((min / WIDE_CHAR_FACTOR) * WRAP_FRACTION));
  if (max <= maxRows)
    return {
      columns: min,
      rows: max,
      left: 0,
    };
  let floored = Math.floor(maxRows);
  if (floored < MAX_NAME_CHARS) return null;
  let min_2 = Math.min(min, Math.round((floored / WRAP_FRACTION) * WIDE_CHAR_FACTOR));
  return {
    columns: min_2,
    rows: floored,
    left: Math.floor((min - min_2) / 2),
  };
}
//@ chunk-mhn0amzz.js:68244-68485 placement
/**
 * Claude Test 运行目录的各类文件上限（运行文件 2 MiB、截图 256 KiB、live.html 2 MiB 等）与助手运行时的可变状态。
 */
var MAX_RUN_FILE_BYTES = 2097152;
var APP_START_TIMEOUT_MS = 120000;
var MAX_PANE_FILE_BYTES = 65536;
var FIX_JSON = "fix.json";
var MAX_SCREENSHOT_BYTES = 262144;
var MAX_LIVE_HTML_BYTES = 2097152;
var IVBORW0KGGO = "iVBORw0KGgo";
var helperRuntimeState = {
  facts: null,
  picture: null,
  canDrawPictures: null,
  stop: null,
  placed: null,
  early: null,
  runAccepted: null,
  appStarting: null,
  rememberedStart: null,
  moreDeclined: null,
};
//@ chunk-mhn0amzz.js:68485-68703 placement
/**
 * stat 运行目录中的路径：必须不是链接、类型相符、真实路径与预期一致且不超过大小上限。
 */
async function statInsideRun(ctx, filePath, realRunDir, kind, maxSize = Number.POSITIVE_INFINITY) {
  let fileStat = await ctx.fs
    .stat(filePath, {
      resolve: true,
    })
    .catch(() => {
      return;
    });
  return fileStat !== undefined &&
    !fileStat.isLink &&
    fileStat.kind === kind &&
    fileStat.realPath !== undefined &&
    identity(fileStat.realPath) === identity(realRunDir) &&
    fileStat.size <= maxSize
    ? fileStat
    : undefined;
}
//@ chunk-mhn0amzz.js:68703-68727 placement
/**
 * 原样返回
 */
function identity(value) {
  return value;
}
//@ chunk-mhn0amzz.js:68727-68848 placement
/**
 * 列出目录中的普通文件名（不含链接）。
 */
async function listRegularFiles(ctx, dir) {
  return (await ctx.fs.list(dir).catch(() => []))
    .filter((entry) => entry.kind === "file" && !entry.isLink)
    .map((entry) => entry.name);
}
//@ chunk-mhn0amzz.js:68848-68886 placement
/**
 * 控制台文本缓存
 */
var consoleTextCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_CONSOLE_ENTRIES;
var MAX_CONSOLE_BYTES;
var consoleBytes;
deferInit("chunk-mhn0amzz.js:68848", () => {
  consoleTextCache = new Map();
  MAX_CONSOLE_ENTRIES = 160;
  MAX_CONSOLE_BYTES = 8388608;
  consoleBytes = 0;
});
//@ chunk-mhn0amzz.js:68886-69403 placement
async function readRunFile(ctx, runDir, realRunDir, fileName, maxBytes = MAX_RUN_FILE_BYTES) {
  let relFilePath = `${runDir}/${fileName}`;
  let cacheKey = `${realRunDir}/${fileName}`;
  let fileStat = await statInsideRun(ctx, relFilePath, cacheKey, "file", maxBytes);
  if (fileStat === undefined) return;
  let cached = consoleTextCache.get(cacheKey);
  if (cached?.size === fileStat.size && cached.mtimeMs === fileStat.mtimeMs) {
    consoleTextCache.delete(cacheKey);
    consoleTextCache.set(cacheKey, cached);
    return cached.text;
  }
  let raw = await ctx.fs.read(relFilePath).catch(() => {
    return;
  });
  let text = raw !== undefined && Buffer.byteLength(raw) === fileStat.size ? raw : undefined;
  if (text !== undefined) {
    consoleBytes -= consoleTextCache.get(cacheKey)?.text.length ?? 0;
    consoleTextCache.delete(cacheKey);
    consoleTextCache.set(cacheKey, {
      size: fileStat.size,
      mtimeMs: fileStat.mtimeMs,
      text,
    });
    consoleBytes += text.length;
    for (let [key, entry] of consoleTextCache) {
      if (consoleTextCache.size <= MAX_CONSOLE_ENTRIES && consoleBytes <= MAX_CONSOLE_BYTES) break;
      consoleTextCache.delete(key);
      consoleBytes -= entry.text.length;
    }
  }
  return text;
}
//@ chunk-mhn0amzz.js:69403-69712 placement
async function RUN_PROGRESS_FILES(ctx, runDir, realRunDir, files) {
  return parseRunProgress({
    progress: await readRunFile(ctx, runDir, realRunDir, "progress.ndjson"),
    names: await readRunFile(ctx, runDir, realRunDir, "names.json", MAX_SCREENSHOT_BYTES),
    decisions: await readRunFile(ctx, runDir, realRunDir, "decisions.json", MAX_SCREENSHOT_BYTES),
    hasResults: files.includes("results.json"),
    hasLog: files.includes("log.md"),
    results: files.includes("results.json")
      ? await readRunFile(ctx, runDir, realRunDir, "results.json", MAX_SCREENSHOT_BYTES)
      : undefined,
  });
}
//@ chunk-mhn0amzz.js:69712-69850 placement
/**
 * 读取已结束运行的进度，未结束返回 null。
 */
async function readFinishedRun(ctx, runDir, realRunDir) {
  if ((await statInsideRun(ctx, runDir, realRunDir, "dir")) === undefined) return null;
  let progress = await RUN_PROGRESS_FILES(ctx, runDir, realRunDir, await listRegularFiles(ctx, runDir));
  return progress?.finished === true ? progress : null;
}
//@ chunk-mhn0amzz.js:69850-69868 placement
/**
 * 50
 */
var MAX_LISTED_RUN_FILES = 50;
var laterRunCache = null;
//@ chunk-mhn0amzz.js:69868-70240 placement
/**
 * 运行目录里是否有早于运行开始时间的文件（结果缓存）。
 */
async function hasOlderRunFiles(ctx, runDir, realPath, name) {
  let cacheKey = `${runDir}
${name}`;
  if (laterRunCache?.key === cacheKey) return laterRunCache.isLater;
  let timestampFromName = parseTimestampFromName(name);
  let specsDir = `${runDir}/${SPECS_DIR}`;
  let realSpecsDir = `${realPath}/${SPECS_DIR}`;
  let isLater = false;
  if (timestampFromName !== null && (await statInsideRun(ctx, specsDir, realSpecsDir, "dir")) !== undefined) {
    let sliced = (await listRegularFiles(ctx, specsDir))
      .filter((fileName) => specStems([fileName]).length === 1)
      .slice(0, MAX_LISTED_RUN_FILES);
    for (let fileName of sliced) {
      let fileStat = await statInsideRun(
        ctx,
        `${specsDir}/${fileName}`,
        `${realSpecsDir}/${fileName}`,
        "file",
      );
      if (fileStat !== undefined && fileStat.mtimeMs < timestampFromName) {
        isLater = true;
        break;
      }
    }
  }
  laterRunCache = {
    key: cacheKey,
    isLater,
  };
  return isLater;
}
//@ chunk-mhn0amzz.js:70240-70496 placement
/**
 * 运行子目录中是否有文件。
 */
async function hasRunSubfiles(ctx, runDir, realRunDir) {
  let specsDir = `${runDir}/${SPECS_DIR}`;
  let realSpecsDir = `${realRunDir}/${SPECS_DIR}`;
  if ((await statInsideRun(ctx, specsDir, realSpecsDir, "dir")) === undefined) return false;
  let sliced = (await listRegularFiles(ctx, specsDir))
    .filter((fileName) => specStems([fileName]).length === 1)
    .slice(0, MAX_LISTED_RUN_FILES);
  for (let fileName of sliced)
    if (
      (await statInsideRun(ctx, `${specsDir}/${fileName}`, `${realSpecsDir}/${fileName}`, "file")) !==
      undefined
    )
      return true;
  return false;
}
//@ chunk-mhn0amzz.js:70496-70577 placement
/**
 * 正在准备/读代码/写测试
 */
function isRunPreparing(facts) {
  return facts.isPreparing === true || facts.isReadingCode || facts.isWritingTests === true;
}
//@ chunk-mhn0amzz.js:70577-70983 placement
async function findAppPackageJson(ctx, dir) {
  try {
    let realPath = (
      await ctx.fs.stat(dir, {
        resolve: true,
      })
    ).realPath;
    if (realPath === undefined) return null;
    let packagePath = `${dir.replace(/\/+$/, "")}/package.json`;
    let fileStat = await statInsideRun(
      ctx,
      packagePath,
      `${realPath.replace(/\/+$/, "")}/package.json`,
      "file",
      MAX_RUN_FILE_BYTES,
    );
    let text =
      fileStat === undefined
        ? undefined
        : await ctx.fs.read(packagePath).catch(() => {
            return;
          });
    let packageJson = text !== undefined && Buffer.byteLength(text) === fileStat?.size ? text : undefined;
    return capitalize(
      packageJson,
      realPath
        .replace(/[\\/]+$/, "")
        .split(/[\\/]/)
        .pop() ?? "",
    );
  } catch {
    return null;
  }
}
//@ chunk-mhn0amzz.js:70983-71290 placement
/**
 * 根据参数确定被测应用目录（项目根或其下合法子目录）。
 */
async function resolveAppDir(ctx, rootDir, text) {
  let defaultResult = {
    dir: rootDir,
    appFolder: null,
  };
  let specPath = toSpecPath(text, rootDir);
  if (specPath === null) return defaultResult;
  try {
    let realPath = (
      await ctx.fs.stat(rootDir, {
        resolve: true,
      })
    ).realPath;
    if (realPath === undefined) return defaultResult;
    let appDir = `${rootDir.replace(/\/+$/, "")}/${specPath}`;
    let realAppDir = `${realPath.replace(/\/+$/, "")}/${specPath}`;
    return (await statInsideRun(ctx, appDir, realAppDir, "dir")) === undefined
      ? defaultResult
      : {
          dir: appDir,
          appFolder: specPath,
        };
  } catch {
    return defaultResult;
  }
}
//@ chunk-mhn0amzz.js:71290-71459 placement
/**
 * 为运行事实补上 isLaterRun（按目录与打开时间缓存）。
 */
async function withLaterRunFlag(ctx, dir, realPath, facts, runFacts) {
  if (isRunPreparing(facts))
    return {
      ...runFacts,
      isLaterRun: false,
    };
  let cacheKey = `${dir}
${runFacts.openedAt}`;
  if (hasRunSubfilesCache?.key !== cacheKey)
    hasRunSubfilesCache = {
      key: cacheKey,
      has: await hasRunSubfiles(ctx, dir, realPath),
    };
  return {
    ...runFacts,
    isLaterRun: hasRunSubfilesCache.has,
  };
}
//@ chunk-mhn0amzz.js:71459-71485 placement
/**
 * 最近运行目录缓存（5 秒）
 */
var latestRunCache = null;
var latestRunCacheMs = 5000;
var MAX_RECENT_RUN_DIRS = 12;
//@ chunk-mhn0amzz.js:71485-71685 placement
/**
 * 找出本机创建的最近若干个运行目录。
 */
async function findMadeHereRuns(realRunsDir, runIds) {
  let isMadeHere = claudeTestState.isMadeHere;
  if (isMadeHere === undefined) return [];
  let sliced = [...runIds].sort(compareRunIds).reverse().slice(0, MAX_RECENT_RUN_DIRS);
  let results = await Promise.all(
    sliced.map((runId) => isMadeHere(`${realRunsDir}/${runId}`).catch(() => false)),
  );
  return sliced.filter((runId, index) => results[index]);
}
//@ chunk-mhn0amzz.js:71685-71697 placement
/**
 * 子文件存在性缓存
 */
var hasRunSubfilesCache = null;
//@ chunk-mhn0amzz.js:71697-71727 placement
/**
 * 清空运行目录相关缓存
 */
function resetRunDirCaches() {
  hasRunSubfilesCache = null;
  latestRunCache = null;
}
//@ chunk-mhn0amzz.js:71727-74248 placement
/**
 * 读取运行目录（pane.json、proposed/）得到面板需要的事实与截图名。
 */
async function readRunFolderFacts(ctx, runDir, openedAt, now, phase, hasFixFlag = false) {
  let runFacts = createRunFacts(openedAt, phase);
  let emptyResult = {
    facts: runFacts,
    pictureStem: null,
    runRel: null,
    runReal: null,
  };
  try {
    let realPath = (
      await ctx.fs.stat(runDir, {
        resolve: true,
      })
    ).realPath;
    if (realPath === undefined) return emptyResult;
    let runsDir = `${runDir}/${RUNS_DIR}`;
    let realRunsDir = `${realPath}/${RUNS_DIR}`;
    let runsStat = await statInsideRun(ctx, runsDir, realRunsDir, "dir");
    if (runsStat === undefined)
      return {
        ...emptyResult,
        facts: await withLaterRunFlag(ctx, runDir, realPath, phase, runFacts),
      };
    if (
      latestRunCache?.real !== realRunsDir ||
      latestRunCache.mtimeMs !== runsStat.mtimeMs ||
      now - latestRunCache.at > latestRunCacheMs
    )
      latestRunCache = {
        real: realRunsDir,
        mtimeMs: runsStat.mtimeMs,
        at: now,
        names: (await ctx.fs.list(runsDir).catch(() => []))
          .filter((dirent) => dirent.kind === "dir" && !dirent.isLink)
          .map((dirent) => dirent.name)
          .filter((name) => RUN_ID_RE.test(name)),
      };
    let madeHereRuns = await findMadeHereRuns(
      realRunsDir,
      latestRunCache.names.filter(
        (name) => (parseTimestampFromName(name) ?? 0) <= now + APP_START_TIMEOUT_MS,
      ),
    );
    let runId = latestRunId(madeHereRuns);
    if (runId === null)
      return {
        ...emptyResult,
        facts: await withLaterRunFlag(ctx, runDir, realPath, phase, runFacts),
      };
    let runDir_2 = `${runsDir}/${runId}`;
    let realRunDir = `${realRunsDir}/${runId}`;
    let runStat = await statInsideRun(ctx, runDir_2, realRunDir, "dir");
    if (runStat === undefined || (!hasFixFlag && runStat.mtimeMs < openedAt - 1800000))
      return {
        ...emptyResult,
        facts: await withLaterRunFlag(ctx, runDir, realPath, phase, runFacts),
      };
    let files = await listRegularFiles(ctx, runDir_2);
    let progress = await RUN_PROGRESS_FILES(ctx, runDir_2, realRunDir, files);
    let isKept = hasFixFlag && runStat.mtimeMs < openedAt - 2000 && progress?.finished === true;
    if (
      !isKept &&
      runStat.mtimeMs < openedAt - 2000 &&
      (progress?.finished !== false || runStat.mtimeMs < openedAt - 1800000)
    )
      return {
        ...emptyResult,
        facts: await withLaterRunFlag(ctx, runDir, realPath, phase, runFacts),
      };
    let startNote = summarizeRunStart(
      await readRunFile(ctx, runDir_2, realRunDir, "pane.json", MAX_PANE_FILE_BYTES),
    );
    let earlierIds = earlierRunIds(madeHereRuns, runId);
    let fromByRun = new Map();
    for (let runId of earlierIds) {
      let earlierDir = `${runsDir}/${runId}`;
      let earlierRealDir = `${realRunsDir}/${runId}`;
      let from = summarizeRunStart(
        await readRunFile(ctx, earlierDir, earlierRealDir, "pane.json", MAX_PANE_FILE_BYTES),
      ).from;
      fromByRun.set(
        runId,
        from ??
          parseRunFrom(await readRunFile(ctx, earlierDir, earlierRealDir, FIX_JSON, MAX_PANE_FILE_BYTES)),
      );
    }
    let fixJson = files.includes(FIX_JSON)
      ? await readRunFile(ctx, runDir_2, realRunDir, FIX_JSON, MAX_PANE_FILE_BYTES)
      : undefined;
    let fromRunId = startNote.from ?? parseRunFrom(fixJson);
    fromByRun.set(runId, fromRunId);
    let extraChains =
      fromRunId !== null && madeHereRuns.includes(fromRunId) && !earlierIds.includes(fromRunId)
        ? [fromRunId]
        : [];
    let runsInSameChain = findRunsInSameChain(
      [runId, ...earlierIds, ...extraChains],
      runId,
      (runId) => fromByRun.get(runId) ?? null,
    );
    let chainRuns = [];
    for (let runId of runsInSameChain) {
      let finishedRun = await readFinishedRun(ctx, `${runsDir}/${runId}`, `${realRunsDir}/${runId}`);
      if (finishedRun !== null) chainRuns.push(finishedRun);
    }
    let fixedSpecs = startNote.from === null ? parseFixedSpecs(fixJson) : [];
    let otherRuns = [];
    if (runsInSameChain.length === 0 && fixedSpecs.length > 0)
      for (let runId of earlierIds) {
        let finishedRun = await readFinishedRun(ctx, `${runsDir}/${runId}`, `${realRunsDir}/${runId}`);
        if (finishedRun !== null) otherRuns.push(finishedRun);
      }
    let earlier =
      chainRuns.length > 0
        ? countResults(chainRuns)
        : otherRuns.length > 0
          ? findLatestFailingRun(otherRuns, fixedSpecs)
          : null;
    let proposedDir = `${runDir_2}/proposed`;
    let hasProposed =
      progress === null &&
      (await statInsideRun(ctx, proposedDir, `${realRunDir}/proposed`, "dir")) !== undefined;
    let outline = hasProposed
      ? longerOf(
          readSpecOutline(
            await readRunFile(ctx, runDir_2, realRunDir, `proposed/${OUTLINE_SUFFIX}`, MAX_PANE_FILE_BYTES),
          ),
          formatAskedSpecs(
            await readRunFile(ctx, runDir_2, realRunDir, OUTLINE_ASKED_JSON, MAX_PANE_FILE_BYTES),
          ),
        )
      : null;
    let outlineStems = outline?.map((row) => row.stem) ?? null;
    let fileStems = hasProposed ? specStems(await listRegularFiles(ctx, proposedDir)) : [];
    let stems = outlineStems ?? fileStems;
    let outlineByStem = new Map(outline?.map((row) => [row.stem, row]) ?? []);
    let proposed = [];
    for (let stem of stems) {
      let outlineRow = outlineByStem.get(stem);
      let row =
        fileStems.includes(stem) || outlineRow === undefined
          ? stripHtmlComments(
              stem,
              await readRunFile(ctx, runDir_2, realRunDir, `proposed/${stem}.md`, MAX_PANE_FILE_BYTES),
            )
          : outlineRow;
      proposed.push(
        outlineRow?.walled === true && row.walled !== true
          ? {
              ...row,
              walled: true,
            }
          : row,
      );
    }
    let walledFiltered = filterWalled(
      proposed,
      hasProposed &&
        files.includes("signin.json") &&
        parseConsentAnswer(await readRunFile(ctx, runDir_2, realRunDir, "signin.json", MAX_PANE_FILE_BYTES)),
    );
    let isLaterRun = await hasOlderRunFiles(ctx, runDir, realPath, runId);
    return {
      facts: {
        ...runFacts,
        ...resolveCodeReadingFlags(phase, walledFiltered.length),
        isLaterRun,
        finishedAt: progress?.finished === true ? (helperRuntimeState.facts?.finishedAt ?? now) : null,
        hasRunFolder: true,
        hasLook: files.some((fileName) => /^look-\d{1,2}\.png$/.test(fileName)),
        proposed: walledFiltered,
        ...(outlineStems !== null && {
          hasOutline: true,
        }),
        note: startNote,
        run: progress,
        runId,
        earlier,
        ...(fixedSpecs.length > 0 && {
          isFixRerun: true,
          fixedStems: fixedSpecs,
        }),
        ...(isKept && {
          isKept: true,
        }),
      },
      pictureStem: pickFocusStem(progress, files),
      runRel: runDir_2,
      runReal: realRunDir,
    };
  } catch {
    return emptyResult;
  }
}
//@ chunk-mhn0amzz.js:74248-74395 placement
/**
 * 选要展示的规格：第一个失败的、最后完成的或 look-1。
 */
function pickFocusStem(run, files) {
  return (
    (run?.finished === true ? run.rows.find((row) => row.verdict === "FAIL")?.stem : undefined) ??
    run?.lastDone ??
    (files.includes("look-1.png") ? "look-1" : null)
  );
}
//@ chunk-mhn0amzz.js:74395-74733 placement
async function readScreenshot(ctx, runRel, runReal, pictureStem) {
  let fileName = `${pictureStem}.png`;
  if (fileName.includes("/") || fileName.startsWith(".")) return;
  let filePath = `${runRel}/${fileName}`;
  let fileStat = await statInsideRun(ctx, filePath, `${runReal}/${fileName}`, "file", MAX_LIVE_HTML_BYTES);
  if (fileStat === undefined) return;
  let bytes = await ctx.fs
    .read(filePath, {
      as: "bytes",
    })
    .catch(() => {
      return;
    });
  return bytes !== undefined &&
    bytes.base64.length === Math.ceil(fileStat.size / 3) * 4 &&
    bytes.base64.startsWith(IVBORW0KGGO) &&
    isValidPngHeader(bytes.base64)
    ? bytes.base64
    : undefined;
}
//@ chunk-mhn0amzz.js:74733-74745 placement
/**
 * 4096
 */
var MAX_PNG_DIMENSION = 4096;
//@ chunk-mhn0amzz.js:74745-74994 placement
/**
 * 检查 base64 PNG 的 IHDR 头与宽高上限。
 */
function isValidPngHeader(base64) {
  let binary;
  try {
    binary = atob(base64.slice(0, 44));
  } catch {
    return false;
  }
  let readUint32 = (offset) =>
    ((binary.charCodeAt(offset) << 24) >>> 0) +
    (binary.charCodeAt(offset + 1) << 16) +
    (binary.charCodeAt(offset + 2) << 8) +
    binary.charCodeAt(offset + 3);
  return (
    binary.length >= 24 &&
    binary.slice(12, 16) === "IHDR" &&
    readUint32(16) > 0 &&
    readUint32(16) <= MAX_PNG_DIMENSION &&
    readUint32(20) > 0 &&
    readUint32(20) <= MAX_PNG_DIMENSION
  );
}
//@ chunk-mhn0amzz.js:74994-75281 placement
async function writeLiveReport(dataDir, dir, runId) {
  if (!RUN_ID_RE.test(runId) || !isAbsolute(dir)) return;
  let realDir = resolve(await realpath(dir).catch(() => dir));
  let dirKey =
    basename(realDir)
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .slice(0, 48) +
    "-" +
    createHash("sha256").update(realDir).digest("hex");
  let reportPath = join(dataDir, "live", dirKey, runId, "live.html");
  return (
    await lstat(reportPath).catch(() => {
      return;
    })
  )?.isFile() === true
    ? pathToFileURL(reportPath).href
    : undefined;
}
//@ chunk-mhn0amzz.js:75281-75293 placement
/**
 * 1024
 */
var INSTALL_PROGRESS_BYTES = 1024;
//@ chunk-mhn0amzz.js:75293-75358 placement
/**
 * 写入 install-progress.json
 */
async function writeInstallProgress(dataDir) {
  return writeFileAtomic(join(dataDir, "install-progress.json"), INSTALL_PROGRESS_BYTES);
}
//@ chunk-mhn0amzz.js:75358-76026 placement
/**
 * 校验 made-here 硬链接标记（同 inode、nlink=2），确认运行目录由本机生成。
 */
async function isMadeHereMarker(dataDir, runDir) {
  try {
    let dirStat = await lstat(runDir, {
      bigint: true,
    });
    if (!dirStat.isDirectory() || (await realpath(runDir)) !== resolve(runDir)) return false;
    let [markerStat, againStat] = await Promise.all([
      lstat(join(runDir, "made-here"), {
        bigint: true,
      }),
      lstat(join(runDir, "made-here.again"), {
        bigint: true,
      }),
    ]);
    if (
      !markerStat.isFile() ||
      !againStat.isFile() ||
      markerStat.nlink !== 2n ||
      markerStat.ino !== againStat.ino ||
      markerStat.dev !== againStat.dev
    )
      return false;
    let [markerText, key] = await Promise.all([
      writeFileAtomic(join(runDir, "made-here"), MADE_HERE_BYTES),
      writeFileAtomic(join(dataDir, "made-here.key"), MADE_HERE_KEY_BYTES, true),
    ]);
    let expectedMac = /^mac: ([0-9a-f]{64})$/m.exec(markerText ?? "")?.[1];
    if (expectedMac === undefined || key === undefined || !/^[0-9a-f]{64}$/.test(key)) return false;
    let dirStatAfter = await lstat(runDir, {
      bigint: true,
    });
    if (!dirStatAfter.isDirectory() || dirStatAfter.ino !== dirStat.ino || dirStatAfter.dev !== dirStat.dev)
      return false;
    let actualMac = createHmac("sha256", key).update(basename(runDir)).digest();
    return timingSafeEqual(Buffer.from(expectedMac, "hex"), actualMac);
  } catch {
    return false;
  }
}
//@ chunk-mhn0amzz.js:76026-76250 placement
async function writeMadeHereKey(dataDir) {
  let keyPath = join(dataDir, "made-here.key");
  let tempPath = `${keyPath}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    await writeFile(tempPath, randomBytes(32).toString("hex"), {
      flag: "wx",
      mode: 384,
    });
    await link(tempPath, keyPath);
  } catch {
  } finally {
    await unlink(tempPath).catch(() => {
      return;
    });
  }
}
//@ chunk-mhn0amzz.js:76250-76267 placement
/**
 * 256
 */
var MADE_HERE_BYTES = 256;
var MADE_HERE_KEY_BYTES = 64;
//@ chunk-mhn0amzz.js:76267-76672 placement
async function writeFileAtomic(filePath, maxBytes, requireOwnerOnly = false) {
  let file = await open(
    filePath,
    getPlatform() === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  ).catch(() => {
    return;
  });
  if (file === undefined) return;
  try {
    let stats = await file.stat();
    if (
      !stats.isFile() ||
      stats.size > maxBytes ||
      (requireOwnerOnly && getPlatform() !== "windows" && (stats.mode & 63) !== 0)
    )
      return;
    let buffer = Buffer.alloc(maxBytes);
    let { bytesRead } = await file.read(buffer, 0, maxBytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } catch {
    return;
  } finally {
    await file.close().catch(() => {
      return;
    });
  }
}
//@ chunk-mhn0amzz.js:76842-76998 placement
/**
 * 逐个比较/写入安装文件，返回第一个内容不同的文件名。
 */
async function findDifferingInstalledFile(rootDir, files) {
  for (let [key, value] of Object.entries(files)) {
    let state = {
      differs: false,
    };
    await retryTransient(async () => {
      state.differs = await writeFileIfAbsent(join(rootDir, key), value);
    });
    if (state.differs) return key;
  }
  return;
}
//@ chunk-mhn0amzz.js:76998-77196 placement
/**
 * 文件已存在则比较内容；不存在则创建（目录 0700），并发写入时容忍相同内容。
 */
async function writeFileIfAbsent(filePath, content) {
  let byteLength = Buffer.byteLength(content);
  let fileNoFollow = await readFileNoFollow(filePath, byteLength);
  if (fileNoFollow !== undefined) return fileNoFollow !== content;
  try {
    await mkdir(dirname(filePath), {
      recursive: true,
      mode: 448,
    });
    await saveStatsCache(filePath, content);
  } catch (error) {
    if ((await readFileNoFollow(filePath, byteLength)) !== content) throw error;
  }
  return false;
}
//@ chunk-mhn0amzz.js:77196-77485 placement
async function readFileNoFollow(filePath, expectedSize) {
  try {
    let file = await open(
      filePath,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | READ_LIMITS,
    );
    try {
      let stats = await file.stat();
      return stats.isFile() && stats.nlink < 2 && stats.size === expectedSize
        ? await file.readFile({
            encoding: "utf8",
          })
        : false;
    } finally {
      await file.close();
    }
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    if (getErrnoCode(error) === "ELOOP") return false;
    throw error;
  }
}
export {
  findDifferingInstalledFile,
  writeMadeHereKey,
  resolveAppDir,
  helperRuntimeState,
  fitScreenshotSize,
  resetRunDirCaches,
  readRunFolderFacts,
  readScreenshot,
  findAppPackageJson,
  writeLiveReport,
  writeInstallProgress,
  isMadeHereMarker,
};
