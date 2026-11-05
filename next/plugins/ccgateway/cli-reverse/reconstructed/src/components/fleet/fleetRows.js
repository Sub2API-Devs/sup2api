/**
 * components/fleet/fleetRows.ts
 *
 * 2.1.316 新增：会话名单存储：轮询本地/远程会话、待创建项、状态与 PR，提供订阅快照；附加/新建会话控制器（附加中、提升、新会话尝试）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-avy0g5d4.js (79)
 * attribution: placement 78, layout 1
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
import { getInitialSettings, hasSkipDangerousModePermissionPrompt } from "../../utils/settings/settings.js";
import {
  permissionModeFromString,
  permissionModeSymbol,
  permissionModeIndicator,
} from "../../utils/permissions/PermissionMode.js";
import { isBypassPermissionsModeDisabled } from "../../utils/permissions/permissionSetup.js";
import { isBypassPermissionsAccepted } from "../../utils/permissions/bypassPermissionsAccepted.js";
import { parseEffortFlag } from "../../utils/effort.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { record, stringSchema, objectSchema, booleanSchema } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { getProjectDir } from "../../utils/sessionStoragePortable.js";
import { rankJobNameMatch } from "../../cli/bg/bgDispatch.js";
import { findCanonicalGitRoot } from "../../utils/git.js";
import { tildify } from "../../utils/path.js";
import { countWhere } from "../../utils/collections.js";
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
import { useState, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { defaultSetTimeout } from "../../ink/components/ClockContext.js";
import { sleep } from "../../utils/sleep.js";
import { getRootSession, getLastInteractionTime } from "../../bootstrap/state.js";
import { startClockInterval } from "../../ink/components/Input.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { getTerminalFocused } from "../../ink/terminal-focus-state.js";
import { takeSpareHandle, markSpareReady } from "../../cli/bg/bgSpare.js";
import { getPlatform } from "../../utils/platform.js";
import { clamp } from "../../ink/screen.js";
import { parsePastedRefs } from "../../history.js";

//@ chunk-avy0g5d4.js:8120-8190 placement
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
//@ chunk-avy0g5d4.js:8190-8515 placement
/**
 * Agents 视图致命错误：清理终端模式、打印错误、刷新日志后退出。
 */
async function reportFatalAndExit(error) {
  process.exitCode = 1;
  let cleanupModule = await import("../../utils/gracefulShutdown.js").catch(() => {
    return;
  });
  cleanupModule?.cleanupTerminalModes();
  try {
    writeSync(
      2,
      sequential.red(stripControlChars(errorMessage(error))) +
        `
`,
    );
  } catch {}
  try {
    let { initSinks } = await import("../../utils/sinks.js");
    initSinks();
  } catch {}
  logError(error);
  if (cleanupModule === undefined) return cliError();
  await cleanupModule.gracefulShutdown(1, "other", {
    suppressResumeHint: true,
  });
}
//@ chunk-avy0g5d4.js:8515-8976 placement
/**
 * 计算派发会话的权限模式（继承、bypass 可用性）。
 */
function resolveDispatchPermissionMode(dispatchDefaults) {
  let agent = dispatchDefaults?.agent ?? getInitialSettings().agent;
  if (!dispatchDefaults && !agent) return;
  let requestedMode = dispatchDefaults?.permissionMode
    ? permissionModeFromString(dispatchDefaults.permissionMode)
    : undefined;
  let bypassDisabled = isBypassPermissionsModeDisabled();
  let bypassAccepted = !bypassDisabled && isBypassPermissionsAccepted();
  let skipPrompt = !bypassDisabled && hasSkipDangerousModePermissionPrompt();
  let defaultMode = dispatchDefaults?.permissionModeInherited ? requestedMode : "default";
  let permissionMode =
    requestedMode === "bypassPermissions" && !bypassAccepted
      ? skipPrompt
        ? defaultMode
        : undefined
      : requestedMode;
  let allowBypass = dispatchDefaults?.allowBypass && bypassAccepted ? true : undefined;
  let level = dispatchDefaults?.effort ? parseEffortFlag(dispatchDefaults.effort).level : undefined;
  if (!permissionMode && !dispatchDefaults?.model && !level && !agent && !allowBypass) return;
  return {
    permissionMode,
    permissionModeInherited: permissionMode ? dispatchDefaults?.permissionModeInherited : undefined,
    model: dispatchDefaults?.model,
    effort: level,
    agent,
    allowBypass,
  };
}
//@ chunk-avy0g5d4.js:8976-9105 placement
/**
 * 派发默认值里是否有非默认项（权限模式、模型、effort、agent、bypass）。
 */
function hasNonDefaultDispatchSettings(defaults) {
  return (
    (!!defaults.permissionMode &&
      defaults.permissionMode !== "default" &&
      !isInheritedBypassUnavailable(defaults)) ||
    !!defaults.model ||
    !!defaults.effort ||
    !!defaults.agent ||
    !!defaults.allowBypass
  );
}
//@ chunk-avy0g5d4.js:9105-10019 placement
/**
 * 显示派发默认值（权限模式、模型、effort、agent）。
 */
function DispatchDefaultsLine(props) {
  let $ = useMemoCache(20);
  let { defaults } = props;
  let { permissionMode, model, effort, agent, allowBypass } = defaults;
  let hasMode;
  if ($[0] !== defaults || $[1] !== permissionMode) {
    hasMode = !!permissionMode && permissionMode !== "default" && !isInheritedBypassUnavailable(defaults);
    $[0] = defaults;
    $[1] = permissionMode;
    $[2] = hasMode;
  } else hasMode = $[2];
  let hasMode_2 = hasMode;
  let bypassAvailable = allowBypass && !hasMode_2;
  if (!hasMode_2 && !model && !effort && !agent && !bypassAvailable) {
    return null;
  }
  let modeText;
  if ($[3] !== permissionMode || $[4] !== hasMode_2) {
    modeText =
      hasMode_2 &&
      jsxProd_default_2(Text, {
        color: themeColorOf(permissionMode),
        children: [permissionModeSymbol(permissionMode), " ", permissionModeIndicator(permissionMode)],
      });
    $[3] = permissionMode;
    $[4] = hasMode_2;
    $[5] = modeText;
  } else modeText = $[5];
  let bypassText;
  if ($[6] !== bypassAvailable) {
    bypassText =
      bypassAvailable &&
      jsxProd_default_2(Text, {
        color: themeColorOf("bypassPermissions"),
        children: [permissionModeSymbol("bypassPermissions"), " bypass available"],
      });
    $[6] = bypassAvailable;
    $[7] = bypassText;
  } else bypassText = $[7];
  let agentText;
  if ($[8] !== agent) {
    agentText =
      agent &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["@", agent],
      });
    $[8] = agent;
    $[9] = agentText;
  } else agentText = $[9];
  let modelText;
  if ($[10] !== model) {
    modelText =
      model &&
      jsxProd_default(Text, {
        dimColor: true,
        children: model,
      });
    $[10] = model;
    $[11] = modelText;
  } else modelText = $[11];
  let effortText;
  if ($[12] !== effort) {
    effortText =
      effort &&
      jsxProd_default(Text, {
        dimColor: true,
        children: effort,
      });
    $[12] = effort;
    $[13] = effortText;
  } else effortText = $[13];
  let line;
  if (
    $[14] !== modeText ||
    $[15] !== bypassText ||
    $[16] !== agentText ||
    $[17] !== modelText ||
    $[18] !== effortText
  ) {
    line = jsxProd_default_2(Byline, {
      children: [modeText, bypassText, agentText, modelText, effortText],
    });
    $[14] = modeText;
    $[15] = bypassText;
    $[16] = agentText;
    $[17] = modelText;
    $[18] = effortText;
    $[19] = line;
  } else line = $[19];
  return line;
}
//@ chunk-avy0g5d4.js:10019-10120 placement
/**
 * 继承来的 bypassPermissions 模式在当前不可用。
 */
function isInheritedBypassUnavailable(defaults) {
  return (
    defaults.permissionMode === "bypassPermissions" &&
    defaults.permissionModeInherited === true &&
    !isBypassPermissionsAccepted()
  );
}
//@ chunk-avy0g5d4.js:10120-10167 placement
function isOtherLocalDaemonJob(job, originJobId) {
  return isLocalDaemonAgent(job.state) && job.id !== originJobId;
}
//@ chunk-avy0g5d4.js:10167-10243 placement
function markJobFinished(resultSeen, entryChannel) {
  let channel = entryChannel ?? "unknown";
  resultSeen.entryChannel = fromEnum(channel);
  resultSeen.openFinished = null;
}
//@ chunk-avy0g5d4.js:10243-10798 placement
/**
 * 为新完成的会话发出一次性事件。
 */
function emitFinishedJobs(resultSeen, snapshot, emitEvent = logEvent) {
  let nowMs = snapshot.now ?? Date.now();
  if (resultSeen.openFinished === null)
    resultSeen.openFinished = new Set(snapshot.allFinished.map((job) => job.id));
  let openFinished = resultSeen.openFinished;
  for (let job of snapshot.visibleFinished) {
    if (resultSeen.emitted.has(job.id)) continue;
    resultSeen.emitted.add(job.id);
    let dateMs = parseDateMs(job.state.firstTerminalAt);
    let seenAtMs = dateMs ?? parseDateMs(job.state.updatedAt) ?? nowMs;
    emitEvent("tengu_bg_result_seen", {
      trigger: openFinished.has(job.id) ? lit("list_open") : lit("render"),
      outcome: fromEnumOpt(terminalOutcome(job.state.state)),
      overlap: overlapsAnotherJob(job, snapshot.allCandidates, nowMs),
      entry_channel: resultSeen.entryChannel,
      seen_latency_ms: Math.max(0, nowMs - seenAtMs),
      terminal_at_missing: dateMs === null,
      jobSessionId: sanitizeMarkName(job.state.sessionId),
    });
  }
}
//@ chunk-avy0g5d4.js:10798-10881 placement
function parseDateMs(value) {
  if (!value) return null;
  let timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}
//@ chunk-avy0g5d4.js:10881-11134 placement
/**
 * 该会话的运行区间与其他会话重叠。
 */
function overlapsAnotherJob(job, allCandidates, nowMs) {
  let dateMs = parseDateMs(job.state.createdAt);
  if (dateMs === null) return false;
  let terminalMs = parseDateMs(job.state.firstTerminalAt) ?? nowMs;
  return allCandidates.some((otherJob) => {
    if (otherJob.id === job.id) return false;
    let dateMs_2 = parseDateMs(otherJob.state.createdAt);
    if (dateMs_2 === null) return false;
    let otherTerminalMs = parseDateMs(otherJob.state.firstTerminalAt) ?? nowMs;
    return dateMs < otherTerminalMs && dateMs_2 < terminalMs;
  });
}
//@ chunk-avy0g5d4.js:11134-11684 placement
/**
 * 把对等会话记录转换为 job 状态。
 */
function peerToJobState(peer) {
  let createdAt = new Date(peer.startedAt).toISOString();
  let updatedAt = new Date(peer.updatedAt ?? peer.startedAt).toISOString();
  return {
    state: peer.state ?? peer.status ?? "running",
    detail: peer.detail ?? peer.waitingFor ?? "",
    tempo: peer.tempo ?? (peer.status === "busy" ? "active" : peer.status === "waiting" ? "blocked" : "idle"),
    needs: peer.needs,
    output: null,
    children: null,
    linkScanOffset: 0,
    template: peer.agent ?? peer.entrypoint ?? "interactive",
    respawnFlags: [],
    name: peer.name,
    intent: peer.name ?? "",
    sessionId: peer.sessionId ?? "",
    cwd: peer.cwd,
    originCwd: peer.cwd,
    createdAt,
    updatedAt,
    firstTerminalAt: null,
    backend: "peer",
    sock: peer.sock,
    pid: peer.pid,
  };
}
//@ chunk-avy0g5d4.js:11684-11862 placement
/**
 * 名单轮询间隔：按是否活跃与距上次变化的时间分档。
 */
function rosterPollInterval(terminalFocused, idleMs) {
  if (terminalFocused) {
    if (idleMs < 30000) return 15000;
    if (idleMs < 300000) return 60000;
    return 180000;
  }
  if (idleMs < 30000) return 60000;
  if (idleMs < 600000) return 300000;
  if (idleMs < 3600000) return 900000;
  return 1800000;
}
//@ chunk-avy0g5d4.js:11898-12285 placement
/**
 * 查询会话转录文件的存在与修改时间。
 */
async function statTranscript(filePath, sessionId) {
  let transcriptStorageKey = getTranscriptStorageKey(filePath, sessionId);
  if (transcriptStorageKey !== undefined) {
    let metaResult = await transcriptStorageKey.backend.statMeta(transcriptStorageKey.key);
    if (metaResult.ok)
      return {
        kind: "present",
        mtimeMs: metaResult.value.mtimeMs,
      };
    let error = metaResult.error;
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
    mtimeMs: (await stat(filePath)).mtimeMs,
  };
}
//@ chunk-avy0g5d4.js:12285-12684 placement
/**
 * 读取会话转录末尾若干字节。
 */
async function readTranscriptTail(filePath, maxBytes, sessionId) {
  let transcriptStorageKey = getTranscriptStorageKey(filePath, sessionId);
  if (transcriptStorageKey !== undefined) {
    let readResult = await transcriptStorageKey.backend.read([
      {
        key: transcriptStorageKey.key,
        tail: maxBytes,
      },
    ]);
    if (!readResult.ok)
      throw Error("fleet view transcript tail read failed", {
        cause: readResult.error,
      });
    let streamItem = readResult.value.items[0];
    if (!streamItem.found) throw Error("fleet view transcript tail: stream not found");
    return {
      content: Buffer.from(streamItem.value).toString("utf8"),
      bytesRead: streamItem.value.byteLength,
      bytesTotal: streamItem.totalBytes,
    };
  }
  return tailFile(filePath, maxBytes);
}
//@ chunk-avy0g5d4.js:12720-12810 placement
var MAX_TAIL_ENTRIES = 7;
var MAX_SCAN_BYTES = 1048576;
var TAIL_OVERLAP_BYTES = 16;
var SCHEDULED_FIRE_MARKER = '"subtype":"scheduled_task_fire"';
var TIMESTAMP_RE = /"timestamp":"([^"]+)"/;
//@ chunk-avy0g5d4.js:12810-12873 placement
function emptyScanState() {
  return {
    scanStates: new Map(),
    inFlightScans: new Set(),
  };
}
//@ chunk-avy0g5d4.js:12873-14389 placement
/**
 * 增量扫描转录文件尾部（按 inode/偏移缓存）。
 */
async function scanTranscriptTail(tracker, filePath) {
  let { scanStates, inFlightScans } = tracker;
  if (inFlightScans.has(filePath)) return null;
  inFlightScans.add(filePath);
  try {
    let handle = await open(filePath, "r");
    try {
      let { size, ino } = await handle.stat();
      let scanState = scanStates.get(filePath);
      if (scanState && (scanState.ino !== ino || scanState.offset > size)) scanState = undefined;
      if (scanState && scanState.tail.length > 0) {
        let tailBuffer = Buffer.alloc(scanState.tail.length);
        let { bytesRead } = await handle.read(
          tailBuffer,
          0,
          tailBuffer.length,
          scanState.offset - tailBuffer.length,
        );
        if (bytesRead !== tailBuffer.length || !tailBuffer.equals(scanState.tail)) scanState = undefined;
      }
      if (!scanState) {
        scanState = {
          ino,
          offset: 0,
          tail: Buffer.alloc(0),
          count: 0,
          recent: [],
        };
        scanStates.set(filePath, scanState);
      }
      if (size > scanState.offset) {
        let count = scanState.count;
        let sliced = scanState.recent.slice();
        let readBuffer = Buffer.alloc(Math.min(MAX_SCAN_BYTES, size - scanState.offset));
        let carryOver = null;
        let offset = scanState.offset;
        let offset_2 = scanState.offset;
        let tail = scanState.tail;
        while (offset < size) {
          let { bytesRead } = await handle.read(
            readBuffer,
            0,
            Math.min(readBuffer.length, size - offset),
            offset,
          );
          if (bytesRead <= 0) break;
          let chunk = readBuffer.subarray(0, bytesRead);
          let carryLength = carryOver ? carryOver.length : 0;
          let joinedText = carryOver ? Buffer.concat([carryOver, chunk]) : chunk;
          let lineStart = 0;
          let index = joinedText.indexOf(10, carryLength);
          while (index !== -1) {
            let str = joinedText.toString("utf-8", lineStart, index);
            if (str.includes(SCHEDULED_FIRE_MARKER)) {
              let match = str.match(TIMESTAMP_RE);
              let fireAtMs = match ? Date.parse(match[1]) : NaN;
              if (Number.isFinite(fireAtMs)) {
                count++;
                sliced.push(fireAtMs);
                if (sliced.length > MAX_TAIL_ENTRIES) sliced.shift();
              }
            }
            lineStart = index + 1;
            index = joinedText.indexOf(10, lineStart);
          }
          offset_2 += lineStart;
          offset += bytesRead;
          if (lineStart >= TAIL_OVERLAP_BYTES)
            tail = Buffer.from(joinedText.subarray(lineStart - TAIL_OVERLAP_BYTES, lineStart));
          else if (lineStart > 0) {
            let buffer = Buffer.concat([tail, joinedText.subarray(0, lineStart)]);
            tail = buffer.subarray(Math.max(0, buffer.length - TAIL_OVERLAP_BYTES));
          }
          carryOver = lineStart < joinedText.length ? Buffer.from(joinedText.subarray(lineStart)) : null;
        }
        if (offset_2 > scanState.offset) {
          scanState.offset = offset_2;
          scanState.count = count;
          scanState.recent = sliced;
          scanState.tail = tail;
        }
      }
      let { count, recent } = scanState;
      if (recent.length < 2)
        return {
          count,
          nextAt: null,
        };
      let gaps = [];
      for (let idx = 1; idx < recent.length; idx++) gaps.push(recent[idx] - recent[idx - 1]);
      gaps.sort((gapA, gapB) => gapA - gapB);
      let medianGap = gaps[Math.floor(gaps.length / 2)];
      let nextAtMs = recent.at(-1) + medianGap;
      return {
        count,
        nextAt: nextAtMs > Date.now() ? nextAtMs : null,
      };
    } finally {
      await handle.close();
    }
  } finally {
    inFlightScans.delete(filePath);
  }
}
//@ chunk-avy0g5d4.js:14389-14475 placement
function pruneScanStates(tracker, liveKeys) {
  for (let key of tracker.scanStates.keys()) if (!liveKeys.has(key)) tracker.scanStates.delete(key);
}
//@ chunk-avy0g5d4.js:14475-14484 placement
var CLOUD_LIST_ATTEMPTS = 2;
//@ chunk-avy0g5d4.js:14484-14782 placement
/**
 * 云会话列表失败原因：exhausted / no_sign_in / status / no_answer / unknown。
 */
function classifyCloudListFailure(error) {
  if (error instanceof CloudListPartialError_2) return classifyCloudListFailure(error.cause);
  if (error instanceof CloudListPartialError)
    return {
      cause: "exhausted",
    };
  if (error instanceof Error && error.name === "CloudSessionAccessError")
    return {
      cause: "no_sign_in",
    };
  let { kind, status } = classifyAxiosError(error);
  return status !== undefined
    ? {
        cause: "status",
        status,
      }
    : {
        cause: kind === "other" ? "unknown" : "no_answer",
      };
}
//@ chunk-avy0g5d4.js:14782-14922 placement
/**
 * 两个列表失败原因是否相同。
 */
function sameCloudListFailure(previous, next) {
  if (previous === null || next === null) return previous === next;
  return (
    previous.cause === next.cause &&
    (previous.cause !== "status" || next.cause !== "status" || previous.status === next.status)
  );
}
//@ chunk-avy0g5d4.js:14922-15113 placement
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
//@ chunk-avy0g5d4.js:15113-15142 placement
var REMOTE_ROW_ID_RE = /^remote-[\w-]{1,8}$/;
//@ chunk-avy0g5d4.js:15142-15175 placement
function isRemoteRowId(id) {
  return REMOTE_ROW_ID_RE.test(id);
}
//@ chunk-avy0g5d4.js:15175-15279 placement
/**
 * 会话对应的远程行 id。
 */
function remoteRowIdOf(fleetRow) {
  if (isRemoteRowId(fleetRow.id)) return fleetRow.id;
  return CCR_SESSION_ID_RE.test(fleetRow.state.sessionId) ? remoteRowId(fleetRow.state.sessionId) : undefined;
}
//@ chunk-avy0g5d4.js:15279-15387 placement
/**
 * 会话分组/置顶偏好的 schema（字符串键 → {group, pinned}）。
 */
var JOB_PREFS_SCHEMA = DoctorLazy(() =>
  record(
    stringSchema(),
    objectSchema({
      group: stringSchema().optional().catch(undefined),
      pinned: booleanSchema().optional().catch(undefined),
    }).catch({}),
  ),
);
//@ chunk-avy0g5d4.js:15387-15417 layout
function deleteMethodName(backend) {
  return "delete";
}
//@ chunk-avy0g5d4.js:15417-15463 placement
var PROJECT_SESSION = "project_session";
var PROJECT_UNKNOWN = "project_unknown";
//@ chunk-avy0g5d4.js:15463-15547 placement
class ArchiveRejectedError extends Error {
  burst;
  constructor(burst) {
    super("archive rejected");
    this.burst = burst;
  }
}
//@ chunk-avy0g5d4.js:15576-15673 placement
function withoutMissingKeys(previous, keepKeys) {
  let pruned;
  for (let key of previous.keys()) if (!keepKeys.has(key)) (pruned ??= new Map(previous)).delete(key);
  return pruned ?? previous;
}
//@ chunk-avy0g5d4.js:15673-15732 placement
function validChildren(children) {
  return children?.filter((child) => !ANY_CONTROL_CHAR_RE.test(child.href)) ?? [];
}
//@ chunk-avy0g5d4.js:15732-15746 placement
var STUCK_AFTER_MS = 180000;
//@ chunk-avy0g5d4.js:15746-16150 placement
/**
 * 判断会话结果（成功/失败）。
 */
function jobOutcome(job, prStatuses) {
  let outcome = terminalOutcome(job.state);
  if (outcome && job.tempo !== "active" && !(outcome === "success" && isSelfDriving(job))) return outcome;
  let filtered = validChildren(job.children).filter((child) => child.kind !== "frame");
  if (
    prStatuses &&
    job.tempo !== "active" &&
    job.template === DEFAULT_BG_AGENT_TEMPLATE.name &&
    filtered.length &&
    filtered.every((child) => prStatuses.get(child.href)?.state === "MERGED")
  )
    return "success";
  let stuckFactor = job.tempo === "active" ? 1 : 5;
  let idleMs = Date.now() - Date.parse(job.updatedAt);
  if (idleMs < stuckFactor * STUCK_AFTER_MS) return "flowing";
  if (idleMs < stuckFactor * 15 * 60000) return "slowing";
  return "stuck";
}
//@ chunk-avy0g5d4.js:16150-16327 placement
/**
 * 会话 tempo：active/completed/blocked。
 */
function jobTempo(state, status) {
  if (status === "busy") return "active";
  if (isSettled(state) && !(terminalOutcome(state.state) === "success" && isSelfDriving(state)))
    return "completed";
  if (state.tempo === "blocked" || status === "waiting") return "blocked";
  return "active";
}
//@ chunk-avy0g5d4.js:16327-16705 placement
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
//@ chunk-avy0g5d4.js:16705-16788 placement
function terminalTitle(awaitingCount) {
  return awaitingCount > 0 ? `${awaitingCount} awaiting input \xB7 claude agents` : "claude agents";
}
//@ chunk-avy0g5d4.js:16788-17235 placement
/**
 * 计算会话所属分区。
 */
function jobBucket(job, prStatuses, status) {
  if (status === "busy") return "working";
  if (job.activity === "failure") return "done";
  if (job.activity === "stopped") return "done";
  if (status === "waiting") return "blocked";
  if (
    !isSelfDriving(job.state) &&
    validChildren(job.state.children).some((child) => {
      let prStatus = prStatuses?.get(child.href);
      if (prStatus?.state !== "OPEN") return false;
      let prStatusColor = getPrStatusColor(prStatus);
      return prStatusColor === "error" || (prStatusColor === "warning" && prStatus.review !== "APPROVED");
    })
  )
    return "review";
  if (job.activity === "success") return "done";
  if (job.state.tempo === "blocked") return "blocked";
  return "working";
}
//@ chunk-avy0g5d4.js:17235-17259 placement
function returnFalse_2(state) {
  return false;
}
//@ chunk-avy0g5d4.js:17259-17344 placement
function isFailedSettledJob(state) {
  let outcome = terminalOutcome(state.state);
  return (outcome === "failure" || outcome === "stopped") && isSettled(state) && !isExecLaunch(state);
}
//@ chunk-avy0g5d4.js:17344-17376 placement
function jobStatusKey(jobId) {
  return `job:${jobId}`;
}
//@ chunk-avy0g5d4.js:17376-17467 placement
function statusForJob(statuses, job) {
  return statuses.get(job.state.resumeSessionId ?? job.state.sessionId) ?? statuses.get(jobStatusKey(job.id));
}
//@ chunk-avy0g5d4.js:17467-18002 placement
/**
 * 从转录行提取可预览的文本。
 */
function transcriptLinePreview(line) {
  try {
    let entry = jsonParse(line);
    if (entry.type === "assistant") {
      let text = (entry.message?.content ?? []).find((block) => block.type === "text")?.text;
      if (text) return text;
    }
    if (entry.type === "user") {
      let content = entry.message?.content;
      let rawText =
        typeof content === "string" ? content : content?.find((block) => block.type === "text")?.text;
      let userText = rawText
        ? stripSystemTags(rawText)
            .split(
              `
`,
            )
            .find((line) => line.trim())
            ?.trim()
        : undefined;
      if (userText) return `> ${userText}`;
      if (Array.isArray(content)) {
        let found = content.find(
          (failedResult) => failedResult.type === "tool_result" && failedResult.is_error,
        );
        if (found) {
          let errorText =
            typeof found.content === "string"
              ? found.content
              : found.content?.find((block) => block.type === "text")?.text;
          if (errorText) return `\u2717 ${getFirstLine(errorText)}`;
        }
      }
    }
  } catch {}
  return null;
}
//@ chunk-avy0g5d4.js:18002-18098 placement
function stripSystemTags(text) {
  return text.replace(/<(system-reminder|task-notification)>[\s\S]*?(<\/\1>|$)/g, " ");
}
//@ chunk-avy0g5d4.js:18098-18137 placement
function isTerminalDetail(detail) {
  return detail === SEED_DETAIL || detail === IDLE_DETAIL;
}
//@ chunk-avy0g5d4.js:18137-18239 placement
/**
 * 预览文本去掉标签、特殊字符并压缩空白。
 */
function stripJobPreviewText(previewText) {
  return stripSystemTags(stripAnsiPerLine(previewText))
    .replace(/<\/?[\w-]+>/g, " ")
    .replace(CONTROL_CHARS_EXCEPT_WS_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}
//@ chunk-avy0g5d4.js:18239-18281 placement
function jobPreviewText(state, text) {
  return returnFalse_2(state) ? sanitizeAttentionText(text) : stripJobPreviewText(text);
}
//@ chunk-avy0g5d4.js:18281-18426 placement
/**
 * 会话可能的 transcript 路径（cwd 与 worktree 各一个）。
 */
function jobTranscriptPaths(state) {
  let transcriptName = `${state.resumeSessionId ?? state.sessionId}.jsonl`;
  let cwdCandidates = state.worktreePath ? [state.cwd, state.worktreePath] : [state.cwd];
  return normalizeCaseForComparison_2(cwdCandidates.map((cwd) => join(getProjectDir(cwd), transcriptName)));
}
//@ chunk-avy0g5d4.js:18426-18628 placement
/**
 * 读会话 transcript 尾部，返回最后一行预览文本。
 */
async function readJobLastLine(job, sessionId) {
  for (let transcriptPath of jobTranscriptPaths(job.state))
    try {
      let { content } = await readTranscriptTail(transcriptPath, 16384, sessionId);
      let filtered = content
        .split(
          `
`,
        )
        .map(transcriptLinePreview)
        .filter((previewLine) => previewLine !== null);
      return (
        filtered.filter((previewLine, lineIndex) => previewLine !== filtered[lineIndex - 1]).at(-1) ?? ""
      ).trim();
    } catch {}
  return "";
}
//@ chunk-avy0g5d4.js:18628-20701 placement
/**
 * 按分区/分组布局行（空分区提示、完成折叠）。
 */
function layoutRows(jobs, groupOf, options) {
  let {
    byState,
    byGroup,
    onRemoteTab,
    launcherGroup,
    scopedFallbackOrigin,
    doneFoldAt,
    emptyBucketHint,
    earlier = [],
  } = options;
  let rows = [];
  if (byState && emptyBucketHint) {
    let doneCount = 0;
    let earlierIndex = 0;
    let doneEarlier = byState && !onRemoteTab ? earlier : [];
    for (let bucket of FLEET_BUCKETS) {
      let filtered = jobs.filter((job) => groupOf.get(job.id) === bucket);
      if (bucket === "review" && filtered.length === 0) continue;
      rows.push({
        kind: "header",
        origin: scopedFallbackOrigin,
        group: bucket,
      });
      for (let job of filtered) {
        if (bucket === "done") {
          while (
            earlierIndex < doneEarlier.length &&
            doneEarlier[earlierIndex].modified.getTime() > latestJobTimestamp(job.state)
          ) {
            if (doneCount++ < doneFoldAt)
              rows.push({
                kind: "earlier",
                entry: doneEarlier[earlierIndex],
                origin: scopedFallbackOrigin,
                group: "done",
              });
            earlierIndex++;
          }
          if (doneCount++ >= doneFoldAt) continue;
        }
        rows.push({
          kind: "job",
          job,
          origin: spawnOrigin(job.state),
          group: bucket,
        });
      }
      if (bucket === "done")
        while (earlierIndex < doneEarlier.length) {
          if (doneCount++ < doneFoldAt)
            rows.push({
              kind: "earlier",
              entry: doneEarlier[earlierIndex],
              origin: scopedFallbackOrigin,
              group: "done",
            });
          earlierIndex++;
        }
    }
    let max = Math.max(0, doneCount - doneFoldAt);
    if (max > 0)
      rows.push({
        kind: "fold",
        origin: scopedFallbackOrigin,
        group: "done",
        hidden: max,
      });
    return {
      rows,
      doneCount,
      doneFoldHidden: max,
    };
  }
  let needsLauncherHeader =
    !byState && !byGroup && !onRemoteTab && !jobs.some((job) => groupOf.get(job.id) === launcherGroup);
  let doneCount = 0;
  let doneEarlier = byState && !onRemoteTab ? earlier : [];
  let earlierIndex = 0;
  let pushWithinCap = (row) => {
    if (doneCount++ >= doneFoldAt) return;
    rows.push(row);
  };
  for (let idx = 0; idx < jobs.length; idx++) {
    let job = jobs[idx];
    let group = groupOf.get(job.id);
    let origin = spawnOrigin(job.state);
    if (idx === 0 || group !== groupOf.get(jobs[idx - 1].id)) {
      if (needsLauncherHeader && group !== "pinned") {
        rows.push({
          kind: "header",
          origin: scopedFallbackOrigin,
          group: launcherGroup,
        });
        needsLauncherHeader = false;
      }
      let origin_2 =
        byState || byGroup || group === "pinned" || group === launcherGroup ? scopedFallbackOrigin : origin;
      rows.push({
        kind: "header",
        origin: origin_2,
        group,
      });
    }
    if (group === "done") {
      while (
        earlierIndex < doneEarlier.length &&
        doneEarlier[earlierIndex].modified.getTime() > latestJobTimestamp(job.state)
      ) {
        pushWithinCap({
          kind: "earlier",
          entry: doneEarlier[earlierIndex],
          origin: scopedFallbackOrigin,
          group: "done",
        });
        earlierIndex++;
      }
      pushWithinCap({
        kind: "job",
        job,
        origin,
        group,
      });
      continue;
    }
    rows.push({
      kind: "job",
      job,
      origin,
      group,
    });
  }
  if (earlierIndex < doneEarlier.length) {
    if (doneCount === 0)
      rows.push({
        kind: "header",
        origin: scopedFallbackOrigin,
        group: "done",
      });
    while (earlierIndex < doneEarlier.length) {
      pushWithinCap({
        kind: "earlier",
        entry: doneEarlier[earlierIndex],
        origin: scopedFallbackOrigin,
        group: "done",
      });
      earlierIndex++;
    }
  }
  if (needsLauncherHeader && jobs.length > 0)
    rows.push({
      kind: "header",
      origin: scopedFallbackOrigin,
      group: launcherGroup,
    });
  let pendingEarlier = !byState && !onRemoteTab ? earlier : [];
  if (pendingEarlier.length > 0) {
    rows.push({
      kind: "header",
      origin: scopedFallbackOrigin,
      group: EARLIER,
    });
    let max = Math.max(0, Math.min(doneFoldAt, pendingEarlier.length));
    for (let entry of pendingEarlier.slice(0, max))
      rows.push({
        kind: "earlier",
        entry,
        origin: scopedFallbackOrigin,
        group: EARLIER,
      });
    let hiddenEarlier = pendingEarlier.length - max;
    if (hiddenEarlier > 0)
      rows.push({
        kind: "fold",
        origin: scopedFallbackOrigin,
        group: EARLIER,
        hidden: hiddenEarlier,
      });
    return {
      rows,
      doneCount: pendingEarlier.length,
      doneFoldHidden: hiddenEarlier,
    };
  }
  let hiddenDone = doneCount > doneFoldAt ? doneCount - doneFoldAt : 0;
  if (hiddenDone > 0)
    rows.push({
      kind: "fold",
      origin: scopedFallbackOrigin,
      group: "done",
      hidden: hiddenDone,
    });
  return {
    rows,
    doneCount,
    doneFoldHidden: hiddenDone,
  };
}
//@ chunk-avy0g5d4.js:20701-20984 placement
/**
 * 初始焦点行：首个远程会话，或来源会话、earlier 行。
 */
function initialFocusIndex(rows, launcherCwd) {
  let index = rows.findIndex((row) => row.kind === "job" && row.job.state.backend === "remote");
  if (index !== -1) return index;
  let secondRow = rows[1];
  if (secondRow?.kind === "job" && secondRow.origin === launcherCwd) return 1;
  if (secondRow?.kind === "earlier") return 1;
  let index_2 = rows.findIndex((row) => row.kind === "earlier");
  return index_2 !== -1 && !rows.some((row) => row.kind === "job") ? index_2 : 0;
}
//@ chunk-avy0g5d4.js:20984-21188 placement
/**
 * 按搜索得分找最匹配的行。
 */
function bestSearchMatchIndex(rows, query) {
  let bestIndex = 0;
  let bestRank = -1;
  for (let [rowIndex, row] of rows.entries()) {
    if (row.kind !== "job" && row.kind !== "earlier") continue;
    let rank = query
      ? rankJobNameMatch(
          row.kind === "job"
            ? row.job.state
            : {
                name: row.entry.title,
                intent: "",
              },
          query,
        )
      : 0;
    if (rank > bestRank) {
      bestRank = rank;
      bestIndex = rowIndex;
    }
  }
  return bestIndex;
}
//@ chunk-avy0g5d4.js:21188-21226 placement
var DONE_CAP_MIN = 3;
var DONE_CAP_SLACK = 3;
var DONE_MERGE_WINDOW_MS = 60000;
var DONE_CAP_RESERVED = 8;
var DONE_CAP_TITLE_ROWS = 4;
var DONE_CAP_COMPACT_TITLE_ROWS = 2;
//@ chunk-avy0g5d4.js:21226-21366 placement
/**
 * 按剩余高度计算已完成分区可显示的行数，不够时用紧凑标题。
 */
function computeDoneCap(termRows, nonDoneRows) {
  let capFor = (titleRows) => termRows - DONE_CAP_RESERVED - titleRows - nonDoneRows;
  let doneCap = capFor(DONE_CAP_TITLE_ROWS);
  if (doneCap >= DONE_CAP_MIN)
    return {
      doneCap,
      compactHeader: false,
    };
  return {
    doneCap: Math.max(0, capFor(DONE_CAP_COMPACT_TITLE_ROWS)),
    compactHeader: true,
  };
}
//@ chunk-avy0g5d4.js:21366-21448 placement
function canonicalRepoRoot(state) {
  if (state.backend === "remote") return spawnOrigin(state);
  let origin = spawnOrigin(state);
  return findCanonicalGitRoot(origin) ?? origin;
}
//@ chunk-avy0g5d4.js:21448-21476 placement
function shortenPath(group) {
  return tildify(group);
}
//@ chunk-avy0g5d4.js:21476-21535 placement
function jobSortKey(state) {
  return state.sortOrder ?? Date.parse(state.createdAt);
}
//@ chunk-avy0g5d4.js:21535-21661 placement
/**
 * 排序键：stateSortOrder 或（done 用终止时间，其余用更新时间）。
 */
function jobSortKey_2(state, group) {
  return (
    state.stateSortOrder ??
    Date.parse(
      group === "done" ? (state.lastTerminalAt ?? state.firstTerminalAt ?? state.updatedAt) : state.updatedAt,
    )
  );
}
//@ chunk-avy0g5d4.js:21661-21815 placement
/**
 * 会话最近的有效时间戳（终止/首次终止/更新/创建）。
 */
function latestJobTimestamp(state) {
  for (let timestamp of [state.lastTerminalAt, state.firstTerminalAt, state.updatedAt, state.createdAt])
    if (timestamp) {
      let timestamp_2 = Date.parse(timestamp);
      if (Number.isFinite(timestamp_2)) return timestamp_2;
    }
  return 0;
}
//@ chunk-avy0g5d4.js:21815-22311 placement
/**
 * 计算已完成会话折叠的位置。
 */
function doneFoldIndex({ done: doneJobs, earlier, doneCap, initialJobId, linkMatchId }) {
  let totalDone = doneJobs.length + earlier.length;
  if (totalDone < doneCap + DONE_CAP_SLACK) return 1 / 0;
  let sortKeyOf = (job) => jobSortKey_2(job.state, "done");
  let min = Math.min(doneCap, doneJobs.length);
  if (min > 0) {
    let boundaryKey = sortKeyOf(doneJobs[min - 1]);
    while (min < doneJobs.length && boundaryKey - sortKeyOf(doneJobs[min]) < DONE_MERGE_WINDOW_MS) min++;
  }
  let mapped = doneJobs.map((job) => latestJobTimestamp(job.state));
  let mapped_2 = earlier.map((entry) => {
    let time = entry.modified.getTime();
    return mapped.findIndex((jobTime) => time > jobTime);
  });
  let earlierBefore = (doneIndex) =>
    countWhere(mapped_2, (insertAt) => insertAt !== -1 && insertAt <= doneIndex);
  let max = Math.max(min, doneCap);
  let max_2 = Math.max(
    doneJobs.findIndex((job) => job.id === initialJobId),
    doneJobs.findIndex((job) => job.id === linkMatchId),
  );
  let protectedIndex = max_2 < 0 ? -1 : max_2 + earlierBefore(max_2);
  if (totalDone - max < DONE_CAP_SLACK || protectedIndex >= max) return 1 / 0;
  return max;
}
//@ chunk-avy0g5d4.js:22311-22376 placement
function sortJobs(jobs) {
  return [...jobs].sort((jobA, jobB) => jobSortKey(jobA.state) - jobSortKey(jobB.state));
}
//@ chunk-avy0g5d4.js:22376-22390 placement
var REMOTE_STOP_TTL_MS = 120000;
//@ chunk-avy0g5d4.js:22390-22418 placement
var POLL_INTERVAL_MS = 2000;
var STATUS_POLL_MS = 500;
var LOAD_TIMEOUT_MS = 30000;
//@ chunk-avy0g5d4.js:22418-22437 placement
var SESSION_IDLE_TTL_MS = 30000;
var MAX_LIST_FAILURES = 15;
//@ chunk-avy0g5d4.js:22437-23244 placement
/**
 * 组装 Agents 视图的后端操作（列出 job、存活 daemon 会话、远程会话、中断等）。
 */
function createFleetBackend() {
  return {
    listJobs: requestNudgeOnce,
    listAliveDaemonJobs: (options) => listAliveDaemonJobs(options),
    adoptRosterOrphans: (first, second, third) => adoptRosterOrphans(first, second, third),
    listAllLiveSessions: (options) => listAllLiveSessions(options),
    listRemoteSessions: (options) => emptyMergedJobs(options),
    interruptRemoteSession: (sessionId) =>
      import("../../utils/teleport.lazy.js").then((remoteSessionsModule) =>
        remoteSessionsModule.interruptRemoteSession(sessionId),
      ),
    removeRemoteSession: (sessionId, options) =>
      Promise.resolve({
        failure: "gate_off",
        pausedRoutines: 0,
        mayStillRun: null,
      }),
    updateRemoteSessionTitle: async (sessionId, title) => false,
    readCloudRowMarks: () => EMPTY_MARKS_MAP,
    saveCloudRowMarks: (first, second, third) => Promise.resolve(false),
    readLogTail: (job, sessionId) => readJobLastLine(job, sessionId),
    probeFleetTranscript: (filePath, sessionId) => statTranscript(filePath, sessionId),
    scanLoopTranscript: (tracker, filePath) => scanTranscriptTail(tracker, filePath),
    fetchPrStatusBatch: (jobs) => buildPrStatusQuery(jobs),
    fetchPrStatusByUrl: (url) => fetchPrStatusByUrl(url),
    loadPrStatusCache: (cachePath) => loadPrStatusCache(cachePath),
    persistPrStatusCache: (cachePath, cache) => persistPrStatusCache(cachePath, cache),
    touchFleetViewHeartbeat: (heartbeatPath) => touchFleetViewHeartbeat(heartbeatPath),
    clearFleetViewHeartbeat: (heartbeatPath) => clearFleetViewHeartbeat(heartbeatPath),
    watchJobDirOnce: (dir, options) => watchJobDirOnce(dir, options),
  };
}
//@ chunk-avy0g5d4.js:23244-23265 placement
var EMPTY_ROW_MARK = {};
var EMPTY_MARKS_MAP = new Map();
//@ chunk-avy0g5d4.js:23265-23539 placement
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
//@ chunk-avy0g5d4.js:23539-37888 placement
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
  #u = false;
  #s = [];
  #a = null;
  #o = 0;
  #m = 0;
  #g = 0;
  #c = new Set();
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
  constructor(options) {
    this.#n = options?.storageV5;
    this.#e = {
      ...createFleetBackend(),
      ...options?.client,
    };
  }
  getSnapshot = () => this.#t;
  usesStorage(storageV5) {
    return this.#n === storageV5;
  }
  subscribe = (listener) => this.#l.subscribe(listener);
  #f(field, updater) {
    let previous = this.#t[field];
    let next = updater(previous);
    if (Object.is(next, previous)) return;
    this.#t = {
      ...this.#t,
      [field]: next,
    };
    this.#l.emit();
  }
  #A(callback, delayMs) {
    return (this.#r?.setTimeout ?? defaultSetTimeout)(callback, delayMs);
  }
  attachView(view) {
    this.#i++;
    if (this.#i === 1) this.#B(view);
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      this.#i--;
      if (this.#i === 0) this.#J();
    };
  }
  setRemoteWanted(wanted) {
    if (wanted === this.#u) return;
    this.#u = wanted;
    if (this.#i === 0) return;
    if (wanted) this.#L();
    else {
      this.#a?.();
      this.#a = null;
    }
  }
  #B(view) {
    this.#r = view;
    this.#y = 0;
    if (this.#t.prStatuses.size === 0)
      this.#e.loadPrStatusCache(this.#n).then((cachedMarks) => {
        if (cachedMarks.size)
          this.#F((current) => (current.size ? new Map([...cachedMarks, ...current]) : cachedMarks));
      });
    this.load();
    this.#s.push(
      startClockInterval(view, () => void this.load(), POLL_INTERVAL_MS),
      startClockInterval(view, this.#H, STATUS_POLL_MS),
      startClockInterval(
        view,
        () => {
          this.#u;
        },
        POLL_INTERVAL_MS,
      ),
    );
    if (this.#u) this.#L();
  }
  #L() {
    if (!this.#r) return;
    this.#f("remoteJobs", (jobs) => {
      let mapped = jobs.map((job) => {
        let outcome = jobOutcome(job.state);
        return outcome === job.activity
          ? job
          : {
              ...job,
              activity: outcome,
            };
      });
      return mapped.every((job, jobIndex) => job === jobs[jobIndex]) ? jobs : mapped;
    });
    this.loadRemote();
    this.#a?.();
    this.#a = startClockInterval(this.#r, this.loadRemote, LOAD_TIMEOUT_MS);
  }
  #J() {
    for (let stopTimer of this.#s) stopTimer();
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
    let previous = this.#t;
    let settledRemoteJobs = previous.remoteJobs.some((remoteJob) =>
      remoteJob.id.startsWith("remote-pending-"),
    )
      ? previous.remoteJobs.filter((remoteJob) => !remoteJob.id.startsWith("remote-pending-"))
      : previous.remoteJobs;
    if (
      previous.pendings.length > 0 ||
      settledRemoteJobs !== previous.remoteJobs ||
      previous.remoteListLoaded ||
      previous.remoteListFailure !== null ||
      previous.overlaidLoadLanded
    ) {
      this.#t = {
        ...previous,
        pendings: previous.pendings.length > 0 ? [] : previous.pendings,
        remoteJobs: settledRemoteJobs,
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
  isDeleting(jobId) {
    return this.#c.has(jobId);
  }
  deleteRefusalOf = (jobId) => this.#t.deleteRefusals.get(jobId);
  isDeletingSession(sessionId) {
    return this.#S.has(sessionId);
  }
  isHolding(jobId) {
    return this.#h.has(jobId);
  }
  isArchiving(jobId) {
    return this.#v.has(jobId);
  }
  isRetitling(jobId) {
    return this.#x.has(jobId);
  }
  liveStatus(job) {
    let { sessionId, resumeSessionId } = job.state;
    if (isExecLaunch(job.state)) return job.state.tempo === "active" ? "busy" : undefined;
    if (job.state.backend === "remote")
      return job.state.tempo === "active" ? "busy" : job.state.tempo === "blocked" ? "waiting" : undefined;
    if (this.#C.has(resumeSessionId ?? sessionId)) return "busy";
    if (this.#t.pendings.some((pending) => pending.state.sessionId === sessionId)) return "busy";
    let status =
      this.terminalHolderOf(job) !== undefined
        ? this.#t.statuses.get(jobStatusKey(job.id))
        : statusForJob(this.#t.statuses, job);
    if (status) return status;
    if (this.#I.has(sessionId)) return "busy";
    return;
  }
  terminalHolderOf(job) {
    if (job.state.backend === "peer" || job.state.backend === "remote") return;
    return this.#t.terminalHolders.get(job.state.resumeSessionId ?? job.state.sessionId);
  }
  bumpGen() {
    this.#m = ++this.#o;
  }
  resetPrFetchGate() {
    this.#y = 0;
  }
  holdJob = (jobId) => {
    this.#m = ++this.#o;
    this.#h.set(jobId, (this.#h.get(jobId) ?? 0) + 1);
    return () => {
      this.#m = ++this.#o;
      let remaining = (this.#h.get(jobId) ?? 1) - 1;
      if (remaining <= 0) this.#h.delete(jobId);
      else this.#h.set(jobId, remaining);
    };
  };
  optimistic = (update, deletingJobId, holdJobId) => {
    this.#m = ++this.#o;
    if (deletingJobId) {
      this.#c.add(deletingJobId);
      let found = this.#t.jobs?.find((job) => job.id === deletingJobId);
      if (found) {
        let filtered = [found.state.sessionId, found.state.resumeSessionId].filter((sessionId) =>
          Boolean(sessionId),
        );
        this.#d.set(deletingJobId, filtered);
        for (let sessionId of filtered) this.#S.add(sessionId);
      }
    }
    let releaseHold = holdJobId ? this.holdJob(holdJobId) : undefined;
    this.updateJobs((jobs) => (jobs ? update(jobs) : jobs));
    return deletingJobId || releaseHold
      ? () => {
          if (deletingJobId) {
            this.#m = ++this.#o;
            this.#c.delete(deletingJobId);
            for (let sessionId of this.#d.get(deletingJobId) ?? []) this.#S.delete(sessionId);
            this.#d.delete(deletingJobId);
          }
          releaseHold?.();
        }
      : undefined;
  };
  noteDeleteRefusal = (jobId, notice) => {
    this.#k.delete(jobId);
    this.#f("deleteRefusals", (refusals) => {
      if (notice === null && !refusals.has(jobId)) return refusals;
      let nextRefusals = new Map(refusals);
      if (notice === null) nextRefusals.delete(jobId);
      else nextRefusals.set(jobId, notice);
      return nextRefusals;
    });
  };
  updateJobs(updater) {
    this.#f("jobs", updater);
  }
  updateAdoptedPeers(updater) {
    this.#f("adoptedPeers", updater);
  }
  updateRemoteJobs(updater) {
    this.#f("remoteJobs", updater);
  }
  #D(row) {
    return row;
  }
  dropRemoteJobs() {
    this.#R = this.#E;
    this.#w.clear();
    this.#_ = null;
    this.#f("remoteJobs", (jobs) => (jobs.length > 0 ? [] : jobs));
    this.#f("remoteListHasOlder", () => false);
  }
  updatePendings(updater) {
    this.#f("pendings", updater);
  }
  #F(updater) {
    let prStatuses = this.#t.prStatuses;
    this.#f("prStatuses", updater);
    if (this.#t.prStatuses !== prStatuses) this.#e.persistPrStatusCache(this.#t.prStatuses, this.#n);
  }
  seedJobs(jobs) {
    this.updateJobs((previous) => {
      let mapped = jobs
        .filter((job) => !this.#c.has(job.id))
        .map((job) => ({
          ...job,
          activity: jobOutcome(job.state),
        }));
      let heldMap =
        previous && this.#h.size > 0
          ? new Map(previous.filter((job) => this.#h.has(job.id)).map((job) => [job.id, job]))
          : null;
      return sortJobs(heldMap ? mapped.map((job) => heldMap.get(job.id) ?? job) : mapped);
    });
  }
  settleLandedPendings(pendings) {
    let landedIds = new Set(pendings.map((pending) => pending.id));
    for (let pending of pendings) {
      let sessionId = pending.state.sessionId;
      this.#I.add(sessionId);
      this.#A(() => this.#I.delete(sessionId), SESSION_IDLE_TTL_MS);
    }
    this.updatePendings((pendings) => pendings.filter((pending) => !landedIds.has(pending.id)));
  }
  kick(sessionId, jobId) {
    let kicked = {
      kickedAt: Date.now(),
      jobId,
    };
    this.#C.set(sessionId, kicked);
    this.#A(() => {
      if (this.#C.get(sessionId) === kicked) {
        this.#C.delete(sessionId);
        this.#f("statuses", (statuses) => new Map(statuses));
      }
    }, SESSION_IDLE_TTL_MS);
    return () => {
      if (this.#C.get(sessionId) === kicked) this.#C.delete(sessionId);
    };
  }
  watchPendingJobDir(jobId) {
    this.#O?.();
    this.#O = this.#e.watchJobDirOnce(jobId, () => void this.load());
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
    let generation = ++this.#o;
    let [listed, daemonListing] = await Promise.all([
      this.#e.listJobs(this.#n),
      this.#e.listAliveDaemonJobs(this.#n),
    ]);
    if (listed !== null) this.#g = 0;
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
    let mapped = markCrashed(
      await this.#e.adoptRosterOrphans(listed ?? [], daemonListing.records, this.#n),
      daemonListing.shorts,
    )
      .filter((job) => !this.#c.has(job.id))
      .map((job) => ({
        ...job,
        activity: jobOutcome(job.state, this.#t.prStatuses),
      }));
    if (generation <= this.#m) return;
    this.#m = generation;
    if (this.#i > 0) this.#f("overlaidLoadLanded", () => true);
    this.updateJobs((previous) => {
      let heldMap =
        previous && this.#h.size > 0
          ? new Map(previous.filter((job) => this.#h.has(job.id)).map((job) => [job.id, job]))
          : null;
      let next = sortJobs(heldMap ? mapped.map((job) => heldMap.get(job.id) ?? job) : mapped);
      if (
        previous &&
        previous.length === next.length &&
        previous.every(
          (job, jobIndex) =>
            job.id === next[jobIndex].id &&
            job.state.updatedAt === next[jobIndex].state.updatedAt &&
            job.state.state === next[jobIndex].state.state &&
            job.state.pinned === next[jobIndex].state.pinned &&
            job.state.group === next[jobIndex].state.group &&
            job.state.stateSortOrder === next[jobIndex].state.stateSortOrder &&
            job.activity === next[jobIndex].activity,
        )
      )
        return previous;
      return next;
    });
    let filtered = mapped.filter((job) => jobTempo(job.state) !== "completed");
    let results = await Promise.all(
      filtered.map(async (job) => [job.id, await this.#e.readLogTail(job, this.#n)]),
    );
    this.#f("logTails", (tails) => {
      let nextTails = Object.fromEntries(results);
      let keys = Object.keys(tails);
      if (keys.length === results.length && keys.every((jobId) => tails[jobId] === nextTails[jobId]))
        return tails;
      return nextTails;
    });
    let filtered_2 = mapped.filter((job) => isLoopJob(job.state));
    if (filtered_2.length > 0) {
      let filtered = (
        await Promise.all(
          filtered_2.map(async (job) => {
            for (let transcriptPath of jobTranscriptPaths(job.state))
              try {
                let probe = await this.#e.probeFleetTranscript(transcriptPath, this.#n);
                if (probe.kind === "present") return [job.state.sessionId, probe.mtimeMs, transcriptPath];
                if (probe.kind !== "absent") return null;
              } catch (error) {
                if (!isPathAbsent(error)) return null;
              }
            return null;
          }),
        )
      )
        .filter((entry) => entry !== null)
        .filter(([sessionId, mtimeMs]) => {
          let kick = this.#t.loopKicks.get(sessionId);
          return !kick || kick.mtimeMs !== mtimeMs;
        });
      if (filtered.length > 0) {
        let results = await Promise.all(
          filtered.map(async ([sessionId, mtimeMs, transcriptPath]) => {
            try {
              let scan = await this.#e.scanLoopTranscript(this.#M, transcriptPath);
              return scan
                ? [
                    sessionId,
                    {
                      mtimeMs,
                      ...scan,
                    },
                  ]
                : null;
            } catch {
              return null;
            }
          }),
        );
        this.#f("loopKicks", (kicks) => {
          let changed = false;
          let nextKicks = new Map(kicks);
          for (let entry of results)
            if (entry) {
              nextKicks.set(entry[0], entry[1]);
              changed = true;
            }
          return changed ? nextKicks : kicks;
        });
      }
    }
    let childUrls = normalizeCaseForComparison_2(
      mapped.flatMap((job) =>
        validChildren(job.state.children)
          .filter((child) => child.kind !== "frame")
          .map((child) => child.href),
      ),
    );
    let filtered_3 = childUrls.filter((url) => {
      let state = this.#t.prStatuses.get(url)?.state;
      return state !== "MERGED" && state !== "CLOSED";
    });
    let now = Date.now();
    let shouldPollPrs =
      now - this.#y >= rosterPollInterval(getTerminalFocused(), now - getLastInteractionTime());
    if (filtered_3.length > 0 && shouldPollPrs) {
      this.#y = now;
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
        "tengu_fleetview_pr_batch",
        true,
      );
      (async () => {
        let nextStatuses;
        if (featureValue_CACHED_MAY_BE_STALE) {
          let prStatusBatch = await this.#e.fetchPrStatusBatch(filtered_3);
          nextStatuses = prStatusBatch.statuses;
          await Promise.all(
            prStatusBatch.unbatched.map(async (url) =>
              nextStatuses.set(url, await this.#e.fetchPrStatusByUrl(url)),
            ),
          );
        } else
          nextStatuses = new Map(
            await Promise.all(filtered_3.map(async (url) => [url, await this.#e.fetchPrStatusByUrl(url)])),
          );
        this.#F((cached) => {
          let changed = false;
          for (let [url, status] of nextStatuses) {
            let previousStatus = cached.get(url);
            if (
              previousStatus?.state !== status?.state ||
              previousStatus?.title !== status?.title ||
              previousStatus?.review !== status?.review ||
              previousStatus?.checks.passed !== status?.checks.passed ||
              previousStatus?.checks.failed !== status?.checks.failed ||
              previousStatus?.checks.pending !== status?.checks.pending ||
              previousStatus?.additions !== status?.additions ||
              previousStatus?.deletions !== status?.deletions
            ) {
              changed = true;
              break;
            }
          }
          if (!changed) return cached;
          let nextCache = new Map(cached);
          for (let [url, status] of nextStatuses)
            if (status !== null || !cached.has(url)) nextCache.set(url, status);
          return nextCache;
        });
      })().catch(logError);
    }
    if (this.#m === generation) {
      let liveSessions = new Set(mapped.map((job) => job.state.sessionId));
      let liveUrls = new Set(childUrls);
      this.#f("loopKicks", (kicks) => withoutMissingKeys(kicks, liveSessions));
      this.#F((cache) => withoutMissingKeys(cache, liveUrls));
      if (mapped.length > 0) {
        let deleteRefusals = this.#t.deleteRefusals;
        let activeDeleting = new Set(this.#c);
        for (let job of mapped) {
          if (!deleteRefusals.has(job.id)) continue;
          if (isSettled(job.state)) {
            this.#k.add(job.id);
            activeDeleting.add(job.id);
          } else if (!this.#k.has(job.id)) activeDeleting.add(job.id);
        }
        this.#f("deleteRefusals", (refusals) => withoutMissingKeys(refusals, activeDeleting));
        for (let jobId of this.#k) if (!activeDeleting.has(jobId)) this.#k.delete(jobId);
      }
      pruneScanStates(this.#M, new Set(mapped.flatMap((job) => jobTranscriptPaths(job.state))));
    }
  };
  #H = () => {
    this.#e
      .listAllLiveSessions(this.#n)
      .then((sessions) => {
        let statuses = new Map();
        let holders = new Map();
        for (let session of sessions) {
          if (
            session.kind === "interactive" &&
            session.pid !== process.pid &&
            session.sessionId &&
            session.parkedJobId === undefined
          )
            holders.set(session.sessionId, session.pid);
          if (!session.status) continue;
          if (session.sessionId) statuses.set(session.sessionId, session.status);
          if (session.jobId) statuses.set(jobStatusKey(session.jobId), session.status);
        }
        for (let key of statuses.keys()) this.#I.delete(key);
        let spareHandle = takeSpareHandle();
        if (spareHandle && sessions.some((session) => session.sessionId === spareHandle.sessionId))
          markSpareReady(spareHandle.sessionId);
        let kicksChanged = false;
        for (let [sessionId, kick] of this.#C) {
          let found = sessions.find(
            (session) => session.sessionId === sessionId || session.jobId === kick.jobId,
          );
          if (
            statuses.get(sessionId) === "busy" ||
            statuses.get(jobStatusKey(kick.jobId)) === "busy" ||
            (found !== undefined &&
              (found.statusUpdatedAt ?? 0) > kick.kickedAt &&
              found.startedAt <= kick.kickedAt)
          ) {
            this.#C.delete(sessionId);
            kicksChanged = true;
          }
        }
        this.#f("statuses", (current) =>
          !kicksChanged &&
          current.size === statuses.size &&
          [...statuses].every(([key, value]) => current.get(key) === value)
            ? current
            : statuses,
        );
        this.#f("terminalHolders", (current) =>
          current.size === holders.size && [...holders].every(([key, value]) => current.get(key) === value)
            ? current
            : holders,
        );
        if (
          isCrossSessionMessagingEnabled() &&
          getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", false)
        ) {
          let knownSessionIds = new Set((this.#t.jobs ?? []).map((job) => job.state.sessionId));
          let now = Date.now();
          let mapped = sessions
            .filter(
              (session) =>
                session.kind === "interactive" &&
                session.pid !== process.pid &&
                session.sessionId &&
                !knownSessionIds.has(session.sessionId) &&
                (session.peerProtocol ?? 0) >= PEER_PROTOCOL &&
                now - (session.updatedAt ?? session.startedAt) < 86400000,
            )
            .map((session) => {
              let peerState = peerToJobState(session);
              return {
                id: `peer-${session.pid}`,
                state: peerState,
                activity: jobOutcome(peerState),
              };
            });
          this.updateAdoptedPeers((previous) => {
            let previousById = new Map(previous.map((peer) => [peer.id, peer]));
            let mapped_2 = mapped.map((peer) => {
              let existing = previousById.get(peer.id);
              return existing &&
                existing.state.name !== peer.state.name &&
                (existing.state.updatedAt ?? "") >= (peer.state.updatedAt ?? "")
                ? {
                    ...peer,
                    state: {
                      ...peer.state,
                      name: existing.state.name,
                      intent: existing.state.intent,
                      updatedAt: existing.state.updatedAt,
                    },
                  }
                : peer;
            });
            return previous.length === mapped_2.length &&
              previous.every(
                (peer, peerIndex) =>
                  peer.id === mapped_2[peerIndex].id &&
                  peer.state.updatedAt === mapped_2[peerIndex].state.updatedAt &&
                  peer.state.name === mapped_2[peerIndex].state.name &&
                  peer.activity === mapped_2[peerIndex].activity,
              )
              ? previous
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
    let generation = ++this.#E;
    let cursor = {
      moreRemain: false,
    };
    this.#e
      .listRemoteSessions(cursor)
      .then(
        (rows) => this.#P(generation, now, rows, null, cursor.moreRemain),
        (error) => {
          let partialError = error instanceof CloudListPartialError_2 ? error : null;
          logForDebugging(
            `[fleet:remote] list failed after ${partialError?.rows.length ?? 0} rows: ${errorMessage(partialError?.cause ?? error)}`,
          );
          this.#P(generation, now, partialError?.rows ?? [], classifyCloudListFailure(error), false);
        },
      )
      .catch((error) => {
        logForDebugging(`[fleet:remote] poll mapper threw: ${errorMessage(error)}`);
        this.#P(
          generation,
          now,
          [],
          {
            cause: "unknown",
          },
          false,
        );
      });
  };
  #P(generation, nowMs, rows, failure, hasOlder) {
    if (generation <= this.#R) return;
    let pendingMarks = null;
    for (let [rowId, reply] of this.#p) if (nowMs >= reply.answeredAt) this.#p.delete(rowId);
    let filtered = rows
      .map((row) => {
        let id = remoteRowId(row.id);
        let reply = this.#p.get(id);
        let state = describeSessionAttention(
          reply
            ? {
                ...row,
                title: reply.title,
              }
            : row,
        );
        let mark = pendingMarks?.get(id);
        if (mark)
          state = {
            ...state,
            group: mark.group,
            pinned: mark.pinned,
          };
        let stopMark = this.#b.get(id);
        if (stopMark !== undefined)
          if (
            isSettled(state) ||
            (row.worker_status === "idle" && generation > stopMark.lastPoll) ||
            nowMs > stopMark.expiry
          )
            this.#b.delete(id);
          else
            state = {
              ...state,
              state: "stopped",
              tempo: "idle",
              needs: undefined,
              detail: state.detail,
            };
        return {
          id,
          state,
          activity: jobOutcome(state),
        };
      })
      .filter((job) => {
        let archivingUntil = this.#v.get(job.id);
        if (archivingUntil === undefined) return true;
        if (nowMs > archivingUntil && !this.#w.has(job.id)) {
          this.#v.delete(job.id);
          return true;
        }
        if (this.#w.has(job.id)) this.#w.set(job.id, job);
        return false;
      });
    this.#R = generation;
    let keepExisting = failure !== null && failure.cause !== "exhausted";
    let incomingIds = new Set(filtered.map((job) => job.id));
    this.updateRemoteJobs((current) =>
      mergePendingRemoteJobs(
        current,
        keepExisting
          ? [
              ...filtered,
              ...current.filter((job) => !incomingIds.has(job.id) && !job.id.startsWith("remote-pending-")),
            ]
          : filtered,
      ),
    );
    this.#f("remoteListHasOlder", (current) => (keepExisting ? current : hasOlder));
    if (this.#i > 0) {
      this.#f("remoteListFailure", (current) => (sameCloudListFailure(current, failure) ? current : failure));
      this.#f("remoteListLoaded", () => true);
    }
  }
  markRemoteRow(rowId, updater) {
    return this.#N((marks) => {
      let mark = marks.get(rowId) ?? EMPTY_ROW_MARK;
      let next = updater(mark);
      return next.group === mark.group && next.pinned === mark.pinned
        ? EMPTY_MARKS_MAP
        : new Map([[rowId, next]]);
    });
  }
  regroupRemoteRows(fromGroup, group) {
    return this.#N((marks) => {
      let changed = new Map();
      for (let [rowId, mark] of marks)
        if (mark.group === fromGroup)
          changed.set(rowId, {
            ...mark,
            group,
          });
      return changed;
    });
  }
  #N(computeMarks) {
    let nextMarks = computeMarks(this.#e.readCloudRowMarks());
    if (nextMarks.size === 0) return Promise.resolve(true);
    let remoteJobs = this.#t.remoteJobs;
    let saved = this.#e.saveCloudRowMarks(
      computeMarks,
      new Set(remoteJobs.map((remoteJob) => remoteRowIdOf(remoteJob) ?? remoteJob.id)),
      this.#n,
    );
    if (remoteJobs.some((remoteJob) => nextMarks.has(remoteRowIdOf(remoteJob) ?? remoteJob.id)))
      this.updateRemoteJobs((jobs) =>
        jobs.map((job) => {
          let mark = nextMarks.get(remoteRowIdOf(job) ?? job.id);
          return mark
            ? {
                ...job,
                state: {
                  ...job.state,
                  group: mark.group,
                  pinned: mark.pinned ?? false,
                },
              }
            : job;
        }),
      );
    return saved;
  }
  async stopRemote(job) {
    let sessionId = job.state.sessionId;
    let stopMark = {
      expiry: Date.now() + REMOTE_STOP_TTL_MS,
      lastPoll: this.#E,
    };
    this.#b.set(job.id, stopMark);
    this.updateRemoteJobs((jobs) =>
      jobs.map((row) =>
        row.id === job.id && !isSettled(row.state)
          ? {
              ...row,
              state: {
                ...row.state,
                state: "stopped",
                tempo: "idle",
                needs: undefined,
                detail: row.state.detail,
              },
              activity: "stopped",
            }
          : row,
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
      if (this.#b.get(job.id) === stopMark) {
        this.#b.delete(job.id);
        if (this.#w.has(job.id)) this.#w.set(job.id, job);
        this.updateRemoteJobs((jobs) =>
          jobs.some((row) => row.id === job.id)
            ? jobs.map((row) => (row.id === job.id ? this.#D(job) : row))
            : jobs,
        );
      }
      this.loadRemote();
      throw error;
    }
  }
  remoteReplyLanded(jobId) {
    this.#b.delete(jobId);
    this.loadRemote();
  }
  remoteSessionOpened(jobId) {
    let stopMark = this.#b.get(jobId);
    if (stopMark !== undefined) stopMark.expiry = 0;
  }
  async archiveRemote(job) {
    let sessionId = job.state.sessionId;
    this.#v.set(job.id, Date.now() + REMOTE_STOP_TTL_MS);
    this.#w.set(job.id, job);
    this.updateRemoteJobs((jobs) => jobs.filter((row) => row.id !== job.id));
    let burst = (this.#_ ??= {
      left: 0,
      archived: 0,
      failed: new Map(),
      pausedRoutines: 0,
      mayStillRun: false,
    });
    burst.left++;
    let failureCode = "archive_failed";
    try {
      let result = await this.#e.removeRemoteSession(sessionId, this.#n);
      burst.pausedRoutines += result.pausedRoutines;
      burst.mayStillRun ||= result.mayStillRun !== null;
      if (result.failure !== null) {
        failureCode = result.failure;
        throw Error("archive rejected");
      }
      if (result.mayStillRun !== null) logFeatureSad("fleet_view_archive_session", result.mayStillRun);
      else logFeatureOk("fleet_view_archive_session");
      logEvent("tengu_bg_agent_action", {
        action: lit("archive"),
        source: lit("fleet"),
        jobSessionId: sanitizeMarkName(sessionId),
      });
      burst.archived++;
      burst.failed.delete(job.id);
    } catch (error) {
      burst.failed.set(job.id, failureCode);
      let burst_2 = this.#V(burst);
      logFeatureBad("fleet_view_archive_session", failureCode);
      logForDebugging(`[fleet:remote] archive ${sessionId} failed (${failureCode}): ${errorMessage(error)}`);
      let archivedJob = this.#w.get(job.id);
      if (this.#v.delete(job.id) && archivedJob !== undefined)
        this.updateRemoteJobs((jobs) =>
          job.id.startsWith("remote-pending-") || jobs.some((row) => row.id === job.id)
            ? jobs
            : [...jobs, this.#D(archivedJob)],
        );
      this.loadRemote();
      throw new ArchiveRejectedError(burst_2);
    } finally {
      this.#w.delete(job.id);
    }
    return this.#V(burst);
  }
  #V(burst) {
    if (--burst.left > 0 || this.#_ !== burst) return null;
    this.#_ = null;
    let { left, failed, ...rest } = burst;
    let failureCodes = [...failed.values()];
    return {
      ...rest,
      failed: failed.size,
      ofProject: countWhere(failureCodes, (code) => code === PROJECT_SESSION),
      maybeOfProject: countWhere(failureCodes, (code) => code === PROJECT_UNKNOWN),
    };
  }
  async renameRemote(job, sessionId, title) {}
}
//@ chunk-avy0g5d4.js:37888-38133 placement
/**
 * 取或创建这次访问的 FleetRoster；storageV5 不同时报错并保留原实例。
 */
function ensureFleetRoster(visit, storageV5) {
  if (visit.roster) {
    if (!visit.roster.usesStorage(storageV5))
      logError(
        Error(
          "[fleet:roster] ensureFleetRoster called with a different storageV5 than the visit was created with; keeping the original",
        ),
      );
    return visit.roster;
  }
  return (visit.roster = new FleetRoster({
    storageV5,
  }));
}
//@ chunk-avy0g5d4.js:38133-38155 placement
var HOVER_POLL_MS = 100;
var EMPTY_SET = new Set();
//@ chunk-avy0g5d4.js:38155-38268 placement
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
//@ chunk-avy0g5d4.js:38268-38416 placement
/**
 * 旧格式的折叠键补上 state:/directory: 前缀。
 */
function normalizeCollapsedKeys(collapsed) {
  let buckets = FLEET_BUCKETS;
  return new Set(
    collapsed.map((key) =>
      key === "pinned" || /^(state|directory|group):/.test(key)
        ? key
        : `${buckets.includes(key) ? "state" : "directory"}:${key}`,
    ),
  );
}
//@ chunk-avy0g5d4.js:38416-43467 placement
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
  #u = null;
  #s = null;
  #a = [];
  #o = false;
  #m = new Map();
  #g = new Map();
  #c = null;
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
  constructor(options) {
    this.#n = options.roster;
    this.#e = options.storageV5;
    this.#t = createInitialSelectionState(
      options.collapsed && options.collapsed.length > 0
        ? normalizeCollapsedKeys(options.collapsed)
        : EMPTY_SET,
    );
  }
  getSnapshot = () => this.#t;
  subscribe = (listener) => this.#l.subscribe(listener);
  #p(patch) {
    let previous = this.#t;
    let next = {
      ...previous,
      ...patch,
    };
    if (
      next.focusedIdx === previous.focusedIdx &&
      next.hoverFocusIdx === previous.hoverFocusIdx &&
      next.collapsed === previous.collapsed &&
      next.capExpanded === previous.capExpanded &&
      next.draftPick === previous.draftPick &&
      next.followOrigin === previous.followOrigin
    )
      return;
    this.#t = next;
    this.#l.emit();
  }
  attachView(view) {
    this.#r++;
    this.#i = view.clock;
    this.#u = view.onError;
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      this.#r--;
      if (this.#r === 0) this.#x();
    };
  }
  #x() {
    this.#c?.();
    this.#c = null;
    let pendingReleases = this.#d;
    this.#d = [];
    this.#I().finally(() => {
      for (let release of pendingReleases) release();
    });
    this.#i = null;
    this.#u = null;
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
  navigateTo(rowIndex, row) {
    this.#w(rowIndex, row);
    this.#p({
      focusedIdx: rowIndex,
      hoverFocusIdx: null,
    });
  }
  jumpToHeader(rowIndex, row) {
    this.#b = rowIndex;
    this.navigateTo(rowIndex, row);
  }
  takeRevealAtTop(rowIndex) {
    let matches = this.#b === rowIndex;
    this.#b = null;
    return matches;
  }
  hoverTo(rowIndex, row) {
    this.#w(rowIndex, row);
    this.#p({
      focusedIdx: rowIndex,
      hoverFocusIdx: rowIndex,
    });
  }
  followPick(focusedIdx, row) {
    this.#s = row?.kind === "job" ? row.job.id : row?.kind === "earlier" ? row.entry.sessionId : null;
    this.#p({
      focusedIdx,
      hoverFocusIdx: null,
      draftPick: true,
      followOrigin: null,
    });
  }
  returnPickTo(jobId) {
    this.#y = jobId;
    this.#T = null;
  }
  releasePick(rows, fallbackIndex, preferHeader) {
    let savedJobId = this.#y;
    let savedGroup = this.#T;
    let index = rows.findIndex((row) =>
      savedGroup
        ? row.kind === "header" && row.group === savedGroup
        : (row.kind === "job" && row.job.id === savedJobId) ||
          (row.kind === "earlier" && row.entry.sessionId === savedJobId),
    );
    let nextIndex = index >= 0 ? index : fallbackIndex;
    let nextRow = rows[nextIndex];
    if (preferHeader && this.#s && nextRow?.kind === "header" && nextRow.group !== this.#R) {
      this.followId = this.#s;
      return;
    }
    this.followId = index >= 0 ? savedJobId : null;
    this.followOrigin = index >= 0 ? savedGroup : null;
    this.#p({
      focusedIdx: nextIndex,
      hoverFocusIdx: null,
    });
  }
  sessionListedAs(placeholderId, jobId) {
    this.#E.set(placeholderId, jobId);
  }
  #w(rowIndex, row) {
    this.followId = row?.kind === "job" ? row.job.id : null;
    this.followOrigin = row?.kind === "header" ? row.group : null;
    if (rowIndex !== this.#t.focusedIdx) this.#R = this.followOrigin;
  }
  get followId() {
    return this.#s;
  }
  set followId(jobId) {
    this.#s = jobId;
    this.#y = jobId;
    this.#T = this.followOrigin;
    if (jobId) this.#R = null;
    this.#p({
      draftPick: false,
    });
  }
  get followOrigin() {
    return this.#t.followOrigin;
  }
  set followOrigin(origin) {
    this.#T = origin;
    this.#p({
      followOrigin: origin,
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
  clampFocus(rowCount) {
    this.#p({
      focusedIdx: clamp(this.#t.focusedIdx, 0, Math.max(0, rowCount - 1)),
    });
  }
  syncRows(rows) {
    this.#a = rows;
    this.#o = false;
    for (let [placeholderId, jobId] of this.#E)
      if (rows.some((row) => row.kind === "job" && row.job.id === jobId)) {
        if (this.#s === placeholderId) this.#s = jobId;
        if (this.#y === placeholderId) this.#y = jobId;
        if (this.#h === placeholderId) this.#h = jobId;
        this.#E.delete(placeholderId);
      } else if (
        !this.#n
          .getSnapshot()
          .remoteJobs.some((remoteJob) => remoteJob.id === placeholderId || remoteJob.id === jobId)
      )
        this.#E.delete(placeholderId);
    let { focusedIdx, followOrigin } = this.#t;
    if (followOrigin) {
      let index = rows.findIndex((row) => row.kind === "header" && row.group === followOrigin);
      if (index >= 0 && index !== focusedIdx) this.#_(index);
      if (index < 0)
        this.#p({
          followOrigin: null,
        });
      return;
    }
    if (!this.#s) return;
    let jobId = this.#s;
    let index = rows.findIndex(
      (row) =>
        (row.kind === "job" && row.job.id === jobId) ||
        (row.kind === "earlier" && row.entry.sessionId === jobId),
    );
    if (index < 0) {
      this.#s = null;
      return;
    }
    if (index !== focusedIdx) {
      logForDebugging(
        `[FV-poll] follow re-pin moved focus: was=${focusedIdx} now=${index} followId=${jobId}`,
      );
      this.#_(index);
    }
  }
  #_(rowIndex) {
    let { focusedIdx, hoverFocusIdx } = this.#t;
    this.#p({
      focusedIdx: rowIndex,
      hoverFocusIdx: hoverFocusIdx === focusedIdx ? rowIndex : hoverFocusIdx,
    });
  }
  focusedRow() {
    return this.#a[this.#t.focusedIdx];
  }
  get reorderIssued() {
    return this.#o;
  }
  beginReorder(followId, rowIndex) {
    this.followId = followId;
    this.#o = true;
    this.#_(rowIndex);
  }
  queueOrderWrites(orders, mode) {
    let target = mode === "state" ? this.#g : this.#m;
    for (let [jobId, order] of orders) {
      target.set(jobId, order);
      this.#d.push(this.#n.holdJob(jobId));
    }
    this.#c?.();
    let setTimeoutFn = this.#i?.setTimeout ?? defaultSetTimeout;
    this.#c = setTimeoutFn(() => {
      this.#c = null;
      this.#n.bumpGen();
      let releases = this.#d;
      this.#d = [];
      this.#I().finally(() => {
        for (let release of releases) release();
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
    let storageV5 = this.#e;
    return withSortOrderLock(() =>
      Promise.all([
        ...list.map(([jobId, order]) => writeSortOrder(getJobDir(jobId), order, storageV5)),
        ...list_2.map(([jobId, order]) => writeStateSortOrder(getJobDir(jobId), order, storageV5)),
      ]),
    )
      .then(() => {
        logFeatureOk("fleet_view_reorder_job");
      })
      .catch((error) => {
        logError(error);
        this.#u?.(`Couldn't save order \u2014 ${errorMessage(error)}`);
        logFeatureBad("fleet_view_reorder_job", "write_sort_order_failed");
      });
  }
  toggleCollapsed(key, capKey) {
    let nextCollapsed = new Set(this.#t.collapsed);
    if (nextCollapsed.has(key)) {
      nextCollapsed.delete(key);
      this.#p({
        collapsed: nextCollapsed,
      });
      return;
    }
    nextCollapsed.add(key);
    let capExpanded = this.#t.capExpanded;
    this.#p({
      collapsed: nextCollapsed,
      capExpanded:
        capKey !== null && capExpanded.has(capKey)
          ? new Set([...capExpanded].filter((capEntry) => capEntry !== capKey))
          : capExpanded,
    });
  }
  uncollapse(...keys) {
    let collapsed = this.#t.collapsed;
    if (!keys.some((key) => collapsed.has(key))) return;
    let nextCollapsed = new Set(collapsed);
    for (let key of keys) nextCollapsed.delete(key);
    this.#p({
      collapsed: nextCollapsed,
    });
  }
  renameCollapsedKey(oldKey, newKey) {
    let collapsed = this.#t.collapsed;
    if (!collapsed.has(oldKey)) return;
    let nextCollapsed = new Set(collapsed);
    nextCollapsed.delete(oldKey);
    nextCollapsed.add(newKey);
    this.#p({
      collapsed: nextCollapsed,
    });
  }
  expandCap(group) {
    if (this.#t.capExpanded.has(group)) return;
    this.#p({
      capExpanded: new Set(this.#t.capExpanded).add(group),
    });
  }
  get restoreAttempts() {
    return this.#S;
  }
  set restoreAttempts(attempts) {
    this.#S = attempts;
  }
  get restoreCountedJobs() {
    return this.#k;
  }
  set restoreCountedJobs(jobs) {
    this.#k = jobs;
  }
  get savedFocusJobId() {
    return this.#h;
  }
  set savedFocusJobId(jobId) {
    this.#h = jobId;
  }
  isFirstQueryOfLook() {
    if (this.#v) return false;
    this.#v = true;
    return true;
  }
}
//@ chunk-avy0g5d4.js:43467-43552 placement
function ensureFleetSelection(visit, roster, storageV5, collapsed) {
  return (visit.selection ??= new FleetAttachController({
    roster,
    storageV5,
    collapsed,
  }));
}
//@ chunk-avy0g5d4.js:43552-43567 placement
var EMPTY_WARMING_SET = new Set();
//@ chunk-avy0g5d4.js:43567-43644 placement
function initialLiveStatus() {
  return {
    attachingJobId: null,
    newSessionOpening: false,
    autoOpened: false,
  };
}
//@ chunk-avy0g5d4.js:43644-45610 placement
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
  #u = 0;
  #s = null;
  #a = null;
  #o = null;
  #m = 0;
  #g = null;
  #c = new Set();
  getSnapshot = () => this.#e;
  subscribe = (listener) => this.#n.subscribe(listener);
  #d(patch) {
    let previous = this.#e;
    let next = {
      ...previous,
      ...patch,
    };
    if (
      next.attachingJobId === previous.attachingJobId &&
      next.newSessionOpening === previous.newSessionOpening &&
      next.warmingJobIds === previous.warmingJobIds &&
      next.autoOpened === previous.autoOpened
    )
      return;
    this.#e = next;
    this.#n.emit();
  }
  attachView() {
    this.#l++;
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      this.#l--;
      if (this.#l === 0) {
        this.#r = null;
        this.#i++;
        this.#u++;
        this.#s = null;
        this.#a = null;
        this.#o = null;
        this.#g = null;
        this.#c.clear();
        this.#e = {
          ...this.#e,
          ...initialLiveStatus(),
        };
      }
    };
  }
  arm(attachingJobId, jobId) {
    this.#r = jobId;
    this.#d({
      attachingJobId,
    });
  }
  disarm() {
    let previousJobId = this.#r;
    this.#r = null;
    this.#d({
      attachingJobId: null,
    });
    return previousJobId;
  }
  nextRespawnAttempt() {
    return ++this.#i;
  }
  isCurrentRespawnAttempt(attempt) {
    return this.#i === attempt;
  }
  abandonRespawnAttempt() {
    this.#i++;
  }
  getWarming(jobId) {
    return this.#t.get(jobId);
  }
  trackWarming(jobId, promise) {
    this.#t.set(jobId, promise);
    this.#S();
    promise.then(() => {
      if (this.#t.get(jobId) === promise) {
        this.#t.delete(jobId);
        this.#S();
      }
    });
  }
  dropWarming(jobId) {
    if (this.#t.delete(jobId)) this.#S();
  }
  #S() {
    this.#d({
      warmingJobIds: this.#t.size === 0 ? EMPTY_WARMING_SET : new Set(this.#t.keys()),
    });
  }
  get forkRefusedJobId() {
    return this.#s;
  }
  set forkRefusedJobId(jobId) {
    this.#s = jobId;
  }
  get restartOfferedJobId() {
    return this.#a;
  }
  set restartOfferedJobId(jobId) {
    this.#a = jobId;
  }
  get deadEpochOfferedJobId() {
    return this.#o;
  }
  set deadEpochOfferedJobId(jobId) {
    this.#o = jobId;
    this.#m = jobId === null ? 0 : Date.now();
  }
  deadEpochOfferAgeMs() {
    return this.#o === null ? 1 / 0 : Date.now() - this.#m;
  }
  get deadEpochGoneJobId() {
    return this.#g;
  }
  set deadEpochGoneJobId(jobId) {
    this.#g = jobId;
  }
  isPromoting(jobId) {
    return this.#c.has(jobId);
  }
  beginPromote(jobId) {
    this.#c.add(jobId);
  }
  endPromote(jobId) {
    this.#c.delete(jobId);
  }
  releasePromoted(jobIds) {
    for (let jobId of this.#c) if (jobIds.has(jobId)) this.#c.delete(jobId);
  }
  beginNewSession() {
    this.#d({
      newSessionOpening: true,
    });
    return ++this.#u;
  }
  isCurrentNewSessionAttempt(attempt) {
    return this.#u === attempt;
  }
  endNewSession() {
    this.#d({
      newSessionOpening: false,
    });
  }
  abandonNewSession() {
    this.#u++;
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
//@ chunk-avy0g5d4.js:45610-45650 placement
function ensureFleetLiveStatus(visit) {
  return (visit.attach ??= new FleetLiveStatusStore());
}
//@ chunk-avy0g5d4.js:45650-45890 placement
/**
 * 删除不再被任何消息引用的粘贴内容（默认只删图片）。
 */
function prunePastedContents(pastes, texts, { pruneTextPastes = false } = {}) {
  let values = Object.values(pastes);
  function shouldKeep(paste) {
    return pruneTextPastes || paste.type === "image";
  }
  if (!values.some(shouldKeep)) return;
  let referencedIds = new Set();
  for (let text of texts) for (let ref of parsePastedRefs(text)) referencedIds.add(ref.id);
  for (let paste of values) if (shouldKeep(paste) && !referencedIds.has(paste.id)) delete pastes[paste.id];
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
  deleteMethodName,
  shortenPath,
  FLEET_BUCKET_HINTS,
  hasNonDefaultDispatchSettings,
  DispatchDefaultsLine,
};
