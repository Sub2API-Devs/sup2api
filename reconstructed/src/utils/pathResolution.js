/**
 * utils/pathResolution.ts
 *
 * 路径解析（允许缺失、WSL）（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aat7wt0p.js (18)
 * attribution: placement 18
 */
import { isAbsolute, resolve, dirname, parse, join, relative } from "path";
import { readlinkSync } from "fs";
import {
  stripWin32DevicePrefix,
  realpathNativeLongSync,
  isNetworkOrDevicePath,
  captureSyncResult,
} from "./fsJunctions.js";
import { hasDotSegment_2, hasDotSegment, isDosDevicePath } from "./pathClassification.js";
import { wslLocalhostParts, isNetworkRelatedPath } from "./networkPaths.js";
import { pathTraversesUntrustedLink } from "./settings/settings.js";

//@ chunk-aat7wt0p.js:14220-14548 placement
function realpathAllowMissing(inputPath, { allowLocalWsl = false } = {}) {
  let isLocalWslAllowed = (candidatePath) => allowLocalWsl && neverAllowsLocalWsl(candidatePath);
  if (isLocalWslAllowed(inputPath)) return false;
  if (isUntrustedLinkPath(inputPath)) return true;
  let strippedPath = stripWin32DevicePrefix(inputPath);
  if (!isAbsolute(strippedPath)) return true;
  if (
    traversesOrResolvesUntrustedLink(strippedPath, {
      allowLocalWsl,
    })
  )
    return true;
  let current = resolve(strippedPath);
  for (;;) {
    let realResult = realpathNativeLongSync(current);
    if (realResult.real !== undefined)
      return isUntrustedLinkPath(realResult.real) && !isLocalWslAllowed(realResult.real);
    if (realResult.code !== "ENOENT" && realResult.code !== "ENOTDIR") return true;
    let parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}
//@ chunk-aat7wt0p.js:14548-14573 placement
/**
 * neverAllowsLocalWsl：编译期开关 stub：永远不认为本地 WSL 路径可信。
 */
function neverAllowsLocalWsl(candidatePath) {
  return false;
}
//@ chunk-aat7wt0p.js:14573-14598 placement
/**
 * passThroughPath：恒等函数，用于跨平台路径预处理。
 */
function passThroughPath(inputPath) {
  return inputPath;
}
//@ chunk-aat7wt0p.js:14598-14630 placement
var WSL_MOUNT_PATTERN = /^\/mnt\/[a-z](?:\/|$)/i;
//@ chunk-aat7wt0p.js:14630-14841 placement = chordToDisplayString (1)
function toWindowsPathFromWsl(inputPath, windowsRoot, distroDir = "") {
  if (!inputPath.startsWith("/") || WSL_MOUNT_PATTERN.test(inputPath) || hasDotSegment_2(inputPath, "linux"))
    return;
  let relativePath =
    distroDir === ""
      ? inputPath
      : inputPath.startsWith(distroDir + "/")
        ? inputPath.slice(distroDir.length)
        : undefined;
  return relativePath === undefined
    ? undefined
    : windowsRoot.replace(/[\\/]+$/, "") + relativePath.replace(/\//g, "\\");
}
//@ chunk-aat7wt0p.js:14841-14884 placement
/**
 * toWslPathNoop：WSL 路径转换的禁用版 stub，恒返回 undefined。
 */
function toWslPathNoop(inputPath, { exactDots = false } = {}) {
  return;
}
//@ chunk-aat7wt0p.js:14884-15188 placement
function toWslPath(inputPath, { exactDots = false } = {}) {
  let strippedPath = stripWin32DevicePrefix(inputPath);
  if (exactDots ? hasDotSegment_2(strippedPath, "win32") : hasDotSegment(strippedPath)) return;
  let match = /^([A-Za-z]):[\\/]+(.*)$/.exec(strippedPath);
  let replaced = wslLocalhostParts(strippedPath)?.rest.replace(/^[\\/]+/, "");
  let replaced_2 = (match?.[2] ?? replaced ?? "").replace(/\\/g, "/").replace(/\/+$/, "");
  if (replaced_2 === "") return;
  let wslPath = match ? `/mnt/${match[1].toLowerCase()}/${replaced_2}` : `/${replaced_2}`;
  return isUntrustedLinkPath(wslPath) ? undefined : wslPath;
}
//@ chunk-aat7wt0p.js:15188-15226 placement
/**
 * isTrustedLocalWindowsPath：路径不在可疑拼写中即视为可信本地路径（Windows 分支）。
 */
function isTrustedLocalWindowsPath(pluginsDirectory) {
  return isUntrustedLinkPath(pluginsDirectory) && !neverAllowsLocalWsl(pluginsDirectory);
}
//@ chunk-aat7wt0p.js:15226-15283 placement
/**
 * isUntrustedLinkPath：去掉 Win32 设备前缀后判断是否为交接点/网络/设备路径。
 */
function isUntrustedLinkPath(inputPath) {
  let strippedPath = stripWin32DevicePrefix(inputPath);
  return (
    isNetworkOrDevicePath(strippedPath) || isNetworkRelatedPath(strippedPath) || isDosDevicePath(strippedPath)
  );
}
//@ chunk-aat7wt0p.js:15283-15447 placement
/**
 * 判断路径是否经过不可信链接（非绝对路径视为是）。
 */
function traversesUntrustedLink(inputPath, { allowLocalWsl = false, eisdirIsFolder = false } = {}) {
  let strippedPath = stripWin32DevicePrefix(inputPath);
  if (!isAbsolute(strippedPath)) return true;
  let { root } = parse(strippedPath);
  return pathTraversesUntrustedLink(
    root,
    splitPathSegments(strippedPath.slice(root.length)),
    0,
    allowLocalWsl,
    {
      eisdirIsFolder,
    },
  );
}
//@ chunk-aat7wt0p.js:15447-15519 placement
/**
 * pathTraversesFromTrustedRoot：以给定根为可信起点检查剩余路径成分是否经过不可信链接。
 */
function pathTraversesFromTrustedRoot(rootPath, restPath) {
  return pathTraversesUntrustedLink(rootPath, splitPathSegments(restPath), 0, false, {
    trustedStart: true,
    trustedRoot: rootPath,
  });
}
//@ chunk-aat7wt0p.js:15519-15967 placement
function resolvePathChain(linkPath, baseDir = dirname(linkPath)) {
  let readResult = captureSyncResult(() => readlinkSync(linkPath));
  if (readResult.value === undefined) return readResult.code !== "ENOENT" && readResult.code !== "EINVAL";
  let inputPath = readResult.value.replace(/^\/{2,}/, "/");
  if (alwaysFalse(inputPath)) return true;
  let resolveRelative = false;
  if (resolveRelative && hasDotSegment(inputPath)) return true;
  let targetPath = resolveRelative ? join(parse(baseDir).root, inputPath) : inputPath;
  let baseOptions = {
    trustedStart: true,
    trustedRoot: baseDir,
  };
  if (isAbsolute(targetPath)) {
    let relativePath = relative(baseDir, targetPath);
    if (
      !hasDotSegment(targetPath) &&
      relativePath !== "" &&
      !isParentDirSegment(relativePath) &&
      !isAbsolute(relativePath)
    )
      return pathTraversesUntrustedLink(baseDir, splitPathSegments(relativePath), 1, false, baseOptions);
    return isUntrustedLinkPath(targetPath) || traversesOrResolvesUntrustedLink(targetPath);
  }
  if (isUntrustedLinkPath(targetPath)) return true;
  let linkParentRelative = relative(baseDir, dirname(linkPath));
  let isUnderBase = !isParentDirSegment(linkParentRelative) && !isAbsolute(linkParentRelative);
  return pathTraversesUntrustedLink(
    isUnderBase ? baseDir : dirname(linkPath),
    [...(isUnderBase ? splitPathSegments(linkParentRelative) : []), ...splitPathSegments(targetPath)],
    1,
    false,
    baseOptions,
  );
}
//@ chunk-aat7wt0p.js:15967-16024 placement
/**
 * traversesOrResolvesUntrustedLink：直接路径或（Windows 本地路径）resolve 后任一经过不可信链接即为真。
 */
function traversesOrResolvesUntrustedLink(inputPath, options = {}) {
  return (
    traversesUntrustedLink(inputPath, options) ||
    (hasDotSegment(inputPath) && traversesUntrustedLink(resolve(inputPath), options))
  );
}
//@ chunk-aat7wt0p.js:16024-16034 placement
/**
 * MAX_UNTRUSTED_PATH_DEPTH：路径成分遍历的深度上限（导出，供调用方复用）。
 */
var MAX_UNTRUSTED_PATH_DEPTH = 40;
//@ chunk-aat7wt0p.js:16034-16086 placement
/**
 * splitPathSegments：按 / 切分路径成分并丢弃空段。
 */
function splitPathSegments(inputPath) {
  return inputPath.split(/\/+/).filter(Boolean);
}
//@ chunk-aat7wt0p.js:16086-16129 placement
/**
 * isUntrustedLinkPathStrict：与 isUntrustedLinkPath 相同但可选参数为假时仍判可疑。
 */
function isUntrustedLinkPathStrict(inputPath, allowLocalWsl) {
  return isUntrustedLinkPath(inputPath) && !(allowLocalWsl && neverAllowsLocalWsl(inputPath));
}
//@ chunk-aat7wt0p.js:16129-16182 placement
function isParentDirSegment(segment) {
  return segment === ".." || /^\.\.[\\/]/.test(segment);
}
//@ chunk-aat7wt0p.js:16182-16206 placement
function alwaysFalse(inputPath) {
  return false;
}
export {
  realpathAllowMissing,
  isTrustedLocalWindowsPath,
  isUntrustedLinkPath,
  traversesOrResolvesUntrustedLink,
  resolvePathChain,
  traversesUntrustedLink,
  isUntrustedLinkPathStrict,
  MAX_UNTRUSTED_PATH_DEPTH,
  alwaysFalse,
  splitPathSegments,
  passThroughPath,
  pathTraversesFromTrustedRoot,
  toWslPath,
  toWslPathNoop,
  toWindowsPathFromWsl,
  neverAllowsLocalWsl,
};
