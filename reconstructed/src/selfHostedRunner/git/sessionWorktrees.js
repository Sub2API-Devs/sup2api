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
import { LOCKED_GIT_ENV, GIT_WATCHDOG_MS, FILESYSTEM_OP_TIMEOUT_MS } from "./fetchErrors.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import {
  convertDirectoryToZipInPlace,
  removeWorktreeSafely,
  worktreeRemovalText,
} from "../../utils/git/worktreeRemoval.js";
import { pruneWorktreeRegistration, deregisterWorktree } from "../../utils/git/worktreeRegistrations.js";
import { errorText } from "./tokenRedact.js";
import { isPathAbsent } from "../../utils/errors.js";
import { clearReparsePoints } from "../../utils/pathIdentity.js";

//@ chunk-t3sg9e26.js:34198-34300 placement
function sessionWorktreesRoot(canonicalRepoPath, worktreePath) {
  let t = dirname(dirname(resolve(worktreePath)));
  return basename(t) === "_sessions" && resolve(canonicalRepoPath).startsWith(dirname(t) + sep)
    ? t
    : commonPathPrefix(canonicalRepoPath, worktreePath);
}
//@ chunk-t3sg9e26.js:34300-34448 placement
function commonPathPrefix(e, n) {
  let parts = resolve(e).split(sep);
  let parts_2 = resolve(n).split(sep);
  let s = 0;
  while (s < parts.length && s < parts_2.length && parts[s] === parts_2[s]) s++;
  return s >= 2 ? parts.slice(0, s).join(sep) : undefined;
}
//@ chunk-t3sg9e26.js:34448-35900 placement
async function addSessionWorktree(e) {
  let { canonicalRepoPath, worktreePath, ref, onDebug, signal, gitEnvironment } = e;
  if (worktreePath === canonicalRepoPath)
    throw Error("addSessionWorktree: worktreePath must not equal canonicalRepoPath");
  let ctx = {
    repoPath: canonicalRepoPath,
    gitURL: "",
    authURL: "",
    originURL: "",
    gitEnvironment,
    onDebug,
    signal,
  };
  let commit = (
    await runGit(ctx, canonicalRepoPath, ["rev-parse", "--verify", "FETCH_HEAD^{commit}"], {
      ...LOCKED_GIT_ENV,
    })
  ).trim();
  let u;
  try {
    u = (
      await runGit(ctx, worktreePath, ["--git-dir", join(worktreePath, ".git"), "rev-parse", "HEAD"], {
        ...LOCKED_GIT_ENV,
      })
    ).trim();
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  if (u === commit) {
    let trimmed = (await runGit(ctx, worktreePath, ["rev-parse", "--absolute-git-dir"])).trim();
    await writeFile(
      join(trimmed, "FETCH_HEAD"),
      `${commit}
`,
    ).catch(() => {});
    onDebug(`[byoc:git] Worktree ${worktreePath} already at ${commit.slice(0, 12)} \u2014 keeping`);
    return;
  }
  onDebug(
    u
      ? `[byoc:git] Worktree ${worktreePath} at wrong commit ${u.slice(0, 12)}, clearing before re-add`
      : `[byoc:git] Clearing ${worktreePath} before worktree add`,
  );
  await withBoundedTimeout(
    convertDirectoryToZipInPlace(worktreePath, sessionWorktreesRoot(canonicalRepoPath, worktreePath)),
    GIT_WATCHDOG_MS,
    `[runner:stuck] rm ${worktreePath} (check NFS/CSI mount health)`,
  ).catch((error) => {
    onDebug(`[byoc:git] rm ${worktreePath} failed (continuing): ${error}`);
  });
  let allowRepair = await withBoundedTimeout(
    pathSpellings(worktreePath).then((f) => pruneWorktreeRegistration(canonicalRepoPath, f)),
    FILESYSTEM_OP_TIMEOUT_MS,
    `[runner:stuck] worktree deregister ${canonicalRepoPath} (check NFS/CSI mount health)`,
  ).then(
    (f) => {
      if (f.outcome === "kept")
        onDebug(`[byoc:git] left the worktree registration of ${worktreePath} in place: ${f.reason}`);
      return true;
    },
    (error) => {
      onDebug(`[byoc:git] worktree deregister did not finish: ${error}`);
      return false;
    },
  );
  await addDetachedWorktree(ctx, canonicalRepoPath, worktreePath, commit, allowRepair);
  let trimmed = (await runGit(ctx, worktreePath, ["rev-parse", "--absolute-git-dir"])).trim();
  await writeFile(
    join(trimmed, "FETCH_HEAD"),
    `${commit}
`,
  );
  onDebug(`[byoc:git] Added worktree ${worktreePath} at ${commit.slice(0, 12)} (detached)`);
}
//@ chunk-t3sg9e26.js:35900-36653 placement
/**
 * git worktree add --detach；若报"missing but already registered worktree"且允许修复，就注销该失效登记（带超时）后重试一次，注销失败则抛出原错误。
 */
async function addDetachedWorktree(ctx, repoPath, worktreePath, commit, allowRepair) {
  let addWorktree = () => runGit(ctx, repoPath, ["worktree", "add", "--detach", worktreePath, commit]);
  try {
    await addWorktree();
    return;
  } catch (error) {
    if (!allowRepair || !errorText(error).includes("is a missing but already registered worktree"))
      throw error;
    let c = await withBoundedTimeout(
      Promise.all([realpath(repoPath), pathSpellings(worktreePath)]).then(([d, u]) =>
        deregisterWorktree(
          join(d, ".git"),
          {
            worktreePath: u,
            repoSpelled: repoPath,
          },
          {
            locked: "keep",
          },
        ),
      ),
      FILESYSTEM_OP_TIMEOUT_MS,
      `[runner:stuck] worktree deregister ${repoPath} (check NFS/CSI mount health)`,
    ).catch((error) => ({
      outcome: "kept",
      reason: errorText(error),
    }));
    if (c.outcome !== "dropped") {
      ctx.onDebug(
        `[byoc:git] git still registers ${worktreePath} with its folder gone, and the registration could not be dropped${c.outcome === "kept" ? `: ${c.reason}` : ""}; not retrying`,
      );
      throw error;
    }
    ctx.onDebug(
      `[byoc:git] dropped the registration git still had for ${worktreePath} with its folder gone; retrying worktree add`,
    );
  }
  await addWorktree();
}
//@ chunk-t3sg9e26.js:36653-36772 placement
async function pathSpellings(worktreePath) {
  let n = await realpath(dirname(worktreePath)).catch(() => null);
  let t = n === null ? null : join(n, basename(worktreePath));
  return t === null || t === worktreePath ? [worktreePath] : [worktreePath, t];
}
//@ chunk-t3sg9e26.js:36772-37920 placement
async function removeSessionWorktree(e) {
  let { worktrees, onDebug, signal } = e;
  for (let { canonicalRepoPath, worktreePath } of worktrees) {
    let a = {
      repoPath: canonicalRepoPath,
      gitURL: "",
      authURL: "",
      originURL: "",
      onDebug,
      signal,
    };
    if (
      await withBoundedTimeout(
        lstat(worktreePath).then(
          () => false,
          (error) => isPathAbsent(error),
        ),
        FILESYSTEM_OP_TIMEOUT_MS,
        `[runner:stuck] worktree probe ${worktreePath} (check NFS/CSI mount health)`,
      ).catch(() => false)
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
          deregisterIfStopped: true,
          pointerFirst: true,
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
  for (let { canonicalRepoPath, worktreePath } of worktrees)
    await withBoundedTimeout(
      pruneWorktreeRegistration(canonicalRepoPath, worktreePath),
      FILESYSTEM_OP_TIMEOUT_MS,
      `[runner:stuck] worktree deregister ${canonicalRepoPath} (check NFS/CSI mount health)`,
    ).then(
      (a) => {
        if (a.outcome === "kept")
          onDebug(`[byoc:git] left the worktree registration of ${worktreePath} in place: ${a.reason}`);
      },
      (error) => {
        onDebug(`[byoc:git] worktree deregister did not finish: ${error}`);
      },
    );
}
//@ chunk-t3sg9e26.js:37920-38120 placement
function outcomeBranchesByRepo(e) {
  let n = new Map();
  for (let t of e) {
    let branches = t.branches ?? [];
    let [s, ...o] = branches;
    if (o.length > 0) throw Error(`Outcome for ${t.repo} has ${branches.length} branches, expected 0 or 1`);
    if (s) n.set(t.repo, s);
  }
  return n;
}
export { addSessionWorktree, removeSessionWorktree, outcomeBranchesByRepo };
