/**
 * utils/settings/stickyRoots.ts
 *
 * 粘性根目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (5)
 * attribution: placement 5
 */
import { isAbsolutePlatformPath } from "../git.js";
import { POSIX_SEP, D4e, Q3r, M2 } from "../hooks/hookCommandAnalysis.js";
import { uniq } from "../collections.js";
import { getPlatform as getPlatform_2 } from "../platform.js";
import { SETTING_SOURCES } from "./constants.js";

/**
 * 计算粘性根目录：启动目录、同步根与额外目录（含真实路径），有非绝对路径时退化为根目录。
 */
//@ chunk-s61vbvea.js:308461-308615 placement
function stickyRootsFor(e) {
  let filtered = [e.launchDir, e.launchDirReal, e.syncRoot, e.syncRootReal, ...(e.extra ?? [])].filter(
    (r) => r !== void 0,
  );
  return filtered.some((r) => !isAbsolutePlatformPath(r)) ? [POSIX_SEP] : uniq(filtered);
}
//@ chunk-s61vbvea.js:308615-308674 placement
function m_(e, n) {
  return e.some((r) => n.some((s) => D4e(r, s)));
}
//@ chunk-s61vbvea.js:308674-308853 placement = setCwdState (0.757)
function pathsOverlapForPlatform(e, n) {
  let r =
    getPlatform_2() === "windows"
      ? (s) => Q3r(s).toLowerCase()
      : getPlatform_2() === "macos"
        ? (s) => s.normalize("NFC").toLowerCase()
        : (s) => s;
  return e.some((s) => n.some((h) => isAbsolutePlatformPath(h) && M2(r(s), r(h))));
}
//@ chunk-s61vbvea.js:308853-308896 placement
var UD = ["projectSettings", "localSettings"];
//@ chunk-s61vbvea.js:308896-309947 placement
async function collectStickyRoots({
  stickyRoots: stickyRoots,
  pinnedScopes: pinnedScopes,
  pinnedRoots: pinnedRoots,
  baseRoots: baseRoots,
  reachBaseline: reachBaseline,
  scopeSettingsFile: scopeSettingsFile,
  realpath: realpath,
  commonRoots: commonRoots,
  scopeRoots: scopeRoots,
}) {
  let x = new Map(),
    P = new Set();
  for (let q of SETTING_SOURCES) {
    let Q = scopeSettingsFile(q);
    if (Q !== null) {
      let Z = [Q];
      (await realpath(Q).then(
        (ee) => Z.push(ee),
        () => {
          if (q !== "policySettings") P.add(q);
        },
      ),
        x.set(q, Z));
    }
  }
  let j = (q, Q) => m_(x.get(q) ?? [], Q),
    G = (q) => {
      pinnedScopes.add(q);
      let Q = pinnedRoots.get(q);
      if (Q === void 0) ((Q = scopeRoots(q, reachBaseline.get(q) ?? [])), pinnedRoots.set(q, Q));
      for (let Z of Q) stickyRoots.add(Z);
    };
  for (let q of [...baseRoots, ...commonRoots()]) stickyRoots.add(q);
  for (let q of SETTING_SOURCES) if (pinnedScopes.has(q) || UD.includes(q) || P.has(q)) G(q);
  let L = new Set();
  for (;;) {
    let q = () => SETTING_SOURCES.filter((ae) => !pinnedScopes.has(ae) && !L.has(ae));
    for (let ae = !0; ae;) {
      ae = !1;
      let se = [...stickyRoots, ...[...pinnedScopes].flatMap((re) => scopeRoots(re, null))];
      for (let re of q())
        if (j(re, [...se, ...scopeRoots(re, reachBaseline.get(re) ?? [])])) (G(re), (ae = !0));
    }
    let Q = q();
    if (Q.length === 0) return [...stickyRoots];
    let Z = new Map(Q.map((ae) => [ae, scopeRoots(ae, null)])),
      filtered = Q.filter(
        (ae) =>
          !Q.some(
            (se) =>
              se !== ae && j(ae, [...(Z.get(se) ?? []), ...scopeRoots(se, reachBaseline.get(se) ?? [])]),
          ),
      );
    if (filtered.length === 0) {
      for (let ae of Q) G(ae);
      return [...stickyRoots];
    }
    for (let ae of filtered) {
      L.add(ae);
      for (let se of Z.get(ae) ?? []) stickyRoots.add(se);
    }
  }
}

export { m_, collectStickyRoots, pathsOverlapForPlatform, stickyRootsFor };
