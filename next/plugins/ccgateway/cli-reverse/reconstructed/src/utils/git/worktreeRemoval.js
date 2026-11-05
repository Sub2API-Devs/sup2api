/**
 * utils/git/worktreeRemoval.ts
 *
 * 2.1.316 新增：安全删除 worktree
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b2dh3swb.js (35)
 * attribution: placement 29, layout 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, normalize, dirname, basename, parse, sep, isAbsolute, resolve } from "path";
import { rm, realpath, lstat, access, readlink } from "fs/promises";
import { constants } from "fs";
import { randomBytes } from "crypto";
import {
  safeListRegistrations,
  deregisterWorktree,
  loadNativeFsHelpers,
  getFileIdentity,
  removeAdminFiles,
  readOnlyOpenFlags,
  WORKTREE_IO_LIMITS_2,
  WORKTREE_IO_LIMITS,
} from "./worktreeRegistrations.js";
import {
  isENOENT,
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { logForDebugging } from "../debug.js";
import { getPlatform } from "../platform.js";
import {
  stripTrailingSeparators,
  foldCaseBasic,
  normalizeCaseForPlatform as normalizeCaseForPlatform_2,
  containsSamePath,
} from "../pathIdentity.js";
import { vetWorktree, isSameRepository } from "./worktreeVetting.js";
import { findCanonicalGitRootUncached } from "../git.js";
import { refreshGitDir } from "./gitFilesystem.js";
import { isSentinelInode } from "../slowOperations.js";

//@ chunk-b2dh3swb.js:25085-27973 placement
/**
 * 安全删除 git worktree：校验目录、注销记录、处理锁定与二次强制，不跟随符号链接。
 */
async function removeWorktreeSafely(
  repoRoot,
  worktreePath,
  {
    forceTwice = false,
    git: gitInfo,
    trustedRoot,
    resolveAboveParent = false,
    deregisterIfStopped = false,
    pointerFirst = false,
  } = {},
) {
  let located = await locateUnderRepoRoots(
    trustedRoot === undefined ? [repoRoot] : [repoRoot, trustedRoot],
    worktreePath,
    {
      parentLinkToRoot: resolveAboveParent,
    },
  );
  if (located === null)
    return {
      outcome: "refused",
      reason: `${worktreePath} has no parent directory`,
    };
  if ("refused" in located)
    return {
      outcome: "refused",
      reason: located.refused,
    };
  let { base, rel, underRoot } = located;
  let worktreeDir = gitInfo ?? (await inspectWorktreeDir(repoRoot));
  if ("why" in worktreeDir)
    return {
      outcome: "refused",
      reason: `the repository's git directory failed its safety checks (${worktreeDir.why})`,
    };
  let dir = worktreeDir.dir;
  let worktreeBase = await resolveWorktreeBase(
    base,
    underRoot ? "root" : resolveAboveParent ? "not_a_link" : "canonical",
  );
  if (!("held" in worktreeBase))
    return worktreeBase.outcome === "unanchored"
      ? worktreeBase
      : {
          outcome: "refused",
          reason: worktreeBase.reason,
        };
  let { held, realBase } = worktreeBase;
  try {
    let isDir = await held.lstat(rel).then(
      (relStats) => relStats.isDirectory(),
      () => false,
    );
    if (
      isDir &&
      (await held.list(rel).then(
        () => false,
        (error) => isListUnsupportedError(error),
      ))
    )
      return {
        outcome: "unanchored",
        reason: "no_descriptor_listing",
      };
    let worktreePath_2 =
      underRoot || resolveAboveParent ? [worktreePath, join(realBase, ...rel.split("/"))] : [worktreePath];
    let registration = await safeListRegistrations(dir, {
      worktreePath: worktreePath_2,
      repoSpelled: worktreeDir.root,
    });
    if (isDir && registration !== null && !("unavailable" in registration)) {
      let registeredWorktreeName = await readRegisteredWorktreeName(
        held,
        rel,
        [worktreePath, join(realBase, ...rel.split("/"))],
        repoRoot,
        dir,
      );
      if (registeredWorktreeName !== null && registeredWorktreeName !== registration.entryId) {
        let byNameRegistration = await safeListRegistrations(dir, {
          entryId: registeredWorktreeName,
          worktreePath: worktreePath_2,
          repoSpelled: worktreeDir.root,
        });
        if (byNameRegistration !== null && !("unavailable" in byNameRegistration))
          registration = byNameRegistration;
      }
    }
    if (registration !== null && "unavailable" in registration)
      return {
        outcome: "refused",
        reason: `git's records of worktrees in ${dir} could not be checked safely (${registration.unavailable})`,
      };
    if (registration === null)
      return {
        outcome: "not_registered",
      };
    if (
      !underRoot &&
      !isOneOfSamePaths(
        registration.recordedGitdir,
        [worktreePath, join(realBase, ...rel.split("/"))].map((candidatePath) =>
          join(normalize(candidatePath), ".git"),
        ),
      )
    )
      return {
        outcome: "refused",
        reason: `the folder holding ${worktreePath} resolved to a different place while it was being checked (a link may have been swapped in)`,
      };
    if (registration.locked && !forceTwice)
      return {
        outcome: "locked",
      };
    let lockAction = forceTwice ? "drop" : "keep";
    let relStatsResult = await held.lstat(rel).then(
      (stats) => stats,
      (error) => ({
        error,
      }),
    );
    if (
      "error" in relStatsResult &&
      isENOENT(relStatsResult.error) &&
      (await held.lstat(dirnameOrEmpty(rel)).then(
        (parentStats) => parentStats.isDirectory(),
        () => false,
      ))
    )
      return dropRegistrationAfter(
        worktreePath,
        await deregisterWorktree(
          dir,
          {
            entryId: registration.entryId,
            repoSpelled: worktreeDir.root,
          },
          {
            locked: lockAction,
          },
        ),
        dir,
        registration.entryId,
      );
    if ("error" in relStatsResult || !relStatsResult.isDirectory())
      return {
        outcome: "refused",
        reason:
          "error" in relStatsResult && isENOENT(relStatsResult.error)
            ? `the directory holding ${worktreePath} is missing`
            : `${worktreePath} is not a directory reachable without a link (${"error" in relStatsResult ? (getErrnoCode(relStatsResult.error) ?? "unknown error") : "not a directory"})`,
      };
    let smallFile = await readSmallFile(held, `${rel}/.git`);
    if ("error" in smallFile)
      return {
        outcome: "refused",
        reason: `the .git file in ${worktreePath} could not be read (${smallFile.error})`,
      };
    if (
      smallFile.value === null ||
      !(await isRegisteredWorktreeGitdir(
        smallFile.value,
        [worktreePath, join(realBase, ...rel.split("/"))],
        repoRoot,
        dir,
        registration.entryId,
      ))
    )
      return {
        outcome: "not_pointing_back",
      };
    let adminDirStats = deregisterIfStopped ? await statWorktreeAdminDir(dir, registration.entryId) : null;
    let adminDirIdentity = typeof adminDirStats === "object" ? adminDirStats : null;
    let removalState = {
      deleted: false,
    };
    try {
      await removeWorktreeContents(held, rel, smallFile.bytes, removalState, {
        pointerFirst,
      });
    } catch (error) {
      if (!removalState.deleted && isListUnsupportedError(error))
        return {
          outcome: "unanchored",
          reason: "no_descriptor_listing",
        };
      let reason = describeRemovalError(error);
      logForDebugging(`Worktree checkout ${worktreePath} not fully deleted: ${errorMessage(error)}`, {
        level: "warn",
      });
      let deregistered =
        adminDirIdentity !== null &&
        removalState.deleted &&
        (await removeHeldWorktree(dir, registration.entryId, adminDirIdentity, lockAction));
      return {
        outcome: "delete_failed",
        reason,
        started: removalState.deleted,
        deregistered,
      };
    }
    return dropRegistrationAfter(
      worktreePath,
      await deregisterWorktree(
        dir,
        {
          entryId: registration.entryId,
          repoSpelled: worktreeDir.root,
        },
        {
          locked: lockAction,
        },
      ),
      dir,
      registration.entryId,
    );
  } finally {
    await held.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:27973-28767 placement
async function vetWorktreeForRemoval(dirPath, zipPath, { rootIsCanonical = false } = {}) {
  let located =
    zipPath === undefined ? splitParentAndName(dirPath) : await locateUnderRepoRoots([zipPath], dirPath);
  if (located === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${dirPath} has no parent directory`,
      "the path to delete has no parent directory",
    );
  if ("refused" in located)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      located.refused,
      "the path to delete reaches its root by a spelling that cannot be checked safely",
    );
  let worktreeBase = await resolveWorktreeBase(
    located.base,
    zipPath === undefined || !located.underRoot ? "not_a_link" : rootIsCanonical ? "canonical" : "root",
  );
  if (!("held" in worktreeBase)) {
    if (worktreeBase.outcome === "unanchored")
      return {
        unanchored: worktreeBase.reason,
      };
    if (worktreeBase.absent === true) return "absent";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `could not open the directory above ${dirPath}: ${worktreeBase.reason}`,
      "the directory above the path to delete could not be opened",
    );
  }
  try {
    return (await unlinkTracked(worktreeBase.held, located.rel)) ? "deleted" : "absent";
  } catch (error) {
    if (isListUnsupportedError(error))
      return {
        unanchored: "no_descriptor_listing",
      };
    throw error;
  } finally {
    await worktreeBase.held.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:28767-28869 placement (2.1.88 match: convertDirectoryToZipInPlace, 1)
async function convertDirectoryToZipInPlace(dirPath, zipPath, zipData = {}) {
  if (typeof (await vetWorktreeForRemoval(dirPath, zipPath, zipData)) === "object")
    await rm(dirPath, {
      recursive: true,
      force: true,
    });
}
//@ chunk-b2dh3swb.js:28869-30425 placement
function worktreeRemovalText(result) {
  switch (result.outcome) {
    case "removed":
      return "removed";
    case "not_registered":
      return "git has no usable record of a worktree at this path; nothing was deleted";
    case "locked":
      return "the worktree is locked (by `git worktree lock`); nothing was deleted. `git worktree unlock <path>` unlocks it";
    case "not_pointing_back":
      return "the worktree's .git file is missing or does not point to git's record of it; nothing was deleted";
    case "refused":
      return `${result.reason}; nothing was deleted`;
    case "delete_failed":
      if (result.reason === FILES_KEPT_APPEARING_REASON)
        return `${FILES_KEPT_APPEARING_REASON}; try removing it again once nothing is writing to it`;
      if (result.reason === "WORKING_NAME_NOT_PLAIN")
        return "it holds a file name that Windows cannot delete this way; some of its other files may already be deleted";
      if (result.reason === "ENOTEMPTY")
        return "a folder in it could not be emptied: it may be unreadable, or something may still be writing to it; check its permissions and try removing it again";
      if (result.reason === "WORKING_FILE_HELD")
        return "a program has one of its files open; try removing it again once that program closes it";
      return result.reason === "EBUSY"
        ? "some of its files could not be deleted: EBUSY; a program may have them open, so try removing it again"
        : `some of its files could not be deleted: ${result.reason}`;
    case "registration_kept":
      return `its files were deleted, but git still lists it (${result.reason})`;
    case "unanchored":
      return result.reason === "no_descriptor_listing"
        ? "this machine cannot list a folder it holds open, so it cannot delete it without following links"
        : `this machine cannot open folders without following links (${result.reason})`;
  }
}
//@ chunk-b2dh3swb.js:30425-30498 placement
var FILES_KEPT_APPEARING_REASON = "files kept appearing in the worktree while it was being deleted";
//@ chunk-b2dh3swb.js:30498-30554 placement
function isListUnsupportedError(error) {
  return getErrnoCode(error) === "WORKING_LIST_UNSUPPORTED";
}
//@ chunk-b2dh3swb.js:30554-30625 placement
function dirnameOrEmpty(relPath) {
  return relPath.includes("/") ? relPath.slice(0, relPath.lastIndexOf("/")) : "";
}
//@ chunk-b2dh3swb.js:30625-32547 placement
async function resolveWorktreeBase(filePath, mode, { holdBase = false } = {}) {
  let refuse = (reason, absent = false) => ({
    outcome: "refused",
    reason,
    absent,
  });
  let realBase = await (async () => {
    if (mode === "root") return realpath(filePath);
    let respelledBase = join(await realpath(dirname(filePath)), basename(filePath));
    return mode === "not_a_link" && getPlatform() !== "windows" && (await isRootOwnedLinkChain(respelledBase))
      ? realpath(respelledBase)
      : respelledBase;
  })().catch((error) => (isENOENT(error) ? undefined : getErrnoCode(error) === "ELOOP" ? "link" : null));
  if (realBase === "link")
    return refuse(`${filePath} is a link, or its spelling differs from the one on disk`);
  if (realBase === undefined || realBase === null)
    return refuse(`${filePath} does not exist or cannot be read`, realBase === undefined);
  if (mode === "canonical" && !samePathKey(realBase, filePath))
    return refuse(
      `${filePath} is reached through a link, or its spelling differs from the one on disk (it resolves to ${realBase})`,
    );
  let root = parse(realBase).root;
  let isWindows = getPlatform() === "windows" || holdBase ? realBase : await walkPathComponents(realBase);
  if (isWindows === null) return refuse(`a directory above ${filePath} cannot be read`);
  let modules = await loadNativeFsHelpers().catch((error) => ({
    failed: errorMessage(error),
  }));
  if ("failed" in modules) return refuse(`${filePath} could not be opened safely (${modules.failed})`);
  let { tree, host } = modules;
  let treeRoot = await tree
    .openTreeAnchor(host, {
      gitRoot: isWindows,
      realRoot: isWindows,
    })
    .catch((error) => ({
      failed: errorMessage(error),
      code: getErrnoCode(error),
    }));
  if ("failed" in treeRoot) {
    let isRespelled = isWindows === realBase;
    return isRespelled && treeRoot.code === "ENOENT"
      ? refuse(`${filePath} does not exist`, true)
      : isRespelled && (treeRoot.code === "ELOOP" || treeRoot.code === "ENOTDIR")
        ? refuse(`${filePath} is a link, or changed while it was being opened`)
        : isRespelled && treeRoot.code === "WORKING_ROOT_NOT_CANONICAL"
          ? refuse(`${filePath} is reached through a link, or its spelling differs from the one on disk`)
          : refuse(`${filePath} could not be opened safely (${treeRoot.failed})`);
  }
  if ("unavailable" in treeRoot) {
    let unavailableReason = tree.getUnavailableReason(
      await tree.checkAnchoring(root, {
        host,
      }),
    );
    let sameVolumeRoot =
      unavailableReason === "no_ffi" ||
      (unavailableReason === "remote_volume" &&
        (mode !== "not_a_link" || (await isSameVolumeRoot(filePath, root))));
    return unavailableReason !== null && (getPlatform() !== "windows" || sameVolumeRoot)
      ? {
          outcome: "unanchored",
          reason: unavailableReason,
        }
      : refuse(`${filePath} could not be opened safely (${treeRoot.unavailable})`);
  }
  let relUnderBase =
    isWindows === realBase
      ? ""
      : realBase.slice(stripTrailingSeparators(isWindows).length).split(sep).filter(Boolean).join("/");
  let baseFs = scopedFs(treeRoot, relUnderBase);
  let baseStats = await baseFs.lstat("").then(
    (stats) => stats,
    (error) => ({
      error,
    }),
  );
  if ("error" in baseStats || !baseStats.isDirectory()) {
    await treeRoot.close().catch(() => {});
    return "error" in baseStats && isENOENT(baseStats.error)
      ? refuse(`${filePath} does not exist`, true)
      : refuse(`${filePath} is a link, or changed while it was being opened`);
  }
  return {
    held: baseFs,
    realBase,
  };
}
//@ chunk-b2dh3swb.js:32547-32875 placement
async function walkPathComponents(filePath) {
  let root = parse(filePath).root;
  let filtered = filePath.slice(root.length).split(sep).filter(Boolean);
  let ownerRoot = root;
  let currentPath = root;
  let hasUnwritableAncestor = false;
  for (let segment of filtered) {
    let canRead = await probeAccess(currentPath, constants.R_OK);
    let canWrite = await probeAccess(currentPath, constants.W_OK);
    if (canRead === null || canWrite === null) return null;
    if (!canRead) {
      let uid = await lstat(currentPath).then(
        (stats) => stats.uid,
        () => null,
      );
      if (uid === null || uid === process.getuid?.() || canWrite || hasUnwritableAncestor) return null;
      ownerRoot = join(currentPath, segment);
    }
    hasUnwritableAncestor ||= canWrite;
    currentPath = join(currentPath, segment);
  }
  return ownerRoot;
}
//@ chunk-b2dh3swb.js:32875-32986 placement
async function isSameVolumeRoot(filePath, root) {
  let realRoot = await realpath(parse(filePath).root).catch(() => null);
  return (
    realRoot !== null &&
    foldCaseBasic(stripTrailingSeparators(parse(realRoot).root)) ===
      foldCaseBasic(stripTrailingSeparators(root))
  );
}
//@ chunk-b2dh3swb.js:32986-33096 placement
async function probeAccess(path, mode) {
  return access(path, mode).then(
    () => true,
    (error) => (["EACCES", "EPERM", "EROFS"].includes(getErrnoCode(error) ?? "") ? false : null),
  );
}
//@ chunk-b2dh3swb.js:33096-33316 placement
async function isRootOwnedLinkChain(filePath) {
  let stats = await lstat(filePath).catch(() => null);
  if (stats === null || !stats.isSymbolicLink()) return false;
  for (let ancestorPath = dirname(filePath); ; ancestorPath = dirname(ancestorPath)) {
    if (
      (await lstat(ancestorPath).then(
        (uid) => uid.uid,
        () => null,
      )) !== 0 ||
      (await probeAccess(ancestorPath, constants.W_OK)) !== false
    )
      return false;
    if (dirname(ancestorPath) === ancestorPath) return true;
  }
}
//@ chunk-b2dh3swb.js:33316-33682 placement
function scopedFs(fs, prefix) {
  let withPrefix = (relPath) => (prefix === "" ? relPath : relPath === "" ? prefix : `${prefix}/${relPath}`);
  return {
    lstat: (path) => fs.lstat(withPrefix(path)),
    list: (path, limit) => fs.list(withPrefix(path), limit),
    unlink: (path) => fs.unlink(withPrefix(path)),
    rmdir: (path) => fs.rmdir(withPrefix(path)),
    rename: (fromPath, toPath) => fs.rename(withPrefix(fromPath), withPrefix(toPath)),
    removeTree: (path, options) => fs.removeTree(withPrefix(path), options),
    open: (path, flags) => fs.open(withPrefix(path), flags),
    create: (path, data, options) => fs.create(withPrefix(path), data, options),
    close: () => fs.close(),
    anchorBeneath: (path) => fs.anchorBeneath(withPrefix(path)),
  };
}
//@ chunk-b2dh3swb.js:33682-34641 placement
async function inspectWorktreeDir(startPath) {
  let rootPath = startPath;
  let vetResult = await vetWorktree(startPath, {
    dotGitLink: "vet",
  });
  if ("skipped" in vetResult && vetResult.skipped === "pointer") {
    let canonicalGitRootUncached = findCanonicalGitRootUncached(startPath);
    if (canonicalGitRootUncached !== null && canonicalGitRootUncached !== startPath) {
      rootPath = canonicalGitRootUncached;
      vetResult = await vetWorktree(canonicalGitRootUncached, {
        dotGitLink: "vet",
      });
    } else {
      let gitDir = await refreshGitDir(startPath);
      if (gitDir === null)
        return {
          why: "its .git file names no usable git directory",
        };
      if ("refused" in (await isSameRepository(startPath, gitDir)))
        return {
          why: `its .git file names ${gitDir}, which is inside the working tree, or could not be checked against it`,
        };
      let [realGitDir, realRoot] = await Promise.all(
        [gitDir, startPath].map((path) => realpath(path).catch(() => null)),
      );
      if (realGitDir == null || realRoot == null)
        return {
          why:
            realGitDir == null
              ? `its .git file names ${gitDir}, which does not exist or cannot be resolved`
              : "the repository root cannot be resolved",
        };
      if (isPathAtOrUnder(normalizeCaseForPlatform_2(realGitDir), normalizeCaseForPlatform_2(realRoot)))
        return {
          why: `its .git file names ${gitDir}, which resolves into the working tree`,
        };
      return (await lstat(join(realGitDir, "commondir")).then(
        () => false,
        (error) => isENOENT(error),
      ))
        ? {
            dir: realGitDir,
            root: startPath,
          }
        : {
            why: "its .git file names another worktree",
          };
    }
  }
  if ("skipped" in vetResult)
    return {
      why: vetResult.why,
    };
  let sameRepo = await isSameRepository(rootPath, vetResult.gitDir);
  return "refused" in sameRepo
    ? {
        why: sameRepo.refused,
      }
    : {
        dir: sameRepo.gitDir,
        root: rootPath,
      };
}
//@ chunk-b2dh3swb.js:34641-34710 placement
async function fileIdentityOrFalse(held, relPath, identity) {
  return held.lstat(relPath).then(
    (stats) => getFileIdentity(stats, identity),
    () => false,
  );
}
//@ chunk-b2dh3swb.js:34710-34872 placement
async function hasGitDirOwnFiles(held, relDir) {
  for (let entryName of ["objects", "config", "packed-refs", "hooks", "worktrees"])
    if (
      await held.lstat(`${relDir}/${entryName}`).then(
        () => true,
        (error) => !isENOENT(error),
      )
    )
      return true;
  return false;
}
//@ chunk-b2dh3swb.js:34872-36944 placement
async function removeHeldWorktree(dir, entryId, identity, lockAction) {
  let worktreeBase = await resolveWorktreeBase(dir, "canonical", {
    holdBase: true,
  });
  if (!("held" in worktreeBase)) {
    logForDebugging(`Kept the registration ${entryId} in ${dir}: ${worktreeBase.reason}`, {
      level: "warn",
    });
    return false;
  }
  try {
    let entryRel = `worktrees/${entryId}`;
    if (!(await fileIdentityOrFalse(worktreeBase.held, entryRel, identity)))
      throw Error(
        "its folder changed after it was checked, or this volume cannot show it is the same folder",
      );
    if (
      lockAction === "keep" &&
      (await worktreeBase.held.lstat(`worktrees/${entryId}/locked`).then(
        () => true,
        (error) => !isENOENT(error),
      ))
    )
      throw Error("it was locked while the checkout was being deleted");
    let hasOwnFiles = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${entryRel} has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them, so nothing in it was removed`,
      "the registration entry has a git directory's own files in it, or could not be checked for them",
    );
    if (await hasGitDirOwnFiles(worktreeBase.held, entryRel)) throw hasOwnFiles;
    await worktreeBase.held.unlink(`${entryRel}/gitdir`).catch((error) => {
      if (!isENOENT(error)) throw error;
    });
    if (await hasGitDirOwnFiles(worktreeBase.held, entryRel)) {
      logForDebugging(
        `Dropped the registration ${entryRel} in ${dir} (git no longer lists it) but left its folder, which now has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them. git's next \`git worktree prune\` or \`git gc\` deletes that folder whole; move out anything you need first.`,
        {
          level: "warn",
        },
      );
      return false;
    }
    await removeAdminFiles(worktreeBase.held, entryRel, identity);
    if (
      await worktreeBase.held.rmdir(entryRel).then(
        () => true,
        (error) => isENOENT(error),
      )
    )
      return true;
    if (!(await fileIdentityOrFalse(worktreeBase.held, entryRel, identity))) {
      logForDebugging(
        `Dropped the registration ${entryRel} in ${dir} (git no longer lists it) but left its folder: it changed while it was being emptied`,
        {
          level: "warn",
        },
      );
      return false;
    }
    let movedDirName = `${entryRel}.claude-dropped-${randomBytes(4).toString("hex")}`;
    return await worktreeBase.held.rename(entryRel, movedDirName).then(
      () => {
        logForDebugging(
          `Dropped the registration ${entryRel} in ${dir}; its folder held files Claude Code does not delete (such as a submodule's git directory), so it was moved to ${movedDirName}; git worktree prune removes it`,
          {
            level: "warn",
          },
        );
        return true;
      },
      (error) => {
        logForDebugging(
          `Dropped the registration ${entryRel} in ${dir} (git no longer lists it) but could not move its folder aside (${errorMessage(error)}); git worktree prune removes it`,
          {
            level: "warn",
          },
        );
        return false;
      },
    );
  } catch (error) {
    logForDebugging(`Kept the registration ${entryId} in ${dir}: ${errorMessage(error)}`, {
      level: "warn",
    });
    return false;
  } finally {
    await worktreeBase.held.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:36944-37291 placement
async function dropRegistrationAfter(worktreePath, deregisterResult, repoRoot, entryId) {
  let adminPath = join(repoRoot, "worktrees", entryId);
  if (
    deregisterResult.outcome === "dropped" ||
    (deregisterResult.outcome === "none" && (await statWorktreeAdminDir(repoRoot, entryId)) === "absent")
  )
    return {
      outcome: "removed",
    };
  let keepReason =
    deregisterResult.outcome === "kept"
      ? deregisterResult.reason
      : `git's record of it at ${adminPath} could not be read`;
  logForDebugging(`Worktree ${worktreePath} is gone but git still lists it: ${keepReason}`, {
    level: "warn",
  });
  return {
    outcome: "registration_kept",
    reason: keepReason,
  };
}
//@ chunk-b2dh3swb.js:37291-37538 placement
async function statWorktreeAdminDir(repoRoot, entryId) {
  let worktreeBase = await resolveWorktreeBase(repoRoot, "canonical", {
    holdBase: true,
  });
  if (!("held" in worktreeBase)) return null;
  try {
    return await worktreeBase.held.lstat(`worktrees/${entryId}`).then(
      (stats) => ({
        dev: stats.dev,
        ino: stats.ino,
      }),
      (error) => (isENOENT(error) ? "absent" : null),
    );
  } finally {
    await worktreeBase.held.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:37538-37635 placement
function describeRemovalError(error) {
  return getErrnoCode(error) === "ENOTEMPTY" && !("syscall" in Object(error))
    ? errorMessage(error)
    : (getErrnoCode(error) ?? "an unknown error");
}
//@ chunk-b2dh3swb.js:37635-37673 placement
function samePathKey(left, right) {
  return normalizeCaseForPlatform(left) === normalizeCaseForPlatform(right);
}
//@ chunk-b2dh3swb.js:37673-37718 placement
function isOneOfSamePaths(path, paths) {
  return containsSamePath(normalizeCaseForPlatform(path), paths.map(normalizeCaseForPlatform));
}
//@ chunk-b2dh3swb.js:37718-37804 placement
function normalizeCaseForPlatform(path) {
  return getPlatform() === "windows"
    ? path.replace(/^[a-z](?=:)/, (driveLetter) => driveLetter.toUpperCase())
    : path;
}
//@ chunk-b2dh3swb.js:37804-37879 layout
function isUnderPathWithSeparator(path, parentPath) {
  return (
    path.length > parentPath.length + 1 && samePathKey(path.slice(0, parentPath.length + 1), parentPath + sep)
  );
}
//@ chunk-b2dh3swb.js:37879-37944 layout
function isPathAtOrUnder(path, parentPath) {
  return path === parentPath || path.startsWith(parentPath.endsWith(sep) ? parentPath : parentPath + sep);
}
//@ chunk-b2dh3swb.js:37944-38224 layout (2.1.88 match: getFileIdentity, 1)
async function getFileIdentity_2(pathA, pathB) {
  let [statsA, statsB, parentStatsB] = await Promise.all([
    lstat(pathA, {
      bigint: true,
    }).catch(() => null),
    lstat(pathB, {
      bigint: true,
    }).catch(() => null),
    lstat(dirname(pathB), {
      bigint: true,
    }).catch(() => null),
  ]);
  return (
    statsA !== null &&
    statsB !== null &&
    parentStatsB !== null &&
    statsA.dev !== 0n &&
    !isSentinelInode(statsA.ino) &&
    statsA.dev === statsB.dev &&
    statsA.ino === statsB.ino &&
    !(parentStatsB.dev === statsB.dev && parentStatsB.ino === statsB.ino)
  );
}
//@ chunk-b2dh3swb.js:38224-39569 layout
/**
 * 把目标路径与仓库根（含真实路径）比较，返回 {base, rel, underRoot}；只在大小写/Unicode 形式上不同时， 非 Windows 且同一文件则接受，否则拒绝并说明。
 */
async function locateUnderRepoRoots(rootPaths, dirPath, { parentLinkToRoot = false } = {}) {
  let spelledDir = stripTrailingSeparators(normalize(dirPath));
  let relFrom = (path, rootPath) =>
    path
      .slice(rootPath.length + 1)
      .split(sep)
      .join("/");
  let spellings = [];
  let realRoots = [];
  for (let rootPath of rootPaths) {
    let realRoot = await realpath(rootPath).catch(() => null);
    spellings.push(rootPath, ...(realRoot === null ? [] : [realRoot]));
    if (realRoot !== null) realRoots.push(stripTrailingSeparators(realRoot));
  }
  let mapped = spellings.map((rootPath) => stripTrailingSeparators(normalize(rootPath)));
  for (let rootSpelling of mapped)
    if (isUnderPathWithSeparator(spelledDir, rootSpelling)) {
      let sliced = spelledDir.slice(0, rootSpelling.length);
      return {
        base: sliced.endsWith(":") ? sliced + sep : sliced,
        rel: relFrom(spelledDir, rootSpelling),
        underRoot: true,
      };
    }
  let foldPath = (value) => foldCaseBasic(value.normalize("NFC"));
  let pathB = mapped.find((rootSpelling) =>
    isUnderPathWithSeparator(foldPath(spelledDir), foldPath(rootSpelling)),
  );
  if (pathB !== undefined) {
    let parts = spelledDir.split(sep);
    let rootParts = pathB.split(sep).length;
    if (getPlatform() !== "windows" && (await getFileIdentity_2(parts.slice(0, rootParts).join(sep), pathB)))
      return {
        base: pathB,
        rel: parts.slice(rootParts).join("/"),
        underRoot: true,
      };
    return {
      refused: `${dirPath} spells the repository folder ${pathB} in another letter case or Unicode form (use the path as git records it)`,
    };
  }
  if (realRoots.length > 0) {
    let parts = spelledDir.split(sep);
    let rootPart = null;
    for (let j = 1; j < parts.length - 1; j++) {
      let joined = parts.slice(0, j).join(sep);
      let prefixPath = joined === "" || joined.endsWith(":") ? joined + sep : joined;
      let realPrefix = await realpath(prefixPath).catch(() => null);
      rootPart = realPrefix;
      let strippedReal = realPrefix === null ? null : stripTrailingSeparators(realPrefix);
      let matchedRoot =
        strippedReal === null ? undefined : realRoots.find((realRoot) => samePathKey(strippedReal, realRoot));
      if (matchedRoot !== undefined)
        return {
          base: matchedRoot,
          rel: parts.slice(j).join("/"),
          underRoot: true,
        };
      if (strippedReal !== null && realRoots.some((realRoot) => isPathAtOrUnder(strippedReal, realRoot)))
        return {
          refused: `${dirPath} is reached through a link into the repository at ${prefixPath}`,
        };
    }
    let linkTarget = rootPart === null ? null : join(rootPart, parts.at(-2));
    let resolvedLink = linkTarget === null || !parentLinkToRoot ? null : await readLinkTargetSafe(linkTarget);
    let found = [linkTarget, resolvedLink]
      .flatMap((path) => (path === null ? [] : [path]))
      .map((realRoot) => realRoots.find((realRoot_2) => samePathKey(realRoot, realRoot_2)))
      .find((realRoot) => realRoot !== undefined);
    if (found !== undefined)
      return {
        base: found,
        rel: parts.at(-1),
        underRoot: true,
      };
  }
  return splitParentAndName(spelledDir);
}
//@ chunk-b2dh3swb.js:39569-39924 layout
/**
 * 读链接目标，含 . / .. 段时返回 null。
 */
async function readLinkTargetSafe(linkPath) {
  let linkText = await readlink(linkPath).catch(() => null);
  if (linkText === null) return null;
  let isDevicePrefixed = getPlatform() === "windows" && /^\\\\\?\\[A-Za-z]:\\/.test(linkText);
  if (isDevicePrefixed && linkText.includes("/")) return null;
  let plainText = isDevicePrefixed ? linkText.slice(4) : linkText;
  let parts = plainText.split(sep === "\\" ? /[\\/]/ : /\//);
  if (
    (isAbsolute(plainText)
      ? parts
      : parts.slice(
          Math.max(
            0,
            parts.findIndex((part) => part !== ".."),
          ),
        )
    ).some((part) => part === "." || part === "..")
  )
    return null;
  return stripTrailingSeparators(
    normalize(isAbsolute(plainText) ? plainText : join(dirname(linkPath), plainText)),
  );
}
//@ chunk-b2dh3swb.js:39924-40096 layout
function splitParentAndName(result) {
  let segment = stripTrailingSeparators(normalize(result));
  let root = parse(segment).root;
  let index = segment.lastIndexOf(sep);
  if (segment === root || index === segment.length - 1 || index < 0) return null;
  return {
    base: index < root.length ? root : segment.slice(0, index),
    rel: segment.slice(index + 1),
    underRoot: false,
  };
}
//@ chunk-b2dh3swb.js:40096-40305 placement
async function isRegisteredWorktreeGitdir(line, key, value, key_2, value_2) {
  let value_3 = isAbsolute(line) ? [normalize(line)] : key.map((key) => normalize(resolve(key, line)));
  let value_4 = await realpath(value).catch(() => null);
  let paths = [key_2, join(value, ".git")]
    .concat(value_4 === null ? [] : [join(value_4, ".git")])
    .map((firstEntry) => join(firstEntry, "worktrees", value_2));
  return value_3.some((key) => isOneOfSamePaths(key, paths));
}
//@ chunk-b2dh3swb.js:40305-40468 placement
async function readRegisteredWorktreeName(baseUrl, key, value, rest, key_2) {
  let smallFile = await readSmallFile(baseUrl, `${key}/.git`);
  if ("error" in smallFile || smallFile.value === null) return null;
  let line = basename(normalize(smallFile.value));
  return (await isRegisteredWorktreeGitdir(smallFile.value, value, rest, key_2, line)) ? line : null;
}
//@ chunk-b2dh3swb.js:40468-40632 placement
async function readHandleUpTo(refName, arguments_) {
  let colonIndex = Buffer.alloc(arguments_ + 1);
  let pathPart = 0;
  for (;;) {
    let { bytesRead } = await refName.read(colonIndex, pathPart, colonIndex.length - pathPart, pathPart);
    if (bytesRead === 0) return colonIndex.subarray(0, pathPart);
    pathPart += bytesRead;
    if (pathPart > arguments_) return null;
  }
}
//@ chunk-b2dh3swb.js:40632-41063 placement
async function readSmallFile(baseUrl, colonIndex) {
  let fragment = {
    value: null,
    bytes: Buffer.alloc(0),
  };
  let path;
  try {
    path = await baseUrl.open(colonIndex, readOnlyOpenFlags());
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ELOOP" || errnoCode === "EISDIR"
      ? fragment
      : {
          error: errnoCode ?? errorMessage(error),
        };
  }
  try {
    if (!(await path.stat()).isFile()) return fragment;
    let handleUpTo = await readHandleUpTo(path, WORKTREE_IO_LIMITS_2);
    if (handleUpTo === null) return fragment;
    let match = /^gitdir: ([^\r\n]+)[\r\n]*$/.exec(handleUpTo.toString("utf8"));
    return {
      value: match ? match[1] : null,
      bytes: handleUpTo,
    };
  } catch (error) {
    return {
      error: getErrnoCode(error) ?? errorMessage(error),
    };
  } finally {
    await path.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:41063-41383 placement
async function unlinkTracked(
  kind,
  canonical,
  crossOs = {
    deleted: false,
  },
) {
  try {
    await kind.unlink(canonical);
    crossOs.deleted = true;
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return false;
    if (errnoCode !== "EISDIR" && errnoCode !== "EPERM" && errnoCode !== "EACCES") throw error;
    let line = await kind.lstat(canonical).catch(() => null);
    if (line === null || !line.isDirectory()) throw error;
    await kind.removeTree(canonical, {
      onDeleted: () => {
        crossOs.deleted = true;
      },
    });
    return true;
  }
}
//@ chunk-b2dh3swb.js:41383-41995 placement
async function removeWorktreeContents(
  kind,
  headPath,
  bytes,
  removalState = {
    deleted: false,
  },
  { pointerFirst: restoreGitFile = false } = {},
) {
  if (restoreGitFile) {
    await kind.unlink(`${headPath}/.git`);
    removalState.deleted = true;
  }
  for (let j = 0; ; j++) {
    let filtered = (await kind.list(headPath)).filter((bytes) => bytes !== ".git");
    if (filtered.length === 0) break;
    if (j === WORKTREE_IO_LIMITS) {
      let protocols = Error("files kept appearing in the worktree while it was being deleted");
      protocols.code = "ENOTEMPTY";
      throw protocols;
    }
    if (filtered.some((path) => path.includes("\uFFFD"))) {
      await kind.removeTree(headPath, {
        keep: ".git",
        onDeleted: () => {
          removalState.deleted = true;
        },
      });
      continue;
    }
    for (let value of filtered) await unlinkTracked(kind, `${headPath}/${value}`, removalState);
  }
  if (!restoreGitFile) {
    await kind.unlink(`${headPath}/.git`);
    removalState.deleted = true;
  }
  try {
    await kind.removeTree(headPath);
  } catch (error) {
    if (!restoreGitFile) await kind.create(`${headPath}/.git`, bytes, 420).catch(() => {});
    throw error;
  }
}
export { removeWorktreeSafely, worktreeRemovalText, convertDirectoryToZipInPlace };
