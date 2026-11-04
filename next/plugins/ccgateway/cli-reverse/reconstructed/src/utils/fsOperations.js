/**
 * utils/fsOperations.ts
 *
 * 文件系统抽象 getFsImplementation/NodeFsOperations、按范围/尾部读取、路径拼写展开（~ 与符号链接）及最深已存在祖先解析，供权限检查使用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/fsOperations.ts
 * pieces: chunk-awy329vy.js (1), chunk-cgr0tezp.js (78), chunk-e6aww6q8.js (4), chunk-jhrww53q.js (1)
 * attribution: fingerprint 3, placement 79, layout 1, callgraph-fingerprint 1
 */
import * as fsModule from "fs";
import * as pathModule from "path";
import { isAbsolute, parse, resolve as resolve_2, dirname, sep, relative } from "path";
import { homedir } from "os";
import {
  stat,
  lstat,
  open,
  readdir,
  unlink,
  rmdir,
  rm,
  mkdir,
  readFile,
  rename,
  realpath,
  readlink,
  copyFile,
  appendFile,
  symlink,
  link,
  chmod,
} from "fs/promises";
import {
  networkMountRootCached,
  isUnderNetworkDirCached,
  isForeignMountPath,
  isNetworkMountPath,
  networkMountHost,
  isNonWslUncPath,
  isNetworkMountRoot,
  isNetDir,
  isWslUncPath,
  neverOtherHostMount,
  expandTildeWithHome,
} from "./networkPaths.js";
import {
  hasDotSegment,
  hasDotDotSegment,
  isForeignNetworkPath,
  isUncOrDevicePath,
  isMacSpecialPath,
  identity,
  isDeviceNamespacePath,
  isDevicePrefixPath,
  hasDotSegmentAlias,
} from "./pathClassification.js";
import {
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "./errors.js";
import { launchCwd } from "./cwd.js";
import { getResolvedPath } from "./swarm/permissionSync.js";
import { isSentinelInode, realpathPromise, slowLogging, isBunVirtualPath } from "./slowOperations.js";
import { toUncLongPath } from "./windowsUncPaths.js";
import { realpathCacheEntry } from "./permissions/protectedDirs.js";
import { GIT_INTERNAL_PATH_PATTERNS } from "../tools/BashTool/readOnlyValidation.js";
import { getOriginalCwd } from "../bootstrap/state.js";
import { isSpecialOrUnsafePath, isNonCanonicalSymlink } from "./claudemd.js";
import { readOnlyNoFollowFlags } from "./platformTargets.js";

//@ chunk-cgr0tezp.js:19756-19772 placement
var RENAME_ARROW = "\u2192";
//@ chunk-cgr0tezp.js:19772-19839 placement
function noFollowNonblockFlags() {
  return fsModule.constants.O_NOFOLLOW | fsModule.constants.O_NONBLOCK;
}
//@ chunk-cgr0tezp.js:19839-19926 placement
function nonblockingReadFlags() {
  return fsModule.constants.O_RDONLY | fsModule.constants.O_NONBLOCK | fsModule.constants.O_NOCTTY;
}
//@ chunk-cgr0tezp.js:19926-19939 placement
var PATH_SEPARATOR_RUN_RE = /\/+/;
//@ chunk-cgr0tezp.js:19939-20126 placement
function isSpelledStrictAncestor(ancestorPath, descendantPath) {
  let splitSegments = (path) => path.split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
  let path = pathModule.resolve(ancestorPath);
  let path_2 = pathModule.resolve(descendantPath);
  let ancestorParts = splitSegments(path);
  let descendantParts = splitSegments(path_2);
  return (
    pathModule.parse(path).root === pathModule.parse(path_2).root &&
    ancestorParts.length < descendantParts.length &&
    ancestorParts.every((part, index) => part === descendantParts[index])
  );
}
//@ chunk-cgr0tezp.js:20126-20275 placement
function truncateAtDotSegment(path) {
  let kept = "";
  for (let token of path.split(/([\\/]+)/)) {
    if (token === "." || token === "..") break;
    kept += token;
  }
  let replaced = kept.replace(/(?<=[^\\/])[\\/]+$/, "");
  return replaced === "" ? path : replaced;
}
//@ chunk-cgr0tezp.js:20275-20398 placement
function normalizeNetworkMountPath(path) {
  if (path.startsWith("\\\\")) return truncateAtDotSegment(path);
  let replaced = path.replace(/^\/+/, "/");
  let root = networkMountRootCached(replaced);
  if (root !== null) return root;
  return truncateAtDotSegment(path);
}
//@ chunk-cgr0tezp.js:20398-20408 placement
var networkMountPathOf = normalizeNetworkMountPath;
//@ chunk-cgr0tezp.js:20408-20579 placement
function joinRemainingSegments(basePath, segments, onCollapsedLanding) {
  let hasDot = hasDotSegment(basePath);
  if (segments.length === 0 || hasDot || segments.some((segment) => segment === "." || segment === "..")) {
    if (onCollapsedLanding !== undefined && (segments.length > 0 || hasDot))
      onCollapsedLanding(pathModule.join(basePath, ...segments));
    return hasDot ? networkMountPathOf(basePath) : basePath;
  }
  return pathModule.join(basePath, ...segments);
}
//@ chunk-cgr0tezp.js:20579-20639 placement
var UNVERIFIED_ANCESTRY = "\x00unverified-ancestry";
var OPAQUE_LINK_TEXT = "\x00opaque-link-text";
//@ chunk-cgr0tezp.js:20639-20722 placement
function hasParentSegment(linkText) {
  return hasDotDotSegment(
    pathModule.isAbsolute(linkText) ? linkText : linkText.replace(/^(?:\.\.(?:[\\/]+|$))+/, ""),
  );
}
//@ chunk-cgr0tezp.js:20722-20982 placement
function isOpaqueLinkText(linkText, strict = false) {
  return (
    linkText.includes("\uFFFD") ||
    hasParentSegment(linkText) ||
    (strict &&
      (/^(?:[A-Za-z]:(?![\\/])|[\\/](?![\\/]))/.test(linkText) ||
        (/^[\\/]{2}\?[\\/]/.test(linkText) &&
          !/^[\\/]{2}\?[\\/](?:[A-Za-z]:[\\/]|UNC[\\/])/i.test(linkText)) ||
        linkText
          .split(/[\\/]/)
          .some((segment) => segment !== "." && segment !== ".." && /[. ]$/.test(segment))))
  );
}
//@ chunk-cgr0tezp.js:20982-21024 placement
function isNetworkJunction(intermediateUncJunction) {
  return intermediateUncJunction !== undefined && intermediateUncJunction !== UNVERIFIED_ANCESTRY;
}
//@ chunk-cgr0tezp.js:21024-21136 placement
function hopCapExhausted(path) {
  return Object.assign(Error("ELOOP: symbolic link chain too long to vet"), {
    code: "ELOOP",
    path,
  });
}
//@ chunk-cgr0tezp.js:21136-21370 placement
function unverifiedAncestryReason(
  errno,
  options,
  allowTooLong = false,
  allowLaunchAncestry = false,
  allowVouched = false,
) {
  if (options?.unreadableAncestry !== "unverified") return;
  let errno_2 =
    errno !== undefined && typeof errno === "object" && "errno" in errno ? errno.errno : undefined;
  if (errno_2 === "ENOENT" || errno_2 === "ENOTDIR") return;
  if (errno_2 === "ENAMETOOLONG" && !allowTooLong && !allowLaunchAncestry && !allowVouched) return;
  return UNVERIFIED_ANCESTRY;
}
//@ chunk-cgr0tezp.js:21370-21398 placement
function isUnderNetworkDir(path) {
  return isUnderNetworkDirCached(path);
}
//@ chunk-cgr0tezp.js:21398-21481 placement
function isNetworkPathUnderAnchors(path, anchors) {
  return (
    anchors !== undefined &&
    anchors.some(
      (anchor) =>
        isUnderNetworkDirCached(anchor) &&
        !isForeignMountPath(path, anchor) &&
        (isPathUnderPosix(path, anchor) || isNetworkMountPath(path)),
    )
  );
}
//@ chunk-cgr0tezp.js:21481-21545 placement
function isAnchorUnderPath(path, anchors) {
  return (
    anchors !== undefined &&
    anchors.some((anchor) => isUnderNetworkDirCached(anchor) && isPathUnderPosix(anchor, path))
  );
}
//@ chunk-cgr0tezp.js:21545-21669 placement
function isPathUnderPosix(path, parentPath) {
  let trimTrailingSep = (path) => (path.length > 1 ? path.replace(/\/+$/, "") : path);
  let [normalizedPath, normalizedParent] = [trimTrailingSep(path), trimTrailingSep(parentPath)];
  return (
    normalizedPath === normalizedParent ||
    normalizedPath.startsWith(normalizedParent === "/" ? normalizedParent : normalizedParent + "/")
  );
}
//@ chunk-cgr0tezp.js:21669-21727 placement
function isForeignToAllMounts(path, anchors) {
  return anchors === undefined || anchors.every((anchor) => isForeignMountPath(path, anchor));
}
//@ chunk-cgr0tezp.js:21727-21785 placement
function isForeignToAllNetworks(path, anchors) {
  return anchors === undefined || anchors.every((anchor) => isForeignNetworkPath(path, anchor));
}
//@ chunk-cgr0tezp.js:21785-21924 placement
function collapseNetworkLanding(path, anchors, onCollapsedLanding) {
  let root = isNetworkMountPath(path) ? networkMountRootCached(path) : null;
  if (root === null || !isForeignToAllMounts(root, anchors)) return;
  let joined = pathModule.join(path);
  if (isNetworkMountPath(joined) && networkMountHost(joined) === networkMountHost(root)) return joined;
  return joinRemainingSegments(path, [], onCollapsedLanding);
}
//@ chunk-cgr0tezp.js:21924-22043 placement
function getAnchors(options) {
  if (options?.anchors !== undefined && options.anchors.length > 0) return options.anchors;
  return options?.anchor !== undefined ? [options.anchor] : undefined;
}
//@ chunk-cgr0tezp.js:22043-22111 placement
function hasUntouchableRecordSpelling(path) {
  return (
    hasDotDotSegment(path) ||
    isNonWslUncPath(path) ||
    isNetworkMountRoot(path) ||
    isNetDir(path) ||
    findIntermediateUncJunction(NodeFsOperations, path) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22111-22192 placement
async function hasUntouchableRecordSpellingAsync(path) {
  return (
    hasDotDotSegment(path) ||
    isNonWslUncPath(path) ||
    isNetworkMountRoot(path) ||
    isNetDir(path) ||
    (await findIntermediateUncJunctionAsync(NodeFsOperations, path)) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22192-22320 placement
function hasUntouchableRecordSpellingStrict(path, fsImpl = NodeFsOperations) {
  return (
    hasDotDotSegment(path) ||
    isNonWslUncPath(path) ||
    isNetworkMountRoot(path) ||
    isNetDir(path) ||
    findIntermediateUncJunction(fsImpl, path, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22320-22460 placement
async function hasUntouchableRecordSpellingStrictAsync(path, fsImpl = NodeFsOperations) {
  return (
    hasDotDotSegment(path) ||
    isNonWslUncPath(path) ||
    isNetworkMountRoot(path) ||
    isNetDir(path) ||
    (await findIntermediateUncJunctionAsync(fsImpl, path, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    })) !== undefined
  );
}
//@ chunk-cgr0tezp.js:22460-22659 placement
async function entryReachesForeignNetwork(path, permissionScreenAnchor, fsImpl = NodeFsOperations) {
  if (hasDotDotSegment(path)) return true;
  if (isNonWslUncPath(path)) return true;
  if (isNetworkMountRoot(path)) {
    let mountHost = networkMountHost(path);
    if (
      mountHost === null ||
      permissionScreenAnchor === null ||
      mountHost !== networkMountHost(permissionScreenAnchor)
    )
      return true;
  }
  if (isNetDir(path)) return true;
  return (
    (
      await examineEntryChain(path, permissionScreenAnchor, {
        fsImpl,
      })
    ).verdict !== "clean"
  );
}
//@ chunk-cgr0tezp.js:22659-22925 placement
async function examineEntryChain(path, anchor, { fsImpl = NodeFsOperations, signal } = {}) {
  let intermediateUncJunction = await findIntermediateUncJunctionAsync(
    fsImpl,
    path,
    {
      ...(anchor === null
        ? {}
        : {
            anchor,
          }),
      unreadableAncestry: "unverified",
      surfaceNetworkRaw: true,
    },
    signal,
  );
  if (intermediateUncJunction === undefined)
    return {
      verdict: "clean",
    };
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    return {
      verdict: "unverified",
    };
  return {
    verdict: "network",
    reaches: intermediateUncJunction,
  };
}
//@ chunk-cgr0tezp.js:22925-23119 placement
function findIntermediateUncJunction(fsImpl, path, options) {
  return returnValue(resolvePathSafely(path, options), (step) => {
    if (step.kind === "lstat") return fsImpl.lstatSync(step.path);
    if (step.kind === "opendirNofollow") {
      fsImpl.openDirNoFollowSync(step.path);
      return "ok";
    }
    return fsImpl.readlinkSync(step.path);
  });
}
//@ chunk-cgr0tezp.js:23119-23428 placement
function findIntermediateUncJunctionAsync(fsImpl, path, options, signal, onStat) {
  return returnValue_2(resolvePathSafely(path, options), signal, async (step) => {
    if (step.kind === "lstat") {
      if (onStat === undefined) return fsImpl.lstat(step.path);
      let stats;
      try {
        stats = await fsImpl.lstatBigint(step.path);
      } catch (error) {
        onStat(step.path, undefined);
        throw error;
      }
      onStat(step.path, stats);
      return stats;
    }
    if (step.kind === "opendirNofollow") {
      await fsImpl.openDirNoFollow(step.path);
      return "ok";
    }
    return fsImpl.readlink(step.path);
  });
}
//@ chunk-cgr0tezp.js:23428-23543 placement (2.1.88 match: returnValue, 0.769)
function returnValue(steps, runStep) {
  let stepResult;
  for (;;) {
    let nextStep = steps.next(stepResult);
    if (nextStep.done) return nextStep.value;
    try {
      stepResult = runStep(nextStep.value);
    } catch (error) {
      stepResult = {
        errno: getErrnoCode(error),
      };
    }
  }
}
//@ chunk-cgr0tezp.js:23543-23701 placement (2.1.88 match: returnValue, 0.769)
async function returnValue_2(path, signal, runStep) {
  let stepResult;
  for (;;) {
    let nextStep = path.next(stepResult);
    if (nextStep.done) return nextStep.value;
    if (signal?.aborted === true) return UNVERIFIED_ANCESTRY;
    try {
      stepResult = await runStep(nextStep.value);
    } catch (error) {
      stepResult = {
        errno: getErrnoCode(error),
      };
    }
  }
}
//@ chunk-cgr0tezp.js:23701-24117 placement
/**
 * 驱动路径检查生成器执行文件系统步骤（可中止）。
 */
async function runFsSteps(steps, signal, shouldStop, runStep, cutShortResult) {
  let cutShortToken = Symbol("cut short");
  let onAbort;
  let abortPromise =
    signal === undefined
      ? undefined
      : new Promise((resolve) => {
          onAbort = () => resolve(cutShortToken);
          signal.addEventListener("abort", onAbort, {
            once: true,
          });
        });
  let stepResult;
  try {
    for (;;) {
      let nextStep = steps.next(stepResult);
      if (nextStep.done) return nextStep.value;
      if (signal?.aborted === true || shouldStop?.(nextStep.value) === false) return cutShortResult;
      let stepPromise = runStep(nextStep.value).catch((error) => ({
        errno: getErrnoCode(error),
      }));
      let raced = await (abortPromise === undefined
        ? stepPromise
        : Promise.race([stepPromise, abortPromise]));
      if (raced === cutShortToken) return cutShortResult;
      stepResult = raced;
    }
  } finally {
    if (onAbort !== undefined) signal?.removeEventListener("abort", onAbort);
  }
}
//@ chunk-cgr0tezp.js:24117-27079 placement
/**
 * 逐段解析路径的生成器（链接、网络、junction 检查）。
 */
function* resolvePathSafely(requestedPath, options) {
  let anchors = getAnchors(options);
  if (isUnderNetworkDir(requestedPath) && !isNetworkPathUnderAnchors(requestedPath, anchors))
    return requestedPath;
  if (
    (isUncOrDevicePath(requestedPath) &&
      !isWslUncPath(requestedPath) &&
      isForeignToAllNetworks(requestedPath, anchors)) ||
    (isNetworkMountPath(requestedPath) && isForeignToAllMounts(requestedPath, anchors))
  )
    return;
  let resolved = pathModule.resolve(requestedPath);
  let root = pathModule.parse(resolved).root;
  let currentPath = root;
  let filtered = resolved.slice(root.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
  let hopCount = 0;
  let originalRemainingCount = filtered.length;
  let insideUnreadableAncestry = false;
  let examinedAnyComponent = false;
  let seenHopKeys;
  let maxHops = 64;
  let hasDotSegmentAnywhere = () => filtered.some((segment) => hasDotSegment(segment));
  let leadingHasTrailingDotSpace = () => /[. ]$/.test(filtered[0]);
  while (filtered.length > 0 && hopCount < maxHops) {
    if (insideUnreadableAncestry && hasDotSegment(filtered[0])) return UNVERIFIED_ANCESTRY;
    let joined = pathModule.join(currentPath, filtered[0]);
    if (
      (isNetworkMountPath(joined) && isForeignToAllMounts(joined, anchors)) ||
      (isUnderNetworkDir(joined) &&
        !(isNetworkPathUnderAnchors(joined, anchors) || isAnchorUnderPath(joined, anchors)))
    )
      return joinRemainingSegments(joined, filtered.slice(1), options?.onCollapsedLanding);
    if (isMacSpecialPath(joined)) {
      if (options?.surfaceNetworkRaw === true || options?.unreadableAncestry === "unverified")
        return UNVERIFIED_ANCESTRY;
      return joinRemainingSegments(joined, filtered.slice(1), options?.onCollapsedLanding);
    }
    let devFdSpecialCaseEnabled = false;
    if (
      devFdSpecialCaseEnabled &&
      pathModule.dirname(joined) === "/dev/fd" &&
      filtered.some((segment, index) => index > 0 && (segment === ".." || segment === "."))
    ) {
      filtered.shift();
      while (filtered[0] === "." && filtered.length > 1) filtered.shift();
      currentPath = joined;
      continue;
    }
    let statResult = devFdSpecialCaseEnabled
      ? {
          errno: "ENOENT",
        }
      : yield {
          kind: "lstat",
          path: joined,
        };
    if (statResult === undefined || typeof statResult === "string" || "errno" in statResult) {
      if (
        typeof statResult === "object" &&
        "errno" in statResult &&
        statResult.errno !== undefined &&
        statResult.errno !== "ENOENT" &&
        statResult.errno !== "ENOTDIR" &&
        statResult.errno !== "ENAMETOOLONG"
      ) {
        if (
          typeof (yield {
            kind: "opendirNofollow",
            path: joined,
          }) === "string"
        ) {
          examinedAnyComponent = true;
          filtered.shift();
          currentPath = joined;
          continue;
        }
      }
      if (
        options?.launchAncestry &&
        !examinedAnyComponent &&
        typeof statResult === "object" &&
        "errno" in statResult &&
        (statResult.errno === "EPERM" || statResult.errno === "EACCES") &&
        isSpelledStrictAncestor(joined, options.launchAncestry)
      ) {
        insideUnreadableAncestry = true;
        filtered.shift();
        currentPath = joined;
        continue;
      }
      if (
        typeof statResult === "object" &&
        "errno" in statResult &&
        (statResult.errno === "ENOENT" || statResult.errno === "ENOTDIR")
      )
        options?.onOutcome?.({
          kind: "absent",
          at: currentPath,
          remaining: [...filtered],
          fromLinkTarget: filtered.length > originalRemainingCount,
          ...(statResult.errno === "ENOTDIR" && {
            notAFolder: true,
          }),
        });
      return unverifiedAncestryReason(
        statResult,
        options,
        hopCount > 0,
        hasDotSegmentAnywhere(),
        leadingHasTrailingDotSpace(),
      );
    }
    let stats = statResult;
    examinedAnyComponent = true;
    if (!stats.isSymbolicLink()) {
      filtered.shift();
      currentPath = joined;
      continue;
    }
    hopCount++;
    let hopKey = joined + "\x00" + filtered.join("\x00");
    if ((seenHopKeys ??= new Set()).has(hopKey)) return;
    seenHopKeys.add(hopKey);
    let linkText = yield {
      kind: "readlink",
      path: joined,
    };
    if (typeof linkText !== "string")
      return unverifiedAncestryReason(
        linkText,
        options,
        hopCount > 0,
        hasDotSegmentAnywhere(),
        leadingHasTrailingDotSpace(),
      );
    let targetText = linkText;
    if (options?.literalLinkText === "opaque" && isOpaqueLinkText(targetText)) return OPAQUE_LINK_TEXT;
    if (!pathModule.isAbsolute(targetText)) {
      let filtered_2 = targetText.split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
      if (options?.surfaceNetworkRaw === true) {
        let collapsed = collapseNetworkLanding(
          (currentPath.endsWith(pathModule.sep) ? currentPath : currentPath + pathModule.sep) +
            [...filtered_2, ...filtered.slice(1)].join(pathModule.sep),
          anchors,
          options?.onCollapsedLanding,
        );
        if (collapsed !== undefined) return collapsed;
      }
      filtered.shift();
      options?.onHop?.({
        composed: pathModule.resolve(currentPath, targetText, ...filtered),
        leaf: filtered.length === 0,
        text: targetText,
      });
      originalRemainingCount = Math.min(originalRemainingCount, filtered.length);
      filtered = [...filtered_2, ...filtered];
      continue;
    }
    let targetPath = targetText;
    if (options?.surfaceNetworkRaw === true && filtered.length > 1 && isNetDir(targetPath)) {
      let collapsed = collapseNetworkLanding(
        [targetPath, ...filtered.slice(1)].join(pathModule.sep),
        anchors,
        options?.onCollapsedLanding,
      );
      if (collapsed !== undefined) return collapsed;
    }
    if (
      (isUncOrDevicePath(targetPath) &&
        !isWslUncPath(targetPath) &&
        isForeignToAllNetworks(targetPath, anchors)) ||
      (isNetworkMountPath(targetPath) && isForeignToAllMounts(targetPath, anchors)) ||
      (isUnderNetworkDir(targetPath) &&
        !(
          isNetworkPathUnderAnchors(targetPath, anchors) ||
          (filtered.length > 1 && isAnchorUnderPath(targetPath, anchors))
        ))
    ) {
      filtered.shift();
      return joinRemainingSegments(targetPath, filtered, options?.onCollapsedLanding);
    }
    if (
      options?.surfaceNetworkRaw === true &&
      hasDotSegment(targetPath) &&
      (isUncOrDevicePath(targetPath) ||
        isNetworkMountRoot(targetPath) ||
        isUnderNetworkDirCached(targetPath) ||
        isNetDir(targetPath))
    ) {
      filtered.shift();
      return filtered.length === 0 ? targetPath : targetPath + pathModule.sep + filtered.join(pathModule.sep);
    }
    filtered.shift();
    let targetRoot = pathModule.parse(targetPath).root || pathModule.sep;
    let root = pathModule.parse(joined).root;
    let swapsToPosixRoot = /^[\\/]$/.test(targetRoot) && root !== "" && !/^[\\/]$/.test(root);
    if (
      swapsToPosixRoot &&
      (options?.surfaceNetworkRaw === true || options?.unreadableAncestry === "unverified")
    )
      return UNVERIFIED_ANCESTRY;
    options?.onHop?.({
      composed: filtered.length === 0 ? targetPath : pathModule.resolve(targetPath, ...filtered),
      leaf: filtered.length === 0,
      text: targetText,
    });
    currentPath = swapsToPosixRoot ? root : targetRoot;
    examinedAnyComponent = false;
    originalRemainingCount = Math.min(originalRemainingCount, filtered.length);
    filtered = [
      ...targetPath.slice(targetRoot.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean),
      ...filtered,
    ];
  }
  if (filtered.length > 0 && options?.literalLinkText === "opaque") return OPAQUE_LINK_TEXT;
  if (filtered.length > 0) return UNVERIFIED_ANCESTRY;
  if (hopCount > 0 && isNetDir(currentPath)) return currentPath;
  if (isUnderNetworkDir(currentPath) && !isNetworkPathUnderAnchors(currentPath, anchors)) return currentPath;
  if (filtered.length === 0)
    options?.onOutcome?.({
      kind: "resolved",
      path: currentPath,
    });
  return;
}
//@ chunk-cgr0tezp.js:27079-27452 placement
function safeResolvePath(fsImplementation, filePath) {
  if (
    (isUncOrDevicePath(filePath) && !isWslUncPath(filePath)) ||
    isNetworkMountPath(filePath) ||
    neverOtherHostMount(filePath)
  )
    return {
      resolvedPath: filePath,
      isSymlink: false,
      isCanonical: false,
    };
  let intermediateUncJunction = findIntermediateUncJunction(fsImplementation, filePath);
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY)
    return {
      resolvedPath: filePath,
      isSymlink: false,
      isCanonical: false,
    };
  if (intermediateUncJunction !== undefined)
    return {
      resolvedPath: intermediateUncJunction,
      isSymlink: true,
      isCanonical: false,
    };
  try {
    let realPath = realpathExaminedSync(fsImplementation, filePath);
    return {
      resolvedPath: realPath,
      isSymlink: realPath !== filePath,
      isCanonical: true,
    };
  } catch (error) {
    return {
      resolvedPath: filePath,
      isSymlink: false,
      isCanonical: false,
    };
  }
}
//@ chunk-cgr0tezp.js:27452-27808 placement
function vouchedLaunchAncestry(fsImplementation) {
  let launchDir = launchCwd();
  if (launchDir === null) return null;
  try {
    let resolved = pathModule.resolve(launchDir);
    let resolved_2 = pathModule.resolve(fsImplementation.cwd());
    let root = pathModule.parse(resolved).root;
    if (root !== pathModule.parse(resolved_2).root) return null;
    let filtered = resolved.slice(root.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
    let filtered_2 = resolved_2.slice(root.length).split(PATH_SEPARATOR_RUN_RE).filter(Boolean);
    let commonCount = 0;
    while (
      commonCount < filtered.length &&
      commonCount < filtered_2.length &&
      filtered[commonCount] === filtered_2[commonCount]
    )
      commonCount++;
    return commonCount > 0 ? pathModule.join(root, ...filtered.slice(0, commonCount)) : null;
  } catch {
    return null;
  }
}
//@ chunk-cgr0tezp.js:27808-28206 placement
function realpathExaminedSync(fsImplementation, filePath) {
  try {
    return fsImplementation.realpathSync(filePath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "EPERM" && errnoCode !== "EACCES") throw error;
    let outcome;
    let launchAncestry = vouchedLaunchAncestry(fsImplementation);
    if (
      findIntermediateUncJunction(fsImplementation, filePath, {
        unreadableAncestry: "unverified",
        surfaceNetworkRaw: true,
        launchAncestry,
        onOutcome: (outcome_2) => {
          outcome = outcome_2;
        },
      }) !== undefined ||
      outcome === undefined
    )
      throw error;
    if (outcome.kind === "absent")
      throw Object.assign(Error("ENOENT: no such file or directory"), {
        code: "ENOENT",
        syscall: "realpath",
        path: filePath,
      });
    return identity(outcome.path);
  }
}
//@ chunk-cgr0tezp.js:28206-28244 placement
var SYMLINK_TO_NETWORK_PATH_CODE = "ERR_SYMLINK_TO_NETWORK_PATH";
//@ chunk-cgr0tezp.js:28244-28406 placement
function vetRepoSettingsPath(fsImplementation, settingsPath, options) {
  let { asWritten, opts } = refuseUnvettablePath(fsImplementation, settingsPath, options);
  let linksResolvedPath;
  let absentAt;
  refuseUnexaminedPath(
    findIntermediateUncJunction(fsImplementation, asWritten, {
      ...opts,
      onOutcome: (walkOutcome) => {
        linksResolvedPath = getResolvedPath(walkOutcome);
        absentAt = absentSpellingInfo(walkOutcome);
      },
    }),
    settingsPath,
    asWritten,
  );
  return {
    ...plainResolvedPathInfo(asWritten),
    linksResolvedPath,
    absentAt,
  };
}
//@ chunk-cgr0tezp.js:28406-29083 placement
async function vetRepoSettingsPathAsync(fsImplementation, settingsPath, options) {
  let { asWritten, opts, ownHost } = refuseUnvettablePath(fsImplementation, settingsPath, options);
  let linksResolvedPath;
  let absentAt;
  let identity;
  let endStats;
  let noFileSeen = !ownHost;
  let sawOutcome = false;
  let lastStat;
  let linksFollowed = [];
  let vetOptions = {
    ...opts,
    onOutcome: (walkOutcome) => {
      sawOutcome = true;
      linksResolvedPath = getResolvedPath(walkOutcome);
      absentAt = absentSpellingInfo(walkOutcome);
      let previousStat = lastStat;
      let isSameFile = walkOutcome.kind === "resolved" && previousStat?.path === walkOutcome.path;
      noFileSeen = !isSameFile;
      endStats = isSameFile ? previousStat.stats : undefined;
      identity =
        isSameFile && !isSentinelInode(previousStat.stats.ino)
          ? {
              dev: previousStat.stats.dev,
              ino: previousStat.stats.ino,
              ctimeNs: previousStat.stats.ctimeNs,
            }
          : undefined;
    },
  };
  refuseUnexaminedPath(
    await findIntermediateUncJunctionAsync(
      fsImplementation,
      asWritten,
      vetOptions,
      undefined,
      options?.fileIdentity === true
        ? (path, stats) => {
            lastStat =
              stats === undefined
                ? undefined
                : {
                    path,
                    stats,
                  };
            if (stats?.isSymbolicLink() === true) linksFollowed.push(stats);
          }
        : undefined,
    ),
    settingsPath,
    asWritten,
  );
  if (!sawOutcome && lastStat?.stats.isSymbolicLink() === true) noFileSeen = true;
  return {
    ...plainResolvedPathInfo(asWritten),
    linksResolvedPath,
    absentAt,
    ...(identity !== undefined && {
      identity,
    }),
    ...(endStats !== undefined && {
      endStats,
    }),
    ...(options?.fileIdentity === true && {
      linksFollowed,
    }),
    ...(options?.fileIdentity === true &&
      noFileSeen && {
        noFileSeen: true,
      }),
  };
}
//@ chunk-cgr0tezp.js:29143-29287 placement
function absentSpellingInfo(outcome) {
  return outcome.kind === "absent"
    ? {
        at: outcome.at,
        remaining: outcome.remaining,
        fromLinkTarget: outcome.fromLinkTarget,
        ...(outcome.notAFolder && {
          notAFolder: true,
        }),
      }
    : undefined;
}
//@ chunk-cgr0tezp.js:29287-29988 placement
/**
 * 设备命名空间路径拒绝读取。
 */
function refuseUnvettablePath(fsImpl, filePath, options) {
  let uncLongPath = toUncLongPath(filePath);
  if (isDeviceNamespacePath(uncLongPath) || isDevicePrefixPath(uncLongPath))
    throw Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a device-namespace spelling; use the plain drive or share path)",
      ),
      {
        code: SYMLINK_TO_NETWORK_PATH_CODE,
        path: filePath,
        reason: "unexamined",
      },
    );
  let absolutePath = pathModule.isAbsolute(uncLongPath)
    ? pathModule.resolve(uncLongPath)
    : pathModule.resolve(process.cwd(), uncLongPath);
  let uncLongPath_2 = toUncLongPath(absolutePath);
  if (isDeviceNamespacePath(uncLongPath_2) || isDevicePrefixPath(uncLongPath_2))
    throw Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a device-namespace spelling; use the plain drive or share path)",
      ),
      {
        code: SYMLINK_TO_NETWORK_PATH_CODE,
        path: filePath,
        reason: "unexamined",
      },
    );
  let ownHost =
    isUnderNetworkDir(uncLongPath_2) ||
    isNetworkMountPath(uncLongPath_2) ||
    (isUncOrDevicePath(uncLongPath_2) && !isWslUncPath(uncLongPath_2));
  return {
    asWritten: uncLongPath_2,
    ownHost,
    opts: {
      ...(ownHost && {
        anchors: [uncLongPath_2],
      }),
      surfaceNetworkRaw: true,
      ...((!ownHost || options?.failClosed) && {
        unreadableAncestry: "unverified",
        launchAncestry: vouchedLaunchAncestry(fsImpl),
      }),
    },
  };
}
//@ chunk-cgr0tezp.js:29988-30054 placement
function plainResolvedPathInfo(resolvedPath) {
  return {
    resolvedPath,
    isSymlink: false,
    isCanonical: false,
  };
}
//@ chunk-cgr0tezp.js:30054-30618 placement
/**
 * 无法检查的路径拒绝读取。
 */
function refuseUnexaminedPath(intermediateUncJunction, path, asWritten) {
  if (intermediateUncJunction === undefined) return;
  let refusalError = (reason) =>
    Object.assign(
      Error(
        "Refusing to read a file whose path could not be vetted (a component that could not be examined, or a symbolic link chain too long to follow)",
      ),
      {
        code: SYMLINK_TO_NETWORK_PATH_CODE,
        path,
        reason,
      },
    );
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY) throw refusalError("unexamined");
  if (isUnderNetworkDir(asWritten) && intermediateUncJunction === asWritten) return;
  if (!(
    isUncOrDevicePath(intermediateUncJunction) ||
    isNetworkMountRoot(intermediateUncJunction) ||
    isUnderNetworkDir(intermediateUncJunction) ||
    isNetDir(intermediateUncJunction)
  ))
    throw refusalError("unexamined");
  throw Object.assign(
    Error(
      "Refusing to read a file through a symbolic link that leads onto a network share or automount path; replace the link with a regular file to use it",
    ),
    {
      code: SYMLINK_TO_NETWORK_PATH_CODE,
      path,
      reason: "network",
    },
  );
}
//@ chunk-cgr0tezp.js:30618-30652 placement
function isSymlinkToNetworkPathError(error) {
  return getErrnoCode(error) === SYMLINK_TO_NETWORK_PATH_CODE;
}
//@ chunk-cgr0tezp.js:30652-30749 placement
function repoSettingsRefusalReason(error) {
  if (!isSymlinkToNetworkPathError(error)) return;
  let reason = error.reason;
  return reason === "network" || reason === "unexamined" ? reason : undefined;
}
//@ chunk-cgr0tezp.js:30749-30837 placement
function isDuplicatePath(fsImpl, filePath, loadedPaths) {
  let { resolvedPath } = safeResolvePath(fsImpl, filePath);
  if (loadedPaths.has(resolvedPath)) return true;
  loadedPaths.add(resolvedPath);
  return false;
}
//@ chunk-cgr0tezp.js:30837-30869 placement
var DOTDOT_SEGMENT_PATTERN = /(^|[\\/])\.\.([\\/]|$)/;
//@ chunk-cgr0tezp.js:30869-31047 placement
function stripDotSegments(path, platform = "linux") {
  let replaced = path.replace(platform === "win32" ? /[\\/]\.(?=[\\/]|$)/g : /\/\.(?=\/|$)/g, "");
  if (replaced === "") return path[0];
  if (platform === "win32" && /^[A-Za-z]:$/.test(replaced)) return replaced + path[2];
  return replaced;
}
//@ chunk-cgr0tezp.js:31047-32818 placement (2.1.88 match: resolveDeepestExistingAncestorSync, 0.643)
/**
 * 对不存在的路径，找到最深的已存在祖先并 realpath，再拼回剩余部分（权限检查用于新建文件）。
 */
function resolveDeepestExistingAncestorSync(fsImplementation, path, options) {
  let anchors = getAnchors(options);
  if (
    (isUncOrDevicePath(path) && !isWslUncPath(path)) ||
    isNetworkMountPath(path) ||
    neverOtherHostMount(path)
  ) {
    if (
      anchors !== undefined &&
      ((isNetworkMountPath(path) && !isForeignToAllMounts(path, anchors)) ||
        (isUncOrDevicePath(path) && !isWslUncPath(path) && !isForeignToAllNetworks(path, anchors)))
    ) {
      let intermediateUncJunction = findIntermediateUncJunction(fsImplementation, path, {
        anchors,
        surfaceNetworkRaw: options?.surfaceNetworkRaw,
      });
      if (intermediateUncJunction === UNVERIFIED_ANCESTRY && options?.surfaceNetworkRaw !== true) {
        if (options?.surfaceDotDotTargets === true) throw hopCapExhausted(path);
        return path;
      }
      return intermediateUncJunction;
    }
    return path;
  }
  let intermediateUncJunction = findIntermediateUncJunction(
    fsImplementation,
    path,
    options?.surfaceNetworkRaw === true
      ? {
          surfaceNetworkRaw: true,
          anchors,
        }
      : undefined,
  );
  if (intermediateUncJunction === UNVERIFIED_ANCESTRY && options?.surfaceNetworkRaw !== true) {
    if (options?.surfaceDotDotTargets === true) throw hopCapExhausted(path);
    return;
  }
  if (intermediateUncJunction !== undefined)
    return options?.liveRoutesOnly === true ? undefined : intermediateUncJunction;
  let currentPath = path;
  let segments = [];
  let surfaceDotDot = options?.surfaceDotDotTargets === true;
  let appendSegments = (basePath) =>
    segments.length === 0
      ? basePath
      : surfaceDotDot && DOTDOT_SEGMENT_PATTERN.test(basePath)
        ? [basePath, ...segments].join(pathModule.sep)
        : pathModule.join(basePath, ...segments);
  while (currentPath !== pathModule.dirname(currentPath)) {
    let linkText;
    let errnoCode;
    try {
      linkText = fsImplementation.readlinkSync(currentPath);
    } catch (error) {
      errnoCode = getErrnoCode(error);
    }
    if (linkText !== undefined) {
      if (surfaceDotDot && DOTDOT_SEGMENT_PATTERN.test(linkText))
        return appendSegments(
          pathModule.isAbsolute(linkText)
            ? linkText
            : pathModule.dirname(currentPath) + pathModule.sep + linkText,
        );
      let targetPath = pathModule.isAbsolute(linkText)
        ? linkText
        : pathModule.resolve(pathModule.dirname(currentPath), linkText);
      if (
        (isUncOrDevicePath(targetPath) && !isWslUncPath(targetPath)) ||
        isNetworkMountPath(targetPath) ||
        neverOtherHostMount(targetPath) ||
        isMacSpecialPath(targetPath) ||
        (options?.surfaceNetworkRaw === true && hasDotSegment(targetPath))
      ) {
        if (options?.liveRoutesOnly === true) return;
        return options?.surfaceNetworkRaw === true && segments.length > 0
          ? targetPath + pathModule.sep + segments.join(pathModule.sep)
          : appendSegments(targetPath);
      }
      try {
        let realPath = realpathExaminedSync(fsImplementation, currentPath);
        return appendSegments(realPath);
      } catch {
        if (options?.liveRoutesOnly === true) return;
        let walkPath = currentPath;
        let walkCount = 0;
        let maxWalk = 64;
        while (walkCount < maxWalk) {
          let walkLinkText;
          try {
            walkLinkText = fsImplementation.readlinkSync(walkPath);
          } catch {
            break;
          }
          if (surfaceDotDot && DOTDOT_SEGMENT_PATTERN.test(walkLinkText)) {
            walkPath = pathModule.isAbsolute(walkLinkText)
              ? walkLinkText
              : pathModule.dirname(walkPath) + pathModule.sep + walkLinkText;
            break;
          }
          let nextPath = pathModule.isAbsolute(walkLinkText)
            ? surfaceDotDot
              ? stripDotSegments(walkLinkText)
              : walkLinkText
            : pathModule.resolve(pathModule.dirname(walkPath), walkLinkText);
          if (
            (isUncOrDevicePath(nextPath) &&
              !isWslUncPath(nextPath) &&
              isForeignToAllNetworks(nextPath, anchors)) ||
            (isNetworkMountPath(nextPath) && isForeignToAllMounts(nextPath, anchors)) ||
            neverOtherHostMount(nextPath) ||
            isMacSpecialPath(nextPath) ||
            (options?.surfaceNetworkRaw === true && hasDotSegment(nextPath))
          ) {
            walkPath = nextPath;
            break;
          }
          let nextStats;
          try {
            nextStats = fsImplementation.lstatSync(nextPath);
          } catch {
            walkPath = nextPath;
            break;
          }
          if (!nextStats.isSymbolicLink()) {
            walkPath = nextPath;
            break;
          }
          walkPath = nextPath;
          walkCount++;
        }
        if (walkCount >= maxWalk && options?.surfaceNetworkRaw === true) return UNVERIFIED_ANCESTRY;
        return options?.surfaceNetworkRaw === true &&
          segments.length > 0 &&
          ((isUncOrDevicePath(walkPath) && !isWslUncPath(walkPath)) ||
            isNetworkMountPath(walkPath) ||
            neverOtherHostMount(walkPath) ||
            isMacSpecialPath(walkPath) ||
            hasDotSegment(walkPath))
          ? walkPath + pathModule.sep + segments.join(pathModule.sep)
          : appendSegments(walkPath);
      }
    }
    if (errnoCode === "ENOENT") {
      segments.unshift(pathModule.basename(currentPath));
      currentPath = pathModule.dirname(currentPath);
      continue;
    }
    try {
      let realPath = realpathExaminedSync(fsImplementation, currentPath);
      if (realPath !== currentPath) return appendSegments(realPath);
    } catch (error) {
      if (surfaceDotDot) throw error;
    }
    return;
  }
  return;
}
//@ chunk-cgr0tezp.js:32818-32868 placement
function isSpecialPath(path) {
  return (
    (isUncOrDevicePath(path) && !isWslUncPath(path)) ||
    isNetworkMountRoot(path) ||
    isDeviceNamespacePath(path)
  );
}
//@ chunk-cgr0tezp.js:32868-32903 placement
function expandWin32ExistingLongNames(path) {
  return resolveViaDeepestExistingAncestor(path, false) ?? path;
}
//@ chunk-cgr0tezp.js:32903-32935 placement
function expandWin32ExistingLongNamesStrict(path) {
  return resolveViaDeepestExistingAncestor(path, true);
}
//@ chunk-cgr0tezp.js:32935-33259 placement
/**
 * 找到最深的存在的祖先目录。
 */
function resolveViaDeepestExistingAncestor(path, strict) {
  if (isSpecialPath(path)) return path;
  let currentPath = path;
  let missingTail = "";
  for (;;) {
    if (!hasDotSegment(currentPath)) {
      let cached = realpathCacheEntry(currentPath);
      if (cached !== null) {
        let candidate =
          missingTail === ""
            ? cached
            : cached.endsWith(pathModule.sep)
              ? cached + missingTail
              : cached + pathModule.sep + missingTail;
        if (isSpecialPath(candidate)) return strict ? candidate : path;
        return candidate;
      }
      if (strict)
        try {
          fsModule.lstatSync(currentPath);
          return null;
        } catch (error) {
          if (!isENOENT(error)) return null;
        }
    }
    let dir = pathModule.dirname(currentPath);
    if (dir === currentPath) return path;
    missingTail =
      missingTail === ""
        ? pathModule.basename(currentPath)
        : pathModule.basename(currentPath) + pathModule.sep + missingTail;
    currentPath = dir;
  }
}
//@ chunk-cgr0tezp.js:33259-33300 placement
function walkPermissionCheckPaths(path) {
  return walkPathSpellingsSync(path, "permission");
}
//@ chunk-cgr0tezp.js:33300-33349 placement
function walkPermissionCheckPathsAsync(path, signal, signal_2) {
  return vetPathAsync(path, "permission", signal, signal_2);
}
//@ chunk-cgr0tezp.js:33349-33764 placement
/**
 * 异步执行路径检查步骤。
 */
function vetPathAsync(path, purpose, signal, shouldStop) {
  let fsImplementation = getFsImplementation();
  return runFsSteps(
    vetPathSteps(path, purpose),
    signal,
    shouldStop === undefined ? undefined : (step) => shouldStop(step.path),
    async (step) => {
      switch (step.kind) {
        case "lstat":
          return fsImplementation.lstat(step.path);
        case "opendirNofollow":
          await fsImplementation.openDirNoFollow(step.path);
          return "ok";
        case "readlink":
          return fsImplementation.readlink(step.path);
        case "realpath":
          return fsImplementation === NodeFsOperations
            ? identity(await realpathPromise(step.path))
            : fsImplementation.realpath(step.path);
      }
    },
    {
      unresolved: true,
      requested: path,
      spellings: [path],
      stoppedAt: path,
      leafIsSymlink: false,
      reason: "cut-short",
    },
  );
}
//@ chunk-cgr0tezp.js:33764-33805 placement
function getPathsForNetworkScreen(path) {
  return toPathCheckResult(walkPathSpellingsSync(path, "screen"));
}
//@ chunk-cgr0tezp.js:33805-33937 placement
function toPathCheckResult(result) {
  return {
    paths: result.spellings,
    vetted: !result.unresolved,
    ...(!result.unresolved &&
      result.linkTextClimbs && {
        linkTextClimbs: result.linkTextClimbs,
      }),
  };
}
//@ chunk-cgr0tezp.js:33937-33998 placement
async function getPathsForNetworkScreenAsync(path) {
  return toPathCheckResult(await vetPathAsync(path, "screen", undefined));
}
//@ chunk-cgr0tezp.js:33998-34261 placement
/**
 * 同步驱动 pathSpellingWalker（lstat/readlink/opendir），得到路径的全部拼写。
 */
function walkPathSpellingsSync(path, purpose) {
  let fsImplementation = getFsImplementation();
  return returnValue(vetPathSteps(path, purpose), (step) => {
    switch (step.kind) {
      case "lstat":
        return fsImplementation.lstatSync(step.path);
      case "opendirNofollow":
        fsImplementation.openDirNoFollowSync(step.path);
        return "ok";
      case "readlink":
        return fsImplementation.readlinkSync(step.path);
      case "realpath":
        return fsImplementation.realpathSync(step.path);
    }
  });
}
//@ chunk-cgr0tezp.js:34261-36346 placement
/**
 * 路径拼写生成器：展开 ~、逐段跟随符号链接，产出路径的全部等价拼写，供权限检查确保规则对真实位置生效；通过 yield 请求 lstat/readlink，可同步或异步驱动。
 */
function* vetPathSteps(requestedPath, purpose) {
  let inputPath = requestedPath;
  if (inputPath === "~") inputPath = homedir().normalize("NFC");
  else if (inputPath.startsWith("~/"))
    inputPath = pathModule.join(homedir().normalize("NFC"), inputPath.slice(2));
  let spellings = new Set([inputPath]);
  let linkTextClimbs = false;
  let resolvedResult = (landing, leafIsSymlink = false) => ({
    unresolved: false,
    requested: inputPath,
    spellings: Array.from(spellings),
    landing,
    leafIsSymlink,
    ...(linkTextClimbs && {
      linkTextClimbs,
    }),
  });
  if (
    (isUncOrDevicePath(inputPath) && !isWslUncPath(inputPath)) ||
    isNetworkMountPath(inputPath) ||
    neverOtherHostMount(inputPath)
  )
    return resolvedResult(inputPath);
  let fsImplementation = getFsImplementation();
  let launchAncestry = vouchedLaunchAncestry(fsImplementation);
  let collapsedLanding;
  let outcome;
  let leafIsSymlink = false;
  let sawReadlink = false;
  let readlinkFailed = false;
  let loopAtOpenedDir = false;
  let extraSpellings = [];
  let extraSpellingKeys = new Set();
  let addSpelling = (composed) => {
    let resolved = pathModule.resolve(composed);
    if (!extraSpellingKeys.has(resolved)) {
      extraSpellingKeys.add(resolved);
      extraSpellings.push(composed);
    }
  };
  let stoppedAt = inputPath;
  let lastErrno;
  let driveSteps = function* (path) {
    let stepResult;
    for (;;) {
      let nextStep = path.next(stepResult);
      if (nextStep.done) return nextStep.value;
      let step = nextStep.value;
      stoppedAt = step.path;
      if (step.kind === "readlink") sawReadlink = true;
      else lastErrno = undefined;
      stepResult = yield step;
      if (typeof stepResult === "object" && "errno" in stepResult)
        if (step.kind === "readlink") readlinkFailed = true;
        else {
          lastErrno = stepResult.errno;
          loopAtOpenedDir ||= step.kind === "opendirNofollow" && stepResult.errno === "ELOOP";
        }
    }
  };
  let result = yield* driveSteps(
    resolvePathSafely(inputPath, {
      unreadableAncestry: "unverified",
      launchAncestry,
      ...false,
      onCollapsedLanding: (landing) => {
        collapsedLanding = landing;
      },
      onOutcome: (outcome_2) => {
        outcome = outcome_2;
      },
      onHop: ({ composed, leaf, text }) => {
        if (leaf) {
          spellings.add(composed);
          leafIsSymlink = true;
        }
        if (purpose === "screen" && hasParentSegment(text)) {
          linkTextClimbs = true;
          addSpelling(composed);
        }
      },
    }),
  );
  let tooLongOrDenied =
    purpose === "permission" &&
    !sawReadlink &&
    (lastErrno === "ENAMETOOLONG" || lastErrno === "EACCES" || lastErrno === "EPERM");
  let fallbackResult = () => {
    let inputSpelling = identity(inputPath);
    spellings.add(inputSpelling);
    return resolvedResult(inputSpelling);
  };
  let unresolvedResult = () =>
    tooLongOrDenied
      ? fallbackResult()
      : {
          unresolved: true,
          requested: inputPath,
          spellings: Array.from(spellings),
          stoppedAt,
          leafIsSymlink,
          reason: sawReadlink || loopAtOpenedDir ? "past-a-link" : "unexamined",
        };
  let maxExtraPaths = 8;
  let resolveExtraSpellings = function* () {
    for (let idx = 0; idx < extraSpellings.length; idx++) {
      if (idx >= maxExtraPaths) return false;
      let spelling = extraSpellings[idx];
      if (
        (isUncOrDevicePath(spelling) && !isWslUncPath(spelling)) ||
        isNetworkMountPath(spelling) ||
        neverOtherHostMount(spelling)
      ) {
        spellings.add(spelling);
        continue;
      }
      let spellingResult = yield* driveSteps(
        resolvePathSafely(spelling, {
          unreadableAncestry: "unverified",
          launchAncestry,
          onHop: ({ composed, text }) => {
            if (hasParentSegment(text)) addSpelling(composed);
          },
        }),
      );
      if (spellingResult === UNVERIFIED_ANCESTRY || readlinkFailed) return false;
      if (spellingResult !== undefined) spellings.add(spellingResult);
    }
    return true;
  };
  if (result === UNVERIFIED_ANCESTRY || result === OPAQUE_LINK_TEXT) return unresolvedResult();
  if (result !== undefined) {
    if (purpose === "screen" && !(yield* resolveExtraSpellings())) return unresolvedResult();
    if (collapsedLanding !== undefined) spellings.add(collapsedLanding);
    spellings.delete(result);
    spellings.add(result);
    return resolvedResult(result, leafIsSymlink);
  }
  if (outcome === undefined) {
    if (purpose === "screen" && !readlinkFailed)
      return (yield* resolveExtraSpellings()) ? fallbackResult() : unresolvedResult();
    return unresolvedResult();
  }
  if (
    outcome.kind === "absent" &&
    (purpose === "screen"
      ? outcome.remaining.some((segment) => hasDotSegment(segment))
      : sawReadlink && outcome.remaining.some((segment) => hasDotSegmentAlias(segment)))
  )
    return unresolvedResult();
  let landing = outcome.kind === "absent" ? outcome.at : outcome.path;
  let tail = outcome.kind === "absent" ? outcome.remaining.join(pathModule.sep) : "";
  let combined = identity(tail === "" ? landing : pathModule.join(landing, tail));
  if (sawReadlink || landing !== pathModule.parse(landing).root) spellings.add(combined);
  let realPath = joinIfChanged(
    yield {
      kind: "realpath",
      path: landing,
    },
    landing,
    tail,
  );
  if (realPath !== undefined && realPath !== combined) {
    spellings.delete(realPath);
    spellings.add(realPath);
  }
  if (purpose === "screen" && !(yield* resolveExtraSpellings())) return unresolvedResult();
  return resolvedResult(combined, leafIsSymlink);
}
//@ chunk-cgr0tezp.js:36346-36430 placement
function joinIfChanged(realPath, basePath, tail) {
  if (typeof realPath !== "string" || realPath === basePath) return;
  return tail === "" ? realPath : pathModule.join(realPath, tail);
}
//@ chunk-cgr0tezp.js:36430-36521 placement
function resolvedSpellingWalk(resolvedPath) {
  return {
    unresolved: false,
    requested: resolvedPath,
    spellings: [resolvedPath],
    landing: resolvedPath,
    leafIsSymlink: false,
  };
}
//@ chunk-cgr0tezp.js:36521-36554 placement
function getPathsForPermissionCheck(path) {
  return permissionCheckSpellings(walkPermissionCheckPaths(path));
}
//@ chunk-cgr0tezp.js:36554-36743 placement
function permissionCheckSpellings(result) {
  if (!result.unresolved) return result.spellings;
  let { resolvedPath, isCanonical, isSymlink } = safeResolvePath(getFsImplementation(), result.requested);
  return (isCanonical || isSymlink) && !result.spellings.includes(resolvedPath)
    ? [...result.spellings, resolvedPath]
    : result.spellings;
}
//@ chunk-cgr0tezp.js:36743-40014 placement (2.1.88 match: NodeFsOperations, 0.851)
var NodeFsOperations = {
  cwd() {
    return process.cwd();
  },
  existsSync(fsPath) {
    using span = slowLogging`fs.existsSync(${fsPath})`;
    return fsModule.existsSync(fsPath);
  },
  async stat(fsPath) {
    return stat(fsPath);
  },
  async lstat(path) {
    return lstat(path);
  },
  async openDirNoFollow(path) {
    await (await open(path, fsModule.constants.O_DIRECTORY | fsModule.constants.O_NOFOLLOW)).close();
  },
  openDirNoFollowSync(path) {
    let fd = fsModule.openSync(path, fsModule.constants.O_DIRECTORY | fsModule.constants.O_NOFOLLOW);
    fsModule.closeSync(fd);
  },
  async lstatBigint(path) {
    return lstat(path, {
      bigint: true,
    });
  },
  async statBigint(path) {
    return stat(path, {
      bigint: true,
    });
  },
  async readdir(fsPath) {
    return readdir(fsPath, {
      withFileTypes: true,
    });
  },
  async unlink(fsPath) {
    return unlink(fsPath);
  },
  async rmdir(fsPath) {
    return rmdir(fsPath);
  },
  async rm(fsPath, options) {
    return rm(fsPath, options);
  },
  async mkdir(dirPath, options) {
    try {
      await mkdir(dirPath, {
        recursive: true,
        ...options,
      });
    } catch (e) {
      if (getErrnoCode(e) !== "EEXIST") throw e;
    }
  },
  async readFile(fsPath, options) {
    return readFile(fsPath, {
      encoding: options.encoding,
    });
  },
  async rename(oldPath, newPath) {
    return rename(oldPath, newPath);
  },
  async realpath(path) {
    return identity(await realpath(path));
  },
  async readlink(path) {
    return readlink(path);
  },
  async copyFile(fromPath, toPath) {
    return copyFile(fromPath, toPath);
  },
  async appendFile(path, data, options) {
    if (options?.mode !== undefined)
      try {
        let fd = await open(path, "ax", options.mode);
        try {
          await fd.appendFile(data);
        } finally {
          await fd.close();
        }
        return;
      } catch (e) {
        if (getErrnoCode(e) !== "EEXIST") throw e;
      }
    return appendFile(path, data);
  },
  async symlink(target, linkPath, linkType) {
    return symlink(target, linkPath, linkType);
  },
  async link(existingPath, newPath) {
    return link(existingPath, newPath);
  },
  async chmod(path, mode) {
    return chmod(path, mode);
  },
  statSync(fsPath) {
    using span = slowLogging`fs.statSync(${fsPath})`;
    return fsModule.statSync(fsPath);
  },
  lstatSync(fsPath) {
    using span = slowLogging`fs.lstatSync(${fsPath})`;
    return fsModule.lstatSync(fsPath);
  },
  readFileSync(fsPath, options) {
    using span = slowLogging`fs.readFileSync(${fsPath})`;
    return fsModule.readFileSync(fsPath, {
      encoding: options.encoding,
    });
  },
  readSync(fsPath, options) {
    using span = slowLogging`fs.readSync(${fsPath}, ${options.length} bytes)`;
    let fd = undefined;
    try {
      fd = fsModule.openSync(fsPath, "r");
      let chunks = [];
      let totalRead = 0;
      while (totalRead < options.length) {
        let chunkBuffer = Buffer.allocUnsafe(Math.min(65536, options.length - totalRead));
        let sync = fsModule.readSync(fd, chunkBuffer, 0, chunkBuffer.length, totalRead);
        if (sync === 0) break;
        chunks.push(chunkBuffer.subarray(0, sync));
        totalRead += sync;
      }
      return {
        buffer: Buffer.concat(chunks, totalRead),
        bytesRead: totalRead,
      };
    } finally {
      if (fd !== undefined) fsModule.closeSync(fd);
    }
  },
  appendFileSync(path, data, options) {
    using span = slowLogging`fs.appendFileSync(${path}, ${data.length} chars)`;
    if (options?.mode !== undefined)
      try {
        let fd = fsModule.openSync(path, "ax", options.mode);
        try {
          fsModule.appendFileSync(fd, data);
        } finally {
          fsModule.closeSync(fd);
        }
        return;
      } catch (e) {
        if (getErrnoCode(e) !== "EEXIST") throw e;
      }
    fsModule.appendFileSync(path, data);
  },
  unlinkSync(path) {
    using span = slowLogging`fs.unlinkSync(${path})`;
    fsModule.unlinkSync(path);
  },
  renameSync(oldPath, newPath) {
    using span = slowLogging`fs.renameSync(${oldPath} ${RENAME_ARROW} ${newPath})`;
    fsModule.renameSync(oldPath, newPath);
  },
  readlinkSync(path) {
    using span = slowLogging`fs.readlinkSync(${path})`;
    return fsModule.readlinkSync(path);
  },
  realpathSync(path) {
    using span = slowLogging`fs.realpathSync(${path})`;
    return identity(fsModule.realpathSync(path));
  },
  mkdirSync(dirPath, options) {
    using span = slowLogging`fs.mkdirSync(${dirPath})`;
    let mkdirOptions = {
      recursive: true,
    };
    if (options?.mode !== undefined) mkdirOptions.mode = options.mode;
    try {
      fsModule.mkdirSync(dirPath, mkdirOptions);
    } catch (e) {
      if (getErrnoCode(e) !== "EEXIST") throw e;
    }
  },
  readdirSync(dirPath) {
    using span = slowLogging`fs.readdirSync(${dirPath})`;
    return fsModule.readdirSync(dirPath, {
      withFileTypes: true,
    });
  },
  rmSync(dirPath, options) {
    using span = slowLogging`fs.rmSync(${dirPath})`;
    fsModule.rmSync(dirPath, options);
  },
  createWriteStream(filePath) {
    return fsModule.createWriteStream(filePath);
  },
  async readFileBytes(filePath, maxBytes) {
    if (maxBytes === undefined) return readFile(filePath);
    let handle = await open(filePath, nonblockingReadFlags());
    try {
      if (!(await handle.stat()).isFile()) return Buffer.alloc(0);
      return await readHandleUpTo(handle, maxBytes, "file");
    } finally {
      await handle.close();
    }
  },
  async readFileFdGated(fsPath, maxBytes) {
    try {
      let noFollowFlags = noFollowNonblockFlags();
      if (noFollowFlags === 0) {
        if (!(await lstat(fsPath)).isFile()) return null;
      }
      let handle = await open(fsPath, fsModule.constants.O_RDONLY | noFollowFlags);
      try {
        let stats = await handle.stat();
        if (!stats.isFile() || stats.size > maxBytes) return null;
        let readSize = Number(stats.size);
        let buffer = Buffer.allocUnsafe(readSize);
        let offset = 0;
        while (offset < readSize) {
          let { bytesRead } = await handle.read(buffer, offset, readSize - offset, offset);
          if (bytesRead === 0) break;
          offset += bytesRead;
        }
        return {
          content: (offset < readSize ? buffer.subarray(0, offset) : buffer).toString("utf8"),
          stats,
        };
      } finally {
        await handle.close();
      }
    } catch {
      return null;
    }
  },
};
//@ chunk-cgr0tezp.js:40014-40038 placement (2.1.88 match: getFsImplementation, 0)
/**
 * 返回全局文件系统抽象 NodeFsOperations（同步/异步 fs 包装，可在测试或宿主模式下替换）。全局约 400 处调用，项目内几乎所有文件读写都经过它。
 */
function getFsImplementation() {
  return NodeFsOperations;
}
//@ chunk-cgr0tezp.js:40038-40367 placement
function processChdir(dirPath) {
  let previousCwd;
  try {
    previousCwd = process.cwd();
  } catch {}
  process.chdir(dirPath);
  let nextCwd;
  try {
    nextCwd = process.cwd();
  } catch {
    nextCwd = dirPath;
  }
  if (!isBunVirtualPath(nextCwd)) return previousCwd;
  if (previousCwd !== undefined)
    try {
      process.chdir(previousCwd);
      process.cwd();
    } catch {}
  throw Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `ENOENT: no such file or directory, chdir '${dirPath}'`,
      "ENOENT: no such file or directory",
    ),
    {
      code: "ENOENT",
      syscall: "chdir",
      path: dirPath,
    },
  );
}
//@ chunk-cgr0tezp.js:40367-40709 placement (2.1.88 match: readFileRange, 1)
async function readFileRange(path, offset, maxBytes) {
  await using openedHandle = typeof path === "string" ? await open(path, "r") : null;
  let handle = typeof path === "string" ? openedHandle : path;
  let size = (await handle.stat()).size;
  if (size <= offset) return null;
  let bytesToRead = Math.min(size - offset, maxBytes);
  let buffer = Buffer.allocUnsafe(bytesToRead);
  let totalRead = 0;
  while (totalRead < bytesToRead) {
    let { bytesRead } = await handle.read(buffer, totalRead, bytesToRead - totalRead, offset + totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return {
    content: buffer.toString("utf8", 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  };
}
//@ chunk-cgr0tezp.js:40709-40974 placement
/**
 * 读取文件末尾若干字节/行（日志、转录尾部读取用）。
 */
async function readHandleUpTo(handle, maxBytes, kind) {
  let usePosition = kind !== undefined ? kind === "file" : (await handle.stat()).isFile();
  let chunks = [];
  let totalRead = 0;
  while (totalRead < maxBytes) {
    let buffer = Buffer.allocUnsafe(Math.min(65536, maxBytes - totalRead));
    let { bytesRead } = await handle.read(buffer, 0, buffer.length, usePosition ? totalRead : null);
    if (bytesRead === 0) break;
    chunks.push(buffer.subarray(0, bytesRead));
    totalRead += bytesRead;
  }
  return Buffer.concat(chunks, totalRead);
}
//@ chunk-cgr0tezp.js:40974-41352 placement (2.1.88 match: readFileRange, 1)
/**
 * 按字节范围读取文件片段。
 */
async function tailFile(fileOrHandle, offset) {
  await using openedHandle = typeof fileOrHandle === "string" ? await open(fileOrHandle, "r") : null;
  let handle = typeof fileOrHandle === "string" ? openedHandle : fileOrHandle;
  let size = (await handle.stat()).size;
  if (size === 0)
    return {
      content: "",
      bytesRead: 0,
      bytesTotal: 0,
    };
  let offset_2 = Math.max(0, size - offset);
  let bytesToRead = size - offset_2;
  let buffer = Buffer.allocUnsafe(bytesToRead);
  let totalRead = 0;
  while (totalRead < bytesToRead) {
    let { bytesRead } = await handle.read(buffer, totalRead, bytesToRead - totalRead, offset_2 + totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return {
    content: buffer.toString("utf8", 0, totalRead),
    bytesRead: totalRead,
    bytesTotal: size,
  };
}
//@ chunk-cgr0tezp.js:41352-41804 placement
async function* readLines(filePath, chunkBytes = 65536) {
  let handle = await open(filePath, "r");
  let readBuffer = Buffer.alloc(chunkBytes);
  let position = 0;
  let pendingParts = [];
  let pendingBytes = 0;
  try {
    while (true) {
      let { bytesRead } = await handle.read(readBuffer, 0, chunkBytes, position);
      if (bytesRead === 0) break;
      position += bytesRead;
      let chunk = readBuffer.subarray(0, bytesRead);
      let cursor = 0;
      while (cursor < bytesRead) {
        let index = chunk.indexOf(10, cursor);
        if (index === -1) {
          pendingParts.push(Buffer.from(chunk.subarray(cursor)));
          pendingBytes += bytesRead - cursor;
          break;
        }
        if (pendingBytes === 0) yield chunk.subarray(cursor, index);
        else {
          yield Buffer.concat(
            [...pendingParts, chunk.subarray(cursor, index)],
            pendingBytes + (index - cursor),
          );
          pendingParts = [];
          pendingBytes = 0;
        }
        cursor = index + 1;
      }
    }
  } finally {
    await handle.close();
  }
  if (pendingBytes > 0)
    yield pendingParts.length === 1 ? pendingParts[0] : Buffer.concat(pendingParts, pendingBytes);
}
//@ chunk-cgr0tezp.js:41804-41815 placement
var REVERSE_READ_OVERLAP_BYTES = 256;
//@ chunk-cgr0tezp.js:41815-42032 placement
class FileChangedDuringReadError extends Error {
  partialRead;
  constructor(partialRead = false) {
    super("A file changed while it was being read, so the lines read from it may not be its current lines");
    this.partialRead = partialRead;
    this.name = "FileChangedDuringReadError";
  }
}
//@ chunk-cgr0tezp.js:42032-43018 placement
async function* readLinesReverse(filePath, chunkBytes = 65536, { onOpen, strict = true } = {}) {
  let handle = await open(filePath, "r");
  try {
    let { size } = await handle.stat();
    onOpen?.(size);
    let readBuffer = Buffer.allocUnsafe(Math.min(chunkBytes + REVERSE_READ_OVERLAP_BYTES, size));
    let overlapBuffer = Buffer.allocUnsafe(Math.min(REVERSE_READ_OVERLAP_BYTES, size));
    let overlapBytes = 0;
    let readStart = size;
    let readLength = 0;
    let lineEnd = size;
    let firstChunkCopy;
    let readAndVerify = async (buffer, length, position) => {
      let totalRead = 0;
      while (totalRead < length) {
        let chunkRead = await handle.read(buffer, totalRead, length - totalRead, position + totalRead);
        if (chunkRead.bytesRead === 0 || (strict && chunkRead.bytesRead < length - totalRead))
          throw new FileChangedDuringReadError(chunkRead.bytesRead > 0);
        totalRead += chunkRead.bytesRead;
      }
      let overlapOffset = readStart + readLength - position;
      if (
        !buffer
          .subarray(overlapOffset, overlapOffset + overlapBytes)
          .equals(overlapBuffer.subarray(0, overlapBytes))
      )
        throw new FileChangedDuringReadError();
    };
    let readSpan = async (fromOffset) => {
      let spanBytes = Math.max(lineEnd, readStart + readLength + overlapBytes) - fromOffset;
      let spanBuffer = Buffer.allocUnsafe(spanBytes);
      await readAndVerify(spanBuffer, spanBytes, fromOffset);
      return spanBuffer.toString("utf8", 0, lineEnd - fromOffset);
    };
    while (readStart > 0) {
      overlapBytes = Math.min(REVERSE_READ_OVERLAP_BYTES, readLength);
      readBuffer.copy(overlapBuffer, 0, 0, overlapBytes);
      readLength = Math.min(
        chunkBytes,
        readStart,
        strict && readStart === size ? REVERSE_READ_OVERLAP_BYTES : 1 / 0,
      );
      readStart -= readLength;
      await readAndVerify(readBuffer, readLength + overlapBytes, readStart);
      if (strict)
        firstChunkCopy ??= Buffer.from(
          readBuffer.subarray(Math.max(0, readLength - REVERSE_READ_OVERLAP_BYTES), readLength),
        );
      let index = readBuffer.lastIndexOf(10, readLength - 1);
      while (index !== -1) {
        let lineStart = readStart + index + 1;
        if (lineStart < lineEnd)
          yield lineEnd <= readStart + readLength
            ? readBuffer.toString("utf8", index + 1, lineEnd - readStart)
            : await readSpan(lineStart);
        lineEnd = readStart + index;
        index = index === 0 ? -1 : readBuffer.lastIndexOf(10, index - 1);
      }
    }
    if (lineEnd > 0)
      yield lineEnd <= readLength ? readBuffer.toString("utf8", 0, lineEnd) : await readSpan(0);
    if (firstChunkCopy !== undefined) {
      readStart = size - firstChunkCopy.length;
      readLength = 0;
      overlapBytes = firstChunkCopy.copy(overlapBuffer);
      await readAndVerify(readBuffer, overlapBytes, readStart);
    }
  } finally {
    await handle.close();
  }
}
//@ chunk-cgr0tezp.js:43018-43122 placement
function createOffsetMappedText(text) {
  let int32Array = new Int32Array(text.length);
  for (let i = 0; i < text.length; i++) int32Array[i] = i;
  return {
    text,
    origin: int32Array,
  };
}
//@ chunk-jhrww53q.js:47434-47579 fingerprint (2.1.88 match: safeResolvePath, 0.602)
function safeResolvePath_2(entryStats) {
  return (
    !entryStats.isDirectory() &&
    !entryStats.isFile() &&
    !entryStats.isSymbolicLink() &&
    !entryStats.isFIFO() &&
    !entryStats.isSocket() &&
    !entryStats.isBlockDevice() &&
    !entryStats.isCharacterDevice()
  );
}
//@ chunk-e6aww6q8.js:1151949-1152000 placement
function resolveForPermissionCheck(fsImpl, filePath) {
  return isNonWslUncPath(filePath) || isMacSpecialPath(filePath)
    ? filePath
    : (resolveDeepestExistingAncestorSync(fsImpl, filePath) ?? filePath);
}
//@ chunk-e6aww6q8.js:1152000-1152140 layout
function isPathMatchedForPermission(rawPath, permissionCtx) {
  if (rawPath === "") return false;
  if (rawPath.startsWith("~")) {
    let expandedPath = expandTildeWithHome(rawPath);
    if (expandedPath.startsWith("~")) return true;
    return (
      getPathsForPermissionCheck_2(expandedPath, permissionCtx) ||
      getPathsForPermissionCheck_2(rawPath, permissionCtx)
    );
  }
  return getPathsForPermissionCheck_2(rawPath, permissionCtx);
}
//@ chunk-e6aww6q8.js:1152140-1153141 callgraph-fingerprint (2.1.88 match: getPathsForPermissionCheck, 0.425)
/**
 * 返回权限检查需要比对的路径集合（原始、规范化、符号链接解析后）。
 */
function getPathsForPermissionCheck_2(rawPath, baseCwd) {
  let fsImpl = getFsImplementation();
  if (isMacSpecialPath(rawPath)) return true;
  if (
    (!isNonWslUncPath(rawPath) || true) &&
    !isNetworkMountPath(rawPath) &&
    /(^|[/\\])\.\.(?:[/\\]|$)/.test(rawPath)
  ) {
    let slashPattern = /\/+/;
    let root = isAbsolute(rawPath) ? parse(rawPath).root : "";
    let startPath = root ? parse(resolve_2(baseCwd, rawPath)).root : baseCwd;
    let parts = (root ? rawPath.slice(root.length) : rawPath).split(slashPattern);
    let currentPath = startPath;
    for (let depth = 0; depth < parts.length; depth++) {
      let segment = parts[depth];
      if (segment === "" || segment === ".") continue;
      if (segment === "..") {
        currentPath = dirname(currentPath);
        continue;
      }
      currentPath = currentPath.endsWith(sep) ? currentPath + segment : currentPath + sep + segment;
      if (isNetworkMountPath(currentPath)) break;
      if (isMacSpecialPath(currentPath)) return true;
      try {
        if (fsImpl.lstatSync(currentPath).isSymbolicLink() && parts.slice(depth + 1).includes(".."))
          return true;
      } catch {}
    }
  }
  let resolved = resolve_2(baseCwd, rawPath);
  let normalized = resolveForPermissionCheck(fsImpl, resolved).normalize("NFC");
  let targetPath = (resolveDeepestExistingAncestorSync(fsImpl, baseCwd) ?? baseCwd).normalize("NFC");
  function isGitInternalPath(targetPath) {
    let relPath = relative(targetPath, normalized);
    if (relPath === "" || relPath.startsWith(".." + sep) || isAbsolute(relPath)) return false;
    let replaced = relPath
      .split(sep)
      .join("/")
      .toLowerCase()
      .replace(/\u0131/g, "i")
      .replace(/\u017f/g, "s");
    return GIT_INTERNAL_PATH_PATTERNS.some((pattern) => pattern.test(replaced));
  }
  if (isGitInternalPath(targetPath)) return true;
  if (!relative(targetPath, normalized).startsWith(".." + sep)) return false;
  let originalCwd = getOriginalCwd();
  let normalized_2 = (resolveDeepestExistingAncestorSync(fsImpl, originalCwd) ?? originalCwd).normalize(
    "NFC",
  );
  let cwdRelPath = relative(normalized_2, normalized);
  if (cwdRelPath === "" || cwdRelPath.startsWith(".." + sep) || isAbsolute(cwdRelPath)) return false;
  let walkDir = targetPath;
  do {
    walkDir = dirname(walkDir);
    if (isGitInternalPath(walkDir)) return true;
  } while (walkDir !== normalized_2 && walkDir !== dirname(walkDir));
  return false;
}
//@ chunk-e6aww6q8.js:1337160-1337480 fingerprint (2.1.88 match: isDuplicatePath, 0.685)
function isDuplicatePath_2(fsImplementation, patterns) {
  let mapped = patterns.map((pattern) => pattern.replaceAll("\\", "/"));
  for (let pattern of mapped) {
    if (!pattern.startsWith("/")) continue;
    let wildcardIndex = pattern.search(/[*?{[]/);
    let dirPart = wildcardIndex === -1 ? pattern : pattern.slice(0, wildcardIndex);
    let dirPath = dirname(dirPart);
    try {
      let resolved = safeResolvePath(fsImplementation, dirPath);
      let { resolvedPath } = resolved;
      if (isSpecialOrUnsafePath(resolvedPath) || isNonCanonicalSymlink(dirPath, resolved)) continue;
      let replaced = resolvedPath.replaceAll("\\", "/");
      if (replaced !== dirPath) {
        let rewrittenPattern = replaced + pattern.slice(dirPath.length);
        mapped.push(rewrittenPattern);
      }
    } catch {}
  }
  return mapped;
}
//@ chunk-awy329vy.js:49206-49477 fingerprint (2.1.88 match: readLinesReverse, 0.747)
async function readLinesReverse_2(filePath, maxBytes) {
  let handle;
  try {
    handle = await open(filePath, readOnlyNoFollowFlags());
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > maxBytes) return;
    let remainder = Buffer.alloc(stats.size + 1);
    let { bytesRead } = await handle.read(remainder, 0, remainder.length, 0);
    return bytesRead === stats.size ? remainder.subarray(0, bytesRead) : undefined;
  } catch {
    return;
  } finally {
    await handle?.close().catch(() => {});
  }
}
export {
  getFsImplementation,
  hasUntouchableRecordSpellingStrictAsync,
  hasUntouchableRecordSpelling,
  processChdir,
  findIntermediateUncJunction,
  NodeFsOperations,
  readLinesReverse,
  FileChangedDuringReadError,
  tailFile,
  hasUntouchableRecordSpellingAsync,
  getPathsForPermissionCheck,
  walkPermissionCheckPaths,
  safeResolvePath,
  vetRepoSettingsPath,
  isSymlinkToNetworkPathError,
  realpathExaminedSync,
  createOffsetMappedText,
  permissionCheckSpellings,
  resolveDeepestExistingAncestorSync,
  UNVERIFIED_ANCESTRY,
  readFileRange,
  readHandleUpTo,
  entryReachesForeignNetwork,
  isDuplicatePath_2,
  safeResolvePath_2,
  vetRepoSettingsPathAsync,
  nonblockingReadFlags,
  isOpaqueLinkText,
  findIntermediateUncJunctionAsync,
  OPAQUE_LINK_TEXT,
  getPathsForNetworkScreen,
  resolvedSpellingWalk,
  hopCapExhausted,
  vouchedLaunchAncestry,
  readLinesReverse_2,
  isDuplicatePath,
  walkPermissionCheckPathsAsync,
  isSpelledStrictAncestor,
  isPathMatchedForPermission,
  resolveForPermissionCheck,
  getPathsForPermissionCheck_2,
  repoSettingsRefusalReason,
  expandWin32ExistingLongNamesStrict,
  examineEntryChain,
  isNetworkJunction,
  hasUntouchableRecordSpellingStrict,
  SYMLINK_TO_NETWORK_PATH_CODE,
  expandWin32ExistingLongNames,
  getPathsForNetworkScreenAsync,
  readLines,
};
