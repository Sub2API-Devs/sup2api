/**
 * utils/settings/settingsStorage.ts
 *
 * 无盘会话设置写入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (12)
 * attribution: placement 12
 */
import { dirname, dirname as dirname_2, dirname as dirname_3, dirname as dirname_4 } from "path";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ge } from "../identity.js";
import { Tm } from "../windowsUncPaths.js";
import { normalizedRealHomeDir } from "./settingsFileParsing.js";
import { Mn } from "../pathClassification.js";
import { findCanonicalGitRoot, findCanonicalGitRootUncached, findGitRoot } from "../git.js";
import { uniq } from "../collections.js";

//@ chunk-q8cqcff6.js:2705-2880 placement
function warnDisklessSettingsWrite(e, n) {
  (logForDebugging(
    `Diskless session: skipped the ${e} write to ${n} because no storage backend could take it`,
    { level: "warn" },
  ),
    logEvent("tengu_diskless_write_skipped", { writer: fromEnum(e) }));
}
//@ chunk-q8cqcff6.js:2912-2958 placement
function dY(e, { uncached: n = !1 } = {}) {
  return null;
}
//@ chunk-q8cqcff6.js:2958-2992 placement
var zt = ge(new Map(), (e) => e.clear());
/**
 * 判断目录（解析真实路径后）是否就是用户主目录，结果缓存。
 */
//@ chunk-q8cqcff6.js:2992-3174 placement
function isHomeDirRoot(e, { uncached: n = !1 } = {}) {
  let r = n ? void 0 : zt.get(e);
  if (r !== void 0) return r;
  let s = Tm(e);
  if (s === null) return;
  let S;
  try {
    S = normalizedRealHomeDir();
  } catch {
    return;
  }
  let E = Mn(s) === S;
  return (zt.set(e, E), E);
}
//@ chunk-q8cqcff6.js:3174-3208 placement
var Wa = ge(new Map(), (e) => e.clear());
//@ chunk-q8cqcff6.js:3208-3251 placement
function gi(e, { uncached: n = !1 } = {}) {
  return !1;
}
/**
 * 从给定路径向上查找最近的可识别存储根目录，返回根目录与是否可读。
 */
//@ chunk-q8cqcff6.js:3251-3455 placement
function findNearestRoot(e, { uncached: n = !1 } = {}) {
  let r = e;
  for (;;) {
    let s = dY(r, { uncached: n });
    if (s === null) return null;
    let S = gi(s, { uncached: n });
    if (S !== !1) return { root: s, readable: S === !0 };
    let E = dirname_2(s);
    if (E === s) return null;
    r = E;
  }
}
//@ chunk-q8cqcff6.js:3455-3643 placement
function resolveStorageRoot(e, n, r) {
  let s = findNearestRoot(e, { uncached: r });
  if (s === null) return n();
  if (!s.readable) return null;
  switch (isHomeDirRoot(s.root, { uncached: r })) {
    case !1:
      return s.root;
    case !0:
      return n();
    default:
      return null;
  }
}
//@ chunk-q8cqcff6.js:3643-3684 placement
function GD(e) {
  return resolveStorageRoot(e, () => findCanonicalGitRoot(e), !1);
}
//@ chunk-q8cqcff6.js:3684-3725 placement
function eA(e) {
  return resolveStorageRoot(e, () => findCanonicalGitRootUncached(e), !0);
}
//@ chunk-q8cqcff6.js:3725-3801 placement
function iIn(e) {
  let n = findNearestRoot(e);
  return n !== null && isHomeDirRoot(n.root) !== !0 ? n.root : findGitRoot(e);
}
//@ chunk-q8cqcff6.js:3801-3863 placement
function xRi(e) {
  return uniq([GD(e), findCanonicalGitRoot(e)].filter((n) => n !== null));
}

export { eA, GD, dY, findNearestRoot, isHomeDirRoot, warnDisklessSettingsWrite, iIn, xRi };
