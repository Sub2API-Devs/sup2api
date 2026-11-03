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
async function resolveWslGitDir(canonicalGitRoot) {
  let n = join(canonicalGitRoot, ".git", "worktrees");
  let dirNamesBounded = await readDirNamesBounded(n, join(canonicalGitRoot, ".git"));
  if (dirNamesBounded.length === 0) return [];
  let s = await realpathOrNull(canonicalGitRoot);
  if (s === null) return [];
  let h = await realpathOrNull(n);
  if (h === null) return [];
  let y = homeDirOrNull();
  if (y === null) return [];
  let w = identity(y);
  let S = await realpathOrNull(w);
  let R = S === null || S === w ? [w] : [w, S];
  let results = await Promise.all(dirNamesBounded.map((L) => readGitdirFile(join(n, L), join(h, L))));
  let P = [];
  for (let L of results) {
    if (L === null || !isCanonicalGitRoot(L)) continue;
    let j = await realpathOrNull(L);
    if (j === null) continue;
    if (
      isUnderSensitiveProfileDir(L, R) ||
      isUnderSensitiveProfileDir(j, R) ||
      (getPlatform() === "windows" &&
        (isAncestorOfSensitiveProfileDir(L, R) || isAncestorOfSensitiveProfileDir(j, R)))
    )
      continue;
    if (
      isPathInside(L, canonicalGitRoot) ||
      isPathInside(L, s) ||
      isPathInside(j, canonicalGitRoot) ||
      isPathInside(j, s)
    )
      continue;
    let G = canonicalGitRootFresh(L);
    if (G === null || G === L) continue;
    if (G === canonicalGitRoot || (await realpathOrNull(G)) === s) P.push(L);
  }
  return P;
}
//@ chunk-82kqcve8.js:175416-175496 placement
function isCanonicalGitRoot(e) {
  if (findGitRootRecheckingNegative(e) === e) return true;
  getGitRepoCache().rootByPath.delete(e);
  return findGitRoot(e) === e;
}
//@ chunk-82kqcve8.js:175496-175599 placement
function canonicalGitRootFresh(e) {
  let canonicalGitRoot = findCanonicalGitRoot(e);
  if (canonicalGitRoot !== null && canonicalGitRoot !== e) return canonicalGitRoot;
  getGitRepoCache().canonicalRootByRoot.delete(e);
  return findCanonicalGitRoot(e);
}
//@ chunk-82kqcve8.js:175599-175622 placement
function isCaseFoldingActive() {
  return false;
}
//@ chunk-82kqcve8.js:175622-175694 placement
function foldForPlatform(e) {
  if (e === "windows_on_wsl") return foldCaseSimple;
  return isCaseFoldingActive() ? foldCaseBasic : (n) => n;
}
//@ chunk-82kqcve8.js:175694-175836 placement
function isPathInside(e, n) {
  let r = isCaseFoldingActive();
  let s = r ? foldCaseBasic(e) : e;
  let h = r ? foldCaseBasic(n) : n;
  if (s === h) return true;
  let y = relative(s, h);
  return y !== "" && y !== ".." && !y.startsWith(`..${sep}`) && !isAbsolute(y);
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
function isUnderSensitiveProfileDir(e, n, r = "platform") {
  return segmentsUnderAnyRoot(e, n, r, (s) => {
    if (s.length === 0) return true;
    if (s[0].startsWith(".") || (r === "windows_on_wsl" && isDosShortNameFolded(s[0]))) return true;
    return PROFILE_SENSITIVE_DIRS.some((h) =>
      h.every((y, w) => s[w] !== undefined && matchesProfileSegment(s[w], y, r)),
    );
  });
}
//@ chunk-82kqcve8.js:176433-176582 placement
/**
 * 判断路径是否是用户目录下某个敏感子目录的上级。
 */
function isAncestorOfSensitiveProfileDir(e, n, r = "platform") {
  return segmentsUnderAnyRoot(e, n, r, (s) => {
    if (s.length === 0) return false;
    return PROFILE_SENSITIVE_DIRS.some(
      (h) => s.length < h.length && s.every((y, w) => matchesProfileSegment(y, h[w], r)),
    );
  });
}
//@ chunk-82kqcve8.js:176582-176641 placement
function segmentsUnderAnyRoot(e, n, r, s) {
  return n.some((h) => relativeSegmentsUnder(e, h, r).some(s));
}
//@ chunk-82kqcve8.js:176641-177068 placement
/**
 * 计算路径相对用户目录的各种分段形式（WSL 访问 Windows 时兼顾 /mnt 与盘符写法），不在其下时为空。
 */
function relativeSegmentsUnder(e, n, r) {
  if (r === "windows_on_wsl") {
    let y = driveMountsForPath(posix.normalize(e));
    let w = driveMountsForPath(posix.normalize(n));
    if (y.length === 0 || w.length === 0) {
      let filtered = foldCaseSimple(posix.normalize(e)).split("/").filter(Boolean);
      let filtered_2 = foldCaseSimple(posix.normalize(n)).split("/").filter(Boolean);
      return [
        ...normalizedVolumePaths(e, n),
        ...(filtered_2.length <= filtered.length &&
        filtered_2.every((O, P) => segmentsMatchCaseInsensitive(O, filtered[P]))
          ? [filtered.slice(filtered_2.length)]
          : []),
      ];
    }
    return normalizedVolumePaths(e, n);
  }
  if (!isPathInside(n, e)) return [];
  let s = isCaseFoldingActive();
  let h = relative(s ? foldCaseBasic(n) : n, s ? foldCaseBasic(e) : e);
  return [h === "" ? [] : h.split(sep)];
}
//@ chunk-82kqcve8.js:177068-177247 placement
function matchesProfileSegment(e, n, r) {
  if (r === "windows_on_wsl" && isDosShortNameFolded(e)) return true;
  let s = foldForPlatform(r);
  if (!n.endsWith("*")) return s(e) === s(n);
  let h = s(n.slice(0, -1));
  let y = s(e);
  return y === h || y.startsWith(`${h} - `);
}
//@ chunk-82kqcve8.js:177247-177316 placement
function homeDirOrNull() {
  try {
    let e = homedir();
    return e === "" ? null : e;
  } catch {
    return null;
  }
}
//@ chunk-82kqcve8.js:177316-177412 placement
async function realpathOrNull(e) {
  try {
    return identity(await getFsImplementation().realpath(e));
  } catch (error) {
    if (!isSadFsErrno(error)) logError(error);
    return null;
  }
}
//@ chunk-82kqcve8.js:177412-177665 placement
async function readDirNamesBounded(e, n) {
  if (readPositionIsUnsafe(e, n)) return [];
  try {
    let r = await opendir(e);
    try {
      let s = [];
      for (let h = await r.read(); h !== null; h = await r.read()) {
        if (s.length === MAX_DIR_ENTRIES) return [];
        s.push(h.name);
      }
      return s;
    } finally {
      await r.close().catch(() => {});
    }
  } catch (error) {
    if (!isSadFsErrno(error)) logError(error);
    return [];
  }
}
//@ chunk-82kqcve8.js:177665-178073 placement
async function readGitdirFile(e, n) {
  let r = join(e, "gitdir");
  if (pointerFileIsSuspect(r, e)) return null;
  let s;
  try {
    let h = await open(r, "r");
    try {
      let y = Buffer.alloc(MAX_GITDIR_READ_BYTES);
      let { bytesRead } = await h.read(y, 0, MAX_GITDIR_READ_BYTES, 0);
      if (bytesRead === MAX_GITDIR_READ_BYTES) return null;
      s = y.toString("utf-8", 0, bytesRead).trim();
    } finally {
      await h.close();
    }
  } catch (error) {
    if (!isSadFsErrno(error)) logError(error);
    return null;
  }
  if (
    isNetworkMountRoot(s) ||
    isNetworkMountRoot(resolve(e, s)) ||
    isNetworkMountRoot(resolve(n, s)) ||
    isOnForeignMount(s, e) ||
    rawPointerPathIsUnsafe(s, e)
  )
    return null;
  if (e !== n && (isOnForeignMount(s, n) || rawPointerPathIsUnsafe(s, n))) return null;
  return identity(dirname(resolve(n, s)));
}
export { resolveWslGitDir, isUnderSensitiveProfileDir, isAncestorOfSensitiveProfileDir };
