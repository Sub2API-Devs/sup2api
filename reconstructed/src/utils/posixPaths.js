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
import { sep, sep as sep_2, sep as sep_3, win32, posix } from "path";

//@ chunk-axmbhcjg.js:8926-8997 placement = isSessionPlanFile (0.784)
var MD_EXTENSION = ".md",
  Fn = 50000,
  platformPath = sep === win32.sep ? win32 : posix,
  PATH_SEPARATOR_RE = sep === win32.sep ? /[\\/]+/ : /\/+/;
//@ chunk-axmbhcjg.js:8997-9070 placement = setCwdState (1)
function toPosixNfcPath(e, n) {
  return (n === "/" ? e : e.split(n).join("/")).normalize("NFC");
}
//@ chunk-axmbhcjg.js:9070-9150 placement
function j(e, n = platformPath) {
  return e === ".." || e.startsWith(`..${n.sep}`) || n.isAbsolute(e);
}

export { platformPath, Fn, j, toPosixNfcPath, MD_EXTENSION, PATH_SEPARATOR_RE };
