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
import {
  POSIX_SEP_2,
  isSameCommandPath,
  stripWin32DevicePrefix,
  isPathUnderForPlatform,
} from "../hooks/hookCommandAnalysis.js";
import { uniq } from "../collections.js";
import { getPlatform as getPlatform_2 } from "../platform.js";
import { SETTING_SOURCES } from "./constants.js";

//@ chunk-s61vbvea.js:308461-308615 placement
/**
 * 计算粘性根目录：启动目录、同步根与额外目录（含真实路径），有非绝对路径时退化为根目录。
 */
function stickyRootsFor(e) {
  let filtered = [e.launchDir, e.launchDirReal, e.syncRoot, e.syncRootReal, ...(e.extra ?? [])].filter(
    (r) => r !== undefined,
  );
  return filtered.some((r) => !isAbsolutePlatformPath(r)) ? [POSIX_SEP_2] : uniq(filtered);
}
//@ chunk-s61vbvea.js:308615-308674 placement
/**
 * anyPairMatches：任一两两匹配。
 */
function anyPairMatches(e, n) {
  return e.some((r) => n.some((s) => isSameCommandPath(r, s)));
}
//@ chunk-s61vbvea.js:308674-308853 placement = setCwdState (0.757)
function pathsOverlapForPlatform(e, n) {
  let r =
    getPlatform_2() === "windows"
      ? (s) => stripWin32DevicePrefix(s).toLowerCase()
      : getPlatform_2() === "macos"
        ? (s) => s.normalize("NFC").toLowerCase()
        : (s) => s;
  return e.some((s) => n.some((h) => isAbsolutePlatformPath(h) && isPathUnderForPlatform(r(s), r(h))));
}
//@ chunk-s61vbvea.js:308853-308896 placement
var REPO_DIR_SETTING_SOURCES = ["projectSettings", "localSettings"];
//@ chunk-s61vbvea.js:308896-309947 placement
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
  let x = new Map();
  let P = new Set();
  for (let q of SETTING_SOURCES) {
    let Q = scopeSettingsFile(q);
    if (Q !== null) {
      let Z = [Q];
      await realpath(Q).then(
        (ee) => Z.push(ee),
        () => {
          if (q !== "policySettings") P.add(q);
        },
      );
      x.set(q, Z);
    }
  }
  let j = (q, Q) => anyPairMatches(x.get(q) ?? [], Q);
  let G = (q) => {
    pinnedScopes.add(q);
    let Q = pinnedRoots.get(q);
    if (Q === undefined) {
      Q = scopeRoots(q, reachBaseline.get(q) ?? []);
      pinnedRoots.set(q, Q);
    }
    for (let Z of Q) stickyRoots.add(Z);
  };
  for (let q of [...baseRoots, ...commonRoots()]) stickyRoots.add(q);
  for (let q of SETTING_SOURCES)
    if (pinnedScopes.has(q) || REPO_DIR_SETTING_SOURCES.includes(q) || P.has(q)) G(q);
  let L = new Set();
  for (;;) {
    let q = () => SETTING_SOURCES.filter((ae) => !pinnedScopes.has(ae) && !L.has(ae));
    for (let ae = true; ae;) {
      ae = false;
      let se = [...stickyRoots, ...[...pinnedScopes].flatMap((pinnedScope) => scopeRoots(pinnedScope, null))];
      for (let re of q())
        if (j(re, [...se, ...scopeRoots(re, reachBaseline.get(re) ?? [])])) {
          G(re);
          ae = true;
        }
    }
    let Q = q();
    if (Q.length === 0) return [...stickyRoots];
    let Z = new Map(Q.map((ae) => [ae, scopeRoots(ae, null)]));
    let filtered = Q.filter(
      (ae) =>
        !Q.some(
          (se) => se !== ae && j(ae, [...(Z.get(se) ?? []), ...scopeRoots(se, reachBaseline.get(se) ?? [])]),
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
export { anyPairMatches, collectStickyRoots, pathsOverlapForPlatform, stickyRootsFor };
