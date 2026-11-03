/**
 * services/daemon/DaemonSupervisor.ts
 *
 * 2.1.316 新增：后台守护进程主管（bg-pty 宿主、会话生命周期）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-89ebz077.js (9)
 * attribution: placement 9
 */
import { randomBytes, randomBytes as randomBytes_2 } from "crypto";
import { dirname, basename } from "path";
import { unlink, unlink as unlink_2, unlink as unlink_3, access, writeFile } from "fs/promises";
import { statSync } from "fs";
import { qKo, withoutReplyOnResume } from "../../cli/forwardedFlags.js";
import { gj, qG, aJt, HOST_MANAGED_MARKER_ENV_VARS, n8e, Gx, lJt } from "../../utils/managedEnvConstants.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import {
  BG_CARRIED_ENV_KEYS,
  SANDBOX_ENV_VARS,
  Nbo,
  soe,
  BJe,
  ZIs,
  BG_PASSTHROUGH_ENV_VARS,
} from "../../utils/background/envCarry.js";
import { getPlatform } from "../../utils/platform.js";
import {
  isSettled,
  readJobState,
  getJobDir,
  IDLE_NEEDS,
  ABANDONED_WORKER_MS,
  readJobStateFreshOrNull,
  terminalOutcome,
  readPinnedJobIds,
  buildBridgeReattachEnv,
} from "./jobState.js";
import {
  DRAINABLE_TASK_KINDS,
  MIN_UPGRADE_RELEASE,
  MAX_UPGRADE_WAIT_MS,
  CLAIM_TIMEOUT_MS,
  MIN_ADOPT_RELEASE,
  IDLE_RETIRE_MS,
  MAX_AUTO_RESTARTS,
  MIN_POLL_MS,
  POLL_INTERVAL_MS,
  MAX_RESTART_DETAIL,
  MAX_STATUS_DETAIL,
  RESTART_CONTINUE_PROMPT,
  RESTART_WINDOW_MS,
  STALE_POLL_MS,
  STABLE_RUN_MS,
  RESTART_BACKOFF_MS,
  MAX_RESTART_BACKOFF_MS,
  SESSION_ID_TAKEN_NOTICE,
  Vuo,
  ATTACH_TIMEOUT_MS,
} from "./sessionRestart.js";
import { createSignal } from "../../utils/signal.js";
import {
  createPrivateModeTracker,
  isAtLeastRelease,
  isNewerBuild,
  lmt,
  pingPtySocket,
  killViaPtySocket,
  qXe,
  YXe,
} from "./reapJobs.js";
import {
  Tt,
  connectPtyHost,
  createPtyActivityTracker,
  NOT_RESTARTED_NO_TRANSCRIPT,
  Je,
  Dt,
  SIGNAL_EXIT_CODES,
  MAX_RESTARTS,
  RESTART_WINDOW,
  NOT_RESTARTED_STOPPED,
  NOT_RESTARTED_IDLE,
  RESTART_NOTICE_MS,
  RESTART_PENDING_NOTICE,
  RESTART_NOW_NOTICE,
  RESTART_DELAY_MS,
  connectRendezvousSocket,
} from "./ptyHostClient.js";
import {
  interactiveMarkApc,
  rosterEntryExtras,
  DAEMON_DETACH_APC,
  wrapDaemonHint,
  daemonDetachApc,
  parseInteractiveMarkRv,
  HOST_DIED_EXEC_DETAIL,
  HOST_DIED_DETAIL,
} from "./leaseProtocol.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { bgShort } from "./roster.js";
import { fromEnum, lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { sanitizeVersion } from "../analytics/metadata.js";
import { Zee } from "../../commands/color/index.js";
import { m5 } from "./sessionStatus.js";
import {
  createPtyHostSpawner,
  buildBgSessionEnv,
  syncProcessWrapperEnv,
  buildSessionLaunchArgs,
  writeAuthSnapshot,
} from "./spawnBgSession.js";
import { logError } from "../../utils/log.js";
import { Wwn, FA, JC, ENOTOWNED, owe } from "../../utils/sandbox/userNamespace.js";
import {
  discardBgExitSidecars,
  readAndClearBgExitCause,
  readAndClearBgExitDetail,
  BG_EXIT_CAUSE_SESSION_IN_USE,
} from "../../utils/bgExitSidecars.js";
import {
  getProcessStartTimeAsync,
  getProcessStartTime,
  readLinuxProcState,
} from "../../utils/processIdentity.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { withDeadline } from "../../utils/sleep.js";
import { qa } from "../../utils/stripAnsi.js";
import { FOCUS_IN, FOCUS_OUT } from "../../ink/termio/csi.js";
import {
  getErrnoCode,
  errorMessage,
  isENOENT,
  sanitizedBgExitCauseForTelemetry,
} from "../../utils/errors.js";
import { ensureJobTmpFolder } from "./jobFolder.js";
import { processWrapperError, processWrapperArgv, Xit } from "../../utils/processWrapper.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  writeAgentMetadata_2,
  wrapStorageSource,
  getTranscriptStorageContext,
} from "../../utils/sessionStorage.js";
import { ensureDaemonSocketDirs } from "./paths.js";
import {
  resolveJobTranscript,
  isTranscriptFileResumeArg,
  quarantineJobTranscript,
} from "../../utils/sessionStoragePortable.js";
import { jbo, getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { _yn } from "../../utils/framedSocket.js";
import { truncateWithEllipsis } from "../sessionStatus/sessionStateClassifier.js";
import { Dr } from "../../utils/stringUtils.js";
import { uOt } from "../../utils/exitCodes.js";
import { isLowMemory } from "../../daemon/lowMemory.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { RY } from "../../utils/procStat.js";

/**
 * 启动后台会话时要清掉的环境变量列表，以及 Windows 下环境变量键名大小写规范化表。
 */
//@ chunk-89ebz077.js:16458-17100 placement
var BG_STRIPPED_ENV_VARS = [
    ...qKo,
    "CLAUDE_CODE_CLIENT_DATA_URL",
    "CLAUDE_CODE_ALLOW_OTHER_MODELS",
    "CLAUDE_CODE_REMOVE_PROMPT_STRINGS",
    "CLAUDE_CODE_ATTRIBUTION_PROJECT",
    "CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS",
    "CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES",
    ...gj,
    "CLAUDE_CODE_EXTRA_BODY",
    "CLAUDE_CODE_AUTO_MODE_MODEL",
    ...qG,
    ...aJt,
    "ANTHROPIC_CUSTOM_HEADERS",
    ...HOST_MANAGED_MARKER_ENV_VARS,
    "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
    "CLAUDE_CODE_HOST_CREDS_FILE",
  ],
  isProviderManagedByHost = (e) => isEnvTruthy(e.env?.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST),
  shouldCarryAuth = (e) => e.launch.mode !== "exec" && !isProviderManagedByHost(e),
  BG_ENV_KEY_CASE_MAP = new Map(
    [
      "CLAUDE_CONFIG_DIR",
      "CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS",
      ...BG_CARRIED_ENV_KEYS,
      ...SANDBOX_ENV_VARS,
      ...BG_STRIPPED_ENV_VARS,
      ...n8e,
      ...Gx,
      ...lJt,
    ].map((e) => [e.toUpperCase(), e]),
  );
/**
 * Windows 下把环境变量键名规范为已知大小写（已有同名规范键时不覆盖）。
 */
//@ chunk-89ebz077.js:17100-17336 placement
function normalizeEnvKeyCase(e, r = []) {
  if (getPlatform() !== "windows") return;
  let s = new Map(r.map((n) => [n.toUpperCase(), n]));
  for (let n of Object.keys(e)) {
    let upper = n.toUpperCase(),
      p = BG_ENV_KEY_CASE_MAP.get(upper) ?? s.get(upper);
    if (p === void 0 || p === n) continue;
    if (e[p] === void 0) e[p] = e[n];
    delete e[n];
  }
}
//@ chunk-89ebz077.js:17336-17463 placement
function usesCustomEndpoint(e, r) {
  return (
    !!e[r.endpoint] &&
    (r.endpoint === "ANTHROPIC_BASE_URL" ||
      r.companions.some((companion) => aJt.includes(companion) && isEnvTruthy(e[companion])))
  );
}
/**
 * 作业是否仍有在途工作：有排队、非可排空的任务未完成（结束后只剩允许类型的除外）或有会话定时任务。
 */
//@ chunk-89ebz077.js:17463-17758 placement
function hasPendingInFlightWork(e) {
  let filtered = (e.inFlight?.kinds ?? []).filter(
      (o) => o !== "artifact_watch" || !(e.inFlight?.drainableMonitors ?? 0),
    ),
    s = isSettled(e) && filtered.length > 0 && filtered.every((o) => DRAINABLE_TASK_KINDS.includes(o)),
    n = (e.inFlight?.tasks ?? 0) - (e.inFlight?.drainableMonitors ?? 0);
  return (e.inFlight?.queued ?? 0) > 0 || (n > 0 && !s) || filtered.includes("session_cron");
}
//@ chunk-89ebz077.js:17758-17891 placement
function getJobActivityState(e) {
  if (!e) return null;
  if (isSettled(e)) return "settled";
  if (e.tempo === "active") return "active";
  if (hasPendingInFlightWork(e)) return "inflight";
  return null;
}
//@ chunk-89ebz077.js:17891-18002 placement
function getAdoptActivityState(e, r) {
  let s = getJobActivityState(e);
  if (s === "settled" && r !== "missing-at-adopt") return e && hasPendingInFlightWork(e) ? "inflight" : null;
  return s;
}
//@ chunk-89ebz077.js:18002-18116 placement
function formatSupervisorState(e) {
  return e.kind === "retiring"
    ? `retiring:${e.reason}`
    : e.kind === "retired"
      ? `retired:${e.outcome}`
      : e.kind;
}
//@ chunk-89ebz077.js:18116-18373 placement
function isValidStateTransition(e, r) {
  if (e.kind === "retired") return !1;
  switch (r.kind) {
    case "spawning":
      return e.kind === "upgrading" || e.kind === "running";
    case "running":
      return e.kind === "spawning";
    case "upgrading":
      return e.kind === "running";
    case "retiring":
      return !0;
    case "retired":
      return !0;
  }
}
/**
 * 后台守护进程主管：管理 bg-pty 会话进程、附着者、状态流、认证快照与重启。
 */
//@ chunk-89ebz077.js:18373-64813 placement
class DaemonSupervisor {
  dispatch;
  spawnPty;
  getAuthSnapshot;
  via;
  storageV5;
  credentials;
  record;
  onStream = createSignal();
  onState = createSignal();
  onSettle = createSignal();
  onRepaintDone = createSignal();
  attachers = new Map();
  lastInputAttacher;
  pty;
  procStart;
  replPid = 0;
  replProcStart;
  ptyCols = 200;
  ptyRows = 50;
  decModes = createPrivateModeTracker();
  execTracker;
  execLastLine;
  offData;
  offExit;
  ring = [];
  ringBytes = 0;
  ringSpawnMark = 0;
  attempt = 0;
  lastSpawnAt = 0;
  fastCrashStreak = 0;
  lastExitOwnCrash = !1;
  lastExitCause;
  lastExitExternalStop = !1;
  effectiveCwd;
  liveTranscriptPath;
  hostWokeAt;
  backoffTimer = null;
  crashFollowUp;
  pidPoll = null;
  rv;
  rvRejected = !1;
  rvSockPath;
  ptySockPath;
  rvAuth = randomBytes_2(16).toString("hex");
  ptyAuth = randomBytes_2(16).toString("hex");
  authRekeyFired = !1;
  authRekeyCount = 0;
  pendingAuthRekey;
  rosterExtras = {};
  unverifiedSock;
  phase = { kind: "spawning" };
  workerReady = !1;
  sessionIdTakenLatch = !1;
  firedInteractiveMarks = [];
  bootedViaResume = !1;
  resizeDeferred = !1;
  lastInputAt;
  downgradeRefusalLogged = !1;
  deleteJobDirOnSettle = !1;
  get shouldDeleteJobDir() {
    return this.deleteJobDirOnSettle;
  }
  adoptedAt;
  lastRvHeartbeat;
  stalledLogged = !1;
  lastCheckPidAt = Date.now();
  replyChain = Promise.resolve();
  killOutcome = "killed";
  handoffKill = !1;
  get isKilling() {
    return this.phase.kind === "retiring" && this.phase.reason === "reap";
  }
  get isHandoffKill() {
    return this.handoffKill;
  }
  get isRetiring() {
    return this.phase.kind === "retiring" && this.phase.reason === "grace";
  }
  get isUpgrading() {
    return this.phase.kind === "upgrading";
  }
  get isBooting() {
    return !this.record.outcome && (this.phase.kind === "upgrading" || !this.workerReady);
  }
  get isSpawnPending() {
    return this.phase.kind === "spawning";
  }
  get isReplyQueueOnly() {
    return (
      this.dispatch.launch.mode !== "exec" &&
      Tt() &&
      isAtLeastRelease(
        this.record.cliVersion,
        MIN_UPGRADE_RELEASE,
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
        }.VERSION,
      )
    );
  }
  replayInteractiveMarksTo(e) {
    let r = this.attachers.get(e);
    if (!r || r.caps?.imark !== !0) return;
    for (let firedInteractiveMark of this.firedInteractiveMarks)
      r.deliver(interactiveMarkApc({ ...firedInteractiveMark, nonce: r.imarkNonce }));
  }
  get isVersionStale() {
    return (
      !!this.record.cliVersion &&
      this.record.cliVersion !==
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
    );
  }
  get marksCapable() {
    if (this.isVersionStale) return !1;
    return this.bootedViaResume || this.firedInteractiveMarks.length > 0;
  }
  get bootingForAttachMetrics() {
    return this.isBooting || (this.marksCapable && this.firedInteractiveMarks.length === 0);
  }
  get isUnverified() {
    return this.unverifiedSock !== void 0;
  }
  getPhase() {
    return this.phase;
  }
  get isTransitioning() {
    return this.phase.kind !== "running" || !this.pty || this.record.pid === 0;
  }
  get isDetached() {
    return this.phase.kind === "retiring" && this.phase.reason === "stop";
  }
  transitionTo(e) {
    if (!isValidStateTransition(this.phase, e))
      return (
        logForDebugging(
          `[bg] illegal worker-phase transition ${formatSupervisorState(this.phase)} \u2192 ${formatSupervisorState(e)} for ${this.record.short}`,
          { level: "warn" },
        ),
        logEvent("tengu_bg_phase_illegal", {}),
        !1
      );
    return ((this.phase = e), !0);
  }
  shutdownWorker() {
    let e = this.rv?.send({ type: "shutdown" }) ?? !1;
    if (!e) this.sigtermWorker();
    else
      setTimeout(
        (r) => {
          let phase = r.phase;
          if (
            (phase.kind === "upgrading" || (phase.kind === "retiring" && phase.reason === "grace")) &&
            !r.record.outcome
          )
            r.sigtermWorker();
        },
        5000,
        this,
      ).unref();
    return e;
  }
  noteDowngradeRefused(e) {
    if (this.downgradeRefusalLogged || !this.record.cliVersion) return;
    ((this.downgradeRefusalLogged = !0),
      logEvent("tengu_bg_respawn_downgrade_refused", {
        short: bgShort(this.dispatch.short),
        trigger: fromEnum(e),
        worker_cli_version: sanitizeVersion(this.record.cliVersion),
      }));
  }
  async respawnIfIdleStale(e, r = "sweep") {
    if (this.dispatch.launch.mode === "exec") return { respawned: !1, reason: "not-stale" };
    if (this.isTransitioning) return { respawned: !1, reason: "in-progress" };
    if (this.record.outcome) return { respawned: !1, reason: "no-state" };
    if (
      this.record.cliVersion &&
      isNewerBuild(
        this.record.cliVersion,
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
        }.VERSION,
      )
    )
      return (this.noteDowngradeRefused(r), { respawned: !1, reason: "not-stale" });
    if (
      lmt(
        this.record.cliVersion,
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
        }.VERSION,
      )
    )
      return { respawned: !1, reason: "not-stale" };
    if (this.attachers.size > 0) return { respawned: !1, reason: "attached" };
    if (!this.isVersionStale) return { respawned: !1, reason: "not-stale" };
    if (r !== "attach" && this.lastInputAt && Date.now() - this.lastInputAt < MAX_UPGRADE_WAIT_MS)
      return { respawned: !1, reason: "busy" };
    let now = Date.now(),
      n = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
    if (this.isTransitioning) return { respawned: !1, reason: "in-progress" };
    if (this.record.outcome) return { respawned: !1, reason: "no-state" };
    if (this.attachers.size > 0) return { respawned: !1, reason: "attached" };
    if (this.lastInputAt && this.lastInputAt >= now) return { respawned: !1, reason: "busy" };
    if (!n) return { respawned: !1, reason: "no-state" };
    if (r !== "attach" && !isSettled(n) && this.adoptedAt && Date.now() - this.adoptedAt < CLAIM_TIMEOUT_MS)
      return { respawned: !1, reason: "busy" };
    if (isSettled(n) && r === "sweep" && !e?.has(this.dispatch.short))
      return { respawned: !1, reason: "settled" };
    if (!isSettled(n) && n.tempo !== "idle" && !(this.isParkedIdleFork(n) && n.inFlight !== void 0))
      return { respawned: !1, reason: "busy" };
    if (hasPendingInFlightWork(n)) return { respawned: !1, reason: "inflight" };
    if (!this.transitionTo({ kind: "upgrading" })) return { respawned: !1, reason: "in-progress" };
    return (
      this.onState.emit({ pid: this.record.pid }),
      logEvent("tengu_bg_respawn_stale", {
        short: bgShort(this.dispatch.short),
        rvSent: this.shutdownWorker(),
        trigger: fromEnum(r),
        worker_cli_version: sanitizeVersion(this.record.cliVersion),
      }),
      { respawned: !0 }
    );
  }
  isParkedIdleFork(e) {
    return (
      (isAtLeastRelease(
        this.record.cliVersion,
        MIN_ADOPT_RELEASE,
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
        }.VERSION,
      ) ||
        e.inFlight?.drainableMonitors !== void 0) &&
      e.state === "working" &&
      e.tempo === "blocked" &&
      e.needs === IDLE_NEEDS &&
      e.interactiveLineage === !0
    );
  }
  async retireIfSettled(e, r, s = e, { shedMonitoringOnly: n = !1 } = {}) {
    if (this.isTransitioning) return { retired: !1, reason: "in-progress" };
    if (this.record.outcome) return { retired: !1, reason: "no-state" };
    if (this.attachers.size > 0) return { retired: !1, reason: "attached" };
    if (isProviderManagedByHost(this.dispatch)) return { retired: !1, reason: "host-managed" };
    if (r?.has(this.dispatch.short)) return { retired: !1, reason: "pinned" };
    if (this.adoptedAt && Date.now() - this.adoptedAt < CLAIM_TIMEOUT_MS)
      return { retired: !1, reason: "recent-adopt" };
    if (this.lastInputAt && Date.now() - this.lastInputAt < e) return { retired: !1, reason: "recent-input" };
    let o = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
    if (this.isTransitioning || this.attachers.size > 0) return { retired: !1, reason: "in-progress" };
    if (this.lastInputAt && Date.now() - this.lastInputAt < e) return { retired: !1, reason: "recent-input" };
    if (!o) {
      if (this.dispatch.source === "spare" && Date.now() - this.dispatch.createdAt > e) {
        if (!this.transitionTo({ kind: "retiring", reason: "grace" }))
          return { retired: !1, reason: "in-progress" };
        let x = Date.now() - this.dispatch.createdAt;
        return (
          logEvent("tengu_bg_retired", {
            short: bgShort(this.dispatch.short),
            rvSent: this.shutdownWorker(),
            settledForMs: x,
            state: lit("stale-spare"),
            cause: lit("stale-spare"),
            worker_cli_version: sanitizeVersion(this.record.cliVersion),
          }),
          { retired: !0, cause: "stale-spare", idleMs: x }
        );
      }
      return { retired: !1, reason: "no-state" };
    }
    if (
      this.dispatch.source !== "shell" &&
      !Zee() &&
      !o.name &&
      !o.intent &&
      !o.worktreePath &&
      o.template === "bg" &&
      o.state === "working" &&
      o.tempo === "blocked" &&
      !((o.inFlight?.tasks ?? 0) > 0)
    ) {
      let parse = Date.parse(o.createdAt),
        parse_2 = Date.parse(o.updatedAt),
        P = Date.now() - (parse_2 > parse ? parse_2 : parse);
      if (P < IDLE_RETIRE_MS) return { retired: !1, reason: "empty-idle-grace" };
      if (!this.transitionTo({ kind: "retiring", reason: "grace" }))
        return { retired: !1, reason: "in-progress" };
      return (
        (this.deleteJobDirOnSettle = !0),
        logEvent("tengu_bg_retired", {
          short: bgShort(this.dispatch.short),
          rvSent: this.shutdownWorker(),
          settledForMs: P,
          state: lit("empty-idle"),
          cause: lit("empty-idle"),
          worker_cli_version: sanitizeVersion(this.record.cliVersion),
        }),
        { retired: !0, cause: "empty-idle", idleMs: P }
      );
    }
    let isParkedIdleFork = this.isParkedIdleFork(o),
      h =
        isSettled(o) ||
        (this.dispatch.launch.mode !== "exec" &&
          (o.tempo === "idle" || (o.state === "blocked" && o.tempo === "blocked") || isParkedIdleFork)),
      parse = Date.parse(o.updatedAt),
      g = o.tempo === "blocked" && o.state !== "blocked" && o.needs !== void 0 && o.needs !== IDLE_NEEDS,
      f =
        this.isVersionStale &&
        !(
          this.record.cliVersion &&
          isNewerBuild(
            this.record.cliVersion,
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
            }.VERSION,
          )
        ) &&
        !lmt(
          this.record.cliVersion,
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
          }.VERSION,
        ) &&
        this.dispatch.launch.mode !== "exec" &&
        o.tempo !== "active" &&
        !g &&
        !o.routine &&
        (o.inFlight?.tasks ?? 0) - (o.inFlight?.drainableMonitors ?? 0) === 0 &&
        (o.inFlight?.queued ?? 0) === 0 &&
        !(o.inFlight?.kinds ?? []).includes("session_cron") &&
        parse < Date.now() - ABANDONED_WORKER_MS;
    if (!h && !f) return { retired: !1, reason: "not-settled" };
    let w = n || f ? (o.inFlight?.drainableMonitors ?? 0) : 0,
      filtered = (o.inFlight?.kinds ?? []).filter((x) => x !== "artifact_watch" || w === 0),
      S = isSettled(o) && filtered.length > 0 && filtered.every((x) => DRAINABLE_TASK_KINDS.includes(x)),
      R =
        o.interactiveLineage === !0 &&
        isAtLeastRelease(
          this.record.cliVersion,
          MIN_ADOPT_RELEASE,
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
          }.VERSION,
        ),
      A = f && !R ? 0 : 1;
    if ((o.inFlight?.queued ?? A) > 0 || ((o.inFlight?.tasks ?? A) - w > 0 && !S))
      return { retired: !1, reason: "inflight" };
    if (filtered.includes("session_cron")) return { retired: !1, reason: "session-cron" };
    if (o.routine) return { retired: !1, reason: "routine" };
    let O = o.bridgeSessionId ? Math.max(e, s) : e,
      G = o.updatedAt && Date.now() - Date.parse(o.updatedAt);
    if (!G || G < O) return { retired: !1, reason: "grace" };
    if (!this.transitionTo({ kind: "retiring", reason: "grace" }))
      return { retired: !1, reason: "in-progress" };
    let L = o.inFlight?.tasks !== void 0 && o.inFlight.queued !== void 0,
      C = !h || !L || (!n && w > 0) ? "abandoned-stale" : isSettled(o) ? "settled" : "idle-prompt";
    return (
      logEvent("tengu_bg_retired", {
        short: bgShort(this.dispatch.short),
        rvSent: this.shutdownWorker(),
        settledForMs: G,
        bridged: !!o.bridgeSessionId,
        detritusOnly: S,
        state: m5(o.state),
        cause: fromEnum(C),
        worker_cli_version: sanitizeVersion(this.record.cliVersion),
      }),
      { retired: !0, cause: C, idleMs: G }
    );
  }
  sigtermWorker() {
    try {
      this.pty?.kill("SIGTERM");
    } catch {}
  }
  onPtyAuthRequired() {
    let mode = this.dispatch.launch.mode;
    if ((logEvent("tengu_bg_pty_auth_mismatch", { mode: fromEnum(mode) }), mode === "exec")) {
      logForDebugging(
        `[bg] exec worker ${this.dispatch.short}: ptyHost rejected auth token \u2014 roster ptyAuth poisoned; input is dead until re-dispatch (exec workers are never auto-respawned)`,
        { level: "warn" },
      );
      return;
    }
    this.rekeyForAuthMismatch("pty-auth-required");
  }
  rekeyForAuthMismatch(e) {
    if (
      this.authRekeyFired ||
      this.authRekeyCount >= MAX_AUTO_RESTARTS ||
      this.phase.kind !== "running" ||
      this.record.outcome ||
      this.dispatch.launch.mode === "exec"
    ) {
      logForDebugging(
        `[bg] worker ${this.dispatch.short}: auth mismatch (${e}) \u2014 not re-keying ` +
          `(via=${this.via} phase=${this.phase.kind} mode=${this.dispatch.launch.mode} fired=${this.authRekeyFired} count=${this.authRekeyCount})`,
        { level: "warn" },
      );
      return;
    }
    ((this.authRekeyFired = !0),
      readJobState(getJobDir(this.dispatch.short), this.storageV5).then((r) => {
        let s = getAdoptActivityState(r, e);
        if (s === "settled") {
          ((this.authRekeyFired = !1),
            logEvent("tengu_bg_adopt_token_lost_respawn", {
              source: fromEnum(e),
              deferred: !1,
              skipped: lit("settled"),
            }),
            logForDebugging(
              `[bg] worker ${this.dispatch.short}: auth mismatch (${e}) \u2014 worker already settled; leaving to retireIfSettled`,
              { level: "warn" },
            ));
          return;
        }
        if (s !== null) {
          (logEvent("tengu_bg_adopt_token_lost_respawn", {
            source: fromEnum(e),
            deferred: !0,
            reason: fromEnum(s),
          }),
            logForDebugging(
              `[bg] worker ${this.dispatch.short}: auth mismatch (${e}) \u2014 ` +
                (s === "active" ? "worker is mid-turn" : "worker has non-resumable in-flight work") +
                "; deferring re-key respawn until safe",
              { level: "warn" },
            ),
            (this.pendingAuthRekey = e));
          return;
        }
        (logEvent("tengu_bg_adopt_token_lost_respawn", { source: fromEnum(e), deferred: !1 }),
          logForDebugging(
            `[bg] worker ${this.dispatch.short}: auth mismatch (${e}) \u2014 respawning to re-key (--resume preserves the session)`,
            { level: "warn" },
          ),
          this.fireAuthRekey());
      }));
  }
  fireAuthRekey() {
    if (((this.pendingAuthRekey = void 0), this.phase.kind !== "running" || this.record.outcome)) return;
    if (!this.transitionTo({ kind: "upgrading" })) return;
    (this.authRekeyCount++, this.onState.emit({ pid: this.record.pid }), this.sigtermWorker());
  }
  constructor(e, r, s, n, o, p, h) {
    this.dispatch = e;
    this.spawnPty = r;
    this.getAuthSnapshot = s;
    this.via = n;
    this.storageV5 = p;
    this.credentials = h;
    if (
      ((this.record = {
        short: e.short,
        nonce: e.nonce,
        sessionId: e.sessionId,
        pid: 0,
        attempt: 0,
        startedAt: Date.now(),
        createdAt: e.createdAt,
        cwd: e.cwd,
        backend: "daemon",
        tempo: "active",
        state: "starting",
        detail: "",
        intent: e.seed?.intent ?? "",
        name: e.seed?.name,
        agent: e.agent,
        routine: e.routine,
        worktreePath: e.worktree?.path,
        cliVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
        source: e.source,
        ...o,
      }),
      e.cols)
    )
      this.ptyCols = e.cols;
    if (e.rows) this.ptyRows = e.rows;
  }
  static spawn(e, r, s, n, o, p) {
    let h = new DaemonSupervisor(e, r ?? createPtyHostSpawner(), s, "cold", void 0, o, p);
    if (n?.afterUpgrade)
      return (
        (h.attempt = 1),
        h
          .buildBridgeReattachEnvFromState()
          .then((u) => h.doSpawn(u, !0))
          .catch(logError),
        h
      );
    return (h.doSpawn(e.reattachEnv).catch(logError), h);
  }
  static claim(e, r) {
    let s = new DaemonSupervisor(
      e,
      r.spawnPty,
      r.getAuthSnapshot,
      "spare",
      {
        pid: r.pid,
        attempt: 1,
        state: "running",
        cliVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      },
      r.storageV5,
      r.credentials,
    );
    if (
      ((s.attempt = 1),
      (s.bootedViaResume =
        e.launch.mode !== "exec" && (e.launch.restoresTranscript ?? e.launch.mode === "resume")),
      (s.ptySockPath = r.ptySockPath),
      (s.rvSockPath = Wwn(e.short)),
      r.ptyAuth)
    )
      s.ptyAuth = r.ptyAuth;
    return (
      discardBgExitSidecars(getJobDir(e.short)),
      s.wirePty(connectPtyHost(r.ptySockPath, r.pid, { short: e.short, auth: s.ptyAuth })),
      s.resize(e.cols ?? 200, e.rows ?? 50),
      s.connectRv(),
      getProcessStartTimeAsync(r.pid, { skipCache: !0 }).then((n) => {
        if (s.record.pid !== r.pid || s.isDetached || s.record.outcome) return;
        if (n) s.procStart = n;
        s.patch({ pid: r.pid });
      }),
      s
    );
  }
  socketAuth() {
    return (
      (this.rvAuth ??= randomBytes_2(16).toString("hex")),
      (this.ptyAuth ??= randomBytes_2(16).toString("hex")),
      { rvAuth: this.rvAuth, ptyAuth: this.ptyAuth }
    );
  }
  static buildClaimFrame(e, r, s) {
    let n = getJobDir(e.short),
      o = buildBgSessionEnv(e, n, r, Wwn(e.short), s);
    (delete o.CLAUDE_BG_PTY_AUTH,
      Nbo(o, e.reattachEnv),
      soe(o),
      syncProcessWrapperEnv(o, e),
      delete o.CLAUDE_PTY_HOST_NO_STABLE_PATH);
    let p = buildSessionLaunchArgs(e, 1, !1, e.sessionId, void 0, e.respawnFlags);
    return { env: o, argv: p };
  }
  static async adopt(e, r, s, n, o, p) {
    if (r.dispatch.env) r.dispatch.env = BJe(r.dispatch.env, ZIs);
    if ((delete r.dispatch.reattachEnv, !isProcessRunning(r.pid))) return null;
    let h = await withDeadline(getProcessStartTimeAsync(r.pid, { skipCache: !0 }), MIN_POLL_MS);
    if (h && r.procStart !== h) return null;
    let u = new DaemonSupervisor(
      r.dispatch,
      s,
      n,
      "adopted",
      {
        pid: r.pid,
        attempt: r.attempt,
        startedAt: r.startedAt,
        messagingSock: r.messagingSock,
        state: "adopted",
        detail: "adopted from previous supervisor",
        cliVersion: r.cliVersion,
        ...(r.ptySock ? {} : { legacy: !0 }),
      },
      o,
      p,
    );
    if (
      ((u.attempt = r.attempt),
      (u.procStart = r.procStart),
      (u.rosterExtras = rosterEntryExtras(r)),
      (u.workerReady = !0),
      (u.adoptedAt = Date.now()),
      (u.rvSockPath = r.rendezvousSock),
      (u.ptySockPath = r.ptySock),
      (u.rvAuth = r.rvAuth),
      (u.ptyAuth = r.ptyAuth),
      u.dispatch.launch.mode === "exec")
    )
      ((u.execTracker = createPtyActivityTracker(getJobDir(u.dispatch.short), u.storageV5)),
        (u.workerReady = !0));
    if (r.ptySock)
      (u.wirePty(
        connectPtyHost(r.ptySock, r.pid, {
          procStart: u.procStart,
          short: u.dispatch.short,
          auth: u.ptyAuth,
          onAuthRequired: () => u.onPtyAuthRequired(),
        }),
      ),
        (u.ptyCols = 0),
        u.seedFocus(!1));
    if (r.decModes) u.decModes.seed(r.decModes);
    if (r.firedInteractiveMarks) u.firedInteractiveMarks = r.firedInteractiveMarks.slice(0, 2);
    if (
      ((u.replPid = r.replPid ?? 0),
      (u.replProcStart = r.replProcStart),
      (u.bootedViaResume =
        r.dispatch.launch.mode !== "exec" &&
        (r.dispatch.launch.restoresTranscript ?? r.dispatch.launch.mode === "resume")),
      u.connectRv(),
      r.pendingRespawn === "upgrade" &&
        !(
          r.cliVersion &&
          isNewerBuild(
            r.cliVersion,
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
            }.VERSION,
          )
        ) &&
        !lmt(
          r.cliVersion,
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
          }.VERSION,
        ))
    )
      (u.transitionTo({ kind: "upgrading" }),
        setTimeout(
          (g) => {
            if (g.phase.kind === "upgrading" && !g.record.outcome) g.sigtermWorker();
          },
          5000,
          u,
        ).unref());
    if (
      u.dispatch.launch.mode !== "exec" &&
      r.ptySock &&
      r.cliVersion &&
      (r.rvAuth === void 0 || r.ptyAuth === void 0)
    )
      return (
        logForDebugging(
          `[bg] adopt ${u.dispatch.short}: roster rvAuth/ptyAuth missing for token-era worker \u2014 schema-skewed daemon stripped them`,
          { level: "warn" },
        ),
        u.rekeyForAuthMismatch("missing-at-adopt"),
        u
      );
    return u;
  }
  static unverified(e, r, s, n) {
    let o = new DaemonSupervisor(
      r.dispatch,
      void 0,
      void 0,
      "adopted",
      {
        pid: r.pid,
        attempt: r.attempt,
        startedAt: r.startedAt,
        messagingSock: r.messagingSock,
        state: "adopted",
        detail: "adopted (pid unverifiable; tracking via pty.sock)",
        cliVersion: r.cliVersion,
      },
      s,
      n,
    );
    if (
      ((o.attempt = r.attempt),
      (o.procStart = r.procStart),
      (o.rosterExtras = rosterEntryExtras(r)),
      r.firedInteractiveMarks)
    )
      o.firedInteractiveMarks = r.firedInteractiveMarks.slice(0, 2);
    return (
      (o.replPid = r.replPid ?? 0),
      (o.replProcStart = r.replProcStart),
      (o.bootedViaResume =
        r.dispatch.launch.mode !== "exec" &&
        (r.dispatch.launch.restoresTranscript ?? r.dispatch.launch.mode === "resume")),
      (o.rvSockPath = r.rendezvousSock),
      (o.ptySockPath = r.ptySock),
      (o.rvAuth = r.rvAuth),
      (o.ptyAuth = r.ptyAuth),
      (o.unverifiedSock = r.ptySock),
      (o.lastInputAt = Date.now()),
      (o.pidPoll = setInterval(
        (p) => {
          if (p.record.outcome || !p.unverifiedSock) return;
          pingPtySocket(p.unverifiedSock).then((h) => {
            if (h || p.record.outcome || p.phase.kind !== "spawning") return;
            p.settle("crashed");
          });
        },
        POLL_INTERVAL_MS,
        o,
      )),
      o.pidPoll.unref(),
      logEvent("tengu_bg_adopt_unverified", { short: bgShort(e) }),
      o
    );
  }
  tail(e) {
    return e > 0 ? this.ring.slice(-e) : [];
  }
  ringSnapshot() {
    return this.ring;
  }
  get sessionIdTaken() {
    return this.sessionIdTakenLatch;
  }
  preInitErrorTail() {
    let trimmed = qa(this.ring.slice(this.ringSpawnMark).join("")).replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    return trimmed.length > MAX_RESTART_DETAIL ? `\u2026${trimmed.slice(-MAX_RESTART_DETAIL)}` : trimmed;
  }
  decModeSnapshot() {
    return this.decModes.snapshot();
  }
  write(e) {
    ((this.lastInputAt = Date.now()), this.pty?.write(e));
  }
  noteActivity() {
    this.lastInputAt = Date.now();
  }
  shiftGraceClocksForward(e) {
    if (e <= 0) return;
    if (((this.hostWokeAt = Date.now()), this.adoptedAt !== void 0)) this.adoptedAt += e;
    if (this.lastInputAt !== void 0) this.lastInputAt += e;
  }
  seedFocus(e) {
    if (this.dispatch.launch.mode === "exec") return;
    this.pty?.write(e ? FOCUS_IN : FOCUS_OUT);
  }
  resize(e, r) {
    if (((this.ptyCols = e), (this.ptyRows = r), getPlatform() === "windows" && !this.workerReady)) {
      this.resizeDeferred = !0;
      return;
    }
    try {
      this.pty?.resize(e, r);
    } catch {}
  }
  signalPtyPgrp() {
    if (getPlatform() === "windows" || !this.record.pid) return;
    setTimeout(
      (e) => {
        try {
          process.kill(-e, "SIGWINCH");
        } catch {}
      },
      15,
      this.record.pid,
    );
  }
  resizeForRepaint(e, r) {
    if (e !== this.ptyCols || r !== this.ptyRows)
      return (this.resize(e, r), this.signalPtyPgrp(), this.rv?.send({ type: "repaint" }), () => {});
    let s = this.rv?.send({ type: "repaint" }) === !0,
      n = () => {},
      o = setTimeout(
        (p, h) => {
          if ((n(), this.ptyCols !== p || this.ptyRows !== h)) return;
          let max = Math.max(2, p - 1);
          (this.resize(max, h),
            this.signalPtyPgrp(),
            setTimeout(
              (g, f, w) => {
                if (this.ptyCols === w && this.ptyRows === f) (this.resize(g, f), this.signalPtyPgrp());
              },
              30,
              p,
              h,
              max,
            ));
        },
        s ? 50 : 0,
        e,
        r,
      );
    if (s)
      n = this.onRepaintDone.subscribe(() => {
        (n(), clearTimeout(o));
      });
    return () => {
      (n(), clearTimeout(o));
    };
  }
  rosterEntry() {
    return {
      ...this.rosterExtras,
      pid: this.record.pid,
      procStart: this.procStart,
      sessionId: this.record.sessionId,
      rendezvousSock: this.rvSockPath ?? Wwn(this.dispatch.short),
      ptySock: this.record.legacy ? void 0 : (this.ptySockPath ?? FA(this.dispatch.short)),
      messagingSock: this.record.messagingSock,
      cliVersion: this.record.cliVersion,
      startedAt: this.record.startedAt,
      attempt: this.attempt,
      cwd: this.dispatch.cwd,
      worktreePath: this.dispatch.worktree?.path,
      dispatch: this.cappedDispatch(),
      pendingRespawn: this.phase.kind === "upgrading" ? "upgrade" : void 0,
      decModes: this.decModes.snapshot(),
      firedInteractiveMarks:
        this.firedInteractiveMarks.length > 0 ? this.firedInteractiveMarks.slice(0, 2) : void 0,
      rvAuth: this.rvAuth,
      ptyAuth: this.ptyAuth,
      replPid: this.replPid > 1 ? this.replPid : void 0,
      replProcStart: this.replPid > 1 ? this.replProcStart : void 0,
    };
  }
  cappedDispatch() {
    return JSON.parse(
      JSON.stringify(this.dispatch, (e, r) => {
        let upper = e.toUpperCase();
        if (
          e === "reattachEnv" ||
          e === "attachStallRespawns" ||
          BG_PASSTHROUGH_ENV_VARS.includes(upper === "PATH" ? e : upper)
        )
          return;
        if (typeof r === "string" && r.length > MAX_STATUS_DETAIL) return r.slice(0, MAX_STATUS_DETAIL);
        return r;
      }),
    );
  }
  async reply(e, { nextTurn: r = !1 } = {}) {
    if (((this.lastInputAt = Date.now()), (this.lastInputAttacher = void 0), this.isReplyQueueOnly)) {
      let p;
      if (this.rvRejected) p = "the worker rejected the rendezvous token";
      else if (!this.rv) p = "no rendezvous client";
      else if (!this.rv.send({ type: "reply", text: e, ...(r && { nextTurn: r }) }))
        p = "the rendezvous is not connected";
      if (p) logForDebugging(`[bg] ${this.record.short}: reply refused: ${p}`);
      return !p;
    }
    let s = await readJobState(getJobDir(this.dispatch.short), this.storageV5),
      o = s?.tempo === "blocked" || (await this.isReplWaiting()) || this.record.tempo === "blocked";
    if ((!s || o || r) && this.rv?.send({ type: "reply", text: e, ...(r && { nextTurn: r }) })) return !0;
    if (r || (o && this.dispatch.launch.mode !== "exec")) return !1;
    if (this.pty) {
      let p = this.dispatch.launch.mode !== "exec";
      return (
        (this.replyChain = this.replyChain.then(
          () =>
            new Promise((h) => {
              (this.pty?.write(p ? `\x1B[200~${e}\x1B[201~` : e),
                setTimeout(
                  (u) => {
                    (this.pty?.write("\r"), u());
                  },
                  10,
                  h,
                ));
            }),
        )),
        !0
      );
    }
    return this.rv?.send({ type: "reply", text: e }) ?? !1;
  }
  async isReplWaiting() {
    if (this.replPid <= 1 || this.dispatch.launch.mode === "exec") return !1;
    try {
      let { liveStatusOfJob: liveStatusOfJob } = await import("./chunk-ewxn4535.js");
      return (await liveStatusOfJob(this.replPid, this.dispatch.short)) === "waiting";
    } catch (error) {
      return (
        logForDebugging(
          `[bg] ${this.dispatch.short}: live status unreadable (${getErrnoCode(error) ?? errorMessage(error)}), treating as waiting`,
        ),
        !0
      );
    }
  }
  sendAttacherCaps(e) {
    return this.rv?.send({ type: "attacher-caps", caps: e }) ?? !1;
  }
  kill(e = "SIGTERM", r = "killed", s) {
    if (this.phase.kind === "retired") return;
    if (
      ((this.killOutcome = r === "failed" ? "failed" : "killed"),
      (this.handoffKill = this.handoffKill || r === "handoff"),
      s)
    )
      this.patch({ detail: s });
    if ((this.transitionTo({ kind: "retiring", reason: "reap" }), this.backoffTimer))
      (clearTimeout(this.backoffTimer), (this.backoffTimer = null));
    if (this.unverifiedSock) {
      killViaPtySocket(this.unverifiedSock, this.storageV5).finally(() => this.settle(this.killOutcome));
      return;
    }
    if (this.pty)
      try {
        this.pty.kill(e);
      } catch {}
    else if (this.record.pid && !this.pidRecycled())
      try {
        process.kill(-this.record.pid, e);
      } catch {
        try {
          process.kill(this.record.pid, e);
        } catch {}
      }
    if (!this.pty) this.settle(this.killOutcome);
  }
  stop() {
    if (this.phase.kind === "retiring" && this.phase.reason === "reap") this.settle(this.killOutcome);
    else if (this.phase.kind === "retiring" && this.phase.reason === "grace") this.settle("done");
    else if (this.phase.kind !== "retired") this.transitionTo({ kind: "retiring", reason: "stop" });
    if (this.backoffTimer) (clearTimeout(this.backoffTimer), (this.backoffTimer = null));
    (this.clearLiveness(),
      this.offData?.dispose(),
      this.offExit?.dispose(),
      this.execTracker?.dispose(),
      (this.execTracker = void 0),
      this.pty?.dispose(),
      (this.pty = void 0));
  }
  async doSpawn(e, r = !1, s) {
    if (
      (this.attempt++,
      (this.authRekeyFired = !1),
      (this.pendingAuthRekey = void 0),
      (this.workerReady = !1),
      (this.firedInteractiveMarks = []),
      this.attempt > 1)
    )
      this.liveTranscriptPath = null;
    ((this.resizeDeferred = !1),
      (this.ringSpawnMark = this.ring.length),
      (this.lastSpawnAt = Date.now()),
      (this.lastExitExternalStop = !1),
      (this.lastExitOwnCrash = !1));
    let dispatch = this.dispatch,
      o = getJobDir(dispatch.short);
    await ensureJobTmpFolder(dispatch.short, this.storageV5).catch(() => {});
    let p = processWrapperError();
    if (p) {
      (logEvent("tengu_bg_launcher_worker_refused", { attempt: this.attempt }),
        logFeatureBad("agent_launcher", "worker_refused"),
        this.patch({ state: "crashed", detail: p }));
      let dimNotice = this.dimNotice(p);
      return (this.pushRing(dimNotice), this.onStream.emit(dimNotice), this.settle("crashed"));
    }
    let h = shouldCarryAuth(dispatch)
        ? await writeAuthSnapshot(dispatch.short, this.getAuthSnapshot?.())
        : void 0,
      u = await writeAgentMetadata_2(
        dispatch.short,
        dispatch.launch.mode === "exec" ? { ptyAuth: this.socketAuth().ptyAuth } : this.socketAuth(),
      );
    try {
      await ensureDaemonSocketDirs(dirname(JC(this.ptySockPath ?? FA(dispatch.short))));
    } catch (error) {
      if (this.credentials)
        await Promise.all([
          u ? this.credentials.discardSpentCredentialFile(u).catch(() => {}) : void 0,
          h ? this.credentials.discardSpentCredentialFile(h).catch(() => {}) : void 0,
        ]);
      else
        await Promise.all([
          u ? unlink_2(u).catch(() => {}) : void 0,
          h ? unlink_2(h).catch(() => {}) : void 0,
        ]);
      if (this.record.outcome) return;
      if (getErrnoCode(error) === ENOTOWNED) {
        let V = `worker socket directory is not owned by this user \u2014 ${errorMessage(error)}`;
        this.patch({ state: "crashed", detail: V });
        let dimNotice = this.dimNotice(V);
        return (this.pushRing(dimNotice), this.onStream.emit(dimNotice), this.settle("crashed"));
      }
      return this.scheduleRespawn(errorMessage(error));
    }
    (await unlink_2(JC(this.ptySockPath ?? FA(dispatch.short))).catch(() => {}), discardBgExitSidecars(o));
    let g = dispatch.launch.mode === "resume" ? dispatch.launch.sessionId : void 0,
      f = !1,
      w = !1,
      sessionId = dispatch.sessionId,
      S,
      { respawnFlags: respawnFlags, cwd: cwd } = dispatch,
      O = !1,
      G;
    if (this.attempt > 1) {
      let T = s?.row ?? (await readJobState(o, this.storageV5));
      if (T === null && dispatch.launch.mode !== "exec") G = await qXe(o, this.storageV5);
      ((sessionId = T?.resumeSessionId ?? dispatch.sessionId),
        (respawnFlags = s
          ? withoutReplyOnResume(s.row.respawnFlags)
          : (T?.respawnFlags ?? dispatch.respawnFlags)),
        (cwd = T?.cwd ?? dispatch.cwd),
        (O = T?.interactiveLineage === !0));
      let V = wrapStorageSource(getTranscriptStorageContext(this.storageV5)),
        H = await resolveJobTranscript(sessionId, cwd, T?.linkScanPath, void 0, V);
      if (((f = H.hasMessages), f)) ((S = H.path), (this.liveTranscriptPath = H.path));
      if (dispatch.source === "spare" && G === "absent" && !f) G = void 0;
      let F = g !== void 0 && isTranscriptFileResumeArg(g);
      if (
        ((w =
          !f &&
          g !== void 0 &&
          !(await resolveJobTranscript(F ? basename(g, ".jsonl") : g, cwd, F ? g : void 0, void 0, V))
            .hasMessages),
        !f && !s)
      )
        await quarantineJobTranscript(H.path, V);
    }
    if (
      ((this.effectiveCwd = cwd),
      this.phase.kind === "retiring" || this.phase.kind === "retired" || this.record.outcome)
    ) {
      if (u)
        if (this.credentials) this.credentials.discardSpentCredentialFile(u).catch(() => {});
        else unlink_2(u).catch(() => {});
      return;
    }
    if (s && !f)
      return (
        this.followUpCrashNotice(NOT_RESTARTED_NO_TRANSCRIPT),
        this.settleAsOnDisk(s.row, "settled_no_transcript")
      );
    if (w)
      return (
        this.patch({ state: "crashed", detail: `source session ${g} not found` }),
        this.settle("crashed")
      );
    if (!this.spawnPty)
      return (
        this.patch({ state: "crashed", detail: "Bun.Terminal unavailable (running under Node?)" }),
        logEvent("tengu_bg_pty_unavailable", { short: bgShort(this.dispatch.short) }),
        this.settle("crashed")
      );
    let L = buildSessionLaunchArgs(dispatch, this.attempt, f, sessionId, S, respawnFlags);
    this.bootedViaResume =
      (dispatch.launch.mode === "prompt" || dispatch.launch.mode === "resume") &&
      (this.attempt === 1 || (!f && sessionId === dispatch.sessionId))
        ? (dispatch.launch.restoresTranscript ?? L.includes("--resume"))
        : L.includes("--resume");
    let C = buildBgSessionEnv(dispatch, o, h, this.rvSockPath ?? Wwn(dispatch.short), this.socketAuth());
    if (s) delete C.CLAUDE_CODE_RESUME_INTERRUPTED_TURN;
    else if (this.attempt > 1 && f && !r) {
      if (((C.CLAUDE_CODE_RESUME_INTERRUPTED_TURN = "1"), Je())) {
        if (((C.CLAUDE_CODE_RESUME_PROMPT ??= RESTART_CONTINUE_PROMPT), O))
          C.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS ??= String(RESTART_WINDOW_MS);
      }
    }
    if (this.attempt > 1 && !f && sessionId !== dispatch.sessionId) C.CLAUDE_BG_POST_CLEAR_RESPAWN = "1";
    if ((Nbo(C, e), u))
      (delete C.CLAUDE_BG_RV_AUTH, delete C.CLAUDE_BG_PTY_AUTH, (C.CLAUDE_BG_SOCKET_TOKENS_PATH = u));
    if ((soe(C), syncProcessWrapperEnv(C, dispatch), getPlatform() === "macos" && jbo() && Dt()))
      C.CLAUDE_PTY_HOST_NO_STABLE_PATH = "1";
    else delete C.CLAUDE_PTY_HOST_NO_STABLE_PATH;
    delete C.CLAUDE_CODE_DISABLE_BG_STABLE_PATH;
    let x = this.ptyCols || (dispatch.cols ?? 200),
      W = this.ptyRows || (dispatch.rows ?? 50),
      P;
    try {
      let { cmd: cmd, prefixArgs: prefixArgs } =
        dispatch.launch.mode === "exec"
          ? { cmd: stripLongPathPrefixes(dispatch.launch.cmd), prefixArgs: [] }
          : getLaunchCommand({ pinToCurrentBinary: !0 });
      P = this.spawnPty(cmd, [...prefixArgs, ...L], {
        cols: x,
        rows: W,
        cwd: cwd,
        env: C,
        ptySock: this.ptySockPath ?? FA(dispatch.short),
        short: dispatch.short,
        ptyAuth: this.ptyAuth,
      });
    } catch (error) {
      let V = getErrnoCode(error),
        H = processWrapperArgv()[0];
      if (isENOENT(error)) {
        let [F, X] = await Promise.all([
          access(cwd).then(
            () => !0,
            () => !1,
          ),
          H || dispatch.launch.mode === "exec"
            ? !1
            : access(getLaunchCommand({ pinToCurrentBinary: !0 }).cmd).then(() => !1, isENOENT),
        ]);
        if (this.record.outcome) return;
        if (!F) return this.settleCwdGone("cold", cwd);
        let ie = H
          ? `launcher \`${H}\` was deleted or moved (ENOENT) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER, then run your command again`
          : dispatch.launch.mode === "exec"
            ? `${dispatch.launch.cmd}: command not found`
            : X
              ? "daemon binary was deleted (upgrade in progress) \u2014 run your command again to use the new version"
              : `Couldn't start the session. Run \`claude daemon stop --any\` (ends background sessions), then run your command again. (${errorMessage(error)})`;
        if (H)
          (logEvent("tengu_bg_launcher_worker_refused", { attempt: this.attempt }),
            logFeatureBad("agent_launcher", "worker_launcher_enoent"));
        else
          logEvent("tengu_bg_spawn_binary_gone", {
            short: bgShort(this.dispatch.short),
            attempt: this.attempt,
            binary_present: !X && dispatch.launch.mode !== "exec",
          });
        this.patch({ state: "crashed", detail: ie });
        let dimNotice = this.dimNotice(ie);
        return (this.pushRing(dimNotice), this.onStream.emit(dimNotice), this.settle("crashed"));
      }
      if (H && (V === "EACCES" || V === "EPERM")) {
        if (this.record.outcome) return;
        let F = `launcher \`${H}\` could not be executed (${V})`;
        (logEvent("tengu_bg_launcher_worker_refused", { attempt: this.attempt }),
          logFeatureBad(
            "agent_launcher",
            V === "EACCES" ? "worker_launcher_eacces" : "worker_launcher_eperm",
          ),
          this.patch({ state: "crashed", detail: F }));
        let dimNotice = this.dimNotice(F);
        return (this.pushRing(dimNotice), this.onStream.emit(dimNotice), this.settle("crashed"));
      }
      return this.scheduleRespawn(errorMessage(error));
    }
    if (dispatch.launch.mode === "exec")
      (this.execTracker?.dispose(),
        (this.execTracker = createPtyActivityTracker(o, this.storageV5)),
        (this.workerReady = !0));
    if (getPlatform() === "windows") writeFile(owe(dispatch.short), String(P.pid)).catch(() => {});
    if (
      (this.wirePty(P),
      this.rv?.close(),
      (this.rv = void 0),
      (this.lastRvHeartbeat = void 0),
      (this.stalledLogged = !1),
      this.connectRv(),
      this.patch({
        pid: P.pid,
        attempt: this.attempt,
        state: this.attempt > 1 ? "resuming" : "running",
        detail: "",
        cliVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      }),
      logEvent("tengu_bg_worker_spawn", {
        short: bgShort(this.dispatch.short),
        attempt: this.attempt,
        source: fromEnum(this.dispatch.source),
        launch_mode: fromEnum(this.dispatch.launch.mode),
      }),
      G)
    )
      YXe(r ? "upgrade" : "crash", G);
    if (s)
      logEvent("tengu_bg_respawn_settled", {
        short: bgShort(this.dispatch.short),
        reason: fromEnum(s.neededBy),
        attempt: this.attempt,
      });
    getProcessStartTimeAsync(P.pid, { skipCache: !0 }).then((T) => {
      if (!T || this.record.pid !== P.pid || this.isDetached || this.record.outcome) return;
      ((this.procStart = T), this.patch({ pid: P.pid }));
    });
  }
  wirePty(e) {
    ((this.pty = e),
      this.transitionTo({ kind: "running" }),
      (this.decModes = createPrivateModeTracker()),
      e.onResume?.(() => {
        this.rv?.send({ type: "repaint" });
      }),
      e.onRepl?.((s, n) => {
        if (!this.record.pid || this.record.outcome || this.isDetached) return;
        ((this.replPid = s), (this.replProcStart = n), this.onState.emit({ pid: this.record.pid }));
      }),
      (this.offData = e.onData((s) => {
        if (this.decModes.feed(s) && this.record.pid) this.onState.emit({ pid: this.record.pid });
        (this.execTracker?.feed(s),
          this.pushRing(s.includes(DAEMON_DETACH_APC) ? s.replaceAll(DAEMON_DETACH_APC, "") : s),
          this.onStream.emit(s));
      })));
    let r = !1;
    this.offExit = e.onExit(({ exitCode: exitCode, signal: signal, hostStderr: hostStderr }) => {
      if (r) return;
      ((r = !0),
        this.offData?.dispose(),
        (this.execLastLine = this.execTracker?.lastLine),
        this.execTracker?.dispose(),
        (this.execTracker = void 0),
        (this.pty = void 0),
        this.onExit(exitCode, signal, hostStderr));
    });
  }
  dimNotice(e) {
    return wrapDaemonHint(`\r
\x1B[2m[${e}]\x1B[0m\r
`);
  }
  followUpCrashNotice(e) {
    if (this.crashFollowUp === e) return;
    this.crashFollowUp = e;
    let dimNotice = this.dimNotice(e);
    (this.pushRing(dimNotice), this.onStream.emit(dimNotice));
  }
  pushRing(e) {
    if (
      (this.ring.push(e), (this.ringBytes += e.length), this.ringBytes > _yn * 1.25 && this.ring.length > 1)
    ) {
      let r = 0,
        s = 0;
      while (this.ringBytes - s > _yn && r < this.ring.length - 1) ((s += this.ring[r].length), r++);
      (this.ring.splice(0, r),
        (this.ringBytes -= s),
        (this.ringSpawnMark = Math.max(0, this.ringSpawnMark - r)));
    }
  }
  patch(e) {
    if (
      (Object.assign(this.record, e),
      this.onState.emit(e),
      this.pendingAuthRekey !== void 0 && e.tempo !== void 0 && e.tempo !== "active")
    ) {
      let pendingAuthRekey = this.pendingAuthRekey;
      readJobState(getJobDir(this.dispatch.short), this.storageV5).then((s) => {
        if (this.pendingAuthRekey !== pendingAuthRekey) return;
        let n = getAdoptActivityState(s, pendingAuthRekey);
        if (n === "settled") {
          ((this.pendingAuthRekey = void 0),
            (this.authRekeyFired = !1),
            logForDebugging(
              `[bg] worker ${this.dispatch.short}: deferred auth-mismatch re-key (${pendingAuthRekey}) dropped \u2014 worker settled; leaving to retireIfSettled`,
              { level: "warn" },
            ));
          return;
        }
        if (n !== null) return;
        (logForDebugging(
          `[bg] worker ${this.dispatch.short}: deferred auth-mismatch re-key (${pendingAuthRekey}) firing on tempo='${e.tempo}'`,
          { level: "warn" },
        ),
          this.fireAuthRekey());
      });
    }
  }
  onExit(e, r, s) {
    if (this.isDetached) return;
    if (this.phase.kind === "retired") return;
    let n = this.lastSpawnAt ? Date.now() - this.lastSpawnAt : void 0;
    if (Date.now() - this.lastCheckPidAt > STALE_POLL_MS) this.hostWokeAt = Date.now();
    let o = this.hostWokeAt !== void 0 && Date.now() - this.hostWokeAt < STABLE_RUN_MS,
      p = !o && n !== void 0 && n < RESTART_BACKOFF_MS && e !== 0;
    if (p) this.fastCrashStreak++;
    else this.fastCrashStreak = 0;
    let h = this.fastCrashStreak >= 3,
      u = this.workerReady && n !== void 0 && n >= MAX_RESTART_BACKOFF_MS;
    this.lastExitExternalStop = (r !== void 0 || SIGNAL_EXIT_CODES.has(e ?? -1)) && !o;
    let g = this.workerReady ? void 0 : this.preInitErrorTail(),
      f = processWrapperArgv()[0],
      w = s ? truncateWithEllipsis(Dr(qa(s)), MAX_RESTART_DETAIL) || void 0 : void 0,
      E = f && !this.workerReady && !g && w ? `(launch command: \`${f}\` \u2026): ${w}` : void 0,
      S = !!f && e === 0 && !this.workerReady && n !== void 0 && n < Xit,
      R = e !== 0 ? readAndClearBgExitCause(getJobDir(this.dispatch.short)) : void 0;
    this.lastExitOwnCrash =
      r === void 0 &&
      (e === 1 || e === uOt) &&
      (R?.startsWith("uncaught:") === !0 || R?.startsWith("unhandled:") === !0);
    let A = R ? readAndClearBgExitDetail(getJobDir(this.dispatch.short), R) : void 0,
      O = A ? truncateWithEllipsis(Dr(qa(A)), MAX_RESTART_DETAIL) || void 0 : void 0,
      G = !g && O ? `: ${O}` : "",
      L = p && !!R && R === this.lastExitCause;
    this.lastExitCause = p ? R : void 0;
    let C = !this.workerReady && R === BG_EXIT_CAUSE_SESSION_IN_USE,
      x = g ? ` \u2014 ${g}` : E ? ` \u2014 ${E}` : R ? ` \u2014 ${R}` : "",
      W = this.effectiveCwd ?? this.dispatch.cwd,
      P = !1;
    if (R === "setcwd")
      try {
        P = !statSync(W).isDirectory();
      } catch {
        P = !0;
      }
    let T = this.dispatch.launch.mode === "exec" && (r === "SIGINT" || r === "SIGQUIT"),
      V;
    if (this.phase.kind === "retiring" && this.phase.reason === "reap") V = this.killOutcome;
    else if (this.phase.kind === "retiring" && this.phase.reason === "grace") V = "done";
    else if (this.phase.kind === "upgrading") V = void 0;
    else if (S) V = "crashed";
    else if (e === 0) V = "done";
    else if (this.dispatch.launch.mode === "exec") V = T ? "killed" : "crashed";
    else if (
      P ||
      C ||
      (!this.workerReady && (this.attempt >= 2 || g || E)) ||
      h ||
      L ||
      (!u && this.attempt >= MAX_RESTARTS)
    )
      V = "crashed";
    if (
      (logEvent("tengu_bg_worker_exit", {
        short: bgShort(this.dispatch.short),
        code: e ?? void 0,
        signal: fromEnumOpt(r),
        attempt: this.attempt,
        procUptimeMs: n,
        source: fromEnum(this.dispatch.source),
        launch_mode: fromEnum(this.dispatch.launch.mode),
        outcome: fromEnumOpt(V),
        exitCause: sanitizedBgExitCauseForTelemetry(R),
        worker_cli_version: sanitizeVersion(this.record.cliVersion),
        worker_stale: this.isVersionStale,
      }),
      this.phase.kind === "retiring")
    )
      return this.settle(this.phase.reason === "reap" ? this.killOutcome : "done");
    if (this.phase.kind === "upgrading") {
      (this.transitionTo({ kind: "spawning" }),
        (this.attempt = 1),
        (this.fastCrashStreak = 0),
        (this.lastExitCause = void 0),
        this.patch({ pid: 0, state: "starting", detail: "upgrading" }),
        (this.procStart = void 0),
        this.buildBridgeReattachEnvFromState()
          .then((F) => this.doSpawn(F, !0))
          .catch(logError));
      return;
    }
    if (S) {
      let F = `the launcher exited before Claude Code started \u2014 \`${f}\` must exec, not daemonize${E ? ` \u2014 ${E}` : ""}`;
      return (
        logEvent("tengu_bg_launcher_fork_and_exit", { attempt: this.attempt }),
        logFeatureBad("agent_launcher", "worker_fork_and_exit"),
        this.patch({ state: "crashed", detail: F }),
        this.settle("crashed")
      );
    }
    if (e === 0) {
      if (this.dispatch.launch.mode === "exec") {
        if (!this.execLastLine && this.ringBytes > 0)
          logEvent("tengu_bg_exec_no_lastline", { ring_bytes: this.ringBytes });
        this.patch({ detail: this.execLastLine || "(no output)" });
      }
      return this.settle("done");
    }
    let H = r ? `${r} (${e})` : `exit ${e}`;
    if (this.dispatch.launch.mode === "exec") {
      let execLastLine = this.execLastLine;
      return (
        this.patch({
          state: T ? "stopped" : "crashed",
          detail: execLastLine ? `${H} \u2014 ${execLastLine}` : `${H}${x}`,
        }),
        this.settle(T ? "killed" : "crashed")
      );
    }
    if (C) {
      ((this.sessionIdTakenLatch = !0),
        logEvent("tengu_bg_session_id_taken", {
          short: bgShort(this.dispatch.short),
          attempt: this.attempt,
          via: fromEnum(this.via),
          launch_mode: fromEnum(this.dispatch.launch.mode),
        }),
        this.patch({ state: "crashed", detail: SESSION_ID_TAKEN_NOTICE }));
      let dimNotice = this.dimNotice(SESSION_ID_TAKEN_NOTICE);
      return (this.pushRing(dimNotice), this.onStream.emit(dimNotice), this.settle("crashed"));
    }
    if (!this.workerReady && R?.startsWith("spare_postclaim:"))
      try {
        if (!statSync(this.dispatch.cwd).isDirectory()) return this.settleCwdGone("spare");
      } catch {
        return this.settleCwdGone("spare");
      }
    if (P) return this.settleCwdGone("boot", W);
    if (!this.workerReady && (this.attempt >= 2 || g || E)) {
      let F = !r && isLowMemory() ? " \u2014 possibly low memory \u2014 free some up and retry" : "";
      return (this.patch({ state: "crashed", detail: `${H} before init${x || F}` }), this.settle("crashed"));
    }
    if (h || L)
      return (
        this.patch({
          state: "crashed",
          detail: L
            ? `${H} \xD7${this.attempt}${x}${G}`
            : `${H} within ${RESTART_BACKOFF_MS / 1000}s of spawn \xD7${this.fastCrashStreak}${x}${G}`,
        }),
        this.settle("crashed")
      );
    if (u) this.attempt = 1;
    this.scheduleRespawn(`${H}${x}${G}`);
  }
  async doSpawnUnlessSettledOnDisk(e = !1) {
    let backoffTimer = this.backoffTimer,
      s = getJobDir(this.dispatch.short),
      n = Je(),
      o = n ? await readJobStateFreshOrNull(s, this.storageV5).catch(() => null) : null,
      p =
        o ??
        (n && !e
          ? await readJobState(s, this.storageV5).catch(() => {
              return;
            })
          : void 0),
      h = p && isSettled(p) && !p.queuedPrompt ? p : void 0,
      u =
        o !== null &&
        h !== void 0 &&
        terminalOutcome(h.state) === "success" &&
        this.lastExitOwnCrash &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_settled_crash_restart", !0) === !0,
      g = u
        ? await readPinnedJobIds(this.storageV5).catch(() => {
            return;
          })
        : void 0;
    if (
      this.record.outcome ||
      this.phase.kind === "retiring" ||
      this.phase.kind === "retired" ||
      this.backoffTimer !== backoffTimer
    )
      return;
    let f = !u
      ? void 0
      : this.attachers.size > 0
        ? "attached"
        : (h.inFlight?.kinds ?? []).includes("session_cron")
          ? "session_cron"
          : g?.has(this.dispatch.short)
            ? "pinned"
            : void 0;
    if (h && (!f || this.attempt > RESTART_WINDOW)) {
      if (e && !this.workerReady) return;
      if (
        (this.followUpCrashNotice(
          f
            ? `not restarted \u2014 this session crashed again after ${this.attempt - 1} restarts (the conversation is saved)`
            : terminalOutcome(h.state) === "stopped"
              ? NOT_RESTARTED_STOPPED
              : NOT_RESTARTED_IDLE,
        ),
        e)
      )
        return this.armBackoff(RESTART_NOTICE_MS);
      return this.settleAsOnDisk(h, f ? "settled_restart_cap" : "settled_on_disk");
    }
    if (p?.interactiveLineage && this.lastExitExternalStop) {
      if (e) return;
      return (
        logEvent("tengu_bg_respawn_suppressed", {
          short: bgShort(this.dispatch.short),
          reason: lit("no_task_contract"),
        }),
        this.patch({ state: "stopped", detail: "stopped by an external signal" }),
        this.settle("killed")
      );
    }
    if (e) {
      if (!n || p) this.followUpCrashNotice(RESTART_PENDING_NOTICE);
      return;
    }
    if (this.crashFollowUp && this.crashFollowUp !== RESTART_PENDING_NOTICE)
      this.followUpCrashNotice(RESTART_NOW_NOTICE);
    return this.doSpawn(void 0, !1, h && f && { row: h, neededBy: f });
  }
  settleAsOnDisk(e, r) {
    logEvent("tengu_bg_respawn_suppressed", { short: bgShort(this.dispatch.short), reason: fromEnum(r) });
    let s = terminalOutcome(e.state);
    this.settle(s === "success" ? "done" : s === "failure" ? "failed" : "killed");
  }
  settleCwdGone(e, r = this.dispatch.cwd) {
    let s = Vuo(r);
    (logEvent("tengu_bg_spawn_cwd_gone", {
      short: bgShort(this.dispatch.short),
      attempt: this.attempt,
      via: fromEnum(e),
    }),
      this.patch({ state: "crashed", detail: s }));
    let dimNotice = this.dimNotice(`${s} \u2014 this job cannot be respawned`);
    (this.pushRing(dimNotice), this.onStream.emit(dimNotice), this.settle("crashed"));
  }
  async buildBridgeReattachEnvFromState() {
    let e = await readJobState(getJobDir(this.dispatch.short), this.storageV5).catch(() => null);
    if (!e) return;
    return buildBridgeReattachEnv(
      e.bridgeSessionId,
      e.bridgeSessionSeq,
      e.bridgeOutboundOnly,
      e.bridgeSessionGroupingId,
      {
        ownerAccountUuid: e.bridgeOwnerAccountUuid,
        ownerOrganizationUuid: e.bridgeOwnerOrganizationUuid,
        noHistoryBackfill: e.bridgeNoHistoryBackfill,
      },
    );
  }
  scheduleRespawn(e) {
    if (this.attempt >= MAX_RESTARTS)
      return (
        logEvent("tengu_bg_respawn_exhausted", {
          short: bgShort(this.dispatch.short),
          attempts: this.attempt,
        }),
        this.patch({ state: "crashed", detail: e }),
        this.settle("crashed")
      );
    if (this.phase.kind === "running") this.transitionTo({ kind: "spawning" });
    (this.patch({ pid: 0, state: "crashed", detail: `${e}; respawning` }), (this.procStart = void 0));
    let dimNotice = this.dimNotice(`worker crashed (${e})`);
    (this.pushRing(dimNotice),
      this.onStream.emit(dimNotice),
      (this.crashFollowUp = void 0),
      this.armBackoff(RESTART_DELAY_MS),
      this.doSpawnUnlessSettledOnDisk(!0).catch(logError));
  }
  armBackoff(e) {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    ((this.backoffTimer = setTimeout(() => {
      if (((this.backoffTimer = null), this.phase.kind !== "retiring" && this.phase.kind !== "retired"))
        this.doSpawnUnlessSettledOnDisk().catch(logError);
    }, e)),
      this.backoffTimer.unref());
  }
  settle(e) {
    if (this.record.outcome) return;
    (logEvent("tengu_bg_settle", {
      short: bgShort(this.dispatch.short),
      outcome: fromEnum(e),
      uptimeMs: Date.now() - this.record.startedAt,
      attempt: this.attempt,
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
      worker_stale: this.isVersionStale,
    }),
      this.transitionTo({ kind: "retired", outcome: e }),
      this.clearLiveness(),
      this.patch({ outcome: e, settledAt: Date.now(), tempo: "idle" }),
      this.onSettle.emit(e));
  }
  connectRv() {
    if (this.rv || this.isDetached || this.record.outcome) return;
    if (this.dispatch.launch.mode === "exec") {
      this.startPidPoll();
      return;
    }
    ((this.rv = connectRendezvousSocket(
      this.rvSockPath ?? Wwn(this.dispatch.short),
      (e) => {
        if (e.type === "heartbeat") this.lastRvHeartbeat = Date.now();
        else if (e.type === "auth-rejected" || e.type === "reply-rejected")
          ((this.rvRejected = !0),
            logEvent(
              e.type === "auth-rejected" ? "tengu_bg_rv_auth_mismatch" : "tengu_bg_rv_reply_rejected",
              {},
            ),
            this.rekeyForAuthMismatch(e.type === "auth-rejected" ? "rv-auth-rejected" : "rv-reply-rejected"));
        else if (e.type === "done") this.settle(e.outcome);
        else if (e.type === "state") this.patch(e.patch);
        else if (e.type === "detach-request") {
          let r = daemonDetachApc(e.msg),
            s = this.attachers.get(this.lastInputAttacher);
          if (!e.broadcast && s) s.deliver(r);
          else if (this.attachers.size > 0) for (let n of this.attachers.values()) n.deliver(r);
          else this.onStream.emit(r);
        } else if (e.type === "repaint-done") this.onRepaintDone.emit();
        else if (e.type === "interactive-mark") {
          let r = parseInteractiveMarkRv(e);
          if (!r) {
            (logForDebugging(`[bg ${this.record.short}] dropped malformed rv interactive-mark frame`, {
              level: "warn",
            }),
              logEvent("tengu_bg_imark_malformed", {}));
            return;
          }
          if (
            this.firedInteractiveMarks.length < 2 &&
            !this.firedInteractiveMarks.some((firedInteractiveMark) => firedInteractiveMark.kind === r.kind)
          ) {
            if ((this.firedInteractiveMarks.push(r), this.record.pid))
              this.onState.emit({ pid: this.record.pid });
          }
          for (let s of this.attachers.values())
            if (s.caps?.imark === !0) s.deliver(interactiveMarkApc({ ...r, nonce: s.imarkNonce }));
        }
      },
      () => void this.checkPid(),
      () => {
        if (((this.workerReady = !0), (this.rvRejected = !1), this.resizeDeferred))
          ((this.resizeDeferred = !1), this.resize(this.ptyCols, this.ptyRows));
        if (this.attachers.size > 0) {
          let at = [...this.attachers.values()].at(-1);
          this.sendAttacherCaps(at.caps ?? null);
        } else this.sendAttacherCaps(null);
      },
      this.rvAuth,
    )),
      this.startPidPoll());
  }
  startPidPoll() {
    if (this.pidPoll) return;
    ((this.lastCheckPidAt = Date.now()),
      (this.pidPoll = setInterval(() => void this.checkPid(!0), POLL_INTERVAL_MS)),
      this.pidPoll.unref());
  }
  pidRecycled() {
    if (!this.procStart || !this.record.pid) return !1;
    let e = getProcessStartTime(this.record.pid);
    return e !== void 0 && e !== this.procStart;
  }
  async pidRecycledAsync() {
    if (!this.procStart || !this.record.pid) return !1;
    let e = await getProcessStartTimeAsync(this.record.pid);
    return e !== void 0 && e !== this.procStart;
  }
  async failIfHostExited(e) {
    let pid = this.record.pid;
    if (!pid || this.record.outcome || this.isKilling || !this.pty) return !1;
    let s = await readLinuxProcState(pid);
    if (!RY(s)) return !1;
    if (this.record.outcome || this.isKilling || !this.pty || this.record.pid !== pid) return !1;
    return (
      logForDebugging(
        `bg: ${this.dispatch.short} pty host pid=${pid} has exited but is unreaped (state ${s}) via=${e} \u2014 reaping it and marking the session failed`,
        { level: "warn" },
      ),
      logEvent("tengu_bg_ptyhost_zombie", {
        short: bgShort(this.dispatch.short),
        via: fromEnum(e),
        state: fromEnum(s === "Z" ? "Z" : "X"),
        uptimeMs: Date.now() - this.record.startedAt,
        attachers: this.attachers.size,
      }),
      this.kill(
        "SIGKILL",
        "failed",
        this.dispatch.launch.mode === "exec" ? HOST_DIED_EXEC_DETAIL : HOST_DIED_DETAIL,
      ),
      !0
    );
  }
  pidPollTick = 0;
  async checkPid(e = !1) {
    let r = Date.now() - this.lastCheckPidAt;
    this.lastCheckPidAt = Date.now();
    let s = r > STALE_POLL_MS;
    if (s) this.hostWokeAt = Date.now();
    if (this.record.outcome || !this.record.pid) return;
    if (s && this.lastRvHeartbeat !== void 0) this.lastRvHeartbeat = Date.now();
    if (!this.pty)
      try {
        process.kill(this.record.pid, 0);
      } catch (error) {
        let p = getErrnoCode(error);
        if (p === "ESRCH" || p === "EPERM")
          (this.logVanished(!1, e), this.settle(this.isKilling ? "killed" : "crashed"));
        return;
      }
    let lastRvHeartbeat = this.lastRvHeartbeat;
    if (
      !s &&
      !this.stalledLogged &&
      lastRvHeartbeat !== void 0 &&
      Date.now() - lastRvHeartbeat > ATTACH_TIMEOUT_MS
    ) {
      let o = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
      if (!this.stalledLogged && (o?.tempo ?? this.record.tempo) === "active")
        ((this.stalledLogged = !0),
          logEvent("tengu_bg_worker_stalled", {
            short: bgShort(this.dispatch.short),
            sinceMs: Date.now() - lastRvHeartbeat,
          }));
    }
    if (this.pty) {
      await this.failIfHostExited("poll");
      return;
    }
    if (e && this.pidPollTick++ % 12 !== 0) return;
    if (await this.pidRecycledAsync()) {
      if (this.record.outcome || this.pty) return;
      (this.logVanished(!0, e), this.settle(this.isKilling ? "killed" : "crashed"));
    }
  }
  logVanished(e, r) {
    if (this.isKilling) return;
    logEvent("tengu_bg_worker_vanished", {
      short: bgShort(this.dispatch.short),
      recycled: e,
      fromPoll: r,
      uptimeMs: Date.now() - this.record.startedAt,
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
      worker_stale: this.isVersionStale,
    });
  }
  clearLiveness() {
    if (this.pidPoll) (clearInterval(this.pidPoll), (this.pidPoll = null));
    (this.rv?.close(), (this.rv = void 0), (this.lastRvHeartbeat = void 0), (this.stalledLogged = !1));
  }
}

export {
  normalizeEnvKeyCase,
  BG_STRIPPED_ENV_VARS,
  isProviderManagedByHost,
  usesCustomEndpoint,
  DaemonSupervisor,
  shouldCarryAuth,
};
