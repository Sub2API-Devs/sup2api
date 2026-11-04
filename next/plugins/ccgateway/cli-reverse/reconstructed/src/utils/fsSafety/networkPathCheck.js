/**
 * utils/fsSafety/networkPathCheck.ts
 *
 * 2.1.316 新增：判断路径为本地、网络或无法检查；网络路径拒绝说明等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t0gq9gyw.js (8)
 * attribution: placement 8
 */
import { isAbsolute, parse, normalize, dirname, sep } from "path";
import { lstat, readlink } from "fs/promises";
import { sanitizeDisplayChars, stripVariationSelectors } from "../truncateGraphemes.js";
import { stripCombiningRepeated } from "../sanitization.js";
import { isUncOrNetworkSpelling, classifyHomeMount } from "../networkPaths.js";
import { hasDotDotSegment } from "../pathClassification.js";
import { getErrnoCode } from "../errors.js";

//@ chunk-t0gq9gyw.js:5782-5822 placement
/**
 * 路径是否为网络路径。
 */
function isNetworkPath(value) {
  return sanitizeDisplayChars(stripVariationSelectors(stripCombiningRepeated(value)), false);
}
//@ chunk-t0gq9gyw.js:5961-5971 placement
var MAX_SYMLINK_HOPS = 40;
//@ chunk-t0gq9gyw.js:5971-6020 placement = getUnameSR (0.793)
function getUnameSR(platform) {
  return platform === "win32" ? /[\\/]+/ : /\/+/;
}
//@ chunk-t0gq9gyw.js:6020-6360 placement
/**
 * 网络路径拒绝说明。
 */
var NETWORK_PATH_MESSAGE =
  "names a network location (a UNC path or automounter node); copy it to a local file first";
var NETWORK_LINK_MESSAGE =
  "reaches a network location (a UNC or automount target) through a link; copy it to a local file first";
var DRIVE_RELATIVE_PATTERN = /^[a-zA-Z]:(?![\\/])/;
var UNVETTABLE_LINK_MESSAGE =
  "has a link chain that could not be fully checked for network targets; pass the real path of a local file";
//@ chunk-t0gq9gyw.js:6360-6409 placement = chordToDisplayString (1)
function isNetworkPath_2(chord, platform = "linux") {
  return isUncOrNetworkSpelling(chord) || classifyHomeMount(chord, platform);
}
//@ chunk-t0gq9gyw.js:6409-6641 placement
async function checkNetworkPath(filePath, platform = "linux") {
  if (!isAbsolute(filePath)) return UNVETTABLE_LINK_MESSAGE;
  if (isNetworkPath_2(filePath, platform)) return NETWORK_PATH_MESSAGE;
  let budget = {
    hops: MAX_SYMLINK_HOPS,
    steps: MAX_SYMLINK_HOPS * 64,
  };
  switch ((await classifyPathLocation(parse(filePath).root, filePath, budget, platform)).kind) {
    case "network":
      return NETWORK_LINK_MESSAGE;
    case "unvettable":
      return UNVETTABLE_LINK_MESSAGE;
    case "local":
    case "dead-end":
      return;
  }
}
//@ chunk-t0gq9gyw.js:6641-6702 placement
var WIN32_DRIVE_FROM_DEVICE_RE = /^(?:[\\/]{2}[?.]|[\\/]\?\?)[\\/]([A-Za-z]:[\\/].*)$/;
//@ chunk-t0gq9gyw.js:6702-7930 placement
/**
 * 判断路径为本地、网络或无法检查。
 */
async function classifyPathLocation(rootPath, filePath, budget, platform, isLinkTarget = false) {
  if (platform === "win32" && isLinkTarget) {
    let match = WIN32_DRIVE_FROM_DEVICE_RE.exec(filePath);
    if (match) filePath = match[1];
  }
  if (isNetworkPath_2(filePath, platform))
    return {
      kind: "network",
    };
  let currentPath = filePath;
  if (platform === "win32") {
    if (DRIVE_RELATIVE_PATTERN.test(filePath))
      return {
        kind: "unvettable",
      };
    if (isLinkTarget) {
      if (hasDotDotSegment(filePath))
        return {
          kind: "unvettable",
        };
    } else {
      currentPath = normalize(filePath);
      if (isNetworkPath_2(currentPath, platform))
        return {
          kind: "network",
        };
    }
  }
  let absolutePath =
    platform === "win32" && /^[\\/](?![\\/])/.test(currentPath)
      ? `${parse(rootPath).root.replace(/[\\/]+$/, "")}${currentPath}`
      : currentPath;
  let { root } = parse(absolutePath);
  let parentPath = isAbsolute(absolutePath) ? root : rootPath;
  let checkAncestors = !isLinkTarget;
  for (let segment of absolutePath
    .slice(isAbsolute(absolutePath) ? root.length : 0)
    .split(getUnameSR(platform))) {
    if (segment === "" || segment === ".") continue;
    if (--budget.steps < 0)
      return {
        kind: "unvettable",
      };
    if (segment === "..") {
      parentPath = dirname(parentPath);
      continue;
    }
    let candidatePath = parentPath.endsWith(sep)
      ? `${parentPath}${segment}`
      : `${parentPath}${sep}${segment}`;
    if (isNetworkPath_2(candidatePath, platform))
      return {
        kind: "network",
      };
    let isLink;
    try {
      isLink = (await lstat(candidatePath)).isSymbolicLink();
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR")
        return {
          kind: "dead-end",
        };
      if (checkAncestors) {
        let treatAsLocal =
          platform !== "win32"
            ? errnoCode === "EACCES" ||
              errnoCode === "EPERM" ||
              errnoCode === "ENAMETOOLONG" ||
              errnoCode === "ELOOP"
            : errnoCode === "ENAMETOOLONG";
        if (!treatAsLocal)
          try {
            await lstat(parentPath);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            treatAsLocal =
              errnoCode === "ENOENT" ||
              errnoCode === "ENOTDIR" ||
              errnoCode === "ENODEV" ||
              errnoCode === "ENXIO";
          }
        if (treatAsLocal)
          return {
            kind: "local",
            physical: parentPath,
          };
      }
      return {
        kind: "unvettable",
      };
    }
    if (!isLink) {
      parentPath = candidatePath;
      continue;
    }
    if (--budget.hops < 0)
      return {
        kind: "unvettable",
      };
    let linkText;
    try {
      linkText = await readlink(candidatePath);
    } catch {
      return {
        kind: "unvettable",
      };
    }
    let linkResult = await classifyPathLocation(parentPath, linkText, budget, platform, true);
    if (linkResult.kind !== "local") return linkResult;
    checkAncestors = false;
    parentPath = linkResult.physical;
  }
  return {
    kind: "local",
    physical: parentPath,
  };
}
export { isNetworkPath, checkNetworkPath, UNVETTABLE_LINK_MESSAGE, isNetworkPath_2 };
