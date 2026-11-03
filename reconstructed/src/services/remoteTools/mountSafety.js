/**
 * services/remoteTools/mountSafety.ts
 *
 * 2.1.316 新增。远程工具服务的挂载安全分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e2fknt7w.js (18)
 * attribution: placement 17, affinity 1
 */
import { homedir } from "os";
import { posix } from "path";
import { statSync } from "fs";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { getProjectDirsUpToHome } from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { isAbsolutePlatformPath, normalizeCommandForPlatform } from "../../utils/git.js";
import { servingBasesFor, realpathOrSpelling_2 } from "./servingGates.js";
import { getWslWindowsUserDirs } from "../../utils/tmuxSocket.js";
import { withPathAliases, getClaudeConfigDirs } from "../../utils/permissions/claudeStatePaths.js";
import { getPlatform } from "../../utils/platform.js";
import { uniq } from "../../utils/collections.js";
import {
  classifyUncPath,
  uncAdminShareToDrive,
  rewriteUncHostFromReference,
  isPathUnderForPlatform,
  differsByUncPrefix,
  isSameUncHostShortNamePair,
} from "../../utils/hooks/hookCommandAnalysis.js";
import {
  pathWithMountAliases,
  isOnSameWslMount,
  normalizedVolumePaths,
  driveMountsForPath,
  otherWindowsMountsForPath,
  driveMountsUnder,
  otherWindowsMountsUnder,
  getOtherWindowsMountLines,
} from "../../utils/wslMounts.js";
import { windowsPowerShellProfileDirs, windowsAutoRunDirs } from "./windowsProfileDirs.js";
import { isUnderSensitiveProfileDir, isAncestorOfSensitiveProfileDir } from "../../utils/wslPaths.js";
import {
  profileSpellings,
  WINDOWS_PROFILE_FOLDER_NAMES,
  foldedPathSegments,
} from "../../utils/windowsProfileFolders.js";
import { foldCaseBasic } from "../../utils/pathIdentity.js";
import { identity } from "../../utils/identity.js";
import { getErrnoCode } from "../../utils/errors.js";

//@ chunk-e2fknt7w.js:18342-19169 placement
function classifyMountForServing(dir, n) {
  let o = homedir();
  let claudeConfigDir = getClaudeConfigDir();
  let projectDirsUpToHome = getProjectDirsUpToHome();
  if (
    !isAbsolutePlatformPath(o) ||
    !isAbsolutePlatformPath(claudeConfigDir) ||
    !isAbsolutePlatformPath(projectDirsUpToHome)
  )
    return true;
  let u = servingBasesFor(dir);
  if (u === "refused_outright") return true;
  if (touchesWindowsRootFromWsl(u, n) || mountsUnderLaunch(u, n)) return true;
  let wslWindowsUserDirs = getWslWindowsUserDirs(u);
  let a = realpathOrSpelling_2(o);
  let bases = [o, a];
  let w = [...bases, ...wslWindowsUserDirs];
  let E = filterWslMountedPaths(bases);
  let Z = withPathAliases(getClaudeConfigDirs());
  let Q = getPlatform() === "windows" ? Z.map((p) => realpathOrSpelling_2(p)) : [];
  let C = uniq([...Z, ...Q]);
  if (
    getPlatform() === "windows" &&
    ([...w, ...C].some((p) => {
      let R = classifyUncPath(normalizeCommandForPlatform(p));
      return R === "own_host" || R === "wsl_host";
    }) ||
      [a, ...Q].some((p) => classifyUncPath(normalizeCommandForPlatform(p)) === "short_name"))
  )
    return true;
  let mapped = bases.map((p) => normalizeCommandForPlatform(p));
  let T = uniq(u.flatMap(pathWithMountAliases));
  return (
    [...w, ...C.flatMap(pathWithMountAliases)].some((p) => u.some((R) => isSameOrUnder(p, R))) ||
    T.some((p) => C.some((R) => isSameOrUnder(p, R))) ||
    T.some(
      (p) =>
        [p, uncAdminShareToDrive(p)].some((R) => isUnderAny(R, bases, E)) ||
        mapped.some((R) => isUnderAny(rewriteUncHostFromReference(normalizeCommandForPlatform(p), R), [R])),
    ) ||
    profileMountPointsUnder(bases, n).some((p) =>
      T.some((R) => isOnSameWslMount(R, p) || isOnSameWslMount(p, R)),
    ) ||
    windowsRootMountPoints(n).some(({ mountPoint, place }) =>
      T.some(
        (J) =>
          isOnSameWslMount(mountPoint, J) ||
          normalizedVolumePaths(J, mountPoint).some((ke) =>
            isRootOrSensitiveProfileAncestor(posix.join(place, ...ke)),
          ),
      ),
    ) ||
    anyPairSameOrUnder([...windowsPowerShellProfileDirs(), ...windowsAutoRunDirs()], u)
  );
}
//@ chunk-e2fknt7w.js:19169-19284 placement = execTmux (0.805)
function filterWslMountedPaths(e) {
  return getPlatform() === "wsl"
    ? e.filter((n) => {
        let normalized = posix.normalize(n);
        return driveMountsForPath(normalized).length > 0 || otherWindowsMountsForPath(normalized).length > 0;
      })
    : [];
}
//@ chunk-e2fknt7w.js:19284-19486 placement
function profileMountPointsUnder(bases, scope) {
  let o = filterWslMountedPaths(bases);
  return uniq([
    ...bases.flatMap((base) => pathWithMountAliases(base).slice(1)).filter((r) => isUnderAny(r, bases, o)),
    ...pathWithMountAliases("/")
      .slice(1)
      .filter((r) =>
        windowsProfileRoots(r, scope).some(
          (s) => posix.normalize(s) !== "/" && isUnderSensitiveProfileDir(s, ["/"], "windows_on_wsl"),
        ),
      ),
  ]);
}
//@ chunk-e2fknt7w.js:19486-19634 placement
function windowsRootMountPoints(e) {
  return pathWithMountAliases("/")
    .slice(1)
    .flatMap((n) =>
      windowsProfileRoots(n, e)
        .filter((o) => o === "/" || isAncestorOfSensitiveProfileDir(o, ["/"], "windows_on_wsl"))
        .map((place) => ({
          mountPoint: n,
          place,
        })),
    );
}
//@ chunk-e2fknt7w.js:19634-19737 placement
function isUnderAny(e, n, o = []) {
  return (
    isUnderSensitiveProfileDir(e, n) ||
    (getPlatform() === "windows" && isAncestorOfSensitiveProfileDir(e, n)) ||
    (o.length > 0 && isUnderSensitiveProfileDir(e, o, "windows_on_wsl"))
  );
}
//@ chunk-e2fknt7w.js:19737-19844 placement
function isSameOrUnder(e, n) {
  let o = normalizeCommandForPlatform(n);
  let r = rewriteUncHostFromReference(normalizeCommandForPlatform(e), o);
  return (
    isPathUnderForPlatform(r, o) ||
    (getPlatform() === "windows" && (differsByUncPrefix(r, o) || isSameUncHostShortNamePair(r, o))) ||
    isOnSameWslMount(e, n)
  );
}
//@ chunk-e2fknt7w.js:19844-20000 placement
function isRemoteUncHost(e) {
  switch (classifyUncPath(e)) {
    case undefined:
    case "webdav_host":
      return false;
    case "numeric_host":
      return !IPV4_PATTERN.test(/^\\\\([^\\@]+)/.exec(e)?.[1] ?? "");
    default:
      return true;
  }
}
//@ chunk-e2fknt7w.js:20000-20091 placement
var IPV4_PATTERN = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d?)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
//@ chunk-e2fknt7w.js:20376-20453 affinity = execTmux (1)
function touchesWindowsRootFromWsl(args, opts) {
  if (getPlatform() !== "wsl") return false;
  return args.some((arg) => windowsProfileRoots(arg, opts).some(isRootOrSensitiveProfileAncestor));
}
//@ chunk-e2fknt7w.js:20453-20545 placement
/**
 * 路径是根目录，或是敏感用户目录的祖先/包含者。
 */
function isRootOrSensitiveProfileAncestor(e) {
  return (
    e === "/" ||
    isUnderSensitiveProfileDir(e, ["/"], "windows_on_wsl") ||
    isAncestorOfSensitiveProfileDir(e, ["/"], "windows_on_wsl")
  );
}
//@ chunk-e2fknt7w.js:20545-20727 placement
function windowsProfileRoots(e, n) {
  let normalized = posix.normalize(e);
  return (
    n === "all"
      ? [...driveMountsForPath(normalized), ...otherWindowsMountsForPath(normalized)]
      : driveMountsForPath(normalized)
  ).flatMap((s) =>
    profileSpellings(s.beneath).flatMap((u) =>
      u.length >= 2 && WINDOWS_PROFILE_FOLDER_NAMES(u[0]) ? [`/${u.slice(2).join("/")}`] : [],
    ),
  );
}
//@ chunk-e2fknt7w.js:20727-21443 placement
function mountsUnderLaunch(e, n) {
  if (getPlatform() !== "wsl") return false;
  return e.some((o) => {
    let normalized = posix.normalize(o);
    let s = driveMountsForPath(normalized);
    let u =
      n === "all"
        ? otherWindowsMountsForPath(normalized).filter(
            (d) =>
              !s.some((a) => a.within === "" && a.mountPoint === d.mountPoint && a.beneath === d.beneath),
          )
        : [];
    return (
      ROOT_MOUNT_POINTS.has(
        foldCaseBasic(normalized.length > 1 ? normalized.replace(/\/+$/, "") : normalized),
      ) ||
      [...s, ...u].some((d) => {
        let a = foldedPathSegments(d.beneath);
        return a.length === 1 && WINDOWS_PROFILE_FOLDER_NAMES(a[0]);
      }) ||
      driveMountsUnder(normalized).some((d) => startsWithWindowsProfileFolder(d.within)) ||
      (n === "all" &&
        otherWindowsMountsUnder(normalized).some((d) => startsWithWindowsProfileFolder(d.within))) ||
      driveMountsUnder(normalized).some(
        (d) => hasNoWindowsProfilePath(d.within) && hasWindowsUserProfileDirs(d.mountPoint),
      ) ||
      s.some((d) => hasNoWindowsProfilePath(d.beneath) && hasWindowsUserProfileDirs(d.mountPoint)) ||
      u.some((d) => {
        if (!hasNoWindowsProfilePath(d.beneath)) return false;
        let otherWindowsMountLines = getOtherWindowsMountLines(d.mountPoint);
        if (otherWindowsMountLines === undefined) return hasWindowsUserProfileDirs(d.mountPoint);
        let m = `${d.mountPoint}
${otherWindowsMountLines}`;
        let w = windowsProfileMountCache.get(m);
        if (w !== undefined) return w;
        let E = hasWindowsUserProfileDirs(d.mountPoint);
        windowsProfileMountCache.set(m, E);
        return E;
      })
    );
  });
}
//@ chunk-e2fknt7w.js:21443-21482 placement
/**
 * 路径里没有 Windows 用户目录片段。
 */
function hasNoWindowsProfilePath(e) {
  return foldedPathSegments(e).length === 0;
}
//@ chunk-e2fknt7w.js:21482-21539 placement
/**
 * 路径首个片段是 Windows 用户目录名。
 */
function startsWithWindowsProfileFolder(within) {
  let n = foldedPathSegments(within);
  return n.length > 0 && WINDOWS_PROFILE_FOLDER_NAMES(n[0]);
}
//@ chunk-e2fknt7w.js:21539-21598 placement
/**
 * WSL 挂载安全检查的辅助常量：Windows 用户目录判定缓存，以及直接当作根挂载的路径集合。
 */
var windowsProfileMountCache = identity(new Map(), (e) => e.clear());
var ROOT_MOUNT_POINTS = new Set(["/", "/mnt"]);
//@ chunk-e2fknt7w.js:21598-21732 placement = isRealPathWithinTeamDir (1)
function hasWindowsUserProfileDirs(realCandidate) {
  return WINDOWS_PROFILE_ROOT_NAMES.some((n) => {
    try {
      return statSync(`${realCandidate}/${n}`).isDirectory();
    } catch (error) {
      let code = getErrnoCode(error);
      return code !== "ENOENT" && code !== "ENOTDIR";
    }
  });
}
//@ chunk-e2fknt7w.js:21732-21804 placement
var WINDOWS_PROFILE_ROOT_NAMES = ["Users", "Documents and Settings", "Dokumente und Einstellungen"];
//@ chunk-e2fknt7w.js:21804-21869 placement
function anyPairSameOrUnder(e, n) {
  return e.some((o) => n.some((r) => isSameOrUnder(r, o) || isSameOrUnder(o, r)));
}
export { classifyMountForServing, isRemoteUncHost, profileMountPointsUnder, windowsRootMountPoints };
