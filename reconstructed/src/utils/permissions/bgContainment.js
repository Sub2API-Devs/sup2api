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
import { uT, cl, Mn, isMacSpecialPath } from "../pathClassification.js";
import { iM } from "../fsJunctions.js";
import { isWslLocalhostPath, ai, yl, isNetworkMountPath } from "../networkPaths.js";
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
  return (
    logForDebugging(`bg-containment: refusing ${n} spelling for containment: ${e}`, { level: "warn" }),
    r === void 0
      ? { lexical: e, canonical: null, skipped: !1 }
      : { lexical: e, canonical: null, skipped: !1, surfaced: r }
  );
}
//@ chunk-s61vbvea.js:426147-426332 placement
function stripWin32LongPathPrefix(e) {
  if (!uT(e)) return e;
  let match = /^[\\/]{2}\?[\\/]([A-Za-z]:[\\/].*)$/.exec(e);
  if (match) return match[1];
  let match_2 = /^[\\/]{2}\?[\\/]UNC[\\/](.+)$/i.exec(e);
  if (match_2) return "\\\\" + match_2[1];
  return null;
}
//@ chunk-s61vbvea.js:426332-426357 placement
var rb = /[. ](?=[\\/]|$)/;
//@ chunk-s61vbvea.js:426357-427357 placement
function classifyContainmentPath(e, n = "linux") {
  if (cl(e)) return refuseContainmentSpelling(Mn(e), "dot-segment");
  let r = Mn(e);
  if (n === "win32") {
    if (((r = r.replace(/^([\\/])[\\/]{2,}/, (w, R) => R + R)), uT(r) || iM(r)))
      return refuseContainmentSpelling(r, "device-namespace");
    if (((r = isWslLocalhostPath(r)), rb.test(r)))
      return refuseContainmentSpelling(r, "trailing-dot-or-space");
    if (ai(r)) return { lexical: toWin32Backslashes(r), canonical: null, skipped: !0 };
    r = toWin32Backslashes(r);
  } else {
    if (((r = r.replace(/\/{2,}/g, "/")), n === "darwin")) r = isSystemVolumePath(r);
    if (yl(r)) return { lexical: isNetworkMountPath(r, n), canonical: null, skipped: !0 };
  }
  let s = resolveDeepestExistingAncestorSync(getFsImplementation(), r, { surfaceDotDotTargets: !0 });
  if (s === void 0) return { lexical: r, canonical: r, skipped: !1 };
  let h = n === "win32" ? stripWin32LongPathPrefix(s) : s;
  if (h === null) return refuseContainmentSpelling(r, "resolves-to-device-namespace");
  let y =
    n === "win32"
      ? h
      : n === "darwin"
        ? isSystemVolumePath(h.replace(/^\/{2,}/, "/"))
        : h.replace(/^\/{2,}/, "/");
  if (ai(y) || yl(y) || isMacSpecialPath(y))
    return refuseContainmentSpelling(
      r,
      "resolves-to-network",
      isNetworkMountPath(Mn(n === "win32" ? toWin32Backslashes(y) : y), n),
    );
  if (cl(y)) return refuseContainmentSpelling(r, "resolves-to-dot-segment");
  if (n === "win32" && rb.test(y)) return refuseContainmentSpelling(r, "resolves-to-trailing-dot-or-space");
  let S = n === "win32" ? toWin32Backslashes(y) : y.replace(/\/{2,}/g, "/");
  return { lexical: r, canonical: Mn(S), skipped: !1 };
}
//@ chunk-s61vbvea.js:427357-428047 placement
function resolveContainmentTarget(e, n = "linux") {
  let s,
    h = e;
  try {
    for (let y = 0; y < 8; y++) {
      let S = classifyContainmentPath(h, n);
      if (((s ??= S), S.skipped))
        return y === 0 ? S : refuseContainmentSpelling(s.lexical, "resolves-to-network");
      if (S.canonical === null) return y === 0 ? S : { ...S, lexical: s.lexical };
      if (S.canonical === h) {
        try {
          if (getFsImplementation().lstatSync(h).isSymbolicLink())
            return refuseContainmentSpelling(s.lexical, "resolution-not-convergent", h !== e ? h : void 0);
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
                  h !== e ? h : void 0,
                );
            }
        }
        return { lexical: s.lexical, canonical: h, skipped: !1 };
      }
      h = S.canonical;
    }
  } catch {
    return refuseContainmentSpelling(s?.lexical ?? Mn(e), "resolution-error", h !== e ? h : void 0);
  }
  return refuseContainmentSpelling(s.lexical, "resolution-not-convergent", h !== e ? h : void 0);
}
/**
 * 后台任务路径约束：比较目标与根的字面/规范拼写，网络路径与本地根不能互相包含（记日志），Windows 下还比较长文件名展开结果。返回 true 表示越界。
 */
//@ chunk-s61vbvea.js:428047-428595 placement
function isOutsideContainment(target, root) {
  if (NW(target)) return !0;
  if (NW(root)) {
    if (target.skipped) return !0;
    if (lo(target.lexical, root.lexical) || (target.canonical !== null && lo(target.canonical, root.lexical)))
      return !0;
    if (
      root.surfaced !== void 0 &&
      (lo(target.lexical, root.surfaced) ||
        (target.canonical !== null && lo(target.canonical, root.surfaced)))
    )
      return !0;
    return !1;
  }
  if (target.skipped && !root.skipped)
    return (
      logForDebugging(
        `bg-containment: denying network-shaped target against a local root: ${target.lexical}`,
        { level: "warn" },
      ),
      !0
    );
  if (target.skipped || root.skipped) return lo(target.lexical, root.lexical);
  return (
    lo(target.lexical, root.lexical) ||
    lo(target.canonical, root.canonical) ||
    isWithinByLongNames(target.canonical, root.canonical)
  );
}
//@ chunk-s61vbvea.js:428595-428630 placement
function lo(e, n) {
  return isPathWithinCaseAware(e, n, !0);
}
//@ chunk-s61vbvea.js:428630-428640 placement
var d0 = 64;
//@ chunk-s61vbvea.js:428640-428934 placement
class LongNameExpansionCache {
  expansionByRootCanonical = new Map();
  expand(e) {
    let n = this.expansionByRootCanonical.get(e);
    if (n === void 0) {
      if (((n = expandWin32ExistingLongNames(e)), this.expansionByRootCanonical.size >= d0))
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
var f0 = new HostScoped(() => new LongNameExpansionCache());
//@ chunk-s61vbvea.js:428959-428996 placement
function p0() {
  return f0.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:428996-429127 placement
function isWithinByLongNames(e, n) {
  if (getPlatform_2() !== "windows") return !1;
  let r = expandWin32ExistingLongNames(e),
    expand = p0().expand(n);
  if (r === e && expand === n) return !1;
  return y0(Mn(toWin32Backslashes(r)), Mn(toWin32Backslashes(expand)));
}
//@ chunk-s61vbvea.js:429127-429162 placement
function y0(e, n) {
  return isPathWithinCaseAware(e, n, !0);
}
/**
 * 判断两条路径包含关系记录是否相同：任一无效时为 false，跳过的比较字面形式，否则比较规范形式。
 */
//@ chunk-s61vbvea.js:429162-429318 placement
function isSameContainmentPath(e, n) {
  if (NW(e) || NW(n)) return !1;
  if (e.skipped !== n.skipped) return !1;
  if (e.skipped) return ob(e.lexical, n.lexical);
  return ob(e.canonical, n.canonical);
}
//@ chunk-s61vbvea.js:429318-429353 placement
function ob(e, n) {
  return isPathWithinCaseAware(e, n, !1);
}
//@ chunk-s61vbvea.js:429353-429406 placement
function NW(e) {
  return e.canonical === null && !e.skipped;
}
//@ chunk-s61vbvea.js:429406-429461 placement
function Nf(e, n) {
  return e !== null && n !== null && isPathWithinCaseAware(e, n, !0);
}
/**
 * 路径与登记的写法只有大小写不同时，返回提示改写成登记写法的说明，否则空串。
 */
//@ chunk-s61vbvea.js:429461-429611 placement
function describeCaseOnlyMismatch(e, n, r) {
  return Nf(e, n)
    ? ` (this path differs from the registered spelling only by letter case \u2014 respell it to match ${r} exactly)`
    : "";
}

export {
  resolveContainmentTarget,
  NW,
  isOutsideContainment,
  isSameContainmentPath,
  describeCaseOnlyMismatch,
  Nf,
  toWin32Backslashes,
};
