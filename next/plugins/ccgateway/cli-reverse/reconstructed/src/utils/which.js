/**
 * utils/which.ts
 *
 * 可执行文件查找：Bun.which 封装与同步 which node
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/which.ts
 * pieces: chunk-xjnnz630.js (8)
 * attribution: fingerprint 1, layout 1, placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { delimiter, isAbsolute } from "path";

//@ chunk-xjnnz630.js:50940-50979 fingerprint (2.1.88 match: bunWhich, 0.601)
function bunWhich(command) {
  return identityPath(command, Bun.which(command));
}
//@ chunk-xjnnz630.js:50979-51004 layout
function identityPath(command, resolvedPath) {
  return resolvedPath;
}
//@ chunk-xjnnz630.js:51004-51031 placement
/**
 * Bun.which 的同步封装。
 */
var whichAsync = async (command) => bunWhich(command);
var bunWhichSync = bunWhich;
//@ chunk-xjnnz630.js:51031-51089 placement
function whichOnPath(command, pathEnv) {
  let sanitizedPathEnv = sanitizePathEnv(pathEnv);
  return sanitizedPathEnv === "" ? null : bunWhichOnPath(command, sanitizedPathEnv);
}
//@ chunk-xjnnz630.js:51089-51168 placement
function sanitizePathEnv(pathEnv) {
  return pathEnv
    .split(delimiter)
    .map((entry) => stripPathQuotes(entry))
    .filter((entry) => isAbsolutePathEntry(entry))
    .join(delimiter);
}
//@ chunk-xjnnz630.js:51168-51236 placement
function stripPathQuotes(entry, platform = "linux") {
  return platform === "win32" ? entry.replaceAll('"', "") : entry;
}
//@ chunk-xjnnz630.js:51236-51280 placement
function isAbsolutePathEntry(entry) {
  if (!isAbsolute(entry)) return false;
  return true;
}
//@ chunk-xjnnz630.js:51280-51332 placement
function bunWhichOnPath(command, pathEnv) {
  return identityPath(
    command,
    Bun.which(command, {
      PATH: pathEnv,
    }),
  );
}
export {
  isAbsolutePathEntry,
  whichOnPath,
  sanitizePathEnv,
  whichAsync,
  bunWhichSync,
  bunWhichOnPath,
  stripPathQuotes,
};
