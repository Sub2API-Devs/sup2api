/**
 * daemon/jobs/killJob.ts
 *
 * 2.1.316 新增：附加到后台会话的完整流程：屏幕保持、首帧前门控 stdin、云/本地会话标签；附加前检查会话状态：已删除/已结束时返回错误并上报 detached等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1), chunk-vrr64ez0.js (35)
 * attribution: placement 36
 */
import { dirname, basename, join, normalize, isAbsolute, relative } from "path";
import { writeFile, realpath, rm, unlink, lstat, readdir } from "fs/promises";
import { randomUUID } from "crypto";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { validateStorageKey } from "../../utils/storage/storageKeys.js";
import {
  getJobDir,
  isSettled,
  hasOutstandingAsk,
  invalidateJobStateCache,
  readJobState,
  writeStateAtomic,
  logJobWriteError,
  isTerminal,
  isExecLaunch,
  readJobStateAfterSettle,
  listJobs,
  getJobsDir,
} from "../../services/daemon/jobState.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import {
  BG_PROTO,
  HOST_DIED_DETAIL,
  HOST_DIED_EXEC_DETAIL,
  HOST_DIED_EXEC_ATTACH_MESSAGE,
  HOST_DIED_ATTACH_MESSAGE,
  RACED_SOCKET_GAP,
  TRANSIENT_ATTACH_CODE,
  FATAL_ATTACH_CODE,
  HOST_DEAD_ATTACH_CODE,
  KICKED_ATTACH_CODE,
  SHORT_RE,
} from "../../services/daemon/leaseProtocol.js";
import { sleep } from "../../utils/sleep.js";
import { readRoster, updateRoster } from "../../services/daemon/roster.js";
import { checkProcessLiveness, isProcessLive } from "../../services/daemon/processLiveness.js";
import { provenSameProcessAsync } from "../../utils/processIdentity.js";
import { logError } from "../../utils/log.js";
import { killViaPtySocket } from "../../services/daemon/reapJobs.js";
import { daemonPtySocket, readDaemonToken, hostManagedEntry } from "../../services/daemon/paths.js";
import { listAllLiveSessions, sendToUdsSocket } from "../../utils/udsMessaging/udsClient.js";
import { logEvent } from "../../services/analytics/index.js";
import { looksLikeApproveLine } from "../../components/fleet/sessionAttention.js";
import {
  truncateWithEllipsis,
  MAX_HEADLINE_LENGTH,
} from "../../services/sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { bgSupervisorNoun, bgSupervisorNounCap } from "../../utils/fleetGates.js";
import {
  isNonPromptInput,
  queuedPromptOrUndefined,
  queuePromptForJob,
} from "../../services/daemon/spawnLauncher.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { sanitizeErrnoTokenForTelemetry, errorMessage, isENOENT } from "../../utils/errors.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  ensureDaemon,
  canUseServiceDaemon,
  hostTombstonePath,
  deleteHostTombstone,
} from "../../services/daemon/ensureDaemon.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { wrapStorageSource, getTranscriptStorageContext } from "../../utils/sessionStorage.js";
import { resolveJobTranscript } from "../../utils/sessionStoragePortable.js";
import {
  reportAttachTelemetry,
  isBackgroundSessionGone,
  ENORESPONSE,
  SESSION_NOT_RESPONDING_TEXT,
} from "./attachErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import { drainStdin } from "../../ink/ink.js";
import { exitAltScreenSequence } from "../../ink/terminal.js";
import { isTerminalShutdown, heldUntilExit } from "../../utils/terminalShutdown.js";
import { cursorPosition } from "../../ink/termio/csi.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import { waitForDetachKey, containsInterruptKey, attachToJob } from "../attach/attachJob.js";
import { getPlatform } from "../../utils/platform.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import {
  getAgentWorktreeChanges,
  resolveWorktreeCleanupRoot,
  listRegisteredWorktrees,
  repositoryVouchedByWorktree,
  worktreeDeregisteredByRemoval,
  carriesDiscardConsent,
  claudeWorktreeLockPid,
  mayReleaseWorktreeLock,
  passesCommitSafetyChecks,
  getDefaultRemoteRef,
  removeAgentWorktree,
  IDENTITY_CHANGED_SUMMARY,
} from "../../utils/worktree.js";
import { isHeadAt, listUnpushedCommits } from "../../utils/git/unpushedCommits.js";
import { findGitRootVerifyingPositive, findGitRoot } from "../../utils/git.js";
import { pathPresence } from "../../utils/fsSafety/atomicWriteStaging.js";
import { printableLabel } from "../../utils/printableName.js";
import { reapAdoptRecord } from "./adoptRecord.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { hasDotSegment, isUncOrDevicePath, identity } from "../../utils/pathClassification.js";
import { isNetworkMountRoot, isOnForeignMount } from "../../utils/networkPaths.js";
import { foldCaseBasic } from "../../utils/pathIdentity.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { getCwd } from "../../utils/cwd.js";
import {
  resolveDeepestExistingAncestorSync,
  getFsImplementation,
  UNVERIFIED_ANCESTRY,
} from "../../utils/fsOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3654790-3654875 placement = isDangerousFilePathToAutoEdit (1)
function isDirectlyUnderClaudeWorktreesDir(path) {
  let absolutePath = dirname(path);
  return (
    absolutePath !== path &&
    basename(absolutePath) === "worktrees" &&
    basename(dirname(absolutePath)) === ".claude"
  );
}
//@ chunk-vrr64ez0.js:28269-28293 placement
var RECAP_TRIGGER_FILE = "recap.trigger";
//@ chunk-vrr64ez0.js:28293-28472 placement
function touchRecapTrigger(jobId, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let key = STORAGE_SPACES.job(jobId, [RECAP_TRIGGER_FILE]);
    if (validateStorageKey(key) === undefined) {
      storageV5
        .write(key, "", {
          publishDiscipline: "inPlace",
        })
        .catch(() => {});
      return;
    }
  }
  writeFile(join(getJobDir(jobId), RECAP_TRIGGER_FILE), "").catch(() => {});
}
//@ chunk-vrr64ez0.js:28472-29740 placement
async function killJob(short, options, flags, storageV5) {
  if (options?.backend === "peer")
    return {
      confirmed: true,
    };
  let handoff = flags?.handoff ? true : undefined;
  let evict = flags?.evict ? true : undefined;
  let killReply = flags?.knownGone
    ? {
        ok: false,
        code: "ENOJOB",
        error: "job already gone (caller-verified)",
      }
    : await controlRequest({
        proto: BG_PROTO,
        op: "kill",
        short,
        handoff,
        evict,
      });
  for (let j = 0; !killReply.ok && killReply.code === "ESTARTING" && j < 10; j++) {
    await sleep(200);
    killReply = await controlRequest({
      proto: BG_PROTO,
      op: "kill",
      short,
      handoff,
      evict,
    });
  }
  if (killReply.ok)
    return {
      confirmed: true,
    };
  if (killReply.code === "ENOJOB" || killReply.code === "ENOCONN" || killReply.code === "ETIMEOUT") {
    let orphanSweep = await killOrphanedWorker(short, storageV5);
    if (orphanSweep.anyMatch && killReply.code === "ENOJOB")
      return {
        confirmed: orphanSweep.confirmed,
      };
    let confirmed = false;
    let scanned = false;
    if (killReply.code === "ENOCONN" || killReply.code === "ETIMEOUT") {
      let result;
      if (orphanSweep.anyMatch) result = orphanSweep.confirmed;
      else {
        let roster = await readRoster(
          {
            silent: true,
          },
          storageV5,
        );
        let entry = roster.workers[short];
        if (entry !== undefined) {
          let liveness = await checkProcessLiveness(entry.pid, entry.procStart);
          if (liveness === "zombie") {
            if (
              entry.procStart !== undefined &&
              (await provenSameProcessAsync(entry.pid, entry.procStart)) === true
            ) {
              try {
                process.kill(-entry.pid, "SIGKILL");
              } catch {
                try {
                  process.kill(entry.pid, "SIGKILL");
                } catch {}
              }
              result = true;
            } else result = false;
          } else result = liveness !== "live";
        } else {
          let scanUsable = !orphanSweep.scanFailed && !roster.parseFailed;
          confirmed =
            killReply.code === "ENOCONN" &&
            scanUsable &&
            options?.state !== undefined &&
            isSettled({
              state: options.state,
              tempo: options.tempo,
            });
          result = confirmed;
          scanned = scanUsable && !result;
        }
      }
      if (evict && result && killReply.code === "ENOCONN" && !confirmed)
        await updateRoster((roster) => {
          delete roster.workers[short];
        }, storageV5).catch((error) => logError(error));
      return scanned
        ? {
            confirmed: result,
            noWorkerFound: scanned,
          }
        : {
            confirmed: result,
          };
    }
    return {
      confirmed: true,
    };
  }
  return {
    confirmed: false,
    error: killReply.error,
  };
}
//@ chunk-vrr64ez0.js:29740-30247 placement
async function killOrphanedWorker(short, storageV5) {
  let killed = await killViaPtySocket(daemonPtySocket(short));
  let anyMatch = false;
  let confirmed = true;
  let scanFailed = false;
  let sessions = await listAllLiveSessions(storageV5).catch(() => {
    scanFailed = true;
    return [];
  });
  for (let session of sessions)
    if (matchesJobRef(session, short)) {
      anyMatch = true;
      if (!killed)
        try {
          process.kill(session.pid, "SIGTERM");
        } catch {}
      let deadline = Date.now() + 3000;
      let anyMatch_2 = true;
      while ((anyMatch_2 = await isProcessLive(session.pid, session.procStart)) && Date.now() < deadline)
        await sleep(100);
      if (anyMatch_2) {
        logEvent("tengu_bg_killjob_ctrl_fallback", {
          ctrlSent: killed,
        });
        try {
          process.kill(session.pid, "SIGTERM");
        } catch {}
        let pollDeadline = Date.now() + 500;
        while (
          (anyMatch_2 = await isProcessLive(session.pid, session.procStart)) &&
          Date.now() < pollDeadline
        )
          await sleep(100);
      }
      if (anyMatch_2) confirmed = false;
    }
  return {
    confirmed,
    anyMatch,
    scanFailed,
  };
}
//@ chunk-vrr64ez0.js:30247-30605 placement
async function listAliveDaemonJobs(storageV5) {
  let reply = await controlRequest({
    proto: BG_PROTO,
    op: "list",
  });
  if (reply.ok && reply.op === "list")
    return {
      shorts: new Set(reply.jobs.map((job) => job.short)),
      records: reply.jobs.filter((job) => !job.outcome),
    };
  let roster = await readRoster(
    {
      silent: true,
    },
    storageV5,
  );
  let entries = Object.entries(roster.workers);
  let results = await Promise.all(entries.map(([, entry]) => isProcessLive(entry.pid, entry.procStart)));
  return {
    shorts: new Set(entries.filter((entry, index) => results[index]).map(([short]) => short)),
    records: [],
  };
}
//@ chunk-vrr64ez0.js:30605-30880 placement
async function probeDaemonJob(short, storageV5) {
  let reply = await controlRequest({
    proto: BG_PROTO,
    op: "has",
    short,
  });
  if (reply.ok && reply.op === "has")
    return {
      alive: reply.alive,
      present: reply.present ?? reply.alive,
      daemonUp: true,
    };
  let entry = (
    await readRoster(
      {
        silent: true,
      },
      storageV5,
    )
  ).workers[short];
  let isLive = entry !== undefined && (await isProcessLive(entry.pid, entry.procStart));
  return {
    alive: isLive,
    present: isLive,
    daemonUp: false,
  };
}
//@ chunk-vrr64ez0.js:30880-30994 placement
async function isDaemonJobPresent(short) {
  let reply = await controlRequest({
    proto: BG_PROTO,
    op: "has",
    short,
  });
  return reply.ok && reply.op === "has" ? (reply.present ?? reply.alive) : false;
}
//@ chunk-vrr64ez0.js:30994-31299 placement
function applyReplyPatch(jobState, patch) {
  let reply =
    jobState.tempo === "blocked" &&
    jobState.state !== "blocked" &&
    jobState.block === undefined &&
    looksLikeApproveLine(jobState.needs);
  return {
    ...jobState,
    ...(hasOutstandingAsk(jobState) && {
      state: "working",
    }),
    detail: truncateWithEllipsis(redactSecrets(patch).replace(/\s+/g, " ").trim(), MAX_HEADLINE_LENGTH),
    ...(!reply && {
      tempo: "active",
      needs: undefined,
      block: undefined,
    }),
    suggestedReply: undefined,
    output: null,
    updatedAt: new Date().toISOString(),
  };
}
//@ chunk-vrr64ez0.js:31299-31428 placement
var REPLY_ENOJOB_MSG = "That session isn't running \u2014 respawn it first";
var REPLY_PEER_NO_SOCK_MSG = "Can't send \u2014 that session is running in another terminal";
//@ chunk-vrr64ez0.js:31428-31527 placement
function daemonUnreachableMessage() {
  return `Couldn't reach the ${bgSupervisorNoun()} \u2014 it may be restarting. Press Enter to retry`;
}
//@ chunk-vrr64ez0.js:31527-31569 placement
function isReplyDaemonRestartingMsg(message) {
  return message.startsWith(daemonUnreachableMessage());
}
//@ chunk-vrr64ez0.js:31569-31661 placement
var MESSAGE_SAVED_SUFFIX =
  " \u2014 your message was saved and will be sent when you next restart this session";
//@ chunk-vrr64ez0.js:31661-31797 placement
async function isReplyDeliverable(jobDir, patch, storageV5) {
  invalidateJobStateCache(jobDir);
  let jobState = await readJobState(jobDir, storageV5);
  if (!jobState || isNonPromptInput(patch, jobState)) return false;
  let prompt = queuedPromptOrUndefined(jobState);
  if (prompt !== undefined) return prompt === patch;
  return queuePromptForJob(jobDir, jobState, patch, storageV5);
}
//@ chunk-vrr64ez0.js:31797-34943 placement
async function replyToJob(id, text, state, jobState, extraTelemetry, storageV5, { nextTurn = false } = {}) {
  let now = Date.now();
  let logOutcome = (outcome, errorCode, code) => {
    logEvent("tengu_bg_reply_outcome", {
      ms: Date.now() - now,
      outcome: fromEnum(outcome),
      error_code: fromEnumOpt(errorCode),
      errno: sanitizeErrnoTokenForTelemetry(code),
    });
  };
  if (state?.backend === "peer") {
    if (!state.sock) {
      logFeatureOk("job_reply");
      logOutcome("ok");
      return {
        err: REPLY_PEER_NO_SOCK_MSG,
      };
    }
    try {
      await sendToUdsSocket(state.sock, text, storageV5);
      logFeatureOk("job_reply");
      logOutcome("ok");
      return null;
    } catch (error) {
      logFeatureBad("job_reply", "job_reply_peer_send_failed");
      logOutcome("bad", "job_reply_peer_send_failed");
      return {
        err: `Couldn't send to that session \u2014 ${errorMessage(error)}`,
      };
    }
  }
  let jobDir = getJobDir(id);
  let currentState = jobState ?? (await readJobState(jobDir, storageV5));
  let daemonToken = await readDaemonToken();
  let replyDelivered = false;
  let versionSkewed = false;
  let sendReplyRequest = async () => {
    if (nextTurn) {
      let pingResponse = await controlRequest({
        proto: BG_PROTO,
        op: "ping",
      });
      if (!pingResponse.ok) return pingResponse;
      if (
        pingResponse.op !== "ping" ||
        pingResponse.version !==
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.316",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-10-30T23:28:13Z",
            GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION
      ) {
        versionSkewed = true;
        return {
          ok: false,
          error: "its supervisor runs a different Claude Code build",
          code: "ESKEW",
        };
      }
    }
    let replyResponse = await controlRequest({
      proto: BG_PROTO,
      op: "reply",
      short: id,
      text,
      auth: daemonToken,
      ...(nextTurn && {
        nextTurn,
      }),
    });
    if (!replyResponse.ok && "connected" in replyResponse && replyResponse.connected === true)
      replyDelivered = true;
    return replyResponse;
  };
  let response = await sendReplyRequest();
  let retryTransient = async () => {
    let maxAttempts = 10;
    for (
      let idx = 0;
      !response.ok &&
      (response.code === "ESTARTING" || response.code === "ENOREPLY" || response.code === "ERESPAWNING") &&
      idx < maxAttempts;
      idx++
    ) {
      if (response.code === "ERESPAWNING") maxAttempts = 60;
      await sleep(200);
      response = await sendReplyRequest();
    }
  };
  await retryTransient();
  if (!response.ok && response.code === "EAUTH") {
    let daemonToken_2 = await readDaemonToken();
    if (daemonToken_2 && daemonToken_2 !== daemonToken) {
      daemonToken = daemonToken_2;
      response = await sendReplyRequest();
    }
  }
  let ensureFailed = false;
  if (
    !response.ok &&
    (response.code === "ENOCONN" || response.code === "ETIMEOUT") &&
    !(nextTurn && replyDelivered)
  ) {
    let daemon = await ensureDaemon(
      {
        forceTransient: true,
      },
      storageV5,
    );
    ensureFailed = !daemon.ok;
    if (daemon.ok) {
      daemonToken = (await readDaemonToken()) ?? daemonToken;
      response = await sendReplyRequest();
      await retryTransient();
    }
  }
  if (response.ok) {
    if (currentState && !jobState) {
      invalidateJobStateCache(jobDir);
      let latestState = (await readJobState(jobDir, storageV5)) ?? currentState;
      let patchedState = applyReplyPatch(latestState, text);
      if (patchedState.queuedPrompt === text) patchedState.queuedPrompt = undefined;
      writeStateAtomic(jobDir, patchedState, storageV5).catch(logJobWriteError);
    }
    if (!jobState) {
      logEvent("tengu_bg_agent_action", {
        action: lit("reply"),
        wasTerminal: currentState ? isTerminal(currentState.state) : false,
        daemon: true,
        jobSessionId: sanitizeMarkName(state?.sessionId ?? currentState?.sessionId),
        ...extraTelemetry?.(),
      });
      logFeatureOk("job_reply");
      logOutcome("ok");
    }
    return null;
  }
  if (response.code === "ESKEW") {
    let skewMetric = versionSkewed ? "job_reply_daemon_skewed" : "job_reply_worker_skewed";
    logFeatureBad("job_reply", skewMetric);
    logOutcome("bad", skewMetric);
    return {
      err: response.error,
      code: response.code,
    };
  }
  if (response.code === "ENOJOB") {
    if (!jobState) {
      logFeatureSad("job_reply", "job_reply_not_running");
      logOutcome("sad", "job_reply_not_running");
    }
    return {
      err: REPLY_ENOJOB_MSG,
      code: response.code,
    };
  }
  if (response.code === "ENOCONN" || response.code === "ETIMEOUT") {
    if (!jobState && response.code === "ENOCONN") {
      let rosterEntry = (
        await readRoster(
          {
            silent: true,
          },
          storageV5,
        )
      ).workers[currentState?.daemonShort ?? id];
      if (rosterEntry && !(await isProcessLive(rosterEntry.pid, rosterEntry.procStart))) {
        logFeatureSad("job_reply", "job_reply_not_running");
        logOutcome("sad", "job_reply_not_running");
        return {
          err: REPLY_ENOJOB_MSG,
          code: "ENOJOB",
        };
      }
    }
    if (!jobState) {
      logFeatureBad("job_reply", "job_reply_daemon_unreachable", {
        errno: fromEnum(response.code),
        ensure_failed: ensureFailed,
      });
      logOutcome("bad", "job_reply_daemon_unreachable");
    }
    let queuedForLater =
      !jobState &&
      response.code === "ENOCONN" &&
      !response.connected &&
      !replyDelivered &&
      (await isReplyDeliverable(jobDir, text, storageV5));
    if (nextTurn && !replyDelivered)
      return {
        err: "its supervisor did not answer" + (queuedForLater ? MESSAGE_SAVED_SUFFIX : ""),
        code: "EUNREACHABLE",
        queued: queuedForLater,
      };
    return {
      err: daemonUnreachableMessage() + (queuedForLater ? MESSAGE_SAVED_SUFFIX : ""),
      code: response.code,
      queued: queuedForLater,
    };
  }
  if (!jobState) {
    logFeatureBad("job_reply", "job_reply_send_failed");
    logOutcome("bad", "job_reply_send_failed", response.code);
  }
  let queuedForLater = !jobState && !replyDelivered && (await isReplyDeliverable(jobDir, text, storageV5));
  return {
    err: `Couldn't send your message \u2014 ${response.error}` + (queuedForLater ? MESSAGE_SAVED_SUFFIX : ""),
    code: response.code,
    queued: queuedForLater,
  };
}
//@ chunk-vrr64ez0.js:34943-35138 placement
async function hasConversationToResume(jobState, storageV5) {
  if (isExecLaunch(jobState)) return false;
  let storageSource = wrapStorageSource(getTranscriptStorageContext(storageV5));
  let transcriptInfo = await resolveJobTranscript(
    jobState.resumeSessionId ?? jobState.sessionId,
    jobState.cwd,
    jobState.linkScanPath,
    undefined,
    storageSource,
  ).catch(() => {
    return;
  });
  return transcriptInfo?.hasMessages === true && !transcriptInfo.unverifiable;
}
//@ chunk-vrr64ez0.js:35138-36245 placement
/**
 * 附加前检查会话状态：已删除/已结束时返回错误并上报 detached。
 */
async function resolveAttachTarget(short, gesture, storageV5) {
  let jobState = await readJobStateAfterSettle(getJobDir(short), storageV5);
  if (jobState === null) {
    logFeatureOk("job_attach");
    reportAttachTelemetry(gesture, "detached");
    return {
      kind: "error",
      ended: true,
      msg: "That session was removed \u2014 back to the list",
    };
  }
  if (jobState.state === "done" || jobState.state === "stopped" || jobState.state === "blocked") {
    logFeatureOk("job_attach");
    reportAttachTelemetry(gesture, "detached");
    return {
      kind: "error",
      ended: true,
      msg:
        jobState.state === "stopped"
          ? "That session was stopped \u2014 back to the list"
          : jobState.state === "blocked"
            ? "That session is blocked \u2014 back to the list"
            : (await hasConversationToResume(jobState, storageV5))
              ? "That session's process exited \u2014 press Enter to resume it (the conversation is saved)"
              : "That session ended \u2014 back to the list",
    };
  }
  if (jobState.state === "failed") {
    if (jobState.detail === HOST_DIED_DETAIL || jobState.detail === HOST_DIED_EXEC_DETAIL) {
      logFeatureBad("job_attach", "job_attach_host_dead");
      reportAttachTelemetry(gesture, "error");
      return {
        kind: "error",
        msg:
          jobState.detail === HOST_DIED_EXEC_DETAIL
            ? HOST_DIED_EXEC_ATTACH_MESSAGE
            : `${HOST_DIED_ATTACH_MESSAGE} \u2014 press Enter to restart it`,
      };
    }
    let included = jobState.detail.includes("before init");
    logFeatureSad("job_attach", included ? "job_attach_pre_init_crash" : "job_attach_crash_loop");
    return {
      kind: "error",
      ended: true,
      crashed: true,
      msg: `Session can't start \u2014 ${jobState.detail.replace(/^.*?before init(?: \u2014 )?/, "").replace(/^Error:\s*/, "") || jobState.detail || "it crashed repeatedly"}`,
    };
  }
  return;
}
//@ chunk-vrr64ez0.js:36245-36292 placement
var TRANSIENT_STOP_OPTIONS = {
  forceTransient: true,
  standsDownAtExit: true,
};
//@ chunk-vrr64ez0.js:36292-36371 placement
async function attachJob(short, options = {}) {
  return await attachToBackgroundSession(short, options, {
    overStream: false,
    onlyToRetry: false,
  });
}
//@ chunk-vrr64ez0.js:36371-41410 placement
/**
 * 附加到后台会话的完整流程：屏幕保持、首帧前门控 stdin、云/本地会话标签。
 */
async function attachToBackgroundSession(short, options, attachOptions) {
  touchRecapTrigger(short, options.storageV5);
  logForDebugging("[PERF:bg-attach-start]");
  drainStdin();
  let racedSocketGapPattern = RACED_SOCKET_GAP;
  let sessionTabs = undefined;
  let transientAttachPattern = TRANSIENT_ATTACH_CODE;
  let attachOptionsFirst = {
    holdScreenOnDisconnect: true,
    alreadyInAlt: options.alreadyInAlt,
    gateStdinUntilFirstFrame: options.gateStdinUntilFirstFrame,
    sessionTabs,
    cloudTabs: options.cloudTabs,
    tabsLanding: options.tabsLanding,
  };
  let attachOptionsReconnect = {
    ...attachOptionsFirst,
    holdingFrame: true,
    gateStdinUntilFirstFrame: false,
    tabsLanding: undefined,
  };
  let gesture = options.gesture ?? {
    gestureId: randomUUID(),
    attempt: 0,
    interactive: {},
  };
  let shouldExitAltScreen = !options.alreadyInAlt;
  let attachResult = await killJobWithSignal(short, attachOptions, {
    ...attachOptionsFirst,
    telemetry: {
      gestureId: gesture.gestureId,
      attempt: ++gesture.attempt,
      t0: gesture.t0,
      surface: gesture.surface,
      daemonBooted: gesture.daemonBooted,
      interactive: gesture.interactive,
      storageV5: options.storageV5,
    },
  });
  let daemonResult;
  if (attachResult.outcome === "error" && attachResult.msg && racedSocketGapPattern.test(attachResult.msg)) {
    daemonResult = await ensureDaemon(TRANSIENT_STOP_OPTIONS, options.storageV5);
    if (daemonResult.ok)
      attachResult = await killJobWithSignal(short, attachOptions, {
        ...attachOptionsFirst,
        telemetry: {
          gestureId: gesture.gestureId,
          attempt: ++gesture.attempt,
          t0: gesture.t0,
          surface: gesture.surface,
          daemonBooted: gesture.daemonBooted,
          interactive: gesture.interactive,
          storageV5: options.storageV5,
        },
      });
  }
  for (let j = 0; attachResult.msg && transientAttachPattern.test(attachResult.msg) && j < 20; j++) {
    await sleep(500);
    attachResult = await killJobWithSignal(short, attachOptions, {
      ...attachOptionsFirst,
      telemetry: {
        gestureId: gesture.gestureId,
        attempt: ++gesture.attempt,
        t0: gesture.t0,
        surface: gesture.surface,
        daemonBooted: gesture.daemonBooted,
        interactive: gesture.interactive,
        storageV5: options.storageV5,
      },
    });
  }
  let resolveCrashResult = async () => {
    if (shouldExitAltScreen) process.stdout.write(exitAltScreenSequence());
    let attachTarget = await resolveAttachTarget(short, gesture, options.storageV5);
    if (attachTarget) return attachTarget;
    logFeatureSad("job_attach", "job_attach_crashed");
    return {
      kind: "error",
      orphaned: true,
      msg: "Session crashed \u2014 press Enter to respawn",
    };
  };
  while (attachResult.outcome === "disconnected") {
    if (isTerminalShutdown()) {
      if (shouldExitAltScreen) process.stdout.write(exitAltScreenSequence());
      return shouldStartDaemonForAttach("loop_head", options);
    }
    let reconnectingLabel = " Reconnecting\u2026 ";
    let max = Math.max(1, (process.stdout.columns ?? 80) - reconnectingLabel.length);
    process.stdout.write(`\x1B7${cursorPosition(1, max)}\x1B[2;7m${reconnectingLabel}\x1B[0m\x1B8`);
    let ensureOutcome;
    if (process.stdin.isTTY) {
      let wasRawMode = "isRaw" in process.stdin ? Boolean(process.stdin.isRaw) : false;
      if (!wasRawMode) setRawModeSafe(process.stdin, true);
      let detachWaiter = waitForDetachKey(process.stdin);
      try {
        ensureOutcome = await Promise.race([
          ensureDaemon(TRANSIENT_STOP_OPTIONS, options.storageV5),
          detachWaiter.promise.then(() => "detach"),
        ]);
      } finally {
        detachWaiter.cancel();
        if (!wasRawMode) setRawModeSafe(process.stdin, false);
      }
    } else ensureOutcome = await ensureDaemon(TRANSIENT_STOP_OPTIONS, options.storageV5);
    if (ensureOutcome === "detach") {
      if (shouldExitAltScreen) process.stdout.write(exitAltScreenSequence());
      logForDebugging("[PERF:bg-attach-end]");
      logFeatureOk("job_attach");
      reportAttachTelemetry(gesture, "detached");
      return {
        kind: "detached",
      };
    }
    let ensureResult = ensureOutcome;
    if (!ensureResult.ok) {
      if (shouldExitAltScreen) process.stdout.write(exitAltScreenSequence());
      if (ensureResult.stoodDown) return shouldStartDaemonForAttach("reconnect", options, ensureResult);
      logFeatureBad("job_attach", `job_attach_daemon_start_failed_${ensureResult.causeCode}`);
      reportAttachTelemetry(gesture, "error");
      return {
        kind: "error",
        msg: `Couldn't restart the ${bgSupervisorNoun()} \u2014 ${ensureResult.reason}`,
      };
    }
    let pendingInput = drainStdin();
    if (pendingInput && containsInterruptKey(pendingInput)) {
      if (shouldExitAltScreen) process.stdout.write(exitAltScreenSequence());
      logForDebugging("[PERF:bg-attach-end]");
      logFeatureOk("job_attach");
      reportAttachTelemetry(gesture, "detached");
      return {
        kind: "detached",
      };
    }
    if (await isBackgroundSessionGone(short)) {
      logForDebugging(
        `[bg-attach] worker gone on reconnect probe short=${short} \u2014 settled while attached`,
      );
      return resolveCrashResult();
    }
    attachResult = await killJobWithSignal(short, attachOptions, {
      ...attachOptionsReconnect,
      telemetry: {
        gestureId: gesture.gestureId,
        attempt: ++gesture.attempt,
        t0: gesture.t0,
        surface: gesture.surface,
        daemonBooted: gesture.daemonBooted,
        interactive: gesture.interactive,
        storageV5: options.storageV5,
      },
    });
    for (let idx = 0; attachResult.msg && transientAttachPattern.test(attachResult.msg) && idx < 10; idx++) {
      await sleep(200);
      attachResult = await killJobWithSignal(short, attachOptions, {
        ...attachOptionsReconnect,
        telemetry: {
          gestureId: gesture.gestureId,
          attempt: ++gesture.attempt,
          t0: gesture.t0,
          surface: gesture.surface,
          daemonBooted: gesture.daemonBooted,
          interactive: gesture.interactive,
          storageV5: options.storageV5,
        },
      });
    }
    if (attachResult.msg?.includes("ENOJOB")) {
      logForDebugging(
        `[bg-attach] ENOJOB on reconnect short=${short} \u2014 daemon has no handle (or it's killing/settled)`,
      );
      return resolveCrashResult();
    }
    if (attachResult.outcome === "error" && shouldExitAltScreen)
      process.stdout.write(exitAltScreenSequence());
  }
  if (
    attachResult.outcome === "detached" &&
    attachResult.msg &&
    !attachOptions.onlyToRetry &&
    (FATAL_ATTACH_CODE.test(attachResult.msg) || transientAttachPattern.test(attachResult.msg))
  ) {
    if (shouldExitAltScreen) process.stdout.write(exitAltScreenSequence());
    logFeatureBad("job_attach", "job_attach_stalled");
    return {
      kind: "error",
      msg: attachResult.msg.replace(/^E(STALLED|RESPAWNING|STARTING):\s*/, ""),
    };
  }
  if (attachResult.outcome === "error") {
    if (attachResult.msg?.startsWith(`${HOST_DEAD_ATTACH_CODE}:`)) {
      logFeatureBad("job_attach", "job_attach_host_dead");
      let jobState = await readJobState(getJobDir(short), options.storageV5).catch(() => null);
      let trimmed = attachResult.msg.slice(HOST_DEAD_ATTACH_CODE.length + 1).trim();
      return {
        kind: "error",
        msg:
          jobState !== null && isExecLaunch(jobState)
            ? trimmed
            : `${trimmed} \u2014 press Enter to restart it`,
      };
    }
    if (attachResult.msg?.startsWith(`${ENORESPONSE}:`)) {
      logFeatureBad("job_attach", "job_attach_no_response");
      let jobState = await readJobState(getJobDir(short), options.storageV5).catch(() => null);
      if (jobState !== null && isExecLaunch(jobState))
        return {
          kind: "error",
          msg: `${SESSION_NOT_RESPONDING_TEXT} \u2014 it runs a shell command, which is never run again for you; ctrl+x stops it`,
        };
      return {
        kind: "error",
        notResponding: true,
        msg: `${SESSION_NOT_RESPONDING_TEXT} \u2014 press Enter again to restart it (the conversation is saved)`,
      };
    }
    if (attachResult.msg?.includes("ENOJOB")) {
      logForDebugging(
        `[bg-attach] ENOJOB on first attach short=${short} \u2014 daemon has no handle (or it's killing/settled)`,
      );
      let attachTarget = await resolveAttachTarget(short, undefined, options.storageV5);
      if (attachTarget) return attachTarget;
      logFeatureSad("job_attach", "job_attach_orphaned");
      return {
        kind: "error",
        orphaned: true,
        msg: `${bgSupervisorNounCap()} lost track of this job \u2014 press Enter to respawn it`,
      };
    }
    if (daemonResult && !daemonResult.ok) {
      if (daemonResult.stoodDown) return shouldStartDaemonForAttach("first_attach", options, daemonResult);
      logFeatureBad("job_attach", `job_attach_daemon_start_failed_${daemonResult.causeCode}`);
      reportAttachTelemetry(gesture, "error");
      return {
        kind: "error",
        msg: `Couldn't start the ${bgSupervisorNoun()} \u2014 ${daemonResult.reason}`,
      };
    }
    let msg =
      attachResult.msg && transientAttachPattern.test(attachResult.msg)
        ? `${bgSupervisorNounCap()} is still starting \u2014 try again in a moment`
        : attachResult.msg && racedSocketGapPattern.test(attachResult.msg)
          ? `${bgSupervisorNounCap()} didn't respond after starting \u2014 try again in a moment`
          : attachResult.msg
            ? `Couldn't attach \u2014 ${attachResult.msg}`
            : "Couldn't attach to that session";
    logFeatureBad("job_attach", "job_attach_failed");
    return {
      kind: "error",
      msg,
    };
  }
  logForDebugging("[PERF:bg-attach-end]");
  logFeatureOk("job_attach");
  if (attachResult.msg && KICKED_ATTACH_CODE.test(attachResult.msg))
    return {
      kind: "detached",
      msg: attachResult.msg.replace(KICKED_ATTACH_CODE, ""),
    };
  return attachResult.beforeFirstFrame
    ? {
        kind: "detached",
        beforeFirstFrame: true,
      }
    : {
        kind: "detached",
      };
}
//@ chunk-vrr64ez0.js:41410-41516 placement
var BACKGROUND_SESSIONS_STOP_WARNING =
  "Background sessions still running will stop in about a minute. Run 'claude agents' to keep them.";
//@ chunk-vrr64ez0.js:41516-42043 placement
/**
 * 判断附加前是否需要拉起 daemon（ping 超时、服务管理器状态、平台）。
 */
async function shouldStartDaemonForAttach(phase, options, ensureResult) {
  let platform = getPlatform();
  let [pingResponse, serviceRestart] = ensureResult
    ? [undefined, ensureResult.viaService === true && platform !== "macos"]
    : await Promise.all([
        controlRequest(
          {
            proto: BG_PROTO,
            op: "ping",
          },
          {
            timeoutMs: 300,
          },
        ),
        canUseServiceDaemon(),
      ]);
  let isDaemonUp = pingResponse !== undefined && (pingResponse.ok || pingResponse.code === "ETIMEOUT");
  let stopWarning =
    !isDaemonUp && !serviceRestart && platform !== "windows" && process.stdout.isTTY
      ? `${BACKGROUND_SESSIONS_STOP_WARNING}
`
      : "";
  logForDebugging(`[bg-attach] held: this process is exiting (${phase})`);
  logEvent("tengu_bg_attach_held_at_exit", {
    loop_head: phase === "loop_head",
    first_attach: phase === "first_attach",
    daemon_up: isDaemonUp,
    service_restart: serviceRestart,
    notice: stopWarning !== "",
  });
  if (options.alreadyInAlt) options.onExitNotice?.(stopWarning);
  else if (stopWarning) process.stdout.write(stopWarning);
  return heldUntilExit();
}
//@ chunk-vrr64ez0.js:42043-42132 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_KILL_OUTPUT_LINES（32：停止输出保留行数）；HEAD_TAIL_LINES_STOP（{head:50,tail:30}）；HEAD_TAIL_LINES_LOG（{head:60,tail:100}：日志首尾行数）。
 */
var MAX_KILL_OUTPUT_LINES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HEAD_TAIL_LINES_STOP;
var HEAD_TAIL_LINES_LOG;
var WORKTREE_DIGEST_PATTERN;
deferInit("chunk-vrr64ez0.js:42043", () => {
  MAX_KILL_OUTPUT_LINES = 32;
  HEAD_TAIL_LINES_STOP = {
    head: 50,
    tail: 30,
  };
  HEAD_TAIL_LINES_LOG = {
    head: 60,
    tail: 100,
  };
  WORKTREE_DIGEST_PATTERN = new RegExp(`^[0-9a-f]{${MAX_KILL_OUTPUT_LINES}}$`);
});
//@ chunk-vrr64ez0.js:42132-42172 placement
function killOutputTail(worktreePath) {
  return computeContentHash(worktreePath).slice(0, MAX_KILL_OUTPUT_LINES);
}
//@ chunk-vrr64ez0.js:42172-48331 placement
async function deleteJob(short, options = {}, storageV5) {
  let jobState = await readJobState(getJobDir(short), storageV5);
  let liveSessions = jobState?.worktreePath ? await listAllLiveSessions(storageV5).catch(() => []) : [];
  let ownPids = new Set();
  for (let session of liveSessions) if (matchesJobRef(session, short)) ownPids.add(session.pid);
  let killResult = await killJob(
    short,
    jobState ?? undefined,
    {
      knownGone: options.knownGone,
      evict: true,
    },
    storageV5,
  ).catch((error) => ({
    confirmed: false,
    error: errorMessage(error),
  }));
  if (!killResult.confirmed) {
    logForDebugging(
      `deleteJob: kill unconfirmed for ${short} \u2014 skipping jobdir/worktree removal to avoid stranding a live worker`,
      {
        level: "warn",
      },
    );
    if (!options.internal)
      logFeatureBad("job_delete", "kill_unconfirmed", {
        had_worktree: Boolean(jobState?.worktreePath),
      });
    return {
      removed: false,
      error: killResult.error,
      errorCode: "kill_unconfirmed",
    };
  }
  let leftWorktreeDir;
  let forcedRemoval;
  let discardConfirmed = false;
  if (jobState?.worktreePath) {
    let worktreePath = jobState.worktreePath;
    let keptReason;
    let forceRemovable;
    let forceRemoveWithheld;
    let otherRecord = null;
    let presence = "present";
    let notInGitRepo = false;
    let keptErrorSummary;
    let unpushedInfo;
    let occupyingSession;
    let { dirty, trackedChanges, gitError, submoduleWork } = await getAgentWorktreeChanges(
      worktreePath,
      undefined,
    );
    let cleanupRoot = resolveWorktreeCleanupRoot(worktreePath, jobState.originCwd) ?? undefined;
    let resolvedWorktreePath = await realpath(worktreePath).catch(() => worktreePath);
    let worktreeDigest = killOutputTail(resolvedWorktreePath);
    discardConfirmed =
      options.discardUnpushed !== undefined &&
      !gitError &&
      options.discardUnpushed.worktreeDigest === worktreeDigest &&
      (await isHeadAt(resolvedWorktreePath, options.discardUnpushed.headSha));
    let registeredWorktrees =
      !gitError && cleanupRoot ? await listRegisteredWorktrees(cleanupRoot).catch(() => null) : null;
    let ownWorktreeEntry;
    let isNestedEntry = false;
    for (let [entryIndex, worktreeEntry] of (registeredWorktrees ?? []).entries())
      if (
        (await realpath(worktreeEntry.worktreePath).catch(() => worktreeEntry.worktreePath)) ===
        resolvedWorktreePath
      ) {
        ownWorktreeEntry = worktreeEntry;
        isNestedEntry = entryIndex > 0 && !worktreeEntry.prunable;
        break;
      }
    let vouchingRepo = repositoryVouchedByWorktree(resolvedWorktreePath);
    let rootMatches =
      cleanupRoot !== undefined &&
      vouchingRepo !== null &&
      (await realpath(vouchingRepo).catch(() => vouchingRepo)) ===
        (await realpath(cleanupRoot).catch(() => cleanupRoot));
    let withheldReason =
      isNestedEntry && rootMatches
        ? submoduleWork?.kind === "unverifiable"
          ? "submodule"
          : trackedChanges
            ? "tracked_changes"
            : undefined
        : cleanupRoot !== undefined &&
            (await worktreeDeregisteredByRemoval(resolvedWorktreePath, cleanupRoot))
          ? undefined
          : "not_registered";
    let forceRemoveRequested =
      options.forceRemoveWorktree !== undefined && options.forceRemoveWorktree === worktreeDigest;
    let canForceRemove =
      forceRemoveRequested &&
      withheldReason === undefined &&
      isDirectlyUnderClaudeWorktreesDir(resolvedWorktreePath);
    let deleteKind = canForceRemove
      ? "job_delete_force_remove"
      : options.force === true || discardConfirmed
        ? "job_delete_force"
        : "job_delete";
    let hasDiscardConsent = carriesDiscardConsent(deleteKind);
    let lockPid = claudeWorktreeLockPid(ownWorktreeEntry?.lockReason);
    let sharingJob;
    if (
      (sharingJob = await findJobSharingWorktree(short, resolvedWorktreePath, worktreePath, storageV5)) !==
      null
    ) {
      keptReason = "in_use";
      keptErrorSummary =
        sharingJob.verified && SHORT_RE.test(sharingJob.jobId) ? sharingJob.jobId : undefined;
      logForDebugging(
        `deleteJob: ${worktreePath} is claimed by running job ${sharingJob.jobId}'s state.json (${sharingJob.verified ? "verified" : "unverifiable claim"}) \u2014 not ours to remove`,
        {
          level: "warn",
        },
      );
    } else if (
      ((notInGitRepo = (await findGitRootVerifyingPositive(worktreePath)) === null) ||
        discardConfirmed ||
        canForceRemove) &&
      (presence = await pathPresence(worktreePath)) !== "gone" &&
      (otherRecord =
        presence === "unreadable"
          ? "unreadable"
          : await findOtherJobsInDir(
              short,
              resolvedWorktreePath,
              worktreePath,
              {
                includeUnsettled: discardConfirmed || canForceRemove,
              },
              storageV5,
            )) !== null
    ) {
      if (otherRecord === "claimed" && !notInGitRepo && discardConfirmed) {
        keptReason = "unpushed_shared";
        unpushedInfo = await listUnpushedCommits(worktreePath).catch(() => {
          return;
        });
      } else keptReason = otherRecord === "claimed" ? "shared_record" : "records_unreadable";
      logForDebugging(
        otherRecord === "claimed"
          ? `deleteJob: ${worktreePath} is also recorded by another settled job's state.json \u2014 not removing another session's output`
          : `deleteJob: could not verify ${worktreePath} against sibling records \u2014 refusing until records are readable`,
        {
          level: "warn",
        },
      );
    } else if (
      !(await mayReleaseWorktreeLock(ownWorktreeEntry?.lockReason)) &&
      !(lockPid !== null && ownPids.has(lockPid))
    ) {
      keptReason = "live_lock";
      keptErrorSummary = lockPid !== null ? `pid ${lockPid}` : undefined;
      logForDebugging(
        `deleteJob: ${worktreePath} is locked by a live Claude Code process, or with a reason we did not write (${ownWorktreeEntry?.lockReason}) \u2014 not ours to remove`,
        {
          level: "warn",
        },
      );
    } else if (
      (occupyingSession = await findSessionsInDirectory(
        liveSessions,
        short,
        ownPids,
        resolvedWorktreePath,
        worktreePath,
      )) !== undefined &&
      (await pathPresence(worktreePath)) !== "gone"
    ) {
      keptReason = "occupied";
      keptErrorSummary =
        occupyingSession.pid === process.pid
          ? `${typeof occupyingSession.parkedJobId === "string" && SHORT_RE.test(occupyingSession.parkedJobId) ? `session ${occupyingSession.parkedJobId},` : "a session"} moved to the background from this window, pid ${occupyingSession.pid}`
          : occupyingSession.kind === "bg" &&
              typeof occupyingSession.jobId === "string" &&
              SHORT_RE.test(occupyingSession.jobId)
            ? `background session ${occupyingSession.jobId}, pid ${occupyingSession.pid}`
            : `pid ${occupyingSession.pid}, ${occupyingSession.kind}`;
      logForDebugging(
        `deleteJob: ${worktreePath} is the working directory of a live session (pid ${occupyingSession.pid}, ${occupyingSession.kind}) \u2014 not ours to remove`,
        {
          level: "warn",
        },
      );
    } else if (dirty && !gitError && !hasDiscardConsent) {
      keptReason = "dirty";
      logForDebugging(`deleteJob: worktree has uncommitted changes, kept ${worktreePath}`, {
        level: "warn",
      });
    } else if (
      !gitError &&
      cleanupRoot &&
      !discardConfirmed &&
      !(await passesCommitSafetyChecks(worktreePath, await getDefaultRemoteRef(cleanupRoot), {
        primaryCheckoutVouches: true,
      }))
    ) {
      if (
        (await findOtherJobsInDir(
          short,
          resolvedWorktreePath,
          worktreePath,
          {
            includeUnsettled: false,
          },
          storageV5,
        )) === "claimed"
      ) {
        keptReason = "unpushed_shared";
        logForDebugging(
          `deleteJob: ${worktreePath} has unpushed commits and is also recorded by another settled job's state.json \u2014 not offering a discard`,
          {
            level: "warn",
          },
        );
      } else {
        keptReason = "unpushed";
        logForDebugging(`deleteJob: ${worktreePath} has commits that are on no remote, kept`, {
          level: "warn",
        });
      }
      unpushedInfo = await listUnpushedCommits(worktreePath).catch(() => {
        return;
      });
    } else if (
      discardConfirmed &&
      options.discardUnpushed !== undefined &&
      !(await isHeadAt(resolvedWorktreePath, options.discardUnpushed.headSha))
    ) {
      keptReason = "unpushed";
      logForDebugging(`deleteJob: ${worktreePath} HEAD moved past the confirmed discard pin, kept`, {
        level: "warn",
      });
      unpushedInfo = await listUnpushedCommits(worktreePath).catch(() => {
        return;
      });
    } else {
      let cleanupRoot = resolveWorktreeCleanupRoot(worktreePath, jobState.originCwd) ?? undefined;
      let originGitRoot = (jobState.originCwd ? findGitRoot(jobState.originCwd) : null) ?? undefined;
      let removalResult = await removeAgentWorktree(
        worktreePath,
        jobState.worktreeBranch,
        cleanupRoot,
        jobState.worktreeHookBased,
        deleteKind,
        resolvedWorktreePath,
        originGitRoot,
        {
          storageV5,
          forceRemoveRequested,
        },
      ).catch((error) => {
        logForDebugging(`deleteJob: removeAgentWorktree threw for ${worktreePath}: ${errorMessage(error)}`, {
          level: "error",
        });
        return {
          outcome: "failed",
          errorSummary: `the removal failed unexpectedly (${printableLabel(errorMessage(error), HEAD_TAIL_LINES_LOG)})`,
        };
      });
      if (removalResult.outcome === "failed") {
        keptReason = removalResult.needsForce
          ? "unverified"
          : removalResult.errorSummary === IDENTITY_CHANGED_SUMMARY
            ? "identity_changed"
            : removalResult.holdsWorktreesInside
              ? "worktrees_inside"
              : "remove_failed";
        keptErrorSummary = removalResult.needsForce ? undefined : removalResult.errorSummary;
        if (
          removalResult.forceRemovable !== undefined &&
          isDirectlyUnderClaudeWorktreesDir(resolvedWorktreePath)
        )
          if (withheldReason !== undefined) forceRemoveWithheld = withheldReason;
          else if (
            (await findOtherJobsInDir(
              short,
              resolvedWorktreePath,
              worktreePath,
              {
                includeUnsettled: false,
              },
              storageV5,
            )) === "claimed"
          )
            forceRemoveWithheld = "shared_record";
          else forceRemovable = removalResult.forceRemovable;
      } else if (removalResult.outcome === "left_in_place") leftWorktreeDir = printableLabel(worktreePath);
      else if (removalResult.forcedDirectoryRemoval) {
        let { keptBranch } = removalResult.forcedDirectoryRemoval;
        forcedRemoval = {
          worktree: printableLabel(resolvedWorktreePath),
          ...(keptBranch !== undefined && {
            keptBranch: printableLabel(keptBranch, HEAD_TAIL_LINES_STOP),
          }),
        };
      }
    }
    if (keptReason) {
      if (!options.internal)
        logFeatureSad("job_delete", `worktree_kept_${keptReason}`, {
          had_worktree: true,
        });
      return {
        removed: false,
        keptWorktree: printableLabel(resolvedWorktreePath),
        keptReason,
        ...(keptErrorSummary !== undefined && {
          keptErrorSummary,
        }),
        ...(unpushedInfo !== undefined && {
          keptUnpushed: unpushedInfo,
        }),
        ...(keptReason === "unpushed" && unpushedInfo !== undefined
          ? {
              discardUnpushed: {
                headSha: unpushedInfo.headSha,
                worktreeDigest,
              },
            }
          : forceRemovable !== undefined &&
            discardConfirmed &&
            options.discardUnpushed !== undefined && {
              discardUnpushed: options.discardUnpushed,
            }),
        ...(forceRemovable !== undefined && {
          forceRemoveWorktree: {
            worktreeDigest,
            cause: forceRemovable,
          },
        }),
        ...(forceRemoveWithheld !== undefined && {
          forceRemoveWithheld,
        }),
        ...(submoduleWork !== undefined &&
          (keptReason === "dirty" || keptReason === "remove_failed") && {
            submoduleWork,
          }),
      };
    }
  }
  let hasLiveShell =
    jobState?.fan?.some((fanEntry) => fanEntry.kind === "shell" && fanEntry.doneAt === undefined) ?? false;
  await reapAdoptRecord(getJobDir(short), {
    waitMs: hasLiveShell ? 4000 : 0,
  });
  try {
    await rm(getJobDir(short), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    invalidateJobStateCache(getJobDir(short));
    logForDebugging(`deleteJob: failed to remove job dir for ${short}: ${errorMessage(error)}`, {
      level: "warn",
    });
    if (!options.internal)
      logFeatureBad("job_delete", "jobdir_rm_failed", {
        had_worktree: Boolean(jobState?.worktreePath),
      });
    return {
      removed: false,
      error: `couldn't remove the session's state directory (${collapseWhitespace(errorMessage(error))})`,
      errorCode: "jobdir_rm_failed",
    };
  }
  if (
    isStorageV5Enabled() &&
    storageV5 !== undefined &&
    validateStorageKey(hostTombstonePath(short)) === undefined
  )
    await deleteHostTombstone(storageV5, short);
  else await unlink(hostManagedEntry(short)).catch(() => {});
  invalidateJobStateCache(getJobDir(short));
  if (!options.internal)
    if (leftWorktreeDir)
      logFeatureSad("job_delete", "worktree_left_in_place", {
        had_worktree: true,
        discard_confirmed: discardConfirmed,
      });
    else if (forcedRemoval)
      logFeatureSad("job_delete", "worktree_force_removed", {
        had_worktree: true,
        discard_confirmed: discardConfirmed,
      });
    else
      logFeatureOk("job_delete", {
        had_worktree: Boolean(jobState?.worktreePath),
        discard_confirmed: discardConfirmed,
      });
  return {
    removed: true,
    discardConfirmed,
    ...(leftWorktreeDir && {
      leftWorktreeDir,
    }),
    ...(forcedRemoval && {
      forcedWorktreeRemoval: forcedRemoval,
    }),
  };
}
//@ chunk-vrr64ez0.js:48331-48689 placement
/**
 * 找出与指定 worktree 路径相同的其他存活 job（已验证/无法验证）。
 */
async function findJobSharingWorktree(short, realPath, worktreePath, storageV5) {
  for (let job of await listJobs(undefined, storageV5).catch(() => [])) {
    if (job.id === short || !job.state.worktreePath || isSettled(job.state)) continue;
    let matchKind = matchWorktreePath(job.state.worktreePath, realPath, worktreePath);
    if (matchKind === "match")
      return {
        jobId: job.id,
        verified: true,
      };
    if (matchKind === "unverifiable")
      return {
        jobId: job.id,
        verified: false,
      };
    let comparablePath = await resolveComparablePath(job.state.worktreePath, worktreePath);
    if (isSamePath(comparablePath, realPath))
      return {
        jobId: job.id,
        verified: true,
      };
  }
  return null;
}
//@ chunk-vrr64ez0.js:48689-48870 placement
function matchWorktreePath(worktreePath, realPath, worktreePath_2) {
  if (isSamePath(worktreePath, worktreePath_2) || isSamePath(worktreePath, realPath)) return "match";
  if (!hasDotSegment(worktreePath)) return "no_match";
  let normalizedPath = normalize(worktreePath);
  if (isSamePath(normalizedPath, worktreePath_2) || isSamePath(normalizedPath, realPath)) return "match";
  return isAbsolute(worktreePath) && !isUncOrDevicePath(worktreePath) && !isNetworkMountRoot(worktreePath)
    ? "unverifiable"
    : "no_match";
}
//@ chunk-vrr64ez0.js:48870-48908 placement
function isSamePath(pathA, pathB) {
  return realCwd(pathA) === realCwd(pathB);
}
//@ chunk-vrr64ez0.js:48908-48940 placement
function realCwd(path) {
  return foldCaseBasic(identity(path));
}
//@ chunk-vrr64ez0.js:48940-49023 placement
function isCwdInside(candidatePath, rootPath) {
  let relativePath = relative(realCwd(rootPath), realCwd(candidatePath));
  return relativePath.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute(relativePath);
}
//@ chunk-vrr64ez0.js:49023-49451 placement
/**
 * 在会话列表中找出与当前目录相同的交互/后台会话进程。
 */
async function findSessionsInDirectory(sessions, short, ownPids, realPath, rootPath) {
  for (let session of sessions) {
    if (session.kind !== "interactive" && session.kind !== "bg") continue;
    if (ownPids.has(session.pid) || session.parkedJobId === short) continue;
    if (session.pid === process.pid && session.parkedJobId === undefined) continue;
    let sessionCwd = session.pid === process.pid ? getOriginalCwd() : session.cwd;
    if (typeof sessionCwd !== "string" || !isAbsolute(sessionCwd)) continue;
    if (!isCwdInside(sessionCwd, realPath) && !isCwdInside(sessionCwd, rootPath)) continue;
    if (session.kind === "bg" && typeof session.jobId === "string" && SHORT_RE.test(session.jobId)) {
      if ((await probeJobStateFile(getJobDir(session.jobId))) === "missing") continue;
    }
    return session;
  }
  return;
}
//@ chunk-vrr64ez0.js:49451-49672 placement
function resolveComparablePath(worktreePath, worktreePath_2) {
  let cwd = getCwd();
  if (
    !isAbsolute(worktreePath) ||
    hasDotSegment(worktreePath) ||
    (isOnForeignMount(worktreePath, cwd) && isOnForeignMount(worktreePath, worktreePath_2))
  )
    return worktreePath;
  let deepestExistingAncestor = resolveDeepestExistingAncestorSync(getFsImplementation(), worktreePath, {
    surfaceNetworkRaw: true,
    anchors: [cwd, worktreePath_2],
  });
  if (deepestExistingAncestor === UNVERIFIED_ANCESTRY) return worktreePath;
  if (
    deepestExistingAncestor !== undefined &&
    (hasDotSegment(deepestExistingAncestor) ||
      (isOnForeignMount(deepestExistingAncestor, cwd) &&
        isOnForeignMount(deepestExistingAncestor, worktreePath_2)))
  )
    return worktreePath;
  return realpath(worktreePath).catch(() => worktreePath);
}
//@ chunk-vrr64ez0.js:49672-49776 placement
async function probeJobStateFile(jobDir) {
  return lstat(join(jobDir, "state.json")).then(
    () => "present",
    (error) => (isENOENT(error) ? "missing" : "unreadable"),
  );
}
//@ chunk-vrr64ez0.js:49776-50285 placement
/**
 * 扫描 jobs 目录，找出在同一目录工作的其他 job。
 */
async function findOtherJobsInDir(short, realPath, worktreePath, { includeUnsettled }, storageV5) {
  let entries;
  try {
    entries = await readdir(getJobsDir(), {
      withFileTypes: true,
    });
  } catch (error) {
    return isENOENT(error) ? null : "unreadable";
  }
  for (let entry of entries) {
    if (!entry.isDirectory() || entry.name === short) continue;
    let otherJobDir = join(getJobsDir(), entry.name);
    let jobState = await readJobState(otherJobDir, storageV5);
    if (jobState === null) {
      if ((await probeJobStateFile(otherJobDir)) === "missing") continue;
      return "unreadable";
    }
    if (!jobState.worktreePath || (!includeUnsettled && !isSettled(jobState))) continue;
    let matchKind = matchWorktreePath(jobState.worktreePath, realPath, worktreePath);
    if (matchKind === "match") return "claimed";
    if (matchKind === "unverifiable") return "unreadable";
    let comparablePath = await resolveComparablePath(jobState.worktreePath, worktreePath);
    if (isSamePath(comparablePath, realPath)) return "claimed";
  }
  return null;
}
//@ chunk-vrr64ez0.js:50285-50332 placement
async function killJobWithSignal(short, options, attachOptions) {
  return await attachToJob(short, attachOptions);
}
//@ chunk-vrr64ez0.js:50332-50418 placement
function matchesJobRef(session, short) {
  return session.kind === "bg" && (session.jobId === short || session.sessionId?.startsWith(short) === true);
}
export {
  RECAP_TRIGGER_FILE,
  attachJob,
  listAliveDaemonJobs,
  applyReplyPatch,
  replyToJob,
  REPLY_ENOJOB_MSG,
  REPLY_PEER_NO_SOCK_MSG,
  isReplyDaemonRestartingMsg,
  killJob,
  deleteJob,
  isDirectlyUnderClaudeWorktreesDir,
  probeDaemonJob,
  hasConversationToResume,
  WORKTREE_DIGEST_PATTERN,
  killOrphanedWorker,
  isDaemonJobPresent,
};
