/**
 * components/fleet/fleetActions.ts
 *
 * 2.1.316 新增：生成会话的操作菜单（停止、删除、重启等）；附加到选中的会话（在其他终端运行时拒绝），上报 fleet_view_open等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-avy0g5d4.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { shouldShowDisableAutoConnectDialog } from "../IdeAutoConnectDialog.js";
import { findAvailableIDE, abortIdeSearch } from "../../utils/ide.js";
import { awaitPolicyColdStartWaiter } from "../../services/policyLimits/coldStartWaiter.js";
import { isMcpServerBlockedAtConnectTime } from "../../services/mcp/config.js";
import { useIdeAtMentioned } from "../../hooks/useIdeAtMentioned.js";

//@ chunk-avy0g5d4.js:88389-89222 placement
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
//@ chunk-avy0g5d4.js:89222-89398 placement
/**
 * 清空 fork 拒绝/重启/失效纪元等提示状态，并清掉对应的错误提示。
 */
function clearFleetOfferState(state, editor) {
  state.forkRefusedJobId = null;
  state.restartOfferedJobId = null;
  state.deadEpochOfferedJobId = null;
  let error = editor.getSnapshot().error;
  if (
    error === RESTART_FRESH_PROMPT ||
    error === RESTART_NOT_RESPONDING_PROMPT ||
    error === RESTART_RETRY_PROMPT ||
    error === RESUME_AFTER_SERVICE_PROMPT
  )
    editor.setError(null);
}
//@ chunk-avy0g5d4.js:89398-89509 placement
/**
 * 对某会话提示“重启”（设置 restartOfferedJobId 和对应错误文案）。
 */
function offerJobRestart(fleetLiveStatus, fleetEditor, restartOfferedJobId) {
  fleetLiveStatus.forkRefusedJobId = null;
  fleetLiveStatus.deadEpochOfferedJobId = null;
  fleetLiveStatus.restartOfferedJobId = restartOfferedJobId;
  fleetEditor.setError(RESTART_NOT_RESPONDING_PROMPT);
}
//@ chunk-avy0g5d4.js:89509-89701 placement
/**
 * 错误提示仍为指定文案、且没有打开预览/帮助/调试/重命名/分组编辑等浮层时返回 true。
 */
function isOfferStillShowing(editor, view, deleteConfirm, error) {
  let snapshot = view.getSnapshot();
  return (
    editor.getSnapshot().error === error &&
    !snapshot.previewOpen &&
    !snapshot.helpOpen &&
    !snapshot.debugOpen &&
    !snapshot.exitPending &&
    snapshot.renaming === null &&
    snapshot.groupEdit === null &&
    deleteConfirm.pending === null
  );
}
//@ chunk-avy0g5d4.js:89701-89828 placement
/**
 * 编辑器里的输入能否解析为一次派发。
 */
function hasPendingDispatchInput(surface) {
  let { query, mode } = surface.editor.getSnapshot();
  return (
    parseDraftInput(
      query,
      mode,
      prependModeCharacterToInput(query, mode, surface.roster.jobs, surface.cwdFilter),
      surface.parseScope,
    ) !== null
  );
}
//@ chunk-avy0g5d4.js:89828-92358 placement
/**
 * 打开更早的会话（resume 选择器）。
 */
async function openEarlierSession(surface, entry, via) {
  let { editor, roster, selection, view, attach, storageV5, mountAt, canonicalLauncherCwd } = surface;
  let setError = editor.setError;
  if (attach.getSnapshot().attachingJobId !== null || attach.isPromoting(entry.sessionId)) return;
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    entry.sessionId !== resumePromoteSessionId &&
    attach.isPromoting(resumePromoteSessionId)
  )
    return;
  attach.beginPromote(entry.sessionId);
  view.closeResumePicker();
  logEvent("tengu_fleetview_earlier_open", {
    ms_since_mount: Date.now() - mountAt,
    via: fromEnum(via),
  });
  let sliced = entry.sessionId.slice(0, 8);
  let finish = (level, feature, message) => {
    attach.endPromote(entry.sessionId);
    if (view.resumePromoteSessionId === entry.sessionId) view.resumePromoteSessionId = null;
    if (via === "resume_picker")
      if (level === "bad") logFeatureBad("fleet_view_resume_picker", feature);
      else logFeatureSad("fleet_view_resume_picker", feature);
    setError(message);
  };
  let state;
  try {
    if ((await listAllLiveSessions(storageV5)).some((session) => session.sessionId === entry.sessionId)) {
      finish("sad", "session_live_elsewhere", SESSION_BUSY_ELSEWHERE_MESSAGE);
      return;
    }
    if (roster.isDeleting(sliced) || roster.isDeletingSession(entry.sessionId)) {
      finish(
        "sad",
        "deleting_in_flight",
        "This session is being deleted \u2014 reopen /resume once it finishes",
      );
      return;
    }
    if ((await readJobState(getJobDir(sliced), storageV5)) !== null) {
      finish("sad", "already_in_list", "This session is already in the list \u2014 press enter on its row");
      return;
    }
    if (
      (await listJobs(undefined, storageV5)).some(
        (job) => job.state.sessionId === entry.sessionId || job.state.resumeSessionId === entry.sessionId,
      )
    ) {
      finish("sad", "already_in_list", "This session is already in the list \u2014 press enter on its row");
      return;
    }
    let transcriptInfo;
    try {
      transcriptInfo = await statTranscript(entry.fullPath, storageV5);
    } catch {
      transcriptInfo = {
        kind: "absent",
      };
    }
    if (transcriptInfo.kind === "absent") {
      finish(
        "bad",
        "transcript_gone",
        "This conversation's file is no longer on disk \u2014 it may have been cleaned up",
      );
      return;
    }
    if (transcriptInfo.kind === "refused") {
      finish(
        "bad",
        "transcript_refused",
        "This conversation's file is a symbolic link or not a regular file, so it can't be opened from here \u2014 if it's a link, resume from the directory that holds the real file",
      );
      return;
    }
    if (transcriptInfo.kind === "unreadable") {
      finish(
        "sad",
        "transcript_unverified",
        "Couldn't read this conversation's file just now \u2014 try again",
      );
      return;
    }
    let cwd = entry.cwd;
    if (
      !isDispatchablePath(entry.cwd) ||
      (await findIntermediateUncJunctionAsync(NodeFsOperations, entry.cwd, {
        surfaceNetworkRaw: true,
        unreadableAncestry: "unverified",
      })) !== undefined
    )
      cwd = canonicalLauncherCwd;
    else
      try {
        if (!(await stat(entry.cwd)).isDirectory()) cwd = canonicalLauncherCwd;
      } catch {
        cwd = canonicalLauncherCwd;
      }
    if (cwd !== entry.cwd && via === "resume_picker")
      logFeatureSad("fleet_view_resume_picker", "cwd_fallback");
    ({ state } = await preSeedReplBgJob(
      entry.sessionId,
      {
        intent: entry.title,
        name: entry.title,
        cwd,
        inFlight: {
          tasks: 0,
          queued: 0,
          kinds: [],
        },
        linkScanPath: entry.fullPath,
      },
      storageV5,
    ));
  } catch (error) {
    if (isFsInaccessible(error))
      logForDebugging(`[fleetview] past-session seed write failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    finish("bad", "promote_failed", `Couldn't open ${entry.title} \u2014 ${errorMessage(error)}`);
    return;
  }
  let jobRow = {
    id: sliced,
    state,
    activity: jobOutcome(state),
  };
  selection.followId = sliced;
  roster.updatePendings((previous) => [...previous, jobRow]);
  attachToJob(surface, jobRow);
}
//@ chunk-avy0g5d4.js:92358-95218 placement
/**
 * 附加到选中的会话（在其他终端运行时拒绝），上报 fleet_view_open。
 */
function attachToJob(surface, job, source) {
  let { editor, roster, view, attach, deleteConfirm, storageV5, onAction, pendings } = surface;
  let setError = editor.setError;
  let gestureT0 = performance.now();
  if (!job || attach.getSnapshot().attachingJobId !== null) return;
  let resumePromoteSessionId = view.resumePromoteSessionId;
  if (
    resumePromoteSessionId !== null &&
    job.state.sessionId !== resumePromoteSessionId &&
    attach.isPromoting(resumePromoteSessionId)
  )
    return;
  view.closeResumePicker();
  if (pendings.some((pending) => pending.id === job.id)) return;
  if (job.state.backend === "peer") {
    setError("Can't attach \u2014 this session is running in another terminal");
    logFeatureOk("fleet_view_open");
    return;
  }
  if (job.state.backend === "remote") {
    if (job.id.startsWith("remote-pending-")) {
      setError(STILL_STARTING_MESSAGE);
      logFeatureOk("fleet_view_open");
      return;
    }
    onAction({
      type: "open",
      job,
      ...(hasPendingDispatchInput(surface) && {
        keepQuery: true,
      }),
      respawnResult: {
        ok: true,
        short: job.id,
        state: job.state,
      },
      gestureT0,
    });
    return;
  }
  if (roster.terminalHolderOf(job) !== undefined) {
    setError(SESSION_BUSY_ELSEWHERE_MESSAGE);
    logFeatureOk("fleet_view_open");
    return;
  }
  if (
    job.state.deadEpochReapedAt !== undefined &&
    isSettled(job.state) &&
    !isExecLaunch(job.state) &&
    attach.forkRefusedJobId !== job.id
  ) {
    if (attach.deadEpochGoneJobId === job.id) {
      setError(TRANSCRIPT_GONE_TEXT);
      logFeatureOk("fleet_view_open");
      return;
    }
    let suppressOffer =
      attach.deadEpochOfferedJobId === job.id &&
      isOfferStillShowing(editor, view, deleteConfirm, RESUME_AFTER_SERVICE_PROMPT);
    if (suppressOffer && attach.deadEpochOfferAgeMs() < AUTO_REFRESH_DEBOUNCE_MS) {
      attach.deadEpochOfferedJobId = job.id;
      return;
    }
    if (!suppressOffer) {
      attach.forkRefusedJobId = null;
      attach.restartOfferedJobId = null;
      attach.deadEpochOfferedJobId = job.id;
      setError(RESUME_AFTER_SERVICE_PROMPT);
      logEvent("tengu_fleetview_dead_epoch_offer", {});
      logFeatureOk("fleet_view_open");
      return;
    }
    attach.deadEpochOfferedJobId = null;
  } else if (attach.deadEpochOfferedJobId === job.id) attach.deadEpochOfferedJobId = null;
  let retryFork =
    source !== "esc" &&
    isOfferStillShowing(editor, view, deleteConfirm, RESTART_FRESH_PROMPT) &&
    attach.forkRefusedJobId === job.id;
  if (retryFork) attach.forkRefusedJobId = null;
  let retryUnresponsive =
    source !== "esc" &&
    (isOfferStillShowing(editor, view, deleteConfirm, RESTART_NOT_RESPONDING_PROMPT) ||
      isOfferStillShowing(editor, view, deleteConfirm, RESTART_RETRY_PROMPT)) &&
    attach.restartOfferedJobId === job.id &&
    !isExecLaunch(job.state);
  let wasOffered = attach.restartOfferedJobId === job.id;
  if (wasOffered) attach.restartOfferedJobId = null;
  let beaconId = randomUUID();
  startAttachBeacon(beaconId, "fleet", storageV5).catch(() => {});
  attach.arm(job.id, beaconId);
  setError(null);
  let attempt = attach.nextRespawnAttempt();
  let warming = attach.getWarming(job.id);
  if (!warming) {
    warming = safeRespawnBgSession(
      job.id,
      {
        knownState: job.state,
        ...(retryFork && {
          forceRefusalRetry: true,
        }),
        ...(retryUnresponsive && {
          forceUnresponsive: true,
          replyOnResume: job.state.tempo === "active",
        }),
      },
      storageV5,
    );
    attach.trackWarming(job.id, warming);
  }
  warming.then((respawn) => {
    if (!attach.isCurrentRespawnAttempt(attempt)) {
      clearAttachBeacon(beaconId, storageV5).catch(() => {});
      return;
    }
    attach.disarm();
    if (!respawn.ok && respawn.errorCode === "kill_unconfirmed") {
      logFeatureSad("fleet_view_open", "restart_stop_unconfirmed");
      logForDebugging(
        `[FV-attach] confirmed restart of ${job.id} could not stop the worker: ${respawn.error}`,
        {
          level: "warn",
        },
      );
      clearAttachBeacon(beaconId, storageV5).catch(() => {});
      attach.restartOfferedJobId = job.id;
      setError(RESTART_RETRY_PROMPT);
      return;
    }
    if (respawn.ok || respawn.alive)
      onAction({
        type: "open",
        job,
        ...(hasPendingDispatchInput(surface) && {
          keepQuery: true,
        }),
        ...(wasOffered && {
          afterNoResponse: true,
        }),
        respawnResult: respawn,
        gestureT0,
        gestureId: beaconId,
      });
    else if (respawn.errorCode === "fork_transcript_never_materialized") {
      clearAttachBeacon(beaconId, storageV5).catch(() => {});
      logFeatureSad("fleet_view_open", "fork_transcript_never_materialized");
      attach.forkRefusedJobId = job.id;
      setError(RESTART_FRESH_PROMPT);
    } else if (respawn.errorCode === "resume_session_live_elsewhere") {
      clearAttachBeacon(beaconId, storageV5).catch(() => {});
      logFeatureSad("fleet_view_open", "resume_session_live_elsewhere");
      setError(respawn.error);
    } else if (respawn.errorCode === "dead_epoch_transcript_gone") {
      clearAttachBeacon(beaconId, storageV5).catch(() => {});
      logFeatureSad("fleet_view_open", "dead_epoch_transcript_gone");
      attach.deadEpochGoneJobId = job.id;
      setError(TRANSCRIPT_GONE_TEXT);
    } else {
      logFeatureBad("fleet_view_open", "respawn_failed");
      setError(respawn.error);
      clearAttachBeacon(beaconId, storageV5).catch(() => {});
    }
  });
}
//@ chunk-avy0g5d4.js:95218-96231 placement
/**
 * 从 Agents 视图新建会话。
 */
function openNewSession(surface, spawnArg) {
  let { editor, roster, attach, storageV5 } = surface;
  let setError = editor.setError;
  let snapshot = attach.getSnapshot();
  if (snapshot.newSessionOpening || snapshot.attachingJobId !== null) return;
  let attempt = attach.beginNewSession();
  setError(null);
  let isCurrent = () => attach.isCurrentNewSessionAttempt(attempt);
  spawnBgSession(
    [...spareExtraArgs()],
    undefined,
    "shell",
    spawnArg,
    undefined,
    undefined,
    undefined,
    storageV5,
  ).then(
    async (bgSession) => {
      try {
        if (!bgSession.ok) {
          if (!isCurrent()) return;
          attach.endNewSession();
          logFeatureBad("fleet_view_new_session", bgSession.reason ?? "spawn_failed");
          setError(bgSession.error);
          return;
        }
        roster.reload();
        let deadline = Date.now() + RESTART_OFFER_TIMEOUT_MS;
        let job = roster.jobs?.find((job) => job.id === bgSession.short);
        while (!job && Date.now() < deadline && isCurrent()) {
          await sleep(100);
          job = roster.jobs?.find((job) => job.id === bgSession.short);
        }
        if (!isCurrent()) return;
        attach.endNewSession();
        if (!job) {
          logFeatureSad("fleet_view_new_session", "row_pending");
          setError("Still starting \u2014 open the new session once it appears");
          return;
        }
        logFeatureOk("fleet_view_new_session");
        attachToJob(surface, job);
      } catch (error) {
        if (!isCurrent()) return;
        attach.endNewSession();
        logError(error);
        logFeatureBad("fleet_view_new_session", "threw");
        setError(`Couldn't start a new session \u2014 ${errorMessage(error)}`);
      }
    },
    (error) => {
      if (!isCurrent()) return;
      attach.endNewSession();
      logError(error);
      logFeatureBad("fleet_view_new_session", "threw");
      setError(`Couldn't start a new session \u2014 ${errorMessage(error)}`);
    },
  );
}
//@ chunk-avy0g5d4.js:96231-96381 placement
/**
 * 记 tengu_bg_agent_action（action、来源 fleet、会话 id、状态、tempo）。
 */
function logFleetJobAction(action, state, extra) {
  logEvent("tengu_bg_agent_action", {
    action: fromEnum(action),
    source: lit("fleet"),
    jobSessionId: sanitizeMarkName(state.sessionId),
    jobState: daemonSessionStateLabel(state.state),
    tempo: fromEnum(state.tempo),
    ...extra,
  });
}
//@ chunk-avy0g5d4.js:96381-96469 placement
class FleetActionUnconfirmedError extends Error {
  constructor(message) {
    super(message);
    this.name = "FleetActionUnconfirmedError";
  }
}
//@ chunk-avy0g5d4.js:96469-99392 placement
/**
 * 生成会话的操作菜单（停止、删除、重启等）。
 */
function buildJobActions(reload, noteKilling, optimistic, noteDeleteRefusal, deleteRefusalOf, storageV5) {
  return [
    {
      key: "x",
      label: "stop",
      bands: ["active", "blocked"],
      run: async (job) => {
        noteKilling(job.id);
        let iso = new Date().toISOString();
        let restore = optimistic(
          (jobs) =>
            jobs.map((row) =>
              row.id === job.id && !isSettled(row.state)
                ? {
                    ...row,
                    state: {
                      ...row.state,
                      state: "stopped",
                      detail: "stopped",
                      tempo: "idle",
                      updatedAt: iso,
                      firstTerminalAt: row.state.firstTerminalAt ?? iso,
                      lastTerminalAt: iso,
                    },
                    activity: "stopped",
                  }
                : row,
            ),
          undefined,
          job.id,
        );
        try {
          let result = await killJob(job.id, job.state, undefined, storageV5);
          if (!result.confirmed) {
            logFeatureBad("fleet_view_stop_job", "kill_unconfirmed");
            throw new FleetActionUnconfirmedError(result.error ?? "worker may still be running");
          }
          logEvent("tengu_bg_agent_action", {
            action: lit("stop"),
            source: lit("fleet"),
            jobSessionId: sanitizeMarkName(job.state.sessionId),
          });
          logFeatureOk("fleet_view_stop_job");
          let dir = getJobDir(job.id);
          await writePendingWakeup(dir, undefined);
          let jobState = await readJobState(dir, storageV5);
          if (jobState && !isSettled(jobState))
            await writeStateAtomic(
              dir,
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
          restore?.();
          reload();
        }
      },
    },
    {
      key: "x",
      label: "delete",
      bands: ["completed"],
      run: async (job, { bulk }) => {
        let refusal = deleteRefusalOf(job.id);
        let offers = {
          ...(refusal?.discardOffer !== undefined && {
            discardOffer: refusal.discardOffer,
          }),
          ...(refusal?.forceRemoveOffer !== undefined && {
            forceRemoveOffer: refusal.forceRemoveOffer,
          }),
        };
        let discardOffer = bulk ? undefined : refusal?.discardOffer;
        let forceRemoveOffer = bulk ? undefined : refusal?.forceRemoveOffer;
        if (!bulk) noteDeleteRefusal(job.id, null);
        let restore = optimistic((jobs) => jobs.filter((row) => row.id !== job.id), job.id);
        let result;
        try {
          result = await deleteJob(
            job.id,
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
          if (!result.removed && !result.keptWorktree) {
            logFeatureBad("fleet_view_delete_job", result.errorCode ?? "delete_unconfirmed");
            noteDeleteRefusal(job.id, {
              notice: result.error ?? "worker may still be running",
              ...offers,
            });
            throw new FleetActionUnconfirmedError(result.error ?? "worker may still be running");
          }
        } finally {
          restore?.();
          reload();
        }
        if (!result.removed) {
          let {
            keptErrorSummary,
            keptUnpushed,
            discardUnpushed,
            forceRemoveWorktree,
            forceRemoveWithheld,
            submoduleWork,
          } = result;
          let worktree = result.keptWorktree ?? "";
          let keptReason = result.keptReason ?? "remove_failed";
          logFeatureSad("fleet_view_delete_job", `worktree_kept_${keptReason}`);
          let outcome = formatRmOutcome(
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
              jobId: job.id,
            },
          );
          noteDeleteRefusal(job.id, {
            notice: outcome.row,
            ...(bulk && offers),
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
          return outcome.footer;
        }
        if (result.leftWorktreeDir) logFeatureSad("fleet_view_delete_job", "worktree_left_in_place");
        else if (result.forcedWorktreeRemoval)
          logFeatureSad("fleet_view_delete_job", "worktree_force_removed");
        else logFeatureOk("fleet_view_delete_job");
        if (job.state.pinned) writeJobPinned(job.id, false, storageV5).catch(() => {});
        logEvent("tengu_bg_agent_action", {
          action: lit("delete"),
          source: lit("fleet"),
          jobSessionId: sanitizeMarkName(job.state.sessionId),
        });
        if (result.leftWorktreeDir)
          return `Worktree directory left at ${result.leftWorktreeDir} \u2014 git no longer recognized it; the session was deleted`;
        if (result.forcedWorktreeRemoval) {
          let { worktree, keptBranch } = result.forcedWorktreeRemoval;
          return `Session deleted and its worktree directory deleted by force: ${worktree}${keptBranch ? ` (branch ${keptBranch} was left in the repository)` : ""}`;
        }
        if (discardOffer !== undefined || forceRemoveOffer !== undefined)
          return result.discardConfirmed && discardOffer !== undefined
            ? `Session deleted and its worktree removed: ${discardOffer.worktree}`
            : "Session deleted";
      },
    },
  ];
}
//@ chunk-avy0g5d4.js:99392-99396 placement
init_react_production();
//@ chunk-avy0g5d4.js:99429-99433 placement
init_react_production();
//@ chunk-avy0g5d4.js:99433-99970 placement
/**
 * 检测 IDE 扩展并生成对应 MCP 客户端配置。
 */
function useIdeMcpClients(props) {
  let [clients, setClients] = useState([]);
  useEffect(() => {
    if (isRemoteSessionAvailable() || isBgSession()) return;
    if (!shouldShowDisableAutoConnectDialog()) return;
    let cancelled = false;
    findAvailableIDE().then(async (availableIDE) => {
      if (cancelled || !availableIDE) return;
      let config = {
        type: availableIDE.url.startsWith("ws:") ? "ws-ide" : "sse-ide",
        url: availableIDE.url,
        ideName: availableIDE.name,
        authToken: availableIDE.authToken,
        ideRunningInWindows: availableIDE.ideRunningInWindows,
        scope: "dynamic",
      };
      await awaitPolicyColdStartWaiter();
      if (cancelled || isMcpServerBlockedAtConnectTime("ide", config)) return;
      let { clearServerCache, connectToServer } =
        require("../../services/mcp/emitTripwireEvent.lazy.js").mcpClientModule();
      let connection = await connectToServer("ide", config);
      if (cancelled) return;
      if (connection.type !== "connected") clearServerCache("ide", config).catch(() => {});
      setClients([connection]);
    });
    return () => {
      cancelled = true;
      abortIdeSearch();
    };
  }, []);
  useIdeAtMentioned(clients, props);
}
//@ chunk-avy0g5d4.js:99970-99974 placement
init_react_production();
//@ chunk-avy0g5d4.js:99974-100011 placement
function selectSessionModel(state) {
  return state.sessionModel;
}
//@ chunk-avy0g5d4.js:100011-100049 placement
function selectSessionEffort(state) {
  return state.sessionEffort;
}
//@ chunk-avy0g5d4.js:100049-100091 placement
function selectSessionFastMode(state) {
  return state.sessionFastMode;
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
