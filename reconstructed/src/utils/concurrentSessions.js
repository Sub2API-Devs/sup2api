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
import { writeFile, unlink, mkdir, chmod, readFile, lstat, readdir } from "fs/promises";
import { join, basename, sep } from "path";
import { statSync, unlinkSync } from "fs";
import { homedir } from "os";
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
import { isEnvTruthy, getClaudeConfigDir } from "./envUtils.js";
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
  jobStorageSpace,
  sanitizeVersion,
} from "../services/analytics/metadata.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { ownPidDomain, ownPidSpace } from "./pidSpace.js";
import { isTopHostSession, isClaudecodeSession } from "./sessionShape.js";
import { getAgentId, isNestedInteractiveClaudeSession } from "./teammate.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { MAX_SESSION_RECORD_BYTES } from "./sessionRecords.js";
import { authenticatePeer, AUTH_MESSAGE_TYPE, MAX_PEER_NOTICE_LENGTH } from "./sessionPeers.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { readSmallFileOrNull } from "./readSmallFile.js";
import { sleep } from "./sleep.js";
import { isIdeOrSdkEntrypoint } from "./entrypointKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { sanitizeMarkName } from "./startupMarks.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";

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
function recordSpawnedAgentIsolation(e) {
  getWorktreeSessionState().agentIsolationEvidence.recordSpawned(e);
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
function isIsolationUnavailableForCwd(e) {
  return getWorktreeSessionState().isolationUnavailableCwd === e;
}
//@ chunk-aepeg2w5.js:836513-836562 placement
/**
 * 标记某 cwd 无法做 agent 隔离。
 */
function markIsolationUnavailableForCwd(e) {
  getWorktreeSessionState().markIsolationUnavailable(e);
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
var sessionRecordSchema = DoctorLazy(() =>
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
  setRegisteredName(e, n, r) {
    let registeredName = this.registeredName;
    let now = Date.now();
    let y = slugifySessionName(e);
    let sessionId = getSessionId();
    let w = r ?? registeredName?.givenAtLaunch;
    if (registeredName && slugifySessionName(registeredName.name) === y) {
      this.registeredName = {
        name: e,
        source: n,
        since: registeredName.since,
        sessionId,
        ...(w && {
          givenAtLaunch: w,
        }),
      };
      if (registeredName.name !== e || registeredName.source !== n) this.registeredNameChanged.emit();
      return;
    }
    if (registeredName) this.heldNames.set(slugifySessionName(registeredName.name), registeredName.source);
    this.heldNames.delete(y);
    this.formerNames = this.formerNames.filter((formerName) => slugifySessionName(formerName.name) !== y);
    if (
      registeredName &&
      (registeredName.source !== "derived" || isStableAddressEnabled()) &&
      now - registeredName.since >= SESSION_NAME_FRESH_MS
    ) {
      let R = slugifySessionName(registeredName.name);
      this.formerNames = [
        {
          name: registeredName.name,
          until: now,
          sessionId: registeredName.sessionId,
        },
        ...this.formerNames.filter((formerName) => slugifySessionName(formerName.name) !== R),
      ].slice(0, MAX_FORMER_NAMES);
    }
    this.registeredName = {
      name: e,
      source: n,
      since: now,
      sessionId,
      ...(r && {
        givenAtLaunch: r,
      }),
    };
    if (n !== "derived" && this.liveSessionId !== undefined)
      this.conversationNames.delete(this.liveSessionId);
    this.registeredNameChanged.emit();
  }
  setAsideRegisteredName(e, n) {
    let registeredName = this.registeredName;
    if (registeredName === undefined) return;
    this.heldNames.set(slugifySessionName(registeredName.name), registeredName.source);
    this.conversationNames.delete(e);
    this.conversationNames.set(e, {
      name: registeredName.name,
      source: registeredName.source,
    });
    if (this.conversationNames.size > MAX_SESSION_CONVERSATION_NAMES) {
      for (let key of this.conversationNames.keys())
        if (key !== n) {
          this.conversationNames.delete(key);
          break;
        }
    }
    this.registeredName = undefined;
  }
  setUncleanExitsScanned(uncleanExitsScanned) {
    this.uncleanExitsScanned = uncleanExitsScanned;
  }
  markUncleanExitReported(e) {
    this.reportedUncleanExitPaths.add(e);
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
var sessionRegistryByHost = new HostScoped(() => new SessionRegistryState());
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
async function touchFleetViewHeartbeat(e) {
  if (e) {
    try {
      let n = await e.write(getHeartbeatKey(), String(Date.now()), {
        publishDiscipline: "inPlace",
      });
      if (!n.ok && !isAbsentParentError(n.error))
        logForDebugging(`[concurrentSessions] heartbeat touch failed: ${formatStorageError(n.error)}`);
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
async function clearFleetViewHeartbeat(e) {
  if (e) {
    try {
      await e.delete(getHeartbeatKey());
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
function getWatchedCacheIfFresh(sessionRegistryState, n) {
  let { watchedCache } = sessionRegistryState;
  return watchedCache && n - watchedCache.at < WATCHED_CACHE_TTL_MS ? watchedCache.value : undefined;
}
//@ chunk-aepeg2w5.js:840553-840797 placement
function isBeingWatched() {
  let sessionRegistryState = getSessionRegistryState();
  let now = Date.now();
  let watchedCacheIfFresh = getWatchedCacheIfFresh(sessionRegistryState, now);
  if (watchedCacheIfFresh !== undefined) return watchedCacheIfFresh;
  let s = false;
  try {
    let { mtimeMs } = statSync(join(getSessionsDir(), FLEETVIEW_HEARTBEAT_FILE));
    s = now - mtimeMs < FLEETVIEW_HEARTBEAT_STALE_MS;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`);
  }
  sessionRegistryState.setWatchedCache({
    at: now,
    value: s,
  });
  return s;
}
//@ chunk-aepeg2w5.js:840797-841217 placement
async function isBeingWatchedV5(e) {
  let sessionRegistryState = getSessionRegistryState();
  let now = Date.now();
  let watchedCacheIfFresh = getWatchedCacheIfFresh(sessionRegistryState, now);
  if (watchedCacheIfFresh !== undefined) return watchedCacheIfFresh;
  let h;
  try {
    let R = await e.statMeta(getHeartbeatKey());
    if (R.ok) h = R.value.mtimeMs;
    else if (R.error.code !== "NotFound")
      logForDebugging(`[concurrentSessions] heartbeat stat failed: ${formatStorageError(R.error)}`);
  } catch (error) {
    logForDebugging(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`);
  }
  let now_2 = Date.now();
  let S = h !== undefined && now_2 - h < FLEETVIEW_HEARTBEAT_STALE_MS;
  let watchedCache = sessionRegistryState.watchedCache;
  if (!watchedCache || watchedCache.at < now)
    sessionRegistryState.setWatchedCache({
      at: now_2,
      value: S,
    });
  return S;
}
//@ chunk-aepeg2w5.js:841217-841280 placement
function registerSession(e) {
  let sessionRegistryState = getSessionRegistryState();
  let r = registerSession_2(sessionRegistryState, e);
  sessionRegistryState.registration = r;
  return r;
}
//@ chunk-aepeg2w5.js:841280-843999 fingerprint = registerSession (0.359)
async function registerSession_2(sessionRegistryState, storageV5) {
  if (!shouldRegisterPidFile()) return false;
  let deferred = Promise.withResolvers();
  sessionRegistryState.setPidFileWriteChain(deferred.promise);
  let s = envSessionKind() ?? "interactive";
  sessionRegistryState.bornSpare = s === "bg" && env.CLAUDE_BG_SOURCE === "spare";
  let h = sessionRegistryState.bornSpare && !(await jobStateExists(storageV5));
  let y = env.CLAUDE_CODE_SESSION_NAME
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
    let x = y
      ? {
          name: y,
          source: "user",
        }
      : s === "interactive"
        ? {
            name: sessionSlug(getOriginalCwd(), getSessionId()),
            source: "derived",
          }
        : undefined;
    let P = jsonStringify({
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
      kind: s,
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
        name: x?.name,
        nameSource: x?.source === "derived" ? "derived" : undefined,
        nameSince: Date.now(),
        logPath: env.CLAUDE_CODE_SESSION_LOG,
        agent: env.CLAUDE_CODE_AGENT,
        jobId: s === "bg" && env.CLAUDE_JOB_DIR ? basename(env.CLAUDE_JOB_DIR) : undefined,
        spare: h ? true : undefined,
      },
    });
    if (storageV5) {
      let F = await storageV5.write(getPidFileKey(), P, {
        publishDiscipline: "inPlace",
      });
      if (!F.ok) {
        logForDebugging(`[concurrentSessions] v5 pid-file write failed: ${formatStorageError(F.error)}`);
        throw Error("v5 pid-file write failed");
      }
    } else await writeFile(pidFile, P);
    sessionRegistryState.registered = true;
    if (h) startSpareClaimPoll(storageV5);
    if (x && sessionRegistryState.registeredName === undefined)
      sessionRegistryState.setRegisteredName(x.name, x.source, x.source === "derived" ? undefined : true);
    sessionRegistryState.liveSessionId = getSessionId();
    onSessionSwitch((F, L) => {
      let sessionRegistryState = getSessionRegistryState();
      let { registeredName, liveSessionId } = sessionRegistryState;
      sessionRegistryState.liveSessionId = F;
      if (isStableAddressEnabled() && keepsSessionId(L)) {
        sessionRegistryState.adoptions++;
        let q = sessionRegistryState.conversationNames.get(F);
        let Q =
          registeredName !== undefined &&
          registeredName.source !== "derived" &&
          !registeredName.givenAtLaunch &&
          registeredName.sessionId !== F;
        if (Q && liveSessionId !== undefined) sessionRegistryState.setAsideRegisteredName(liveSessionId, F);
        if (registeredName?.source === "derived" || Q) {
          updateSessionName(sessionSlug(getOriginalCwd(), F), storageV5, "derived");
          if (q !== undefined) sessionRegistryState.restoreSetAsideName?.(q.name, q.source);
        } else if (registeredName !== undefined)
          sessionRegistryState.registeredName = {
            ...registeredName,
            sessionId: F,
          };
      }
      updatePidFile(
        {
          sessionId: F,
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
async function updatePidFile(e, n) {
  let pidFile = join(getSessionsDir(), `${process.pid}.json`);
  let sessionRegistryState = getSessionRegistryState();
  let h = sessionRegistryState.pidFileWriteChain.then(async () => {
    try {
      if (n) {
        let S = await n.read([getPidFileKey()]);
        if (!S.ok) {
          logForDebugging(`[concurrentSessions] updatePidFile failed: ${formatStorageError(S.error)}`);
          return false;
        }
        let w = S.value.items[0];
        if (!w?.found) {
          logForDebugging("[concurrentSessions] updatePidFile failed: pid file not found");
          return false;
        }
        let data = jsonParse(Buffer.from(w.value).toString("utf8"));
        let x = await n.write(
          getPidFileKey(),
          jsonStringify({
            ...data,
            ...e,
          }),
          {
            publishDiscipline: "inPlace",
          },
        );
        if (!x.ok) {
          logForDebugging(`[concurrentSessions] updatePidFile failed: ${formatStorageError(x.error)}`);
          return false;
        }
        return true;
      }
      let y = jsonParse(await readFile(pidFile, "utf8"));
      await writeFile(
        pidFile,
        jsonStringify({
          ...y,
          ...e,
        }),
      );
      return true;
    } catch (error) {
      logForDebugging(`[concurrentSessions] updatePidFile failed: ${errorMessage(error)}`);
      return false;
    }
  });
  sessionRegistryState.setPidFileWriteChain(
    h.then(() => {
      return;
    }),
  );
  return h;
}
//@ chunk-aepeg2w5.js:844740-845205 placement
async function updateSessionName(e, n, r = "user", s) {
  if (!e) return false;
  let sessionRegistryState = getSessionRegistryState();
  sessionRegistryState.setRegisteredName(e, r, s);
  let S =
    (await updatePidFile(
      {
        name: e,
        nameSource: r,
        formerNames:
          sessionRegistryState.formerNames.length > 0 ? sessionRegistryState.formerNames : undefined,
        nameSince: sessionRegistryState.registeredName?.since ?? Date.now(),
        updatedAt: Date.now(),
      },
      n,
    )) || !shouldRegisterPidFile();
  if (!S)
    logForDebugging(
      `[session-name] "${e}" applied locally but the session registry record was not updated \u2014 other sessions may keep showing the old name (see "updatePidFile failed" above)`,
      {
        level: "warn",
      },
    );
  return S;
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
async function adoptSuppliedSessionTitle(e, storageV5) {
  let r = sanitizeSessionTitle(e);
  await whenSessionRegistered();
  let sessionRegistryState = getSessionRegistryState();
  let registeredName = sessionRegistryState.registeredName;
  if (
    !r ||
    registeredName === undefined ||
    !(
      registeredName.source === "derived" ||
      (registeredName.source === "auto" && slugifySessionName(registeredName.name) !== slugifySessionName(r))
    )
  )
    return false;
  let y = await updateSessionName(r, storageV5, "auto");
  let registeredName_2 = sessionRegistryState.registeredName;
  if (!y && registeredName_2?.name === r && registeredName_2.source === "auto") {
    let w = slugifySessionName(registeredName.name);
    sessionRegistryState.registeredName = registeredName;
    sessionRegistryState.heldNames.delete(w);
    sessionRegistryState.formerNames = sessionRegistryState.formerNames.filter(
      (formerName) => slugifySessionName(formerName.name) !== w,
    );
    sessionRegistryState.registeredNameChanged.emit();
  }
  return y;
}
//@ chunk-aepeg2w5.js:845737-845818 placement
async function updateSessionMessagingSocketPath(messagingSocketPath, n) {
  await updatePidFile(
    {
      messagingSocketPath,
      updatedAt: Date.now(),
    },
    n,
  );
}
//@ chunk-aepeg2w5.js:845818-845874 placement = updateSessionBridgeId (1)
async function updateSessionBridgeId(bridgeSessionId, n) {
  await updatePidFile(
    {
      bridgeSessionId,
    },
    n,
  );
}
//@ chunk-aepeg2w5.js:845874-845947 placement
async function markSessionParked(parkedJobId, n) {
  await updatePidFile(
    {
      parkedJobId,
      updatedAt: Date.now(),
    },
    n,
  );
}
//@ chunk-aepeg2w5.js:845947-846023 placement
async function clearSessionParked(e) {
  await updatePidFile(
    {
      parkedJobId: undefined,
      updatedAt: Date.now(),
    },
    e,
  );
}
//@ chunk-aepeg2w5.js:846023-846212 placement
function updateSessionConvertedSkillsAsk(e, n) {
  let sessionRegistryState = getSessionRegistryState();
  sessionRegistryState.asksForConvertedSkills = e;
  if (sessionRegistryState.asksForConvertedSkillsOnRecord === e) return;
  updatePidFile(
    {
      asksForConvertedSkills: e,
    },
    n,
  ).then((s) => {
    if (s) sessionRegistryState.asksForConvertedSkillsOnRecord = e;
  });
}
//@ chunk-aepeg2w5.js:846212-846419 placement
/**
 * 更新本会话 pid 文件（status、updatedAt 等）。
 */
async function updateSessionActivity(e, storageV5) {
  let now = Date.now();
  let sessionRegistryState = getSessionRegistryState();
  let h = sessionRegistryState.bornSpare && e.status === "busy";
  let y = await updatePidFile(
    {
      ...e,
      updatedAt: now,
      ...(e.status !== undefined && {
        statusUpdatedAt: now,
      }),
      ...(h && {
        spare: undefined,
      }),
    },
    storageV5,
  );
  if (h && y) stopSpareClaimPoll(sessionRegistryState);
  return y || !shouldRegisterPidFile();
}
//@ chunk-aepeg2w5.js:846419-846519 placement
function stopSpareClaimPoll(e) {
  if (e.spareClaimPoll !== undefined) {
    clearInterval(e.spareClaimPoll);
    e.spareClaimPoll = undefined;
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
async function jobStateExists(e) {
  let bgJobDir = getBgJobDir();
  if (!bgJobDir) return false;
  if (isStorageV5Enabled() && e !== undefined) {
    let r = jobStorageSpace(bgJobDir, ["state.json"]);
    if (r !== undefined)
      try {
        let s = await e.statMeta(r);
        return s.ok || (s.error.code !== "NotFound" && s.error.code !== "Unavailable");
      } catch {
        return false;
      }
  }
  try {
    await lstat(join(bgJobDir, "state.json"));
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
  let r = {
    registry: sessionRegistryState,
    storageV5,
    clearing: false,
  };
  sessionRegistryState.spareClaimPoll = setInterval(pollSpareClaim, SPARE_CLAIM_POLL_MS, r);
  sessionRegistryState.spareClaimPoll.unref();
}
//@ chunk-aepeg2w5.js:847046-847242 placement
function pollSpareClaim(e) {
  if (e.clearing || e.registry.spareClaimPoll === undefined) return;
  e.clearing = true;
  jobStateExists(e.storageV5)
    .then((n) => (n ? clearSpareClaim(e.storageV5) : false))
    .then((n) => {
      if (n) stopSpareClaimPoll(e.registry);
    })
    .finally(() => {
      e.clearing = false;
    });
}
//@ chunk-aepeg2w5.js:847242-847497 placement
async function readSessionRecord(e, n) {
  try {
    let r = await e.read([
      {
        key: STORAGE_SPACES.session(n),
        offset: 0,
        length: MAX_SESSION_RECORD_BYTES + 1,
      },
    ]);
    let s = r.ok ? r.value.items[0] : undefined;
    if (!s?.found || s.value.byteLength > MAX_SESSION_RECORD_BYTES) return null;
    return sessionRecordSchema().safeParse(jsonParse(Buffer.from(s.value).toString("utf8")));
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:847497-847605 placement
async function deleteSessionRecord(e, n) {
  try {
    let r = await e.delete(STORAGE_SPACES.session(n));
    return r.ok && r.value.existed;
  } catch {
    return false;
  }
}
//@ chunk-aepeg2w5.js:847605-847745 placement
async function authenticateSessionPeer(e) {
  return authenticatePeer(e, {
    partialOnCap: true,
    onIssue: (n, r) =>
      logForDebugging(
        `[concurrentSessions] session list ${n}`,
        r === undefined
          ? undefined
          : {
              level: r,
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
async function reapKeysOfReapedRecord(e, n, r, s) {
  if (isStorageV5Enabled() && s !== undefined) {
    let y = await authenticateSessionPeer(s);
    if (y === undefined) return;
    await removeStaleSessionFiles(y, e, n, r, (S) =>
      s.delete(STORAGE_SPACES.session(S)).then(
        () => {},
        () => {},
      ),
    );
    return;
  }
  let h;
  try {
    h = await readdir(e);
  } catch {
    return;
  }
  await removeStaleSessionFiles(h, e, n, r, (y) => unlink(join(e, y)).catch(() => {}));
}
//@ chunk-aepeg2w5.js:848115-848335 placement
async function removeStaleSessionFiles(e, n, r, s, h) {
  let y = `${r}.`;
  await Promise.all(
    e.map(async (S) => {
      if (!S.startsWith(y) || !AUTH_MESSAGE_TYPE.test(S)) return;
      let recordPidDomain = await readRecordPidDomain(join(n, S));
      if (recordPidDomain !== undefined && recordPidDomain !== s) return;
      if (r === process.pid || !isProcessProvablyGone(r)) return;
      await h(S);
    }),
  );
}
//@ chunk-aepeg2w5.js:848335-848656 placement
function mayReapRecordFromThisDomain(e, n, r = []) {
  let platform = getPlatform();
  let h = !getIsInteractive();
  if (e === null) {
    if (r.some((y) => y !== undefined && y !== n)) return false;
    return platform !== "windows" && !(platform === "macos" && h);
  }
  if (e.pidDomain !== undefined) return e.pidDomain === n;
  switch (platform) {
    case "windows":
      return !isPosixPathOnWindows(e.cwd);
    case "macos":
      return !h || e.cwd === undefined || e.cwd.startsWith(homedir() + sep) || e.cwd === homedir();
    default:
      return true;
  }
}
//@ chunk-aepeg2w5.js:848656-851082 placement
async function countConcurrentSessions(e) {
  let sessionsDir = getSessionsDir();
  let r;
  if (e) {
    let P = await authenticateSessionPeer(e);
    if (P === undefined) return 0;
    r = P;
  } else
    try {
      r = await readdir(sessionsDir);
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`[concurrentSessions] readdir failed: ${errorMessage(error)}`);
      return 0;
    }
  let sessionRegistryState = getSessionRegistryState();
  let h = await sessionRegistryState.isRegistrySweepPermitted();
  let y = h ? await ownPidDomain() : "";
  logForDebugging(
    `[sessionRegistry] sweep ${h ? `permitted (domain ${y})` : "declined by isRegistrySweepPermitted() \u2014 dead records are left in place (neither counted nor deleted)"}`,
  );
  let S = 0;
  let w = new Set();
  let R = new Set();
  let x = new Map();
  for (let P of r) {
    let match = AUTH_MESSAGE_TYPE.exec(P);
    if (match) {
      let L = parseInt(match[1], 10);
      x.set(L, [...(x.get(L) ?? []), P]);
    }
  }
  for (let P of r) {
    if (!/^\d+\.json$/.test(P)) continue;
    let F = parseInt(P.slice(0, -5), 10);
    if (F === process.pid) {
      S++;
      continue;
    }
    if (isProcessRunning(F)) {
      S++;
      continue;
    }
    if (!isProcessProvablyGone(F)) continue;
    if (!h) continue;
    let L = join(sessionsDir, P);
    let G = e
      ? await readSessionRecord(e, P)
      : await readSmallFileOrNull(L, MAX_SESSION_RECORD_BYTES)
          .then((smallFileOrNull) =>
            smallFileOrNull === null ? null : sessionRecordSchema().safeParse(jsonParse(smallFileOrNull)),
          )
          .catch(() => null);
    let j = G?.success ? G.data : null;
    if (j === null) {
      await sleep(MAX_PEER_NOTICE_LENGTH);
      let Q = e
        ? await readSessionRecord(e, P)
        : await readSmallFileOrNull(L, MAX_SESSION_RECORD_BYTES)
            .then((smallFileOrNull) =>
              smallFileOrNull === null ? null : sessionRecordSchema().safeParse(jsonParse(smallFileOrNull)),
            )
            .catch(() => null);
      j = Q?.success ? Q.data : null;
    }
    let ee =
      j === null
        ? await Promise.all((x.get(F) ?? []).map((Q) => readRecordPidDomain(join(sessionsDir, Q))))
        : [];
    if (!mayReapRecordFromThisDomain(j, y, ee)) {
      w.add(F);
      continue;
    }
    if (!isProcessProvablyGone(F)) {
      w.add(F);
      continue;
    }
    R.add(F);
    if (
      (e
        ? await deleteSessionRecord(e, P)
        : await unlink(L).then(
            () => true,
            () => false,
          )) &&
      !sessionRegistryState.uncleanExitsScanned &&
      j !== null &&
      j.kind === "interactive" &&
      !isIdeOrSdkEntrypoint(j.entrypoint) &&
      !sessionRegistryState.reportedUncleanExitPaths.has(L)
    ) {
      logForDebugging(`Prior session exited uncleanly: ${j.sessionId} (v${j.version ?? "?"})`);
      logEvent("tengu_unclean_exit", {
        session_age_sec: Math.round((Date.now() - j.startedAt) / 1000),
        prior_version: sanitizeVersion(j.version),
        on_current_version:
          j.version ===
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
        prior_session_id: sanitizeMarkName(j.sessionId),
      });
      sessionRegistryState.markUncleanExitReported(L);
    }
  }
  if (h)
    for (let P of r) {
      let match = AUTH_MESSAGE_TYPE.exec(P);
      if (!match) continue;
      let L = parseInt(match[1], 10);
      if (L === process.pid || w.has(L) || !isProcessProvablyGone(L)) continue;
      let recordPidDomain = await readRecordPidDomain(join(sessionsDir, P));
      if (!(recordPidDomain !== undefined ? recordPidDomain === y : R.has(L) || getPlatform() === "linux"))
        continue;
      if (!isProcessProvablyGone(L)) continue;
      if (e) deleteSessionRecord(e, P).catch(() => {});
      else unlink(join(sessionsDir, P)).catch(() => {});
    }
  if (h) sessionRegistryState.setUncleanExitsScanned(true);
  return S;
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
var TMUX_QUERY_TIMEOUT_MS = 1000;
var tmuxQueryCacheByRoot = new SessionRootSlot(() => new Map());
var ANSI_ESCAPE_RE = /\x1b\[[0-9;]*m/g;
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
//@ chunk-e7z1g8a9.js:4175-4216 fingerprint = getSessionsDir (1)
function getSessionsDir() {
  return join(getClaudeConfigDir(), "sessions");
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
};
