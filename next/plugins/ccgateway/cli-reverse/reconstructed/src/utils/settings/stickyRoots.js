/**
 * utils/settings/stickyRoots.ts
 *
 * 粘性根目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (5)
 * attribution: placement 5
 */
import { isAbsolutePlatformPath } from "../git.js";
import {
  POSIX_SEP_2,
  isSameCommandPath,
  stripWin32DevicePrefix,
  isPathUnderForPlatform,
} from "../hooks/hookCommandAnalysis.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { getPlatform as getPlatform_2 } from "../platform.js";
import { SETTING_SOURCES } from "./constants.js";

//@ chunk-7jxyna5q.js:231888-232042 placement
/**
 * 计算粘性根目录：启动目录、同步根与额外目录（含真实路径），有非绝对路径时退化为根目录。
 */
function stickyRootsFor(roots) {
  let filtered = [
    roots.launchDir,
    roots.launchDirReal,
    roots.syncRoot,
    roots.syncRootReal,
    ...(roots.extra ?? []),
  ].filter((root) => root !== undefined);
  return filtered.some((root) => !isAbsolutePlatformPath(root))
    ? [POSIX_SEP_2]
    : normalizeCaseForComparison_2(filtered);
}
//@ chunk-7jxyna5q.js:232042-232101 placement
/**
 * anyPairMatches：任一两两匹配。
 */
function anyPairMatches(leftPaths, rightPaths) {
  return leftPaths.some((leftPath) => rightPaths.some((rightPath) => isSameCommandPath(leftPath, rightPath)));
}
//@ chunk-7jxyna5q.js:232101-232280 placement (2.1.88 match: setCwdState, 0.757)
function pathsOverlapForPlatform(leftPaths, rightPaths) {
  let normalizePath =
    getPlatform_2() === "windows"
      ? (path) => stripWin32DevicePrefix(path).toLowerCase()
      : getPlatform_2() === "macos"
        ? (path) => path.normalize("NFC").toLowerCase()
        : (path) => path;
  return leftPaths.some((leftPath) =>
    rightPaths.some(
      (rightPath) =>
        isAbsolutePlatformPath(rightPath) &&
        isPathUnderForPlatform(normalizePath(leftPath), normalizePath(rightPath)),
    ),
  );
}
//@ chunk-7jxyna5q.js:232280-232323 placement (2.1.88 match: isApiKeyHelperFromProjectOrLocalSettings, 0.83)
var REPO_DIR_SETTING_SOURCES = ["projectSettings", "localSettings"];
//@ chunk-7jxyna5q.js:232323-233382 placement
async function collectStickyRoots({
  stickyRoots,
  pinnedScopes,
  pinnedRoots,
  baseRoots,
  reachBaseline,
  scopeSettingsFile,
  realpath,
  commonRoots,
  scopeRoots,
}) {
  let pathsByScope = new Map();
  let unresolvedScopes = new Set();
  for (let scope of SETTING_SOURCES) {
    let filePath = scopeSettingsFile(scope);
    if (filePath !== null) {
      let spellings = [filePath];
      await realpath(filePath).then(
        (realPath) => spellings.push(realPath),
        () => {
          if (scope !== "policySettings") unresolvedScopes.add(scope);
        },
      );
      pathsByScope.set(scope, spellings);
    }
  }
  let scopeOverlaps = (scope, roots) => anyPairMatches(pathsByScope.get(scope) ?? [], roots);
  let pinScope = (scope) => {
    pinnedScopes.add(scope);
    let roots = pinnedRoots.get(scope);
    if (roots === undefined) {
      roots = scopeRoots(scope, reachBaseline.get(scope) ?? []);
      pinnedRoots.set(scope, roots);
    }
    for (let root of roots) stickyRoots.add(root);
  };
  for (let root of [...baseRoots, ...commonRoots()]) stickyRoots.add(root);
  for (let scope of SETTING_SOURCES)
    if (pinnedScopes.has(scope) || REPO_DIR_SETTING_SOURCES.includes(scope) || unresolvedScopes.has(scope))
      pinScope(scope);
  let placedScopes = new Set();
  for (;;) {
    let unplacedScopes = () =>
      SETTING_SOURCES.filter((scope) => !pinnedScopes.has(scope) && !placedScopes.has(scope));
    for (let foundNew = true; foundNew;) {
      foundNew = false;
      let currentRoots = [
        ...stickyRoots,
        ...[...pinnedScopes].flatMap((pinnedScope) => scopeRoots(pinnedScope, null)),
      ];
      for (let scope of unplacedScopes())
        if (scopeOverlaps(scope, [...currentRoots, ...scopeRoots(scope, reachBaseline.get(scope) ?? [])])) {
          pinScope(scope);
          foundNew = true;
        }
    }
    let unplaced = unplacedScopes();
    if (unplaced.length === 0) return [...stickyRoots];
    let rootsByScope = new Map(unplaced.map((scope) => [scope, scopeRoots(scope, null)]));
    let filtered = unplaced.filter(
      (candidate) =>
        !unplaced.some(
          (other) =>
            other !== candidate &&
            scopeOverlaps(candidate, [
              ...(rootsByScope.get(other) ?? []),
              ...scopeRoots(other, reachBaseline.get(other) ?? []),
            ]),
        ),
    );
    if (filtered.length === 0) {
      for (let scope of unplaced) pinScope(scope);
      return [...stickyRoots];
    }
    for (let scope of filtered) {
      placedScopes.add(scope);
      for (let root of rootsByScope.get(scope) ?? []) stickyRoots.add(root);
    }
  }
}
export { anyPairMatches, collectStickyRoots, stickyRootsFor, pathsOverlapForPlatform };
