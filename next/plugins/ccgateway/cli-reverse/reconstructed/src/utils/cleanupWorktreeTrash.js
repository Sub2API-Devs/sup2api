/**
 * utils/cleanupWorktreeTrash.ts
 *
 * 2.1.316 新增。清理 worktree 回收站与 git alternates。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2zeqrfs5.js (25)
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
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { sameTimestamp } from "./windowsPathNames.js";
import { CLOUD_TRASH_DIR, CLOUD_TRASH_MARKER_FILE, GITIGNORE_FILE_NAME } from "./cloudTrash.js";
import { READ_LIMITS, O_NOFOLLOW_ANY, O_NOFOLLOW_FLAG } from "./fsBoundRead.js";
import { isSentinelInode } from "./slowOperations.js";
import { openTreeAnchor } from "./fsAnchor/treeAnchor.js";
import { cleanupSingleDirectory } from "./cleanup.js";

//@ chunk-2zeqrfs5.js:1433-1462 placement
/**
 * 写锁文件算“新鲜”的时长（90 秒）。
 */
var WRITER_LOCK_FRESH_MS = 90000;
var WRITER_LOCKS = "writer-locks";
//@ chunk-2zeqrfs5.js:1462-1498 placement
/**
 * 判断写锁文件的 mtime 是否足够新。
 */
function isWriterLockFresh(mtimeMs) {
  return Date.now() - mtimeMs < WRITER_LOCK_FRESH_MS;
}
//@ chunk-2zeqrfs5.js:1498-1544 placement
/**
 * 读取 .git 指针文件的大小上限（8192）。
 */
var MAX_GIT_POINTER_FILE_BYTES = 8192;
var GIT_ENTRY_NAME = ".git";
var PATH_SEPARATOR_SPLIT_RE = sep === "\\" ? /[\\/]+/ : /\/+/;
//@ chunk-2zeqrfs5.js:1544-2200 placement
async function pruneGitAlternates(alternatesPath, cutoffMs, host = createDeviceTreeHost()) {
  let result = {
    removed: 0,
    errors: 0,
    newestKeptMs: null,
  };
  try {
    let alternatePath = await resolveAlternatePath(
      host,
      join(alternatesPath, SIDE_GIT, "objects", "info", "alternates"),
      alternatesPath,
      (line) => line.split(/\r?\n/, 1)[0] ?? "",
    );
    if (
      alternatePath === "absent" ||
      alternatePath === "leads_nowhere" ||
      alternatePath === "malformed" ||
      (alternatePath !== "refused" && basename(alternatePath) !== "objects")
    )
      return result;
    if (alternatePath === "refused") {
      markErrorAndNewest(result);
      return result;
    }
    let gitDir = dirname(alternatePath);
    let identity = await host.fs.lstat(gitDir, {
      bigint: true,
    });
    let headStats = await host.fs.lstat(join(gitDir, "HEAD")).catch(() => null);
    if (!headStats?.isFile() && !headStats?.isSymbolicLink()) {
      markErrorAndNewest(result);
      return result;
    }
    await cleanupTrashDir(
      host,
      {
        kind: "git_dir",
        dir: gitDir,
        identity,
      },
      {
        cutoffMs,
        isLive: await liveWriterChecker(host, alternatesPath, dirname(gitDir)),
        tally: result,
      },
    );
    for (let trashEntry of await cleanupWorktreeTrash(host, gitDir, result))
      await cleanupTrashDir(host, trashEntry, {
        cutoffMs,
        isLive: await liveWriterChecker(host, alternatesPath, trashEntry.dir),
        tally: result,
      }).catch(() => markErrorAndNewest(result));
  } catch {
    markErrorAndNewest(result);
  }
  return result;
}
//@ chunk-2zeqrfs5.js:2200-2240 placement
/**
 * 记录最近一次保留时间。
 */
function markNewestKept(mtimeMs) {
  mtimeMs.newestKeptMs = Date.now();
}
//@ chunk-2zeqrfs5.js:2240-2379 placement
/**
 * 规范化后比较两个路径是否相同（Windows 盘符大小写）。
 */
function samePath(leftPath, rightPath, separator = sep) {
  let [normalizedLeft, normalizedRight] = [leftPath, rightPath].map((path) =>
    identity(
      (separator === "\\" ? path.replaceAll("/", separator) : path).replace(/^[a-z](?=:)/, (driveLetter) =>
        driveLetter.toUpperCase(),
      ),
    ),
  );
  return normalizedLeft === normalizedRight;
}
//@ chunk-2zeqrfs5.js:2379-2475 placement
/**
 * 判断两个路径是否相同（或大小写折叠后相同）。
 */
function samePathCaseFolded(leftPath, path) {
  let lowercase = (path) => path.replace(/[A-Z]/g, (upperChar) => upperChar.toLowerCase());
  return samePath(leftPath, path) || samePath(lowercase(leftPath), lowercase(path));
}
//@ chunk-2zeqrfs5.js:2475-2505 placement
/**
 * 记一次清理错误并更新最近保留时间。
 */
function markErrorAndNewest(mtimeMs) {
  mtimeMs.errors++;
  markNewestKept(mtimeMs);
}
//@ chunk-2zeqrfs5.js:2505-2552 placement
/**
 * 去掉字符串末尾的换行。
 */
var stripTrailingNewlines = (text) => text.replace(/(?<![\r\n])[\r\n]+$/, "");
//@ chunk-2zeqrfs5.js:2552-2837 placement
/**
 * 读取并解析 alternates/gitdir 指向的路径，确认无链接，返回路径或 absent/malformed/refused/leads_nowhere。
 */
async function resolveAlternatePath(worktreeDir, alternatePath, host, cutoffMs, objectsBaseDir) {
  let smallFile = await readSmallFile(worktreeDir, alternatePath, cutoffMs);
  if (smallFile === "absent" || smallFile === "malformed" || smallFile === "refused") return smallFile;
  if (isOnForeignMount(smallFile, host)) return "refused";
  let smallFilePath = objectsBaseDir === undefined ? smallFile : resolve(objectsBaseDir, smallFile);
  if (!isAbsolute(smallFilePath)) return "refused";
  let symlinkCheck = await checkNoSymlinks(worktreeDir, smallFilePath);
  return symlinkCheck === "plainly"
    ? smallFilePath
    : symlinkCheck === "missing" && !/[\r\n]/.test(smallFile)
      ? "leads_nowhere"
      : "refused";
}
//@ chunk-2zeqrfs5.js:2837-3070 placement
/**
 * 路径各级是否都不是符号链接（plainly/missing/refused）。
 */
async function checkNoSymlinks(host, fullPath) {
  let { root } = parse(fullPath);
  let currentPath = root;
  for (let segment of fullPath.slice(root.length).split(PATH_SEPARATOR_SPLIT_RE)) {
    if (segment === "") continue;
    currentPath = join(currentPath, segment);
    try {
      if ((await host.fs.lstat(currentPath)).isSymbolicLink()) return "refused";
    } catch (error) {
      return isPathAbsent(error) ? "missing" : "refused";
    }
  }
  return "plainly";
}
//@ chunk-2zeqrfs5.js:3070-3334 placement
/**
 * 读取小文件内容并解析（不存在/过大/格式错误时返回原因）。
 */
async function readSmallFile(host, filePath, normalize) {
  try {
    let fileFdGated = await getFsImplementation().readFileFdGated(filePath, MAX_GIT_POINTER_FILE_BYTES);
    if (fileFdGated === null) {
      let stats = await host.fs.lstat(filePath);
      return stats.isFile() && stats.size <= MAX_GIT_POINTER_FILE_BYTES ? "refused" : "malformed";
    }
    let text = normalize(fileFdGated.content);
    return text === "" || text.includes("\x00") ? "malformed" : text;
  } catch (error) {
    return isENOENT(error) ? "absent" : "refused";
  }
}
//@ chunk-2zeqrfs5.js:3334-3482 placement
/**
 * 构造判断回收项是否仍有写者锁的函数。
 */
async function liveWriterChecker(host, worktreeDir, repoPath) {
  let parentDir = dirname(dirname(worktreeDir));
  let snapshotsDir = join(
    getProjectDir(await canonicalizePath(repoPath, undefined), parentDir),
    CLOUD_SNAPSHOTS_DIR,
  );
  let results = await Promise.all(
    normalizeCaseForComparison_2([worktreeDir, snapshotsDir]).map((lockDir) =>
      readWriterLocks(host, lockDir),
    ),
  );
  return (candidate) => results.some((checker) => checker(candidate));
}
//@ chunk-2zeqrfs5.js:3482-3753 placement
/**
 * 读取写者锁目录中仍新鲜的锁。
 */
async function readWriterLocks(host, rootDir) {
  let locksDir = join(rootDir, WRITER_LOCKS);
  let lockNames;
  try {
    lockNames = await host.fs.readdir(locksDir);
  } catch (error) {
    return isENOENT(error) ? () => false : () => true;
  }
  let liveNames = new Set();
  for (let lockName of lockNames) {
    let lockStats = lockName.endsWith(".writer")
      ? await host.fs.lstat(join(locksDir, lockName)).catch(() => null)
      : null;
    if (lockStats !== null && isWriterLockFresh(lockStats.mtimeMs)) liveNames.add(lockName.slice(0, -7));
  }
  return (name) => liveNames.has(name);
}
//@ chunk-2zeqrfs5.js:3753-4893 placement
async function cleanupWorktreeTrash(host, gitDir, tally) {
  let worktreesDir = join(gitDir, "worktrees");
  let worktreesStats = await host.fs
    .lstat(worktreesDir)
    .catch((error) => (isENOENT(error) ? "absent" : null));
  if (worktreesStats === "absent") {
    if (!(await host.fs.lstat(gitDir).catch(() => null))?.isDirectory()) markErrorAndNewest(tally);
    return [];
  }
  let entries =
    worktreesStats?.isDirectory() && (await checkNoSymlinks(host, worktreesDir)) === "plainly"
      ? await host.fs.readdir(worktreesDir).catch(() => null)
      : null;
  if (entries === null) {
    markErrorAndNewest(tally);
    return [];
  }
  let linkedWorktrees = [];
  for (let entryName of entries) {
    let entryPath = join(worktreesDir, entryName);
    let entryStats = await host.fs.lstat(entryPath).catch(() => null);
    if (entryStats === null || entryStats.isSymbolicLink()) {
      markErrorAndNewest(tally);
      continue;
    }
    if (!entryStats.isDirectory()) continue;
    let filePath = await resolveAlternatePath(
      host,
      join(entryPath, "gitdir"),
      entryPath,
      (line) => line.trimEnd(),
      entryPath,
    );
    if (filePath === "leads_nowhere") continue;
    if (
      filePath === "absent" ||
      filePath === "refused" ||
      filePath === "malformed" ||
      basename(filePath) !== GIT_ENTRY_NAME
    ) {
      markErrorAndNewest(tally);
      continue;
    }
    let alternateDir = dirname(filePath);
    if (hasBackslash(alternateDir)) {
      markErrorAndNewest(tally);
      continue;
    }
    let smallFile = await readSmallFile(host, filePath, stripTrailingNewlines);
    if (smallFile === "absent" || smallFile === "refused") {
      markErrorAndNewest(tally);
      continue;
    }
    if (smallFile === "malformed" || !smallFile.startsWith("gitdir: ")) {
      markNewestKept(tally);
      continue;
    }
    let sliced = smallFile.slice(8);
    if (isOnForeignMount(sliced, alternateDir)) {
      markNewestKept(tally);
      continue;
    }
    let symlinkCheck = await checkNoSymlinks(host, resolve(alternateDir, sliced));
    if (symlinkCheck === "refused") {
      markErrorAndNewest(tally);
      continue;
    }
    if (symlinkCheck === "missing") {
      markNewestKept(tally);
      continue;
    }
    if (samePath(resolve(alternateDir, sliced), entryPath))
      linkedWorktrees.push({
        kind: "linked_worktree",
        dir: alternateDir,
        gitFileLine: smallFile,
      });
    else {
      let [alternateStats, entryStats] = await Promise.all(
        [resolve(alternateDir, sliced), entryPath].map((targetPath) =>
          host.fs
            .lstat(targetPath, {
              bigint: true,
            })
            .catch(() => null),
        ),
      );
      if (
        alternateStats?.ino &&
        alternateStats.dev === entryStats?.dev &&
        alternateStats.ino === entryStats.ino
      )
        markErrorAndNewest(tally);
      else markNewestKept(tally);
    }
  }
  return linkedWorktrees;
}
//@ chunk-2zeqrfs5.js:4893-5076 placement
/**
 * 核对锚点仍指向同一 git 目录或 worktree。
 */
async function verifyGitIdentity(anchor, target) {
  switch (target.kind) {
    case "git_dir": {
      let stats = await anchor.lstat("");
      return stats.dev === target.identity.dev && sameTimestamp(stats.ino, target.identity.ino);
    }
    case "linked_worktree":
      return readGitFileMatches(anchor, target.gitFileLine);
  }
}
//@ chunk-2zeqrfs5.js:5076-5173 placement
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
//@ chunk-2zeqrfs5.js:5173-5549 placement
/**
 * 读取 .git 文件内容并核对与记录一致（防替换）。
 */
async function readGitFileMatches(anchor, gitFileLine) {
  let handle = await anchor.open(GIT_ENTRY_NAME, constants.O_RDONLY | constants.O_NONBLOCK).catch(() => null);
  if (handle === null) return false;
  try {
    let [handleStats, entryStats] = await Promise.all([
      handle.stat({
        bigint: true,
      }),
      anchor.lstat(GIT_ENTRY_NAME),
    ]);
    if (handleStats.dev !== entryStats.dev || handleStats.ino !== entryStats.ino) return false;
    let buffer = Buffer.alloc(MAX_GIT_POINTER_FILE_BYTES + 1);
    let { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return (
      bytesRead <= MAX_GIT_POINTER_FILE_BYTES &&
      stripTrailingNewlines(buffer.toString("utf8", 0, bytesRead)) === gitFileLine
    );
  } catch {
    return false;
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-2zeqrfs5.js:5549-5727 placement
/**
 * Windows 下按根与相对路径打开目录锚点。
 */
function openWin32Anchor(host, anchor, anchorPath) {
  let { root, dir, base } = host.path.parse(host.path.normalize(anchorPath));
  return anchor.holdOutside(
    root,
    [...dir.slice(root.length).split(host.path.sep), base].filter((segment) => segment !== "").join("/"),
    true,
  );
}
//@ chunk-2zeqrfs5.js:5727-6293 placement
/**
 * 按平台打开目录并核对 inode 与锚点一致。
 */
async function verifyAnchorInode(host, anchor, anchorPath = anchor.realRoot, expectedStats) {
  let baseFlags = constants.O_DIRECTORY | READ_LIMITS;
  let openFlags = baseFlags | O_NOFOLLOW_ANY | constants.O_NOFOLLOW;
  let handle = await (
    anchor.backend === "win32_handle"
      ? openWin32Anchor(host, anchor, anchorPath)
      : anchor.backend === "darwin_at"
        ? host.fs.open(anchorPath, baseFlags | O_NOFOLLOW_FLAG)
        : anchorPath
            .split("/")
            .filter((segment) => segment !== "")
            .reduce(
              async (acc, segment) => {
                let current = await acc;
                return host.fs
                  .open(`/proc/self/fd/${current.fd}/${segment}`, openFlags)
                  .finally(() => current.close().catch(() => {}));
              },
              host.fs.open("/", openFlags),
            )
  ).catch(() => null);
  if (handle === null) return false;
  try {
    let [anchorStats, expectedInodeStats] = await Promise.all([
      "fd" in handle
        ? handle.stat({
            bigint: true,
          })
        : handle.stat(),
      expectedStats ?? anchor.lstat(""),
    ]);
    return (
      !isSentinelInode(expectedInodeStats.ino) &&
      anchorStats.dev === expectedInodeStats.dev &&
      anchorStats.ino === expectedInodeStats.ino
    );
  } catch {
    return false;
  } finally {
    await handle.close().catch(() => {});
  }
}
//@ chunk-2zeqrfs5.js:6293-6973 placement
/**
 * 清理某仓库的回收站：核对路径与身份后删除过期项并移除空回收站。
 */
async function cleanupTrashDir(host, target, { cutoffMs, isLive, tally }) {
  let dir = target.dir;
  let { trashName, ignoreFile } = TRASH_LAYOUT_BY_KIND[target.kind];
  try {
    if (!(await host.fs.lstat(host.path.join(dir, trashName))).isDirectory()) {
      markErrorAndNewest(tally);
      return;
    }
  } catch (error) {
    if (!isENOENT(error) || (await checkNoSymlinks(host, dir)) !== "plainly") markErrorAndNewest(tally);
    return;
  }
  let realDir = await host.fs.realpath(dir).catch(() => null);
  if (realDir === null || !samePathCaseFolded(realDir, dir)) {
    markErrorAndNewest(tally);
    return;
  }
  let trashDir = host.path.join(realDir, trashName);
  let treeAnchor = await openTreeAnchor(host, {
    gitRoot: dir,
    realRoot: realDir,
  }).catch(() => null);
  if (treeAnchor === null || "unavailable" in treeAnchor) {
    markErrorAndNewest(tally);
    return;
  }
  let anchor = treeAnchor;
  try {
    if (
      !(await verifyAnchorInode(host, anchor)) ||
      (!samePath(realDir, dir) && !(await verifyAnchorInode(host, anchor, dir))) ||
      !(await verifyGitIdentity(anchor, target)) ||
      !(await anchor.lstat(trashName)).isDirectory()
    ) {
      markErrorAndNewest(tally);
      return;
    }
    await removeExpiredTrash(host, anchor, trashName, trashDir, {
      cutoffMs,
      isLive,
      tally,
    });
    await removeEmptyTrashDir(host, anchor, trashName, trashDir, tally, ignoreFile);
  } catch (error) {
    if (!isENOENT(error)) markErrorAndNewest(tally);
  } finally {
    await anchor.close().catch(() => {});
  }
}
//@ chunk-2zeqrfs5.js:6973-7380 placement
/**
 * 删除回收站中超过截止时间且无写者的条目。
 */
async function removeExpiredTrash(host, anchor, trashName, trashDir, { cutoffMs, isLive, tally }) {
  let entries = await host.fs.readdir(trashDir);
  for (let entryName of entries) {
    let relativePath = `${trashName}/${entryName}`;
    try {
      if (!(await anchor.lstat(relativePath)).isDirectory()) continue;
      if (isLive(entryName.replace(/\.(?:staging|set-aside)$/, ""))) {
        markNewestKept(tally);
        continue;
      }
      let newestMtimeMs = await cleanupSingleDirectory(host, host.path.join(trashDir, entryName));
      if (newestMtimeMs < cutoffMs) {
        await removeTreeIfOld(anchor, host, relativePath, cutoffMs);
        tally.removed++;
      } else tally.newestKeptMs = Math.max(tally.newestKeptMs ?? -1 / 0, newestMtimeMs);
    } catch (error) {
      if (error instanceof WorktreeChangedError) markNewestKept(tally);
      else if (!isENOENT(error)) markErrorAndNewest(tally);
    }
  }
}
//@ chunk-2zeqrfs5.js:7380-7772 placement
/**
 * 回收站只剩忽略文件或为空时删除它。
 */
async function removeEmptyTrashDir(host, anchor, trashName, trashDir, tally, ignoreFile) {
  let entries = await host.fs.readdir(trashDir).catch(() => ["?"]);
  try {
    if (ignoreFile !== undefined && entries.length === 1 && entries[0] === ignoreFile) {
      if ((await anchor.lstat(`${trashName}/${ignoreFile}`)).isFile()) {
        await anchor.unlink(`${trashName}/${ignoreFile}`);
        await anchor.rmdir(trashName).catch(async (error) => {
          if (getErrnoCode(error) !== "ENOTEMPTY") throw error;
          await anchor.create(
            `${trashName}/${ignoreFile}`,
            Buffer.from(`*
`),
            384,
          );
        });
      }
    } else if (entries.length === 0) await anchor.rmdir(trashName);
  } catch (error) {
    if (!isENOENT(error) && getErrnoCode(error) !== "ENOTEMPTY") tally.errors++;
  }
}
//@ chunk-2zeqrfs5.js:8029-8052 placement
/**
 * 删除过程中目录变新时抛出的错误类型。
 */
class WorktreeChangedError extends Error {}
//@ chunk-2zeqrfs5.js:8052-8449 placement
/**
 * 递归删除比截止时间旧的目录树（期间变新则中止）。
 */
async function removeTreeIfOld(anchor, host, relativePath, cutoffMs) {
  if (!(Number((await anchor.lstat(relativePath)).mtimeMs) < cutoffMs)) throw new WorktreeChangedError();
  let entries = await host.fs
    .readdir(host.path.join(anchor.realRoot, ...relativePath.split("/")))
    .catch(() => []);
  let errors = [];
  for (let entryName of entries) {
    let entryPath = `${relativePath}/${entryName}`;
    try {
      if ((await anchor.lstat(entryPath)).isDirectory())
        await removeTreeIfOld(anchor, host, entryPath, cutoffMs);
      else await anchor.unlink(entryPath);
    } catch (error) {
      if (error instanceof WorktreeChangedError || getErrnoCode(error) === "ENOTEMPTY") throw error;
      if (!isENOENT(error)) errors.push(error);
    }
  }
  if (errors.length > 0) throw errors[0];
  await anchor.rmdir(relativePath);
}
export { pruneGitAlternates };
