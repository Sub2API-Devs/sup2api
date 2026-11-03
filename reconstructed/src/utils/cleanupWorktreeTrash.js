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
import { identity, hasBackslash } from "./pathClassification.js";
import { isOnForeignMount } from "./networkPaths.js";
import { isPathAbsent, isENOENT, getErrnoCode } from "./errors.js";
import { getFsImplementation } from "./fsOperations.js";
import { getProjectDir, canonicalizePath } from "./sessionStoragePortable.js";
import { uniq } from "./collections.js";
import { sameTimestamp } from "./windowsPathNames.js";
import { CLOUD_TRASH_DIR, CLOUD_TRASH_MARKER_FILE, GITIGNORE_FILE_NAME } from "./cloudTrash.js";
import { READ_LIMITS, O_NOFOLLOW_ANY, O_NOFOLLOW_FLAG } from "./fsBoundRead.js";
import { isSentinelInode } from "./slowOperations.js";
import { openTreeAnchor } from "./fsAnchor/treeAnchor.js";
import { cleanupSingleDirectory } from "./cleanup.js";

//@ chunk-4nhpaxz9.js:1349-1378 placement
/**
 * 写锁文件算“新鲜”的时长（90 秒）。
 */
var WRITER_LOCK_FRESH_MS = 90000;
var WRITER_LOCKS = "writer-locks";
//@ chunk-4nhpaxz9.js:1378-1414 placement
/**
 * 判断写锁文件的 mtime 是否足够新。
 */
function isWriterLockFresh(mtimeMs) {
  return Date.now() - mtimeMs < WRITER_LOCK_FRESH_MS;
}
//@ chunk-4nhpaxz9.js:1414-1460 placement
/**
 * 读取 .git 指针文件的大小上限（8192）。
 */
var MAX_GIT_POINTER_FILE_BYTES = 8192;
var GIT_ENTRY_NAME = ".git";
var PATH_SEPARATOR_SPLIT_RE = sep === "\\" ? /[\\/]+/ : /\/+/;
//@ chunk-4nhpaxz9.js:1460-2116 placement
async function pruneGitAlternates(e, cutoffMs, t = createDeviceTreeHost()) {
  let r = {
    removed: 0,
    errors: 0,
    newestKeptMs: null,
  };
  try {
    let alternatePath = await resolveAlternatePath(
      t,
      join(e, SIDE_GIT, "objects", "info", "alternates"),
      e,
      (a) => a.split(/\r?\n/, 1)[0] ?? "",
    );
    if (
      alternatePath === "absent" ||
      alternatePath === "leads_nowhere" ||
      alternatePath === "malformed" ||
      (alternatePath !== "refused" && basename(alternatePath) !== "objects")
    )
      return r;
    if (alternatePath === "refused") {
      markErrorAndNewest(r);
      return r;
    }
    let i = dirname(alternatePath);
    let identity = await t.fs.lstat(i, {
      bigint: true,
    });
    let c = await t.fs.lstat(join(i, "HEAD")).catch(() => null);
    if (!c?.isFile() && !c?.isSymbolicLink()) {
      markErrorAndNewest(r);
      return r;
    }
    await cleanupTrashDir(
      t,
      {
        kind: "git_dir",
        dir: i,
        identity,
      },
      {
        cutoffMs,
        isLive: await liveWriterChecker(t, e, dirname(i)),
        tally: r,
      },
    );
    for (let a of await cleanupWorktreeTrash(t, i, r))
      await cleanupTrashDir(t, a, {
        cutoffMs,
        isLive: await liveWriterChecker(t, e, a.dir),
        tally: r,
      }).catch(() => markErrorAndNewest(r));
  } catch {
    markErrorAndNewest(r);
  }
  return r;
}
//@ chunk-4nhpaxz9.js:2116-2156 placement
/**
 * 记录最近一次保留时间。
 */
function markNewestKept(e) {
  e.newestKeptMs = Date.now();
}
//@ chunk-4nhpaxz9.js:2156-2295 placement
/**
 * 规范化后比较两个路径是否相同（Windows 盘符大小写）。
 */
function samePath(e, n, t = sep) {
  let [r, s] = [e, n].map((i) =>
    identity((t === "\\" ? i.replaceAll("/", t) : i).replace(/^[a-z](?=:)/, (o) => o.toUpperCase())),
  );
  return r === s;
}
//@ chunk-4nhpaxz9.js:2295-2391 placement
/**
 * 判断两个路径是否相同（或大小写折叠后相同）。
 */
function samePathCaseFolded(e, dir) {
  let t = (r) => r.replace(/[A-Z]/g, (s) => s.toLowerCase());
  return samePath(e, dir) || samePath(t(e), t(dir));
}
//@ chunk-4nhpaxz9.js:2391-2421 placement
/**
 * 记一次清理错误并更新最近保留时间。
 */
function markErrorAndNewest(e) {
  e.errors++;
  markNewestKept(e);
}
//@ chunk-4nhpaxz9.js:2421-2468 placement
/**
 * 去掉字符串末尾的换行。
 */
var stripTrailingNewlines = (e) => e.replace(/(?<![\r\n])[\r\n]+$/, "");
//@ chunk-4nhpaxz9.js:2468-2753 placement
/**
 * 读取并解析 alternates/gitdir 指向的路径，确认无链接，返回路径或 absent/malformed/refused/leads_nowhere。
 */
async function resolveAlternatePath(e, n, t, r, s) {
  let smallFile = await readSmallFile(e, n, r);
  if (smallFile === "absent" || smallFile === "malformed" || smallFile === "refused") return smallFile;
  if (isOnForeignMount(smallFile, t)) return "refused";
  let o = s === undefined ? smallFile : resolve(s, smallFile);
  if (!isAbsolute(o)) return "refused";
  let c = await checkNoSymlinks(e, o);
  return c === "plainly" ? o : c === "missing" && !/[\r\n]/.test(smallFile) ? "leads_nowhere" : "refused";
}
//@ chunk-4nhpaxz9.js:2753-2986 placement
/**
 * 路径各级是否都不是符号链接（plainly/missing/refused）。
 */
async function checkNoSymlinks(e, n) {
  let { root } = parse(n);
  let r = root;
  for (let s of n.slice(root.length).split(PATH_SEPARATOR_SPLIT_RE)) {
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
//@ chunk-4nhpaxz9.js:2986-3250 placement
/**
 * 读取小文件内容并解析（不存在/过大/格式错误时返回原因）。
 */
async function readSmallFile(e, n, t) {
  try {
    let fileFdGated = await getFsImplementation().readFileFdGated(n, MAX_GIT_POINTER_FILE_BYTES);
    if (fileFdGated === null) {
      let stats = await e.fs.lstat(n);
      return stats.isFile() && stats.size <= MAX_GIT_POINTER_FILE_BYTES ? "refused" : "malformed";
    }
    let s = t(fileFdGated.content);
    return s === "" || s.includes("\x00") ? "malformed" : s;
  } catch (error) {
    return isENOENT(error) ? "absent" : "refused";
  }
}
//@ chunk-4nhpaxz9.js:3250-3398 placement
/**
 * 构造判断回收项是否仍有写者锁的函数。
 */
async function liveWriterChecker(e, n, t) {
  let r = dirname(dirname(n));
  let s = join(getProjectDir(await canonicalizePath(t, undefined), r), CLOUD_SNAPSHOTS_DIR);
  let results = await Promise.all(uniq([n, s]).map((o) => readWriterLocks(e, o)));
  return (o) => results.some((c) => c(o));
}
//@ chunk-4nhpaxz9.js:3398-3669 placement
/**
 * 读取写者锁目录中仍新鲜的锁。
 */
async function readWriterLocks(e, n) {
  let t = join(n, WRITER_LOCKS);
  let r;
  try {
    r = await e.fs.readdir(t);
  } catch (error) {
    return isENOENT(error) ? () => false : () => true;
  }
  let s = new Set();
  for (let i of r) {
    let o = i.endsWith(".writer") ? await e.fs.lstat(join(t, i)).catch(() => null) : null;
    if (o !== null && isWriterLockFresh(o.mtimeMs)) s.add(i.slice(0, -7));
  }
  return (i) => s.has(i);
}
//@ chunk-4nhpaxz9.js:3669-4809 placement
async function cleanupWorktreeTrash(e, n, t) {
  let r = join(n, "worktrees");
  let s = await e.fs.lstat(r).catch((error) => (isENOENT(error) ? "absent" : null));
  if (s === "absent") {
    if (!(await e.fs.lstat(n).catch(() => null))?.isDirectory()) markErrorAndNewest(t);
    return [];
  }
  let i =
    s?.isDirectory() && (await checkNoSymlinks(e, r)) === "plainly"
      ? await e.fs.readdir(r).catch(() => null)
      : null;
  if (i === null) {
    markErrorAndNewest(t);
    return [];
  }
  let o = [];
  for (let c of i) {
    let a = join(r, c);
    let u = await e.fs.lstat(a).catch(() => null);
    if (u === null || u.isSymbolicLink()) {
      markErrorAndNewest(t);
      continue;
    }
    if (!u.isDirectory()) continue;
    let alternatePath = await resolveAlternatePath(e, join(a, "gitdir"), a, (p) => p.trimEnd(), a);
    if (alternatePath === "leads_nowhere") continue;
    if (
      alternatePath === "absent" ||
      alternatePath === "refused" ||
      alternatePath === "malformed" ||
      basename(alternatePath) !== GIT_ENTRY_NAME
    ) {
      markErrorAndNewest(t);
      continue;
    }
    let d = dirname(alternatePath);
    if (hasBackslash(d)) {
      markErrorAndNewest(t);
      continue;
    }
    let smallFile = await readSmallFile(e, alternatePath, stripTrailingNewlines);
    if (smallFile === "absent" || smallFile === "refused") {
      markErrorAndNewest(t);
      continue;
    }
    if (smallFile === "malformed" || !smallFile.startsWith("gitdir: ")) {
      markNewestKept(t);
      continue;
    }
    let sliced = smallFile.slice(8);
    if (isOnForeignMount(sliced, d)) {
      markNewestKept(t);
      continue;
    }
    let P = await checkNoSymlinks(e, resolve(d, sliced));
    if (P === "refused") {
      markErrorAndNewest(t);
      continue;
    }
    if (P === "missing") {
      markNewestKept(t);
      continue;
    }
    if (samePath(resolve(d, sliced), a))
      o.push({
        kind: "linked_worktree",
        dir: d,
        gitFileLine: smallFile,
      });
    else {
      let [p, O] = await Promise.all(
        [resolve(d, sliced), a].map((B) =>
          e.fs
            .lstat(B, {
              bigint: true,
            })
            .catch(() => null),
        ),
      );
      if (p?.ino && p.dev === O?.dev && p.ino === O.ino) markErrorAndNewest(t);
      else markNewestKept(t);
    }
  }
  return o;
}
//@ chunk-4nhpaxz9.js:4809-4992 placement
/**
 * 核对锚点仍指向同一 git 目录或 worktree。
 */
async function verifyGitIdentity(e, n) {
  switch (n.kind) {
    case "git_dir": {
      let stats = await e.lstat("");
      return stats.dev === n.identity.dev && sameTimestamp(stats.ino, n.identity.ino);
    }
    case "linked_worktree":
      return readGitFileMatches(e, n.gitFileLine);
  }
}
//@ chunk-4nhpaxz9.js:4992-5089 placement
/**
 * 按 worktree 种类决定回收目录名与忽略文件。
 */
var TRASH_LAYOUT_BY_KIND = {
  git_dir: {
    trashName: CLOUD_TRASH_DIR,
    ignoreFile: undefined,
  },
  linked_worktree: {
    trashName: CLOUD_TRASH_MARKER_FILE,
    ignoreFile: GITIGNORE_FILE_NAME,
  },
};
//@ chunk-4nhpaxz9.js:5089-5465 placement
/**
 * 读取 .git 文件内容并核对与记录一致（防替换）。
 */
async function readGitFileMatches(e, gitFileLine) {
  let t = await e.open(GIT_ENTRY_NAME, constants.O_RDONLY | constants.O_NONBLOCK).catch(() => null);
  if (t === null) return false;
  try {
    let [r, s] = await Promise.all([
      t.stat({
        bigint: true,
      }),
      e.lstat(GIT_ENTRY_NAME),
    ]);
    if (r.dev !== s.dev || r.ino !== s.ino) return false;
    let i = Buffer.alloc(MAX_GIT_POINTER_FILE_BYTES + 1);
    let { bytesRead } = await t.read(i, 0, i.length, 0);
    return (
      bytesRead <= MAX_GIT_POINTER_FILE_BYTES &&
      stripTrailingNewlines(i.toString("utf8", 0, bytesRead)) === gitFileLine
    );
  } catch {
    return false;
  } finally {
    await t.close().catch(() => {});
  }
}
//@ chunk-4nhpaxz9.js:5465-5643 placement
/**
 * Windows 下按根与相对路径打开目录锚点。
 */
function openWin32Anchor(e, n, t) {
  let { root, dir, base } = e.path.parse(e.path.normalize(t));
  return n.holdOutside(
    root,
    [...dir.slice(root.length).split(e.path.sep), base].filter((o) => o !== "").join("/"),
    true,
  );
}
//@ chunk-4nhpaxz9.js:5643-6209 placement
/**
 * 按平台打开目录并核对 inode 与锚点一致。
 */
async function verifyAnchorInode(e, n, dir = n.realRoot, r) {
  let s = constants.O_DIRECTORY | READ_LIMITS;
  let i = s | O_NOFOLLOW_ANY | constants.O_NOFOLLOW;
  let o = await (
    n.backend === "win32_handle"
      ? openWin32Anchor(e, n, dir)
      : n.backend === "darwin_at"
        ? e.fs.open(dir, s | O_NOFOLLOW_FLAG)
        : dir
            .split("/")
            .filter((c) => c !== "")
            .reduce(
              async (acc, a) => {
                let u = await acc;
                return e.fs.open(`/proc/self/fd/${u.fd}/${a}`, i).finally(() => u.close().catch(() => {}));
              },
              e.fs.open("/", i),
            )
  ).catch(() => null);
  if (o === null) return false;
  try {
    let [c, a] = await Promise.all([
      "fd" in o
        ? o.stat({
            bigint: true,
          })
        : o.stat(),
      r ?? n.lstat(""),
    ]);
    return !isSentinelInode(a.ino) && c.dev === a.dev && c.ino === a.ino;
  } catch {
    return false;
  } finally {
    await o.close().catch(() => {});
  }
}
//@ chunk-4nhpaxz9.js:6209-6889 placement
/**
 * 清理某仓库的回收站：核对路径与身份后删除过期项并移除空回收站。
 */
async function cleanupTrashDir(e, n, { cutoffMs, isLive, tally }) {
  let dir = n.dir;
  let { trashName, ignoreFile } = TRASH_LAYOUT_BY_KIND[n.kind];
  try {
    if (!(await e.fs.lstat(e.path.join(dir, trashName))).isDirectory()) {
      markErrorAndNewest(tally);
      return;
    }
  } catch (error) {
    if (!isENOENT(error) || (await checkNoSymlinks(e, dir)) !== "plainly") markErrorAndNewest(tally);
    return;
  }
  let a = await e.fs.realpath(dir).catch(() => null);
  if (a === null || !samePathCaseFolded(a, dir)) {
    markErrorAndNewest(tally);
    return;
  }
  let joined = e.path.join(a, trashName);
  let f = await openTreeAnchor(e, {
    gitRoot: dir,
    realRoot: a,
  }).catch(() => null);
  if (f === null || "unavailable" in f) {
    markErrorAndNewest(tally);
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
      markErrorAndNewest(tally);
      return;
    }
    await removeExpiredTrash(e, d, trashName, joined, {
      cutoffMs,
      isLive,
      tally,
    });
    await removeEmptyTrashDir(e, d, trashName, joined, tally, ignoreFile);
  } catch (error) {
    if (!isENOENT(error)) markErrorAndNewest(tally);
  } finally {
    await d.close().catch(() => {});
  }
}
//@ chunk-4nhpaxz9.js:6889-7296 placement
/**
 * 删除回收站中超过截止时间且无写者的条目。
 */
async function removeExpiredTrash(e, n, trashName, r, { cutoffMs, isLive, tally }) {
  let entries = await e.fs.readdir(r);
  for (let a of entries) {
    let u = `${trashName}/${a}`;
    try {
      if (!(await n.lstat(u)).isDirectory()) continue;
      if (isLive(a.replace(/\.(?:staging|set-aside)$/, ""))) {
        markNewestKept(tally);
        continue;
      }
      let f = await cleanupSingleDirectory(e, e.path.join(r, a));
      if (f < cutoffMs) {
        await removeTreeIfOld(n, e, u, cutoffMs);
        tally.removed++;
      } else tally.newestKeptMs = Math.max(tally.newestKeptMs ?? -1 / 0, f);
    } catch (error) {
      if (error instanceof WorktreeChangedError) markNewestKept(tally);
      else if (!isENOENT(error)) markErrorAndNewest(tally);
    }
  }
}
//@ chunk-4nhpaxz9.js:7296-7688 placement
/**
 * 回收站只剩忽略文件或为空时删除它。
 */
async function removeEmptyTrashDir(e, n, trashName, r, tally, ignoreFile) {
  let o = await e.fs.readdir(r).catch(() => ["?"]);
  try {
    if (ignoreFile !== undefined && o.length === 1 && o[0] === ignoreFile) {
      if ((await n.lstat(`${trashName}/${ignoreFile}`)).isFile()) {
        await n.unlink(`${trashName}/${ignoreFile}`);
        await n.rmdir(trashName).catch(async (error) => {
          if (getErrnoCode(error) !== "ENOTEMPTY") throw error;
          await n.create(
            `${trashName}/${ignoreFile}`,
            Buffer.from(`*
`),
            384,
          );
        });
      }
    } else if (o.length === 0) await n.rmdir(trashName);
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTEMPTY") tally.errors++;
  }
}
//@ chunk-4nhpaxz9.js:7945-7968 placement
/**
 * 删除过程中目录变新时抛出的错误类型。
 */
class WorktreeChangedError extends Error {}
//@ chunk-4nhpaxz9.js:7968-8365 placement
/**
 * 递归删除比截止时间旧的目录树（期间变新则中止）。
 */
async function removeTreeIfOld(e, n, t, r) {
  if (!(Number((await e.lstat(t)).mtimeMs) < r)) throw new WorktreeChangedError();
  let s = await n.fs.readdir(n.path.join(e.realRoot, ...t.split("/"))).catch(() => []);
  let i = [];
  for (let o of s) {
    let c = `${t}/${o}`;
    try {
      if ((await e.lstat(c)).isDirectory()) await removeTreeIfOld(e, n, c, r);
      else await e.unlink(c);
    } catch (error) {
      if (error instanceof WorktreeChangedError || getErrnoCode(error) === "ENOTEMPTY") throw error;
      if (!isENOENT(error)) i.push(error);
    }
  }
  if (i.length > 0) throw i[0];
  await e.rmdir(t);
}
