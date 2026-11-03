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
import {
  join,
  join as join_2,
  join as join_3,
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  basename,
  basename as basename_2,
  parse,
  parse as parse_2,
  sep,
  sep as sep_2,
  sep as sep_3,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
} from "path";
import {
  rm,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  access,
  readlink,
  readlink as readlink_2,
} from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { randomBytes } from "crypto";
import {
  safeListRegistrations,
  deregisterWorktree,
  loadNativeFsHelpers,
  getFileIdentity,
  removeAdminFiles,
  readOnlyOpenFlags,
  WORKTREE_IO_LIMITS,
  Jt,
} from "./worktreeRegistrations.js";
import {
  isENOENT,
  getErrnoCode,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { logForDebugging } from "../debug.js";
import { getPlatform } from "../platform.js";
import { Tc, Cp, normalizeCaseForPlatform, containsSamePath } from "../pathIdentity.js";
import { vetWorktree, isSameRepository } from "./worktreeVetting.js";
import { findCanonicalGitRootUncached } from "../git.js";
import { refreshGitDir } from "./gitFilesystem.js";
import { getFileIdentity_2 } from "../markdownConfigLoader.js";

/**
 * 安全删除 git worktree：校验目录、注销记录、处理锁定与二次强制，不跟随符号链接。
 */
//@ chunk-2xm1rxms.js:25085-27973 placement
async function removeWorktreeSafely(
  e,
  n,
  {
    forceTwice: o = !1,
    git: r,
    trustedRoot: s,
    resolveAboveParent: a = !1,
    deregisterIfStopped: l = !1,
    pointerFirst: u = !1,
  } = {},
) {
  let c = await locateUnderRepoRoots(s === void 0 ? [e] : [e, s], n, { parentLinkToRoot: a });
  if (c === null) return { outcome: "refused", reason: `${n} has no parent directory` };
  if ("refused" in c) return { outcome: "refused", reason: c.refused };
  let { base: base, rel: rel, underRoot: underRoot } = c,
    b = r ?? (await inspectWorktreeDir(e));
  if ("why" in b)
    return {
      outcome: "refused",
      reason: `the repository's git directory failed its safety checks (${b.why})`,
    };
  let dir = b.dir,
    m = await resolveWorktreeBase(base, underRoot ? "root" : a ? "not_a_link" : "canonical");
  if (!("held" in m)) return m.outcome === "unanchored" ? m : { outcome: "refused", reason: m.reason };
  let { held: held, realBase: realBase } = m;
  try {
    let E = await held.lstat(rel).then(
      (_) => _.isDirectory(),
      () => !1,
    );
    if (
      E &&
      (await held.list(rel).then(
        () => !1,
        (_) => Se(_),
      ))
    )
      return { outcome: "unanchored", reason: "no_descriptor_listing" };
    let v = underRoot || a ? [n, join_3(realBase, ...rel.split("/"))] : [n],
      y = await safeListRegistrations(dir, { worktreePath: v, repoSpelled: b.root });
    if (E && y !== null && !("unavailable" in y)) {
      let _ = await readRegisteredWorktreeName(held, rel, [n, join_3(realBase, ...rel.split("/"))], e, dir);
      if (_ !== null && _ !== y.entryId) {
        let X = await safeListRegistrations(dir, { entryId: _, worktreePath: v, repoSpelled: b.root });
        if (X !== null && !("unavailable" in X)) y = X;
      }
    }
    if (y !== null && "unavailable" in y)
      return {
        outcome: "refused",
        reason: `git's records of worktrees in ${dir} could not be checked safely (${y.unavailable})`,
      };
    if (y === null) return { outcome: "not_registered" };
    if (
      !underRoot &&
      !ut(
        y.recordedGitdir,
        [n, join_3(realBase, ...rel.split("/"))].map((_) => join_3(normalize_3(_), ".git")),
      )
    )
      return {
        outcome: "refused",
        reason: `the folder holding ${n} resolved to a different place while it was being checked (a link may have been swapped in)`,
      };
    if (y.locked && !o) return { outcome: "locked" };
    let A = o ? "drop" : "keep",
      P = await held.lstat(rel).then(
        (_) => _,
        (_) => ({ error: _ }),
      );
    if (
      "error" in P &&
      isENOENT(P.error) &&
      (await held.lstat(nn(rel)).then(
        (_) => _.isDirectory(),
        () => !1,
      ))
    )
      return dropRegistrationAfter(
        n,
        await deregisterWorktree(dir, { entryId: y.entryId, repoSpelled: b.root }, { locked: A }),
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
    let G = await readSmallFile(held, `${rel}/.git`);
    if ("error" in G)
      return { outcome: "refused", reason: `the .git file in ${n} could not be read (${G.error})` };
    if (
      G.value === null ||
      !(await isRegisteredWorktreeGitdir(
        G.value,
        [n, join_3(realBase, ...rel.split("/"))],
        e,
        dir,
        y.entryId,
      ))
    )
      return { outcome: "not_pointing_back" };
    let V = l ? await statWorktreeAdminDir(dir, y.entryId) : null,
      j = typeof V === "object" ? V : null,
      D = { deleted: !1 };
    try {
      await removeWorktreeContents(held, rel, G.bytes, D, { pointerFirst: u });
    } catch (error) {
      if (!D.deleted && Se(error)) return { outcome: "unanchored", reason: "no_descriptor_listing" };
      let X = un(error);
      logForDebugging(`Worktree checkout ${n} not fully deleted: ${errorMessage(error)}`, { level: "warn" });
      let kt = j !== null && D.deleted && (await removeHeldWorktree(dir, y.entryId, j, A));
      return { outcome: "delete_failed", reason: X, started: D.deleted, deregistered: kt };
    }
    return dropRegistrationAfter(
      n,
      await deregisterWorktree(dir, { entryId: y.entryId, repoSpelled: b.root }, { locked: A }),
      dir,
      y.entryId,
    );
  } finally {
    await held.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:27973-28767 placement
async function vetWorktreeForRemoval(e, n, { rootIsCanonical: o = !1 } = {}) {
  let r = n === void 0 ? splitParentAndName(e) : await locateUnderRepoRoots([n], e);
  if (r === null)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${e} has no parent directory`,
      "the path to delete has no parent directory",
    );
  if ("refused" in r)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      r.refused,
      "the path to delete reaches its root by a spelling that cannot be checked safely",
    );
  let s = await resolveWorktreeBase(
    r.base,
    n === void 0 || !r.underRoot ? "not_a_link" : o ? "canonical" : "root",
  );
  if (!("held" in s)) {
    if (s.outcome === "unanchored") return { unanchored: s.reason };
    if (s.absent === !0) return "absent";
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `could not open the directory above ${e}: ${s.reason}`,
      "the directory above the path to delete could not be opened",
    );
  }
  try {
    return (await unlinkTracked(s.held, r.rel)) ? "deleted" : "absent";
  } catch (error) {
    if (Se(error)) return { unanchored: "no_descriptor_listing" };
    throw error;
  } finally {
    await s.held.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:28767-28869 placement = convertDirectoryToZipInPlace (1)
async function convertDirectoryToZipInPlace(e, n, o = {}) {
  if (typeof (await vetWorktreeForRemoval(e, n, o)) === "object") await rm(e, { recursive: !0, force: !0 });
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
      if (e.reason === rt) return `${rt}; try removing it again once nothing is writing to it`;
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
var rt = "files kept appearing in the worktree while it was being deleted";
//@ chunk-2xm1rxms.js:30498-30554 placement
function Se(e) {
  return getErrnoCode(e) === "WORKING_LIST_UNSUPPORTED";
}
//@ chunk-2xm1rxms.js:30554-30625 placement
function nn(e) {
  return e.includes("/") ? e.slice(0, e.lastIndexOf("/")) : "";
}
//@ chunk-2xm1rxms.js:30625-32547 placement
async function resolveWorktreeBase(e, n, { holdBase: o = !1 } = {}) {
  let r = (f, p = !1) => ({ outcome: "refused", reason: f, absent: p }),
    a = await (async () => {
      if (n === "root") return realpath_3(e);
      let f = join_3(await realpath_3(dirname_3(e)), basename_2(e));
      return n === "not_a_link" && getPlatform() !== "windows" && (await isRootOwnedLinkChain(f))
        ? realpath_3(f)
        : f;
    })().catch((f) => (isENOENT(f) ? void 0 : getErrnoCode(f) === "ELOOP" ? "link" : null));
  if (a === "link") return r(`${e} is a link, or its spelling differs from the one on disk`);
  if (a === void 0 || a === null) return r(`${e} does not exist or cannot be read`, a === void 0);
  if (n === "canonical" && !samePathKey(a, e))
    return r(
      `${e} is reached through a link, or its spelling differs from the one on disk (it resolves to ${a})`,
    );
  let root = parse_2(a).root,
    u = getPlatform() === "windows" || o ? a : await walkPathComponents(a);
  if (u === null) return r(`a directory above ${e} cannot be read`);
  let c = await loadNativeFsHelpers().catch((f) => ({ failed: errorMessage(f) }));
  if ("failed" in c) return r(`${e} could not be opened safely (${c.failed})`);
  let { tree: tree, host: host } = c,
    g = await tree
      .openTreeAnchor(host, { gitRoot: u, realRoot: u })
      .catch((f) => ({ failed: errorMessage(f), code: getErrnoCode(f) }));
  if ("failed" in g) {
    let f = u === a;
    return f && g.code === "ENOENT"
      ? r(`${e} does not exist`, !0)
      : f && (g.code === "ELOOP" || g.code === "ENOTDIR")
        ? r(`${e} is a link, or changed while it was being opened`)
        : f && g.code === "WORKING_ROOT_NOT_CANONICAL"
          ? r(`${e} is reached through a link, or its spelling differs from the one on disk`)
          : r(`${e} could not be opened safely (${g.failed})`);
  }
  if ("unavailable" in g) {
    let unavailableReason = tree.getUnavailableReason(await tree.checkAnchoring(root, { host: host })),
      p =
        unavailableReason === "no_ffi" ||
        (unavailableReason === "remote_volume" && (n !== "not_a_link" || (await isSameVolumeRoot(e, root))));
    return unavailableReason !== null && (getPlatform() !== "windows" || p)
      ? { outcome: "unanchored", reason: unavailableReason }
      : r(`${e} could not be opened safely (${g.unavailable})`);
  }
  let b = u === a ? "" : a.slice(Tc(u).length).split(sep_3).filter(Boolean).join("/"),
    T = scopedFs(g, b),
    m = await T.lstat("").then(
      (f) => f,
      (f) => ({ error: f }),
    );
  if ("error" in m || !m.isDirectory())
    return (
      await g.close().catch(() => {}),
      "error" in m && isENOENT(m.error)
        ? r(`${e} does not exist`, !0)
        : r(`${e} is a link, or changed while it was being opened`)
    );
  return { held: T, realBase: a };
}
//@ chunk-2xm1rxms.js:32547-32875 placement
async function walkPathComponents(e) {
  let root = parse_2(e).root,
    filtered = e.slice(root.length).split(sep_3).filter(Boolean),
    r = root,
    s = root,
    a = !1;
  for (let l of filtered) {
    let u = await probeAccess(s, constants_2.R_OK),
      c = await probeAccess(s, constants_2.W_OK);
    if (u === null || c === null) return null;
    if (!u) {
      let w = await lstat_3(s).then(
        (h) => h.uid,
        () => null,
      );
      if (w === null || w === process.getuid?.() || c || a) return null;
      r = join_3(s, l);
    }
    ((a ||= c), (s = join_3(s, l)));
  }
  return r;
}
//@ chunk-2xm1rxms.js:32875-32986 placement
async function isSameVolumeRoot(e, n) {
  let o = await realpath_3(parse_2(e).root).catch(() => null);
  return o !== null && Cp(Tc(parse_2(o).root)) === Cp(Tc(n));
}
//@ chunk-2xm1rxms.js:32986-33096 placement
async function probeAccess(e, n) {
  return access(e, n).then(
    () => !0,
    (o) => (["EACCES", "EPERM", "EROFS"].includes(getErrnoCode(o) ?? "") ? !1 : null),
  );
}
//@ chunk-2xm1rxms.js:33096-33316 placement
async function isRootOwnedLinkChain(e) {
  let n = await lstat_3(e).catch(() => null);
  if (n === null || !n.isSymbolicLink()) return !1;
  for (let o = dirname_3(e); ; o = dirname_3(o)) {
    if (
      (await lstat_3(o).then(
        (s) => s.uid,
        () => null,
      )) !== 0 ||
      (await probeAccess(o, constants_2.W_OK)) !== !1
    )
      return !1;
    if (dirname_3(o) === o) return !0;
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
  let n = e,
    o = await vetWorktree(e, { dotGitLink: "vet" });
  if ("skipped" in o && o.skipped === "pointer") {
    let s = findCanonicalGitRootUncached(e);
    if (s !== null && s !== e) ((n = s), (o = await vetWorktree(s, { dotGitLink: "vet" })));
    else {
      let a = await refreshGitDir(e);
      if (a === null) return { why: "its .git file names no usable git directory" };
      if ("refused" in (await isSameRepository(e, a)))
        return {
          why: `its .git file names ${a}, which is inside the working tree, or could not be checked against it`,
        };
      let [l, u] = await Promise.all([a, e].map((w) => realpath_3(w).catch(() => null)));
      if (l == null || u == null)
        return {
          why:
            l == null
              ? `its .git file names ${a}, which does not exist or cannot be resolved`
              : "the repository root cannot be resolved",
        };
      if (ft(normalizeCaseForPlatform(l), normalizeCaseForPlatform(u)))
        return { why: `its .git file names ${a}, which resolves into the working tree` };
      return (await lstat_3(join_3(l, "commondir")).then(
        () => !1,
        (w) => isENOENT(w),
      ))
        ? { dir: l, root: e }
        : { why: "its .git file names another worktree" };
    }
  }
  if ("skipped" in o) return { why: o.why };
  let r = await isSameRepository(n, o.gitDir);
  return "refused" in r ? { why: r.refused } : { dir: r.gitDir, root: n };
}
//@ chunk-2xm1rxms.js:34641-34710 placement
async function it(e, n, o) {
  return e.lstat(n).then(
    (r) => getFileIdentity(r, o),
    () => !1,
  );
}
//@ chunk-2xm1rxms.js:34710-34872 placement
async function hasGitDirOwnFiles(e, n) {
  for (let o of ["objects", "config", "packed-refs", "hooks", "worktrees"])
    if (
      await e.lstat(`${n}/${o}`).then(
        () => !0,
        (s) => !isENOENT(s),
      )
    )
      return !0;
  return !1;
}
//@ chunk-2xm1rxms.js:34872-36944 placement
async function removeHeldWorktree(e, n, o, r) {
  let s = await resolveWorktreeBase(e, "canonical", { holdBase: !0 });
  if (!("held" in s))
    return (logForDebugging(`Kept the registration ${n} in ${e}: ${s.reason}`, { level: "warn" }), !1);
  try {
    let a = `worktrees/${n}`;
    if (!(await it(s.held, a, o)))
      throw Error(
        "its folder changed after it was checked, or this volume cannot show it is the same folder",
      );
    if (
      r === "keep" &&
      (await s.held.lstat(`worktrees/${n}/locked`).then(
        () => !0,
        (c) => !isENOENT(c),
      ))
    )
      throw Error("it was locked while the checkout was being deleted");
    let l = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${a} has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them, so nothing in it was removed`,
      "the registration entry has a git directory's own files in it, or could not be checked for them",
    );
    if (await hasGitDirOwnFiles(s.held, a)) throw l;
    if (
      (await s.held.unlink(`${a}/gitdir`).catch((c) => {
        if (!isENOENT(c)) throw c;
      }),
      await hasGitDirOwnFiles(s.held, a))
    )
      return (
        logForDebugging(
          `Dropped the registration ${a} in ${e} (git no longer lists it) but left its folder, which now has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them. git's next \`git worktree prune\` or \`git gc\` deletes that folder whole; move out anything you need first.`,
          { level: "warn" },
        ),
        !1
      );
    if (
      (await removeAdminFiles(s.held, a, o),
      await s.held.rmdir(a).then(
        () => !0,
        (c) => isENOENT(c),
      ))
    )
      return !0;
    if (!(await it(s.held, a, o)))
      return (
        logForDebugging(
          `Dropped the registration ${a} in ${e} (git no longer lists it) but left its folder: it changed while it was being emptied`,
          { level: "warn" },
        ),
        !1
      );
    let u = `${a}.claude-dropped-${randomBytes(4).toString("hex")}`;
    return await s.held.rename(a, u).then(
      () => (
        logForDebugging(
          `Dropped the registration ${a} in ${e}; its folder held files Claude Code does not delete (such as a submodule's git directory), so it was moved to ${u}; git worktree prune removes it`,
          { level: "warn" },
        ),
        !0
      ),
      (c) => (
        logForDebugging(
          `Dropped the registration ${a} in ${e} (git no longer lists it) but could not move its folder aside (${errorMessage(c)}); git worktree prune removes it`,
          { level: "warn" },
        ),
        !1
      ),
    );
  } catch (error) {
    return (
      logForDebugging(`Kept the registration ${n} in ${e}: ${errorMessage(error)}`, { level: "warn" }),
      !1
    );
  } finally {
    await s.held.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:36944-37291 placement
async function dropRegistrationAfter(e, n, o, r) {
  let s = join_3(o, "worktrees", r);
  if (n.outcome === "dropped" || (n.outcome === "none" && (await statWorktreeAdminDir(o, r)) === "absent"))
    return { outcome: "removed" };
  let a = n.outcome === "kept" ? n.reason : `git's record of it at ${s} could not be read`;
  return (
    logForDebugging(`Worktree ${e} is gone but git still lists it: ${a}`, { level: "warn" }),
    { outcome: "registration_kept", reason: a }
  );
}
//@ chunk-2xm1rxms.js:37291-37538 placement
async function statWorktreeAdminDir(e, n) {
  let o = await resolveWorktreeBase(e, "canonical", { holdBase: !0 });
  if (!("held" in o)) return null;
  try {
    return await o.held.lstat(`worktrees/${n}`).then(
      (r) => ({ dev: r.dev, ino: r.ino }),
      (r) => (isENOENT(r) ? "absent" : null),
    );
  } finally {
    await o.held.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:37538-37635 placement
function un(e) {
  return getErrnoCode(e) === "ENOTEMPTY" && !("syscall" in Object(e))
    ? errorMessage(e)
    : (getErrnoCode(e) ?? "an unknown error");
}
//@ chunk-2xm1rxms.js:37635-37673 placement
function samePathKey(e, n) {
  return se(e) === se(n);
}
//@ chunk-2xm1rxms.js:37673-37718 placement
function ut(e, n) {
  return containsSamePath(se(e), n.map(se));
}
//@ chunk-2xm1rxms.js:37718-37804 placement
function se(e) {
  return getPlatform() === "windows" ? e.replace(/^[a-z](?=:)/, (n) => n.toUpperCase()) : e;
}
//@ chunk-2xm1rxms.js:37804-37879 affinity
function at(e, n) {
  return e.length > n.length + 1 && samePathKey(e.slice(0, n.length + 1), n + sep_3);
}
//@ chunk-2xm1rxms.js:37879-37944 affinity
function ft(e, n) {
  return e === n || e.startsWith(n.endsWith(sep_3) ? n : n + sep_3);
}
/**
 * 把目标路径与仓库根（含真实路径）比较，返回 {base, rel, underRoot}；只在大小写/Unicode 形式上不同时， 非 Windows 且同一文件则接受，否则拒绝并说明。
 */
//@ chunk-2xm1rxms.js:38224-39569 sole-consumer
async function locateUnderRepoRoots(e, n, { parentLinkToRoot: o = !1 } = {}) {
  let r = Tc(normalize_3(n)),
    s = (h, g) =>
      h
        .slice(g.length + 1)
        .split(sep_3)
        .join("/"),
    a = [],
    l = [];
  for (let h of e) {
    let g = await realpath_3(h).catch(() => null);
    if ((a.push(h, ...(g === null ? [] : [g])), g !== null)) l.push(Tc(g));
  }
  let mapped = a.map((h) => Tc(normalize_3(h)));
  for (let h of mapped)
    if (at(r, h)) {
      let sliced = r.slice(0, h.length);
      return { base: sliced.endsWith(":") ? sliced + sep_3 : sliced, rel: s(r, h), underRoot: !0 };
    }
  let c = (h) => Cp(h.normalize("NFC")),
    found = mapped.find((h) => at(c(r), c(h)));
  if (found !== void 0) {
    let parts = r.split(sep_3),
      g = found.split(sep_3).length;
    if (getPlatform() !== "windows" && (await getFileIdentity_2(parts.slice(0, g).join(sep_3), found)))
      return { base: found, rel: parts.slice(g).join("/"), underRoot: !0 };
    return {
      refused: `${n} spells the repository folder ${found} in another letter case or Unicode form (use the path as git records it)`,
    };
  }
  if (l.length > 0) {
    let parts = r.split(sep_3),
      g = null;
    for (let f = 1; f < parts.length - 1; f++) {
      let joined = parts.slice(0, f).join(sep_3),
        E = joined === "" || joined.endsWith(":") ? joined + sep_3 : joined,
        v = await realpath_3(E).catch(() => null);
      g = v;
      let y = v === null ? null : Tc(v),
        A = y === null ? void 0 : l.find((P) => samePathKey(y, P));
      if (A !== void 0) return { base: A, rel: parts.slice(f).join("/"), underRoot: !0 };
      if (y !== null && l.some((P) => ft(y, P)))
        return { refused: `${n} is reached through a link into the repository at ${E}` };
    }
    let b = g === null ? null : join_3(g, parts.at(-2)),
      T = b === null || !o ? null : await readLinkTargetSafe(b),
      found = [b, T]
        .flatMap((f) => (f === null ? [] : [f]))
        .map((f) => l.find((p) => samePathKey(f, p)))
        .find((f) => f !== void 0);
    if (found !== void 0) return { base: found, rel: parts.at(-1), underRoot: !0 };
  }
  return splitParentAndName(r);
}
/**
 * 读链接目标，含 . / .. 段时返回 null。
 */
//@ chunk-2xm1rxms.js:39569-39924 sole-consumer
async function readLinkTargetSafe(e) {
  let n = await readlink_2(e).catch(() => null);
  if (n === null) return null;
  let o = getPlatform() === "windows" && /^\\\\\?\\[A-Za-z]:\\/.test(n);
  if (o && n.includes("/")) return null;
  let r = o ? n.slice(4) : n,
    parts = r.split(sep_3 === "\\" ? /[\\/]/ : /\//);
  if (
    (isAbsolute_3(r)
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
  return Tc(normalize_3(isAbsolute_3(r) ? r : join_3(dirname_3(e), r)));
}
//@ chunk-2xm1rxms.js:39924-40096 sole-consumer
function splitParentAndName(e) {
  let n = Tc(normalize_3(e)),
    root = parse_2(n).root,
    index = n.lastIndexOf(sep_3);
  if (n === root || index === n.length - 1 || index < 0) return null;
  return { base: index < root.length ? root : n.slice(0, index), rel: n.slice(index + 1), underRoot: !1 };
}
//@ chunk-2xm1rxms.js:40096-40305 placement
async function isRegisteredWorktreeGitdir(e, n, o, r, s) {
  let a = isAbsolute_3(e) ? [normalize_3(e)] : n.map((c) => normalize_3(resolve_3(c, e))),
    l = await realpath_3(o).catch(() => null),
    mapped = [r, join_3(o, ".git")]
      .concat(l === null ? [] : [join_3(l, ".git")])
      .map((c) => join_3(c, "worktrees", s));
  return a.some((c) => ut(c, mapped));
}
//@ chunk-2xm1rxms.js:40305-40468 placement
async function readRegisteredWorktreeName(e, n, o, r, s) {
  let a = await readSmallFile(e, `${n}/.git`);
  if ("error" in a || a.value === null) return null;
  let l = basename_2(normalize_3(a.value));
  return (await isRegisteredWorktreeGitdir(a.value, o, r, s, l)) ? l : null;
}
//@ chunk-2xm1rxms.js:40468-40632 placement
async function readHandleUpTo(e, n) {
  let alloc = Buffer.alloc(n + 1),
    r = 0;
  for (;;) {
    let { bytesRead: bytesRead } = await e.read(alloc, r, alloc.length - r, r);
    if (bytesRead === 0) return alloc.subarray(0, r);
    if (((r += bytesRead), r > n)) return null;
  }
}
//@ chunk-2xm1rxms.js:40632-41063 placement
async function readSmallFile(e, n) {
  let o = { value: null, bytes: Buffer.alloc(0) },
    r;
  try {
    r = await e.open(n, readOnlyOpenFlags());
  } catch (error) {
    let a = getErrnoCode(error);
    return a === "ENOENT" || a === "ELOOP" || a === "EISDIR" ? o : { error: a ?? errorMessage(error) };
  }
  try {
    if (!(await r.stat()).isFile()) return o;
    let s = await readHandleUpTo(r, WORKTREE_IO_LIMITS);
    if (s === null) return o;
    let match = /^gitdir: ([^\r\n]+)[\r\n]*$/.exec(s.toString("utf8"));
    return { value: match ? match[1] : null, bytes: s };
  } catch (error) {
    return { error: getErrnoCode(error) ?? errorMessage(error) };
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:41063-41383 placement
async function unlinkTracked(e, n, o = { deleted: !1 }) {
  try {
    return (await e.unlink(n), (o.deleted = !0), !0);
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "ENOENT") return !1;
    if (s !== "EISDIR" && s !== "EPERM" && s !== "EACCES") throw error;
    let a = await e.lstat(n).catch(() => null);
    if (a === null || !a.isDirectory()) throw error;
    return (
      await e.removeTree(n, {
        onDeleted: () => {
          o.deleted = !0;
        },
      }),
      !0
    );
  }
}
//@ chunk-2xm1rxms.js:41383-41995 placement
async function removeWorktreeContents(e, n, o, r = { deleted: !1 }, { pointerFirst: s = !1 } = {}) {
  if (s) (await e.unlink(`${n}/.git`), (r.deleted = !0));
  for (let a = 0; ; a++) {
    let filtered = (await e.list(n)).filter((u) => u !== ".git");
    if (filtered.length === 0) break;
    if (a === Jt) {
      let u = Error("files kept appearing in the worktree while it was being deleted");
      throw ((u.code = "ENOTEMPTY"), u);
    }
    if (filtered.some((u) => u.includes("\uFFFD"))) {
      await e.removeTree(n, {
        keep: ".git",
        onDeleted: () => {
          r.deleted = !0;
        },
      });
      continue;
    }
    for (let u of filtered) await unlinkTracked(e, `${n}/${u}`, r);
  }
  if (!s) (await e.unlink(`${n}/.git`), (r.deleted = !0));
  try {
    await e.removeTree(n);
  } catch (error) {
    if (!s) await e.create(`${n}/.git`, o, 420).catch(() => {});
    throw error;
  }
}

export { removeWorktreeSafely, worktreeRemovalText, convertDirectoryToZipInPlace };
