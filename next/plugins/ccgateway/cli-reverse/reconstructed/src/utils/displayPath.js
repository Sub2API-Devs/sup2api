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
function isLongPosixPath(path, maxLength) {
  return maxLength === posix && path.length >= LONG_POSIX_PATH_LENGTH;
}
//@ chunk-gqez588q.js:5257-5411 placement = BLACK_CIRCLE (0.728)
/**
 * 路径规范化候选：Windows 去 \\?\ 前缀并解析；macOS 加 /private、/Volumes 变体；Linux 去 /proc/self/root 前缀。旧版名 BLACK_CIRCLE 为错配。
 */
function getCanonicalPathVariants(inputPath, cwd, variants) {
  let path = variants.normalize(inputPath);
  if (isLongPosixPath(path, variants)) return [path];
  return variants === win32
    ? [normalizeWin32DevicePath(path, cwd.workingDir)]
    : cwd.platform === "darwin"
      ? uniq([path, pathCaseFolder("darwin")(path)].flatMap(macPathVariants))
      : [stripProcRoot(path)];
}
//@ chunk-gqez588q.js:5411-5782 placement
/**
 * 路径在镜像目录或家目录下时缩写为 "./…" 或 "~/…"（按平台大小写规则比较）。
 */
function abbreviatePathForDisplay(path, context, unameSR) {
  let parts = path.split(unameSR.sep);
  let caseFold = pathCaseFolder(context.platform);
  let trailingSepRe = unameSR === win32 ? /\\+$/ : /\/+$/;
  let normalizeVariant = (candidate) =>
    getCanonicalPathVariants(candidate, context, unameSR)[0].replace(trailingSepRe, "").split(unameSR.sep);
  return [
    [context.mirroredDir, "./"],
    [context.homeDir, "~/"],
  ]
    .flatMap(([basePath, label]) => (basePath === undefined ? [] : [[normalizeVariant(basePath), label]]))
    .filter(
      ([baseParts]) =>
        parts.length > baseParts.length &&
        baseParts.every((part, index) => caseFold(part) === caseFold(parts[index])),
    )
    .map(([baseLength, variantName]) => [variantName, parts.slice(baseLength.length).join("/")])
    .filter(([, remainder]) => remainder !== "")
    .map(([prefix, suffix]) => `${prefix}${suffix}`);
}
//@ chunk-gqez588q.js:5782-5881 placement
/**
 * 绝对路径 → 规范化后的缩写显示路径，非绝对返回 undefined。
 */
function toDisplayPath(path, context) {
  let unameSR = getUnameSR(context.platform);
  let normalized = normalizeWin32DrivePath(path, unameSR);
  return unameSR.isAbsolute(normalized)
    ? abbreviatePathForDisplay(getCanonicalPathVariants(normalized, context, unameSR)[0], context, unameSR)[0]
    : undefined;
}
export { toDisplayPath, getCanonicalPathVariants, abbreviatePathForDisplay, isLongPosixPath };
