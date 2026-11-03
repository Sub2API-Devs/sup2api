/**
 * components/fleet/fleetRows.ts
 *
 * 2.1.316 新增：会话名单存储：轮询本地/远程会话、待创建项、状态与 PR，提供订阅快照；附加/新建会话控制器（附加中、提升、新会话尝试）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-93kwxas0.js (78)
 * attribution: placement 78
 */
import { writeSync } from "fs";
import { stat, open } from "fs/promises";
import { join } from "path";
import { claudeTempDir } from "../../utils/tempDir.js";
import { sequential } from "../../utils/sequential.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { errorMessage, classifyAxiosError, isPathAbsent } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { cliError } from "../../cli/exit.js";
import { getInitialSettings_2, hasSkipDangerousModePermissionPrompt } from "../../utils/settings/settings.js";
import {
  permissionModeFromString,
  permissionModeSymbol,
  permissionModeIndicator,
} from "../../utils/permissions/PermissionMode.js";
import { isBypassPermissionsModeDisabled } from "../../utils/permissions/permissionSetup.js";
import { isBypassPermissionsAccepted } from "../../utils/permissions/bypassPermissionsAccepted.js";
import { parseEffortFlag } from "../../utils/effort.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { Byline } from "../design-system/Byline.js";
import {
  isLocalDaemonAgent,
  terminalOutcome,
  isSelfDriving,
  isSettled,
  isExecLaunch,
  SEED_DETAIL,
  IDLE_DETAIL,
  spawnOrigin,
  EARLIER,
  adoptRosterOrphans,
  watchJobDirOnce,
  markCrashed,
  isLoopJob,
  withSortOrderLock,
  writeSortOrder,
  getJobDir,
  writeStateSortOrder,
} from "../../services/daemon/jobState.js";
import { fromEnum, lit, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { getTranscriptStorageKey } from "../../utils/sessionStorage.js";
import { tailFile } from "../../utils/fsOperations.js";
import {
  CloudListPartialError_2,
  CloudListPartialError,
  sanitizeAttentionText,
  emptyMergedJobs,
  describeSessionAttention,
  mergePendingRemoteJobs,
} from "./sessionAttention.js";
import { CCR_SESSION_ID_RE } from "../../services/cloudSessions/ccrSessionList.js";
import { remoteRowId } from "../../bridge/sessionIdCompat.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { record, string, u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  ANY_CONTROL_CHAR_RE,
  getFirstLine,
  CONTROL_CHARS_EXCEPT_WS_RE,
  plural,
} from "../../utils/stringUtils.js";
import { DEFAULT_BG_AGENT_TEMPLATE } from "../../cli/bg/bgSpawnEnv.js";
import {
  getPrStatusColor,
  buildPrStatusQuery,
  fetchPrStatusByUrl,
  loadPrStatusCache,
  persistPrStatusCache,
} from "../../utils/ghPrStatus.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { stripAnsiPerLine } from "../../utils/stripAnsi.js";
import { uniq, count } from "../../utils/collections.js";
import { getProjectDir } from "../../utils/sessionStoragePortable.js";
import { rankJobNameMatch } from "../../cli/bg/bgDispatch.js";
import { findCanonicalGitRoot } from "../../utils/git.js";
import { tildify } from "../../utils/path.js";
import { requestNudgeOnce } from "./FleetNudgeStore.js";
import { listAliveDaemonJobs } from "../../daemon/jobs/killJob.js";
import { listAllLiveSessions } from "../../utils/udsMessaging/udsClient.js";
import {
  touchFleetViewHeartbeat,
  clearFleetViewHeartbeat,
  PEER_PROTOCOL,
} from "../../utils/concurrentSessions.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getPlatform } from "../../utils/platform.js";
import { defaultSetTimeout } from "../../ink/components/ClockContext.js";
import { getRootSession, getLastInteractionTime } from "../../bootstrap/state.js";
import { sleep } from "../../utils/sleep.js";
import { startClockInterval } from "../../ink/components/Input.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { getTerminalFocused } from "../../ink/terminal-focus-state.js";
import { takeSpareHandle, markSpareReady } from "../../cli/bg/bgSpare.js";
import { clamp } from "../../ink/screen.js";
import { parsePastedRefs } from "../../history.js";

//@ chunk-93kwxas0.js:8052-8122 placement
function prepareFatalExit() {
  try {
    claudeTempDir();
    return {
      ok: true,
    };
  } catch (error) {
    return {
      ok: false,
      error,
    };
  }
}
//@ chunk-93kwxas0.js:8122-8447 placement
/**
 * Agents 视图致命错误：清理终端模式、打印错误、刷新日志后退出。
 */
async function reportFatalAndExit(error) {
  process.exitCode = 1;
  let E = await import("./chunk-r3wdn2dp.js").catch(() => {
    return;
  });
  E?.cleanupTerminalModes();
  try {
    writeSync(
      2,
      sequential.red(stripControlChars(errorMessage(error))) +
        `
`,
    );
  } catch {}
  try {
    let { initSinks } = await import("./chunk-19b0wnnf.js");
    initSinks();
  } catch {}
  logError(error);
  if (E === undefined) return cliError();
  await E.gracefulShutdown(1, "other", {
    suppressResumeHint: true,
  });
}
//@ chunk-93kwxas0.js:8447-8908 placement
/**
 * 计算派发会话的权限模式（继承、bypass 可用性）。
 */
function resolveDispatchPermissionMode(dispatchDefaults) {
  let agent = dispatchDefaults?.agent ?? getInitialSettings_2().agent;
  if (!dispatchDefaults && !agent) return;
  let k = dispatchDefaults?.permissionMode
    ? permissionModeFromString(dispatchDefaults.permissionMode)
    : undefined;
  let C = isBypassPermissionsModeDisabled();
  let x = !C && isBypassPermissionsAccepted();
  let T = !C && hasSkipDangerousModePermissionPrompt();
  let A = dispatchDefaults?.permissionModeInherited ? k : "default";
  let V = k === "bypassPermissions" && !x ? (T ? A : undefined) : k;
  let D = dispatchDefaults?.allowBypass && x ? true : undefined;
  let level = dispatchDefaults?.effort ? parseEffortFlag(dispatchDefaults.effort).level : undefined;
  if (!V && !dispatchDefaults?.model && !level && !agent && !D) return;
  return {
    permissionMode: V,
    permissionModeInherited: V ? dispatchDefaults?.permissionModeInherited : undefined,
    model: dispatchDefaults?.model,
    effort: level,
    agent,
    allowBypass: D,
  };
}
//@ chunk-93kwxas0.js:8908-9037 placement
/**
 * 派发默认值里是否有非默认项（权限模式、模型、effort、agent、bypass）。
 */
function hasNonDefaultDispatchSettings(dispatchDefaults) {
  return (
    (!!dispatchDefaults.permissionMode &&
      dispatchDefaults.permissionMode !== "default" &&
      !isInheritedBypassUnavailable(dispatchDefaults)) ||
    !!dispatchDefaults.model ||
    !!dispatchDefaults.effort ||
    !!dispatchDefaults.agent ||
    !!dispatchDefaults.allowBypass
  );
}
//@ chunk-93kwxas0.js:9037-9951 placement
/**
 * 显示派发默认值（权限模式、模型、effort、agent）。
 */
function DispatchDefaultsLine(props) {
  let L = w(20);
  let { defaults } = props;
  let { permissionMode, model, effort, agent, allowBypass } = defaults;
  let V;
  if (L[0] !== defaults || L[1] !== permissionMode) {
    V = !!permissionMode && permissionMode !== "default" && !isInheritedBypassUnavailable(defaults);
    L[0] = defaults;
    L[1] = permissionMode;
    L[2] = V;
  } else V = L[2];
  let D = V;
  let U = allowBypass && !D;
  if (!D && !model && !effort && !agent && !U) {
    return null;
  }
  let N;
  if (L[3] !== permissionMode || L[4] !== D) {
    N =
      D &&
      jsxProd_default_2(Text, {
        color: themeColorOf(permissionMode),
        children: [permissionModeSymbol(permissionMode), " ", permissionModeIndicator(permissionMode)],
      });
    L[3] = permissionMode;
    L[4] = D;
    L[5] = N;
  } else N = L[5];
  let X;
  if (L[6] !== U) {
    X =
      U &&
      jsxProd_default_2(Text, {
        color: themeColorOf("bypassPermissions"),
        children: [permissionModeSymbol("bypassPermissions"), " bypass available"],
      });
    L[6] = U;
    L[7] = X;
  } else X = L[7];
  let K;
  if (L[8] !== agent) {
    K =
      agent &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["@", agent],
      });
    L[8] = agent;
    L[9] = K;
  } else K = L[9];
  let W;
  if (L[10] !== model) {
    W =
      model &&
      jsxProd_default(Text, {
        dimColor: true,
        children: model,
      });
    L[10] = model;
    L[11] = W;
  } else W = L[11];
  let z;
  if (L[12] !== effort) {
    z =
      effort &&
      jsxProd_default(Text, {
        dimColor: true,
        children: effort,
      });
    L[12] = effort;
    L[13] = z;
  } else z = L[13];
  let oe;
  if (L[14] !== N || L[15] !== X || L[16] !== K || L[17] !== W || L[18] !== z) {
    oe = jsxProd_default_2(Byline, {
      children: [N, X, K, W, z],
    });
    L[14] = N;
    L[15] = X;
    L[16] = K;
    L[17] = W;
    L[18] = z;
    L[19] = oe;
  } else oe = L[19];
  return oe;
}
//@ chunk-93kwxas0.js:9951-10052 placement
/**
 * 继承来的 bypassPermissions 模式在当前不可用。
 */
function isInheritedBypassUnavailable(h) {
  return (
    h.permissionMode === "bypassPermissions" &&
    h.permissionModeInherited === true &&
    !isBypassPermissionsAccepted()
  );
}
//@ chunk-93kwxas0.js:10052-10099 placement
function isOtherLocalDaemonJob(h, originJobId) {
  return isLocalDaemonAgent(h.state) && h.id !== originJobId;
}
//@ chunk-93kwxas0.js:10099-10175 placement
function markJobFinished(resultSeen, entryChannel) {
  let k = entryChannel ?? "unknown";
  resultSeen.entryChannel = fromEnum(k);
  resultSeen.openFinished = null;
}
//@ chunk-93kwxas0.js:10175-10730 placement
/**
 * 为新完成的会话发出一次性事件。
 */
function emitFinishedJobs(resultSeen, E, k = logEvent) {
  let C = E.now ?? Date.now();
  if (resultSeen.openFinished === null) resultSeen.openFinished = new Set(E.allFinished.map((T) => T.id));
  let openFinished = resultSeen.openFinished;
  for (let T of E.visibleFinished) {
    if (resultSeen.emitted.has(T.id)) continue;
    resultSeen.emitted.add(T.id);
    let dateMs = parseDateMs(T.state.firstTerminalAt);
    let L = dateMs ?? parseDateMs(T.state.updatedAt) ?? C;
    k("tengu_bg_result_seen", {
      trigger: openFinished.has(T.id) ? lit("list_open") : lit("render"),
      outcome: fromEnumOpt(terminalOutcome(T.state.state)),
      overlap: overlapsAnotherJob(T, E.allCandidates, C),
      entry_channel: resultSeen.entryChannel,
      seen_latency_ms: Math.max(0, C - L),
      terminal_at_missing: dateMs === null,
      jobSessionId: sanitizeMarkName(T.state.sessionId),
    });
  }
}
//@ chunk-93kwxas0.js:10730-10813 placement
function parseDateMs(h) {
  if (!h) return null;
  let timestamp = Date.parse(h);
  return Number.isNaN(timestamp) ? null : timestamp;
}
//@ chunk-93kwxas0.js:10813-11066 placement
/**
 * 该会话的运行区间与其他会话重叠。
 */
function overlapsAnotherJob(h, allCandidates, k) {
  let dateMs = parseDateMs(h.state.createdAt);
  if (dateMs === null) return false;
  let x = parseDateMs(h.state.firstTerminalAt) ?? k;
  return allCandidates.some((T) => {
    if (T.id === h.id) return false;
    let dateMs_2 = parseDateMs(T.state.createdAt);
    if (dateMs_2 === null) return false;
    let L = parseDateMs(T.state.firstTerminalAt) ?? k;
    return dateMs < L && dateMs_2 < x;
  });
}
//@ chunk-93kwxas0.js:11066-11616 placement
/**
 * 把对等会话记录转换为 job 状态。
 */
function peerToJobState(h) {
  let createdAt = new Date(h.startedAt).toISOString();
  let updatedAt = new Date(h.updatedAt ?? h.startedAt).toISOString();
  return {
    state: h.state ?? h.status ?? "running",
    detail: h.detail ?? h.waitingFor ?? "",
    tempo: h.tempo ?? (h.status === "busy" ? "active" : h.status === "waiting" ? "blocked" : "idle"),
    needs: h.needs,
    output: null,
    children: null,
    linkScanOffset: 0,
    template: h.agent ?? h.entrypoint ?? "interactive",
    respawnFlags: [],
    name: h.name,
    intent: h.name ?? "",
    sessionId: h.sessionId ?? "",
    cwd: h.cwd,
    originCwd: h.cwd,
    createdAt,
    updatedAt,
    firstTerminalAt: null,
    backend: "peer",
    sock: h.sock,
    pid: h.pid,
  };
}
//@ chunk-93kwxas0.js:11616-11794 placement
/**
 * 名单轮询间隔：按是否活跃与距上次变化的时间分档。
 */
function rosterPollInterval(terminalFocused, E) {
  if (terminalFocused) {
    if (E < 30000) return 15000;
    if (E < 300000) return 60000;
    return 180000;
  }
  if (E < 30000) return 60000;
  if (E < 600000) return 300000;
  if (E < 3600000) return 900000;
  return 1800000;
}
//@ chunk-93kwxas0.js:11830-12217 placement
/**
 * 查询会话转录文件的存在与修改时间。
 */
async function statTranscript(h, E) {
  let transcriptStorageKey = getTranscriptStorageKey(h, E);
  if (transcriptStorageKey !== undefined) {
    let x = await transcriptStorageKey.backend.statMeta(transcriptStorageKey.key);
    if (x.ok)
      return {
        kind: "present",
        mtimeMs: x.value.mtimeMs,
      };
    let error = x.error;
    if (error.code === "NotFound")
      return {
        kind: "absent",
      };
    let telemetryCode = "telemetryCode" in error ? error.telemetryCode : undefined;
    return telemetryCode === "ELOOP" || telemetryCode === "ENXIO"
      ? {
          kind: "refused",
        }
      : {
          kind: "unreadable",
          code: error.code,
        };
  }
  return {
    kind: "present",
    mtimeMs: (await stat(h)).mtimeMs,
  };
}
//@ chunk-93kwxas0.js:12217-12616 placement
/**
 * 读取会话转录末尾若干字节。
 */
async function readTranscriptTail(h, E, k) {
  let transcriptStorageKey = getTranscriptStorageKey(h, k);
  if (transcriptStorageKey !== undefined) {
    let x = await transcriptStorageKey.backend.read([
      {
        key: transcriptStorageKey.key,
        tail: E,
      },
    ]);
    if (!x.ok)
      throw Error("fleet view transcript tail read failed", {
        cause: x.error,
      });
    let T = x.value.items[0];
    if (!T.found) throw Error("fleet view transcript tail: stream not found");
    return {
      content: Buffer.from(T.value).toString("utf8"),
      bytesRead: T.value.byteLength,
      bytesTotal: T.totalBytes,
    };
  }
  return tailFile(h, E);
}
//@ chunk-93kwxas0.js:12652-12742 placement
var MAX_TAIL_ENTRIES = 7;
var MAX_SCAN_BYTES = 1048576;
var TAIL_OVERLAP_BYTES = 16;
var SCHEDULED_FIRE_MARKER = '"subtype":"scheduled_task_fire"';
var TIMESTAMP_RE = /"timestamp":"([^"]+)"/;
//@ chunk-93kwxas0.js:12742-12805 placement
function emptyScanState() {
  return {
    scanStates: new Map(),
    inFlightScans: new Set(),
  };
}
//@ chunk-93kwxas0.js:12805-14321 placement
/**
 * 增量扫描转录文件尾部（按 inode/偏移缓存）。
 */
async function scanTranscriptTail(h, E) {
  let { scanStates, inFlightScans } = h;
  if (inFlightScans.has(E)) return null;
  inFlightScans.add(E);
  try {
    let x = await open(E, "r");
    try {
      let { size, ino } = await x.stat();
      let L = scanStates.get(E);
      if (L && (L.ino !== ino || L.offset > size)) L = undefined;
      if (L && L.tail.length > 0) {
        let K = Buffer.alloc(L.tail.length);
        let { bytesRead } = await x.read(K, 0, K.length, L.offset - K.length);
        if (bytesRead !== K.length || !K.equals(L.tail)) L = undefined;
      }
      if (!L) {
        L = {
          ino,
          offset: 0,
          tail: Buffer.alloc(0),
          count: 0,
          recent: [],
        };
        scanStates.set(E, L);
      }
      if (size > L.offset) {
        let count = L.count;
        let sliced = L.recent.slice();
        let z = Buffer.alloc(Math.min(MAX_SCAN_BYTES, size - L.offset));
        let oe = null;
        let offset = L.offset;
        let offset_2 = L.offset;
        let tail = L.tail;
        while (offset < size) {
          let { bytesRead } = await x.read(z, 0, Math.min(z.length, size - offset), offset);
          if (bytesRead <= 0) break;
          let chunk = z.subarray(0, bytesRead);
          let Je = oe ? oe.length : 0;
          let le = oe ? Buffer.concat([oe, chunk]) : chunk;
          let Oe = 0;
          let index = le.indexOf(10, Je);
          while (index !== -1) {
            let str = le.toString("utf-8", Oe, index);
            if (str.includes(SCHEDULED_FIRE_MARKER)) {
              let match = str.match(TIMESTAMP_RE);
              let je = match ? Date.parse(match[1]) : NaN;
              if (Number.isFinite(je)) {
                count++;
                sliced.push(je);
                if (sliced.length > MAX_TAIL_ENTRIES) sliced.shift();
              }
            }
            Oe = index + 1;
            index = le.indexOf(10, Oe);
          }
          offset_2 += Oe;
          offset += bytesRead;
          if (Oe >= TAIL_OVERLAP_BYTES) tail = Buffer.from(le.subarray(Oe - TAIL_OVERLAP_BYTES, Oe));
          else if (Oe > 0) {
            let buffer = Buffer.concat([tail, le.subarray(0, Oe)]);
            tail = buffer.subarray(Math.max(0, buffer.length - TAIL_OVERLAP_BYTES));
          }
          oe = Oe < le.length ? Buffer.from(le.subarray(Oe)) : null;
        }
        if (offset_2 > L.offset) {
          L.offset = offset_2;
          L.count = count;
          L.recent = sliced;
          L.tail = tail;
        }
      }
      let { count, recent } = L;
      if (recent.length < 2)
        return {
          count,
          nextAt: null,
        };
      let U = [];
      for (let idx = 1; idx < recent.length; idx++) U.push(recent[idx] - recent[idx - 1]);
      U.sort((K, W) => K - W);
      let N = U[Math.floor(U.length / 2)];
      let X = recent.at(-1) + N;
      return {
        count,
        nextAt: X > Date.now() ? X : null,
      };
    } finally {
      await x.close();
    }
  } finally {
    inFlightScans.delete(E);
  }
}
//@ chunk-93kwxas0.js:14321-14407 placement
function pruneScanStates(h, E) {
  for (let key of h.scanStates.keys()) if (!E.has(key)) h.scanStates.delete(key);
}
//@ chunk-93kwxas0.js:14407-14416 placement
var CLOUD_LIST_ATTEMPTS = 2;
//@ chunk-93kwxas0.js:14416-14714 placement
/**
 * 云会话列表失败原因：exhausted / no_sign_in / status / no_answer / unknown。
 */
function classifyCloudListFailure(h) {
  if (h instanceof CloudListPartialError_2) return classifyCloudListFailure(h.cause);
  if (h instanceof CloudListPartialError)
    return {
      cause: "exhausted",
    };
  if (h instanceof Error && h.name === "CloudSessionAccessError")
    return {
      cause: "no_sign_in",
    };
  let { kind, status } = classifyAxiosError(h);
  return status !== undefined
    ? {
        cause: "status",
        status,
      }
    : {
        cause: kind === "other" ? "unknown" : "no_answer",
      };
}
//@ chunk-93kwxas0.js:14714-14854 placement
/**
 * 两个列表失败原因是否相同。
 */
function sameCloudListFailure(h, E) {
  if (h === null || E === null) return h === E;
  return h.cause === E.cause && (h.cause !== "status" || E.cause !== "status" || h.status === E.status);
}
//@ chunk-93kwxas0.js:14854-15045 placement
/**
 * 云会话列表失败提示（本构建中恒为 null）。
 */
function CloudListFailureNotice({ onCloudTab, remoteJobs, remoteListLoaded, remoteListFailure }) {
  if (false)
    switch (remoteListFailure.cause) {
      case "exhausted":
      case "no_sign_in":
      case "no_answer":
      case "unknown":
      case "status":
    }
  return null;
}
//@ chunk-93kwxas0.js:15045-15074 placement
var REMOTE_ROW_ID_RE = /^remote-[\w-]{1,8}$/;
//@ chunk-93kwxas0.js:15074-15107 placement
function isRemoteRowId(id) {
  return REMOTE_ROW_ID_RE.test(id);
}
//@ chunk-93kwxas0.js:15107-15211 placement
/**
 * 会话对应的远程行 id。
 */
function remoteRowIdOf(remoteJob) {
  if (isRemoteRowId(remoteJob.id)) return remoteJob.id;
  return CCR_SESSION_ID_RE.test(remoteJob.state.sessionId)
    ? remoteRowId(remoteJob.state.sessionId)
    : undefined;
}
//@ chunk-93kwxas0.js:15211-15319 placement
/**
 * 会话分组/置顶偏好的 schema（字符串键 → {group, pinned}）。
 */
var JOB_PREFS_SCHEMA = DoctorLazy(() =>
  record(
    string(),
    u({
      group: string().optional().catch(undefined),
      pinned: M().optional().catch(undefined),
    }).catch({}),
  ),
);
//@ chunk-93kwxas0.js:15319-15365 placement
var PROJECT_SESSION = "project_session";
var PROJECT_UNKNOWN = "project_unknown";
//@ chunk-93kwxas0.js:15365-15449 placement
class ArchiveRejectedError extends Error {
  burst;
  constructor(burst) {
    super("archive rejected");
    this.burst = burst;
  }
}
//@ chunk-93kwxas0.js:15478-15575 placement
function withoutMissingKeys(h, E) {
  let k;
  for (let key of h.keys()) if (!E.has(key)) (k ??= new Map(h)).delete(key);
  return k ?? h;
}
//@ chunk-93kwxas0.js:15575-15634 placement
function validChildren(children) {
  return children?.filter((E) => !ANY_CONTROL_CHAR_RE.test(E.href)) ?? [];
}
//@ chunk-93kwxas0.js:15634-15648 placement
var STUCK_AFTER_MS = 180000;
//@ chunk-93kwxas0.js:15648-16052 placement
/**
 * 判断会话结果（成功/失败）。
 */
function jobOutcome(h, prStatuses) {
  let k = terminalOutcome(h.state);
  if (k && h.tempo !== "active" && !(k === "success" && isSelfDriving(h))) return k;
  let filtered = validChildren(h.children).filter((A) => A.kind !== "frame");
  if (
    prStatuses &&
    h.tempo !== "active" &&
    h.template === DEFAULT_BG_AGENT_TEMPLATE.name &&
    filtered.length &&
    filtered.every((A) => prStatuses.get(A.href)?.state === "MERGED")
  )
    return "success";
  let x = h.tempo === "active" ? 1 : 5;
  let T = Date.now() - Date.parse(h.updatedAt);
  if (T < x * STUCK_AFTER_MS) return "flowing";
  if (T < x * 15 * 60000) return "slowing";
  return "stuck";
}
//@ chunk-93kwxas0.js:16052-16229 placement
/**
 * 会话 tempo：active/completed/blocked。
 */
function jobTempo(state, E) {
  if (E === "busy") return "active";
  if (isSettled(state) && !(terminalOutcome(state.state) === "success" && isSelfDriving(state)))
    return "completed";
  if (state.tempo === "blocked" || E === "waiting") return "blocked";
  return "active";
}
//@ chunk-93kwxas0.js:16229-16607 placement
/**
 * Agents 视图分区（review/blocked/working/done）及标题与说明。
 */
var FLEET_BUCKETS = ["review", "blocked", "working", "done"];
var FLEET_BUCKET_LABELS = {
  review: "Ready for review",
  blocked: "Needs input",
  working: "Working",
  done: "Completed",
};
var FLEET_BUCKET_HINTS = {
  review: "",
  blocked: "Sessions that have a question or need your decision land here",
  working: "Sessions Claude is actively working on \u2014 they keep running even if you close the terminal",
  done: "Finished sessions wait here for you to review",
};
//@ chunk-93kwxas0.js:16607-16690 placement
function terminalTitle(h) {
  return h > 0 ? `${h} awaiting input \xB7 claude agents` : "claude agents";
}
//@ chunk-93kwxas0.js:16690-17137 placement
/**
 * 计算会话所属分区。
 */
function jobBucket(h, prStatuses, k) {
  if (k === "busy") return "working";
  if (h.activity === "failure") return "done";
  if (h.activity === "stopped") return "done";
  if (k === "waiting") return "blocked";
  if (
    !isSelfDriving(h.state) &&
    validChildren(h.state.children).some((x) => {
      let T = prStatuses?.get(x.href);
      if (T?.state !== "OPEN") return false;
      let prStatusColor = getPrStatusColor(T);
      return prStatusColor === "error" || (prStatusColor === "warning" && T.review !== "APPROVED");
    })
  )
    return "review";
  if (h.activity === "success") return "done";
  if (h.state.tempo === "blocked") return "blocked";
  return "working";
}
//@ chunk-93kwxas0.js:17137-17161 placement
function returnFalse_2(state) {
  return false;
}
//@ chunk-93kwxas0.js:17161-17246 placement
function isFailedSettledJob(state) {
  let E = terminalOutcome(state.state);
  return (E === "failure" || E === "stopped") && isSettled(state) && !isExecLaunch(state);
}
//@ chunk-93kwxas0.js:17246-17278 placement
function jobStatusKey(h) {
  return `job:${h}`;
}
//@ chunk-93kwxas0.js:17278-17369 placement
function statusForJob(statuses, E) {
  return statuses.get(E.state.resumeSessionId ?? E.state.sessionId) ?? statuses.get(jobStatusKey(E.id));
}
//@ chunk-93kwxas0.js:17369-17904 placement
/**
 * 从转录行提取可预览的文本。
 */
function transcriptLinePreview(h) {
  try {
    let E = jsonParse(h);
    if (E.type === "assistant") {
      let text = (E.message?.content ?? []).find((x) => x.type === "text")?.text;
      if (text) return text;
    }
    if (E.type === "user") {
      let content = E.message?.content;
      let C = typeof content === "string" ? content : content?.find((T) => T.type === "text")?.text;
      let x = C
        ? stripSystemTags(C)
            .split(
              `
`,
            )
            .find((line) => line.trim())
            ?.trim()
        : undefined;
      if (x) return `> ${x}`;
      if (Array.isArray(content)) {
        let found = content.find((A) => A.type === "tool_result" && A.is_error);
        if (found) {
          let A =
            typeof found.content === "string"
              ? found.content
              : found.content?.find((L) => L.type === "text")?.text;
          if (A) return `\u2717 ${getFirstLine(A)}`;
        }
      }
    }
  } catch {}
  return null;
}
//@ chunk-93kwxas0.js:17904-18000 placement
function stripSystemTags(h) {
  return h.replace(/<(system-reminder|task-notification)>[\s\S]*?(<\/\1>|$)/g, " ");
}
//@ chunk-93kwxas0.js:18000-18039 placement
function isTerminalDetail(detail) {
  return detail === SEED_DETAIL || detail === IDLE_DETAIL;
}
//@ chunk-93kwxas0.js:18039-18141 placement
/**
 * 预览文本去掉标签、特殊字符并压缩空白。
 */
function stripJobPreviewText(detail) {
  return stripSystemTags(stripAnsiPerLine(detail))
    .replace(/<\/?[\w-]+>/g, " ")
    .replace(CONTROL_CHARS_EXCEPT_WS_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}
//@ chunk-93kwxas0.js:18141-18183 placement
function jobPreviewText(state, E) {
  return returnFalse_2(state) ? sanitizeAttentionText(E) : stripJobPreviewText(E);
}
//@ chunk-93kwxas0.js:18183-18328 placement
/**
 * 会话可能的 transcript 路径（cwd 与 worktree 各一个）。
 */
function jobTranscriptPaths(state) {
  let E = `${state.resumeSessionId ?? state.sessionId}.jsonl`;
  let k = state.worktreePath ? [state.cwd, state.worktreePath] : [state.cwd];
  return uniq(k.map((C) => join(getProjectDir(C), E)));
}
//@ chunk-93kwxas0.js:18328-18530 placement
/**
 * 读会话 transcript 尾部，返回最后一行预览文本。
 */
async function readJobLastLine(h, E) {
  for (let k of jobTranscriptPaths(h.state))
    try {
      let { content } = await readTranscriptTail(k, 16384, E);
      let filtered = content
        .split(
          `
`,
        )
        .map(transcriptLinePreview)
        .filter((A) => A !== null);
      return (filtered.filter((A, L) => A !== filtered[L - 1]).at(-1) ?? "").trim();
    } catch {}
  return "";
}
//@ chunk-93kwxas0.js:18530-20650 placement
/**
 * 按分区/分组布局行（空分区提示、完成折叠）。
 */
function layoutRows(h, E, k) {
  let {
    byState,
    byGroup,
    onRemoteTab,
    launcherGroup,
    scopedFallbackOrigin,
    doneFoldAt,
    emptyBucketHint,
    earlier = [],
  } = k;
  let N = [];
  if (byState && emptyBucketHint) {
    let ne = 0;
    let ae = 0;
    let me = byState && !onRemoteTab ? earlier : [];
    for (let le of FLEET_BUCKETS) {
      let filtered = h.filter((De) => E.get(De.id) === le);
      if (le === "review" && filtered.length === 0) continue;
      N.push({
        kind: "header",
        origin: scopedFallbackOrigin,
        group: le,
      });
      for (let De of filtered) {
        if (le === "done") {
          while (ae < me.length && me[ae].modified.getTime() > latestJobTimestamp(De.state)) {
            if (ne++ < doneFoldAt)
              N.push({
                kind: "earlier",
                entry: me[ae],
                origin: scopedFallbackOrigin,
                group: "done",
              });
            ae++;
          }
          if (ne++ >= doneFoldAt) continue;
        }
        N.push({
          kind: "job",
          job: De,
          origin: spawnOrigin(De.state),
          group: le,
        });
      }
      if (le === "done")
        while (ae < me.length) {
          if (ne++ < doneFoldAt)
            N.push({
              kind: "earlier",
              entry: me[ae],
              origin: scopedFallbackOrigin,
              group: "done",
            });
          ae++;
        }
    }
    let max = Math.max(0, ne - doneFoldAt);
    if (max > 0)
      N.push({
        kind: "fold",
        origin: scopedFallbackOrigin,
        group: "done",
        hidden: max,
      });
    return {
      rows: N,
      doneCount: ne,
      doneFoldHidden: max,
      foldGroup: "done",
    };
  }
  let X = !byState && !byGroup && !onRemoteTab && !h.some((ne) => E.get(ne.id) === launcherGroup);
  let K = 0;
  let W = byState && !onRemoteTab ? earlier : [];
  let z = 0;
  let oe = (ne) => {
    if (K++ >= doneFoldAt) return;
    N.push(ne);
  };
  for (let idx = 0; idx < h.length; idx++) {
    let ae = h[idx];
    let me = E.get(ae.id);
    let origin = spawnOrigin(ae.state);
    if (idx === 0 || me !== E.get(h[idx - 1].id)) {
      if (X && me !== "pinned") {
        N.push({
          kind: "header",
          origin: scopedFallbackOrigin,
          group: launcherGroup,
        });
        X = false;
      }
      let origin_2 =
        byState || byGroup || me === "pinned" || me === launcherGroup ? scopedFallbackOrigin : origin;
      N.push({
        kind: "header",
        origin: origin_2,
        group: me,
      });
    }
    if (me === "done") {
      while (z < W.length && W[z].modified.getTime() > latestJobTimestamp(ae.state)) {
        oe({
          kind: "earlier",
          entry: W[z],
          origin: scopedFallbackOrigin,
          group: "done",
        });
        z++;
      }
      oe({
        kind: "job",
        job: ae,
        origin,
        group: me,
      });
      continue;
    }
    N.push({
      kind: "job",
      job: ae,
      origin,
      group: me,
    });
  }
  if (z < W.length) {
    if (K === 0)
      N.push({
        kind: "header",
        origin: scopedFallbackOrigin,
        group: "done",
      });
    while (z < W.length) {
      oe({
        kind: "earlier",
        entry: W[z],
        origin: scopedFallbackOrigin,
        group: "done",
      });
      z++;
    }
  }
  if (X && h.length > 0)
    N.push({
      kind: "header",
      origin: scopedFallbackOrigin,
      group: launcherGroup,
    });
  let ge = !byState && !onRemoteTab ? earlier : [];
  if (ge.length > 0) {
    N.push({
      kind: "header",
      origin: scopedFallbackOrigin,
      group: EARLIER,
    });
    let max = Math.max(0, Math.min(doneFoldAt, ge.length));
    for (let entry of ge.slice(0, max))
      N.push({
        kind: "earlier",
        entry,
        origin: scopedFallbackOrigin,
        group: EARLIER,
      });
    let ae = ge.length - max;
    if (ae > 0)
      N.push({
        kind: "fold",
        origin: scopedFallbackOrigin,
        group: EARLIER,
        hidden: ae,
      });
    return {
      rows: N,
      doneCount: ge.length,
      doneFoldHidden: ae,
      foldGroup: EARLIER,
    };
  }
  let se = K > doneFoldAt ? K - doneFoldAt : 0;
  if (se > 0)
    N.push({
      kind: "fold",
      origin: scopedFallbackOrigin,
      group: "done",
      hidden: se,
    });
  return {
    rows: N,
    doneCount: K,
    doneFoldHidden: se,
    foldGroup: "done",
  };
}
//@ chunk-93kwxas0.js:20650-20933 placement
/**
 * 初始焦点行：首个远程会话，或来源会话、earlier 行。
 */
function initialFocusIndex(rows, launcherCwd) {
  let index = rows.findIndex((T) => T.kind === "job" && T.job.state.backend === "remote");
  if (index !== -1) return index;
  let C = rows[1];
  if (C?.kind === "job" && C.origin === launcherCwd) return 1;
  if (C?.kind === "earlier") return 1;
  let index_2 = rows.findIndex((T) => T.kind === "earlier");
  return index_2 !== -1 && !rows.some((T) => T.kind === "job") ? index_2 : 0;
}
//@ chunk-93kwxas0.js:20933-21137 placement
/**
 * 按搜索得分找最匹配的行。
 */
function bestSearchMatchIndex(rows, E) {
  let k = 0;
  let C = -1;
  for (let [x, T] of rows.entries()) {
    if (T.kind !== "job" && T.kind !== "earlier") continue;
    let A = E
      ? rankJobNameMatch(
          T.kind === "job"
            ? T.job.state
            : {
                name: T.entry.title,
                intent: "",
              },
          E,
        )
      : 0;
    if (A > C) {
      C = A;
      k = x;
    }
  }
  return k;
}
//@ chunk-93kwxas0.js:21137-21175 placement
var DONE_CAP_MIN = 3;
var DONE_CAP_SLACK = 3;
var DONE_MERGE_WINDOW_MS = 60000;
var DONE_CAP_RESERVED = 8;
var DONE_CAP_TITLE_ROWS = 4;
var DONE_CAP_COMPACT_TITLE_ROWS = 2;
//@ chunk-93kwxas0.js:21175-21315 placement
/**
 * 按剩余高度计算已完成分区可显示的行数，不够时用紧凑标题。
 */
function computeDoneCap(termRows, E) {
  let k = (x) => termRows - DONE_CAP_RESERVED - x - E;
  let C = k(DONE_CAP_TITLE_ROWS);
  if (C >= DONE_CAP_MIN)
    return {
      doneCap: C,
      compactHeader: false,
    };
  return {
    doneCap: Math.max(0, k(DONE_CAP_COMPACT_TITLE_ROWS)),
    compactHeader: true,
  };
}
//@ chunk-93kwxas0.js:21315-21397 placement
function canonicalRepoRoot(state) {
  if (state.backend === "remote") return spawnOrigin(state);
  let origin = spawnOrigin(state);
  return findCanonicalGitRoot(origin) ?? origin;
}
//@ chunk-93kwxas0.js:21397-21425 placement
function shortenPath(group) {
  return tildify(group);
}
//@ chunk-93kwxas0.js:21425-21484 placement
function jobSortKey(state) {
  return state.sortOrder ?? Date.parse(state.createdAt);
}
//@ chunk-93kwxas0.js:21484-21610 placement
/**
 * 排序键：stateSortOrder 或（done 用终止时间，其余用更新时间）。
 */
function jobSortKey_2(state, E) {
  return (
    state.stateSortOrder ??
    Date.parse(
      E === "done" ? (state.lastTerminalAt ?? state.firstTerminalAt ?? state.updatedAt) : state.updatedAt,
    )
  );
}
//@ chunk-93kwxas0.js:21610-21764 placement
/**
 * 会话最近的有效时间戳（终止/首次终止/更新/创建）。
 */
function latestJobTimestamp(state) {
  for (let E of [state.lastTerminalAt, state.firstTerminalAt, state.updatedAt, state.createdAt])
    if (E) {
      let timestamp = Date.parse(E);
      if (Number.isFinite(timestamp)) return timestamp;
    }
  return 0;
}
//@ chunk-93kwxas0.js:21764-22260 placement
/**
 * 计算已完成会话折叠的位置。
 */
function doneFoldIndex({ done: h, earlier, doneCap, initialJobId, linkMatchId }) {
  let T = h.length + earlier.length;
  if (T < doneCap + DONE_CAP_SLACK) return 1 / 0;
  let A = (W) => jobSortKey_2(W.state, "done");
  let min = Math.min(doneCap, h.length);
  if (min > 0) {
    let W = A(h[min - 1]);
    while (min < h.length && W - A(h[min]) < DONE_MERGE_WINDOW_MS) min++;
  }
  let mapped = h.map((W) => latestJobTimestamp(W.state));
  let mapped_2 = earlier.map((W) => {
    let time = W.modified.getTime();
    return mapped.findIndex((oe) => time > oe);
  });
  let U = (W) => count(mapped_2, (z) => z !== -1 && z <= W);
  let max = Math.max(min, doneCap);
  let max_2 = Math.max(
    h.findIndex((W) => W.id === initialJobId),
    h.findIndex((W) => W.id === linkMatchId),
  );
  let K = max_2 < 0 ? -1 : max_2 + U(max_2);
  if (T - max < DONE_CAP_SLACK || K >= max) return 1 / 0;
  return max;
}
//@ chunk-93kwxas0.js:22260-22325 placement
function sortJobs(h) {
  return [...h].sort((E, k) => jobSortKey(E.state) - jobSortKey(k.state));
}
//@ chunk-93kwxas0.js:22325-22339 placement
var REMOTE_STOP_TTL_MS = 120000;
//@ chunk-93kwxas0.js:22339-22367 placement
var POLL_INTERVAL_MS = 2000;
var STATUS_POLL_MS = 500;
var LOAD_TIMEOUT_MS = 30000;
//@ chunk-93kwxas0.js:22367-22386 placement
var SESSION_IDLE_TTL_MS = 30000;
var MAX_LIST_FAILURES = 15;
//@ chunk-93kwxas0.js:22386-23193 placement
/**
 * 组装 Agents 视图的后端操作（列出 job、存活 daemon 会话、远程会话、中断等）。
 */
function createFleetBackend() {
  return {
    listJobs: requestNudgeOnce,
    listAliveDaemonJobs: (h) => listAliveDaemonJobs(h),
    adoptRosterOrphans: (h, E, k) => adoptRosterOrphans(h, E, k),
    listAllLiveSessions: (h) => listAllLiveSessions(h),
    listRemoteSessions: (h) => emptyMergedJobs(h),
    interruptRemoteSession: (h) => import("./chunk-djvrn9k9.js").then((E) => E.interruptRemoteSession(h)),
    removeRemoteSession: (h, E) =>
      Promise.resolve({
        failure: "gate_off",
        pausedRoutines: 0,
        mayStillRun: null,
      }),
    updateRemoteSessionTitle: async (h, E) => false,
    readCloudRowMarks: () => EMPTY_MARKS_MAP,
    saveCloudRowMarks: (h, E, k) => Promise.resolve(false),
    readLogTail: (h, E) => readJobLastLine(h, E),
    probeFleetTranscript: (h, E) => statTranscript(h, E),
    scanLoopTranscript: (h, E) => scanTranscriptTail(h, E),
    fetchPrStatusBatch: (h) => buildPrStatusQuery(h),
    fetchPrStatusByUrl: (h) => fetchPrStatusByUrl(h),
    loadPrStatusCache: (h) => loadPrStatusCache(h),
    persistPrStatusCache: (h, E) => persistPrStatusCache(h, E),
    touchFleetViewHeartbeat: (h) => touchFleetViewHeartbeat(h),
    clearFleetViewHeartbeat: (h) => clearFleetViewHeartbeat(h),
    watchJobDirOnce: (h, E) => watchJobDirOnce(h, E),
  };
}
//@ chunk-93kwxas0.js:23193-23214 placement
var EMPTY_ROW_MARK = {};
var EMPTY_MARKS_MAP = new Map();
//@ chunk-93kwxas0.js:23214-23488 placement
/**
 * 名单存储的初始快照。
 */
function createEmptyRosterSnapshot() {
  return {
    jobs: null,
    adoptedPeers: [],
    remoteJobs: [],
    remoteListLoaded: false,
    remoteListFailure: null,
    remoteListHasOlder: false,
    pendings: [],
    statuses: new Map(),
    terminalHolders: new Map(),
    prStatuses: new Map(),
    loopKicks: new Map(),
    logTails: {},
    deleteRefusals: new Map(),
    overlaidLoadLanded: false,
  };
}
//@ chunk-93kwxas0.js:23488-37835 placement
/**
 * 会话名单存储：轮询本地/远程会话、待创建项、状态与 PR，提供订阅快照。
 */
class FleetRoster {
  #n;
  #e;
  #l = createSignal();
  #t = createEmptyRosterSnapshot();
  #r = null;
  #i = 0;
  #c = false;
  #s = [];
  #a = null;
  #o = 0;
  #m = 0;
  #g = 0;
  #u = new Set();
  #d = new Map();
  #S = new Set();
  #k = new Set();
  #h = new Map();
  #y = 0;
  #T = 0;
  #E = 0;
  #R = 0;
  #v = new Map();
  #b = new Map();
  #p = new Map();
  #x = new Set();
  #w = new Map();
  #_ = null;
  #I = new Set();
  #C = new Map();
  #M = emptyScanState();
  #O = null;
  constructor(h) {
    this.#n = h?.storageV5;
    this.#e = {
      ...createFleetBackend(),
      ...h?.client,
    };
  }
  getSnapshot = () => this.#t;
  usesStorage(h) {
    return this.#n === h;
  }
  subscribe = (h) => this.#l.subscribe(h);
  #f(h, E) {
    let k = this.#t[h];
    let C = E(k);
    if (Object.is(C, k)) return;
    this.#t = {
      ...this.#t,
      [h]: C,
    };
    this.#l.emit();
  }
  #A(h, E) {
    return (this.#r?.setTimeout ?? defaultSetTimeout)(h, E);
  }
  attachView(h) {
    this.#i++;
    if (this.#i === 1) this.#B(h);
    let E = false;
    return () => {
      if (E) return;
      E = true;
      this.#i--;
      if (this.#i === 0) this.#J();
    };
  }
  setRemoteWanted(h) {
    if (h === this.#c) return;
    this.#c = h;
    if (this.#i === 0) return;
    if (h) this.#L();
    else {
      this.#a?.();
      this.#a = null;
    }
  }
  #B(h) {
    this.#r = h;
    this.#y = 0;
    if (this.#t.prStatuses.size === 0)
      this.#e.loadPrStatusCache(this.#n).then((E) => {
        if (E.size) this.#F((k) => (k.size ? new Map([...E, ...k]) : E));
      });
    this.load();
    this.#s.push(
      startClockInterval(h, () => void this.load(), POLL_INTERVAL_MS),
      startClockInterval(h, this.#H, STATUS_POLL_MS),
      startClockInterval(
        h,
        () => {
          this.#c;
        },
        POLL_INTERVAL_MS,
      ),
    );
    if (this.#c) this.#L();
  }
  #L() {
    if (!this.#r) return;
    this.#f("remoteJobs", (h) => {
      let mapped = h.map((k) => {
        let C = jobOutcome(k.state);
        return C === k.activity
          ? k
          : {
              ...k,
              activity: C,
            };
      });
      return mapped.every((k, C) => k === h[C]) ? h : mapped;
    });
    this.loadRemote();
    this.#a?.();
    this.#a = startClockInterval(this.#r, this.loadRemote, LOAD_TIMEOUT_MS);
  }
  #J() {
    for (let k of this.#s) k();
    this.#s = [];
    this.#a?.();
    this.#a = null;
    this.#O?.();
    this.#O = null;
    this.#e.clearFleetViewHeartbeat(this.#n);
    this.#r = null;
    this.#I.clear();
    this.#C.clear();
    this.#R = this.#E;
    let h = this.#t;
    let E = h.remoteJobs.some((remoteJob) => remoteJob.id.startsWith("remote-pending-"))
      ? h.remoteJobs.filter((remoteJob) => !remoteJob.id.startsWith("remote-pending-"))
      : h.remoteJobs;
    if (
      h.pendings.length > 0 ||
      E !== h.remoteJobs ||
      h.remoteListLoaded ||
      h.remoteListFailure !== null ||
      h.overlaidLoadLanded
    ) {
      this.#t = {
        ...h,
        pendings: h.pendings.length > 0 ? [] : h.pendings,
        remoteJobs: E,
        remoteListLoaded: false,
        remoteListFailure: null,
        overlaidLoadLanded: false,
      };
      this.#l.emit();
    }
  }
  get jobs() {
    return this.#t.jobs;
  }
  isDeleting(h) {
    return this.#u.has(h);
  }
  deleteRefusalOf = (h) => this.#t.deleteRefusals.get(h);
  isDeletingSession(h) {
    return this.#S.has(h);
  }
  isHolding(h) {
    return this.#h.has(h);
  }
  isArchiving(h) {
    return this.#v.has(h);
  }
  isRetitling(h) {
    return this.#x.has(h);
  }
  liveStatus(h) {
    let { sessionId, resumeSessionId } = h.state;
    if (isExecLaunch(h.state)) return h.state.tempo === "active" ? "busy" : undefined;
    if (h.state.backend === "remote")
      return h.state.tempo === "active" ? "busy" : h.state.tempo === "blocked" ? "waiting" : undefined;
    if (this.#C.has(resumeSessionId ?? sessionId)) return "busy";
    if (this.#t.pendings.some((pending) => pending.state.sessionId === sessionId)) return "busy";
    let C =
      this.terminalHolderOf(h) !== undefined
        ? this.#t.statuses.get(jobStatusKey(h.id))
        : statusForJob(this.#t.statuses, h);
    if (C) return C;
    if (this.#I.has(sessionId)) return "busy";
    return;
  }
  terminalHolderOf(h) {
    if (h.state.backend === "peer" || h.state.backend === "remote") return;
    return this.#t.terminalHolders.get(h.state.resumeSessionId ?? h.state.sessionId);
  }
  bumpGen() {
    this.#m = ++this.#o;
  }
  resetPrFetchGate() {
    this.#y = 0;
  }
  holdJob = (h) => {
    this.#m = ++this.#o;
    this.#h.set(h, (this.#h.get(h) ?? 0) + 1);
    return () => {
      this.#m = ++this.#o;
      let E = (this.#h.get(h) ?? 1) - 1;
      if (E <= 0) this.#h.delete(h);
      else this.#h.set(h, E);
    };
  };
  optimistic = (h, E, k) => {
    this.#m = ++this.#o;
    if (E) {
      this.#u.add(E);
      let found = this.#t.jobs?.find((job) => job.id === E);
      if (found) {
        let filtered = [found.state.sessionId, found.state.resumeSessionId].filter((A) => Boolean(A));
        this.#d.set(E, filtered);
        for (let A of filtered) this.#S.add(A);
      }
    }
    let C = k ? this.holdJob(k) : undefined;
    this.updateJobs((x) => (x ? h(x) : x));
    return E || C
      ? () => {
          if (E) {
            this.#m = ++this.#o;
            this.#u.delete(E);
            for (let x of this.#d.get(E) ?? []) this.#S.delete(x);
            this.#d.delete(E);
          }
          C?.();
        }
      : undefined;
  };
  noteDeleteRefusal = (h, E) => {
    this.#k.delete(h);
    this.#f("deleteRefusals", (k) => {
      if (E === null && !k.has(h)) return k;
      let C = new Map(k);
      if (E === null) C.delete(h);
      else C.set(h, E);
      return C;
    });
  };
  updateJobs(h) {
    this.#f("jobs", h);
  }
  updateAdoptedPeers(h) {
    this.#f("adoptedPeers", h);
  }
  updateRemoteJobs(h) {
    this.#f("remoteJobs", h);
  }
  #D(h) {
    return h;
  }
  dropRemoteJobs() {
    this.#R = this.#E;
    this.#w.clear();
    this.#_ = null;
    this.#f("remoteJobs", (h) => (h.length > 0 ? [] : h));
    this.#f("remoteListHasOlder", () => false);
  }
  updatePendings(h) {
    this.#f("pendings", h);
  }
  #F(h) {
    let prStatuses = this.#t.prStatuses;
    this.#f("prStatuses", h);
    if (this.#t.prStatuses !== prStatuses) this.#e.persistPrStatusCache(this.#t.prStatuses, this.#n);
  }
  seedJobs(h) {
    this.updateJobs((E) => {
      let mapped = h
        .filter((x) => !this.#u.has(x.id))
        .map((x) => ({
          ...x,
          activity: jobOutcome(x.state),
        }));
      let C =
        E && this.#h.size > 0 ? new Map(E.filter((x) => this.#h.has(x.id)).map((x) => [x.id, x])) : null;
      return sortJobs(C ? mapped.map((x) => C.get(x.id) ?? x) : mapped);
    });
  }
  settleLandedPendings(h) {
    let E = new Set(h.map((k) => k.id));
    for (let k of h) {
      let sessionId = k.state.sessionId;
      this.#I.add(sessionId);
      this.#A(() => this.#I.delete(sessionId), SESSION_IDLE_TTL_MS);
    }
    this.updatePendings((k) => k.filter((C) => !E.has(C.id)));
  }
  kick(h, jobId) {
    let k = {
      kickedAt: Date.now(),
      jobId,
    };
    this.#C.set(h, k);
    this.#A(() => {
      if (this.#C.get(h) === k) {
        this.#C.delete(h);
        this.#f("statuses", (C) => new Map(C));
      }
    }, SESSION_IDLE_TTL_MS);
    return () => {
      if (this.#C.get(h) === k) this.#C.delete(h);
    };
  }
  watchPendingJobDir(h) {
    this.#O?.();
    this.#O = this.#e.watchJobDirOnce(h, () => void this.load());
  }
  reload = () => {
    this.load();
  };
  load = async () => {
    if (
      isCrossSessionMessagingEnabled() &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", false)
    )
      this.#e.touchFleetViewHeartbeat(this.#n);
    let h = ++this.#o;
    let [E, k] = await Promise.all([this.#e.listJobs(this.#n), this.#e.listAliveDaemonJobs(this.#n)]);
    if (E !== null) this.#g = 0;
    else if (this.#t.jobs?.length && ++this.#g <= MAX_LIST_FAILURES) {
      if (this.#g === 1)
        logForDebugging(
          "[fleet] listing sessions failed for a reason that may pass; keeping the listed sessions",
          {
            level: "warn",
          },
        );
      return;
    }
    let mapped = markCrashed(await this.#e.adoptRosterOrphans(E ?? [], k.records, this.#n), k.shorts)
      .filter((N) => !this.#u.has(N.id))
      .map((N) => ({
        ...N,
        activity: jobOutcome(N.state, this.#t.prStatuses),
      }));
    if (h <= this.#m) return;
    this.#m = h;
    if (this.#i > 0) this.#f("overlaidLoadLanded", () => true);
    this.updateJobs((N) => {
      let X =
        N && this.#h.size > 0 ? new Map(N.filter((W) => this.#h.has(W.id)).map((W) => [W.id, W])) : null;
      let K = sortJobs(X ? mapped.map((W) => X.get(W.id) ?? W) : mapped);
      if (
        N &&
        N.length === K.length &&
        N.every(
          (W, z) =>
            W.id === K[z].id &&
            W.state.updatedAt === K[z].state.updatedAt &&
            W.state.state === K[z].state.state &&
            W.state.pinned === K[z].state.pinned &&
            W.state.group === K[z].state.group &&
            W.state.stateSortOrder === K[z].state.stateSortOrder &&
            W.activity === K[z].activity,
        )
      )
        return N;
      return K;
    });
    let filtered = mapped.filter((N) => jobTempo(N.state) !== "completed");
    let results = await Promise.all(filtered.map(async (N) => [N.id, await this.#e.readLogTail(N, this.#n)]));
    this.#f("logTails", (N) => {
      let X = Object.fromEntries(results);
      let keys = Object.keys(N);
      if (keys.length === results.length && keys.every((W) => N[W] === X[W])) return N;
      return X;
    });
    let filtered_2 = mapped.filter((N) => isLoopJob(N.state));
    if (filtered_2.length > 0) {
      let filtered = (
        await Promise.all(
          filtered_2.map(async (K) => {
            for (let W of jobTranscriptPaths(K.state))
              try {
                let z = await this.#e.probeFleetTranscript(W, this.#n);
                if (z.kind === "present") return [K.state.sessionId, z.mtimeMs, W];
                if (z.kind !== "absent") return null;
              } catch (error) {
                if (!isPathAbsent(error)) return null;
              }
            return null;
          }),
        )
      )
        .filter((K) => K !== null)
        .filter(([K, W]) => {
          let z = this.#t.loopKicks.get(K);
          return !z || z.mtimeMs !== W;
        });
      if (filtered.length > 0) {
        let results = await Promise.all(
          filtered.map(async ([W, z, oe]) => {
            try {
              let ge = await this.#e.scanLoopTranscript(this.#M, oe);
              return ge
                ? [
                    W,
                    {
                      mtimeMs: z,
                      ...ge,
                    },
                  ]
                : null;
            } catch {
              return null;
            }
          }),
        );
        this.#f("loopKicks", (W) => {
          let z = false;
          let oe = new Map(W);
          for (let ge of results)
            if (ge) {
              oe.set(ge[0], ge[1]);
              z = true;
            }
          return z ? oe : W;
        });
      }
    }
    let L = uniq(
      mapped.flatMap((N) =>
        validChildren(N.state.children)
          .filter((X) => X.kind !== "frame")
          .map((X) => X.href),
      ),
    );
    let filtered_3 = L.filter((N) => {
      let state = this.#t.prStatuses.get(N)?.state;
      return state !== "MERGED" && state !== "CLOSED";
    });
    let now = Date.now();
    let U = now - this.#y >= rosterPollInterval(getTerminalFocused(), now - getLastInteractionTime());
    if (filtered_3.length > 0 && U) {
      this.#y = now;
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
        "tengu_fleetview_pr_batch",
        true,
      );
      (async () => {
        let X;
        if (featureValue_CACHED_MAY_BE_STALE) {
          let prStatusBatch = await this.#e.fetchPrStatusBatch(filtered_3);
          X = prStatusBatch.statuses;
          await Promise.all(
            prStatusBatch.unbatched.map(async (W) => X.set(W, await this.#e.fetchPrStatusByUrl(W))),
          );
        } else
          X = new Map(
            await Promise.all(filtered_3.map(async (K) => [K, await this.#e.fetchPrStatusByUrl(K)])),
          );
        this.#F((K) => {
          let W = false;
          for (let [oe, ge] of X) {
            let se = K.get(oe);
            if (
              se?.state !== ge?.state ||
              se?.title !== ge?.title ||
              se?.review !== ge?.review ||
              se?.checks.passed !== ge?.checks.passed ||
              se?.checks.failed !== ge?.checks.failed ||
              se?.checks.pending !== ge?.checks.pending ||
              se?.additions !== ge?.additions ||
              se?.deletions !== ge?.deletions
            ) {
              W = true;
              break;
            }
          }
          if (!W) return K;
          let z = new Map(K);
          for (let [oe, ge] of X) if (ge !== null || !K.has(oe)) z.set(oe, ge);
          return z;
        });
      })().catch(logError);
    }
    if (this.#m === h) {
      let N = new Set(mapped.map((K) => K.state.sessionId));
      let X = new Set(L);
      this.#f("loopKicks", (K) => withoutMissingKeys(K, N));
      this.#F((K) => withoutMissingKeys(K, X));
      if (mapped.length > 0) {
        let deleteRefusals = this.#t.deleteRefusals;
        let W = new Set(this.#u);
        for (let z of mapped) {
          if (!deleteRefusals.has(z.id)) continue;
          if (isSettled(z.state)) {
            this.#k.add(z.id);
            W.add(z.id);
          } else if (!this.#k.has(z.id)) W.add(z.id);
        }
        this.#f("deleteRefusals", (z) => withoutMissingKeys(z, W));
        for (let z of this.#k) if (!W.has(z)) this.#k.delete(z);
      }
      pruneScanStates(this.#M, new Set(mapped.flatMap((K) => jobTranscriptPaths(K.state))));
    }
  };
  #H = () => {
    this.#e
      .listAllLiveSessions(this.#n)
      .then((h) => {
        let E = new Map();
        let k = new Map();
        for (let T of h) {
          if (T.kind === "interactive" && T.pid !== process.pid && T.sessionId && T.parkedJobId === undefined)
            k.set(T.sessionId, T.pid);
          if (!T.status) continue;
          if (T.sessionId) E.set(T.sessionId, T.status);
          if (T.jobId) E.set(jobStatusKey(T.jobId), T.status);
        }
        for (let key of E.keys()) this.#I.delete(key);
        let C = takeSpareHandle();
        if (C && h.some((T) => T.sessionId === C.sessionId)) markSpareReady(C.sessionId);
        let x = false;
        for (let [T, A] of this.#C) {
          let found = h.find((V) => V.sessionId === T || V.jobId === A.jobId);
          if (
            E.get(T) === "busy" ||
            E.get(jobStatusKey(A.jobId)) === "busy" ||
            (found !== undefined &&
              (found.statusUpdatedAt ?? 0) > A.kickedAt &&
              found.startedAt <= A.kickedAt)
          ) {
            this.#C.delete(T);
            x = true;
          }
        }
        this.#f("statuses", (T) =>
          !x && T.size === E.size && [...E].every(([A, L]) => T.get(A) === L) ? T : E,
        );
        this.#f("terminalHolders", (T) =>
          T.size === k.size && [...k].every(([A, L]) => T.get(A) === L) ? T : k,
        );
        if (
          isCrossSessionMessagingEnabled() &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", false)
        ) {
          let T = new Set((this.#t.jobs ?? []).map((V) => V.state.sessionId));
          let now = Date.now();
          let mapped = h
            .filter(
              (V) =>
                V.kind === "interactive" &&
                V.pid !== process.pid &&
                V.sessionId &&
                !T.has(V.sessionId) &&
                (V.peerProtocol ?? 0) >= PEER_PROTOCOL &&
                now - (V.updatedAt ?? V.startedAt) < 86400000,
            )
            .map((V) => {
              let D = peerToJobState(V);
              return {
                id: `peer-${V.pid}`,
                state: D,
                activity: jobOutcome(D),
              };
            });
          this.updateAdoptedPeers((V) => {
            let D = new Map(V.map((N) => [N.id, N]));
            let mapped_2 = mapped.map((N) => {
              let X = D.get(N.id);
              return X &&
                X.state.name !== N.state.name &&
                (X.state.updatedAt ?? "") >= (N.state.updatedAt ?? "")
                ? {
                    ...N,
                    state: {
                      ...N.state,
                      name: X.state.name,
                      intent: X.state.intent,
                      updatedAt: X.state.updatedAt,
                    },
                  }
                : N;
            });
            return V.length === mapped_2.length &&
              V.every(
                (N, X) =>
                  N.id === mapped_2[X].id &&
                  N.state.updatedAt === mapped_2[X].state.updatedAt &&
                  N.state.name === mapped_2[X].state.name &&
                  N.activity === mapped_2[X].activity,
              )
              ? V
              : mapped_2;
          });
        }
      })
      .catch(() => {});
  };
  refreshRemote() {
    if (!(this.#E > this.#R) && Date.now() - this.#T > 1000) this.loadRemote();
  }
  loadRemote = () => {
    let now = Date.now();
    this.#T = now;
    let E = ++this.#E;
    let k = {
      moreRemain: false,
    };
    this.#e
      .listRemoteSessions(k)
      .then(
        (C) => this.#P(E, now, C, null, k.moreRemain),
        (error) => {
          let x = error instanceof CloudListPartialError_2 ? error : null;
          logForDebugging(
            `[fleet:remote] list failed after ${x?.rows.length ?? 0} rows: ${errorMessage(x?.cause ?? error)}`,
          );
          this.#P(E, now, x?.rows ?? [], classifyCloudListFailure(error), false);
        },
      )
      .catch((error) => {
        logForDebugging(`[fleet:remote] poll mapper threw: ${errorMessage(error)}`);
        this.#P(
          E,
          now,
          [],
          {
            cause: "unknown",
          },
          false,
        );
      });
  };
  #P(h, E, k, C, x) {
    if (h <= this.#R) return;
    let T = null;
    for (let [D, U] of this.#p) if (E >= U.answeredAt) this.#p.delete(D);
    let filtered = k
      .map((D) => {
        let U = remoteRowId(D.id);
        let N = this.#p.get(U);
        let X = describeSessionAttention(
          N
            ? {
                ...D,
                title: N.title,
              }
            : D,
        );
        let K = T?.get(U);
        if (K)
          X = {
            ...X,
            group: K.group,
            pinned: K.pinned,
          };
        let W = this.#b.get(U);
        if (W !== undefined)
          if (isSettled(X) || (D.worker_status === "idle" && h > W.lastPoll) || E > W.expiry)
            this.#b.delete(U);
          else
            X = {
              ...X,
              state: "stopped",
              tempo: "idle",
              needs: undefined,
              detail: X.detail,
            };
        return {
          id: U,
          state: X,
          activity: jobOutcome(X),
        };
      })
      .filter((D) => {
        let U = this.#v.get(D.id);
        if (U === undefined) return true;
        if (E > U && !this.#w.has(D.id)) {
          this.#v.delete(D.id);
          return true;
        }
        if (this.#w.has(D.id)) this.#w.set(D.id, D);
        return false;
      });
    this.#R = h;
    let L = C !== null && C.cause !== "exhausted";
    let V = new Set(filtered.map((D) => D.id));
    this.updateRemoteJobs((D) =>
      mergePendingRemoteJobs(
        D,
        L ? [...filtered, ...D.filter((U) => !V.has(U.id) && !U.id.startsWith("remote-pending-"))] : filtered,
      ),
    );
    this.#f("remoteListHasOlder", (D) => (L ? D : x));
    if (this.#i > 0) {
      this.#f("remoteListFailure", (D) => (sameCloudListFailure(D, C) ? D : C));
      this.#f("remoteListLoaded", () => true);
    }
  }
  markRemoteRow(h, E) {
    return this.#N((k) => {
      let C = k.get(h) ?? EMPTY_ROW_MARK;
      let x = E(C);
      return x.group === C.group && x.pinned === C.pinned ? EMPTY_MARKS_MAP : new Map([[h, x]]);
    });
  }
  regroupRemoteRows(h, group) {
    return this.#N((k) => {
      let C = new Map();
      for (let [x, T] of k)
        if (T.group === h)
          C.set(x, {
            ...T,
            group,
          });
      return C;
    });
  }
  #N(h) {
    let E = h(this.#e.readCloudRowMarks());
    if (E.size === 0) return Promise.resolve(true);
    let remoteJobs = this.#t.remoteJobs;
    let C = this.#e.saveCloudRowMarks(
      h,
      new Set(remoteJobs.map((remoteJob) => remoteRowIdOf(remoteJob) ?? remoteJob.id)),
      this.#n,
    );
    if (remoteJobs.some((remoteJob) => E.has(remoteRowIdOf(remoteJob) ?? remoteJob.id)))
      this.updateRemoteJobs((x) =>
        x.map((T) => {
          let A = E.get(remoteRowIdOf(T) ?? T.id);
          return A
            ? {
                ...T,
                state: {
                  ...T.state,
                  group: A.group,
                  pinned: A.pinned ?? false,
                },
              }
            : T;
        }),
      );
    return C;
  }
  async stopRemote(h) {
    let sessionId = h.state.sessionId;
    let k = {
      expiry: Date.now() + REMOTE_STOP_TTL_MS,
      lastPoll: this.#E,
    };
    this.#b.set(h.id, k);
    this.updateRemoteJobs((C) =>
      C.map((x) =>
        x.id === h.id && !isSettled(x.state)
          ? {
              ...x,
              state: {
                ...x.state,
                state: "stopped",
                tempo: "idle",
                needs: undefined,
                detail: x.state.detail,
              },
              activity: "stopped",
            }
          : x,
      ),
    );
    try {
      if (!(await this.#e.interruptRemoteSession(sessionId))) throw Error("interrupt rejected");
      logFeatureOk("fleet_view_stop_session");
      logEvent("tengu_bg_agent_action", {
        action: lit("stop"),
        source: lit("fleet"),
        jobSessionId: sanitizeMarkName(sessionId),
      });
    } catch (error) {
      logFeatureBad("fleet_view_stop_session", "interrupt_failed");
      logForDebugging(`[fleet:remote] interrupt ${sessionId} failed: ${errorMessage(error)}`);
      if (this.#b.get(h.id) === k) {
        this.#b.delete(h.id);
        if (this.#w.has(h.id)) this.#w.set(h.id, h);
        this.updateRemoteJobs((x) =>
          x.some((T) => T.id === h.id) ? x.map((T) => (T.id === h.id ? this.#D(h) : T)) : x,
        );
      }
      this.loadRemote();
      throw error;
    }
  }
  remoteReplyLanded(h) {
    this.#b.delete(h);
    this.loadRemote();
  }
  remoteSessionOpened(h) {
    let E = this.#b.get(h);
    if (E !== undefined) E.expiry = 0;
  }
  async archiveRemote(h) {
    let sessionId = h.state.sessionId;
    this.#v.set(h.id, Date.now() + REMOTE_STOP_TTL_MS);
    this.#w.set(h.id, h);
    this.updateRemoteJobs((T) => T.filter((A) => A.id !== h.id));
    let k = (this.#_ ??= {
      left: 0,
      deleted: 0,
      failed: new Map(),
      pausedRoutines: 0,
      mayStillRun: false,
    });
    k.left++;
    let C = "archive_failed";
    try {
      let T = await this.#e.removeRemoteSession(sessionId, this.#n);
      k.pausedRoutines += T.pausedRoutines;
      k.mayStillRun ||= T.mayStillRun !== null;
      if (T.failure !== null) {
        C = T.failure;
        throw Error("archive rejected");
      }
      if (T.mayStillRun !== null) logFeatureSad("fleet_view_archive_session", T.mayStillRun);
      else logFeatureOk("fleet_view_archive_session");
      logEvent("tengu_bg_agent_action", {
        action: lit("archive"),
        source: lit("fleet"),
        jobSessionId: sanitizeMarkName(sessionId),
      });
      k.deleted++;
      k.failed.delete(h.id);
    } catch (error) {
      k.failed.set(h.id, C);
      let burst = this.#V(k);
      logFeatureBad("fleet_view_archive_session", C);
      logForDebugging(`[fleet:remote] archive ${sessionId} failed (${C}): ${errorMessage(error)}`);
      let L = this.#w.get(h.id);
      if (this.#v.delete(h.id) && L !== undefined)
        this.updateRemoteJobs((V) =>
          h.id.startsWith("remote-pending-") || V.some((D) => D.id === h.id) ? V : [...V, this.#D(L)],
        );
      this.loadRemote();
      throw new ArchiveRejectedError(burst);
    } finally {
      this.#w.delete(h.id);
    }
    return this.#V(k);
  }
  #V(h) {
    if (--h.left > 0 || this.#_ !== h) return null;
    this.#_ = null;
    let { left, failed, ...C } = h;
    let x = [...failed.values()];
    return {
      ...C,
      failed: failed.size,
      ofProject: count(x, (T) => T === PROJECT_SESSION),
      maybeOfProject: count(x, (T) => T === PROJECT_UNKNOWN),
    };
  }
  async renameRemote(h, E, k) {}
}
//@ chunk-93kwxas0.js:37835-38080 placement
/**
 * 取或创建这次访问的 FleetRoster；storageV5 不同时报错并保留原实例。
 */
function ensureFleetRoster(h, storageV5) {
  if (h.roster) {
    if (!h.roster.usesStorage(storageV5))
      logError(
        Error(
          "[fleet:roster] ensureFleetRoster called with a different storageV5 than the visit was created with; keeping the original",
        ),
      );
    return h.roster;
  }
  return (h.roster = new FleetRoster({
    storageV5,
  }));
}
//@ chunk-93kwxas0.js:38080-38102 placement
var HOVER_POLL_MS = 100;
var EMPTY_SET = new Set();
//@ chunk-93kwxas0.js:38102-38215 placement
/**
 * 选择状态初始值（焦点、折叠、完成上限等）。
 */
function createInitialSelectionState(collapsed) {
  return {
    focusedIdx: 0,
    hoverFocusIdx: null,
    collapsed,
    capExpanded: EMPTY_SET,
    draftPick: false,
    followOrigin: null,
  };
}
//@ chunk-93kwxas0.js:38215-38363 placement
/**
 * 旧格式的折叠键补上 state:/directory: 前缀。
 */
function normalizeCollapsedKeys(collapsed) {
  let E = FLEET_BUCKETS;
  return new Set(
    collapsed.map((k) =>
      k === "pinned" || /^(state|directory|group):/.test(k)
        ? k
        : `${E.includes(k) ? "state" : "directory"}:${k}`,
    ),
  );
}
//@ chunk-93kwxas0.js:38363-43414 placement
/**
 * 附加/新建会话控制器（附加中、提升、新会话尝试）。
 */
class FleetAttachController {
  #n;
  #e;
  #l = createSignal();
  #t;
  #r = 0;
  #i = null;
  #c = null;
  #s = null;
  #a = [];
  #o = false;
  #m = new Map();
  #g = new Map();
  #u = null;
  #d = [];
  #S = 0;
  #k = null;
  #h = null;
  #y = null;
  #T = null;
  #E = new Map();
  #R = null;
  #v = false;
  #b = null;
  constructor(h) {
    this.#n = h.roster;
    this.#e = h.storageV5;
    this.#t = createInitialSelectionState(
      h.collapsed && h.collapsed.length > 0 ? normalizeCollapsedKeys(h.collapsed) : EMPTY_SET,
    );
  }
  getSnapshot = () => this.#t;
  subscribe = (h) => this.#l.subscribe(h);
  #p(h) {
    let E = this.#t;
    let k = {
      ...E,
      ...h,
    };
    if (
      k.focusedIdx === E.focusedIdx &&
      k.hoverFocusIdx === E.hoverFocusIdx &&
      k.collapsed === E.collapsed &&
      k.capExpanded === E.capExpanded &&
      k.draftPick === E.draftPick &&
      k.followOrigin === E.followOrigin
    )
      return;
    this.#t = k;
    this.#l.emit();
  }
  attachView(h) {
    this.#r++;
    this.#i = h.clock;
    this.#c = h.onError;
    let E = false;
    return () => {
      if (E) return;
      E = true;
      this.#r--;
      if (this.#r === 0) this.#x();
    };
  }
  #x() {
    this.#u?.();
    this.#u = null;
    let h = this.#d;
    this.#d = [];
    this.#I().finally(() => {
      for (let E of h) E();
    });
    this.#i = null;
    this.#c = null;
    this.followId = null;
    this.followOrigin = null;
    this.#a = [];
    this.#o = false;
    this.#S = 0;
    this.#k = null;
    this.#h = null;
    this.#R = null;
    this.#v = false;
    this.#b = null;
    this.#t = createInitialSelectionState(this.#t.collapsed);
  }
  focus(focusedIdx) {
    this.#p({
      focusedIdx,
    });
  }
  navigateTo(h, E) {
    this.#w(h, E);
    this.#p({
      focusedIdx: h,
      hoverFocusIdx: null,
    });
  }
  jumpToHeader(h, E) {
    this.#b = h;
    this.navigateTo(h, E);
  }
  takeRevealAtTop(h) {
    let E = this.#b === h;
    this.#b = null;
    return E;
  }
  hoverTo(h, E) {
    this.#w(h, E);
    this.#p({
      focusedIdx: h,
      hoverFocusIdx: h,
    });
  }
  followPick(focusedIdx, E) {
    this.#s = E?.kind === "job" ? E.job.id : E?.kind === "earlier" ? E.entry.sessionId : null;
    this.#p({
      focusedIdx,
      hoverFocusIdx: null,
      draftPick: true,
      followOrigin: null,
    });
  }
  returnPickTo(h) {
    this.#y = h;
    this.#T = null;
  }
  releasePick(h, E, k) {
    let C = this.#y;
    let x = this.#T;
    let index = h.findIndex((V) =>
      x
        ? V.kind === "header" && V.group === x
        : (V.kind === "job" && V.job.id === C) || (V.kind === "earlier" && V.entry.sessionId === C),
    );
    let A = index >= 0 ? index : E;
    let L = h[A];
    if (k && this.#s && L?.kind === "header" && L.group !== this.#R) {
      this.followId = this.#s;
      return;
    }
    this.followId = index >= 0 ? C : null;
    this.followOrigin = index >= 0 ? x : null;
    this.#p({
      focusedIdx: A,
      hoverFocusIdx: null,
    });
  }
  sessionListedAs(h, E) {
    this.#E.set(h, E);
  }
  #w(h, E) {
    this.followId = E?.kind === "job" ? E.job.id : null;
    this.followOrigin = E?.kind === "header" ? E.group : null;
    if (h !== this.#t.focusedIdx) this.#R = this.followOrigin;
  }
  get followId() {
    return this.#s;
  }
  set followId(h) {
    this.#s = h;
    this.#y = h;
    this.#T = this.followOrigin;
    if (h) this.#R = null;
    this.#p({
      draftPick: false,
    });
  }
  get followOrigin() {
    return this.#t.followOrigin;
  }
  set followOrigin(h) {
    this.#T = h;
    this.#p({
      followOrigin: h,
    });
  }
  clearFollow() {
    this.#s = null;
    this.#p({
      draftPick: false,
      followOrigin: null,
    });
  }
  setHoverFocusIdx(hoverFocusIdx) {
    this.#p({
      hoverFocusIdx,
    });
  }
  clampFocus(h) {
    this.#p({
      focusedIdx: clamp(this.#t.focusedIdx, 0, Math.max(0, h - 1)),
    });
  }
  syncRows(h) {
    this.#a = h;
    this.#o = false;
    for (let [T, A] of this.#E)
      if (h.some((L) => L.kind === "job" && L.job.id === A)) {
        if (this.#s === T) this.#s = A;
        if (this.#y === T) this.#y = A;
        if (this.#h === T) this.#h = A;
        this.#E.delete(T);
      } else if (
        !this.#n.getSnapshot().remoteJobs.some((remoteJob) => remoteJob.id === T || remoteJob.id === A)
      )
        this.#E.delete(T);
    let { focusedIdx, followOrigin } = this.#t;
    if (followOrigin) {
      let index = h.findIndex((A) => A.kind === "header" && A.group === followOrigin);
      if (index >= 0 && index !== focusedIdx) this.#_(index);
      if (index < 0)
        this.#p({
          followOrigin: null,
        });
      return;
    }
    if (!this.#s) return;
    let C = this.#s;
    let index = h.findIndex(
      (T) => (T.kind === "job" && T.job.id === C) || (T.kind === "earlier" && T.entry.sessionId === C),
    );
    if (index < 0) {
      this.#s = null;
      return;
    }
    if (index !== focusedIdx) {
      logForDebugging(`[FV-poll] follow re-pin moved focus: was=${focusedIdx} now=${index} followId=${C}`);
      this.#_(index);
    }
  }
  #_(h) {
    let { focusedIdx, hoverFocusIdx } = this.#t;
    this.#p({
      focusedIdx: h,
      hoverFocusIdx: hoverFocusIdx === focusedIdx ? h : hoverFocusIdx,
    });
  }
  focusedRow() {
    return this.#a[this.#t.focusedIdx];
  }
  get reorderIssued() {
    return this.#o;
  }
  beginReorder(followId, E) {
    this.followId = followId;
    this.#o = true;
    this.#_(E);
  }
  queueOrderWrites(h, E) {
    let k = E === "state" ? this.#g : this.#m;
    for (let [x, T] of h) {
      k.set(x, T);
      this.#d.push(this.#n.holdJob(x));
    }
    this.#u?.();
    let C = this.#i?.setTimeout ?? defaultSetTimeout;
    this.#u = C(() => {
      this.#u = null;
      this.#n.bumpGen();
      let x = this.#d;
      this.#d = [];
      this.#I().finally(() => {
        for (let T of x) T();
        if (this.#r > 0) this.#n.reload();
      });
    }, HOVER_POLL_MS);
  }
  #I() {
    let list = Array.from(this.#m);
    let list_2 = Array.from(this.#g);
    this.#m.clear();
    this.#g.clear();
    if (list.length === 0 && list_2.length === 0) return Promise.resolve();
    let k = this.#e;
    return withSortOrderLock(() =>
      Promise.all([
        ...list.map(([C, x]) => writeSortOrder(getJobDir(C), x, k)),
        ...list_2.map(([C, x]) => writeStateSortOrder(getJobDir(C), x, k)),
      ]),
    )
      .then(() => {
        logFeatureOk("fleet_view_reorder_job");
      })
      .catch((error) => {
        logError(error);
        this.#c?.(`Couldn't save order \u2014 ${errorMessage(error)}`);
        logFeatureBad("fleet_view_reorder_job", "write_sort_order_failed");
      });
  }
  toggleCollapsed(h, E) {
    let k = new Set(this.#t.collapsed);
    if (k.has(h)) {
      k.delete(h);
      this.#p({
        collapsed: k,
      });
      return;
    }
    k.add(h);
    let capExpanded = this.#t.capExpanded;
    this.#p({
      collapsed: k,
      capExpanded:
        E !== null && capExpanded.has(E) ? new Set([...capExpanded].filter((x) => x !== E)) : capExpanded,
    });
  }
  uncollapse(...h) {
    let collapsed = this.#t.collapsed;
    if (!h.some((C) => collapsed.has(C))) return;
    let k = new Set(collapsed);
    for (let C of h) k.delete(C);
    this.#p({
      collapsed: k,
    });
  }
  renameCollapsedKey(h, E) {
    let collapsed = this.#t.collapsed;
    if (!collapsed.has(h)) return;
    let C = new Set(collapsed);
    C.delete(h);
    C.add(E);
    this.#p({
      collapsed: C,
    });
  }
  expandCap(h) {
    if (this.#t.capExpanded.has(h)) return;
    this.#p({
      capExpanded: new Set(this.#t.capExpanded).add(h),
    });
  }
  get restoreAttempts() {
    return this.#S;
  }
  set restoreAttempts(h) {
    this.#S = h;
  }
  get restoreCountedJobs() {
    return this.#k;
  }
  set restoreCountedJobs(h) {
    this.#k = h;
  }
  get savedFocusJobId() {
    return this.#h;
  }
  set savedFocusJobId(h) {
    this.#h = h;
  }
  isFirstQueryOfLook() {
    if (this.#v) return false;
    this.#v = true;
    return true;
  }
}
//@ chunk-93kwxas0.js:43414-43499 placement
function ensureFleetSelection(h, roster, storageV5, collapsed) {
  return (h.selection ??= new FleetAttachController({
    roster,
    storageV5,
    collapsed,
  }));
}
//@ chunk-93kwxas0.js:43499-43514 placement
var EMPTY_WARMING_SET = new Set();
//@ chunk-93kwxas0.js:43514-43591 placement
function initialLiveStatus() {
  return {
    attachingJobId: null,
    newSessionOpening: false,
    autoOpened: false,
  };
}
//@ chunk-93kwxas0.js:43591-45557 placement
/**
 * 会话实时状态存储（预热中的 job 等）。
 */
class FleetLiveStatusStore {
  #n = createSignal();
  #e = {
    ...initialLiveStatus(),
    warmingJobIds: EMPTY_WARMING_SET,
  };
  #l = 0;
  #t = new Map();
  #r = null;
  #i = 0;
  #c = 0;
  #s = null;
  #a = null;
  #o = null;
  #m = 0;
  #g = null;
  #u = new Set();
  getSnapshot = () => this.#e;
  subscribe = (h) => this.#n.subscribe(h);
  #d(h) {
    let E = this.#e;
    let k = {
      ...E,
      ...h,
    };
    if (
      k.attachingJobId === E.attachingJobId &&
      k.newSessionOpening === E.newSessionOpening &&
      k.warmingJobIds === E.warmingJobIds &&
      k.autoOpened === E.autoOpened
    )
      return;
    this.#e = k;
    this.#n.emit();
  }
  attachView() {
    this.#l++;
    let h = false;
    return () => {
      if (h) return;
      h = true;
      this.#l--;
      if (this.#l === 0) {
        this.#r = null;
        this.#i++;
        this.#c++;
        this.#s = null;
        this.#a = null;
        this.#o = null;
        this.#g = null;
        this.#u.clear();
        this.#e = {
          ...this.#e,
          ...initialLiveStatus(),
        };
      }
    };
  }
  arm(attachingJobId, E) {
    this.#r = E;
    this.#d({
      attachingJobId,
    });
  }
  disarm() {
    let h = this.#r;
    this.#r = null;
    this.#d({
      attachingJobId: null,
    });
    return h;
  }
  nextRespawnAttempt() {
    return ++this.#i;
  }
  isCurrentRespawnAttempt(h) {
    return this.#i === h;
  }
  abandonRespawnAttempt() {
    this.#i++;
  }
  getWarming(h) {
    return this.#t.get(h);
  }
  trackWarming(h, E) {
    this.#t.set(h, E);
    this.#S();
    E.then(() => {
      if (this.#t.get(h) === E) {
        this.#t.delete(h);
        this.#S();
      }
    });
  }
  dropWarming(h) {
    if (this.#t.delete(h)) this.#S();
  }
  #S() {
    this.#d({
      warmingJobIds: this.#t.size === 0 ? EMPTY_WARMING_SET : new Set(this.#t.keys()),
    });
  }
  get forkRefusedJobId() {
    return this.#s;
  }
  set forkRefusedJobId(h) {
    this.#s = h;
  }
  get restartOfferedJobId() {
    return this.#a;
  }
  set restartOfferedJobId(h) {
    this.#a = h;
  }
  get deadEpochOfferedJobId() {
    return this.#o;
  }
  set deadEpochOfferedJobId(h) {
    this.#o = h;
    this.#m = h === null ? 0 : Date.now();
  }
  deadEpochOfferAgeMs() {
    return this.#o === null ? 1 / 0 : Date.now() - this.#m;
  }
  get deadEpochGoneJobId() {
    return this.#g;
  }
  set deadEpochGoneJobId(h) {
    this.#g = h;
  }
  isPromoting(h) {
    return this.#u.has(h);
  }
  beginPromote(h) {
    this.#u.add(h);
  }
  endPromote(h) {
    this.#u.delete(h);
  }
  releasePromoted(h) {
    for (let E of this.#u) if (h.has(E)) this.#u.delete(E);
  }
  beginNewSession() {
    this.#d({
      newSessionOpening: true,
    });
    return ++this.#c;
  }
  isCurrentNewSessionAttempt(h) {
    return this.#c === h;
  }
  endNewSession() {
    this.#d({
      newSessionOpening: false,
    });
  }
  abandonNewSession() {
    this.#c++;
    this.#d({
      newSessionOpening: false,
    });
  }
  markAutoOpened() {
    this.#d({
      autoOpened: true,
    });
  }
}
//@ chunk-93kwxas0.js:45557-45597 placement
function ensureFleetLiveStatus(h) {
  return (h.attach ??= new FleetLiveStatusStore());
}
//@ chunk-93kwxas0.js:45597-45837 placement
/**
 * 删除不再被任何消息引用的粘贴内容（默认只删图片）。
 */
function prunePastedContents(h, E, { pruneTextPastes: k = false } = {}) {
  let values = Object.values(h);
  function x(A) {
    return k || A.type === "image";
  }
  if (!values.some(x)) return;
  let T = new Set();
  for (let A of E) for (let L of parsePastedRefs(A)) T.add(L.id);
  for (let A of values) if (x(A) && !T.has(A.id)) delete h[A.id];
}
export {
  jobSortKey_2,
  jobSortKey,
  sortJobs,
  remoteRowIdOf,
  isRemoteRowId,
  ensureFleetRoster,
  ensureFleetSelection,
  ensureFleetLiveStatus,
  canonicalRepoRoot,
  CloudListFailureNotice,
  CLOUD_LIST_ATTEMPTS,
  isOtherLocalDaemonJob,
  jobTempo,
  emitFinishedJobs,
  terminalTitle,
  prepareFatalExit,
  reportFatalAndExit,
  markJobFinished,
  resolveDispatchPermissionMode,
  prunePastedContents,
  validChildren,
  jobOutcome,
  returnFalse_2,
  STUCK_AFTER_MS,
  FLEET_BUCKET_LABELS,
  DONE_CAP_TITLE_ROWS,
  jobPreviewText,
  isTerminalDetail,
  jobBucket,
  FLEET_BUCKETS,
  DONE_CAP_MIN,
  computeDoneCap,
  doneFoldIndex,
  DONE_CAP_SLACK,
  layoutRows,
  bestSearchMatchIndex,
  initialFocusIndex,
  isFailedSettledJob,
  statTranscript,
  stripJobPreviewText,
  shortenPath,
  FLEET_BUCKET_HINTS,
  hasNonDefaultDispatchSettings,
  DispatchDefaultsLine,
};
