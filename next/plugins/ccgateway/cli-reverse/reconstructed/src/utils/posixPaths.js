/**
 * utils/posixPaths.ts
 *
 * 2.1.316 新增：POSIX 路径
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-axmbhcjg.js (3)
 * attribution: placement 3
 */
import { sep, win32, posix } from "path";

//@ chunk-axmbhcjg.js:8926-8997 placement (2.1.88 match: isSessionPlanFile, 0.784)
/**
 * MAX_POSIX_PATH_LENGTH：POSIX 路径长度上限。
 */
var MD_EXTENSION = ".md";
var MAX_POSIX_PATH_LENGTH = 50000;
var platformPath = sep === win32.sep ? win32 : posix;
var PATH_SEPARATOR_RE = sep === win32.sep ? /[\\/]+/ : /\/+/;
//@ chunk-axmbhcjg.js:8997-9070 placement (2.1.88 match: setCwdState, 1)
function toPosixNfcPath(path, sep) {
  return (sep === "/" ? path : path.split(sep).join("/")).normalize("NFC");
}
//@ chunk-axmbhcjg.js:9070-9150 placement
/**
 * isParentOrAbsolute：是 .. 或绝对路径。
 */
function isParentOrAbsolute(path, pathModule = platformPath) {
  return path === ".." || path.startsWith(`..${pathModule.sep}`) || pathModule.isAbsolute(path);
}
export {
  platformPath,
  MAX_POSIX_PATH_LENGTH,
  isParentOrAbsolute,
  toPosixNfcPath,
  MD_EXTENSION,
  PATH_SEPARATOR_RE,
};
