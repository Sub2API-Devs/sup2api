/**
 * selfHostedRunner/git/sessionWorktrees.ts
 *
 * BYOC 会话工作树添加与删除（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rzkdv0c6.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-rzkdv0c6.js:34202-34304 placement
function sessionWorktreesRoot(canonicalRepoPath, worktreePath) {
  let root = dirname(dirname(resolve(worktreePath)));
  return basename(root) === "_sessions" && resolve(canonicalRepoPath).startsWith(dirname(root) + sep)
    ? root
    : commonPathPrefix(canonicalRepoPath, worktreePath);
}
//@ chunk-rzkdv0c6.js:34304-34452 placement
function commonPathPrefix(left, right) {
  let parts = resolve(left).split(sep);
  let parts_2 = resolve(right).split(sep);
  let index = 0;
  while (index < parts.length && index < parts_2.length && parts[index] === parts_2[index]) index++;
  return index >= 2 ? parts.slice(0, index).join(sep) : undefined;
}
//@ chunk-rzkdv0c6.js:34452-35904 placement
async function addSessionWorktree(options) {
  let { canonicalRepoPath, worktreePath, ref, onDebug, signal, gitEnvironment } = options;
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
  let result;
  try {
    result = (
      await runGit(ctx, worktreePath, ["--git-dir", join(worktreePath, ".git"), "rev-parse", "HEAD"], {
        ...LOCKED_GIT_ENV,
      })
    ).trim();
  } catch (error) {
    if (signal?.aborted) throw error;
  }
  if (result === commit) {
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
    result
      ? `[byoc:git] Worktree ${worktreePath} at wrong commit ${result.slice(0, 12)}, clearing before re-add`
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
    pathSpellings(worktreePath).then((spellings) => pruneWorktreeRegistration(canonicalRepoPath, spellings)),
    FILESYSTEM_OP_TIMEOUT_MS,
    `[runner:stuck] worktree deregister ${canonicalRepoPath} (check NFS/CSI mount health)`,
  ).then(
    (entry) => {
      if (entry.outcome === "kept")
        onDebug(`[byoc:git] left the worktree registration of ${worktreePath} in place: ${entry.reason}`);
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
//@ chunk-rzkdv0c6.js:35904-36657 placement
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
    let realRepo = await withBoundedTimeout(
      Promise.all([realpath(repoPath), pathSpellings(worktreePath)]).then(([realPath, spellings]) =>
        deregisterWorktree(
          join(realPath, ".git"),
          {
            worktreePath: spellings,
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
    if (realRepo.outcome !== "dropped") {
      ctx.onDebug(
        `[byoc:git] git still registers ${worktreePath} with its folder gone, and the registration could not be dropped${realRepo.outcome === "kept" ? `: ${realRepo.reason}` : ""}; not retrying`,
      );
      throw error;
    }
    ctx.onDebug(
      `[byoc:git] dropped the registration git still had for ${worktreePath} with its folder gone; retrying worktree add`,
    );
  }
  await addWorktree();
}
//@ chunk-rzkdv0c6.js:36657-36776 placement
async function pathSpellings(worktreePath) {
  let realParent = await realpath(dirname(worktreePath)).catch(() => null);
  let resolved = realParent === null ? null : join(realParent, basename(worktreePath));
  return resolved === null || resolved === worktreePath ? [worktreePath] : [worktreePath, resolved];
}
//@ chunk-rzkdv0c6.js:36776-37924 placement
async function removeSessionWorktree(options) {
  let { worktrees, onDebug, signal } = options;
  for (let { canonicalRepoPath, worktreePath } of worktrees) {
    let ctx = {
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
      let result = await withBoundedTimeout(
        removeWorktreeSafely(canonicalRepoPath, worktreePath, {
          trustedRoot: sessionWorktreesRoot(canonicalRepoPath, worktreePath),
          deregisterIfStopped: true,
          pointerFirst: true,
        }),
        GIT_WATCHDOG_MS,
        `[runner:stuck] remove ${worktreePath} (check NFS/CSI mount health)`,
      );
      if (result.outcome === "unanchored")
        await runGit(ctx, canonicalRepoPath, ["worktree", "remove", "--force", worktreePath]);
      else if (result.outcome !== "removed") {
        onDebug(`[byoc:git] worktree remove ${worktreePath} failed: ${worktreeRemovalText(result)}`);
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
      (entry) => {
        if (entry.outcome === "kept")
          onDebug(`[byoc:git] left the worktree registration of ${worktreePath} in place: ${entry.reason}`);
      },
      (error) => {
        onDebug(`[byoc:git] worktree deregister did not finish: ${error}`);
      },
    );
}
//@ chunk-rzkdv0c6.js:37924-38124 placement
function outcomeBranchesByRepo(outcomes) {
  let byRepo = new Map();
  for (let outcome of outcomes) {
    let branches = outcome.branches ?? [];
    let [first, ...rest] = branches;
    if (rest.length > 0)
      throw Error(`Outcome for ${outcome.repo} has ${branches.length} branches, expected 0 or 1`);
    if (first) byRepo.set(outcome.repo, first);
  }
  return byRepo;
}
export { addSessionWorktree, removeSessionWorktree, outcomeBranchesByRepo };
