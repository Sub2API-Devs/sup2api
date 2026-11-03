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
import { stat, stat as stat_2, open } from "fs/promises";
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
import { nHt } from "../../utils/permissions/bypassPermissionsAccepted.js";
import { parseEffortFlag } from "../../utils/effort.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
import { ye } from "../../utils/startupMarks.js";
import { getTranscriptStorageKey } from "../../utils/sessionStorage.js";
import { tailFile } from "../../utils/fsOperations.js";
import {
  CloudListPartialError,
  P1o,
  sanitizeAttentionText,
  F6s,
  describeSessionAttention,
  mergePendingRemoteJobs,
} from "./sessionAttention.js";
import { CCR_SESSION_ID_RE } from "../../services/cloudSessions/ccrSessionList.js";
import { remoteRowId } from "../../bridge/sessionIdCompat.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { pe, o, u, M } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  ANY_CONTROL_CHAR_RE,
  getFirstLine,
  CONTROL_CHARS_EXCEPT_WS_RE,
  plural,
} from "../../utils/stringUtils.js";
import { ace } from "../../cli/bg/bgSpawnEnv.js";
import {
  getPrStatusColor,
  buildPrStatusQuery,
  fetchPrStatusByUrl,
  loadPrStatusCache,
  persistPrStatusCache,
} from "../../utils/ghPrStatus.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { qa } from "../../utils/stripAnsi.js";
import { uniq, count } from "../../utils/collections.js";
import { getProjectDir } from "../../utils/sessionStoragePortable.js";
import { rankJobNameMatch } from "../../cli/bg/bgDispatch.js";
import { findCanonicalGitRoot } from "../../utils/git.js";
import { tildify } from "../../utils/path.js";
import { lRr } from "./FleetNudgeStore.js";
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
import { $L } from "../../ink/components/ClockContext.js";
import { getRootSession, getLastInteractionTime } from "../../bootstrap/state.js";
import { sleep } from "../../utils/sleep.js";
import { startClockInterval } from "../../ink/components/Input.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { getTerminalFocused } from "../../ink/terminal-focus-state.js";
import { hAr, gxs } from "../../cli/bg/bgSpare.js";
import { clamp } from "../../ink/screen.js";
import { parsePastedRefs } from "../../history.js";

//@ chunk-93kwxas0.js:8052-8122 placement
function Qu() {
  try {
    return (claudeTempDir(), { ok: !0 });
  } catch (error) {
    return { ok: !1, error: error };
  }
}
/**
 * Agents 视图致命错误：清理终端模式、打印错误、刷新日志后退出。
 */
//@ chunk-93kwxas0.js:8122-8447 placement
async function reportFatalAndExit(h) {
  process.exitCode = 1;
  let E = await import("./chunk-r3wdn2dp.js").catch(() => {
    return;
  });
  E?.cleanupTerminalModes();
  try {
    writeSync(
      2,
      sequential.red(stripControlChars(errorMessage(h))) +
        `
`,
    );
  } catch {}
  try {
    let { initSinks: initSinks } = await import("./chunk-19b0wnnf.js");
    initSinks();
  } catch {}
  if ((logError(h), E === void 0)) return cliError();
  await E.gracefulShutdown(1, "other", { suppressResumeHint: !0 });
}
/**
 * 计算派发会话的权限模式（继承、bypass 可用性）。
 */
//@ chunk-93kwxas0.js:8447-8908 placement
function resolveDispatchPermissionMode(h) {
  let E = h?.agent ?? getInitialSettings_2().agent;
  if (!h && !E) return;
  let k = h?.permissionMode ? permissionModeFromString(h.permissionMode) : void 0,
    C = isBypassPermissionsModeDisabled(),
    x = !C && nHt(),
    T = !C && hasSkipDangerousModePermissionPrompt(),
    A = h?.permissionModeInherited ? k : "default",
    V = k === "bypassPermissions" && !x ? (T ? A : void 0) : k,
    D = h?.allowBypass && x ? !0 : void 0,
    U = h?.effort ? parseEffortFlag(h.effort).level : void 0;
  if (!V && !h?.model && !U && !E && !D) return;
  return {
    permissionMode: V,
    permissionModeInherited: V ? h?.permissionModeInherited : void 0,
    model: h?.model,
    effort: U,
    agent: E,
    allowBypass: D,
  };
}
/**
 * 派发默认值里是否有非默认项（权限模式、模型、effort、agent、bypass）。
 */
//@ chunk-93kwxas0.js:8908-9037 placement
function hasNonDefaultDispatchSettings(h) {
  return (
    (!!h.permissionMode && h.permissionMode !== "default" && !isInheritedBypassUnavailable(h)) ||
    !!h.model ||
    !!h.effort ||
    !!h.agent ||
    !!h.allowBypass
  );
}
/**
 * 显示派发默认值（权限模式、模型、effort、agent）。
 */
//@ chunk-93kwxas0.js:9037-9951 placement
function DispatchDefaultsLine(h) {
  let L = w(20),
    { defaults: defaults } = h,
    {
      permissionMode: permissionMode,
      model: model,
      effort: effort,
      agent: agent,
      allowBypass: allowBypass,
    } = defaults,
    V;
  if (L[0] !== defaults || L[1] !== permissionMode)
    ((V = !!permissionMode && permissionMode !== "default" && !isInheritedBypassUnavailable(defaults)),
      (L[0] = defaults),
      (L[1] = permissionMode),
      (L[2] = V));
  else V = L[2];
  let D = V,
    U = allowBypass && !D;
  if (!D && !model && !effort && !agent && !U) {
    return null;
  }
  let N;
  if (L[3] !== permissionMode || L[4] !== D)
    ((N =
      D &&
      r(Text, {
        color: themeColorOf(permissionMode),
        children: [permissionModeSymbol(permissionMode), " ", permissionModeIndicator(permissionMode)],
      })),
      (L[3] = permissionMode),
      (L[4] = D),
      (L[5] = N));
  else N = L[5];
  let X;
  if (L[6] !== U)
    ((X =
      U &&
      r(Text, {
        color: themeColorOf("bypassPermissions"),
        children: [permissionModeSymbol("bypassPermissions"), " bypass available"],
      })),
      (L[6] = U),
      (L[7] = X));
  else X = L[7];
  let K;
  if (L[8] !== agent)
    ((K = agent && r(Text, { dimColor: !0, children: ["@", agent] })), (L[8] = agent), (L[9] = K));
  else K = L[9];
  let W;
  if (L[10] !== model)
    ((W = model && e(Text, { dimColor: !0, children: model })), (L[10] = model), (L[11] = W));
  else W = L[11];
  let z;
  if (L[12] !== effort)
    ((z = effort && e(Text, { dimColor: !0, children: effort })), (L[12] = effort), (L[13] = z));
  else z = L[13];
  let oe;
  if (L[14] !== N || L[15] !== X || L[16] !== K || L[17] !== W || L[18] !== z)
    ((oe = r(Byline, { children: [N, X, K, W, z] })),
      (L[14] = N),
      (L[15] = X),
      (L[16] = K),
      (L[17] = W),
      (L[18] = z),
      (L[19] = oe));
  else oe = L[19];
  return oe;
}
/**
 * 继承来的 bypassPermissions 模式在当前不可用。
 */
//@ chunk-93kwxas0.js:9951-10052 placement
function isInheritedBypassUnavailable(h) {
  return h.permissionMode === "bypassPermissions" && h.permissionModeInherited === !0 && !nHt();
}
//@ chunk-93kwxas0.js:10052-10099 placement
function oc(h, E) {
  return isLocalDaemonAgent(h.state) && h.id !== E;
}
//@ chunk-93kwxas0.js:10099-10175 placement
function nc(h, E) {
  let k = E ?? "unknown";
  ((h.entryChannel = fromEnum(k)), (h.openFinished = null));
}
/**
 * 为新完成的会话发出一次性事件。
 */
//@ chunk-93kwxas0.js:10175-10730 placement
function emitFinishedJobs(h, E, k = logEvent) {
  let C = E.now ?? Date.now();
  if (h.openFinished === null) h.openFinished = new Set(E.allFinished.map((T) => T.id));
  let openFinished = h.openFinished;
  for (let T of E.visibleFinished) {
    if (h.emitted.has(T.id)) continue;
    h.emitted.add(T.id);
    let A = mr(T.state.firstTerminalAt),
      L = A ?? mr(T.state.updatedAt) ?? C;
    k("tengu_bg_result_seen", {
      trigger: openFinished.has(T.id) ? lit("list_open") : lit("render"),
      outcome: fromEnumOpt(terminalOutcome(T.state.state)),
      overlap: overlapsAnotherJob(T, E.allCandidates, C),
      entry_channel: h.entryChannel,
      seen_latency_ms: Math.max(0, C - L),
      terminal_at_missing: A === null,
      jobSessionId: ye(T.state.sessionId),
    });
  }
}
//@ chunk-93kwxas0.js:10730-10813 placement
function mr(h) {
  if (!h) return null;
  let parse = Date.parse(h);
  return Number.isNaN(parse) ? null : parse;
}
/**
 * 该会话的运行区间与其他会话重叠。
 */
//@ chunk-93kwxas0.js:10813-11066 placement
function overlapsAnotherJob(h, E, k) {
  let C = mr(h.state.createdAt);
  if (C === null) return !1;
  let x = mr(h.state.firstTerminalAt) ?? k;
  return E.some((T) => {
    if (T.id === h.id) return !1;
    let A = mr(T.state.createdAt);
    if (A === null) return !1;
    let L = mr(T.state.firstTerminalAt) ?? k;
    return C < L && A < x;
  });
}
/**
 * 把对等会话记录转换为 job 状态。
 */
//@ chunk-93kwxas0.js:11066-11616 placement
function peerToJobState(h) {
  let iso = new Date(h.startedAt).toISOString(),
    iso_2 = new Date(h.updatedAt ?? h.startedAt).toISOString();
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
    createdAt: iso,
    updatedAt: iso_2,
    firstTerminalAt: null,
    backend: "peer",
    sock: h.sock,
    pid: h.pid,
  };
}
/**
 * 名单轮询间隔：按是否活跃与距上次变化的时间分档。
 */
//@ chunk-93kwxas0.js:11616-11794 placement
function rosterPollInterval(h, E) {
  if (h) {
    if (E < 30000) return 15000;
    if (E < 300000) return 60000;
    return 180000;
  }
  if (E < 30000) return 60000;
  if (E < 600000) return 300000;
  if (E < 3600000) return 900000;
  return 1800000;
}
/**
 * 查询会话转录文件的存在与修改时间。
 */
//@ chunk-93kwxas0.js:11830-12217 placement
async function statTranscript(h, E) {
  let k = getTranscriptStorageKey(h, E);
  if (k !== void 0) {
    let statMeta = await k.backend.statMeta(k.key);
    if (statMeta.ok) return { kind: "present", mtimeMs: statMeta.value.mtimeMs };
    let error = statMeta.error;
    if (error.code === "NotFound") return { kind: "absent" };
    let A = "telemetryCode" in error ? error.telemetryCode : void 0;
    return A === "ELOOP" || A === "ENXIO" ? { kind: "refused" } : { kind: "unreadable", code: error.code };
  }
  return { kind: "present", mtimeMs: (await stat(h)).mtimeMs };
}
/**
 * 读取会话转录末尾若干字节。
 */
//@ chunk-93kwxas0.js:12217-12616 placement
async function readTranscriptTail(h, E, k) {
  let C = getTranscriptStorageKey(h, k);
  if (C !== void 0) {
    let read = await C.backend.read([{ key: C.key, tail: E }]);
    if (!read.ok) throw Error("fleet view transcript tail read failed", { cause: read.error });
    let T = read.value.items[0];
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
var Zg = 7,
  eh = 1048576,
  ld = 16,
  th = '"subtype":"scheduled_task_fire"',
  oh = /"timestamp":"([^"]+)"/;
//@ chunk-93kwxas0.js:12742-12805 placement
function dc() {
  return { scanStates: new Map(), inFlightScans: new Set() };
}
/**
 * 增量扫描转录文件尾部（按 inode/偏移缓存）。
 */
//@ chunk-93kwxas0.js:12805-14321 placement
async function scanTranscriptTail(h, E) {
  let { scanStates: scanStates, inFlightScans: inFlightScans } = h;
  if (inFlightScans.has(E)) return null;
  inFlightScans.add(E);
  try {
    let x = await open(E, "r");
    try {
      let { size: size, ino: ino } = await x.stat(),
        L = scanStates.get(E);
      if (L && (L.ino !== ino || L.offset > size)) L = void 0;
      if (L && L.tail.length > 0) {
        let alloc = Buffer.alloc(L.tail.length),
          { bytesRead: bytesRead } = await x.read(alloc, 0, alloc.length, L.offset - alloc.length);
        if (bytesRead !== alloc.length || !alloc.equals(L.tail)) L = void 0;
      }
      if (!L)
        ((L = { ino: ino, offset: 0, tail: Buffer.alloc(0), count: 0, recent: [] }), scanStates.set(E, L));
      if (size > L.offset) {
        let count = L.count,
          sliced = L.recent.slice(),
          alloc = Buffer.alloc(Math.min(eh, size - L.offset)),
          oe = null,
          offset = L.offset,
          offset_2 = L.offset,
          tail = L.tail;
        while (offset < size) {
          let { bytesRead: bytesRead } = await x.read(
            alloc,
            0,
            Math.min(alloc.length, size - offset),
            offset,
          );
          if (bytesRead <= 0) break;
          let chunk = alloc.subarray(0, bytesRead),
            Je = oe ? oe.length : 0,
            le = oe ? Buffer.concat([oe, chunk]) : chunk,
            Oe = 0,
            index = le.indexOf(10, Je);
          while (index !== -1) {
            let str = le.toString("utf-8", Oe, index);
            if (str.includes(th)) {
              let match = str.match(oh),
                je = match ? Date.parse(match[1]) : NaN;
              if (Number.isFinite(je)) {
                if ((count++, sliced.push(je), sliced.length > Zg)) sliced.shift();
              }
            }
            ((Oe = index + 1), (index = le.indexOf(10, Oe)));
          }
          if (((offset_2 += Oe), (offset += bytesRead), Oe >= ld))
            tail = Buffer.from(le.subarray(Oe - ld, Oe));
          else if (Oe > 0) {
            let buffer = Buffer.concat([tail, le.subarray(0, Oe)]);
            tail = buffer.subarray(Math.max(0, buffer.length - ld));
          }
          oe = Oe < le.length ? Buffer.from(le.subarray(Oe)) : null;
        }
        if (offset_2 > L.offset)
          ((L.offset = offset_2), (L.count = count), (L.recent = sliced), (L.tail = tail));
      }
      let { count: count, recent: recent } = L;
      if (recent.length < 2) return { count: count, nextAt: null };
      let U = [];
      for (let K = 1; K < recent.length; K++) U.push(recent[K] - recent[K - 1]);
      U.sort((K, W) => K - W);
      let N = U[Math.floor(U.length / 2)],
        X = recent.at(-1) + N;
      return { count: count, nextAt: X > Date.now() ? X : null };
    } finally {
      await x.close();
    }
  } finally {
    inFlightScans.delete(E);
  }
}
//@ chunk-93kwxas0.js:14321-14407 placement
function uc(h, E) {
  for (let k of h.scanStates.keys()) if (!E.has(k)) h.scanStates.delete(k);
}
//@ chunk-93kwxas0.js:14407-14416 placement
var cc = 2;
/**
 * 云会话列表失败原因：exhausted / no_sign_in / status / no_answer / unknown。
 */
//@ chunk-93kwxas0.js:14416-14714 placement
function classifyCloudListFailure(h) {
  if (h instanceof CloudListPartialError) return classifyCloudListFailure(h.cause);
  if (h instanceof P1o) return { cause: "exhausted" };
  if (h instanceof Error && h.name === "CloudSessionAccessError") return { cause: "no_sign_in" };
  let { kind: kind, status: status } = classifyAxiosError(h);
  return status !== void 0
    ? { cause: "status", status: status }
    : { cause: kind === "other" ? "unknown" : "no_answer" };
}
/**
 * 两个列表失败原因是否相同。
 */
//@ chunk-93kwxas0.js:14714-14854 placement
function sameCloudListFailure(h, E) {
  if (h === null || E === null) return h === E;
  return h.cause === E.cause && (h.cause !== "status" || E.cause !== "status" || h.status === E.status);
}
/**
 * 云会话列表失败提示（本构建中恒为 null）。
 */
//@ chunk-93kwxas0.js:14854-15045 placement
function CloudListFailureNotice({
  onCloudTab: onCloudTab,
  remoteJobs: remoteJobs,
  remoteListLoaded: remoteListLoaded,
  remoteListFailure: remoteListFailure,
}) {
  if (!1)
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
var nh = /^remote-[\w-]{1,8}$/;
//@ chunk-93kwxas0.js:15074-15107 placement
function cd(h) {
  return nh.test(h);
}
/**
 * 会话对应的远程行 id。
 */
//@ chunk-93kwxas0.js:15107-15211 placement
function remoteRowIdOf(h) {
  if (cd(h.id)) return h.id;
  return CCR_SESSION_ID_RE.test(h.state.sessionId) ? remoteRowId(h.state.sessionId) : void 0;
}
/**
 * 会话分组/置顶偏好的 schema（字符串键 → {group, pinned}）。
 */
//@ chunk-93kwxas0.js:15211-15319 placement
var JOB_PREFS_SCHEMA = DoctorLazy(() =>
  pe(
    o(),
    u({
      group: o()
        .optional()
        .catch(void 0),
      pinned: M()
        .optional()
        .catch(void 0),
    }).catch({}),
  ),
);
//@ chunk-93kwxas0.js:15319-15365 placement
var PROJECT_SESSION = "project_session",
  PROJECT_UNKNOWN = "project_unknown";
//@ chunk-93kwxas0.js:15365-15449 placement
class ds extends Error {
  burst;
  constructor(h) {
    super("archive rejected");
    this.burst = h;
  }
}
//@ chunk-93kwxas0.js:15478-15575 placement
function ls(h, E) {
  let k;
  for (let C of h.keys()) if (!E.has(C)) (k ??= new Map(h)).delete(C);
  return k ?? h;
}
//@ chunk-93kwxas0.js:15575-15634 placement
function bn(h) {
  return h?.filter((E) => !ANY_CONTROL_CHAR_RE.test(E.href)) ?? [];
}
//@ chunk-93kwxas0.js:15634-15648 placement
var pd = 180000;
/**
 * 判断会话结果（成功/失败）。
 */
//@ chunk-93kwxas0.js:15648-16052 placement
function jobOutcome(h, E) {
  let k = terminalOutcome(h.state);
  if (k && h.tempo !== "active" && !(k === "success" && isSelfDriving(h))) return k;
  let filtered = bn(h.children).filter((A) => A.kind !== "frame");
  if (
    E &&
    h.tempo !== "active" &&
    h.template === ace.name &&
    filtered.length &&
    filtered.every((A) => E.get(A.href)?.state === "MERGED")
  )
    return "success";
  let x = h.tempo === "active" ? 1 : 5,
    T = Date.now() - Date.parse(h.updatedAt);
  if (T < x * pd) return "flowing";
  if (T < x * 15 * 60000) return "slowing";
  return "stuck";
}
/**
 * 会话 tempo：active/completed/blocked。
 */
//@ chunk-93kwxas0.js:16052-16229 placement
function jobTempo(h, E) {
  if (E === "busy") return "active";
  if (isSettled(h) && !(terminalOutcome(h.state) === "success" && isSelfDriving(h))) return "completed";
  if (h.tempo === "blocked" || E === "waiting") return "blocked";
  return "active";
}
/**
 * Agents 视图分区（review/blocked/working/done）及标题与说明。
 */
//@ chunk-93kwxas0.js:16229-16607 placement
var FLEET_BUCKETS = ["review", "blocked", "working", "done"],
  Ao = { review: "Ready for review", blocked: "Needs input", working: "Working", done: "Completed" },
  fd = {
    review: "",
    blocked: "Sessions that have a question or need your decision land here",
    working: "Sessions Claude is actively working on \u2014 they keep running even if you close the terminal",
    done: "Finished sessions wait here for you to review",
  };
//@ chunk-93kwxas0.js:16607-16690 placement
function hc(h) {
  return h > 0 ? `${h} awaiting input \xB7 claude agents` : "claude agents";
}
/**
 * 计算会话所属分区。
 */
//@ chunk-93kwxas0.js:16690-17137 placement
function jobBucket(h, E, k) {
  if (k === "busy") return "working";
  if (h.activity === "failure") return "done";
  if (h.activity === "stopped") return "done";
  if (k === "waiting") return "blocked";
  if (
    !isSelfDriving(h.state) &&
    bn(h.state.children).some((x) => {
      let T = E?.get(x.href);
      if (T?.state !== "OPEN") return !1;
      let A = getPrStatusColor(T);
      return A === "error" || (A === "warning" && T.review !== "APPROVED");
    })
  )
    return "review";
  if (h.activity === "success") return "done";
  if (h.state.tempo === "blocked") return "blocked";
  return "working";
}
//@ chunk-93kwxas0.js:17137-17161 placement
function Io(h) {
  return !1;
}
//@ chunk-93kwxas0.js:17161-17246 placement
function cs(h) {
  let E = terminalOutcome(h.state);
  return (E === "failure" || E === "stopped") && isSettled(h) && !isExecLaunch(h);
}
//@ chunk-93kwxas0.js:17246-17278 placement
function wi(h) {
  return `job:${h}`;
}
//@ chunk-93kwxas0.js:17278-17369 placement
function bc(h, E) {
  return h.get(E.state.resumeSessionId ?? E.state.sessionId) ?? h.get(wi(E.id));
}
/**
 * 从转录行提取可预览的文本。
 */
//@ chunk-93kwxas0.js:17369-17904 placement
function transcriptLinePreview(h) {
  try {
    let E = jsonParse(h);
    if (E.type === "assistant") {
      let C = (E.message?.content ?? []).find((x) => x.type === "text")?.text;
      if (C) return C;
    }
    if (E.type === "user") {
      let k = E.message?.content,
        C = typeof k === "string" ? k : k?.find((T) => T.type === "text")?.text,
        x = C
          ? wc(C)
              .split(
                `
`,
              )
              .find((T) => T.trim())
              ?.trim()
          : void 0;
      if (x) return `> ${x}`;
      if (Array.isArray(k)) {
        let found = k.find((A) => A.type === "tool_result" && A.is_error);
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
function wc(h) {
  return h.replace(/<(system-reminder|task-notification)>[\s\S]*?(<\/\1>|$)/g, " ");
}
//@ chunk-93kwxas0.js:18000-18039 placement
function Si(h) {
  return h === SEED_DETAIL || h === IDLE_DETAIL;
}
/**
 * 预览文本去掉标签、特殊字符并压缩空白。
 */
//@ chunk-93kwxas0.js:18039-18141 placement
function stripJobPreviewText(h) {
  return wc(qa(h))
    .replace(/<\/?[\w-]+>/g, " ")
    .replace(CONTROL_CHARS_EXCEPT_WS_RE, "")
    .replace(/\s+/g, " ")
    .trim();
}
//@ chunk-93kwxas0.js:18141-18183 placement
function mo(h, E) {
  return Io(h) ? sanitizeAttentionText(E) : stripJobPreviewText(E);
}
/**
 * 会话可能的 transcript 路径（cwd 与 worktree 各一个）。
 */
//@ chunk-93kwxas0.js:18183-18328 placement
function jobTranscriptPaths(h) {
  let E = `${h.resumeSessionId ?? h.sessionId}.jsonl`,
    k = h.worktreePath ? [h.cwd, h.worktreePath] : [h.cwd];
  return uniq(k.map((C) => join(getProjectDir(C), E)));
}
/**
 * 读会话 transcript 尾部，返回最后一行预览文本。
 */
//@ chunk-93kwxas0.js:18328-18530 placement
async function readJobLastLine(h, E) {
  for (let k of jobTranscriptPaths(h.state))
    try {
      let { content: content } = await readTranscriptTail(k, 16384, E),
        filtered = content
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
/**
 * 按分区/分组布局行（空分区提示、完成折叠）。
 */
//@ chunk-93kwxas0.js:18530-20650 placement
function layoutRows(h, E, k) {
  let {
      byState: byState,
      byGroup: byGroup,
      onRemoteTab: onRemoteTab,
      launcherGroup: launcherGroup,
      scopedFallbackOrigin: scopedFallbackOrigin,
      doneFoldAt: doneFoldAt,
      emptyBucketHint: emptyBucketHint,
      earlier: earlier = [],
    } = k,
    N = [];
  if (byState && emptyBucketHint) {
    let ne = 0,
      ae = 0,
      me = byState && !onRemoteTab ? earlier : [];
    for (let le of FLEET_BUCKETS) {
      let filtered = h.filter((De) => E.get(De.id) === le);
      if (le === "review" && filtered.length === 0) continue;
      N.push({ kind: "header", origin: scopedFallbackOrigin, group: le });
      for (let De of filtered) {
        if (le === "done") {
          while (ae < me.length && me[ae].modified.getTime() > latestJobTimestamp(De.state)) {
            if (ne++ < doneFoldAt)
              N.push({ kind: "earlier", entry: me[ae], origin: scopedFallbackOrigin, group: "done" });
            ae++;
          }
          if (ne++ >= doneFoldAt) continue;
        }
        N.push({ kind: "job", job: De, origin: spawnOrigin(De.state), group: le });
      }
      if (le === "done")
        while (ae < me.length) {
          if (ne++ < doneFoldAt)
            N.push({ kind: "earlier", entry: me[ae], origin: scopedFallbackOrigin, group: "done" });
          ae++;
        }
    }
    let max = Math.max(0, ne - doneFoldAt);
    if (max > 0) N.push({ kind: "fold", origin: scopedFallbackOrigin, group: "done", hidden: max });
    return { rows: N, doneCount: ne, doneFoldHidden: max, foldGroup: "done" };
  }
  let X = !byState && !byGroup && !onRemoteTab && !h.some((ne) => E.get(ne.id) === launcherGroup),
    K = 0,
    W = byState && !onRemoteTab ? earlier : [],
    z = 0,
    oe = (ne) => {
      if (K++ >= doneFoldAt) return;
      N.push(ne);
    };
  for (let ne = 0; ne < h.length; ne++) {
    let ae = h[ne],
      me = E.get(ae.id),
      Je = spawnOrigin(ae.state);
    if (ne === 0 || me !== E.get(h[ne - 1].id)) {
      if (X && me !== "pinned")
        (N.push({ kind: "header", origin: scopedFallbackOrigin, group: launcherGroup }), (X = !1));
      let le = byState || byGroup || me === "pinned" || me === launcherGroup ? scopedFallbackOrigin : Je;
      N.push({ kind: "header", origin: le, group: me });
    }
    if (me === "done") {
      while (z < W.length && W[z].modified.getTime() > latestJobTimestamp(ae.state))
        (oe({ kind: "earlier", entry: W[z], origin: scopedFallbackOrigin, group: "done" }), z++);
      oe({ kind: "job", job: ae, origin: Je, group: me });
      continue;
    }
    N.push({ kind: "job", job: ae, origin: Je, group: me });
  }
  if (z < W.length) {
    if (K === 0) N.push({ kind: "header", origin: scopedFallbackOrigin, group: "done" });
    while (z < W.length)
      (oe({ kind: "earlier", entry: W[z], origin: scopedFallbackOrigin, group: "done" }), z++);
  }
  if (X && h.length > 0) N.push({ kind: "header", origin: scopedFallbackOrigin, group: launcherGroup });
  let ge = !byState && !onRemoteTab ? earlier : [];
  if (ge.length > 0) {
    N.push({ kind: "header", origin: scopedFallbackOrigin, group: EARLIER });
    let max = Math.max(0, Math.min(doneFoldAt, ge.length));
    for (let me of ge.slice(0, max))
      N.push({ kind: "earlier", entry: me, origin: scopedFallbackOrigin, group: EARLIER });
    let ae = ge.length - max;
    if (ae > 0) N.push({ kind: "fold", origin: scopedFallbackOrigin, group: EARLIER, hidden: ae });
    return { rows: N, doneCount: ge.length, doneFoldHidden: ae, foldGroup: EARLIER };
  }
  let se = K > doneFoldAt ? K - doneFoldAt : 0;
  if (se > 0) N.push({ kind: "fold", origin: scopedFallbackOrigin, group: "done", hidden: se });
  return { rows: N, doneCount: K, doneFoldHidden: se, foldGroup: "done" };
}
/**
 * 初始焦点行：首个远程会话，或来源会话、earlier 行。
 */
//@ chunk-93kwxas0.js:20650-20933 placement
function initialFocusIndex(h, E) {
  let index = h.findIndex((T) => T.kind === "job" && T.job.state.backend === "remote");
  if (index !== -1) return index;
  let C = h[1];
  if (C?.kind === "job" && C.origin === E) return 1;
  if (C?.kind === "earlier") return 1;
  let index_2 = h.findIndex((T) => T.kind === "earlier");
  return index_2 !== -1 && !h.some((T) => T.kind === "job") ? index_2 : 0;
}
/**
 * 按搜索得分找最匹配的行。
 */
//@ chunk-93kwxas0.js:20933-21137 placement
function bestSearchMatchIndex(h, E) {
  let k = 0,
    C = -1;
  for (let [x, T] of h.entries()) {
    if (T.kind !== "job" && T.kind !== "earlier") continue;
    let A = E ? rankJobNameMatch(T.kind === "job" ? T.job.state : { name: T.entry.title, intent: "" }, E) : 0;
    if (A > C) ((C = A), (k = x));
  }
  return k;
}
//@ chunk-93kwxas0.js:21137-21175 placement
var gd = 3,
  fs = 3,
  ah = 60000,
  dh = 8,
  hd = 4,
  lh = 2;
/**
 * 按剩余高度计算已完成分区可显示的行数，不够时用紧凑标题。
 */
//@ chunk-93kwxas0.js:21175-21315 placement
function computeDoneCap(h, E) {
  let k = (x) => h - dh - x - E,
    C = k(hd);
  if (C >= gd) return { doneCap: C, compactHeader: !1 };
  return { doneCap: Math.max(0, k(lh)), compactHeader: !0 };
}
//@ chunk-93kwxas0.js:21315-21397 placement
function bs(h) {
  if (h.backend === "remote") return spawnOrigin(h);
  let E = spawnOrigin(h);
  return findCanonicalGitRoot(E) ?? E;
}
//@ chunk-93kwxas0.js:21397-21425 placement
function yi(h) {
  return tildify(h);
}
//@ chunk-93kwxas0.js:21425-21484 placement
function gs(h) {
  return h.sortOrder ?? Date.parse(h.createdAt);
}
/**
 * 排序键：stateSortOrder 或（done 用终止时间，其余用更新时间）。
 */
//@ chunk-93kwxas0.js:21484-21610 placement
function jobSortKey(h, E) {
  return (
    h.stateSortOrder ??
    Date.parse(E === "done" ? (h.lastTerminalAt ?? h.firstTerminalAt ?? h.updatedAt) : h.updatedAt)
  );
}
/**
 * 会话最近的有效时间戳（终止/首次终止/更新/创建）。
 */
//@ chunk-93kwxas0.js:21610-21764 placement
function latestJobTimestamp(h) {
  for (let E of [h.lastTerminalAt, h.firstTerminalAt, h.updatedAt, h.createdAt])
    if (E) {
      let parse = Date.parse(E);
      if (Number.isFinite(parse)) return parse;
    }
  return 0;
}
/**
 * 计算已完成会话折叠的位置。
 */
//@ chunk-93kwxas0.js:21764-22260 placement
function doneFoldIndex({
  done: h,
  earlier: earlier,
  doneCap: doneCap,
  initialJobId: initialJobId,
  linkMatchId: linkMatchId,
}) {
  let T = h.length + earlier.length;
  if (T < doneCap + fs) return 1 / 0;
  let A = (W) => jobSortKey(W.state, "done"),
    min = Math.min(doneCap, h.length);
  if (min > 0) {
    let W = A(h[min - 1]);
    while (min < h.length && W - A(h[min]) < ah) min++;
  }
  let mapped = h.map((W) => latestJobTimestamp(W.state)),
    mapped_2 = earlier.map((W) => {
      let time = W.modified.getTime();
      return mapped.findIndex((oe) => time > oe);
    }),
    U = (W) => count(mapped_2, (z) => z !== -1 && z <= W),
    max = Math.max(min, doneCap),
    max_2 = Math.max(
      h.findIndex((W) => W.id === initialJobId),
      h.findIndex((W) => W.id === linkMatchId),
    ),
    K = max_2 < 0 ? -1 : max_2 + U(max_2);
  if (T - max < fs || K >= max) return 1 / 0;
  return max;
}
//@ chunk-93kwxas0.js:22260-22325 placement
function jn(h) {
  return [...h].sort((E, k) => gs(E.state) - gs(k.state));
}
//@ chunk-93kwxas0.js:22325-22339 placement
var vc = 120000;
//@ chunk-93kwxas0.js:22339-22367 placement
var Cc = 2000,
  uh = 500,
  ch = 30000;
//@ chunk-93kwxas0.js:22367-22386 placement
var _c = 30000,
  ph = 15;
/**
 * 组装 Agents 视图的后端操作（列出 job、存活 daemon 会话、远程会话、中断等）。
 */
//@ chunk-93kwxas0.js:22386-23193 placement
function createFleetBackend() {
  return {
    listJobs: lRr,
    listAliveDaemonJobs: (h) => listAliveDaemonJobs(h),
    adoptRosterOrphans: (h, E, k) => adoptRosterOrphans(h, E, k),
    listAllLiveSessions: (h) => listAllLiveSessions(h),
    listRemoteSessions: (h) => F6s(h),
    interruptRemoteSession: (h) => import("./chunk-djvrn9k9.js").then((E) => E.interruptRemoteSession(h)),
    removeRemoteSession: (h, E) =>
      Promise.resolve({ failure: "gate_off", pausedRoutines: 0, mayStillRun: null }),
    updateRemoteSessionTitle: async (h, E) => !1,
    readCloudRowMarks: () => Tc,
    saveCloudRowMarks: (h, E, k) => Promise.resolve(!1),
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
var mh = {},
  Tc = new Map();
/**
 * 名单存储的初始快照。
 */
//@ chunk-93kwxas0.js:23214-23488 placement
function createEmptyRosterSnapshot() {
  return {
    jobs: null,
    adoptedPeers: [],
    remoteJobs: [],
    remoteListLoaded: !1,
    remoteListFailure: null,
    remoteListHasOlder: !1,
    pendings: [],
    statuses: new Map(),
    terminalHolders: new Map(),
    prStatuses: new Map(),
    loopKicks: new Map(),
    logTails: {},
    deleteRefusals: new Map(),
    overlaidLoadLanded: !1,
  };
}
/**
 * 会话名单存储：轮询本地/远程会话、待创建项、状态与 PR，提供订阅快照。
 */
//@ chunk-93kwxas0.js:23488-37835 placement
class FleetRoster {
  #n;
  #e;
  #l = createSignal();
  #t = createEmptyRosterSnapshot();
  #r = null;
  #i = 0;
  #c = !1;
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
  #M = dc();
  #O = null;
  constructor(h) {
    ((this.#n = h?.storageV5), (this.#e = { ...createFleetBackend(), ...h?.client }));
  }
  getSnapshot = () => this.#t;
  usesStorage(h) {
    return this.#n === h;
  }
  subscribe = (h) => this.#l.subscribe(h);
  #f(h, E) {
    let k = this.#t[h],
      C = E(k);
    if (Object.is(C, k)) return;
    ((this.#t = { ...this.#t, [h]: C }), this.#l.emit());
  }
  #A(h, E) {
    return (this.#r?.setTimeout ?? $L)(h, E);
  }
  attachView(h) {
    if ((this.#i++, this.#i === 1)) this.#B(h);
    let E = !1;
    return () => {
      if (E) return;
      if (((E = !0), this.#i--, this.#i === 0)) this.#J();
    };
  }
  setRemoteWanted(h) {
    if (h === this.#c) return;
    if (((this.#c = h), this.#i === 0)) return;
    if (h) this.#L();
    else (this.#a?.(), (this.#a = null));
  }
  #B(h) {
    if (((this.#r = h), (this.#y = 0), this.#t.prStatuses.size === 0))
      this.#e.loadPrStatusCache(this.#n).then((E) => {
        if (E.size) this.#F((k) => (k.size ? new Map([...E, ...k]) : E));
      });
    if (
      (this.load(),
      this.#s.push(
        startClockInterval(h, () => void this.load(), Cc),
        startClockInterval(h, this.#H, uh),
        startClockInterval(
          h,
          () => {
            this.#c;
          },
          Cc,
        ),
      ),
      this.#c)
    )
      this.#L();
  }
  #L() {
    if (!this.#r) return;
    (this.#f("remoteJobs", (h) => {
      let mapped = h.map((k) => {
        let C = jobOutcome(k.state);
        return C === k.activity ? k : { ...k, activity: C };
      });
      return mapped.every((k, C) => k === h[C]) ? h : mapped;
    }),
      this.loadRemote(),
      this.#a?.(),
      (this.#a = startClockInterval(this.#r, this.loadRemote, ch)));
  }
  #J() {
    for (let k of this.#s) k();
    ((this.#s = []),
      this.#a?.(),
      (this.#a = null),
      this.#O?.(),
      (this.#O = null),
      this.#e.clearFleetViewHeartbeat(this.#n),
      (this.#r = null),
      this.#I.clear(),
      this.#C.clear(),
      (this.#R = this.#E));
    let h = this.#t,
      E = h.remoteJobs.some((remoteJob) => remoteJob.id.startsWith("remote-pending-"))
        ? h.remoteJobs.filter((remoteJob) => !remoteJob.id.startsWith("remote-pending-"))
        : h.remoteJobs;
    if (
      h.pendings.length > 0 ||
      E !== h.remoteJobs ||
      h.remoteListLoaded ||
      h.remoteListFailure !== null ||
      h.overlaidLoadLanded
    )
      ((this.#t = {
        ...h,
        pendings: h.pendings.length > 0 ? [] : h.pendings,
        remoteJobs: E,
        remoteListLoaded: !1,
        remoteListFailure: null,
        overlaidLoadLanded: !1,
      }),
        this.#l.emit());
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
    let { sessionId: sessionId, resumeSessionId: resumeSessionId } = h.state;
    if (isExecLaunch(h.state)) return h.state.tempo === "active" ? "busy" : void 0;
    if (h.state.backend === "remote")
      return h.state.tempo === "active" ? "busy" : h.state.tempo === "blocked" ? "waiting" : void 0;
    if (this.#C.has(resumeSessionId ?? sessionId)) return "busy";
    if (this.#t.pendings.some((pending) => pending.state.sessionId === sessionId)) return "busy";
    let C = this.terminalHolderOf(h) !== void 0 ? this.#t.statuses.get(wi(h.id)) : bc(this.#t.statuses, h);
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
  holdJob = (h) => (
    (this.#m = ++this.#o),
    this.#h.set(h, (this.#h.get(h) ?? 0) + 1),
    () => {
      this.#m = ++this.#o;
      let E = (this.#h.get(h) ?? 1) - 1;
      if (E <= 0) this.#h.delete(h);
      else this.#h.set(h, E);
    }
  );
  optimistic = (h, E, k) => {
    if (((this.#m = ++this.#o), E)) {
      this.#u.add(E);
      let x = this.#t.jobs?.find((T) => T.id === E);
      if (x) {
        let filtered = [x.state.sessionId, x.state.resumeSessionId].filter((A) => Boolean(A));
        this.#d.set(E, filtered);
        for (let A of filtered) this.#S.add(A);
      }
    }
    let C = k ? this.holdJob(k) : void 0;
    return (
      this.updateJobs((x) => (x ? h(x) : x)),
      E || C
        ? () => {
            if (E) {
              ((this.#m = ++this.#o), this.#u.delete(E));
              for (let x of this.#d.get(E) ?? []) this.#S.delete(x);
              this.#d.delete(E);
            }
            C?.();
          }
        : void 0
    );
  };
  noteDeleteRefusal = (h, E) => {
    (this.#k.delete(h),
      this.#f("deleteRefusals", (k) => {
        if (E === null && !k.has(h)) return k;
        let C = new Map(k);
        if (E === null) C.delete(h);
        else C.set(h, E);
        return C;
      }));
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
    ((this.#R = this.#E),
      this.#w.clear(),
      (this.#_ = null),
      this.#f("remoteJobs", (h) => (h.length > 0 ? [] : h)),
      this.#f("remoteListHasOlder", () => !1));
  }
  updatePendings(h) {
    this.#f("pendings", h);
  }
  #F(h) {
    let prStatuses = this.#t.prStatuses;
    if ((this.#f("prStatuses", h), this.#t.prStatuses !== prStatuses))
      this.#e.persistPrStatusCache(this.#t.prStatuses, this.#n);
  }
  seedJobs(h) {
    this.updateJobs((E) => {
      let mapped = h.filter((x) => !this.#u.has(x.id)).map((x) => ({ ...x, activity: jobOutcome(x.state) })),
        C = E && this.#h.size > 0 ? new Map(E.filter((x) => this.#h.has(x.id)).map((x) => [x.id, x])) : null;
      return jn(C ? mapped.map((x) => C.get(x.id) ?? x) : mapped);
    });
  }
  settleLandedPendings(h) {
    let E = new Set(h.map((k) => k.id));
    for (let k of h) {
      let sessionId = k.state.sessionId;
      (this.#I.add(sessionId), this.#A(() => this.#I.delete(sessionId), _c));
    }
    this.updatePendings((k) => k.filter((C) => !E.has(C.id)));
  }
  kick(h, E) {
    let k = { kickedAt: Date.now(), jobId: E };
    return (
      this.#C.set(h, k),
      this.#A(() => {
        if (this.#C.get(h) === k) (this.#C.delete(h), this.#f("statuses", (C) => new Map(C)));
      }, _c),
      () => {
        if (this.#C.get(h) === k) this.#C.delete(h);
      }
    );
  }
  watchPendingJobDir(h) {
    (this.#O?.(), (this.#O = this.#e.watchJobDirOnce(h, () => void this.load())));
  }
  reload = () => {
    this.load();
  };
  load = async () => {
    if (isCrossSessionMessagingEnabled() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", !1))
      this.#e.touchFleetViewHeartbeat(this.#n);
    let h = ++this.#o,
      [E, k] = await Promise.all([this.#e.listJobs(this.#n), this.#e.listAliveDaemonJobs(this.#n)]);
    if (E !== null) this.#g = 0;
    else if (this.#t.jobs?.length && ++this.#g <= ph) {
      if (this.#g === 1)
        logForDebugging(
          "[fleet] listing sessions failed for a reason that may pass; keeping the listed sessions",
          { level: "warn" },
        );
      return;
    }
    let mapped = markCrashed(await this.#e.adoptRosterOrphans(E ?? [], k.records, this.#n), k.shorts)
      .filter((N) => !this.#u.has(N.id))
      .map((N) => ({ ...N, activity: jobOutcome(N.state, this.#t.prStatuses) }));
    if (h <= this.#m) return;
    if (((this.#m = h), this.#i > 0)) this.#f("overlaidLoadLanded", () => !0);
    this.updateJobs((N) => {
      let X =
          N && this.#h.size > 0 ? new Map(N.filter((W) => this.#h.has(W.id)).map((W) => [W.id, W])) : null,
        K = jn(X ? mapped.map((W) => X.get(W.id) ?? W) : mapped);
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
    let filtered = mapped.filter((N) => jobTempo(N.state) !== "completed"),
      results = await Promise.all(filtered.map(async (N) => [N.id, await this.#e.readLogTail(N, this.#n)]));
    this.#f("logTails", (N) => {
      let fromEntries = Object.fromEntries(results),
        keys = Object.keys(N);
      if (keys.length === results.length && keys.every((W) => N[W] === fromEntries[W])) return N;
      return fromEntries;
    });
    let filtered_2 = mapped.filter((N) => isLoopJob(N.state));
    if (filtered_2.length > 0) {
      let filtered = (
        await Promise.all(
          filtered_2.map(async (K) => {
            for (let W of jobTranscriptPaths(K.state))
              try {
                let probeFleetTranscript = await this.#e.probeFleetTranscript(W, this.#n);
                if (probeFleetTranscript.kind === "present")
                  return [K.state.sessionId, probeFleetTranscript.mtimeMs, W];
                if (probeFleetTranscript.kind !== "absent") return null;
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
              let scanLoopTranscript = await this.#e.scanLoopTranscript(this.#M, oe);
              return scanLoopTranscript ? [W, { mtimeMs: z, ...scanLoopTranscript }] : null;
            } catch {
              return null;
            }
          }),
        );
        this.#f("loopKicks", (W) => {
          let z = !1,
            oe = new Map(W);
          for (let ge of results) if (ge) (oe.set(ge[0], ge[1]), (z = !0));
          return z ? oe : W;
        });
      }
    }
    let L = uniq(
        mapped.flatMap((N) =>
          bn(N.state.children)
            .filter((X) => X.kind !== "frame")
            .map((X) => X.href),
        ),
      ),
      filtered_3 = L.filter((N) => {
        let X = this.#t.prStatuses.get(N)?.state;
        return X !== "MERGED" && X !== "CLOSED";
      }),
      now = Date.now(),
      U = now - this.#y >= rosterPollInterval(getTerminalFocused(), now - getLastInteractionTime());
    if (filtered_3.length > 0 && U) {
      this.#y = now;
      let N = getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_pr_batch", !0);
      (async () => {
        let X;
        if (N) {
          let prStatusBatch = await this.#e.fetchPrStatusBatch(filtered_3);
          ((X = prStatusBatch.statuses),
            await Promise.all(
              prStatusBatch.unbatched.map(async (W) => X.set(W, await this.#e.fetchPrStatusByUrl(W))),
            ));
        } else
          X = new Map(
            await Promise.all(filtered_3.map(async (K) => [K, await this.#e.fetchPrStatusByUrl(K)])),
          );
        this.#F((K) => {
          let W = !1;
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
              W = !0;
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
      let N = new Set(mapped.map((K) => K.state.sessionId)),
        X = new Set(L);
      if ((this.#f("loopKicks", (K) => ls(K, N)), this.#F((K) => ls(K, X)), mapped.length > 0)) {
        let deleteRefusals = this.#t.deleteRefusals,
          W = new Set(this.#u);
        for (let z of mapped) {
          if (!deleteRefusals.has(z.id)) continue;
          if (isSettled(z.state)) (this.#k.add(z.id), W.add(z.id));
          else if (!this.#k.has(z.id)) W.add(z.id);
        }
        this.#f("deleteRefusals", (z) => ls(z, W));
        for (let z of this.#k) if (!W.has(z)) this.#k.delete(z);
      }
      uc(this.#M, new Set(mapped.flatMap((K) => jobTranscriptPaths(K.state))));
    }
  };
  #H = () => {
    this.#e
      .listAllLiveSessions(this.#n)
      .then((h) => {
        let E = new Map(),
          k = new Map();
        for (let T of h) {
          if (T.kind === "interactive" && T.pid !== process.pid && T.sessionId && T.parkedJobId === void 0)
            k.set(T.sessionId, T.pid);
          if (!T.status) continue;
          if (T.sessionId) E.set(T.sessionId, T.status);
          if (T.jobId) E.set(wi(T.jobId), T.status);
        }
        for (let T of E.keys()) this.#I.delete(T);
        let C = hAr();
        if (C && h.some((T) => T.sessionId === C.sessionId)) gxs(C.sessionId);
        let x = !1;
        for (let [T, A] of this.#C) {
          let found = h.find((V) => V.sessionId === T || V.jobId === A.jobId);
          if (
            E.get(T) === "busy" ||
            E.get(wi(A.jobId)) === "busy" ||
            (found !== void 0 && (found.statusUpdatedAt ?? 0) > A.kickedAt && found.startedAt <= A.kickedAt)
          )
            (this.#C.delete(T), (x = !0));
        }
        if (
          (this.#f("statuses", (T) =>
            !x && T.size === E.size && [...E].every(([A, L]) => T.get(A) === L) ? T : E,
          ),
          this.#f("terminalHolders", (T) =>
            T.size === k.size && [...k].every(([A, L]) => T.get(A) === L) ? T : k,
          ),
          isCrossSessionMessagingEnabled() &&
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_fleetview_peers", !1))
        ) {
          let T = new Set((this.#t.jobs ?? []).map((V) => V.state.sessionId)),
            now = Date.now(),
            mapped = h
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
                return { id: `peer-${V.pid}`, state: D, activity: jobOutcome(D) };
              });
          this.updateAdoptedPeers((V) => {
            let D = new Map(V.map((N) => [N.id, N])),
              mapped_2 = mapped.map((N) => {
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
    let E = ++this.#E,
      k = { moreRemain: !1 };
    this.#e
      .listRemoteSessions(k)
      .then(
        (C) => this.#P(E, now, C, null, k.moreRemain),
        (C) => {
          let x = C instanceof CloudListPartialError ? C : null;
          (logForDebugging(
            `[fleet:remote] list failed after ${x?.rows.length ?? 0} rows: ${errorMessage(x?.cause ?? C)}`,
          ),
            this.#P(E, now, x?.rows ?? [], classifyCloudListFailure(C), !1));
        },
      )
      .catch((C) => {
        (logForDebugging(`[fleet:remote] poll mapper threw: ${errorMessage(C)}`),
          this.#P(E, now, [], { cause: "unknown" }, !1));
      });
  };
  #P(h, E, k, C, x) {
    if (h <= this.#R) return;
    let T = null;
    for (let [D, U] of this.#p) if (E >= U.answeredAt) this.#p.delete(D);
    let filtered = k
      .map((D) => {
        let U = remoteRowId(D.id),
          N = this.#p.get(U),
          X = describeSessionAttention(N ? { ...D, title: N.title } : D),
          K = T?.get(U);
        if (K) X = { ...X, group: K.group, pinned: K.pinned };
        let W = this.#b.get(U);
        if (W !== void 0)
          if (isSettled(X) || (D.worker_status === "idle" && h > W.lastPoll) || E > W.expiry)
            this.#b.delete(U);
          else X = { ...X, state: "stopped", tempo: "idle", needs: void 0, detail: X.detail };
        return { id: U, state: X, activity: jobOutcome(X) };
      })
      .filter((D) => {
        let U = this.#v.get(D.id);
        if (U === void 0) return !0;
        if (E > U && !this.#w.has(D.id)) return (this.#v.delete(D.id), !0);
        if (this.#w.has(D.id)) this.#w.set(D.id, D);
        return !1;
      });
    this.#R = h;
    let L = C !== null && C.cause !== "exhausted",
      V = new Set(filtered.map((D) => D.id));
    if (
      (this.updateRemoteJobs((D) =>
        mergePendingRemoteJobs(
          D,
          L
            ? [...filtered, ...D.filter((U) => !V.has(U.id) && !U.id.startsWith("remote-pending-"))]
            : filtered,
        ),
      ),
      this.#f("remoteListHasOlder", (D) => (L ? D : x)),
      this.#i > 0)
    )
      (this.#f("remoteListFailure", (D) => (sameCloudListFailure(D, C) ? D : C)),
        this.#f("remoteListLoaded", () => !0));
  }
  markRemoteRow(h, E) {
    return this.#N((k) => {
      let C = k.get(h) ?? mh,
        x = E(C);
      return x.group === C.group && x.pinned === C.pinned ? Tc : new Map([[h, x]]);
    });
  }
  regroupRemoteRows(h, E) {
    return this.#N((k) => {
      let C = new Map();
      for (let [x, T] of k) if (T.group === h) C.set(x, { ...T, group: E });
      return C;
    });
  }
  #N(h) {
    let E = h(this.#e.readCloudRowMarks());
    if (E.size === 0) return Promise.resolve(!0);
    let remoteJobs = this.#t.remoteJobs,
      saveCloudRowMarks = this.#e.saveCloudRowMarks(
        h,
        new Set(remoteJobs.map((x) => remoteRowIdOf(x) ?? x.id)),
        this.#n,
      );
    if (remoteJobs.some((x) => E.has(remoteRowIdOf(x) ?? x.id)))
      this.updateRemoteJobs((x) =>
        x.map((T) => {
          let A = E.get(remoteRowIdOf(T) ?? T.id);
          return A ? { ...T, state: { ...T.state, group: A.group, pinned: A.pinned ?? !1 } } : T;
        }),
      );
    return saveCloudRowMarks;
  }
  async stopRemote(h) {
    let sessionId = h.state.sessionId,
      k = { expiry: Date.now() + vc, lastPoll: this.#E };
    (this.#b.set(h.id, k),
      this.updateRemoteJobs((C) =>
        C.map((x) =>
          x.id === h.id && !isSettled(x.state)
            ? {
                ...x,
                state: { ...x.state, state: "stopped", tempo: "idle", needs: void 0, detail: x.state.detail },
                activity: "stopped",
              }
            : x,
        ),
      ));
    try {
      if (!(await this.#e.interruptRemoteSession(sessionId))) throw Error("interrupt rejected");
      (logFeatureOk("fleet_view_stop_session"),
        logEvent("tengu_bg_agent_action", {
          action: lit("stop"),
          source: lit("fleet"),
          jobSessionId: ye(sessionId),
        }));
    } catch (error) {
      if (
        (logFeatureBad("fleet_view_stop_session", "interrupt_failed"),
        logForDebugging(`[fleet:remote] interrupt ${sessionId} failed: ${errorMessage(error)}`),
        this.#b.get(h.id) === k)
      ) {
        if ((this.#b.delete(h.id), this.#w.has(h.id))) this.#w.set(h.id, h);
        this.updateRemoteJobs((x) =>
          x.some((T) => T.id === h.id) ? x.map((T) => (T.id === h.id ? this.#D(h) : T)) : x,
        );
      }
      throw (this.loadRemote(), error);
    }
  }
  remoteReplyLanded(h) {
    (this.#b.delete(h), this.loadRemote());
  }
  remoteSessionOpened(h) {
    let E = this.#b.get(h);
    if (E !== void 0) E.expiry = 0;
  }
  async archiveRemote(h) {
    let sessionId = h.state.sessionId;
    (this.#v.set(h.id, Date.now() + vc),
      this.#w.set(h.id, h),
      this.updateRemoteJobs((T) => T.filter((A) => A.id !== h.id)));
    let k = (this.#_ ??= { left: 0, deleted: 0, failed: new Map(), pausedRoutines: 0, mayStillRun: !1 });
    k.left++;
    let C = "archive_failed";
    try {
      let removeRemoteSession = await this.#e.removeRemoteSession(sessionId, this.#n);
      if (
        ((k.pausedRoutines += removeRemoteSession.pausedRoutines),
        (k.mayStillRun ||= removeRemoteSession.mayStillRun !== null),
        removeRemoteSession.failure !== null)
      )
        throw ((C = removeRemoteSession.failure), Error("archive rejected"));
      if (removeRemoteSession.mayStillRun !== null)
        logFeatureSad("fleet_view_archive_session", removeRemoteSession.mayStillRun);
      else logFeatureOk("fleet_view_archive_session");
      (logEvent("tengu_bg_agent_action", {
        action: lit("archive"),
        source: lit("fleet"),
        jobSessionId: ye(sessionId),
      }),
        k.deleted++,
        k.failed.delete(h.id));
    } catch (error) {
      k.failed.set(h.id, C);
      let A = this.#V(k);
      (logFeatureBad("fleet_view_archive_session", C),
        logForDebugging(`[fleet:remote] archive ${sessionId} failed (${C}): ${errorMessage(error)}`));
      let L = this.#w.get(h.id);
      if (this.#v.delete(h.id) && L !== void 0)
        this.updateRemoteJobs((V) =>
          h.id.startsWith("remote-pending-") || V.some((D) => D.id === h.id) ? V : [...V, this.#D(L)],
        );
      throw (this.loadRemote(), new ds(A));
    } finally {
      this.#w.delete(h.id);
    }
    return this.#V(k);
  }
  #V(h) {
    if (--h.left > 0 || this.#_ !== h) return null;
    this.#_ = null;
    let { left: left, failed: failed, ...C } = h,
      x = [...failed.values()];
    return {
      ...C,
      failed: failed.size,
      ofProject: count(x, (T) => T === PROJECT_SESSION),
      maybeOfProject: count(x, (T) => T === PROJECT_UNKNOWN),
    };
  }
  async renameRemote(h, E, k) {}
}
/**
 * 取或创建这次访问的 FleetRoster；storageV5 不同时报错并保留原实例。
 */
//@ chunk-93kwxas0.js:37835-38080 placement
function ensureFleetRoster(h, E) {
  if (h.roster) {
    if (!h.roster.usesStorage(E))
      logError(
        Error(
          "[fleet:roster] ensureFleetRoster called with a different storageV5 than the visit was created with; keeping the original",
        ),
      );
    return h.roster;
  }
  return (h.roster = new FleetRoster({ storageV5: E }));
}
//@ chunk-93kwxas0.js:38080-38102 placement
var hh = 100,
  Fc = new Set();
/**
 * 选择状态初始值（焦点、折叠、完成上限等）。
 */
//@ chunk-93kwxas0.js:38102-38215 placement
function createInitialSelectionState(h) {
  return {
    focusedIdx: 0,
    hoverFocusIdx: null,
    collapsed: h,
    capExpanded: Fc,
    draftPick: !1,
    followOrigin: null,
  };
}
/**
 * 旧格式的折叠键补上 state:/directory: 前缀。
 */
//@ chunk-93kwxas0.js:38215-38363 placement
function normalizeCollapsedKeys(h) {
  let E = FLEET_BUCKETS;
  return new Set(
    h.map((k) =>
      k === "pinned" || /^(state|directory|group):/.test(k)
        ? k
        : `${E.includes(k) ? "state" : "directory"}:${k}`,
    ),
  );
}
/**
 * 附加/新建会话控制器（附加中、提升、新会话尝试）。
 */
//@ chunk-93kwxas0.js:38363-43414 placement
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
  #o = !1;
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
  #v = !1;
  #b = null;
  constructor(h) {
    ((this.#n = h.roster),
      (this.#e = h.storageV5),
      (this.#t = createInitialSelectionState(
        h.collapsed && h.collapsed.length > 0 ? normalizeCollapsedKeys(h.collapsed) : Fc,
      )));
  }
  getSnapshot = () => this.#t;
  subscribe = (h) => this.#l.subscribe(h);
  #p(h) {
    let E = this.#t,
      k = { ...E, ...h };
    if (
      k.focusedIdx === E.focusedIdx &&
      k.hoverFocusIdx === E.hoverFocusIdx &&
      k.collapsed === E.collapsed &&
      k.capExpanded === E.capExpanded &&
      k.draftPick === E.draftPick &&
      k.followOrigin === E.followOrigin
    )
      return;
    ((this.#t = k), this.#l.emit());
  }
  attachView(h) {
    (this.#r++, (this.#i = h.clock), (this.#c = h.onError));
    let E = !1;
    return () => {
      if (E) return;
      if (((E = !0), this.#r--, this.#r === 0)) this.#x();
    };
  }
  #x() {
    (this.#u?.(), (this.#u = null));
    let h = this.#d;
    ((this.#d = []),
      this.#I().finally(() => {
        for (let E of h) E();
      }),
      (this.#i = null),
      (this.#c = null),
      (this.followId = null),
      (this.followOrigin = null),
      (this.#a = []),
      (this.#o = !1),
      (this.#S = 0),
      (this.#k = null),
      (this.#h = null),
      (this.#R = null),
      (this.#v = !1),
      (this.#b = null),
      (this.#t = createInitialSelectionState(this.#t.collapsed)));
  }
  focus(h) {
    this.#p({ focusedIdx: h });
  }
  navigateTo(h, E) {
    (this.#w(h, E), this.#p({ focusedIdx: h, hoverFocusIdx: null }));
  }
  jumpToHeader(h, E) {
    ((this.#b = h), this.navigateTo(h, E));
  }
  takeRevealAtTop(h) {
    let E = this.#b === h;
    return ((this.#b = null), E);
  }
  hoverTo(h, E) {
    (this.#w(h, E), this.#p({ focusedIdx: h, hoverFocusIdx: h }));
  }
  followPick(h, E) {
    ((this.#s = E?.kind === "job" ? E.job.id : E?.kind === "earlier" ? E.entry.sessionId : null),
      this.#p({ focusedIdx: h, hoverFocusIdx: null, draftPick: !0, followOrigin: null }));
  }
  returnPickTo(h) {
    ((this.#y = h), (this.#T = null));
  }
  releasePick(h, E, k) {
    let C = this.#y,
      x = this.#T,
      index = h.findIndex((V) =>
        x
          ? V.kind === "header" && V.group === x
          : (V.kind === "job" && V.job.id === C) || (V.kind === "earlier" && V.entry.sessionId === C),
      ),
      A = index >= 0 ? index : E,
      L = h[A];
    if (k && this.#s && L?.kind === "header" && L.group !== this.#R) {
      this.followId = this.#s;
      return;
    }
    ((this.followId = index >= 0 ? C : null),
      (this.followOrigin = index >= 0 ? x : null),
      this.#p({ focusedIdx: A, hoverFocusIdx: null }));
  }
  sessionListedAs(h, E) {
    this.#E.set(h, E);
  }
  #w(h, E) {
    if (
      ((this.followId = E?.kind === "job" ? E.job.id : null),
      (this.followOrigin = E?.kind === "header" ? E.group : null),
      h !== this.#t.focusedIdx)
    )
      this.#R = this.followOrigin;
  }
  get followId() {
    return this.#s;
  }
  set followId(h) {
    if (((this.#s = h), (this.#y = h), (this.#T = this.followOrigin), h)) this.#R = null;
    this.#p({ draftPick: !1 });
  }
  get followOrigin() {
    return this.#t.followOrigin;
  }
  set followOrigin(h) {
    ((this.#T = h), this.#p({ followOrigin: h }));
  }
  clearFollow() {
    ((this.#s = null), this.#p({ draftPick: !1, followOrigin: null }));
  }
  setHoverFocusIdx(h) {
    this.#p({ hoverFocusIdx: h });
  }
  clampFocus(h) {
    this.#p({ focusedIdx: clamp(this.#t.focusedIdx, 0, Math.max(0, h - 1)) });
  }
  syncRows(h) {
    ((this.#a = h), (this.#o = !1));
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
    let { focusedIdx: focusedIdx, followOrigin: followOrigin } = this.#t;
    if (followOrigin) {
      let index = h.findIndex((A) => A.kind === "header" && A.group === followOrigin);
      if (index >= 0 && index !== focusedIdx) this.#_(index);
      if (index < 0) this.#p({ followOrigin: null });
      return;
    }
    if (!this.#s) return;
    let C = this.#s,
      index = h.findIndex(
        (T) => (T.kind === "job" && T.job.id === C) || (T.kind === "earlier" && T.entry.sessionId === C),
      );
    if (index < 0) {
      this.#s = null;
      return;
    }
    if (index !== focusedIdx)
      (logForDebugging(`[FV-poll] follow re-pin moved focus: was=${focusedIdx} now=${index} followId=${C}`),
        this.#_(index));
  }
  #_(h) {
    let { focusedIdx: focusedIdx, hoverFocusIdx: hoverFocusIdx } = this.#t;
    this.#p({ focusedIdx: h, hoverFocusIdx: hoverFocusIdx === focusedIdx ? h : hoverFocusIdx });
  }
  focusedRow() {
    return this.#a[this.#t.focusedIdx];
  }
  get reorderIssued() {
    return this.#o;
  }
  beginReorder(h, E) {
    ((this.followId = h), (this.#o = !0), this.#_(E));
  }
  queueOrderWrites(h, E) {
    let k = E === "state" ? this.#g : this.#m;
    for (let [x, T] of h) (k.set(x, T), this.#d.push(this.#n.holdJob(x)));
    this.#u?.();
    let C = this.#i?.setTimeout ?? $L;
    this.#u = C(() => {
      ((this.#u = null), this.#n.bumpGen());
      let x = this.#d;
      ((this.#d = []),
        this.#I().finally(() => {
          for (let T of x) T();
          if (this.#r > 0) this.#n.reload();
        }));
    }, hh);
  }
  #I() {
    let list = Array.from(this.#m),
      list_2 = Array.from(this.#g);
    if ((this.#m.clear(), this.#g.clear(), list.length === 0 && list_2.length === 0))
      return Promise.resolve();
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
      .catch((C) => {
        (logError(C),
          this.#c?.(`Couldn't save order \u2014 ${errorMessage(C)}`),
          logFeatureBad("fleet_view_reorder_job", "write_sort_order_failed"));
      });
  }
  toggleCollapsed(h, E) {
    let k = new Set(this.#t.collapsed);
    if (k.has(h)) {
      (k.delete(h), this.#p({ collapsed: k }));
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
    this.#p({ collapsed: k });
  }
  renameCollapsedKey(h, E) {
    let collapsed = this.#t.collapsed;
    if (!collapsed.has(h)) return;
    let C = new Set(collapsed);
    (C.delete(h), C.add(E), this.#p({ collapsed: C }));
  }
  expandCap(h) {
    if (this.#t.capExpanded.has(h)) return;
    this.#p({ capExpanded: new Set(this.#t.capExpanded).add(h) });
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
    if (this.#v) return !1;
    return ((this.#v = !0), !0);
  }
}
//@ chunk-93kwxas0.js:43414-43499 placement
function ws(h, E, k, C) {
  return (h.selection ??= new FleetAttachController({ roster: E, storageV5: k, collapsed: C }));
}
//@ chunk-93kwxas0.js:43499-43514 placement
var Mc = new Set();
//@ chunk-93kwxas0.js:43514-43591 placement
function Ac() {
  return { attachingJobId: null, newSessionOpening: !1, autoOpened: !1 };
}
/**
 * 会话实时状态存储（预热中的 job 等）。
 */
//@ chunk-93kwxas0.js:43591-45557 placement
class FleetLiveStatusStore {
  #n = createSignal();
  #e = { ...Ac(), warmingJobIds: Mc };
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
    let E = this.#e,
      k = { ...E, ...h };
    if (
      k.attachingJobId === E.attachingJobId &&
      k.newSessionOpening === E.newSessionOpening &&
      k.warmingJobIds === E.warmingJobIds &&
      k.autoOpened === E.autoOpened
    )
      return;
    ((this.#e = k), this.#n.emit());
  }
  attachView() {
    this.#l++;
    let h = !1;
    return () => {
      if (h) return;
      if (((h = !0), this.#l--, this.#l === 0))
        ((this.#r = null),
          this.#i++,
          this.#c++,
          (this.#s = null),
          (this.#a = null),
          (this.#o = null),
          (this.#g = null),
          this.#u.clear(),
          (this.#e = { ...this.#e, ...Ac() }));
    };
  }
  arm(h, E) {
    ((this.#r = E), this.#d({ attachingJobId: h }));
  }
  disarm() {
    let h = this.#r;
    return ((this.#r = null), this.#d({ attachingJobId: null }), h);
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
    (this.#t.set(h, E),
      this.#S(),
      E.then(() => {
        if (this.#t.get(h) === E) (this.#t.delete(h), this.#S());
      }));
  }
  dropWarming(h) {
    if (this.#t.delete(h)) this.#S();
  }
  #S() {
    this.#d({ warmingJobIds: this.#t.size === 0 ? Mc : new Set(this.#t.keys()) });
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
    ((this.#o = h), (this.#m = h === null ? 0 : Date.now()));
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
    return (this.#d({ newSessionOpening: !0 }), ++this.#c);
  }
  isCurrentNewSessionAttempt(h) {
    return this.#c === h;
  }
  endNewSession() {
    this.#d({ newSessionOpening: !1 });
  }
  abandonNewSession() {
    (this.#c++, this.#d({ newSessionOpening: !1 }));
  }
  markAutoOpened() {
    this.#d({ autoOpened: !0 });
  }
}
//@ chunk-93kwxas0.js:45557-45597 placement
function Ss(h) {
  return (h.attach ??= new FleetLiveStatusStore());
}
/**
 * 删除不再被任何消息引用的粘贴内容（默认只删图片）。
 */
//@ chunk-93kwxas0.js:45597-45837 placement
function prunePastedContents(h, E, { pruneTextPastes: k = !1 } = {}) {
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
  jobSortKey,
  gs,
  jn,
  remoteRowIdOf,
  cd,
  ensureFleetRoster,
  ws,
  Ss,
  bs,
  CloudListFailureNotice,
  cc,
  oc,
  jobTempo,
  emitFinishedJobs,
  hc,
  Qu,
  reportFatalAndExit,
  nc,
  resolveDispatchPermissionMode,
  prunePastedContents,
  bn,
  jobOutcome,
  Io,
  pd,
  Ao,
  hd,
  mo,
  Si,
  jobBucket,
  FLEET_BUCKETS,
  gd,
  computeDoneCap,
  doneFoldIndex,
  fs,
  layoutRows,
  bestSearchMatchIndex,
  initialFocusIndex,
  cs,
  statTranscript,
  stripJobPreviewText,
  yi,
  fd,
  hasNonDefaultDispatchSettings,
  DispatchDefaultsLine,
};
