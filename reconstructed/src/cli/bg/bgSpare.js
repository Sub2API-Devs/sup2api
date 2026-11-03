/**
 * cli/bg/bgSpare.ts
 *
 * 2.1.316 新增：预热的后台备用进程（spare）池、Fleet 视图派发与后台会话重启（respawn）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bg51yd13.js (17)
 * attribution: placement 17
 */
import { randomUUID } from "crypto";
import { rm, readFile } from "fs/promises";
import { dirname } from "path";
import { getCwd } from "../../utils/cwd.js";
import {
  getJobDir,
  writeStateAtomic,
  makeInitialState,
  invalidateJobStateCache,
  logJobWriteError,
  readJobState,
  isExecLaunch,
  buildBridgeReattachEnv,
  isTerminal,
  isSettled,
  hasOutstandingAsk,
  IDLE_NEEDS,
  PRE_BOOT_STATES,
} from "../../services/daemon/jobState.js";
import {
  trackBgDispatch,
  getInFlightDispatch,
  checkWorkspaceTrust,
  formatWorkspaceUntrusted,
} from "./bgDispatch.js";
import { ensureJobTmpFolder } from "../../services/daemon/jobFolder.js";
import {
  callerProviderEnv,
  spawnBgSession,
  gateCauseExtra,
  workspaceGateCause,
  rewriteDispatchFlagValue,
} from "./bgCommands.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { sanitizeErrnoForTelemetry, errorMessage, isENOENT } from "../../utils/errors.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import {
  killJob,
  deleteJob,
  applyReplyPatch,
  replyToJob,
  REPLY_ENOJOB_MSG,
  probeDaemonJob,
  killOrphanedWorker,
  isDaemonJobPresent,
} from "../../daemon/jobs/killJob.js";
import { logForDebugging } from "../../utils/debug.js";
import { isRestrictedSession, getRootSession } from "../../bootstrap/state.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { arraysEqual } from "../../utils/collections.js";
import { isLowMemory } from "../../daemon/lowMemory.js";
import {
  canonicalizePath,
  resolveJobTranscript,
  quarantineJobTranscript,
} from "../../utils/sessionStoragePortable.js";
import {
  getRealPathOptions,
  wrapStorageSource,
  getTranscriptStorageContext,
} from "../../utils/sessionStorage.js";
import { clearAgentDefinitionsCache } from "../../tools/AgentTool/loadAgentsDir.js";
import {
  listUserAgentTemplates,
  resolveBgAgentTemplate,
  buildDispatchArgs,
  dispatchBgSessionTracked,
  PASSTHROUGH_ENV_VARS,
} from "./bgSpawnEnv.js";
import { flagArgs } from "../../services/daemon/relaunchArgs.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  queuePromptForJob,
  queuedPromptOrUndefined,
  promptMatchesQueued,
} from "../../services/daemon/spawnLauncher.js";
import { probeJobState, logRestartWithoutSavedState } from "../../services/daemon/reapJobs.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { sleep } from "../../utils/sleep.js";
import { readCandidate } from "../../utils/listSessionsImpl.js";
import { listLiveSessionHolders, SESSION_BUSY_ELSEWHERE_MESSAGE } from "../../utils/sessionAttach.js";
import { stripEnvironmentFlags } from "../cloudSessionArgs.js";
import { withoutReplyOnResume, withReplyOnResume } from "../forwardedFlags.js";
import { attachCarriedPromptHash, dropCarriedPromptHash } from "../../utils/background/envCarry.js";
import { decodeHostLineage } from "../../services/daemon/ensureDaemon.js";
import { hostManagedEntry } from "../../utils/sandbox/userNamespace.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";

//@ chunk-bg51yd13.js:77499-77535 placement = addSlowOperation (0.33)
var addSlowOperation = {
  name: "exec",
  description: "",
};
//@ chunk-bg51yd13.js:77535-77559 placement
/**
 * 恒返回 true 的开关：Fleet 视图派发功能在本构建里视为开启。
 */
function isFleetDispatchEnabled() {
  return true;
}
//@ chunk-bg51yd13.js:77559-78441 placement
/**
 * Fleet 视图中派发任务：创建作业状态、启动会话。
 */
function dispatchFromFleetView(e, n, cwd, storageV5) {
  let s = n ?? randomUUID();
  let sliced = s.slice(0, 8);
  let u = cwd ?? getCwd();
  let jobDir = getJobDir(sliced);
  return trackBgDispatch(
    sliced,
    (async () => {
      try {
        await ensureJobTmpFolder(sliced, storageV5);
        await writeStateAtomic(
          jobDir,
          makeInitialState({
            template: addSlowOperation,
            intent: e,
            providerEnv: callerProviderEnv(),
            sessionId: s,
            cwd: u,
            originCwd: u,
          }),
          storageV5,
        );
      } catch (error) {
        await rm(jobDir, {
          recursive: true,
          force: true,
        }).catch(() => {});
        invalidateJobStateCache(jobDir);
        logFeatureBad("fleet_view_dispatch_exec", "state_write_failed", {
          errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
        });
        return {
          ok: false,
          error: `Couldn't create the job \u2014 ${errorMessage(error)}`,
        };
      }
      let bgSession = await spawnBgSession(
        [],
        s,
        "fleet",
        u,
        {
          intent: e,
          exec: e,
        },
        undefined,
        undefined,
        storageV5,
      );
      if (!bgSession.ok) {
        if (bgSession.alive) {
          logFeatureSad("fleet_view_dispatch_exec", "alive_collision");
          return {
            ok: false,
            error: bgSession.error,
            alive: true,
          };
        }
        await killJob(sliced, undefined, undefined, storageV5).catch(() => {});
        await rm(jobDir, {
          recursive: true,
          force: true,
        }).catch(() => {});
        invalidateJobStateCache(jobDir);
        (bgSession.reason === "cwd_gone" ? logFeatureSad : logFeatureBad)(
          "fleet_view_dispatch_exec",
          bgSession.reason ?? "spawn_failed",
        );
        return {
          ok: false,
          error: bgSession.error,
          reason: bgSession.reason,
        };
      }
      logFeatureOk("fleet_view_dispatch_exec");
      return {
        ok: true,
        jobId: bgSession.short,
        sessionId: s,
      };
    })(),
  );
}
//@ chunk-bg51yd13.js:78441-78606 placement
/**
 * 浅比较两个对象：同引用为真；任一为空为假；否则比较两边全部键的值是否严格相等。
 */
function shallowEqualRecords(defaults, n) {
  if (defaults === n) return true;
  if (!defaults || !n) return false;
  let o = new Set([...Object.keys(defaults), ...Object.keys(n)]);
  for (let r of o) {
    let s = r;
    if (defaults[s] !== n[s]) return false;
  }
  return true;
}
//@ chunk-bg51yd13.js:78606-80725 placement
/**
 * 维护一个预热的备用 claude 进程（参数/默认值变化时重启）。
 */
class BgSparePool {
  spare = null;
  ensuring = null;
  discarded = false;
  generation = 0;
  #e = [];
  #t = ["--restricted"];
  get extraArgs() {
    return isRestrictedSession() ? this.#t : this.#e;
  }
  setExtraArgs(e) {
    this.#e = e;
    this.#t = e.includes("--restricted") ? e : ["--restricted", ...e];
  }
  markReady(e) {
    if (this.spare?.sessionId === e) this.spare.ready = true;
  }
  take() {
    let spare = this.spare;
    this.spare = null;
    return spare;
  }
  async ensure(e, n, o, r, s) {
    if (isTerminalShutdown()) return;
    if (n) this.discarded = false;
    if (!this.spare && this.ensuring) {
      await this.ensuring.catch(() => {});
      if (!this.spare) return;
    }
    let l;
    if (this.spare) {
      if (!arraysEqual(this.spare.extraArgs, this.extraArgs)) l = "extra_args_mismatch_reboot";
      else if (o !== undefined && !shallowEqualRecords(this.spare.defaults, o))
        l = "defaults_mismatch_reboot";
    }
    if (l !== undefined) {
      logFeatureSad("job_spare_ensure", l);
      let w = this.take();
      if (w)
        await deleteJob(
          w.jobId,
          {
            internal: true,
          },
          s,
        ).catch(() => {});
    }
    if (this.spare || this.ensuring || this.discarded) return;
    if (isLowMemory()) {
      logFeatureSad("job_spare_ensure", "low_mem");
      return;
    }
    let u = randomUUID();
    let sliced = u.slice(0, 8);
    let generation = this.generation;
    logForDebugging(`[PERF:bg-spare-start] ${sliced}`);
    this.ensuring = (async () => {
      try {
        let w = await canonicalizePath(e, getRealPathOptions(s));
        let A = r;
        if (A === undefined && o?.agent) {
          clearAgentDefinitionsCache();
          A = await listUserAgentTemplates(w, s).catch(() => []);
        }
        let R = resolveBgAgentTemplate(o, A).name;
        let extraArgs = this.extraArgs;
        let bgSession = await spawnBgSession(
          [...extraArgs, ...flagArgs("--agent", R), ...buildDispatchArgs(o)],
          u,
          "spare",
          w,
          undefined,
          undefined,
          undefined,
          s,
        );
        if (!bgSession.ok) {
          await deleteJob(
            sliced,
            {
              internal: true,
            },
            s,
          ).catch(() => {});
          if (isTerminalShutdown()) {
            logFeatureSad("job_spare_ensure", "exiting");
            return;
          }
          (isSoftDispatchFailure(bgSession.reason) ? logFeatureSad : logFeatureBad)(
            "job_spare_ensure",
            bgSession.reason ?? "spawn_failed",
            ...gateCauseExtra(bgSession.gateCause),
          );
          return;
        }
        if (this.discarded || isTerminalShutdown()) {
          await deleteJob(
            sliced,
            {
              internal: true,
            },
            s,
          );
          logFeatureSad("job_spare_ensure", this.discarded ? "discarded_after_spawn" : "exiting");
          return;
        }
        if (generation !== this.generation) {
          await deleteJob(
            sliced,
            {
              internal: true,
            },
            s,
          ).catch(() => {});
          logFeatureSad("job_spare_ensure", "retired_after_spawn");
          return;
        }
        this.spare = {
          jobId: sliced,
          sessionId: u,
          cwd: w,
          ready: false,
          defaults: o,
          extraArgs,
        };
        logForDebugging(`[PERF:bg-spare-spawned] ${sliced}`);
        logFeatureOk("job_spare_ensure");
      } catch {
        await deleteJob(
          sliced,
          {
            internal: true,
          },
          s,
        ).catch(() => {});
        logFeatureBad("job_spare_ensure", "threw");
      }
    })();
    try {
      await this.ensuring;
    } finally {
      this.ensuring = null;
    }
  }
  retire(e) {
    this.generation++;
    let n = this.take();
    if (n)
      deleteJob(
        n.jobId,
        {
          internal: true,
        },
        e,
      ).catch(() => {});
  }
  async discard(e) {
    this.discarded = true;
    if (this.ensuring) await this.ensuring.catch(() => {});
    let n = this.take();
    if (n)
      await deleteJob(
        n.jobId,
        {
          internal: true,
        },
        e,
      );
  }
}
//@ chunk-bg51yd13.js:80725-80750 placement
var BG_SPARE_POOL_SLOT = new HostScoped(() => new BgSparePool());
//@ chunk-bg51yd13.js:80750-80787 placement
function bgSparePool() {
  return BG_SPARE_POOL_SLOT.of(getRootSession().host);
}
//@ chunk-bg51yd13.js:80787-80820 placement
/**
 * 从备用进程池取一个空闲 spare 句柄。
 */
function takeSpareHandle() {
  return bgSparePool().spare;
}
//@ chunk-bg51yd13.js:80820-80854 placement
/**
 * 把某个 spare 标记为已就绪（可被认领）。
 */
function markSpareReady(sessionId) {
  bgSparePool().markReady(sessionId);
}
//@ chunk-bg51yd13.js:80854-80911 placement
/**
 * 从 spare 池认领一个进程来启动会话，未命中时返回未命中结果。
 */
function claimSpareFromPool(scopedFallbackOrigin, n = false, dispatchDefaults, r, storageV5) {
  return bgSparePool().ensure(scopedFallbackOrigin, n, dispatchDefaults, r, storageV5);
}
//@ chunk-bg51yd13.js:80911-82083 placement
/**
 * 认领备用进程启动会话，未命中时记录原因并回退。
 */
async function claimSpare(e, n, storageV5) {
  logForDebugging("[PERF:bg-claim-start]");
  let r = bgSparePool();
  let s = r.take();
  let l = n ?? resolveBgAgentTemplate(s?.defaults);
  let u = async (p, w) => {
    logForDebugging(`[bg-spare] claim miss (${p})${w ? `: ${w}` : ""}`);
    logEvent("tengu_bg_spare_claim_fail", {
      reason: fromEnum(p),
    });
    if (s) {
      let A = await deleteJob(
        s.jobId,
        {
          internal: true,
          knownGone: p === "enojob",
        },
        storageV5,
      );
      if (!A.removed) {
        logFeatureBad("job_claim_spare", "job_claim_spare_delete_failed");
        logForDebugging(
          `[bg-spare] deleteJob unconfirmed (${A.error ?? "unknown"}) \u2014 cold-dispatching with fresh sessionId; spare ${s.jobId} dir preserved`,
          {
            level: "warn",
          },
        );
      } else logFeatureSad("job_claim_spare", p);
    } else logFeatureSad("job_claim_spare", p);
    return dispatchBgSessionTracked(
      l,
      e,
      {
        targetCwd: s?.cwd,
        defaults: s?.defaults,
      },
      storageV5,
    );
  };
  if (!s) return u("no-spare");
  if (!arraysEqual(s.extraArgs, r.extraArgs)) return u("stale-argv");
  let y = applyReplyPatch(
    makeInitialState({
      template: l,
      respawnFlags: [
        ...bgSparePool().extraArgs,
        ...flagArgs("--agent", l.name),
        ...buildDispatchArgs(s.defaults),
      ],
      intent: e,
      providerEnv: callerProviderEnv(),
      sessionId: s.sessionId,
      cwd: s.cwd,
      originCwd: s.cwd,
    }),
    e,
  );
  try {
    let p = await replyToJob(s.jobId, e, undefined, y, undefined, storageV5);
    if (p) return u(p.err === REPLY_ENOJOB_MSG ? "enojob" : "reply", p.err);
  } catch (error) {
    return u("reply-throw", errorMessage(error));
  }
  await writeStateAtomic(getJobDir(s.jobId), y, storageV5).catch(logJobWriteError);
  logForDebugging("[PERF:bg-claim-end]");
  logFeatureOk("job_claim_spare");
  logFeatureOk("fleet_view_dispatch");
  return {
    ok: true,
    jobId: s.jobId,
    sessionId: s.sessionId,
  };
}
//@ chunk-bg51yd13.js:82083-82122 placement
/**
 * 丢弃某个 spare（不可用或已退出）。
 */
function discardSpare(storageV5) {
  return bgSparePool().discard(storageV5);
}
//@ chunk-bg51yd13.js:82122-82153 placement
/**
 * 退役某个 spare（不再复用）。
 */
function retireSpare(e) {
  bgSparePool().retire(e);
}
//@ chunk-bg51yd13.js:82153-93057 placement
/**
 * 重启后台会话（等待进行中的启动、迁移到可附着 PTY 等，约 11 KB）。
 */
async function respawnBgSession(e, n, o) {
  let jobDir = getJobDir(e);
  let knownState = n?.knownState;
  let inFlightDispatch = getInFlightDispatch(e);
  if (inFlightDispatch) {
    logForDebugging(`bg: respawn of ${e} waiting on its in-flight spawn`);
    let M = await inFlightDispatch;
    invalidateJobStateCache(jobDir);
    knownState = undefined;
    if (!M.ok && !M.alive) {
      logFeatureSad("job_respawn", "in_flight_spawn_failed");
      let jobState = await readJobState(jobDir, o);
      let queued =
        !!n?.initialPrompt &&
        jobState !== null &&
        (await queuePromptForJob(jobDir, jobState, n.initialPrompt, o, n.keepQueuedPrompt));
      return {
        ok: false,
        alive: false,
        state: jobState ?? n?.knownState,
        queued,
        error: M.error,
      };
    }
  }
  let u = knownState ?? (await readJobState(jobDir, o));
  if (!u) {
    logFeatureBad("job_respawn", "job_respawn_state_missing");
    return {
      ok: false,
      error: "Can't respawn \u2014 that job's saved state is missing",
      alive: false,
    };
  }
  let daemonShort = u.daemonShort ?? e;
  let now = Date.now();
  let w = await probeDaemonJob(daemonShort, o);
  let A = Date.now() - now;
  let alive = w.alive;
  if (!n?.force && !n?.forceUnresponsive && alive)
    return {
      ok: false,
      alive: true,
      short: daemonShort,
      state: u,
      error: `Session ${e} is already running`,
    };
  if (!n?.force && isExecLaunch(u)) {
    if (w.daemonUp && w.present)
      return {
        ok: false,
        alive: true,
        short: daemonShort,
        state: u,
        error: `Session ${e} has exited; attach shows the captured output`,
      };
    logFeatureSad("job_respawn", "exec_output_expired");
    return {
      ok: false,
      alive: false,
      state: u,
      error: "Output no longer available \u2014 this shell command has exited",
    };
  }
  if (knownState) invalidateJobStateCache(jobDir);
  let h = knownState ? await readJobState(jobDir, o) : u;
  let D = h === null ? await probeJobState(jobDir, o) : undefined;
  let S = h ?? u;
  let daemonShort_2 = S.daemonShort ?? e;
  let x = checkWorkspaceTrust(S.cwd);
  if (x.verdict === "untrusted") {
    logFeatureSad("job_respawn", "workspace_untrusted", ...gateCauseExtra(workspaceGateCause(x)));
    let queued =
      !!n?.initialPrompt && (await queuePromptForJob(jobDir, S, n.initialPrompt, o, n.keepQueuedPrompt));
    return {
      ok: false,
      alive: false,
      state: S,
      queued,
      errorCode: "workspace_untrusted",
      error: formatWorkspaceUntrusted(x),
    };
  }
  let P = S.resumeSessionId !== undefined && S.resumeSessionId !== S.sessionId;
  let T = S.cliVersion !== undefined || P;
  let N = S.sessionIdTaken === true && !T;
  let L = N
    ? randomUUID()
    : (S.resumeSessionId ?? (normalizeUuidOrNull(S.sessionId) !== null ? S.sessionId : randomUUID()));
  if (N)
    logForDebugging(
      `bg: respawn of ${e} \u2014 session id was taken by another conversation; starting under a fresh id`,
      {
        level: "warn",
      },
    );
  let now_2 = Date.now();
  let j = 0;
  let K = 0;
  let ne = null;
  let ie = null;
  let ke = wrapStorageSource(getTranscriptStorageContext(o));
  let Te = w.daemonUp && !w.alive && !w.present && daemonShort_2 === daemonShort;
  if (Te) {
    ne = killOrphanedWorker(daemonShort_2, o);
    ie = resolveJobTranscript(L, S.cwd, S.linkScanPath, undefined, ke);
  } else {
    let M = await killJob(daemonShort_2, u, undefined, o);
    j = Date.now() - now_2;
    if (alive && !M.confirmed) {
      logEvent("tengu_bg_respawn_unconfirmed_bail", {});
      logFeatureSad("job_respawn", "job_respawn_kill_unconfirmed");
      return {
        ok: false,
        alive,
        short: daemonShort_2,
        state: u,
        error:
          M.error ?? "Couldn't stop the previous worker \u2014 supervisor may be starting, retry in a moment",
        errorCode: "kill_unconfirmed",
      };
    }
    let now = Date.now();
    let se = now + 3000;
    while (Date.now() < se) {
      if (!(await isDaemonJobPresent(daemonShort_2))) break;
      await sleep(100);
    }
    K = Date.now() - now;
  }
  let now_3 = Date.now();
  let te = await (ie ?? resolveJobTranscript(L, S.cwd, S.linkScanPath, undefined, ke));
  let $e = Date.now() - now_3;
  if (ne) {
    let now = Date.now();
    let V = await ne;
    j = Date.now() - now;
    if (V.anyMatch) te = await resolveJobTranscript(L, S.cwd, S.linkScanPath, undefined, ke);
  }
  let oe;
  if (!te.hasMessages && S.bgIsolation === "none" && !T && S.linkScanPath === undefined) {
    oe = await readCandidate(dirname(te.path), S.sessionId, o);
    let jobTranscript = await resolveJobTranscript(
      L,
      S.cwd,
      S.linkScanPath,
      {
        crossWorktree: false,
      },
      ke,
    );
    if (jobTranscript.hasMessages) {
      te = jobTranscript;
      oe = undefined;
    }
  }
  let hasMessages = te.hasMessages;
  if (te.via === "projectsScan")
    logEvent("tengu_bg_respawn_probe_rescue", {
      via: fromEnum(te.via),
    });
  let Se = hasMessages || oe !== undefined;
  if (!hasMessages) {
    if (
      oe === undefined &&
      S.bgIsolation === "none" &&
      L === S.sessionId &&
      !n?.force &&
      !n?.forceRefusalRetry
    ) {
      logForDebugging(
        `bg: respawn of ${e} refused \u2014 fork handoff whose own transcript never materialized`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_bg_respawn_no_transcript", {
        via: fromEnum(te.via),
        had_link_scan_path: S.linkScanPath !== undefined,
        quarantined: false,
        refused: true,
      });
      logFeatureSad("job_respawn", "fork_transcript_never_materialized");
      let queued =
        !!n?.initialPrompt && (await queuePromptForJob(jobDir, S, n.initialPrompt, o, n.keepQueuedPrompt));
      return {
        ok: false,
        alive: false,
        state: S,
        queued,
        errorCode: "fork_transcript_never_materialized",
        error: `This session has no saved transcript \u2014 it was stopped before its first response finished. If it was backgrounded from another conversation, that one is still intact; \`claude respawn ${e}\` starts this one fresh.`,
      };
    }
    if (oe === undefined && S.deadEpochReapedAt !== undefined && !n?.force && !P) {
      logForDebugging(`bg: respawn of ${e} refused \u2014 dead-epoch row whose transcript is gone`, {
        level: "warn",
      });
      logEvent("tengu_bg_respawn_no_transcript", {
        via: fromEnum(te.via),
        had_link_scan_path: S.linkScanPath !== undefined,
        quarantined: false,
        refused: true,
      });
      logFeatureSad("job_respawn", "dead_epoch_transcript_gone");
      return {
        ok: false,
        alive: false,
        state: S,
        errorCode: "dead_epoch_transcript_gone",
        error: `This session's saved conversation is no longer on disk (it ended while the background service was off, and old transcripts are cleaned up), so there is nothing to resume. \`claude rm ${e}\` deletes the row; \`claude respawn ${e}\` runs its original prompt again instead.`,
      };
    }
    let quarantined = await quarantineJobTranscript(te.path, ke);
    logEvent("tengu_bg_respawn_no_transcript", {
      via: fromEnum(te.via),
      had_link_scan_path: S.linkScanPath !== undefined,
      quarantined,
      refused: false,
      parked_source: oe !== undefined,
    });
  }
  let intent = u.template === "exec" && u.respawnFlags.length === 0 ? u.intent : undefined;
  let Je =
    S.name && (S.nameSource === "user" || S.nameSource === "collision")
      ? rewriteDispatchFlagValue(S.respawnFlags, "--name", "-n", S.name)
      : undefined;
  let xe = hasMessages && !intent;
  if (xe) {
    let filtered = (await listLiveSessionHolders(L)).filter(
      (se) => !(se.jobId !== undefined && (se.jobId === e || se.jobId === daemonShort_2)),
    );
    let V = filtered.find((se) => se.kind === "interactive") ?? filtered[0];
    if (V) {
      logEvent("tengu_bg_respawn_resume_conflict", {
        holder_kind: fromEnum(V.kind),
      });
      logFeatureSad("job_respawn", "resume_session_live_elsewhere");
      return {
        ok: false,
        alive: false,
        state: S,
        queued:
          !!n?.initialPrompt && (await queuePromptForJob(jobDir, S, n.initialPrompt, o, n.keepQueuedPrompt)),
        error:
          V.kind === "interactive"
            ? SESSION_BUSY_ELSEWHERE_MESSAGE
            : "This conversation is already open in another running Claude session \u2014 use that one, or close it and try again",
        errorCode: "resume_session_live_elsewhere",
      };
    }
  }
  let me = stripEnvironmentFlags(Je ?? S.respawnFlags);
  let Z = intent
    ? []
    : me.length > 0
      ? me
      : u.routine
        ? flagArgs("--routine", u.routine)
        : u.template !== "bg"
          ? flagArgs("--agent", u.template)
          : [];
  let index = Z.findIndex((M) => M === "--agent" || M.startsWith("--agent="));
  let be = index !== -1 && Z[index] === "--agent";
  let Ye = index === -1 ? undefined : be ? Z[index + 1] : Z[index].slice(8);
  if (!Se && Ye) {
    let M = Ye;
    clearAgentDefinitionsCache();
    let V = await listUserAgentTemplates(S.cwd, o).catch(() => {
      return;
    });
    let se = resolveBgAgentTemplate(
      {
        agent: M,
      },
      V,
    ).name;
    if (se !== M)
      Z = be
        ? Z.toSpliced(index, 2, ...flagArgs("--agent", se))
        : Z.toSpliced(index, 1, ...flagArgs("--agent", se));
  }
  let qe = P;
  let Ee = !Se && (n?.forceRefusalRetry === true || (!intent && S.bgIsolation === "none" && !P));
  let Ie = Ee ? randomUUID() : L;
  let we = queuedPromptOrUndefined(S);
  if (we !== S.queuedPrompt)
    logForDebugging(`bg: respawn of ${e} \u2014 the saved reply starts with / or !, so no restart sends it`, {
      level: "warn",
    });
  let ce = intent
    ? undefined
    : n?.keepQueuedPrompt && n.initialPrompt && we
      ? promptMatchesQueued(we, n.initialPrompt)
        ? we
        : `${we}

${n.initialPrompt}`
      : (n?.initialPrompt ?? we ?? (Se || qe || Ee ? undefined : u.intent));
  if (!intent && ce !== undefined && n?.initialPrompt === undefined && we === undefined)
    logEvent("tengu_resume_interrupted_turn", {
      surface: lit("respawn_job"),
      kind: lit("intent_replay"),
    });
  let Ke = oe === undefined && Boolean(n?.replyOnResume) && xe && !ce;
  let Ne = [
    ...(xe ? ["--resume", L] : []),
    ...(oe !== undefined ? ["--resume", oe, "--fork-session"] : []),
    ...(oe !== undefined ? withoutReplyOnResume(Z) : Ke ? withReplyOnResume(Z) : Z),
    ...(ce ? ["--", ce] : []),
  ];
  let bridgeReattachEnv = buildBridgeReattachEnv(
    S.bridgeSessionId,
    S.bridgeSessionSeq,
    S.bridgeOutboundOnly,
    S.bridgeSessionGroupingId,
    {
      ownerAccountUuid: S.bridgeOwnerAccountUuid,
      ownerOrganizationUuid: S.bridgeOwnerOrganizationUuid,
      noHistoryBackfill: S.bridgeNoHistoryBackfill,
    },
  );
  let U = T ? bridgeReattachEnv : attachCarriedPromptHash(getJobDir(e), bridgeReattachEnv);
  if (!n?.force && !n?.forceUnresponsive && u.state !== "stopped") {
    invalidateJobStateCache(jobDir);
    let jobState = await readJobState(jobDir, o);
    if (jobState?.state === "stopped") {
      logForDebugging(`bg: respawn of ${e} bailed \u2014 job was stopped while the respawn was in flight`, {
        level: "warn",
      });
      logFeatureSad("job_respawn", "stopped_during_respawn");
      return {
        ok: false,
        alive: false,
        state: jobState,
        error: `Session ${e} was stopped while the respawn was in flight`,
      };
    }
  }
  let now_4 = Date.now();
  let Le;
  let G = {
    gateway: false,
    lineage: false,
  };
  try {
    G = decodeHostLineage(await readFile(hostManagedEntry(e), "utf8"));
    Le = true;
  } catch (error) {
    if (!isENOENT(error))
      return {
        ok: false,
        alive: false,
        state: u,
        error: `host-managed tombstone unreadable: ${errorMessage(error)}`,
      };
    Le = false;
  }
  let { CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST, ...Be } = u.providerEnv ?? {};
  if (Le) for (let M of PASSTHROUGH_ENV_VARS) delete Be[M];
  let providerEnv = Le
    ? {
        ...Be,
        CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: "1",
        ...(G.gateway && {
          CLAUDE_CODE_USE_GATEWAY: "1",
        }),
        ...(G.lineage && {
          CLAUDE_CODE_HOST_GATEWAY_LINEAGE: "1",
        }),
      }
    : Be;
  let Ze = {
    ...(intent && {
      intent,
      exec: intent,
    }),
    ...(xe && {
      resumeTranscriptPath: te.path,
    }),
    ...(S.name && {
      name: S.name,
      nameSource: S.nameSource,
    }),
    ...(u.bgIsolation === "none" && {
      bgIsolation: "none",
    }),
    providerEnv,
    ...(u.sessionPermissionRules && {
      sessionPermissionRules: u.sessionPermissionRules,
    }),
    ...(u.memoryToggledOff && {
      memoryToggledOff: true,
    }),
    ...(u.autoMemoryOffThisSession && {
      autoMemoryOffThisSession: true,
    }),
    ...(u.forkSourceAlive && {
      forkSourceAlive: true,
      ...(u.forkBoundaryAt && {
        forkBoundaryAt: u.forkBoundaryAt,
      }),
      ...(u.forkSessionId && {
        forkSessionId: u.forkSessionId,
      }),
      ...(u.forkParentSessionId && {
        forkParentSessionId: u.forkParentSessionId,
      }),
    }),
  };
  let pt =
    Ke &&
    !intent &&
    S.state !== "failed" &&
    S.state !== "stopped" &&
    isTerminal(S.state) &&
    !S.routine &&
    (n?.replyOnResume === "turn-owed" || (n?.replyOnResume === "kick-kept" && S.tempo === "active"));
  if (pt) {
    invalidateJobStateCache(jobDir);
    await writeStateAtomic(
      jobDir,
      {
        ...((await readJobState(jobDir, o)) ?? S),
        tempo: "active",
        replayOwed: true,
        updatedAt: new Date().toISOString(),
      },
      o,
    ).catch(logJobWriteError);
  }
  let bgSession = await spawnBgSession(Ne, Ie, "fleet", S.cwd, Ze, U, e, o);
  if (!bgSession.ok && !bgSession.alive && bgSession.reason === "ack_timeout" && Date.now() - now_4 < 2000) {
    logForDebugging(`bg: respawn dispatch fast-failed (${Date.now() - now_4}ms) \u2014 retrying once`, {
      level: "warn",
    });
    await sleep(500);
    bgSession = await spawnBgSession(Ne, Ie, "fleet", S.cwd, Ze, U, e, o);
  }
  if (bgSession.ok) dropCarriedPromptHash(getJobDir(e));
  let mt = Date.now() - now_4;
  let ht = Date.now() - now;
  logForDebugging(
    `[PERF:respawn] ${e}: total=${ht}ms probe=${A}ms kill=${j}ms${Te ? " (ceremony skipped)" : ""} wait=${K}ms transcript=${$e}ms dispatch=${mt}ms ok=${bgSession.ok}`,
  );
  logEvent("tengu_bg_respawn", {
    total_ms: ht,
    probe_ms: A,
    kill_ms: j,
    wait_ms: K,
    transcript_ms: $e,
    dispatch_ms: mt,
    skipped_kill: Te,
    daemon_up: w.daemonUp,
    was_present: w.present,
    forced: n?.force === true || n?.forceRefusalRetry === true || n?.forceUnresponsive === true,
    ok: bgSession.ok,
  });
  if (!bgSession.ok) {
    if (bgSession.alive) logFeatureSad("job_respawn", "already_alive");
    else if (bgSession.reason === "cwd_gone") logFeatureSad("job_respawn", "cwd_gone");
    else logFeatureBad("job_respawn", "job_respawn_spawn_failed");
    let queued =
      !bgSession.alive && n?.initialPrompt
        ? await queuePromptForJob(jobDir, S, n.initialPrompt, o, n.keepQueuedPrompt)
        : false;
    return {
      ok: false,
      error: bgSession.error,
      alive: bgSession.alive ?? false,
      short: bgSession.short,
      state: u,
      queued,
    };
  }
  if (D && !intent) logRestartWithoutSavedState("wake", D);
  logEvent("tengu_bg_agent_action", {
    action: lit("respawn"),
    wasSettled: isSettled(u),
    jobSessionId: sanitizeMarkName(S.sessionId),
  });
  invalidateJobStateCache(jobDir);
  let ae = (await readJobState(jobDir, o)) ?? S;
  if (ae.state === "failed" && ae.updatedAt > S.updatedAt) {
    logFeatureSad("job_respawn", "crashed_during_spawn");
    if (
      ae.reapedMidWorkAt !== undefined ||
      ae.reapedUnsettledAt !== undefined ||
      ae.deadEpochReapedAt !== undefined
    ) {
      let M = {
        ...ae,
        reapedMidWorkAt: undefined,
        reapedUnsettledAt: undefined,
        deadEpochReapedAt: undefined,
      };
      await writeStateAtomic(jobDir, M, o).catch(logJobWriteError);
      return {
        ok: true,
        short: bgSession.short,
        state: M,
      };
    }
    return {
      ok: true,
      short: bgSession.short,
      state: ae,
    };
  }
  let en = ce
    ? {
        ...applyReplyPatch(ae, ce),
        tempo: "active",
        needs: undefined,
        block: undefined,
      }
    : ae;
  let gt =
    Je && S.name
      ? (rewriteDispatchFlagValue(ae.respawnFlags, "--name", "-n", S.name) ?? ae.respawnFlags)
      : undefined;
  let Ve = S.state === "failed" || S.state === "stopped" || !!intent;
  let wt = {
    ...en,
    state: Ve ? "starting" : ce && hasOutstandingAsk(S) ? "working" : S.state,
    reapedMidWorkAt: undefined,
    reapedUnsettledAt: undefined,
    deadEpochReapedAt: undefined,
    ...(ce
      ? {
          inFlight: undefined,
        }
      : {
          ...(!Ve && S.tempo === "active"
            ? isTerminal(S.state) || S.routine
              ? {
                  tempo: "idle",
                }
              : {
                  tempo: "blocked",
                  needs: IDLE_NEEDS,
                  ...(PRE_BOOT_STATES.includes(S.state) && {
                    state: "working",
                  }),
                }
            : {
                tempo: Ve ? "idle" : S.tempo,
              }),
          detail: Ve || Ee ? "" : S.detail,
          ...(Ee && {
            output: null,
          }),
          inFlight: {
            tasks: 0,
            queued: 0,
            kinds: [],
          },
        }),
    ...(Se
      ? {}
      : {
          firstTerminalAt: null,
        }),
    daemonShort: bgSession.short,
    ...(gt && {
      respawnFlags: gt,
    }),
    queuedPrompt: undefined,
    ...(N && {
      sessionId: L,
      resumeSessionId: L,
    }),
    ...(Ee && {
      resumeSessionId: Ie,
      linkScanPath: undefined,
      linkScanOffset: 0,
    }),
    sessionIdTaken: undefined,
    replayOwed: undefined,
    ...(pt &&
      ae.replayOwed === true && {
        tempo: "active",
        replayOwed: true,
      }),
    updatedAt: new Date().toISOString(),
    backend: "daemon",
  };
  await writeStateAtomic(jobDir, wt, o).catch(logJobWriteError);
  logFeatureOk("job_respawn");
  return {
    ok: true,
    short: bgSession.short,
    state: wt,
  };
}
//@ chunk-bg51yd13.js:93057-93114 placement
function isSoftDispatchFailure(reason) {
  return reason === "gate_blocked" || reason === "cwd_gone";
}
//@ chunk-bg51yd13.js:93114-93163 placement
var COPY_ON_CREATE_WRITE_OPTIONS = {
  precondition: {
    type: "ifAbsent",
  },
  mode: 438,
};
//@ chunk-bg51yd13.js:93163-93285 placement
/**
 * 用存储后端算某键的 sha256 摘要（最多读 expected 长度字节），判断是否等于给定摘要。
 */
async function storageDigestMatches(e, n, bytes, digest) {
  let s = await e.digest(n, {
    algorithm: "sha256",
    maxBytes: bytes.length,
  });
  return s.ok && s.value.digest === digest;
}
export {
  isFleetDispatchEnabled,
  claimSpareFromPool,
  discardSpare,
  retireSpare,
  takeSpareHandle,
  markSpareReady,
  respawnBgSession,
  shallowEqualRecords,
  dispatchFromFleetView,
  claimSpare,
  COPY_ON_CREATE_WRITE_OPTIONS,
  storageDigestMatches,
  bgSparePool,
  isSoftDispatchFailure,
};
