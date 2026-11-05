/**
 * utils/permissions/pathVetting.ts
 *
 * 路径审查与代理字符正则（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (6)
 * attribution: placement 6
 */
import { getPathsForNetworkScreen, getPathsForNetworkScreenAsync } from "../fsOperations.js";
import { isDevicePrefixPath } from "../pathClassification.js";
import {
  isUntrustedUncPath,
  isUntrustedAutomountPath,
  classifySuspiciousWindowsPathPattern,
} from "./filesystem.js";

//@ chunk-7jxyna5q.js:500775-500828 placement
/**
 * vetPathSpellingsOrChain：先按拼写审查，再按解析链审查。
 */
function vetPathSpellingsOrChain(rawPath, resolvedPath, trustedNetworkDirectories, options) {
  return (
    vetPathSpellings(rawPath, resolvedPath, trustedNetworkDirectories) ??
    vetResolvedPathChain(getPathsForNetworkScreen(resolvedPath), trustedNetworkDirectories, options)
  );
}
//@ chunk-7jxyna5q.js:500828-500891 placement
/**
 * vetPathSpellingsOrChainAsync：异步版：网络屏幕路径异步获取。
 */
async function vetPathSpellingsOrChainAsync(rawPath, resolvedPath, trustedNetworkDirectories) {
  return (
    vetPathSpellings(rawPath, resolvedPath, trustedNetworkDirectories) ??
    vetResolvedPathChain(await getPathsForNetworkScreenAsync(resolvedPath), trustedNetworkDirectories)
  );
}
//@ chunk-7jxyna5q.js:500891-501003 placement
function vetPathSpellings(rawPath, resolvedPath, trustedNetworkDirectories) {
  let trimmed = rawPath.trim();
  let spellings = trimmed === resolvedPath ? [resolvedPath] : [trimmed, resolvedPath];
  for (let spelling of spellings) {
    let failure = vetPathSpelling(spelling, trustedNetworkDirectories);
    if (failure !== undefined) return failure;
  }
  return;
}
//@ chunk-7jxyna5q.js:501003-501254 placement
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
//@ chunk-7jxyna5q.js:501254-501294 placement
/**
 * pathVettingReason：路径审查不通过的原因。
 */
function pathVettingReason(spelling, trustedNetworkDirectories) {
  return vetPathSpelling(spelling, trustedNetworkDirectories)?.reason;
}
//@ chunk-7jxyna5q.js:501294-501558 placement
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
