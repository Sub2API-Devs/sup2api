/**
 * utils/git/worktreeRegistrations.ts
 *
 * 2.1.316 新增：worktree 注册记录的查找与注销
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2xm1rxms.js (25)
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

//@ chunk-2xm1rxms.js:15174-15279 placement
function openFailureText(e) {
  return e === "ELOOP" ? "is a link" : e === "EISDIR" ? "is not a regular file" : "could not be opened";
}
//@ chunk-2xm1rxms.js:15279-15331 placement
function isOnlyLineEndings(e) {
  return e.replace(/[\r\n]+$/, "") === "";
}
//@ chunk-2xm1rxms.js:15331-16168 placement
function summarizeUncheckedRegistrations(e, worktreePaths, worktreeRegistrations) {
  let r = join(e, "worktrees");
  let { unchecked, kinds } = worktreeRegistrations;
  let l = [
    ...(worktreePaths === null || worktreePaths.unresolved.length === 0
      ? []
      : [
          `a folder on the way to the worktree could not be resolved safely (${worktreePaths.unresolved.join("; ")}), so a registration recorded under its resolved path could not be matched`,
        ]),
    ...(worktreeRegistrations.guessed
      ? [
          `${r} cannot be listed here without following links, so only the names git would have given this worktree were checked, and a registration under another name may remain`,
        ]
      : []),
    ...(unchecked === 0
      ? []
      : [
          worktreeRegistrations.guessed
            ? `some of the names tried in ${r} could not be checked (${[...kinds].join(", ")}), so one of them may still register this worktree`
            : `${unchecked === 1 ? "one entry" : `${unchecked} entries`} in ${r} could not be checked (${[...kinds].join(", ")}), so ${unchecked === 1 ? "it" : "one of them"} may still register this worktree`,
        ]),
  ];
  return l.length === 0
    ? {
        outcome: "none",
      }
    : {
        unmatched: l.join("; "),
      };
}
//@ chunk-2xm1rxms.js:16168-16236 placement
function isContainedInGitdirs(e, n) {
  return n === null || containsSamePath(normalizeDriveCase(e), [...n.gitdirs].map(normalizeDriveCase));
}
//@ chunk-2xm1rxms.js:16236-16322 placement
function normalizeDriveCase(e) {
  return getPlatform() === "windows" ? e.replace(/^[a-z](?=:)/, (n) => n.toUpperCase()) : e;
}
//@ chunk-2xm1rxms.js:16322-17385 placement
async function findWorktreeRegistrations(repoLayout, n, o, worktreePaths) {
  let s = {
    guessed: false,
    unchecked: 0,
    kinds: new Set(),
  };
  let a =
    "entryId" in o
      ? [o.entryId]
      : await repoLayout.list("worktrees").catch((error) => {
          if (isENOENT(error)) return [];
          if (getErrnoCode(error) === "WORKING_LIST_UNSUPPORTED") {
            s.guessed = true;
            return pathVariants(normalizeWorktreePaths(o));
          }
          throw error;
        });
  for (let l of a) {
    if (!isSafePathSegment(l)) {
      if (!s.guessed) noteUnchecked(s, "an entry name this check cannot read exactly");
      continue;
    }
    let u = `worktrees/${l}`;
    let c = await repoLayout.lstat(u).catch((error) => (isENOENT(error) ? null : undefined));
    if (c === undefined) {
      noteUnchecked(s, "an entry that could not be inspected");
      continue;
    }
    if (c === null || !c.isDirectory()) {
      if (c?.isSymbolicLink()) noteUnchecked(s, "an entry that is a link");
      else if (c !== null && getPlatform() === "windows") noteUnchecked(s, "an entry that is not a folder");
      continue;
    }
    let nonBlocking = await openNonBlocking(repoLayout, `${u}/gitdir`, WORKTREE_READ_LIMITS_2);
    if (nonBlocking === "absent") continue;
    if ("unread" in nonBlocking) {
      noteUnchecked(s, `a gitdir file that ${nonBlocking.unread}`);
      continue;
    }
    let gitdirLine = parseGitdirLine(nonBlocking.text, join(n, "worktrees", l));
    if (gitdirLine === null && !isOnlyLineEndings(nonBlocking.text))
      noteUnchecked(s, "a gitdir file whose path could not be checked safely");
    if (gitdirLine === null || !isContainedInGitdirs(gitdirLine, worktreePaths)) continue;
    let locked = await repoLayout.lstat(`${u}/locked`).then(
      () => true,
      (error) => !isENOENT(error),
    );
    return {
      entryId: l,
      locked,
      recordedGitdir: gitdirLine,
      rel: u,
      identity: {
        dev: c.dev,
        ino: c.ino,
      },
    };
  }
  return s;
}
//@ chunk-2xm1rxms.js:17385-17456 placement
async function safeListRegistrations(dir, n) {
  return listRegistrations(dir, n).catch((error) => ({
    unavailable: errorMessage(error),
  }));
}
//@ chunk-2xm1rxms.js:17456-17857 placement
async function listRegistrations(e, n) {
  let repoLayout = await loadRepoLayout(e, n.repoSpelled);
  if ("refused" in repoLayout)
    return {
      unavailable: repoLayout.refused,
    };
  if ("unavailable" in repoLayout)
    return {
      unavailable: repoLayout.unavailable,
    };
  try {
    let worktreePaths = await resolveWorktreePaths(n);
    let worktreeRegistrations = await findWorktreeRegistrations(repoLayout, e, n, worktreePaths);
    if ("unchecked" in worktreeRegistrations) {
      let a = summarizeUncheckedRegistrations(e, worktreePaths, worktreeRegistrations);
      return "unmatched" in a
        ? {
            unavailable: a.unmatched,
          }
        : null;
    }
    return {
      entryId: worktreeRegistrations.entryId,
      locked: worktreeRegistrations.locked,
      recordedGitdir: worktreeRegistrations.recordedGitdir,
    };
  } finally {
    await repoLayout.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:17857-17922 placement
async function deregisterWorktree(e, n, o) {
  return deregisterWorktreeUnsafe(e, n, o).catch((error) => keepRegistration(e, errorMessage(error)));
}
//@ chunk-2xm1rxms.js:17922-19771 placement
/**
 * 从仓库 .git/worktrees 中注销 worktree 记录，逐项校验文件类型与路径安全。
 */
async function deregisterWorktreeUnsafe(e, n, o) {
  let repoLayout = await loadRepoLayout(e, n.repoSpelled);
  if ("refused" in repoLayout) return keepRegistration(e, repoLayout.refused);
  if ("unavailable" in repoLayout) {
    let { modules } = repoLayout;
    return repoLayout.unavailable === "no_ffi" && modules !== null && modules.host.platform() === "macos"
      ? removeAdminDirNoFollow(e, n, o, await modules.darwinNoFollowAnyEnforced(modules.host))
      : keepRegistration(
          e,
          `this build cannot open files here without following links (${repoLayout.unavailable})`,
        );
  }
  try {
    let worktreePaths = await resolveWorktreePaths(n);
    let worktreeRegistrations = await findWorktreeRegistrations(repoLayout, e, n, worktreePaths);
    if ("unchecked" in worktreeRegistrations) {
      let c = summarizeUncheckedRegistrations(e, worktreePaths, worktreeRegistrations);
      return "unmatched" in c ? keepRegistration(e, c.unmatched) : c;
    }
    if (!(await verifyAdminEntry(worktreeRegistrations.recordedGitdir, n, worktreePaths)))
      return keepRegistration(
        e,
        `could not confirm the worktree is gone: ${worktreeRegistrations.recordedGitdir} exists, or a link or unreadable folder is on the way to it`,
      );
    await worktreeHookState.afterMatch?.(worktreeRegistrations.entryId);
    let l = async () => {
      let c = await repoLayout.lstat(worktreeRegistrations.rel).catch(() => null);
      return c !== null && getFileIdentity(c, worktreeRegistrations.identity);
    };
    if (!(await l()))
      return keepRegistration(
        e,
        `worktrees/${worktreeRegistrations.entryId} changed since it was read, or this volume cannot show it is the same folder`,
      );
    if (await looksLikeGitDirIn(repoLayout, worktreeRegistrations.rel))
      return keepRegistration(
        e,
        `${adminDirHasGitFilesMessage(worktreeRegistrations.entryId)}, so nothing in it was removed`,
      );
    if (worktreeRegistrations.locked) {
      if (!(await maybeUnlockRegistration(repoLayout, worktreeRegistrations.rel, o.locked)))
        return keepRegistration(e, `worktrees/${worktreeRegistrations.entryId} is locked`);
    }
    await worktreeHookState.beforeMutation?.(worktreeRegistrations.entryId);
    await repoLayout.unlink(`${worktreeRegistrations.rel}/gitdir`);
    if (!(await l()))
      return {
        outcome: "dropped",
        entryId: worktreeRegistrations.entryId,
        adminRemoved: false,
      };
    if (await looksLikeGitDirIn(repoLayout, worktreeRegistrations.rel)) {
      logForDebugging(
        `Dropped the registration worktrees/${worktreeRegistrations.entryId} in ${e} (git no longer lists it) but left its folder, which now has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them. git's next \`git worktree prune\` or \`git gc\` deletes that folder whole; move out anything you need first.`,
        {
          level: "warn",
        },
      );
      return {
        outcome: "dropped",
        entryId: worktreeRegistrations.entryId,
        adminRemoved: false,
      };
    }
    let adminRemoved = await dropRegistrationDir(
      repoLayout,
      worktreeRegistrations.rel,
      worktreeRegistrations.identity,
    );
    await repoLayout.rmdir("worktrees").catch(() => {});
    return {
      outcome: "dropped",
      entryId: worktreeRegistrations.entryId,
      adminRemoved,
    };
  } catch (error) {
    return keepRegistration(e, errorMessage(error));
  } finally {
    await repoLayout.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:19771-19994 placement
async function pruneWorktreeRegistration(
  e,
  worktreePath,
  o = {
    locked: "keep",
  },
) {
  let r = await vetRepoForWorktrees(e);
  return r === null
    ? keepRegistration(
        e,
        'the repository could not be vetted (see the "Could not vet the worktree registrations" line above)',
      )
    : deregisterWorktree(
        r,
        {
          worktreePath,
          repoSpelled: e,
        },
        o,
      );
}
//@ chunk-2xm1rxms.js:19994-20119 placement
function keepRegistration(e, n) {
  logForDebugging(`Left a git worktree registration in ${e} in place: ${n}`, {
    level: "warn",
  });
  return {
    outcome: "kept",
    reason: n,
  };
}
//@ chunk-2xm1rxms.js:20119-20650 placement
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
//@ chunk-2xm1rxms.js:20650-20746 placement
function looksLikeGitDirIn(repoLayout, n) {
  return looksLikeGitDir((o) =>
    repoLayout.lstat(`${n}/${o}`).catch((error) => {
      if (isENOENT(error)) return null;
      throw error;
    }),
  );
}
//@ chunk-2xm1rxms.js:20746-20907 placement
function adminDirHasGitFilesMessage(e) {
  return `worktrees/${e} has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them`;
}
//@ chunk-2xm1rxms.js:20907-21068 placement
async function dropRegistrationDir(repoLayout, n, identity) {
  await removeAdminFiles(repoLayout, n, identity);
  return repoLayout.rmdir(n).then(
    () => true,
    (error) => {
      logForDebugging(`Dropped the registration ${n} but left its folder: ${errorMessage(error)}`, {
        level: "warn",
      });
      return false;
    },
  );
}
//@ chunk-2xm1rxms.js:21068-21162 placement = getFileIdentity (0.794)
function getFileIdentity(e, n) {
  return e.isDirectory() && e.dev !== 0n && !isSentinelInode(e.ino) && e.dev === n.dev && e.ino === n.ino;
}
//@ chunk-2xm1rxms.js:21162-21318 placement
async function removeAdminFiles(e, n, o) {
  for (let r of WORKTREE_ADMIN_FILES_2) await e.unlink(`${n}/${r}`).catch(() => {});
  await removeAdminDir(e, n, o);
  for (let r of WORKTREE_ADMIN_FILES) await e.rmdir(`${n}/${r}`).catch(() => {});
}
//@ chunk-2xm1rxms.js:21318-21492 placement
var REFTABLE_FILE_RE =
  /^(?:tables\.list(?:\.lock)?|0x[0-9a-f]{12,16}-0x[0-9a-f]{12,16}-[0-9a-f]{8}\.(?:(?:ref|log)(?:\.lock)?|temp\.[A-Za-z0-9]{6}))$/;
var MAX_ADMIN_ENTRIES = 1024;
var REFS_HEADS = "refs/heads";
var REFTABLE = "reftable";
//@ chunk-2xm1rxms.js:21492-22262 placement
async function removeAdminDir(e, n, o) {
  let r = await Promise.resolve()
    .then(() => e.anchorBeneath(n))
    .catch(() => null);
  if (r === null) return;
  try {
    let s = await r.lstat("").catch(() => null);
    if (s === null || !getFileIdentity(s, o)) return;
    let a = await r.anchorBeneath(REFTABLE).catch(() => null);
    if (a === null) return;
    try {
      let [l, u] = await Promise.all([a.lstat("").catch(() => null), e.lstat(REFTABLE).catch(() => null)]);
      if (
        l === null ||
        u === null ||
        !l.isDirectory() ||
        !u.isDirectory() ||
        (l.dev === u.dev && l.ino === u.ino)
      )
        return;
      let c = await a
        .list("", MAX_ADMIN_ENTRIES)
        .catch((error) =>
          getErrnoCode(error) === "WORKING_LIST_UNSUPPORTED" ? a.list("").catch(() => null) : null,
        );
      if (c === null) return;
      for (let w of c) if (REFTABLE_FILE_RE.test(w)) await a.unlink(w).catch(() => {});
    } finally {
      await a.close().catch(() => {});
    }
    await r.unlink(REFS_HEADS).catch(() => {});
    await r.rmdir(REFTABLE).catch(() => {});
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:22262-22491 placement
async function maybeUnlockRegistration(repoLayout, n, locked) {
  if (locked === "drop") return true;
  if (locked === "keep") return false;
  let nonBlocking = await openNonBlocking(repoLayout, `${n}/locked`, WORKTREE_READ_LIMITS);
  if (
    nonBlocking === "absent" ||
    "unread" in nonBlocking ||
    !locked.unlockIf(nonBlocking.text.replace(/[\r\n]+$/, ""))
  )
    return false;
  await repoLayout.unlink(`${n}/locked`);
  return true;
}
//@ chunk-2xm1rxms.js:22491-24522 placement
async function removeAdminDirNoFollow(e, n, o, r) {
  if (!r)
    return keepRegistration(
      e,
      "this macOS version does not enforce O_NOFOLLOW_ANY, so links cannot be refused",
    );
  let worktreePaths = await resolveWorktreePaths(n);
  let a = "entryId" in n ? [n.entryId] : pathVariants(normalizeWorktreePaths(n));
  let l = {
    guessed: !("entryId" in n),
    unchecked: 0,
    kinds: new Set(),
  };
  let u = constants.O_NONBLOCK | O_NOFOLLOW_FLAG | READ_LIMITS;
  for (let w of a) {
    if (!isSafePathSegment(w)) {
      if (!l.guessed) noteUnchecked(l, "an entry name this check cannot read exactly");
      continue;
    }
    let h = join(e, "worktrees", w);
    let g = await open(join(h, "gitdir"), constants.O_RDWR | u).catch(
      (error) => getErrnoCode(error) ?? "EIO",
    );
    if (typeof g === "string") {
      if (g !== "ENOENT" && g !== "ENOTDIR")
        noteUnchecked(
          l,
          g === "ELOOP"
            ? "a gitdir file that is a link, or a link on the way to it"
            : `a gitdir file that ${openFailureText(g)}`,
        );
      continue;
    }
    try {
      let stats = await g.stat();
      if (!stats.isFile() || stats.nlink !== 1) {
        noteUnchecked(
          l,
          !stats.isFile()
            ? "a gitdir file that is not a regular file"
            : stats.nlink > 1
              ? "a gitdir file with more than one name"
              : "a gitdir file that was removed after it was opened",
        );
        continue;
      }
      let upToBytes = await readUpToBytes(g, WORKTREE_READ_LIMITS_2);
      let m = upToBytes === null ? null : parseGitdirLine(upToBytes, h);
      if (upToBytes === null) noteUnchecked(l, "a gitdir file that is larger than git writes");
      else if (m === null && !isOnlyLineEndings(upToBytes))
        noteUnchecked(l, "a gitdir file whose path could not be checked safely");
      if (m === null || !isContainedInGitdirs(m, worktreePaths)) continue;
      let f = await open(join(h, "locked"), constants.O_RDONLY | u).catch((error) =>
        isENOENT(error) ? null : undefined,
      );
      if (f !== null) {
        let p = await f?.stat().catch(() => null);
        let E =
          f !== undefined && p?.isFile() === true
            ? await readUpToBytes(f, WORKTREE_READ_LIMITS).catch(() => null)
            : null;
        await f?.close().catch(() => {});
        if (
          E === null ||
          o.locked === "keep" ||
          (o.locked !== "drop" && !o.locked.unlockIf(E.replace(/[\r\n]+$/, "")))
        )
          return keepRegistration(e, `worktrees/${w} is locked`);
      }
      if (!(await verifyAdminEntry(m, n, worktreePaths)))
        return keepRegistration(
          e,
          `could not confirm the worktree is gone: ${m} exists, or a link or unreadable folder is on the way to it`,
        );
      if (
        await looksLikeGitDir(async (p) => {
          let E = await open(join(h, p), constants.O_RDONLY | u).catch((error) => {
            if (isENOENT(error)) return null;
            throw error;
          });
          if (E === null) return null;
          try {
            return await E.stat();
          } finally {
            await E.close().catch(() => {});
          }
        })
      )
        return keepRegistration(e, `${adminDirHasGitFilesMessage(w)}, so nothing in it was changed`);
      await worktreeHookState.beforeMutation?.(w);
      await g.truncate(0);
      return {
        outcome: "dropped",
        entryId: w,
        adminRemoved: false,
      };
    } catch (error) {
      return keepRegistration(e, errorMessage(error));
    } finally {
      await g.close().catch(() => {});
    }
  }
  let c = summarizeUncheckedRegistrations(e, worktreePaths, l);
  return "unmatched" in c ? keepRegistration(e, c.unmatched) : c;
}
//@ chunk-2xm1rxms.js:24800-24826 placement
/**
 * worktree 读写的字节上限、重试次数与延迟辅助的惰性状态。
 */
var WORKTREE_IO_LIMITS_2 = 65536;
var WORKTREE_IO_LIMITS = 3;
var nativeFsHelpersPromise = null;
//@ chunk-2xm1rxms.js:24826-25013 placement
function loadNativeFsHelpers() {
  return (nativeFsHelpersPromise ??= Promise.all([
    import("./chunk-ejkghqj9.js"),
    import("./chunk-78kn47sp.js"),
  ])
    .then(([e, n]) => ({
      tree: e,
      host: n.createDeviceTreeHost(),
    }))
    .catch((error) => {
      nativeFsHelpersPromise = null;
      throw error;
    }));
}
//@ chunk-2xm1rxms.js:25013-25085 placement
function readOnlyOpenFlags() {
  return getPlatform() === "windows" ? constants.O_RDONLY : constants.O_RDONLY | constants.O_NONBLOCK;
}
export {
  openFailureText,
  safeListRegistrations,
  deregisterWorktree,
  loadNativeFsHelpers,
  getFileIdentity,
  removeAdminFiles,
  readOnlyOpenFlags,
  WORKTREE_IO_LIMITS_2,
  WORKTREE_IO_LIMITS,
  pruneWorktreeRegistration,
};
