/**
 * utils/permissions/pathVetting.ts
 *
 * 路径审查与代理字符正则（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (6)
 * attribution: placement 6
 */
import { getPathsForNetworkScreen, getPathsForNetworkScreenAsync } from "../fsOperations.js";
import { gb } from "../pathClassification.js";
import {
  isUntrustedUncPath,
  isUntrustedAutomountPath,
  classifySuspiciousWindowsPathPattern,
} from "./filesystem.js";

//@ chunk-s61vbvea.js:583413-583466 placement
function NF(e, n, r, s) {
  return vetPathSpellings(e, n, r) ?? vetResolvedPathChain(getPathsForNetworkScreen(n), r, s);
}
//@ chunk-s61vbvea.js:583466-583529 placement
async function tei(e, n, r) {
  return vetPathSpellings(e, n, r) ?? vetResolvedPathChain(await getPathsForNetworkScreenAsync(n), r);
}
//@ chunk-s61vbvea.js:583529-583641 placement
function vetPathSpellings(e, n, r) {
  let trimmed = e.trim(),
    h = trimmed === n ? [n] : [trimmed, n];
  for (let y of h) {
    let S = vetPathSpelling(y, r);
    if (S !== void 0) return S;
  }
  return;
}
/**
 * 审查路径解析链：链不可审查、任一路径命中 NT 命名空间/不可信 UNC/自动挂载/可疑 Windows 拼写，或链接文本向上越级（未允许时）则拒绝，否则返回待检查路径。
 */
//@ chunk-s61vbvea.js:583641-583892 placement
function vetResolvedPathChain({ paths: paths, vetted: vetted, linkTextClimbs: linkTextClimbs }, s, h) {
  if (!vetted) return { ok: !1, reason: "unvettable_chain" };
  for (let y of paths) {
    let S = vetPathSpelling(y, s);
    if (S !== void 0) return S;
  }
  if (linkTextClimbs && !h?.allowLinkTextClimbs) return { ok: !1, reason: "link_text_climbs" };
  return { ok: !0, pathsToCheck: paths };
}
//@ chunk-s61vbvea.js:583892-583932 placement
function cH(e, n) {
  return vetPathSpelling(e, n)?.reason;
}
//@ chunk-s61vbvea.js:583932-584196 placement
function vetPathSpelling(e, n) {
  if (gb(e)) return { ok: !1, reason: "nt_namespace" };
  if (isUntrustedUncPath(e, n)) return { ok: !1, reason: "untrusted_unc" };
  if (isUntrustedAutomountPath(e, n)) return { ok: !1, reason: "untrusted_automount" };
  let r = classifySuspiciousWindowsPathPattern(e, n);
  if (r !== void 0) return { ok: !1, reason: "suspicious_windows_spelling", spelling: r };
  return;
}

export { NF, cH, tei };
