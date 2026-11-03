/**
 * selfHostedRunner/git/sessionWorktrees.ts
 *
 * BYOC 会话工作树添加与删除（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (7)
 * attribution: placement 7
 */
import { dirname, resolve, basename, sep, join } from "path";
import { writeFile, realpath, lstat } from "fs/promises";
import { runGit } from "./fetchRun.js";
import { V, GIT_WATCHDOG_MS, de } from "./fetchErrors.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import {
  convertDirectoryToZipInPlace,
  removeWorktreeSafely,
  worktreeRemovalText,
} from "../../utils/git/worktreeRemoval.js";
import { pruneWorktreeRegistration, deregisterWorktree } from "../../utils/git/worktreeRegistrations.js";
import { G } from "./tokenRedact.js";
import { isPathAbsent } from "../../utils/errors.js";
import { clearReparsePoints } from "../../utils/pathIdentity.js";

//@ chunk-t3sg9e26.js:34198-34300 placement
function sessionWorktreesRoot(e, n) {
  let t = dirname(dirname(resolve(n)));
  return basename(t) === "_sessions" && resolve(e).startsWith(dirname(t) + sep) ? t : commonPathPrefix(e, n);
}
//@ chunk-t3sg9e26.js:34300-34448 placement
function commonPathPrefix(e, n) {
  let parts = resolve(e).split(sep),
    parts_2 = resolve(n).split(sep),
    s = 0;
  while (s < parts.length && s < parts_2.length && parts[s] === parts_2[s]) s++;
  return s >= 2 ? parts.slice(0, s).join(sep) : void 0;
}
//@ chunk-t3sg9e26.js:34448-35900 placement
async function addSessionWorktree(e) {
  let {
    canonicalRepoPath: canonicalRepoPath,
    worktreePath: worktreePath,
    ref: ref,
    onDebug: onDebug,
    signal: signal,
    gitEnvironment: gitEnvironment,
  } = e;
  if (worktreePath === canonicalRepoPath)
    throw Error("addSessionWorktree: worktreePath must not equal canonicalRepoPath");
  let c = {
      repoPath: canonicalRepoPath,
      gitURL: "",
      authURL: "",
      originURL: "",
      gitEnvironment: gitEnvironment,
      onDebug: onDebug,
      signal: signal,
    },
    trimmed = (
      await runGit(c, canonicalRepoPath, ["rev-parse", "--verify", "FETCH_HEAD^{commit}"], { ...V })
    ).trim(),
    u;
  try {
    u = (
      await runGit(c, worktreePath, ["--git-dir", join(worktreePath, ".git"), "rev-parse", "HEAD"], { ...V })
    ).trim();
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  if (u === trimmed) {
    let trimmed_2 = (await runGit(c, worktreePath, ["rev-parse", "--absolute-git-dir"])).trim();
    (await writeFile(
      join(trimmed_2, "FETCH_HEAD"),
      `${trimmed}
`,
    ).catch(() => {}),
      onDebug(`[byoc:git] Worktree ${worktreePath} already at ${trimmed.slice(0, 12)} \u2014 keeping`));
    return;
  }
  (onDebug(
    u
      ? `[byoc:git] Worktree ${worktreePath} at wrong commit ${u.slice(0, 12)}, clearing before re-add`
      : `[byoc:git] Clearing ${worktreePath} before worktree add`,
  ),
    await withBoundedTimeout(
      convertDirectoryToZipInPlace(worktreePath, sessionWorktreesRoot(canonicalRepoPath, worktreePath)),
      GIT_WATCHDOG_MS,
      `[runner:stuck] rm ${worktreePath} (check NFS/CSI mount health)`,
    ).catch((f) => {
      onDebug(`[byoc:git] rm ${worktreePath} failed (continuing): ${f}`);
    }));
  let h = await withBoundedTimeout(
    pathSpellings(worktreePath).then((f) => pruneWorktreeRegistration(canonicalRepoPath, f)),
    de,
    `[runner:stuck] worktree deregister ${canonicalRepoPath} (check NFS/CSI mount health)`,
  ).then(
    (f) => {
      if (f.outcome === "kept")
        onDebug(`[byoc:git] left the worktree registration of ${worktreePath} in place: ${f.reason}`);
      return !0;
    },
    (f) => (onDebug(`[byoc:git] worktree deregister did not finish: ${f}`), !1),
  );
  await addDetachedWorktree(c, canonicalRepoPath, worktreePath, trimmed, h);
  let trimmed_2 = (await runGit(c, worktreePath, ["rev-parse", "--absolute-git-dir"])).trim();
  (await writeFile(
    join(trimmed_2, "FETCH_HEAD"),
    `${trimmed}
`,
  ),
    onDebug(`[byoc:git] Added worktree ${worktreePath} at ${trimmed.slice(0, 12)} (detached)`));
}
/**
 * git worktree add --detach；若报"missing but already registered worktree"且允许修复，就注销该失效登记（带超时）后重试一次，注销失败则抛出原错误。
 */
//@ chunk-t3sg9e26.js:35900-36653 placement
async function addDetachedWorktree(ctx, repoPath, worktreePath, commit, allowRepair) {
  let addWorktree = () => runGit(ctx, repoPath, ["worktree", "add", "--detach", worktreePath, commit]);
  try {
    await addWorktree();
    return;
  } catch (error) {
    if (!allowRepair || !G(error).includes("is a missing but already registered worktree")) throw error;
    let c = await withBoundedTimeout(
      Promise.all([realpath(repoPath), pathSpellings(worktreePath)]).then(([d, u]) =>
        deregisterWorktree(join(d, ".git"), { worktreePath: u, repoSpelled: repoPath }, { locked: "keep" }),
      ),
      de,
      `[runner:stuck] worktree deregister ${repoPath} (check NFS/CSI mount health)`,
    ).catch((d) => ({ outcome: "kept", reason: G(d) }));
    if (c.outcome !== "dropped")
      throw (
        ctx.onDebug(
          `[byoc:git] git still registers ${worktreePath} with its folder gone, and the registration could not be dropped${c.outcome === "kept" ? `: ${c.reason}` : ""}; not retrying`,
        ),
        error
      );
    ctx.onDebug(
      `[byoc:git] dropped the registration git still had for ${worktreePath} with its folder gone; retrying worktree add`,
    );
  }
  await addWorktree();
}
//@ chunk-t3sg9e26.js:36653-36772 placement
async function pathSpellings(e) {
  let n = await realpath(dirname(e)).catch(() => null),
    t = n === null ? null : join(n, basename(e));
  return t === null || t === e ? [e] : [e, t];
}
//@ chunk-t3sg9e26.js:36772-37920 placement
async function removeSessionWorktree(e) {
  let { worktrees: worktrees, onDebug: onDebug, signal: signal } = e;
  for (let { canonicalRepoPath: canonicalRepoPath, worktreePath: worktreePath } of worktrees) {
    let a = {
      repoPath: canonicalRepoPath,
      gitURL: "",
      authURL: "",
      originURL: "",
      onDebug: onDebug,
      signal: signal,
    };
    if (
      await withBoundedTimeout(
        lstat(worktreePath).then(
          () => !1,
          (d) => isPathAbsent(d),
        ),
        de,
        `[runner:stuck] worktree probe ${worktreePath} (check NFS/CSI mount health)`,
      ).catch(() => !1)
    )
      continue;
    try {
      if (!(await clearReparsePoints(worktreePath))) {
        onDebug(`[byoc:git] kept worktree ${worktreePath} \u2014 unremovable reparse point`);
        continue;
      }
      let d = await withBoundedTimeout(
        removeWorktreeSafely(canonicalRepoPath, worktreePath, {
          trustedRoot: sessionWorktreesRoot(canonicalRepoPath, worktreePath),
          deregisterIfStopped: !0,
          pointerFirst: !0,
        }),
        GIT_WATCHDOG_MS,
        `[runner:stuck] remove ${worktreePath} (check NFS/CSI mount health)`,
      );
      if (d.outcome === "unanchored")
        await runGit(a, canonicalRepoPath, ["worktree", "remove", "--force", worktreePath]);
      else if (d.outcome !== "removed") {
        onDebug(`[byoc:git] worktree remove ${worktreePath} failed: ${worktreeRemovalText(d)}`);
        continue;
      }
      onDebug(`[byoc:git] Removed worktree ${worktreePath}`);
    } catch (error) {
      onDebug(`[byoc:git] worktree remove ${worktreePath} failed: ${error}`);
    }
  }
  for (let { canonicalRepoPath: canonicalRepoPath, worktreePath: worktreePath } of worktrees)
    await withBoundedTimeout(
      pruneWorktreeRegistration(canonicalRepoPath, worktreePath),
      de,
      `[runner:stuck] worktree deregister ${canonicalRepoPath} (check NFS/CSI mount health)`,
    ).then(
      (a) => {
        if (a.outcome === "kept")
          onDebug(`[byoc:git] left the worktree registration of ${worktreePath} in place: ${a.reason}`);
      },
      (a) => {
        onDebug(`[byoc:git] worktree deregister did not finish: ${a}`);
      },
    );
}
//@ chunk-t3sg9e26.js:37920-38120 placement
function outcomeBranchesByRepo(e) {
  let n = new Map();
  for (let t of e) {
    let r = t.branches ?? [],
      [s, ...o] = r;
    if (o.length > 0) throw Error(`Outcome for ${t.repo} has ${r.length} branches, expected 0 or 1`);
    if (s) n.set(t.repo, s);
  }
  return n;
}

export { addSessionWorktree, removeSessionWorktree, outcomeBranchesByRepo };
