/**
 * utils/displayPath.ts
 *
 * 2.1.316 新增：把宿主路径转成便于显示的路径（规范化变体、缩写、长路径跳过规范化）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gqez588q.js (5)
 * attribution: placement 5
 */
import { posix, win32 } from "path";
import {
  normalizeWin32DevicePath,
  macPathVariants,
  stripProcRoot,
  getUnameSR,
  normalizeWin32DrivePath,
} from "../services/remoteTools/pathMapping.js";
import { uniq } from "./collections.js";
import { pathCaseFolder } from "../services/remoteTools/windowsPathSafety.js";

//@ chunk-gqez588q.js:5204-5215 placement
/**
 * 4096：posix 路径长度达到此值时不做规范化。归错文件（路径工具）。
 */
var LONG_POSIX_PATH_LENGTH = 4096;
//@ chunk-gqez588q.js:5215-5257 placement
/**
 * posix 且路径长度 ≥ 4096。
 */
function isLongPosixPath(n, e) {
  return e === posix && n.length >= LONG_POSIX_PATH_LENGTH;
}
//@ chunk-gqez588q.js:5257-5411 placement = BLACK_CIRCLE (0.728)
/**
 * 路径规范化候选：Windows 去 \\?\ 前缀并解析；macOS 加 /private、/Volumes 变体；Linux 去 /proc/self/root 前缀。旧版名 BLACK_CIRCLE 为错配。
 */
function getCanonicalPathVariants(remotePath, e, r) {
  let normalized = r.normalize(remotePath);
  if (isLongPosixPath(normalized, r)) return [normalized];
  return r === win32
    ? [normalizeWin32DevicePath(normalized, e.workingDir)]
    : e.platform === "darwin"
      ? uniq([normalized, pathCaseFolder("darwin")(normalized)].flatMap(macPathVariants))
      : [stripProcRoot(normalized)];
}
//@ chunk-gqez588q.js:5411-5782 placement
/**
 * 路径在镜像目录或家目录下时缩写为 "./…" 或 "~/…"（按平台大小写规则比较）。
 */
function abbreviatePathForDisplay(n, e, unameSR) {
  let parts = n.split(unameSR.sep);
  let t = pathCaseFolder(e.platform);
  let a = unameSR === win32 ? /\\+$/ : /\/+$/;
  let c = (d) => getCanonicalPathVariants(d, e, unameSR)[0].replace(a, "").split(unameSR.sep);
  return [
    [e.mirroredDir, "./"],
    [e.homeDir, "~/"],
  ]
    .flatMap(([d, s]) => (d === undefined ? [] : [[c(d), s]]))
    .filter(([d]) => parts.length > d.length && d.every((s, o) => t(s) === t(parts[o])))
    .map(([d, s]) => [s, parts.slice(d.length).join("/")])
    .filter(([, d]) => d !== "")
    .map(([d, s]) => `${d}${s}`);
}
//@ chunk-gqez588q.js:5782-5881 placement
/**
 * 绝对路径 → 规范化后的缩写显示路径，非绝对返回 undefined。
 */
function toDisplayPath(n, e) {
  let unameSR = getUnameSR(e.platform);
  let i = normalizeWin32DrivePath(n, unameSR);
  return unameSR.isAbsolute(i)
    ? abbreviatePathForDisplay(getCanonicalPathVariants(i, e, unameSR)[0], e, unameSR)[0]
    : undefined;
}
export { toDisplayPath, getCanonicalPathVariants, abbreviatePathForDisplay, isLongPosixPath };
