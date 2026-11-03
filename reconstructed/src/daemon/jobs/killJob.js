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
import { writeFile, realpath, rm, unlink, lstat, readdir } from "fs/promises";
import { join, normalize, isAbsolute, relative, dirname, basename } from "path";
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
import { daemonPtySocket, hostManagedEntry } from "../../utils/sandbox/userNamespace.js";
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
import { readDaemonToken } from "../../services/daemon/paths.js";
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

//@ chunk-vrr64ez0.js:28269-28293 placement
var RECAP_TRIGGER_FILE = "recap.trigger";
//@ chunk-vrr64ez0.js:28293-28472 placement
function touchRecapTrigger(e, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let o = STORAGE_SPACES.job(e, [RECAP_TRIGGER_FILE]);
    if (validateStorageKey(o) === undefined) {
      storageV5
        .write(o, "", {
          publishDiscipline: "inPlace",
        })
        .catch(() => {});
      return;
    }
  }
  writeFile(join(getJobDir(e), RECAP_TRIGGER_FILE), "").catch(() => {});
}
//@ chunk-vrr64ez0.js:28472-29740 placement
async function killJob(e, n, o, r) {
  if (n?.backend === "peer")
    return {
      confirmed: true,
    };
  let handoff = o?.handoff ? true : undefined;
  let s = o?.evict ? true : undefined;
  let h = o?.knownGone
    ? {
        ok: false,
        code: "ENOJOB",
        error: "job already gone (caller-verified)",
      }
    : await controlRequest({
        proto: BG_PROTO,
        op: "kill",
        short: e,
        handoff,
        evict: s,
      });
  for (let j = 0; !h.ok && h.code === "ESTARTING" && j < 10; j++) {
    await sleep(200);
    h = await controlRequest({
      proto: BG_PROTO,
      op: "kill",
      short: e,
      handoff,
      evict: s,
    });
  }
  if (h.ok)
    return {
      confirmed: true,
    };
  if (h.code === "ENOJOB" || h.code === "ENOCONN" || h.code === "ETIMEOUT") {
    let A = await killOrphanedWorker(e, r);
    if (A.anyMatch && h.code === "ENOJOB")
      return {
        confirmed: A.confirmed,
      };
    let w = false;
    let T = false;
    if (h.code === "ENOCONN" || h.code === "ETIMEOUT") {
      let S;
      if (A.anyMatch) S = A.confirmed;
      else {
        let roster = await readRoster(
          {
            silent: true,
          },
          r,
        );
        let N = roster.workers[e];
        if (N !== undefined) {
          let U = await checkProcessLiveness(N.pid, N.procStart);
          if (U === "zombie") {
            if (N.procStart !== undefined && (await provenSameProcessAsync(N.pid, N.procStart)) === true) {
              try {
                process.kill(-N.pid, "SIGKILL");
              } catch {
                try {
                  process.kill(N.pid, "SIGKILL");
                } catch {}
              }
              S = true;
            } else S = false;
          } else S = U !== "live";
        } else {
          let U = !A.scanFailed && !roster.parseFailed;
          w =
            h.code === "ENOCONN" &&
            U &&
            n?.state !== undefined &&
            isSettled({
              state: n.state,
              tempo: n.tempo,
            });
          S = w;
          T = U && !S;
        }
      }
      if (s && S && h.code === "ENOCONN" && !w)
        await updateRoster((v) => {
          delete v.workers[e];
        }, r).catch((error) => logError(error));
      return T
        ? {
            confirmed: S,
            noWorkerFound: T,
          }
        : {
            confirmed: S,
          };
    }
    return {
      confirmed: true,
    };
  }
  return {
    confirmed: false,
    error: h.error,
  };
}
//@ chunk-vrr64ez0.js:29740-30247 placement
async function killOrphanedWorker(e, n) {
  let o = await killViaPtySocket(daemonPtySocket(e));
  let anyMatch = false;
  let confirmed = true;
  let scanFailed = false;
  let h = await listAllLiveSessions(n).catch(() => {
    scanFailed = true;
    return [];
  });
  for (let A of h)
    if (matchesJobRef(A, e)) {
      anyMatch = true;
      if (!o)
        try {
          process.kill(A.pid, "SIGTERM");
        } catch {}
      let w = Date.now() + 3000;
      let T = true;
      while ((T = await isProcessLive(A.pid, A.procStart)) && Date.now() < w) await sleep(100);
      if (T) {
        logEvent("tengu_bg_killjob_ctrl_fallback", {
          ctrlSent: o,
        });
        try {
          process.kill(A.pid, "SIGTERM");
        } catch {}
        let S = Date.now() + 500;
        while ((T = await isProcessLive(A.pid, A.procStart)) && Date.now() < S) await sleep(100);
      }
      if (T) confirmed = false;
    }
  return {
    confirmed,
    anyMatch,
    scanFailed,
  };
}
//@ chunk-vrr64ez0.js:30247-30605 placement
async function listAliveDaemonJobs(e) {
  let n = await controlRequest({
    proto: BG_PROTO,
    op: "list",
  });
  if (n.ok && n.op === "list")
    return {
      shorts: new Set(n.jobs.map((job) => job.short)),
      records: n.jobs.filter((job) => !job.outcome),
    };
  let roster = await readRoster(
    {
      silent: true,
    },
    e,
  );
  let entries = Object.entries(roster.workers);
  let results = await Promise.all(entries.map(([, s]) => isProcessLive(s.pid, s.procStart)));
  return {
    shorts: new Set(entries.filter((s, h) => results[h]).map(([s]) => s)),
    records: [],
  };
}
//@ chunk-vrr64ez0.js:30605-30880 placement
async function probeDaemonJob(e, n) {
  let o = await controlRequest({
    proto: BG_PROTO,
    op: "has",
    short: e,
  });
  if (o.ok && o.op === "has")
    return {
      alive: o.alive,
      present: o.present ?? o.alive,
      daemonUp: true,
    };
  let r = (
    await readRoster(
      {
        silent: true,
      },
      n,
    )
  ).workers[e];
  let u = r !== undefined && (await isProcessLive(r.pid, r.procStart));
  return {
    alive: u,
    present: u,
    daemonUp: false,
  };
}
//@ chunk-vrr64ez0.js:30880-30994 placement
async function isDaemonJobPresent(short) {
  let n = await controlRequest({
    proto: BG_PROTO,
    op: "has",
    short,
  });
  return n.ok && n.op === "has" ? (n.present ?? n.alive) : false;
}
//@ chunk-vrr64ez0.js:30994-31299 placement
function applyReplyPatch(e, n) {
  let o =
    e.tempo === "blocked" && e.state !== "blocked" && e.block === undefined && looksLikeApproveLine(e.needs);
  return {
    ...e,
    ...(hasOutstandingAsk(e) && {
      state: "working",
    }),
    detail: truncateWithEllipsis(redactSecrets(n).replace(/\s+/g, " ").trim(), MAX_HEADLINE_LENGTH),
    ...(!o && {
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
function isReplyDaemonRestartingMsg(e) {
  return e.startsWith(daemonUnreachableMessage());
}
//@ chunk-vrr64ez0.js:31569-31661 placement
var MESSAGE_SAVED_SUFFIX =
  " \u2014 your message was saved and will be sent when you next restart this session";
//@ chunk-vrr64ez0.js:31661-31797 placement
async function isReplyDeliverable(jobDir, n, o) {
  invalidateJobStateCache(jobDir);
  let jobState = await readJobState(jobDir, o);
  if (!jobState || isNonPromptInput(n, jobState)) return false;
  let u = queuedPromptOrUndefined(jobState);
  if (u !== undefined) return u === n;
  return queuePromptForJob(jobDir, jobState, n, o);
}
//@ chunk-vrr64ez0.js:31797-34943 placement
async function replyToJob(id, n, state, r, u, storageV5, { nextTurn: h = false } = {}) {
  let now = Date.now();
  let w = (D, P, code) => {
    logEvent("tengu_bg_reply_outcome", {
      ms: Date.now() - now,
      outcome: fromEnum(D),
      error_code: fromEnumOpt(P),
      errno: sanitizeErrnoTokenForTelemetry(code),
    });
  };
  if (state?.backend === "peer") {
    if (!state.sock) {
      logFeatureOk("job_reply");
      w("ok");
      return {
        err: REPLY_PEER_NO_SOCK_MSG,
      };
    }
    try {
      await sendToUdsSocket(state.sock, n, storageV5);
      logFeatureOk("job_reply");
      w("ok");
      return null;
    } catch (error) {
      logFeatureBad("job_reply", "job_reply_peer_send_failed");
      w("bad", "job_reply_peer_send_failed");
      return {
        err: `Couldn't send to that session \u2014 ${errorMessage(error)}`,
      };
    }
  }
  let jobDir = getJobDir(id);
  let S = r ?? (await readJobState(jobDir, storageV5));
  let daemonToken = await readDaemonToken();
  let N = false;
  let U = false;
  let j = async () => {
    if (h) {
      let P = await controlRequest({
        proto: BG_PROTO,
        op: "ping",
      });
      if (!P.ok) return P;
      if (
        P.op !== "ping" ||
        P.version !==
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
        U = true;
        return {
          ok: false,
          error: "its supervisor runs a different Claude Code build",
          code: "ESKEW",
        };
      }
    }
    let D = await controlRequest({
      proto: BG_PROTO,
      op: "reply",
      short: id,
      text: n,
      auth: daemonToken,
      ...(h && {
        nextTurn: h,
      }),
    });
    if (!D.ok && "connected" in D && D.connected === true) N = true;
    return D;
  };
  let C = await j();
  let q = async () => {
    let D = 10;
    for (
      let idx = 0;
      !C.ok && (C.code === "ESTARTING" || C.code === "ENOREPLY" || C.code === "ERESPAWNING") && idx < D;
      idx++
    ) {
      if (C.code === "ERESPAWNING") D = 60;
      await sleep(200);
      C = await j();
    }
  };
  await q();
  if (!C.ok && C.code === "EAUTH") {
    let daemonToken_2 = await readDaemonToken();
    if (daemonToken_2 && daemonToken_2 !== daemonToken) {
      daemonToken = daemonToken_2;
      C = await j();
    }
  }
  let ensureFailed = false;
  if (!C.ok && (C.code === "ENOCONN" || C.code === "ETIMEOUT") && !(h && N)) {
    let daemon = await ensureDaemon(
      {
        forceTransient: true,
      },
      storageV5,
    );
    ensureFailed = !daemon.ok;
    if (daemon.ok) {
      daemonToken = (await readDaemonToken()) ?? daemonToken;
      C = await j();
      await q();
    }
  }
  if (C.ok) {
    if (S && !r) {
      invalidateJobStateCache(jobDir);
      let D = (await readJobState(jobDir, storageV5)) ?? S;
      let P = applyReplyPatch(D, n);
      if (P.queuedPrompt === n) P.queuedPrompt = undefined;
      writeStateAtomic(jobDir, P, storageV5).catch(logJobWriteError);
    }
    if (!r) {
      logEvent("tengu_bg_agent_action", {
        action: lit("reply"),
        wasTerminal: S ? isTerminal(S.state) : false,
        daemon: true,
        jobSessionId: sanitizeMarkName(state?.sessionId ?? S?.sessionId),
        ...u?.(),
      });
      logFeatureOk("job_reply");
      w("ok");
    }
    return null;
  }
  if (C.code === "ESKEW") {
    let D = U ? "job_reply_daemon_skewed" : "job_reply_worker_skewed";
    logFeatureBad("job_reply", D);
    w("bad", D);
    return {
      err: C.error,
      code: C.code,
    };
  }
  if (C.code === "ENOJOB") {
    if (!r) {
      logFeatureSad("job_reply", "job_reply_not_running");
      w("sad", "job_reply_not_running");
    }
    return {
      err: REPLY_ENOJOB_MSG,
      code: C.code,
    };
  }
  if (C.code === "ENOCONN" || C.code === "ETIMEOUT") {
    if (!r && C.code === "ENOCONN") {
      let P = (
        await readRoster(
          {
            silent: true,
          },
          storageV5,
        )
      ).workers[S?.daemonShort ?? id];
      if (P && !(await isProcessLive(P.pid, P.procStart))) {
        logFeatureSad("job_reply", "job_reply_not_running");
        w("sad", "job_reply_not_running");
        return {
          err: REPLY_ENOJOB_MSG,
          code: "ENOJOB",
        };
      }
    }
    if (!r) {
      logFeatureBad("job_reply", "job_reply_daemon_unreachable", {
        errno: fromEnum(C.code),
        ensure_failed: ensureFailed,
      });
      w("bad", "job_reply_daemon_unreachable");
    }
    let D =
      !r && C.code === "ENOCONN" && !C.connected && !N && (await isReplyDeliverable(jobDir, n, storageV5));
    if (h && !N)
      return {
        err: "its supervisor did not answer" + (D ? MESSAGE_SAVED_SUFFIX : ""),
        code: "EUNREACHABLE",
        queued: D,
      };
    return {
      err: daemonUnreachableMessage() + (D ? MESSAGE_SAVED_SUFFIX : ""),
      code: C.code,
      queued: D,
    };
  }
  if (!r) {
    logFeatureBad("job_reply", "job_reply_send_failed");
    w("bad", "job_reply_send_failed", C.code);
  }
  let K = !r && !N && (await isReplyDeliverable(jobDir, n, storageV5));
  return {
    err: `Couldn't send your message \u2014 ${C.error}` + (K ? MESSAGE_SAVED_SUFFIX : ""),
    code: C.code,
    queued: K,
  };
}
//@ chunk-vrr64ez0.js:34943-35138 placement
async function hasConversationToResume(e, n) {
  if (isExecLaunch(e)) return false;
  let o = wrapStorageSource(getTranscriptStorageContext(n));
  let r = await resolveJobTranscript(
    e.resumeSessionId ?? e.sessionId,
    e.cwd,
    e.linkScanPath,
    undefined,
    o,
  ).catch(() => {
    return;
  });
  return r?.hasMessages === true && !r.unverifiable;
}
//@ chunk-vrr64ez0.js:35138-36245 placement
/**
 * 附加前检查会话状态：已删除/已结束时返回错误并上报 detached。
 */
async function resolveAttachTarget(e, n, storageV5) {
  let jobStateAfterSettle = await readJobStateAfterSettle(getJobDir(e), storageV5);
  if (jobStateAfterSettle === null) {
    logFeatureOk("job_attach");
    reportAttachTelemetry(n, "detached");
    return {
      kind: "error",
      ended: true,
      msg: "That session was removed \u2014 back to the list",
    };
  }
  if (
    jobStateAfterSettle.state === "done" ||
    jobStateAfterSettle.state === "stopped" ||
    jobStateAfterSettle.state === "blocked"
  ) {
    logFeatureOk("job_attach");
    reportAttachTelemetry(n, "detached");
    return {
      kind: "error",
      ended: true,
      msg:
        jobStateAfterSettle.state === "stopped"
          ? "That session was stopped \u2014 back to the list"
          : jobStateAfterSettle.state === "blocked"
            ? "That session is blocked \u2014 back to the list"
            : (await hasConversationToResume(jobStateAfterSettle, storageV5))
              ? "That session's process exited \u2014 press Enter to resume it (the conversation is saved)"
              : "That session ended \u2014 back to the list",
    };
  }
  if (jobStateAfterSettle.state === "failed") {
    if (
      jobStateAfterSettle.detail === HOST_DIED_DETAIL ||
      jobStateAfterSettle.detail === HOST_DIED_EXEC_DETAIL
    ) {
      logFeatureBad("job_attach", "job_attach_host_dead");
      reportAttachTelemetry(n, "error");
      return {
        kind: "error",
        msg:
          jobStateAfterSettle.detail === HOST_DIED_EXEC_DETAIL
            ? HOST_DIED_EXEC_ATTACH_MESSAGE
            : `${HOST_DIED_ATTACH_MESSAGE} \u2014 press Enter to restart it`,
      };
    }
    let included = jobStateAfterSettle.detail.includes("before init");
    logFeatureSad("job_attach", included ? "job_attach_pre_init_crash" : "job_attach_crash_loop");
    return {
      kind: "error",
      ended: true,
      crashed: true,
      msg: `Session can't start \u2014 ${jobStateAfterSettle.detail.replace(/^.*?before init(?: \u2014 )?/, "").replace(/^Error:\s*/, "") || jobStateAfterSettle.detail || "it crashed repeatedly"}`,
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
async function attachJob(e, n = {}) {
  return await attachToBackgroundSession(e, n, {
    overStream: false,
    onlyToRetry: false,
  });
}
//@ chunk-vrr64ez0.js:36371-41410 placement
/**
 * 附加到后台会话的完整流程：屏幕保持、首帧前门控 stdin、云/本地会话标签。
 */
async function attachToBackgroundSession(short, n, o) {
  touchRecapTrigger(short, n.storageV5);
  logForDebugging("[PERF:bg-attach-start]");
  drainStdin();
  let r = RACED_SOCKET_GAP;
  let sessionTabs = undefined;
  let s = TRANSIENT_ATTACH_CODE;
  let h = {
    holdScreenOnDisconnect: true,
    alreadyInAlt: n.alreadyInAlt,
    gateStdinUntilFirstFrame: n.gateStdinUntilFirstFrame,
    sessionTabs,
    cloudTabs: n.cloudTabs,
    tabsLanding: n.tabsLanding,
  };
  let A = {
    ...h,
    holdingFrame: true,
    gateStdinUntilFirstFrame: false,
    tabsLanding: undefined,
  };
  let w = n.gesture ?? {
    gestureId: randomUUID(),
    attempt: 0,
    interactive: {},
  };
  let T = !n.alreadyInAlt;
  let S = await killJobWithSignal(short, o, {
    ...h,
    telemetry: {
      gestureId: w.gestureId,
      attempt: ++w.attempt,
      t0: w.t0,
      surface: w.surface,
      daemonBooted: w.daemonBooted,
      interactive: w.interactive,
      storageV5: n.storageV5,
    },
  });
  let v;
  if (S.outcome === "error" && S.msg && r.test(S.msg)) {
    v = await ensureDaemon(TRANSIENT_STOP_OPTIONS, n.storageV5);
    if (v.ok)
      S = await killJobWithSignal(short, o, {
        ...h,
        telemetry: {
          gestureId: w.gestureId,
          attempt: ++w.attempt,
          t0: w.t0,
          surface: w.surface,
          daemonBooted: w.daemonBooted,
          interactive: w.interactive,
          storageV5: n.storageV5,
        },
      });
  }
  for (let j = 0; S.msg && s.test(S.msg) && j < 20; j++) {
    await sleep(500);
    S = await killJobWithSignal(short, o, {
      ...h,
      telemetry: {
        gestureId: w.gestureId,
        attempt: ++w.attempt,
        t0: w.t0,
        surface: w.surface,
        daemonBooted: w.daemonBooted,
        interactive: w.interactive,
        storageV5: n.storageV5,
      },
    });
  }
  let N = async () => {
    if (T) process.stdout.write(exitAltScreenSequence());
    let attachTarget = await resolveAttachTarget(short, w, n.storageV5);
    if (attachTarget) return attachTarget;
    logFeatureSad("job_attach", "job_attach_crashed");
    return {
      kind: "error",
      orphaned: true,
      msg: "Session crashed \u2014 press Enter to respawn",
    };
  };
  while (S.outcome === "disconnected") {
    if (isTerminalShutdown()) {
      if (T) process.stdout.write(exitAltScreenSequence());
      return shouldStartDaemonForAttach("loop_head", n);
    }
    let U = " Reconnecting\u2026 ";
    let max = Math.max(1, (process.stdout.columns ?? 80) - U.length);
    process.stdout.write(`\x1B7${cursorPosition(1, max)}\x1B[2;7m${U}\x1B[0m\x1B8`);
    let C;
    if (process.stdin.isTTY) {
      let K = "isRaw" in process.stdin ? Boolean(process.stdin.isRaw) : false;
      if (!K) setRawModeSafe(process.stdin, true);
      let D = waitForDetachKey(process.stdin);
      try {
        C = await Promise.race([
          ensureDaemon(TRANSIENT_STOP_OPTIONS, n.storageV5),
          D.promise.then(() => "detach"),
        ]);
      } finally {
        D.cancel();
        if (!K) setRawModeSafe(process.stdin, false);
      }
    } else C = await ensureDaemon(TRANSIENT_STOP_OPTIONS, n.storageV5);
    if (C === "detach") {
      if (T) process.stdout.write(exitAltScreenSequence());
      logForDebugging("[PERF:bg-attach-end]");
      logFeatureOk("job_attach");
      reportAttachTelemetry(w, "detached");
      return {
        kind: "detached",
      };
    }
    let q = C;
    if (!q.ok) {
      if (T) process.stdout.write(exitAltScreenSequence());
      if (q.stoodDown) return shouldStartDaemonForAttach("reconnect", n, q);
      logFeatureBad("job_attach", `job_attach_daemon_start_failed_${q.causeCode}`);
      reportAttachTelemetry(w, "error");
      return {
        kind: "error",
        msg: `Couldn't restart the ${bgSupervisorNoun()} \u2014 ${q.reason}`,
      };
    }
    let Q = drainStdin();
    if (Q && containsInterruptKey(Q)) {
      if (T) process.stdout.write(exitAltScreenSequence());
      logForDebugging("[PERF:bg-attach-end]");
      logFeatureOk("job_attach");
      reportAttachTelemetry(w, "detached");
      return {
        kind: "detached",
      };
    }
    if (await isBackgroundSessionGone(short)) {
      logForDebugging(
        `[bg-attach] worker gone on reconnect probe short=${short} \u2014 settled while attached`,
      );
      return N();
    }
    S = await killJobWithSignal(short, o, {
      ...A,
      telemetry: {
        gestureId: w.gestureId,
        attempt: ++w.attempt,
        t0: w.t0,
        surface: w.surface,
        daemonBooted: w.daemonBooted,
        interactive: w.interactive,
        storageV5: n.storageV5,
      },
    });
    for (let idx = 0; S.msg && s.test(S.msg) && idx < 10; idx++) {
      await sleep(200);
      S = await killJobWithSignal(short, o, {
        ...A,
        telemetry: {
          gestureId: w.gestureId,
          attempt: ++w.attempt,
          t0: w.t0,
          surface: w.surface,
          daemonBooted: w.daemonBooted,
          interactive: w.interactive,
          storageV5: n.storageV5,
        },
      });
    }
    if (S.msg?.includes("ENOJOB")) {
      logForDebugging(
        `[bg-attach] ENOJOB on reconnect short=${short} \u2014 daemon has no handle (or it's killing/settled)`,
      );
      return N();
    }
    if (S.outcome === "error" && T) process.stdout.write(exitAltScreenSequence());
  }
  if (
    S.outcome === "detached" &&
    S.msg &&
    !o.onlyToRetry &&
    (FATAL_ATTACH_CODE.test(S.msg) || s.test(S.msg))
  ) {
    if (T) process.stdout.write(exitAltScreenSequence());
    logFeatureBad("job_attach", "job_attach_stalled");
    return {
      kind: "error",
      msg: S.msg.replace(/^E(STALLED|RESPAWNING|STARTING):\s*/, ""),
    };
  }
  if (S.outcome === "error") {
    if (S.msg?.startsWith(`${HOST_DEAD_ATTACH_CODE}:`)) {
      logFeatureBad("job_attach", "job_attach_host_dead");
      let j = await readJobState(getJobDir(short), n.storageV5).catch(() => null);
      let trimmed = S.msg.slice(HOST_DEAD_ATTACH_CODE.length + 1).trim();
      return {
        kind: "error",
        msg: j !== null && isExecLaunch(j) ? trimmed : `${trimmed} \u2014 press Enter to restart it`,
      };
    }
    if (S.msg?.startsWith(`${ENORESPONSE}:`)) {
      logFeatureBad("job_attach", "job_attach_no_response");
      let j = await readJobState(getJobDir(short), n.storageV5).catch(() => null);
      if (j !== null && isExecLaunch(j))
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
    if (S.msg?.includes("ENOJOB")) {
      logForDebugging(
        `[bg-attach] ENOJOB on first attach short=${short} \u2014 daemon has no handle (or it's killing/settled)`,
      );
      let attachTarget = await resolveAttachTarget(short, undefined, n.storageV5);
      if (attachTarget) return attachTarget;
      logFeatureSad("job_attach", "job_attach_orphaned");
      return {
        kind: "error",
        orphaned: true,
        msg: `${bgSupervisorNounCap()} lost track of this job \u2014 press Enter to respawn it`,
      };
    }
    if (v && !v.ok) {
      if (v.stoodDown) return shouldStartDaemonForAttach("first_attach", n, v);
      logFeatureBad("job_attach", `job_attach_daemon_start_failed_${v.causeCode}`);
      reportAttachTelemetry(w, "error");
      return {
        kind: "error",
        msg: `Couldn't start the ${bgSupervisorNoun()} \u2014 ${v.reason}`,
      };
    }
    let msg =
      S.msg && s.test(S.msg)
        ? `${bgSupervisorNounCap()} is still starting \u2014 try again in a moment`
        : S.msg && r.test(S.msg)
          ? `${bgSupervisorNounCap()} didn't respond after starting \u2014 try again in a moment`
          : S.msg
            ? `Couldn't attach \u2014 ${S.msg}`
            : "Couldn't attach to that session";
    logFeatureBad("job_attach", "job_attach_failed");
    return {
      kind: "error",
      msg,
    };
  }
  logForDebugging("[PERF:bg-attach-end]");
  logFeatureOk("job_attach");
  if (S.msg && KICKED_ATTACH_CODE.test(S.msg))
    return {
      kind: "detached",
      msg: S.msg.replace(KICKED_ATTACH_CODE, ""),
    };
  return S.beforeFirstFrame
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
async function shouldStartDaemonForAttach(e, n, o) {
  let platform = getPlatform();
  let [u, s] = o
    ? [undefined, o.viaService === true && platform !== "macos"]
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
  let h = u !== undefined && (u.ok || u.code === "ETIMEOUT");
  let A =
    !h && !s && platform !== "windows" && process.stdout.isTTY
      ? `${BACKGROUND_SESSIONS_STOP_WARNING}
`
      : "";
  logForDebugging(`[bg-attach] held: this process is exiting (${e})`);
  logEvent("tengu_bg_attach_held_at_exit", {
    loop_head: e === "loop_head",
    first_attach: e === "first_attach",
    daemon_up: h,
    service_restart: s,
    notice: A !== "",
  });
  if (n.alreadyInAlt) n.onExitNotice?.(A);
  else if (A) process.stdout.write(A);
  return heldUntilExit();
}
//@ chunk-vrr64ez0.js:42043-42132 placement
/**
 * 导出值：同一声明里的多个绑定：MAX_KILL_OUTPUT_LINES（32：停止输出保留行数）；HEAD_TAIL_LINES_STOP（{head:50,tail:30}）；HEAD_TAIL_LINES_LOG（{head:60,tail:100}：日志首尾行数）。
 */
var MAX_KILL_OUTPUT_LINES = 32;
var HEAD_TAIL_LINES_STOP = {
  head: 50,
  tail: 30,
};
var HEAD_TAIL_LINES_LOG = {
  head: 60,
  tail: 100,
};
var WORKTREE_DIGEST_PATTERN = new RegExp(`^[0-9a-f]{${MAX_KILL_OUTPUT_LINES}}$`);
//@ chunk-vrr64ez0.js:42132-42172 placement
function killOutputTail(e) {
  return computeContentHash(e).slice(0, MAX_KILL_OUTPUT_LINES);
}
//@ chunk-vrr64ez0.js:42172-48331 placement
async function deleteJob(e, n = {}, o) {
  let jobState = await readJobState(getJobDir(e), o);
  let u = jobState?.worktreePath ? await listAllLiveSessions(o).catch(() => []) : [];
  let s = new Set();
  for (let v of u) if (matchesJobRef(v, e)) s.add(v.pid);
  let h = await killJob(
    e,
    jobState ?? undefined,
    {
      knownGone: n.knownGone,
      evict: true,
    },
    o,
  ).catch((error) => ({
    confirmed: false,
    error: errorMessage(error),
  }));
  if (!h.confirmed) {
    logForDebugging(
      `deleteJob: kill unconfirmed for ${e} \u2014 skipping jobdir/worktree removal to avoid stranding a live worker`,
      {
        level: "warn",
      },
    );
    if (!n.internal)
      logFeatureBad("job_delete", "kill_unconfirmed", {
        had_worktree: Boolean(jobState?.worktreePath),
      });
    return {
      removed: false,
      error: h.error,
      errorCode: "kill_unconfirmed",
    };
  }
  let A;
  let w;
  let T = false;
  if (jobState?.worktreePath) {
    let worktreePath = jobState.worktreePath;
    let N;
    let U;
    let j;
    let C = null;
    let q = "present";
    let Q = false;
    let K;
    let D;
    let P;
    let { dirty, trackedChanges, gitError, submoduleWork } = await getAgentWorktreeChanges(
      worktreePath,
      undefined,
    );
    let ee = resolveWorktreeCleanupRoot(worktreePath, jobState.originCwd) ?? undefined;
    let path = await realpath(worktreePath).catch(() => worktreePath);
    let ce = killOutputTail(path);
    T =
      n.discardUnpushed !== undefined &&
      !gitError &&
      n.discardUnpushed.worktreeDigest === ce &&
      (await isHeadAt(path, n.discardUnpushed.headSha));
    let Ne = !gitError && ee ? await listRegisteredWorktrees(ee).catch(() => null) : null;
    let we;
    let Fe = false;
    for (let [re, ae] of (Ne ?? []).entries())
      if ((await realpath(ae.worktreePath).catch(() => ae.worktreePath)) === path) {
        we = ae;
        Fe = re > 0 && !ae.prunable;
        break;
      }
    let Ee = repositoryVouchedByWorktree(path);
    let Le =
      ee !== undefined &&
      Ee !== null &&
      (await realpath(Ee).catch(() => Ee)) === (await realpath(ee).catch(() => ee));
    let ie =
      Fe && Le
        ? submoduleWork?.kind === "unverifiable"
          ? "submodule"
          : trackedChanges
            ? "tracked_changes"
            : undefined
        : ee !== undefined && (await worktreeDeregisteredByRemoval(path, ee))
          ? undefined
          : "not_registered";
    let ue = n.forceRemoveWorktree !== undefined && n.forceRemoveWorktree === ce;
    let pe = ue && ie === undefined && isDirectlyUnderClaudeWorktreesDir(path);
    let qe = pe ? "job_delete_force_remove" : n.force === true || T ? "job_delete_force" : "job_delete";
    let Ve = carriesDiscardConsent(qe);
    let Oe = claudeWorktreeLockPid(we?.lockReason);
    let V;
    if ((V = await findJobSharingWorktree(e, path, worktreePath, o)) !== null) {
      N = "in_use";
      K = V.verified && SHORT_RE.test(V.jobId) ? V.jobId : undefined;
      logForDebugging(
        `deleteJob: ${worktreePath} is claimed by running job ${V.jobId}'s state.json (${V.verified ? "verified" : "unverifiable claim"}) \u2014 not ours to remove`,
        {
          level: "warn",
        },
      );
    } else if (
      ((Q = (await findGitRootVerifyingPositive(worktreePath)) === null) || T || pe) &&
      (q = await pathPresence(worktreePath)) !== "gone" &&
      (C =
        q === "unreadable"
          ? "unreadable"
          : await findOtherJobsInDir(
              e,
              path,
              worktreePath,
              {
                includeUnsettled: T || pe,
              },
              o,
            )) !== null
    ) {
      if (C === "claimed" && !Q && T) {
        N = "unpushed_shared";
        D = await listUnpushedCommits(worktreePath).catch(() => {
          return;
        });
      } else N = C === "claimed" ? "shared_record" : "records_unreadable";
      logForDebugging(
        C === "claimed"
          ? `deleteJob: ${worktreePath} is also recorded by another settled job's state.json \u2014 not removing another session's output`
          : `deleteJob: could not verify ${worktreePath} against sibling records \u2014 refusing until records are readable`,
        {
          level: "warn",
        },
      );
    } else if (!(await mayReleaseWorktreeLock(we?.lockReason)) && !(Oe !== null && s.has(Oe))) {
      N = "live_lock";
      K = Oe !== null ? `pid ${Oe}` : undefined;
      logForDebugging(
        `deleteJob: ${worktreePath} is locked by a live Claude Code process, or with a reason we did not write (${we?.lockReason}) \u2014 not ours to remove`,
        {
          level: "warn",
        },
      );
    } else if (
      (P = await findSessionsInDirectory(u, e, s, path, worktreePath)) !== undefined &&
      (await pathPresence(worktreePath)) !== "gone"
    ) {
      N = "occupied";
      K =
        P.pid === process.pid
          ? `${typeof P.parkedJobId === "string" && SHORT_RE.test(P.parkedJobId) ? `session ${P.parkedJobId},` : "a session"} moved to the background from this window, pid ${P.pid}`
          : P.kind === "bg" && typeof P.jobId === "string" && SHORT_RE.test(P.jobId)
            ? `background session ${P.jobId}, pid ${P.pid}`
            : `pid ${P.pid}, ${P.kind}`;
      logForDebugging(
        `deleteJob: ${worktreePath} is the working directory of a live session (pid ${P.pid}, ${P.kind}) \u2014 not ours to remove`,
        {
          level: "warn",
        },
      );
    } else if (dirty && !gitError && !Ve) {
      N = "dirty";
      logForDebugging(`deleteJob: worktree has uncommitted changes, kept ${worktreePath}`, {
        level: "warn",
      });
    } else if (
      !gitError &&
      ee &&
      !T &&
      !(await passesCommitSafetyChecks(worktreePath, await getDefaultRemoteRef(ee), {
        primaryCheckoutVouches: true,
      }))
    ) {
      if (
        (await findOtherJobsInDir(
          e,
          path,
          worktreePath,
          {
            includeUnsettled: false,
          },
          o,
        )) === "claimed"
      ) {
        N = "unpushed_shared";
        logForDebugging(
          `deleteJob: ${worktreePath} has unpushed commits and is also recorded by another settled job's state.json \u2014 not offering a discard`,
          {
            level: "warn",
          },
        );
      } else {
        N = "unpushed";
        logForDebugging(`deleteJob: ${worktreePath} has commits that are on no remote, kept`, {
          level: "warn",
        });
      }
      D = await listUnpushedCommits(worktreePath).catch(() => {
        return;
      });
    } else if (T && n.discardUnpushed !== undefined && !(await isHeadAt(path, n.discardUnpushed.headSha))) {
      N = "unpushed";
      logForDebugging(`deleteJob: ${worktreePath} HEAD moved past the confirmed discard pin, kept`, {
        level: "warn",
      });
      D = await listUnpushedCommits(worktreePath).catch(() => {
        return;
      });
    } else {
      let re = resolveWorktreeCleanupRoot(worktreePath, jobState.originCwd) ?? undefined;
      let ae = (jobState.originCwd ? findGitRoot(jobState.originCwd) : null) ?? undefined;
      let X = await removeAgentWorktree(
        worktreePath,
        jobState.worktreeBranch,
        re,
        jobState.worktreeHookBased,
        qe,
        path,
        ae,
        {
          storageV5: o,
          forceRemoveRequested: ue,
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
      if (X.outcome === "failed") {
        N = X.needsForce
          ? "unverified"
          : X.errorSummary === IDENTITY_CHANGED_SUMMARY
            ? "identity_changed"
            : X.holdsWorktreesInside
              ? "worktrees_inside"
              : "remove_failed";
        K = X.needsForce ? undefined : X.errorSummary;
        if (X.forceRemovable !== undefined && isDirectlyUnderClaudeWorktreesDir(path))
          if (ie !== undefined) j = ie;
          else if (
            (await findOtherJobsInDir(
              e,
              path,
              worktreePath,
              {
                includeUnsettled: false,
              },
              o,
            )) === "claimed"
          )
            j = "shared_record";
          else U = X.forceRemovable;
      } else if (X.outcome === "left_in_place") A = printableLabel(worktreePath);
      else if (X.forcedDirectoryRemoval) {
        let { keptBranch } = X.forcedDirectoryRemoval;
        w = {
          worktree: printableLabel(path),
          ...(keptBranch !== undefined && {
            keptBranch: printableLabel(keptBranch, HEAD_TAIL_LINES_STOP),
          }),
        };
      }
    }
    if (N) {
      if (!n.internal)
        logFeatureSad("job_delete", `worktree_kept_${N}`, {
          had_worktree: true,
        });
      return {
        removed: false,
        keptWorktree: printableLabel(path),
        keptReason: N,
        ...(K !== undefined && {
          keptErrorSummary: K,
        }),
        ...(D !== undefined && {
          keptUnpushed: D,
        }),
        ...(N === "unpushed" && D !== undefined
          ? {
              discardUnpushed: {
                headSha: D.headSha,
                worktreeDigest: ce,
              },
            }
          : U !== undefined &&
            T &&
            n.discardUnpushed !== undefined && {
              discardUnpushed: n.discardUnpushed,
            }),
        ...(U !== undefined && {
          forceRemoveWorktree: {
            worktreeDigest: ce,
            cause: U,
          },
        }),
        ...(j !== undefined && {
          forceRemoveWithheld: j,
        }),
        ...(submoduleWork !== undefined &&
          (N === "dirty" || N === "remove_failed") && {
            submoduleWork,
          }),
      };
    }
  }
  let S = jobState?.fan?.some((v) => v.kind === "shell" && v.doneAt === undefined) ?? false;
  await reapAdoptRecord(getJobDir(e), {
    waitMs: S ? 4000 : 0,
  });
  try {
    await rm(getJobDir(e), {
      recursive: true,
      force: true,
    });
  } catch (error) {
    invalidateJobStateCache(getJobDir(e));
    logForDebugging(`deleteJob: failed to remove job dir for ${e}: ${errorMessage(error)}`, {
      level: "warn",
    });
    if (!n.internal)
      logFeatureBad("job_delete", "jobdir_rm_failed", {
        had_worktree: Boolean(jobState?.worktreePath),
      });
    return {
      removed: false,
      error: `couldn't remove the session's state directory (${collapseWhitespace(errorMessage(error))})`,
      errorCode: "jobdir_rm_failed",
    };
  }
  if (isStorageV5Enabled() && o !== undefined && validateStorageKey(hostTombstonePath(e)) === undefined)
    await deleteHostTombstone(o, e);
  else await unlink(hostManagedEntry(e)).catch(() => {});
  invalidateJobStateCache(getJobDir(e));
  if (!n.internal)
    if (A)
      logFeatureSad("job_delete", "worktree_left_in_place", {
        had_worktree: true,
        discard_confirmed: T,
      });
    else if (w)
      logFeatureSad("job_delete", "worktree_force_removed", {
        had_worktree: true,
        discard_confirmed: T,
      });
    else
      logFeatureOk("job_delete", {
        had_worktree: Boolean(jobState?.worktreePath),
        discard_confirmed: T,
      });
  return {
    removed: true,
    discardConfirmed: T,
    ...(A && {
      leftWorktreeDir: A,
    }),
    ...(w && {
      forcedWorktreeRemoval: w,
    }),
  };
}
//@ chunk-vrr64ez0.js:48331-48689 placement
/**
 * 找出与指定 worktree 路径相同的其他存活 job（已验证/无法验证）。
 */
async function findJobSharingWorktree(e, n, worktreePath, r) {
  for (let u of await listJobs(undefined, r).catch(() => [])) {
    if (u.id === e || !u.state.worktreePath || isSettled(u.state)) continue;
    let s = matchWorktreePath(u.state.worktreePath, n, worktreePath);
    if (s === "match")
      return {
        jobId: u.id,
        verified: true,
      };
    if (s === "unverifiable")
      return {
        jobId: u.id,
        verified: false,
      };
    let comparablePath = await resolveComparablePath(u.state.worktreePath, worktreePath);
    if (isSamePath(comparablePath, n))
      return {
        jobId: u.id,
        verified: true,
      };
  }
  return null;
}
//@ chunk-vrr64ez0.js:48689-48870 placement
function matchWorktreePath(worktreePath, n, o) {
  if (isSamePath(worktreePath, o) || isSamePath(worktreePath, n)) return "match";
  if (!hasDotSegment(worktreePath)) return "no_match";
  let r = normalize(worktreePath);
  if (isSamePath(r, o) || isSamePath(r, n)) return "match";
  return isAbsolute(worktreePath) && !isUncOrDevicePath(worktreePath) && !isNetworkMountRoot(worktreePath)
    ? "unverifiable"
    : "no_match";
}
//@ chunk-vrr64ez0.js:48870-48908 placement
function isSamePath(e, n) {
  return realCwd(e) === realCwd(n);
}
//@ chunk-vrr64ez0.js:48908-48940 placement
function realCwd(e) {
  return foldCaseBasic(identity(e));
}
//@ chunk-vrr64ez0.js:48940-49023 placement
function isCwdInside(e, n) {
  let o = relative(realCwd(n), realCwd(e));
  return o.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute(o);
}
//@ chunk-vrr64ez0.js:49023-49451 placement
/**
 * 在会话列表中找出与当前目录相同的交互/后台会话进程。
 */
async function findSessionsInDirectory(e, n, o, r, worktreePath) {
  for (let s of e) {
    if (s.kind !== "interactive" && s.kind !== "bg") continue;
    if (o.has(s.pid) || s.parkedJobId === n) continue;
    if (s.pid === process.pid && s.parkedJobId === undefined) continue;
    let h = s.pid === process.pid ? getOriginalCwd() : s.cwd;
    if (typeof h !== "string" || !isAbsolute(h)) continue;
    if (!isCwdInside(h, r) && !isCwdInside(h, worktreePath)) continue;
    if (s.kind === "bg" && typeof s.jobId === "string" && SHORT_RE.test(s.jobId)) {
      if ((await probeJobStateFile(getJobDir(s.jobId))) === "missing") continue;
    }
    return s;
  }
  return;
}
//@ chunk-vrr64ez0.js:49451-49672 placement
function resolveComparablePath(worktreePath, n) {
  let cwd = getCwd();
  if (
    !isAbsolute(worktreePath) ||
    hasDotSegment(worktreePath) ||
    (isOnForeignMount(worktreePath, cwd) && isOnForeignMount(worktreePath, n))
  )
    return worktreePath;
  let deepestExistingAncestor = resolveDeepestExistingAncestorSync(getFsImplementation(), worktreePath, {
    surfaceNetworkRaw: true,
    anchors: [cwd, n],
  });
  if (deepestExistingAncestor === UNVERIFIED_ANCESTRY) return worktreePath;
  if (
    deepestExistingAncestor !== undefined &&
    (hasDotSegment(deepestExistingAncestor) ||
      (isOnForeignMount(deepestExistingAncestor, cwd) && isOnForeignMount(deepestExistingAncestor, n)))
  )
    return worktreePath;
  return realpath(worktreePath).catch(() => worktreePath);
}
//@ chunk-vrr64ez0.js:49672-49776 placement
async function probeJobStateFile(e) {
  return lstat(join(e, "state.json")).then(
    () => "present",
    (error) => (isENOENT(error) ? "missing" : "unreadable"),
  );
}
//@ chunk-vrr64ez0.js:49776-50285 placement
/**
 * 扫描 jobs 目录，找出在同一目录工作的其他 job。
 */
async function findOtherJobsInDir(e, n, worktreePath, { includeUnsettled }, u) {
  let s;
  try {
    s = await readdir(getJobsDir(), {
      withFileTypes: true,
    });
  } catch (error) {
    return isENOENT(error) ? null : "unreadable";
  }
  for (let h of s) {
    if (!h.isDirectory() || h.name === e) continue;
    let A = join(getJobsDir(), h.name);
    let jobState = await readJobState(A, u);
    if (jobState === null) {
      if ((await probeJobStateFile(A)) === "missing") continue;
      return "unreadable";
    }
    if (!jobState.worktreePath || (!includeUnsettled && !isSettled(jobState))) continue;
    let T = matchWorktreePath(jobState.worktreePath, n, worktreePath);
    if (T === "match") return "claimed";
    if (T === "unverifiable") return "unreadable";
    let comparablePath = await resolveComparablePath(jobState.worktreePath, worktreePath);
    if (isSamePath(comparablePath, n)) return "claimed";
  }
  return null;
}
//@ chunk-vrr64ez0.js:50285-50332 placement
async function killJobWithSignal(short, n, o) {
  return await attachToJob(short, o);
}
//@ chunk-vrr64ez0.js:50332-50418 placement
function matchesJobRef(e, n) {
  return e.kind === "bg" && (e.jobId === n || e.sessionId?.startsWith(n) === true);
}
//@ chunk-e6aww6q8.js:3654790-3654875 placement = isDangerousFilePathToAutoEdit (1)
function isDirectlyUnderClaudeWorktreesDir(path) {
  let absolutePath = dirname(path);
  return (
    absolutePath !== path &&
    basename(absolutePath) === "worktrees" &&
    basename(dirname(absolutePath)) === ".claude"
  );
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
