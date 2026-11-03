/**
 * utils/fsWatchProbe.ts
 *
 * fs.watch 可用性探测（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (16)
 * attribution: placement 16
 */
import { mkdtemp, open, open as open_2, open as open_3, rm as rm_2 } from "fs/promises";
import {
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
} from "path";
import { watch, watch as watch_2, constants, constants as constants_2 } from "fs";
import { claudeTempDir } from "./tempDir.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, getErrnoCode } from "./errors.js";
import { ws } from "./fsFlags.js";
import { sleep } from "./sleep.js";
import { isDiskless } from "../bootstrap/state.js";
import { wt } from "../remote/remoteMode.js";

//@ chunk-82kqcve8.js:22866-22938 placement
var wu = 1500,
  bu = 100,
  Su = 384,
  _u = 2,
  vu = new Set(["EMFILE", "ENFILE", "ENOSPC"]);
//@ chunk-82kqcve8.js:22938-23224 placement
async function probeFsWatch(e = {}) {
  let n;
  try {
    n = await mkdtemp(join_5(e.directory ?? claudeTempDir(), "fswatch-probe-"));
  } catch (error) {
    return (logForDebugging(`[fs.watch probe] no probe dir: ${errorMessage(error)}`), "unprobed");
  }
  try {
    return await probeWatchOnFile(join_5(n, "probe"), e);
  } catch (error) {
    return (logForDebugging(`[fs.watch probe] no probe file: ${errorMessage(error)}`), "unprobed");
  } finally {
    await removeRecursiveQuietly(n);
  }
}
/**
 * 在探测文件上建立 fs.watch 并反复写入，判断事件是否触发：fired、refused 或 unprobed。
 */
//@ chunk-82kqcve8.js:23224-23616 placement
async function probeWatchOnFile(e, n) {
  let r = await getFileIdentity(e),
    s = { hasFired: !1, wasRefused: !1 },
    h = n.watch ?? watch_2,
    y;
  try {
    y = h(e, () => {
      s.hasFired = !0;
    });
  } catch (error) {
    return (
      logForDebugging(`[fs.watch probe] watch() threw: ${errorMessage(error)}`),
      Is(error) ? "refused" : "unprobed"
    );
  }
  y.on("error", (S) => {
    ((s.wasRefused ||= Is(S)), logForDebugging(`[fs.watch probe] watcher error: ${errorMessage(S)}`));
  });
  try {
    await pokeUntilFired(r, s, n);
  } finally {
    await Pu(y, n);
  }
  let w = Au(s);
  return (logForDebugging(`[fs.watch probe] verdict: ${w}`), w);
}
//@ chunk-82kqcve8.js:23616-23783 placement = getFileIdentity (0.867)
async function getFileIdentity(filePath) {
  let n = await open(filePath, "wx", Su);
  try {
    await n.write("0", 0);
    let { dev: dev, ino: ino } = await n.stat({ bigint: !0 });
    return { path: filePath, dev: dev, ino: ino };
  } finally {
    await n.close();
  }
}
//@ chunk-82kqcve8.js:23783-24041 placement
async function writeProbeFile(e, n) {
  let r = await open(e.path, constants.O_WRONLY | ws);
  try {
    let stats = await r.stat({ bigint: !0 });
    if (stats.dev !== e.dev || stats.ino !== e.ino || stats.nlink !== 1n)
      throw Error("the probe file was replaced while the probe ran");
    await r.write(String(n), 0);
  } finally {
    await r.close();
  }
}
//@ chunk-82kqcve8.js:24041-24096 placement
function Is(e) {
  let n = getErrnoCode(e);
  return n !== void 0 && vu.has(n);
}
//@ chunk-82kqcve8.js:24096-24147 placement
async function Pu(e, n) {
  (await sleep(Ls(n) * _u), e.close());
}
//@ chunk-82kqcve8.js:24147-24190 placement
function Ls(e) {
  return e.rewriteEveryMs ?? bu;
}
//@ chunk-82kqcve8.js:24190-24334 placement
async function pokeUntilFired(e, n, r) {
  let s = r.budgetMs ?? wu,
    h = Ls(r),
    startTime = performance.now(),
    w = 0;
  while (!Cu(n) && performance.now() - startTime < s) ((w += 1), await writeProbeFile(e, w), await sleep(h));
}
//@ chunk-82kqcve8.js:24334-24381 placement
function Cu(e) {
  return e.hasFired || e.wasRefused;
}
//@ chunk-82kqcve8.js:24381-24457 placement
function Au(e) {
  return e.hasFired ? "delivers" : e.wasRefused ? "refused" : "silent";
}
//@ chunk-82kqcve8.js:24457-24532 placement = convertDirectoryToZipInPlace (1)
async function removeRecursiveQuietly(e) {
  try {
    await rm_2(e, { recursive: !0, force: !0 });
  } catch {
    return;
  }
}
//@ chunk-82kqcve8.js:24532-24609 placement
function Ns(e, n) {
  let r = new Set();
  for (let s of e) if (!n.has(s)) r.add(s);
  return r;
}
//@ chunk-82kqcve8.js:24609-24673 placement
function H4t(e, n) {
  for (let r of e) if (!n.has(r)) return !1;
  return !0;
}
//@ chunk-82kqcve8.js:24673-24740 placement
var zs = 1000,
  Hs = 500,
  Tu = 1800000,
  Iu = zs + Hs + 200,
  Fu = 2000,
  $u = 2000,
  Lu = 2000;
//@ chunk-82kqcve8.js:24740-24807 placement
function Nu({ machineServesSession: e = !1 } = {}) {
  return !isDiskless() && (!wt() || e);
}

export { H4t, zs, Hs, Tu, Iu, Fu, $u, Nu, probeFsWatch, Lu, Ns };
