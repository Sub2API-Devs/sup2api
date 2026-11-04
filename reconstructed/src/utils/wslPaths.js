/**
 * utils/wslPaths.ts
 *
 * WSL 路径与 gitdir（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-82kqcve8.js (17)
 * attribution: placement 17
 */
import { join, relative, sep, isAbsolute, posix, resolve, dirname } from "path";
import { homedir } from "os";
import { opendir, open } from "fs/promises";
import { identity } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { findGitRootRecheckingNegative, findGitRoot, findCanonicalGitRoot } from "./git.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import {
  foldCaseSimple,
  isDosShortNameFolded,
  segmentsMatchCaseInsensitive,
} from "./windowsProfileFolders.js";
import { foldCaseBasic } from "./pathIdentity.js";
import { driveMountsForPath, normalizedVolumePaths } from "./wslMounts.js";
import { getFsImplementation } from "./fsOperations.js";
import { isSadFsErrno } from "./errors.js";
import { logError } from "./log.js";
import { readPositionIsUnsafe, pointerFileIsSuspect, rawPointerPathIsUnsafe } from "./git/gitFilesystem.js";
import { isNetworkMountRoot, isOnForeignMount } from "./networkPaths.js";

//@ chunk-82kqcve8.js:174786-174804 placement
var MAX_DIR_ENTRIES = 32;
var MAX_GITDIR_READ_BYTES = 4096;
//@ chunk-82kqcve8.js:174804-175416 placement
async function resolveWslGitDir(repoDir) {
  let worktreesDir = join(repoDir, ".git", "worktrees");
  let dirNamesBounded = await readDirNamesBounded(worktreesDir, join(repoDir, ".git"));
  if (dirNamesBounded.length === 0) return [];
  let realRoot = await realpathOrNull(repoDir);
  if (realRoot === null) return [];
  let realWorktreesDir = await realpathOrNull(worktreesDir);
  if (realWorktreesDir === null) return [];
  let homeDir = homeDirOrNull();
  if (homeDir === null) return [];
  let homeIdentity = identity(homeDir);
  let realHome = await realpathOrNull(homeIdentity);
  let homeSpellings =
    realHome === null || realHome === homeIdentity ? [homeIdentity] : [homeIdentity, realHome];
  let results = await Promise.all(
    dirNamesBounded.map((dirName) =>
      readGitdirFile(join(worktreesDir, dirName), join(realWorktreesDir, dirName)),
    ),
  );
  let gitDirs = [];
  for (let gitDir of results) {
    if (gitDir === null || !isCanonicalGitRoot(gitDir)) continue;
    let realGitDir = await realpathOrNull(gitDir);
    if (realGitDir === null) continue;
    if (
      isUnderSensitiveProfileDir(gitDir, homeSpellings) ||
      isUnderSensitiveProfileDir(realGitDir, homeSpellings) ||
      (getPlatform() === "windows" &&
        (isAncestorOfSensitiveProfileDir(gitDir, homeSpellings) ||
          isAncestorOfSensitiveProfileDir(realGitDir, homeSpellings)))
    )
      continue;
    if (
      isPathInside(gitDir, repoDir) ||
      isPathInside(gitDir, realRoot) ||
      isPathInside(realGitDir, repoDir) ||
      isPathInside(realGitDir, realRoot)
    )
      continue;
    let freshRoot = canonicalGitRootFresh(gitDir);
    if (freshRoot === null || freshRoot === gitDir) continue;
    if (freshRoot === repoDir || (await realpathOrNull(freshRoot)) === realRoot) gitDirs.push(gitDir);
  }
  return gitDirs;
}
//@ chunk-82kqcve8.js:175416-175496 placement
function isCanonicalGitRoot(path) {
  if (findGitRootRecheckingNegative(path) === path) return true;
  getGitRepoCache().rootByPath.delete(path);
  return findGitRoot(path) === path;
}
//@ chunk-82kqcve8.js:175496-175599 placement
function canonicalGitRootFresh(path) {
  let canonicalGitRoot = findCanonicalGitRoot(path);
  if (canonicalGitRoot !== null && canonicalGitRoot !== path) return canonicalGitRoot;
  getGitRepoCache().canonicalRootByRoot.delete(path);
  return findCanonicalGitRoot(path);
}
//@ chunk-82kqcve8.js:175599-175622 placement
function isCaseFoldingActive() {
  return false;
}
//@ chunk-82kqcve8.js:175622-175694 placement
function foldForPlatform(kind) {
  if (kind === "windows_on_wsl") return foldCaseSimple;
  return isCaseFoldingActive() ? foldCaseBasic : (value) => value;
}
//@ chunk-82kqcve8.js:175694-175836 placement
function isPathInside(childPath, parentPath) {
  let caseFolding = isCaseFoldingActive();
  let foldedChild = caseFolding ? foldCaseBasic(childPath) : childPath;
  let foldedParent = caseFolding ? foldCaseBasic(parentPath) : parentPath;
  if (foldedChild === foldedParent) return true;
  let relativePath = relative(foldedChild, foldedParent);
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}
//@ chunk-82kqcve8.js:175836-176222 placement
/**
 * 用户目录下不应作为挂载或同步目标的敏感子目录（Library、AppData、开始菜单、PowerShell 配置目录、bin 等，支持 OneDrive* 通配）。
 */
var PROFILE_SENSITIVE_DIRS = [
  ["Library"],
  ["Applications"],
  ["AppData"],
  ["Start Menu"],
  ["Application Data"],
  ["Local Settings"],
  ["Cookies"],
  ["NetHood"],
  ["PrintHood"],
  ["Recent"],
  ["SendTo"],
  ["Documents", "PowerShell"],
  ["Documents", "WindowsPowerShell"],
  ["My Documents", "PowerShell"],
  ["My Documents", "WindowsPowerShell"],
  ["OneDrive*", "Documents", "PowerShell"],
  ["OneDrive*", "Documents", "WindowsPowerShell"],
  ["bin"],
];
//@ chunk-82kqcve8.js:176222-176433 placement
/**
 * 判断路径是否位于用户目录本身或其敏感子目录（含点开头目录）之内。
 */
function isUnderSensitiveProfileDir(path, roots, kind = "platform") {
  return segmentsUnderAnyRoot(path, roots, kind, (segments) => {
    if (segments.length === 0) return true;
    if (segments[0].startsWith(".") || (kind === "windows_on_wsl" && isDosShortNameFolded(segments[0])))
      return true;
    return PROFILE_SENSITIVE_DIRS.some((sensitiveDir) =>
      sensitiveDir.every(
        (segment, index) =>
          segments[index] !== undefined && matchesProfileSegment(segments[index], segment, kind),
      ),
    );
  });
}
//@ chunk-82kqcve8.js:176433-176582 placement
/**
 * 判断路径是否是用户目录下某个敏感子目录的上级。
 */
function isAncestorOfSensitiveProfileDir(path, roots, kind = "platform") {
  return segmentsUnderAnyRoot(path, roots, kind, (segments) => {
    if (segments.length === 0) return false;
    return PROFILE_SENSITIVE_DIRS.some(
      (sensitiveDir) =>
        segments.length < sensitiveDir.length &&
        segments.every((segment, index) => matchesProfileSegment(segment, sensitiveDir[index], kind)),
    );
  });
}
//@ chunk-82kqcve8.js:176582-176641 placement
function segmentsUnderAnyRoot(path, roots, kind, test) {
  return roots.some((root) => relativeSegmentsUnder(path, root, kind).some(test));
}
//@ chunk-82kqcve8.js:176641-177068 placement
/**
 * 计算路径相对用户目录的各种分段形式（WSL 访问 Windows 时兼顾 /mnt 与盘符写法），不在其下时为空。
 */
function relativeSegmentsUnder(childPath, parentPath, platformKind) {
  if (platformKind === "windows_on_wsl") {
    let childDrives = driveMountsForPath(posix.normalize(childPath));
    let parentDrives = driveMountsForPath(posix.normalize(parentPath));
    if (childDrives.length === 0 || parentDrives.length === 0) {
      let filtered = foldCaseSimple(posix.normalize(childPath)).split("/").filter(Boolean);
      let filtered_2 = foldCaseSimple(posix.normalize(parentPath)).split("/").filter(Boolean);
      return [
        ...normalizedVolumePaths(childPath, parentPath),
        ...(filtered_2.length <= filtered.length &&
        filtered_2.every((segment, index) => segmentsMatchCaseInsensitive(segment, filtered[index]))
          ? [filtered.slice(filtered_2.length)]
          : []),
      ];
    }
    return normalizedVolumePaths(childPath, parentPath);
  }
  if (!isPathInside(parentPath, childPath)) return [];
  let caseFolding = isCaseFoldingActive();
  let relativePath = relative(
    caseFolding ? foldCaseBasic(parentPath) : parentPath,
    caseFolding ? foldCaseBasic(childPath) : childPath,
  );
  return [relativePath === "" ? [] : relativePath.split(sep)];
}
//@ chunk-82kqcve8.js:177068-177247 placement
function matchesProfileSegment(segment, pattern, kind) {
  if (kind === "windows_on_wsl" && isDosShortNameFolded(segment)) return true;
  let fold = foldForPlatform(kind);
  if (!pattern.endsWith("*")) return fold(segment) === fold(pattern);
  let foldedPrefix = fold(pattern.slice(0, -1));
  let foldedSegment = fold(segment);
  return foldedSegment === foldedPrefix || foldedSegment.startsWith(`${foldedPrefix} - `);
}
//@ chunk-82kqcve8.js:177247-177316 placement
function homeDirOrNull() {
  try {
    let home = homedir();
    return home === "" ? null : home;
  } catch {
    return null;
  }
}
//@ chunk-82kqcve8.js:177316-177412 placement
async function realpathOrNull(path) {
  try {
    return identity(await getFsImplementation().realpath(path));
  } catch (error) {
    if (!isSadFsErrno(error)) logError(error);
    return null;
  }
}
//@ chunk-82kqcve8.js:177412-177665 placement
async function readDirNamesBounded(dir, anchor) {
  if (readPositionIsUnsafe(dir, anchor)) return [];
  try {
    let handle = await opendir(dir);
    try {
      let names = [];
      for (let entry = await handle.read(); entry !== null; entry = await handle.read()) {
        if (names.length === MAX_DIR_ENTRIES) return [];
        names.push(entry.name);
      }
      return names;
    } finally {
      await handle.close().catch(() => {});
    }
  } catch (error) {
    if (!isSadFsErrno(error)) logError(error);
    return [];
  }
}
//@ chunk-82kqcve8.js:177665-178073 placement
async function readGitdirFile(adminDir, worktreePath) {
  let gitdirPath = join(adminDir, "gitdir");
  if (pointerFileIsSuspect(gitdirPath, adminDir)) return null;
  let pointerText;
  try {
    let handle = await open(gitdirPath, "r");
    try {
      let buffer = Buffer.alloc(MAX_GITDIR_READ_BYTES);
      let { bytesRead } = await handle.read(buffer, 0, MAX_GITDIR_READ_BYTES, 0);
      if (bytesRead === MAX_GITDIR_READ_BYTES) return null;
      pointerText = buffer.toString("utf-8", 0, bytesRead).trim();
    } finally {
      await handle.close();
    }
  } catch (error) {
    if (!isSadFsErrno(error)) logError(error);
    return null;
  }
  if (
    isNetworkMountRoot(pointerText) ||
    isNetworkMountRoot(resolve(adminDir, pointerText)) ||
    isNetworkMountRoot(resolve(worktreePath, pointerText)) ||
    isOnForeignMount(pointerText, adminDir) ||
    rawPointerPathIsUnsafe(pointerText, adminDir)
  )
    return null;
  if (
    adminDir !== worktreePath &&
    (isOnForeignMount(pointerText, worktreePath) || rawPointerPathIsUnsafe(pointerText, worktreePath))
  )
    return null;
  return identity(dirname(resolve(worktreePath, pointerText)));
}
export { resolveWslGitDir, isUnderSensitiveProfileDir, isAncestorOfSensitiveProfileDir };
