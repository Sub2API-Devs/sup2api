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

//@ chunk-s61vbvea.js:425824-425942 placement
function toWin32Backslashes(e) {
  let matches = /^[\\/]{2}/.test(e);
  return (matches ? "\\\\" : "") + (matches ? e.replace(/^[\\/]{2,}/, "") : e).replace(/[\\/]+/g, "\\");
}
//@ chunk-s61vbvea.js:425942-426147 placement
function refuseContainmentSpelling(e, n, r) {
  logForDebugging(`bg-containment: refusing ${n} spelling for containment: ${e}`, {
    level: "warn",
  });
  return r === undefined
    ? {
        lexical: e,
        canonical: null,
        skipped: false,
      }
    : {
        lexical: e,
        canonical: null,
        skipped: false,
        surfaced: r,
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
function classifyContainmentPath(e, n = "linux") {
  if (hasDotSegment(e)) return refuseContainmentSpelling(identity(e), "dot-segment");
  let r = identity(e);
  if (n === "win32") {
    r = r.replace(/^([\\/])[\\/]{2,}/, (w, R) => R + R);
    if (isDeviceNamespacePath(r) || hasWin32DevicePrefixSpelling(r))
      return refuseContainmentSpelling(r, "device-namespace");
    r = isWslLocalhostPath(r);
    if (TRAILING_DOT_OR_SPACE_BEFORE_SEPARATOR_RE.test(r))
      return refuseContainmentSpelling(r, "trailing-dot-or-space");
    if (isNonWslUncPath(r))
      return {
        lexical: toWin32Backslashes(r),
        canonical: null,
        skipped: true,
      };
    r = toWin32Backslashes(r);
  } else {
    r = r.replace(/\/{2,}/g, "/");
    if (n === "darwin") r = isSystemVolumePath(r);
    if (isNetworkMountRoot(r))
      return {
        lexical: isNetworkMountPath_2(r, n),
        canonical: null,
        skipped: true,
      };
  }
  let deepestExistingAncestor = resolveDeepestExistingAncestorSync(getFsImplementation(), r, {
    surfaceDotDotTargets: true,
  });
  if (deepestExistingAncestor === undefined)
    return {
      lexical: r,
      canonical: r,
      skipped: false,
    };
  let h = n === "win32" ? stripWin32LongPathPrefix(deepestExistingAncestor) : deepestExistingAncestor;
  if (h === null) return refuseContainmentSpelling(r, "resolves-to-device-namespace");
  let y =
    n === "win32"
      ? h
      : n === "darwin"
        ? isSystemVolumePath(h.replace(/^\/{2,}/, "/"))
        : h.replace(/^\/{2,}/, "/");
  if (isNonWslUncPath(y) || isNetworkMountRoot(y) || isMacSpecialPath(y))
    return refuseContainmentSpelling(
      r,
      "resolves-to-network",
      isNetworkMountPath_2(identity(n === "win32" ? toWin32Backslashes(y) : y), n),
    );
  if (hasDotSegment(y)) return refuseContainmentSpelling(r, "resolves-to-dot-segment");
  if (n === "win32" && TRAILING_DOT_OR_SPACE_BEFORE_SEPARATOR_RE.test(y))
    return refuseContainmentSpelling(r, "resolves-to-trailing-dot-or-space");
  let S = n === "win32" ? toWin32Backslashes(y) : y.replace(/\/{2,}/g, "/");
  return {
    lexical: r,
    canonical: identity(S),
    skipped: false,
  };
}
//@ chunk-s61vbvea.js:427357-428047 placement
function resolveContainmentTarget(e, n = "linux") {
  let s;
  let h = e;
  try {
    for (let j = 0; j < 8; j++) {
      let S = classifyContainmentPath(h, n);
      s ??= S;
      if (S.skipped) return j === 0 ? S : refuseContainmentSpelling(s.lexical, "resolves-to-network");
      if (S.canonical === null)
        return j === 0
          ? S
          : {
              ...S,
              lexical: s.lexical,
            };
      if (S.canonical === h) {
        try {
          if (getFsImplementation().lstatSync(h).isSymbolicLink())
            return refuseContainmentSpelling(s.lexical, "resolution-not-convergent", h !== e ? h : undefined);
        } catch (error) {
          if (!isENOENT(error)) throw error;
          if (n === "win32")
            try {
              getFsImplementation().realpathSync(win32.dirname(h));
            } catch (error) {
              if (!isENOENT(error))
                return refuseContainmentSpelling(
                  s.lexical,
                  "resolution-not-convergent",
                  h !== e ? h : undefined,
                );
            }
        }
        return {
          lexical: s.lexical,
          canonical: h,
          skipped: false,
        };
      }
      h = S.canonical;
    }
  } catch {
    return refuseContainmentSpelling(s?.lexical ?? identity(e), "resolution-error", h !== e ? h : undefined);
  }
  return refuseContainmentSpelling(s.lexical, "resolution-not-convergent", h !== e ? h : undefined);
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
function isPathWithinRegisteredCaseAware(e, n) {
  return isPathWithinCaseAware(e, n, true);
}
//@ chunk-s61vbvea.js:428630-428640 placement
var MAX_LONG_NAME_EXPANSION_CACHE = 64;
//@ chunk-s61vbvea.js:428640-428934 placement
class LongNameExpansionCache {
  expansionByRootCanonical = new Map();
  expand(e) {
    let n = this.expansionByRootCanonical.get(e);
    if (n === undefined) {
      n = expandWin32ExistingLongNames(e);
      if (this.expansionByRootCanonical.size >= MAX_LONG_NAME_EXPANSION_CACHE)
        this.expansionByRootCanonical.clear();
      this.expansionByRootCanonical.set(e, n);
    }
    return n;
  }
  clear() {
    this.expansionByRootCanonical.clear();
  }
}
//@ chunk-s61vbvea.js:428934-428959 placement
var longNameExpansionCacheSlot = new HostScoped(() => new LongNameExpansionCache());
//@ chunk-s61vbvea.js:428959-428996 placement
function getLongNameExpansionCache() {
  return longNameExpansionCacheSlot.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:428996-429127 placement
function isWithinByLongNames(canonical, canonical_2) {
  if (getPlatform_2() !== "windows") return false;
  let r = expandWin32ExistingLongNames(canonical);
  let s = getLongNameExpansionCache().expand(canonical_2);
  if (r === canonical && s === canonical_2) return false;
  return isSameIndexedPath(identity(toWin32Backslashes(r)), identity(toWin32Backslashes(s)));
}
//@ chunk-s61vbvea.js:429127-429162 placement
function isSameIndexedPath(e, n) {
  return isPathWithinCaseAware(e, n, true);
}
//@ chunk-s61vbvea.js:429162-429318 placement
/**
 * 判断两条路径包含关系记录是否相同：任一无效时为 false，跳过的比较字面形式，否则比较规范形式。
 */
function isSameContainmentPath(containmentTarget, n) {
  if (hasUnresolvedCanonicalPath(containmentTarget) || hasUnresolvedCanonicalPath(n)) return false;
  if (containmentTarget.skipped !== n.skipped) return false;
  if (containmentTarget.skipped) return isPathWithinLexicalOnly(containmentTarget.lexical, n.lexical);
  return isPathWithinLexicalOnly(containmentTarget.canonical, n.canonical);
}
//@ chunk-s61vbvea.js:429318-429353 placement
function isPathWithinLexicalOnly(e, n) {
  return isPathWithinCaseAware(e, n, false);
}
//@ chunk-s61vbvea.js:429353-429406 placement
/**
 * hasUnresolvedCanonicalPath：记录既没有规范路径也未被跳过。
 */
function hasUnresolvedCanonicalPath(e) {
  return e.canonical === null && !e.skipped;
}
//@ chunk-s61vbvea.js:429406-429461 placement
/**
 * isCanonicalUnderRoot：规范路径位于根之下。
 */
function isCanonicalUnderRoot(e, n) {
  return e !== null && n !== null && isPathWithinCaseAware(e, n, true);
}
//@ chunk-s61vbvea.js:429461-429611 placement
/**
 * 路径与登记的写法只有大小写不同时，返回提示改写成登记写法的说明，否则空串。
 */
function describeCaseOnlyMismatch(e, n, r) {
  return isCanonicalUnderRoot(e, n)
    ? ` (this path differs from the registered spelling only by letter case \u2014 respell it to match ${r} exactly)`
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
