/**
 * utils/which.ts
 *
 * 可执行文件查找：Bun.which 封装与同步 which node
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/which.ts
 * pieces: chunk-jhrww53q.js (8)
 * attribution: fingerprint 1, layout 1, placement 6
 */
import { delimiter, isAbsolute } from "path";

//@ chunk-jhrww53q.js:49257-49296 fingerprint = bunWhich (0.601)
function bunWhich(o) {
  return identityPath(o, Bun.which(o));
}
//@ chunk-jhrww53q.js:49296-49321 layout
function identityPath(o, t) {
  return t;
}
//@ chunk-jhrww53q.js:49321-49348 placement
/**
 * Bun.which 的同步封装。
 */
var whichAsync = async (o) => bunWhich(o);
var bunWhichSync = bunWhich;
//@ chunk-jhrww53q.js:49348-49406 placement
function whichOnPath(o, t) {
  let _ = sanitizePathEnv(t);
  return _ === "" ? null : bunWhichOnPath(o, _);
}
//@ chunk-jhrww53q.js:49406-49485 placement
function sanitizePathEnv(o) {
  return o
    .split(delimiter)
    .map((t) => stripPathQuotes(t))
    .filter((t) => isAbsolutePathEntry(t))
    .join(delimiter);
}
//@ chunk-jhrww53q.js:49485-49553 placement
function stripPathQuotes(o, t = "linux") {
  return t === "win32" ? o.replaceAll('"', "") : o;
}
//@ chunk-jhrww53q.js:49553-49597 placement
function isAbsolutePathEntry(o) {
  if (!isAbsolute(o)) return false;
  return true;
}
//@ chunk-jhrww53q.js:49597-49649 placement
function bunWhichOnPath(o, t) {
  return identityPath(
    o,
    Bun.which(o, {
      PATH: t,
    }),
  );
}
export {
  bunWhichSync,
  whichAsync,
  isAbsolutePathEntry,
  whichOnPath,
  sanitizePathEnv,
  bunWhichOnPath,
  stripPathQuotes,
};
