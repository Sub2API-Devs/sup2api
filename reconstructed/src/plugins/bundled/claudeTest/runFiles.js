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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  resolve,
  resolve as resolve_2,
  basename,
  basename as basename_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
} from "path";
import {
  realpath,
  realpath as realpath_2,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  writeFile,
  link,
  unlink,
  open,
  open as open_2,
  mkdir,
} from "fs/promises";
import { createHash, createHmac, timingSafeEqual, randomBytes, randomBytes as randomBytes_2 } from "crypto";
import { pathToFileURL } from "url";
import { constants, constants as constants_2 } from "fs";
import { RUN_ID_RE, toSpecPath, claudeTestState, Is, Ns } from "./appFacts.js";
import { Ps, xs, pd } from "./panelView.js";
import { parseRunProgress, mn } from "./progress.js";
import {
  It,
  compareRunIds,
  createRunFacts,
  Ot,
  Gs,
  summarizeRunStart,
  Us,
  parseRunFrom,
  findRunsInSameChain,
  parseFixedSpecs,
  countResults,
  findLatestFailingRun,
  qs,
  readSpecOutline,
  zs,
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

/**
 * 从 YYYY-MM-DDTHH-MM-SS 形式的名字里解析本地时间戳。与 cron 无关。
 */
//@ chunk-ae5g0zb5.js:46641-46894 placement = nextCronRunMs (0.698)
function parseTimestampFromName(name) {
  let n = RUN_ID_RE.test(name) ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})/.exec(name) : null;
  if (n === null) return null;
  let [r = NaN, o = NaN, s = NaN, a = NaN, i = NaN, c = NaN] = n.slice(1).map(Number),
    time = new Date(r, o - 1, s, a, i, c).getTime();
  return Number.isFinite(time) ? time : null;
}
/**
 * 按终端列数与可用行数计算截图显示尺寸与左边距；太小时返回 null。
 */
//@ chunk-ae5g0zb5.js:66716-67006 placement
function fitScreenshotSize(e, n = Number.POSITIVE_INFINITY) {
  let min = Math.min(255, Math.max(1, Math.floor(e))),
    max = Math.max(1, Math.round((min / Ps) * xs));
  if (max <= n) return { columns: min, rows: max, left: 0 };
  let floored = Math.floor(n);
  if (floored < pd) return null;
  let min_2 = Math.min(min, Math.round((floored / xs) * Ps));
  return { columns: min_2, rows: floored, left: Math.floor((min - min_2) / 2) };
}
//@ chunk-ae5g0zb5.js:67006-67247 placement
var MAX_RUN_FILE_BYTES = 2097152,
  fd = 120000,
  Ie = 65536,
  FIX_JSON = "fix.json",
  Cr = 262144,
  md = 2097152,
  IVBORW0KGGO = "iVBORw0KGgo",
  y = {
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
/**
 * stat 运行目录中的路径：必须不是链接、类型相符、真实路径与预期一致且不超过大小上限。
 */
//@ chunk-ae5g0zb5.js:67247-67465 placement
async function statInsideRun(e, n, r, o, s = Number.POSITIVE_INFINITY) {
  let a = await e.fs.stat(n, { resolve: !0 }).catch(() => {
    return;
  });
  return a !== void 0 &&
    !a.isLink &&
    a.kind === o &&
    a.realPath !== void 0 &&
    mi(a.realPath) === mi(r) &&
    a.size <= s
    ? a
    : void 0;
}
//@ chunk-ae5g0zb5.js:67465-67489 placement
function mi(e) {
  return e;
}
/**
 * 列出目录中的普通文件名（不含链接）。
 */
//@ chunk-ae5g0zb5.js:67489-67610 placement
async function listRegularFiles(e, n) {
  return (await e.fs.list(n).catch(() => []))
    .filter((o) => o.kind === "file" && !o.isLink)
    .map((o) => o.name);
}
//@ chunk-ae5g0zb5.js:67610-67648 placement
var xe = new Map(),
  _d = 160,
  hd = 8388608,
  yn = 0;
//@ chunk-ae5g0zb5.js:67648-68165 placement
async function readRunFile(e, n, r, o, s = MAX_RUN_FILE_BYTES) {
  let a = `${n}/${o}`,
    i = `${r}/${o}`,
    c = await statInsideRun(e, a, i, "file", s);
  if (c === void 0) return;
  let _ = xe.get(i);
  if (_?.size === c.size && _.mtimeMs === c.mtimeMs) return (xe.delete(i), xe.set(i, _), _.text);
  let S = await e.fs.read(a).catch(() => {
      return;
    }),
    w = S !== void 0 && Buffer.byteLength(S) === c.size ? S : void 0;
  if (w !== void 0) {
    ((yn -= xe.get(i)?.text.length ?? 0),
      xe.delete(i),
      xe.set(i, { size: c.size, mtimeMs: c.mtimeMs, text: w }),
      (yn += w.length));
    for (let [f, b] of xe) {
      if (xe.size <= _d && yn <= hd) break;
      (xe.delete(f), (yn -= b.text.length));
    }
  }
  return w;
}
//@ chunk-ae5g0zb5.js:68165-68474 placement
async function RUN_PROGRESS_FILES(e, n, r, o) {
  return parseRunProgress({
    progress: await readRunFile(e, n, r, "progress.ndjson"),
    names: await readRunFile(e, n, r, "names.json", Cr),
    decisions: await readRunFile(e, n, r, "decisions.json", Cr),
    hasResults: o.includes("results.json"),
    hasLog: o.includes("log.md"),
    results: o.includes("results.json") ? await readRunFile(e, n, r, "results.json", Cr) : void 0,
  });
}
/**
 * 读取已结束运行的进度，未结束返回 null。
 */
//@ chunk-ae5g0zb5.js:68474-68612 placement
async function readFinishedRun(e, n, r) {
  if ((await statInsideRun(e, n, r, "dir")) === void 0) return null;
  let o = await RUN_PROGRESS_FILES(e, n, r, await listRegularFiles(e, n));
  return o?.finished === !0 ? o : null;
}
//@ chunk-ae5g0zb5.js:68612-68630 placement
var wi = 50,
  Dr = null;
/**
 * 运行目录里是否有早于运行开始时间的文件（结果缓存）。
 */
//@ chunk-ae5g0zb5.js:68630-69002 placement
async function hasOlderRunFiles(e, n, r, o) {
  let s = `${n}
${o}`;
  if (Dr?.key === s) return Dr.isLater;
  let a = parseTimestampFromName(o),
    i = `${n}/${It}`,
    c = `${r}/${It}`,
    _ = !1;
  if (a !== null && (await statInsideRun(e, i, c, "dir")) !== void 0) {
    let sliced = (await listRegularFiles(e, i)).filter((w) => mn([w]).length === 1).slice(0, wi);
    for (let w of sliced) {
      let f = await statInsideRun(e, `${i}/${w}`, `${c}/${w}`, "file");
      if (f !== void 0 && f.mtimeMs < a) {
        _ = !0;
        break;
      }
    }
  }
  return ((Dr = { key: s, isLater: _ }), _);
}
/**
 * 运行子目录中是否有文件。
 */
//@ chunk-ae5g0zb5.js:69002-69258 placement
async function hasRunSubfiles(e, n, r) {
  let o = `${n}/${It}`,
    s = `${r}/${It}`;
  if ((await statInsideRun(e, o, s, "dir")) === void 0) return !1;
  let sliced = (await listRegularFiles(e, o)).filter((i) => mn([i]).length === 1).slice(0, wi);
  for (let i of sliced) if ((await statInsideRun(e, `${o}/${i}`, `${s}/${i}`, "file")) !== void 0) return !0;
  return !1;
}
//@ chunk-ae5g0zb5.js:69258-69339 placement
function Ed(e) {
  return e.isPreparing === !0 || e.isReadingCode || e.isWritingTests === !0;
}
//@ chunk-ae5g0zb5.js:69339-69745 placement
async function findAppPackageJson(e, n) {
  try {
    let realPath = (await e.fs.stat(n, { resolve: !0 })).realPath;
    if (realPath === void 0) return null;
    let o = `${n.replace(/\/+$/, "")}/package.json`,
      s = await statInsideRun(
        e,
        o,
        `${realPath.replace(/\/+$/, "")}/package.json`,
        "file",
        MAX_RUN_FILE_BYTES,
      ),
      a =
        s === void 0
          ? void 0
          : await e.fs.read(o).catch(() => {
              return;
            }),
      i = a !== void 0 && Buffer.byteLength(a) === s?.size ? a : void 0;
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
/**
 * 根据参数确定被测应用目录（项目根或其下合法子目录）。
 */
//@ chunk-ae5g0zb5.js:69745-70052 placement
async function resolveAppDir(e, n, r) {
  let o = { dir: n, appFolder: null },
    s = toSpecPath(r, n);
  if (s === null) return o;
  try {
    let realPath = (await e.fs.stat(n, { resolve: !0 })).realPath;
    if (realPath === void 0) return o;
    let i = `${n.replace(/\/+$/, "")}/${s}`,
      c = `${realPath.replace(/\/+$/, "")}/${s}`;
    return (await statInsideRun(e, i, c, "dir")) === void 0 ? o : { dir: i, appFolder: s };
  } catch {
    return o;
  }
}
/**
 * 为运行事实补上 isLaterRun（按目录与打开时间缓存）。
 */
//@ chunk-ae5g0zb5.js:70052-70221 placement
async function withLaterRunFlag(e, n, r, o, s) {
  if (Ed(o)) return { ...s, isLaterRun: !1 };
  let a = `${n}
${s.openedAt}`;
  if (Sn?.key !== a) Sn = { key: a, has: await hasRunSubfiles(e, n, r) };
  return { ...s, isLaterRun: Sn.has };
}
//@ chunk-ae5g0zb5.js:70221-70247 placement
var at = null,
  Sd = 5000,
  Td = 12;
/**
 * 找出本机创建的最近若干个运行目录。
 */
//@ chunk-ae5g0zb5.js:70247-70447 placement
async function findMadeHereRuns(e, n) {
  let isMadeHere = claudeTestState.isMadeHere;
  if (isMadeHere === void 0) return [];
  let sliced = [...n].sort(compareRunIds).reverse().slice(0, Td),
    results = await Promise.all(sliced.map((a) => isMadeHere(`${e}/${a}`).catch(() => !1)));
  return sliced.filter((a, i) => results[i]);
}
//@ chunk-ae5g0zb5.js:70447-70459 placement
var Sn = null;
//@ chunk-ae5g0zb5.js:70459-70489 placement
function Si() {
  ((Sn = null), (at = null));
}
/**
 * 读取运行目录（pane.json、proposed/）得到面板需要的事实与截图名。
 */
//@ chunk-ae5g0zb5.js:70489-73010 placement
async function readRunFolderFacts(e, n, r, o, s, a = !1) {
  let i = createRunFacts(r, s),
    c = { facts: i, pictureStem: null, runRel: null, runReal: null };
  try {
    let realPath = (await e.fs.stat(n, { resolve: !0 })).realPath;
    if (realPath === void 0) return c;
    let w = `${n}/${Ot}`,
      f = `${realPath}/${Ot}`,
      b = await statInsideRun(e, w, f, "dir");
    if (b === void 0) return { ...c, facts: await withLaterRunFlag(e, n, realPath, s, i) };
    if (at?.real !== f || at.mtimeMs !== b.mtimeMs || o - at.at > Sd)
      at = {
        real: f,
        mtimeMs: b.mtimeMs,
        at: o,
        names: (await e.fs.list(w).catch(() => []))
          .filter((D) => D.kind === "dir" && !D.isLink)
          .map((D) => D.name)
          .filter((D) => RUN_ID_RE.test(D)),
      };
    let P = await findMadeHereRuns(
        f,
        at.names.filter((D) => (parseTimestampFromName(D) ?? 0) <= o + fd),
      ),
      F = Gs(P);
    if (F === null) return { ...c, facts: await withLaterRunFlag(e, n, realPath, s, i) };
    let O = `${w}/${F}`,
      j = `${f}/${F}`,
      se = await statInsideRun(e, O, j, "dir");
    if (se === void 0 || (!a && se.mtimeMs < r - 1800000))
      return { ...c, facts: await withLaterRunFlag(e, n, realPath, s, i) };
    let J = await listRegularFiles(e, O),
      ne = await RUN_PROGRESS_FILES(e, O, j, J),
      ce = a && se.mtimeMs < r - 2000 && ne?.finished === !0;
    if (!ce && se.mtimeMs < r - 2000 && (ne?.finished !== !1 || se.mtimeMs < r - 1800000))
      return { ...c, facts: await withLaterRunFlag(e, n, realPath, s, i) };
    let pe = summarizeRunStart(await readRunFile(e, O, j, "pane.json", Ie)),
      ie = Us(P, F),
      he = new Map();
    for (let D of ie) {
      let Q = `${w}/${D}`,
        Re = `${f}/${D}`,
        from = summarizeRunStart(await readRunFile(e, Q, Re, "pane.json", Ie)).from;
      he.set(D, from ?? parseRunFrom(await readRunFile(e, Q, Re, FIX_JSON, Ie)));
    }
    let R = J.includes(FIX_JSON) ? await readRunFile(e, O, j, FIX_JSON, Ie) : void 0,
      V = pe.from ?? parseRunFrom(R);
    he.set(F, V);
    let Z = V !== null && P.includes(V) && !ie.includes(V) ? [V] : [],
      ye = findRunsInSameChain([F, ...ie, ...Z], F, (D) => he.get(D) ?? null),
      Qe = [];
    for (let D of ye) {
      let Q = await readFinishedRun(e, `${w}/${D}`, `${f}/${D}`);
      if (Q !== null) Qe.push(Q);
    }
    let We = pe.from === null ? parseFixedSpecs(R) : [],
      Ge = [];
    if (ye.length === 0 && We.length > 0)
      for (let D of ie) {
        let Q = await readFinishedRun(e, `${w}/${D}`, `${f}/${D}`);
        if (Q !== null) Ge.push(Q);
      }
    let en = Qe.length > 0 ? countResults(Qe) : Ge.length > 0 ? findLatestFailingRun(Ge, We) : null,
      tn = `${O}/proposed`,
      et = ne === null && (await statInsideRun(e, tn, `${j}/proposed`, "dir")) !== void 0,
      C = et
        ? qs(
            readSpecOutline(await readRunFile(e, O, j, `proposed/${zs}`, Ie)),
            formatAskedSpecs(await readRunFile(e, O, j, OUTLINE_ASKED_JSON, Ie)),
          )
        : null,
      L = C?.map((D) => D.stem) ?? null,
      Y = et ? mn(await listRegularFiles(e, tn)) : [],
      de = L ?? Y,
      q = new Map(C?.map((D) => [D.stem, D]) ?? []),
      be = [];
    for (let D of de) {
      let Q = q.get(D),
        Re =
          Y.includes(D) || Q === void 0
            ? stripHtmlComments(D, await readRunFile(e, O, j, `proposed/${D}.md`, Ie))
            : Q;
      be.push(Q?.walled === !0 && Re.walled !== !0 ? { ...Re, walled: !0 } : Re);
    }
    let gt = Is(be, et && J.includes("signin.json") && Ns(await readRunFile(e, O, j, "signin.json", Ie))),
      nn = await hasOlderRunFiles(e, n, realPath, F);
    return {
      facts: {
        ...i,
        ...resolveCodeReadingFlags(s, gt.length),
        isLaterRun: nn,
        finishedAt: ne?.finished === !0 ? (y.facts?.finishedAt ?? o) : null,
        hasRunFolder: !0,
        hasLook: J.some((D) => /^look-\d{1,2}\.png$/.test(D)),
        proposed: gt,
        ...(L !== null && { hasOutline: !0 }),
        note: pe,
        run: ne,
        runId: F,
        earlier: en,
        ...(We.length > 0 && { isFixRerun: !0, fixedStems: We }),
        ...(ce && { isKept: !0 }),
      },
      pictureStem: pickFocusStem(ne, J),
      runRel: O,
      runReal: j,
    };
  } catch {
    return c;
  }
}
/**
 * 选要展示的规格：第一个失败的、最后完成的或 look-1。
 */
//@ chunk-ae5g0zb5.js:73010-73157 placement
function pickFocusStem(e, n) {
  return (
    (e?.finished === !0 ? e.rows.find((row) => row.verdict === "FAIL")?.stem : void 0) ??
    e?.lastDone ??
    (n.includes("look-1.png") ? "look-1" : null)
  );
}
//@ chunk-ae5g0zb5.js:73157-73495 placement
async function readScreenshot(e, n, r, o) {
  let s = `${o}.png`;
  if (s.includes("/") || s.startsWith(".")) return;
  let a = `${n}/${s}`,
    i = await statInsideRun(e, a, `${r}/${s}`, "file", md);
  if (i === void 0) return;
  let c = await e.fs.read(a, { as: "bytes" }).catch(() => {
    return;
  });
  return c !== void 0 &&
    c.base64.length === Math.ceil(i.size / 3) * 4 &&
    c.base64.startsWith(IVBORW0KGGO) &&
    isValidPngHeader(c.base64)
    ? c.base64
    : void 0;
}
//@ chunk-ae5g0zb5.js:73495-73507 placement
var _i = 4096;
/**
 * 检查 base64 PNG 的 IHDR 头与宽高上限。
 */
//@ chunk-ae5g0zb5.js:73507-73756 placement
function isValidPngHeader(e) {
  let n;
  try {
    n = atob(e.slice(0, 44));
  } catch {
    return !1;
  }
  let r = (o) =>
    ((n.charCodeAt(o) << 24) >>> 0) +
    (n.charCodeAt(o + 1) << 16) +
    (n.charCodeAt(o + 2) << 8) +
    n.charCodeAt(o + 3);
  return n.length >= 24 && n.slice(12, 16) === "IHDR" && r(16) > 0 && r(16) <= _i && r(20) > 0 && r(20) <= _i;
}
//@ chunk-ae5g0zb5.js:73756-74043 placement
async function writeLiveReport(e, n, r) {
  if (!RUN_ID_RE.test(r) || !isAbsolute_3(n)) return;
  let o = resolve(await realpath_2(n).catch(() => n)),
    s =
      basename(o)
        .replace(/[^A-Za-z0-9._-]/g, "_")
        .slice(0, 48) +
      "-" +
      createHash("sha256").update(o).digest("hex"),
    a = join_3(e, "live", s, r, "live.html");
  return (
    await lstat_3(a).catch(() => {
      return;
    })
  )?.isFile() === !0
    ? pathToFileURL(a).href
    : void 0;
}
//@ chunk-ae5g0zb5.js:74043-74055 placement
var Fd = 1024;
//@ chunk-ae5g0zb5.js:74055-74120 placement
async function Oi(e) {
  return writeFileAtomic(join_3(e, "install-progress.json"), Fd);
}
/**
 * 校验 made-here 硬链接标记（同 inode、nlink=2），确认运行目录由本机生成。
 */
//@ chunk-ae5g0zb5.js:74120-74788 placement
async function isMadeHereMarker(e, n) {
  try {
    let r = await lstat_3(n, { bigint: !0 });
    if (!r.isDirectory() || (await realpath_2(n)) !== resolve(n)) return !1;
    let [o, s] = await Promise.all([
      lstat_3(join_3(n, "made-here"), { bigint: !0 }),
      lstat_3(join_3(n, "made-here.again"), { bigint: !0 }),
    ]);
    if (!o.isFile() || !s.isFile() || o.nlink !== 2n || o.ino !== s.ino || o.dev !== s.dev) return !1;
    let [a, i] = await Promise.all([
        writeFileAtomic(join_3(n, "made-here"), Md),
        writeFileAtomic(join_3(e, "made-here.key"), Hd, !0),
      ]),
      c = /^mac: ([0-9a-f]{64})$/m.exec(a ?? "")?.[1];
    if (c === void 0 || i === void 0 || !/^[0-9a-f]{64}$/.test(i)) return !1;
    let _ = await lstat_3(n, { bigint: !0 });
    if (!_.isDirectory() || _.ino !== r.ino || _.dev !== r.dev) return !1;
    let digest = createHmac("sha256", i).update(basename(n)).digest();
    return timingSafeEqual(Buffer.from(c, "hex"), digest);
  } catch {
    return !1;
  }
}
//@ chunk-ae5g0zb5.js:74788-75012 placement
async function writeMadeHereKey(e) {
  let n = join_3(e, "made-here.key"),
    r = `${n}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  try {
    (await writeFile(r, randomBytes(32).toString("hex"), { flag: "wx", mode: 384 }), await link(r, n));
  } catch {
  } finally {
    await unlink(r).catch(() => {
      return;
    });
  }
}
//@ chunk-ae5g0zb5.js:75012-75029 placement
var Md = 256,
  Hd = 64;
//@ chunk-ae5g0zb5.js:75029-75434 placement
async function writeFileAtomic(e, n, r = !1) {
  let o = await open(
    e,
    getPlatform() === "windows"
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
  ).catch(() => {
    return;
  });
  if (o === void 0) return;
  try {
    let stats = await o.stat();
    if (!stats.isFile() || stats.size > n || (r && getPlatform() !== "windows" && (stats.mode & 63) !== 0))
      return;
    let alloc = Buffer.alloc(n),
      { bytesRead: bytesRead } = await o.read(alloc, 0, n, 0);
    return alloc.subarray(0, bytesRead).toString("utf8");
  } catch {
    return;
  } finally {
    await o.close().catch(() => {
      return;
    });
  }
}
/**
 * 逐个比较/写入安装文件，返回第一个内容不同的文件名。
 */
//@ chunk-ae5g0zb5.js:75604-75760 placement
async function findDifferingInstalledFile(e, n) {
  for (let [r, o] of Object.entries(n)) {
    let s = { differs: !1 };
    if (
      (await retryTransient(async () => {
        s.differs = await writeFileIfAbsent(join_4(e, r), o);
      }),
      s.differs)
    )
      return r;
  }
  return;
}
/**
 * 文件已存在则比较内容；不存在则创建（目录 0700），并发写入时容忍相同内容。
 */
//@ chunk-ae5g0zb5.js:75760-75958 placement
async function writeFileIfAbsent(e, n) {
  let byteLength = Buffer.byteLength(n),
    o = await readFileNoFollow(e, byteLength);
  if (o !== void 0) return o !== n;
  try {
    (await mkdir(dirname_3(e), { recursive: !0, mode: 448 }), await saveStatsCache(e, n));
  } catch (error) {
    if ((await readFileNoFollow(e, byteLength)) !== n) throw error;
  }
  return !1;
}
//@ chunk-ae5g0zb5.js:75958-76247 placement
async function readFileNoFollow(e, n) {
  try {
    let r = await open_2(
      e,
      constants_2.O_RDONLY | constants_2.O_NOFOLLOW | constants_2.O_NONBLOCK | READ_LIMITS,
    );
    try {
      let stats = await r.stat();
      return stats.isFile() && stats.nlink < 2 && stats.size === n
        ? await r.readFile({ encoding: "utf8" })
        : !1;
    } finally {
      await r.close();
    }
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return;
    if (getErrnoCode(error) === "ELOOP") return !1;
    throw error;
  }
}

export {
  findDifferingInstalledFile,
  writeMadeHereKey,
  resolveAppDir,
  y,
  fitScreenshotSize,
  Si,
  readRunFolderFacts,
  readScreenshot,
  findAppPackageJson,
  writeLiveReport,
  Oi,
  isMadeHereMarker,
};
