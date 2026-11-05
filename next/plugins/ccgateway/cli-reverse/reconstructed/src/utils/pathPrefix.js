/**
 * utils/pathPrefix.ts
 *
 * 2.1.316 新增：路径前缀判断（大小写感知）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-56w0sgh9.js (4), chunk-dce9g6nv.js (1)
 * attribution: placement 5
 */
import { relative, sep, isAbsolute } from "path";
import { getPlatform } from "./platform.js";

//@ chunk-dce9g6nv.js:248-347 placement
/**
 * isSubpathOf：relative() 判断 child 是否位于 parent 之下（相等时返回给定默认值）。
 */
function isSubpathOf(fromPath, toPath, includeSelf) {
  let relativePath = relative(fromPath, toPath);
  if (relativePath === "") return includeSelf;
  return relativePath !== ".." && !relativePath.startsWith(`..${sep}`) && !isAbsolute(relativePath);
}
//@ chunk-56w0sgh9.js:253-390 placement
function isPathUnder(childPath, parentPath) {
  let parentPrefix = parentPath.endsWith(sep) ? parentPath : parentPath + sep;
  if (getPlatform() === "windows") return childPath.toLowerCase().startsWith(parentPrefix.toLowerCase());
  return childPath.startsWith(parentPrefix);
}
//@ chunk-56w0sgh9.js:390-500 placement
function isSameOrUnderPath(childPath, parentPath) {
  if (getPlatform() === "windows")
    return childPath.toLowerCase() === parentPath.toLowerCase() || isPathUnder(childPath, parentPath);
  return childPath === parentPath || isPathUnder(childPath, parentPath);
}
//@ chunk-56w0sgh9.js:500-548 placement
function separatorForPath(inputPath) {
  return inputPath.startsWith("/") ? "/" : "\\";
}
//@ chunk-56w0sgh9.js:548-689 placement
function isPathWithinCaseAware(childPath, parentPath, ignoreCase) {
  let foldedChild = ignoreCase ? childPath.toLowerCase() : childPath;
  let foldedParent = ignoreCase ? parentPath.toLowerCase() : parentPath;
  if (foldedChild === foldedParent) return true;
  let separator = separatorForPath(foldedParent);
  let parentPrefix = foldedParent.endsWith(separator) ? foldedParent : foldedParent + separator;
  return foldedChild.startsWith(parentPrefix);
}
export { isSubpathOf, isSameOrUnderPath, isPathWithinCaseAware, isPathUnder };
