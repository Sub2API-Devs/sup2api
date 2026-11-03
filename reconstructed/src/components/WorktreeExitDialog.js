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
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { y, R, P } from "../../vendor/react/cjs/react.production.js";
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
function selectId5(kr) {
  return kr.id;
}
//@ chunk-18hwfzwa.js:1693072-1693097 placement
function placeholderChar() {
  return "?";
}
//@ chunk-18hwfzwa.js:1693097-1693136 placement
function isNonEmptyLine(ls) {
  return ls.trim() !== "";
}
//@ chunk-18hwfzwa.js:1693136-1693156 placement
var SUBMODULE_CHECK_TIMEOUT_MS = 5000;
var EMPTY_DIALOG_TITLE = "";
//@ chunk-18hwfzwa.js:1693156-1693168 placement
var WORKTREE_STATUS_TIMEOUT_MS = 5000;
//@ chunk-18hwfzwa.js:1693168-1693220 placement
function worktreeRelocationModule() {
  return require("./chunk-hs5khexj.js");
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
      let Be = dirname(targetDir);
      if (Be === targetDir) break;
      targetDir = Be;
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
    let Be = preEnterOriginalCwd ?? originalCwd;
    if (
      liveLaunchAnchor === undefined ||
      isCoveredByWorktrees(Be, restoreRootsFor(liveLaunchAnchor, worktreeSession.worktreePath), {
        requireCovered: true,
        coveredWitnesses: worktreeRootsFor(liveLaunchAnchor, worktreeSession.worktreePath),
        extraCoveredRoots: (() => {
          let He = worktreeLocationOf(worktreeSession.worktreePath);
          return He !== null ? [He.checkout] : [];
        })(),
      })
    )
      setOriginalCwd(Be);
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
function worktreeExitTelemetry(h, x) {
  return {
    commits: h.commits ?? -1,
    ...(h.head !== "not_read" && {
      head: fromEnum(h.head),
    }),
    ...("onKeptBranch" in h && {
      commits_on_kept_branch: h.onKeptBranch ?? -1,
    }),
    ...(x !== 0 && {
      worktrees_inside: x ?? -1,
    }),
  };
}
//@ chunk-18hwfzwa.js:1694107-1694906 placement
function removeWorktreeOnExit(h, x, { killTmux, removedMessage, atStake, changedFiles, worktreesInside }) {
  let run = async () => {
    if (killTmux && h.tmuxSessionName) await killTmuxSession(h.tmuxSessionName);
    let He = await inspectWorktreeChanges(h.worktreePath, worktreesInside);
    if (getCurrentWorktreeSession() !== h)
      return worktreeChangedMessage(h.worktreePath, killTmux && Boolean(h.tmuxSessionName));
    let { storageV5, credentials } = x;
    if (He !== null) {
      logEvent("tengu_worktree_kept", {
        changed_files: changedFiles,
        kept_at_removal: true,
        ...worktreeExitTelemetry(atStake, He.now),
      });
      await keepWorktree(storageV5);
      return He.keptFor;
    }
    if (!(await cleanupWorktree(storageV5, credentials)))
      return `Worktree could not be removed \u2014 kept at ${h.worktreePath}`;
    logEvent("tengu_worktree_removed", {
      source: lit_2("exit_dialog"),
      changed_files: changedFiles,
      ...worktreeExitTelemetry(atStake, worktreesInside),
    });
    return removedMessage();
  };
  return {
    path: h.worktreePath,
    run,
    ignoresHangup:
      killTmux &&
      Boolean(h.tmuxSessionName) &&
      Boolean(env.TMUX) &&
      (env.CLAUDE_CODE_TMUX_SESSION === undefined || env.CLAUDE_CODE_TMUX_SESSION === h.tmuxSessionName),
  };
}
//@ chunk-18hwfzwa.js:1694906-1695073 layout
function worktreeChangedMessage(worktreePath, x) {
  return `The exit didn't remove the worktree at ${worktreePath}: this session's worktree changed after Claude Code checked it.${x ? " Tmux session terminated." : ""}`;
}
//@ chunk-18hwfzwa.js:1695073-1695109 layout
async function inspectWorktreeChanges(worktreePath, x) {
  return null;
}
//@ chunk-18hwfzwa.js:1695109-1706346 fingerprint = WorktreeExitDialog (0.483)
/**
 * 退出 worktree 会话：检查未提交改动与 worktree 状态，选择保留或删除 worktree（必要时先确认丢弃改动），结束 tmux 会话并返回原目录。
 */
function WorktreeExitDialog(props) {
  let $ = w(57);
  let { onDone, onCancel } = props;
  let { storageV5, credentials } = useTheme_2();
  let [ke, Re] = y("loading");
  let He;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    He = [];
    $[0] = He;
  } else He = $[0];
  let [We, ze] = y(He);
  let [Xe, rt] = y(null);
  let [kt, At] = y(null);
  let [It, Ot] = y(false);
  let Et;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    Et = {
      head: "not_read",
      commits: 0,
    };
    $[1] = Et;
  } else Et = $[1];
  let [Dt, Lt] = y(Et);
  let [oo, Xt] = y(0);
  let [, io] = y(null);
  let [so, po] = y();
  let ao = R(undefined);
  let [co] = y(getCurrentWorktreeSession);
  let id = useSession(selectId5);
  let Ao;
  if ($[2] !== id) {
    Ao = worktreeRelocationModule().getCurrentSessionTitle(id);
    $[2] = id;
    $[3] = Ao;
  } else Ao = $[3];
  let Bo = Ao;
  let Ro;
  let Ho;
  if ($[4] !== credentials || $[5] !== Bo || $[6] !== storageV5 || $[7] !== co) {
    Ro = () => {
      let wn = async function wn() {
        if (co?.enteredExisting) {
          await keepWorktree(storageV5);
          await restoreCwdAfterWorktreeExit(co, storageV5);
          po(`Returned to ${co.originalCwd} (worktree at ${co.worktreePath} left in place)`);
          Re("done");
          return;
        }
        let resolved = Promise.resolve(0);
        let changeLines = [];
        if (false && co) {
          if (co.liveLaunchAnchor !== undefined) {
            io("not-read");
            Xt(await resolved);
            Re("asking");
            return;
          }
          Re("checking");
          let mn = await withDeadline(
            getWorkingCopyWorktreeChanges(co.worktreePath, co.originalChangeset, co.originalCwd, {
              statusTimeoutMs: WORKTREE_STATUS_TIMEOUT_MS,
            }),
            WORKTREE_STATUS_TIMEOUT_MS,
          );
          if (mn === undefined)
            logForDebugging(
              `hook worktree status check for ${co.worktreePath} outlasted ${WORKTREE_STATUS_TIMEOUT_MS} ms; asking instead`,
            );
          let Cn = mn ?? null;
          changeLines = Array.from(
            {
              length: Cn?.changedFiles ?? 0,
            },
            placeholderChar,
          );
          if (Cn === null || Cn.moved) {
            if (changeLines.length > 0) ze(changeLines);
            io(
              Cn !== null && Cn.changeset !== null
                ? {
                    movedToChangeset: Cn.changeset,
                  }
                : "unreadable",
            );
            Xt(await resolved);
            Re("asking");
            return;
          }
          io({});
        }
        let No = co && true ? await buildFilterNeutralizingArgs(co.worktreePath) : undefined;
        let vo = No !== undefined && !No.ok;
        let Yo =
          !co || false
            ? {
                stdout: "",
                stderr: "",
                code: 1,
                error: undefined,
              }
            : await execFileNoThrowWithCwd(
                gitExe(),
                vo
                  ? [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--git-dir"]
                  : [...(No?.ok ? No.args : []), ...GIT_SAFE_GLOBAL_ARGS, ...SAFE_GIT_ENV_CONSTANTS],
                {
                  cwd: co.worktreePath,
                  env: buildGitEnvForRepo(co.worktreePath, undefined, {
                    userLocale: true,
                  }),
                },
              );
        let kn = false;
        if (co && Yo.code !== 0) {
          try {
            await lstat(co.worktreePath);
          } catch (error) {
            let bn = error;
            kn = isENOENT(bn);
          }
        }
        let Go = false;
        if (true && co?.hookBased && Yo.code !== 0 && !kn) {
          try {
            Go = findGitRootUncached(await realpath(co.worktreePath)) === null;
          } catch {
            Go = false;
          }
        }
        let hn = (vo || Yo.code !== 0) && !kn && !Go;
        if (co && !co.hookBased && Yo.code !== 0 && kn) {
          persistWorktreeSession(null, storageV5);
          clearResumeHintWorktree();
          await restoreCwdAfterWorktreeExit(co, storageV5);
          let Mn = co.tmuxSessionName
            ? `. Detached tmux session ${co.tmuxSessionName} may still be running \u2014 end it with: tmux kill-session -t ${co.tmuxSessionName}`
            : "";
          po(`Worktree at ${co.worktreePath} is no longer accessible \u2014 exiting${Mn}`);
          Re("done");
          return;
        }
        if (hn) {
          changeLines = ["?"];
          Ot(true);
        } else if (!vo && Yo.stdout)
          changeLines = Yo.stdout
            .split(
              `
`,
            )
            .filter(isNonEmptyLine);
        let Xo = false;
        if (co && Yo.code === 0 && !vo) {
          let Sn = submoduleChanges(
            await inspectSubmodules(co.worktreePath, {
              deadlineMs: SUBMODULE_CHECK_TIMEOUT_MS,
            }),
          );
          $n: switch (Sn?.kind) {
            case "changes": {
              changeLines = [...changeLines, ...Sn.paths];
              rt(describeSubmoduleChanges(Sn));
              break $n;
            }
            case "unverifiable": {
              Xo = true;
              At(describeSubmoduleChanges(Sn));
              break $n;
            }
            case undefined:
          }
        }
        if (changeLines.length > 0) ze(changeLines);
        if (co) {
          let on =
            co.hookBased && !co.originalHeadCommit
              ? {
                  head: "not_read",
                  commits: kn || Go ? 0 : null,
                }
              : await countCommitsAtStake(co, isWorktreeCloudClaimEnabled());
          Lt(on);
          let _o = await resolved;
          Xt(_o);
          let cn = co.hookBased && on.commits === null;
          if (changeLines.length === 0 && (on.commits === 0 || cn) && !("onKeptBranch" in on) && !Bo && !Xo) {
            if (_o !== 0 || cn) {
              Re("asking");
              return;
            }
            Re("removing-clean");
            if (!co.hookBased) {
              await restoreCwdAfterWorktreeExit(co, storageV5);
              ao.current = removeWorktreeOnExit(
                co,
                {
                  storageV5,
                  credentials,
                },
                {
                  killTmux: false,
                  removedMessage: () =>
                    on.head !== "another_branch"
                      ? "Worktree removed (no changes)"
                      : `Worktree removed. ${hasUnsafePathGlyphsOrSurrogate(on.branch) ? "The branch that it was on" : `Branch ${on.branch}`} is kept.`,
                  atStake: on,
                  changedFiles: 0,
                  worktreesInside: _o,
                },
              );
              Re("done");
              return;
            }
            if (getCurrentWorktreeSession() !== co) {
              await restoreCwdAfterWorktreeExit(co, storageV5);
              po(worktreeChangedMessage(co.worktreePath, false));
              Re("done");
              return;
            }
            cleanupWorktree(storageV5, credentials).then(async (Dn) => {
              await restoreCwdAfterWorktreeExit(co, storageV5);
              if (Dn) {
                logEvent("tengu_worktree_removed", {
                  source: lit_2("exit_dialog"),
                  commits: 0,
                  changed_files: 0,
                });
                po("Worktree removed (no changes)");
              } else po(`Worktree could not be removed \u2014 kept at ${co.worktreePath}`);
              Re("done");
            });
            return;
          } else Re("asking");
        }
      };
      wn();
    };
    Ho = [co, Bo, storageV5, credentials];
    $[4] = credentials;
    $[5] = Bo;
    $[6] = storageV5;
    $[7] = co;
    $[8] = Ro;
    $[9] = Ho;
  } else {
    Ro = $[8];
    Ho = $[9];
  }
  P(Ro, Ho);
  let Fn;
  let mr;
  if ($[10] !== onDone || $[11] !== so || $[12] !== ke) {
    Fn = () => {
      if (ke === "done") {
        if (ao.current)
          onDone(so, {
            removeWorktree: ao.current,
          });
        else onDone(so);
      }
    };
    mr = [ke, onDone, so];
    $[10] = onDone;
    $[11] = so;
    $[12] = ke;
    $[13] = Fn;
    $[14] = mr;
  } else {
    Fn = $[13];
    mr = $[14];
  }
  P(Fn, mr);
  if (!co) {
    onDone("No active worktree session found", {
      display: "system",
    });
    return null;
  }
  if (ke === "loading" || ke === "done") {
    return null;
  }
  if (ke === "checking") {
    return null;
  }
  let commits = Dt.commits;
  let Wn = Dt.head === "another_branch" || Dt.head === "like_its_branch";
  let Fr;
  if ($[15] !== Dt.branch || $[16] !== Dt.head) {
    Fr =
      Dt.head !== "another_branch"
        ? null
        : hasUnsafePathGlyphsOrSurrogate(Dt.branch)
          ? "another branch"
          : `branch ${Dt.branch}`;
    $[15] = Dt.branch;
    $[16] = Dt.head;
    $[17] = Fr;
  } else Fr = $[17];
  let Zn = Fr;
  let Un;
  if (
    $[18] !== Dt ||
    $[19] !== We ||
    $[20] !== commits ||
    $[21] !== credentials ||
    $[22] !== Wn ||
    $[23] !== Zn ||
    $[24] !== storageV5 ||
    $[25] !== co ||
    $[26] !== oo
  ) {
    Un = async function Ur(error) {
      if (!co) {
        return;
      }
      let hasTmux = Boolean(co.tmuxSessionName);
      let pr = !co.worktreeBranch
        ? ""
        : Dt.head === "detached"
          ? " with HEAD detached"
          : ` on ${Zn ?? `branch ${co.worktreeBranch}`}`;
      if (error === "keep" || error === "keep-with-tmux") {
        Re("keeping");
        logEvent("tengu_worktree_kept", {
          changed_files: We.length,
          ...worktreeExitTelemetry(Dt, oo),
        });
        await keepWorktree(storageV5);
        await restoreCwdAfterWorktreeExit(co, storageV5);
        if (hasTmux)
          po(
            `Worktree kept. Your work is saved at ${co.worktreePath}${pr}. Reattach to tmux session with: tmux attach -t ${co.tmuxSessionName}`,
          );
        else po(`Worktree kept. Your work is saved at ${co.worktreePath}${pr}`);
        Re("done");
      } else if (error === "keep-kill-tmux") {
        Re("keeping");
        logEvent("tengu_worktree_kept", {
          changed_files: We.length,
          ...worktreeExitTelemetry(Dt, oo),
        });
        if (co.tmuxSessionName) await killTmuxSession(co.tmuxSessionName);
        await keepWorktree(storageV5);
        await restoreCwdAfterWorktreeExit(co, storageV5);
        po(`Worktree kept at ${co.worktreePath}${pr}. Tmux session terminated.`);
        Re("done");
      } else if (error === "remove" || error === "remove-with-tmux") {
        Re("removing");
        let Qn = hasTmux ? " Tmux session terminated." : "";
        let ur = We.length;
        let Ir = "discarded.";
        let Pr = () => {
          if (commits === null) {
            return co.hookBased
              ? `Worktree removed.${ur > 0 ? ` Uncommitted changes were ${Ir}` : ""}${Qn}`
              : `Worktree and branch ${co.worktreeBranch} removed.${ur > 0 ? ` Uncommitted changes were ${Ir}` : ""}${Qn}`;
          }
          if (commits > 0 && ur > 0) {
            return `Worktree removed. ${commits} ${commits === 1 ? "commit" : "commits"}${Wn ? ` on ${co.worktreeBranch}` : ""} and uncommitted changes were ${Ir}${Qn}`;
          }
          if (commits > 0) {
            return `Worktree removed. ${commits} ${commits === 1 ? "commit" : "commits"} ${Dt.head === "detached" ? "" : `on ${co.worktreeBranch} `}${commits === 1 ? "was" : "were"} ${Ir}${Qn}`;
          }
          return ur > 0 ? `Worktree removed. Uncommitted changes were ${Ir}${Qn}` : `Worktree removed.${Qn}`;
        };
        if (!co.hookBased) {
          await restoreCwdAfterWorktreeExit(co, storageV5);
          ao.current = removeWorktreeOnExit(
            co,
            {
              storageV5,
              credentials,
            },
            {
              killTmux: true,
              removedMessage: Pr,
              atStake: Dt,
              changedFiles: ur,
              worktreesInside: oo,
            },
          );
          Re("done");
          return;
        }
        if (co.tmuxSessionName) await killTmuxSession(co.tmuxSessionName);
        let ts = await inspectWorktreeChanges(co.worktreePath, oo);
        if (getCurrentWorktreeSession() !== co) {
          await restoreCwdAfterWorktreeExit(co, storageV5);
          po(worktreeChangedMessage(co.worktreePath, hasTmux));
          Re("done");
          return;
        }
        if (ts !== null) {
          logEvent("tengu_worktree_kept", {
            changed_files: ur,
            kept_at_removal: true,
            ...worktreeExitTelemetry(Dt, ts.now),
          });
          await keepWorktree(storageV5);
          await restoreCwdAfterWorktreeExit(co, storageV5);
          po(ts.keptFor);
          Re("done");
          return;
        }
        let Gn = await cleanupWorktree(storageV5, credentials);
        await restoreCwdAfterWorktreeExit(co, storageV5);
        if (!Gn) {
          po(`Worktree could not be removed \u2014 kept at ${co.worktreePath}`);
          Re("done");
          return;
        }
        logEvent("tengu_worktree_removed", {
          source: lit_2("exit_dialog"),
          changed_files: ur,
          ...worktreeExitTelemetry(Dt, oo),
        });
        po(Pr());
        Re("done");
      }
    };
    $[18] = Dt;
    $[19] = We;
    $[20] = commits;
    $[21] = credentials;
    $[22] = Wn;
    $[23] = Zn;
    $[24] = storageV5;
    $[25] = co;
    $[26] = oo;
    $[27] = Un;
  } else Un = $[27];
  let Ur = Un;
  if (ke === "keeping") {
    let Zr;
    if ($[28] === MEMO_CACHE_SENTINEL) {
      Zr = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginY: 1,
        children: [
          jsxProd_default(Spinner, {}),
          jsxProd_default(Text, {
            children: "Keeping worktree\u2026",
          }),
        ],
      });
      $[28] = Zr;
    } else Zr = $[28];
    return Zr;
  }
  if (ke === "removing-clean" || ke === "removing") {
    let Zr;
    if ($[29] === MEMO_CACHE_SENTINEL) {
      Zr = jsxProd_default(Spinner, {});
      $[29] = Zr;
    } else Zr = $[29];
    const children =
      ke === "removing-clean" ? "Cleaning up worktree (no pending changes)\u2026" : "Removing worktree\u2026";
    let zr;
    if ($[30] !== children) {
      zr = jsxProd_default_2(Box, {
        flexDirection: "row",
        marginY: 1,
        children: [
          Zr,
          jsxProd_default(Text, {
            children,
          }),
        ],
      });
      $[30] = children;
      $[31] = zr;
    } else zr = $[31];
    return zr;
  }
  let branchName = co.worktreeBranch;
  const Zr = branchName ?? "the worktree branch";
  const wr = Zn === null || Zn === "another branch" ? "the worktree's current branch" : Zn;
  let zr;
  if ($[32] !== Dt || $[33] !== Zr || $[34] !== wr) {
    zr = describeWhereCommitsAre(Dt, Zr, wr);
    $[32] = Dt;
    $[33] = Zr;
    $[34] = wr;
    $[35] = zr;
  } else zr = $[35];
  let fr = zr;
  let $r = We.length > 0;
  let Yr = It
    ? "uncommitted files that could not be counted (git could not vet the worktree's config or read a checkout there)"
    : `${We.length} uncommitted ${We.length === 1 ? "file" : "files"}${Xe ? ` (including ${Xe})` : ""}`;
  let Er = commits === null || commits > 0;
  let Vr = kt
    ? ` The worktree's submodules could not be checked for uncommitted work (${kt}); anything uncommitted inside one is lost if you remove the worktree.`
    : "";
  let ms;
  if (commits === null)
    ms = co.hookBased
      ? `${$r ? `You have ${Yr}. These will be lost${""} if you remove the worktree. ` : ""}A WorktreeCreate hook made this worktree, so Claude Code can't tell whether it has unpushed commits.${Bo ? ` This session was named "${Bo}". Keep the worktree to resume it later.` : ""}`
      : `${$r ? `You have ${Yr}, and the ` : "The "}branch ${branchName}${Dt.head === "detached" ? " or the detached HEAD" : ""} may hold ${co.originalHeadCommit ? "commits that could not be counted" : "unpushed commits (commit baseline unavailable)"}. The branch will be deleted${""} if you remove.`;
  else if ($r && Er)
    ms = `You have ${Yr} and ${commits} ${commits === 1 ? "commit" : "commits"} ${fr}. All will be lost${""} if you remove.`;
  else if ($r) ms = `You have ${Yr}. These will be lost${""} if you remove the worktree.`;
  else if (Er)
    ms = `You have ${commits} ${commits === 1 ? "commit" : "commits"} ${fr}. ${Dt.head === "detached" ? (commits === 1 ? "It may be lost" : "They may be lost") : `${Wn && branchName ? `Branch ${branchName}` : "The branch"} will be deleted`}${""} if you remove the worktree.`;
  else if (Bo)
    ms = `This session was named "${Bo}".${false ? "" : " Keep the worktree to resume it later, or remove it to clean up."}`;
  else ms = "You are working in a worktree. Keep it to continue working there, or remove it to clean up.";
  ms = ms + Vr;
  if (Zn !== null) ms = ms + ` The worktree is now on ${Zn}, which is kept either way.`;
  let Xs;
  if ($[36] !== Ur || $[37] !== onCancel) {
    Xs = function Ls() {
      if (onCancel) {
        onCancel();
        return;
      }
      Ur("keep");
    };
    $[36] = Ur;
    $[37] = onCancel;
    $[38] = Xs;
  } else Xs = $[38];
  let onCancel_2 = Xs;
  let is = co.hookBased && commits === null && !$r && kt === null;
  let description =
    $r || Er || kt !== null
      ? Wn && !Er
        ? "All uncommitted changes will be lost."
        : is
          ? "Any unpushed commits in the worktree may be lost."
          : Wn
            ? `${$r ? `Uncommitted changes and ${commits === null ? "any " : ""}commits` : commits === null ? "Any commits" : "Commits"} only on ${branchName} will be lost.`
            : "All changes and commits will be lost."
      : "Clean up the worktree directory.";
  let hasTmuxSession = Boolean(co.tmuxSessionName);
  let Oi;
  if (
    $[39] !== hasTmuxSession ||
    $[40] !== description ||
    $[41] !== co.tmuxSessionName ||
    $[42] !== co.worktreePath
  ) {
    Oi = hasTmuxSession
      ? [
          {
            label: "Keep worktree and tmux session",
            value: "keep-with-tmux",
            description: `${false ? "" : `Stays at ${co.worktreePath}. `}Reattach with: tmux attach -t ${co.tmuxSessionName}`,
          },
          {
            label: "Keep worktree, end tmux session",
            value: "keep-kill-tmux",
            description: false ? undefined : `Keeps worktree at ${co.worktreePath}, terminates tmux session.`,
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
            description: false ? undefined : `Stays at ${co.worktreePath}`,
          },
          {
            label: "Remove worktree",
            value: "remove",
            description,
          },
        ];
    $[39] = hasTmuxSession;
    $[40] = description;
    $[41] = co.tmuxSessionName;
    $[42] = co.worktreePath;
    $[43] = Oi;
  } else Oi = $[43];
  let options = Oi;
  let defaultFocusValue = hasTmuxSession ? "keep-with-tmux" : "keep";
  let subtitle;
  if ($[44] !== ms) {
    subtitle = ms.trimStart();
    $[44] = ms;
    $[45] = subtitle;
  } else subtitle = $[45];
  let qn;
  if ($[46] !== co.worktreePath) {
    qn =
      false &&
      jsxProd_default(Box, {
        paddingLeft: 2,
        children: jsxProd_default(Text, {
          children: co.worktreePath,
        }),
      });
    $[46] = co.worktreePath;
    $[47] = qn;
  } else qn = $[47];
  let ps;
  if ($[48] !== defaultFocusValue || $[49] !== Ur || $[50] !== options) {
    ps = jsxProd_default(ModelSelector, {
      defaultFocusValue,
      options,
      onChange: Ur,
    });
    $[48] = defaultFocusValue;
    $[49] = Ur;
    $[50] = options;
    $[51] = ps;
  } else ps = $[51];
  let xs;
  if ($[52] !== onCancel_2 || $[53] !== subtitle || $[54] !== qn || $[55] !== ps) {
    xs = jsxProd_default_2(Dialog, {
      title: false ? EMPTY_DIALOG_TITLE : "Exiting worktree session",
      subtitle,
      onCancel: onCancel_2,
      exitOnCtrlCD: true,
      children: [qn, ps],
    });
    $[52] = onCancel_2;
    $[53] = subtitle;
    $[54] = qn;
    $[55] = ps;
    $[56] = xs;
  } else xs = $[56];
  return xs;
}
export { WorktreeExitDialog };
