/**
 * components/WorktreeExitDialog.tsx
 *
 * 退出 worktree 会话时的对话框：保留/删除 worktree、处理未提交改动、tmux 会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/WorktreeExitDialog.tsx
 * pieces: chunk-18hwfzwa.js (12)
 * attribution: placement 9, layout 2, fingerprint 1
 */
import { homedir } from "os";
import { dirname } from "path";
import { lstat, realpath } from "fs/promises";
import { hasUntouchableRecordSpelling, processChdir } from "../utils/fsOperations.js";
import { setCwd } from "../utils/Shell.js";
import { logForDebugging } from "../utils/debug.js";
import { isCoveredByWorktrees, restoreRootsFor, worktreeRootsFor } from "../utils/sessionRestoreCwd.js";
import { worktreeLocationOf } from "../utils/worktreeIsolation.js";
import { setOriginalCwd } from "../bootstrap/state.js";
import { getPlansDirectory, primePlanSlugCollisions } from "../utils/plans.js";
import { fromEnum, lit as lit_2 } from "../services/analytics/safeMetadata.js";
import {
  killTmuxSession,
  getCurrentWorktreeSession,
  keepWorktree,
  cleanupWorktree,
  getWorkingCopyWorktreeChanges,
  persistWorktreeSession,
  countCommitsAtStake,
  describeWhereCommitsAre,
} from "../utils/worktree.js";
import { logEvent } from "../services/analytics/index.js";
import { env } from "../utils/env.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useState, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useSession } from "../context/session.js";
import { withDeadline } from "../utils/sleep.js";
import { buildFilterNeutralizingArgs } from "../utils/git/gitConfigFilters.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { gitExe, findGitRootUncached } from "../utils/git.js";
import { GIT_SAFE_GLOBAL_ARGS, SAFE_GIT_ENV_CONSTANTS } from "../utils/git/gitSafeEnv.js";
import { buildGitEnvForRepo } from "../utils/git/gitDirResolution.js";
import { isENOENT } from "../utils/errors.js";
import { clearResumeHintWorktree } from "../utils/concurrentSessions.js";
import {
  submoduleChanges,
  inspectSubmodules,
  describeSubmoduleChanges,
} from "../utils/git/submoduleInspection.js";
import { isWorktreeCloudClaimEnabled } from "../utils/shutdown/pendingWrites.js";
import { hasUnsafePathGlyphsOrSurrogate } from "../utils/unsafePathGlyphs.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1693042-1693072 placement
function selectId5(session) {
  return session.id;
}
//@ chunk-18hwfzwa.js:1693072-1693097 placement
function placeholderChar() {
  return "?";
}
//@ chunk-18hwfzwa.js:1693097-1693136 placement
function isNonEmptyLine(line) {
  return line.trim() !== "";
}
//@ chunk-18hwfzwa.js:1693136-1693156 placement
var SUBMODULE_CHECK_TIMEOUT_MS = 5000;
var EMPTY_DIALOG_TITLE = "";
//@ chunk-18hwfzwa.js:1693156-1693168 placement
var WORKTREE_STATUS_TIMEOUT_MS = 5000;
//@ chunk-18hwfzwa.js:1693168-1693220 placement
function worktreeRelocationModule() {
  return require("../utils/sessionStorage.lazy.js");
}
//@ chunk-18hwfzwa.js:1693220-1693917 placement
/**
 * 退出 worktree 后回到原工作目录（目录已不存在时逐级向上找存在的父目录），必要时恢复 originalCwd、搬移会话转录，清空 worktree 状态与计划目录缓存。
 */
async function restoreCwdAfterWorktreeExit(worktreeSession, storageV5) {
  let { originalCwd, preEnterOriginalCwd, liveLaunchAnchor } = worktreeSession;
  let targetDir = hasUntouchableRecordSpelling(originalCwd) ? homedir() : originalCwd;
  while (true)
    try {
      processChdir(targetDir);
      setCwd(targetDir);
      break;
    } catch {
      let parentDir = dirname(targetDir);
      if (parentDir === targetDir) break;
      targetDir = parentDir;
    }
  let fellBack = targetDir !== originalCwd;
  if (fellBack)
    logForDebugging(
      `Original directory ${originalCwd} no longer exists \u2014 returned to ${targetDir} instead`,
      {
        level: "warn",
      },
    );
  if (!fellBack) {
    let restoreDir = preEnterOriginalCwd ?? originalCwd;
    if (
      liveLaunchAnchor === undefined ||
      isCoveredByWorktrees(restoreDir, restoreRootsFor(liveLaunchAnchor, worktreeSession.worktreePath), {
        requireCovered: true,
        coveredWitnesses: worktreeRootsFor(liveLaunchAnchor, worktreeSession.worktreePath),
        extraCoveredRoots: (() => {
          let location = worktreeLocationOf(worktreeSession.worktreePath);
          return location !== null ? [location.checkout] : [];
        })(),
      })
    )
      setOriginalCwd(restoreDir);
    try {
      await worktreeRelocationModule().relocateSessionTranscript(storageV5);
    } catch (error) {
      worktreeRelocationModule().reportRelocateSessionTranscriptFailure(error, "WorktreeExitDialog");
    }
  }
  worktreeRelocationModule().saveWorktreeState(null, storageV5);
  getPlansDirectory.cache.clear?.();
  primePlanSlugCollisions(storageV5);
}
//@ chunk-18hwfzwa.js:1693917-1694107 placement
function worktreeExitTelemetry(atStake, worktreesInside) {
  return {
    commits: atStake.commits ?? -1,
    ...(atStake.head !== "not_read" && {
      head: fromEnum(atStake.head),
    }),
    ...("onKeptBranch" in atStake && {
      commits_on_kept_branch: atStake.onKeptBranch ?? -1,
    }),
    ...(worktreesInside !== 0 && {
      worktrees_inside: worktreesInside ?? -1,
    }),
  };
}
//@ chunk-18hwfzwa.js:1694107-1694906 placement
function removeWorktreeOnExit(
  session,
  env_2,
  { killTmux, removedMessage, atStake, changedFiles, worktreesInside },
) {
  let run = async () => {
    if (killTmux && session.tmuxSessionName) await killTmuxSession(session.tmuxSessionName);
    let changes = await inspectWorktreeChanges(session.worktreePath, worktreesInside);
    if (getCurrentWorktreeSession() !== session)
      return worktreeChangedMessage(session.worktreePath, killTmux && Boolean(session.tmuxSessionName));
    let { storageV5, credentials } = env_2;
    if (changes !== null) {
      logEvent("tengu_worktree_kept", {
        changed_files: changedFiles,
        kept_at_removal: true,
        ...worktreeExitTelemetry(atStake, changes.now),
      });
      await keepWorktree(storageV5);
      return changes.keptFor;
    }
    if (!(await cleanupWorktree(storageV5, credentials)))
      return `Worktree could not be removed \u2014 kept at ${session.worktreePath}`;
    logEvent("tengu_worktree_removed", {
      source: lit_2("exit_dialog"),
      changed_files: changedFiles,
      ...worktreeExitTelemetry(atStake, worktreesInside),
    });
    return removedMessage();
  };
  return {
    path: session.worktreePath,
    run,
    ignoresHangup:
      killTmux &&
      Boolean(session.tmuxSessionName) &&
      Boolean(env.TMUX) &&
      (env.CLAUDE_CODE_TMUX_SESSION === undefined ||
        env.CLAUDE_CODE_TMUX_SESSION === session.tmuxSessionName),
  };
}
//@ chunk-18hwfzwa.js:1694906-1695073 layout
function worktreeChangedMessage(worktreePath, tmuxEnded) {
  return `The exit didn't remove the worktree at ${worktreePath}: this session's worktree changed after Claude Code checked it.${tmuxEnded ? " Tmux session terminated." : ""}`;
}
//@ chunk-18hwfzwa.js:1695073-1695109 layout
async function inspectWorktreeChanges(worktreePath, worktreesInside) {
  return null;
}
//@ chunk-18hwfzwa.js:1695109-1706346 fingerprint (2.1.88 match: WorktreeExitDialog, 0.483)
/**
 * 退出 worktree 会话：检查未提交改动与 worktree 状态，选择保留或删除 worktree（必要时先确认丢弃改动），结束 tmux 会话并返回原目录。
 */
function WorktreeExitDialog(props) {
  let $ = useMemoCache(57);
  let { onDone, onCancel } = props;
  let { storageV5, credentials } = useTheme_2();
  let [phase, setPhase] = useState("loading");
  let emptyChanges;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    emptyChanges = [];
    $[0] = emptyChanges;
  } else emptyChanges = $[0];
  let [changeLines, setChangeLines] = useState(emptyChanges);
  let [submoduleNote, setSubmoduleNote] = useState(null);
  let [submoduleError, setSubmoduleError] = useState(null);
  let [changesUnverifiable, setChangesUnverifiable] = useState(false);
  let initialAtStake;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    initialAtStake = {
      head: "not_read",
      commits: 0,
    };
    $[1] = initialAtStake;
  } else initialAtStake = $[1];
  let [atStake, setAtStake] = useState(initialAtStake);
  let [worktreesInside, setWorktreesInside] = useState(0);
  let [, setUnreadableReason] = useState(null);
  let [resultMessage, setResultMessage] = useState();
  let pendingRemovalRef = useRef(undefined);
  let [session] = useState(getCurrentWorktreeSession);
  let id = useSession(selectId5);
  let sessionTitle;
  if ($[2] !== id) {
    sessionTitle = worktreeRelocationModule().getCurrentSessionTitle(id);
    $[2] = id;
    $[3] = sessionTitle;
  } else sessionTitle = $[3];
  let sessionTitle_ = sessionTitle;
  let inspectEffect;
  let inspectEffectDeps;
  if ($[4] !== credentials || $[5] !== sessionTitle_ || $[6] !== storageV5 || $[7] !== session) {
    inspectEffect = () => {
      let inspect = async function inspect_() {
        if (session?.enteredExisting) {
          await keepWorktree(storageV5);
          await restoreCwdAfterWorktreeExit(session, storageV5);
          setResultMessage(
            `Returned to ${session.originalCwd} (worktree at ${session.worktreePath} left in place)`,
          );
          setPhase("done");
          return;
        }
        let resolved = Promise.resolve(0);
        let changeLines = [];
        if (false && session) {
          if (session.liveLaunchAnchor !== undefined) {
            setUnreadableReason("not-read");
            setWorktreesInside(await resolved);
            setPhase("asking");
            return;
          }
          setPhase("checking");
          let changesetResult = await withDeadline(
            getWorkingCopyWorktreeChanges(
              session.worktreePath,
              session.originalChangeset,
              session.originalCwd,
              {
                statusTimeoutMs: WORKTREE_STATUS_TIMEOUT_MS,
              },
            ),
            WORKTREE_STATUS_TIMEOUT_MS,
          );
          if (changesetResult === undefined)
            logForDebugging(
              `hook worktree status check for ${session.worktreePath} outlasted ${WORKTREE_STATUS_TIMEOUT_MS} ms; asking instead`,
            );
          let changeset = changesetResult ?? null;
          changeLines = Array.from(
            {
              length: changeset?.changedFiles ?? 0,
            },
            placeholderChar,
          );
          if (changeset === null || changeset.moved) {
            if (changeLines.length > 0) setChangeLines(changeLines);
            setUnreadableReason(
              changeset !== null && changeset.changeset !== null
                ? {
                    movedToChangeset: changeset.changeset,
                  }
                : "unreadable",
            );
            setWorktreesInside(await resolved);
            setPhase("asking");
            return;
          }
          setUnreadableReason({});
        }
        let safeArgs = session && true ? await buildFilterNeutralizingArgs(session.worktreePath) : undefined;
        let gitUnsafe = safeArgs !== undefined && !safeArgs.ok;
        let gitResult =
          !session || false
            ? {
                stdout: "",
                stderr: "",
                code: 1,
                error: undefined,
              }
            : await execFileNoThrowWithCwd(
                gitExe(),
                gitUnsafe
                  ? [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--git-dir"]
                  : [
                      ...(safeArgs?.ok ? safeArgs.args : []),
                      ...GIT_SAFE_GLOBAL_ARGS,
                      ...SAFE_GIT_ENV_CONSTANTS,
                    ],
                {
                  cwd: session.worktreePath,
                  env: buildGitEnvForRepo(session.worktreePath, undefined, {
                    userLocale: true,
                  }),
                },
              );
        let isWorktreeGone = false;
        if (session && gitResult.code !== 0) {
          try {
            await lstat(session.worktreePath);
          } catch (error) {
            let error_2 = error;
            isWorktreeGone = isENOENT(error_2);
          }
        }
        let isNotInsideRepo = false;
        if (true && session?.hookBased && gitResult.code !== 0 && !isWorktreeGone) {
          try {
            isNotInsideRepo = findGitRootUncached(await realpath(session.worktreePath)) === null;
          } catch {
            isNotInsideRepo = false;
          }
        }
        let statusFailed = (gitUnsafe || gitResult.code !== 0) && !isWorktreeGone && !isNotInsideRepo;
        if (session && !session.hookBased && gitResult.code !== 0 && isWorktreeGone) {
          persistWorktreeSession(null, storageV5);
          clearResumeHintWorktree();
          await restoreCwdAfterWorktreeExit(session, storageV5);
          let tmuxHint = session.tmuxSessionName
            ? `. Detached tmux session ${session.tmuxSessionName} may still be running \u2014 end it with: tmux kill-session -t ${session.tmuxSessionName}`
            : "";
          setResultMessage(
            `Worktree at ${session.worktreePath} is no longer accessible \u2014 exiting${tmuxHint}`,
          );
          setPhase("done");
          return;
        }
        if (statusFailed) {
          changeLines = ["?"];
          setChangesUnverifiable(true);
        } else if (!gitUnsafe && gitResult.stdout)
          changeLines = gitResult.stdout
            .split(
              `
`,
            )
            .filter(isNonEmptyLine);
        let changesUnverifiable_ = false;
        if (session && gitResult.code === 0 && !gitUnsafe) {
          let submoduleInfo = submoduleChanges(
            await inspectSubmodules(session.worktreePath, {
              deadlineMs: SUBMODULE_CHECK_TIMEOUT_MS,
            }),
          );
          $n: switch (submoduleInfo?.kind) {
            case "changes": {
              changeLines = [...changeLines, ...submoduleInfo.paths];
              setSubmoduleNote(describeSubmoduleChanges(submoduleInfo));
              break $n;
            }
            case "unverifiable": {
              changesUnverifiable_ = true;
              setSubmoduleError(describeSubmoduleChanges(submoduleInfo));
              break $n;
            }
            case undefined:
          }
        }
        if (changeLines.length > 0) setChangeLines(changeLines);
        if (session) {
          let commitInfo =
            session.hookBased && !session.originalHeadCommit
              ? {
                  head: "not_read",
                  commits: isWorktreeGone || isNotInsideRepo ? 0 : null,
                }
              : await countCommitsAtStake(session, isWorktreeCloudClaimEnabled());
          setAtStake(commitInfo);
          let worktreesInside_ = await resolved;
          setWorktreesInside(worktreesInside_);
          let commitsUnknown = session.hookBased && commitInfo.commits === null;
          if (
            changeLines.length === 0 &&
            (commitInfo.commits === 0 || commitsUnknown) &&
            !("onKeptBranch" in commitInfo) &&
            !sessionTitle_ &&
            !changesUnverifiable_
          ) {
            if (worktreesInside_ !== 0 || commitsUnknown) {
              setPhase("asking");
              return;
            }
            setPhase("removing-clean");
            if (!session.hookBased) {
              await restoreCwdAfterWorktreeExit(session, storageV5);
              pendingRemovalRef.current = removeWorktreeOnExit(
                session,
                {
                  storageV5,
                  credentials,
                },
                {
                  killTmux: false,
                  removedMessage: () =>
                    commitInfo.head !== "another_branch"
                      ? "Worktree removed (no changes)"
                      : `Worktree removed. ${hasUnsafePathGlyphsOrSurrogate(commitInfo.branch) ? "The branch that it was on" : `Branch ${commitInfo.branch}`} is kept.`,
                  atStake: commitInfo,
                  changedFiles: 0,
                  worktreesInside: worktreesInside_,
                },
              );
              setPhase("done");
              return;
            }
            if (getCurrentWorktreeSession() !== session) {
              await restoreCwdAfterWorktreeExit(session, storageV5);
              setResultMessage(worktreeChangedMessage(session.worktreePath, false));
              setPhase("done");
              return;
            }
            cleanupWorktree(storageV5, credentials).then(async (removed) => {
              await restoreCwdAfterWorktreeExit(session, storageV5);
              if (removed) {
                logEvent("tengu_worktree_removed", {
                  source: lit_2("exit_dialog"),
                  commits: 0,
                  changed_files: 0,
                });
                setResultMessage("Worktree removed (no changes)");
              } else setResultMessage(`Worktree could not be removed \u2014 kept at ${session.worktreePath}`);
              setPhase("done");
            });
            return;
          } else setPhase("asking");
        }
      };
      inspect();
    };
    inspectEffectDeps = [session, sessionTitle_, storageV5, credentials];
    $[4] = credentials;
    $[5] = sessionTitle_;
    $[6] = storageV5;
    $[7] = session;
    $[8] = inspectEffect;
    $[9] = inspectEffectDeps;
  } else {
    inspectEffect = $[8];
    inspectEffectDeps = $[9];
  }
  useEffect(inspectEffect, inspectEffectDeps);
  let onDoneEffect;
  let onDoneDeps;
  if ($[10] !== onDone || $[11] !== resultMessage || $[12] !== phase) {
    onDoneEffect = () => {
      if (phase === "done") {
        if (pendingRemovalRef.current)
          onDone(resultMessage, {
            removeWorktree: pendingRemovalRef.current,
          });
        else onDone(resultMessage);
      }
    };
    onDoneDeps = [phase, onDone, resultMessage];
    $[10] = onDone;
    $[11] = resultMessage;
    $[12] = phase;
    $[13] = onDoneEffect;
    $[14] = onDoneDeps;
  } else {
    onDoneEffect = $[13];
    onDoneDeps = $[14];
  }
  useEffect(onDoneEffect, onDoneDeps);
  if (!session) {
    onDone("No active worktree session found", {
      display: "system",
    });
    return null;
  }
  if (phase === "loading" || phase === "done") {
    return null;
  }
  if (phase === "checking") {
    return null;
  }
  let commits = atStake.commits;
  let isOnAnotherBranch = atStake.head === "another_branch" || atStake.head === "like_its_branch";
  let currentBranchRef;
  if ($[15] !== atStake.branch || $[16] !== atStake.head) {
    currentBranchRef =
      atStake.head !== "another_branch"
        ? null
        : hasUnsafePathGlyphsOrSurrogate(atStake.branch)
          ? "another branch"
          : `branch ${atStake.branch}`;
    $[15] = atStake.branch;
    $[16] = atStake.head;
    $[17] = currentBranchRef;
  } else currentBranchRef = $[17];
  let currentBranchRef_ = currentBranchRef;
  let handleChoice;
  if (
    $[18] !== atStake ||
    $[19] !== changeLines ||
    $[20] !== commits ||
    $[21] !== credentials ||
    $[22] !== isOnAnotherBranch ||
    $[23] !== currentBranchRef_ ||
    $[24] !== storageV5 ||
    $[25] !== session ||
    $[26] !== worktreesInside
  ) {
    handleChoice = async function onChoice(error) {
      if (!session) {
        return;
      }
      let hasTmux = Boolean(session.tmuxSessionName);
      let branchSuffix = !session.worktreeBranch
        ? ""
        : atStake.head === "detached"
          ? " with HEAD detached"
          : ` on ${currentBranchRef_ ?? `branch ${session.worktreeBranch}`}`;
      if (error === "keep" || error === "keep-with-tmux") {
        setPhase("keeping");
        logEvent("tengu_worktree_kept", {
          changed_files: changeLines.length,
          ...worktreeExitTelemetry(atStake, worktreesInside),
        });
        await keepWorktree(storageV5);
        await restoreCwdAfterWorktreeExit(session, storageV5);
        if (hasTmux)
          setResultMessage(
            `Worktree kept. Your work is saved at ${session.worktreePath}${branchSuffix}. Reattach to tmux session with: tmux attach -t ${session.tmuxSessionName}`,
          );
        else setResultMessage(`Worktree kept. Your work is saved at ${session.worktreePath}${branchSuffix}`);
        setPhase("done");
      } else if (error === "keep-kill-tmux") {
        setPhase("keeping");
        logEvent("tengu_worktree_kept", {
          changed_files: changeLines.length,
          ...worktreeExitTelemetry(atStake, worktreesInside),
        });
        if (session.tmuxSessionName) await killTmuxSession(session.tmuxSessionName);
        await keepWorktree(storageV5);
        await restoreCwdAfterWorktreeExit(session, storageV5);
        setResultMessage(`Worktree kept at ${session.worktreePath}${branchSuffix}. Tmux session terminated.`);
        setPhase("done");
      } else if (error === "remove" || error === "remove-with-tmux") {
        setPhase("removing");
        let tmuxTerminated = hasTmux ? " Tmux session terminated." : "";
        let changeCount = changeLines.length;
        let discardedText = "discarded.";
        let removedMessage = () => {
          if (commits === null) {
            return session.hookBased
              ? `Worktree removed.${changeCount > 0 ? ` Uncommitted changes were ${discardedText}` : ""}${tmuxTerminated}`
              : `Worktree and branch ${session.worktreeBranch} removed.${changeCount > 0 ? ` Uncommitted changes were ${discardedText}` : ""}${tmuxTerminated}`;
          }
          if (commits > 0 && changeCount > 0) {
            return `Worktree removed. ${commits} ${commits === 1 ? "commit" : "commits"}${isOnAnotherBranch ? ` on ${session.worktreeBranch}` : ""} and uncommitted changes were ${discardedText}${tmuxTerminated}`;
          }
          if (commits > 0) {
            return `Worktree removed. ${commits} ${commits === 1 ? "commit" : "commits"} ${atStake.head === "detached" ? "" : `on ${session.worktreeBranch} `}${commits === 1 ? "was" : "were"} ${discardedText}${tmuxTerminated}`;
          }
          return changeCount > 0
            ? `Worktree removed. Uncommitted changes were ${discardedText}${tmuxTerminated}`
            : `Worktree removed.${tmuxTerminated}`;
        };
        if (!session.hookBased) {
          await restoreCwdAfterWorktreeExit(session, storageV5);
          pendingRemovalRef.current = removeWorktreeOnExit(
            session,
            {
              storageV5,
              credentials,
            },
            {
              killTmux: true,
              removedMessage,
              atStake,
              changedFiles: changeCount,
              worktreesInside,
            },
          );
          setPhase("done");
          return;
        }
        if (session.tmuxSessionName) await killTmuxSession(session.tmuxSessionName);
        let changes = await inspectWorktreeChanges(session.worktreePath, worktreesInside);
        if (getCurrentWorktreeSession() !== session) {
          await restoreCwdAfterWorktreeExit(session, storageV5);
          setResultMessage(worktreeChangedMessage(session.worktreePath, hasTmux));
          setPhase("done");
          return;
        }
        if (changes !== null) {
          logEvent("tengu_worktree_kept", {
            changed_files: changeCount,
            kept_at_removal: true,
            ...worktreeExitTelemetry(atStake, changes.now),
          });
          await keepWorktree(storageV5);
          await restoreCwdAfterWorktreeExit(session, storageV5);
          setResultMessage(changes.keptFor);
          setPhase("done");
          return;
        }
        let removed = await cleanupWorktree(storageV5, credentials);
        await restoreCwdAfterWorktreeExit(session, storageV5);
        if (!removed) {
          setResultMessage(`Worktree could not be removed \u2014 kept at ${session.worktreePath}`);
          setPhase("done");
          return;
        }
        logEvent("tengu_worktree_removed", {
          source: lit_2("exit_dialog"),
          changed_files: changeCount,
          ...worktreeExitTelemetry(atStake, worktreesInside),
        });
        setResultMessage(removedMessage());
        setPhase("done");
      }
    };
    $[18] = atStake;
    $[19] = changeLines;
    $[20] = commits;
    $[21] = credentials;
    $[22] = isOnAnotherBranch;
    $[23] = currentBranchRef_;
    $[24] = storageV5;
    $[25] = session;
    $[26] = worktreesInside;
    $[27] = handleChoice;
  } else handleChoice = $[27];
  let handleChoice_ = handleChoice;
  if (phase === "keeping") {
    let keepingElement;
    if ($[28] === MEMO_CACHE_SENTINEL) {
      keepingElement = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginY: 1,
        children: [
          jsxProd_default(Spinner, {}),
          jsxProd_default(Text, {
            children: "Keeping worktree\u2026",
          }),
        ],
      });
      $[28] = keepingElement;
    } else keepingElement = $[28];
    return keepingElement;
  }
  if (phase === "removing-clean" || phase === "removing") {
    let spinnerElement;
    if ($[29] === MEMO_CACHE_SENTINEL) {
      spinnerElement = jsxProd_default(Spinner, {});
      $[29] = spinnerElement;
    } else spinnerElement = $[29];
    const children =
      phase === "removing-clean"
        ? "Cleaning up worktree (no pending changes)\u2026"
        : "Removing worktree\u2026";
    let removingElement;
    if ($[30] !== children) {
      removingElement = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginY: 1,
        children: [
          spinnerElement,
          jsxProd_default(Text, {
            children,
          }),
        ],
      });
      $[30] = children;
      $[31] = removingElement;
    } else removingElement = $[31];
    return removingElement;
  }
  let branchName = session.worktreeBranch;
  const branchLabel = branchName ?? "the worktree branch";
  const branchRefLabel =
    currentBranchRef_ === null || currentBranchRef_ === "another branch"
      ? "the worktree's current branch"
      : currentBranchRef_;
  let whereCommitsText;
  if ($[32] !== atStake || $[33] !== branchLabel || $[34] !== branchRefLabel) {
    whereCommitsText = describeWhereCommitsAre(atStake, branchLabel, branchRefLabel);
    $[32] = atStake;
    $[33] = branchLabel;
    $[34] = branchRefLabel;
    $[35] = whereCommitsText;
  } else whereCommitsText = $[35];
  let whereCommitsText_ = whereCommitsText;
  let hasUncommitted = changeLines.length > 0;
  let changesLabel = changesUnverifiable
    ? "uncommitted files that could not be counted (git could not vet the worktree's config or read a checkout there)"
    : `${changeLines.length} uncommitted ${changeLines.length === 1 ? "file" : "files"}${submoduleNote ? ` (including ${submoduleNote})` : ""}`;
  let mayLoseCommits = commits === null || commits > 0;
  let submoduleWarning = submoduleError
    ? ` The worktree's submodules could not be checked for uncommitted work (${submoduleError}); anything uncommitted inside one is lost if you remove the worktree.`
    : "";
  let subtitle;
  if (commits === null)
    subtitle = session.hookBased
      ? `${hasUncommitted ? `You have ${changesLabel}. These will be lost${""} if you remove the worktree. ` : ""}A WorktreeCreate hook made this worktree, so Claude Code can't tell whether it has unpushed commits.${sessionTitle_ ? ` This session was named "${sessionTitle_}". Keep the worktree to resume it later.` : ""}`
      : `${hasUncommitted ? `You have ${changesLabel}, and the ` : "The "}branch ${branchName}${atStake.head === "detached" ? " or the detached HEAD" : ""} may hold ${session.originalHeadCommit ? "commits that could not be counted" : "unpushed commits (commit baseline unavailable)"}. The branch will be deleted${""} if you remove.`;
  else if (hasUncommitted && mayLoseCommits)
    subtitle = `You have ${changesLabel} and ${commits} ${commits === 1 ? "commit" : "commits"} ${whereCommitsText_}. All will be lost${""} if you remove.`;
  else if (hasUncommitted)
    subtitle = `You have ${changesLabel}. These will be lost${""} if you remove the worktree.`;
  else if (mayLoseCommits)
    subtitle = `You have ${commits} ${commits === 1 ? "commit" : "commits"} ${whereCommitsText_}. ${atStake.head === "detached" ? (commits === 1 ? "It may be lost" : "They may be lost") : `${isOnAnotherBranch && branchName ? `Branch ${branchName}` : "The branch"} will be deleted`}${""} if you remove the worktree.`;
  else if (sessionTitle_)
    subtitle = `This session was named "${sessionTitle_}".${false ? "" : " Keep the worktree to resume it later, or remove it to clean up."}`;
  else
    subtitle = "You are working in a worktree. Keep it to continue working there, or remove it to clean up.";
  subtitle = subtitle + submoduleWarning;
  if (currentBranchRef_ !== null)
    subtitle = subtitle + ` The worktree is now on ${currentBranchRef_}, which is kept either way.`;
  let handleCancel;
  if ($[36] !== handleChoice_ || $[37] !== onCancel) {
    handleCancel = function onCancel_() {
      if (onCancel) {
        onCancel();
        return;
      }
      handleChoice_("keep");
    };
    $[36] = handleChoice_;
    $[37] = onCancel;
    $[38] = handleCancel;
  } else handleCancel = $[38];
  let onCancel_2 = handleCancel;
  let onlyUnpushedCommits =
    session.hookBased && commits === null && !hasUncommitted && submoduleError === null;
  let description =
    hasUncommitted || mayLoseCommits || submoduleError !== null
      ? isOnAnotherBranch && !mayLoseCommits
        ? "All uncommitted changes will be lost."
        : onlyUnpushedCommits
          ? "Any unpushed commits in the worktree may be lost."
          : isOnAnotherBranch
            ? `${hasUncommitted ? `Uncommitted changes and ${commits === null ? "any " : ""}commits` : commits === null ? "Any commits" : "Commits"} only on ${branchName} will be lost.`
            : "All changes and commits will be lost."
      : "Clean up the worktree directory.";
  let hasTmuxSession = Boolean(session.tmuxSessionName);
  let options;
  if (
    $[39] !== hasTmuxSession ||
    $[40] !== description ||
    $[41] !== session.tmuxSessionName ||
    $[42] !== session.worktreePath
  ) {
    options = hasTmuxSession
      ? [
          {
            label: "Keep worktree and tmux session",
            value: "keep-with-tmux",
            description: `${false ? "" : `Stays at ${session.worktreePath}. `}Reattach with: tmux attach -t ${session.tmuxSessionName}`,
          },
          {
            label: "Keep worktree, end tmux session",
            value: "keep-kill-tmux",
            description: false
              ? undefined
              : `Keeps worktree at ${session.worktreePath}, terminates tmux session.`,
          },
          {
            label: "Remove worktree and tmux session",
            value: "remove-with-tmux",
            description,
          },
        ]
      : [
          {
            label: "Keep worktree",
            value: "keep",
            description: false ? undefined : `Stays at ${session.worktreePath}`,
          },
          {
            label: "Remove worktree",
            value: "remove",
            description,
          },
        ];
    $[39] = hasTmuxSession;
    $[40] = description;
    $[41] = session.tmuxSessionName;
    $[42] = session.worktreePath;
    $[43] = options;
  } else options = $[43];
  let options_2 = options;
  let defaultFocusValue = hasTmuxSession ? "keep-with-tmux" : "keep";
  let subtitle_2;
  if ($[44] !== subtitle) {
    subtitle_2 = subtitle.trimStart();
    $[44] = subtitle;
    $[45] = subtitle_2;
  } else subtitle_2 = $[45];
  let pathElement;
  if ($[46] !== session.worktreePath) {
    pathElement =
      false &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          children: session.worktreePath,
        }),
      });
    $[46] = session.worktreePath;
    $[47] = pathElement;
  } else pathElement = $[47];
  let selectorElement;
  if ($[48] !== defaultFocusValue || $[49] !== handleChoice_ || $[50] !== options_2) {
    selectorElement = jsxProd_default(ModelSelector, {
      defaultFocusValue,
      options: options_2,
      onChange: handleChoice_,
    });
    $[48] = defaultFocusValue;
    $[49] = handleChoice_;
    $[50] = options_2;
    $[51] = selectorElement;
  } else selectorElement = $[51];
  let dialogElement;
  if ($[52] !== onCancel_2 || $[53] !== subtitle_2 || $[54] !== pathElement || $[55] !== selectorElement) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: false ? EMPTY_DIALOG_TITLE : "Exiting worktree session",
      subtitle: subtitle_2,
      onCancel: onCancel_2,
      exitOnCtrlCD: true,
      children: [pathElement, selectorElement],
    });
    $[52] = onCancel_2;
    $[53] = subtitle_2;
    $[54] = pathElement;
    $[55] = selectorElement;
    $[56] = dialogElement;
  } else dialogElement = $[56];
  return dialogElement;
}
export { WorktreeExitDialog };
