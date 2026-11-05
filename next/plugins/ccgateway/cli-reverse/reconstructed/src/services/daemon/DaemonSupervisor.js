/**
 * services/daemon/DaemonSupervisor.ts
 *
 * 2.1.316 新增：后台守护进程主管（bg-pty 宿主、会话生命周期）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-v6a0t823.js (9)
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
  ensureDaemonSocketDirs,
  ptyErrFile,
  daemonPtyPidFile,
} from "./paths.js";
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
import {
  processWrapperError,
  processWrapperArgv,
  PROCESS_WRAPPER_TIMEOUT_MS,
} from "../../utils/processWrapper.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import {
  writeAgentMetadata_2,
  wrapStorageSource,
  getTranscriptStorageContext,
} from "../../utils/sessionStorage.js";
import { ENOTOWNED } from "../../utils/sandbox/userNamespace.js";
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

//@ chunk-v6a0t823.js:16605-17294 placement
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
  "CLAUDE_CODE_DISABLE_AGENT_PROGRESS_SUMMARIES",
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
var isProviderManagedByHost = (env) => isEnvTruthy(env.env?.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST);
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
  ].map((env) => [env.toUpperCase(), env]),
);
//@ chunk-v6a0t823.js:17294-17530 placement
/**
 * Windows 下把环境变量键名规范为已知大小写（已有同名规范键时不覆盖）。
 */
function normalizeEnvKeyCase(env, names = []) {
  if (getPlatform() !== "windows") return;
  let canonical = new Map(names.map((name) => [name.toUpperCase(), name]));
  for (let key of Object.keys(env)) {
    let upper = key.toUpperCase();
    let canonicalKey = BG_ENV_KEY_CASE_MAP.get(upper) ?? canonical.get(upper);
    if (canonicalKey === undefined || canonicalKey === key) continue;
    if (env[canonicalKey] === undefined) env[canonicalKey] = env[key];
    delete env[key];
  }
}
//@ chunk-v6a0t823.js:17530-17657 placement
function usesCustomEndpoint(env, varSpec) {
  return (
    !!env[varSpec.endpoint] &&
    (varSpec.endpoint === "ANTHROPIC_BASE_URL" ||
      varSpec.companions.some(
        (companion) => SKIP_AUTH_ENV_VARS.includes(companion) && isEnvTruthy(env[companion]),
      ))
  );
}
//@ chunk-v6a0t823.js:17657-17952 placement
/**
 * 作业是否仍有在途工作：有排队、非可排空的任务未完成（结束后只剩允许类型的除外）或有会话定时任务。
 */
function hasPendingInFlightWork(jobState) {
  let filtered = (jobState.inFlight?.kinds ?? []).filter(
    (kind) => kind !== "artifact_watch" || !(jobState.inFlight?.drainableMonitors ?? 0),
  );
  let detritusOnly =
    isSettled(jobState) &&
    filtered.length > 0 &&
    filtered.every((kind) => DRAINABLE_TASK_KINDS.includes(kind));
  let draining = (jobState.inFlight?.tasks ?? 0) - (jobState.inFlight?.drainableMonitors ?? 0);
  return (
    (jobState.inFlight?.queued ?? 0) > 0 ||
    (draining > 0 && !detritusOnly) ||
    filtered.includes("session_cron")
  );
}
//@ chunk-v6a0t823.js:17952-18085 placement
function getJobActivityState(jobState) {
  if (!jobState) return null;
  if (isSettled(jobState)) return "settled";
  if (jobState.tempo === "active") return "active";
  if (hasPendingInFlightWork(jobState)) return "inflight";
  return null;
}
//@ chunk-v6a0t823.js:18085-18196 placement
function getAdoptActivityState(jobState, source) {
  let jobActivityState = getJobActivityState(jobState);
  if (jobActivityState === "settled" && source !== "missing-at-adopt")
    return jobState && hasPendingInFlightWork(jobState) ? "inflight" : null;
  return jobActivityState;
}
//@ chunk-v6a0t823.js:18196-18310 placement
function formatSupervisorState(state) {
  return state.kind === "retiring"
    ? `retiring:${state.reason}`
    : state.kind === "retired"
      ? `retired:${state.outcome}`
      : state.kind;
}
//@ chunk-v6a0t823.js:18310-18567 placement
function isValidStateTransition(phase, next) {
  if (phase.kind === "retired") return false;
  switch (next.kind) {
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
//@ chunk-v6a0t823.js:18567-65009 placement
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
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      )
    );
  }
  replayInteractiveMarksTo(socketId) {
    let attacher = this.attachers.get(socketId);
    if (!attacher || attacher.caps?.imark !== true) return;
    for (let firedInteractiveMark of this.firedInteractiveMarks)
      attacher.deliver(
        interactiveMarkApc({
          ...firedInteractiveMark,
          nonce: attacher.imarkNonce,
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
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
  transitionTo(nextPhase) {
    if (!isValidStateTransition(this.phase, nextPhase)) {
      logForDebugging(
        `[bg] illegal worker-phase transition ${formatSupervisorState(this.phase)} \u2192 ${formatSupervisorState(nextPhase)} for ${this.record.short}`,
        {
          level: "warn",
        },
      );
      logEvent("tengu_bg_phase_illegal", {});
      return false;
    }
    this.phase = nextPhase;
    return true;
  }
  shutdownWorker() {
    let rvSent =
      this.rv?.send({
        type: "shutdown",
      }) ?? false;
    if (!rvSent) this.sigtermWorker();
    else
      setTimeout(
        (supervisor) => {
          let phase = supervisor.phase;
          if (
            (phase.kind === "upgrading" || (phase.kind === "retiring" && phase.reason === "grace")) &&
            !supervisor.record.outcome
          )
            supervisor.sigtermWorker();
        },
        5000,
        this,
      ).unref();
    return rvSent;
  }
  noteDowngradeRefused(trigger) {
    if (this.downgradeRefusalLogged || !this.record.cliVersion) return;
    this.downgradeRefusalLogged = true;
    logEvent("tengu_bg_respawn_downgrade_refused", {
      short: bgShort(this.dispatch.short),
      trigger: fromEnum(trigger),
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
    });
  }
  async respawnIfIdleStale(activeJobs, trigger = "sweep") {
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
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      )
    ) {
      this.noteDowngradeRefused(trigger);
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
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
    if (trigger !== "attach" && this.lastInputAt && Date.now() - this.lastInputAt < MAX_UPGRADE_WAIT_MS)
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
      trigger !== "attach" &&
      !isSettled(jobState) &&
      this.adoptedAt &&
      Date.now() - this.adoptedAt < CLAIM_TIMEOUT_MS
    )
      return {
        respawned: false,
        reason: "busy",
      };
    if (isSettled(jobState) && trigger === "sweep" && !activeJobs?.has(this.dispatch.short))
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
      trigger: fromEnum(trigger),
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
    });
    return {
      respawned: true,
    };
  }
  isParkedIdleFork(jobState) {
    return (
      (isAtLeastRelease(
        this.record.cliVersion,
        MIN_ADOPT_RELEASE,
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      ) ||
        jobState.inFlight?.drainableMonitors !== undefined) &&
      jobState.state === "working" &&
      jobState.tempo === "blocked" &&
      jobState.needs === IDLE_NEEDS &&
      jobState.interactiveLineage === true
    );
  }
  async retireIfSettled(
    minIdleMs,
    pinnedJobs,
    bridgedMinIdleMs = minIdleMs,
    { shedMonitoringOnly = false } = {},
  ) {
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
    if (pinnedJobs?.has(this.dispatch.short))
      return {
        retired: false,
        reason: "pinned",
      };
    if (this.adoptedAt && Date.now() - this.adoptedAt < CLAIM_TIMEOUT_MS)
      return {
        retired: false,
        reason: "recent-adopt",
      };
    if (this.lastInputAt && Date.now() - this.lastInputAt < minIdleMs)
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
    if (this.lastInputAt && Date.now() - this.lastInputAt < minIdleMs)
      return {
        retired: false,
        reason: "recent-input",
      };
    if (!jobState) {
      if (this.dispatch.source === "spare" && Date.now() - this.dispatch.createdAt > minIdleMs) {
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
        let staleMs = Date.now() - this.dispatch.createdAt;
        logEvent("tengu_bg_retired", {
          short: bgShort(this.dispatch.short),
          rvSent: this.shutdownWorker(),
          settledForMs: staleMs,
          state: lit("stale-spare"),
          cause: lit("stale-spare"),
          worker_cli_version: sanitizeVersion(this.record.cliVersion),
        });
        return {
          retired: true,
          cause: "stale-spare",
          idleMs: staleMs,
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
      let idleMs = Date.now() - (timestamp_2 > timestamp ? timestamp_2 : timestamp);
      if (idleMs < IDLE_RETIRE_MS)
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
        settledForMs: idleMs,
        state: lit("empty-idle"),
        cause: lit("empty-idle"),
        worker_cli_version: sanitizeVersion(this.record.cliVersion),
      });
      return {
        retired: true,
        cause: "empty-idle",
        idleMs,
      };
    }
    let parkedIdleFork = this.isParkedIdleFork(jobState);
    let settledEnough =
      isSettled(jobState) ||
      (this.dispatch.launch.mode !== "exec" &&
        (jobState.tempo === "idle" ||
          (jobState.state === "blocked" && jobState.tempo === "blocked") ||
          parkedIdleFork));
    let timestamp = Date.parse(jobState.updatedAt);
    let needsNonIdle =
      jobState.tempo === "blocked" &&
      jobState.state !== "blocked" &&
      jobState.needs !== undefined &&
      jobState.needs !== IDLE_NEEDS;
    let abandonedStale =
      this.isVersionStale &&
      !(
        this.record.cliVersion &&
        isNewerBuild(
          this.record.cliVersion,
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      ) &&
      this.dispatch.launch.mode !== "exec" &&
      jobState.tempo !== "active" &&
      !needsNonIdle &&
      !jobState.routine &&
      (jobState.inFlight?.tasks ?? 0) - (jobState.inFlight?.drainableMonitors ?? 0) === 0 &&
      (jobState.inFlight?.queued ?? 0) === 0 &&
      !(jobState.inFlight?.kinds ?? []).includes("session_cron") &&
      timestamp < Date.now() - ABANDONED_WORKER_MS;
    if (!settledEnough && !abandonedStale)
      return {
        retired: false,
        reason: "not-settled",
      };
    let monitoringDrains =
      shedMonitoringOnly || abandonedStale ? (jobState.inFlight?.drainableMonitors ?? 0) : 0;
    let filtered = (jobState.inFlight?.kinds ?? []).filter(
      (kind) => kind !== "artifact_watch" || monitoringDrains === 0,
    );
    let detritusOnly =
      isSettled(jobState) &&
      filtered.length > 0 &&
      filtered.every((kind) => DRAINABLE_TASK_KINDS.includes(kind));
    let drainableLineage =
      jobState.interactiveLineage === true &&
      isAtLeastRelease(
        this.record.cliVersion,
        MIN_ADOPT_RELEASE,
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      );
    let defaultInflightCount = abandonedStale && !drainableLineage ? 0 : 1;
    if (
      (jobState.inFlight?.queued ?? defaultInflightCount) > 0 ||
      ((jobState.inFlight?.tasks ?? defaultInflightCount) - monitoringDrains > 0 && !detritusOnly)
    )
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
    let effectiveIdleMs = jobState.bridgeSessionId ? Math.max(minIdleMs, bridgedMinIdleMs) : minIdleMs;
    let updatedIdleMs = jobState.updatedAt && Date.now() - Date.parse(jobState.updatedAt);
    if (!updatedIdleMs || updatedIdleMs < effectiveIdleMs)
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
    let hasInflightCounts = jobState.inFlight?.tasks !== undefined && jobState.inFlight.queued !== undefined;
    let retireCause =
      !settledEnough || !hasInflightCounts || (!shedMonitoringOnly && monitoringDrains > 0)
        ? "abandoned-stale"
        : isSettled(jobState)
          ? "settled"
          : "idle-prompt";
    logEvent("tengu_bg_retired", {
      short: bgShort(this.dispatch.short),
      rvSent: this.shutdownWorker(),
      settledForMs: updatedIdleMs,
      bridged: !!jobState.bridgeSessionId,
      detritusOnly,
      state: daemonSessionStateLabel(jobState.state),
      cause: fromEnum(retireCause),
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
    });
    return {
      retired: true,
      cause: retireCause,
      idleMs: updatedIdleMs,
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
  rekeyForAuthMismatch(source) {
    if (
      this.authRekeyFired ||
      this.authRekeyCount >= MAX_AUTO_RESTARTS ||
      this.phase.kind !== "running" ||
      this.record.outcome ||
      this.dispatch.launch.mode === "exec"
    ) {
      logForDebugging(
        `[bg] worker ${this.dispatch.short}: auth mismatch (${source}) \u2014 not re-keying ` +
          `(via=${this.via} phase=${this.phase.kind} mode=${this.dispatch.launch.mode} fired=${this.authRekeyFired} count=${this.authRekeyCount})`,
        {
          level: "warn",
        },
      );
      return;
    }
    this.authRekeyFired = true;
    readJobState(getJobDir(this.dispatch.short), this.storageV5).then((jobState) => {
      let adoptActivityState = getAdoptActivityState(jobState, source);
      if (adoptActivityState === "settled") {
        this.authRekeyFired = false;
        logEvent("tengu_bg_adopt_token_lost_respawn", {
          source: fromEnum(source),
          deferred: false,
          skipped: lit("settled"),
        });
        logForDebugging(
          `[bg] worker ${this.dispatch.short}: auth mismatch (${source}) \u2014 worker already settled; leaving to retireIfSettled`,
          {
            level: "warn",
          },
        );
        return;
      }
      if (adoptActivityState !== null) {
        logEvent("tengu_bg_adopt_token_lost_respawn", {
          source: fromEnum(source),
          deferred: true,
          reason: fromEnum(adoptActivityState),
        });
        logForDebugging(
          `[bg] worker ${this.dispatch.short}: auth mismatch (${source}) \u2014 ` +
            (adoptActivityState === "active"
              ? "worker is mid-turn"
              : "worker has non-resumable in-flight work") +
            "; deferring re-key respawn until safe",
          {
            level: "warn",
          },
        );
        this.pendingAuthRekey = source;
        return;
      }
      logEvent("tengu_bg_adopt_token_lost_respawn", {
        source: fromEnum(source),
        deferred: false,
      });
      logForDebugging(
        `[bg] worker ${this.dispatch.short}: auth mismatch (${source}) \u2014 respawning to re-key (--resume preserves the session)`,
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
  constructor(dispatch, spawnPty, getAuthSnapshot, via, recordExtras, storageV5, credentials) {
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
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      source: dispatch.source,
      ...recordExtras,
    };
    if (dispatch.cols) this.ptyCols = dispatch.cols;
    if (dispatch.rows) this.ptyRows = dispatch.rows;
  }
  static spawn(dispatch, spawnPty, getAuthSnapshot, options, storageV5, credentials) {
    let supervisor = new DaemonSupervisor(
      dispatch,
      spawnPty ?? createPtyHostSpawner(),
      getAuthSnapshot,
      "cold",
      undefined,
      storageV5,
      credentials,
    );
    if (options?.afterUpgrade) {
      supervisor.attempt = 1;
      supervisor
        .buildBridgeReattachEnvFromState()
        .then((reattachEnv) => supervisor.doSpawn(reattachEnv, true))
        .catch(logError);
      return supervisor;
    }
    supervisor.doSpawn(dispatch.reattachEnv).catch(logError);
    return supervisor;
  }
  static claim(dispatch, options) {
    let supervisor = new DaemonSupervisor(
      dispatch,
      options.spawnPty,
      options.getAuthSnapshot,
      "spare",
      {
        pid: options.pid,
        attempt: 1,
        state: "running",
        cliVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      },
      options.storageV5,
      options.credentials,
    );
    supervisor.attempt = 1;
    supervisor.bootedViaResume =
      dispatch.launch.mode !== "exec" &&
      (dispatch.launch.restoresTranscript ?? dispatch.launch.mode === "resume");
    supervisor.ptySockPath = options.ptySockPath;
    supervisor.rvSockPath = daemonRvSocket(dispatch.short);
    if (options.ptyAuth) supervisor.ptyAuth = options.ptyAuth;
    discardBgExitSidecars(getJobDir(dispatch.short));
    supervisor.wirePty(
      connectPtyHost(options.ptySockPath, options.pid, {
        short: dispatch.short,
        auth: supervisor.ptyAuth,
      }),
    );
    supervisor.resize(dispatch.cols ?? 200, dispatch.rows ?? 50);
    supervisor.connectRv();
    getProcessStartTimeAsync(options.pid, {
      skipCache: true,
    }).then((processStartTime) => {
      if (supervisor.record.pid !== options.pid || supervisor.isDetached || supervisor.record.outcome) return;
      if (processStartTime) supervisor.procStart = processStartTime;
      supervisor.patch({
        pid: options.pid,
      });
    });
    return supervisor;
  }
  socketAuth() {
    this.rvAuth ??= randomBytes(16).toString("hex");
    this.ptyAuth ??= randomBytes(16).toString("hex");
    return {
      rvAuth: this.rvAuth,
      ptyAuth: this.ptyAuth,
    };
  }
  static buildClaimFrame(dispatch, pid, ptyAuth) {
    let jobDir = getJobDir(dispatch.short);
    let bgSessionEnv = buildBgSessionEnv(dispatch, jobDir, pid, daemonRvSocket(dispatch.short), ptyAuth);
    delete bgSessionEnv.CLAUDE_BG_PTY_AUTH;
    copyCarriedInternalEnv(bgSessionEnv, dispatch.reattachEnv);
    stripCoworkHostEnvKeys(bgSessionEnv);
    syncProcessWrapperEnv(bgSessionEnv, dispatch);
    delete bgSessionEnv.CLAUDE_PTY_HOST_NO_STABLE_PATH;
    let argv = buildSessionLaunchArgs(
      dispatch,
      1,
      false,
      dispatch.sessionId,
      undefined,
      dispatch.respawnFlags,
    );
    return {
      env: bgSessionEnv,
      argv,
    };
  }
  static async adopt(shortId, rosterEntry, spawnPty, getAuthSnapshot, storageV5, credentials) {
    if (rosterEntry.dispatch.env)
      rosterEntry.dispatch.env = pickAllowedEnv(rosterEntry.dispatch.env, BG_CARRIED_ENV_KEYS);
    delete rosterEntry.dispatch.reattachEnv;
    if (!isProcessRunning(rosterEntry.pid)) return null;
    let actualProcStart = await withDeadline(
      getProcessStartTimeAsync(rosterEntry.pid, {
        skipCache: true,
      }),
      MIN_POLL_MS,
    );
    if (actualProcStart && rosterEntry.procStart !== actualProcStart) return null;
    let supervisor = new DaemonSupervisor(
      rosterEntry.dispatch,
      spawnPty,
      getAuthSnapshot,
      "adopted",
      {
        pid: rosterEntry.pid,
        attempt: rosterEntry.attempt,
        startedAt: rosterEntry.startedAt,
        messagingSock: rosterEntry.messagingSock,
        state: "adopted",
        detail: "adopted from previous supervisor",
        cliVersion: rosterEntry.cliVersion,
        ...(rosterEntry.ptySock
          ? {}
          : {
              legacy: true,
            }),
      },
      storageV5,
      credentials,
    );
    supervisor.attempt = rosterEntry.attempt;
    supervisor.procStart = rosterEntry.procStart;
    supervisor.rosterExtras = rosterEntryExtras(rosterEntry);
    supervisor.workerReady = true;
    supervisor.adoptedAt = Date.now();
    supervisor.rvSockPath = rosterEntry.rendezvousSock;
    supervisor.ptySockPath = rosterEntry.ptySock;
    supervisor.rvAuth = rosterEntry.rvAuth;
    supervisor.ptyAuth = rosterEntry.ptyAuth;
    if (supervisor.dispatch.launch.mode === "exec") {
      supervisor.execTracker = createPtyActivityTracker(
        getJobDir(supervisor.dispatch.short),
        supervisor.storageV5,
      );
      supervisor.workerReady = true;
    }
    if (rosterEntry.ptySock) {
      supervisor.wirePty(
        connectPtyHost(rosterEntry.ptySock, rosterEntry.pid, {
          procStart: supervisor.procStart,
          short: supervisor.dispatch.short,
          auth: supervisor.ptyAuth,
          onAuthRequired: () => supervisor.onPtyAuthRequired(),
        }),
      );
      supervisor.ptyCols = 0;
      supervisor.seedFocus(false);
    }
    if (rosterEntry.decModes) supervisor.decModes.seed(rosterEntry.decModes);
    if (rosterEntry.firedInteractiveMarks)
      supervisor.firedInteractiveMarks = rosterEntry.firedInteractiveMarks.slice(0, 2);
    supervisor.replPid = rosterEntry.replPid ?? 0;
    supervisor.replProcStart = rosterEntry.replProcStart;
    supervisor.bootedViaResume =
      rosterEntry.dispatch.launch.mode !== "exec" &&
      (rosterEntry.dispatch.launch.restoresTranscript ?? rosterEntry.dispatch.launch.mode === "resume");
    supervisor.connectRv();
    if (
      rosterEntry.pendingRespawn === "upgrade" &&
      !(
        rosterEntry.cliVersion &&
        isNewerBuild(
          rosterEntry.cliVersion,
          {
            ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
            PACKAGE_URL: "@anthropic-ai/claude-code",
            README_URL: "https://code.claude.com/docs/en/overview",
            VERSION: "2.1.318",
            FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
            BUILD_TIME: "2026-11-03T18:52:53Z",
            GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
            HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
            DD_SOURCEMAP_GROUP: "default",
          }.VERSION,
        )
      ) &&
      !rcChannelDiffers(
        rosterEntry.cliVersion,
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      )
    ) {
      supervisor.transitionTo({
        kind: "upgrading",
      });
      setTimeout(
        (supervisor) => {
          if (supervisor.phase.kind === "upgrading" && !supervisor.record.outcome) supervisor.sigtermWorker();
        },
        5000,
        supervisor,
      ).unref();
    }
    if (
      supervisor.dispatch.launch.mode !== "exec" &&
      rosterEntry.ptySock &&
      rosterEntry.cliVersion &&
      (rosterEntry.rvAuth === undefined || rosterEntry.ptyAuth === undefined)
    ) {
      logForDebugging(
        `[bg] adopt ${supervisor.dispatch.short}: roster rvAuth/ptyAuth missing for token-era worker \u2014 schema-skewed daemon stripped them`,
        {
          level: "warn",
        },
      );
      supervisor.rekeyForAuthMismatch("missing-at-adopt");
      return supervisor;
    }
    return supervisor;
  }
  static unverified(shortId, rosterEntry, storageV5, credentials) {
    let supervisor = new DaemonSupervisor(
      rosterEntry.dispatch,
      undefined,
      undefined,
      "adopted",
      {
        pid: rosterEntry.pid,
        attempt: rosterEntry.attempt,
        startedAt: rosterEntry.startedAt,
        messagingSock: rosterEntry.messagingSock,
        state: "adopted",
        detail: "adopted (pid unverifiable; tracking via pty.sock)",
        cliVersion: rosterEntry.cliVersion,
      },
      storageV5,
      credentials,
    );
    supervisor.attempt = rosterEntry.attempt;
    supervisor.procStart = rosterEntry.procStart;
    supervisor.rosterExtras = rosterEntryExtras(rosterEntry);
    if (rosterEntry.firedInteractiveMarks)
      supervisor.firedInteractiveMarks = rosterEntry.firedInteractiveMarks.slice(0, 2);
    supervisor.replPid = rosterEntry.replPid ?? 0;
    supervisor.replProcStart = rosterEntry.replProcStart;
    supervisor.bootedViaResume =
      rosterEntry.dispatch.launch.mode !== "exec" &&
      (rosterEntry.dispatch.launch.restoresTranscript ?? rosterEntry.dispatch.launch.mode === "resume");
    supervisor.rvSockPath = rosterEntry.rendezvousSock;
    supervisor.ptySockPath = rosterEntry.ptySock;
    supervisor.rvAuth = rosterEntry.rvAuth;
    supervisor.ptyAuth = rosterEntry.ptyAuth;
    supervisor.unverifiedSock = rosterEntry.ptySock;
    supervisor.lastInputAt = Date.now();
    supervisor.pidPoll = setInterval(
      (supervisor) => {
        if (supervisor.record.outcome || !supervisor.unverifiedSock) return;
        pingPtySocket(supervisor.unverifiedSock).then((alive) => {
          if (alive || supervisor.record.outcome || supervisor.phase.kind !== "spawning") return;
          supervisor.settle("crashed");
        });
      },
      POLL_INTERVAL_MS,
      supervisor,
    );
    supervisor.pidPoll.unref();
    logEvent("tengu_bg_adopt_unverified", {
      short: bgShort(shortId),
    });
    return supervisor;
  }
  tail(count) {
    return count > 0 ? this.ring.slice(-count) : [];
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
  write(data) {
    this.lastInputAt = Date.now();
    this.pty?.write(data);
  }
  noteActivity() {
    this.lastInputAt = Date.now();
  }
  shiftGraceClocksForward(deltaMs) {
    if (deltaMs <= 0) return;
    this.hostWokeAt = Date.now();
    if (this.adoptedAt !== undefined) this.adoptedAt += deltaMs;
    if (this.lastInputAt !== undefined) this.lastInputAt += deltaMs;
  }
  seedFocus(focused) {
    if (this.dispatch.launch.mode === "exec") return;
    this.pty?.write(focused ? FOCUS_IN : FOCUS_OUT);
  }
  resize(cols, rows) {
    this.ptyCols = cols;
    this.ptyRows = rows;
    if (getPlatform() === "windows" && !this.workerReady) {
      this.resizeDeferred = true;
      return;
    }
    try {
      this.pty?.resize(cols, rows);
    } catch {}
  }
  signalPtyPgrp() {
    if (getPlatform() === "windows" || !this.record.pid) return;
    setTimeout(
      (workerPid) => {
        try {
          process.kill(-workerPid, "SIGWINCH");
        } catch {}
      },
      15,
      this.record.pid,
    );
  }
  resizeForRepaint(cols, rows) {
    if (cols !== this.ptyCols || rows !== this.ptyRows) {
      this.resize(cols, rows);
      this.signalPtyPgrp();
      this.rv?.send({
        type: "repaint",
      });
      return () => {};
    }
    let repaintSent =
      this.rv?.send({
        type: "repaint",
      }) === true;
    let unsubscribeRepaint = () => {};
    let timer = setTimeout(
      (cols, rows) => {
        unsubscribeRepaint();
        if (this.ptyCols !== cols || this.ptyRows !== rows) return;
        let max = Math.max(2, cols - 1);
        this.resize(max, rows);
        this.signalPtyPgrp();
        setTimeout(
          (peakCols, rows, cols) => {
            if (this.ptyCols === cols && this.ptyRows === rows) {
              this.resize(peakCols, rows);
              this.signalPtyPgrp();
            }
          },
          30,
          cols,
          rows,
          max,
        );
      },
      repaintSent ? 50 : 0,
      cols,
      rows,
    );
    if (repaintSent)
      unsubscribeRepaint = this.onRepaintDone.subscribe(() => {
        unsubscribeRepaint();
        clearTimeout(timer);
      });
    return () => {
      unsubscribeRepaint();
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
      JSON.stringify(this.dispatch, (key, value) => {
        let upper = key.toUpperCase();
        if (
          key === "reattachEnv" ||
          key === "attachStallRespawns" ||
          BG_PASSTHROUGH_ENV_VARS.includes(upper === "PATH" ? key : upper)
        )
          return;
        if (typeof value === "string" && value.length > MAX_STATUS_DETAIL)
          return value.slice(0, MAX_STATUS_DETAIL);
        return value;
      }),
    );
  }
  async reply(text, { nextTurn = false } = {}) {
    this.lastInputAt = Date.now();
    this.lastInputAttacher = undefined;
    if (this.isReplyQueueOnly) {
      let refusal;
      if (this.rvRejected) refusal = "the worker rejected the rendezvous token";
      else if (!this.rv) refusal = "no rendezvous client";
      else if (
        !this.rv.send({
          type: "reply",
          text,
          ...(nextTurn && {
            nextTurn,
          }),
        })
      )
        refusal = "the rendezvous is not connected";
      if (refusal) logForDebugging(`[bg] ${this.record.short}: reply refused: ${refusal}`);
      return !refusal;
    }
    let jobState = await readJobState(getJobDir(this.dispatch.short), this.storageV5);
    let workerBlocked =
      jobState?.tempo === "blocked" || (await this.isReplWaiting()) || this.record.tempo === "blocked";
    if (
      (!jobState || workerBlocked || nextTurn) &&
      this.rv?.send({
        type: "reply",
        text,
        ...(nextTurn && {
          nextTurn,
        }),
      })
    )
      return true;
    if (nextTurn || (workerBlocked && this.dispatch.launch.mode !== "exec")) return false;
    if (this.pty) {
      let useBracketedPaste = this.dispatch.launch.mode !== "exec";
      this.replyChain = this.replyChain.then(
        () =>
          new Promise((resolve) => {
            this.pty?.write(useBracketedPaste ? `\x1B[200~${text}\x1B[201~` : text);
            setTimeout(
              (done) => {
                this.pty?.write("\r");
                done();
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
        text,
      }) ?? false
    );
  }
  async isReplWaiting() {
    if (this.replPid <= 1 || this.dispatch.launch.mode === "exec") return false;
    try {
      let { liveStatusOfJob } =
        await import("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
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
  kill(signal = "SIGTERM", outcome = "killed", detail) {
    if (this.phase.kind === "retired") return;
    this.killOutcome = outcome === "failed" ? "failed" : "killed";
    this.handoffKill = this.handoffKill || outcome === "handoff";
    if (detail)
      this.patch({
        detail,
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
        this.pty.kill(signal);
      } catch {}
    else if (this.record.pid && !this.pidRecycled())
      try {
        process.kill(-this.record.pid, signal);
      } catch {
        try {
          process.kill(this.record.pid, signal);
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
  async doSpawn(reattachEnv, isUpgrade = false, settledRow) {
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
    let wrapperError = processWrapperError();
    if (wrapperError) {
      logEvent("tengu_bg_launcher_worker_refused", {
        attempt: this.attempt,
      });
      logFeatureBad("agent_launcher", "worker_refused");
      this.patch({
        state: "crashed",
        detail: wrapperError,
      });
      let notice = this.dimNotice(wrapperError);
      this.pushRing(notice);
      this.onStream.emit(notice);
      return this.settle("crashed");
    }
    let authSnapshotPath = shouldCarryAuth(dispatch)
      ? await writeAuthSnapshot(dispatch.short, this.getAuthSnapshot?.())
      : undefined;
    let socketTokensPath = await writeAgentMetadata_2(
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
          socketTokensPath
            ? this.credentials.discardSpentCredentialFile(socketTokensPath).catch(() => {})
            : undefined,
          authSnapshotPath
            ? this.credentials.discardSpentCredentialFile(authSnapshotPath).catch(() => {})
            : undefined,
        ]);
      else
        await Promise.all([
          socketTokensPath ? unlink(socketTokensPath).catch(() => {}) : undefined,
          authSnapshotPath ? unlink(authSnapshotPath).catch(() => {}) : undefined,
        ]);
      if (this.record.outcome) return;
      if (getErrnoCode(error) === ENOTOWNED) {
        let ownershipError = `worker socket directory is not owned by this user \u2014 ${errorMessage(error)}`;
        this.patch({
          state: "crashed",
          detail: ownershipError,
        });
        let notice = this.dimNotice(ownershipError);
        this.pushRing(notice);
        this.onStream.emit(notice);
        return this.settle("crashed");
      }
      return this.scheduleRespawn(errorMessage(error));
    }
    await unlink(ptyErrFile(this.ptySockPath ?? daemonPtySocket(dispatch.short))).catch(() => {});
    discardBgExitSidecars(jobDir);
    let sessionId = dispatch.launch.mode === "resume" ? dispatch.launch.sessionId : undefined;
    let hasTranscript = false;
    let sourceSessionMissing = false;
    let sessionId_2 = dispatch.sessionId;
    let transcriptPath;
    let { respawnFlags, cwd } = dispatch;
    let interactiveLineage = false;
    let probeOutcome;
    if (this.attempt > 1) {
      let previousState = settledRow?.row ?? (await readJobState(jobDir, this.storageV5));
      if (previousState === null && dispatch.launch.mode !== "exec")
        probeOutcome = await probeJobState(jobDir, this.storageV5);
      sessionId_2 = previousState?.resumeSessionId ?? dispatch.sessionId;
      respawnFlags = settledRow
        ? withoutReplyOnResume(settledRow.row.respawnFlags)
        : (previousState?.respawnFlags ?? dispatch.respawnFlags);
      cwd = previousState?.cwd ?? dispatch.cwd;
      interactiveLineage = previousState?.interactiveLineage === true;
      let storageContext = wrapStorageSource(getTranscriptStorageContext(this.storageV5));
      let jobTranscript = await resolveJobTranscript(
        sessionId_2,
        cwd,
        previousState?.linkScanPath,
        undefined,
        storageContext,
      );
      hasTranscript = jobTranscript.hasMessages;
      if (hasTranscript) {
        transcriptPath = jobTranscript.path;
        this.liveTranscriptPath = jobTranscript.path;
      }
      if (dispatch.source === "spare" && probeOutcome === "absent" && !hasTranscript)
        probeOutcome = undefined;
      let isTranscriptArg = sessionId !== undefined && isTranscriptFileResumeArg(sessionId);
      sourceSessionMissing =
        !hasTranscript &&
        sessionId !== undefined &&
        !(
          await resolveJobTranscript(
            isTranscriptArg ? basename(sessionId, ".jsonl") : sessionId,
            cwd,
            isTranscriptArg ? sessionId : undefined,
            undefined,
            storageContext,
          )
        ).hasMessages;
      if (!hasTranscript && !settledRow) await quarantineJobTranscript(jobTranscript.path, storageContext);
    }
    this.effectiveCwd = cwd;
    if (this.phase.kind === "retiring" || this.phase.kind === "retired" || this.record.outcome) {
      if (socketTokensPath)
        if (this.credentials) this.credentials.discardSpentCredentialFile(socketTokensPath).catch(() => {});
        else unlink(socketTokensPath).catch(() => {});
      return;
    }
    if (settledRow && !hasTranscript) {
      this.followUpCrashNotice(NOT_RESTARTED_NO_TRANSCRIPT);
      return this.settleAsOnDisk(settledRow.row, "settled_no_transcript");
    }
    if (sourceSessionMissing) {
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
    let sessionLaunchArgs = buildSessionLaunchArgs(
      dispatch,
      this.attempt,
      hasTranscript,
      sessionId_2,
      transcriptPath,
      respawnFlags,
    );
    this.bootedViaResume =
      (dispatch.launch.mode === "prompt" || dispatch.launch.mode === "resume") &&
      (this.attempt === 1 || (!hasTranscript && sessionId_2 === dispatch.sessionId))
        ? (dispatch.launch.restoresTranscript ?? sessionLaunchArgs.includes("--resume"))
        : sessionLaunchArgs.includes("--resume");
    let bgSessionEnv = buildBgSessionEnv(
      dispatch,
      jobDir,
      authSnapshotPath,
      this.rvSockPath ?? daemonRvSocket(dispatch.short),
      this.socketAuth(),
    );
    if (settledRow) delete bgSessionEnv.CLAUDE_CODE_RESUME_INTERRUPTED_TURN;
    else if (this.attempt > 1 && hasTranscript && !isUpgrade) {
      bgSessionEnv.CLAUDE_CODE_RESUME_INTERRUPTED_TURN = "1";
      if (isRevivalGuardEnabled()) {
        bgSessionEnv.CLAUDE_CODE_RESUME_PROMPT ??= RESTART_CONTINUE_PROMPT;
        if (interactiveLineage)
          bgSessionEnv.CLAUDE_CODE_RESUME_INTERRUPTED_TURN_MAX_AGE_MS ??= String(RESTART_WINDOW_MS);
      }
    }
    if (this.attempt > 1 && !hasTranscript && sessionId_2 !== dispatch.sessionId)
      bgSessionEnv.CLAUDE_BG_POST_CLEAR_RESPAWN = "1";
    copyCarriedInternalEnv(bgSessionEnv, reattachEnv);
    if (socketTokensPath) {
      delete bgSessionEnv.CLAUDE_BG_RV_AUTH;
      delete bgSessionEnv.CLAUDE_BG_PTY_AUTH;
      bgSessionEnv.CLAUDE_BG_SOCKET_TOKENS_PATH = socketTokensPath;
    }
    stripCoworkHostEnvKeys(bgSessionEnv);
    syncProcessWrapperEnv(bgSessionEnv, dispatch);
    if (getPlatform() === "macos" && isRunningFromVersionsDir() && isCosmicCookieEnabled())
      bgSessionEnv.CLAUDE_PTY_HOST_NO_STABLE_PATH = "1";
    else delete bgSessionEnv.CLAUDE_PTY_HOST_NO_STABLE_PATH;
    delete bgSessionEnv.CLAUDE_CODE_DISABLE_BG_STABLE_PATH;
    let cols = this.ptyCols || (dispatch.cols ?? 200);
    let rows = this.ptyRows || (dispatch.rows ?? 50);
    let ptyHandle;
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
      ptyHandle = this.spawnPty(cmd, [...prefixArgs, ...sessionLaunchArgs], {
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
      let wrapperCmd = processWrapperArgv()[0];
      if (isENOENT(error)) {
        let [cwdExists, binaryGone] = await Promise.all([
          access(cwd).then(
            () => true,
            () => false,
          ),
          wrapperCmd || dispatch.launch.mode === "exec"
            ? false
            : access(
                getLaunchCommand({
                  pinToCurrentBinary: true,
                }).cmd,
              ).then(() => false, isENOENT),
        ]);
        if (this.record.outcome) return;
        if (!cwdExists) return this.settleCwdGone("cold", cwd);
        let failureDetail = wrapperCmd
          ? `launcher \`${wrapperCmd}\` was deleted or moved (ENOENT) \u2014 fix CLAUDE_CODE_PROCESS_WRAPPER, then run your command again`
          : dispatch.launch.mode === "exec"
            ? `${dispatch.launch.cmd}: command not found`
            : binaryGone
              ? "daemon binary was deleted (upgrade in progress) \u2014 run your command again to use the new version"
              : `Couldn't start the session. Run \`claude daemon stop --any\` (ends background sessions), then run your command again. (${errorMessage(error)})`;
        if (wrapperCmd) {
          logEvent("tengu_bg_launcher_worker_refused", {
            attempt: this.attempt,
          });
          logFeatureBad("agent_launcher", "worker_launcher_enoent");
        } else
          logEvent("tengu_bg_spawn_binary_gone", {
            short: bgShort(this.dispatch.short),
            attempt: this.attempt,
            binary_present: !binaryGone && dispatch.launch.mode !== "exec",
          });
        this.patch({
          state: "crashed",
          detail: failureDetail,
        });
        let notice = this.dimNotice(failureDetail);
        this.pushRing(notice);
        this.onStream.emit(notice);
        return this.settle("crashed");
      }
      if (wrapperCmd && (errnoCode === "EACCES" || errnoCode === "EPERM")) {
        if (this.record.outcome) return;
        let failureDetail = `launcher \`${wrapperCmd}\` could not be executed (${errnoCode})`;
        logEvent("tengu_bg_launcher_worker_refused", {
          attempt: this.attempt,
        });
        logFeatureBad(
          "agent_launcher",
          errnoCode === "EACCES" ? "worker_launcher_eacces" : "worker_launcher_eperm",
        );
        this.patch({
          state: "crashed",
          detail: failureDetail,
        });
        let notice = this.dimNotice(failureDetail);
        this.pushRing(notice);
        this.onStream.emit(notice);
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
      writeFile(daemonPtyPidFile(dispatch.short), String(ptyHandle.pid)).catch(() => {});
    this.wirePty(ptyHandle);
    this.rv?.close();
    this.rv = undefined;
    this.lastRvHeartbeat = undefined;
    this.stalledLogged = false;
    this.connectRv();
    this.patch({
      pid: ptyHandle.pid,
      attempt: this.attempt,
      state: this.attempt > 1 ? "resuming" : "running",
      detail: "",
      cliVersion: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
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
    if (probeOutcome) logRestartWithoutSavedState(isUpgrade ? "upgrade" : "crash", probeOutcome);
    if (settledRow)
      logEvent("tengu_bg_respawn_settled", {
        short: bgShort(this.dispatch.short),
        reason: fromEnum(settledRow.neededBy),
        attempt: this.attempt,
      });
    getProcessStartTimeAsync(ptyHandle.pid, {
      skipCache: true,
    }).then((processStartTime) => {
      if (!processStartTime || this.record.pid !== ptyHandle.pid || this.isDetached || this.record.outcome)
        return;
      this.procStart = processStartTime;
      this.patch({
        pid: ptyHandle.pid,
      });
    });
  }
  wirePty(ptyHandle) {
    this.pty = ptyHandle;
    this.transitionTo({
      kind: "running",
    });
    this.decModes = createPrivateModeTracker();
    ptyHandle.onResume?.(() => {
      this.rv?.send({
        type: "repaint",
      });
    });
    ptyHandle.onRepl?.((replPid, replProcStart) => {
      if (!this.record.pid || this.record.outcome || this.isDetached) return;
      this.replPid = replPid;
      this.replProcStart = replProcStart;
      this.onState.emit({
        pid: this.record.pid,
      });
    });
    this.offData = ptyHandle.onData((data) => {
      if (this.decModes.feed(data) && this.record.pid)
        this.onState.emit({
          pid: this.record.pid,
        });
      this.execTracker?.feed(data);
      this.pushRing(data.includes(DAEMON_DETACH_APC) ? data.replaceAll(DAEMON_DETACH_APC, "") : data);
      this.onStream.emit(data);
    });
    let exitedOnce = false;
    this.offExit = ptyHandle.onExit(({ exitCode, signal, hostStderr }) => {
      if (exitedOnce) return;
      exitedOnce = true;
      this.offData?.dispose();
      this.execLastLine = this.execTracker?.lastLine;
      this.execTracker?.dispose();
      this.execTracker = undefined;
      this.pty = undefined;
      this.onExit(exitCode, signal, hostStderr);
    });
  }
  dimNotice(message) {
    return wrapDaemonHint(`\r
\x1B[2m[${message}]\x1B[0m\r
`);
  }
  followUpCrashNotice(message) {
    if (this.crashFollowUp === message) return;
    this.crashFollowUp = message;
    let notice = this.dimNotice(message);
    this.pushRing(notice);
    this.onStream.emit(notice);
  }
  pushRing(chunk) {
    this.ring.push(chunk);
    this.ringBytes += chunk.length;
    if (this.ringBytes > MAX_CONTROL_FRAME_BYTES * 1.25 && this.ring.length > 1) {
      let dropCount = 0;
      let dropBytes = 0;
      while (this.ringBytes - dropBytes > MAX_CONTROL_FRAME_BYTES && dropCount < this.ring.length - 1) {
        dropBytes += this.ring[dropCount].length;
        dropCount++;
      }
      this.ring.splice(0, dropCount);
      this.ringBytes -= dropBytes;
      this.ringSpawnMark = Math.max(0, this.ringSpawnMark - dropCount);
    }
  }
  patch(patch) {
    Object.assign(this.record, patch);
    this.onState.emit(patch);
    if (this.pendingAuthRekey !== undefined && patch.tempo !== undefined && patch.tempo !== "active") {
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
          `[bg] worker ${this.dispatch.short}: deferred auth-mismatch re-key (${pendingAuthRekey}) firing on tempo='${patch.tempo}'`,
          {
            level: "warn",
          },
        );
        this.fireAuthRekey();
      });
    }
  }
  onExit(exitCode, signal, hostStderr) {
    if (this.isDetached) return;
    if (this.phase.kind === "retired") return;
    let uptimeMs = this.lastSpawnAt ? Date.now() - this.lastSpawnAt : undefined;
    if (Date.now() - this.lastCheckPidAt > STALE_POLL_MS) this.hostWokeAt = Date.now();
    let wokeRecently = this.hostWokeAt !== undefined && Date.now() - this.hostWokeAt < STABLE_RUN_MS;
    let fastCrash =
      !wokeRecently && uptimeMs !== undefined && uptimeMs < RESTART_BACKOFF_MS && exitCode !== 0;
    if (fastCrash) this.fastCrashStreak++;
    else this.fastCrashStreak = 0;
    let fastCrashStreakHit = this.fastCrashStreak >= 3;
    let ranLongEnough = this.workerReady && uptimeMs !== undefined && uptimeMs >= MAX_RESTART_BACKOFF_MS;
    this.lastExitExternalStop =
      (signal !== undefined || SIGNAL_EXIT_CODES.has(exitCode ?? -1)) && !wokeRecently;
    let preInitTail = this.workerReady ? undefined : this.preInitErrorTail();
    let wrapperCmd = processWrapperArgv()[0];
    let stderrTail = hostStderr
      ? truncateWithEllipsis(collapseWhitespace(stripAnsiPerLine(hostStderr)), MAX_RESTART_DETAIL) ||
        undefined
      : undefined;
    let wrapperDetail =
      wrapperCmd && !this.workerReady && !preInitTail && stderrTail
        ? `(launch command: \`${wrapperCmd}\` \u2026): ${stderrTail}`
        : undefined;
    let launcherDaemonized =
      !!wrapperCmd &&
      exitCode === 0 &&
      !this.workerReady &&
      uptimeMs !== undefined &&
      uptimeMs < PROCESS_WRAPPER_TIMEOUT_MS;
    let exitCause = exitCode !== 0 ? readAndClearBgExitCause(getJobDir(this.dispatch.short)) : undefined;
    this.lastExitOwnCrash =
      signal === undefined &&
      (exitCode === 1 || exitCode === EX_SOFTWARE) &&
      (exitCause?.startsWith("uncaught:") === true || exitCause?.startsWith("unhandled:") === true);
    let exitDetail = exitCause
      ? readAndClearBgExitDetail(getJobDir(this.dispatch.short), exitCause)
      : undefined;
    let exitDetailTail = exitDetail
      ? truncateWithEllipsis(collapseWhitespace(stripAnsiPerLine(exitDetail)), MAX_RESTART_DETAIL) ||
        undefined
      : undefined;
    let exitDetailSuffix = !preInitTail && exitDetailTail ? `: ${exitDetailTail}` : "";
    let repeatedCause = fastCrash && !!exitCause && exitCause === this.lastExitCause;
    this.lastExitCause = fastCrash ? exitCause : undefined;
    let sessionIdTaken = !this.workerReady && exitCause === BG_EXIT_CAUSE_SESSION_IN_USE;
    let causeSuffix = preInitTail
      ? ` \u2014 ${preInitTail}`
      : wrapperDetail
        ? ` \u2014 ${wrapperDetail}`
        : exitCause
          ? ` \u2014 ${exitCause}`
          : "";
    let effectiveCwd = this.effectiveCwd ?? this.dispatch.cwd;
    let cwdMissing = false;
    if (exitCause === "setcwd")
      try {
        cwdMissing = !statSync(effectiveCwd).isDirectory();
      } catch {
        cwdMissing = true;
      }
    let userInterrupted =
      this.dispatch.launch.mode === "exec" && (signal === "SIGINT" || signal === "SIGQUIT");
    let settleOutcome;
    if (this.phase.kind === "retiring" && this.phase.reason === "reap") settleOutcome = this.killOutcome;
    else if (this.phase.kind === "retiring" && this.phase.reason === "grace") settleOutcome = "done";
    else if (this.phase.kind === "upgrading") settleOutcome = undefined;
    else if (launcherDaemonized) settleOutcome = "crashed";
    else if (exitCode === 0) settleOutcome = "done";
    else if (this.dispatch.launch.mode === "exec") settleOutcome = userInterrupted ? "killed" : "crashed";
    else if (
      cwdMissing ||
      sessionIdTaken ||
      (!this.workerReady && (this.attempt >= 2 || preInitTail || wrapperDetail)) ||
      fastCrashStreakHit ||
      repeatedCause ||
      (!ranLongEnough && this.attempt >= MAX_RESTARTS)
    )
      settleOutcome = "crashed";
    logEvent("tengu_bg_worker_exit", {
      short: bgShort(this.dispatch.short),
      code: exitCode ?? undefined,
      signal: fromEnumOpt(signal),
      attempt: this.attempt,
      procUptimeMs: uptimeMs,
      source: fromEnum(this.dispatch.source),
      launch_mode: fromEnum(this.dispatch.launch.mode),
      outcome: fromEnumOpt(settleOutcome),
      exitCause: sanitizedBgExitCauseForTelemetry(exitCause),
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
        .then((reattachEnv) => this.doSpawn(reattachEnv, true))
        .catch(logError);
      return;
    }
    if (launcherDaemonized) {
      let detail = `the launcher exited before Claude Code started \u2014 \`${wrapperCmd}\` must exec, not daemonize${wrapperDetail ? ` \u2014 ${wrapperDetail}` : ""}`;
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
    if (exitCode === 0) {
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
    let exitLabel = signal ? `${signal} (${exitCode})` : `exit ${exitCode}`;
    if (this.dispatch.launch.mode === "exec") {
      let execLastLine = this.execLastLine;
      this.patch({
        state: userInterrupted ? "stopped" : "crashed",
        detail: execLastLine ? `${exitLabel} \u2014 ${execLastLine}` : `${exitLabel}${causeSuffix}`,
      });
      return this.settle(userInterrupted ? "killed" : "crashed");
    }
    if (sessionIdTaken) {
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
      let notice = this.dimNotice(SESSION_ID_TAKEN_NOTICE);
      this.pushRing(notice);
      this.onStream.emit(notice);
      return this.settle("crashed");
    }
    if (!this.workerReady && exitCause?.startsWith("spare_postclaim:"))
      try {
        if (!statSync(this.dispatch.cwd).isDirectory()) return this.settleCwdGone("spare");
      } catch {
        return this.settleCwdGone("spare");
      }
    if (cwdMissing) return this.settleCwdGone("boot", effectiveCwd);
    if (!this.workerReady && (this.attempt >= 2 || preInitTail || wrapperDetail)) {
      let memoryHint =
        !signal && isLowMemory() ? " \u2014 possibly low memory \u2014 free some up and retry" : "";
      this.patch({
        state: "crashed",
        detail: `${exitLabel} before init${causeSuffix || memoryHint}`,
      });
      return this.settle("crashed");
    }
    if (fastCrashStreakHit || repeatedCause) {
      this.patch({
        state: "crashed",
        detail: repeatedCause
          ? `${exitLabel} \xD7${this.attempt}${causeSuffix}${exitDetailSuffix}`
          : `${exitLabel} within ${RESTART_BACKOFF_MS / 1000}s of spawn \xD7${this.fastCrashStreak}${causeSuffix}${exitDetailSuffix}`,
      });
      return this.settle("crashed");
    }
    if (ranLongEnough) this.attempt = 1;
    this.scheduleRespawn(`${exitLabel}${causeSuffix}${exitDetailSuffix}`);
  }
  async doSpawnUnlessSettledOnDisk(fromBackoff = false) {
    let backoffTimer = this.backoffTimer;
    let jobDir = getJobDir(this.dispatch.short);
    let revivalGuardEnabled = isRevivalGuardEnabled();
    let freshState = revivalGuardEnabled
      ? await readJobStateFreshOrNull(jobDir, this.storageV5).catch(() => null)
      : null;
    let jobState =
      freshState ??
      (revivalGuardEnabled && !fromBackoff
        ? await readJobState(jobDir, this.storageV5).catch(() => {
            return;
          })
        : undefined);
    let settledRow = jobState && isSettled(jobState) && !jobState.queuedPrompt ? jobState : undefined;
    let allowCrashRestart =
      freshState !== null &&
      settledRow !== undefined &&
      terminalOutcome(settledRow.state) === "success" &&
      this.lastExitOwnCrash &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_settled_crash_restart", true) === true;
    let pinnedIds = allowCrashRestart
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
    let restartBlocker = !allowCrashRestart
      ? undefined
      : this.attachers.size > 0
        ? "attached"
        : (settledRow.inFlight?.kinds ?? []).includes("session_cron")
          ? "session_cron"
          : pinnedIds?.has(this.dispatch.short)
            ? "pinned"
            : undefined;
    if (settledRow && (!restartBlocker || this.attempt > RESTART_WINDOW)) {
      if (fromBackoff && !this.workerReady) return;
      this.followUpCrashNotice(
        restartBlocker
          ? `not restarted \u2014 this session crashed again after ${this.attempt - 1} restarts (the conversation is saved)`
          : terminalOutcome(settledRow.state) === "stopped"
            ? NOT_RESTARTED_STOPPED
            : NOT_RESTARTED_IDLE,
      );
      if (fromBackoff) return this.armBackoff(RESTART_NOTICE_MS);
      return this.settleAsOnDisk(settledRow, restartBlocker ? "settled_restart_cap" : "settled_on_disk");
    }
    if (jobState?.interactiveLineage && this.lastExitExternalStop) {
      if (fromBackoff) return;
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
    if (fromBackoff) {
      if (!revivalGuardEnabled || jobState) this.followUpCrashNotice(RESTART_PENDING_NOTICE);
      return;
    }
    if (this.crashFollowUp && this.crashFollowUp !== RESTART_PENDING_NOTICE)
      this.followUpCrashNotice(RESTART_NOW_NOTICE);
    return this.doSpawn(
      undefined,
      false,
      settledRow &&
        restartBlocker && {
          row: settledRow,
          neededBy: restartBlocker,
        },
    );
  }
  settleAsOnDisk(row, reason) {
    logEvent("tengu_bg_respawn_suppressed", {
      short: bgShort(this.dispatch.short),
      reason: fromEnum(reason),
    });
    let terminalKind = terminalOutcome(row.state);
    this.settle(terminalKind === "success" ? "done" : terminalKind === "failure" ? "failed" : "killed");
  }
  settleCwdGone(via, cwd = this.dispatch.cwd) {
    let reasonText = cwdGoneReason(cwd);
    logEvent("tengu_bg_spawn_cwd_gone", {
      short: bgShort(this.dispatch.short),
      attempt: this.attempt,
      via: fromEnum(via),
    });
    this.patch({
      state: "crashed",
      detail: reasonText,
    });
    let notice = this.dimNotice(`${reasonText} \u2014 this job cannot be respawned`);
    this.pushRing(notice);
    this.onStream.emit(notice);
    this.settle("crashed");
  }
  async buildBridgeReattachEnvFromState() {
    let jobState = await readJobState(getJobDir(this.dispatch.short), this.storageV5).catch(() => null);
    if (!jobState) return;
    return buildBridgeReattachEnv(
      jobState.bridgeSessionId,
      jobState.bridgeSessionSeq,
      jobState.bridgeOutboundOnly,
      jobState.bridgeSessionGroupingId,
      {
        ownerAccountUuid: jobState.bridgeOwnerAccountUuid,
        ownerOrganizationUuid: jobState.bridgeOwnerOrganizationUuid,
        noHistoryBackfill: jobState.bridgeNoHistoryBackfill,
      },
    );
  }
  scheduleRespawn(detail) {
    if (this.attempt >= MAX_RESTARTS) {
      logEvent("tengu_bg_respawn_exhausted", {
        short: bgShort(this.dispatch.short),
        attempts: this.attempt,
      });
      this.patch({
        state: "crashed",
        detail,
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
      detail: `${detail}; respawning`,
    });
    this.procStart = undefined;
    let notice = this.dimNotice(`worker crashed (${detail})`);
    this.pushRing(notice);
    this.onStream.emit(notice);
    this.crashFollowUp = undefined;
    this.armBackoff(RESTART_DELAY_MS);
    this.doSpawnUnlessSettledOnDisk(true).catch(logError);
  }
  armBackoff(delayMs) {
    if (this.backoffTimer) clearTimeout(this.backoffTimer);
    this.backoffTimer = setTimeout(() => {
      this.backoffTimer = null;
      if (this.phase.kind !== "retiring" && this.phase.kind !== "retired")
        this.doSpawnUnlessSettledOnDisk().catch(logError);
    }, delayMs);
    this.backoffTimer.unref();
  }
  settle(outcome) {
    if (this.record.outcome) return;
    logEvent("tengu_bg_settle", {
      short: bgShort(this.dispatch.short),
      outcome: fromEnum(outcome),
      uptimeMs: Date.now() - this.record.startedAt,
      attempt: this.attempt,
      worker_cli_version: sanitizeVersion(this.record.cliVersion),
      worker_stale: this.isVersionStale,
    });
    this.transitionTo({
      kind: "retired",
      outcome,
    });
    this.clearLiveness();
    this.patch({
      outcome,
      settledAt: Date.now(),
      tempo: "idle",
    });
    this.onSettle.emit(outcome);
  }
  connectRv() {
    if (this.rv || this.isDetached || this.record.outcome) return;
    if (this.dispatch.launch.mode === "exec") {
      this.startPidPoll();
      return;
    }
    this.rv = connectRendezvousSocket(
      this.rvSockPath ?? daemonRvSocket(this.dispatch.short),
      (frame) => {
        if (frame.type === "heartbeat") this.lastRvHeartbeat = Date.now();
        else if (frame.type === "auth-rejected" || frame.type === "reply-rejected") {
          this.rvRejected = true;
          logEvent(
            frame.type === "auth-rejected" ? "tengu_bg_rv_auth_mismatch" : "tengu_bg_rv_reply_rejected",
            {},
          );
          this.rekeyForAuthMismatch(
            frame.type === "auth-rejected" ? "rv-auth-rejected" : "rv-reply-rejected",
          );
        } else if (frame.type === "done") this.settle(frame.outcome);
        else if (frame.type === "state") this.patch(frame.patch);
        else if (frame.type === "detach-request") {
          let apc = daemonDetachApc(frame.msg);
          let lastAttacher = this.attachers.get(this.lastInputAttacher);
          if (!frame.broadcast && lastAttacher) lastAttacher.deliver(apc);
          else if (this.attachers.size > 0)
            for (let attacher of this.attachers.values()) attacher.deliver(apc);
          else this.onStream.emit(apc);
        } else if (frame.type === "repaint-done") this.onRepaintDone.emit();
        else if (frame.type === "interactive-mark") {
          let interactiveMarkRv = parseInteractiveMarkRv(frame);
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
  async failIfHostExited(via) {
    let pid = this.record.pid;
    if (!pid || this.record.outcome || this.isKilling || !this.pty) return false;
    let linuxProcState = await readLinuxProcState(pid);
    if (!isMinorFaultField(linuxProcState)) return false;
    if (this.record.outcome || this.isKilling || !this.pty || this.record.pid !== pid) return false;
    logForDebugging(
      `bg: ${this.dispatch.short} pty host pid=${pid} has exited but is unreaped (state ${linuxProcState}) via=${via} \u2014 reaping it and marking the session failed`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_bg_ptyhost_zombie", {
      short: bgShort(this.dispatch.short),
      via: fromEnum(via),
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
  async checkPid(fromPoll = false) {
    let elapsedMs = Date.now() - this.lastCheckPidAt;
    this.lastCheckPidAt = Date.now();
    let wokeUp = elapsedMs > STALE_POLL_MS;
    if (wokeUp) this.hostWokeAt = Date.now();
    if (this.record.outcome || !this.record.pid) return;
    if (wokeUp && this.lastRvHeartbeat !== undefined) this.lastRvHeartbeat = Date.now();
    if (!this.pty)
      try {
        process.kill(this.record.pid, 0);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode === "ESRCH" || errnoCode === "EPERM") {
          this.logVanished(false, fromPoll);
          this.settle(this.isKilling ? "killed" : "crashed");
        }
        return;
      }
    let lastRvHeartbeat = this.lastRvHeartbeat;
    if (
      !wokeUp &&
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
    if (fromPoll && this.pidPollTick++ % 12 !== 0) return;
    if (await this.pidRecycledAsync()) {
      if (this.record.outcome || this.pty) return;
      this.logVanished(true, fromPoll);
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
  isProviderManagedByHost,
  DaemonSupervisor,
  shouldCarryAuth,
  normalizeEnvKeyCase,
  BG_STRIPPED_ENV_VARS,
  usesCustomEndpoint,
};
