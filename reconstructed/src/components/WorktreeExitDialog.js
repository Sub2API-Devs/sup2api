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
import { homedir, homedir as homedir_2, homedir as homedir_3 } from "os";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
} from "path";
import { lstat, lstat as lstat_2, realpath, realpath as realpath_2 } from "fs/promises";
import { hasUntouchableRecordSpelling, processChdir } from "../utils/fsOperations.js";
import { setCwd } from "../utils/Shell.js";
import { logForDebugging } from "../utils/debug.js";
import { isCoveredByWorktrees, restoreRootsFor, worktreeRootsFor } from "../utils/sessionRestoreCwd.js";
import { rie } from "../utils/worktreeIsolation.js";
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
import { Me } from "./design-system/ThemeProvider.js";
import { y, R, P } from "../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { useSession } from "../context/session.js";
import { withDeadline } from "../utils/sleep.js";
import { buildFilterNeutralizingArgs } from "../utils/git/gitConfigFilters.js";
import { execFileNoThrowWithCwd } from "../utils/execFileNoThrow.js";
import { gitExe, findGitRootUncached } from "../utils/git.js";
import { freeze as freeze_7, freeze_2 as freeze_2_2 } from "../utils/git/gitSafeEnv.js";
import { buildGitEnvForRepo } from "../utils/git/gitDirResolution.js";
import { isENOENT } from "../utils/errors.js";
import { clearResumeHintWorktree } from "../utils/concurrentSessions.js";
import {
  submoduleChanges,
  inspectSubmodules,
  describeSubmoduleChanges,
} from "../utils/git/submoduleInspection.js";
import { oRe } from "../utils/shutdown/pendingWrites.js";
import { Lee } from "../utils/unsafePathGlyphs.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { Spinner } from "./Spinner.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1693042-1693072 placement
function selectId5(kr) {
  return kr.id;
}
//@ chunk-18hwfzwa.js:1693072-1693097 placement
function yVo() {
  return "?";
}
//@ chunk-18hwfzwa.js:1693097-1693136 placement
function SVo(ls) {
  return ls.trim() !== "";
}
//@ chunk-18hwfzwa.js:1693136-1693156 placement
var LCt = 5000,
  FCt = "";
//@ chunk-18hwfzwa.js:1693156-1693168 placement
var jF = 5000;
//@ chunk-18hwfzwa.js:1693168-1693220 placement
function iK() {
  return require("./chunk-hs5khexj.js");
}
/**
 * 退出 worktree 后回到原工作目录（目录已不存在时逐级向上找存在的父目录），必要时恢复 originalCwd、搬移会话转录，清空 worktree 状态与计划目录缓存。
 */
//@ chunk-18hwfzwa.js:1693220-1693917 placement
async function restoreCwdAfterWorktreeExit(worktreeSession, storageV5) {
  let {
      originalCwd: originalCwd,
      preEnterOriginalCwd: preEnterOriginalCwd,
      liveLaunchAnchor: liveLaunchAnchor,
    } = worktreeSession,
    targetDir = hasUntouchableRecordSpelling(originalCwd) ? homedir_3() : originalCwd;
  while (!0)
    try {
      (processChdir(targetDir), setCwd(targetDir));
      break;
    } catch {
      let Be = dirname_6(targetDir);
      if (Be === targetDir) break;
      targetDir = Be;
    }
  let fellBack = targetDir !== originalCwd;
  if (fellBack)
    logForDebugging(
      `Original directory ${originalCwd} no longer exists \u2014 returned to ${targetDir} instead`,
      { level: "warn" },
    );
  if (!fellBack) {
    let Be = preEnterOriginalCwd ?? originalCwd;
    if (
      liveLaunchAnchor === void 0 ||
      isCoveredByWorktrees(Be, restoreRootsFor(liveLaunchAnchor, worktreeSession.worktreePath), {
        requireCovered: !0,
        coveredWitnesses: worktreeRootsFor(liveLaunchAnchor, worktreeSession.worktreePath),
        extraCoveredRoots: (() => {
          let He = rie(worktreeSession.worktreePath);
          return He !== null ? [He.checkout] : [];
        })(),
      })
    )
      setOriginalCwd(Be);
    try {
      await iK().relocateSessionTranscript(storageV5);
    } catch (error) {
      iK().reportRelocateSessionTranscriptFailure(error, "WorktreeExitDialog");
    }
  }
  (iK().saveWorktreeState(null, storageV5),
    getPlansDirectory.cache.clear?.(),
    primePlanSlugCollisions(storageV5));
}
//@ chunk-18hwfzwa.js:1693917-1694107 placement
function worktreeExitTelemetry(h, x) {
  return {
    commits: h.commits ?? -1,
    ...(h.head !== "not_read" && { head: fromEnum(h.head) }),
    ...("onKeptBranch" in h && { commits_on_kept_branch: h.onKeptBranch ?? -1 }),
    ...(x !== 0 && { worktrees_inside: x ?? -1 }),
  };
}
//@ chunk-18hwfzwa.js:1694107-1694906 placement
function removeWorktreeOnExit(
  h,
  x,
  {
    killTmux: killTmux,
    removedMessage: removedMessage,
    atStake: atStake,
    changedFiles: changedFiles,
    worktreesInside: worktreesInside,
  },
) {
  let Be = async () => {
    if (killTmux && h.tmuxSessionName) await killTmuxSession(h.tmuxSessionName);
    let He = await kEe(h.worktreePath, worktreesInside);
    if (getCurrentWorktreeSession() !== h)
      return worktreeChangedMessage(h.worktreePath, killTmux && Boolean(h.tmuxSessionName));
    let { storageV5: storageV5, credentials: credentials } = x;
    if (He !== null)
      return (
        logEvent("tengu_worktree_kept", {
          changed_files: changedFiles,
          kept_at_removal: !0,
          ...worktreeExitTelemetry(atStake, He.now),
        }),
        await keepWorktree(storageV5),
        He.keptFor
      );
    if (!(await cleanupWorktree(storageV5, credentials)))
      return `Worktree could not be removed \u2014 kept at ${h.worktreePath}`;
    return (
      logEvent("tengu_worktree_removed", {
        source: lit_2("exit_dialog"),
        changed_files: changedFiles,
        ...worktreeExitTelemetry(atStake, worktreesInside),
      }),
      removedMessage()
    );
  };
  return {
    path: h.worktreePath,
    run: Be,
    ignoresHangup:
      killTmux &&
      Boolean(h.tmuxSessionName) &&
      Boolean(env.TMUX) &&
      (env.CLAUDE_CODE_TMUX_SESSION === void 0 || env.CLAUDE_CODE_TMUX_SESSION === h.tmuxSessionName),
  };
}
//@ chunk-18hwfzwa.js:1694906-1695073 layout
function worktreeChangedMessage(h, x) {
  return `The exit didn't remove the worktree at ${h}: this session's worktree changed after Claude Code checked it.${x ? " Tmux session terminated." : ""}`;
}
//@ chunk-18hwfzwa.js:1695073-1695109 layout
async function kEe(h, x) {
  return null;
}
/**
 * 退出 worktree 会话：检查未提交改动与 worktree 状态，选择保留或删除 worktree（必要时先确认丢弃改动），结束 tmux 会话并返回原目录。
 */
//@ chunk-18hwfzwa.js:1695109-1706346 fingerprint = WorktreeExitDialog (0.483)
function WorktreeExitDialog(h) {
  let $ = w(57),
    { onDone: onDone, onCancel: onCancel } = h,
    { storageV5: storageV5, credentials: credentials } = Me(),
    [ke, Re] = y("loading"),
    He;
  if ($[0] === MEMO_CACHE_SENTINEL) ((He = []), ($[0] = He));
  else He = $[0];
  let [We, ze] = y(He),
    [Xe, rt] = y(null),
    [kt, At] = y(null),
    [It, Ot] = y(!1),
    Et;
  if ($[1] === MEMO_CACHE_SENTINEL) ((Et = { head: "not_read", commits: 0 }), ($[1] = Et));
  else Et = $[1];
  let [Dt, Lt] = y(Et),
    [oo, Xt] = y(0),
    [, io] = y(null),
    [so, po] = y(),
    ao = R(void 0),
    [co] = y(getCurrentWorktreeSession),
    id = useSession(selectId5),
    Ao;
  if ($[2] !== id) ((Ao = iK().getCurrentSessionTitle(id)), ($[2] = id), ($[3] = Ao));
  else Ao = $[3];
  let Bo = Ao,
    Ro,
    Ho;
  if ($[4] !== credentials || $[5] !== Bo || $[6] !== storageV5 || $[7] !== co)
    ((Ro = () => {
      let wn = async function wn() {
        if (co?.enteredExisting) {
          (await keepWorktree(storageV5),
            await restoreCwdAfterWorktreeExit(co, storageV5),
            po(`Returned to ${co.originalCwd} (worktree at ${co.worktreePath} left in place)`),
            Re("done"));
          return;
        }
        let resolved = Promise.resolve(0);
        let changeLines = [];
        if (!1 && co) {
          if (co.liveLaunchAnchor !== void 0) {
            (io("not-read"), Xt(await resolved), Re("asking"));
            return;
          }
          Re("checking");
          let mn = await withDeadline(
            getWorkingCopyWorktreeChanges(co.worktreePath, co.originalChangeset, co.originalCwd, {
              statusTimeoutMs: jF,
            }),
            jF,
          );
          if (mn === void 0)
            logForDebugging(
              `hook worktree status check for ${co.worktreePath} outlasted ${jF} ms; asking instead`,
            );
          let Cn = mn ?? null;
          if (((changeLines = Array.from({ length: Cn?.changedFiles ?? 0 }, yVo)), Cn === null || Cn.moved)) {
            if (changeLines.length > 0) ze(changeLines);
            (io(Cn !== null && Cn.changeset !== null ? { movedToChangeset: Cn.changeset } : "unreadable"),
              Xt(await resolved),
              Re("asking"));
            return;
          }
          io({});
        }
        let No = co && !0 ? await buildFilterNeutralizingArgs(co.worktreePath) : void 0;
        let vo = No !== void 0 && !No.ok;
        let Yo =
          !co || !1
            ? { stdout: "", stderr: "", code: 1, error: void 0 }
            : await execFileNoThrowWithCwd(
                gitExe(),
                vo
                  ? [...freeze_7, "rev-parse", "--git-dir"]
                  : [...(No?.ok ? No.args : []), ...freeze_7, ...freeze_2_2],
                {
                  cwd: co.worktreePath,
                  env: buildGitEnvForRepo(co.worktreePath, void 0, { userLocale: !0 }),
                },
              );
        let kn = !1;
        if (co && Yo.code !== 0) {
          try {
            await lstat_2(co.worktreePath);
          } catch (error) {
            let bn = error;
            kn = isENOENT(bn);
          }
        }
        let Go = !1;
        if (!0 && co?.hookBased && Yo.code !== 0 && !kn) {
          try {
            Go = findGitRootUncached(await realpath_2(co.worktreePath)) === null;
          } catch {
            Go = !1;
          }
        }
        let hn = (vo || Yo.code !== 0) && !kn && !Go;
        if (co && !co.hookBased && Yo.code !== 0 && kn) {
          (persistWorktreeSession(null, storageV5),
            clearResumeHintWorktree(),
            await restoreCwdAfterWorktreeExit(co, storageV5));
          let Mn = co.tmuxSessionName
            ? `. Detached tmux session ${co.tmuxSessionName} may still be running \u2014 end it with: tmux kill-session -t ${co.tmuxSessionName}`
            : "";
          (po(`Worktree at ${co.worktreePath} is no longer accessible \u2014 exiting${Mn}`), Re("done"));
          return;
        }
        if (hn) ((changeLines = ["?"]), Ot(!0));
        else if (!vo && Yo.stdout)
          changeLines = Yo.stdout
            .split(
              `
`,
            )
            .filter(SVo);
        let Xo = !1;
        if (co && Yo.code === 0 && !vo) {
          let Sn = submoduleChanges(await inspectSubmodules(co.worktreePath, { deadlineMs: LCt }));
          $n: switch (Sn?.kind) {
            case "changes": {
              ((changeLines = [...changeLines, ...Sn.paths]), rt(describeSubmoduleChanges(Sn)));
              break $n;
            }
            case "unverifiable": {
              ((Xo = !0), At(describeSubmoduleChanges(Sn)));
              break $n;
            }
            case void 0:
          }
        }
        if (changeLines.length > 0) ze(changeLines);
        if (co) {
          let on =
            co.hookBased && !co.originalHeadCommit
              ? { head: "not_read", commits: kn || Go ? 0 : null }
              : await countCommitsAtStake(co, oRe());
          Lt(on);
          let _o = await resolved;
          Xt(_o);
          let cn = co.hookBased && on.commits === null;
          if (changeLines.length === 0 && (on.commits === 0 || cn) && !("onKeptBranch" in on) && !Bo && !Xo) {
            if (_o !== 0 || cn) {
              Re("asking");
              return;
            }
            if ((Re("removing-clean"), !co.hookBased)) {
              (await restoreCwdAfterWorktreeExit(co, storageV5),
                (ao.current = removeWorktreeOnExit(
                  co,
                  { storageV5: storageV5, credentials: credentials },
                  {
                    killTmux: !1,
                    removedMessage: () =>
                      on.head !== "another_branch"
                        ? "Worktree removed (no changes)"
                        : `Worktree removed. ${Lee(on.branch) ? "The branch that it was on" : `Branch ${on.branch}`} is kept.`,
                    atStake: on,
                    changedFiles: 0,
                    worktreesInside: _o,
                  },
                )),
                Re("done"));
              return;
            }
            if (getCurrentWorktreeSession() !== co) {
              (await restoreCwdAfterWorktreeExit(co, storageV5),
                po(worktreeChangedMessage(co.worktreePath, !1)),
                Re("done"));
              return;
            }
            cleanupWorktree(storageV5, credentials).then(async (Dn) => {
              if ((await restoreCwdAfterWorktreeExit(co, storageV5), Dn))
                (logEvent("tengu_worktree_removed", {
                  source: lit_2("exit_dialog"),
                  commits: 0,
                  changed_files: 0,
                }),
                  po("Worktree removed (no changes)"));
              else po(`Worktree could not be removed \u2014 kept at ${co.worktreePath}`);
              Re("done");
            });
            return;
          } else Re("asking");
        }
      };
      wn();
    }),
      (Ho = [co, Bo, storageV5, credentials]),
      ($[4] = credentials),
      ($[5] = Bo),
      ($[6] = storageV5),
      ($[7] = co),
      ($[8] = Ro),
      ($[9] = Ho));
  else ((Ro = $[8]), (Ho = $[9]));
  P(Ro, Ho);
  let Fn, mr;
  if ($[10] !== onDone || $[11] !== so || $[12] !== ke)
    ((Fn = () => {
      if (ke === "done") {
        if (ao.current) onDone(so, { removeWorktree: ao.current });
        else onDone(so);
      }
    }),
      (mr = [ke, onDone, so]),
      ($[10] = onDone),
      ($[11] = so),
      ($[12] = ke),
      ($[13] = Fn),
      ($[14] = mr));
  else ((Fn = $[13]), (mr = $[14]));
  if ((P(Fn, mr), !co)) {
    return (onDone("No active worktree session found", { display: "system" }), null);
  }
  if (ke === "loading" || ke === "done") {
    return null;
  }
  if (ke === "checking") {
    return null;
  }
  let commits = Dt.commits,
    Wn = Dt.head === "another_branch" || Dt.head === "like_its_branch",
    Fr;
  if ($[15] !== Dt.branch || $[16] !== Dt.head)
    ((Fr = Dt.head !== "another_branch" ? null : Lee(Dt.branch) ? "another branch" : `branch ${Dt.branch}`),
      ($[15] = Dt.branch),
      ($[16] = Dt.head),
      ($[17] = Fr));
  else Fr = $[17];
  let Zn = Fr,
    Un;
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
  )
    ((Un = async function Ur(error) {
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
        if (
          (Re("keeping"),
          logEvent("tengu_worktree_kept", { changed_files: We.length, ...worktreeExitTelemetry(Dt, oo) }),
          await keepWorktree(storageV5),
          await restoreCwdAfterWorktreeExit(co, storageV5),
          hasTmux)
        )
          po(
            `Worktree kept. Your work is saved at ${co.worktreePath}${pr}. Reattach to tmux session with: tmux attach -t ${co.tmuxSessionName}`,
          );
        else po(`Worktree kept. Your work is saved at ${co.worktreePath}${pr}`);
        Re("done");
      } else if (error === "keep-kill-tmux") {
        if (
          (Re("keeping"),
          logEvent("tengu_worktree_kept", { changed_files: We.length, ...worktreeExitTelemetry(Dt, oo) }),
          co.tmuxSessionName)
        )
          await killTmuxSession(co.tmuxSessionName);
        (await keepWorktree(storageV5),
          await restoreCwdAfterWorktreeExit(co, storageV5),
          po(`Worktree kept at ${co.worktreePath}${pr}. Tmux session terminated.`),
          Re("done"));
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
          (await restoreCwdAfterWorktreeExit(co, storageV5),
            (ao.current = removeWorktreeOnExit(
              co,
              { storageV5: storageV5, credentials: credentials },
              { killTmux: !0, removedMessage: Pr, atStake: Dt, changedFiles: ur, worktreesInside: oo },
            )),
            Re("done"));
          return;
        }
        if (co.tmuxSessionName) await killTmuxSession(co.tmuxSessionName);
        let ts = await kEe(co.worktreePath, oo);
        if (getCurrentWorktreeSession() !== co) {
          (await restoreCwdAfterWorktreeExit(co, storageV5),
            po(worktreeChangedMessage(co.worktreePath, hasTmux)),
            Re("done"));
          return;
        }
        if (ts !== null) {
          (logEvent("tengu_worktree_kept", {
            changed_files: ur,
            kept_at_removal: !0,
            ...worktreeExitTelemetry(Dt, ts.now),
          }),
            await keepWorktree(storageV5),
            await restoreCwdAfterWorktreeExit(co, storageV5),
            po(ts.keptFor),
            Re("done"));
          return;
        }
        let Gn = await cleanupWorktree(storageV5, credentials);
        if ((await restoreCwdAfterWorktreeExit(co, storageV5), !Gn)) {
          (po(`Worktree could not be removed \u2014 kept at ${co.worktreePath}`), Re("done"));
          return;
        }
        (logEvent("tengu_worktree_removed", {
          source: lit_2("exit_dialog"),
          changed_files: ur,
          ...worktreeExitTelemetry(Dt, oo),
        }),
          po(Pr()),
          Re("done"));
      }
    }),
      ($[18] = Dt),
      ($[19] = We),
      ($[20] = commits),
      ($[21] = credentials),
      ($[22] = Wn),
      ($[23] = Zn),
      ($[24] = storageV5),
      ($[25] = co),
      ($[26] = oo),
      ($[27] = Un));
  else Un = $[27];
  let Ur = Un;
  if (ke === "keeping") {
    let Zr;
    if ($[28] === MEMO_CACHE_SENTINEL)
      ((Zr = r(Box, {
        flexDirection: "row",
        marginY: 1,
        children: [e(Spinner, {}), e(Text, { children: "Keeping worktree\u2026" })],
      })),
        ($[28] = Zr));
    else Zr = $[28];
    return Zr;
  }
  if (ke === "removing-clean" || ke === "removing") {
    let Zr;
    if ($[29] === MEMO_CACHE_SENTINEL) ((Zr = e(Spinner, {})), ($[29] = Zr));
    else Zr = $[29];
    const wr =
      ke === "removing-clean" ? "Cleaning up worktree (no pending changes)\u2026" : "Removing worktree\u2026";
    let zr;
    if ($[30] !== wr)
      ((zr = r(Box, { flexDirection: "row", marginY: 1, children: [Zr, e(Text, { children: wr })] })),
        ($[30] = wr),
        ($[31] = zr));
    else zr = $[31];
    return zr;
  }
  let branchName = co.worktreeBranch;
  const Zr = branchName ?? "the worktree branch",
    wr = Zn === null || Zn === "another branch" ? "the worktree's current branch" : Zn;
  let zr;
  if ($[32] !== Dt || $[33] !== Zr || $[34] !== wr)
    ((zr = describeWhereCommitsAre(Dt, Zr, wr)), ($[32] = Dt), ($[33] = Zr), ($[34] = wr), ($[35] = zr));
  else zr = $[35];
  let fr = zr,
    $r = We.length > 0,
    Yr = It
      ? "uncommitted files that could not be counted (git could not vet the worktree's config or read a checkout there)"
      : `${We.length} uncommitted ${We.length === 1 ? "file" : "files"}${Xe ? ` (including ${Xe})` : ""}`,
    Er = commits === null || commits > 0,
    Vr = kt
      ? ` The worktree's submodules could not be checked for uncommitted work (${kt}); anything uncommitted inside one is lost if you remove the worktree.`
      : "",
    ms;
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
    ms = `This session was named "${Bo}".${!1 ? "" : " Keep the worktree to resume it later, or remove it to clean up."}`;
  else ms = "You are working in a worktree. Keep it to continue working there, or remove it to clean up.";
  if (((ms = ms + Vr), Zn !== null)) ms = ms + ` The worktree is now on ${Zn}, which is kept either way.`;
  let Xs;
  if ($[36] !== Ur || $[37] !== onCancel)
    ((Xs = function Ls() {
      if (onCancel) {
        onCancel();
        return;
      }
      Ur("keep");
    }),
      ($[36] = Ur),
      ($[37] = onCancel),
      ($[38] = Xs));
  else Xs = $[38];
  let Ls = Xs,
    is = co.hookBased && commits === null && !$r && kt === null,
    Ci =
      $r || Er || kt !== null
        ? Wn && !Er
          ? "All uncommitted changes will be lost."
          : is
            ? "Any unpushed commits in the worktree may be lost."
            : Wn
              ? `${$r ? `Uncommitted changes and ${commits === null ? "any " : ""}commits` : commits === null ? "Any commits" : "Commits"} only on ${branchName} will be lost.`
              : "All changes and commits will be lost."
        : "Clean up the worktree directory.",
    hasTmuxSession = Boolean(co.tmuxSessionName),
    Oi;
  if ($[39] !== hasTmuxSession || $[40] !== Ci || $[41] !== co.tmuxSessionName || $[42] !== co.worktreePath)
    ((Oi = hasTmuxSession
      ? [
          {
            label: "Keep worktree and tmux session",
            value: "keep-with-tmux",
            description: `${!1 ? "" : `Stays at ${co.worktreePath}. `}Reattach with: tmux attach -t ${co.tmuxSessionName}`,
          },
          {
            label: "Keep worktree, end tmux session",
            value: "keep-kill-tmux",
            description: !1 ? void 0 : `Keeps worktree at ${co.worktreePath}, terminates tmux session.`,
          },
          { label: "Remove worktree and tmux session", value: "remove-with-tmux", description: Ci },
        ]
      : [
          { label: "Keep worktree", value: "keep", description: !1 ? void 0 : `Stays at ${co.worktreePath}` },
          { label: "Remove worktree", value: "remove", description: Ci },
        ]),
      ($[39] = hasTmuxSession),
      ($[40] = Ci),
      ($[41] = co.tmuxSessionName),
      ($[42] = co.worktreePath),
      ($[43] = Oi));
  else Oi = $[43];
  let Hi = Oi,
    Zi = hasTmuxSession ? "keep-with-tmux" : "keep",
    da;
  if ($[44] !== ms) ((da = ms.trimStart()), ($[44] = ms), ($[45] = da));
  else da = $[45];
  let qn;
  if ($[46] !== co.worktreePath)
    ((qn = !1 && e(Box, { paddingLeft: 2, children: e(Text, { children: co.worktreePath }) })),
      ($[46] = co.worktreePath),
      ($[47] = qn));
  else qn = $[47];
  let ps;
  if ($[48] !== Zi || $[49] !== Ur || $[50] !== Hi)
    ((ps = e(ModelSelector, { defaultFocusValue: Zi, options: Hi, onChange: Ur })),
      ($[48] = Zi),
      ($[49] = Ur),
      ($[50] = Hi),
      ($[51] = ps));
  else ps = $[51];
  let xs;
  if ($[52] !== Ls || $[53] !== da || $[54] !== qn || $[55] !== ps)
    ((xs = r(Dialog, {
      title: !1 ? FCt : "Exiting worktree session",
      subtitle: da,
      onCancel: Ls,
      exitOnCtrlCD: !0,
      children: [qn, ps],
    })),
      ($[52] = Ls),
      ($[53] = da),
      ($[54] = qn),
      ($[55] = ps),
      ($[56] = xs));
  else xs = $[56];
  return xs;
}

export { WorktreeExitDialog };
