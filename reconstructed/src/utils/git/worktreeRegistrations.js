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
import { join, join as join_2, join as join_3 } from "path";
import { constants, constants as constants_2 } from "fs";
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
  WORKTREE_READ_LIMITS,
  parseGitdirLine,
  loadRepoLayout,
  resolveWorktreePaths,
  verifyAdminEntry,
  pe,
  vetRepoForWorktrees,
  looksLikeGitDir,
  je,
  readUpToBytes,
} from "./worktreeVetting.js";
import { logForDebugging } from "../debug.js";
import { isSentinelInode } from "../slowOperations.js";
import { mMe, READ_LIMITS } from "../fsBoundRead.js";

//@ chunk-2xm1rxms.js:15174-15279 placement
function openFailureText(e) {
  return e === "ELOOP" ? "is a link" : e === "EISDIR" ? "is not a regular file" : "could not be opened";
}
//@ chunk-2xm1rxms.js:15279-15331 placement
function Je(e) {
  return e.replace(/[\r\n]+$/, "") === "";
}
//@ chunk-2xm1rxms.js:15331-16168 placement
function summarizeUncheckedRegistrations(e, n, o) {
  let r = join(e, "worktrees"),
    { unchecked: unchecked, kinds: kinds } = o,
    l = [
      ...(n === null || n.unresolved.length === 0
        ? []
        : [
            `a folder on the way to the worktree could not be resolved safely (${n.unresolved.join("; ")}), so a registration recorded under its resolved path could not be matched`,
          ]),
      ...(o.guessed
        ? [
            `${r} cannot be listed here without following links, so only the names git would have given this worktree were checked, and a registration under another name may remain`,
          ]
        : []),
      ...(unchecked === 0
        ? []
        : [
            o.guessed
              ? `some of the names tried in ${r} could not be checked (${[...kinds].join(", ")}), so one of them may still register this worktree`
              : `${unchecked === 1 ? "one entry" : `${unchecked} entries`} in ${r} could not be checked (${[...kinds].join(", ")}), so ${unchecked === 1 ? "it" : "one of them"} may still register this worktree`,
          ]),
    ];
  return l.length === 0 ? { outcome: "none" } : { unmatched: l.join("; ") };
}
//@ chunk-2xm1rxms.js:16168-16236 placement
function Qe(e, n) {
  return n === null || containsSamePath(De(e), [...n.gitdirs].map(De));
}
//@ chunk-2xm1rxms.js:16236-16322 placement
function De(e) {
  return getPlatform() === "windows" ? e.replace(/^[a-z](?=:)/, (n) => n.toUpperCase()) : e;
}
//@ chunk-2xm1rxms.js:16322-17385 placement
async function findWorktreeRegistrations(e, n, o, r) {
  let s = { guessed: !1, unchecked: 0, kinds: new Set() },
    a =
      "entryId" in o
        ? [o.entryId]
        : await e.list("worktrees").catch((l) => {
            if (isENOENT(l)) return [];
            if (getErrnoCode(l) === "WORKING_LIST_UNSUPPORTED")
              return ((s.guessed = !0), pathVariants(normalizeWorktreePaths(o)));
            throw l;
          });
  for (let l of a) {
    if (!isSafePathSegment(l)) {
      if (!s.guessed) noteUnchecked(s, "an entry name this check cannot read exactly");
      continue;
    }
    let u = `worktrees/${l}`,
      c = await e.lstat(u).catch((b) => (isENOENT(b) ? null : void 0));
    if (c === void 0) {
      noteUnchecked(s, "an entry that could not be inspected");
      continue;
    }
    if (c === null || !c.isDirectory()) {
      if (c?.isSymbolicLink()) noteUnchecked(s, "an entry that is a link");
      else if (c !== null && getPlatform() === "windows") noteUnchecked(s, "an entry that is not a folder");
      continue;
    }
    let w = await openNonBlocking(e, `${u}/gitdir`, WORKTREE_READ_LIMITS);
    if (w === "absent") continue;
    if ("unread" in w) {
      noteUnchecked(s, `a gitdir file that ${w.unread}`);
      continue;
    }
    let h = parseGitdirLine(w.text, join(n, "worktrees", l));
    if (h === null && !Je(w.text)) noteUnchecked(s, "a gitdir file whose path could not be checked safely");
    if (h === null || !Qe(h, r)) continue;
    let g = await e.lstat(`${u}/locked`).then(
      () => !0,
      (b) => !isENOENT(b),
    );
    return { entryId: l, locked: g, recordedGitdir: h, rel: u, identity: { dev: c.dev, ino: c.ino } };
  }
  return s;
}
//@ chunk-2xm1rxms.js:17385-17456 placement
async function safeListRegistrations(e, n) {
  return listRegistrations(e, n).catch((o) => ({ unavailable: errorMessage(o) }));
}
//@ chunk-2xm1rxms.js:17456-17857 placement
async function listRegistrations(e, n) {
  let o = await loadRepoLayout(e, n.repoSpelled);
  if ("refused" in o) return { unavailable: o.refused };
  if ("unavailable" in o) return { unavailable: o.unavailable };
  try {
    let r = await resolveWorktreePaths(n),
      s = await findWorktreeRegistrations(o, e, n, r);
    if ("unchecked" in s) {
      let a = summarizeUncheckedRegistrations(e, r, s);
      return "unmatched" in a ? { unavailable: a.unmatched } : null;
    }
    return { entryId: s.entryId, locked: s.locked, recordedGitdir: s.recordedGitdir };
  } finally {
    await o.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:17857-17922 placement
async function deregisterWorktree(e, n, o) {
  return deregisterWorktreeUnsafe(e, n, o).catch((r) => keepRegistration(e, errorMessage(r)));
}
/**
 * 从仓库 .git/worktrees 中注销 worktree 记录，逐项校验文件类型与路径安全。
 */
//@ chunk-2xm1rxms.js:17922-19771 placement
async function deregisterWorktreeUnsafe(e, n, o) {
  let r = await loadRepoLayout(e, n.repoSpelled);
  if ("refused" in r) return keepRegistration(e, r.refused);
  if ("unavailable" in r) {
    let { modules: modules } = r;
    return r.unavailable === "no_ffi" && modules !== null && modules.host.platform() === "macos"
      ? removeAdminDirNoFollow(e, n, o, await modules.darwinNoFollowAnyEnforced(modules.host))
      : keepRegistration(e, `this build cannot open files here without following links (${r.unavailable})`);
  }
  try {
    let s = await resolveWorktreePaths(n),
      a = await findWorktreeRegistrations(r, e, n, s);
    if ("unchecked" in a) {
      let c = summarizeUncheckedRegistrations(e, s, a);
      return "unmatched" in c ? keepRegistration(e, c.unmatched) : c;
    }
    if (!(await verifyAdminEntry(a.recordedGitdir, n, s)))
      return keepRegistration(
        e,
        `could not confirm the worktree is gone: ${a.recordedGitdir} exists, or a link or unreadable folder is on the way to it`,
      );
    await pe.afterMatch?.(a.entryId);
    let l = async () => {
      let c = await r.lstat(a.rel).catch(() => null);
      return c !== null && getFileIdentity(c, a.identity);
    };
    if (!(await l()))
      return keepRegistration(
        e,
        `worktrees/${a.entryId} changed since it was read, or this volume cannot show it is the same folder`,
      );
    if (await Be(r, a.rel))
      return keepRegistration(e, `${adminDirHasGitFilesMessage(a.entryId)}, so nothing in it was removed`);
    if (a.locked) {
      if (!(await maybeUnlockRegistration(r, a.rel, o.locked)))
        return keepRegistration(e, `worktrees/${a.entryId} is locked`);
    }
    if ((await pe.beforeMutation?.(a.entryId), await r.unlink(`${a.rel}/gitdir`), !(await l())))
      return { outcome: "dropped", entryId: a.entryId, adminRemoved: !1 };
    if (await Be(r, a.rel))
      return (
        logForDebugging(
          `Dropped the registration worktrees/${a.entryId} in ${e} (git no longer lists it) but left its folder, which now has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them. git's next \`git worktree prune\` or \`git gc\` deletes that folder whole; move out anything you need first.`,
          { level: "warn" },
        ),
        { outcome: "dropped", entryId: a.entryId, adminRemoved: !1 }
      );
    let u = await dropRegistrationDir(r, a.rel, a.identity);
    return (
      await r.rmdir("worktrees").catch(() => {}),
      { outcome: "dropped", entryId: a.entryId, adminRemoved: u }
    );
  } catch (error) {
    return keepRegistration(e, errorMessage(error));
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:19771-19994 placement
async function pruneWorktreeRegistration(e, n, o = { locked: "keep" }) {
  let r = await vetRepoForWorktrees(e);
  return r === null
    ? keepRegistration(
        e,
        'the repository could not be vetted (see the "Could not vet the worktree registrations" line above)',
      )
    : deregisterWorktree(r, { worktreePath: n, repoSpelled: e }, o);
}
//@ chunk-2xm1rxms.js:19994-20119 placement
function keepRegistration(e, n) {
  return (
    logForDebugging(`Left a git worktree registration in ${e} in place: ${n}`, { level: "warn" }),
    { outcome: "kept", reason: n }
  );
}
//@ chunk-2xm1rxms.js:20119-20650 placement
var WORKTREE_ADMIN_FILES = [
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
  ],
  Ct = ["refs/bisect", "refs/worktree", "refs/rewritten", "refs", "logs", "info"];
//@ chunk-2xm1rxms.js:20650-20746 placement
function Be(e, n) {
  return looksLikeGitDir((o) =>
    e.lstat(`${n}/${o}`).catch((r) => {
      if (isENOENT(r)) return null;
      throw r;
    }),
  );
}
//@ chunk-2xm1rxms.js:20746-20907 placement
function adminDirHasGitFilesMessage(e) {
  return `worktrees/${e} has a git directory's own files (objects, config, packed-refs, hooks or worktrees) in it, or could not be checked for them`;
}
//@ chunk-2xm1rxms.js:20907-21068 placement
async function dropRegistrationDir(e, n, o) {
  return (
    await removeAdminFiles(e, n, o),
    e.rmdir(n).then(
      () => !0,
      (r) => (
        logForDebugging(`Dropped the registration ${n} but left its folder: ${errorMessage(r)}`, {
          level: "warn",
        }),
        !1
      ),
    )
  );
}
//@ chunk-2xm1rxms.js:21068-21162 placement = getFileIdentity (0.794)
function getFileIdentity(e, n) {
  return e.isDirectory() && e.dev !== 0n && !isSentinelInode(e.ino) && e.dev === n.dev && e.ino === n.ino;
}
//@ chunk-2xm1rxms.js:21162-21318 placement
async function removeAdminFiles(e, n, o) {
  for (let r of WORKTREE_ADMIN_FILES) await e.unlink(`${n}/${r}`).catch(() => {});
  await removeAdminDir(e, n, o);
  for (let r of Ct) await e.rmdir(`${n}/${r}`).catch(() => {});
}
//@ chunk-2xm1rxms.js:21318-21492 placement
var REFTABLE_FILE_RE =
    /^(?:tables\.list(?:\.lock)?|0x[0-9a-f]{12,16}-0x[0-9a-f]{12,16}-[0-9a-f]{8}\.(?:(?:ref|log)(?:\.lock)?|temp\.[A-Za-z0-9]{6}))$/,
  MAX_ADMIN_ENTRIES = 1024,
  REFS_HEADS = "refs/heads",
  REFTABLE = "reftable";
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
        .catch((w) => (getErrnoCode(w) === "WORKING_LIST_UNSUPPORTED" ? a.list("").catch(() => null) : null));
      if (c === null) return;
      for (let w of c) if (REFTABLE_FILE_RE.test(w)) await a.unlink(w).catch(() => {});
    } finally {
      await a.close().catch(() => {});
    }
    (await r.unlink(REFS_HEADS).catch(() => {}), await r.rmdir(REFTABLE).catch(() => {}));
  } finally {
    await r.close().catch(() => {});
  }
}
//@ chunk-2xm1rxms.js:22262-22491 placement
async function maybeUnlockRegistration(e, n, o) {
  if (o === "drop") return !0;
  if (o === "keep") return !1;
  let r = await openNonBlocking(e, `${n}/locked`, je);
  if (r === "absent" || "unread" in r || !o.unlockIf(r.text.replace(/[\r\n]+$/, ""))) return !1;
  return (await e.unlink(`${n}/locked`), !0);
}
//@ chunk-2xm1rxms.js:22491-24522 placement
async function removeAdminDirNoFollow(e, n, o, r) {
  if (!r)
    return keepRegistration(
      e,
      "this macOS version does not enforce O_NOFOLLOW_ANY, so links cannot be refused",
    );
  let s = await resolveWorktreePaths(n),
    a = "entryId" in n ? [n.entryId] : pathVariants(normalizeWorktreePaths(n)),
    l = { guessed: !("entryId" in n), unchecked: 0, kinds: new Set() },
    u = constants.O_NONBLOCK | mMe | READ_LIMITS;
  for (let w of a) {
    if (!isSafePathSegment(w)) {
      if (!l.guessed) noteUnchecked(l, "an entry name this check cannot read exactly");
      continue;
    }
    let h = join(e, "worktrees", w),
      g = await open(join(h, "gitdir"), constants.O_RDWR | u).catch((b) => getErrnoCode(b) ?? "EIO");
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
      let T = await readUpToBytes(g, WORKTREE_READ_LIMITS),
        m = T === null ? null : parseGitdirLine(T, h);
      if (T === null) noteUnchecked(l, "a gitdir file that is larger than git writes");
      else if (m === null && !Je(T)) noteUnchecked(l, "a gitdir file whose path could not be checked safely");
      if (m === null || !Qe(m, s)) continue;
      let f = await open(join(h, "locked"), constants.O_RDONLY | u).catch((p) =>
        isENOENT(p) ? null : void 0,
      );
      if (f !== null) {
        let p = await f?.stat().catch(() => null),
          E = f !== void 0 && p?.isFile() === !0 ? await readUpToBytes(f, je).catch(() => null) : null;
        if (
          (await f?.close().catch(() => {}),
          E === null ||
            o.locked === "keep" ||
            (o.locked !== "drop" && !o.locked.unlockIf(E.replace(/[\r\n]+$/, ""))))
        )
          return keepRegistration(e, `worktrees/${w} is locked`);
      }
      if (!(await verifyAdminEntry(m, n, s)))
        return keepRegistration(
          e,
          `could not confirm the worktree is gone: ${m} exists, or a link or unreadable folder is on the way to it`,
        );
      if (
        await looksLikeGitDir(async (p) => {
          let E = await open(join(h, p), constants.O_RDONLY | u).catch((v) => {
            if (isENOENT(v)) return null;
            throw v;
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
      return (
        await pe.beforeMutation?.(w),
        await g.truncate(0),
        { outcome: "dropped", entryId: w, adminRemoved: !1 }
      );
    } catch (error) {
      return keepRegistration(e, errorMessage(error));
    } finally {
      await g.close().catch(() => {});
    }
  }
  let c = summarizeUncheckedRegistrations(e, s, l);
  return "unmatched" in c ? keepRegistration(e, c.unmatched) : c;
}
//@ chunk-2xm1rxms.js:24800-24826 placement
var WORKTREE_IO_LIMITS = 65536,
  Jt = 3,
  nt = null;
//@ chunk-2xm1rxms.js:24826-25013 placement
function loadNativeFsHelpers() {
  return (nt ??= Promise.all([import("./chunk-ejkghqj9.js"), import("./chunk-78kn47sp.js")])
    .then(([e, n]) => ({ tree: e, host: n.createDeviceTreeHost() }))
    .catch((e) => {
      throw ((nt = null), e);
    }));
}
//@ chunk-2xm1rxms.js:25013-25085 placement
function readOnlyOpenFlags() {
  return getPlatform() === "windows" ? constants_2.O_RDONLY : constants_2.O_RDONLY | constants_2.O_NONBLOCK;
}

export {
  openFailureText,
  safeListRegistrations,
  deregisterWorktree,
  loadNativeFsHelpers,
  getFileIdentity,
  removeAdminFiles,
  readOnlyOpenFlags,
  WORKTREE_IO_LIMITS,
  Jt,
  pruneWorktreeRegistration,
};
