/**
 * utils/git/worktreeRemoval.ts
 *
 * 2.1.316 新增：安全删除 worktree
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2xm1rxms.js (34)
 * attribution: placement 29, affinity 2, sole-consumer 3
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
import { getFileIdentity_2 } from "../markdownConfigLoader.js";

//@ chunk-2xm1rxms.js:25085-27973 placement
/**
 * 安全删除 git worktree：校验目录、注销记录、处理锁定与二次强制，不跟随符号链接。
 */
async function removeWorktreeSafely(
  e,
  n,
  {
    forceTwice: o = false,
    git: r,
    trustedRoot: s,
    resolveAboveParent: a = false,
    deregisterIfStopped: l = false,
    pointerFirst: u = false,
  } = {},
) {
  let c = await locateUnderRepoRoots(s === undefined ? [e] : [e, s], n, {
    parentLinkToRoot: a,
  });
  if (c === null)
    return {
      outcome: "refused",
      reason: `${n} has no parent directory`,
    };
  if ("refused" in c)
    return {
      outcome: "refused",
      reason: c.refused,
    };
  let { base, rel, underRoot } = c;
  let b = r ?? (await inspectWorktreeDir(e));
  if ("why" in b)
    return {
      outcome: "refused",
      reason: `the repository's git directory failed its safety checks (${b.why})`,
    };
  let dir = b.dir;
  let worktreeBase = await resolveWorktreeBase(base, underRoot ? "root" : a ? "not_a_link" : "canonical");
  if (!("held" in worktreeBase))
    return worktreeBase.outcome === "unanchored"
      ? worktreeBase
      : {
          outcome: "refused",
          reason: worktreeBase.reason,
        };
  let { held, realBase } = worktreeBase;
  try {
    let E = await held.lstat(rel).then(
      (_) => _.isDirectory(),
      () => false,
    );
    if (
      E &&
      (await held.list(rel).then(
        () => false,
        (error) => isListUnsupportedError(error),
      ))
    )
      return {
        outcome: "unanchored",
        reason: "no_descriptor_listing",
      };
    let worktreePath = underRoot || a ? [n, join(realBase, ...rel.split("/"))] : [n];
    let y = await safeListRegistrations(dir, {
      worktreePath,
      repoSpelled: b.root,
    });
    if (E && y !== null && !("unavailable" in y)) {
      let registeredWorktreeName = await readRegisteredWorktreeName(
        held,
        rel,
        [n, join(realBase, ...rel.split("/"))],
        e,
        dir,
      );
      if (registeredWorktreeName !== null && registeredWorktreeName !== y.entryId) {
        let X = await safeListRegistrations(dir, {
          entryId: registeredWorktreeName,
          worktreePath,
          repoSpelled: b.root,
        });
        if (X !== null && !("unavailable" in X)) y = X;
      }
    }
    if (y !== null && "unavailable" in y)
      return {
        outcome: "refused",
        reason: `git's records of worktrees in ${dir} could not be checked safely (${y.unavailable})`,
      };
    if (y === null)
      return {
        outcome: "not_registered",
      };
    if (
      !underRoot &&
      !isOneOfSamePaths(
        y.recordedGitdir,
        [n, join(realBase, ...rel.split("/"))].map((_) => join(normalize(_), ".git")),
      )
    )
      return {
        outcome: "refused",
        reason: `the folder holding ${n} resolved to a different place while it was being checked (a link may have been swapped in)`,
      };
    if (y.locked && !o)
      return {
        outcome: "locked",
      };
    let A = o ? "drop" : "keep";
    let P = await held.lstat(rel).then(
      (_) => _,
      (error) => ({
        error,
      }),
    );
    if (
      "error" in P &&
      isENOENT(P.error) &&
      (await held.lstat(dirnameOrEmpty(rel)).then(
        (_) => _.isDirectory(),
        () => false,
      ))
    )
      return dropRegistrationAfter(
        n,
        await deregisterWorktree(
          dir,
          {
            entryId: y.entryId,
            repoSpelled: b.root,
          },
          {
            locked: A,
          },
        ),
        dir,
        y.entryId,
      );
    if ("error" in P || !P.isDirectory())
      return {
        outcome: "refused",
        reason:
          "error" in P && isENOENT(P.error)
            ? `the directory holding ${n} is missing`
            : `${n} is not a directory reachable without a link (${"error" in P ? (getErrnoCode(P.error) ?? "unknown error") : "not a directory"})`,
      };
    let smallFile = await readSmallFile(held, `${rel}/.git`);
    if ("error" in smallFile)
      return {
        outcome: "refused",
        reason: `the .git file in ${n} could not be read (${smallFile.error})`,
      };
    if (
      smallFile.value === null ||
      !(await isRegisteredWorktreeGitdir(
        smallFile.value,
        [n, join(realBase, ...rel.split("/"))],
        e,
        dir,
        y.entryId,
      ))
    )
      return {
        outcome: "not_pointing_back",
      };
    let V = l ? await statWorktreeAdminDir(dir, y.entryId) : null;
    let j = typeof V === "object" ? V : null;
    let D = {
      deleted: false,
    };
    try {
      await removeWorktreeContents(held, rel, smallFile.bytes, D, {
        pointerFirst: u,
      });
    } catch (error) {
      if (!D.deleted && isListUnsupportedError(error))
        return {
          outcome: "unanchored",
          reason: "no_descriptor_listing",
        };
      let reason = describeRemovalError(error);
      logForDebugging(`Worktree checkout ${n} not fully deleted: ${errorMessage(error)}`, {
        level: "warn",
      });
      let deregistered = j !== null && D.deleted && (await removeHeldWorktree(dir, y.entryId, j, A));
      return {
        outcome: "delete_failed",
        reason,
        started: D.deleted,
        deregistered,
      };
    }
    return dropRegistrationAfter(
      n,
      await deregisterWorktree(
        dir,
        {
          entryId: y.entryId,
          repoSpelled: b.root,
        },
        {
          locked: A,
        },
      ),
      dir,
      y.entryId,
    );
  } finally {
    await held.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:27973-28767 placement
async function vetWorktreeForRemoval(dirPath, zipPath, { rootIsCanonical: o = false } = {}) {
  let r =
    zipPath === undefined ? splitParentAndName(dirPath) : await locateUnderRepoRoots([zipPath], dirPath);
  if (r === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${dirPath} has no parent directory`,
      "the path to delete has no parent directory",
    );
  if ("refused" in r)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      r.refused,
      "the path to delete reaches its root by a spelling that cannot be checked safely",
    );
  let worktreeBase = await resolveWorktreeBase(
    r.base,
    zipPath === undefined || !r.underRoot ? "not_a_link" : o ? "canonical" : "root",
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
    return (await unlinkTracked(worktreeBase.held, r.rel)) ? "deleted" : "absent";
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
//@ chunk-2xm1rxms.js:28767-28869 placement = convertDirectoryToZipInPlace (1)
async function convertDirectoryToZipInPlace(dirPath, zipPath, zipData = {}) {
  if (typeof (await vetWorktreeForRemoval(dirPath, zipPath, zipData)) === "object")
    await rm(dirPath, {
      recursive: true,
      force: true,
    });
}
//@ chunk-2xm1rxms.js:28869-30425 placement
function worktreeRemovalText(e) {
  switch (e.outcome) {
    case "removed":
      return "removed";
    case "not_registered":
      return "git has no usable record of a worktree at this path; nothing was deleted";
    case "locked":
      return "the worktree is locked (by `git worktree lock`); nothing was deleted. `git worktree unlock <path>` unlocks it";
    case "not_pointing_back":
      return "the worktree's .git file is missing or does not point to git's record of it; nothing was deleted";
    case "refused":
      return `${e.reason}; nothing was deleted`;
    case "delete_failed":
      if (e.reason === FILES_KEPT_APPEARING_REASON)
        return `${FILES_KEPT_APPEARING_REASON}; try removing it again once nothing is writing to it`;
      if (e.reason === "WORKING_NAME_NOT_PLAIN")
        return "it holds a file name that Windows cannot delete this way; some of its other files may already be deleted";
      if (e.reason === "ENOTEMPTY")
        return "a folder in it could not be emptied: it may be unreadable, or something may still be writing to it; check its permissions and try removing it again";
      if (e.reason === "WORKING_FILE_HELD")
        return "a program has one of its files open; try removing it again once that program closes it";
      return e.reason === "EBUSY"
        ? "some of its files could not be deleted: EBUSY; a program may have them open, so try removing it again"
        : `some of its files could not be deleted: ${e.reason}`;
    case "registration_kept":
      return `its files were deleted, but git still lists it (${e.reason})`;
    case "unanchored":
      return e.reason === "no_descriptor_listing"
        ? "this machine cannot list a folder it holds open, so it cannot delete it without following links"
        : `this machine cannot open folders without following links (${e.reason})`;
  }
}
//@ chunk-2xm1rxms.js:30425-30498 placement
var FILES_KEPT_APPEARING_REASON = "files kept appearing in the worktree while it was being deleted";
//@ chunk-2xm1rxms.js:30498-30554 placement
function isListUnsupportedError(error) {
  return getErrnoCode(error) === "WORKING_LIST_UNSUPPORTED";
}
//@ chunk-2xm1rxms.js:30554-30625 placement
function dirnameOrEmpty(e) {
  return e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "";
}
//@ chunk-2xm1rxms.js:30625-32547 placement
async function resolveWorktreeBase(base, n, { holdBase: o = false } = {}) {
  let r = (reason, absent = false) => ({
    outcome: "refused",
    reason,
    absent,
  });
  let a = await (async () => {
    if (n === "root") return realpath(base);
    let f = join(await realpath(dirname(base)), basename(base));
    return n === "not_a_link" && getPlatform() !== "windows" && (await isRootOwnedLinkChain(f))
      ? realpath(f)
      : f;
  })().catch((error) => (isENOENT(error) ? undefined : getErrnoCode(error) === "ELOOP" ? "link" : null));
  if (a === "link") return r(`${base} is a link, or its spelling differs from the one on disk`);
  if (a === undefined || a === null) return r(`${base} does not exist or cannot be read`, a === undefined);
  if (n === "canonical" && !samePathKey(a, base))
    return r(
      `${base} is reached through a link, or its spelling differs from the one on disk (it resolves to ${a})`,
    );
  let root = parse(a).root;
  let u = getPlatform() === "windows" || o ? a : await walkPathComponents(a);
  if (u === null) return r(`a directory above ${base} cannot be read`);
  let c = await loadNativeFsHelpers().catch((error) => ({
    failed: errorMessage(error),
  }));
  if ("failed" in c) return r(`${base} could not be opened safely (${c.failed})`);
  let { tree, host } = c;
  let g = await tree
    .openTreeAnchor(host, {
      gitRoot: u,
      realRoot: u,
    })
    .catch((error) => ({
      failed: errorMessage(error),
      code: getErrnoCode(error),
    }));
  if ("failed" in g) {
    let f = u === a;
    return f && g.code === "ENOENT"
      ? r(`${base} does not exist`, true)
      : f && (g.code === "ELOOP" || g.code === "ENOTDIR")
        ? r(`${base} is a link, or changed while it was being opened`)
        : f && g.code === "WORKING_ROOT_NOT_CANONICAL"
          ? r(`${base} is reached through a link, or its spelling differs from the one on disk`)
          : r(`${base} could not be opened safely (${g.failed})`);
  }
  if ("unavailable" in g) {
    let unavailableReason = tree.getUnavailableReason(
      await tree.checkAnchoring(root, {
        host,
      }),
    );
    let p =
      unavailableReason === "no_ffi" ||
      (unavailableReason === "remote_volume" && (n !== "not_a_link" || (await isSameVolumeRoot(base, root))));
    return unavailableReason !== null && (getPlatform() !== "windows" || p)
      ? {
          outcome: "unanchored",
          reason: unavailableReason,
        }
      : r(`${base} could not be opened safely (${g.unavailable})`);
  }
  let b = u === a ? "" : a.slice(stripTrailingSeparators(u).length).split(sep).filter(Boolean).join("/");
  let T = scopedFs(g, b);
  let m = await T.lstat("").then(
    (f) => f,
    (error) => ({
      error,
    }),
  );
  if ("error" in m || !m.isDirectory()) {
    await g.close().catch(() => {});
    return "error" in m && isENOENT(m.error)
      ? r(`${base} does not exist`, true)
      : r(`${base} is a link, or changed while it was being opened`);
  }
  return {
    held: T,
    realBase: a,
  };
}
//@ chunk-2xm1rxms.js:32547-32875 placement
async function walkPathComponents(e) {
  let root = parse(e).root;
  let filtered = e.slice(root.length).split(sep).filter(Boolean);
  let r = root;
  let s = root;
  let a = false;
  for (let l of filtered) {
    let u = await probeAccess(s, constants.R_OK);
    let c = await probeAccess(s, constants.W_OK);
    if (u === null || c === null) return null;
    if (!u) {
      let w = await lstat(s).then(
        (h) => h.uid,
        () => null,
      );
      if (w === null || w === process.getuid?.() || c || a) return null;
      r = join(s, l);
    }
    a ||= c;
    s = join(s, l);
  }
  return r;
}
//@ chunk-2xm1rxms.js:32875-32986 placement
async function isSameVolumeRoot(e, root) {
  let o = await realpath(parse(e).root).catch(() => null);
  return (
    o !== null &&
    foldCaseBasic(stripTrailingSeparators(parse(o).root)) === foldCaseBasic(stripTrailingSeparators(root))
  );
}
//@ chunk-2xm1rxms.js:32986-33096 placement
async function probeAccess(e, n) {
  return access(e, n).then(
    () => true,
    (error) => (["EACCES", "EPERM", "EROFS"].includes(getErrnoCode(error) ?? "") ? false : null),
  );
}
//@ chunk-2xm1rxms.js:33096-33316 placement
async function isRootOwnedLinkChain(e) {
  let n = await lstat(e).catch(() => null);
  if (n === null || !n.isSymbolicLink()) return false;
  for (let o = dirname(e); ; o = dirname(o)) {
    if (
      (await lstat(o).then(
        (s) => s.uid,
        () => null,
      )) !== 0 ||
      (await probeAccess(o, constants.W_OK)) !== false
    )
      return false;
    if (dirname(o) === o) return true;
  }
}
//@ chunk-2xm1rxms.js:33316-33682 placement
function scopedFs(e, n) {
  let o = (r) => (n === "" ? r : r === "" ? n : `${n}/${r}`);
  return {
    lstat: (r) => e.lstat(o(r)),
    list: (r, s) => e.list(o(r), s),
    unlink: (r) => e.unlink(o(r)),
    rmdir: (r) => e.rmdir(o(r)),
    rename: (r, s) => e.rename(o(r), o(s)),
    removeTree: (r, s) => e.removeTree(o(r), s),
    open: (r, s) => e.open(o(r), s),
    create: (r, s, a) => e.create(o(r), s, a),
    close: () => e.close(),
    anchorBeneath: (r) => e.anchorBeneath(o(r)),
  };
}
//@ chunk-2xm1rxms.js:33682-34641 placement
async function inspectWorktreeDir(e) {
  let n = e;
  let o = await vetWorktree(e, {
    dotGitLink: "vet",
  });
  if ("skipped" in o && o.skipped === "pointer") {
    let canonicalGitRootUncached = findCanonicalGitRootUncached(e);
    if (canonicalGitRootUncached !== null && canonicalGitRootUncached !== e) {
      n = canonicalGitRootUncached;
      o = await vetWorktree(canonicalGitRootUncached, {
        dotGitLink: "vet",
      });
    } else {
      let a = await refreshGitDir(e);
      if (a === null)
        return {
          why: "its .git file names no usable git directory",
        };
      if ("refused" in (await isSameRepository(e, a)))
        return {
          why: `its .git file names ${a}, which is inside the working tree, or could not be checked against it`,
        };
      let [l, u] = await Promise.all([a, e].map((w) => realpath(w).catch(() => null)));
      if (l == null || u == null)
        return {
          why:
            l == null
              ? `its .git file names ${a}, which does not exist or cannot be resolved`
              : "the repository root cannot be resolved",
        };
      if (isPathAtOrUnder(normalizeCaseForPlatform_2(l), normalizeCaseForPlatform_2(u)))
        return {
          why: `its .git file names ${a}, which resolves into the working tree`,
        };
      return (await lstat(join(l, "commondir")).then(
        () => false,
        (error) => isENOENT(error),
      ))
        ? {
            dir: l,
            root: e,
          }
        : {
            why: "its .git file names another worktree",
          };
    }
  }
  if ("skipped" in o)
    return {
      why: o.why,
    };
  let r = await isSameRepository(n, o.gitDir);
  return "refused" in r
    ? {
        why: r.refused,
      }
    : {
        dir: r.gitDir,
        root: n,
      };
}
//@ chunk-2xm1rxms.js:34641-34710 placement
async function fileIdentityOrFalse(held, n, o) {
  return held.lstat(n).then(
    (r) => getFileIdentity(r, o),
    () => false,
  );
}
//@ chunk-2xm1rxms.js:34710-34872 placement
async function hasGitDirOwnFiles(held, n) {
  for (let o of ["objects", "config", "packed-refs", "hooks", "worktrees"])
    if (
      await held.lstat(`${n}/${o}`).then(
        () => true,
        (error) => !isENOENT(error),
      )
    )
      return true;
  return false;
}
//@ chunk-2xm1rxms.js:34872-36944 placement
async function removeHeldWorktree(dir, entryId, o, r) {
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
    let a = `worktrees/${entryId}`;
    if (!(await fileIdentityOrFalse(worktreeBase.held, a, o)))
      throw Error(
        "its folder changed after it was checked, or this volume cannot show it is the same folder",
      );
    if (
      r === "keep" &&
      (await worktreeBase.held.lstat(`worktrees/${entryId}/locked`).then(
        () => true,
        (error) => !isENOENT(error),
      ))
    )
      throw Error("it was locked while the checkout was being deleted");
    let l = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a} has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them, so nothing in it was removed`,
      "the registration entry has a git directory's own files in it, or could not be checked for them",
    );
    if (await hasGitDirOwnFiles(worktreeBase.held, a)) throw l;
    await worktreeBase.held.unlink(`${a}/gitdir`).catch((error) => {
      if (!isENOENT(error)) throw error;
    });
    if (await hasGitDirOwnFiles(worktreeBase.held, a)) {
      logForDebugging(
        `Dropped the registration ${a} in ${dir} (git no longer lists it) but left its folder, which now has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them. git's next \`git worktree prune\` or \`git gc\` deletes that folder whole; move out anything you need first.`,
        {
          level: "warn",
        },
      );
      return false;
    }
    await removeAdminFiles(worktreeBase.held, a, o);
    if (
      await worktreeBase.held.rmdir(a).then(
        () => true,
        (error) => isENOENT(error),
      )
    )
      return true;
    if (!(await fileIdentityOrFalse(worktreeBase.held, a, o))) {
      logForDebugging(
        `Dropped the registration ${a} in ${dir} (git no longer lists it) but left its folder: it changed while it was being emptied`,
        {
          level: "warn",
        },
      );
      return false;
    }
    let u = `${a}.claude-dropped-${randomBytes(4).toString("hex")}`;
    return await worktreeBase.held.rename(a, u).then(
      () => {
        logForDebugging(
          `Dropped the registration ${a} in ${dir}; its folder held files Claude Code does not delete (such as a submodule's git directory), so it was moved to ${u}; git worktree prune removes it`,
          {
            level: "warn",
          },
        );
        return true;
      },
      (error) => {
        logForDebugging(
          `Dropped the registration ${a} in ${dir} (git no longer lists it) but could not move its folder aside (${errorMessage(error)}); git worktree prune removes it`,
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
//@ chunk-2xm1rxms.js:36944-37291 placement
async function dropRegistrationAfter(e, n, dir, entryId) {
  let s = join(dir, "worktrees", entryId);
  if (
    n.outcome === "dropped" ||
    (n.outcome === "none" && (await statWorktreeAdminDir(dir, entryId)) === "absent")
  )
    return {
      outcome: "removed",
    };
  let a = n.outcome === "kept" ? n.reason : `git's record of it at ${s} could not be read`;
  logForDebugging(`Worktree ${e} is gone but git still lists it: ${a}`, {
    level: "warn",
  });
  return {
    outcome: "registration_kept",
    reason: a,
  };
}
//@ chunk-2xm1rxms.js:37291-37538 placement
async function statWorktreeAdminDir(e, n) {
  let worktreeBase = await resolveWorktreeBase(e, "canonical", {
    holdBase: true,
  });
  if (!("held" in worktreeBase)) return null;
  try {
    return await worktreeBase.held.lstat(`worktrees/${n}`).then(
      (r) => ({
        dev: r.dev,
        ino: r.ino,
      }),
      (error) => (isENOENT(error) ? "absent" : null),
    );
  } finally {
    await worktreeBase.held.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:37538-37635 placement
function describeRemovalError(error) {
  return getErrnoCode(error) === "ENOTEMPTY" && !("syscall" in Object(error))
    ? errorMessage(error)
    : (getErrnoCode(error) ?? "an unknown error");
}
//@ chunk-2xm1rxms.js:37635-37673 placement
function samePathKey(e, n) {
  return normalizeCaseForPlatform(e) === normalizeCaseForPlatform(n);
}
//@ chunk-2xm1rxms.js:37673-37718 placement
function isOneOfSamePaths(e, n) {
  return containsSamePath(normalizeCaseForPlatform(e), n.map(normalizeCaseForPlatform));
}
//@ chunk-2xm1rxms.js:37718-37804 placement
function normalizeCaseForPlatform(e) {
  return getPlatform() === "windows" ? e.replace(/^[a-z](?=:)/, (n) => n.toUpperCase()) : e;
}
//@ chunk-2xm1rxms.js:37804-37879 affinity
function isUnderPathWithSeparator(e, n) {
  return e.length > n.length + 1 && samePathKey(e.slice(0, n.length + 1), n + sep);
}
//@ chunk-2xm1rxms.js:37879-37944 affinity
function isPathAtOrUnder(e, n) {
  return e === n || e.startsWith(n.endsWith(sep) ? n : n + sep);
}
//@ chunk-2xm1rxms.js:38224-39569 sole-consumer
/**
 * 把目标路径与仓库根（含真实路径）比较，返回 {base, rel, underRoot}；只在大小写/Unicode 形式上不同时， 非 Windows 且同一文件则接受，否则拒绝并说明。
 */
async function locateUnderRepoRoots(e, n, { parentLinkToRoot: o = false } = {}) {
  let r = stripTrailingSeparators(normalize(n));
  let s = (h, g) =>
    h
      .slice(g.length + 1)
      .split(sep)
      .join("/");
  let a = [];
  let l = [];
  for (let h of e) {
    let g = await realpath(h).catch(() => null);
    a.push(h, ...(g === null ? [] : [g]));
    if (g !== null) l.push(stripTrailingSeparators(g));
  }
  let mapped = a.map((h) => stripTrailingSeparators(normalize(h)));
  for (let h of mapped)
    if (isUnderPathWithSeparator(r, h)) {
      let sliced = r.slice(0, h.length);
      return {
        base: sliced.endsWith(":") ? sliced + sep : sliced,
        rel: s(r, h),
        underRoot: true,
      };
    }
  let c = (h) => foldCaseBasic(h.normalize("NFC"));
  let found = mapped.find((h) => isUnderPathWithSeparator(c(r), c(h)));
  if (found !== undefined) {
    let parts = r.split(sep);
    let g = found.split(sep).length;
    if (getPlatform() !== "windows" && (await getFileIdentity_2(parts.slice(0, g).join(sep), found)))
      return {
        base: found,
        rel: parts.slice(g).join("/"),
        underRoot: true,
      };
    return {
      refused: `${n} spells the repository folder ${found} in another letter case or Unicode form (use the path as git records it)`,
    };
  }
  if (l.length > 0) {
    let parts = r.split(sep);
    let g = null;
    for (let j = 1; j < parts.length - 1; j++) {
      let joined = parts.slice(0, j).join(sep);
      let E = joined === "" || joined.endsWith(":") ? joined + sep : joined;
      let v = await realpath(E).catch(() => null);
      g = v;
      let y = v === null ? null : stripTrailingSeparators(v);
      let A = y === null ? undefined : l.find((P) => samePathKey(y, P));
      if (A !== undefined)
        return {
          base: A,
          rel: parts.slice(j).join("/"),
          underRoot: true,
        };
      if (y !== null && l.some((P) => isPathAtOrUnder(y, P)))
        return {
          refused: `${n} is reached through a link into the repository at ${E}`,
        };
    }
    let b = g === null ? null : join(g, parts.at(-2));
    let T = b === null || !o ? null : await readLinkTargetSafe(b);
    let found = [b, T]
      .flatMap((f) => (f === null ? [] : [f]))
      .map((f) => l.find((p) => samePathKey(f, p)))
      .find((f) => f !== undefined);
    if (found !== undefined)
      return {
        base: found,
        rel: parts.at(-1),
        underRoot: true,
      };
  }
  return splitParentAndName(r);
}
//@ chunk-2xm1rxms.js:39569-39924 sole-consumer
/**
 * 读链接目标，含 . / .. 段时返回 null。
 */
async function readLinkTargetSafe(e) {
  let n = await readlink(e).catch(() => null);
  if (n === null) return null;
  let o = getPlatform() === "windows" && /^\\\\\?\\[A-Za-z]:\\/.test(n);
  if (o && n.includes("/")) return null;
  let r = o ? n.slice(4) : n;
  let parts = r.split(sep === "\\" ? /[\\/]/ : /\//);
  if (
    (isAbsolute(r)
      ? parts
      : parts.slice(
          Math.max(
            0,
            parts.findIndex((l) => l !== ".."),
          ),
        )
    ).some((l) => l === "." || l === "..")
  )
    return null;
  return stripTrailingSeparators(normalize(isAbsolute(r) ? r : join(dirname(e), r)));
}
//@ chunk-2xm1rxms.js:39924-40096 sole-consumer
function splitParentAndName(e) {
  let n = stripTrailingSeparators(normalize(e));
  let root = parse(n).root;
  let index = n.lastIndexOf(sep);
  if (n === root || index === n.length - 1 || index < 0) return null;
  return {
    base: index < root.length ? root : n.slice(0, index),
    rel: n.slice(index + 1),
    underRoot: false,
  };
}
//@ chunk-2xm1rxms.js:40096-40305 placement
async function isRegisteredWorktreeGitdir(e, n, o, r, s) {
  let a = isAbsolute(e) ? [normalize(e)] : n.map((c) => normalize(resolve(c, e)));
  let l = await realpath(o).catch(() => null);
  let mapped = [r, join(o, ".git")]
    .concat(l === null ? [] : [join(l, ".git")])
    .map((c) => join(c, "worktrees", s));
  return a.some((c) => isOneOfSamePaths(c, mapped));
}
//@ chunk-2xm1rxms.js:40305-40468 placement
async function readRegisteredWorktreeName(held, n, o, r, dir) {
  let smallFile = await readSmallFile(held, `${n}/.git`);
  if ("error" in smallFile || smallFile.value === null) return null;
  let l = basename(normalize(smallFile.value));
  return (await isRegisteredWorktreeGitdir(smallFile.value, o, r, dir, l)) ? l : null;
}
//@ chunk-2xm1rxms.js:40468-40632 placement
async function readHandleUpTo(e, n) {
  let o = Buffer.alloc(n + 1);
  let r = 0;
  for (;;) {
    let { bytesRead } = await e.read(o, r, o.length - r, r);
    if (bytesRead === 0) return o.subarray(0, r);
    r += bytesRead;
    if (r > n) return null;
  }
}
//@ chunk-2xm1rxms.js:40632-41063 placement
async function readSmallFile(e, n) {
  let o = {
    value: null,
    bytes: Buffer.alloc(0),
  };
  let r;
  try {
    r = await e.open(n, readOnlyOpenFlags());
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ELOOP" || errnoCode === "EISDIR"
      ? o
      : {
          error: errnoCode ?? errorMessage(error),
        };
  }
  try {
    if (!(await r.stat()).isFile()) return o;
    let handleUpTo = await readHandleUpTo(r, WORKTREE_IO_LIMITS_2);
    if (handleUpTo === null) return o;
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
    await r.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:41063-41383 placement
async function unlinkTracked(
  e,
  n,
  o = {
    deleted: false,
  },
) {
  try {
    await e.unlink(n);
    o.deleted = true;
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return false;
    if (errnoCode !== "EISDIR" && errnoCode !== "EPERM" && errnoCode !== "EACCES") throw error;
    let a = await e.lstat(n).catch(() => null);
    if (a === null || !a.isDirectory()) throw error;
    await e.removeTree(n, {
      onDeleted: () => {
        o.deleted = true;
      },
    });
    return true;
  }
}
//@ chunk-2xm1rxms.js:41383-41995 placement
async function removeWorktreeContents(
  held,
  n,
  bytes,
  r = {
    deleted: false,
  },
  { pointerFirst: s = false } = {},
) {
  if (s) {
    await held.unlink(`${n}/.git`);
    r.deleted = true;
  }
  for (let j = 0; ; j++) {
    let filtered = (await held.list(n)).filter((u) => u !== ".git");
    if (filtered.length === 0) break;
    if (j === WORKTREE_IO_LIMITS) {
      let u = Error("files kept appearing in the worktree while it was being deleted");
      u.code = "ENOTEMPTY";
      throw u;
    }
    if (filtered.some((u) => u.includes("\uFFFD"))) {
      await held.removeTree(n, {
        keep: ".git",
        onDeleted: () => {
          r.deleted = true;
        },
      });
      continue;
    }
    for (let u of filtered) await unlinkTracked(held, `${n}/${u}`, r);
  }
  if (!s) {
    await held.unlink(`${n}/.git`);
    r.deleted = true;
  }
  try {
    await held.removeTree(n);
  } catch (error) {
    if (!s) await held.create(`${n}/.git`, bytes, 420).catch(() => {});
    throw error;
  }
}
export { removeWorktreeSafely, worktreeRemovalText, convertDirectoryToZipInPlace };
