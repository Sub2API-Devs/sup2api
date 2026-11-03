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
import { randomBytes } from "crypto";
import { dirname, basename } from "path";
import { unlink, access, writeFile } from "fs/promises";
import { statSync } from "fs";
import { SUBAGENT_MODEL_ENV_NAMES, withoutReplyOnResume } from "../../cli/forwardedFlags.js";
import {
  PROVIDER_SELECTION_ENV_VARS,
  BASE_URL_ENV_VARS,
  SKIP_AUTH_ENV_VARS,
  HOST_MANAGED_MARKER_ENV_VARS,
  PROVIDER_ENDPOINT_COMPANION_VARS,
  PROVIDER_CREDENTIAL_ENV_VARS,
  HOST_ONLY_ENV_VARS,
} from "../../utils/managedEnvConstants.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import {
  BG_CARRIED_ENV_KEYS_2,
  SANDBOX_ENV_VARS,
  copyCarriedInternalEnv,
  stripCoworkHostEnvKeys,
  pickAllowedEnv,
  BG_CARRIED_ENV_KEYS,
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
  cwdGoneReason,
  ATTACH_TIMEOUT_MS,
} from "./sessionRestart.js";
import { createSignal } from "../../utils/signal.js";
import {
  createPrivateModeTracker,
  isAtLeastRelease,
  isNewerBuild,
  rcChannelDiffers,
  pingPtySocket,
  killViaPtySocket,
  probeJobState,
  logRestartWithoutSavedState,
} from "./reapJobs.js";
import {
  isGreedyCraneEnabled,
  connectPtyHost,
  createPtyActivityTracker,
  NOT_RESTARTED_NO_TRANSCRIPT,
  isRevivalGuardEnabled,
  isCosmicCookieEnabled,
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
import { isColorCommandForceHidden } from "../../commands/color/index.js";
import { daemonSessionStateLabel } from "./sessionStatus.js";
import {
  createPtyHostSpawner,
  buildBgSessionEnv,
  syncProcessWrapperEnv,
  buildSessionLaunchArgs,
  writeAuthSnapshot,
} from "./spawnBgSession.js";
import { logError } from "../../utils/log.js";
import {
  daemonRvSocket,
  daemonPtySocket,
  ptyErrFile,
  ENOTOWNED,
  daemonPtyPidFile,
} from "../../utils/sandbox/userNamespace.js";
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
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { FOCUS_IN, FOCUS_OUT } from "../../ink/termio/csi.js";
import {
  getErrnoCode,
  errorMessage,
  isENOENT,
  sanitizedBgExitCauseForTelemetry,
} from "../../utils/errors.js";
import { ensureJobTmpFolder } from "./jobFolder.js";
import { processWrapperError, processWrapperArgv, PROCESS_WRAPPER_ENV } from "../../utils/processWrapper.js";
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
import { isRunningFromVersionsDir, getLaunchCommand } from "../../utils/deepLink/registerProtocol.js";
import { stripLongPathPrefixes } from "../../utils/windowsUncPaths.js";
import { MAX_CONTROL_FRAME_BYTES } from "../../utils/framedSocket.js";
import { truncateWithEllipsis } from "../sessionStatus/sessionStateClassifier.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { EX_SOFTWARE } from "../../utils/exitCodes.js";
import { isLowMemory } from "../../daemon/lowMemory.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { isMinorFaultField } from "../../utils/procStat.js";

//@ chunk-89ebz077.js:16458-17100 placement
/**
 * 启动后台会话时要清掉的环境变量列表，以及 Windows 下环境变量键名大小写规范化表。
 */
var BG_STRIPPED_ENV_VARS = [
  ...SUBAGENT_MODEL_ENV_NAMES,
  "CLAUDE_CODE_CLIENT_DATA_URL",
  "CLAUDE_CODE_ALLOW_OTHER_MODELS",
  "CLAUDE_CODE_REMOVE_PROMPT_STRINGS",
  "CLAUDE_CODE_ATTRIBUTION_PROJECT",
  "CLAUDE_CODE_SKIP_PLUGIN_LOCAL_MCP_SERVERS",
  "CLAUDE_CODE_SKIP_PLUGIN_MCP_BUNDLES",
  ...PROVIDER_SELECTION_ENV_VARS,
  "CLAUDE_CODE_EXTRA_BODY",
  "CLAUDE_CODE_AUTO_MODE_MODEL",
  ...BASE_URL_ENV_VARS,
  ...SKIP_AUTH_ENV_VARS,
  "ANTHROPIC_CUSTOM_HEADERS",
  ...HOST_MANAGED_MARKER_ENV_VARS,
  "CLAUDE_CODE_HOST_GATEWAY_LINEAGE",
  "CLAUDE_CODE_HOST_CREDS_FILE",
];
var isProviderManagedByHost = (e) => isEnvTruthy(e.env?.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
var shouldCarryAuth = (dispatch) => dispatch.launch.mode !== "exec" && !isProviderManagedByHost(dispatch);
var BG_ENV_KEY_CASE_MAP = new Map(
  [
    "CLAUDE_CONFIG_DIR",
    "CLAUDE_BG_SOCK_ADMIT_SILENT_PEERS",
    ...BG_CARRIED_ENV_KEYS_2,
    ...SANDBOX_ENV_VARS,
    ...BG_STRIPPED_ENV_VARS,
    ...PROVIDER_ENDPOINT_COMPANION_VARS,
    ...PROVIDER_CREDENTIAL_ENV_VARS,
    ...HOST_ONLY_ENV_VARS,
  ].map((e) => [e.toUpperCase(), e]),
);
//@ chunk-89ebz077.js:17100-17336 placement
/**
 * Windows 下把环境变量键名规范为已知大小写（已有同名规范键时不覆盖）。
 */
function normalizeEnvKeyCase(env, r = []) {
  if (getPlatform() !== "windows") return;
  let s = new Map(r.map((n) => [n.toUpperCase(), n]));
  for (let key of Object.keys(env)) {
    let upper = key.toUpperCase();
    let p = BG_ENV_KEY_CASE_MAP.get(upper) ?? s.get(upper);
    if (p === undefined || p === key) continue;
    if (env[p] === undefined) env[p] = env[key];
    delete env[key];
  }
}
//@ chunk-89ebz077.js:17336-17463 placement
function usesCustomEndpoint(e, r) {
  return (
    !!e[r.endpoint] &&
    (r.endpoint === "ANTHROPIC_BASE_URL" ||
      r.companions.some((companion) => SKIP_AUTH_ENV_VARS.includes(companion) && isEnvTruthy(e[companion])))
  );
}
//@ chunk-89ebz077.js:17463-17758 placement
/**
 * 作业是否仍有在途工作：有排队、非可排空的任务未完成（结束后只剩允许类型的除外）或有会话定时任务。
 */
function hasPendingInFlightWork(e) {
  let filtered = (e.inFlight?.kinds ?? []).filter(
    (o) => o !== "artifact_watch" || !(e.inFlight?.drainableMonitors ?? 0),
  );
  let s = isSettled(e) && filtered.length > 0 && filtered.every((o) => DRAINABLE_TASK_KINDS.includes(o));
  let n = (e.inFlight?.tasks ?? 0) - (e.inFlight?.drainableMonitors ?? 0);
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
function getAdoptActivityState(jobState, r) {
  let jobActivityState = getJobActivityState(jobState);
  if (jobActivityState === "settled" && r !== "missing-at-adopt")
    return jobState && hasPendingInFlightWork(jobState) ? "inflight" : null;
  return jobActivityState;
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
function isValidStateTransition(phase, r) {
  if (phase.kind === "retired") return false;
  switch (r.kind) {
    case "spawning":
      return phase.kind === "upgrading" || phase.kind === "running";
    case "running":
      return phase.kind === "spawning";
    case "upgrading":
      return phase.kind === "running";
    case "retiring":
      return true;
    case "retired":
      return true;
  }
}
//@ chunk-89ebz077.js:18373-64813 placement
/**
 * 后台守护进程主管：管理 bg-pty 会话进程、附着者、状态流、认证快照与重启。
 */
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
  lastExitOwnCrash = false;
  lastExitCause;
  lastExitExternalStop = false;
  effectiveCwd;
  liveTranscriptPath;
  hostWokeAt;
  backoffTimer = null;
  crashFollowUp;
  pidPoll = null;
  rv;
  rvRejected = false;
  rvSockPath;
  ptySockPath;
  rvAuth = randomBytes(16).toString("hex");
  ptyAuth = randomBytes(16).toString("hex");
  authRekeyFired = false;
  authRekeyCount = 0;
  pendingAuthRekey;
  rosterExtras = {};
  unverifiedSock;
  phase = {
    kind: "spawning",
  };
  workerReady = false;
  sessionIdTakenLatch = false;
  firedInteractiveMarks = [];
  bootedViaResume = false;
  resizeDeferred = false;
  lastInputAt;
  downgradeRefusalLogged = false;
  deleteJobDirOnSettle = false;
  get shouldDeleteJobDir() {
    return this.deleteJobDirOnSettle;
  }
  adoptedAt;
  lastRvHeartbeat;
  stalledLogged = false;
  lastCheckPidAt = Date.now();
  replyChain = Promise.resolve();
  killOutcome = "killed";
  handoffKill = false;
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
      isGreedyCraneEnabled() &&
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
    if (!r || r.caps?.imark !== true) return;
    for (let firedInteractiveMark of this.firedInteractiveMarks)
      r.deliver(
        interactiveMarkApc({
          ...firedInteractiveMark,
          nonce: r.imarkNonce,
        }),
      );
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
    if (this.isVersionStale) return false;
    return this.bootedViaResume || this.firedInteractiveMarks.length > 0;
  }
  get bootingForAttachMetrics() {
    return this.isBooting || (this.marksCapable && this.firedInteractiveMarks.length === 0);
  }
  get isUnverified() {
    return this.unverifiedSock !== undefined;
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
    if (!isValidStateTransition(this.phase, e)) {
      logForDebugging(
        `[bg] illegal worker-phase transition ${formatSupervisorState(this.phase)} \u2192 ${formatSupervisorState(e)} for ${this.record.short}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_bg_phase_illegal", {});
      return false;
    }
    this.phase = e;
    return true;
  }
  shutdownWorker() {
    let e =
      this.rv?.send({
        type: "shutdown",
      }) ?? false;
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
    this.downgradeRefusalLogged = true;
    logEvent("tengu_bg_respawn_downgrade_refused", {
      short: bgShort(this.dispatch.short),
      trigger: fromEnum(e),
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
    });
  }
  async respawnIfIdleStale(e, r = "sweep") {
    if (this.dispatch.launch.mode === "exec")
      return {
        respawned: false,
        reason: "not-stale",
      };
    if (this.isTransitioning)
      return {
        respawned: false,
        reason: "in-progress",
      };
    if (this.record.outcome)
      return {
        respawned: false,
        reason: "no-state",
      };
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
    ) {
      this.noteDowngradeRefused(r);
      return {
        respawned: false,
        reason: "not-stale",
      };
    }
    if (
      rcChannelDiffers(
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
      return {
        respawned: false,
        reason: "not-stale",
      };
    if (this.attachers.size > 0)
      return {
        respawned: false,
        reason: "attached",
      };
    if (!this.isVersionStale)
      return {
        respawned: false,
        reason: "not-stale",
      };
    if (r !== "attach" && this.lastInputAt && Date.now() - this.lastInputAt < MAX_UPGRADE_WAIT_MS)
      return {
        respawned: false,
        reason: "busy",
      };
    let now = Date.now();
    let jobState = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
    if (this.isTransitioning)
      return {
        respawned: false,
        reason: "in-progress",
      };
    if (this.record.outcome)
      return {
        respawned: false,
        reason: "no-state",
      };
    if (this.attachers.size > 0)
      return {
        respawned: false,
        reason: "attached",
      };
    if (this.lastInputAt && this.lastInputAt >= now)
      return {
        respawned: false,
        reason: "busy",
      };
    if (!jobState)
      return {
        respawned: false,
        reason: "no-state",
      };
    if (
      r !== "attach" &&
      !isSettled(jobState) &&
      this.adoptedAt &&
      Date.now() - this.adoptedAt < CLAIM_TIMEOUT_MS
    )
      return {
        respawned: false,
        reason: "busy",
      };
    if (isSettled(jobState) && r === "sweep" && !e?.has(this.dispatch.short))
      return {
        respawned: false,
        reason: "settled",
      };
    if (
      !isSettled(jobState) &&
      jobState.tempo !== "idle" &&
      !(this.isParkedIdleFork(jobState) && jobState.inFlight !== undefined)
    )
      return {
        respawned: false,
        reason: "busy",
      };
    if (hasPendingInFlightWork(jobState))
      return {
        respawned: false,
        reason: "inflight",
      };
    if (
      !this.transitionTo({
        kind: "upgrading",
      })
    )
      return {
        respawned: false,
        reason: "in-progress",
      };
    this.onState.emit({
      pid: this.record.pid,
    });
    logEvent("tengu_bg_respawn_stale", {
      short: bgShort(this.dispatch.short),
      rvSent: this.shutdownWorker(),
      trigger: fromEnum(r),
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
    });
    return {
      respawned: true,
    };
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
        e.inFlight?.drainableMonitors !== undefined) &&
      e.state === "working" &&
      e.tempo === "blocked" &&
      e.needs === IDLE_NEEDS &&
      e.interactiveLineage === true
    );
  }
  async retireIfSettled(e, r, s = e, { shedMonitoringOnly: n = false } = {}) {
    if (this.isTransitioning)
      return {
        retired: false,
        reason: "in-progress",
      };
    if (this.record.outcome)
      return {
        retired: false,
        reason: "no-state",
      };
    if (this.attachers.size > 0)
      return {
        retired: false,
        reason: "attached",
      };
    if (isProviderManagedByHost(this.dispatch))
      return {
        retired: false,
        reason: "host-managed",
      };
    if (r?.has(this.dispatch.short))
      return {
        retired: false,
        reason: "pinned",
      };
    if (this.adoptedAt && Date.now() - this.adoptedAt < CLAIM_TIMEOUT_MS)
      return {
        retired: false,
        reason: "recent-adopt",
      };
    if (this.lastInputAt && Date.now() - this.lastInputAt < e)
      return {
        retired: false,
        reason: "recent-input",
      };
    let jobState = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
    if (this.isTransitioning || this.attachers.size > 0)
      return {
        retired: false,
        reason: "in-progress",
      };
    if (this.lastInputAt && Date.now() - this.lastInputAt < e)
      return {
        retired: false,
        reason: "recent-input",
      };
    if (!jobState) {
      if (this.dispatch.source === "spare" && Date.now() - this.dispatch.createdAt > e) {
        if (
          !this.transitionTo({
            kind: "retiring",
            reason: "grace",
          })
        )
          return {
            retired: false,
            reason: "in-progress",
          };
        let x = Date.now() - this.dispatch.createdAt;
        logEvent("tengu_bg_retired", {
          short: bgShort(this.dispatch.short),
          rvSent: this.shutdownWorker(),
          settledForMs: x,
          state: lit("stale-spare"),
          cause: lit("stale-spare"),
          worker_cli_version: sanitizeVersion(this.record.cliVersion),
        });
        return {
          retired: true,
          cause: "stale-spare",
          idleMs: x,
        };
      }
      return {
        retired: false,
        reason: "no-state",
      };
    }
    if (
      this.dispatch.source !== "shell" &&
      !isColorCommandForceHidden() &&
      !jobState.name &&
      !jobState.intent &&
      !jobState.worktreePath &&
      jobState.template === "bg" &&
      jobState.state === "working" &&
      jobState.tempo === "blocked" &&
      !((jobState.inFlight?.tasks ?? 0) > 0)
    ) {
      let timestamp = Date.parse(jobState.createdAt);
      let timestamp_2 = Date.parse(jobState.updatedAt);
      let P = Date.now() - (timestamp_2 > timestamp ? timestamp_2 : timestamp);
      if (P < IDLE_RETIRE_MS)
        return {
          retired: false,
          reason: "empty-idle-grace",
        };
      if (
        !this.transitionTo({
          kind: "retiring",
          reason: "grace",
        })
      )
        return {
          retired: false,
          reason: "in-progress",
        };
      this.deleteJobDirOnSettle = true;
      logEvent("tengu_bg_retired", {
        short: bgShort(this.dispatch.short),
        rvSent: this.shutdownWorker(),
        settledForMs: P,
        state: lit("empty-idle"),
        cause: lit("empty-idle"),
        worker_cli_version: sanitizeVersion(this.record.cliVersion),
      });
      return {
        retired: true,
        cause: "empty-idle",
        idleMs: P,
      };
    }
    let p = this.isParkedIdleFork(jobState);
    let h =
      isSettled(jobState) ||
      (this.dispatch.launch.mode !== "exec" &&
        (jobState.tempo === "idle" || (jobState.state === "blocked" && jobState.tempo === "blocked") || p));
    let timestamp = Date.parse(jobState.updatedAt);
    let g =
      jobState.tempo === "blocked" &&
      jobState.state !== "blocked" &&
      jobState.needs !== undefined &&
      jobState.needs !== IDLE_NEEDS;
    let f =
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
      !rcChannelDiffers(
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
      jobState.tempo !== "active" &&
      !g &&
      !jobState.routine &&
      (jobState.inFlight?.tasks ?? 0) - (jobState.inFlight?.drainableMonitors ?? 0) === 0 &&
      (jobState.inFlight?.queued ?? 0) === 0 &&
      !(jobState.inFlight?.kinds ?? []).includes("session_cron") &&
      timestamp < Date.now() - ABANDONED_WORKER_MS;
    if (!h && !f)
      return {
        retired: false,
        reason: "not-settled",
      };
    let w = n || f ? (jobState.inFlight?.drainableMonitors ?? 0) : 0;
    let filtered = (jobState.inFlight?.kinds ?? []).filter((x) => x !== "artifact_watch" || w === 0);
    let S =
      isSettled(jobState) && filtered.length > 0 && filtered.every((x) => DRAINABLE_TASK_KINDS.includes(x));
    let R =
      jobState.interactiveLineage === true &&
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
      );
    let A = f && !R ? 0 : 1;
    if ((jobState.inFlight?.queued ?? A) > 0 || ((jobState.inFlight?.tasks ?? A) - w > 0 && !S))
      return {
        retired: false,
        reason: "inflight",
      };
    if (filtered.includes("session_cron"))
      return {
        retired: false,
        reason: "session-cron",
      };
    if (jobState.routine)
      return {
        retired: false,
        reason: "routine",
      };
    let O = jobState.bridgeSessionId ? Math.max(e, s) : e;
    let G = jobState.updatedAt && Date.now() - Date.parse(jobState.updatedAt);
    if (!G || G < O)
      return {
        retired: false,
        reason: "grace",
      };
    if (
      !this.transitionTo({
        kind: "retiring",
        reason: "grace",
      })
    )
      return {
        retired: false,
        reason: "in-progress",
      };
    let L = jobState.inFlight?.tasks !== undefined && jobState.inFlight.queued !== undefined;
    let C = !h || !L || (!n && w > 0) ? "abandoned-stale" : isSettled(jobState) ? "settled" : "idle-prompt";
    logEvent("tengu_bg_retired", {
      short: bgShort(this.dispatch.short),
      rvSent: this.shutdownWorker(),
      settledForMs: G,
      bridged: !!jobState.bridgeSessionId,
      detritusOnly: S,
      state: daemonSessionStateLabel(jobState.state),
      cause: fromEnum(C),
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
    });
    return {
      retired: true,
      cause: C,
      idleMs: G,
    };
  }
  sigtermWorker() {
    try {
      this.pty?.kill("SIGTERM");
    } catch {}
  }
  onPtyAuthRequired() {
    let mode = this.dispatch.launch.mode;
    logEvent("tengu_bg_pty_auth_mismatch", {
      mode: fromEnum(mode),
    });
    if (mode === "exec") {
      logForDebugging(
        `[bg] exec worker ${this.dispatch.short}: ptyHost rejected auth token \u2014 roster ptyAuth poisoned; input is dead until re-dispatch (exec workers are never auto-respawned)`,
        {
          level: "warn",
        },
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
        {
          level: "warn",
        },
      );
      return;
    }
    this.authRekeyFired = true;
    readJobState(getJobDir(this.dispatch.short), this.storageV5).then((jobState) => {
      let adoptActivityState = getAdoptActivityState(jobState, e);
      if (adoptActivityState === "settled") {
        this.authRekeyFired = false;
        logEvent("tengu_bg_adopt_token_lost_respawn", {
          source: fromEnum(e),
          deferred: false,
          skipped: lit("settled"),
        });
        logForDebugging(
          `[bg] worker ${this.dispatch.short}: auth mismatch (${e}) \u2014 worker already settled; leaving to retireIfSettled`,
          {
            level: "warn",
          },
        );
        return;
      }
      if (adoptActivityState !== null) {
        logEvent("tengu_bg_adopt_token_lost_respawn", {
          source: fromEnum(e),
          deferred: true,
          reason: fromEnum(adoptActivityState),
        });
        logForDebugging(
          `[bg] worker ${this.dispatch.short}: auth mismatch (${e}) \u2014 ` +
            (adoptActivityState === "active"
              ? "worker is mid-turn"
              : "worker has non-resumable in-flight work") +
            "; deferring re-key respawn until safe",
          {
            level: "warn",
          },
        );
        this.pendingAuthRekey = e;
        return;
      }
      logEvent("tengu_bg_adopt_token_lost_respawn", {
        source: fromEnum(e),
        deferred: false,
      });
      logForDebugging(
        `[bg] worker ${this.dispatch.short}: auth mismatch (${e}) \u2014 respawning to re-key (--resume preserves the session)`,
        {
          level: "warn",
        },
      );
      this.fireAuthRekey();
    });
  }
  fireAuthRekey() {
    this.pendingAuthRekey = undefined;
    if (this.phase.kind !== "running" || this.record.outcome) return;
    if (
      !this.transitionTo({
        kind: "upgrading",
      })
    )
      return;
    this.authRekeyCount++;
    this.onState.emit({
      pid: this.record.pid,
    });
    this.sigtermWorker();
  }
  constructor(dispatch, spawnPty, getAuthSnapshot, via, o, storageV5, credentials) {
    this.dispatch = dispatch;
    this.spawnPty = spawnPty;
    this.getAuthSnapshot = getAuthSnapshot;
    this.via = via;
    this.storageV5 = storageV5;
    this.credentials = credentials;
    this.record = {
      short: dispatch.short,
      nonce: dispatch.nonce,
      sessionId: dispatch.sessionId,
      pid: 0,
      attempt: 0,
      startedAt: Date.now(),
      createdAt: dispatch.createdAt,
      cwd: dispatch.cwd,
      backend: "daemon",
      tempo: "active",
      state: "starting",
      detail: "",
      intent: dispatch.seed?.intent ?? "",
      name: dispatch.seed?.name,
      agent: dispatch.agent,
      routine: dispatch.routine,
      worktreePath: dispatch.worktree?.path,
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
      source: dispatch.source,
      ...o,
    };
    if (dispatch.cols) this.ptyCols = dispatch.cols;
    if (dispatch.rows) this.ptyRows = dispatch.rows;
  }
  static spawn(e, r, s, n, o, p) {
    let h = new DaemonSupervisor(e, r ?? createPtyHostSpawner(), s, "cold", undefined, o, p);
    if (n?.afterUpgrade) {
      h.attempt = 1;
      h.buildBridgeReattachEnvFromState()
        .then((u) => h.doSpawn(u, true))
        .catch(logError);
      return h;
    }
    h.doSpawn(e.reattachEnv).catch(logError);
    return h;
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
    s.attempt = 1;
    s.bootedViaResume =
      e.launch.mode !== "exec" && (e.launch.restoresTranscript ?? e.launch.mode === "resume");
    s.ptySockPath = r.ptySockPath;
    s.rvSockPath = daemonRvSocket(e.short);
    if (r.ptyAuth) s.ptyAuth = r.ptyAuth;
    discardBgExitSidecars(getJobDir(e.short));
    s.wirePty(
      connectPtyHost(r.ptySockPath, r.pid, {
        short: e.short,
        auth: s.ptyAuth,
      }),
    );
    s.resize(e.cols ?? 200, e.rows ?? 50);
    s.connectRv();
    getProcessStartTimeAsync(r.pid, {
      skipCache: true,
    }).then((processStartTime) => {
      if (s.record.pid !== r.pid || s.isDetached || s.record.outcome) return;
      if (processStartTime) s.procStart = processStartTime;
      s.patch({
        pid: r.pid,
      });
    });
    return s;
  }
  socketAuth() {
    this.rvAuth ??= randomBytes(16).toString("hex");
    this.ptyAuth ??= randomBytes(16).toString("hex");
    return {
      rvAuth: this.rvAuth,
      ptyAuth: this.ptyAuth,
    };
  }
  static buildClaimFrame(e, r, s) {
    let jobDir = getJobDir(e.short);
    let bgSessionEnv = buildBgSessionEnv(e, jobDir, r, daemonRvSocket(e.short), s);
    delete bgSessionEnv.CLAUDE_BG_PTY_AUTH;
    copyCarriedInternalEnv(bgSessionEnv, e.reattachEnv);
    stripCoworkHostEnvKeys(bgSessionEnv);
    syncProcessWrapperEnv(bgSessionEnv, e);
    delete bgSessionEnv.CLAUDE_PTY_HOST_NO_STABLE_PATH;
    let argv = buildSessionLaunchArgs(e, 1, false, e.sessionId, undefined, e.respawnFlags);
    return {
      env: bgSessionEnv,
      argv,
    };
  }
  static async adopt(e, r, s, n, o, p) {
    if (r.dispatch.env) r.dispatch.env = pickAllowedEnv(r.dispatch.env, BG_CARRIED_ENV_KEYS);
    delete r.dispatch.reattachEnv;
    if (!isProcessRunning(r.pid)) return null;
    let h = await withDeadline(
      getProcessStartTimeAsync(r.pid, {
        skipCache: true,
      }),
      MIN_POLL_MS,
    );
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
        ...(r.ptySock
          ? {}
          : {
              legacy: true,
            }),
      },
      o,
      p,
    );
    u.attempt = r.attempt;
    u.procStart = r.procStart;
    u.rosterExtras = rosterEntryExtras(r);
    u.workerReady = true;
    u.adoptedAt = Date.now();
    u.rvSockPath = r.rendezvousSock;
    u.ptySockPath = r.ptySock;
    u.rvAuth = r.rvAuth;
    u.ptyAuth = r.ptyAuth;
    if (u.dispatch.launch.mode === "exec") {
      u.execTracker = createPtyActivityTracker(getJobDir(u.dispatch.short), u.storageV5);
      u.workerReady = true;
    }
    if (r.ptySock) {
      u.wirePty(
        connectPtyHost(r.ptySock, r.pid, {
          procStart: u.procStart,
          short: u.dispatch.short,
          auth: u.ptyAuth,
          onAuthRequired: () => u.onPtyAuthRequired(),
        }),
      );
      u.ptyCols = 0;
      u.seedFocus(false);
    }
    if (r.decModes) u.decModes.seed(r.decModes);
    if (r.firedInteractiveMarks) u.firedInteractiveMarks = r.firedInteractiveMarks.slice(0, 2);
    u.replPid = r.replPid ?? 0;
    u.replProcStart = r.replProcStart;
    u.bootedViaResume =
      r.dispatch.launch.mode !== "exec" &&
      (r.dispatch.launch.restoresTranscript ?? r.dispatch.launch.mode === "resume");
    u.connectRv();
    if (
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
      !rcChannelDiffers(
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
    ) {
      u.transitionTo({
        kind: "upgrading",
      });
      setTimeout(
        (g) => {
          if (g.phase.kind === "upgrading" && !g.record.outcome) g.sigtermWorker();
        },
        5000,
        u,
      ).unref();
    }
    if (
      u.dispatch.launch.mode !== "exec" &&
      r.ptySock &&
      r.cliVersion &&
      (r.rvAuth === undefined || r.ptyAuth === undefined)
    ) {
      logForDebugging(
        `[bg] adopt ${u.dispatch.short}: roster rvAuth/ptyAuth missing for token-era worker \u2014 schema-skewed daemon stripped them`,
        {
          level: "warn",
        },
      );
      u.rekeyForAuthMismatch("missing-at-adopt");
      return u;
    }
    return u;
  }
  static unverified(e, r, s, n) {
    let o = new DaemonSupervisor(
      r.dispatch,
      undefined,
      undefined,
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
    o.attempt = r.attempt;
    o.procStart = r.procStart;
    o.rosterExtras = rosterEntryExtras(r);
    if (r.firedInteractiveMarks) o.firedInteractiveMarks = r.firedInteractiveMarks.slice(0, 2);
    o.replPid = r.replPid ?? 0;
    o.replProcStart = r.replProcStart;
    o.bootedViaResume =
      r.dispatch.launch.mode !== "exec" &&
      (r.dispatch.launch.restoresTranscript ?? r.dispatch.launch.mode === "resume");
    o.rvSockPath = r.rendezvousSock;
    o.ptySockPath = r.ptySock;
    o.rvAuth = r.rvAuth;
    o.ptyAuth = r.ptyAuth;
    o.unverifiedSock = r.ptySock;
    o.lastInputAt = Date.now();
    o.pidPoll = setInterval(
      (p) => {
        if (p.record.outcome || !p.unverifiedSock) return;
        pingPtySocket(p.unverifiedSock).then((h) => {
          if (h || p.record.outcome || p.phase.kind !== "spawning") return;
          p.settle("crashed");
        });
      },
      POLL_INTERVAL_MS,
      o,
    );
    o.pidPoll.unref();
    logEvent("tengu_bg_adopt_unverified", {
      short: bgShort(e),
    });
    return o;
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
    let trimmed = stripAnsiPerLine(this.ring.slice(this.ringSpawnMark).join("")).replace(/\s+/g, " ").trim();
    if (!trimmed) return;
    return trimmed.length > MAX_RESTART_DETAIL ? `\u2026${trimmed.slice(-MAX_RESTART_DETAIL)}` : trimmed;
  }
  decModeSnapshot() {
    return this.decModes.snapshot();
  }
  write(e) {
    this.lastInputAt = Date.now();
    this.pty?.write(e);
  }
  noteActivity() {
    this.lastInputAt = Date.now();
  }
  shiftGraceClocksForward(e) {
    if (e <= 0) return;
    this.hostWokeAt = Date.now();
    if (this.adoptedAt !== undefined) this.adoptedAt += e;
    if (this.lastInputAt !== undefined) this.lastInputAt += e;
  }
  seedFocus(e) {
    if (this.dispatch.launch.mode === "exec") return;
    this.pty?.write(e ? FOCUS_IN : FOCUS_OUT);
  }
  resize(e, r) {
    this.ptyCols = e;
    this.ptyRows = r;
    if (getPlatform() === "windows" && !this.workerReady) {
      this.resizeDeferred = true;
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
    if (e !== this.ptyCols || r !== this.ptyRows) {
      this.resize(e, r);
      this.signalPtyPgrp();
      this.rv?.send({
        type: "repaint",
      });
      return () => {};
    }
    let s =
      this.rv?.send({
        type: "repaint",
      }) === true;
    let n = () => {};
    let timer = setTimeout(
      (p, h) => {
        n();
        if (this.ptyCols !== p || this.ptyRows !== h) return;
        let max = Math.max(2, p - 1);
        this.resize(max, h);
        this.signalPtyPgrp();
        setTimeout(
          (g, f, w) => {
            if (this.ptyCols === w && this.ptyRows === f) {
              this.resize(g, f);
              this.signalPtyPgrp();
            }
          },
          30,
          p,
          h,
          max,
        );
      },
      s ? 50 : 0,
      e,
      r,
    );
    if (s)
      n = this.onRepaintDone.subscribe(() => {
        n();
        clearTimeout(timer);
      });
    return () => {
      n();
      clearTimeout(timer);
    };
  }
  rosterEntry() {
    return {
      ...this.rosterExtras,
      pid: this.record.pid,
      procStart: this.procStart,
      sessionId: this.record.sessionId,
      rendezvousSock: this.rvSockPath ?? daemonRvSocket(this.dispatch.short),
      ptySock: this.record.legacy ? undefined : (this.ptySockPath ?? daemonPtySocket(this.dispatch.short)),
      messagingSock: this.record.messagingSock,
      cliVersion: this.record.cliVersion,
      startedAt: this.record.startedAt,
      attempt: this.attempt,
      cwd: this.dispatch.cwd,
      worktreePath: this.dispatch.worktree?.path,
      dispatch: this.cappedDispatch(),
      pendingRespawn: this.phase.kind === "upgrading" ? "upgrade" : undefined,
      decModes: this.decModes.snapshot(),
      firedInteractiveMarks:
        this.firedInteractiveMarks.length > 0 ? this.firedInteractiveMarks.slice(0, 2) : undefined,
      rvAuth: this.rvAuth,
      ptyAuth: this.ptyAuth,
      replPid: this.replPid > 1 ? this.replPid : undefined,
      replProcStart: this.replPid > 1 ? this.replProcStart : undefined,
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
  async reply(e, { nextTurn: r = false } = {}) {
    this.lastInputAt = Date.now();
    this.lastInputAttacher = undefined;
    if (this.isReplyQueueOnly) {
      let p;
      if (this.rvRejected) p = "the worker rejected the rendezvous token";
      else if (!this.rv) p = "no rendezvous client";
      else if (
        !this.rv.send({
          type: "reply",
          text: e,
          ...(r && {
            nextTurn: r,
          }),
        })
      )
        p = "the rendezvous is not connected";
      if (p) logForDebugging(`[bg] ${this.record.short}: reply refused: ${p}`);
      return !p;
    }
    let jobState = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
    let o = jobState?.tempo === "blocked" || (await this.isReplWaiting()) || this.record.tempo === "blocked";
    if (
      (!jobState || o || r) &&
      this.rv?.send({
        type: "reply",
        text: e,
        ...(r && {
          nextTurn: r,
        }),
      })
    )
      return true;
    if (r || (o && this.dispatch.launch.mode !== "exec")) return false;
    if (this.pty) {
      let p = this.dispatch.launch.mode !== "exec";
      this.replyChain = this.replyChain.then(
        () =>
          new Promise((resolve) => {
            this.pty?.write(p ? `\x1B[200~${e}\x1B[201~` : e);
            setTimeout(
              (u) => {
                this.pty?.write("\r");
                u();
              },
              10,
              resolve,
            );
          }),
      );
      return true;
    }
    return (
      this.rv?.send({
        type: "reply",
        text: e,
      }) ?? false
    );
  }
  async isReplWaiting() {
    if (this.replPid <= 1 || this.dispatch.launch.mode === "exec") return false;
    try {
      let { liveStatusOfJob } = await import("./chunk-ewxn4535.js");
      return (await liveStatusOfJob(this.replPid, this.dispatch.short)) === "waiting";
    } catch (error) {
      logForDebugging(
        `[bg] ${this.dispatch.short}: live status unreadable (${getErrnoCode(error) ?? errorMessage(error)}), treating as waiting`,
      );
      return true;
    }
  }
  sendAttacherCaps(caps) {
    return (
      this.rv?.send({
        type: "attacher-caps",
        caps,
      }) ?? false
    );
  }
  kill(e = "SIGTERM", r = "killed", s) {
    if (this.phase.kind === "retired") return;
    this.killOutcome = r === "failed" ? "failed" : "killed";
    this.handoffKill = this.handoffKill || r === "handoff";
    if (s)
      this.patch({
        detail: s,
      });
    this.transitionTo({
      kind: "retiring",
      reason: "reap",
    });
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
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
    else if (this.phase.kind !== "retired")
      this.transitionTo({
        kind: "retiring",
        reason: "stop",
      });
    if (this.backoffTimer) {
      clearTimeout(this.backoffTimer);
      this.backoffTimer = null;
    }
    this.clearLiveness();
    this.offData?.dispose();
    this.offExit?.dispose();
    this.execTracker?.dispose();
    this.execTracker = undefined;
    this.pty?.dispose();
    this.pty = undefined;
  }
  async doSpawn(e, r = false, s) {
    this.attempt++;
    this.authRekeyFired = false;
    this.pendingAuthRekey = undefined;
    this.workerReady = false;
    this.firedInteractiveMarks = [];
    if (this.attempt > 1) this.liveTranscriptPath = null;
    this.resizeDeferred = false;
    this.ringSpawnMark = this.ring.length;
    this.lastSpawnAt = Date.now();
    this.lastExitExternalStop = false;
    this.lastExitOwnCrash = false;
    let dispatch = this.dispatch;
    let jobDir = getJobDir(dispatch.short);
    await ensureJobTmpFolder(dispatch.short, this.storageV5).catch(() => {});
    let p = processWrapperError();
    if (p) {
      logEvent("tengu_bg_launcher_worker_refused", {
        attempt: this.attempt,
      });
      logFeatureBad("agent_launcher", "worker_refused");
      this.patch({
        state: "crashed",
        detail: p,
      });
      let T = this.dimNotice(p);
      this.pushRing(T);
      this.onStream.emit(T);
      return this.settle("crashed");
    }
    let h = shouldCarryAuth(dispatch)
      ? await writeAuthSnapshot(dispatch.short, this.getAuthSnapshot?.())
      : undefined;
    let u = await writeAgentMetadata_2(
      dispatch.short,
      dispatch.launch.mode === "exec"
        ? {
            ptyAuth: this.socketAuth().ptyAuth,
          }
        : this.socketAuth(),
    );
    try {
      await ensureDaemonSocketDirs(dirname(ptyErrFile(this.ptySockPath ?? daemonPtySocket(dispatch.short))));
    } catch (error) {
      if (this.credentials)
        await Promise.all([
          u ? this.credentials.discardSpentCredentialFile(u).catch(() => {}) : undefined,
          h ? this.credentials.discardSpentCredentialFile(h).catch(() => {}) : undefined,
        ]);
      else
        await Promise.all([
          u ? unlink(u).catch(() => {}) : undefined,
          h ? unlink(h).catch(() => {}) : undefined,
        ]);
      if (this.record.outcome) return;
      if (getErrnoCode(error) === ENOTOWNED) {
        let V = `worker socket directory is not owned by this user \u2014 ${errorMessage(error)}`;
        this.patch({
          state: "crashed",
          detail: V,
        });
        let H = this.dimNotice(V);
        this.pushRing(H);
        this.onStream.emit(H);
        return this.settle("crashed");
      }
      return this.scheduleRespawn(errorMessage(error));
    }
    await unlink(ptyErrFile(this.ptySockPath ?? daemonPtySocket(dispatch.short))).catch(() => {});
    discardBgExitSidecars(jobDir);
    let sessionId = dispatch.launch.mode === "resume" ? dispatch.launch.sessionId : undefined;
    let f = false;
    let w = false;
    let sessionId_2 = dispatch.sessionId;
    let S;
    let { respawnFlags, cwd } = dispatch;
    let O = false;
    let G;
    if (this.attempt > 1) {
      let T = s?.row ?? (await readJobState(jobDir, this.storageV5));
      if (T === null && dispatch.launch.mode !== "exec") G = await probeJobState(jobDir, this.storageV5);
      sessionId_2 = T?.resumeSessionId ?? dispatch.sessionId;
      respawnFlags = s
        ? withoutReplyOnResume(s.row.respawnFlags)
        : (T?.respawnFlags ?? dispatch.respawnFlags);
      cwd = T?.cwd ?? dispatch.cwd;
      O = T?.interactiveLineage === true;
      let V = wrapStorageSource(getTranscriptStorageContext(this.storageV5));
      let jobTranscript = await resolveJobTranscript(sessionId_2, cwd, T?.linkScanPath, undefined, V);
      f = jobTranscript.hasMessages;
      if (f) {
        S = jobTranscript.path;
        this.liveTranscriptPath = jobTranscript.path;
      }
      if (dispatch.source === "spare" && G === "absent" && !f) G = undefined;
      let F = sessionId !== undefined && isTranscriptFileResumeArg(sessionId);
      w =
        !f &&
        sessionId !== undefined &&
        !(
          await resolveJobTranscript(
            F ? basename(sessionId, ".jsonl") : sessionId,
            cwd,
            F ? sessionId : undefined,
            undefined,
            V,
          )
        ).hasMessages;
      if (!f && !s) await quarantineJobTranscript(jobTranscript.path, V);
    }
    this.effectiveCwd = cwd;
    if (this.phase.kind === "retiring" || this.phase.kind === "retired" || this.record.outcome) {
      if (u)
        if (this.credentials) this.credentials.discardSpentCredentialFile(u).catch(() => {});
        else unlink(u).catch(() => {});
      return;
    }
    if (s && !f) {
      this.followUpCrashNotice(NOT_RESTARTED_NO_TRANSCRIPT);
      return this.settleAsOnDisk(s.row, "settled_no_transcript");
    }
    if (w) {
      this.patch({
        state: "crashed",
        detail: `source session ${sessionId} not found`,
      });
      return this.settle("crashed");
    }
    if (!this.spawnPty) {
      this.patch({
        state: "crashed",
        detail: "Bun.Terminal unavailable (running under Node?)",
      });
      logEvent("tengu_bg_pty_unavailable", {
        short: bgShort(this.dispatch.short),
      });
      return this.settle("crashed");
    }
    let sessionLaunchArgs = buildSessionLaunchArgs(dispatch, this.attempt, f, sessionId_2, S, respawnFlags);
    this.bootedViaResume =
      (dispatch.launch.mode === "prompt" || dispatch.launch.mode === "resume") &&
      (this.attempt === 1 || (!f && sessionId_2 === dispatch.sessionId))
        ? (dispatch.launch.restoresTranscript ?? sessionLaunchArgs.includes("--resume"))
        : sessionLaunchArgs.includes("--resume");
    let bgSessionEnv = buildBgSessionEnv(
      dispatch,
      jobDir,
      h,
      this.rvSockPath ?? daemonRvSocket(dispatch.short),
      this.socketAuth(),
    );
    if (s) delete bgSessionEnv.CLAUDE_CODE_RESUME_INTERRUPTED_TURN;
    else if (this.attempt > 1 && f && !r) {
      bgSessionEnv.CLAUDE_CODE_RESUME_INTERRUPTED_TURN = "1";
      if (isRevivalGuardEnabled()) {
        bgSessionEnv.CLAUDE_CODE_RESUME_PROMPT ??= RESTART_CONTINUE_PROMPT;
        if (O) bgSessionEnv.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS ??= String(RESTART_WINDOW_MS);
      }
    }
    if (this.attempt > 1 && !f && sessionId_2 !== dispatch.sessionId)
      bgSessionEnv.CLAUDE_BG_POST_CLEAR_RESPAWN = "1";
    copyCarriedInternalEnv(bgSessionEnv, e);
    if (u) {
      delete bgSessionEnv.CLAUDE_BG_RV_AUTH;
      delete bgSessionEnv.CLAUDE_BG_PTY_AUTH;
      bgSessionEnv.CLAUDE_BG_SOCKET_TOKENS_PATH = u;
    }
    stripCoworkHostEnvKeys(bgSessionEnv);
    syncProcessWrapperEnv(bgSessionEnv, dispatch);
    if (getPlatform() === "macos" && isRunningFromVersionsDir() && isCosmicCookieEnabled())
      bgSessionEnv.CLAUDE_PTY_HOST_NO_STABLE_PATH = "1";
    else delete bgSessionEnv.CLAUDE_PTY_HOST_NO_STABLE_PATH;
    delete bgSessionEnv.CLAUDE_CODE_DISABLE_BG_STABLE_PATH;
    let cols = this.ptyCols || (dispatch.cols ?? 200);
    let rows = this.ptyRows || (dispatch.rows ?? 50);
    let P;
    try {
      let { cmd, prefixArgs } =
        dispatch.launch.mode === "exec"
          ? {
              cmd: stripLongPathPrefixes(dispatch.launch.cmd),
              prefixArgs: [],
            }
          : getLaunchCommand({
              pinToCurrentBinary: true,
            });
      P = this.spawnPty(cmd, [...prefixArgs, ...sessionLaunchArgs], {
        cols,
        rows,
        cwd,
        env: bgSessionEnv,
        ptySock: this.ptySockPath ?? daemonPtySocket(dispatch.short),
        short: dispatch.short,
        ptyAuth: this.ptyAuth,
      });
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      let H = processWrapperArgv()[0];
      if (isENOENT(error)) {
        let [F, X] = await Promise.all([
          access(cwd).then(
            () => true,
            () => false,
          ),
          H || dispatch.launch.mode === "exec"
            ? false
            : access(
                getLaunchCommand({
                  pinToCurrentBinary: true,
                }).cmd,
              ).then(() => false, isENOENT),
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
        if (H) {
          logEvent("tengu_bg_launcher_worker_refused", {
            attempt: this.attempt,
          });
          logFeatureBad("agent_launcher", "worker_launcher_enoent");
        } else
          logEvent("tengu_bg_spawn_binary_gone", {
            short: bgShort(this.dispatch.short),
            attempt: this.attempt,
            binary_present: !X && dispatch.launch.mode !== "exec",
          });
        this.patch({
          state: "crashed",
          detail: ie,
        });
        let Q = this.dimNotice(ie);
        this.pushRing(Q);
        this.onStream.emit(Q);
        return this.settle("crashed");
      }
      if (H && (errnoCode === "EACCES" || errnoCode === "EPERM")) {
        if (this.record.outcome) return;
        let F = `launcher \`${H}\` could not be executed (${errnoCode})`;
        logEvent("tengu_bg_launcher_worker_refused", {
          attempt: this.attempt,
        });
        logFeatureBad(
          "agent_launcher",
          errnoCode === "EACCES" ? "worker_launcher_eacces" : "worker_launcher_eperm",
        );
        this.patch({
          state: "crashed",
          detail: F,
        });
        let X = this.dimNotice(F);
        this.pushRing(X);
        this.onStream.emit(X);
        return this.settle("crashed");
      }
      return this.scheduleRespawn(errorMessage(error));
    }
    if (dispatch.launch.mode === "exec") {
      this.execTracker?.dispose();
      this.execTracker = createPtyActivityTracker(jobDir, this.storageV5);
      this.workerReady = true;
    }
    if (getPlatform() === "windows")
      writeFile(daemonPtyPidFile(dispatch.short), String(P.pid)).catch(() => {});
    this.wirePty(P);
    this.rv?.close();
    this.rv = undefined;
    this.lastRvHeartbeat = undefined;
    this.stalledLogged = false;
    this.connectRv();
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
    });
    logEvent("tengu_bg_worker_spawn", {
      short: bgShort(this.dispatch.short),
      attempt: this.attempt,
      source: fromEnum(this.dispatch.source),
      launch_mode: fromEnum(this.dispatch.launch.mode),
    });
    if (G) logRestartWithoutSavedState(r ? "upgrade" : "crash", G);
    if (s)
      logEvent("tengu_bg_respawn_settled", {
        short: bgShort(this.dispatch.short),
        reason: fromEnum(s.neededBy),
        attempt: this.attempt,
      });
    getProcessStartTimeAsync(P.pid, {
      skipCache: true,
    }).then((processStartTime) => {
      if (!processStartTime || this.record.pid !== P.pid || this.isDetached || this.record.outcome) return;
      this.procStart = processStartTime;
      this.patch({
        pid: P.pid,
      });
    });
  }
  wirePty(e) {
    this.pty = e;
    this.transitionTo({
      kind: "running",
    });
    this.decModes = createPrivateModeTracker();
    e.onResume?.(() => {
      this.rv?.send({
        type: "repaint",
      });
    });
    e.onRepl?.((replPid, replProcStart) => {
      if (!this.record.pid || this.record.outcome || this.isDetached) return;
      this.replPid = replPid;
      this.replProcStart = replProcStart;
      this.onState.emit({
        pid: this.record.pid,
      });
    });
    this.offData = e.onData((s) => {
      if (this.decModes.feed(s) && this.record.pid)
        this.onState.emit({
          pid: this.record.pid,
        });
      this.execTracker?.feed(s);
      this.pushRing(s.includes(DAEMON_DETACH_APC) ? s.replaceAll(DAEMON_DETACH_APC, "") : s);
      this.onStream.emit(s);
    });
    let r = false;
    this.offExit = e.onExit(({ exitCode, signal, hostStderr }) => {
      if (r) return;
      r = true;
      this.offData?.dispose();
      this.execLastLine = this.execTracker?.lastLine;
      this.execTracker?.dispose();
      this.execTracker = undefined;
      this.pty = undefined;
      this.onExit(exitCode, signal, hostStderr);
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
    let r = this.dimNotice(e);
    this.pushRing(r);
    this.onStream.emit(r);
  }
  pushRing(e) {
    this.ring.push(e);
    this.ringBytes += e.length;
    if (this.ringBytes > MAX_CONTROL_FRAME_BYTES * 1.25 && this.ring.length > 1) {
      let r = 0;
      let s = 0;
      while (this.ringBytes - s > MAX_CONTROL_FRAME_BYTES && r < this.ring.length - 1) {
        s += this.ring[r].length;
        r++;
      }
      this.ring.splice(0, r);
      this.ringBytes -= s;
      this.ringSpawnMark = Math.max(0, this.ringSpawnMark - r);
    }
  }
  patch(e) {
    Object.assign(this.record, e);
    this.onState.emit(e);
    if (this.pendingAuthRekey !== undefined && e.tempo !== undefined && e.tempo !== "active") {
      let pendingAuthRekey = this.pendingAuthRekey;
      readJobState(getJobDir(this.dispatch.short), this.storageV5).then((jobState) => {
        if (this.pendingAuthRekey !== pendingAuthRekey) return;
        let adoptActivityState = getAdoptActivityState(jobState, pendingAuthRekey);
        if (adoptActivityState === "settled") {
          this.pendingAuthRekey = undefined;
          this.authRekeyFired = false;
          logForDebugging(
            `[bg] worker ${this.dispatch.short}: deferred auth-mismatch re-key (${pendingAuthRekey}) dropped \u2014 worker settled; leaving to retireIfSettled`,
            {
              level: "warn",
            },
          );
          return;
        }
        if (adoptActivityState !== null) return;
        logForDebugging(
          `[bg] worker ${this.dispatch.short}: deferred auth-mismatch re-key (${pendingAuthRekey}) firing on tempo='${e.tempo}'`,
          {
            level: "warn",
          },
        );
        this.fireAuthRekey();
      });
    }
  }
  onExit(e, r, s) {
    if (this.isDetached) return;
    if (this.phase.kind === "retired") return;
    let n = this.lastSpawnAt ? Date.now() - this.lastSpawnAt : undefined;
    if (Date.now() - this.lastCheckPidAt > STALE_POLL_MS) this.hostWokeAt = Date.now();
    let o = this.hostWokeAt !== undefined && Date.now() - this.hostWokeAt < STABLE_RUN_MS;
    let p = !o && n !== undefined && n < RESTART_BACKOFF_MS && e !== 0;
    if (p) this.fastCrashStreak++;
    else this.fastCrashStreak = 0;
    let h = this.fastCrashStreak >= 3;
    let u = this.workerReady && n !== undefined && n >= MAX_RESTART_BACKOFF_MS;
    this.lastExitExternalStop = (r !== undefined || SIGNAL_EXIT_CODES.has(e ?? -1)) && !o;
    let g = this.workerReady ? undefined : this.preInitErrorTail();
    let f = processWrapperArgv()[0];
    let w = s
      ? truncateWithEllipsis(collapseWhitespace(stripAnsiPerLine(s)), MAX_RESTART_DETAIL) || undefined
      : undefined;
    let E = f && !this.workerReady && !g && w ? `(launch command: \`${f}\` \u2026): ${w}` : undefined;
    let S = !!f && e === 0 && !this.workerReady && n !== undefined && n < PROCESS_WRAPPER_ENV;
    let R = e !== 0 ? readAndClearBgExitCause(getJobDir(this.dispatch.short)) : undefined;
    this.lastExitOwnCrash =
      r === undefined &&
      (e === 1 || e === EX_SOFTWARE) &&
      (R?.startsWith("uncaught:") === true || R?.startsWith("unhandled:") === true);
    let A = R ? readAndClearBgExitDetail(getJobDir(this.dispatch.short), R) : undefined;
    let O = A
      ? truncateWithEllipsis(collapseWhitespace(stripAnsiPerLine(A)), MAX_RESTART_DETAIL) || undefined
      : undefined;
    let G = !g && O ? `: ${O}` : "";
    let L = p && !!R && R === this.lastExitCause;
    this.lastExitCause = p ? R : undefined;
    let C = !this.workerReady && R === BG_EXIT_CAUSE_SESSION_IN_USE;
    let x = g ? ` \u2014 ${g}` : E ? ` \u2014 ${E}` : R ? ` \u2014 ${R}` : "";
    let W = this.effectiveCwd ?? this.dispatch.cwd;
    let P = false;
    if (R === "setcwd")
      try {
        P = !statSync(W).isDirectory();
      } catch {
        P = true;
      }
    let T = this.dispatch.launch.mode === "exec" && (r === "SIGINT" || r === "SIGQUIT");
    let V;
    if (this.phase.kind === "retiring" && this.phase.reason === "reap") V = this.killOutcome;
    else if (this.phase.kind === "retiring" && this.phase.reason === "grace") V = "done";
    else if (this.phase.kind === "upgrading") V = undefined;
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
    logEvent("tengu_bg_worker_exit", {
      short: bgShort(this.dispatch.short),
      code: e ?? undefined,
      signal: fromEnumOpt(r),
      attempt: this.attempt,
      procUptimeMs: n,
      source: fromEnum(this.dispatch.source),
      launch_mode: fromEnum(this.dispatch.launch.mode),
      outcome: fromEnumOpt(V),
      exitCause: sanitizedBgExitCauseForTelemetry(R),
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
      worker_stale: this.isVersionStale,
    });
    if (this.phase.kind === "retiring")
      return this.settle(this.phase.reason === "reap" ? this.killOutcome : "done");
    if (this.phase.kind === "upgrading") {
      this.transitionTo({
        kind: "spawning",
      });
      this.attempt = 1;
      this.fastCrashStreak = 0;
      this.lastExitCause = undefined;
      this.patch({
        pid: 0,
        state: "starting",
        detail: "upgrading",
      });
      this.procStart = undefined;
      this.buildBridgeReattachEnvFromState()
        .then((F) => this.doSpawn(F, true))
        .catch(logError);
      return;
    }
    if (S) {
      let detail = `the launcher exited before Claude Code started \u2014 \`${f}\` must exec, not daemonize${E ? ` \u2014 ${E}` : ""}`;
      logEvent("tengu_bg_launcher_fork_and_exit", {
        attempt: this.attempt,
      });
      logFeatureBad("agent_launcher", "worker_fork_and_exit");
      this.patch({
        state: "crashed",
        detail,
      });
      return this.settle("crashed");
    }
    if (e === 0) {
      if (this.dispatch.launch.mode === "exec") {
        if (!this.execLastLine && this.ringBytes > 0)
          logEvent("tengu_bg_exec_no_lastline", {
            ring_bytes: this.ringBytes,
          });
        this.patch({
          detail: this.execLastLine || "(no output)",
        });
      }
      return this.settle("done");
    }
    let H = r ? `${r} (${e})` : `exit ${e}`;
    if (this.dispatch.launch.mode === "exec") {
      let execLastLine = this.execLastLine;
      this.patch({
        state: T ? "stopped" : "crashed",
        detail: execLastLine ? `${H} \u2014 ${execLastLine}` : `${H}${x}`,
      });
      return this.settle(T ? "killed" : "crashed");
    }
    if (C) {
      this.sessionIdTakenLatch = true;
      logEvent("tengu_bg_session_id_taken", {
        short: bgShort(this.dispatch.short),
        attempt: this.attempt,
        via: fromEnum(this.via),
        launch_mode: fromEnum(this.dispatch.launch.mode),
      });
      this.patch({
        state: "crashed",
        detail: SESSION_ID_TAKEN_NOTICE,
      });
      let F = this.dimNotice(SESSION_ID_TAKEN_NOTICE);
      this.pushRing(F);
      this.onStream.emit(F);
      return this.settle("crashed");
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
      this.patch({
        state: "crashed",
        detail: `${H} before init${x || F}`,
      });
      return this.settle("crashed");
    }
    if (h || L) {
      this.patch({
        state: "crashed",
        detail: L
          ? `${H} \xD7${this.attempt}${x}${G}`
          : `${H} within ${RESTART_BACKOFF_MS / 1000}s of spawn \xD7${this.fastCrashStreak}${x}${G}`,
      });
      return this.settle("crashed");
    }
    if (u) this.attempt = 1;
    this.scheduleRespawn(`${H}${x}${G}`);
  }
  async doSpawnUnlessSettledOnDisk(e = false) {
    let backoffTimer = this.backoffTimer;
    let jobDir = getJobDir(this.dispatch.short);
    let n = isRevivalGuardEnabled();
    let o = n ? await readJobStateFreshOrNull(jobDir, this.storageV5).catch(() => null) : null;
    let p =
      o ??
      (n && !e
        ? await readJobState(jobDir, this.storageV5).catch(() => {
            return;
          })
        : undefined);
    let h = p && isSettled(p) && !p.queuedPrompt ? p : undefined;
    let u =
      o !== null &&
      h !== undefined &&
      terminalOutcome(h.state) === "success" &&
      this.lastExitOwnCrash &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_settled_crash_restart", true) === true;
    let g = u
      ? await readPinnedJobIds(this.storageV5).catch(() => {
          return;
        })
      : undefined;
    if (
      this.record.outcome ||
      this.phase.kind === "retiring" ||
      this.phase.kind === "retired" ||
      this.backoffTimer !== backoffTimer
    )
      return;
    let f = !u
      ? undefined
      : this.attachers.size > 0
        ? "attached"
        : (h.inFlight?.kinds ?? []).includes("session_cron")
          ? "session_cron"
          : g?.has(this.dispatch.short)
            ? "pinned"
            : undefined;
    if (h && (!f || this.attempt > RESTART_WINDOW)) {
      if (e && !this.workerReady) return;
      this.followUpCrashNotice(
        f
          ? `not restarted \u2014 this session crashed again after ${this.attempt - 1} restarts (the conversation is saved)`
          : terminalOutcome(h.state) === "stopped"
            ? NOT_RESTARTED_STOPPED
            : NOT_RESTARTED_IDLE,
      );
      if (e) return this.armBackoff(RESTART_NOTICE_MS);
      return this.settleAsOnDisk(h, f ? "settled_restart_cap" : "settled_on_disk");
    }
    if (p?.interactiveLineage && this.lastExitExternalStop) {
      if (e) return;
      logEvent("tengu_bg_respawn_suppressed", {
        short: bgShort(this.dispatch.short),
        reason: lit("no_task_contract"),
      });
      this.patch({
        state: "stopped",
        detail: "stopped by an external signal",
      });
      return this.settle("killed");
    }
    if (e) {
      if (!n || p) this.followUpCrashNotice(RESTART_PENDING_NOTICE);
      return;
    }
    if (this.crashFollowUp && this.crashFollowUp !== RESTART_PENDING_NOTICE)
      this.followUpCrashNotice(RESTART_NOW_NOTICE);
    return this.doSpawn(
      undefined,
      false,
      h &&
        f && {
          row: h,
          neededBy: f,
        },
    );
  }
  settleAsOnDisk(e, r) {
    logEvent("tengu_bg_respawn_suppressed", {
      short: bgShort(this.dispatch.short),
      reason: fromEnum(r),
    });
    let s = terminalOutcome(e.state);
    this.settle(s === "success" ? "done" : s === "failure" ? "failed" : "killed");
  }
  settleCwdGone(e, r = this.dispatch.cwd) {
    let s = cwdGoneReason(r);
    logEvent("tengu_bg_spawn_cwd_gone", {
      short: bgShort(this.dispatch.short),
      attempt: this.attempt,
      via: fromEnum(e),
    });
    this.patch({
      state: "crashed",
      detail: s,
    });
    let n = this.dimNotice(`${s} \u2014 this job cannot be respawned`);
    this.pushRing(n);
    this.onStream.emit(n);
    this.settle("crashed");
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
    if (this.attempt >= MAX_RESTARTS) {
      logEvent("tengu_bg_respawn_exhausted", {
        short: bgShort(this.dispatch.short),
        attempts: this.attempt,
      });
      this.patch({
        state: "crashed",
        detail: e,
      });
      return this.settle("crashed");
    }
    if (this.phase.kind === "running")
      this.transitionTo({
        kind: "spawning",
      });
    this.patch({
      pid: 0,
      state: "crashed",
      detail: `${e}; respawning`,
    });
    this.procStart = undefined;
    let r = this.dimNotice(`worker crashed (${e})`);
    this.pushRing(r);
    this.onStream.emit(r);
    this.crashFollowUp = undefined;
    this.armBackoff(RESTART_DELAY_MS);
    this.doSpawnUnlessSettledOnDisk(true).catch(logError);
  }
  armBackoff(e) {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null;
      if (this.phase.kind !== "retiring" && this.phase.kind !== "retired")
        this.doSpawnUnlessSettledOnDisk().catch(logError);
    }, e);
    this.backoffTimer.unref();
  }
  settle(e) {
    if (this.record.outcome) return;
    logEvent("tengu_bg_settle", {
      short: bgShort(this.dispatch.short),
      outcome: fromEnum(e),
      uptimeMs: Date.now() - this.record.startedAt,
      attempt: this.attempt,
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
      worker_stale: this.isVersionStale,
    });
    this.transitionTo({
      kind: "retired",
      outcome: e,
    });
    this.clearLiveness();
    this.patch({
      outcome: e,
      settledAt: Date.now(),
      tempo: "idle",
    });
    this.onSettle.emit(e);
  }
  connectRv() {
    if (this.rv || this.isDetached || this.record.outcome) return;
    if (this.dispatch.launch.mode === "exec") {
      this.startPidPoll();
      return;
    }
    this.rv = connectRendezvousSocket(
      this.rvSockPath ?? daemonRvSocket(this.dispatch.short),
      (e) => {
        if (e.type === "heartbeat") this.lastRvHeartbeat = Date.now();
        else if (e.type === "auth-rejected" || e.type === "reply-rejected") {
          this.rvRejected = true;
          logEvent(
            e.type === "auth-rejected" ? "tengu_bg_rv_auth_mismatch" : "tengu_bg_rv_reply_rejected",
            {},
          );
          this.rekeyForAuthMismatch(e.type === "auth-rejected" ? "rv-auth-rejected" : "rv-reply-rejected");
        } else if (e.type === "done") this.settle(e.outcome);
        else if (e.type === "state") this.patch(e.patch);
        else if (e.type === "detach-request") {
          let r = daemonDetachApc(e.msg);
          let s = this.attachers.get(this.lastInputAttacher);
          if (!e.broadcast && s) s.deliver(r);
          else if (this.attachers.size > 0) for (let attacher of this.attachers.values()) attacher.deliver(r);
          else this.onStream.emit(r);
        } else if (e.type === "repaint-done") this.onRepaintDone.emit();
        else if (e.type === "interactive-mark") {
          let interactiveMarkRv = parseInteractiveMarkRv(e);
          if (!interactiveMarkRv) {
            logForDebugging(`[bg ${this.record.short}] dropped malformed rv interactive-mark frame`, {
              level: "warn",
            });
            logEvent("tengu_bg_imark_malformed", {});
            return;
          }
          if (
            this.firedInteractiveMarks.length < 2 &&
            !this.firedInteractiveMarks.some(
              (firedInteractiveMark) => firedInteractiveMark.kind === interactiveMarkRv.kind,
            )
          ) {
            this.firedInteractiveMarks.push(interactiveMarkRv);
            if (this.record.pid)
              this.onState.emit({
                pid: this.record.pid,
              });
          }
          for (let attacher of this.attachers.values())
            if (attacher.caps?.imark === true)
              attacher.deliver(
                interactiveMarkApc({
                  ...interactiveMarkRv,
                  nonce: attacher.imarkNonce,
                }),
              );
        }
      },
      () => void this.checkPid(),
      () => {
        this.workerReady = true;
        this.rvRejected = false;
        if (this.resizeDeferred) {
          this.resizeDeferred = false;
          this.resize(this.ptyCols, this.ptyRows);
        }
        if (this.attachers.size > 0) {
          let last = [...this.attachers.values()].at(-1);
          this.sendAttacherCaps(last.caps ?? null);
        } else this.sendAttacherCaps(null);
      },
      this.rvAuth,
    );
    this.startPidPoll();
  }
  startPidPoll() {
    if (this.pidPoll) return;
    this.lastCheckPidAt = Date.now();
    this.pidPoll = setInterval(() => void this.checkPid(true), POLL_INTERVAL_MS);
    this.pidPoll.unref();
  }
  pidRecycled() {
    if (!this.procStart || !this.record.pid) return false;
    let processStartTime = getProcessStartTime(this.record.pid);
    return processStartTime !== undefined && processStartTime !== this.procStart;
  }
  async pidRecycledAsync() {
    if (!this.procStart || !this.record.pid) return false;
    let processStartTime = await getProcessStartTimeAsync(this.record.pid);
    return processStartTime !== undefined && processStartTime !== this.procStart;
  }
  async failIfHostExited(e) {
    let pid = this.record.pid;
    if (!pid || this.record.outcome || this.isKilling || !this.pty) return false;
    let linuxProcState = await readLinuxProcState(pid);
    if (!isMinorFaultField(linuxProcState)) return false;
    if (this.record.outcome || this.isKilling || !this.pty || this.record.pid !== pid) return false;
    logForDebugging(
      `bg: ${this.dispatch.short} pty host pid=${pid} has exited but is unreaped (state ${linuxProcState}) via=${e} \u2014 reaping it and marking the session failed`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_bg_ptyhost_zombie", {
      short: bgShort(this.dispatch.short),
      via: fromEnum(e),
      state: fromEnum(linuxProcState === "Z" ? "Z" : "X"),
      uptimeMs: Date.now() - this.record.startedAt,
      attachers: this.attachers.size,
    });
    this.kill(
      "SIGKILL",
      "failed",
      this.dispatch.launch.mode === "exec" ? HOST_DIED_EXEC_DETAIL : HOST_DIED_DETAIL,
    );
    return true;
  }
  pidPollTick = 0;
  async checkPid(e = false) {
    let r = Date.now() - this.lastCheckPidAt;
    this.lastCheckPidAt = Date.now();
    let s = r > STALE_POLL_MS;
    if (s) this.hostWokeAt = Date.now();
    if (this.record.outcome || !this.record.pid) return;
    if (s && this.lastRvHeartbeat !== undefined) this.lastRvHeartbeat = Date.now();
    if (!this.pty)
      try {
        process.kill(this.record.pid, 0);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ESRCH" || errnoCode === "EPERM") {
          this.logVanished(false, e);
          this.settle(this.isKilling ? "killed" : "crashed");
        }
        return;
      }
    let lastRvHeartbeat = this.lastRvHeartbeat;
    if (
      !s &&
      !this.stalledLogged &&
      lastRvHeartbeat !== undefined &&
      Date.now() - lastRvHeartbeat > ATTACH_TIMEOUT_MS
    ) {
      let jobState = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
      if (!this.stalledLogged && (jobState?.tempo ?? this.record.tempo) === "active") {
        this.stalledLogged = true;
        logEvent("tengu_bg_worker_stalled", {
          short: bgShort(this.dispatch.short),
          sinceMs: Date.now() - lastRvHeartbeat,
        });
      }
    }
    if (this.pty) {
      await this.failIfHostExited("poll");
      return;
    }
    if (e && this.pidPollTick++ % 12 !== 0) return;
    if (await this.pidRecycledAsync()) {
      if (this.record.outcome || this.pty) return;
      this.logVanished(true, e);
      this.settle(this.isKilling ? "killed" : "crashed");
    }
  }
  logVanished(recycled, fromPoll) {
    if (this.isKilling) return;
    logEvent("tengu_bg_worker_vanished", {
      short: bgShort(this.dispatch.short),
      recycled,
      fromPoll,
      uptimeMs: Date.now() - this.record.startedAt,
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
      worker_stale: this.isVersionStale,
    });
  }
  clearLiveness() {
    if (this.pidPoll) {
      clearInterval(this.pidPoll);
      this.pidPoll = null;
    }
    this.rv?.close();
    this.rv = undefined;
    this.lastRvHeartbeat = undefined;
    this.stalledLogged = false;
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
