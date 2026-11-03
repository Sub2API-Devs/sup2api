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
import { stat } from "fs/promises";
import { randomUUID } from "crypto";
import { parseDraftInput, prependModeCharacterToInput, isDispatchablePath } from "./FleetRow.js";
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
import { spareExtraArgs } from "../../cli/bg/bgSpawnEnv.js";
import { sleep } from "../../utils/sleep.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { daemonSessionStateLabel } from "../../services/daemon/sessionStatus.js";
import { killJob, deleteJob } from "../../daemon/jobs/killJob.js";
import { writePendingWakeup } from "../../utils/scheduledWakeup.js";
import { formatRmOutcome } from "../../cli/bg/bgDispatch.js";
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { shouldShowDisableAutoConnectDialog } from "../IdeAutoConnectDialog.js";
import { findAvailableIDE, abortIdeSearch } from "../../utils/ide.js";
import { awaitPolicyColdStartWaiter } from "../../services/policyLimits/coldStartWaiter.js";
import { isMcpServerBlockedAtConnectTime } from "../../services/mcp/config.js";
import { useIdeAtMentioned } from "../../hooks/useIdeAtMentioned.js";

//@ chunk-93kwxas0.js:88380-89213 placement
/**
 * 重启无记录会话时的确认提示文本。
 */
var RESTART_FRESH_PROMPT =
  "Press enter again to restart this session fresh \u2014 it has no saved " +
  "transcript (stopped before its first response; any conversation it was backgrounded from is untouched).";
var RESTART_NOT_RESPONDING_PROMPT =
  "Press enter again to restart this session \u2014 it isn't responding (its conversation is saved and resumes).";
var RESTART_RETRY_PROMPT =
  "Press enter to try the restart again \u2014 couldn't stop the unresponsive session yet (the background service may be restarting).";
var RESUME_AFTER_SERVICE_PROMPT =
  "Press enter again to resume this session (it ended while the background service was off), or ctrl+x to delete it.";
var AUTO_REFRESH_DEBOUNCE_MS = 700;
var TRANSCRIPT_GONE_TEXT =
  "This session's saved conversation is no longer on disk (old transcripts are cleaned up), so there is nothing to resume. ctrl+x deletes the row.";
var COMMAND_NOT_RESPONDING_TEXT =
  "This command's session isn't responding \u2014 ctrl+x stops it; a shell command is never run again for you";
var RESTART_OFFER_TIMEOUT_MS = 5000;
//@ chunk-93kwxas0.js:89213-89389 placement
/**
 * 清空 fork 拒绝/重启/失效纪元等提示状态，并清掉对应的错误提示。
 */
function clearFleetOfferState(h, E) {
  h.forkRefusedJobId = null;
  h.restartOfferedJobId = null;
  h.deadEpochOfferedJobId = null;
  let error = E.getSnapshot().error;
  if (
    error === RESTART_FRESH_PROMPT ||
    error === RESTART_NOT_RESPONDING_PROMPT ||
    error === RESTART_RETRY_PROMPT ||
    error === RESUME_AFTER_SERVICE_PROMPT
  )
    E.setError(null);
}
//@ chunk-93kwxas0.js:89389-89500 placement
/**
 * 对某会话提示“重启”（设置 restartOfferedJobId 和对应错误文案）。
 */
function offerJobRestart(fleetLiveStatus, fleetEditor, restartOfferedJobId) {
  fleetLiveStatus.forkRefusedJobId = null;
  fleetLiveStatus.deadEpochOfferedJobId = null;
  fleetLiveStatus.restartOfferedJobId = restartOfferedJobId;
  fleetEditor.setError(RESTART_NOT_RESPONDING_PROMPT);
}
//@ chunk-93kwxas0.js:89500-89692 placement
/**
 * 错误提示仍为指定文案、且没有打开预览/帮助/调试/重命名/分组编辑等浮层时返回 true。
 */
function isOfferStillShowing(editor, view, deleteConfirm, C) {
  let snapshot = view.getSnapshot();
  return (
    editor.getSnapshot().error === C &&
    !snapshot.previewOpen &&
    !snapshot.helpOpen &&
    !snapshot.debugOpen &&
    !snapshot.exitPending &&
    snapshot.renaming === null &&
    snapshot.groupEdit === null &&
    deleteConfirm.pending === null
  );
}
//@ chunk-93kwxas0.js:89692-89819 placement
/**
 * 编辑器里的输入能否解析为一次派发。
 */
function hasPendingDispatchInput(h) {
  let { query, mode } = h.editor.getSnapshot();
  return (
    parseDraftInput(
      query,
      mode,
      prependModeCharacterToInput(query, mode, h.roster.jobs, h.cwdFilter),
      h.parseScope,
    ) !== null
  );
}
//@ chunk-93kwxas0.js:89819-92349 placement
/**
 * 打开更早的会话（resume 选择器）。
 */
async function openEarlierSession(h, E, k) {
  let { editor, roster, selection, view, attach, storageV5, mountAt, canonicalLauncherCwd } = h;
  let setError = editor.setError;
  if (attach.getSnapshot().attachingJobId !== null || attach.isPromoting(E.sessionId)) return;
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    E.sessionId !== resumePromoteSessionId &&
    attach.isPromoting(resumePromoteSessionId)
  )
    return;
  attach.beginPromote(E.sessionId);
  view.closeResumePicker();
  logEvent("tengu_fleetview_earlier_open", {
    ms_since_mount: Date.now() - mountAt,
    via: fromEnum(k),
  });
  let sliced = E.sessionId.slice(0, 8);
  let W = (ge, se, ne) => {
    attach.endPromote(E.sessionId);
    if (view.resumePromoteSessionId === E.sessionId) view.resumePromoteSessionId = null;
    if (k === "resume_picker")
      if (ge === "bad") logFeatureBad("fleet_view_resume_picker", se);
      else logFeatureSad("fleet_view_resume_picker", se);
    setError(ne);
  };
  let z;
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
      (await listJobs(undefined, storageV5)).some(
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
      ne = {
        kind: "absent",
      };
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
      !isDispatchablePath(E.cwd) ||
      (await findIntermediateUncJunctionAsync(NodeFsOperations, E.cwd, {
        surfaceNetworkRaw: true,
        unreadableAncestry: "unverified",
      })) !== undefined
    )
      cwd = canonicalLauncherCwd;
    else
      try {
        if (!(await stat(E.cwd)).isDirectory()) cwd = canonicalLauncherCwd;
      } catch {
        cwd = canonicalLauncherCwd;
      }
    if (cwd !== E.cwd && k === "resume_picker") logFeatureSad("fleet_view_resume_picker", "cwd_fallback");
    ({ state: z } = await preSeedReplBgJob(
      E.sessionId,
      {
        intent: E.title,
        name: E.title,
        cwd,
        inFlight: {
          tasks: 0,
          queued: 0,
          kinds: [],
        },
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
  let oe = {
    id: sliced,
    state: z,
    activity: jobOutcome(z),
  };
  selection.followId = sliced;
  roster.updatePendings((ge) => [...ge, oe]);
  attachToJob(h, oe);
}
//@ chunk-93kwxas0.js:92349-95209 placement
/**
 * 附加到选中的会话（在其他终端运行时拒绝），上报 fleet_view_open。
 */
function attachToJob(h, E, k) {
  let { editor, roster, view, attach, deleteConfirm, storageV5, onAction, pendings } = h;
  let setError = editor.setError;
  let gestureT0 = performance.now();
  if (!E || attach.getSnapshot().attachingJobId !== null) return;
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    E.state.sessionId !== resumePromoteSessionId &&
    attach.isPromoting(resumePromoteSessionId)
  )
    return;
  view.closeResumePicker();
  if (pendings.some((pending) => pending.id === E.id)) return;
  if (E.state.backend === "peer") {
    setError("Can't attach \u2014 this session is running in another terminal");
    logFeatureOk("fleet_view_open");
    return;
  }
  if (E.state.backend === "remote") {
    if (E.id.startsWith("remote-pending-")) {
      setError(STILL_STARTING_MESSAGE);
      logFeatureOk("fleet_view_open");
      return;
    }
    onAction({
      type: "open",
      job: E,
      ...(hasPendingDispatchInput(h) && {
        keepQuery: true,
      }),
      respawnResult: {
        ok: true,
        short: E.id,
        state: E.state,
      },
      gestureT0,
    });
    return;
  }
  if (roster.terminalHolderOf(E) !== undefined) {
    setError(SESSION_BUSY_ELSEWHERE_MESSAGE);
    logFeatureOk("fleet_view_open");
    return;
  }
  if (
    E.state.deadEpochReapedAt !== undefined &&
    isSettled(E.state) &&
    !isExecLaunch(E.state) &&
    attach.forkRefusedJobId !== E.id
  ) {
    if (attach.deadEpochGoneJobId === E.id) {
      setError(TRANSCRIPT_GONE_TEXT);
      logFeatureOk("fleet_view_open");
      return;
    }
    let ae =
      attach.deadEpochOfferedJobId === E.id &&
      isOfferStillShowing(editor, view, deleteConfirm, RESUME_AFTER_SERVICE_PROMPT);
    if (ae && attach.deadEpochOfferAgeMs() < AUTO_REFRESH_DEBOUNCE_MS) {
      attach.deadEpochOfferedJobId = E.id;
      return;
    }
    if (!ae) {
      attach.forkRefusedJobId = null;
      attach.restartOfferedJobId = null;
      attach.deadEpochOfferedJobId = E.id;
      setError(RESUME_AFTER_SERVICE_PROMPT);
      logEvent("tengu_fleetview_dead_epoch_offer", {});
      logFeatureOk("fleet_view_open");
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
    (isOfferStillShowing(editor, view, deleteConfirm, RESTART_NOT_RESPONDING_PROMPT) ||
      isOfferStillShowing(editor, view, deleteConfirm, RESTART_RETRY_PROMPT)) &&
    attach.restartOfferedJobId === E.id &&
    !isExecLaunch(E.state);
  let oe = attach.restartOfferedJobId === E.id;
  if (oe) attach.restartOfferedJobId = null;
  let ge = randomUUID();
  startAttachBeacon(ge, "fleet", storageV5).catch(() => {});
  attach.arm(E.id, ge);
  setError(null);
  let se = attach.nextRespawnAttempt();
  let warming = attach.getWarming(E.id);
  if (!warming) {
    warming = safeRespawnBgSession(
      E.id,
      {
        knownState: E.state,
        ...(W && {
          forceRefusalRetry: true,
        }),
        ...(z && {
          forceUnresponsive: true,
          replyOnResume: E.state.tempo === "active",
        }),
      },
      storageV5,
    );
    attach.trackWarming(E.id, warming);
  }
  warming.then((ae) => {
    if (!attach.isCurrentRespawnAttempt(se)) {
      clearAttachBeacon(ge, storageV5).catch(() => {});
      return;
    }
    attach.disarm();
    if (!ae.ok && ae.errorCode === "kill_unconfirmed") {
      logFeatureSad("fleet_view_open", "restart_stop_unconfirmed");
      logForDebugging(`[FV-attach] confirmed restart of ${E.id} could not stop the worker: ${ae.error}`, {
        level: "warn",
      });
      clearAttachBeacon(ge, storageV5).catch(() => {});
      attach.restartOfferedJobId = E.id;
      setError(RESTART_RETRY_PROMPT);
      return;
    }
    if (ae.ok || ae.alive)
      onAction({
        type: "open",
        job: E,
        ...(hasPendingDispatchInput(h) && {
          keepQuery: true,
        }),
        ...(oe && {
          afterNoResponse: true,
        }),
        respawnResult: ae,
        gestureT0,
        gestureId: ge,
      });
    else if (ae.errorCode === "fork_transcript_never_materialized") {
      clearAttachBeacon(ge, storageV5).catch(() => {});
      logFeatureSad("fleet_view_open", "fork_transcript_never_materialized");
      attach.forkRefusedJobId = E.id;
      setError(RESTART_FRESH_PROMPT);
    } else if (ae.errorCode === "resume_session_live_elsewhere") {
      clearAttachBeacon(ge, storageV5).catch(() => {});
      logFeatureSad("fleet_view_open", "resume_session_live_elsewhere");
      setError(ae.error);
    } else if (ae.errorCode === "dead_epoch_transcript_gone") {
      clearAttachBeacon(ge, storageV5).catch(() => {});
      logFeatureSad("fleet_view_open", "dead_epoch_transcript_gone");
      attach.deadEpochGoneJobId = E.id;
      setError(TRANSCRIPT_GONE_TEXT);
    } else {
      logFeatureBad("fleet_view_open", "respawn_failed");
      setError(ae.error);
      clearAttachBeacon(ge, storageV5).catch(() => {});
    }
  });
}
//@ chunk-93kwxas0.js:95209-96222 placement
/**
 * 从 Agents 视图新建会话。
 */
function openNewSession(h, E) {
  let { editor, roster, attach, storageV5 } = h;
  let setError = editor.setError;
  let snapshot = attach.getSnapshot();
  if (snapshot.newSessionOpening || snapshot.attachingJobId !== null) return;
  let V = attach.beginNewSession();
  setError(null);
  let D = () => attach.isCurrentNewSessionAttempt(V);
  spawnBgSession(
    [...spareExtraArgs()],
    undefined,
    "shell",
    E,
    undefined,
    undefined,
    undefined,
    storageV5,
  ).then(
    async (bgSession) => {
      try {
        if (!bgSession.ok) {
          if (!D()) return;
          attach.endNewSession();
          logFeatureBad("fleet_view_new_session", bgSession.reason ?? "spawn_failed");
          setError(bgSession.error);
          return;
        }
        roster.reload();
        let N = Date.now() + RESTART_OFFER_TIMEOUT_MS;
        let found = roster.jobs?.find((job) => job.id === bgSession.short);
        while (!found && Date.now() < N && D()) {
          await sleep(100);
          found = roster.jobs?.find((job) => job.id === bgSession.short);
        }
        if (!D()) return;
        attach.endNewSession();
        if (!found) {
          logFeatureSad("fleet_view_new_session", "row_pending");
          setError("Still starting \u2014 open the new session once it appears");
          return;
        }
        logFeatureOk("fleet_view_new_session");
        attachToJob(h, found);
      } catch (error) {
        if (!D()) return;
        attach.endNewSession();
        logError(error);
        logFeatureBad("fleet_view_new_session", "threw");
        setError(`Couldn't start a new session \u2014 ${errorMessage(error)}`);
      }
    },
    (error) => {
      if (!D()) return;
      attach.endNewSession();
      logError(error);
      logFeatureBad("fleet_view_new_session", "threw");
      setError(`Couldn't start a new session \u2014 ${errorMessage(error)}`);
    },
  );
}
//@ chunk-93kwxas0.js:96222-96372 placement
/**
 * 记 tengu_bg_agent_action（action、来源 fleet、会话 id、状态、tempo）。
 */
function logFleetJobAction(h, state, k) {
  logEvent("tengu_bg_agent_action", {
    action: fromEnum(h),
    source: lit("fleet"),
    jobSessionId: sanitizeMarkName(state.sessionId),
    jobState: daemonSessionStateLabel(state.state),
    tempo: fromEnum(state.tempo),
    ...k,
  });
}
//@ chunk-93kwxas0.js:96372-96460 placement
class FleetActionUnconfirmedError extends Error {
  constructor(message) {
    super(message);
    this.name = "FleetActionUnconfirmedError";
  }
}
//@ chunk-93kwxas0.js:96460-99383 placement
/**
 * 生成会话的操作菜单（停止、删除、重启等）。
 */
function buildJobActions(reload, E, optimistic, noteDeleteRefusal, deleteRefusalOf, storageV5) {
  return [
    {
      key: "x",
      label: "stop",
      bands: ["active", "blocked"],
      run: async (A) => {
        E(A.id);
        let iso = new Date().toISOString();
        let V = optimistic(
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
          undefined,
          A.id,
        );
        try {
          let D = await killJob(A.id, A.state, undefined, storageV5);
          if (!D.confirmed) {
            logFeatureBad("fleet_view_stop_job", "kill_unconfirmed");
            throw new FleetActionUnconfirmedError(D.error ?? "worker may still be running");
          }
          logEvent("tengu_bg_agent_action", {
            action: lit("stop"),
            source: lit("fleet"),
            jobSessionId: sanitizeMarkName(A.state.sessionId),
          });
          logFeatureOk("fleet_view_stop_job");
          let jobDir = getJobDir(A.id);
          await writePendingWakeup(jobDir, undefined);
          let jobState = await readJobState(jobDir, storageV5);
          if (jobState && !isSettled(jobState))
            await writeStateAtomic(
              jobDir,
              {
                ...jobState,
                state: "stopped",
                detail: "stopped",
                tempo: "idle",
                updatedAt: iso,
                firstTerminalAt: jobState.firstTerminalAt ?? iso,
              },
              storageV5,
            );
        } finally {
          V?.();
          reload();
        }
      },
    },
    {
      key: "x",
      label: "delete",
      bands: ["completed"],
      run: async (A, { bulk }) => {
        let V = deleteRefusalOf(A.id);
        let D = {
          ...(V?.discardOffer !== undefined && {
            discardOffer: V.discardOffer,
          }),
          ...(V?.forceRemoveOffer !== undefined && {
            forceRemoveOffer: V.forceRemoveOffer,
          }),
        };
        let discardOffer = bulk ? undefined : V?.discardOffer;
        let forceRemoveOffer = bulk ? undefined : V?.forceRemoveOffer;
        if (!bulk) noteDeleteRefusal(A.id, null);
        let X = optimistic((W) => W.filter((z) => z.id !== A.id), A.id);
        let K;
        try {
          K = await deleteJob(
            A.id,
            {
              force: true,
              ...(discardOffer !== undefined && {
                discardUnpushed: discardOffer.pin,
              }),
              ...(forceRemoveOffer !== undefined && {
                forceRemoveWorktree: forceRemoveOffer.worktreeDigest,
              }),
            },
            storageV5,
          );
          if (!K.removed && !K.keptWorktree) {
            logFeatureBad("fleet_view_delete_job", K.errorCode ?? "delete_unconfirmed");
            noteDeleteRefusal(A.id, {
              notice: K.error ?? "worker may still be running",
              ...D,
            });
            throw new FleetActionUnconfirmedError(K.error ?? "worker may still be running");
          }
        } finally {
          X?.();
          reload();
        }
        if (!K.removed) {
          let {
            keptErrorSummary,
            keptUnpushed,
            discardUnpushed,
            forceRemoveWorktree,
            forceRemoveWithheld,
            submoduleWork,
          } = K;
          let worktree = K.keptWorktree ?? "";
          let keptReason = K.keptReason ?? "remove_failed";
          logFeatureSad("fleet_view_delete_job", `worktree_kept_${keptReason}`);
          let Je = formatRmOutcome(
            {
              reason: keptReason,
              errorSummary: keptErrorSummary,
              unpushed: keptUnpushed,
              discardUnpushed,
              forceRemove: forceRemoveWorktree,
              forceRemoveWithheld,
              submoduleWork,
            },
            {
              worktree,
              jobId: A.id,
            },
          );
          noteDeleteRefusal(A.id, {
            notice: Je.row,
            ...(bulk && D),
            ...(discardUnpushed !== undefined && {
              discardOffer: {
                pin: discardUnpushed,
                worktree,
              },
            }),
            ...(forceRemoveWorktree !== undefined && {
              forceRemoveOffer: {
                worktreeDigest: forceRemoveWorktree.worktreeDigest,
              },
            }),
          });
          return Je.footer;
        }
        if (K.leftWorktreeDir) logFeatureSad("fleet_view_delete_job", "worktree_left_in_place");
        else if (K.forcedWorktreeRemoval) logFeatureSad("fleet_view_delete_job", "worktree_force_removed");
        else logFeatureOk("fleet_view_delete_job");
        if (A.state.pinned) writeJobPinned(A.id, false, storageV5).catch(() => {});
        logEvent("tengu_bg_agent_action", {
          action: lit("delete"),
          source: lit("fleet"),
          jobSessionId: sanitizeMarkName(A.state.sessionId),
        });
        if (K.leftWorktreeDir)
          return `Worktree directory left at ${K.leftWorktreeDir} \u2014 git no longer recognized it; the session was deleted`;
        if (K.forcedWorktreeRemoval) {
          let { worktree, keptBranch } = K.forcedWorktreeRemoval;
          return `Session deleted and its worktree directory deleted by force: ${worktree}${keptBranch ? ` (branch ${keptBranch} was left in the repository)` : ""}`;
        }
        if (discardOffer !== undefined || forceRemoveOffer !== undefined)
          return K.discardConfirmed && discardOffer !== undefined
            ? `Session deleted and its worktree removed: ${discardOffer.worktree}`
            : "Session deleted";
      },
    },
  ];
}
//@ chunk-93kwxas0.js:99383-99387 placement
init_react_production();
//@ chunk-93kwxas0.js:99420-99424 placement
init_react_production();
//@ chunk-93kwxas0.js:99424-99961 placement
/**
 * 检测 IDE 扩展并生成对应 MCP 客户端配置。
 */
function useIdeMcpClients(h) {
  let [E, k] = y([]);
  P(() => {
    if (isRemoteSessionAvailable() || isBgSession()) return;
    if (!shouldShowDisableAutoConnectDialog()) return;
    let C = false;
    findAvailableIDE().then(async (availableIDE) => {
      if (C || !availableIDE) return;
      let T = {
        type: availableIDE.url.startsWith("ws:") ? "ws-ide" : "sse-ide",
        url: availableIDE.url,
        ideName: availableIDE.name,
        authToken: availableIDE.authToken,
        ideRunningInWindows: availableIDE.ideRunningInWindows,
        scope: "dynamic",
      };
      await awaitPolicyColdStartWaiter();
      if (C || isMcpServerBlockedAtConnectTime("ide", T)) return;
      let { clearServerCache, connectToServer } = require("./chunk-asne9cp8.js").mcpClientModule();
      let V = await connectToServer("ide", T);
      if (C) return;
      if (V.type !== "connected") clearServerCache("ide", T).catch(() => {});
      k([V]);
    });
    return () => {
      C = true;
      abortIdeSearch();
    };
  }, []);
  useIdeAtMentioned(E, h);
}
//@ chunk-93kwxas0.js:99961-99965 placement
init_react_production();
//@ chunk-93kwxas0.js:99965-100002 placement
function selectSessionModel(W) {
  return W.sessionModel;
}
//@ chunk-93kwxas0.js:100002-100040 placement
function selectSessionEffort(z) {
  return z.sessionEffort;
}
//@ chunk-93kwxas0.js:100040-100082 placement
function selectSessionFastMode(oe) {
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
  COMMAND_NOT_RESPONDING_TEXT,
  offerJobRestart,
  selectSessionModel,
  selectSessionEffort,
  selectSessionFastMode,
  FleetActionUnconfirmedError,
};
