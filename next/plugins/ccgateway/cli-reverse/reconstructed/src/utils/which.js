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

//@ chunk-jhrww53q.js:49257-49296 fingerprint (2.1.88 match: bunWhich, 0.601)
function bunWhich(command) {
  return identityPath(command, Bun.which(command));
}
//@ chunk-jhrww53q.js:49296-49321 layout
function identityPath(command, resolvedPath) {
  return resolvedPath;
}
//@ chunk-jhrww53q.js:49321-49348 placement
/**
 * Bun.which 的同步封装。
 */
var whichAsync = async (command) => bunWhich(command);
var bunWhichSync = bunWhich;
//@ chunk-jhrww53q.js:49348-49406 placement
function whichOnPath(command, pathEnv) {
  let sanitizedPathEnv = sanitizePathEnv(pathEnv);
  return sanitizedPathEnv === "" ? null : bunWhichOnPath(command, sanitizedPathEnv);
}
//@ chunk-jhrww53q.js:49406-49485 placement
function sanitizePathEnv(pathEnv) {
  return pathEnv
    .split(delimiter)
    .map((entry) => stripPathQuotes(entry))
    .filter((entry) => isAbsolutePathEntry(entry))
    .join(delimiter);
}
//@ chunk-jhrww53q.js:49485-49553 placement
function stripPathQuotes(entry, platform = "linux") {
  return platform === "win32" ? entry.replaceAll('"', "") : entry;
}
//@ chunk-jhrww53q.js:49553-49597 placement
function isAbsolutePathEntry(entry) {
  if (!isAbsolute(entry)) return false;
  return true;
}
//@ chunk-jhrww53q.js:49597-49649 placement
function bunWhichOnPath(command, pathEnv) {
  return identityPath(
    command,
    Bun.which(command, {
      PATH: pathEnv,
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
