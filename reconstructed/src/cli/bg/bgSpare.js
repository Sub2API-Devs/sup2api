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
import { hostManagedEntry } from "../../services/daemon/paths.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

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
function dispatchFromFleetView(intent, requestedSessionId, cwd, storageV5) {
  let sessionId = requestedSessionId ?? randomUUID();
  let sliced = sessionId.slice(0, 8);
  let workingDir = cwd ?? getCwd();
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
            intent,
            providerEnv: callerProviderEnv(),
            sessionId,
            cwd: workingDir,
            originCwd: workingDir,
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
        sessionId,
        "fleet",
        workingDir,
        {
          intent,
          exec: intent,
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
        sessionId,
      };
    })(),
  );
}
//@ chunk-bg51yd13.js:78441-78606 placement
/**
 * 浅比较两个对象：同引用为真；任一为空为假；否则比较两边全部键的值是否严格相等。
 */
function shallowEqualRecords(defaults, other) {
  if (defaults === other) return true;
  if (!defaults || !other) return false;
  let keys = new Set([...Object.keys(defaults), ...Object.keys(other)]);
  for (let key of keys) {
    let name = key;
    if (defaults[name] !== other[name]) return false;
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
  setExtraArgs(args) {
    this.#e = args;
    this.#t = args.includes("--restricted") ? args : ["--restricted", ...args];
  }
  markReady(sessionId) {
    if (this.spare?.sessionId === sessionId) this.spare.ready = true;
  }
  take() {
    let spare = this.spare;
    this.spare = null;
    return spare;
  }
  async ensure(rootDir, unDiscard, dispatchDefaults, agentTemplates, storage) {
    if (isTerminalShutdown()) return;
    if (unDiscard) this.discarded = false;
    if (!this.spare && this.ensuring) {
      await this.ensuring.catch(() => {});
      if (!this.spare) return;
    }
    let rebootReason;
    if (this.spare) {
      if (!arraysEqual(this.spare.extraArgs, this.extraArgs)) rebootReason = "extra_args_mismatch_reboot";
      else if (dispatchDefaults !== undefined && !shallowEqualRecords(this.spare.defaults, dispatchDefaults))
        rebootReason = "defaults_mismatch_reboot";
    }
    if (rebootReason !== undefined) {
      logFeatureSad("job_spare_ensure", rebootReason);
      let stale = this.take();
      if (stale)
        await deleteJob(
          stale.jobId,
          {
            internal: true,
          },
          storage,
        ).catch(() => {});
    }
    if (this.spare || this.ensuring || this.discarded) return;
    if (isLowMemory()) {
      logFeatureSad("job_spare_ensure", "low_mem");
      return;
    }
    let sessionId = randomUUID();
    let sliced = sessionId.slice(0, 8);
    let generation = this.generation;
    logForDebugging(`[PERF:bg-spare-start] ${sliced}`);
    this.ensuring = (async () => {
      try {
        let realRoot = await canonicalizePath(rootDir, getRealPathOptions(storage));
        let templates = agentTemplates;
        if (templates === undefined && dispatchDefaults?.agent) {
          clearAgentDefinitionsCache();
          templates = await listUserAgentTemplates(realRoot, storage).catch(() => []);
        }
        let agentName = resolveBgAgentTemplate(dispatchDefaults, templates).name;
        let extraArgs = this.extraArgs;
        let bgSession = await spawnBgSession(
          [...extraArgs, ...flagArgs("--agent", agentName), ...buildDispatchArgs(dispatchDefaults)],
          sessionId,
          "spare",
          realRoot,
          undefined,
          undefined,
          undefined,
          storage,
        );
        if (!bgSession.ok) {
          await deleteJob(
            sliced,
            {
              internal: true,
            },
            storage,
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
            storage,
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
            storage,
          ).catch(() => {});
          logFeatureSad("job_spare_ensure", "retired_after_spawn");
          return;
        }
        this.spare = {
          jobId: sliced,
          sessionId,
          cwd: realRoot,
          ready: false,
          defaults: dispatchDefaults,
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
          storage,
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
  retire(storage) {
    this.generation++;
    let spare = this.take();
    if (spare)
      deleteJob(
        spare.jobId,
        {
          internal: true,
        },
        storage,
      ).catch(() => {});
  }
  async discard(storage) {
    this.discarded = true;
    if (this.ensuring) await this.ensuring.catch(() => {});
    let spare = this.take();
    if (spare)
      await deleteJob(
        spare.jobId,
        {
          internal: true,
        },
        storage,
      );
  }
}
//@ chunk-bg51yd13.js:80725-80750 placement
var BG_SPARE_POOL_SLOT; // deferred: uses BgSparePool of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-bg51yd13.js:80725", () => {
  BG_SPARE_POOL_SLOT = new HostScoped(() => new BgSparePool());
});
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
function claimSpareFromPool(rootDir, immediate = false, dispatchDefaults, agentTemplates, storageV5) {
  return bgSparePool().ensure(rootDir, immediate, dispatchDefaults, agentTemplates, storageV5);
}
//@ chunk-bg51yd13.js:80911-82083 placement
/**
 * 认领备用进程启动会话，未命中时记录原因并回退。
 */
async function claimSpare(intent, templateOverride, storage) {
  logForDebugging("[PERF:bg-claim-start]");
  let pool = bgSparePool();
  let spare = pool.take();
  let template = templateOverride ?? resolveBgAgentTemplate(spare?.defaults);
  let miss = async (reason, detail) => {
    logForDebugging(`[bg-spare] claim miss (${reason})${detail ? `: ${detail}` : ""}`);
    logEvent("tengu_bg_spare_claim_fail", {
      reason: fromEnum(reason),
    });
    if (spare) {
      let deleteResult = await deleteJob(
        spare.jobId,
        {
          internal: true,
          knownGone: reason === "enojob",
        },
        storage,
      );
      if (!deleteResult.removed) {
        logFeatureBad("job_claim_spare", "job_claim_spare_delete_failed");
        logForDebugging(
          `[bg-spare] deleteJob unconfirmed (${deleteResult.error ?? "unknown"}) \u2014 cold-dispatching with fresh sessionId; spare ${spare.jobId} dir preserved`,
          {
            level: "warn",
          },
        );
      } else logFeatureSad("job_claim_spare", reason);
    } else logFeatureSad("job_claim_spare", reason);
    return dispatchBgSessionTracked(
      template,
      intent,
      {
        targetCwd: spare?.cwd,
        defaults: spare?.defaults,
      },
      storage,
    );
  };
  if (!spare) return miss("no-spare");
  if (!arraysEqual(spare.extraArgs, pool.extraArgs)) return miss("stale-argv");
  let state = applyReplyPatch(
    makeInitialState({
      template,
      respawnFlags: [
        ...bgSparePool().extraArgs,
        ...flagArgs("--agent", template.name),
        ...buildDispatchArgs(spare.defaults),
      ],
      intent,
      providerEnv: callerProviderEnv(),
      sessionId: spare.sessionId,
      cwd: spare.cwd,
      originCwd: spare.cwd,
    }),
    intent,
  );
  try {
    let replyFailure = await replyToJob(spare.jobId, intent, undefined, state, undefined, storage);
    if (replyFailure)
      return miss(replyFailure.err === REPLY_ENOJOB_MSG ? "enojob" : "reply", replyFailure.err);
  } catch (error) {
    return miss("reply-throw", errorMessage(error));
  }
  await writeStateAtomic(getJobDir(spare.jobId), state, storage).catch(logJobWriteError);
  logForDebugging("[PERF:bg-claim-end]");
  logFeatureOk("job_claim_spare");
  logFeatureOk("fleet_view_dispatch");
  return {
    ok: true,
    jobId: spare.jobId,
    sessionId: spare.sessionId,
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
function retireSpare(storage) {
  bgSparePool().retire(storage);
}
//@ chunk-bg51yd13.js:82153-93057 placement
/**
 * 重启后台会话（等待进行中的启动、迁移到可附着 PTY 等，约 11 KB）。
 */
async function respawnBgSession(jobId, options, storage) {
  let jobDir = getJobDir(jobId);
  let knownState = options?.knownState;
  let inFlightDispatch = getInFlightDispatch(jobId);
  if (inFlightDispatch) {
    logForDebugging(`bg: respawn of ${jobId} waiting on its in-flight spawn`);
    let inFlightResult = await inFlightDispatch;
    invalidateJobStateCache(jobDir);
    knownState = undefined;
    if (!inFlightResult.ok && !inFlightResult.alive) {
      logFeatureSad("job_respawn", "in_flight_spawn_failed");
      let jobState = await readJobState(jobDir, storage);
      let queued =
        !!options?.initialPrompt &&
        jobState !== null &&
        (await queuePromptForJob(jobDir, jobState, options.initialPrompt, storage, options.keepQueuedPrompt));
      return {
        ok: false,
        alive: false,
        state: jobState ?? options?.knownState,
        queued,
        error: inFlightResult.error,
      };
    }
  }
  let originalState = knownState ?? (await readJobState(jobDir, storage));
  if (!originalState) {
    logFeatureBad("job_respawn", "job_respawn_state_missing");
    return {
      ok: false,
      error: "Can't respawn \u2014 that job's saved state is missing",
      alive: false,
    };
  }
  let daemonShort = originalState.daemonShort ?? jobId;
  let now = Date.now();
  let probe = await probeDaemonJob(daemonShort, storage);
  let probeMs = Date.now() - now;
  let alive = probe.alive;
  if (!options?.force && !options?.forceUnresponsive && alive)
    return {
      ok: false,
      alive: true,
      short: daemonShort,
      state: originalState,
      error: `Session ${jobId} is already running`,
    };
  if (!options?.force && isExecLaunch(originalState)) {
    if (probe.daemonUp && probe.present)
      return {
        ok: false,
        alive: true,
        short: daemonShort,
        state: originalState,
        error: `Session ${jobId} has exited; attach shows the captured output`,
      };
    logFeatureSad("job_respawn", "exec_output_expired");
    return {
      ok: false,
      alive: false,
      state: originalState,
      error: "Output no longer available \u2014 this shell command has exited",
    };
  }
  if (knownState) invalidateJobStateCache(jobDir);
  let freshState = knownState ? await readJobState(jobDir, storage) : originalState;
  let probedState = freshState === null ? await probeJobState(jobDir, storage) : undefined;
  let state = freshState ?? originalState;
  let daemonShort_2 = state.daemonShort ?? jobId;
  let trust = checkWorkspaceTrust(state.cwd);
  if (trust.verdict === "untrusted") {
    logFeatureSad("job_respawn", "workspace_untrusted", ...gateCauseExtra(workspaceGateCause(trust)));
    let queued =
      !!options?.initialPrompt &&
      (await queuePromptForJob(jobDir, state, options.initialPrompt, storage, options.keepQueuedPrompt));
    return {
      ok: false,
      alive: false,
      state,
      queued,
      errorCode: "workspace_untrusted",
      error: formatWorkspaceUntrusted(trust),
    };
  }
  let isResumingOtherSession =
    state.resumeSessionId !== undefined && state.resumeSessionId !== state.sessionId;
  let isUpgraded = state.cliVersion !== undefined || isResumingOtherSession;
  let isSessionIdTaken = state.sessionIdTaken === true && !isUpgraded;
  let resumeSessionId = isSessionIdTaken
    ? randomUUID()
    : (state.resumeSessionId ??
      (normalizeUuidOrNull(state.sessionId) !== null ? state.sessionId : randomUUID()));
  if (isSessionIdTaken)
    logForDebugging(
      `bg: respawn of ${jobId} \u2014 session id was taken by another conversation; starting under a fresh id`,
      {
        level: "warn",
      },
    );
  let now_2 = Date.now();
  let killMs = 0;
  let waitMs = 0;
  let orphanKill = null;
  let transcript = null;
  let storageSource = wrapStorageSource(getTranscriptStorageContext(storage));
  let canSkipCeremony = probe.daemonUp && !probe.alive && !probe.present && daemonShort_2 === daemonShort;
  if (canSkipCeremony) {
    orphanKill = killOrphanedWorker(daemonShort_2, storage);
    transcript = resolveJobTranscript(
      resumeSessionId,
      state.cwd,
      state.linkScanPath,
      undefined,
      storageSource,
    );
  } else {
    let killResult = await killJob(daemonShort_2, originalState, undefined, storage);
    killMs = Date.now() - now_2;
    if (alive && !killResult.confirmed) {
      logEvent("tengu_bg_respawn_unconfirmed_bail", {});
      logFeatureSad("job_respawn", "job_respawn_kill_unconfirmed");
      return {
        ok: false,
        alive,
        short: daemonShort_2,
        state: originalState,
        error:
          killResult.error ??
          "Couldn't stop the previous worker \u2014 supervisor may be starting, retry in a moment",
        errorCode: "kill_unconfirmed",
      };
    }
    let now = Date.now();
    let deadline = now + 3000;
    while (Date.now() < deadline) {
      if (!(await isDaemonJobPresent(daemonShort_2))) break;
      await sleep(100);
    }
    waitMs = Date.now() - now;
  }
  let now_3 = Date.now();
  let resolvedTranscript = await (transcript ??
    resolveJobTranscript(resumeSessionId, state.cwd, state.linkScanPath, undefined, storageSource));
  let transcriptMs = Date.now() - now_3;
  if (orphanKill) {
    let now = Date.now();
    let orphanResult = await orphanKill;
    killMs = Date.now() - now;
    if (orphanResult.anyMatch)
      resolvedTranscript = await resolveJobTranscript(
        resumeSessionId,
        state.cwd,
        state.linkScanPath,
        undefined,
        storageSource,
      );
  }
  let heldBackSessionId;
  if (
    !resolvedTranscript.hasMessages &&
    state.bgIsolation === "none" &&
    !isUpgraded &&
    state.linkScanPath === undefined
  ) {
    heldBackSessionId = await readCandidate(dirname(resolvedTranscript.path), state.sessionId, storage);
    let jobTranscript = await resolveJobTranscript(
      resumeSessionId,
      state.cwd,
      state.linkScanPath,
      {
        crossWorktree: false,
      },
      storageSource,
    );
    if (jobTranscript.hasMessages) {
      resolvedTranscript = jobTranscript;
      heldBackSessionId = undefined;
    }
  }
  let hasMessages = resolvedTranscript.hasMessages;
  if (resolvedTranscript.via === "projectsScan")
    logEvent("tengu_bg_respawn_probe_rescue", {
      via: fromEnum(resolvedTranscript.via),
    });
  let hasReplaySource = hasMessages || heldBackSessionId !== undefined;
  if (!hasMessages) {
    if (
      heldBackSessionId === undefined &&
      state.bgIsolation === "none" &&
      resumeSessionId === state.sessionId &&
      !options?.force &&
      !options?.forceRefusalRetry
    ) {
      logForDebugging(
        `bg: respawn of ${jobId} refused \u2014 fork handoff whose own transcript never materialized`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_bg_respawn_no_transcript", {
        via: fromEnum(resolvedTranscript.via),
        had_link_scan_path: state.linkScanPath !== undefined,
        quarantined: false,
        refused: true,
      });
      logFeatureSad("job_respawn", "fork_transcript_never_materialized");
      let queued =
        !!options?.initialPrompt &&
        (await queuePromptForJob(jobDir, state, options.initialPrompt, storage, options.keepQueuedPrompt));
      return {
        ok: false,
        alive: false,
        state,
        queued,
        errorCode: "fork_transcript_never_materialized",
        error: `This session has no saved transcript \u2014 it was stopped before its first response finished. If it was backgrounded from another conversation, that one is still intact; \`claude respawn ${jobId}\` starts this one fresh.`,
      };
    }
    if (
      heldBackSessionId === undefined &&
      state.deadEpochReapedAt !== undefined &&
      !options?.force &&
      !isResumingOtherSession
    ) {
      logForDebugging(`bg: respawn of ${jobId} refused \u2014 dead-epoch row whose transcript is gone`, {
        level: "warn",
      });
      logEvent("tengu_bg_respawn_no_transcript", {
        via: fromEnum(resolvedTranscript.via),
        had_link_scan_path: state.linkScanPath !== undefined,
        quarantined: false,
        refused: true,
      });
      logFeatureSad("job_respawn", "dead_epoch_transcript_gone");
      return {
        ok: false,
        alive: false,
        state,
        errorCode: "dead_epoch_transcript_gone",
        error: `This session's saved conversation is no longer on disk (it ended while the background service was off, and old transcripts are cleaned up), so there is nothing to resume. \`claude rm ${jobId}\` deletes the row; \`claude respawn ${jobId}\` runs its original prompt again instead.`,
      };
    }
    let quarantined = await quarantineJobTranscript(resolvedTranscript.path, storageSource);
    logEvent("tengu_bg_respawn_no_transcript", {
      via: fromEnum(resolvedTranscript.via),
      had_link_scan_path: state.linkScanPath !== undefined,
      quarantined,
      refused: false,
      parked_source: heldBackSessionId !== undefined,
    });
  }
  let intent =
    originalState.template === "exec" && originalState.respawnFlags.length === 0
      ? originalState.intent
      : undefined;
  let nameFlags =
    state.name && (state.nameSource === "user" || state.nameSource === "collision")
      ? rewriteDispatchFlagValue(state.respawnFlags, "--name", "-n", state.name)
      : undefined;
  let willResume = hasMessages && !intent;
  if (willResume) {
    let filtered = (await listLiveSessionHolders(resumeSessionId)).filter(
      (holder) => !(holder.jobId !== undefined && (holder.jobId === jobId || holder.jobId === daemonShort_2)),
    );
    let conflictHolder = filtered.find((holder) => holder.kind === "interactive") ?? filtered[0];
    if (conflictHolder) {
      logEvent("tengu_bg_respawn_resume_conflict", {
        holder_kind: fromEnum(conflictHolder.kind),
      });
      logFeatureSad("job_respawn", "resume_session_live_elsewhere");
      return {
        ok: false,
        alive: false,
        state,
        queued:
          !!options?.initialPrompt &&
          (await queuePromptForJob(jobDir, state, options.initialPrompt, storage, options.keepQueuedPrompt)),
        error:
          conflictHolder.kind === "interactive"
            ? SESSION_BUSY_ELSEWHERE_MESSAGE
            : "This conversation is already open in another running Claude session \u2014 use that one, or close it and try again",
        errorCode: "resume_session_live_elsewhere",
      };
    }
  }
  let respawnArgs = stripEnvironmentFlags(nameFlags ?? state.respawnFlags);
  let flagArgsList = intent
    ? []
    : respawnArgs.length > 0
      ? respawnArgs
      : originalState.routine
        ? flagArgs("--routine", originalState.routine)
        : originalState.template !== "bg"
          ? flagArgs("--agent", originalState.template)
          : [];
  let index = flagArgsList.findIndex((arg) => arg === "--agent" || arg.startsWith("--agent="));
  let isAgentValueSeparate = index !== -1 && flagArgsList[index] === "--agent";
  let agentName =
    index === -1 ? undefined : isAgentValueSeparate ? flagArgsList[index + 1] : flagArgsList[index].slice(8);
  if (!hasReplaySource && agentName) {
    let requestedAgent = agentName;
    clearAgentDefinitionsCache();
    let templates = await listUserAgentTemplates(state.cwd, storage).catch(() => {
      return;
    });
    let resolvedAgent = resolveBgAgentTemplate(
      {
        agent: requestedAgent,
      },
      templates,
    ).name;
    if (resolvedAgent !== requestedAgent)
      flagArgsList = isAgentValueSeparate
        ? flagArgsList.toSpliced(index, 2, ...flagArgs("--agent", resolvedAgent))
        : flagArgsList.toSpliced(index, 1, ...flagArgs("--agent", resolvedAgent));
  }
  let isOtherSessionResume = isResumingOtherSession;
  let isFreshStart =
    !hasReplaySource &&
    (options?.forceRefusalRetry === true ||
      (!intent && state.bgIsolation === "none" && !isResumingOtherSession));
  let newSessionId = isFreshStart ? randomUUID() : resumeSessionId;
  let queuedPrompt = queuedPromptOrUndefined(state);
  if (queuedPrompt !== state.queuedPrompt)
    logForDebugging(
      `bg: respawn of ${jobId} \u2014 the saved reply starts with / or !, so no restart sends it`,
      {
        level: "warn",
      },
    );
  let prompt = intent
    ? undefined
    : options?.keepQueuedPrompt && options.initialPrompt && queuedPrompt
      ? promptMatchesQueued(queuedPrompt, options.initialPrompt)
        ? queuedPrompt
        : `${queuedPrompt}

${options.initialPrompt}`
      : (options?.initialPrompt ??
        queuedPrompt ??
        (hasReplaySource || isOtherSessionResume || isFreshStart ? undefined : originalState.intent));
  if (!intent && prompt !== undefined && options?.initialPrompt === undefined && queuedPrompt === undefined)
    logEvent("tengu_resume_interrupted_turn", {
      surface: lit("respawn_job"),
      kind: lit("intent_replay"),
    });
  let shouldReplyOnResume =
    heldBackSessionId === undefined && Boolean(options?.replyOnResume) && willResume && !prompt;
  let childArgs = [
    ...(willResume ? ["--resume", resumeSessionId] : []),
    ...(heldBackSessionId !== undefined ? ["--resume", heldBackSessionId, "--fork-session"] : []),
    ...(heldBackSessionId !== undefined
      ? withoutReplyOnResume(flagArgsList)
      : shouldReplyOnResume
        ? withReplyOnResume(flagArgsList)
        : flagArgsList),
    ...(prompt ? ["--", prompt] : []),
  ];
  let bridgeReattachEnv = buildBridgeReattachEnv(
    state.bridgeSessionId,
    state.bridgeSessionSeq,
    state.bridgeOutboundOnly,
    state.bridgeSessionGroupingId,
    {
      ownerAccountUuid: state.bridgeOwnerAccountUuid,
      ownerOrganizationUuid: state.bridgeOwnerOrganizationUuid,
      noHistoryBackfill: state.bridgeNoHistoryBackfill,
    },
  );
  let reattachEnv = isUpgraded
    ? bridgeReattachEnv
    : attachCarriedPromptHash(getJobDir(jobId), bridgeReattachEnv);
  if (!options?.force && !options?.forceUnresponsive && originalState.state !== "stopped") {
    invalidateJobStateCache(jobDir);
    let jobState = await readJobState(jobDir, storage);
    if (jobState?.state === "stopped") {
      logForDebugging(
        `bg: respawn of ${jobId} bailed \u2014 job was stopped while the respawn was in flight`,
        {
          level: "warn",
        },
      );
      logFeatureSad("job_respawn", "stopped_during_respawn");
      return {
        ok: false,
        alive: false,
        state: jobState,
        error: `Session ${jobId} was stopped while the respawn was in flight`,
      };
    }
  }
  let now_4 = Date.now();
  let hasTombstone;
  let lineage = {
    gateway: false,
    lineage: false,
  };
  try {
    lineage = decodeHostLineage(await readFile(hostManagedEntry(jobId), "utf8"));
    hasTombstone = true;
  } catch (error) {
    if (!isENOENT(error))
      return {
        ok: false,
        alive: false,
        state: originalState,
        error: `host-managed tombstone unreadable: ${errorMessage(error)}`,
      };
    hasTombstone = false;
  }
  let { CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST, ...passthroughEnv } = originalState.providerEnv ?? {};
  if (hasTombstone) for (let name of PASSTHROUGH_ENV_VARS) delete passthroughEnv[name];
  let providerEnv = hasTombstone
    ? {
        ...passthroughEnv,
        CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: "1",
        ...(lineage.gateway && {
          CLAUDE_CODE_USE_GATEWAY: "1",
        }),
        ...(lineage.lineage && {
          CLAUDE_CODE_HOST_GATEWAY_LINEAGE: "1",
        }),
      }
    : passthroughEnv;
  let launchOptions = {
    ...(intent && {
      intent,
      exec: intent,
    }),
    ...(willResume && {
      resumeTranscriptPath: resolvedTranscript.path,
    }),
    ...(state.name && {
      name: state.name,
      nameSource: state.nameSource,
    }),
    ...(originalState.bgIsolation === "none" && {
      bgIsolation: "none",
    }),
    providerEnv,
    ...(originalState.sessionPermissionRules && {
      sessionPermissionRules: originalState.sessionPermissionRules,
    }),
    ...(originalState.memoryToggledOff && {
      memoryToggledOff: true,
    }),
    ...(originalState.autoMemoryOffThisSession && {
      autoMemoryOffThisSession: true,
    }),
    ...(originalState.forkSourceAlive && {
      forkSourceAlive: true,
      ...(originalState.forkBoundaryAt && {
        forkBoundaryAt: originalState.forkBoundaryAt,
      }),
      ...(originalState.forkSessionId && {
        forkSessionId: originalState.forkSessionId,
      }),
      ...(originalState.forkParentSessionId && {
        forkParentSessionId: originalState.forkParentSessionId,
      }),
    }),
  };
  let shouldReplayOwed =
    shouldReplyOnResume &&
    !intent &&
    state.state !== "failed" &&
    state.state !== "stopped" &&
    isTerminal(state.state) &&
    !state.routine &&
    (options?.replyOnResume === "turn-owed" ||
      (options?.replyOnResume === "kick-kept" && state.tempo === "active"));
  if (shouldReplayOwed) {
    invalidateJobStateCache(jobDir);
    await writeStateAtomic(
      jobDir,
      {
        ...((await readJobState(jobDir, storage)) ?? state),
        tempo: "active",
        replayOwed: true,
        updatedAt: new Date().toISOString(),
      },
      storage,
    ).catch(logJobWriteError);
  }
  let bgSession = await spawnBgSession(
    childArgs,
    newSessionId,
    "fleet",
    state.cwd,
    launchOptions,
    reattachEnv,
    jobId,
    storage,
  );
  if (!bgSession.ok && !bgSession.alive && bgSession.reason === "ack_timeout" && Date.now() - now_4 < 2000) {
    logForDebugging(`bg: respawn dispatch fast-failed (${Date.now() - now_4}ms) \u2014 retrying once`, {
      level: "warn",
    });
    await sleep(500);
    bgSession = await spawnBgSession(
      childArgs,
      newSessionId,
      "fleet",
      state.cwd,
      launchOptions,
      reattachEnv,
      jobId,
      storage,
    );
  }
  if (bgSession.ok) dropCarriedPromptHash(getJobDir(jobId));
  let dispatchMs = Date.now() - now_4;
  let totalMs = Date.now() - now;
  logForDebugging(
    `[PERF:respawn] ${jobId}: total=${totalMs}ms probe=${probeMs}ms kill=${killMs}ms${canSkipCeremony ? " (ceremony skipped)" : ""} wait=${waitMs}ms transcript=${transcriptMs}ms dispatch=${dispatchMs}ms ok=${bgSession.ok}`,
  );
  logEvent("tengu_bg_respawn", {
    total_ms: totalMs,
    probe_ms: probeMs,
    kill_ms: killMs,
    wait_ms: waitMs,
    transcript_ms: transcriptMs,
    dispatch_ms: dispatchMs,
    skipped_kill: canSkipCeremony,
    daemon_up: probe.daemonUp,
    was_present: probe.present,
    forced:
      options?.force === true || options?.forceRefusalRetry === true || options?.forceUnresponsive === true,
    ok: bgSession.ok,
  });
  if (!bgSession.ok) {
    if (bgSession.alive) logFeatureSad("job_respawn", "already_alive");
    else if (bgSession.reason === "cwd_gone") logFeatureSad("job_respawn", "cwd_gone");
    else logFeatureBad("job_respawn", "job_respawn_spawn_failed");
    let queued =
      !bgSession.alive && options?.initialPrompt
        ? await queuePromptForJob(jobDir, state, options.initialPrompt, storage, options.keepQueuedPrompt)
        : false;
    return {
      ok: false,
      error: bgSession.error,
      alive: bgSession.alive ?? false,
      short: bgSession.short,
      state: originalState,
      queued,
    };
  }
  if (probedState && !intent) logRestartWithoutSavedState("wake", probedState);
  logEvent("tengu_bg_agent_action", {
    action: lit("respawn"),
    wasSettled: isSettled(originalState),
    jobSessionId: sanitizeMarkName(state.sessionId),
  });
  invalidateJobStateCache(jobDir);
  let latestState = (await readJobState(jobDir, storage)) ?? state;
  if (latestState.state === "failed" && latestState.updatedAt > state.updatedAt) {
    logFeatureSad("job_respawn", "crashed_during_spawn");
    if (
      latestState.reapedMidWorkAt !== undefined ||
      latestState.reapedUnsettledAt !== undefined ||
      latestState.deadEpochReapedAt !== undefined
    ) {
      let clearedState = {
        ...latestState,
        reapedMidWorkAt: undefined,
        reapedUnsettledAt: undefined,
        deadEpochReapedAt: undefined,
      };
      await writeStateAtomic(jobDir, clearedState, storage).catch(logJobWriteError);
      return {
        ok: true,
        short: bgSession.short,
        state: clearedState,
      };
    }
    return {
      ok: true,
      short: bgSession.short,
      state: latestState,
    };
  }
  let patchedState = prompt
    ? {
        ...applyReplyPatch(latestState, prompt),
        tempo: "active",
        needs: undefined,
        block: undefined,
      }
    : latestState;
  let renamedFlags =
    nameFlags && state.name
      ? (rewriteDispatchFlagValue(latestState.respawnFlags, "--name", "-n", state.name) ??
        latestState.respawnFlags)
      : undefined;
  let isRestarting = state.state === "failed" || state.state === "stopped" || !!intent;
  let nextState = {
    ...patchedState,
    state: isRestarting ? "starting" : prompt && hasOutstandingAsk(state) ? "working" : state.state,
    reapedMidWorkAt: undefined,
    reapedUnsettledAt: undefined,
    deadEpochReapedAt: undefined,
    ...(prompt
      ? {
          inFlight: undefined,
        }
      : {
          ...(!isRestarting && state.tempo === "active"
            ? isTerminal(state.state) || state.routine
              ? {
                  tempo: "idle",
                }
              : {
                  tempo: "blocked",
                  needs: IDLE_NEEDS,
                  ...(PRE_BOOT_STATES.includes(state.state) && {
                    state: "working",
                  }),
                }
            : {
                tempo: isRestarting ? "idle" : state.tempo,
              }),
          detail: isRestarting || isFreshStart ? "" : state.detail,
          ...(isFreshStart && {
            output: null,
          }),
          inFlight: {
            tasks: 0,
            queued: 0,
            kinds: [],
          },
        }),
    ...(hasReplaySource
      ? {}
      : {
          firstTerminalAt: null,
        }),
    daemonShort: bgSession.short,
    ...(renamedFlags && {
      respawnFlags: renamedFlags,
    }),
    queuedPrompt: undefined,
    ...(isSessionIdTaken && {
      sessionId: resumeSessionId,
      resumeSessionId,
    }),
    ...(isFreshStart && {
      resumeSessionId: newSessionId,
      linkScanPath: undefined,
      linkScanOffset: 0,
    }),
    sessionIdTaken: undefined,
    replayOwed: undefined,
    ...(shouldReplayOwed &&
      latestState.replayOwed === true && {
        tempo: "active",
        replayOwed: true,
      }),
    updatedAt: new Date().toISOString(),
    backend: "daemon",
  };
  await writeStateAtomic(jobDir, nextState, storage).catch(logJobWriteError);
  logFeatureOk("job_respawn");
  return {
    ok: true,
    short: bgSession.short,
    state: nextState,
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
async function storageDigestMatches(storage, key, bytes, digest) {
  let result = await storage.digest(key, {
    algorithm: "sha256",
    maxBytes: bytes.length,
  });
  return result.ok && result.value.digest === digest;
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
