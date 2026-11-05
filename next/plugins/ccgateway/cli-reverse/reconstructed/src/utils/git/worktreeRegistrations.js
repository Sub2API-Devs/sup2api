/**
 * utils/git/worktreeRegistrations.ts
 *
 * 2.1.316 新增：worktree 注册记录的查找与注销
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b2dh3swb.js (25)
 * attribution: placement 25
 */
import { join } from "path";
import { constants } from "fs";
import { open } from "fs/promises";
import { containsSamePath } from "../pathIdentity.js";
import { getPlatform } from "../platform.js";
import { isENOENT, getErrnoCode, errorMessage } from "../errors.js";
import {
  pathVariants,
  normalizeWorktreePaths,
  isSafePathSegment,
  noteUnchecked,
  openNonBlocking,
  WORKTREE_READ_LIMITS_2,
  parseGitdirLine,
  loadRepoLayout,
  resolveWorktreePaths,
  verifyAdminEntry,
  worktreeHookState,
  vetRepoForWorktrees,
  looksLikeGitDir,
  WORKTREE_READ_LIMITS,
  readUpToBytes,
} from "./worktreeVetting.js";
import { logForDebugging } from "../debug.js";
import { isSentinelInode } from "../slowOperations.js";
import { O_NOFOLLOW_FLAG, READ_LIMITS } from "../fsBoundRead.js";

//@ chunk-b2dh3swb.js:15174-15279 placement
function openFailureText(errnoCode) {
  return errnoCode === "ELOOP"
    ? "is a link"
    : errnoCode === "EISDIR"
      ? "is not a regular file"
      : "could not be opened";
}
//@ chunk-b2dh3swb.js:15279-15331 placement
function isOnlyLineEndings(text) {
  return text.replace(/[\r\n]+$/, "") === "";
}
//@ chunk-b2dh3swb.js:15331-16168 placement
function summarizeUncheckedRegistrations(repoRoot, ancestorResolution, progress) {
  let worktreesDir = join(repoRoot, "worktrees");
  let { unchecked, kinds } = progress;
  let reasons = [
    ...(ancestorResolution === null || ancestorResolution.unresolved.length === 0
      ? []
      : [
          `a folder on the way to the worktree could not be resolved safely (${ancestorResolution.unresolved.join("; ")}), so a registration recorded under its resolved path could not be matched`,
        ]),
    ...(progress.guessed
      ? [
          `${worktreesDir} cannot be listed here without following links, so only the names git would have given this worktree were checked, and a registration under another name may remain`,
        ]
      : []),
    ...(unchecked === 0
      ? []
      : [
          progress.guessed
            ? `some of the names tried in ${worktreesDir} could not be checked (${[...kinds].join(", ")}), so one of them may still register this worktree`
            : `${unchecked === 1 ? "one entry" : `${unchecked} entries`} in ${worktreesDir} could not be checked (${[...kinds].join(", ")}), so ${unchecked === 1 ? "it" : "one of them"} may still register this worktree`,
        ]),
  ];
  return reasons.length === 0
    ? {
        outcome: "none",
      }
    : {
        unmatched: reasons.join("; "),
      };
}
//@ chunk-b2dh3swb.js:16168-16236 placement
function isContainedInGitdirs(registeredGitdir, worktreePaths) {
  return (
    worktreePaths === null ||
    containsSamePath(normalizeDriveCase(registeredGitdir), [...worktreePaths.gitdirs].map(normalizeDriveCase))
  );
}
//@ chunk-b2dh3swb.js:16236-16322 placement
function normalizeDriveCase(path) {
  return getPlatform() === "windows"
    ? path.replace(/^[a-z](?=:)/, (driveLetter) => driveLetter.toUpperCase())
    : path;
}
//@ chunk-b2dh3swb.js:16322-17385 placement
async function findWorktreeRegistrations(fsOps, repoRoot, options, worktreePaths) {
  let progress = {
    guessed: false,
    unchecked: 0,
    kinds: new Set(),
  };
  let entryNames =
    "entryId" in options
      ? [options.entryId]
      : await fsOps.list("worktrees").catch((error) => {
          if (isENOENT(error)) return [];
          if (getErrnoCode(error) === "WORKING_LIST_UNSUPPORTED") {
            progress.guessed = true;
            return pathVariants(normalizeWorktreePaths(options));
          }
          throw error;
        });
  for (let entryName of entryNames) {
    if (!isSafePathSegment(entryName)) {
      if (!progress.guessed) noteUnchecked(progress, "an entry name this check cannot read exactly");
      continue;
    }
    let entryRel = `worktrees/${entryName}`;
    let entryStats = await fsOps.lstat(entryRel).catch((error) => (isENOENT(error) ? null : undefined));
    if (entryStats === undefined) {
      noteUnchecked(progress, "an entry that could not be inspected");
      continue;
    }
    if (entryStats === null || !entryStats.isDirectory()) {
      if (entryStats?.isSymbolicLink()) noteUnchecked(progress, "an entry that is a link");
      else if (entryStats !== null && getPlatform() === "windows")
        noteUnchecked(progress, "an entry that is not a folder");
      continue;
    }
    let nonBlocking = await openNonBlocking(fsOps, `${entryRel}/gitdir`, WORKTREE_READ_LIMITS_2);
    if (nonBlocking === "absent") continue;
    if ("unread" in nonBlocking) {
      noteUnchecked(progress, `a gitdir file that ${nonBlocking.unread}`);
      continue;
    }
    let registeredGitdir = parseGitdirLine(nonBlocking.text, join(repoRoot, "worktrees", entryName));
    if (registeredGitdir === null && !isOnlyLineEndings(nonBlocking.text))
      noteUnchecked(progress, "a gitdir file whose path could not be checked safely");
    if (registeredGitdir === null || !isContainedInGitdirs(registeredGitdir, worktreePaths)) continue;
    let locked = await fsOps.lstat(`${entryRel}/locked`).then(
      () => true,
      (error) => !isENOENT(error),
    );
    return {
      entryId: entryName,
      locked,
      recordedGitdir: registeredGitdir,
      rel: entryRel,
      identity: {
        dev: entryStats.dev,
        ino: entryStats.ino,
      },
    };
  }
  return progress;
}
//@ chunk-b2dh3swb.js:17385-17456 placement
async function safeListRegistrations(repoRoot, dir) {
  return listRegistrations(repoRoot, dir).catch((error) => ({
    unavailable: errorMessage(error),
  }));
}
//@ chunk-b2dh3swb.js:17456-17857 placement
async function listRegistrations(repoRoot, options) {
  let repoLayout = await loadRepoLayout(repoRoot, options.repoSpelled);
  if ("refused" in repoLayout)
    return {
      unavailable: repoLayout.refused,
    };
  if ("unavailable" in repoLayout)
    return {
      unavailable: repoLayout.unavailable,
    };
  try {
    let ancestorResolution = await resolveWorktreePaths(options);
    let progress = await findWorktreeRegistrations(repoLayout, repoRoot, options, ancestorResolution);
    if ("unchecked" in progress) {
      let summary = summarizeUncheckedRegistrations(repoRoot, ancestorResolution, progress);
      return "unmatched" in summary
        ? {
            unavailable: summary.unmatched,
          }
        : null;
    }
    return {
      entryId: progress.entryId,
      locked: progress.locked,
      recordedGitdir: progress.recordedGitdir,
    };
  } finally {
    await repoLayout.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:17857-17922 placement
async function deregisterWorktree(repoRoot, options, lockOptions) {
  return deregisterWorktreeUnsafe(repoRoot, options, lockOptions).catch((error) =>
    keepRegistration(repoRoot, errorMessage(error)),
  );
}
//@ chunk-b2dh3swb.js:17922-19771 placement
/**
 * 从仓库 .git/worktrees 中注销 worktree 记录，逐项校验文件类型与路径安全。
 */
async function deregisterWorktreeUnsafe(repoRoot, options, lockOptions) {
  let repoLayout = await loadRepoLayout(repoRoot, options.repoSpelled);
  if ("refused" in repoLayout) return keepRegistration(repoRoot, repoLayout.refused);
  if ("unavailable" in repoLayout) {
    let { modules } = repoLayout;
    return repoLayout.unavailable === "no_ffi" && modules !== null && modules.host.platform() === "macos"
      ? removeAdminDirNoFollow(
          repoRoot,
          options,
          lockOptions,
          await modules.darwinNoFollowAnyEnforced(modules.host),
        )
      : keepRegistration(
          repoRoot,
          `this build cannot open files here without following links (${repoLayout.unavailable})`,
        );
  }
  try {
    let worktreePaths = await resolveWorktreePaths(options);
    let progress = await findWorktreeRegistrations(repoLayout, repoRoot, options, worktreePaths);
    if ("unchecked" in progress) {
      let summary = summarizeUncheckedRegistrations(repoRoot, worktreePaths, progress);
      return "unmatched" in summary ? keepRegistration(repoRoot, summary.unmatched) : summary;
    }
    if (!(await verifyAdminEntry(progress.recordedGitdir, options, worktreePaths)))
      return keepRegistration(
        repoRoot,
        `could not confirm the worktree is gone: ${progress.recordedGitdir} exists, or a link or unreadable folder is on the way to it`,
      );
    await worktreeHookState.afterMatch?.(progress.entryId);
    let isEntryUnchanged = async () => {
      let entryStats = await repoLayout.lstat(progress.rel).catch(() => null);
      return entryStats !== null && getFileIdentity(entryStats, progress.identity);
    };
    if (!(await isEntryUnchanged()))
      return keepRegistration(
        repoRoot,
        `worktrees/${progress.entryId} changed since it was read, or this volume cannot show it is the same folder`,
      );
    if (await looksLikeGitDirIn(repoLayout, progress.rel))
      return keepRegistration(
        repoRoot,
        `${adminDirHasGitFilesMessage(progress.entryId)}, so nothing in it was removed`,
      );
    if (progress.locked) {
      if (!(await maybeUnlockRegistration(repoLayout, progress.rel, lockOptions.locked)))
        return keepRegistration(repoRoot, `worktrees/${progress.entryId} is locked`);
    }
    await worktreeHookState.beforeMutation?.(progress.entryId);
    await repoLayout.unlink(`${progress.rel}/gitdir`);
    if (!(await isEntryUnchanged()))
      return {
        outcome: "dropped",
        entryId: progress.entryId,
        adminRemoved: false,
      };
    if (await looksLikeGitDirIn(repoLayout, progress.rel)) {
      logForDebugging(
        `Dropped the registration worktrees/${progress.entryId} in ${repoRoot} (git no longer lists it) but left its folder, which now has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them. git's next \`git worktree prune\` or \`git gc\` deletes that folder whole; move out anything you need first.`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "dropped",
        entryId: progress.entryId,
        adminRemoved: false,
      };
    }
    let adminRemoved = await dropRegistrationDir(repoLayout, progress.rel, progress.identity);
    await repoLayout.rmdir("worktrees").catch(() => {});
    return {
      outcome: "dropped",
      entryId: progress.entryId,
      adminRemoved,
    };
  } catch (error) {
    return keepRegistration(repoRoot, errorMessage(error));
  } finally {
    await repoLayout.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:19771-19994 placement
async function pruneWorktreeRegistration(
  repoRoot,
  worktreePath,
  lockOptions = {
    locked: "keep",
  },
) {
  let gitDir = await vetRepoForWorktrees(repoRoot);
  return gitDir === null
    ? keepRegistration(
        repoRoot,
        'the repository could not be vetted (see the "Could not vet the worktree registrations" line above)',
      )
    : deregisterWorktree(
        gitDir,
        {
          worktreePath,
          repoSpelled: repoRoot,
        },
        lockOptions,
      );
}
//@ chunk-b2dh3swb.js:19994-20119 placement
function keepRegistration(repoRoot, reason) {
  logForDebugging(`Left a git worktree registration in ${repoRoot} in place: ${reason}`, {
    level: "warn",
  });
  return {
    outcome: "kept",
    reason,
  };
}
//@ chunk-b2dh3swb.js:20119-20650 placement
/**
 * worktree 管理目录中需要清理/检查的文件清单（HEAD、索引、MERGE_*\/BISECT_* 等）与子目录清单。
 */
var WORKTREE_ADMIN_FILES_2 = [
  "logs/HEAD",
  "HEAD",
  "ORIG_HEAD",
  "FETCH_HEAD",
  "AUTO_MERGE",
  "MERGE_HEAD",
  "MERGE_MSG",
  "MERGE_RR",
  "MERGE_AUTOSTASH",
  "MERGE_MODE",
  "SQUASH_MSG",
  "COMMIT_EDITMSG",
  "REBASE_HEAD",
  "CHERRY_PICK_HEAD",
  "REVERT_HEAD",
  "BISECT_LOG",
  "BISECT_START",
  "BISECT_TERMS",
  "BISECT_NAMES",
  "BISECT_EXPECTED_REV",
  "BISECT_ANCESTORS_OK",
  "BISECT_RUN",
  "BISECT_FIRST_PARENT",
  "BISECT_HEAD",
  "index",
  "index.lock",
  "commondir",
  "locked",
  "config.worktree",
  "info/sparse-checkout",
  "CLAUDE_BASE",
];
var WORKTREE_ADMIN_FILES = ["refs/bisect", "refs/worktree", "refs/rewritten", "refs", "logs", "info"];
//@ chunk-b2dh3swb.js:20650-20746 placement
function looksLikeGitDirIn(repoLayout, relDir) {
  return looksLikeGitDir((entryName) =>
    repoLayout.lstat(`${relDir}/${entryName}`).catch((error) => {
      if (isENOENT(error)) return null;
      throw error;
    }),
  );
}
//@ chunk-b2dh3swb.js:20746-20907 placement
function adminDirHasGitFilesMessage(entryId) {
  return `worktrees/${entryId} has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them`;
}
//@ chunk-b2dh3swb.js:20907-21068 placement
async function dropRegistrationDir(repoLayout, relDir, identity) {
  await removeAdminFiles(repoLayout, relDir, identity);
  return repoLayout.rmdir(relDir).then(
    () => true,
    (error) => {
      logForDebugging(`Dropped the registration ${relDir} but left its folder: ${errorMessage(error)}`, {
        level: "warn",
      });
      return false;
    },
  );
}
//@ chunk-b2dh3swb.js:21068-21162 placement (2.1.88 match: getFileIdentity, 0.795)
function getFileIdentity(stats, identity) {
  return (
    stats.isDirectory() &&
    stats.dev !== 0n &&
    !isSentinelInode(stats.ino) &&
    stats.dev === identity.dev &&
    stats.ino === identity.ino
  );
}
//@ chunk-b2dh3swb.js:21162-21318 placement
async function removeAdminFiles(repoLayout, relDir, identity) {
  for (let fileName of WORKTREE_ADMIN_FILES_2)
    await repoLayout.unlink(`${relDir}/${fileName}`).catch(() => {});
  await removeAdminDir(repoLayout, relDir, identity);
  for (let dirName of WORKTREE_ADMIN_FILES) await repoLayout.rmdir(`${relDir}/${dirName}`).catch(() => {});
}
//@ chunk-b2dh3swb.js:21318-21492 placement
var REFTABLE_FILE_RE =
  /^(?:tables\.list(?:\.lock)?|0x[0-9a-f]{12,16}-0x[0-9a-f]{12,16}-[0-9a-f]{8}\.(?:(?:ref|log)(?:\.lock)?|temp\.[A-Za-z0-9]{6}))$/;
var MAX_ADMIN_ENTRIES = 1024;
var REFS_HEADS = "refs/heads";
var REFTABLE = "reftable";
//@ chunk-b2dh3swb.js:21492-22262 placement
async function removeAdminDir(repoLayout, relDir, identity) {
  let adminAnchor = await Promise.resolve()
    .then(() => repoLayout.anchorBeneath(relDir))
    .catch(() => null);
  if (adminAnchor === null) return;
  try {
    let dirStats = await adminAnchor.lstat("").catch(() => null);
    if (dirStats === null || !getFileIdentity(dirStats, identity)) return;
    let reftableAnchor = await adminAnchor.anchorBeneath(REFTABLE).catch(() => null);
    if (reftableAnchor === null) return;
    try {
      let [reftableAnchorStats, reftableStats] = await Promise.all([
        reftableAnchor.lstat("").catch(() => null),
        repoLayout.lstat(REFTABLE).catch(() => null),
      ]);
      if (
        reftableAnchorStats === null ||
        reftableStats === null ||
        !reftableAnchorStats.isDirectory() ||
        !reftableStats.isDirectory() ||
        (reftableAnchorStats.dev === reftableStats.dev && reftableAnchorStats.ino === reftableStats.ino)
      )
        return;
      let reftableNames = await reftableAnchor
        .list("", MAX_ADMIN_ENTRIES)
        .catch((error) =>
          getErrnoCode(error) === "WORKING_LIST_UNSUPPORTED"
            ? reftableAnchor.list("").catch(() => null)
            : null,
        );
      if (reftableNames === null) return;
      for (let reftableFile of reftableNames)
        if (REFTABLE_FILE_RE.test(reftableFile)) await reftableAnchor.unlink(reftableFile).catch(() => {});
    } finally {
      await reftableAnchor.close().catch(() => {});
    }
    await adminAnchor.unlink(REFS_HEADS).catch(() => {});
    await adminAnchor.rmdir(REFTABLE).catch(() => {});
  } finally {
    await adminAnchor.close().catch(() => {});
  }
}
//@ chunk-b2dh3swb.js:22262-22491 placement
async function maybeUnlockRegistration(fsOps, relDir, locked) {
  if (locked === "drop") return true;
  if (locked === "keep") return false;
  let nonBlocking = await openNonBlocking(fsOps, `${relDir}/locked`, WORKTREE_READ_LIMITS);
  if (
    nonBlocking === "absent" ||
    "unread" in nonBlocking ||
    !locked.unlockIf(nonBlocking.text.replace(/[\r\n]+$/, ""))
  )
    return false;
  await fsOps.unlink(`${relDir}/locked`);
  return true;
}
//@ chunk-b2dh3swb.js:22491-24522 placement
async function removeAdminDirNoFollow(repoRoot, options, lockOptions, noFollowAnyEnforced) {
  if (!noFollowAnyEnforced)
    return keepRegistration(
      repoRoot,
      "this macOS version does not enforce O_NOFOLLOW_ANY, so links cannot be refused",
    );
  let worktreePaths = await resolveWorktreePaths(options);
  let entryNames = "entryId" in options ? [options.entryId] : pathVariants(normalizeWorktreePaths(options));
  let progress = {
    guessed: !("entryId" in options),
    unchecked: 0,
    kinds: new Set(),
  };
  let openFlags = constants.O_NONBLOCK | O_NOFOLLOW_FLAG | READ_LIMITS;
  for (let entryName of entryNames) {
    if (!isSafePathSegment(entryName)) {
      if (!progress.guessed) noteUnchecked(progress, "an entry name this check cannot read exactly");
      continue;
    }
    let entryDir = join(repoRoot, "worktrees", entryName);
    let gitdirHandle = await open(join(entryDir, "gitdir"), constants.O_RDWR | openFlags).catch(
      (error) => getErrnoCode(error) ?? "EIO",
    );
    if (typeof gitdirHandle === "string") {
      if (gitdirHandle !== "ENOENT" && gitdirHandle !== "ENOTDIR")
        noteUnchecked(
          progress,
          gitdirHandle === "ELOOP"
            ? "a gitdir file that is a link, or a link on the way to it"
            : `a gitdir file that ${openFailureText(gitdirHandle)}`,
        );
      continue;
    }
    try {
      let stats = await gitdirHandle.stat();
      if (!stats.isFile() || stats.nlink !== 1) {
        noteUnchecked(
          progress,
          !stats.isFile()
            ? "a gitdir file that is not a regular file"
            : stats.nlink > 1
              ? "a gitdir file with more than one name"
              : "a gitdir file that was removed after it was opened",
        );
        continue;
      }
      let upToBytes = await readUpToBytes(gitdirHandle, WORKTREE_READ_LIMITS_2);
      let gitdirLine = upToBytes === null ? null : parseGitdirLine(upToBytes, entryDir);
      if (upToBytes === null) noteUnchecked(progress, "a gitdir file that is larger than git writes");
      else if (gitdirLine === null && !isOnlyLineEndings(upToBytes))
        noteUnchecked(progress, "a gitdir file whose path could not be checked safely");
      if (gitdirLine === null || !isContainedInGitdirs(gitdirLine, worktreePaths)) continue;
      let lockedHandle = await open(join(entryDir, "locked"), constants.O_RDONLY | openFlags).catch(
        (error) => (isENOENT(error) ? null : undefined),
      );
      if (lockedHandle !== null) {
        let lockedStats = await lockedHandle?.stat().catch(() => null);
        let lockedText =
          lockedHandle !== undefined && lockedStats?.isFile() === true
            ? await readUpToBytes(lockedHandle, WORKTREE_READ_LIMITS).catch(() => null)
            : null;
        await lockedHandle?.close().catch(() => {});
        if (
          lockedText === null ||
          lockOptions.locked === "keep" ||
          (lockOptions.locked !== "drop" && !lockOptions.locked.unlockIf(lockedText.replace(/[\r\n]+$/, "")))
        )
          return keepRegistration(repoRoot, `worktrees/${entryName} is locked`);
      }
      if (!(await verifyAdminEntry(gitdirLine, options, worktreePaths)))
        return keepRegistration(
          repoRoot,
          `could not confirm the worktree is gone: ${gitdirLine} exists, or a link or unreadable folder is on the way to it`,
        );
      if (
        await looksLikeGitDir(async (entryName) => {
          let entryHandle = await open(join(entryDir, entryName), constants.O_RDONLY | openFlags).catch(
            (error) => {
              if (isENOENT(error)) return null;
              throw error;
            },
          );
          if (entryHandle === null) return null;
          try {
            return await entryHandle.stat();
          } finally {
            await entryHandle.close().catch(() => {});
          }
        })
      )
        return keepRegistration(
          repoRoot,
          `${adminDirHasGitFilesMessage(entryName)}, so nothing in it was changed`,
        );
      await worktreeHookState.beforeMutation?.(entryName);
      await gitdirHandle.truncate(0);
      return {
        outcome: "dropped",
        entryId: entryName,
        adminRemoved: false,
      };
    } catch (error) {
      return keepRegistration(repoRoot, errorMessage(error));
    } finally {
      await gitdirHandle.close().catch(() => {});
    }
  }
  let summary = summarizeUncheckedRegistrations(repoRoot, worktreePaths, progress);
  return "unmatched" in summary ? keepRegistration(repoRoot, summary.unmatched) : summary;
}
//@ chunk-b2dh3swb.js:24800-24826 placement
/**
 * worktree 读写的字节上限、重试次数与延迟辅助的惰性状态。
 */
var WORKTREE_IO_LIMITS_2 = 65536;
var WORKTREE_IO_LIMITS = 3;
var nativeFsHelpersPromise = null;
//@ chunk-b2dh3swb.js:24826-25013 placement
function loadNativeFsHelpers() {
  return (nativeFsHelpersPromise ??= Promise.all([
    import("../fsAnchor/treeAnchor.js"),
    import("../fsAnchor/deviceTreeHost.js"),
  ])
    .then(([moduleNamespace, hostModule]) => ({
      tree: moduleNamespace,
      host: hostModule.createDeviceTreeHost(),
    }))
    .catch((error) => {
      nativeFsHelpersPromise = null;
      throw error;
    }));
}
//@ chunk-b2dh3swb.js:25013-25085 placement
function readOnlyOpenFlags() {
  return getPlatform() === "windows" ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NONBLOCK;
}
export {
  deregisterWorktree,
  pruneWorktreeRegistration,
  openFailureText,
  safeListRegistrations,
  loadNativeFsHelpers,
  getFileIdentity,
  removeAdminFiles,
  readOnlyOpenFlags,
  WORKTREE_IO_LIMITS_2,
  WORKTREE_IO_LIMITS,
};
