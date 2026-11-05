/**
 * utils/displayPath.ts
 *
 * 2.1.316 新增：把宿主路径转成便于显示的路径（规范化变体、缩写、长路径跳过规范化）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-yrtkt28g.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { posix, win32 } from "path";
import {
  normalizeWin32DevicePath,
  macPathVariants,
  stripProcRoot,
  getUnameSR,
  normalizeWin32DrivePath,
} from "../services/remoteTools/pathMapping.js";
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
import { pathCaseFolder } from "../services/remoteTools/windowsPathSafety.js";

//@ chunk-yrtkt28g.js:5237-5248 placement
/**
 * 4096：posix 路径长度达到此值时不做规范化。归错文件（路径工具）。
 */
var LONG_POSIX_PATH_LENGTH = 4096;
//@ chunk-yrtkt28g.js:5248-5290 placement
/**
 * posix 且路径长度 ≥ 4096。
 */
function isLongPosixPath(path, maxLength) {
  return maxLength === posix && path.length >= LONG_POSIX_PATH_LENGTH;
}
//@ chunk-yrtkt28g.js:5290-5444 placement (2.1.88 match: BLACK_CIRCLE, 0.728)
/**
 * 路径规范化候选：Windows 去 \\?\ 前缀并解析；macOS 加 /private、/Volumes 变体；Linux 去 /proc/self/root 前缀。旧版名 BLACK_CIRCLE 为错配。
 */
function getCanonicalPathVariants(inputPath, cwd, variants) {
  let path = variants.normalize(inputPath);
  if (isLongPosixPath(path, variants)) return [path];
  return variants === win32
    ? [normalizeWin32DevicePath(path, cwd.workingDir)]
    : cwd.platform === "darwin"
      ? normalizeCaseForComparison_2([path, pathCaseFolder("darwin")(path)].flatMap(macPathVariants))
      : [stripProcRoot(path)];
}
//@ chunk-yrtkt28g.js:5444-5815 placement
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
//@ chunk-yrtkt28g.js:5815-5914 placement
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
export { getCanonicalPathVariants, abbreviatePathForDisplay, isLongPosixPath, toDisplayPath };
