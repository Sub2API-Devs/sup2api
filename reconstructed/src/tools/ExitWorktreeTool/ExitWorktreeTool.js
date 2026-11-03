/**
 * tools/ExitWorktreeTool/ExitWorktreeTool.ts
 *
 * ExitWorktree 工具：keep/remove 本会话的 worktree，统计未提交改动与提交，恢复原工作目录与缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/ExitWorktreeTool/ExitWorktreeTool.ts
 * pieces: chunk-kxyd0g16.js (8)
 * attribution: affinity 1, fingerprint 2, callgraph-fingerprint 1, layout 4
 */
import { realpath } from "fs/promises";
import { homedir } from "os";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, U, M, u, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { buildFilterNeutralizingArgs } from "../../utils/git/gitConfigFilters.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { gitExe } from "../../utils/git.js";
import { freeze, freeze_2 } from "../../utils/git/gitSafeEnv.js";
import { buildGitEnvForRepo } from "../../utils/git/gitDirResolution.js";
import {
  submoduleChanges,
  inspectSubmodules,
  describeSubmoduleChanges,
} from "../../utils/git/submoduleInspection.js";
import { count } from "../../utils/collections.js";
import {
  countCommitsAtStake,
  getCurrentWorktreeSession,
  describeWhereCommitsAre,
  keepWorktree,
  killTmuxSession,
  cleanupWorktree,
} from "../../utils/worktree.js";
import { oRe } from "../../utils/shutdown/pendingWrites.js";
import { hasUntouchableRecordSpelling } from "../../utils/fsOperations.js";
import { setCwd } from "../../utils/Shell.js";
import { isENOENT } from "../../utils/errors.js";
import { tmpdir } from "../../utils/tempDir.js";
import { logForDebugging } from "../../utils/debug.js";
import { isCoveredByWorktrees, restoreRootsFor, worktreeRootsFor } from "../../utils/sessionRestoreCwd.js";
import { rie } from "../../utils/worktreeIsolation.js";
import { setOriginalCwd, setProjectRoot, getProjectRoot, getOriginalCwd } from "../../bootstrap/state.js";
import {
  relocateSessionTranscript,
  reportRelocateSessionTranscriptFailure,
  saveWorktreeState,
} from "../../utils/sessionStorage.js";
import { relocateBgSessionCwd } from "../../services/daemon/jobState.js";
import { hasControlChars } from "../../services/policyLimits/complianceTaints.js";
import { replaceLineBreaks, stripUnsafeChars } from "../../utils/permissions/approvalPayloadSerialization.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  updateHooksConfigSnapshotThroughBackend,
  updateHooksConfigSnapshot,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { kZ } from "../../utils/contextAttachments/environment.js";
import { clearMemoryFilesCache } from "../../components/Message.js";
import { getPlansDirectory, primePlanSlugCollisions } from "../../utils/plans.js";
import { reanchorGitFileWatcher } from "../../utils/git/gitFilesystem.js";
import { getReplBridgeHandle } from "../../bridge/replBridgeHandle.js";
import { printableNameOrPlaceholder } from "../../utils/printableName.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { EXIT_WORKTREE_TOOL_NAME } from "./constants.js";
import { M$ } from "../../utils/cwd.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * ExitWorktree 的 prompt：作用范围、何时使用、keep/remove 与 discard_changes 语义、对 tmux 的处理。
 */
//@ chunk-kxyd0g16.js:126984-128969 affinity
function getExitWorktreePrompt() {
  return `Exit a worktree session created by EnterWorktree and return the session to the original working directory.

## Scope

This tool ONLY operates on worktrees created by EnterWorktree in this session. It will NOT touch:
- Worktrees you created manually with \`git worktree add\`
- Worktrees from a previous session (even if created by EnterWorktree then)
- The directory you're in if EnterWorktree was never called

If called outside an EnterWorktree session, the tool is a **no-op**: it reports that no worktree session is active and takes no action. Filesystem state is unchanged.

## When to Use

- The user explicitly asks to "exit the worktree", "leave the worktree", "go back", or otherwise end the worktree session
- Do NOT call this proactively \u2014 only when the user asks

## Parameters

- \`action\` (required): \`"keep"\` or \`"remove"\`
  - \`"keep"\` \u2014 leave the worktree directory and branch intact on disk. Use this if the user wants to come back to the work later, or if there are changes to preserve.
  - \`"remove"\` \u2014 delete the worktree directory and its branch. Use this for a clean exit when the work is done or abandoned.
- \`discard_changes\` (optional, default false): only meaningful with \`action: "remove"\`. If the worktree has uncommitted files or commits not on the original branch, the tool will REFUSE to remove it unless this is set to \`true\`. If the tool returns an error listing changes, confirm with the user before re-invoking with \`discard_changes: true\`.

## Behavior

- Restores the session's working directory to where it was before EnterWorktree
- Clears CWD-dependent caches (system prompt sections, memory files, plans directory) so the session state reflects the original directory
- If a tmux session was attached to the worktree: killed on \`remove\`, left running on \`keep\` (its name is returned so the user can reattach)
- Once exited, EnterWorktree can be called again to create a fresh worktree
`;
}
//@ chunk-kxyd0g16.js:128969-129915 fingerprint = inputSchema (0.514)
var exitWorktreeInputSchema = DoctorLazy(() =>
    zodStrictObject({
      action: U(["keep", "remove"]).describe(
        '"keep" leaves the worktree and branch on disk; "remove" deletes both.',
      ),
      discard_changes: M()
        .optional()
        .describe(
          'Required true when action is "remove" and the worktree has uncommitted files or unmerged commits. The tool will refuse and list them otherwise.',
        ),
    }),
  ),
  exitWorktreeOutputSchema = DoctorLazy(() =>
    u({
      action: U(["keep", "remove"]),
      originalCwd: o(),
      worktreePath: o(),
      worktreeBranch: o().optional(),
      tmuxSessionName: o().optional(),
      discardedFiles: E().optional(),
      discardedCommits: E().optional(),
      restoredCwd: o()
        .optional()
        .describe("@internal Where the session's cwd ended up: originalCwd, or a fallback when it was gone."),
      originalCwdMissing: M()
        .optional()
        .describe(
          "@internal originalCwd was gone (or a network path the session will not touch), so restoredCwd is a fallback directory.",
        ),
      message: o(),
    }),
  ),
  DISCARD_CONFIRM_HINT =
    'Confirm with the user, then re-invoke with discard_changes: true \u2014 or use action: "keep" to preserve the worktree.';
/**
 * 统计 worktree 中未提交文件数（含子模块变化）与相对起始提交新增的提交数；无法判断时返回 null。
 */
//@ chunk-kxyd0g16.js:129915-130455 callgraph-fingerprint = countWorktreeChanges (0.157)
async function countWorktreeChanges(worktreePath, originalHeadCommit) {
  let { originalHeadCommit: originalHeadCommit_2 } = originalHeadCommit,
    s = await buildFilterNeutralizingArgs(worktreePath);
  if (!s.ok) return null;
  let f = await execFileNoThrow(gitExe(), [...s.args, ...freeze, "-C", worktreePath, ...freeze_2], {
    env: buildGitEnvForRepo(worktreePath, void 0, { userLocale: !0 }),
  });
  if (f.code !== 0) return null;
  let h = submoduleChanges(await inspectSubmodules(worktreePath)),
    y =
      count(
        f.stdout.split(`
`),
        (w) => w.trim() !== "",
      ) + (h === void 0 ? 0 : h.kind === "changes" ? h.paths.length : 1);
  if (!originalHeadCommit_2) return null;
  let k = await countCommitsAtStake({ ...originalHeadCommit, worktreePath: worktreePath }, oRe());
  if (k.commits === null || ("onKeptBranch" in k && k.onKeptBranch === null)) return null;
  return { changedFiles: y, commits: k.commits, atStake: k, ...(h !== void 0 && { submoduleWork: h }) };
}
//@ chunk-kxyd0g16.js:130455-130485 layout
async function zr(e) {
  return 0;
}
//@ chunk-kxyd0g16.js:130485-130509 layout
function Wi(e) {
  return "";
}
/**
 * 退出 worktree 后恢复会话：回到原 cwd（不存在时回退到 worktree、home 或临时目录），在不扩大权限锚点的前提下重设 originalCwd/项目根并迁移后台会话状态，清除 worktree 状态与 cwd 相关缓存，返回 restoredCwd 等。
 */
//@ chunk-kxyd0g16.js:130509-131829 layout
async function restoreSessionAfterWorktreeExit(
  session,
  originalCwd,
  preEnterOriginalCwd,
  wasProjectRootOriginal,
  worktreePath,
  liveLaunchAnchor,
  storage,
) {
  let restoredCwd = originalCwd,
    originalCwdMissing = !1,
    S = hasUntouchableRecordSpelling(originalCwd);
  try {
    if (S) throw Error("network-spelled original cwd (screened, never touched)");
    setCwd(originalCwd, session);
  } catch (error) {
    let B = S;
    if (!B)
      try {
        await realpath(originalCwd);
      } catch (error) {
        B = isENOENT(error);
      }
    if (!B) throw error;
    ((originalCwdMissing = !0), (restoredCwd = ""));
    for (let V of [worktreePath, homedir(), tmpdir()])
      try {
        (setCwd(V, session), (restoredCwd = V));
        break;
      } catch {}
    if (!restoredCwd) throw error;
    logForDebugging(
      `ExitWorktree: original directory "${originalCwd}" no longer exists; session cwd recovered to "${restoredCwd}"`,
    );
  }
  let fellBackToWorktree = originalCwdMissing && restoredCwd === worktreePath,
    newOriginalCwd = originalCwdMissing ? restoredCwd : (preEnterOriginalCwd ?? restoredCwd),
    keepsAnchor =
      liveLaunchAnchor !== void 0 &&
      !isCoveredByWorktrees(newOriginalCwd, restoreRootsFor(liveLaunchAnchor, worktreePath), {
        requireCovered: !0,
        coveredWitnesses: worktreeRootsFor(liveLaunchAnchor, worktreePath),
        extraCoveredRoots: (() => {
          let x = rie(worktreePath);
          return x !== null ? [x.checkout] : [];
        })(),
      });
  if (keepsAnchor)
    logForDebugging(
      `ExitWorktree: not moving the permission anchor to "${newOriginalCwd}" \u2014 it strictly contains the session's live launch anchor (a record-derived widening); the anchor stays put`,
    );
  if ((!originalCwdMissing || fellBackToWorktree) && !keepsAnchor) {
    setOriginalCwd(newOriginalCwd);
    try {
      await relocateSessionTranscript(storage);
    } catch (error) {
      reportRelocateSessionTranscriptFailure(error, "ExitWorktree");
    }
    try {
      await relocateBgSessionCwd(newOriginalCwd, storage);
    } catch (error) {
      logForDebugging(`ExitWorktree: bg session state rehome failed (continuing): ${error}`, {
        level: "error",
      });
    }
    let x = !originalCwdMissing && preEnterOriginalCwd !== void 0 && liveLaunchAnchor === void 0;
    if (wasProjectRootOriginal) {
      if (!x && hasControlChars(newOriginalCwd))
        logForDebugging(
          `ExitWorktree: not installing projectRoot "${replaceLineBreaks(stripUnsafeChars(newOriginalCwd))}" \u2014 untrusted display characters; keeping the existing anchor`,
        );
      else setProjectRoot(newOriginalCwd);
      if (isStorageV5Enabled() && storage !== void 0) await updateHooksConfigSnapshotThroughBackend(storage);
      else updateHooksConfigSnapshot();
    }
  }
  return (
    saveWorktreeState(null, isStorageV5Enabled() ? storage : void 0),
    kZ("worktree"),
    clearMemoryFilesCache(session),
    getPlansDirectory.cache.clear?.(),
    primePlanSlugCollisions(storage),
    reanchorGitFileWatcher(),
    getReplBridgeHandle()?.refreshGitBranch?.(),
    {
      restoredCwd: restoredCwd,
      originalCwdMissing: originalCwdMissing,
      fellBackToWorktree: fellBackToWorktree,
    }
  );
}
/**
 * 生成"会话已回到 X"或"原目录不存在，已回退到 Y"的说明。
 */
//@ chunk-kxyd0g16.js:131829-132109 layout
function formatCwdRestoredMessage(e, r) {
  if (!r.originalCwdMissing) return `Session is now back in ${printableNameOrPlaceholder(e)}.`;
  let n = `The original directory ${printableNameOrPlaceholder(e)} no longer exists, so the session is now in ${printableNameOrPlaceholder(r.restoredCwd)}.`;
  return r.fellBackToWorktree ? n : `${n} Consider restarting Claude from an existing directory.`;
}
/**
 * ExitWorktree 工具（shouldDefer，isDestructive 当 action=remove）。只处理本会话 EnterWorktree 创建/进入的 worktree；不在 worktree 会话时 validateInput 报 no-op；子代理禁用；进入的是别人的 worktree 时不允许 remove；remove 且未 discard_changes 时统计未提交文件与未合并提交，有则拒绝并要求确认。call：keep 保留目录与分支；remove 先杀 tmux 会话再清理 worktree；两者都调用 restoreSessionAfterWorktreeExit 恢复 cwd。
 */
//@ chunk-kxyd0g16.js:132109-137578 fingerprint = ExitWorktreeTool (0.67)
var ExitWorktreeTool = buildTool({
  name: EXIT_WORKTREE_TOOL_NAME,
  searchHint: "exit a worktree session and return to the original directory",
  backgrounding: "never",
  maxResultSizeChars: 1e5,
  async description() {
    return "Exits a worktree session created by EnterWorktree and restores the original working directory";
  },
  async prompt() {
    return getExitWorktreePrompt();
  },
  get inputSchema() {
    return exitWorktreeInputSchema();
  },
  get outputSchema() {
    return exitWorktreeOutputSchema();
  },
  userFacingName(e) {
    return e?.action === "remove" ? "Cleaning up worktree" : "Exiting worktree";
  },
  shouldDefer: !0,
  isDestructive(e) {
    return e.action === "remove";
  },
  toAutoClassifierInput(e) {
    return e.action;
  },
  renderToolUseMessage() {
    return "";
  },
  create(e) {
    return {
      async validateInput(r) {
        if (M$())
          return {
            result: !1,
            message:
              'ExitWorktree cannot be called from a subagent with a cwd override (isolation: "worktree" or explicit cwd) \u2014 it would mutate the parent session\'s process-wide working directory. This agent is already isolated; use Bash with `cd` for directory changes within it.',
            errorCode: 5,
          };
        let n = getCurrentWorktreeSession();
        if (!n)
          return {
            result: !1,
            message:
              "No-op: there is no active EnterWorktree session to exit. This tool only operates on worktrees created by EnterWorktree in the current session \u2014 it will not touch worktrees created manually or in a previous session. No filesystem changes were made.",
            errorCode: 1,
          };
        if (r.action === "remove" && n.enteredExisting)
          return {
            result: !1,
            message: `This session is not the owner of the worktree at ${printableNameOrPlaceholder(n.worktreePath)} \u2014 it either entered a pre-existing worktree via EnterWorktree({path}) or resumed into a checkout whose liveness lock another running Claude Code session still holds \u2014 so this tool will not remove it. Use action: "keep" to return to ${printableNameOrPlaceholder(n.originalCwd)}. If no other session is using it, remove it yourself with \`git worktree remove\`; while a live session's lock is present, git will refuse and name the owner.`,
            errorCode: 4,
          };
        if (r.action === "remove" && !r.discard_changes) {
          let s = await countWorktreeChanges(n.worktreePath, n),
            f = Wi(await zr(n.worktreePath));
          if (s === null)
            return {
              result: !1,
              message: `Could not verify worktree state at ${printableNameOrPlaceholder(n.worktreePath)}.${f} Refusing to remove without explicit confirmation. Confirm with the user, then re-invoke with discard_changes: true to proceed \u2014 or use action: "keep" to preserve the worktree.`,
              errorCode: 3,
            };
          let {
            changedFiles: changedFiles,
            commits: commits,
            atStake: atStake,
            submoduleWork: submoduleWork,
            movedToChangeset: movedToChangeset,
          } = s;
          if (changedFiles > 0 || commits > 0) {
            let R = [];
            if (changedFiles > 0)
              R.push(
                `${changedFiles} uncommitted ${changedFiles === 1 ? "file" : "files"}${submoduleWork ? ` (including ${describeSubmoduleChanges(submoduleWork)}, which git status in the worktree does not show)` : ""}`,
              );
            if (commits > 0)
              R.push(
                `${commits} ${commits === 1 ? "commit" : "commits"} ${describeWhereCommitsAre(atStake ?? { head: "not_read", commits: commits }, n.worktreeBranch ? printableNameOrPlaceholder(n.worktreeBranch) : "the worktree branch", "the worktree's current branch")}`,
              );
            return {
              result: !1,
              message: `Worktree has ${R.join(" and ")}. Removing will discard this work permanently.${movedToChangeset ? ` (Commits made in this worktree are already stored server-side, head changeset ${movedToChangeset.slice(0, 12)}, and are not affected by removing it.)` : ""}${f} ${DISCARD_CONFIRM_HINT}`,
              errorCode: 2,
            };
          }
          if (atStake !== void 0 && "onKeptBranch" in atStake) {
            let onKeptBranch = atStake.onKeptBranch;
            return {
              result: !1,
              message: `The worktree is now on another branch, which has ${onKeptBranch} ${onKeptBranch === 1 ? "commit" : "commits"} that this session's starting commit lacks. Removing the worktree keeps that branch, so no commit is lost, but the user may still be working there.${f} ${DISCARD_CONFIRM_HINT}`,
              errorCode: 2,
            };
          }
          if (f !== "")
            return { result: !1, message: `${f.trimStart()} ${DISCARD_CONFIRM_HINT}`, errorCode: 6 };
        }
        return { result: !0 };
      },
      async call(r) {
        let n = getCurrentWorktreeSession();
        if (!n) throw Error("Not in a worktree session");
        let {
            originalCwd: originalCwd,
            preEnterOriginalCwd: preEnterOriginalCwd,
            worktreePath: worktreePath,
            worktreeBranch: worktreeBranch,
            tmuxSessionName: tmuxSessionName,
            liveLaunchAnchor: liveLaunchAnchor,
          } = n,
          S = getProjectRoot() === getOriginalCwd(),
          R = r.action === "keep" && !1,
          {
            changedFiles: changedFiles,
            commits: commits,
            atStake: atStake,
            movedToChangeset: movedToChangeset,
          } = (R ? null : await countWorktreeChanges(worktreePath, n)) ?? { changedFiles: 0, commits: 0 },
          V = atStake !== void 0 &&
            atStake.head !== "not_read" && {
              head: fromEnum(atStake.head),
              ...("onKeptBranch" in atStake && { commits_on_kept_branch: atStake.onKeptBranch ?? -1 }),
            };
        if (r.action === "keep") {
          await keepWorktree(e.storageV5);
          let ae = await restoreSessionAfterWorktreeExit(
            e.session,
            originalCwd,
            preEnterOriginalCwd,
            S,
            worktreePath,
            liveLaunchAnchor,
            e.storageV5,
          );
          logEvent("tengu_worktree_kept", {
            mid_session: !0,
            commits: commits,
            changed_files: changedFiles,
            ...V,
          });
          let he = tmuxSessionName
            ? ` Tmux session ${printableNameOrPlaceholder(tmuxSessionName)} is still running; reattach with \`tmux attach -t\` and that name.`
            : "";
          return {
            data: {
              action: "keep",
              originalCwd: originalCwd,
              worktreePath: worktreePath,
              worktreeBranch: worktreeBranch,
              tmuxSessionName: tmuxSessionName,
              restoredCwd: ae.restoredCwd,
              originalCwdMissing: ae.originalCwdMissing,
              message: `Exited worktree. Your work is preserved at ${printableNameOrPlaceholder(worktreePath)}${worktreeBranch ? ` on branch ${printableNameOrPlaceholder(worktreeBranch)}` : ""}. ${formatCwdRestoredMessage(originalCwd, ae)}${he}`,
            },
          };
        }
        let q = await zr(worktreePath);
        if (tmuxSessionName) await killTmuxSession(tmuxSessionName);
        let P = await cleanupWorktree(e.storageV5, e.credentials),
          L = await restoreSessionAfterWorktreeExit(
            e.session,
            originalCwd,
            preEnterOriginalCwd,
            S,
            worktreePath,
            liveLaunchAnchor,
            e.storageV5,
          );
        if (!P)
          return {
            data: {
              action: "remove",
              originalCwd: originalCwd,
              worktreePath: worktreePath,
              worktreeBranch: worktreeBranch,
              discardedFiles: 0,
              discardedCommits: 0,
              restoredCwd: L.restoredCwd,
              originalCwdMissing: L.originalCwdMissing,
              message: `Exited worktree but could not remove it \u2014 kept at ${printableNameOrPlaceholder(worktreePath)}. ${formatCwdRestoredMessage(originalCwd, L)}`,
            },
          };
        logEvent("tengu_worktree_removed", {
          source: lit("exit_tool"),
          mid_session: !0,
          commits: commits,
          changed_files: changedFiles,
          ...V,
          ...(q !== 0 && { worktrees_inside: q ?? -1 }),
        });
        let W = [];
        if (commits > 0) W.push(`${commits} ${commits === 1 ? "commit" : "commits"}`);
        if (changedFiles > 0) W.push(`${changedFiles} uncommitted ${changedFiles === 1 ? "file" : "files"}`);
        let Q = W.length > 0 ? ` Discarded ${W.join(" and ")}.` : "",
          G = movedToChangeset
            ? ` Commits made there remain stored server-side (head changeset ${movedToChangeset.slice(0, 12)}).`
            : "";
        return {
          data: {
            action: "remove",
            originalCwd: originalCwd,
            worktreePath: worktreePath,
            worktreeBranch: worktreeBranch,
            discardedFiles: changedFiles,
            discardedCommits: commits,
            restoredCwd: L.restoredCwd,
            originalCwdMissing: L.originalCwdMissing,
            message: `Exited and removed worktree at ${printableNameOrPlaceholder(worktreePath)}.${Q}${G} ${formatCwdRestoredMessage(originalCwd, L)}`,
          },
        };
      },
    };
  },
  mapToolResultToToolResultBlockParam({ message: e }, r) {
    return { type: "tool_result", content: e, tool_use_id: r };
  },
});

export { ExitWorktreeTool };
