/**
 * utils/pathPrefix.ts
 *
 * 2.1.316 新增：路径前缀判断（大小写感知）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (4), chunk-bk27acrr.js (1)
 * attribution: placement 5
 */
import { relative, sep, isAbsolute } from "path";
import { getPlatform } from "./platform.js";

//@ chunk-bk27acrr.js:248-347 placement
/**
 * isSubpathOf：relative() 判断 child 是否位于 parent 之下（相等时返回给定默认值）。
 */
function isSubpathOf(fromPath, toPath, includeSelf) {
  let relativePath = relative(fromPath, toPath);
  if (relativePath === "") return includeSelf;
  return relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}
//@ chunk-6vnxsn99.js:21142-21281 placement
function isPathUnder(childPath, parentPath) {
  let parentPrefix = parentPath.endsWith(sep) ? parentPath : parentPath + sep;
  if (getPlatform() === "windows") return childPath.toLowerCase().startsWith(parentPrefix.toLowerCase());
  return childPath.startsWith(parentPrefix);
}
//@ chunk-6vnxsn99.js:21281-21392 placement
function isSameOrUnderPath(childPath, parentPath) {
  if (getPlatform() === "windows")
    return childPath.toLowerCase() === parentPath.toLowerCase() || isPathUnder(childPath, parentPath);
  return childPath === parentPath || isPathUnder(childPath, parentPath);
}
//@ chunk-6vnxsn99.js:21392-21441 placement
function separatorForPath(inputPath) {
  return inputPath.startsWith("/") ? "/" : "\\";
}
//@ chunk-6vnxsn99.js:21441-21583 placement
function isPathWithinCaseAware(childPath, parentPath, ignoreCase) {
  let foldedChild = ignoreCase ? childPath.toLowerCase() : childPath;
  let foldedParent = ignoreCase ? parentPath.toLowerCase() : parentPath;
  if (foldedChild === foldedParent) return true;
  let separator = separatorForPath(foldedParent);
  let parentPrefix = foldedParent.endsWith(separator) ? foldedParent : foldedParent + separator;
  return foldedChild.startsWith(parentPrefix);
}
export { isSubpathOf, isPathWithinCaseAware, isPathUnder, isSameOrUnderPath };
