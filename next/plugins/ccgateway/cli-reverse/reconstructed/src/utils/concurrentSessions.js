/**
 * utils/concurrentSessions.ts
 *
 * 并发会话登记：<配置目录>/sessions/<pid>.json 记录会话状态与名称，FleetView 心跳与后台/daemon 会话判断。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/concurrentSessions.ts
 * pieces: chunk-6cc2zqkz.js (1), chunk-aepeg2w5.js (67), chunk-e7z1g8a9.js (1)
 * attribution: fingerprint 4, placement 65
 */
import { join, basename, sep } from "path";
import { writeFile, unlink, mkdir, chmod, readFile, lstat, readdir } from "fs/promises";
import { statSync, unlinkSync } from "fs";
import { homedir } from "os";
import { getClaudeConfigDir, isEnvTruthy } from "./envUtils.js";
import { getWorktreeSessionState } from "./worktree.js";
import { getPlatform } from "./platform.js";
import { REPLY_ACROSS_DEFAULT_DIRS } from "./peerAddress.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { create, create_3, create_2, create_26 } from "../../vendor/zod/lib/index.mjs";
import { createSignal } from "./signal.js";
import { slugifySessionName, isStableAddressEnabled, readRecordPidDomain } from "./sessionAddresses.js";
import {
  getSessionId,
  getIsInteractive,
  getRootSession,
  isReplBridgeActive,
  getTeammateAgentId,
  getAttacherCaps,
  getOriginalCwd,
  onSessionSwitch,
  onOriginalCwdChange,
  isDiskless,
} from "../bootstrap/state.js";
import { env, udsEnv } from "./env.js";
import { envDynamicProbe } from "./envDynamic.js";
import {
  looksLikeFullHostProcessTable,
  getProcessStartTimeAsync,
  isProcessProvablyGone,
} from "./processIdentity.js";
import { HostScoped } from "./hostScoped.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isAbsentParentError, formatStorageError } from "./storage/storageErrors.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, isENOENT, isFsInaccessible } from "./errors.js";
import { sanitizeSessionTitle } from "./stringUtils.js";
import { registerCleanup } from "./cleanupRegistry.js";
import {
  sessionSlug,
  keepsSessionId,
  isValidLocalTaskId,
  sanitizeVersion,
} from "../services/analytics/metadata.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { ownPidDomain, ownPidSpace } from "./pidSpace.js";
import { isTopHostSession, isClaudecodeSession } from "./sessionShape.js";
import { getAgentId, isNestedInteractiveClaudeSession } from "./teammate.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { jobStorageSpace } from "../services/daemon/jobState.js";
import { MAX_SESSION_RECORD_BYTES } from "./sessionRecords.js";
import { authenticatePeer, PEER_KEY_FILE_RE, MAX_PEER_NOTICE_LENGTH } from "./sessionPeers.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { readSmallFileOrNull } from "./readSmallFile.js";
import { sleep } from "./sleep.js";
import { isIdeOrSdkEntrypoint } from "./entrypointKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e7z1g8a9.js:4175-4216 fingerprint = getSessionsDir (1)
function getSessionsDir() {
  return join(getClaudeConfigDir(), "sessions");
}
//@ chunk-aepeg2w5.js:836002-836057 placement
/**
 * 读取恢复提示里的 worktree 名。
 */
function getResumeHintWorktreeName() {
  return getWorktreeSessionState().getResumeHintWorktreeName();
}
//@ chunk-aepeg2w5.js:836057-836107 placement
/**
 * 清除恢复提示中的 worktree 名。
 */
function clearResumeHintWorktree() {
  getWorktreeSessionState().clearResumeHintWorktreeName();
}
//@ chunk-aepeg2w5.js:836107-836152 placement
/**
 * 本会话是否曾在 worktree 中。
 */
function hasBeenInWorktree() {
  return getWorktreeSessionState().hasBeenInWorktree;
}
//@ chunk-aepeg2w5.js:836152-836189 placement
/**
 * 后台接管状态。
 */
function getBgTakeover() {
  return getWorktreeSessionState().bgTakeover;
}
//@ chunk-aepeg2w5.js:836189-836250 placement
/**
 * 记录某 agent 已派生（用于隔离证据）。
 */
function recordSpawnedAgentIsolation(evidence) {
  getWorktreeSessionState().agentIsolationEvidence.recordSpawned(evidence);
}
//@ chunk-aepeg2w5.js:836250-836316 placement
/**
 * 该 agent 是否在隔离环境派生过。
 */
function wasAgentSpawnedIsolated(agentId) {
  return getWorktreeSessionState().agentIsolationEvidence.spawned.has(agentId);
}
//@ chunk-aepeg2w5.js:836316-836384 placement
/**
 * 记录某 agent 已被干净移除。
 */
function recordCleanlyRemovedAgent(agentId) {
  getWorktreeSessionState().agentIsolationEvidence.recordCleanlyRemoved(agentId);
}
//@ chunk-aepeg2w5.js:836384-836457 placement
/**
 * 该 agent 是否被干净移除过。
 */
function wasAgentCleanlyRemoved(agentId) {
  return getWorktreeSessionState().agentIsolationEvidence.cleanlyRemoved.has(agentId);
}
//@ chunk-aepeg2w5.js:836457-836513 placement
/**
 * 判断该 cwd 是否已标记为无法做 agent 隔离。
 */
function isIsolationUnavailableForCwd(cwd) {
  return getWorktreeSessionState().isolationUnavailableCwd === cwd;
}
//@ chunk-aepeg2w5.js:836513-836562 placement
/**
 * 标记某 cwd 无法做 agent 隔离。
 */
function markIsolationUnavailableForCwd(cwd) {
  getWorktreeSessionState().markIsolationUnavailable(cwd);
}
//@ chunk-aepeg2w5.js:836562-836640 placement
/**
 * 会话保留的历史名称数上限（8）。
 */
var FORMER_NAME_HINT_TTL_MS = 600000;
var MAX_FORMER_NAMES = 3;
var MAX_SESSION_CONVERSATION_NAMES = 8;
var SESSION_NAME_FRESH_MS = 1e4;
var PEER_PROTOCOL = 1;
var NOTIFY_IDLE_PEER_FEATURE = "notify_idle";
var ARTIFACT_YIELD_PEER_FEATURE = "artifact_yield";
//@ chunk-aepeg2w5.js:836640-836745 placement
function supportsPeerPid() {
  if (getPlatform() === "windows") return false;
  return typeof Bun !== "undefined" && typeof Bun.ant?.getPeerPid === "function";
}
//@ chunk-aepeg2w5.js:836745-836792 placement
/**
 * 本节点支持的 peer 特性列表（notify_idle、artifact_yield 等）。
 */
function peerFeatures() {
  return [
    NOTIFY_IDLE_PEER_FEATURE,
    ...(supportsPeerPid() ? [REPLY_ACROSS_DEFAULT_DIRS] : []),
    ARTIFACT_YIELD_PEER_FEATURE,
  ];
}
//@ chunk-aepeg2w5.js:836792-837003 placement
var sessionRecordSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:836792", () => {
  sessionRecordSchema = DoctorLazy(() =>
    create({
      pid: create_3(),
      sessionId: create_2(),
      cwd: create_2().optional(),
      startedAt: create_3(),
      version: create_2().optional(),
      kind: create_26(["interactive", "bg", "daemon", "daemon-worker"]),
      entrypoint: create_2().optional(),
      pidDomain: create_2().optional(),
    }),
  );
});
//@ chunk-aepeg2w5.js:837003-839326 placement
/**
 * 会话注册状态（异常退出扫描、pid 文件写链、注册名、旧名）。
 */
class SessionRegistryState {
  uncleanExitsScanned = false;
  reportedUncleanExitPaths = new Set();
  watchedCache = undefined;
  pidFileWriteChain = Promise.resolve();
  asksForConvertedSkills = null;
  asksForConvertedSkillsOnRecord = null;
  registeredName = undefined;
  formerNames = [];
  conversationNames = new Map();
  adoptions = 0;
  restores = 0;
  liveSessionId = undefined;
  restoreSetAsideName = undefined;
  heldNames = new Map();
  registered = false;
  bornSpare = false;
  spareClaimPoll = undefined;
  registration = undefined;
  registrySweepPermitted = undefined;
  registeredNameChanged = createSignal();
  setRegisteredName(name, source, givenAtLaunch) {
    let registeredName = this.registeredName;
    let now = Date.now();
    let slug = slugifySessionName(name);
    let sessionId = getSessionId();
    let launchGiven = givenAtLaunch ?? registeredName?.givenAtLaunch;
    if (registeredName && slugifySessionName(registeredName.name) === slug) {
      this.registeredName = {
        name,
        source,
        since: registeredName.since,
        sessionId,
        ...(launchGiven && {
          givenAtLaunch: launchGiven,
        }),
      };
      if (registeredName.name !== name || registeredName.source !== source) this.registeredNameChanged.emit();
      return;
    }
    if (registeredName) this.heldNames.set(slugifySessionName(registeredName.name), registeredName.source);
    this.heldNames.delete(slug);
    this.formerNames = this.formerNames.filter((formerName) => slugifySessionName(formerName.name) !== slug);
    if (
      registeredName &&
      (registeredName.source !== "derived" || isStableAddressEnabled()) &&
      now - registeredName.since >= SESSION_NAME_FRESH_MS
    ) {
      let formerSlug = slugifySessionName(registeredName.name);
      this.formerNames = [
        {
          name: registeredName.name,
          until: now,
          sessionId: registeredName.sessionId,
        },
        ...this.formerNames.filter((formerName) => slugifySessionName(formerName.name) !== formerSlug),
      ].slice(0, MAX_FORMER_NAMES);
    }
    this.registeredName = {
      name,
      source,
      since: now,
      sessionId,
      ...(givenAtLaunch && {
        givenAtLaunch,
      }),
    };
    if (source !== "derived" && this.liveSessionId !== undefined)
      this.conversationNames.delete(this.liveSessionId);
    this.registeredNameChanged.emit();
  }
  setAsideRegisteredName(sessionId, currentSessionId) {
    let registeredName = this.registeredName;
    if (registeredName === undefined) return;
    this.heldNames.set(slugifySessionName(registeredName.name), registeredName.source);
    this.conversationNames.delete(sessionId);
    this.conversationNames.set(sessionId, {
      name: registeredName.name,
      source: registeredName.source,
    });
    if (this.conversationNames.size > MAX_SESSION_CONVERSATION_NAMES) {
      for (let key of this.conversationNames.keys())
        if (key !== currentSessionId) {
          this.conversationNames.delete(key);
          break;
        }
    }
    this.registeredName = undefined;
  }
  setUncleanExitsScanned(uncleanExitsScanned) {
    this.uncleanExitsScanned = uncleanExitsScanned;
  }
  markUncleanExitReported(path) {
    this.reportedUncleanExitPaths.add(path);
  }
  setWatchedCache(watchedCache) {
    this.watchedCache = watchedCache;
  }
  setPidFileWriteChain(pidFileWriteChain) {
    this.pidFileWriteChain = pidFileWriteChain;
  }
  isRegistrySweepPermitted() {
    this.registrySweepPermitted ??= this.probeRegistrySweepPermitted();
    return this.registrySweepPermitted;
  }
  async probeRegistrySweepPermitted() {
    let platform = getPlatform();
    if (platform === "wsl") return false;
    if (!getIsInteractive() && platform !== "windows" && platform !== "macos") return false;
    if (
      platform === "windows" &&
      (env.CONTAINER_SANDBOX_MOUNT_POINT !== undefined ||
        env.USERNAME === "ContainerAdministrator" ||
        env.USERNAME === "ContainerUser")
    )
      return false;
    if (
      envDynamicProbe.getIsBubblewrapSandbox() ||
      isEnvTruthy(env.IS_SANDBOX) ||
      (await envDynamicProbe.getIsDocker())
    )
      return false;
    return looksLikeFullHostProcessTable();
  }
}
//@ chunk-aepeg2w5.js:839326-839351 placement
/**
 * 按宿主隔离的会话登记状态。
 */
var sessionRegistryByHost; // deferred: uses SessionRegistryState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aepeg2w5.js:839326", () => {
  sessionRegistryByHost = new HostScoped(() => new SessionRegistryState());
});
//@ chunk-aepeg2w5.js:839351-839388 placement
function getSessionRegistryState() {
  return sessionRegistryByHost.of(getRootSession().host);
}
//@ chunk-aepeg2w5.js:839388-839425 placement
function getHeldSessionNames() {
  return getSessionRegistryState().heldNames;
}
//@ chunk-aepeg2w5.js:839425-839466 placement
function getRegisteredSessionName() {
  return getSessionRegistryState().registeredName;
}
//@ chunk-aepeg2w5.js:839466-839545 placement
function whenSessionRegistered() {
  let sessionRegistryState = getSessionRegistryState();
  return sessionRegistryState.registration ?? Promise.resolve(sessionRegistryState.registered);
}
//@ chunk-aepeg2w5.js:839545-839655 placement = envSessionKind (1)
function envSessionKind() {
  let k = env.CLAUDE_CODE_SESSION_KIND;
  if (k === "bg" || k === "daemon" || k === "daemon-worker") return k;
  return;
}
//@ chunk-aepeg2w5.js:839655-839688 placement
function isBgSession() {
  return envSessionKind() === "bg";
}
//@ chunk-aepeg2w5.js:839688-839735 placement
function isUnattendedInteractiveSession() {
  return isReplBridgeActive() || isBgSession() || getTeammateAgentId() !== undefined;
}
//@ chunk-aepeg2w5.js:839735-839768 placement
function isUnattendedBgSession() {
  return isBgSession() && !getAttacherCaps();
}
//@ chunk-aepeg2w5.js:839768-839807 placement
function isActingAsBgJob() {
  return isBgSession() || getBgTakeover() !== null;
}
//@ chunk-aepeg2w5.js:839807-839859 placement
function getBgJobDir() {
  return getBgTakeover()?.jobDir ?? env.CLAUDE_JOB_DIR;
}
//@ chunk-aepeg2w5.js:839859-839912 placement
function isDaemonBgWorker() {
  return env.CLAUDE_BG_BACKEND === "daemon";
}
//@ chunk-aepeg2w5.js:839912-839950 placement
/**
 * fleetview 心跳的过期时间（5 秒）。
 */
var FLEETVIEW_HEARTBEAT_FILE = ".fleetview-heartbeat";
var FLEETVIEW_HEARTBEAT_STALE_MS = 5000;
//@ chunk-aepeg2w5.js:839950-839986 placement
function getHeartbeatKey() {
  return STORAGE_SPACES.session(FLEETVIEW_HEARTBEAT_FILE);
}
//@ chunk-aepeg2w5.js:839986-840041 placement
/**
 * 并发会话 pid 文件的存储键 sessions/<pid>.json（<配置目录>/sessions/ 下记录每个运行中会话的状态）。
 */
function getPidFileKey() {
  return STORAGE_SPACES.session(`${process.pid}.json`);
}
//@ chunk-aepeg2w5.js:840041-840365 placement
async function touchFleetViewHeartbeat(storageV5) {
  if (storageV5) {
    try {
      let writeResult = await storageV5.write(getHeartbeatKey(), String(Date.now()), {
        publishDiscipline: "inPlace",
      });
      if (!writeResult.ok && !isAbsentParentError(writeResult.error))
        logForDebugging(
          `[concurrentSessions] heartbeat touch failed: ${formatStorageError(writeResult.error)}`,
        );
    } catch (error) {
      logForDebugging(`[concurrentSessions] heartbeat touch failed: ${errorMessage(error)}`);
    }
    return;
  }
  try {
    await writeFile(join(getSessionsDir(), FLEETVIEW_HEARTBEAT_FILE), String(Date.now()));
  } catch {}
}
//@ chunk-aepeg2w5.js:840365-840467 placement
async function clearFleetViewHeartbeat(storageV5) {
  if (storageV5) {
    try {
      await storageV5.delete(getHeartbeatKey());
    } catch {}
    return;
  }
  try {
    await unlink(join(getSessionsDir(), FLEETVIEW_HEARTBEAT_FILE));
  } catch {}
}
//@ chunk-aepeg2w5.js:840467-840479 placement
/**
 * 被监视会话缓存的有效期（1 秒）。
 */
var WATCHED_CACHE_TTL_MS = 1000;
//@ chunk-aepeg2w5.js:840479-840553 placement
function getWatchedCacheIfFresh(sessionRegistryState, nowMs) {
  let { watchedCache } = sessionRegistryState;
  return watchedCache && nowMs - watchedCache.at < WATCHED_CACHE_TTL_MS ? watchedCache.value : undefined;
}
//@ chunk-aepeg2w5.js:840553-840797 placement
function isBeingWatched() {
  let sessionRegistryState = getSessionRegistryState();
  let now = Date.now();
  let watchedCacheIfFresh = getWatchedCacheIfFresh(sessionRegistryState, now);
  if (watchedCacheIfFresh !== undefined) return watchedCacheIfFresh;
  let watched = false;
  try {
    let { mtimeMs } = statSync(join(getSessionsDir(), FLEETVIEW_HEARTBEAT_FILE));
    watched = now - mtimeMs < FLEETVIEW_HEARTBEAT_STALE_MS;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`);
  }
  sessionRegistryState.setWatchedCache({
    at: now,
    value: watched,
  });
  return watched;
}
//@ chunk-aepeg2w5.js:840797-841217 placement
async function isBeingWatchedV5(storageV5) {
  let sessionRegistryState = getSessionRegistryState();
  let now = Date.now();
  let watchedCacheIfFresh = getWatchedCacheIfFresh(sessionRegistryState, now);
  if (watchedCacheIfFresh !== undefined) return watchedCacheIfFresh;
  let heartbeatMs;
  try {
    let statResult = await storageV5.statMeta(getHeartbeatKey());
    if (statResult.ok) heartbeatMs = statResult.value.mtimeMs;
    else if (statResult.error.code !== "NotFound")
      logForDebugging(`[concurrentSessions] heartbeat stat failed: ${formatStorageError(statResult.error)}`);
  } catch (error) {
    logForDebugging(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`);
  }
  let now_2 = Date.now();
  let watched = heartbeatMs !== undefined && now_2 - heartbeatMs < FLEETVIEW_HEARTBEAT_STALE_MS;
  let watchedCache = sessionRegistryState.watchedCache;
  if (!watchedCache || watchedCache.at < now)
    sessionRegistryState.setWatchedCache({
      at: now_2,
      value: watched,
    });
  return watched;
}
//@ chunk-aepeg2w5.js:841217-841280 placement
function registerSession(storageV5) {
  let sessionRegistryState = getSessionRegistryState();
  let registration = registerSession_2(sessionRegistryState, storageV5);
  sessionRegistryState.registration = registration;
  return registration;
}
//@ chunk-aepeg2w5.js:841280-843999 fingerprint = registerSession (0.359)
async function registerSession_2(sessionRegistryState, storageV5) {
  if (!shouldRegisterPidFile()) return false;
  let deferred = Promise.withResolvers();
  sessionRegistryState.setPidFileWriteChain(deferred.promise);
  let sessionKind = envSessionKind() ?? "interactive";
  sessionRegistryState.bornSpare = sessionKind === "bg" && env.CLAUDE_BG_SOURCE === "spare";
  let isSpare = sessionRegistryState.bornSpare && !(await jobStateExists(storageV5));
  let envName = env.CLAUDE_CODE_SESSION_NAME
    ? sanitizeSessionTitle(env.CLAUDE_CODE_SESSION_NAME) || undefined
    : undefined;
  let dir = getSessionsDir();
  let pidFile = join(dir, `${process.pid}.json`);
  process.on("exit", () => {
    try {
      unlinkSync(pidFile);
    } catch {}
  });
  registerCleanup(async () => {
    if (storageV5) {
      try {
        await storageV5.delete(getPidFileKey());
      } catch {}
      return;
    }
    try {
      await unlink(pidFile);
    } catch {}
  });
  try {
    let tmuxPaneId = await getTmuxPaneId();
    await mkdir(dir, {
      recursive: true,
      mode: 448,
    });
    await chmod(dir, 448);
    let initialName = envName
      ? {
          name: envName,
          source: "user",
        }
      : sessionKind === "interactive"
        ? {
            name: sessionSlug(getOriginalCwd(), getSessionId()),
            source: "derived",
          }
        : undefined;
    let pidFileData = jsonStringify({
      pid: process.pid,
      sessionId: getSessionId(),
      cwd: getOriginalCwd(),
      startedAt: Date.now(),
      procStart: await getProcessStartTimeAsync(process.pid),
      version: {
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
      peerProtocol: PEER_PROTOCOL,
      peerFeatures: peerFeatures(),
      kind: sessionKind,
      entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
      hostSessionId: ownDesktopHostSessionId(),
      pidDomain: await ownPidDomain(),
      asksForConvertedSkills: sessionRegistryState.asksForConvertedSkills,
      ...(tmuxPaneId && {
        tmux: tmuxPaneId,
      }),
      ...{
        messagingSocketPath: udsEnv.CLAUDE_CODE_MESSAGING_SOCKET,
      },
      ...{
        name: initialName?.name,
        nameSource: initialName?.source === "derived" ? "derived" : undefined,
        nameSince: Date.now(),
        logPath: env.CLAUDE_CODE_SESSION_LOG,
        agent: env.CLAUDE_CODE_AGENT,
        jobId: sessionKind === "bg" && env.CLAUDE_JOB_DIR ? basename(env.CLAUDE_JOB_DIR) : undefined,
        spare: isSpare ? true : undefined,
      },
    });
    if (storageV5) {
      let writeResult = await storageV5.write(getPidFileKey(), pidFileData, {
        publishDiscipline: "inPlace",
      });
      if (!writeResult.ok) {
        logForDebugging(
          `[concurrentSessions] v5 pid-file write failed: ${formatStorageError(writeResult.error)}`,
        );
        throw Error("v5 pid-file write failed");
      }
    } else await writeFile(pidFile, pidFileData);
    sessionRegistryState.registered = true;
    if (isSpare) startSpareClaimPoll(storageV5);
    if (initialName && sessionRegistryState.registeredName === undefined)
      sessionRegistryState.setRegisteredName(
        initialName.name,
        initialName.source,
        initialName.source === "derived" ? undefined : true,
      );
    sessionRegistryState.liveSessionId = getSessionId();
    onSessionSwitch((nextSessionId, previousSessionId) => {
      let sessionRegistryState = getSessionRegistryState();
      let { registeredName, liveSessionId } = sessionRegistryState;
      sessionRegistryState.liveSessionId = nextSessionId;
      if (isStableAddressEnabled() && keepsSessionId(previousSessionId)) {
        sessionRegistryState.adoptions++;
        let heldName = sessionRegistryState.conversationNames.get(nextSessionId);
        let sessionChanged =
          registeredName !== undefined &&
          registeredName.source !== "derived" &&
          !registeredName.givenAtLaunch &&
          registeredName.sessionId !== nextSessionId;
        if (sessionChanged && liveSessionId !== undefined)
          sessionRegistryState.setAsideRegisteredName(liveSessionId, nextSessionId);
        if (registeredName?.source === "derived" || sessionChanged) {
          updateSessionName(sessionSlug(getOriginalCwd(), nextSessionId), storageV5, "derived");
          if (heldName !== undefined)
            sessionRegistryState.restoreSetAsideName?.(heldName.name, heldName.source);
        } else if (registeredName !== undefined)
          sessionRegistryState.registeredName = {
            ...registeredName,
            sessionId: nextSessionId,
          };
      }
      updatePidFile(
        {
          sessionId: nextSessionId,
          parkedJobId: undefined,
          updatedAt: Date.now(),
        },
        storageV5,
      );
    });
    onOriginalCwdChange((id) => {
      if (isStableAddressEnabled() && getSessionRegistryState().registeredName?.source === "derived")
        updateSessionName(sessionSlug(id, getSessionId()), storageV5, "derived");
      updatePidFile(
        {
          cwd: id,
        },
        storageV5,
      );
    });
    return true;
  } catch (error) {
    logForDebugging(`[concurrentSessions] register failed: ${errorMessage(error)}`);
    return false;
  } finally {
    deferred.resolve();
  }
}
//@ chunk-aepeg2w5.js:843999-844740 fingerprint = updatePidFile (0.503)
async function updatePidFile(patch, storageV5) {
  let pidFile = join(getSessionsDir(), `${process.pid}.json`);
  let sessionRegistryState = getSessionRegistryState();
  let writeChain = sessionRegistryState.pidFileWriteChain.then(async () => {
    try {
      if (storageV5) {
        let readResult = await storageV5.read([getPidFileKey()]);
        if (!readResult.ok) {
          logForDebugging(
            `[concurrentSessions] updatePidFile failed: ${formatStorageError(readResult.error)}`,
          );
          return false;
        }
        let item = readResult.value.items[0];
        if (!item?.found) {
          logForDebugging("[concurrentSessions] updatePidFile failed: pid file not found");
          return false;
        }
        let data = jsonParse(Buffer.from(item.value).toString("utf8"));
        let writeResult = await storageV5.write(
          getPidFileKey(),
          jsonStringify({
            ...data,
            ...patch,
          }),
          {
            publishDiscipline: "inPlace",
          },
        );
        if (!writeResult.ok) {
          logForDebugging(
            `[concurrentSessions] updatePidFile failed: ${formatStorageError(writeResult.error)}`,
          );
          return false;
        }
        return true;
      }
      let currentData = jsonParse(await readFile(pidFile, "utf8"));
      await writeFile(
        pidFile,
        jsonStringify({
          ...currentData,
          ...patch,
        }),
      );
      return true;
    } catch (error) {
      logForDebugging(`[concurrentSessions] updatePidFile failed: ${errorMessage(error)}`);
      return false;
    }
  });
  sessionRegistryState.setPidFileWriteChain(
    writeChain.then(() => {
      return;
    }),
  );
  return writeChain;
}
//@ chunk-aepeg2w5.js:844740-845205 placement
async function updateSessionName(name, storageV5, source = "user", givenAtLaunch) {
  if (!name) return false;
  let sessionRegistryState = getSessionRegistryState();
  sessionRegistryState.setRegisteredName(name, source, givenAtLaunch);
  let writeResult =
    (await updatePidFile(
      {
        name,
        nameSource: source,
        formerNames:
          sessionRegistryState.formerNames.length > 0 ? sessionRegistryState.formerNames : undefined,
        nameSince: sessionRegistryState.registeredName?.since ?? Date.now(),
        updatedAt: Date.now(),
      },
      storageV5,
    )) || !shouldRegisterPidFile();
  if (!writeResult)
    logForDebugging(
      `[session-name] "${name}" applied locally but the session registry record was not updated \u2014 other sessions may keep showing the old name (see "updatePidFile failed" above)`,
      {
        level: "warn",
      },
    );
  return writeResult;
}
//@ chunk-aepeg2w5.js:845205-845284 placement
function ownDesktopHostSessionId() {
  if (!isTopHostSession() || isClaudecodeSession()) return;
  return isValidLocalTaskId(env.CLAUDE_CODE_HOST_SESSION_ID);
}
//@ chunk-aepeg2w5.js:845284-845329 placement
function shouldRegisterPidFile() {
  return !isDiskless() && getAgentId() == null && !isNestedInteractiveClaudeSession();
}
//@ chunk-aepeg2w5.js:845329-845737 placement
async function adoptSuppliedSessionTitle(title, storageV5) {
  let sanitizedTitle = sanitizeSessionTitle(title);
  await whenSessionRegistered();
  let sessionRegistryState = getSessionRegistryState();
  let registeredName = sessionRegistryState.registeredName;
  if (
    !sanitizedTitle ||
    registeredName === undefined ||
    !(
      registeredName.source === "derived" ||
      (registeredName.source === "auto" &&
        slugifySessionName(registeredName.name) !== slugifySessionName(sanitizedTitle))
    )
  )
    return false;
  let applied = await updateSessionName(sanitizedTitle, storageV5, "auto");
  let registeredName_2 = sessionRegistryState.registeredName;
  if (!applied && registeredName_2?.name === sanitizedTitle && registeredName_2.source === "auto") {
    let slug = slugifySessionName(registeredName.name);
    sessionRegistryState.registeredName = registeredName;
    sessionRegistryState.heldNames.delete(slug);
    sessionRegistryState.formerNames = sessionRegistryState.formerNames.filter(
      (formerName) => slugifySessionName(formerName.name) !== slug,
    );
    sessionRegistryState.registeredNameChanged.emit();
  }
  return applied;
}
//@ chunk-aepeg2w5.js:845737-845818 placement
async function updateSessionMessagingSocketPath(messagingSocketPath, storageV5) {
  await updatePidFile(
    {
      messagingSocketPath,
      updatedAt: Date.now(),
    },
    storageV5,
  );
}
//@ chunk-aepeg2w5.js:845818-845874 placement = updateSessionBridgeId (1)
async function updateSessionBridgeId(bridgeSessionId, storageV5) {
  await updatePidFile(
    {
      bridgeSessionId,
    },
    storageV5,
  );
}
//@ chunk-aepeg2w5.js:845874-845947 placement
async function markSessionParked(parkedJobId, storageV5) {
  await updatePidFile(
    {
      parkedJobId,
      updatedAt: Date.now(),
    },
    storageV5,
  );
}
//@ chunk-aepeg2w5.js:845947-846023 placement
async function clearSessionParked(storageV5) {
  await updatePidFile(
    {
      parkedJobId: undefined,
      updatedAt: Date.now(),
    },
    storageV5,
  );
}
//@ chunk-aepeg2w5.js:846023-846212 placement
function updateSessionConvertedSkillsAsk(value, storageV5) {
  let sessionRegistryState = getSessionRegistryState();
  sessionRegistryState.asksForConvertedSkills = value;
  if (sessionRegistryState.asksForConvertedSkillsOnRecord === value) return;
  updatePidFile(
    {
      asksForConvertedSkills: value,
    },
    storageV5,
  ).then((updated) => {
    if (updated) sessionRegistryState.asksForConvertedSkillsOnRecord = value;
  });
}
//@ chunk-aepeg2w5.js:846212-846419 placement
/**
 * 更新本会话 pid 文件（status、updatedAt 等）。
 */
async function updateSessionActivity(activity, storageV5) {
  let now = Date.now();
  let registry = getSessionRegistryState();
  let becameBusy = registry.bornSpare && activity.status === "busy";
  let writeResult = await updatePidFile(
    {
      ...activity,
      updatedAt: now,
      ...(activity.status !== undefined && {
        statusUpdatedAt: now,
      }),
      ...(becameBusy && {
        spare: undefined,
      }),
    },
    storageV5,
  );
  if (becameBusy && writeResult) stopSpareClaimPoll(registry);
  return writeResult || !shouldRegisterPidFile();
}
//@ chunk-aepeg2w5.js:846419-846519 placement
function stopSpareClaimPoll(registry) {
  if (registry.spareClaimPoll !== undefined) {
    clearInterval(registry.spareClaimPoll);
    registry.spareClaimPoll = undefined;
  }
}
//@ chunk-aepeg2w5.js:846519-846617 placement
/**
 * 清除 pid 文件里的“备用”标记。
 */
async function clearSpareClaim(storageV5) {
  if (!getSessionRegistryState().bornSpare) return true;
  return updatePidFile(
    {
      spare: undefined,
      updatedAt: Date.now(),
    },
    storageV5,
  );
}
//@ chunk-aepeg2w5.js:846617-846906 placement
async function jobStateExists(storageV5) {
  let jobDirPath = getBgJobDir();
  if (!jobDirPath) return false;
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let stateKey = jobStorageSpace(jobDirPath, ["state.json"]);
    if (stateKey !== undefined)
      try {
        let statResult = await storageV5.statMeta(stateKey);
        return (
          statResult.ok || (statResult.error.code !== "NotFound" && statResult.error.code !== "Unavailable")
        );
      } catch {
        return false;
      }
  }
  try {
    await lstat(join(jobDirPath, "state.json"));
    return true;
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-aepeg2w5.js:846906-846918 placement
/**
 * 轮询备用认领的间隔（1 秒）。
 */
var SPARE_CLAIM_POLL_MS = 1000;
//@ chunk-aepeg2w5.js:846918-847046 placement
function startSpareClaimPoll(storageV5) {
  let sessionRegistryState = getSessionRegistryState();
  let state = {
    registry: sessionRegistryState,
    storageV5,
    clearing: false,
  };
  sessionRegistryState.spareClaimPoll = setInterval(pollSpareClaim, SPARE_CLAIM_POLL_MS, state);
  sessionRegistryState.spareClaimPoll.unref();
}
//@ chunk-aepeg2w5.js:847046-847242 placement
function pollSpareClaim(claimState) {
  if (claimState.clearing || claimState.registry.spareClaimPoll === undefined) return;
  claimState.clearing = true;
  jobStateExists(claimState.storageV5)
    .then((exists) => (exists ? clearSpareClaim(claimState.storageV5) : false))
    .then((cleared) => {
      if (cleared) stopSpareClaimPoll(claimState.registry);
    })
    .finally(() => {
      claimState.clearing = false;
    });
}
//@ chunk-aepeg2w5.js:847242-847497 placement
async function readSessionRecord(storageV5, fileName) {
  try {
    let readResult = await storageV5.read([
      {
        key: STORAGE_SPACES.session(fileName),
        offset: 0,
        length: MAX_SESSION_RECORD_BYTES + 1,
      },
    ]);
    let item = readResult.ok ? readResult.value.items[0] : undefined;
    if (!item?.found || item.value.byteLength > MAX_SESSION_RECORD_BYTES) return null;
    return sessionRecordSchema().safeParse(jsonParse(Buffer.from(item.value).toString("utf8")));
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:847497-847605 placement
async function deleteSessionRecord(storageV5, sessionId) {
  try {
    let deleteResult = await storageV5.delete(STORAGE_SPACES.session(sessionId));
    return deleteResult.ok && deleteResult.value.existed;
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:847605-847745 placement
async function authenticateSessionPeer(storageV5) {
  return authenticatePeer(storageV5, {
    partialOnCap: true,
    onIssue: (key, secret) =>
      logForDebugging(
        `[concurrentSessions] session list ${key}`,
        secret === undefined
          ? undefined
          : {
              level: secret,
            },
      ),
  });
}
//@ chunk-aepeg2w5.js:847745-847799 placement
function isRegistrySweepPermitted() {
  return getSessionRegistryState().isRegistrySweepPermitted();
}
//@ chunk-aepeg2w5.js:847799-847868 placement
/**
 * 判断是否为 Windows 平台下的 POSIX 风格路径（如 /c/...）。
 */
function isPosixPathOnWindows(cwd) {
  return getPlatform() === "windows" && cwd !== undefined && cwd.startsWith("/");
}
//@ chunk-aepeg2w5.js:847868-848115 placement
async function reapKeysOfReapedRecord(sessionsDir, pid, pidDomain, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let files = await authenticateSessionPeer(storageV5);
    if (files === undefined) return;
    await removeStaleSessionFiles(files, sessionsDir, pid, pidDomain, (fileName) =>
      storageV5.delete(STORAGE_SPACES.session(fileName)).then(
        () => {},
        () => {},
      ),
    );
    return;
  }
  let entries;
  try {
    entries = await readdir(sessionsDir);
  } catch {
    return;
  }
  await removeStaleSessionFiles(entries, sessionsDir, pid, pidDomain, (fileName) =>
    unlink(join(sessionsDir, fileName)).catch(() => {}),
  );
}
//@ chunk-aepeg2w5.js:848115-848335 placement
async function removeStaleSessionFiles(files, sessionsDir, pid, pidDomain, removeFile) {
  let prefix = `${pid}.`;
  await Promise.all(
    files.map(async (fileName) => {
      if (!fileName.startsWith(prefix) || !PEER_KEY_FILE_RE.test(fileName)) return;
      let recordPidDomain = await readRecordPidDomain(join(sessionsDir, fileName));
      if (recordPidDomain !== undefined && recordPidDomain !== pidDomain) return;
      if (pid === process.pid || !isProcessProvablyGone(pid)) return;
      await removeFile(fileName);
    }),
  );
}
//@ chunk-aepeg2w5.js:848335-848656 placement
function mayReapRecordFromThisDomain(record, pidDomain, peerDomains = []) {
  let platform = getPlatform();
  let isNonInteractive = !getIsInteractive();
  if (record === null) {
    if (peerDomains.some((peerDomain) => peerDomain !== undefined && peerDomain !== pidDomain)) return false;
    return platform !== "windows" && !(platform === "macos" && isNonInteractive);
  }
  if (record.pidDomain !== undefined) return record.pidDomain === pidDomain;
  switch (platform) {
    case "windows":
      return !isPosixPathOnWindows(record.cwd);
    case "macos":
      return (
        !isNonInteractive ||
        record.cwd === undefined ||
        record.cwd.startsWith(homedir() + sep) ||
        record.cwd === homedir()
      );
    default:
      return true;
  }
}
//@ chunk-aepeg2w5.js:848656-851082 placement
async function countConcurrentSessions(storageV5) {
  let sessionsDir = getSessionsDir();
  let entries;
  if (storageV5) {
    let authenticatedFiles = await authenticateSessionPeer(storageV5);
    if (authenticatedFiles === undefined) return 0;
    entries = authenticatedFiles;
  } else
    try {
      entries = await readdir(sessionsDir);
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`[concurrentSessions] readdir failed: ${errorMessage(error)}`);
      return 0;
    }
  let sessionRegistryState = getSessionRegistryState();
  let sweepPermitted = await sessionRegistryState.isRegistrySweepPermitted();
  let pidDomain = sweepPermitted ? await ownPidDomain() : "";
  logForDebugging(
    `[sessionRegistry] sweep ${sweepPermitted ? `permitted (domain ${pidDomain})` : "declined by isRegistrySweepPermitted() \u2014 dead records are left in place (neither counted nor deleted)"}`,
  );
  let liveCount = 0;
  let keptPids = new Set();
  let reapedPids = new Set();
  let peerFilesByPid = new Map();
  for (let fileName of entries) {
    let match = PEER_KEY_FILE_RE.exec(fileName);
    if (match) {
      let filePid = parseInt(match[1], 10);
      peerFilesByPid.set(filePid, [...(peerFilesByPid.get(filePid) ?? []), fileName]);
    }
  }
  for (let fileName of entries) {
    if (!/^\d+\.json$/.test(fileName)) continue;
    let filePid = parseInt(fileName.slice(0, -5), 10);
    if (filePid === process.pid) {
      liveCount++;
      continue;
    }
    if (isProcessRunning(filePid)) {
      liveCount++;
      continue;
    }
    if (!isProcessProvablyGone(filePid)) continue;
    if (!sweepPermitted) continue;
    let filePath = join(sessionsDir, fileName);
    let parseResult = storageV5
      ? await readSessionRecord(storageV5, fileName)
      : await readSmallFileOrNull(filePath, MAX_SESSION_RECORD_BYTES)
          .then((smallFileOrNull) =>
            smallFileOrNull === null ? null : sessionRecordSchema().safeParse(jsonParse(smallFileOrNull)),
          )
          .catch(() => null);
    let record = parseResult?.success ? parseResult.data : null;
    if (record === null) {
      await sleep(MAX_PEER_NOTICE_LENGTH);
      let retryParseResult = storageV5
        ? await readSessionRecord(storageV5, fileName)
        : await readSmallFileOrNull(filePath, MAX_SESSION_RECORD_BYTES)
            .then((smallFileOrNull) =>
              smallFileOrNull === null ? null : sessionRecordSchema().safeParse(jsonParse(smallFileOrNull)),
            )
            .catch(() => null);
      record = retryParseResult?.success ? retryParseResult.data : null;
    }
    let peerDomains =
      record === null
        ? await Promise.all(
            (peerFilesByPid.get(filePid) ?? []).map((peerFileName) =>
              readRecordPidDomain(join(sessionsDir, peerFileName)),
            ),
          )
        : [];
    if (!mayReapRecordFromThisDomain(record, pidDomain, peerDomains)) {
      keptPids.add(filePid);
      continue;
    }
    if (!isProcessProvablyGone(filePid)) {
      keptPids.add(filePid);
      continue;
    }
    reapedPids.add(filePid);
    if (
      (storageV5
        ? await deleteSessionRecord(storageV5, fileName)
        : await unlink(filePath).then(
            () => true,
            () => false,
          )) &&
      !sessionRegistryState.uncleanExitsScanned &&
      record !== null &&
      record.kind === "interactive" &&
      !isIdeOrSdkEntrypoint(record.entrypoint) &&
      !sessionRegistryState.reportedUncleanExitPaths.has(filePath)
    ) {
      logForDebugging(`Prior session exited uncleanly: ${record.sessionId} (v${record.version ?? "?"})`);
      logEvent("tengu_unclean_exit", {
        session_age_sec: Math.round((Date.now() - record.startedAt) / 1000),
        prior_version: sanitizeVersion(record.version),
        on_current_version:
          record.version ===
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
        prior_session_id: sanitizeMarkName(record.sessionId),
      });
      sessionRegistryState.markUncleanExitReported(filePath);
    }
  }
  if (sweepPermitted)
    for (let fileName of entries) {
      let match = PEER_KEY_FILE_RE.exec(fileName);
      if (!match) continue;
      let filePid = parseInt(match[1], 10);
      if (filePid === process.pid || keptPids.has(filePid) || !isProcessProvablyGone(filePid)) continue;
      let recordPidDomain = await readRecordPidDomain(join(sessionsDir, fileName));
      if (
        !(recordPidDomain !== undefined
          ? recordPidDomain === pidDomain
          : reapedPids.has(filePid) || getPlatform() === "linux")
      )
        continue;
      if (!isProcessProvablyGone(filePid)) continue;
      if (storageV5) deleteSessionRecord(storageV5, fileName).catch(() => {});
      else unlink(join(sessionsDir, fileName)).catch(() => {});
    }
  if (sweepPermitted) sessionRegistryState.setUncleanExitsScanned(true);
  return liveCount;
}
//@ chunk-aepeg2w5.js:851082-851136 placement
var TMUX_LOCATION_RE = /^[A-Za-z0-9_.-]{1,64}:@?\d{1,6}\.%?\d{1,6}$/;
//@ chunk-aepeg2w5.js:851136-851362 placement
/**
 * 读当前 tmux 窗格标识
 */
async function getTmuxPaneId() {
  let TMUX_PANE = env.TMUX_PANE;
  if (!env.TMUX || !TMUX_PANE) return;
  let { code, stdout } = await execFileNoThrow(
    "tmux",
    ["display-message", "-p", "-t", TMUX_PANE, "#{session_name}:#{window_id}.#{pane_id}"],
    {
      useCwd: false,
      timeout: 1000,
    },
  );
  return code === 0 ? stdout.trim() : undefined;
}
//@ chunk-aepeg2w5.js:851362-851418 placement
/**
 * 按会话根缓存的 tmux 查询结果。
 */
var TMUX_QUERY_TIMEOUT_MS; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var tmuxQueryCacheByRoot;
var ANSI_ESCAPE_RE;
deferInit("chunk-aepeg2w5.js:851362", () => {
  TMUX_QUERY_TIMEOUT_MS = 1000;
  tmuxQueryCacheByRoot = new SessionRootSlot(() => new Map());
  ANSI_ESCAPE_RE = /\x1b\[[0-9;]*m/g;
});
//@ chunk-6cc2zqkz.js:5352-5496 fingerprint = countConcurrentSessions (0.372)
async function countConcurrentSessions_2() {
  return {
    pid: process.pid,
    pidSpace: ownPidSpace(),
    claimedAt: Date.now(),
    procStart:
      getPlatform() === "linux" || getPlatform() === "wsl"
        ? await getProcessStartTimeAsync(process.pid)
        : undefined,
  };
}
export {
  isBgSession,
  isUnattendedInteractiveSession,
  recordSpawnedAgentIsolation,
  recordCleanlyRemovedAgent,
  envSessionKind,
  getRegisteredSessionName,
  isRegistrySweepPermitted,
  wasAgentCleanlyRemoved,
  wasAgentSpawnedIsolated,
  getBgJobDir,
  isActingAsBgJob,
  isDaemonBgWorker,
  clearResumeHintWorktree,
  clearSessionParked,
  markSessionParked,
  getBgTakeover,
  isUnattendedBgSession,
  ARTIFACT_YIELD_PEER_FEATURE,
  adoptSuppliedSessionTitle,
  updateSessionName,
  updateSessionActivity,
  getSessionRegistryState,
  registerSession,
  countConcurrentSessions,
  ANSI_ESCAPE_RE,
  FORMER_NAME_HINT_TTL_MS,
  updateSessionBridgeId,
  MAX_FORMER_NAMES,
  ownDesktopHostSessionId,
  getSessionsDir,
  reapKeysOfReapedRecord,
  mayReapRecordFromThisDomain,
  countConcurrentSessions_2,
  NOTIFY_IDLE_PEER_FEATURE,
  whenSessionRegistered,
  touchFleetViewHeartbeat,
  clearFleetViewHeartbeat,
  PEER_PROTOCOL,
  TMUX_LOCATION_RE,
  markIsolationUnavailableForCwd,
  TMUX_QUERY_TIMEOUT_MS,
  tmuxQueryCacheByRoot,
  hasBeenInWorktree,
  getResumeHintWorktreeName,
  isIsolationUnavailableForCwd,
  updateSessionConvertedSkillsAsk,
  isBeingWatched,
  isBeingWatchedV5,
  getHeldSessionNames,
  updateSessionMessagingSocketPath,
};
