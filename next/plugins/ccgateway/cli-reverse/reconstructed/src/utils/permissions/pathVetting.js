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
function vetPathSpellingsOrChain(rawPath, resolvedPath, trustedNetworkDirectories, options) {
  return (
    vetPathSpellings(rawPath, resolvedPath, trustedNetworkDirectories) ??
    vetResolvedPathChain(getPathsForNetworkScreen(resolvedPath), trustedNetworkDirectories, options)
  );
}
//@ chunk-s61vbvea.js:583466-583529 placement
/**
 * vetPathSpellingsOrChainAsync：异步版：网络屏幕路径异步获取。
 */
async function vetPathSpellingsOrChainAsync(rawPath, resolvedPath, trustedNetworkDirectories) {
  return (
    vetPathSpellings(rawPath, resolvedPath, trustedNetworkDirectories) ??
    vetResolvedPathChain(await getPathsForNetworkScreenAsync(resolvedPath), trustedNetworkDirectories)
  );
}
//@ chunk-s61vbvea.js:583529-583641 placement
function vetPathSpellings(rawPath, resolvedPath, trustedNetworkDirectories) {
  let trimmed = rawPath.trim();
  let spellings = trimmed === resolvedPath ? [resolvedPath] : [trimmed, resolvedPath];
  for (let spelling of spellings) {
    let failure = vetPathSpelling(spelling, trustedNetworkDirectories);
    if (failure !== undefined) return failure;
  }
  return;
}
//@ chunk-s61vbvea.js:583641-583892 placement
/**
 * 审查路径解析链：链不可审查、任一路径命中 NT 命名空间/不可信 UNC/自动挂载/可疑 Windows 拼写，或链接文本向上越级（未允许时）则拒绝，否则返回待检查路径。
 */
function vetResolvedPathChain({ paths, vetted, linkTextClimbs }, trustedNetworkDirectories, options) {
  if (!vetted)
    return {
      ok: false,
      reason: "unvettable_chain",
    };
  for (let path of paths) {
    let failure = vetPathSpelling(path, trustedNetworkDirectories);
    if (failure !== undefined) return failure;
  }
  if (linkTextClimbs && !options?.allowLinkTextClimbs)
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
function pathVettingReason(spelling, trustedNetworkDirectories) {
  return vetPathSpelling(spelling, trustedNetworkDirectories)?.reason;
}
//@ chunk-s61vbvea.js:583932-584196 placement
function vetPathSpelling(spelling, trustedNetworkDirectories) {
  if (isDevicePrefixPath(spelling))
    return {
      ok: false,
      reason: "nt_namespace",
    };
  if (isUntrustedUncPath(spelling, trustedNetworkDirectories))
    return {
      ok: false,
      reason: "untrusted_unc",
    };
  if (isUntrustedAutomountPath(spelling, trustedNetworkDirectories))
    return {
      ok: false,
      reason: "untrusted_automount",
    };
  let patternKind = classifySuspiciousWindowsPathPattern(spelling, trustedNetworkDirectories);
  if (patternKind !== undefined)
    return {
      ok: false,
      reason: "suspicious_windows_spelling",
      spelling: patternKind,
    };
  return;
}
export { vetPathSpellingsOrChain, pathVettingReason, vetPathSpellingsOrChainAsync };
