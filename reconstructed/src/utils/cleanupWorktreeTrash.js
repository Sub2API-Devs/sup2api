/**
 * utils/cleanupWorktreeTrash.ts
 *
 * 2.1.316 新增。清理 worktree 回收站与 git alternates。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4nhpaxz9.js (25)
 * attribution: placement 25
 */
import { sep, join, basename, dirname, resolve, isAbsolute, parse } from "path";
import { constants } from "fs";
import { createDeviceTreeHost } from "./fsAnchor/deviceTreeHost.js";
import { SIDE_GIT, CLOUD_SNAPSHOTS_DIR } from "./storage/storageKeys.js";
import { Mn, rc } from "./pathClassification.js";
import { isOnForeignMount } from "./networkPaths.js";
import { isPathAbsent, isENOENT, getErrnoCode } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { getProjectDir, canonicalizePath } from "./sessionStoragePortable.js";
import { uniq } from "./collections.js";
import { fSn } from "./windowsPathNames.js";
import { CLOUD_TRASH_DIR, Nti, $ti } from "./cloudTrash.js";
import { READ_LIMITS, tz, mMe } from "./fsBoundRead.js";
import { isSentinelInode } from "./slowOperations.js";
import { openTreeAnchor } from "./fsAnchor/treeAnchor.js";
import { cleanupSingleDirectory } from "./cleanup.js";

//@ chunk-4nhpaxz9.js:1349-1378 placement
var Y = 90000,
  WRITER_LOCKS = "writer-locks";
//@ chunk-4nhpaxz9.js:1378-1414 placement
function S(e) {
  return Date.now() - e < Y;
}
//@ chunk-4nhpaxz9.js:1414-1460 placement
var b = 8192,
  L = ".git",
  q = sep === "\\" ? /[\\/]+/ : /\/+/;
//@ chunk-4nhpaxz9.js:1460-2116 placement
async function pruneGitAlternates(e, n, t = createDeviceTreeHost()) {
  let r = { removed: 0, errors: 0, newestKeptMs: null };
  try {
    let s = await resolveAlternatePath(
      t,
      join(e, SIDE_GIT, "objects", "info", "alternates"),
      e,
      (a) => a.split(/\r?\n/, 1)[0] ?? "",
    );
    if (
      s === "absent" ||
      s === "leads_nowhere" ||
      s === "malformed" ||
      (s !== "refused" && basename(s) !== "objects")
    )
      return r;
    if (s === "refused") return (l(r), r);
    let i = dirname(s),
      stats = await t.fs.lstat(i, { bigint: !0 }),
      c = await t.fs.lstat(join(i, "HEAD")).catch(() => null);
    if (!c?.isFile() && !c?.isSymbolicLink()) return (l(r), r);
    await cleanupTrashDir(
      t,
      { kind: "git_dir", dir: i, identity: stats },
      { cutoffMs: n, isLive: await liveWriterChecker(t, e, dirname(i)), tally: r },
    );
    for (let a of await cleanupWorktreeTrash(t, i, r))
      await cleanupTrashDir(t, a, {
        cutoffMs: n,
        isLive: await liveWriterChecker(t, e, a.dir),
        tally: r,
      }).catch(() => l(r));
  } catch {
    l(r);
  }
  return r;
}
//@ chunk-4nhpaxz9.js:2116-2156 placement
function g(e) {
  e.newestKeptMs = Date.now();
}
/**
 * 规范化后比较两个路径是否相同（Windows 盘符大小写）。
 */
//@ chunk-4nhpaxz9.js:2156-2295 placement
function samePath(e, n, t = sep) {
  let [r, s] = [e, n].map((i) =>
    Mn((t === "\\" ? i.replaceAll("/", t) : i).replace(/^[a-z](?=:)/, (o) => o.toUpperCase())),
  );
  return r === s;
}
//@ chunk-4nhpaxz9.js:2295-2391 placement
function J(e, n) {
  let t = (r) => r.replace(/[A-Z]/g, (s) => s.toLowerCase());
  return samePath(e, n) || samePath(t(e), t(n));
}
//@ chunk-4nhpaxz9.js:2391-2421 placement
function l(e) {
  (e.errors++, g(e));
}
//@ chunk-4nhpaxz9.js:2421-2468 placement
var W = (e) => e.replace(/(?<![\r\n])[\r\n]+$/, "");
/**
 * 读取并解析 alternates/gitdir 指向的路径，确认无链接，返回路径或 absent/malformed/refused/leads_nowhere。
 */
//@ chunk-4nhpaxz9.js:2468-2753 placement
async function resolveAlternatePath(e, n, t, r, s) {
  let i = await readSmallFile(e, n, r);
  if (i === "absent" || i === "malformed" || i === "refused") return i;
  if (isOnForeignMount(i, t)) return "refused";
  let o = s === void 0 ? i : resolve(s, i);
  if (!isAbsolute(o)) return "refused";
  let c = await checkNoSymlinks(e, o);
  return c === "plainly" ? o : c === "missing" && !/[\r\n]/.test(i) ? "leads_nowhere" : "refused";
}
/**
 * 路径各级是否都不是符号链接（plainly/missing/refused）。
 */
//@ chunk-4nhpaxz9.js:2753-2986 placement
async function checkNoSymlinks(e, n) {
  let { root: root } = parse(n),
    r = root;
  for (let s of n.slice(root.length).split(q)) {
    if (s === "") continue;
    r = join(r, s);
    try {
      if ((await e.fs.lstat(r)).isSymbolicLink()) return "refused";
    } catch (error) {
      return isPathAbsent(error) ? "missing" : "refused";
    }
  }
  return "plainly";
}
/**
 * 读取小文件内容并解析（不存在/过大/格式错误时返回原因）。
 */
//@ chunk-4nhpaxz9.js:2986-3250 placement
async function readSmallFile(e, n, t) {
  try {
    let fileFdGated = await getFsImplementation().readFileFdGated(n, b);
    if (fileFdGated === null) {
      let stats = await e.fs.lstat(n);
      return stats.isFile() && stats.size <= b ? "refused" : "malformed";
    }
    let s = t(fileFdGated.content);
    return s === "" || s.includes("\x00") ? "malformed" : s;
  } catch (error) {
    return isENOENT(error) ? "absent" : "refused";
  }
}
/**
 * 构造判断回收项是否仍有写者锁的函数。
 */
//@ chunk-4nhpaxz9.js:3250-3398 placement
async function liveWriterChecker(e, n, t) {
  let r = dirname(dirname(n)),
    s = join(getProjectDir(await canonicalizePath(t, void 0), r), CLOUD_SNAPSHOTS_DIR),
    results = await Promise.all(uniq([n, s]).map((o) => readWriterLocks(e, o)));
  return (o) => results.some((c) => c(o));
}
/**
 * 读取写者锁目录中仍新鲜的锁。
 */
//@ chunk-4nhpaxz9.js:3398-3669 placement
async function readWriterLocks(e, n) {
  let t = join(n, WRITER_LOCKS),
    r;
  try {
    r = await e.fs.readdir(t);
  } catch (error) {
    return isENOENT(error) ? () => !1 : () => !0;
  }
  let s = new Set();
  for (let i of r) {
    let o = i.endsWith(".writer") ? await e.fs.lstat(join(t, i)).catch(() => null) : null;
    if (o !== null && S(o.mtimeMs)) s.add(i.slice(0, -7));
  }
  return (i) => s.has(i);
}
//@ chunk-4nhpaxz9.js:3669-4809 placement
async function cleanupWorktreeTrash(e, n, t) {
  let r = join(n, "worktrees"),
    s = await e.fs.lstat(r).catch((c) => (isENOENT(c) ? "absent" : null));
  if (s === "absent") {
    if (!(await e.fs.lstat(n).catch(() => null))?.isDirectory()) l(t);
    return [];
  }
  let i =
    s?.isDirectory() && (await checkNoSymlinks(e, r)) === "plainly"
      ? await e.fs.readdir(r).catch(() => null)
      : null;
  if (i === null) return (l(t), []);
  let o = [];
  for (let c of i) {
    let a = join(r, c),
      u = await e.fs.lstat(a).catch(() => null);
    if (u === null || u.isSymbolicLink()) {
      l(t);
      continue;
    }
    if (!u.isDirectory()) continue;
    let f = await resolveAlternatePath(e, join(a, "gitdir"), a, (p) => p.trimEnd(), a);
    if (f === "leads_nowhere") continue;
    if (f === "absent" || f === "refused" || f === "malformed" || basename(f) !== L) {
      l(t);
      continue;
    }
    let d = dirname(f);
    if (rc(d)) {
      l(t);
      continue;
    }
    let m = await readSmallFile(e, f, W);
    if (m === "absent" || m === "refused") {
      l(t);
      continue;
    }
    if (m === "malformed" || !m.startsWith("gitdir: ")) {
      g(t);
      continue;
    }
    let sliced = m.slice(8);
    if (isOnForeignMount(sliced, d)) {
      g(t);
      continue;
    }
    let P = await checkNoSymlinks(e, resolve(d, sliced));
    if (P === "refused") {
      l(t);
      continue;
    }
    if (P === "missing") {
      g(t);
      continue;
    }
    if (samePath(resolve(d, sliced), a)) o.push({ kind: "linked_worktree", dir: d, gitFileLine: m });
    else {
      let [p, O] = await Promise.all(
        [resolve(d, sliced), a].map((B) => e.fs.lstat(B, { bigint: !0 }).catch(() => null)),
      );
      if (p?.ino && p.dev === O?.dev && p.ino === O.ino) l(t);
      else g(t);
    }
  }
  return o;
}
/**
 * 核对锚点仍指向同一 git 目录或 worktree。
 */
//@ chunk-4nhpaxz9.js:4809-4992 placement
async function verifyGitIdentity(e, n) {
  switch (n.kind) {
    case "git_dir": {
      let stats = await e.lstat("");
      return stats.dev === n.identity.dev && fSn(stats.ino, n.identity.ino);
    }
    case "linked_worktree":
      return readGitFileMatches(e, n.gitFileLine);
  }
}
//@ chunk-4nhpaxz9.js:4992-5089 placement
var V = {
  git_dir: { trashName: CLOUD_TRASH_DIR, ignoreFile: void 0 },
  linked_worktree: { trashName: Nti, ignoreFile: $ti },
};
/**
 * 读取 .git 文件内容并核对与记录一致（防替换）。
 */
//@ chunk-4nhpaxz9.js:5089-5465 placement
async function readGitFileMatches(e, n) {
  let t = await e.open(L, constants.O_RDONLY | constants.O_NONBLOCK).catch(() => null);
  if (t === null) return !1;
  try {
    let [r, s] = await Promise.all([t.stat({ bigint: !0 }), e.lstat(L)]);
    if (r.dev !== s.dev || r.ino !== s.ino) return !1;
    let alloc = Buffer.alloc(b + 1),
      { bytesRead: bytesRead } = await t.read(alloc, 0, alloc.length, 0);
    return bytesRead <= b && W(alloc.toString("utf8", 0, bytesRead)) === n;
  } catch {
    return !1;
  } finally {
    await t.close().catch(() => {});
  }
}
/**
 * Windows 下按根与相对路径打开目录锚点。
 */
//@ chunk-4nhpaxz9.js:5465-5643 placement
function openWin32Anchor(e, n, t) {
  let { root: root, dir: dir, base: base } = e.path.parse(e.path.normalize(t));
  return n.holdOutside(
    root,
    [...dir.slice(root.length).split(e.path.sep), base].filter((o) => o !== "").join("/"),
    !0,
  );
}
/**
 * 按平台打开目录并核对 inode 与锚点一致。
 */
//@ chunk-4nhpaxz9.js:5643-6209 placement
async function verifyAnchorInode(e, n, t = n.realRoot, r) {
  let s = constants.O_DIRECTORY | READ_LIMITS,
    i = s | tz | constants.O_NOFOLLOW,
    o = await (
      n.backend === "win32_handle"
        ? openWin32Anchor(e, n, t)
        : n.backend === "darwin_at"
          ? e.fs.open(t, s | mMe)
          : t
              .split("/")
              .filter((c) => c !== "")
              .reduce(
                async (c, a) => {
                  let u = await c;
                  return e.fs.open(`/proc/self/fd/${u.fd}/${a}`, i).finally(() => u.close().catch(() => {}));
                },
                e.fs.open("/", i),
              )
    ).catch(() => null);
  if (o === null) return !1;
  try {
    let [c, a] = await Promise.all(["fd" in o ? o.stat({ bigint: !0 }) : o.stat(), r ?? n.lstat("")]);
    return !isSentinelInode(a.ino) && c.dev === a.dev && c.ino === a.ino;
  } catch {
    return !1;
  } finally {
    await o.close().catch(() => {});
  }
}
/**
 * 清理某仓库的回收站：核对路径与身份后删除过期项并移除空回收站。
 */
//@ chunk-4nhpaxz9.js:6209-6889 placement
async function cleanupTrashDir(e, n, { cutoffMs: cutoffMs, isLive: isLive, tally: tally }) {
  let dir = n.dir,
    { trashName: trashName, ignoreFile: ignoreFile } = V[n.kind];
  try {
    if (!(await e.fs.lstat(e.path.join(dir, trashName))).isDirectory()) {
      l(tally);
      return;
    }
  } catch (error) {
    if (!isENOENT(error) || (await checkNoSymlinks(e, dir)) !== "plainly") l(tally);
    return;
  }
  let a = await e.fs.realpath(dir).catch(() => null);
  if (a === null || !J(a, dir)) {
    l(tally);
    return;
  }
  let joined = e.path.join(a, trashName),
    f = await openTreeAnchor(e, { gitRoot: dir, realRoot: a }).catch(() => null);
  if (f === null || "unavailable" in f) {
    l(tally);
    return;
  }
  let d = f;
  try {
    if (
      !(await verifyAnchorInode(e, d)) ||
      (!samePath(a, dir) && !(await verifyAnchorInode(e, d, dir))) ||
      !(await verifyGitIdentity(d, n)) ||
      !(await d.lstat(trashName)).isDirectory()
    ) {
      l(tally);
      return;
    }
    (await removeExpiredTrash(e, d, trashName, joined, { cutoffMs: cutoffMs, isLive: isLive, tally: tally }),
      await removeEmptyTrashDir(e, d, trashName, joined, tally, ignoreFile));
  } catch (error) {
    if (!isENOENT(error)) l(tally);
  } finally {
    await d.close().catch(() => {});
  }
}
/**
 * 删除回收站中超过截止时间且无写者的条目。
 */
//@ chunk-4nhpaxz9.js:6889-7296 placement
async function removeExpiredTrash(e, n, t, r, { cutoffMs: cutoffMs, isLive: isLive, tally: tally }) {
  let entries = await e.fs.readdir(r);
  for (let a of entries) {
    let u = `${t}/${a}`;
    try {
      if (!(await n.lstat(u)).isDirectory()) continue;
      if (isLive(a.replace(/\.(?:staging|set-aside)$/, ""))) {
        g(tally);
        continue;
      }
      let f = await cleanupSingleDirectory(e, e.path.join(r, a));
      if (f < cutoffMs) (await removeTreeIfOld(n, e, u, cutoffMs), tally.removed++);
      else tally.newestKeptMs = Math.max(tally.newestKeptMs ?? -1 / 0, f);
    } catch (error) {
      if (error instanceof E) g(tally);
      else if (!isENOENT(error)) l(tally);
    }
  }
}
/**
 * 回收站只剩忽略文件或为空时删除它。
 */
//@ chunk-4nhpaxz9.js:7296-7688 placement
async function removeEmptyTrashDir(e, n, t, r, s, i) {
  let o = await e.fs.readdir(r).catch(() => ["?"]);
  try {
    if (i !== void 0 && o.length === 1 && o[0] === i) {
      if ((await n.lstat(`${t}/${i}`)).isFile())
        (await n.unlink(`${t}/${i}`),
          await n.rmdir(t).catch(async (c) => {
            if (getErrnoCode(c) !== "ENOTEMPTY") throw c;
            await n.create(
              `${t}/${i}`,
              Buffer.from(`*
`),
              384,
            );
          }));
    } else if (o.length === 0) await n.rmdir(t);
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTEMPTY") s.errors++;
  }
}
//@ chunk-4nhpaxz9.js:7945-7968 placement
class E extends Error {}
/**
 * 递归删除比截止时间旧的目录树（期间变新则中止）。
 */
//@ chunk-4nhpaxz9.js:7968-8365 placement
async function removeTreeIfOld(e, n, t, r) {
  if (!(Number((await e.lstat(t)).mtimeMs) < r)) throw new E();
  let s = await n.fs.readdir(n.path.join(e.realRoot, ...t.split("/"))).catch(() => []),
    i = [];
  for (let o of s) {
    let c = `${t}/${o}`;
    try {
      if ((await e.lstat(c)).isDirectory()) await removeTreeIfOld(e, n, c, r);
      else await e.unlink(c);
    } catch (error) {
      if (error instanceof E || getErrnoCode(error) === "ENOTEMPTY") throw error;
      if (!isENOENT(error)) i.push(error);
    }
  }
  if (i.length > 0) throw i[0];
  await e.rmdir(t);
}
