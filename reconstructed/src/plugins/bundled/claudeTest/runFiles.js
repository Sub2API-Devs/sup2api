/**
 * plugins/bundled/claudeTest/runFiles.ts
 *
 * 2.1.316 新增：Claude Test 运行目录的读写（fix.json、截图、live.html、made-here 标记、提议的规格）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ae5g0zb5.js (36)
 * attribution: placement 36
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
import { capitalize_2 } from "../../../utils/stringUtils.js";
import { getPlatform } from "../../../utils/platform.js";
import { retryTransient } from "../../../utils/atomicPublishWrite.js";
import { saveStatsCache } from "../../../utils/statsCache.js";
import { READ_LIMITS } from "../../../utils/fsBoundRead.js";
import { getErrnoCode } from "../../../utils/errors.js";

//@ chunk-ae5g0zb5.js:46641-46894 placement = nextCronRunMs (0.698)
/**
 * 从 YYYY-MM-DDTHH-MM-SS 形式的名字里解析本地时间戳。与 cron 无关。
 */
function parseTimestampFromName(name) {
  let n = RUN_ID_RE.test(name) ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/.exec(name) : null;
  if (n === null) return null;
  let [r = NaN, o = NaN, s = NaN, a = NaN, i = NaN, c = NaN] = n.slice(1).map(Number);
  let time = new Date(r, o - 1, s, a, i, c).getTime();
  return Number.isFinite(time) ? time : null;
}
//@ chunk-ae5g0zb5.js:66716-67006 placement
/**
 * 按终端列数与可用行数计算截图显示尺寸与左边距；太小时返回 null。
 */
function fitScreenshotSize(e, n = Number.POSITIVE_INFINITY) {
  let min = Math.min(255, Math.max(1, Math.floor(e)));
  let max = Math.max(1, Math.round((min / WIDE_CHAR_FACTOR) * WRAP_FRACTION));
  if (max <= n)
    return {
      columns: min,
      rows: max,
      left: 0,
    };
  let floored = Math.floor(n);
  if (floored < MAX_NAME_CHARS) return null;
  let min_2 = Math.min(min, Math.round((floored / WRAP_FRACTION) * WIDE_CHAR_FACTOR));
  return {
    columns: min_2,
    rows: floored,
    left: Math.floor((min - min_2) / 2),
  };
}
//@ chunk-ae5g0zb5.js:67006-67247 placement
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
//@ chunk-ae5g0zb5.js:67247-67465 placement
/**
 * stat 运行目录中的路径：必须不是链接、类型相符、真实路径与预期一致且不超过大小上限。
 */
async function statInsideRun(e, n, r, o, s = Number.POSITIVE_INFINITY) {
  let a = await e.fs
    .stat(n, {
      resolve: true,
    })
    .catch(() => {
      return;
    });
  return a !== undefined &&
    !a.isLink &&
    a.kind === o &&
    a.realPath !== undefined &&
    identity(a.realPath) === identity(r) &&
    a.size <= s
    ? a
    : undefined;
}
//@ chunk-ae5g0zb5.js:67465-67489 placement
/**
 * 原样返回
 */
function identity(e) {
  return e;
}
//@ chunk-ae5g0zb5.js:67489-67610 placement
/**
 * 列出目录中的普通文件名（不含链接）。
 */
async function listRegularFiles(e, n) {
  return (await e.fs.list(n).catch(() => []))
    .filter((o) => o.kind === "file" && !o.isLink)
    .map((o) => o.name);
}
//@ chunk-ae5g0zb5.js:67610-67648 placement
/**
 * 控制台文本缓存
 */
var consoleTextCache = new Map();
var MAX_CONSOLE_ENTRIES = 160;
var MAX_CONSOLE_BYTES = 8388608;
var consoleBytes = 0;
//@ chunk-ae5g0zb5.js:67648-68165 placement
async function readRunFile(e, n, r, o, s = MAX_RUN_FILE_BYTES) {
  let a = `${n}/${o}`;
  let i = `${r}/${o}`;
  let c = await statInsideRun(e, a, i, "file", s);
  if (c === undefined) return;
  let _ = consoleTextCache.get(i);
  if (_?.size === c.size && _.mtimeMs === c.mtimeMs) {
    consoleTextCache.delete(i);
    consoleTextCache.set(i, _);
    return _.text;
  }
  let S = await e.fs.read(a).catch(() => {
    return;
  });
  let w = S !== undefined && Buffer.byteLength(S) === c.size ? S : undefined;
  if (w !== undefined) {
    consoleBytes -= consoleTextCache.get(i)?.text.length ?? 0;
    consoleTextCache.delete(i);
    consoleTextCache.set(i, {
      size: c.size,
      mtimeMs: c.mtimeMs,
      text: w,
    });
    consoleBytes += w.length;
    for (let [f, b] of consoleTextCache) {
      if (consoleTextCache.size <= MAX_CONSOLE_ENTRIES && consoleBytes <= MAX_CONSOLE_BYTES) break;
      consoleTextCache.delete(f);
      consoleBytes -= b.text.length;
    }
  }
  return w;
}
//@ chunk-ae5g0zb5.js:68165-68474 placement
async function RUN_PROGRESS_FILES(e, n, r, o) {
  return parseRunProgress({
    progress: await readRunFile(e, n, r, "progress.ndjson"),
    names: await readRunFile(e, n, r, "names.json", MAX_SCREENSHOT_BYTES),
    decisions: await readRunFile(e, n, r, "decisions.json", MAX_SCREENSHOT_BYTES),
    hasResults: o.includes("results.json"),
    hasLog: o.includes("log.md"),
    results: o.includes("results.json")
      ? await readRunFile(e, n, r, "results.json", MAX_SCREENSHOT_BYTES)
      : undefined,
  });
}
//@ chunk-ae5g0zb5.js:68474-68612 placement
/**
 * 读取已结束运行的进度，未结束返回 null。
 */
async function readFinishedRun(e, n, r) {
  if ((await statInsideRun(e, n, r, "dir")) === undefined) return null;
  let o = await RUN_PROGRESS_FILES(e, n, r, await listRegularFiles(e, n));
  return o?.finished === true ? o : null;
}
//@ chunk-ae5g0zb5.js:68612-68630 placement
/**
 * 50
 */
var MAX_LISTED_RUN_FILES = 50;
var laterRunCache = null;
//@ chunk-ae5g0zb5.js:68630-69002 placement
/**
 * 运行目录里是否有早于运行开始时间的文件（结果缓存）。
 */
async function hasOlderRunFiles(e, n, realPath, name) {
  let s = `${n}
${name}`;
  if (laterRunCache?.key === s) return laterRunCache.isLater;
  let timestampFromName = parseTimestampFromName(name);
  let i = `${n}/${SPECS_DIR}`;
  let c = `${realPath}/${SPECS_DIR}`;
  let _ = false;
  if (timestampFromName !== null && (await statInsideRun(e, i, c, "dir")) !== undefined) {
    let sliced = (await listRegularFiles(e, i))
      .filter((w) => specStems([w]).length === 1)
      .slice(0, MAX_LISTED_RUN_FILES);
    for (let w of sliced) {
      let f = await statInsideRun(e, `${i}/${w}`, `${c}/${w}`, "file");
      if (f !== undefined && f.mtimeMs < timestampFromName) {
        _ = true;
        break;
      }
    }
  }
  laterRunCache = {
    key: s,
    isLater: _,
  };
  return _;
}
//@ chunk-ae5g0zb5.js:69002-69258 placement
/**
 * 运行子目录中是否有文件。
 */
async function hasRunSubfiles(e, n, r) {
  let o = `${n}/${SPECS_DIR}`;
  let s = `${r}/${SPECS_DIR}`;
  if ((await statInsideRun(e, o, s, "dir")) === undefined) return false;
  let sliced = (await listRegularFiles(e, o))
    .filter((i) => specStems([i]).length === 1)
    .slice(0, MAX_LISTED_RUN_FILES);
  for (let i of sliced)
    if ((await statInsideRun(e, `${o}/${i}`, `${s}/${i}`, "file")) !== undefined) return true;
  return false;
}
//@ chunk-ae5g0zb5.js:69258-69339 placement
/**
 * 正在准备/读代码/写测试
 */
function isRunPreparing(e) {
  return e.isPreparing === true || e.isReadingCode || e.isWritingTests === true;
}
//@ chunk-ae5g0zb5.js:69339-69745 placement
async function findAppPackageJson(e, n) {
  try {
    let realPath = (
      await e.fs.stat(n, {
        resolve: true,
      })
    ).realPath;
    if (realPath === undefined) return null;
    let o = `${n.replace(/\/+$/, "")}/package.json`;
    let s = await statInsideRun(
      e,
      o,
      `${realPath.replace(/\/+$/, "")}/package.json`,
      "file",
      MAX_RUN_FILE_BYTES,
    );
    let a =
      s === undefined
        ? undefined
        : await e.fs.read(o).catch(() => {
            return;
          });
    let i = a !== undefined && Buffer.byteLength(a) === s?.size ? a : undefined;
    return capitalize_2(
      i,
      realPath
        .replace(/[\\/]+$/, "")
        .split(/[\\/]/)
        .pop() ?? "",
    );
  } catch {
    return null;
  }
}
//@ chunk-ae5g0zb5.js:69745-70052 placement
/**
 * 根据参数确定被测应用目录（项目根或其下合法子目录）。
 */
async function resolveAppDir(e, n, typedArgs) {
  let o = {
    dir: n,
    appFolder: null,
  };
  let specPath = toSpecPath(typedArgs, n);
  if (specPath === null) return o;
  try {
    let realPath = (
      await e.fs.stat(n, {
        resolve: true,
      })
    ).realPath;
    if (realPath === undefined) return o;
    let i = `${n.replace(/\/+$/, "")}/${specPath}`;
    let c = `${realPath.replace(/\/+$/, "")}/${specPath}`;
    return (await statInsideRun(e, i, c, "dir")) === undefined
      ? o
      : {
          dir: i,
          appFolder: specPath,
        };
  } catch {
    return o;
  }
}
//@ chunk-ae5g0zb5.js:70052-70221 placement
/**
 * 为运行事实补上 isLaterRun（按目录与打开时间缓存）。
 */
async function withLaterRunFlag(e, n, realPath, o, runFacts) {
  if (isRunPreparing(o))
    return {
      ...runFacts,
      isLaterRun: false,
    };
  let a = `${n}
${runFacts.openedAt}`;
  if (hasRunSubfilesCache?.key !== a)
    hasRunSubfilesCache = {
      key: a,
      has: await hasRunSubfiles(e, n, realPath),
    };
  return {
    ...runFacts,
    isLaterRun: hasRunSubfilesCache.has,
  };
}
//@ chunk-ae5g0zb5.js:70221-70247 placement
/**
 * 最近运行目录缓存（5 秒）
 */
var latestRunCache = null;
var latestRunCacheMs = 5000;
var MAX_RECENT_RUN_DIRS = 12;
//@ chunk-ae5g0zb5.js:70247-70447 placement
/**
 * 找出本机创建的最近若干个运行目录。
 */
async function findMadeHereRuns(e, n) {
  let isMadeHere = claudeTestState.isMadeHere;
  if (isMadeHere === undefined) return [];
  let sliced = [...n].sort(compareRunIds).reverse().slice(0, MAX_RECENT_RUN_DIRS);
  let results = await Promise.all(sliced.map((a) => isMadeHere(`${e}/${a}`).catch(() => false)));
  return sliced.filter((a, i) => results[i]);
}
//@ chunk-ae5g0zb5.js:70447-70459 placement
/**
 * 子文件存在性缓存
 */
var hasRunSubfilesCache = null;
//@ chunk-ae5g0zb5.js:70459-70489 placement
/**
 * 清空运行目录相关缓存
 */
function resetRunDirCaches() {
  hasRunSubfilesCache = null;
  latestRunCache = null;
}
//@ chunk-ae5g0zb5.js:70489-73010 placement
/**
 * 读取运行目录（pane.json、proposed/）得到面板需要的事实与截图名。
 */
async function readRunFolderFacts(e, dir, openedAt, o, s, a = false) {
  let runFacts = createRunFacts(openedAt, s);
  let c = {
    facts: runFacts,
    pictureStem: null,
    runRel: null,
    runReal: null,
  };
  try {
    let realPath = (
      await e.fs.stat(dir, {
        resolve: true,
      })
    ).realPath;
    if (realPath === undefined) return c;
    let w = `${dir}/${RUNS_DIR}`;
    let f = `${realPath}/${RUNS_DIR}`;
    let b = await statInsideRun(e, w, f, "dir");
    if (b === undefined)
      return {
        ...c,
        facts: await withLaterRunFlag(e, dir, realPath, s, runFacts),
      };
    if (
      latestRunCache?.real !== f ||
      latestRunCache.mtimeMs !== b.mtimeMs ||
      o - latestRunCache.at > latestRunCacheMs
    )
      latestRunCache = {
        real: f,
        mtimeMs: b.mtimeMs,
        at: o,
        names: (await e.fs.list(w).catch(() => []))
          .filter((D) => D.kind === "dir" && !D.isLink)
          .map((D) => D.name)
          .filter((D) => RUN_ID_RE.test(D)),
      };
    let madeHereRuns = await findMadeHereRuns(
      f,
      latestRunCache.names.filter((D) => (parseTimestampFromName(D) ?? 0) <= o + APP_START_TIMEOUT_MS),
    );
    let F = latestRunId(madeHereRuns);
    if (F === null)
      return {
        ...c,
        facts: await withLaterRunFlag(e, dir, realPath, s, runFacts),
      };
    let O = `${w}/${F}`;
    let j = `${f}/${F}`;
    let se = await statInsideRun(e, O, j, "dir");
    if (se === undefined || (!a && se.mtimeMs < openedAt - 1800000))
      return {
        ...c,
        facts: await withLaterRunFlag(e, dir, realPath, s, runFacts),
      };
    let J = await listRegularFiles(e, O);
    let ne = await RUN_PROGRESS_FILES(e, O, j, J);
    let ce = a && se.mtimeMs < openedAt - 2000 && ne?.finished === true;
    if (!ce && se.mtimeMs < openedAt - 2000 && (ne?.finished !== false || se.mtimeMs < openedAt - 1800000))
      return {
        ...c,
        facts: await withLaterRunFlag(e, dir, realPath, s, runFacts),
      };
    let pe = summarizeRunStart(await readRunFile(e, O, j, "pane.json", MAX_PANE_FILE_BYTES));
    let ie = earlierRunIds(madeHereRuns, F);
    let he = new Map();
    for (let D of ie) {
      let Q = `${w}/${D}`;
      let Re = `${f}/${D}`;
      let from = summarizeRunStart(await readRunFile(e, Q, Re, "pane.json", MAX_PANE_FILE_BYTES)).from;
      he.set(D, from ?? parseRunFrom(await readRunFile(e, Q, Re, FIX_JSON, MAX_PANE_FILE_BYTES)));
    }
    let R = J.includes(FIX_JSON) ? await readRunFile(e, O, j, FIX_JSON, MAX_PANE_FILE_BYTES) : undefined;
    let V = pe.from ?? parseRunFrom(R);
    he.set(F, V);
    let Z = V !== null && madeHereRuns.includes(V) && !ie.includes(V) ? [V] : [];
    let runsInSameChain = findRunsInSameChain([F, ...ie, ...Z], F, (D) => he.get(D) ?? null);
    let Qe = [];
    for (let D of runsInSameChain) {
      let finishedRun = await readFinishedRun(e, `${w}/${D}`, `${f}/${D}`);
      if (finishedRun !== null) Qe.push(finishedRun);
    }
    let We = pe.from === null ? parseFixedSpecs(R) : [];
    let Ge = [];
    if (runsInSameChain.length === 0 && We.length > 0)
      for (let D of ie) {
        let finishedRun = await readFinishedRun(e, `${w}/${D}`, `${f}/${D}`);
        if (finishedRun !== null) Ge.push(finishedRun);
      }
    let earlier = Qe.length > 0 ? countResults(Qe) : Ge.length > 0 ? findLatestFailingRun(Ge, We) : null;
    let tn = `${O}/proposed`;
    let et = ne === null && (await statInsideRun(e, tn, `${j}/proposed`, "dir")) !== undefined;
    let C = et
      ? longerOf(
          readSpecOutline(await readRunFile(e, O, j, `proposed/${OUTLINE_SUFFIX}`, MAX_PANE_FILE_BYTES)),
          formatAskedSpecs(await readRunFile(e, O, j, OUTLINE_ASKED_JSON, MAX_PANE_FILE_BYTES)),
        )
      : null;
    let L = C?.map((D) => D.stem) ?? null;
    let Y = et ? specStems(await listRegularFiles(e, tn)) : [];
    let de = L ?? Y;
    let q = new Map(C?.map((D) => [D.stem, D]) ?? []);
    let be = [];
    for (let D of de) {
      let Q = q.get(D);
      let Re =
        Y.includes(D) || Q === undefined
          ? stripHtmlComments(D, await readRunFile(e, O, j, `proposed/${D}.md`, MAX_PANE_FILE_BYTES))
          : Q;
      be.push(
        Q?.walled === true && Re.walled !== true
          ? {
              ...Re,
              walled: true,
            }
          : Re,
      );
    }
    let gt = filterWalled(
      be,
      et &&
        J.includes("signin.json") &&
        parseConsentAnswer(await readRunFile(e, O, j, "signin.json", MAX_PANE_FILE_BYTES)),
    );
    let isLaterRun = await hasOlderRunFiles(e, dir, realPath, F);
    return {
      facts: {
        ...runFacts,
        ...resolveCodeReadingFlags(s, gt.length),
        isLaterRun,
        finishedAt: ne?.finished === true ? (helperRuntimeState.facts?.finishedAt ?? o) : null,
        hasRunFolder: true,
        hasLook: J.some((D) => /^look-\d{1,2}\.png$/.test(D)),
        proposed: gt,
        ...(L !== null && {
          hasOutline: true,
        }),
        note: pe,
        run: ne,
        runId: F,
        earlier,
        ...(We.length > 0 && {
          isFixRerun: true,
          fixedStems: We,
        }),
        ...(ce && {
          isKept: true,
        }),
      },
      pictureStem: pickFocusStem(ne, J),
      runRel: O,
      runReal: j,
    };
  } catch {
    return c;
  }
}
//@ chunk-ae5g0zb5.js:73010-73157 placement
/**
 * 选要展示的规格：第一个失败的、最后完成的或 look-1。
 */
function pickFocusStem(e, n) {
  return (
    (e?.finished === true ? e.rows.find((o) => o.verdict === "FAIL")?.stem : undefined) ??
    e?.lastDone ??
    (n.includes("look-1.png") ? "look-1" : null)
  );
}
//@ chunk-ae5g0zb5.js:73157-73495 placement
async function readScreenshot(e, runRel, runReal, pictureStem) {
  let s = `${pictureStem}.png`;
  if (s.includes("/") || s.startsWith(".")) return;
  let a = `${runRel}/${s}`;
  let i = await statInsideRun(e, a, `${runReal}/${s}`, "file", MAX_LIVE_HTML_BYTES);
  if (i === undefined) return;
  let c = await e.fs
    .read(a, {
      as: "bytes",
    })
    .catch(() => {
      return;
    });
  return c !== undefined &&
    c.base64.length === Math.ceil(i.size / 3) * 4 &&
    c.base64.startsWith(IVBORW0KGGO) &&
    isValidPngHeader(c.base64)
    ? c.base64
    : undefined;
}
//@ chunk-ae5g0zb5.js:73495-73507 placement
/**
 * 4096
 */
var MAX_PNG_DIMENSION = 4096;
//@ chunk-ae5g0zb5.js:73507-73756 placement
/**
 * 检查 base64 PNG 的 IHDR 头与宽高上限。
 */
function isValidPngHeader(e) {
  let n;
  try {
    n = atob(e.slice(0, 44));
  } catch {
    return false;
  }
  let r = (o) =>
    ((n.charCodeAt(o) << 24) >>> 0) +
    (n.charCodeAt(o + 1) << 16) +
    (n.charCodeAt(o + 2) << 8) +
    n.charCodeAt(o + 3);
  return (
    n.length >= 24 &&
    n.slice(12, 16) === "IHDR" &&
    r(16) > 0 &&
    r(16) <= MAX_PNG_DIMENSION &&
    r(20) > 0 &&
    r(20) <= MAX_PNG_DIMENSION
  );
}
//@ chunk-ae5g0zb5.js:73756-74043 placement
async function writeLiveReport(e, n, r) {
  if (!RUN_ID_RE.test(r) || !isAbsolute(n)) return;
  let o = resolve(await realpath(n).catch(() => n));
  let s =
    basename(o)
      .replace(/[^A-Za-z0-9._-]/g, "_")
      .slice(0, 48) +
    "-" +
    createHash("sha256").update(o).digest("hex");
  let a = join(e, "live", s, r, "live.html");
  return (
    await lstat(a).catch(() => {
      return;
    })
  )?.isFile() === true
    ? pathToFileURL(a).href
    : undefined;
}
//@ chunk-ae5g0zb5.js:74043-74055 placement
/**
 * 1024
 */
var INSTALL_PROGRESS_BYTES = 1024;
//@ chunk-ae5g0zb5.js:74055-74120 placement
/**
 * 写入 install-progress.json
 */
async function writeInstallProgress(e) {
  return writeFileAtomic(join(e, "install-progress.json"), INSTALL_PROGRESS_BYTES);
}
//@ chunk-ae5g0zb5.js:74120-74788 placement
/**
 * 校验 made-here 硬链接标记（同 inode、nlink=2），确认运行目录由本机生成。
 */
async function isMadeHereMarker(e, n) {
  try {
    let r = await lstat(n, {
      bigint: true,
    });
    if (!r.isDirectory() || (await realpath(n)) !== resolve(n)) return false;
    let [o, s] = await Promise.all([
      lstat(join(n, "made-here"), {
        bigint: true,
      }),
      lstat(join(n, "made-here.again"), {
        bigint: true,
      }),
    ]);
    if (!o.isFile() || !s.isFile() || o.nlink !== 2n || o.ino !== s.ino || o.dev !== s.dev) return false;
    let [a, i] = await Promise.all([
      writeFileAtomic(join(n, "made-here"), MADE_HERE_BYTES),
      writeFileAtomic(join(e, "made-here.key"), MADE_HERE_KEY_BYTES, true),
    ]);
    let c = /^mac: ([0-9a-f]{64})$/m.exec(a ?? "")?.[1];
    if (c === undefined || i === undefined || !/^[0-9a-f]{64}$/.test(i)) return false;
    let _ = await lstat(n, {
      bigint: true,
    });
    if (!_.isDirectory() || _.ino !== r.ino || _.dev !== r.dev) return false;
    let S = createHmac("sha256", i).update(basename(n)).digest();
    return timingSafeEqual(Buffer.from(c, "hex"), S);
  } catch {
    return false;
  }
}
//@ chunk-ae5g0zb5.js:74788-75012 placement
async function writeMadeHereKey(e) {
  let n = join(e, "made-here.key");
  let r = `${n}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    await writeFile(r, randomBytes(32).toString("hex"), {
      flag: "wx",
      mode: 384,
    });
    await link(r, n);
  } catch {
  } finally {
    await unlink(r).catch(() => {
      return;
    });
  }
}
//@ chunk-ae5g0zb5.js:75012-75029 placement
/**
 * 256
 */
var MADE_HERE_BYTES = 256;
var MADE_HERE_KEY_BYTES = 64;
//@ chunk-ae5g0zb5.js:75029-75434 placement
async function writeFileAtomic(e, n, r = false) {
  let o = await open(
    e,
    getPlatform() === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  ).catch(() => {
    return;
  });
  if (o === undefined) return;
  try {
    let stats = await o.stat();
    if (!stats.isFile() || stats.size > n || (r && getPlatform() !== "windows" && (stats.mode & 63) !== 0))
      return;
    let a = Buffer.alloc(n);
    let { bytesRead } = await o.read(a, 0, n, 0);
    return a.subarray(0, bytesRead).toString("utf8");
  } catch {
    return;
  } finally {
    await o.close().catch(() => {
      return;
    });
  }
}
//@ chunk-ae5g0zb5.js:75604-75760 placement
/**
 * 逐个比较/写入安装文件，返回第一个内容不同的文件名。
 */
async function findDifferingInstalledFile(e, n) {
  for (let [key, value] of Object.entries(n)) {
    let s = {
      differs: false,
    };
    await retryTransient(async () => {
      s.differs = await writeFileIfAbsent(join(e, key), value);
    });
    if (s.differs) return key;
  }
  return;
}
//@ chunk-ae5g0zb5.js:75760-75958 placement
/**
 * 文件已存在则比较内容；不存在则创建（目录 0700），并发写入时容忍相同内容。
 */
async function writeFileIfAbsent(e, n) {
  let r = Buffer.byteLength(n);
  let fileNoFollow = await readFileNoFollow(e, r);
  if (fileNoFollow !== undefined) return fileNoFollow !== n;
  try {
    await mkdir(dirname(e), {
      recursive: true,
      mode: 448,
    });
    await saveStatsCache(e, n);
  } catch (error) {
    if ((await readFileNoFollow(e, r)) !== n) throw error;
  }
  return false;
}
//@ chunk-ae5g0zb5.js:75958-76247 placement
async function readFileNoFollow(e, n) {
  try {
    let r = await open(e, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK | READ_LIMITS);
    try {
      let stats = await r.stat();
      return stats.isFile() && stats.nlink < 2 && stats.size === n
        ? await r.readFile({
            encoding: "utf8",
          })
        : false;
    } finally {
      await r.close();
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
