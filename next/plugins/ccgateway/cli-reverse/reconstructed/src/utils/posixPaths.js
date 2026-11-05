/**
 * utils/posixPaths.ts
 *
 * 2.1.316 新增：POSIX 路径
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vb7ng9fr.js (3)
 * attribution: placement 3
 */
import { sep, win32, posix } from "path";

//@ chunk-vb7ng9fr.js:8961-9032 placement (2.1.88 match: isSessionPlanFile, 0.785)
/**
 * MAX_POSIX_PATH_LENGTH：POSIX 路径长度上限。
 */
var MD_EXTENSION = ".md";
var MAX_POSIX_PATH_LENGTH = 50000;
var platformPath = sep === win32.sep ? win32 : posix;
var PATH_SEPARATOR_RE = sep === win32.sep ? /[\\/]+/ : /\/+/;
//@ chunk-vb7ng9fr.js:9032-9105 placement (2.1.88 match: setCwdState, 1)
function toPosixNfcPath(path, sep) {
  return (sep === "/" ? path : path.split(sep).join("/")).normalize("NFC");
}
//@ chunk-vb7ng9fr.js:9105-9185 placement
/**
 * isParentOrAbsolute：是 .. 或绝对路径。
 */
function isParentOrAbsolute(path, pathModule = platformPath) {
  return path === ".." || path.startsWith(`..${pathModule.sep}`) || pathModule.isAbsolute(path);
}
export {
  MAX_POSIX_PATH_LENGTH,
  platformPath,
  isParentOrAbsolute,
  toPosixNfcPath,
  MD_EXTENSION,
  PATH_SEPARATOR_RE,
};
