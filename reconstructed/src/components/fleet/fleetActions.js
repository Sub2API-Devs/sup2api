/**
 * components/fleet/fleetActions.ts
 *
 * 2.1.316 新增：生成会话的操作菜单（停止、删除、重启等）；附加到选中的会话（在其他终端运行时拒绝），上报 fleet_view_open等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (18)
 * attribution: placement 18
 */
import { stat, stat as stat_2 } from "fs/promises";
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { Ws, prependModeCharacterToInput, ub } from "./FleetRow.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { listAllLiveSessions } from "../../utils/udsMessaging/udsClient.js";
import { SESSION_BUSY_ELSEWHERE_MESSAGE } from "../../utils/sessionAttach.js";
import {
  readJobState,
  getJobDir,
  listJobs,
  isSettled,
  isExecLaunch,
  writeStateAtomic,
  writeJobPinned,
} from "../../services/daemon/jobState.js";
import { statTranscript, jobOutcome } from "./fleetRows.js";
import { findIntermediateUncJunctionAsync, NodeFsOperations } from "../../utils/fsOperations.js";
import { preSeedReplBgJob, spawnBgSession } from "../../cli/bg/bgCommands.js";
import { isFsInaccessible, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { STILL_STARTING_MESSAGE, safeRespawnBgSession } from "./fleetSessions.js";
import { startAttachBeacon, clearAttachBeacon } from "../../daemon/jobs/attachBeacon.js";
import { gAr } from "../../cli/bg/bgSpawnEnv.js";
import { sleep } from "../../utils/sleep.js";
import { ye } from "../../utils/startupMarks.js";
import { m5 } from "../../services/daemon/sessionStatus.js";
import { killJob, deleteJob } from "../../daemon/jobs/killJob.js";
import { writePendingWakeup } from "../../utils/scheduledWakeup.js";
import { formatRmOutcome } from "../../cli/bg/bgDispatch.js";
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { wt } from "../../remote/remoteMode.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { shouldShowDisableAutoConnectDialog } from "../IdeAutoConnectDialog.js";
import { findAvailableIDE, abortIdeSearch } from "../../utils/ide.js";
import { kA } from "../../services/policyLimits/coldStartWaiter.js";
import { isMcpServerBlockedAtConnectTime } from "../../services/mcp/config.js";
import { useIdeAtMentioned } from "../../hooks/useIdeAtMentioned.js";

/**
 * 重启无记录会话时的确认提示文本。
 */
//@ chunk-93kwxas0.js:88380-89213 placement
var RESTART_FRESH_PROMPT =
    "Press enter again to restart this session fresh \u2014 it has no saved " +
    "transcript (stopped before its first response; any conversation it was backgrounded from is untouched).",
  qd =
    "Press enter again to restart this session \u2014 it isn't responding (its conversation is saved and resumes).",
  Kd =
    "Press enter to try the restart again \u2014 couldn't stop the unresponsive session yet (the background service may be restarting).",
  $d =
    "Press enter again to resume this session (it ended while the background service was off), or ctrl+x to delete it.",
  cb = 700,
  Pp =
    "This session's saved conversation is no longer on disk (old transcripts are cleaned up), so there is nothing to resume. ctrl+x deletes the row.",
  Ap =
    "This command's session isn't responding \u2014 ctrl+x stops it; a shell command is never run again for you",
  pb = 5000;
/**
 * 清空 fork 拒绝/重启/失效纪元等提示状态，并清掉对应的错误提示。
 */
//@ chunk-93kwxas0.js:89213-89389 placement
function clearFleetOfferState(h, E) {
  ((h.forkRefusedJobId = null), (h.restartOfferedJobId = null), (h.deadEpochOfferedJobId = null));
  let error = E.getSnapshot().error;
  if (error === RESTART_FRESH_PROMPT || error === qd || error === Kd || error === $d) E.setError(null);
}
/**
 * 对某会话提示“重启”（设置 restartOfferedJobId 和对应错误文案）。
 */
//@ chunk-93kwxas0.js:89389-89500 placement
function offerJobRestart(h, E, k) {
  ((h.forkRefusedJobId = null),
    (h.deadEpochOfferedJobId = null),
    (h.restartOfferedJobId = k),
    E.setError(qd));
}
/**
 * 错误提示仍为指定文案、且没有打开预览/帮助/调试/重命名/分组编辑等浮层时返回 true。
 */
//@ chunk-93kwxas0.js:89500-89692 placement
function isOfferStillShowing(h, E, k, C) {
  let snapshot = E.getSnapshot();
  return (
    h.getSnapshot().error === C &&
    !snapshot.previewOpen &&
    !snapshot.helpOpen &&
    !snapshot.debugOpen &&
    !snapshot.exitPending &&
    snapshot.renaming === null &&
    snapshot.groupEdit === null &&
    k.pending === null
  );
}
/**
 * 编辑器里的输入能否解析为一次派发。
 */
//@ chunk-93kwxas0.js:89692-89819 placement
function hasPendingDispatchInput(h) {
  let { query: query, mode: mode } = h.editor.getSnapshot();
  return (
    Ws(query, mode, prependModeCharacterToInput(query, mode, h.roster.jobs, h.cwdFilter), h.parseScope) !==
    null
  );
}
/**
 * 打开更早的会话（resume 选择器）。
 */
//@ chunk-93kwxas0.js:89819-92349 placement
async function openEarlierSession(h, E, k) {
  let {
      editor: editor,
      roster: roster,
      selection: selection,
      view: view,
      attach: attach,
      storageV5: storageV5,
      mountAt: mountAt,
      canonicalLauncherCwd: canonicalLauncherCwd,
    } = h,
    setError = editor.setError;
  if (attach.getSnapshot().attachingJobId !== null || attach.isPromoting(E.sessionId)) return;
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    E.sessionId !== resumePromoteSessionId &&
    attach.isPromoting(resumePromoteSessionId)
  )
    return;
  (attach.beginPromote(E.sessionId),
    view.closeResumePicker(),
    logEvent("tengu_fleetview_earlier_open", { ms_since_mount: Date.now() - mountAt, via: fromEnum(k) }));
  let sliced = E.sessionId.slice(0, 8),
    W = (ge, se, ne) => {
      if ((attach.endPromote(E.sessionId), view.resumePromoteSessionId === E.sessionId))
        view.resumePromoteSessionId = null;
      if (k === "resume_picker")
        if (ge === "bad") logFeatureBad("fleet_view_resume_picker", se);
        else logFeatureSad("fleet_view_resume_picker", se);
      setError(ne);
    },
    z;
  try {
    if ((await listAllLiveSessions(storageV5)).some((me) => me.sessionId === E.sessionId)) {
      W("sad", "session_live_elsewhere", SESSION_BUSY_ELSEWHERE_MESSAGE);
      return;
    }
    if (roster.isDeleting(sliced) || roster.isDeletingSession(E.sessionId)) {
      W("sad", "deleting_in_flight", "This session is being deleted \u2014 reopen /resume once it finishes");
      return;
    }
    if ((await readJobState(getJobDir(sliced), storageV5)) !== null) {
      W("sad", "already_in_list", "This session is already in the list \u2014 press enter on its row");
      return;
    }
    if (
      (await listJobs(void 0, storageV5)).some(
        (me) => me.state.sessionId === E.sessionId || me.state.resumeSessionId === E.sessionId,
      )
    ) {
      W("sad", "already_in_list", "This session is already in the list \u2014 press enter on its row");
      return;
    }
    let ne;
    try {
      ne = await statTranscript(E.fullPath, storageV5);
    } catch {
      ne = { kind: "absent" };
    }
    if (ne.kind === "absent") {
      W(
        "bad",
        "transcript_gone",
        "This conversation's file is no longer on disk \u2014 it may have been cleaned up",
      );
      return;
    }
    if (ne.kind === "refused") {
      W(
        "bad",
        "transcript_refused",
        "This conversation's file is a symbolic link or not a regular file, so it can't be opened from here \u2014 if it's a link, resume from the directory that holds the real file",
      );
      return;
    }
    if (ne.kind === "unreadable") {
      W("sad", "transcript_unverified", "Couldn't read this conversation's file just now \u2014 try again");
      return;
    }
    let cwd = E.cwd;
    if (
      !ub(E.cwd) ||
      (await findIntermediateUncJunctionAsync(NodeFsOperations, E.cwd, {
        surfaceNetworkRaw: !0,
        unreadableAncestry: "unverified",
      })) !== void 0
    )
      cwd = canonicalLauncherCwd;
    else
      try {
        if (!(await stat_2(E.cwd)).isDirectory()) cwd = canonicalLauncherCwd;
      } catch {
        cwd = canonicalLauncherCwd;
      }
    if (cwd !== E.cwd && k === "resume_picker") logFeatureSad("fleet_view_resume_picker", "cwd_fallback");
    ({ state: z } = await preSeedReplBgJob(
      E.sessionId,
      {
        intent: E.title,
        name: E.title,
        cwd: cwd,
        inFlight: { tasks: 0, queued: 0, kinds: [] },
        linkScanPath: E.fullPath,
      },
      storageV5,
    ));
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`[fleetview] past-session seed write failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    W("bad", "promote_failed", `Couldn't open ${E.title} \u2014 ${errorMessage(error)}`);
    return;
  }
  let oe = { id: sliced, state: z, activity: jobOutcome(z) };
  ((selection.followId = sliced), roster.updatePendings((ge) => [...ge, oe]), attachToJob(h, oe));
}
/**
 * 附加到选中的会话（在其他终端运行时拒绝），上报 fleet_view_open。
 */
//@ chunk-93kwxas0.js:92349-95209 placement
function attachToJob(h, E, k) {
  let {
      editor: editor,
      roster: roster,
      view: view,
      attach: attach,
      deleteConfirm: deleteConfirm,
      storageV5: storageV5,
      onAction: onAction,
      pendings: pendings,
    } = h,
    setError = editor.setError,
    startTime = performance.now();
  if (!E || attach.getSnapshot().attachingJobId !== null) return;
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    E.state.sessionId !== resumePromoteSessionId &&
    attach.isPromoting(resumePromoteSessionId)
  )
    return;
  if ((view.closeResumePicker(), pendings.some((ae) => ae.id === E.id))) return;
  if (E.state.backend === "peer") {
    (setError("Can't attach \u2014 this session is running in another terminal"),
      logFeatureOk("fleet_view_open"));
    return;
  }
  if (E.state.backend === "remote") {
    if (E.id.startsWith("remote-pending-")) {
      (setError(STILL_STARTING_MESSAGE), logFeatureOk("fleet_view_open"));
      return;
    }
    onAction({
      type: "open",
      job: E,
      ...(hasPendingDispatchInput(h) && { keepQuery: !0 }),
      respawnResult: { ok: !0, short: E.id, state: E.state },
      gestureT0: startTime,
    });
    return;
  }
  if (roster.terminalHolderOf(E) !== void 0) {
    (setError(SESSION_BUSY_ELSEWHERE_MESSAGE), logFeatureOk("fleet_view_open"));
    return;
  }
  if (
    E.state.deadEpochReapedAt !== void 0 &&
    isSettled(E.state) &&
    !isExecLaunch(E.state) &&
    attach.forkRefusedJobId !== E.id
  ) {
    if (attach.deadEpochGoneJobId === E.id) {
      (setError(Pp), logFeatureOk("fleet_view_open"));
      return;
    }
    let ae = attach.deadEpochOfferedJobId === E.id && isOfferStillShowing(editor, view, deleteConfirm, $d);
    if (ae && attach.deadEpochOfferAgeMs() < cb) {
      attach.deadEpochOfferedJobId = E.id;
      return;
    }
    if (!ae) {
      ((attach.forkRefusedJobId = null),
        (attach.restartOfferedJobId = null),
        (attach.deadEpochOfferedJobId = E.id),
        setError($d),
        logEvent("tengu_fleetview_dead_epoch_offer", {}),
        logFeatureOk("fleet_view_open"));
      return;
    }
    attach.deadEpochOfferedJobId = null;
  } else if (attach.deadEpochOfferedJobId === E.id) attach.deadEpochOfferedJobId = null;
  let W =
    k !== "esc" &&
    isOfferStillShowing(editor, view, deleteConfirm, RESTART_FRESH_PROMPT) &&
    attach.forkRefusedJobId === E.id;
  if (W) attach.forkRefusedJobId = null;
  let z =
      k !== "esc" &&
      (isOfferStillShowing(editor, view, deleteConfirm, qd) ||
        isOfferStillShowing(editor, view, deleteConfirm, Kd)) &&
      attach.restartOfferedJobId === E.id &&
      !isExecLaunch(E.state),
    oe = attach.restartOfferedJobId === E.id;
  if (oe) attach.restartOfferedJobId = null;
  let ge = randomUUID_2();
  (startAttachBeacon(ge, "fleet", storageV5).catch(() => {}), attach.arm(E.id, ge), setError(null));
  let nextRespawnAttempt = attach.nextRespawnAttempt(),
    warming = attach.getWarming(E.id);
  if (!warming)
    ((warming = safeRespawnBgSession(
      E.id,
      {
        knownState: E.state,
        ...(W && { forceRefusalRetry: !0 }),
        ...(z && { forceUnresponsive: !0, replyOnResume: E.state.tempo === "active" }),
      },
      storageV5,
    )),
      attach.trackWarming(E.id, warming));
  warming.then((ae) => {
    if (!attach.isCurrentRespawnAttempt(nextRespawnAttempt)) {
      clearAttachBeacon(ge, storageV5).catch(() => {});
      return;
    }
    if ((attach.disarm(), !ae.ok && ae.errorCode === "kill_unconfirmed")) {
      (logFeatureSad("fleet_view_open", "restart_stop_unconfirmed"),
        logForDebugging(`[FV-attach] confirmed restart of ${E.id} could not stop the worker: ${ae.error}`, {
          level: "warn",
        }),
        clearAttachBeacon(ge, storageV5).catch(() => {}),
        (attach.restartOfferedJobId = E.id),
        setError(Kd));
      return;
    }
    if (ae.ok || ae.alive)
      onAction({
        type: "open",
        job: E,
        ...(hasPendingDispatchInput(h) && { keepQuery: !0 }),
        ...(oe && { afterNoResponse: !0 }),
        respawnResult: ae,
        gestureT0: startTime,
        gestureId: ge,
      });
    else if (ae.errorCode === "fork_transcript_never_materialized")
      (clearAttachBeacon(ge, storageV5).catch(() => {}),
        logFeatureSad("fleet_view_open", "fork_transcript_never_materialized"),
        (attach.forkRefusedJobId = E.id),
        setError(RESTART_FRESH_PROMPT));
    else if (ae.errorCode === "resume_session_live_elsewhere")
      (clearAttachBeacon(ge, storageV5).catch(() => {}),
        logFeatureSad("fleet_view_open", "resume_session_live_elsewhere"),
        setError(ae.error));
    else if (ae.errorCode === "dead_epoch_transcript_gone")
      (clearAttachBeacon(ge, storageV5).catch(() => {}),
        logFeatureSad("fleet_view_open", "dead_epoch_transcript_gone"),
        (attach.deadEpochGoneJobId = E.id),
        setError(Pp));
    else
      (logFeatureBad("fleet_view_open", "respawn_failed"),
        setError(ae.error),
        clearAttachBeacon(ge, storageV5).catch(() => {}));
  });
}
/**
 * 从 Agents 视图新建会话。
 */
//@ chunk-93kwxas0.js:95209-96222 placement
function openNewSession(h, E) {
  let { editor: editor, roster: roster, attach: attach, storageV5: storageV5 } = h,
    setError = editor.setError,
    snapshot = attach.getSnapshot();
  if (snapshot.newSessionOpening || snapshot.attachingJobId !== null) return;
  let beginNewSession = attach.beginNewSession();
  setError(null);
  let D = () => attach.isCurrentNewSessionAttempt(beginNewSession);
  spawnBgSession([...gAr()], void 0, "shell", E, void 0, void 0, void 0, storageV5).then(
    async (U) => {
      try {
        if (!U.ok) {
          if (!D()) return;
          (attach.endNewSession(),
            logFeatureBad("fleet_view_new_session", U.reason ?? "spawn_failed"),
            setError(U.error));
          return;
        }
        roster.reload();
        let N = Date.now() + pb,
          X = roster.jobs?.find((K) => K.id === U.short);
        while (!X && Date.now() < N && D())
          (await sleep(100), (X = roster.jobs?.find((K) => K.id === U.short)));
        if (!D()) return;
        if ((attach.endNewSession(), !X)) {
          (logFeatureSad("fleet_view_new_session", "row_pending"),
            setError("Still starting \u2014 open the new session once it appears"));
          return;
        }
        (logFeatureOk("fleet_view_new_session"), attachToJob(h, X));
      } catch (error) {
        if (!D()) return;
        (attach.endNewSession(),
          logError(error),
          logFeatureBad("fleet_view_new_session", "threw"),
          setError(`Couldn't start a new session \u2014 ${errorMessage(error)}`));
      }
    },
    (U) => {
      if (!D()) return;
      (attach.endNewSession(),
        logError(U),
        logFeatureBad("fleet_view_new_session", "threw"),
        setError(`Couldn't start a new session \u2014 ${errorMessage(U)}`));
    },
  );
}
/**
 * 记 tengu_bg_agent_action（action、来源 fleet、会话 id、状态、tempo）。
 */
//@ chunk-93kwxas0.js:96222-96372 placement
function logFleetJobAction(h, E, k) {
  logEvent("tengu_bg_agent_action", {
    action: fromEnum(h),
    source: lit("fleet"),
    jobSessionId: ye(E.sessionId),
    jobState: m5(E.state),
    tempo: fromEnum(E.tempo),
    ...k,
  });
}
//@ chunk-93kwxas0.js:96372-96460 placement
class FleetActionUnconfirmedError extends Error {
  constructor(h) {
    super(h);
    this.name = "FleetActionUnconfirmedError";
  }
}
/**
 * 生成会话的操作菜单（停止、删除、重启等）。
 */
//@ chunk-93kwxas0.js:96460-99383 placement
function buildJobActions(h, E, k, C, x, T) {
  return [
    {
      key: "x",
      label: "stop",
      bands: ["active", "blocked"],
      run: async (A) => {
        E(A.id);
        let iso = new Date().toISOString(),
          V = k(
            (D) =>
              D.map((U) =>
                U.id === A.id && !isSettled(U.state)
                  ? {
                      ...U,
                      state: {
                        ...U.state,
                        state: "stopped",
                        detail: "stopped",
                        tempo: "idle",
                        updatedAt: iso,
                        firstTerminalAt: U.state.firstTerminalAt ?? iso,
                        lastTerminalAt: iso,
                      },
                      activity: "stopped",
                    }
                  : U,
              ),
            void 0,
            A.id,
          );
        try {
          let D = await killJob(A.id, A.state, void 0, T);
          if (!D.confirmed)
            throw (
              logFeatureBad("fleet_view_stop_job", "kill_unconfirmed"),
              new FleetActionUnconfirmedError(D.error ?? "worker may still be running")
            );
          (logEvent("tengu_bg_agent_action", {
            action: lit("stop"),
            source: lit("fleet"),
            jobSessionId: ye(A.state.sessionId),
          }),
            logFeatureOk("fleet_view_stop_job"));
          let U = getJobDir(A.id);
          await writePendingWakeup(U, void 0);
          let N = await readJobState(U, T);
          if (N && !isSettled(N))
            await writeStateAtomic(
              U,
              {
                ...N,
                state: "stopped",
                detail: "stopped",
                tempo: "idle",
                updatedAt: iso,
                firstTerminalAt: N.firstTerminalAt ?? iso,
              },
              T,
            );
        } finally {
          (V?.(), h());
        }
      },
    },
    {
      key: "x",
      label: "delete",
      bands: ["completed"],
      run: async (A, { bulk: bulk }) => {
        let V = x(A.id),
          D = {
            ...(V?.discardOffer !== void 0 && { discardOffer: V.discardOffer }),
            ...(V?.forceRemoveOffer !== void 0 && { forceRemoveOffer: V.forceRemoveOffer }),
          },
          U = bulk ? void 0 : V?.discardOffer,
          N = bulk ? void 0 : V?.forceRemoveOffer;
        if (!bulk) C(A.id, null);
        let X = k((W) => W.filter((z) => z.id !== A.id), A.id),
          K;
        try {
          if (
            ((K = await deleteJob(
              A.id,
              {
                force: !0,
                ...(U !== void 0 && { discardUnpushed: U.pin }),
                ...(N !== void 0 && { forceRemoveWorktree: N.worktreeDigest }),
              },
              T,
            )),
            !K.removed && !K.keptWorktree)
          )
            throw (
              logFeatureBad("fleet_view_delete_job", K.errorCode ?? "delete_unconfirmed"),
              C(A.id, { notice: K.error ?? "worker may still be running", ...D }),
              new FleetActionUnconfirmedError(K.error ?? "worker may still be running")
            );
        } finally {
          (X?.(), h());
        }
        if (!K.removed) {
          let {
              keptErrorSummary: keptErrorSummary,
              keptUnpushed: keptUnpushed,
              discardUnpushed: discardUnpushed,
              forceRemoveWorktree: forceRemoveWorktree,
              forceRemoveWithheld: forceRemoveWithheld,
              submoduleWork: submoduleWork,
            } = K,
            ae = K.keptWorktree ?? "",
            me = K.keptReason ?? "remove_failed";
          logFeatureSad("fleet_view_delete_job", `worktree_kept_${me}`);
          let Je = formatRmOutcome(
            {
              reason: me,
              errorSummary: keptErrorSummary,
              unpushed: keptUnpushed,
              discardUnpushed: discardUnpushed,
              forceRemove: forceRemoveWorktree,
              forceRemoveWithheld: forceRemoveWithheld,
              submoduleWork: submoduleWork,
            },
            { worktree: ae, jobId: A.id },
          );
          return (
            C(A.id, {
              notice: Je.row,
              ...(bulk && D),
              ...(discardUnpushed !== void 0 && { discardOffer: { pin: discardUnpushed, worktree: ae } }),
              ...(forceRemoveWorktree !== void 0 && {
                forceRemoveOffer: { worktreeDigest: forceRemoveWorktree.worktreeDigest },
              }),
            }),
            Je.footer
          );
        }
        if (K.leftWorktreeDir) logFeatureSad("fleet_view_delete_job", "worktree_left_in_place");
        else if (K.forcedWorktreeRemoval) logFeatureSad("fleet_view_delete_job", "worktree_force_removed");
        else logFeatureOk("fleet_view_delete_job");
        if (A.state.pinned) writeJobPinned(A.id, !1, T).catch(() => {});
        if (
          (logEvent("tengu_bg_agent_action", {
            action: lit("delete"),
            source: lit("fleet"),
            jobSessionId: ye(A.state.sessionId),
          }),
          K.leftWorktreeDir)
        )
          return `Worktree directory left at ${K.leftWorktreeDir} \u2014 git no longer recognized it; the session was deleted`;
        if (K.forcedWorktreeRemoval) {
          let { worktree: worktree, keptBranch: keptBranch } = K.forcedWorktreeRemoval;
          return `Session deleted and its worktree directory deleted by force: ${worktree}${keptBranch ? ` (branch ${keptBranch} was left in the repository)` : ""}`;
        }
        if (U !== void 0 || N !== void 0)
          return K.discardConfirmed && U !== void 0
            ? `Session deleted and its worktree removed: ${U.worktree}`
            : "Session deleted";
      },
    },
  ];
}
//@ chunk-93kwxas0.js:99383-99387 placement
j();
//@ chunk-93kwxas0.js:99420-99424 placement
j();
/**
 * 检测 IDE 扩展并生成对应 MCP 客户端配置。
 */
//@ chunk-93kwxas0.js:99424-99961 placement
function useIdeMcpClients(h) {
  let [E, k] = y([]);
  (P(() => {
    if (wt() || isBgSession()) return;
    if (!shouldShowDisableAutoConnectDialog()) return;
    let C = !1;
    return (
      findAvailableIDE().then(async (x) => {
        if (C || !x) return;
        let T = {
          type: x.url.startsWith("ws:") ? "ws-ide" : "sse-ide",
          url: x.url,
          ideName: x.name,
          authToken: x.authToken,
          ideRunningInWindows: x.ideRunningInWindows,
          scope: "dynamic",
        };
        if ((await kA(), C || isMcpServerBlockedAtConnectTime("ide", T))) return;
        let { clearServerCache: clearServerCache, connectToServer: connectToServer } =
            require("./chunk-asne9cp8.js").mcpClientModule(),
          V = await connectToServer("ide", T);
        if (C) return;
        if (V.type !== "connected") clearServerCache("ide", T).catch(() => {});
        k([V]);
      }),
      () => {
        ((C = !0), abortIdeSearch());
      }
    );
  }, []),
    useIdeAtMentioned(E, h));
}
//@ chunk-93kwxas0.js:99961-99965 placement
j();
//@ chunk-93kwxas0.js:99965-100002 placement
function xb(W) {
  return W.sessionModel;
}
//@ chunk-93kwxas0.js:100002-100040 placement
function Fb(z) {
  return z.sessionEffort;
}
//@ chunk-93kwxas0.js:100040-100082 placement
function Pb(oe) {
  return oe.sessionFastMode;
}

export {
  clearFleetOfferState,
  useIdeMcpClients,
  buildJobActions,
  openEarlierSession,
  attachToJob,
  openNewSession,
  logFleetJobAction,
  Ap,
  offerJobRestart,
  xb,
  Fb,
  Pb,
  FleetActionUnconfirmedError,
};
