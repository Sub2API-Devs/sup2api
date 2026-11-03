/**
 * utils/displayPath.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gqez588q.js (5)
 * attribution: placement 5
 */
import { posix, posix as posix_2, win32, win32 as win32_2 } from "path";
import {
  normalizeWin32DevicePath,
  macPathVariants,
  stripProcRoot,
  getUnameSR,
  p,
} from "../services/remoteTools/pathMapping.js";
import { uniq } from "./collections.js";
import { pathCaseFolder } from "../services/remoteTools/windowsPathSafety.js";

/**
 * 4096：posix 路径长度达到此值时不做规范化。归错文件（路径工具）。
 */
//@ chunk-gqez588q.js:5204-5215 placement
var LONG_POSIX_PATH_LENGTH = 4096;
/**
 * posix 且路径长度 ≥ 4096。
 */
//@ chunk-gqez588q.js:5215-5257 placement
function isLongPosixPath(n, e) {
  return e === posix && n.length >= LONG_POSIX_PATH_LENGTH;
}
/**
 * 路径规范化候选：Windows 去 \\?\ 前缀并解析；macOS 加 /private、/Volumes 变体；Linux 去 /proc/self/root 前缀。旧版名 BLACK_CIRCLE 为错配。
 */
//@ chunk-gqez588q.js:5257-5411 placement = BLACK_CIRCLE (0.728)
function getCanonicalPathVariants(n, e, r) {
  let normalized = r.normalize(n);
  if (isLongPosixPath(normalized, r)) return [normalized];
  return r === win32
    ? [normalizeWin32DevicePath(normalized, e.workingDir)]
    : e.platform === "darwin"
      ? uniq([normalized, pathCaseFolder("darwin")(normalized)].flatMap(macPathVariants))
      : [stripProcRoot(normalized)];
}
/**
 * 路径在镜像目录或家目录下时缩写为 "./…" 或 "~/…"（按平台大小写规则比较）。
 */
//@ chunk-gqez588q.js:5411-5782 placement
function abbreviatePathForDisplay(n, e, r) {
  let parts = n.split(r.sep),
    t = pathCaseFolder(e.platform),
    a = r === win32 ? /\\+$/ : /\/+$/,
    c = (d) => getCanonicalPathVariants(d, e, r)[0].replace(a, "").split(r.sep);
  return [
    [e.mirroredDir, "./"],
    [e.homeDir, "~/"],
  ]
    .flatMap(([d, s]) => (d === void 0 ? [] : [[c(d), s]]))
    .filter(([d]) => parts.length > d.length && d.every((s, o) => t(s) === t(parts[o])))
    .map(([d, s]) => [s, parts.slice(d.length).join("/")])
    .filter(([, d]) => d !== "")
    .map(([d, s]) => `${d}${s}`);
}
/**
 * 绝对路径 → 规范化后的缩写显示路径，非绝对返回 undefined。
 */
//@ chunk-gqez588q.js:5782-5881 placement
function toDisplayPath(n, e) {
  let r = getUnameSR(e.platform),
    i = p(n, r);
  return r.isAbsolute(i) ? abbreviatePathForDisplay(getCanonicalPathVariants(i, e, r)[0], e, r)[0] : void 0;
}

export { toDisplayPath, getCanonicalPathVariants, abbreviatePathForDisplay, isLongPosixPath };
