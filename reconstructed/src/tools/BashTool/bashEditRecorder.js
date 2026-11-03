/**
 * tools/BashTool/bashEditRecorder.ts
 *
 * 2.1.316 新增：记录 Bash 命令改动过的文件内容
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: placement 17
 */
import { join, sep, resolve as resolve_2, dirname, relative, basename } from "path";
import { realpath, lstat, open, readlink } from "fs/promises";
import { constants } from "fs";
import {
  takeOutsideWrites,
  recordersByCwd,
  forgetRecorder,
  MAX_RECORDED_FILE_BYTES,
  MAX_RECORD_BATCH_BYTES,
  runSerialForRecorder,
  MAX_EXPANDED_PATHS,
  RECORDER_POLL_MS,
  MAX_GIT_OUTPUT_BYTES,
  RECORDER_GIT_TIMEOUT_MS,
  MAX_BASE_LISTING_BYTES,
  MAX_TOTAL_RECORD_BYTES,
  MAX_LAST_SEEN_BYTES,
} from "./writeObserver.js";
import {
  verifyKnownPrivateGitDir,
  takeBashSnapshot,
  isSafeRepoPath,
  findConvertedFiles,
  runSnapshotGit,
  getSnapshotGitArgs,
  getSnapshotGitEnv,
} from "./bashEditDiff/snapshot.js";
import { count } from "../../utils/collections.js";
import { stripBomAndCarriageReturn, isFullFileView } from "../../utils/remoteFileState.js";
import { normalizeCrlf } from "../../utils/git/gitIndexReader.js";
import {
  MAX_DIFF_FILES,
  isDiffSmallEnough,
  SHARED_READ_SPACING_MS,
  buildSnapshotGitEnv,
  cleanupSandboxAfterGit,
} from "./bashEditDiff/gitEnv.js";
import { P3 } from "../../../vendor/diff/libesm/patch/create.js";
import { logForDebugging } from "../../utils/debug.js";
import { gitExe } from "../../utils/git.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { getPlatform } from "../../utils/platform.js";
import { hasNulByteInHead } from "../../utils/fileRead.js";

//@ chunk-e6aww6q8.js:4802566-4803544 placement
/**
 * 把观察到的写入路径记录到编辑记录器：目录写入展开为其下已知文件，过滤被忽略的路径，读取文件内容（总量有上限）存入 lastSeen，溢出或异常时放弃记录。
 */
async function recordObservedWrites(e) {
  let n = takeOutsideWrites(e);
  let r = await recordersByCwd.get(e)?.catch(() => null);
  if (!r || !n || (n.paths.length === 0 && !n.overflow)) return;
  if (n.overflow) {
    forgetRecorder(e);
    return;
  }
  let filtered = n.paths.filter((path) => /[\\/]$/.test(path));
  let h = await expandDirectoryWrites(r, filtered);
  if (h === null) {
    forgetRecorder(e);
    return;
  }
  for (let q of h) rememberFileContent(r, q, null);
  let repoRelativePaths = await toRepoRelativePaths(
    r,
    n.paths.filter((path) => !/[\\/]$/.test(path)),
  );
  let S = (repoRelativePath) =>
    r.lastSeen.has(repoRelativePath) || (r.basePaths?.has(repoRelativePath) ?? false);
  let filtered_2 = repoRelativePaths.filter((repoRelativePath) => !S(repoRelativePath));
  if (filtered_2.length > 0 && !(await verifyKnownPrivateGitDir(r.base))) {
    forgetRecorder(e);
    return;
  }
  let L = filtered_2.length > 0 ? await checkIgnoredPaths(r.base, filtered_2) : new Set();
  if (L === null) {
    forgetRecorder(e);
    return;
  }
  let G = 0;
  for (let repoRelativePath of repoRelativePaths) {
    if (L.has(repoRelativePath)) continue;
    let min = Math.min(MAX_RECORDED_FILE_BYTES, MAX_RECORD_BATCH_BYTES - G);
    let Se = await statForRecorder(join(r.realRoot, repoRelativePath), min);
    if (Se === "missing" || Se === "not-a-file") {
      if (S(repoRelativePath)) rememberFileContent(r, repoRelativePath, null);
    } else if (Buffer.isBuffer(Se)) {
      G += Se.length;
      rememberFileContent(r, repoRelativePath, Se);
    } else if (typeof Se === "object") {
      G += Se.link.length;
      rememberFileContent(r, repoRelativePath, Se.link);
    } else if (Se === "too-large" && min < MAX_RECORDED_FILE_BYTES) {
      forgetRecorder(e);
      return;
    } else if (Se === "too-large" || Se === "unreadable") {
      r.lastSeenBytes -= r.lastSeen.get(repoRelativePath)?.content?.length ?? 0;
      r.lastSeen.delete(repoRelativePath);
    }
  }
  if (r.evicted) forgetRecorder(e);
}
//@ chunk-e6aww6q8.js:4803544-4803925 placement
/**
 * 为仓库启动编辑记录器（每个 cwd 一个）：拍快照、取真实根路径与基线文件列表，失败时清除。
 */
function startEditRecorder(e) {
  let n = recordersByCwd.get(e);
  if (!n) {
    let takenAt = Date.now();
    let s = takeBashSnapshot(e)
      .then(async (h) => {
        let y = await realpath(e).catch(() => null);
        return h && h !== "unavailable" && y !== null
          ? {
              base: h,
              realRoot: y,
              basePaths: await listBaseTreePaths(h),
              lastSeen: new Map(),
              lastSeenBytes: 0,
              evicted: false,
              takenAt,
            }
          : null;
      })
      .catch(() => null)
      .then((h) => {
        if (h === null && recordersByCwd.get(e) === s) recordersByCwd.delete(e);
        return h;
      });
    n = s;
    recordersByCwd.set(e, s);
  }
  return n.then((r) => r !== null);
}
//@ chunk-e6aww6q8.js:4803925-4804014 placement
/**
 * 串行地记录命令改动过的文件内容（缺失、过大、不可读分别标记）。
 */
function recordEditedFilesSerially(e, paths, overflow, s, h = Number.POSITIVE_INFINITY, shared = false) {
  return runSerialForRecorder(e, () => recordEditedFiles(e, paths, overflow, s, h, shared));
}
//@ chunk-e6aww6q8.js:4804014-4806455 placement
/**
 * 记录 Bash 命令改动过的文件内容（缺失、过大、不可读都单独标记）。
 */
async function recordEditedFiles(e, n, r, s, h, y) {
  let w = () => {
    forgetRecorder(e);
    return {
      files: [],
      moreFiles: 0,
      unavailable: true,
    };
  };
  try {
    let L = await recordersByCwd.get(e);
    if (!L || L.takenAt > h || r || n.length > MAX_EXPANDED_PATHS) return w();
    let G = new Set(n.filter((gt) => gt.endsWith(sep) && gt.length > 1));
    let q = new Set(
      await toRepoRelativePaths(
        L,
        n.filter((gt) => !G.has(gt)),
      ),
    );
    let Z = await expandDirectoryWrites(L, [...G]);
    if (Z === null) return w();
    for (let gt of Z) q.add(gt);
    if (q.size > MAX_EXPANDED_PATHS) return w();
    if (q.size === 0) return null;
    let Se = new Map();
    let ke = 0;
    let we = [];
    for (let gt of q) {
      let At = await statForRecorder(
        join(L.realRoot, gt),
        Math.min(MAX_RECORDED_FILE_BYTES, MAX_RECORD_BATCH_BYTES - ke),
      );
      if (At === "missing") Se.set(gt, null);
      else if (At === "too-large" || At === "unreadable") {
        we.push(gt);
        L.lastSeenBytes -= L.lastSeen.get(gt)?.content?.length ?? 0;
        L.lastSeen.delete(gt);
      } else if (At === "not-a-file") {
        if (L.lastSeen.has(gt) || L.basePaths === null || L.basePaths.has(gt)) Se.set(gt, null);
      } else if (Buffer.isBuffer(At)) {
        ke += At.length;
        Se.set(gt, At);
      } else Se.set(gt, At.link);
    }
    if (!(await verifyKnownPrivateGitDir(L.base))) return w();
    let blobsFromGit = await readBlobsFromGit(L, Se, s, h);
    if (blobsFromGit === null) return w();
    let { before, fromHost, converted, tooLarge } = blobsFromGit;
    for (let gt of tooLarge) {
      Se.delete(gt);
      we.push(gt);
    }
    let ze = (gt) => !L.lastSeen.has(gt) && (L.basePaths ? !L.basePaths.has(gt) : true);
    let filtered = [
      ...[...Se].filter(([gt, At]) => At !== null && (before.get(gt) ?? null) === null).map(([gt]) => gt),
      ...we,
    ].filter(ze);
    let Je = filtered.length > 0 ? await checkIgnoredPaths(L.base, filtered) : new Set();
    if (Je === null) return w();
    let nt = count(we, (gt) => !Je.has(gt));
    let pt = [];
    let Et = [];
    let yt = performance.now() + RECORDER_POLL_MS;
    for (let [gt, At] of Se) {
      let It = before.get(gt) ?? null;
      if (Je.has(gt) || (It === null && At === null)) continue;
      let Yt =
        At !== null && fromHost.has(gt) && !isTrackedLargeOrUnreadable(At)
          ? Buffer.from(stripBomAndCarriageReturn(At.toString("utf8")), "utf8")
          : At;
      let qt = converted.get(gt);
      if (
        qt !== undefined &&
        At !== null &&
        It !== null &&
        !It.includes(`\r
`)
      ) {
        let pn = normalizeCrlf(At) ?? At;
        if (!pn.equals(It) || At.length === qt) Yt = pn;
      }
      if (It !== null && Yt !== null && It.equals(Yt)) {
        rememberFileContent(L, gt, At);
        continue;
      }
      rememberFileContent(L, gt, At);
      let Zt = join(e, gt);
      Et.push(Zt);
      if (pt.length >= MAX_DIFF_FILES || isTrackedLargeOrUnreadable(It) || isTrackedLargeOrUnreadable(Yt))
        continue;
      let rn = P3(gt, gt, It?.toString("utf8") ?? "", Yt?.toString("utf8") ?? "", "", "", {
        context: 3,
        timeout: Math.max(1, yt - performance.now()),
      });
      if (rn === undefined || !isDiffSmallEnough(rn.hunks)) continue;
      pt.push({
        filePath: Zt,
        hunks: rn.hunks.map((hunk) => ({
          ...hunk,
          lines: hunk.lines.filter((line) => line !== ""),
        })),
        ...(It === null && {
          created: true,
        }),
        ...(Yt === null && {
          deleted: true,
        }),
      });
    }
    if (L.evicted) forgetRecorder(e);
    if (Et.length === 0 && nt === 0)
      return y
        ? {
            files: [],
            moreFiles: 0,
            shared: true,
          }
        : null;
    return {
      files: pt,
      moreFiles: Et.length - pt.length + nt,
      changedFiles: [...Et, ...we.filter((gt) => !Je.has(gt)).map((gt) => join(e, gt))].slice(
        0,
        SHARED_READ_SPACING_MS,
      ),
      ...(nt > 0 && {
        unavailable: true,
      }),
      ...(y && {
        shared: true,
      }),
    };
  } catch (error) {
    logForDebugging(`bashEditRecorder: ${String(error)}`);
    return w();
  }
}
//@ chunk-e6aww6q8.js:4806455-4806859 placement
/**
 * 把被写入的目录展开为其下的已知文件（来自基线列表与上次见过的文件），超过上限或缺少基线时返回 null。
 */
async function expandDirectoryWrites(e, n) {
  let r = new Set();
  if (n.length > 0 && e.basePaths === null) return null;
  if (n.length === 0) return r;
  let repoRelativePaths = await toRepoRelativePaths(
    e,
    n.map((y) => y.slice(0, -1)),
  );
  let h = [];
  for (let repoRelativePath of repoRelativePaths.sort()) {
    let S = `${repoRelativePath}/`;
    if (!S.startsWith(h.at(-1) ?? "\x00")) h.push(S);
  }
  if (h.length === 0) return r;
  for (let y of [...(e.basePaths ?? []), ...e.lastSeen.keys()])
    if (isSafeRepoPath(y) && h.some((S) => y.startsWith(S))) {
      r.add(y);
      if (r.size > MAX_EXPANDED_PATHS) return null;
    }
  return r;
}
//@ chunk-e6aww6q8.js:4806859-4807327 placement
/**
 * 把绝对写入路径转换为仓库内的安全相对路径（解析父目录真实路径，排除嵌套仓库中的未知文件）。
 */
async function toRepoRelativePaths(e, n) {
  let realRoot = e.realRoot;
  let s = new Set();
  let h = new Map();
  let y = new Map();
  for (let S of n) {
    let w = resolve_2(S);
    if (
      /[\0-\x1f\x7f]/.test(S) ||
      (!w.startsWith(realRoot + sep) && !w.startsWith(resolve_2(e.base.repoRoot) + sep))
    )
      continue;
    let L = dirname(w);
    let G = h.get(L);
    if (G === undefined) {
      G = await realpathOfNearestAncestor(L);
      h.set(L, G);
    }
    if (G === null || (G !== realRoot && !G.startsWith(realRoot + sep))) continue;
    let joined = relative(realRoot, join(G, basename(w)))
      .split(sep)
      .join("/");
    if (!isSafeRepoPath(joined)) continue;
    if (!e.lastSeen.has(joined) && !e.basePaths?.has(joined) && (await isInsideNestedRepo(G, realRoot, y)))
      continue;
    s.add(joined);
  }
  return [...s];
}
//@ chunk-e6aww6q8.js:4807327-4807540 placement
async function isInsideNestedRepo(e, realRoot, r) {
  let s = [];
  let h = false;
  for (let y = e; y !== realRoot && y.startsWith(realRoot + sep); y = dirname(y)) {
    let S = r.get(y);
    if (S !== undefined) {
      h = S;
      break;
    }
    s.push(y);
    if (await looksLikeGitDir(join(y, ".git"))) {
      h = true;
      break;
    }
  }
  for (let y of s) r.set(y, h);
  return h;
}
//@ chunk-e6aww6q8.js:4807540-4807826 placement
async function looksLikeGitDir(e) {
  let n = await lstat(e).catch(() => null);
  if (n === null) return false;
  if (n.isDirectory())
    return lstat(join(e, "HEAD")).then(
      (s) => s.isFile(),
      () => false,
    );
  if (!n.isFile() || n.size > 4096) return false;
  let r = await statForRecorder(e, 4096);
  return Buffer.isBuffer(r) && r.subarray(0, 7).equals(Buffer.from("gitdir:"));
}
//@ chunk-e6aww6q8.js:4807826-4808157 placement
/**
 * 求路径最近的已存在祖先的真实路径并拼回剩余部分（最多 64 层）；出错返回 null。
 */
async function realpathOfNearestAncestor(e) {
  let n = [];
  let r = e;
  for (let idx = 0; idx < 64; idx++) {
    let h = await realpath(r).catch((error) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
        ? null
        : undefined,
    );
    if (h === undefined) return null;
    if (h !== null) return n.length === 0 ? h : join(h, ...n.reverse());
    let y = dirname(r);
    if (y === r) return null;
    n.push(basename(r));
    r = y;
  }
  return null;
}
//@ chunk-e6aww6q8.js:4808157-4809805 placement
/**
 * 用 git cat-file --batch 批量读取 blob 内容。
 */
async function readBlobsFromGit(e, n, r, s) {
  let h = new Map();
  let y = new Set();
  let S = new Set();
  let w = [];
  for (let key of n.keys()) {
    let Ee = e.lastSeen.get(key);
    let Ae = r?.get(join(e.base.repoRoot, key));
    if (Ae && Ae.content !== "" && isFullFileView(Ae) && Ae.timestamp < s && (!Ee || Ae.timestamp > Ee.at)) {
      h.set(key, Buffer.from(Ae.content, "utf8"));
      y.add(key);
    } else if (Ee) h.set(key, Ee.content);
    else if (e.basePaths && !e.basePaths.has(key)) h.set(key, null);
    else w.push(key);
  }
  if (w.length === 0)
    return {
      before: h,
      fromHost: y,
      converted: new Map(),
      tooLarge: S,
    };
  let L = await runGitCapped(
    e.base,
    ["cat-file", "--batch-check"],
    `${w.map((we) => `${e.base.tree}:${we}`).join(`
`)}
`,
  );
  if (L === null) return null;
  let lines = L.toString("utf8").split(`
`);
  let q = [[]];
  let Z = 0;
  let Se = 0;
  for (let [we, Ee] of w.entries()) {
    let Ae = lines[we] ?? "";
    if (Ae === "") return null;
    let parts = Ae.split(" ");
    let Me = Number(parts.at(-1));
    if (Ae.endsWith(" missing") || parts.at(-2) !== "blob") h.set(Ee, null);
    else if (!Number.isInteger(Me) || Me < 0) return null;
    else if (Me > MAX_RECORDED_FILE_BYTES || Se + Me > MAX_RECORD_BATCH_BYTES) S.add(Ee);
    else {
      Se += Me;
      if (Z + Me + 128 > MAX_GIT_OUTPUT_BYTES - MAX_RECORDED_FILE_BYTES) {
        q.push([]);
        Z = 0;
      }
      q.at(-1).push(Ee);
      Z += Me + 128;
    }
  }
  for (let we of q) {
    if (we.length === 0) continue;
    let Ee = await runGitCapped(
      e.base,
      ["cat-file", "--batch"],
      `${we.map((Ie) => `${e.base.tree}:${Ie}`).join(`
`)}
`,
    );
    if (Ee === null) return null;
    let Ae = 0;
    for (let Ie of we) {
      let index = Ee.indexOf(10, Ae);
      if (index === -1) return null;
      let str = Ee.subarray(Ae, index).toString("utf8");
      Ae = index + 1;
      if (str.endsWith(" missing")) {
        h.set(Ie, null);
        continue;
      }
      let parts = str.split(" ");
      let lt = Number(parts.at(-1));
      if (!Number.isInteger(lt) || lt < 0 || Ae + lt + 1 > Ee.length) return null;
      h.set(Ie, parts.at(-2) === "blob" ? Buffer.from(Ee.subarray(Ae, Ae + lt)) : null);
      Ae += lt + 1;
    }
  }
  let converted = await findConvertedFiles(
    e.base.repoRoot,
    e.base.gitDirectory,
    w.filter((we) =>
      n.get(we)?.includes(`\r
`),
    ),
  );
  return {
    before: h,
    fromHost: y,
    converted,
    tooLarge: S,
  };
}
//@ chunk-e6aww6q8.js:4809805-4810136 placement
/**
 * 用 git check-ignore --stdin 批量检查哪些路径被忽略，返回被忽略路径集合；git 失败返回 null。
 */
async function checkIgnoredPaths(base, n) {
  let filtered = n.filter((y) => !y.startsWith(":"));
  if (filtered.length === 0) return new Set();
  let { stdout, code } = await runSnapshotGit(
    base.repoRoot,
    base.gitDirectory,
    ["check-ignore", "-z", "--stdin", "--no-index"],
    {
      timeout: RECORDER_GIT_TIMEOUT_MS,
      input: `${filtered.join("\x00")}\x00`,
      literalPathspecs: false,
    },
  );
  return code === 0 || code === 1 ? new Set(stdout.split("\x00").filter((y) => y !== "")) : null;
}
//@ chunk-e6aww6q8.js:4810136-4810394 placement
async function listBaseTreePaths(e) {
  if (!(await verifyKnownPrivateGitDir(e))) return null;
  let { stdout, code } = await runSnapshotGit(
    e.repoRoot,
    e.gitDirectory,
    ["ls-tree", "-r", "-z", "--name-only", e.tree],
    {
      timeout: RECORDER_GIT_TIMEOUT_MS,
      maxBuffer: MAX_BASE_LISTING_BYTES,
    },
  );
  if (code !== 0 || stdout.length >= MAX_BASE_LISTING_BYTES) return null;
  return new Set(stdout.split("\x00").filter(isSafeRepoPath));
}
//@ chunk-e6aww6q8.js:4810394-4810824 placement
/**
 * 在快照用的隔离 git 环境中运行 git 命令（可传入标准输入、有超时），输出超过上限时强杀，返回输出或 null。
 */
async function runGitCapped(base, n, input) {
  try {
    let snapshotGitEnv = await buildSnapshotGitEnv(
      [gitExe(), ...getSnapshotGitArgs(), ...n],
      getSnapshotGitEnv(base.gitDirectory, base.repoRoot),
      base.gitDirectory,
    );
    if (snapshotGitEnv === null) return null;
    try {
      let h = safeSpawn(snapshotGitEnv.file, snapshotGitEnv.args, {
        cwd: base.repoRoot,
        env: snapshotGitEnv.env,
        input,
        timeout: RECORDER_GIT_TIMEOUT_MS,
        stderr: "ignore",
        windowsHide: true,
      });
      let y = [];
      let S = 0;
      h.stdout?.on("data", (L) => {
        S += L.length;
        if (S > MAX_GIT_OUTPUT_BYTES) h.kill("SIGKILL");
        else y.push(L);
      });
      return (await h).exitCode === 0 && S <= MAX_GIT_OUTPUT_BYTES ? Buffer.concat(y) : null;
    } finally {
      cleanupSandboxAfterGit(snapshotGitEnv);
    }
  } catch {
    return null;
  }
}
//@ chunk-e6aww6q8.js:4810824-4811789 placement
async function statForRecorder(e, n) {
  let r;
  try {
    r = await open(
      e,
      constants.O_RDONLY |
        (getPlatform() === "windows"
          ? 0
          : (getPlatform() === "macos" ? MAX_TOTAL_RECORD_BYTES : (constants.O_NOFOLLOW ?? 0)) |
            (constants.O_NONBLOCK ?? 0) |
            (constants.O_NOCTTY ?? 0)),
    );
  } catch (error) {
    let code = typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
    if (code === "ENOENT" || code === "ENOTDIR") return "missing";
    if (code === "ELOOP")
      return readlink(e, {
        encoding: "buffer",
      }).then(
        (y) =>
          y.length > n
            ? "too-large"
            : {
                link: y,
              },
        () => "unreadable",
      );
    return code === "EISDIR" || code === "ENXIO" ? "not-a-file" : "unreadable";
  }
  try {
    let stats = await r.stat();
    if (!stats.isFile()) return "not-a-file";
    if (!(await isSameOpenFile(r.fd, e, stats)))
      return (await lstat(e).catch(() => null))?.isSymbolicLink() ? "not-a-file" : "unreadable";
    if (stats.size > n) return "too-large";
    let h = Buffer.allocUnsafe(Math.min(n, stats.size) + 1);
    let y = 0;
    for (;;) {
      if (y === h.length) {
        if (y > n) return "too-large";
        let w = Buffer.allocUnsafe(Math.min(n + 1, h.length * 2));
        h.copy(w, 0, 0, y);
        h = w;
      }
      let { bytesRead } = await r.read(h, y, h.length - y);
      if (bytesRead === 0) break;
      y += bytesRead;
    }
    return y > n ? "too-large" : h.subarray(0, y);
  } catch {
    return "unreadable";
  } finally {
    await r.close();
  }
}
//@ chunk-e6aww6q8.js:4811789-4811984 placement
async function isSameOpenFile(e, n, r) {
  if (getPlatform() === "linux") return (await readlink(`/proc/self/fd/${e}`).catch(() => null)) === n;
  let s = await lstat(n).catch(() => null);
  return s !== null && s.isFile() && s.dev === r.dev && s.ino === r.ino;
}
//@ chunk-e6aww6q8.js:4811984-4812367 placement
/**
 * 记住文件的最近内容（LRU）：替换旧记录，总字节超过上限时从最旧开始逐出并标记 evicted。
 */
function rememberFileContent(e, repoRelativePath, r) {
  let s = e.lastSeen.get(repoRelativePath);
  if (s) {
    e.lastSeenBytes -= s.content?.length ?? 0;
    e.lastSeen.delete(repoRelativePath);
  }
  let h = r?.length ?? 0;
  while (e.lastSeenBytes + h > MAX_LAST_SEEN_BYTES && e.lastSeen.size > 0) {
    let y = e.lastSeen.keys().next().value;
    if (y === undefined) break;
    e.lastSeenBytes -= e.lastSeen.get(y)?.content?.length ?? 0;
    e.lastSeen.delete(y);
    e.evicted = true;
  }
  e.lastSeen.set(repoRelativePath, {
    content: r,
    at: Date.now(),
  });
  e.lastSeenBytes += h;
}
//@ chunk-e6aww6q8.js:4812367-4812407 placement
/**
 * 判断快照中的文件内容不可直接逐字比较（二进制/过大/不可读，由 Vys 判定）。
 */
function isTrackedLargeOrUnreadable(e) {
  return e !== null && hasNulByteInHead(e);
}
export { startEditRecorder, recordEditedFilesSerially, recordObservedWrites };
