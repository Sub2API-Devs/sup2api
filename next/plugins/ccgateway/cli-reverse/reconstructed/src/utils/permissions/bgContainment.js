/**
 * utils/permissions/bgContainment.ts
 *
 * 后台任务路径约束（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (19)
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
import { getPlatform as getPlatform_2 } from "../platform.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:425824-425942 placement
function toWin32Backslashes(inputPath) {
  let matches = /^[\\/]{2}/.test(inputPath);
  return (
    (matches ? "\\\\" : "") +
    (matches ? inputPath.replace(/^[\\/]{2,}/, "") : inputPath).replace(/[\\/]+/g, "\\")
  );
}
//@ chunk-s61vbvea.js:425942-426147 placement
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
//@ chunk-s61vbvea.js:426147-426332 placement
function stripWin32LongPathPrefix(deepestExistingAncestor) {
  if (!isDeviceNamespacePath(deepestExistingAncestor)) return deepestExistingAncestor;
  let match = /^[\\/]{2}\?[\\/]([A-Za-z]:[\\/].*)$/.exec(deepestExistingAncestor);
  if (match) return match[1];
  let match_2 = /^[\\/]{2}\?[\\/]UNC[\\/](.+)$/i.exec(deepestExistingAncestor);
  if (match_2) return "\\\\" + match_2[1];
  return null;
}
//@ chunk-s61vbvea.js:426332-426357 placement
var TRAILING_DOT_OR_SPACE_BEFORE_SEPARATOR_RE = /[. ](?=[\\/]|$)/;
//@ chunk-s61vbvea.js:426357-427357 placement
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
//@ chunk-s61vbvea.js:427357-428047 placement
function resolveContainmentTarget(inputPath, platform = "linux") {
  let firstResult;
  let currentPath = inputPath;
  try {
    for (let j = 0; j < 8; j++) {
      let result = classifyContainmentPath(currentPath, platform);
      firstResult ??= result;
      if (result.skipped)
        return j === 0 ? result : refuseContainmentSpelling(firstResult.lexical, "resolves-to-network");
      if (result.canonical === null)
        return j === 0
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
//@ chunk-s61vbvea.js:428047-428595 placement
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
//@ chunk-s61vbvea.js:428595-428630 placement
function isPathWithinRegisteredCaseAware(childPath, parentPath) {
  return isPathWithinCaseAware(childPath, parentPath, true);
}
//@ chunk-s61vbvea.js:428630-428640 placement
var MAX_LONG_NAME_EXPANSION_CACHE = 64;
//@ chunk-s61vbvea.js:428640-428934 placement
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
//@ chunk-s61vbvea.js:428934-428959 placement
var longNameExpansionCacheSlot; // deferred: uses LongNameExpansionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:428934", () => {
  longNameExpansionCacheSlot = new HostScoped(() => new LongNameExpansionCache());
});
//@ chunk-s61vbvea.js:428959-428996 placement
function getLongNameExpansionCache() {
  return longNameExpansionCacheSlot.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:428996-429127 placement
function isWithinByLongNames(path, canonical) {
  if (getPlatform_2() !== "windows") return false;
  let expanded = expandWin32ExistingLongNames(path);
  let otherExpanded = getLongNameExpansionCache().expand(canonical);
  if (expanded === path && otherExpanded === canonical) return false;
  return isSameIndexedPath(
    identity(toWin32Backslashes(expanded)),
    identity(toWin32Backslashes(otherExpanded)),
  );
}
//@ chunk-s61vbvea.js:429127-429162 placement
function isSameIndexedPath(firstPath, secondPath) {
  return isPathWithinCaseAware(firstPath, secondPath, true);
}
//@ chunk-s61vbvea.js:429162-429318 placement
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
//@ chunk-s61vbvea.js:429318-429353 placement
function isPathWithinLexicalOnly(childPath, parentPath) {
  return isPathWithinCaseAware(childPath, parentPath, false);
}
//@ chunk-s61vbvea.js:429353-429406 placement
/**
 * hasUnresolvedCanonicalPath：记录既没有规范路径也未被跳过。
 */
function hasUnresolvedCanonicalPath(target) {
  return target.canonical === null && !target.skipped;
}
//@ chunk-s61vbvea.js:429406-429461 placement
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
//@ chunk-s61vbvea.js:429461-429611 placement
/**
 * 路径与登记的写法只有大小写不同时，返回提示改写成登记写法的说明，否则空串。
 */
function describeCaseOnlyMismatch(canonicalPath, canonicalRoot, registeredSpelling) {
  return isCanonicalUnderRoot(canonicalPath, canonicalRoot)
    ? ` (this path differs from the registered spelling only by letter case \u2014 respell it to match ${registeredSpelling} exactly)`
    : "";
}
export {
  resolveContainmentTarget,
  hasUnresolvedCanonicalPath,
  isOutsideContainment,
  isSameContainmentPath,
  describeCaseOnlyMismatch,
  isCanonicalUnderRoot,
  toWin32Backslashes,
};
