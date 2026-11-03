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
import {
  writeFile,
  realpath,
  rm,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  lstat,
  lstat as lstat_2,
  readdir,
  readdir as readdir_2,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  normalize,
  isAbsolute,
  relative,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
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
import { checkProcessLiveness, oyn } from "../../services/daemon/processLiveness.js";
import { provenSameProcessAsync } from "../../utils/processIdentity.js";
import { logError } from "../../utils/log.js";
import { killViaPtySocket } from "../../services/daemon/reapJobs.js";
import { FA, ePe } from "../../utils/sandbox/userNamespace.js";
import { listAllLiveSessions, sendToUdsSocket } from "../../utils/udsMessaging/udsClient.js";
import { logEvent } from "../../services/analytics/index.js";
import { N6s } from "../../components/fleet/sessionAttention.js";
import { truncateWithEllipsis, Hg } from "../../services/sessionStatus/sessionStateClassifier.js";
import { redactSecrets } from "../../services/teamMemorySync/secretScanner.js";
import { bgSupervisorNoun, bgSupervisorNounCap } from "../../utils/fleetGates.js";
import { isNonPromptInput, imt, queuePromptForJob } from "../../services/daemon/spawnLauncher.js";
import { fromEnum, fromEnumOpt, lit } from "../../services/analytics/safeMetadata.js";
import { sanitizeErrnoTokenForTelemetry, errorMessage, isENOENT } from "../../utils/errors.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { readDaemonToken } from "../../services/daemon/paths.js";
import { ensureDaemon, kxs, xAr, Ttn } from "../../services/daemon/ensureDaemon.js";
import { ye } from "../../utils/startupMarks.js";
import { wrapStorageSource, getTranscriptStorageContext } from "../../utils/sessionStorage.js";
import { resolveJobTranscript } from "../../utils/sessionStoragePortable.js";
import { reportAttachTelemetry, isBackgroundSessionGone, ENORESPONSE, IHt } from "./attachErrors.js";
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
import { Dr } from "../../utils/stringUtils.js";
import { cl, Qn, Mn } from "../../utils/pathClassification.js";
import { yl, isOnForeignMount } from "../../utils/networkPaths.js";
import { Cp } from "../../utils/pathIdentity.js";
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
function touchRecapTrigger(e, n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let job = STORAGE_SPACES.job(e, [RECAP_TRIGGER_FILE]);
    if (validateStorageKey(job) === void 0) {
      n.write(job, "", { publishDiscipline: "inPlace" }).catch(() => {});
      return;
    }
  }
  writeFile(join_2(getJobDir(e), RECAP_TRIGGER_FILE), "").catch(() => {});
}
//@ chunk-vrr64ez0.js:28472-29740 placement
async function killJob(e, n, o, r) {
  if (n?.backend === "peer") return { confirmed: !0 };
  let u = o?.handoff ? !0 : void 0,
    s = o?.evict ? !0 : void 0,
    h = o?.knownGone
      ? { ok: !1, code: "ENOJOB", error: "job already gone (caller-verified)" }
      : await controlRequest({ proto: BG_PROTO, op: "kill", short: e, handoff: u, evict: s });
  for (let A = 0; !h.ok && h.code === "ESTARTING" && A < 10; A++)
    (await sleep(200),
      (h = await controlRequest({ proto: BG_PROTO, op: "kill", short: e, handoff: u, evict: s })));
  if (h.ok) return { confirmed: !0 };
  if (h.code === "ENOJOB" || h.code === "ENOCONN" || h.code === "ETIMEOUT") {
    let A = await killOrphanedWorker(e, r);
    if (A.anyMatch && h.code === "ENOJOB") return { confirmed: A.confirmed };
    let w = !1,
      T = !1;
    if (h.code === "ENOCONN" || h.code === "ETIMEOUT") {
      let S;
      if (A.anyMatch) S = A.confirmed;
      else {
        let v = await readRoster({ silent: !0 }, r),
          N = v.workers[e];
        if (N !== void 0) {
          let U = await checkProcessLiveness(N.pid, N.procStart);
          if (U === "zombie")
            if (N.procStart !== void 0 && (await provenSameProcessAsync(N.pid, N.procStart)) === !0) {
              try {
                process.kill(-N.pid, "SIGKILL");
              } catch {
                try {
                  process.kill(N.pid, "SIGKILL");
                } catch {}
              }
              S = !0;
            } else S = !1;
          else S = U !== "live";
        } else {
          let U = !A.scanFailed && !v.parseFailed;
          ((w =
            h.code === "ENOCONN" &&
            U &&
            n?.state !== void 0 &&
            isSettled({ state: n.state, tempo: n.tempo })),
            (S = w),
            (T = U && !S));
        }
      }
      if (s && S && h.code === "ENOCONN" && !w)
        await updateRoster((v) => {
          delete v.workers[e];
        }, r).catch((v) => logError(v));
      return T ? { confirmed: S, noWorkerFound: T } : { confirmed: S };
    }
    return { confirmed: !0 };
  }
  return { confirmed: !1, error: h.error };
}
//@ chunk-vrr64ez0.js:29740-30247 placement
async function killOrphanedWorker(e, n) {
  let o = await killViaPtySocket(FA(e)),
    r = !1,
    u = !0,
    s = !1,
    h = await listAllLiveSessions(n).catch(() => ((s = !0), []));
  for (let A of h)
    if (Bn(A, e)) {
      if (((r = !0), !o))
        try {
          process.kill(A.pid, "SIGTERM");
        } catch {}
      let w = Date.now() + 3000,
        T = !0;
      while ((T = await oyn(A.pid, A.procStart)) && Date.now() < w) await sleep(100);
      if (T) {
        logEvent("tengu_bg_killjob_ctrl_fallback", { ctrlSent: o });
        try {
          process.kill(A.pid, "SIGTERM");
        } catch {}
        let S = Date.now() + 500;
        while ((T = await oyn(A.pid, A.procStart)) && Date.now() < S) await sleep(100);
      }
      if (T) u = !1;
    }
  return { confirmed: u, anyMatch: r, scanFailed: s };
}
//@ chunk-vrr64ez0.js:30247-30605 placement
async function listAliveDaemonJobs(e) {
  let n = await controlRequest({ proto: BG_PROTO, op: "list" });
  if (n.ok && n.op === "list")
    return { shorts: new Set(n.jobs.map((job) => job.short)), records: n.jobs.filter((job) => !job.outcome) };
  let o = await readRoster({ silent: !0 }, e),
    entries = Object.entries(o.workers),
    results = await Promise.all(entries.map(([, s]) => oyn(s.pid, s.procStart)));
  return { shorts: new Set(entries.filter((s, h) => results[h]).map(([s]) => s)), records: [] };
}
//@ chunk-vrr64ez0.js:30605-30880 placement
async function probeDaemonJob(e, n) {
  let o = await controlRequest({ proto: BG_PROTO, op: "has", short: e });
  if (o.ok && o.op === "has") return { alive: o.alive, present: o.present ?? o.alive, daemonUp: !0 };
  let r = (await readRoster({ silent: !0 }, n)).workers[e],
    u = r !== void 0 && (await oyn(r.pid, r.procStart));
  return { alive: u, present: u, daemonUp: !1 };
}
//@ chunk-vrr64ez0.js:30880-30994 placement
async function isDaemonJobPresent(e) {
  let n = await controlRequest({ proto: BG_PROTO, op: "has", short: e });
  return n.ok && n.op === "has" ? (n.present ?? n.alive) : !1;
}
//@ chunk-vrr64ez0.js:30994-31299 placement
function applyReplyPatch(e, n) {
  let o = e.tempo === "blocked" && e.state !== "blocked" && e.block === void 0 && N6s(e.needs);
  return {
    ...e,
    ...(hasOutstandingAsk(e) && { state: "working" }),
    detail: truncateWithEllipsis(redactSecrets(n).replace(/\s+/g, " ").trim(), Hg),
    ...(!o && { tempo: "active", needs: void 0, block: void 0 }),
    suggestedReply: void 0,
    output: null,
    updatedAt: new Date().toISOString(),
  };
}
//@ chunk-vrr64ez0.js:31299-31428 placement
var REPLY_ENOJOB_MSG = "That session isn't running \u2014 respawn it first",
  REPLY_PEER_NO_SOCK_MSG = "Can't send \u2014 that session is running in another terminal";
//@ chunk-vrr64ez0.js:31428-31527 placement
function vn() {
  return `Couldn't reach the ${bgSupervisorNoun()} \u2014 it may be restarting. Press Enter to retry`;
}
//@ chunk-vrr64ez0.js:31527-31569 placement
function isReplyDaemonRestartingMsg(e) {
  return e.startsWith(vn());
}
//@ chunk-vrr64ez0.js:31569-31661 placement
var At = " \u2014 your message was saved and will be sent when you next restart this session";
//@ chunk-vrr64ez0.js:31661-31797 placement
async function isReplyDeliverable(e, n, o) {
  invalidateJobStateCache(e);
  let r = await readJobState(e, o);
  if (!r || isNonPromptInput(n, r)) return !1;
  let u = imt(r);
  if (u !== void 0) return u === n;
  return queuePromptForJob(e, r, n, o);
}
//@ chunk-vrr64ez0.js:31797-34943 placement
async function replyToJob(e, n, o, r, u, s, { nextTurn: h = !1 } = {}) {
  let now = Date.now(),
    w = (D, P, _e) => {
      logEvent("tengu_bg_reply_outcome", {
        ms: Date.now() - now,
        outcome: fromEnum(D),
        error_code: fromEnumOpt(P),
        errno: sanitizeErrnoTokenForTelemetry(_e),
      });
    };
  if (o?.backend === "peer") {
    if (!o.sock) return (logFeatureOk("job_reply"), w("ok"), { err: REPLY_PEER_NO_SOCK_MSG });
    try {
      return (await sendToUdsSocket(o.sock, n, s), logFeatureOk("job_reply"), w("ok"), null);
    } catch (error) {
      return (
        logFeatureBad("job_reply", "job_reply_peer_send_failed"),
        w("bad", "job_reply_peer_send_failed"),
        { err: `Couldn't send to that session \u2014 ${errorMessage(error)}` }
      );
    }
  }
  let T = getJobDir(e),
    S = r ?? (await readJobState(T, s)),
    v = await readDaemonToken(),
    N = !1,
    U = !1,
    j = async () => {
      if (h) {
        let P = await controlRequest({ proto: BG_PROTO, op: "ping" });
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
        )
          return (
            (U = !0),
            { ok: !1, error: "its supervisor runs a different Claude Code build", code: "ESKEW" }
          );
      }
      let D = await controlRequest({
        proto: BG_PROTO,
        op: "reply",
        short: e,
        text: n,
        auth: v,
        ...(h && { nextTurn: h }),
      });
      if (!D.ok && "connected" in D && D.connected === !0) N = !0;
      return D;
    },
    C = await j(),
    q = async () => {
      let D = 10;
      for (
        let P = 0;
        !C.ok && (C.code === "ESTARTING" || C.code === "ENOREPLY" || C.code === "ERESPAWNING") && P < D;
        P++
      ) {
        if (C.code === "ERESPAWNING") D = 60;
        (await sleep(200), (C = await j()));
      }
    };
  if ((await q(), !C.ok && C.code === "EAUTH")) {
    let D = await readDaemonToken();
    if (D && D !== v) ((v = D), (C = await j()));
  }
  let Q = !1;
  if (!C.ok && (C.code === "ENOCONN" || C.code === "ETIMEOUT") && !(h && N)) {
    let D = await ensureDaemon({ forceTransient: !0 }, s);
    if (((Q = !D.ok), D.ok)) ((v = (await readDaemonToken()) ?? v), (C = await j()), await q());
  }
  if (C.ok) {
    if (S && !r) {
      invalidateJobStateCache(T);
      let D = (await readJobState(T, s)) ?? S,
        P = applyReplyPatch(D, n);
      if (P.queuedPrompt === n) P.queuedPrompt = void 0;
      writeStateAtomic(T, P, s).catch(logJobWriteError);
    }
    if (!r)
      (logEvent("tengu_bg_agent_action", {
        action: lit("reply"),
        wasTerminal: S ? isTerminal(S.state) : !1,
        daemon: !0,
        jobSessionId: ye(o?.sessionId ?? S?.sessionId),
        ...u?.(),
      }),
        logFeatureOk("job_reply"),
        w("ok"));
    return null;
  }
  if (C.code === "ESKEW") {
    let D = U ? "job_reply_daemon_skewed" : "job_reply_worker_skewed";
    return (logFeatureBad("job_reply", D), w("bad", D), { err: C.error, code: C.code });
  }
  if (C.code === "ENOJOB") {
    if (!r) (logFeatureSad("job_reply", "job_reply_not_running"), w("sad", "job_reply_not_running"));
    return { err: REPLY_ENOJOB_MSG, code: C.code };
  }
  if (C.code === "ENOCONN" || C.code === "ETIMEOUT") {
    if (!r && C.code === "ENOCONN") {
      let P = (await readRoster({ silent: !0 }, s)).workers[S?.daemonShort ?? e];
      if (P && !(await oyn(P.pid, P.procStart)))
        return (
          logFeatureSad("job_reply", "job_reply_not_running"),
          w("sad", "job_reply_not_running"),
          { err: REPLY_ENOJOB_MSG, code: "ENOJOB" }
        );
    }
    if (!r)
      (logFeatureBad("job_reply", "job_reply_daemon_unreachable", {
        errno: fromEnum(C.code),
        ensure_failed: Q,
      }),
        w("bad", "job_reply_daemon_unreachable"));
    let D = !r && C.code === "ENOCONN" && !C.connected && !N && (await isReplyDeliverable(T, n, s));
    if (h && !N)
      return { err: "its supervisor did not answer" + (D ? At : ""), code: "EUNREACHABLE", queued: D };
    return { err: vn() + (D ? At : ""), code: C.code, queued: D };
  }
  if (!r) (logFeatureBad("job_reply", "job_reply_send_failed"), w("bad", "job_reply_send_failed", C.code));
  let K = !r && !N && (await isReplyDeliverable(T, n, s));
  return { err: `Couldn't send your message \u2014 ${C.error}` + (K ? At : ""), code: C.code, queued: K };
}
//@ chunk-vrr64ez0.js:34943-35138 placement
async function hasConversationToResume(e, n) {
  if (isExecLaunch(e)) return !1;
  let o = wrapStorageSource(getTranscriptStorageContext(n)),
    r = await resolveJobTranscript(e.resumeSessionId ?? e.sessionId, e.cwd, e.linkScanPath, void 0, o).catch(
      () => {
        return;
      },
    );
  return r?.hasMessages === !0 && !r.unverifiable;
}
/**
 * 附加前检查会话状态：已删除/已结束时返回错误并上报 detached。
 */
//@ chunk-vrr64ez0.js:35138-36245 placement
async function resolveAttachTarget(e, n, o) {
  let r = await readJobStateAfterSettle(getJobDir(e), o);
  if (r === null)
    return (
      logFeatureOk("job_attach"),
      reportAttachTelemetry(n, "detached"),
      { kind: "error", ended: !0, msg: "That session was removed \u2014 back to the list" }
    );
  if (r.state === "done" || r.state === "stopped" || r.state === "blocked")
    return (
      logFeatureOk("job_attach"),
      reportAttachTelemetry(n, "detached"),
      {
        kind: "error",
        ended: !0,
        msg:
          r.state === "stopped"
            ? "That session was stopped \u2014 back to the list"
            : r.state === "blocked"
              ? "That session is blocked \u2014 back to the list"
              : (await hasConversationToResume(r, o))
                ? "That session's process exited \u2014 press Enter to resume it (the conversation is saved)"
                : "That session ended \u2014 back to the list",
      }
    );
  if (r.state === "failed") {
    if (r.detail === HOST_DIED_DETAIL || r.detail === HOST_DIED_EXEC_DETAIL)
      return (
        logFeatureBad("job_attach", "job_attach_host_dead"),
        reportAttachTelemetry(n, "error"),
        {
          kind: "error",
          msg:
            r.detail === HOST_DIED_EXEC_DETAIL
              ? HOST_DIED_EXEC_ATTACH_MESSAGE
              : `${HOST_DIED_ATTACH_MESSAGE} \u2014 press Enter to restart it`,
        }
      );
    let included = r.detail.includes("before init");
    return (
      logFeatureSad("job_attach", included ? "job_attach_pre_init_crash" : "job_attach_crash_loop"),
      {
        kind: "error",
        ended: !0,
        crashed: !0,
        msg: `Session can't start \u2014 ${r.detail.replace(/^.*?before init(?: \u2014 )?/, "").replace(/^Error:\s*/, "") || r.detail || "it crashed repeatedly"}`,
      }
    );
  }
  return;
}
//@ chunk-vrr64ez0.js:36245-36292 placement
var Tt = { forceTransient: !0, standsDownAtExit: !0 };
//@ chunk-vrr64ez0.js:36292-36371 placement
async function attachJob(e, n = {}) {
  return await attachToBackgroundSession(e, n, { overStream: !1, onlyToRetry: !1 });
}
/**
 * 附加到后台会话的完整流程：屏幕保持、首帧前门控 stdin、云/本地会话标签。
 */
//@ chunk-vrr64ez0.js:36371-41410 placement
async function attachToBackgroundSession(e, n, o) {
  (touchRecapTrigger(e, n.storageV5), logForDebugging("[PERF:bg-attach-start]"), drainStdin());
  let r = RACED_SOCKET_GAP,
    u = void 0,
    s = TRANSIENT_ATTACH_CODE,
    h = {
      holdScreenOnDisconnect: !0,
      alreadyInAlt: n.alreadyInAlt,
      gateStdinUntilFirstFrame: n.gateStdinUntilFirstFrame,
      sessionTabs: u,
      cloudTabs: n.cloudTabs,
      tabsLanding: n.tabsLanding,
    },
    A = { ...h, holdingFrame: !0, gateStdinUntilFirstFrame: !1, tabsLanding: void 0 },
    w = n.gesture ?? { gestureId: randomUUID_2(), attempt: 0, interactive: {} },
    T = !n.alreadyInAlt,
    S = await Ge(e, o, {
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
    }),
    v;
  if (S.outcome === "error" && S.msg && r.test(S.msg)) {
    if (((v = await ensureDaemon(Tt, n.storageV5)), v.ok))
      S = await Ge(e, o, {
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
  for (let U = 0; S.msg && s.test(S.msg) && U < 20; U++)
    (await sleep(500),
      (S = await Ge(e, o, {
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
      })));
  let N = async () => {
    if (T) process.stdout.write(exitAltScreenSequence());
    let U = await resolveAttachTarget(e, w, n.storageV5);
    if (U) return U;
    return (
      logFeatureSad("job_attach", "job_attach_crashed"),
      { kind: "error", orphaned: !0, msg: "Session crashed \u2014 press Enter to respawn" }
    );
  };
  while (S.outcome === "disconnected") {
    if (isTerminalShutdown()) {
      if (T) process.stdout.write(exitAltScreenSequence());
      return shouldStartDaemonForAttach("loop_head", n);
    }
    let U = " Reconnecting\u2026 ",
      max = Math.max(1, (process.stdout.columns ?? 80) - U.length);
    process.stdout.write(`\x1B7${cursorPosition(1, max)}\x1B[2;7m${U}\x1B[0m\x1B8`);
    let C;
    if (process.stdin.isTTY) {
      let K = "isRaw" in process.stdin ? Boolean(process.stdin.isRaw) : !1;
      if (!K) setRawModeSafe(process.stdin, !0);
      let D = waitForDetachKey(process.stdin);
      try {
        C = await Promise.race([ensureDaemon(Tt, n.storageV5), D.promise.then(() => "detach")]);
      } finally {
        if ((D.cancel(), !K)) setRawModeSafe(process.stdin, !1);
      }
    } else C = await ensureDaemon(Tt, n.storageV5);
    if (C === "detach") {
      if (T) process.stdout.write(exitAltScreenSequence());
      return (
        logForDebugging("[PERF:bg-attach-end]"),
        logFeatureOk("job_attach"),
        reportAttachTelemetry(w, "detached"),
        { kind: "detached" }
      );
    }
    let q = C;
    if (!q.ok) {
      if (T) process.stdout.write(exitAltScreenSequence());
      if (q.stoodDown) return shouldStartDaemonForAttach("reconnect", n, q);
      return (
        logFeatureBad("job_attach", `job_attach_daemon_start_failed_${q.causeCode}`),
        reportAttachTelemetry(w, "error"),
        { kind: "error", msg: `Couldn't restart the ${bgSupervisorNoun()} \u2014 ${q.reason}` }
      );
    }
    let Q = drainStdin();
    if (Q && containsInterruptKey(Q)) {
      if (T) process.stdout.write(exitAltScreenSequence());
      return (
        logForDebugging("[PERF:bg-attach-end]"),
        logFeatureOk("job_attach"),
        reportAttachTelemetry(w, "detached"),
        { kind: "detached" }
      );
    }
    if (await isBackgroundSessionGone(e))
      return (
        logForDebugging(
          `[bg-attach] worker gone on reconnect probe short=${e} \u2014 settled while attached`,
        ),
        N()
      );
    S = await Ge(e, o, {
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
    for (let K = 0; S.msg && s.test(S.msg) && K < 10; K++)
      (await sleep(200),
        (S = await Ge(e, o, {
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
        })));
    if (S.msg?.includes("ENOJOB"))
      return (
        logForDebugging(
          `[bg-attach] ENOJOB on reconnect short=${e} \u2014 daemon has no handle (or it's killing/settled)`,
        ),
        N()
      );
    if (S.outcome === "error" && T) process.stdout.write(exitAltScreenSequence());
  }
  if (
    S.outcome === "detached" &&
    S.msg &&
    !o.onlyToRetry &&
    (FATAL_ATTACH_CODE.test(S.msg) || s.test(S.msg))
  ) {
    if (T) process.stdout.write(exitAltScreenSequence());
    return (
      logFeatureBad("job_attach", "job_attach_stalled"),
      { kind: "error", msg: S.msg.replace(/^E(STALLED|RESPAWNING|STARTING):\s*/, "") }
    );
  }
  if (S.outcome === "error") {
    if (S.msg?.startsWith(`${HOST_DEAD_ATTACH_CODE}:`)) {
      logFeatureBad("job_attach", "job_attach_host_dead");
      let j = await readJobState(getJobDir(e), n.storageV5).catch(() => null),
        trimmed = S.msg.slice(HOST_DEAD_ATTACH_CODE.length + 1).trim();
      return {
        kind: "error",
        msg: j !== null && isExecLaunch(j) ? trimmed : `${trimmed} \u2014 press Enter to restart it`,
      };
    }
    if (S.msg?.startsWith(`${ENORESPONSE}:`)) {
      logFeatureBad("job_attach", "job_attach_no_response");
      let j = await readJobState(getJobDir(e), n.storageV5).catch(() => null);
      if (j !== null && isExecLaunch(j))
        return {
          kind: "error",
          msg: `${IHt} \u2014 it runs a shell command, which is never run again for you; ctrl+x stops it`,
        };
      return {
        kind: "error",
        notResponding: !0,
        msg: `${IHt} \u2014 press Enter again to restart it (the conversation is saved)`,
      };
    }
    if (S.msg?.includes("ENOJOB")) {
      logForDebugging(
        `[bg-attach] ENOJOB on first attach short=${e} \u2014 daemon has no handle (or it's killing/settled)`,
      );
      let j = await resolveAttachTarget(e, void 0, n.storageV5);
      if (j) return j;
      return (
        logFeatureSad("job_attach", "job_attach_orphaned"),
        {
          kind: "error",
          orphaned: !0,
          msg: `${bgSupervisorNounCap()} lost track of this job \u2014 press Enter to respawn it`,
        }
      );
    }
    if (v && !v.ok) {
      if (v.stoodDown) return shouldStartDaemonForAttach("first_attach", n, v);
      return (
        logFeatureBad("job_attach", `job_attach_daemon_start_failed_${v.causeCode}`),
        reportAttachTelemetry(w, "error"),
        { kind: "error", msg: `Couldn't start the ${bgSupervisorNoun()} \u2014 ${v.reason}` }
      );
    }
    let U =
      S.msg && s.test(S.msg)
        ? `${bgSupervisorNounCap()} is still starting \u2014 try again in a moment`
        : S.msg && r.test(S.msg)
          ? `${bgSupervisorNounCap()} didn't respond after starting \u2014 try again in a moment`
          : S.msg
            ? `Couldn't attach \u2014 ${S.msg}`
            : "Couldn't attach to that session";
    return (logFeatureBad("job_attach", "job_attach_failed"), { kind: "error", msg: U });
  }
  if (
    (logForDebugging("[PERF:bg-attach-end]"),
    logFeatureOk("job_attach"),
    S.msg && KICKED_ATTACH_CODE.test(S.msg))
  )
    return { kind: "detached", msg: S.msg.replace(KICKED_ATTACH_CODE, "") };
  return S.beforeFirstFrame ? { kind: "detached", beforeFirstFrame: !0 } : { kind: "detached" };
}
//@ chunk-vrr64ez0.js:41410-41516 placement
var BACKGROUND_SESSIONS_STOP_WARNING =
  "Background sessions still running will stop in about a minute. Run 'claude agents' to keep them.";
/**
 * 判断附加前是否需要拉起 daemon（ping 超时、服务管理器状态、平台）。
 */
//@ chunk-vrr64ez0.js:41516-42043 placement
async function shouldStartDaemonForAttach(e, n, o) {
  let r = getPlatform(),
    [u, s] = o
      ? [void 0, o.viaService === !0 && r !== "macos"]
      : await Promise.all([controlRequest({ proto: BG_PROTO, op: "ping" }, { timeoutMs: 300 }), kxs()]),
    h = u !== void 0 && (u.ok || u.code === "ETIMEOUT"),
    A =
      !h && !s && r !== "windows" && process.stdout.isTTY
        ? `${BACKGROUND_SESSIONS_STOP_WARNING}
`
        : "";
  if (
    (logForDebugging(`[bg-attach] held: this process is exiting (${e})`),
    logEvent("tengu_bg_attach_held_at_exit", {
      loop_head: e === "loop_head",
      first_attach: e === "first_attach",
      daemon_up: h,
      service_restart: s,
      notice: A !== "",
    }),
    n.alreadyInAlt)
  )
    n.onExitNotice?.(A);
  else if (A) process.stdout.write(A);
  return heldUntilExit();
}
//@ chunk-vrr64ez0.js:42043-42132 placement
var Rn = 32,
  Fr = { head: 50, tail: 30 },
  jr = { head: 60, tail: 100 },
  WORKTREE_DIGEST_PATTERN = new RegExp(`^[0-9a-f]{${Rn}}$`);
//@ chunk-vrr64ez0.js:42132-42172 placement
function Lr(e) {
  return computeContentHash(e).slice(0, Rn);
}
//@ chunk-vrr64ez0.js:42172-48331 placement
async function deleteJob(e, n = {}, o) {
  let r = await readJobState(getJobDir(e), o),
    u = r?.worktreePath ? await listAllLiveSessions(o).catch(() => []) : [],
    s = new Set();
  for (let v of u) if (Bn(v, e)) s.add(v.pid);
  let h = await killJob(e, r ?? void 0, { knownGone: n.knownGone, evict: !0 }, o).catch((v) => ({
    confirmed: !1,
    error: errorMessage(v),
  }));
  if (!h.confirmed) {
    if (
      (logForDebugging(
        `deleteJob: kill unconfirmed for ${e} \u2014 skipping jobdir/worktree removal to avoid stranding a live worker`,
        { level: "warn" },
      ),
      !n.internal)
    )
      logFeatureBad("job_delete", "kill_unconfirmed", { had_worktree: Boolean(r?.worktreePath) });
    return { removed: !1, error: h.error, errorCode: "kill_unconfirmed" };
  }
  let A,
    w,
    T = !1;
  if (r?.worktreePath) {
    let worktreePath = r.worktreePath,
      N,
      U,
      j,
      C = null,
      q = "present",
      Q = !1,
      K,
      D,
      P,
      {
        dirty: dirty,
        trackedChanges: trackedChanges,
        gitError: gitError,
        submoduleWork: submoduleWork,
      } = await getAgentWorktreeChanges(worktreePath, void 0),
      ee = resolveWorktreeCleanupRoot(worktreePath, r.originCwd) ?? void 0,
      W = await realpath(worktreePath).catch(() => worktreePath),
      ce = Lr(W);
    T =
      n.discardUnpushed !== void 0 &&
      !gitError &&
      n.discardUnpushed.worktreeDigest === ce &&
      (await isHeadAt(W, n.discardUnpushed.headSha));
    let Ne = !gitError && ee ? await listRegisteredWorktrees(ee).catch(() => null) : null,
      we,
      Fe = !1;
    for (let [re, ae] of (Ne ?? []).entries())
      if ((await realpath(ae.worktreePath).catch(() => ae.worktreePath)) === W) {
        ((we = ae), (Fe = re > 0 && !ae.prunable));
        break;
      }
    let Ee = repositoryVouchedByWorktree(W),
      Le =
        ee !== void 0 &&
        Ee !== null &&
        (await realpath(Ee).catch(() => Ee)) === (await realpath(ee).catch(() => ee)),
      ie =
        Fe && Le
          ? submoduleWork?.kind === "unverifiable"
            ? "submodule"
            : trackedChanges
              ? "tracked_changes"
              : void 0
          : ee !== void 0 && (await worktreeDeregisteredByRemoval(W, ee))
            ? void 0
            : "not_registered",
      ue = n.forceRemoveWorktree !== void 0 && n.forceRemoveWorktree === ce,
      pe = ue && ie === void 0 && isDirectlyUnderClaudeWorktreesDir(W),
      qe = pe ? "job_delete_force_remove" : n.force === !0 || T ? "job_delete_force" : "job_delete",
      Ve = carriesDiscardConsent(qe),
      Oe = claudeWorktreeLockPid(we?.lockReason),
      V;
    if ((V = await findJobSharingWorktree(e, W, worktreePath, o)) !== null)
      ((N = "in_use"),
        (K = V.verified && SHORT_RE.test(V.jobId) ? V.jobId : void 0),
        logForDebugging(
          `deleteJob: ${worktreePath} is claimed by running job ${V.jobId}'s state.json (${V.verified ? "verified" : "unverifiable claim"}) \u2014 not ours to remove`,
          { level: "warn" },
        ));
    else if (
      ((Q = (await findGitRootVerifyingPositive(worktreePath)) === null) || T || pe) &&
      (q = await pathPresence(worktreePath)) !== "gone" &&
      (C =
        q === "unreadable"
          ? "unreadable"
          : await findOtherJobsInDir(e, W, worktreePath, { includeUnsettled: T || pe }, o)) !== null
    ) {
      if (C === "claimed" && !Q && T)
        ((N = "unpushed_shared"),
          (D = await listUnpushedCommits(worktreePath).catch(() => {
            return;
          })));
      else N = C === "claimed" ? "shared_record" : "records_unreadable";
      logForDebugging(
        C === "claimed"
          ? `deleteJob: ${worktreePath} is also recorded by another settled job's state.json \u2014 not removing another session's output`
          : `deleteJob: could not verify ${worktreePath} against sibling records \u2014 refusing until records are readable`,
        { level: "warn" },
      );
    } else if (!(await mayReleaseWorktreeLock(we?.lockReason)) && !(Oe !== null && s.has(Oe)))
      ((N = "live_lock"),
        (K = Oe !== null ? `pid ${Oe}` : void 0),
        logForDebugging(
          `deleteJob: ${worktreePath} is locked by a live Claude Code process, or with a reason we did not write (${we?.lockReason}) \u2014 not ours to remove`,
          { level: "warn" },
        ));
    else if (
      (P = await findSessionsInDirectory(u, e, s, W, worktreePath)) !== void 0 &&
      (await pathPresence(worktreePath)) !== "gone"
    )
      ((N = "occupied"),
        (K =
          P.pid === process.pid
            ? `${typeof P.parkedJobId === "string" && SHORT_RE.test(P.parkedJobId) ? `session ${P.parkedJobId},` : "a session"} moved to the background from this window, pid ${P.pid}`
            : P.kind === "bg" && typeof P.jobId === "string" && SHORT_RE.test(P.jobId)
              ? `background session ${P.jobId}, pid ${P.pid}`
              : `pid ${P.pid}, ${P.kind}`),
        logForDebugging(
          `deleteJob: ${worktreePath} is the working directory of a live session (pid ${P.pid}, ${P.kind}) \u2014 not ours to remove`,
          { level: "warn" },
        ));
    else if (dirty && !gitError && !Ve)
      ((N = "dirty"),
        logForDebugging(`deleteJob: worktree has uncommitted changes, kept ${worktreePath}`, {
          level: "warn",
        }));
    else if (
      !gitError &&
      ee &&
      !T &&
      !(await passesCommitSafetyChecks(worktreePath, await getDefaultRemoteRef(ee), {
        primaryCheckoutVouches: !0,
      }))
    ) {
      if ((await findOtherJobsInDir(e, W, worktreePath, { includeUnsettled: !1 }, o)) === "claimed")
        ((N = "unpushed_shared"),
          logForDebugging(
            `deleteJob: ${worktreePath} has unpushed commits and is also recorded by another settled job's state.json \u2014 not offering a discard`,
            { level: "warn" },
          ));
      else
        ((N = "unpushed"),
          logForDebugging(`deleteJob: ${worktreePath} has commits that are on no remote, kept`, {
            level: "warn",
          }));
      D = await listUnpushedCommits(worktreePath).catch(() => {
        return;
      });
    } else if (T && n.discardUnpushed !== void 0 && !(await isHeadAt(W, n.discardUnpushed.headSha)))
      ((N = "unpushed"),
        logForDebugging(`deleteJob: ${worktreePath} HEAD moved past the confirmed discard pin, kept`, {
          level: "warn",
        }),
        (D = await listUnpushedCommits(worktreePath).catch(() => {
          return;
        })));
    else {
      let re = resolveWorktreeCleanupRoot(worktreePath, r.originCwd) ?? void 0,
        ae = (r.originCwd ? findGitRoot(r.originCwd) : null) ?? void 0,
        X = await removeAgentWorktree(worktreePath, r.worktreeBranch, re, r.worktreeHookBased, qe, W, ae, {
          storageV5: o,
          forceRemoveRequested: ue,
        }).catch(
          (oe) => (
            logForDebugging(`deleteJob: removeAgentWorktree threw for ${worktreePath}: ${errorMessage(oe)}`, {
              level: "error",
            }),
            {
              outcome: "failed",
              errorSummary: `the removal failed unexpectedly (${printableLabel(errorMessage(oe), jr)})`,
            }
          ),
        );
      if (X.outcome === "failed") {
        if (
          ((N = X.needsForce
            ? "unverified"
            : X.errorSummary === IDENTITY_CHANGED_SUMMARY
              ? "identity_changed"
              : X.holdsWorktreesInside
                ? "worktrees_inside"
                : "remove_failed"),
          (K = X.needsForce ? void 0 : X.errorSummary),
          X.forceRemovable !== void 0 && isDirectlyUnderClaudeWorktreesDir(W))
        )
          if (ie !== void 0) j = ie;
          else if ((await findOtherJobsInDir(e, W, worktreePath, { includeUnsettled: !1 }, o)) === "claimed")
            j = "shared_record";
          else U = X.forceRemovable;
      } else if (X.outcome === "left_in_place") A = printableLabel(worktreePath);
      else if (X.forcedDirectoryRemoval) {
        let { keptBranch: keptBranch } = X.forcedDirectoryRemoval;
        w = {
          worktree: printableLabel(W),
          ...(keptBranch !== void 0 && { keptBranch: printableLabel(keptBranch, Fr) }),
        };
      }
    }
    if (N) {
      if (!n.internal) logFeatureSad("job_delete", `worktree_kept_${N}`, { had_worktree: !0 });
      return {
        removed: !1,
        keptWorktree: printableLabel(W),
        keptReason: N,
        ...(K !== void 0 && { keptErrorSummary: K }),
        ...(D !== void 0 && { keptUnpushed: D }),
        ...(N === "unpushed" && D !== void 0
          ? { discardUnpushed: { headSha: D.headSha, worktreeDigest: ce } }
          : U !== void 0 && T && n.discardUnpushed !== void 0 && { discardUnpushed: n.discardUnpushed }),
        ...(U !== void 0 && { forceRemoveWorktree: { worktreeDigest: ce, cause: U } }),
        ...(j !== void 0 && { forceRemoveWithheld: j }),
        ...(submoduleWork !== void 0 &&
          (N === "dirty" || N === "remove_failed") && { submoduleWork: submoduleWork }),
      };
    }
  }
  let S = r?.fan?.some((v) => v.kind === "shell" && v.doneAt === void 0) ?? !1;
  await reapAdoptRecord(getJobDir(e), { waitMs: S ? 4000 : 0 });
  try {
    await rm(getJobDir(e), { recursive: !0, force: !0 });
  } catch (error) {
    if (
      (invalidateJobStateCache(getJobDir(e)),
      logForDebugging(`deleteJob: failed to remove job dir for ${e}: ${errorMessage(error)}`, {
        level: "warn",
      }),
      !n.internal)
    )
      logFeatureBad("job_delete", "jobdir_rm_failed", { had_worktree: Boolean(r?.worktreePath) });
    return {
      removed: !1,
      error: `couldn't remove the session's state directory (${Dr(errorMessage(error))})`,
      errorCode: "jobdir_rm_failed",
    };
  }
  if (isStorageV5Enabled() && o !== void 0 && validateStorageKey(xAr(e)) === void 0) await Ttn(o, e);
  else await unlink_2(ePe(e)).catch(() => {});
  if ((invalidateJobStateCache(getJobDir(e)), !n.internal))
    if (A) logFeatureSad("job_delete", "worktree_left_in_place", { had_worktree: !0, discard_confirmed: T });
    else if (w)
      logFeatureSad("job_delete", "worktree_force_removed", { had_worktree: !0, discard_confirmed: T });
    else logFeatureOk("job_delete", { had_worktree: Boolean(r?.worktreePath), discard_confirmed: T });
  return {
    removed: !0,
    discardConfirmed: T,
    ...(A && { leftWorktreeDir: A }),
    ...(w && { forcedWorktreeRemoval: w }),
  };
}
/**
 * 找出与指定 worktree 路径相同的其他存活 job（已验证/无法验证）。
 */
//@ chunk-vrr64ez0.js:48331-48689 placement
async function findJobSharingWorktree(e, n, o, r) {
  for (let u of await listJobs(void 0, r).catch(() => [])) {
    if (u.id === e || !u.state.worktreePath || isSettled(u.state)) continue;
    let s = matchWorktreePath(u.state.worktreePath, n, o);
    if (s === "match") return { jobId: u.id, verified: !0 };
    if (s === "unverifiable") return { jobId: u.id, verified: !1 };
    let h = await resolveComparablePath(u.state.worktreePath, o);
    if (xe(h, n)) return { jobId: u.id, verified: !0 };
  }
  return null;
}
//@ chunk-vrr64ez0.js:48689-48870 placement
function matchWorktreePath(e, n, o) {
  if (xe(e, o) || xe(e, n)) return "match";
  if (!cl(e)) return "no_match";
  let r = normalize(e);
  if (xe(r, o) || xe(r, n)) return "match";
  return isAbsolute(e) && !Qn(e) && !yl(e) ? "unverifiable" : "no_match";
}
//@ chunk-vrr64ez0.js:48870-48908 placement
function xe(e, n) {
  return ft(e) === ft(n);
}
//@ chunk-vrr64ez0.js:48908-48940 placement
function ft(e) {
  return Cp(Mn(e));
}
//@ chunk-vrr64ez0.js:48940-49023 placement
function En(e, n) {
  let o = relative(ft(n), ft(e));
  return o.split(/[/\\]/, 1)[0] !== ".." && !isAbsolute(o);
}
/**
 * 在会话列表中找出与当前目录相同的交互/后台会话进程。
 */
//@ chunk-vrr64ez0.js:49023-49451 placement
async function findSessionsInDirectory(e, n, o, r, u) {
  for (let s of e) {
    if (s.kind !== "interactive" && s.kind !== "bg") continue;
    if (o.has(s.pid) || s.parkedJobId === n) continue;
    if (s.pid === process.pid && s.parkedJobId === void 0) continue;
    let h = s.pid === process.pid ? getOriginalCwd() : s.cwd;
    if (typeof h !== "string" || !isAbsolute(h)) continue;
    if (!En(h, r) && !En(h, u)) continue;
    if (s.kind === "bg" && typeof s.jobId === "string" && SHORT_RE.test(s.jobId)) {
      if ((await probeJobStateFile(getJobDir(s.jobId))) === "missing") continue;
    }
    return s;
  }
  return;
}
//@ chunk-vrr64ez0.js:49451-49672 placement
function resolveComparablePath(e, n) {
  let o = getCwd();
  if (!isAbsolute(e) || cl(e) || (isOnForeignMount(e, o) && isOnForeignMount(e, n))) return e;
  let r = resolveDeepestExistingAncestorSync(getFsImplementation(), e, {
    surfaceNetworkRaw: !0,
    anchors: [o, n],
  });
  if (r === UNVERIFIED_ANCESTRY) return e;
  if (r !== void 0 && (cl(r) || (isOnForeignMount(r, o) && isOnForeignMount(r, n)))) return e;
  return realpath(e).catch(() => e);
}
//@ chunk-vrr64ez0.js:49672-49776 placement
async function probeJobStateFile(e) {
  return lstat_2(join_2(e, "state.json")).then(
    () => "present",
    (n) => (isENOENT(n) ? "missing" : "unreadable"),
  );
}
/**
 * 扫描 jobs 目录，找出在同一目录工作的其他 job。
 */
//@ chunk-vrr64ez0.js:49776-50285 placement
async function findOtherJobsInDir(e, n, o, { includeUnsettled: includeUnsettled }, u) {
  let s;
  try {
    s = await readdir_2(getJobsDir(), { withFileTypes: !0 });
  } catch (error) {
    return isENOENT(error) ? null : "unreadable";
  }
  for (let h of s) {
    if (!h.isDirectory() || h.name === e) continue;
    let A = join_2(getJobsDir(), h.name),
      w = await readJobState(A, u);
    if (w === null) {
      if ((await probeJobStateFile(A)) === "missing") continue;
      return "unreadable";
    }
    if (!w.worktreePath || (!includeUnsettled && !isSettled(w))) continue;
    let T = matchWorktreePath(w.worktreePath, n, o);
    if (T === "match") return "claimed";
    if (T === "unverifiable") return "unreadable";
    let S = await resolveComparablePath(w.worktreePath, o);
    if (xe(S, n)) return "claimed";
  }
  return null;
}
//@ chunk-vrr64ez0.js:50285-50332 placement
async function Ge(e, n, o) {
  return await attachToJob(e, o);
}
//@ chunk-vrr64ez0.js:50332-50418 placement
function Bn(e, n) {
  return e.kind === "bg" && (e.jobId === n || e.sessionId?.startsWith(n) === !0);
}
//@ chunk-e6aww6q8.js:3654790-3654875 placement = isDangerousFilePathToAutoEdit (1)
function isDirectlyUnderClaudeWorktreesDir(path) {
  let absolutePath = dirname_51(path);
  return (
    absolutePath !== path &&
    basename_51(absolutePath) === "worktrees" &&
    basename_51(dirname_51(absolutePath)) === ".claude"
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
