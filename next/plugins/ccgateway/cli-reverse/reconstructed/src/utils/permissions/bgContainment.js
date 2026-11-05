/**
 * utils/permissions/bgContainment.ts
 *
 * 后台任务路径约束（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (2), chunk-8nfjhq0y.js (17)
 * attribution: placement 19
 */
import { win32 } from "path";
import { logForDebugging } from "../debug.js";
import { isDeviceNamespacePath, hasDotSegment, identity, isMacSpecialPath } from "../pathClassification.js";
import { hasWin32DevicePrefixSpelling } from "../fsJunctions.js";
import {
  isWslLocalhostPath,
  isNonWslUncPath,
  isNetworkMountRoot,
  isNetworkMountPath_2,
} from "../networkPaths.js";
import { isSystemVolumePath } from "./protectedDirs.js";
import {
  resolveDeepestExistingAncestorSync,
  getFsImplementation,
  expandWin32ExistingLongNames,
} from "../fsOperations.js";
import { isENOENT } from "../errors.js";
import { isPathWithinCaseAware } from "../pathPrefix.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getPlatform } from "../platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-8nfjhq0y.js:19908-20027 placement
function toWin32Backslashes(inputPath) {
  let matches = /^[\\/]{2}/.test(inputPath);
  return (
    (matches ? "\\\\" : "") +
    (matches ? inputPath.replace(/^[\\/]{2,}/, "") : inputPath).replace(/[\\/]+/g, "\\")
  );
}
//@ chunk-8nfjhq0y.js:20027-20231 placement
function refuseContainmentSpelling(path, reason, surfaced) {
  logForDebugging(`bg-containment: refusing ${reason} spelling for containment: ${path}`, {
    level: "warn",
  });
  return surfaced === undefined
    ? {
        lexical: path,
        canonical: null,
        skipped: false,
      }
    : {
        lexical: path,
        canonical: null,
        skipped: false,
        surfaced,
      };
}
//@ chunk-8nfjhq0y.js:20231-20416 placement
function stripWin32LongPathPrefix(deepestExistingAncestor) {
  if (!isDeviceNamespacePath(deepestExistingAncestor)) return deepestExistingAncestor;
  let match = /^[\\/]{2}\?[\\/]([A-Za-z]:[\\/].*)$/.exec(deepestExistingAncestor);
  if (match) return match[1];
  let match_2 = /^[\\/]{2}\?[\\/]UNC[\\/](.+)$/i.exec(deepestExistingAncestor);
  if (match_2) return "\\\\" + match_2[1];
  return null;
}
//@ chunk-8nfjhq0y.js:20416-20441 placement
var TRAILING_DOT_OR_SPACE_BEFORE_SEPARATOR_RE = /[. ](?=[\\/]|$)/;
//@ chunk-8nfjhq0y.js:20441-21438 placement
function classifyContainmentPath(inputPath, platform = "linux") {
  if (hasDotSegment(inputPath)) return refuseContainmentSpelling(identity(inputPath), "dot-segment");
  let lexicalPath = identity(inputPath);
  if (platform === "win32") {
    lexicalPath = lexicalPath.replace(/^([\\/])[\\/]{2,}/, (match, separator) => separator + separator);
    if (isDeviceNamespacePath(lexicalPath) || hasWin32DevicePrefixSpelling(lexicalPath))
      return refuseContainmentSpelling(lexicalPath, "device-namespace");
    lexicalPath = isWslLocalhostPath(lexicalPath);
    if (TRAILING_DOT_OR_SPACE_BEFORE_SEPARATOR_RE.test(lexicalPath))
      return refuseContainmentSpelling(lexicalPath, "trailing-dot-or-space");
    if (isNonWslUncPath(lexicalPath))
      return {
        lexical: toWin32Backslashes(lexicalPath),
        canonical: null,
        skipped: true,
      };
    lexicalPath = toWin32Backslashes(lexicalPath);
  } else {
    lexicalPath = lexicalPath.replace(/\/{2,}/g, "/");
    if (platform === "darwin") lexicalPath = isSystemVolumePath(lexicalPath);
    if (isNetworkMountRoot(lexicalPath))
      return {
        lexical: isNetworkMountPath_2(lexicalPath, platform),
        canonical: null,
        skipped: true,
      };
  }
  let deepestExistingAncestor = resolveDeepestExistingAncestorSync(getFsImplementation(), lexicalPath, {
    surfaceDotDotTargets: true,
  });
  if (deepestExistingAncestor === undefined)
    return {
      lexical: lexicalPath,
      canonical: lexicalPath,
      skipped: false,
    };
  let resolvedAncestor =
    platform === "win32" ? stripWin32LongPathPrefix(deepestExistingAncestor) : deepestExistingAncestor;
  if (resolvedAncestor === null)
    return refuseContainmentSpelling(lexicalPath, "resolves-to-device-namespace");
  let normalizedResolved =
    platform === "win32"
      ? resolvedAncestor
      : platform === "darwin"
        ? isSystemVolumePath(resolvedAncestor.replace(/^\/{2,}/, "/"))
        : resolvedAncestor.replace(/^\/{2,}/, "/");
  if (
    isNonWslUncPath(normalizedResolved) ||
    isNetworkMountRoot(normalizedResolved) ||
    isMacSpecialPath(normalizedResolved)
  )
    return refuseContainmentSpelling(
      lexicalPath,
      "resolves-to-network",
      isNetworkMountPath_2(
        identity(platform === "win32" ? toWin32Backslashes(normalizedResolved) : normalizedResolved),
        platform,
      ),
    );
  if (hasDotSegment(normalizedResolved))
    return refuseContainmentSpelling(lexicalPath, "resolves-to-dot-segment");
  if (platform === "win32" && TRAILING_DOT_OR_SPACE_BEFORE_SEPARATOR_RE.test(normalizedResolved))
    return refuseContainmentSpelling(lexicalPath, "resolves-to-trailing-dot-or-space");
  let canonicalPath =
    platform === "win32"
      ? toWin32Backslashes(normalizedResolved)
      : normalizedResolved.replace(/\/{2,}/g, "/");
  return {
    lexical: lexicalPath,
    canonical: identity(canonicalPath),
    skipped: false,
  };
}
//@ chunk-8nfjhq0y.js:21438-22123 placement
function resolveContainmentTarget(inputPath, platform = "linux") {
  let firstResult;
  let currentPath = inputPath;
  try {
    for (let idx = 0; idx < 8; idx++) {
      let result = classifyContainmentPath(currentPath, platform);
      firstResult ??= result;
      if (result.skipped)
        return idx === 0 ? result : refuseContainmentSpelling(firstResult.lexical, "resolves-to-network");
      if (result.canonical === null)
        return idx === 0
          ? result
          : {
              ...result,
              lexical: firstResult.lexical,
            };
      if (result.canonical === currentPath) {
        try {
          if (getFsImplementation().lstatSync(currentPath).isSymbolicLink())
            return refuseContainmentSpelling(
              firstResult.lexical,
              "resolution-not-convergent",
              currentPath !== inputPath ? currentPath : undefined,
            );
        } catch (error) {
          if (!isENOENT(error)) throw error;
          if (platform === "win32")
            try {
              getFsImplementation().realpathSync(win32.dirname(currentPath));
            } catch (error) {
              if (!isENOENT(error))
                return refuseContainmentSpelling(
                  firstResult.lexical,
                  "resolution-not-convergent",
                  currentPath !== inputPath ? currentPath : undefined,
                );
            }
        }
        return {
          lexical: firstResult.lexical,
          canonical: currentPath,
          skipped: false,
        };
      }
      currentPath = result.canonical;
    }
  } catch {
    return refuseContainmentSpelling(
      firstResult?.lexical ?? identity(inputPath),
      "resolution-error",
      currentPath !== inputPath ? currentPath : undefined,
    );
  }
  return refuseContainmentSpelling(
    firstResult.lexical,
    "resolution-not-convergent",
    currentPath !== inputPath ? currentPath : undefined,
  );
}
//@ chunk-8nfjhq0y.js:22123-22664 placement
/**
 * 后台任务路径约束：比较目标与根的字面/规范拼写，网络路径与本地根不能互相包含（记日志），Windows 下还比较长文件名展开结果。返回 true 表示越界。
 */
function isOutsideContainment(target, root) {
  if (hasUnresolvedCanonicalPath(target)) return true;
  if (hasUnresolvedCanonicalPath(root)) {
    if (target.skipped) return true;
    if (
      isPathWithinRegisteredCaseAware(target.lexical, root.lexical) ||
      (target.canonical !== null && isPathWithinRegisteredCaseAware(target.canonical, root.lexical))
    )
      return true;
    if (
      root.surfaced !== undefined &&
      (isPathWithinRegisteredCaseAware(target.lexical, root.surfaced) ||
        (target.canonical !== null && isPathWithinRegisteredCaseAware(target.canonical, root.surfaced)))
    )
      return true;
    return false;
  }
  if (target.skipped && !root.skipped) {
    logForDebugging(`bg-containment: denying network-shaped target against a local root: ${target.lexical}`, {
      level: "warn",
    });
    return true;
  }
  if (target.skipped || root.skipped) return isPathWithinRegisteredCaseAware(target.lexical, root.lexical);
  return (
    isPathWithinRegisteredCaseAware(target.lexical, root.lexical) ||
    isPathWithinRegisteredCaseAware(target.canonical, root.canonical) ||
    isWithinByLongNames(target.canonical, root.canonical)
  );
}
//@ chunk-8nfjhq0y.js:22664-22698 placement
function isPathWithinRegisteredCaseAware(childPath, parentPath) {
  return isPathWithinCaseAware(childPath, parentPath, true);
}
//@ chunk-8nfjhq0y.js:22698-22708 placement
var MAX_LONG_NAME_EXPANSION_CACHE = 64;
//@ chunk-8nfjhq0y.js:22708-23002 placement
class LongNameExpansionCache {
  expansionByRootCanonical = new Map();
  expand(rootCanonical) {
    let expansion = this.expansionByRootCanonical.get(rootCanonical);
    if (expansion === undefined) {
      expansion = expandWin32ExistingLongNames(rootCanonical);
      if (this.expansionByRootCanonical.size >= MAX_LONG_NAME_EXPANSION_CACHE)
        this.expansionByRootCanonical.clear();
      this.expansionByRootCanonical.set(rootCanonical, expansion);
    }
    return expansion;
  }
  clear() {
    this.expansionByRootCanonical.clear();
  }
}
//@ chunk-8nfjhq0y.js:23002-23027 placement
var longNameExpansionCacheSlot; // deferred: uses LongNameExpansionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-8nfjhq0y.js:23002", () => {
  longNameExpansionCacheSlot = new HostScoped(() => new LongNameExpansionCache());
});
//@ chunk-8nfjhq0y.js:23027-23064 placement
function getLongNameExpansionCache() {
  return longNameExpansionCacheSlot.of(getRootSession().host);
}
//@ chunk-8nfjhq0y.js:23064-23197 placement
function isWithinByLongNames(path, canonical) {
  if (getPlatform() !== "windows") return false;
  let expanded = expandWin32ExistingLongNames(path);
  let otherExpanded = getLongNameExpansionCache().expand(canonical);
  if (expanded === path && otherExpanded === canonical) return false;
  return isSameIndexedPath(
    identity(toWin32Backslashes(expanded)),
    identity(toWin32Backslashes(otherExpanded)),
  );
}
//@ chunk-8nfjhq0y.js:23197-23232 placement
function isSameIndexedPath(firstPath, secondPath) {
  return isPathWithinCaseAware(firstPath, secondPath, true);
}
//@ chunk-8nfjhq0y.js:23232-23388 placement
/**
 * 判断两条路径包含关系记录是否相同：任一无效时为 false，跳过的比较字面形式，否则比较规范形式。
 */
function isSameContainmentPath(containmentTarget, otherTarget) {
  if (hasUnresolvedCanonicalPath(containmentTarget) || hasUnresolvedCanonicalPath(otherTarget)) return false;
  if (containmentTarget.skipped !== otherTarget.skipped) return false;
  if (containmentTarget.skipped)
    return isPathWithinLexicalOnly(containmentTarget.lexical, otherTarget.lexical);
  return isPathWithinLexicalOnly(containmentTarget.canonical, otherTarget.canonical);
}
//@ chunk-8nfjhq0y.js:23388-23423 placement
function isPathWithinLexicalOnly(childPath, parentPath) {
  return isPathWithinCaseAware(childPath, parentPath, false);
}
//@ chunk-8nfjhq0y.js:23423-23476 placement
/**
 * hasUnresolvedCanonicalPath：记录既没有规范路径也未被跳过。
 */
function hasUnresolvedCanonicalPath(target) {
  return target.canonical === null && !target.skipped;
}
//@ chunk-7jxyna5q.js:350187-350242 placement
/**
 * isCanonicalUnderRoot：规范路径位于根之下。
 */
function isCanonicalUnderRoot(canonicalPath, canonicalRoot) {
  return (
    canonicalPath !== null &&
    canonicalRoot !== null &&
    isPathWithinCaseAware(canonicalPath, canonicalRoot, true)
  );
}
//@ chunk-7jxyna5q.js:350242-350392 placement
/**
 * 路径与登记的写法只有大小写不同时，返回提示改写成登记写法的说明，否则空串。
 */
function describeCaseOnlyMismatch(canonicalPath, canonicalRoot, registeredSpelling) {
  return isCanonicalUnderRoot(canonicalPath, canonicalRoot)
    ? ` (this path differs from the registered spelling only by letter case \u2014 respell it to match ${registeredSpelling} exactly)`
    : "";
}
export {
  isSameContainmentPath,
  isOutsideContainment,
  resolveContainmentTarget,
  hasUnresolvedCanonicalPath,
  describeCaseOnlyMismatch,
  isCanonicalUnderRoot,
  toWin32Backslashes,
};
