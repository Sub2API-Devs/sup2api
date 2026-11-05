/**
 * services/remoteTools/mountSafety.ts
 *
 * 2.1.316 新增。远程工具服务的挂载安全分类。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2214fejy.js (18)
 * attribution: placement 17, sole-consumer 1
 */
import { homedir } from "os";
import { posix } from "path";
import { statSync } from "fs";
import { getClaudeConfigDir } from "../../utils/markdownConfigLoader.js";
import { getProjectDirsUpToHome } from "../../utils/secureStorage/macOsKeychainHelpers.js";
import { isAbsolutePlatformPath, normalizeCommandForPlatform } from "../../utils/git.js";
import { servingBasesFor, realpathOrSpelling_2 } from "./servingGates.js";
import { touchesWindowsRootFromWsl } from "../../utils/tmuxSocket.js";
import { withPathAliases, getClaudeConfigDirs } from "../../utils/permissions/claudeStatePaths.js";
import { getPlatform } from "../../utils/platform.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
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
import { countWhere } from "../../utils/collections.js";
import {
  WINDOWS_PROFILE_FOLDER_NAMES,
  foldCaseSimple,
  profileSpellings,
  foldedPathSegments,
} from "../../utils/windowsProfileFolders.js";
import { foldCaseBasic } from "../../utils/pathIdentity.js";
import { identity } from "../../utils/identity.js";
import { getErrnoCode } from "../../utils/errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2214fejy.js:18345-19172 placement
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
  let allConfigDirs = normalizeCaseForComparison_2([...configDirs, ...configRealDirs]);
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
  let aliasedBases = normalizeCaseForComparison_2(bases.flatMap(pathWithMountAliases));
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
//@ chunk-2214fejy.js:19172-19287 placement (2.1.88 match: execTmux, 0.805)
function filterWslMountedPaths(paths) {
  return getPlatform() === "wsl"
    ? paths.filter((path) => {
        let normalized = posix.normalize(path);
        return driveMountsForPath(normalized).length > 0 || otherWindowsMountsForPath(normalized).length > 0;
      })
    : [];
}
//@ chunk-2214fejy.js:19287-19489 placement
function profileMountPointsUnder(bases, scope) {
  let mountedBases = filterWslMountedPaths(bases);
  return normalizeCaseForComparison_2([
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
//@ chunk-2214fejy.js:19489-19637 placement
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
//@ chunk-2214fejy.js:19637-19740 placement
function isUnderAny(path, bases, mountedBases = []) {
  return (
    isUnderSensitiveProfileDir(path, bases) ||
    (getPlatform() === "windows" && isAncestorOfSensitiveProfileDir(path, bases)) ||
    (mountedBases.length > 0 && isUnderSensitiveProfileDir(path, mountedBases, "windows_on_wsl"))
  );
}
//@ chunk-2214fejy.js:19740-19847 placement
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
//@ chunk-2214fejy.js:19847-20003 placement
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
//@ chunk-2214fejy.js:20003-20094 placement
var IPV4_PATTERN = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d?)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
//@ chunk-2214fejy.js:20094-20379 sole-consumer
function getWslWindowsUserDirs(dirs) {
  if (getPlatform() !== "wsl") return [];
  return normalizeCaseForComparison_2(
    dirs.flatMap((dir) =>
      driveMountsForPath(posix.normalize(dir)).flatMap((mount) => {
        let filtered = mount.beneath.split("/").filter(Boolean);
        let path = countWhere(mount.within.split("/"), Boolean);
        return filtered.length >= 2 && path <= 2 && WINDOWS_PROFILE_FOLDER_NAMES(foldCaseSimple(filtered[0]))
          ? [[mount.mountPoint, ...filtered.slice(path, 2)].join("/").replace(/^\/\//, "/")]
          : [];
      }),
    ),
  );
}
//@ chunk-2214fejy.js:20456-20548 placement
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
//@ chunk-2214fejy.js:20548-20730 placement
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
//@ chunk-2214fejy.js:20730-21446 placement
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
//@ chunk-2214fejy.js:21446-21485 placement
/**
 * 路径里没有 Windows 用户目录片段。
 */
function hasNoWindowsProfilePath(within) {
  return foldedPathSegments(within).length === 0;
}
//@ chunk-2214fejy.js:21485-21542 placement
/**
 * 路径首个片段是 Windows 用户目录名。
 */
function startsWithWindowsProfileFolder(within) {
  let segments = foldedPathSegments(within);
  return segments.length > 0 && WINDOWS_PROFILE_FOLDER_NAMES(segments[0]);
}
//@ chunk-2214fejy.js:21542-21601 placement
/**
 * WSL 挂载安全检查的辅助常量：Windows 用户目录判定缓存，以及直接当作根挂载的路径集合。
 */
var windowsProfileMountCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ROOT_MOUNT_POINTS;
deferInit("chunk-2214fejy.js:21542", () => {
  windowsProfileMountCache = identity(new Map(), (cache) => cache.clear());
  ROOT_MOUNT_POINTS = new Set(["/", "/mnt"]);
});
//@ chunk-2214fejy.js:21601-21735 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
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
//@ chunk-2214fejy.js:21735-21807 placement
var WINDOWS_PROFILE_ROOT_NAMES = ["Users", "Documents and Settings", "Dokumente und Einstellungen"];
//@ chunk-2214fejy.js:21807-21872 placement
function anyPairSameOrUnder(first, second) {
  return first.some((left) =>
    second.some((right) => isSameOrUnder(right, left) || isSameOrUnder(left, right)),
  );
}
export {
  classifyMountForServing,
  isRemoteUncHost,
  profileMountPointsUnder,
  windowsRootMountPoints,
  windowsProfileRoots,
  isRootOrSensitiveProfileAncestor,
};
