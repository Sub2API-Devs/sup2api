/**
 * utils/worktree/worktreeRegistrations.ts
 *
 * 2.1.316 新增：工作树登记
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 */
import { parse, sep, normalize, dirname, join, isAbsolute, basename } from "path";
import { readlink, realpath, stat } from "fs/promises";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_ignore } from "../../../vendor/ignore/index.js";
import { setRepoDetectionGuards } from "../detectRepository.js";
import { checkHasTrustDialogAccepted } from "../config.js";
import { getPlatform } from "../platform.js";
import {
  normalizePathKey,
  stripTrailingSeparators,
  hasDistinctWorktreePaths,
  findWorktreeMatchingPaths,
  symlinkVerdictForPath,
  findSamePath,
  isRemovableWorktreeDir,
  toForwardSlashesOnWindows,
  clearReparsePoints,
} from "../pathIdentity.js";
import { getErrnoCode } from "../errors.js";
import { isSameRepository, vetWorktree } from "../git/worktreeVetting.js";
import { logForDebugging } from "../debug.js";
import { deregisterWorktree } from "../git/worktreeRegistrations.js";
import { findCanonicalGitRootUncached, gitExe } from "../git.js";
import { NOT_A_GIT_REPO_PATH, resolveGitDirsOrPlaceholder } from "../git/gitDirResolution.js";
import { getRemoteHostSessionCount } from "../../commands/insights.js";
import { isDeviceNamespacePath as isDeviceNamespacePath_2, hasDotSegment } from "../pathClassification.js";
import { hasWin32DevicePrefixSpelling } from "../fsJunctions.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";
import { gitSupportsPartialCloneFetch } from "./partialClone.js";
import { isOnForeignMount } from "../networkPaths.js";
import { removeWorktreeSafely, worktreeRemovalText } from "../git/worktreeRemoval.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:3670151-3670171 placement
var micromatch; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3670151", () => {
  micromatch = __toESM(require_ignore(), 1);
});
//@ chunk-5xgkngpb.js:3670524-3670560 placement
function installRepoDetectionGuards() {
  setRepoDetectionGuards({
    trustProbe: checkHasTrustDialogAccepted,
  });
}
//@ chunk-5xgkngpb.js:3670560-3670648 placement
var GIT_PROGRESS_LINE_RE = /^(?:remote: )?[^:'"]+:\s+\d{1,3}% \(\d+\/\d+\)(?:,[\p{L}\p{N}\p{M} .,|/]*)?$/u;
//@ chunk-5xgkngpb.js:3670648-3670875 placement
function stripProgressLines(text) {
  let lines = [];
  for (let line of text.split(/\r?\n/)) {
    let parts = line.split("\r");
    if (!parts.some((part) => GIT_PROGRESS_LINE_RE.test(part))) {
      lines.push(line);
      continue;
    }
    let filtered = parts.filter((part) => part !== "" && !GIT_PROGRESS_LINE_RE.test(part));
    if (filtered.length > 0) lines.push(filtered.join("\r"));
  }
  return lines
    .join(
      `
`,
    )
    .trim();
}
//@ chunk-5xgkngpb.js:3670875-3670899 placement
/**
 * 外部构建恒 false 的「在别处创建」判断。
 */
function isWorktreeMadeElsewhereStub() {
  return false;
}
//@ chunk-5xgkngpb.js:3671086-3671171 placement
function normalizeDriveLetter(value) {
  return getPlatform() === "windows"
    ? value.replace(/^[A-Za-z]:/, (driveLetter) => driveLetter.toLowerCase())
    : value;
}
//@ chunk-5xgkngpb.js:3671171-3671182 placement
var MAX_LINK_HOPS = 40;
//@ chunk-5xgkngpb.js:3671182-3672288 placement
/**
 * 逐段解析路径中的符号链接（限制跳转次数），处理 .. 与 Windows 规范化，得到真实路径；无法解析时返回 unresolvable。
 */
async function resolvePathThroughLinks(targetPath, rootPath) {
  let root = parse(targetPath).root;
  let filtered = targetPath.slice(root.length).split(sep).filter(Boolean);
  let mapped = filtered.map((name, original) => ({
    name,
    original,
  }));
  let resolved = root;
  let segmentOriginalIndex = -1;
  let linkHopCount = 0;
  let normalizedRoot = normalizeDriveLetter(rootPath);
  let rootPathKey = normalizePathKey(rootPath);
  let isWindows = getPlatform() === "windows";
  let splitTarget = (target) =>
    (isWindows ? normalize(target) : target)
      .split(isWindows ? /[\\/]/ : sep)
      .filter((segment) => segment !== "" && segment !== ".")
      .map((name) => ({
        name,
        original: null,
      }));
  while (mapped.length > 0) {
    let segment = mapped.shift();
    if (segment === undefined) break;
    if (segment.original !== null) segmentOriginalIndex = segment.original;
    if (segment.name === "..") resolved = dirname(resolved);
    else {
      resolved = join(resolved, segment.name);
      let linkTarget = await readlink(resolved).then(
        (text) => text,
        (error) => (getErrnoCode(error) === "EINVAL" ? null : undefined),
      );
      if (linkTarget === undefined)
        return {
          kind: "unresolvable",
        };
      if (linkTarget !== null) {
        if (++linkHopCount > MAX_LINK_HOPS)
          return {
            kind: "unresolvable",
          };
        if (isAbsolute(linkTarget)) {
          let root = parse(linkTarget).root;
          resolved = root;
          mapped.unshift(...splitTarget(linkTarget.slice(root.length)));
        } else {
          resolved = dirname(resolved);
          mapped.unshift(...splitTarget(linkTarget));
        }
        continue;
      }
      let real = await realpath(resolved).catch(() => null);
      if (real === null)
        return {
          kind: "unresolvable",
        };
      resolved = stripTrailingSeparators(normalize(real));
    }
    let currentKey = normalizeDriveLetter(stripTrailingSeparators(resolved));
    if (currentKey === normalizedRoot) {
      let nextSegment = mapped[0];
      if (nextSegment !== undefined && nextSegment.original === null)
        return {
          kind: "inside",
        };
      return {
        kind: "root",
        rootUnder: root + filtered.slice(0, segmentOriginalIndex + 1).join(sep),
      };
    }
    if (currentKey.startsWith(normalizedRoot + sep))
      return {
        kind: "inside",
      };
    let resolvedKey = normalizePathKey(resolved);
    if (resolvedKey === rootPathKey || resolvedKey.startsWith(rootPathKey + sep))
      return {
        kind: "inside",
      };
  }
  return {
    kind: "outside",
    resolved,
  };
}
//@ chunk-5xgkngpb.js:3672288-3672740 placement
/**
 * 移除工作树后注销其在仓库中的登记，仓库不一致时保留登记并记录原因。
 */
async function deregisterRemovedWorktree(root, gitDir, worktreePath, forceTwice) {
  let repoCheck = await isSameRepository(root, gitDir);
  if ("refused" in repoCheck)
    logForDebugging(`Kept worktree registration of ${worktreePath}: ${repoCheck.refused}`, {
      level: "warn",
    });
  let dropResult =
    "refused" in repoCheck
      ? {
          outcome: "kept",
          reason: repoCheck.refused,
        }
      : await deregisterWorktree(
          repoCheck.gitDir,
          {
            worktreePath,
            repoSpelled: root,
          },
          {
            locked: forceTwice === true ? "drop" : "keep",
          },
        );
  return dropResult.outcome === "dropped"
    ? {
        outcome: "removed",
      }
    : dropResult.outcome === "none"
      ? {
          outcome: "unregistered",
          reason: `the drop found no registration of ${worktreePath} in ${gitDir}`,
        }
      : {
          outcome: "kept",
          reason: dropResult.reason,
        };
}
//@ chunk-5xgkngpb.js:3672740-3673646 placement
async function vetWorktreeRegistration(root) {
  let root_2 = root;
  let vetted = await vetWorktree(root, {
    dotGitLink: "vet",
  });
  if ("skipped" in vetted && vetted.skipped === "pointer") {
    let canonicalGitRootUncached = findCanonicalGitRootUncached(root);
    if (canonicalGitRootUncached !== null && canonicalGitRootUncached !== root) {
      root_2 = canonicalGitRootUncached;
      vetted = await vetWorktree(canonicalGitRootUncached, {
        dotGitLink: "vet",
      });
    }
  }
  if ("skipped" in vetted)
    return vetted.skipped === "gone" || vetted.skipped === "not-a-repository"
      ? {
          ok: false,
          outcome: "unlisted",
          reason: vetted.why,
        }
      : {
          ok: false,
          outcome: "kept",
          reason: `the repository's worktree registrations cannot be vetted before git lists them (${vetted.why})`,
        };
  let firstRefusal = vetted.refused.entries().next().value;
  if (firstRefusal !== undefined) {
    let [refusedPath, refusedReason] = firstRefusal;
    return {
      ok: false,
      outcome: "kept",
      reason: `a registered worktree cannot be vetted before git lists them (${vetted.refused.size} refused; ${refusedPath}: ${refusedReason})`,
    };
  }
  let [stats, real] = await Promise.all([
    stat(vetted.gitDir, {
      bigint: true,
    }).catch(() => null),
    realpath(vetted.gitDir).catch(() => null),
  ]);
  if (stats === null)
    return {
      ok: false,
      outcome: "kept",
      reason: `${vetted.gitDir} could not be read after its worktree registrations were checked`,
    };
  return {
    ok: true,
    gitDir: vetted.gitDir,
    root: root_2,
    dev: stats.dev,
    ino: stats.ino,
    real,
  };
}
//@ chunk-5xgkngpb.js:3673646-3674498 placement
/**
 * 在运行 git 前确认仓库的 git 目录与公共目录仍是先前固定的那个（比较 dev/ino 或 realpath），否则拒绝运行。
 */
async function verifyPinnedGitDir(pinned, gitDirsOrPlaceholder) {
  if (gitDirsOrPlaceholder?.gitDir === NOT_A_GIT_REPO_PATH)
    return {
      refused: "unpinned",
      reason: "git was not run: the repository's .git could not be confirmed to lead to its git directory",
    };
  let hasInodeIdentity =
    pinned.dev !== 0n && pinned.ino !== 0n && pinned.ino !== -1n && pinned.ino !== 0xffffffffffffffffn;
  let matchesPinned = async (dirPath) => {
    if (hasInodeIdentity)
      return stat(dirPath, {
        bigint: true,
      }).then(
        (dirStats) => dirStats.dev === pinned.dev && dirStats.ino === pinned.ino,
        () => {
          return;
        },
      );
    let realDir = await realpath(dirPath).catch(() => null);
    return realDir === null || pinned.real === null ? undefined : realDir === pinned.real;
  };
  let [pinnedVerdict, commonVerdict] = await Promise.all([
    matchesPinned(pinned.gitDir),
    gitDirsOrPlaceholder === undefined ? true : matchesPinned(gitDirsOrPlaceholder.commonDir),
  ]);
  if (pinnedVerdict === undefined || commonVerdict === undefined)
    return {
      refused: "changed",
      reason:
        "git was not run: the repository's git directory could not be read right before git would have run",
    };
  if (!pinnedVerdict || !commonVerdict)
    return {
      refused: "changed",
      reason:
        "git was not run: the repository's git directory changed after its worktree registrations were checked",
    };
  return {
    env: getRemoteHostSessionCount(
      {
        GIT_COMMON_DIR: pinned.gitDir,
      },
      {
        repository: gitDirsOrPlaceholder,
      },
    ),
  };
}
//@ chunk-5xgkngpb.js:3674498-3679141 placement
/**
 * 清理与校验 worktree 登记（Windows 设备路径、. 与 .. 组件等）。
 */
async function pruneWorktreeRegistrations(a, b, options = {}) {
  let found = [b, a].find(
    (deviceFormPath) =>
      /^[\\/]{3}/.test(deviceFormPath) ||
      isDeviceNamespacePath_2(deviceFormPath) ||
      hasWin32DevicePrefixSpelling(deviceFormPath),
  );
  if (found !== undefined) {
    let deviceFormReason = `${found} is spelled in a Windows device form (such as \\\\?\\C:\\) or starts with three or more separators, a form git never records a worktree in`;
    logForDebugging(`Kept worktree ${b}: ${deviceFormReason}`, {
      level: "warn",
    });
    return {
      outcome: "kept",
      reason: deviceFormReason,
    };
  }
  let git = gitExe();
  let keep = (reason) => {
    logForDebugging(`Kept worktree ${b}: ${reason}`, {
      level: "warn",
    });
    return {
      outcome: "kept",
      reason,
    };
  };
  let found_2 = [b, a].find(hasDotSegment);
  if (found_2 !== undefined)
    return keep(`${found_2 === b ? "" : "the repository root "}${found_2} holds a "." or ".." component`);
  let realRoot = await realpath(a).catch(() => null);
  let worktreePath = stripTrailingSeparators(normalize(b));
  let rootPath = stripTrailingSeparators(normalize(a));
  let realRootPath = realRoot === null ? null : stripTrailingSeparators(normalize(realRoot));
  let pathPrefixRoot = normalizeDriveLetter(worktreePath).startsWith(normalizeDriveLetter(rootPath) + sep)
    ? rootPath
    : undefined;
  let caseFoldRoot =
    pathPrefixRoot !== undefined
      ? undefined
      : [rootPath, ...(realRootPath === null || realRootPath === rootPath ? [] : [realRootPath])].find(
          (candidateRoot) =>
            !normalizeDriveLetter(worktreePath).startsWith(normalizeDriveLetter(candidateRoot) + sep) &&
            normalizePathKey(worktreePath).startsWith(normalizePathKey(candidateRoot) + sep),
        );
  if (caseFoldRoot !== undefined)
    return keep(
      `${b} begins with the repository root ${caseFoldRoot} spelled in a different case or Unicode form`,
    );
  let resolvedParent = null;
  if (pathPrefixRoot === undefined && realRootPath !== null && isAbsolute(worktreePath)) {
    let pathThroughLinks = await resolvePathThroughLinks(dirname(worktreePath), realRootPath);
    switch (pathThroughLinks.kind) {
      case "root":
        pathPrefixRoot = pathThroughLinks.rootUnder;
        break;
      case "inside":
        return keep(`${b} is spelled outside the repository root but resolves through or under it`);
      case "outside":
        resolvedParent = pathThroughLinks.resolved;
        break;
      case "unresolvable":
        resolvedParent = null;
        break;
    }
  }
  let removablePath;
  let gitPathArg;
  let pinned = await vetWorktreeRegistration(a);
  if (!pinned.ok) {
    if (pinned.outcome === "kept") return keep(pinned.reason);
    logForDebugging(`Worktree ${b} not listed: ${pinned.reason}`, {
      level: "warn",
    });
    return {
      outcome: "unlisted",
      reason: pinned.reason,
    };
  }
  let repositoryCheck = await isSameRepository(pinned.root, pinned.gitDir);
  if ("refused" in repositoryCheck) return keep(repositoryCheck.refused);
  let runGitPinned = async (args) => {
    let pinnedDir = await verifyPinnedGitDir(
      pinned,
      options.pinRepository ? resolveGitDirsOrPlaceholder(a) : undefined,
    );
    return "refused" in pinnedDir
      ? pinnedDir
      : execFileNoThrowWithCwd(git, [...GIT_SAFE_GLOBAL_ARGS, ...args], {
          cwd: a,
          env: pinnedDir.env,
        });
  };
  let gitDirArgs = ["--git-dir", pinned.gitDir];
  let listResult = (await gitSupportsPartialCloneFetch(a))
    ? await runGitPinned([...gitDirArgs, "worktree", "list", "--porcelain", "-z"])
    : null;
  if (listResult !== null && "refused" in listResult) {
    if (listResult.refused === "unpinned") {
      logForDebugging(`Worktree ${b} not listed: ${listResult.reason}`, {
        level: "warn",
      });
      return {
        outcome: "unlisted",
        reason: listResult.reason,
      };
    }
    return keep(listResult.reason);
  }
  let listOutput = listResult;
  if (listOutput !== null && listOutput.code === 0) {
    if (!hasDistinctWorktreePaths(listOutput.stdout))
      return keep(
        "git's worktree list holds a record git would not write (a path listed twice, or a spelling that is not absolute and plain)",
      );
    let paths = [
      worktreePath,
      ...(pathPrefixRoot === undefined && resolvedParent !== null
        ? [join(resolvedParent, basename(worktreePath))]
        : pathPrefixRoot !== undefined && realRoot !== null
          ? [stripTrailingSeparators(realRoot) + worktreePath.slice(pathPrefixRoot.length)]
          : []),
    ].filter((path, index, paths) => paths.indexOf(path) === index);
    let worktreeMatchingPaths = findWorktreeMatchingPaths(listOutput.stdout, paths);
    if (worktreeMatchingPaths === null) {
      let linkVerdict = await symlinkVerdictForPath(
        worktreePath,
        pathPrefixRoot === undefined ? a : worktreePath.slice(0, pathPrefixRoot.length),
      );
      if (linkVerdict === "link" || linkVerdict === "unknown")
        return keep(
          `git lists no worktree at ${paths.join(" or ")}, and the path has a link in a component, or one that cannot be probed`,
        );
      let unlistedReason = `git lists no worktree at ${paths.join(" or ")}`;
      logForDebugging(`Unregistered worktree ${b}: ${unlistedReason}`, {
        level: "warn",
      });
      return {
        outcome: "unregistered",
        reason: unlistedReason,
      };
    }
    if (findSamePath(worktreeMatchingPaths, [a, ...(realRoot === null ? [] : [realRoot])]) !== null)
      return keep(`${worktreeMatchingPaths} names the main worktree`);
    if (isOnForeignMount(worktreeMatchingPaths, a))
      return keep(`${worktreeMatchingPaths} is on another host`);
    let matchVerdict = await symlinkVerdictForPath(worktreeMatchingPaths, a);
    if (matchVerdict === "missing")
      return deregisterRemovedWorktree(pinned.root, pinned.gitDir, worktreeMatchingPaths, options.forceTwice);
    if (matchVerdict !== "clear")
      return keep(`${worktreeMatchingPaths} has a link in a component, or one that cannot be probed`);
    let realMatch = await realpath(worktreeMatchingPaths).catch(() => null);
    if (realMatch === null) return keep(`${worktreeMatchingPaths} does not resolve`);
    if (realRoot !== null && stripTrailingSeparators(realMatch) === stripTrailingSeparators(realRoot))
      return keep(`${worktreeMatchingPaths} resolves to the main worktree`);
    if (!(await isRemovableWorktreeDir(worktreeMatchingPaths, realMatch, a)))
      return keep(`${worktreeMatchingPaths} is not intact (a link may have been introduced)`);
    removablePath = worktreeMatchingPaths;
    gitPathArg = toForwardSlashesOnWindows(worktreeMatchingPaths);
  } else if (listOutput !== null) {
    let listErrorReason = `could not read git's worktree list: ${listOutput.stderr.trim()}`;
    logForDebugging(`Worktree ${b} not listed: ${listErrorReason}`, {
      level: "warn",
    });
    return {
      outcome: "unlisted",
      reason: listErrorReason,
    };
  } else {
    if (findSamePath(b, [a, ...(realRoot === null ? [] : [realRoot])]) !== null)
      return keep(`${b} names the main worktree`);
    let candidatePath;
    let candidateAnchor;
    if (pathPrefixRoot !== undefined && pathPrefixRoot === rootPath) {
      candidatePath = worktreePath;
      candidateAnchor = worktreePath.slice(0, pathPrefixRoot.length);
    } else if (pathPrefixRoot !== undefined && realRoot !== null) {
      candidateAnchor = stripTrailingSeparators(realRoot);
      candidatePath = candidateAnchor + worktreePath.slice(pathPrefixRoot.length);
    } else {
      if (resolvedParent === null) return keep(`${b}'s parent does not resolve`);
      candidatePath = join(resolvedParent, basename(worktreePath));
      candidateAnchor = resolvedParent;
    }
    let candidateVerdict = await symlinkVerdictForPath(candidatePath, candidateAnchor);
    if (candidateVerdict === "missing")
      return deregisterRemovedWorktree(pinned.root, pinned.gitDir, candidatePath, options.forceTwice);
    if (candidateVerdict !== "clear") return keep(`${candidatePath} is a link, or cannot be probed`);
    let candidateReal = await realpath(candidatePath).catch(() => null);
    if (
      candidateReal !== null &&
      realRoot !== null &&
      stripTrailingSeparators(candidateReal) === stripTrailingSeparators(realRoot)
    )
      return keep(`${candidatePath} resolves to the main worktree`);
    if (
      candidateReal === null ||
      !(await isRemovableWorktreeDir(candidatePath, candidateReal, candidateAnchor))
    )
      return keep(`${candidatePath} is not intact`);
    removablePath = candidatePath;
    gitPathArg = candidatePath;
  }
  if (!(await clearReparsePoints(removablePath)))
    return keep(`${removablePath} holds a reparse point that could not be removed`);
  let removal = await removeWorktreeSafely(a, removablePath, {
    forceTwice: options.forceTwice === true,
    git: {
      dir: repositoryCheck.gitDir,
      root: pinned.root,
    },
    deregisterIfStopped: options.deregisterIfStopped === true,
  });
  if (removal.outcome === "removed")
    return {
      outcome: "removed",
    };
  if (removal.outcome === "not_registered" || removal.outcome === "refused")
    return keep(worktreeRemovalText(removal));
  if (removal.outcome !== "unanchored")
    return {
      outcome: "failed",
      stderr: worktreeRemovalText(removal),
      checkout: removal.outcome,
    };
  let forceResult = await runGitPinned([
    ...gitDirArgs,
    "worktree",
    "remove",
    "--force",
    ...(options.forceTwice ? ["--force"] : []),
    gitPathArg,
  ]);
  if ("refused" in forceResult) return keep(forceResult.reason);
  return forceResult.code === 0
    ? {
        outcome: "removed",
      }
    : {
        outcome: "failed",
        stderr: forceResult.stderr,
      };
}
//@ chunk-5xgkngpb.js:3679141-3679157 placement
var partialCloneFetchCache; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3679141", () => {
  partialCloneFetchCache = new Map();
});
export {
  isWorktreeMadeElsewhereStub,
  vetWorktreeRegistration,
  verifyPinnedGitDir,
  stripProgressLines,
  micromatch,
  pruneWorktreeRegistrations,
  installRepoDetectionGuards,
  partialCloneFetchCache,
};
