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
import {
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  unlink,
  unlink as unlink_2,
  unlink as unlink_3,
  unlink as unlink_4,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  chmod,
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  readdir,
  readdir as readdir_2,
} from "fs/promises";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  sep,
  sep as sep_2,
} from "path";
import { statSync, statSync as statSync_2, unlinkSync } from "fs";
import { homedir, homedir as homedir_2, homedir as homedir_3, homedir as homedir_4 } from "os";
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
import { wft, formatStorageError } from "./storage/storageErrors.js";
import { logForDebugging } from "./debug.js";
import { errorMessage, isENOENT, isFsInaccessible } from "./errors.js";
import { sanitizeSessionTitle } from "./stringUtils.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { sessionSlug, keepsSessionId, Igr, Oro, sanitizeVersion } from "../services/analytics/metadata.js";
import { jsonStringify, jsonParse } from "./slowOperations.js";
import { ownPidDomain, ownPidSpace } from "./pidSpace.js";
import { isTopHostSession, isClaudecodeSession } from "./sessionShape.js";
import { getAgentId, isNestedInteractiveClaudeSession } from "./teammate.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { MAX_SESSION_RECORD_BYTES } from "./sessionRecords.js";
import { authenticatePeer, Ihr, Mhr } from "./sessionPeers.js";
import { isProcessRunning } from "./genericProcessUtils.js";
import { readSmallFileOrNull } from "./readSmallFile.js";
import { sleep } from "./sleep.js";
import { isIdeOrSdkEntrypoint } from "./entrypointKinds.js";
import { logEvent } from "../services/analytics/index.js";
import { ye } from "./startupMarks.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";

//@ chunk-aepeg2w5.js:836002-836057 placement
function rTi() {
  return getWorktreeSessionState().getResumeHintWorktreeName();
}
/**
 * 清除恢复提示中的 worktree 名。
 */
//@ chunk-aepeg2w5.js:836057-836107 placement
function clearResumeHintWorktree() {
  getWorktreeSessionState().clearResumeHintWorktreeName();
}
//@ chunk-aepeg2w5.js:836107-836152 placement
function oTi() {
  return getWorktreeSessionState().hasBeenInWorktree;
}
/**
 * 后台接管状态。
 */
//@ chunk-aepeg2w5.js:836152-836189 placement
function getBgTakeover() {
  return getWorktreeSessionState().bgTakeover;
}
//@ chunk-aepeg2w5.js:836189-836250 placement
function Ogr(e) {
  getWorktreeSessionState().agentIsolationEvidence.recordSpawned(e);
}
//@ chunk-aepeg2w5.js:836250-836316 placement
function das(e) {
  return getWorktreeSessionState().agentIsolationEvidence.spawned.has(e);
}
//@ chunk-aepeg2w5.js:836316-836384 placement
function sTi(e) {
  getWorktreeSessionState().agentIsolationEvidence.recordCleanlyRemoved(e);
}
//@ chunk-aepeg2w5.js:836384-836457 placement
function iTi(e) {
  return getWorktreeSessionState().agentIsolationEvidence.cleanlyRemoved.has(e);
}
//@ chunk-aepeg2w5.js:836457-836513 placement
function aTi(e) {
  return getWorktreeSessionState().isolationUnavailableCwd === e;
}
//@ chunk-aepeg2w5.js:836513-836562 placement
function lTi(e) {
  getWorktreeSessionState().markIsolationUnavailable(e);
}
//@ chunk-aepeg2w5.js:836562-836640 placement
var FORMER_NAME_HINT_TTL_MS = 600000,
  MAX_FORMER_NAMES = 3,
  CY = 8,
  RY = 1e4,
  PEER_PROTOCOL = 1,
  NOTIFY_IDLE_PEER_FEATURE = "notify_idle",
  ARTIFACT_YIELD_PEER_FEATURE = "artifact_yield";
//@ chunk-aepeg2w5.js:836640-836745 placement
function supportsPeerPid() {
  if (getPlatform() === "windows") return !1;
  return typeof Bun < "u" && typeof Bun.ant?.getPeerPid === "function";
}
//@ chunk-aepeg2w5.js:836745-836792 placement
function PY() {
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
/**
 * 会话注册状态（异常退出扫描、pid 文件写链、注册名、旧名）。
 */
//@ chunk-aepeg2w5.js:837003-839326 placement
class SessionRegistryState {
  uncleanExitsScanned = !1;
  reportedUncleanExitPaths = new Set();
  watchedCache = void 0;
  pidFileWriteChain = Promise.resolve();
  asksForConvertedSkills = null;
  asksForConvertedSkillsOnRecord = null;
  registeredName = void 0;
  formerNames = [];
  conversationNames = new Map();
  adoptions = 0;
  restores = 0;
  liveSessionId = void 0;
  restoreSetAsideName = void 0;
  heldNames = new Map();
  registered = !1;
  bornSpare = !1;
  spareClaimPoll = void 0;
  registration = void 0;
  registrySweepPermitted = void 0;
  registeredNameChanged = createSignal();
  setRegisteredName(e, n, r) {
    let registeredName = this.registeredName,
      now = Date.now(),
      y = slugifySessionName(e),
      S = getSessionId(),
      w = r ?? registeredName?.givenAtLaunch;
    if (registeredName && slugifySessionName(registeredName.name) === y) {
      if (
        ((this.registeredName = {
          name: e,
          source: n,
          since: registeredName.since,
          sessionId: S,
          ...(w && { givenAtLaunch: w }),
        }),
        registeredName.name !== e || registeredName.source !== n)
      )
        this.registeredNameChanged.emit();
      return;
    }
    if (registeredName) this.heldNames.set(slugifySessionName(registeredName.name), registeredName.source);
    if (
      (this.heldNames.delete(y),
      (this.formerNames = this.formerNames.filter((formerName) => slugifySessionName(formerName.name) !== y)),
      registeredName &&
        (registeredName.source !== "derived" || isStableAddressEnabled()) &&
        now - registeredName.since >= RY)
    ) {
      let R = slugifySessionName(registeredName.name);
      this.formerNames = [
        { name: registeredName.name, until: now, sessionId: registeredName.sessionId },
        ...this.formerNames.filter((formerName) => slugifySessionName(formerName.name) !== R),
      ].slice(0, MAX_FORMER_NAMES);
    }
    if (
      ((this.registeredName = {
        name: e,
        source: n,
        since: now,
        sessionId: S,
        ...(r && { givenAtLaunch: r }),
      }),
      n !== "derived" && this.liveSessionId !== void 0)
    )
      this.conversationNames.delete(this.liveSessionId);
    this.registeredNameChanged.emit();
  }
  setAsideRegisteredName(e, n) {
    let registeredName = this.registeredName;
    if (registeredName === void 0) return;
    if (
      (this.heldNames.set(slugifySessionName(registeredName.name), registeredName.source),
      this.conversationNames.delete(e),
      this.conversationNames.set(e, { name: registeredName.name, source: registeredName.source }),
      this.conversationNames.size > CY)
    ) {
      for (let s of this.conversationNames.keys())
        if (s !== n) {
          this.conversationNames.delete(s);
          break;
        }
    }
    this.registeredName = void 0;
  }
  setUncleanExitsScanned(e) {
    this.uncleanExitsScanned = e;
  }
  markUncleanExitReported(e) {
    this.reportedUncleanExitPaths.add(e);
  }
  setWatchedCache(e) {
    this.watchedCache = e;
  }
  setPidFileWriteChain(e) {
    this.pidFileWriteChain = e;
  }
  isRegistrySweepPermitted() {
    return (
      (this.registrySweepPermitted ??= this.probeRegistrySweepPermitted()),
      this.registrySweepPermitted
    );
  }
  async probeRegistrySweepPermitted() {
    let e = getPlatform();
    if (e === "wsl") return !1;
    if (!getIsInteractive() && e !== "windows" && e !== "macos") return !1;
    if (
      e === "windows" &&
      (env.CONTAINER_SANDBOX_MOUNT_POINT !== void 0 ||
        env.USERNAME === "ContainerAdministrator" ||
        env.USERNAME === "ContainerUser")
    )
      return !1;
    if (
      envDynamicProbe.getIsBubblewrapSandbox() ||
      isEnvTruthy(env.IS_SANDBOX) ||
      (await envDynamicProbe.getIsDocker())
    )
      return !1;
    return looksLikeFullHostProcessTable();
  }
}
//@ chunk-aepeg2w5.js:839326-839351 placement
var MY = new HostScoped(() => new SessionRegistryState());
//@ chunk-aepeg2w5.js:839351-839388 placement
function getSessionRegistryState() {
  return MY.of(getRootSession().host);
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
  let e = getSessionRegistryState();
  return e.registration ?? Promise.resolve(e.registered);
}
//@ chunk-aepeg2w5.js:839545-839655 placement = envSessionKind (1)
function envSessionKind() {
  let CLAUDE_CODE_SESSION_KIND = env.CLAUDE_CODE_SESSION_KIND;
  if (
    CLAUDE_CODE_SESSION_KIND === "bg" ||
    CLAUDE_CODE_SESSION_KIND === "daemon" ||
    CLAUDE_CODE_SESSION_KIND === "daemon-worker"
  )
    return CLAUDE_CODE_SESSION_KIND;
  return;
}
//@ chunk-aepeg2w5.js:839655-839688 placement
function isBgSession() {
  return envSessionKind() === "bg";
}
//@ chunk-aepeg2w5.js:839688-839735 placement
function isUnattendedInteractiveSession() {
  return isReplBridgeActive() || isBgSession() || getTeammateAgentId() !== void 0;
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
var FLEETVIEW_HEARTBEAT_FILE = ".fleetview-heartbeat",
  QO = 5000;
//@ chunk-aepeg2w5.js:839950-839986 placement
function getHeartbeatKey() {
  return STORAGE_SPACES.session(FLEETVIEW_HEARTBEAT_FILE);
}
/**
 * 并发会话 pid 文件的存储键 sessions/<pid>.json（<配置目录>/sessions/ 下记录每个运行中会话的状态）。
 */
//@ chunk-aepeg2w5.js:839986-840041 placement
function getPidFileKey() {
  return STORAGE_SPACES.session(`${process.pid}.json`);
}
//@ chunk-aepeg2w5.js:840041-840365 placement
async function touchFleetViewHeartbeat(e) {
  if (e) {
    try {
      let write = await e.write(getHeartbeatKey(), String(Date.now()), { publishDiscipline: "inPlace" });
      if (!write.ok && !wft(write.error))
        logForDebugging(`[concurrentSessions] heartbeat touch failed: ${formatStorageError(write.error)}`);
    } catch (error) {
      logForDebugging(`[concurrentSessions] heartbeat touch failed: ${errorMessage(error)}`);
    }
    return;
  }
  try {
    await writeFile_4(join_10(getSessionsDir(), FLEETVIEW_HEARTBEAT_FILE), String(Date.now()));
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
    await unlink_4(join_10(getSessionsDir(), FLEETVIEW_HEARTBEAT_FILE));
  } catch {}
}
//@ chunk-aepeg2w5.js:840467-840479 placement
var IY = 1000;
//@ chunk-aepeg2w5.js:840479-840553 placement
function getWatchedCacheIfFresh(e, n) {
  let { watchedCache: watchedCache } = e;
  return watchedCache && n - watchedCache.at < IY ? watchedCache.value : void 0;
}
//@ chunk-aepeg2w5.js:840553-840797 placement
function isBeingWatched() {
  let e = getSessionRegistryState(),
    now = Date.now(),
    r = getWatchedCacheIfFresh(e, now);
  if (r !== void 0) return r;
  let s = !1;
  try {
    let { mtimeMs: mtimeMs } = statSync_2(join_10(getSessionsDir(), FLEETVIEW_HEARTBEAT_FILE));
    s = now - mtimeMs < QO;
  } catch (error) {
    if (!isENOENT(error))
      logForDebugging(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`);
  }
  return (e.setWatchedCache({ at: now, value: s }), s);
}
//@ chunk-aepeg2w5.js:840797-841217 placement
async function isBeingWatchedV5(e) {
  let n = getSessionRegistryState(),
    now = Date.now(),
    s = getWatchedCacheIfFresh(n, now);
  if (s !== void 0) return s;
  let h;
  try {
    let statMeta = await e.statMeta(getHeartbeatKey());
    if (statMeta.ok) h = statMeta.value.mtimeMs;
    else if (statMeta.error.code !== "NotFound")
      logForDebugging(`[concurrentSessions] heartbeat stat failed: ${formatStorageError(statMeta.error)}`);
  } catch (error) {
    logForDebugging(`[concurrentSessions] heartbeat stat failed: ${errorMessage(error)}`);
  }
  let now_2 = Date.now(),
    S = h !== void 0 && now_2 - h < QO,
    watchedCache = n.watchedCache;
  if (!watchedCache || watchedCache.at < now) n.setWatchedCache({ at: now_2, value: S });
  return S;
}
//@ chunk-aepeg2w5.js:841217-841280 placement
function registerSession(e) {
  let n = getSessionRegistryState(),
    r = registerSession_2(n, e);
  return ((n.registration = r), r);
}
//@ chunk-aepeg2w5.js:841280-843999 fingerprint = registerSession (0.359)
async function registerSession_2(e, n) {
  if (!shouldRegisterPidFile()) return !1;
  let withResolvers = Promise.withResolvers();
  e.setPidFileWriteChain(withResolvers.promise);
  let s = envSessionKind() ?? "interactive";
  e.bornSpare = s === "bg" && env.CLAUDE_BG_SOURCE === "spare";
  let h = e.bornSpare && !(await jobStateExists(n)),
    y = env.CLAUDE_CODE_SESSION_NAME ? sanitizeSessionTitle(env.CLAUDE_CODE_SESSION_NAME) || void 0 : void 0,
    dir = getSessionsDir(),
    pidFile = join_10(dir, `${process.pid}.json`);
  (process.on("exit", () => {
    try {
      unlinkSync(pidFile);
    } catch {}
  }),
    registerCleanup(async () => {
      if (n) {
        try {
          await n.delete(getPidFileKey());
        } catch {}
        return;
      }
      try {
        await unlink_4(pidFile);
      } catch {}
    }));
  try {
    let R = await getTmuxPaneId();
    (await mkdir_4(dir, { recursive: !0, mode: 448 }), await chmod(dir, 448));
    let x = y
        ? { name: y, source: "user" }
        : s === "interactive"
          ? { name: sessionSlug(getOriginalCwd(), getSessionId()), source: "derived" }
          : void 0,
      P = jsonStringify({
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
        peerFeatures: PY(),
        kind: s,
        entrypoint: env.CLAUDE_CODE_ENTRYPOINT,
        hostSessionId: ownDesktopHostSessionId(),
        pidDomain: await ownPidDomain(),
        asksForConvertedSkills: e.asksForConvertedSkills,
        ...(R && { tmux: R }),
        ...{ messagingSocketPath: udsEnv.CLAUDE_CODE_MESSAGING_SOCKET },
        ...{
          name: x?.name,
          nameSource: x?.source === "derived" ? "derived" : void 0,
          nameSince: Date.now(),
          logPath: env.CLAUDE_CODE_SESSION_LOG,
          agent: env.CLAUDE_CODE_AGENT,
          jobId: s === "bg" && env.CLAUDE_JOB_DIR ? basename_2(env.CLAUDE_JOB_DIR) : void 0,
          spare: h ? !0 : void 0,
        },
      });
    if (n) {
      let write = await n.write(getPidFileKey(), P, { publishDiscipline: "inPlace" });
      if (!write.ok)
        throw (
          logForDebugging(
            `[concurrentSessions] v5 pid-file write failed: ${formatStorageError(write.error)}`,
          ),
          Error("v5 pid-file write failed")
        );
    } else await writeFile_4(pidFile, P);
    if (((e.registered = !0), h)) startSpareClaimPoll(n);
    if (x && e.registeredName === void 0)
      e.setRegisteredName(x.name, x.source, x.source === "derived" ? void 0 : !0);
    return (
      (e.liveSessionId = getSessionId()),
      onSessionSwitch((F, L) => {
        let G = getSessionRegistryState(),
          { registeredName: registeredName, liveSessionId: liveSessionId } = G;
        if (((G.liveSessionId = F), isStableAddressEnabled() && keepsSessionId(L))) {
          G.adoptions++;
          let q = G.conversationNames.get(F),
            Q =
              registeredName !== void 0 &&
              registeredName.source !== "derived" &&
              !registeredName.givenAtLaunch &&
              registeredName.sessionId !== F;
          if (Q && liveSessionId !== void 0) G.setAsideRegisteredName(liveSessionId, F);
          if (registeredName?.source === "derived" || Q) {
            if ((updateSessionName(sessionSlug(getOriginalCwd(), F), n, "derived"), q !== void 0))
              G.restoreSetAsideName?.(q.name, q.source);
          } else if (registeredName !== void 0) G.registeredName = { ...registeredName, sessionId: F };
        }
        updatePidFile({ sessionId: F, parkedJobId: void 0, updatedAt: Date.now() }, n);
      }),
      onOriginalCwdChange((id) => {
        if (isStableAddressEnabled() && getSessionRegistryState().registeredName?.source === "derived")
          updateSessionName(sessionSlug(id, getSessionId()), n, "derived");
        updatePidFile({ cwd: id }, n);
      }),
      !0
    );
  } catch (error) {
    return (logForDebugging(`[concurrentSessions] register failed: ${errorMessage(error)}`), !1);
  } finally {
    withResolvers.resolve();
  }
}
//@ chunk-aepeg2w5.js:843999-844740 fingerprint = updatePidFile (0.503)
async function updatePidFile(e, n) {
  let pidFile = join_10(getSessionsDir(), `${process.pid}.json`),
    s = getSessionRegistryState(),
    h = s.pidFileWriteChain.then(async () => {
      try {
        if (n) {
          let read = await n.read([getPidFileKey()]);
          if (!read.ok)
            return (
              logForDebugging(`[concurrentSessions] updatePidFile failed: ${formatStorageError(read.error)}`),
              !1
            );
          let w = read.value.items[0];
          if (!w?.found)
            return (logForDebugging("[concurrentSessions] updatePidFile failed: pid file not found"), !1);
          let data = jsonParse(Buffer.from(w.value).toString("utf8")),
            write = await n.write(getPidFileKey(), jsonStringify({ ...data, ...e }), {
              publishDiscipline: "inPlace",
            });
          if (!write.ok)
            return (
              logForDebugging(
                `[concurrentSessions] updatePidFile failed: ${formatStorageError(write.error)}`,
              ),
              !1
            );
          return !0;
        }
        let y = jsonParse(await readFile_4(pidFile, "utf8"));
        return (await writeFile_4(pidFile, jsonStringify({ ...y, ...e })), !0);
      } catch (error) {
        return (logForDebugging(`[concurrentSessions] updatePidFile failed: ${errorMessage(error)}`), !1);
      }
    });
  return (
    s.setPidFileWriteChain(
      h.then(() => {
        return;
      }),
    ),
    h
  );
}
//@ chunk-aepeg2w5.js:844740-845205 placement
async function updateSessionName(e, n, r = "user", s) {
  if (!e) return !1;
  let h = getSessionRegistryState();
  h.setRegisteredName(e, r, s);
  let S =
    (await updatePidFile(
      {
        name: e,
        nameSource: r,
        formerNames: h.formerNames.length > 0 ? h.formerNames : void 0,
        nameSince: h.registeredName?.since ?? Date.now(),
        updatedAt: Date.now(),
      },
      n,
    )) || !shouldRegisterPidFile();
  if (!S)
    logForDebugging(
      `[session-name] "${e}" applied locally but the session registry record was not updated \u2014 other sessions may keep showing the old name (see "updatePidFile failed" above)`,
      { level: "warn" },
    );
  return S;
}
//@ chunk-aepeg2w5.js:845205-845284 placement
function ownDesktopHostSessionId() {
  if (!isTopHostSession() || isClaudecodeSession()) return;
  return Igr(env.CLAUDE_CODE_HOST_SESSION_ID);
}
//@ chunk-aepeg2w5.js:845284-845329 placement
function shouldRegisterPidFile() {
  return !isDiskless() && getAgentId() == null && !isNestedInteractiveClaudeSession();
}
//@ chunk-aepeg2w5.js:845329-845737 placement
async function adoptSuppliedSessionTitle(e, n) {
  let r = sanitizeSessionTitle(e);
  await whenSessionRegistered();
  let s = getSessionRegistryState(),
    registeredName = s.registeredName;
  if (
    !r ||
    registeredName === void 0 ||
    !(
      registeredName.source === "derived" ||
      (registeredName.source === "auto" && slugifySessionName(registeredName.name) !== slugifySessionName(r))
    )
  )
    return !1;
  let y = await updateSessionName(r, n, "auto"),
    registeredName_2 = s.registeredName;
  if (!y && registeredName_2?.name === r && registeredName_2.source === "auto") {
    let w = slugifySessionName(registeredName.name);
    ((s.registeredName = registeredName),
      s.heldNames.delete(w),
      (s.formerNames = s.formerNames.filter((formerName) => slugifySessionName(formerName.name) !== w)),
      s.registeredNameChanged.emit());
  }
  return y;
}
//@ chunk-aepeg2w5.js:845737-845818 placement
async function updateSessionMessagingSocketPath(e, n) {
  await updatePidFile({ messagingSocketPath: e, updatedAt: Date.now() }, n);
}
//@ chunk-aepeg2w5.js:845818-845874 placement = updateSessionBridgeId (1)
async function updateSessionBridgeId(e, n) {
  await updatePidFile({ bridgeSessionId: e }, n);
}
//@ chunk-aepeg2w5.js:845874-845947 placement
async function markSessionParked(e, n) {
  await updatePidFile({ parkedJobId: e, updatedAt: Date.now() }, n);
}
//@ chunk-aepeg2w5.js:845947-846023 placement
async function clearSessionParked(e) {
  await updatePidFile({ parkedJobId: void 0, updatedAt: Date.now() }, e);
}
//@ chunk-aepeg2w5.js:846023-846212 placement
function updateSessionConvertedSkillsAsk(e, n) {
  let r = getSessionRegistryState();
  if (((r.asksForConvertedSkills = e), r.asksForConvertedSkillsOnRecord === e)) return;
  updatePidFile({ asksForConvertedSkills: e }, n).then((s) => {
    if (s) r.asksForConvertedSkillsOnRecord = e;
  });
}
/**
 * 更新本会话 pid 文件（status、updatedAt 等）。
 */
//@ chunk-aepeg2w5.js:846212-846419 placement
async function updateSessionActivity(e, n) {
  let now = Date.now(),
    s = getSessionRegistryState(),
    h = s.bornSpare && e.status === "busy",
    y = await updatePidFile(
      {
        ...e,
        updatedAt: now,
        ...(e.status !== void 0 && { statusUpdatedAt: now }),
        ...(h && { spare: void 0 }),
      },
      n,
    );
  if (h && y) stopSpareClaimPoll(s);
  return y || !shouldRegisterPidFile();
}
//@ chunk-aepeg2w5.js:846419-846519 placement
function stopSpareClaimPoll(e) {
  if (e.spareClaimPoll !== void 0) (clearInterval(e.spareClaimPoll), (e.spareClaimPoll = void 0));
}
//@ chunk-aepeg2w5.js:846519-846617 placement
async function FY(e) {
  if (!getSessionRegistryState().bornSpare) return !0;
  return updatePidFile({ spare: void 0, updatedAt: Date.now() }, e);
}
//@ chunk-aepeg2w5.js:846617-846906 placement
async function jobStateExists(e) {
  let n = getBgJobDir();
  if (!n) return !1;
  if (isStorageV5Enabled() && e !== void 0) {
    let r = Oro(n, ["state.json"]);
    if (r !== void 0)
      try {
        let statMeta = await e.statMeta(r);
        return statMeta.ok || (statMeta.error.code !== "NotFound" && statMeta.error.code !== "Unavailable");
      } catch {
        return !1;
      }
  }
  try {
    return (await lstat_3(join_10(n, "state.json")), !0);
  } catch (error) {
    return !isENOENT(error);
  }
}
//@ chunk-aepeg2w5.js:846906-846918 placement
var LY = 1000;
//@ chunk-aepeg2w5.js:846918-847046 placement
function startSpareClaimPoll(e) {
  let n = getSessionRegistryState(),
    r = { registry: n, storageV5: e, clearing: !1 };
  ((n.spareClaimPoll = setInterval(pollSpareClaim, LY, r)), n.spareClaimPoll.unref());
}
//@ chunk-aepeg2w5.js:847046-847242 placement
function pollSpareClaim(e) {
  if (e.clearing || e.registry.spareClaimPoll === void 0) return;
  ((e.clearing = !0),
    jobStateExists(e.storageV5)
      .then((n) => (n ? FY(e.storageV5) : !1))
      .then((n) => {
        if (n) stopSpareClaimPoll(e.registry);
      })
      .finally(() => {
        e.clearing = !1;
      }));
}
//@ chunk-aepeg2w5.js:847242-847497 placement
async function readSessionRecord(e, n) {
  try {
    let read = await e.read([
        { key: STORAGE_SPACES.session(n), offset: 0, length: MAX_SESSION_RECORD_BYTES + 1 },
      ]),
      s = read.ok ? read.value.items[0] : void 0;
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
    return !1;
  }
}
//@ chunk-aepeg2w5.js:847605-847745 placement
async function authenticateSessionPeer(e) {
  return authenticatePeer(e, {
    partialOnCap: !0,
    onIssue: (n, r) =>
      logForDebugging(`[concurrentSessions] session list ${n}`, r === void 0 ? void 0 : { level: r }),
  });
}
//@ chunk-aepeg2w5.js:847745-847799 placement
function isRegistrySweepPermitted() {
  return getSessionRegistryState().isRegistrySweepPermitted();
}
//@ chunk-aepeg2w5.js:847799-847868 placement
function BY(e) {
  return getPlatform() === "windows" && e !== void 0 && e.startsWith("/");
}
//@ chunk-aepeg2w5.js:847868-848115 placement
async function reapKeysOfReapedRecord(e, n, r, s) {
  if (isStorageV5Enabled() && s !== void 0) {
    let y = await authenticateSessionPeer(s);
    if (y === void 0) return;
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
    h = await readdir_2(e);
  } catch {
    return;
  }
  await removeStaleSessionFiles(h, e, n, r, (y) => unlink_4(join_10(e, y)).catch(() => {}));
}
//@ chunk-aepeg2w5.js:848115-848335 placement
async function removeStaleSessionFiles(e, n, r, s, h) {
  let y = `${r}.`;
  await Promise.all(
    e.map(async (S) => {
      if (!S.startsWith(y) || !Ihr.test(S)) return;
      let w = await readRecordPidDomain(join_10(n, S));
      if (w !== void 0 && w !== s) return;
      if (r === process.pid || !isProcessProvablyGone(r)) return;
      await h(S);
    }),
  );
}
//@ chunk-aepeg2w5.js:848335-848656 placement
function mayReapRecordFromThisDomain(e, n, r = []) {
  let s = getPlatform(),
    h = !getIsInteractive();
  if (e === null) {
    if (r.some((y) => y !== void 0 && y !== n)) return !1;
    return s !== "windows" && !(s === "macos" && h);
  }
  if (e.pidDomain !== void 0) return e.pidDomain === n;
  switch (s) {
    case "windows":
      return !BY(e.cwd);
    case "macos":
      return !h || e.cwd === void 0 || e.cwd.startsWith(homedir_4() + sep_2) || e.cwd === homedir_4();
    default:
      return !0;
  }
}
//@ chunk-aepeg2w5.js:848656-851082 placement
async function countConcurrentSessions(e) {
  let n = getSessionsDir(),
    r;
  if (e) {
    let P = await authenticateSessionPeer(e);
    if (P === void 0) return 0;
    r = P;
  } else
    try {
      r = await readdir_2(n);
    } catch (error) {
      if (!isFsInaccessible(error))
        logForDebugging(`[concurrentSessions] readdir failed: ${errorMessage(error)}`);
      return 0;
    }
  let s = getSessionRegistryState(),
    isRegistrySweepPermitted = await s.isRegistrySweepPermitted(),
    y = isRegistrySweepPermitted ? await ownPidDomain() : "";
  logForDebugging(
    `[sessionRegistry] sweep ${isRegistrySweepPermitted ? `permitted (domain ${y})` : "declined by isRegistrySweepPermitted() \u2014 dead records are left in place (neither counted nor deleted)"}`,
  );
  let S = 0,
    w = new Set(),
    R = new Set(),
    x = new Map();
  for (let P of r) {
    let match = Ihr.exec(P);
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
    if (!isRegistrySweepPermitted) continue;
    let L = join_10(n, P),
      G = e
        ? await readSessionRecord(e, P)
        : await readSmallFileOrNull(L, MAX_SESSION_RECORD_BYTES)
            .then((Q) => (Q === null ? null : sessionRecordSchema().safeParse(jsonParse(Q))))
            .catch(() => null),
      j = G?.success ? G.data : null;
    if (j === null) {
      await sleep(Mhr);
      let Q = e
        ? await readSessionRecord(e, P)
        : await readSmallFileOrNull(L, MAX_SESSION_RECORD_BYTES)
            .then((re) => (re === null ? null : sessionRecordSchema().safeParse(jsonParse(re))))
            .catch(() => null);
      j = Q?.success ? Q.data : null;
    }
    let ee =
      j === null ? await Promise.all((x.get(F) ?? []).map((Q) => readRecordPidDomain(join_10(n, Q)))) : [];
    if (!mayReapRecordFromThisDomain(j, y, ee)) {
      w.add(F);
      continue;
    }
    if (!isProcessProvablyGone(F)) {
      w.add(F);
      continue;
    }
    if (
      (R.add(F),
      (e
        ? await deleteSessionRecord(e, P)
        : await unlink_4(L).then(
            () => !0,
            () => !1,
          )) &&
        !s.uncleanExitsScanned &&
        j !== null &&
        j.kind === "interactive" &&
        !isIdeOrSdkEntrypoint(j.entrypoint) &&
        !s.reportedUncleanExitPaths.has(L))
    )
      (logForDebugging(`Prior session exited uncleanly: ${j.sessionId} (v${j.version ?? "?"})`),
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
          prior_session_id: ye(j.sessionId),
        }),
        s.markUncleanExitReported(L));
  }
  if (isRegistrySweepPermitted)
    for (let P of r) {
      let match = Ihr.exec(P);
      if (!match) continue;
      let L = parseInt(match[1], 10);
      if (L === process.pid || w.has(L) || !isProcessProvablyGone(L)) continue;
      let G = await readRecordPidDomain(join_10(n, P));
      if (!(G !== void 0 ? G === y : R.has(L) || getPlatform() === "linux")) continue;
      if (!isProcessProvablyGone(L)) continue;
      if (e) deleteSessionRecord(e, P).catch(() => {});
      else unlink_4(join_10(n, P)).catch(() => {});
    }
  if (isRegistrySweepPermitted) s.setUncleanExitsScanned(!0);
  return S;
}
//@ chunk-aepeg2w5.js:851082-851136 placement
var TMUX_LOCATION_RE = /^[A-Za-z0-9_.-]{1,64}:@?\d{1,6}\.%?\d{1,6}$/;
/**
 * 读当前 tmux 窗格标识
 */
//@ chunk-aepeg2w5.js:851136-851362 placement
async function getTmuxPaneId() {
  let TMUX_PANE = env.TMUX_PANE;
  if (!env.TMUX || !TMUX_PANE) return;
  let { code: code, stdout: stdout } = await execFileNoThrow(
    "tmux",
    ["display-message", "-p", "-t", TMUX_PANE, "#{session_name}:#{window_id}.#{pane_id}"],
    { useCwd: !1, timeout: 1000 },
  );
  return code === 0 ? stdout.trim() : void 0;
}
//@ chunk-aepeg2w5.js:851362-851418 placement
var TMUX_QUERY_TIMEOUT_MS = 1000,
  Xg = new SessionRootSlot(() => new Map()),
  $Y = /\x1b\[[0-9;]*m/g;
//@ chunk-6cc2zqkz.js:5352-5496 fingerprint = countConcurrentSessions (0.372)
async function countConcurrentSessions_2() {
  return {
    pid: process.pid,
    pidSpace: ownPidSpace(),
    claimedAt: Date.now(),
    procStart:
      getPlatform() === "linux" || getPlatform() === "wsl"
        ? await getProcessStartTimeAsync(process.pid)
        : void 0,
  };
}
//@ chunk-e7z1g8a9.js:4175-4216 fingerprint = getSessionsDir (1)
function getSessionsDir() {
  return join(getClaudeConfigDir(), "sessions");
}

export {
  isBgSession,
  isUnattendedInteractiveSession,
  Ogr,
  sTi,
  envSessionKind,
  getRegisteredSessionName,
  isRegistrySweepPermitted,
  iTi,
  das,
  getBgJobDir,
  isActingAsBgJob,
  isDaemonBgWorker,
  clearResumeHintWorktree,
  clearSessionParked,
  markSessionParked,
  getBgTakeover,
  ARTIFACT_YIELD_PEER_FEATURE,
  isUnattendedBgSession,
  adoptSuppliedSessionTitle,
  updateSessionName,
  updateSessionActivity,
  getSessionRegistryState,
  registerSession,
  countConcurrentSessions,
  $Y,
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
  lTi,
  TMUX_QUERY_TIMEOUT_MS,
  Xg,
  oTi,
  rTi,
  aTi,
  updateSessionConvertedSkillsAsk,
  isBeingWatched,
  isBeingWatchedV5,
};
