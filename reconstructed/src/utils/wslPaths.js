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
  relative,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
import { homedir, homedir as homedir_2 } from "os";
import { opendir, open, open as open_2, open as open_3 } from "fs/promises";
import { Mn } from "./pathClassification.js";
import { getPlatform } from "./platform.js";
import { findGitRootRecheckingNegative, findGitRoot, findCanonicalGitRoot } from "./git.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { foldCaseSimple, YEr, xuo } from "./windowsProfileFolders.js";
import { Cp } from "./pathIdentity.js";
import { driveMountsForPath, car } from "./wslMounts.js";
import { getFsImplementation } from "./fsOperations.js";
import { isSadFsErrno } from "./errors.js";
import { logError } from "./log.js";
import { readPositionIsUnsafe, pointerFileIsSuspect, rawPointerPathIsUnsafe } from "./git/gitFilesystem.js";
import { yl, isOnForeignMount } from "./networkPaths.js";

//@ chunk-82kqcve8.js:174786-174804 placement
var Mg = 32,
  ci = 4096;
//@ chunk-82kqcve8.js:174804-175416 placement
async function resolveWslGitDir(e) {
  let n = join_11(e, ".git", "worktrees"),
    r = await readDirNamesBounded(n, join_11(e, ".git"));
  if (r.length === 0) return [];
  let s = await rr(e);
  if (s === null) return [];
  let h = await rr(n);
  if (h === null) return [];
  let y = Tg();
  if (y === null) return [];
  let w = Mn(y),
    S = await rr(w),
    R = S === null || S === w ? [w] : [w, S],
    results = await Promise.all(r.map((L) => readGitdirFile(join_11(n, L), join_11(h, L)))),
    P = [];
  for (let L of results) {
    if (L === null || !Cg(L)) continue;
    let j = await rr(L);
    if (j === null) continue;
    if (
      isUnderSensitiveProfileDir(L, R) ||
      isUnderSensitiveProfileDir(j, R) ||
      (getPlatform() === "windows" &&
        (isAncestorOfSensitiveProfileDir(L, R) || isAncestorOfSensitiveProfileDir(j, R)))
    )
      continue;
    if (isPathInside(L, e) || isPathInside(L, s) || isPathInside(j, e) || isPathInside(j, s)) continue;
    let G = canonicalGitRootFresh(L);
    if (G === null || G === L) continue;
    if (G === e || (await rr(G)) === s) P.push(L);
  }
  return P;
}
//@ chunk-82kqcve8.js:175416-175496 placement
function Cg(e) {
  if (findGitRootRecheckingNegative(e) === e) return !0;
  return (getGitRepoCache().rootByPath.delete(e), findGitRoot(e) === e);
}
//@ chunk-82kqcve8.js:175496-175599 placement
function canonicalGitRootFresh(e) {
  let n = findCanonicalGitRoot(e);
  if (n !== null && n !== e) return n;
  return (getGitRepoCache().canonicalRootByRoot.delete(e), findCanonicalGitRoot(e));
}
//@ chunk-82kqcve8.js:175599-175622 placement
function di() {
  return !1;
}
//@ chunk-82kqcve8.js:175622-175694 placement
function xg(e) {
  if (e === "windows_on_wsl") return foldCaseSimple;
  return di() ? Cp : (n) => n;
}
//@ chunk-82kqcve8.js:175694-175836 placement
function isPathInside(e, n) {
  let r = di(),
    s = r ? Cp(e) : e,
    h = r ? Cp(n) : n;
  if (s === h) return !0;
  let y = relative(s, h);
  return y !== "" && y !== ".." && !y.startsWith(`..${sep_7}`) && !isAbsolute_2(y);
}
/**
 * 用户目录下不应作为挂载或同步目标的敏感子目录（Library、AppData、开始菜单、PowerShell 配置目录、bin 等，支持 OneDrive* 通配）。
 */
//@ chunk-82kqcve8.js:175836-176222 placement
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
/**
 * 判断路径是否位于用户目录本身或其敏感子目录（含点开头目录）之内。
 */
//@ chunk-82kqcve8.js:176222-176433 placement
function isUnderSensitiveProfileDir(e, n, r = "platform") {
  return ql(e, n, r, (s) => {
    if (s.length === 0) return !0;
    if (s[0].startsWith(".") || (r === "windows_on_wsl" && YEr(s[0]))) return !0;
    return PROFILE_SENSITIVE_DIRS.some((h) =>
      h.every((y, w) => s[w] !== void 0 && matchesProfileSegment(s[w], y, r)),
    );
  });
}
/**
 * 判断路径是否是用户目录下某个敏感子目录的上级。
 */
//@ chunk-82kqcve8.js:176433-176582 placement
function isAncestorOfSensitiveProfileDir(e, n, r = "platform") {
  return ql(e, n, r, (s) => {
    if (s.length === 0) return !1;
    return PROFILE_SENSITIVE_DIRS.some(
      (h) => s.length < h.length && s.every((y, w) => matchesProfileSegment(y, h[w], r)),
    );
  });
}
//@ chunk-82kqcve8.js:176582-176641 placement
function ql(e, n, r, s) {
  return n.some((h) => relativeSegmentsUnder(e, h, r).some(s));
}
/**
 * 计算路径相对用户目录的各种分段形式（WSL 访问 Windows 时兼顾 /mnt 与盘符写法），不在其下时为空。
 */
//@ chunk-82kqcve8.js:176641-177068 placement
function relativeSegmentsUnder(e, n, r) {
  if (r === "windows_on_wsl") {
    let y = driveMountsForPath(posix_2.normalize(e)),
      w = driveMountsForPath(posix_2.normalize(n));
    if (y.length === 0 || w.length === 0) {
      let filtered = foldCaseSimple(posix_2.normalize(e)).split("/").filter(Boolean),
        filtered_2 = foldCaseSimple(posix_2.normalize(n)).split("/").filter(Boolean);
      return [
        ...car(e, n),
        ...(filtered_2.length <= filtered.length && filtered_2.every((O, P) => xuo(O, filtered[P]))
          ? [filtered.slice(filtered_2.length)]
          : []),
      ];
    }
    return car(e, n);
  }
  if (!isPathInside(n, e)) return [];
  let s = di(),
    h = relative(s ? Cp(n) : n, s ? Cp(e) : e);
  return [h === "" ? [] : h.split(sep_7)];
}
//@ chunk-82kqcve8.js:177068-177247 placement
function matchesProfileSegment(e, n, r) {
  if (r === "windows_on_wsl" && YEr(e)) return !0;
  let s = xg(r);
  if (!n.endsWith("*")) return s(e) === s(n);
  let h = s(n.slice(0, -1)),
    y = s(e);
  return y === h || y.startsWith(`${h} - `);
}
//@ chunk-82kqcve8.js:177247-177316 placement
function Tg() {
  try {
    let e = homedir_2();
    return e === "" ? null : e;
  } catch {
    return null;
  }
}
//@ chunk-82kqcve8.js:177316-177412 placement
async function rr(e) {
  try {
    return Mn(await getFsImplementation().realpath(e));
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
      for (let read = await r.read(); read !== null; read = await r.read()) {
        if (s.length === Mg) return [];
        s.push(read.name);
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
  let r = join_11(e, "gitdir");
  if (pointerFileIsSuspect(r, e)) return null;
  let s;
  try {
    let h = await open_3(r, "r");
    try {
      let alloc = Buffer.alloc(ci),
        { bytesRead: bytesRead } = await h.read(alloc, 0, ci, 0);
      if (bytesRead === ci) return null;
      s = alloc.toString("utf-8", 0, bytesRead).trim();
    } finally {
      await h.close();
    }
  } catch (error) {
    if (!isSadFsErrno(error)) logError(error);
    return null;
  }
  if (
    yl(s) ||
    yl(resolve_5(e, s)) ||
    yl(resolve_5(n, s)) ||
    isOnForeignMount(s, e) ||
    rawPointerPathIsUnsafe(s, e)
  )
    return null;
  if (e !== n && (isOnForeignMount(s, n) || rawPointerPathIsUnsafe(s, n))) return null;
  return Mn(dirname_5(resolve_5(n, s)));
}

export { resolveWslGitDir, isUnderSensitiveProfileDir, isAncestorOfSensitiveProfileDir };
