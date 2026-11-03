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
import { randomUUID, randomUUID as randomUUID_2 } from "crypto";
import { rm, rm as rm_2, readFile } from "fs/promises";
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
import { trackBgDispatch, bt, checkWorkspaceTrust, formatWorkspaceUntrusted } from "./bgDispatch.js";
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
import { xT } from "../../services/daemon/relaunchArgs.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { logEvent } from "../../services/analytics/index.js";
import { queuePromptForJob, imt, vho } from "../../services/daemon/spawnLauncher.js";
import { qXe, YXe } from "../../services/daemon/reapJobs.js";
import { Vt } from "../../utils/agentId.js";
import { sleep } from "../../utils/sleep.js";
import { readCandidate } from "../../utils/listSessionsImpl.js";
import { listLiveSessionHolders, SESSION_BUSY_ELSEWHERE_MESSAGE } from "../../utils/sessionAttach.js";
import { stripEnvironmentFlags } from "../cloudSessionArgs.js";
import { withoutReplyOnResume, withReplyOnResume } from "../forwardedFlags.js";
import { pBn, mBn } from "../../utils/background/envCarry.js";
import { decodeHostLineage } from "../../services/daemon/ensureDaemon.js";
import { ePe } from "../../utils/sandbox/userNamespace.js";
import { ye } from "../../utils/startupMarks.js";

//@ chunk-bg51yd13.js:77499-77535 placement = addSlowOperation (0.33)
var addSlowOperation = { name: "exec", description: "" };
//@ chunk-bg51yd13.js:77535-77559 placement
function nmt() {
  return !0;
}
/**
 * Fleet 视图中派发任务：创建作业状态、启动会话。
 */
//@ chunk-bg51yd13.js:77559-78441 placement
function dispatchFromFleetView(e, n, o, r) {
  let s = n ?? randomUUID(),
    sliced = s.slice(0, 8),
    u = o ?? getCwd(),
    y = getJobDir(sliced);
  return trackBgDispatch(
    sliced,
    (async () => {
      try {
        (await ensureJobTmpFolder(sliced, r),
          await writeStateAtomic(
            y,
            makeInitialState({
              template: addSlowOperation,
              intent: e,
              providerEnv: callerProviderEnv(),
              sessionId: s,
              cwd: u,
              originCwd: u,
            }),
            r,
          ));
      } catch (error) {
        return (
          await rm(y, { recursive: !0, force: !0 }).catch(() => {}),
          invalidateJobStateCache(y),
          logFeatureBad("fleet_view_dispatch_exec", "state_write_failed", {
            errno: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
          }),
          { ok: !1, error: `Couldn't create the job \u2014 ${errorMessage(error)}` }
        );
      }
      let p = await spawnBgSession([], s, "fleet", u, { intent: e, exec: e }, void 0, void 0, r);
      if (!p.ok) {
        if (p.alive)
          return (
            logFeatureSad("fleet_view_dispatch_exec", "alive_collision"),
            { ok: !1, error: p.error, alive: !0 }
          );
        return (
          await killJob(sliced, void 0, void 0, r).catch(() => {}),
          await rm(y, { recursive: !0, force: !0 }).catch(() => {}),
          invalidateJobStateCache(y),
          (p.reason === "cwd_gone" ? logFeatureSad : logFeatureBad)(
            "fleet_view_dispatch_exec",
            p.reason ?? "spawn_failed",
          ),
          { ok: !1, error: p.error, reason: p.reason }
        );
      }
      return (logFeatureOk("fleet_view_dispatch_exec"), { ok: !0, jobId: p.short, sessionId: s });
    })(),
  );
}
/**
 * 浅比较两个对象：同引用为真；任一为空为假；否则比较两边全部键的值是否严格相等。
 */
//@ chunk-bg51yd13.js:78441-78606 placement
function shallowEqualRecords(e, n) {
  if (e === n) return !0;
  if (!e || !n) return !1;
  let o = new Set([...Object.keys(e), ...Object.keys(n)]);
  for (let r of o) {
    let s = r;
    if (e[s] !== n[s]) return !1;
  }
  return !0;
}
/**
 * 维护一个预热的备用 claude 进程（参数/默认值变化时重启）。
 */
//@ chunk-bg51yd13.js:78606-80725 placement
class BgSparePool {
  spare = null;
  ensuring = null;
  discarded = !1;
  generation = 0;
  #e = [];
  #t = ["--restricted"];
  get extraArgs() {
    return isRestrictedSession() ? this.#t : this.#e;
  }
  setExtraArgs(e) {
    ((this.#e = e), (this.#t = e.includes("--restricted") ? e : ["--restricted", ...e]));
  }
  markReady(e) {
    if (this.spare?.sessionId === e) this.spare.ready = !0;
  }
  take() {
    let spare = this.spare;
    return ((this.spare = null), spare);
  }
  async ensure(e, n, o, r, s) {
    if (isTerminalShutdown()) return;
    if (n) this.discarded = !1;
    if (!this.spare && this.ensuring) {
      if ((await this.ensuring.catch(() => {}), !this.spare)) return;
    }
    let l;
    if (this.spare) {
      if (!arraysEqual(this.spare.extraArgs, this.extraArgs)) l = "extra_args_mismatch_reboot";
      else if (o !== void 0 && !shallowEqualRecords(this.spare.defaults, o)) l = "defaults_mismatch_reboot";
    }
    if (l !== void 0) {
      logFeatureSad("job_spare_ensure", l);
      let take = this.take();
      if (take) await deleteJob(take.jobId, { internal: !0 }, s).catch(() => {});
    }
    if (this.spare || this.ensuring || this.discarded) return;
    if (isLowMemory()) {
      logFeatureSad("job_spare_ensure", "low_mem");
      return;
    }
    let u = randomUUID(),
      sliced = u.slice(0, 8),
      generation = this.generation;
    (logForDebugging(`[PERF:bg-spare-start] ${sliced}`),
      (this.ensuring = (async () => {
        try {
          let w = await canonicalizePath(e, getRealPathOptions(s)),
            A = r;
          if (A === void 0 && o?.agent)
            (clearAgentDefinitionsCache(), (A = await listUserAgentTemplates(w, s).catch(() => [])));
          let R = resolveBgAgentTemplate(o, A).name,
            extraArgs = this.extraArgs,
            D = await spawnBgSession(
              [...extraArgs, ...xT("--agent", R), ...buildDispatchArgs(o)],
              u,
              "spare",
              w,
              void 0,
              void 0,
              void 0,
              s,
            );
          if (!D.ok) {
            if ((await deleteJob(sliced, { internal: !0 }, s).catch(() => {}), isTerminalShutdown())) {
              logFeatureSad("job_spare_ensure", "exiting");
              return;
            }
            (Zt(D.reason) ? logFeatureSad : logFeatureBad)(
              "job_spare_ensure",
              D.reason ?? "spawn_failed",
              ...gateCauseExtra(D.gateCause),
            );
            return;
          }
          if (this.discarded || isTerminalShutdown()) {
            (await deleteJob(sliced, { internal: !0 }, s),
              logFeatureSad("job_spare_ensure", this.discarded ? "discarded_after_spawn" : "exiting"));
            return;
          }
          if (generation !== this.generation) {
            (await deleteJob(sliced, { internal: !0 }, s).catch(() => {}),
              logFeatureSad("job_spare_ensure", "retired_after_spawn"));
            return;
          }
          ((this.spare = {
            jobId: sliced,
            sessionId: u,
            cwd: w,
            ready: !1,
            defaults: o,
            extraArgs: extraArgs,
          }),
            logForDebugging(`[PERF:bg-spare-spawned] ${sliced}`),
            logFeatureOk("job_spare_ensure"));
        } catch {
          (await deleteJob(sliced, { internal: !0 }, s).catch(() => {}),
            logFeatureBad("job_spare_ensure", "threw"));
        }
      })()));
    try {
      await this.ensuring;
    } finally {
      this.ensuring = null;
    }
  }
  retire(e) {
    this.generation++;
    let take = this.take();
    if (take) deleteJob(take.jobId, { internal: !0 }, e).catch(() => {});
  }
  async discard(e) {
    if (((this.discarded = !0), this.ensuring)) await this.ensuring.catch(() => {});
    let take = this.take();
    if (take) await deleteJob(take.jobId, { internal: !0 }, e);
  }
}
//@ chunk-bg51yd13.js:80725-80750 placement
var lr = new HostScoped(() => new BgSparePool());
//@ chunk-bg51yd13.js:80750-80787 placement
function _e() {
  return lr.of(getRootSession().host);
}
//@ chunk-bg51yd13.js:80787-80820 placement
function hAr() {
  return _e().spare;
}
//@ chunk-bg51yd13.js:80820-80854 placement
function gxs(e) {
  _e().markReady(e);
}
//@ chunk-bg51yd13.js:80854-80911 placement
function Y$n(e, n = !1, o, r, s) {
  return _e().ensure(e, n, o, r, s);
}
/**
 * 认领备用进程启动会话，未命中时记录原因并回退。
 */
//@ chunk-bg51yd13.js:80911-82083 placement
async function claimSpare(e, n, o) {
  logForDebugging("[PERF:bg-claim-start]");
  let r = _e(),
    take = r.take(),
    l = n ?? resolveBgAgentTemplate(take?.defaults),
    u = async (p, w) => {
      if (
        (logForDebugging(`[bg-spare] claim miss (${p})${w ? `: ${w}` : ""}`),
        logEvent("tengu_bg_spare_claim_fail", { reason: fromEnum(p) }),
        take)
      ) {
        let A = await deleteJob(take.jobId, { internal: !0, knownGone: p === "enojob" }, o);
        if (!A.removed)
          (logFeatureBad("job_claim_spare", "job_claim_spare_delete_failed"),
            logForDebugging(
              `[bg-spare] deleteJob unconfirmed (${A.error ?? "unknown"}) \u2014 cold-dispatching with fresh sessionId; spare ${take.jobId} dir preserved`,
              { level: "warn" },
            ));
        else logFeatureSad("job_claim_spare", p);
      } else logFeatureSad("job_claim_spare", p);
      return dispatchBgSessionTracked(l, e, { targetCwd: take?.cwd, defaults: take?.defaults }, o);
    };
  if (!take) return u("no-spare");
  if (!arraysEqual(take.extraArgs, r.extraArgs)) return u("stale-argv");
  let y = applyReplyPatch(
    makeInitialState({
      template: l,
      respawnFlags: [..._e().extraArgs, ...xT("--agent", l.name), ...buildDispatchArgs(take.defaults)],
      intent: e,
      providerEnv: callerProviderEnv(),
      sessionId: take.sessionId,
      cwd: take.cwd,
      originCwd: take.cwd,
    }),
    e,
  );
  try {
    let p = await replyToJob(take.jobId, e, void 0, y, void 0, o);
    if (p) return u(p.err === REPLY_ENOJOB_MSG ? "enojob" : "reply", p.err);
  } catch (error) {
    return u("reply-throw", errorMessage(error));
  }
  return (
    await writeStateAtomic(getJobDir(take.jobId), y, o).catch(logJobWriteError),
    logForDebugging("[PERF:bg-claim-end]"),
    logFeatureOk("job_claim_spare"),
    logFeatureOk("fleet_view_dispatch"),
    { ok: !0, jobId: take.jobId, sessionId: take.sessionId }
  );
}
//@ chunk-bg51yd13.js:82083-82122 placement
function yAr(e) {
  return _e().discard(e);
}
//@ chunk-bg51yd13.js:82122-82153 placement
function yxs(e) {
  _e().retire(e);
}
/**
 * 重启后台会话（等待进行中的启动、迁移到可附着 PTY 等，约 11 KB）。
 */
//@ chunk-bg51yd13.js:82153-93057 placement
async function respawnBgSession(e, n, o) {
  let r = getJobDir(e),
    s = n?.knownState,
    l = bt(e);
  if (l) {
    logForDebugging(`bg: respawn of ${e} waiting on its in-flight spawn`);
    let M = await l;
    if ((invalidateJobStateCache(r), (s = void 0), !M.ok && !M.alive)) {
      logFeatureSad("job_respawn", "in_flight_spawn_failed");
      let V = await readJobState(r, o),
        se =
          !!n?.initialPrompt &&
          V !== null &&
          (await queuePromptForJob(r, V, n.initialPrompt, o, n.keepQueuedPrompt));
      return { ok: !1, alive: !1, state: V ?? n?.knownState, queued: se, error: M.error };
    }
  }
  let u = s ?? (await readJobState(r, o));
  if (!u)
    return (
      logFeatureBad("job_respawn", "job_respawn_state_missing"),
      { ok: !1, error: "Can't respawn \u2014 that job's saved state is missing", alive: !1 }
    );
  let y = u.daemonShort ?? e,
    now = Date.now(),
    w = await probeDaemonJob(y, o),
    A = Date.now() - now,
    alive = w.alive;
  if (!n?.force && !n?.forceUnresponsive && alive)
    return { ok: !1, alive: !0, short: y, state: u, error: `Session ${e} is already running` };
  if (!n?.force && isExecLaunch(u)) {
    if (w.daemonUp && w.present)
      return {
        ok: !1,
        alive: !0,
        short: y,
        state: u,
        error: `Session ${e} has exited; attach shows the captured output`,
      };
    return (
      logFeatureSad("job_respawn", "exec_output_expired"),
      {
        ok: !1,
        alive: !1,
        state: u,
        error: "Output no longer available \u2014 this shell command has exited",
      }
    );
  }
  if (s) invalidateJobStateCache(r);
  let h = s ? await readJobState(r, o) : u,
    D = h === null ? await qXe(r, o) : void 0,
    S = h ?? u,
    E = S.daemonShort ?? e,
    x = checkWorkspaceTrust(S.cwd);
  if (x.verdict === "untrusted") {
    logFeatureSad("job_respawn", "workspace_untrusted", ...gateCauseExtra(workspaceGateCause(x)));
    let M = !!n?.initialPrompt && (await queuePromptForJob(r, S, n.initialPrompt, o, n.keepQueuedPrompt));
    return {
      ok: !1,
      alive: !1,
      state: S,
      queued: M,
      errorCode: "workspace_untrusted",
      error: formatWorkspaceUntrusted(x),
    };
  }
  let P = S.resumeSessionId !== void 0 && S.resumeSessionId !== S.sessionId,
    T = S.cliVersion !== void 0 || P,
    N = S.sessionIdTaken === !0 && !T,
    L = N ? randomUUID() : (S.resumeSessionId ?? (Vt(S.sessionId) !== null ? S.sessionId : randomUUID()));
  if (N)
    logForDebugging(
      `bg: respawn of ${e} \u2014 session id was taken by another conversation; starting under a fresh id`,
      { level: "warn" },
    );
  let now_2 = Date.now(),
    j = 0,
    K = 0,
    ne = null,
    ie = null,
    ke = wrapStorageSource(getTranscriptStorageContext(o)),
    Te = w.daemonUp && !w.alive && !w.present && E === y;
  if (Te)
    ((ne = killOrphanedWorker(E, o)), (ie = resolveJobTranscript(L, S.cwd, S.linkScanPath, void 0, ke)));
  else {
    let M = await killJob(E, u, void 0, o);
    if (((j = Date.now() - now_2), alive && !M.confirmed))
      return (
        logEvent("tengu_bg_respawn_unconfirmed_bail", {}),
        logFeatureSad("job_respawn", "job_respawn_kill_unconfirmed"),
        {
          ok: !1,
          alive: alive,
          short: E,
          state: u,
          error:
            M.error ??
            "Couldn't stop the previous worker \u2014 supervisor may be starting, retry in a moment",
          errorCode: "kill_unconfirmed",
        }
      );
    let now = Date.now(),
      se = now + 3000;
    while (Date.now() < se) {
      if (!(await isDaemonJobPresent(E))) break;
      await sleep(100);
    }
    K = Date.now() - now;
  }
  let now_3 = Date.now(),
    te = await (ie ?? resolveJobTranscript(L, S.cwd, S.linkScanPath, void 0, ke)),
    $e = Date.now() - now_3;
  if (ne) {
    let now = Date.now(),
      V = await ne;
    if (((j = Date.now() - now), V.anyMatch))
      te = await resolveJobTranscript(L, S.cwd, S.linkScanPath, void 0, ke);
  }
  let oe;
  if (!te.hasMessages && S.bgIsolation === "none" && !T && S.linkScanPath === void 0) {
    oe = await readCandidate(dirname(te.path), S.sessionId, o);
    let M = await resolveJobTranscript(L, S.cwd, S.linkScanPath, { crossWorktree: !1 }, ke);
    if (M.hasMessages) ((te = M), (oe = void 0));
  }
  let hasMessages = te.hasMessages;
  if (te.via === "projectsScan") logEvent("tengu_bg_respawn_probe_rescue", { via: fromEnum(te.via) });
  let Se = hasMessages || oe !== void 0;
  if (!hasMessages) {
    if (
      oe === void 0 &&
      S.bgIsolation === "none" &&
      L === S.sessionId &&
      !n?.force &&
      !n?.forceRefusalRetry
    ) {
      (logForDebugging(
        `bg: respawn of ${e} refused \u2014 fork handoff whose own transcript never materialized`,
        { level: "warn" },
      ),
        logEvent("tengu_bg_respawn_no_transcript", {
          via: fromEnum(te.via),
          had_link_scan_path: S.linkScanPath !== void 0,
          quarantined: !1,
          refused: !0,
        }),
        logFeatureSad("job_respawn", "fork_transcript_never_materialized"));
      let V = !!n?.initialPrompt && (await queuePromptForJob(r, S, n.initialPrompt, o, n.keepQueuedPrompt));
      return {
        ok: !1,
        alive: !1,
        state: S,
        queued: V,
        errorCode: "fork_transcript_never_materialized",
        error: `This session has no saved transcript \u2014 it was stopped before its first response finished. If it was backgrounded from another conversation, that one is still intact; \`claude respawn ${e}\` starts this one fresh.`,
      };
    }
    if (oe === void 0 && S.deadEpochReapedAt !== void 0 && !n?.force && !P)
      return (
        logForDebugging(`bg: respawn of ${e} refused \u2014 dead-epoch row whose transcript is gone`, {
          level: "warn",
        }),
        logEvent("tengu_bg_respawn_no_transcript", {
          via: fromEnum(te.via),
          had_link_scan_path: S.linkScanPath !== void 0,
          quarantined: !1,
          refused: !0,
        }),
        logFeatureSad("job_respawn", "dead_epoch_transcript_gone"),
        {
          ok: !1,
          alive: !1,
          state: S,
          errorCode: "dead_epoch_transcript_gone",
          error: `This session's saved conversation is no longer on disk (it ended while the background service was off, and old transcripts are cleaned up), so there is nothing to resume. \`claude rm ${e}\` deletes the row; \`claude respawn ${e}\` runs its original prompt again instead.`,
        }
      );
    let M = await quarantineJobTranscript(te.path, ke);
    logEvent("tengu_bg_respawn_no_transcript", {
      via: fromEnum(te.via),
      had_link_scan_path: S.linkScanPath !== void 0,
      quarantined: M,
      refused: !1,
      parked_source: oe !== void 0,
    });
  }
  let re = u.template === "exec" && u.respawnFlags.length === 0 ? u.intent : void 0,
    Je =
      S.name && (S.nameSource === "user" || S.nameSource === "collision")
        ? rewriteDispatchFlagValue(S.respawnFlags, "--name", "-n", S.name)
        : void 0,
    xe = hasMessages && !re;
  if (xe) {
    let filtered = (await listLiveSessionHolders(L)).filter(
        (se) => !(se.jobId !== void 0 && (se.jobId === e || se.jobId === E)),
      ),
      V = filtered.find((se) => se.kind === "interactive") ?? filtered[0];
    if (V)
      return (
        logEvent("tengu_bg_respawn_resume_conflict", { holder_kind: fromEnum(V.kind) }),
        logFeatureSad("job_respawn", "resume_session_live_elsewhere"),
        {
          ok: !1,
          alive: !1,
          state: S,
          queued:
            !!n?.initialPrompt && (await queuePromptForJob(r, S, n.initialPrompt, o, n.keepQueuedPrompt)),
          error:
            V.kind === "interactive"
              ? SESSION_BUSY_ELSEWHERE_MESSAGE
              : "This conversation is already open in another running Claude session \u2014 use that one, or close it and try again",
          errorCode: "resume_session_live_elsewhere",
        }
      );
  }
  let me = stripEnvironmentFlags(Je ?? S.respawnFlags),
    Z = re
      ? []
      : me.length > 0
        ? me
        : u.routine
          ? xT("--routine", u.routine)
          : u.template !== "bg"
            ? xT("--agent", u.template)
            : [],
    index = Z.findIndex((M) => M === "--agent" || M.startsWith("--agent=")),
    be = index !== -1 && Z[index] === "--agent",
    Ye = index === -1 ? void 0 : be ? Z[index + 1] : Z[index].slice(8);
  if (!Se && Ye) {
    let M = Ye;
    clearAgentDefinitionsCache();
    let V = await listUserAgentTemplates(S.cwd, o).catch(() => {
        return;
      }),
      se = resolveBgAgentTemplate({ agent: M }, V).name;
    if (se !== M)
      Z = be ? Z.toSpliced(index, 2, ...xT("--agent", se)) : Z.toSpliced(index, 1, ...xT("--agent", se));
  }
  let qe = P,
    Ee = !Se && (n?.forceRefusalRetry === !0 || (!re && S.bgIsolation === "none" && !P)),
    Ie = Ee ? randomUUID() : L,
    we = imt(S);
  if (we !== S.queuedPrompt)
    logForDebugging(`bg: respawn of ${e} \u2014 the saved reply starts with / or !, so no restart sends it`, {
      level: "warn",
    });
  let ce = re
    ? void 0
    : n?.keepQueuedPrompt && n.initialPrompt && we
      ? vho(we, n.initialPrompt)
        ? we
        : `${we}

${n.initialPrompt}`
      : (n?.initialPrompt ?? we ?? (Se || qe || Ee ? void 0 : u.intent));
  if (!re && ce !== void 0 && n?.initialPrompt === void 0 && we === void 0)
    logEvent("tengu_resume_interrupted_turn", { surface: lit("respawn_job"), kind: lit("intent_replay") });
  let Ke = oe === void 0 && Boolean(n?.replyOnResume) && xe && !ce,
    Ne = [
      ...(xe ? ["--resume", L] : []),
      ...(oe !== void 0 ? ["--resume", oe, "--fork-session"] : []),
      ...(oe !== void 0 ? withoutReplyOnResume(Z) : Ke ? withReplyOnResume(Z) : Z),
      ...(ce ? ["--", ce] : []),
    ],
    Ae = buildBridgeReattachEnv(
      S.bridgeSessionId,
      S.bridgeSessionSeq,
      S.bridgeOutboundOnly,
      S.bridgeSessionGroupingId,
      {
        ownerAccountUuid: S.bridgeOwnerAccountUuid,
        ownerOrganizationUuid: S.bridgeOwnerOrganizationUuid,
        noHistoryBackfill: S.bridgeNoHistoryBackfill,
      },
    ),
    U = T ? Ae : pBn(getJobDir(e), Ae);
  if (!n?.force && !n?.forceUnresponsive && u.state !== "stopped") {
    invalidateJobStateCache(r);
    let M = await readJobState(r, o);
    if (M?.state === "stopped")
      return (
        logForDebugging(`bg: respawn of ${e} bailed \u2014 job was stopped while the respawn was in flight`, {
          level: "warn",
        }),
        logFeatureSad("job_respawn", "stopped_during_respawn"),
        { ok: !1, alive: !1, state: M, error: `Session ${e} was stopped while the respawn was in flight` }
      );
  }
  let now_4 = Date.now(),
    Le,
    G = { gateway: !1, lineage: !1 };
  try {
    ((G = decodeHostLineage(await readFile(ePe(e), "utf8"))), (Le = !0));
  } catch (error) {
    if (!isENOENT(error))
      return {
        ok: !1,
        alive: !1,
        state: u,
        error: `host-managed tombstone unreadable: ${errorMessage(error)}`,
      };
    Le = !1;
  }
  let { CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST, ...Be } =
    u.providerEnv ?? {};
  if (Le) for (let M of PASSTHROUGH_ENV_VARS) delete Be[M];
  let it = Le
      ? {
          ...Be,
          CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST: "1",
          ...(G.gateway && { CLAUDE_CODE_USE_GATEWAY: "1" }),
          ...(G.lineage && { CLAUDE_CODE_HOST_GATEWAY_LINEAGE: "1" }),
        }
      : Be,
    Ze = {
      ...(re && { intent: re, exec: re }),
      ...(xe && { resumeTranscriptPath: te.path }),
      ...(S.name && { name: S.name, nameSource: S.nameSource }),
      ...(u.bgIsolation === "none" && { bgIsolation: "none" }),
      providerEnv: it,
      ...(u.sessionPermissionRules && { sessionPermissionRules: u.sessionPermissionRules }),
      ...(u.memoryToggledOff && { memoryToggledOff: !0 }),
      ...(u.autoMemoryOffThisSession && { autoMemoryOffThisSession: !0 }),
      ...(u.forkSourceAlive && {
        forkSourceAlive: !0,
        ...(u.forkBoundaryAt && { forkBoundaryAt: u.forkBoundaryAt }),
        ...(u.forkSessionId && { forkSessionId: u.forkSessionId }),
        ...(u.forkParentSessionId && { forkParentSessionId: u.forkParentSessionId }),
      }),
    },
    pt =
      Ke &&
      !re &&
      S.state !== "failed" &&
      S.state !== "stopped" &&
      isTerminal(S.state) &&
      !S.routine &&
      (n?.replyOnResume === "turn-owed" || (n?.replyOnResume === "kick-kept" && S.tempo === "active"));
  if (pt)
    (invalidateJobStateCache(r),
      await writeStateAtomic(
        r,
        {
          ...((await readJobState(r, o)) ?? S),
          tempo: "active",
          replayOwed: !0,
          updatedAt: new Date().toISOString(),
        },
        o,
      ).catch(logJobWriteError));
  let X = await spawnBgSession(Ne, Ie, "fleet", S.cwd, Ze, U, e, o);
  if (!X.ok && !X.alive && X.reason === "ack_timeout" && Date.now() - now_4 < 2000)
    (logForDebugging(`bg: respawn dispatch fast-failed (${Date.now() - now_4}ms) \u2014 retrying once`, {
      level: "warn",
    }),
      await sleep(500),
      (X = await spawnBgSession(Ne, Ie, "fleet", S.cwd, Ze, U, e, o)));
  if (X.ok) mBn(getJobDir(e));
  let mt = Date.now() - now_4,
    ht = Date.now() - now;
  if (
    (logForDebugging(
      `[PERF:respawn] ${e}: total=${ht}ms probe=${A}ms kill=${j}ms${Te ? " (ceremony skipped)" : ""} wait=${K}ms transcript=${$e}ms dispatch=${mt}ms ok=${X.ok}`,
    ),
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
      forced: n?.force === !0 || n?.forceRefusalRetry === !0 || n?.forceUnresponsive === !0,
      ok: X.ok,
    }),
    !X.ok)
  ) {
    if (X.alive) logFeatureSad("job_respawn", "already_alive");
    else if (X.reason === "cwd_gone") logFeatureSad("job_respawn", "cwd_gone");
    else logFeatureBad("job_respawn", "job_respawn_spawn_failed");
    let M =
      !X.alive && n?.initialPrompt
        ? await queuePromptForJob(r, S, n.initialPrompt, o, n.keepQueuedPrompt)
        : !1;
    return { ok: !1, error: X.error, alive: X.alive ?? !1, short: X.short, state: u, queued: M };
  }
  if (D && !re) YXe("wake", D);
  (logEvent("tengu_bg_agent_action", {
    action: lit("respawn"),
    wasSettled: isSettled(u),
    jobSessionId: ye(S.sessionId),
  }),
    invalidateJobStateCache(r));
  let ae = (await readJobState(r, o)) ?? S;
  if (ae.state === "failed" && ae.updatedAt > S.updatedAt) {
    if (
      (logFeatureSad("job_respawn", "crashed_during_spawn"),
      ae.reapedMidWorkAt !== void 0 || ae.reapedUnsettledAt !== void 0 || ae.deadEpochReapedAt !== void 0)
    ) {
      let M = { ...ae, reapedMidWorkAt: void 0, reapedUnsettledAt: void 0, deadEpochReapedAt: void 0 };
      return (await writeStateAtomic(r, M, o).catch(logJobWriteError), { ok: !0, short: X.short, state: M });
    }
    return { ok: !0, short: X.short, state: ae };
  }
  let en = ce ? { ...applyReplyPatch(ae, ce), tempo: "active", needs: void 0, block: void 0 } : ae,
    gt =
      Je && S.name
        ? (rewriteDispatchFlagValue(ae.respawnFlags, "--name", "-n", S.name) ?? ae.respawnFlags)
        : void 0,
    Ve = S.state === "failed" || S.state === "stopped" || !!re,
    wt = {
      ...en,
      state: Ve ? "starting" : ce && hasOutstandingAsk(S) ? "working" : S.state,
      reapedMidWorkAt: void 0,
      reapedUnsettledAt: void 0,
      deadEpochReapedAt: void 0,
      ...(ce
        ? { inFlight: void 0 }
        : {
            ...(!Ve && S.tempo === "active"
              ? isTerminal(S.state) || S.routine
                ? { tempo: "idle" }
                : {
                    tempo: "blocked",
                    needs: IDLE_NEEDS,
                    ...(PRE_BOOT_STATES.includes(S.state) && { state: "working" }),
                  }
              : { tempo: Ve ? "idle" : S.tempo }),
            detail: Ve || Ee ? "" : S.detail,
            ...(Ee && { output: null }),
            inFlight: { tasks: 0, queued: 0, kinds: [] },
          }),
      ...(Se ? {} : { firstTerminalAt: null }),
      daemonShort: X.short,
      ...(gt && { respawnFlags: gt }),
      queuedPrompt: void 0,
      ...(N && { sessionId: L, resumeSessionId: L }),
      ...(Ee && { resumeSessionId: Ie, linkScanPath: void 0, linkScanOffset: 0 }),
      sessionIdTaken: void 0,
      replayOwed: void 0,
      ...(pt && ae.replayOwed === !0 && { tempo: "active", replayOwed: !0 }),
      updatedAt: new Date().toISOString(),
      backend: "daemon",
    };
  return (
    await writeStateAtomic(r, wt, o).catch(logJobWriteError),
    logFeatureOk("job_respawn"),
    { ok: !0, short: X.short, state: wt }
  );
}
//@ chunk-bg51yd13.js:93057-93114 placement
function Zt(e) {
  return e === "gate_blocked" || e === "cwd_gone";
}
//@ chunk-bg51yd13.js:93114-93163 placement
var qt = { precondition: { type: "ifAbsent" }, mode: 438 };
/**
 * 用存储后端算某键的 sha256 摘要（最多读 expected 长度字节），判断是否等于给定摘要。
 */
//@ chunk-bg51yd13.js:93163-93285 placement
async function storageDigestMatches(e, n, o, r) {
  let digest = await e.digest(n, { algorithm: "sha256", maxBytes: o.length });
  return digest.ok && digest.value.digest === r;
}

export {
  nmt,
  Y$n,
  yAr,
  yxs,
  hAr,
  gxs,
  respawnBgSession,
  shallowEqualRecords,
  dispatchFromFleetView,
  claimSpare,
  qt,
  storageDigestMatches,
  _e,
  Zt,
};
