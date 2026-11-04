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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e2fknt7w.js:18342-19169 placement
function classifyMountForServing(cwd, otherSide) {
  let homeDir = homedir();
  let claudeConfigDir = getClaudeConfigDir();
  let projectDirsUpToHome = getProjectDirsUpToHome();
  if (
    !isAbsolutePlatformPath(homeDir) ||
    !isAbsolutePlatformPath(claudeConfigDir) ||
    !isAbsolutePlatformPath(projectDirsUpToHome)
  )
    return true;
  let bases = servingBasesFor(cwd);
  if (bases === "refused_outright") return true;
  if (touchesWindowsRootFromWsl(bases, otherSide) || mountsUnderLaunch(bases, otherSide)) return true;
  let wslWindowsUserDirs = getWslWindowsUserDirs(bases);
  let homeReal = realpathOrSpelling_2(homeDir);
  let homeBases = [homeDir, homeReal];
  let homeBases_2 = [...homeBases, ...wslWindowsUserDirs];
  let mountedHomeBases = filterWslMountedPaths(homeBases);
  let configDirs = withPathAliases(getClaudeConfigDirs());
  let configRealDirs = getPlatform() === "windows" ? configDirs.map((dir) => realpathOrSpelling_2(dir)) : [];
  let allConfigDirs = uniq([...configDirs, ...configRealDirs]);
  if (
    getPlatform() === "windows" &&
    ([...homeBases_2, ...allConfigDirs].some((path) => {
      let uncKind = classifyUncPath(normalizeCommandForPlatform(path));
      return uncKind === "own_host" || uncKind === "wsl_host";
    }) ||
      [homeReal, ...configRealDirs].some(
        (path) => classifyUncPath(normalizeCommandForPlatform(path)) === "short_name",
      ))
  )
    return true;
  let mapped = homeBases.map((base) => normalizeCommandForPlatform(base));
  let aliasedBases = uniq(bases.flatMap(pathWithMountAliases));
  return (
    [...homeBases_2, ...allConfigDirs.flatMap(pathWithMountAliases)].some((path) =>
      bases.some((base) => isSameOrUnder(path, base)),
    ) ||
    aliasedBases.some((aliased) => allConfigDirs.some((configDir) => isSameOrUnder(aliased, configDir))) ||
    aliasedBases.some(
      (aliased) =>
        [aliased, uncAdminShareToDrive(aliased)].some((candidate) =>
          isUnderAny(candidate, homeBases, mountedHomeBases),
        ) ||
        mapped.some((mappedBase) =>
          isUnderAny(rewriteUncHostFromReference(normalizeCommandForPlatform(aliased), mappedBase), [
            mappedBase,
          ]),
        ),
    ) ||
    profileMountPointsUnder(homeBases, otherSide).some((mountPoint) =>
      aliasedBases.some(
        (aliased) => isOnSameWslMount(aliased, mountPoint) || isOnSameWslMount(mountPoint, aliased),
      ),
    ) ||
    windowsRootMountPoints(otherSide).some(({ mountPoint, place }) =>
      aliasedBases.some(
        (aliased) =>
          isOnSameWslMount(mountPoint, aliased) ||
          normalizedVolumePaths(aliased, mountPoint).some((relativeParts) =>
            isRootOrSensitiveProfileAncestor(posix.join(place, ...relativeParts)),
          ),
      ),
    ) ||
    anyPairSameOrUnder([...windowsPowerShellProfileDirs(), ...windowsAutoRunDirs()], bases)
  );
}
//@ chunk-e2fknt7w.js:19169-19284 placement = execTmux (0.805)
function filterWslMountedPaths(paths) {
  return getPlatform() === "wsl"
    ? paths.filter((path) => {
        let normalized = posix.normalize(path);
        return driveMountsForPath(normalized).length > 0 || otherWindowsMountsForPath(normalized).length > 0;
      })
    : [];
}
//@ chunk-e2fknt7w.js:19284-19486 placement
function profileMountPointsUnder(bases, scope) {
  let mountedBases = filterWslMountedPaths(bases);
  return uniq([
    ...bases
      .flatMap((base) => pathWithMountAliases(base).slice(1))
      .filter((alias) => isUnderAny(alias, bases, mountedBases)),
    ...pathWithMountAliases("/")
      .slice(1)
      .filter((mountPoint) =>
        windowsProfileRoots(mountPoint, scope).some(
          (root) =>
            posix.normalize(root) !== "/" && isUnderSensitiveProfileDir(root, ["/"], "windows_on_wsl"),
        ),
      ),
  ]);
}
//@ chunk-e2fknt7w.js:19486-19634 placement
function windowsRootMountPoints(scope) {
  return pathWithMountAliases("/")
    .slice(1)
    .flatMap((mountPoint) =>
      windowsProfileRoots(mountPoint, scope)
        .filter((place) => place === "/" || isAncestorOfSensitiveProfileDir(place, ["/"], "windows_on_wsl"))
        .map((place) => ({
          mountPoint,
          place,
        })),
    );
}
//@ chunk-e2fknt7w.js:19634-19737 placement
function isUnderAny(path, bases, mountedBases = []) {
  return (
    isUnderSensitiveProfileDir(path, bases) ||
    (getPlatform() === "windows" && isAncestorOfSensitiveProfileDir(path, bases)) ||
    (mountedBases.length > 0 && isUnderSensitiveProfileDir(path, mountedBases, "windows_on_wsl"))
  );
}
//@ chunk-e2fknt7w.js:19737-19844 placement
function isSameOrUnder(first, second) {
  let normalizedSecond = normalizeCommandForPlatform(second);
  let rewrittenFirst = rewriteUncHostFromReference(normalizeCommandForPlatform(first), normalizedSecond);
  return (
    isPathUnderForPlatform(rewrittenFirst, normalizedSecond) ||
    (getPlatform() === "windows" &&
      (differsByUncPrefix(rewrittenFirst, normalizedSecond) ||
        isSameUncHostShortNamePair(rewrittenFirst, normalizedSecond))) ||
    isOnSameWslMount(first, second)
  );
}
//@ chunk-e2fknt7w.js:19844-20000 placement
function isRemoteUncHost(path) {
  switch (classifyUncPath(path)) {
    case undefined:
    case "webdav_host":
      return false;
    case "numeric_host":
      return !IPV4_PATTERN.test(/^\\\\([^\\@]+)/.exec(path)?.[1] ?? "");
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
function isRootOrSensitiveProfileAncestor(path) {
  return (
    path === "/" ||
    isUnderSensitiveProfileDir(path, ["/"], "windows_on_wsl") ||
    isAncestorOfSensitiveProfileDir(path, ["/"], "windows_on_wsl")
  );
}
//@ chunk-e2fknt7w.js:20545-20727 placement
function windowsProfileRoots(path, scope) {
  let normalized = posix.normalize(path);
  return (
    scope === "all"
      ? [...driveMountsForPath(normalized), ...otherWindowsMountsForPath(normalized)]
      : driveMountsForPath(normalized)
  ).flatMap((mount) =>
    profileSpellings(mount.beneath).flatMap((parts) =>
      parts.length >= 2 && WINDOWS_PROFILE_FOLDER_NAMES(parts[0]) ? [`/${parts.slice(2).join("/")}`] : [],
    ),
  );
}
//@ chunk-e2fknt7w.js:20727-21443 placement
function mountsUnderLaunch(bases, scope) {
  if (getPlatform() !== "wsl") return false;
  return bases.some((base) => {
    let dir = posix.normalize(base);
    let driveMounts = driveMountsForPath(dir);
    let otherMounts =
      scope === "all"
        ? otherWindowsMountsForPath(dir).filter(
            (otherMount) =>
              !driveMounts.some(
                (driveMount) =>
                  driveMount.within === "" &&
                  driveMount.mountPoint === otherMount.mountPoint &&
                  driveMount.beneath === otherMount.beneath,
              ),
          )
        : [];
    return (
      ROOT_MOUNT_POINTS.has(foldCaseBasic(dir.length > 1 ? dir.replace(/\/+$/, "") : dir)) ||
      [...driveMounts, ...otherMounts].some((mount) => {
        let segments = foldedPathSegments(mount.beneath);
        return segments.length === 1 && WINDOWS_PROFILE_FOLDER_NAMES(segments[0]);
      }) ||
      driveMountsUnder(dir).some((mount) => startsWithWindowsProfileFolder(mount.within)) ||
      (scope === "all" &&
        otherWindowsMountsUnder(dir).some((otherMount) =>
          startsWithWindowsProfileFolder(otherMount.within),
        )) ||
      driveMountsUnder(dir).some(
        (mount) => hasNoWindowsProfilePath(mount.within) && hasWindowsUserProfileDirs(mount.mountPoint),
      ) ||
      driveMounts.some(
        (mount) => hasNoWindowsProfilePath(mount.beneath) && hasWindowsUserProfileDirs(mount.mountPoint),
      ) ||
      otherMounts.some((otherMount) => {
        if (!hasNoWindowsProfilePath(otherMount.beneath)) return false;
        let otherWindowsMountLines = getOtherWindowsMountLines(otherMount.mountPoint);
        if (otherWindowsMountLines === undefined) return hasWindowsUserProfileDirs(otherMount.mountPoint);
        let cacheKey = `${otherMount.mountPoint}
${otherWindowsMountLines}`;
        let cached = windowsProfileMountCache.get(cacheKey);
        if (cached !== undefined) return cached;
        let hasProfileDirs = hasWindowsUserProfileDirs(otherMount.mountPoint);
        windowsProfileMountCache.set(cacheKey, hasProfileDirs);
        return hasProfileDirs;
      })
    );
  });
}
//@ chunk-e2fknt7w.js:21443-21482 placement
/**
 * 路径里没有 Windows 用户目录片段。
 */
function hasNoWindowsProfilePath(within) {
  return foldedPathSegments(within).length === 0;
}
//@ chunk-e2fknt7w.js:21482-21539 placement
/**
 * 路径首个片段是 Windows 用户目录名。
 */
function startsWithWindowsProfileFolder(within) {
  let segments = foldedPathSegments(within);
  return segments.length > 0 && WINDOWS_PROFILE_FOLDER_NAMES(segments[0]);
}
//@ chunk-e2fknt7w.js:21539-21598 placement
/**
 * WSL 挂载安全检查的辅助常量：Windows 用户目录判定缓存，以及直接当作根挂载的路径集合。
 */
var windowsProfileMountCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ROOT_MOUNT_POINTS;
deferInit("chunk-e2fknt7w.js:21539", () => {
  windowsProfileMountCache = identity(new Map(), (cache) => cache.clear());
  ROOT_MOUNT_POINTS = new Set(["/", "/mnt"]);
});
//@ chunk-e2fknt7w.js:21598-21732 placement = isRealPathWithinTeamDir (1)
function hasWindowsUserProfileDirs(realCandidate) {
  return WINDOWS_PROFILE_ROOT_NAMES.some((name) => {
    try {
      return statSync(`${realCandidate}/${name}`).isDirectory();
    } catch (error) {
      let code = getErrnoCode(error);
      return code !== "ENOENT" && code !== "ENOTDIR";
    }
  });
}
//@ chunk-e2fknt7w.js:21732-21804 placement
var WINDOWS_PROFILE_ROOT_NAMES = ["Users", "Documents and Settings", "Dokumente und Einstellungen"];
//@ chunk-e2fknt7w.js:21804-21869 placement
function anyPairSameOrUnder(first, second) {
  return first.some((left) =>
    second.some((right) => isSameOrUnder(right, left) || isSameOrUnder(left, right)),
  );
}
export { classifyMountForServing, isRemoteUncHost, profileMountPointsUnder, windowsRootMountPoints };
