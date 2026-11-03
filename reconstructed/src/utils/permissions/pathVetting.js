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
import { isDevicePrefixPath } from "../pathClassification.js";
import {
  isUntrustedUncPath,
  isUntrustedAutomountPath,
  classifySuspiciousWindowsPathPattern,
} from "./filesystem.js";

//@ chunk-s61vbvea.js:583413-583466 placement
/**
 * vetPathSpellingsOrChain：先按拼写审查，再按解析链审查。
 */
function vetPathSpellingsOrChain(e, n, trustedNetworkDirectories, s) {
  return (
    vetPathSpellings(e, n, trustedNetworkDirectories) ??
    vetResolvedPathChain(getPathsForNetworkScreen(n), trustedNetworkDirectories, s)
  );
}
//@ chunk-s61vbvea.js:583466-583529 placement
/**
 * vetPathSpellingsOrChainAsync：异步版：网络屏幕路径异步获取。
 */
async function vetPathSpellingsOrChainAsync(e, n, trustedNetworkDirectories) {
  return (
    vetPathSpellings(e, n, trustedNetworkDirectories) ??
    vetResolvedPathChain(await getPathsForNetworkScreenAsync(n), trustedNetworkDirectories)
  );
}
//@ chunk-s61vbvea.js:583529-583641 placement
function vetPathSpellings(e, n, r) {
  let trimmed = e.trim();
  let h = trimmed === n ? [n] : [trimmed, n];
  for (let y of h) {
    let S = vetPathSpelling(y, r);
    if (S !== undefined) return S;
  }
  return;
}
//@ chunk-s61vbvea.js:583641-583892 placement
/**
 * 审查路径解析链：链不可审查、任一路径命中 NT 命名空间/不可信 UNC/自动挂载/可疑 Windows 拼写，或链接文本向上越级（未允许时）则拒绝，否则返回待检查路径。
 */
function vetResolvedPathChain({ paths, vetted, linkTextClimbs }, s, h) {
  if (!vetted)
    return {
      ok: false,
      reason: "unvettable_chain",
    };
  for (let path of paths) {
    let S = vetPathSpelling(path, s);
    if (S !== undefined) return S;
  }
  if (linkTextClimbs && !h?.allowLinkTextClimbs)
    return {
      ok: false,
      reason: "link_text_climbs",
    };
  return {
    ok: true,
    pathsToCheck: paths,
  };
}
//@ chunk-s61vbvea.js:583892-583932 placement
/**
 * pathVettingReason：路径审查不通过的原因。
 */
function pathVettingReason(e, trustedNetworkDirectories) {
  return vetPathSpelling(e, trustedNetworkDirectories)?.reason;
}
//@ chunk-s61vbvea.js:583932-584196 placement
function vetPathSpelling(e, n) {
  if (isDevicePrefixPath(e))
    return {
      ok: false,
      reason: "nt_namespace",
    };
  if (isUntrustedUncPath(e, n))
    return {
      ok: false,
      reason: "untrusted_unc",
    };
  if (isUntrustedAutomountPath(e, n))
    return {
      ok: false,
      reason: "untrusted_automount",
    };
  let r = classifySuspiciousWindowsPathPattern(e, n);
  if (r !== undefined)
    return {
      ok: false,
      reason: "suspicious_windows_spelling",
      spelling: r,
    };
  return;
}
export { vetPathSpellingsOrChain, pathVettingReason, vetPathSpellingsOrChainAsync };
