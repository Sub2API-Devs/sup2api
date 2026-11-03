/**
 * bridge/bridgeReconnectBudget.ts
 *
 * 2.1.316 新增：判断一个占位记录是否该删除：进程仍活着则保留，已使用或服务端会话不存在则删除；延迟启动一次性的占位记录清理：逐条查询服务端会话状态，删除失效记录并上报 tengu_bridge_placeholder_sweep等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4cm44bmp.js (20)
 * attribution: placement 20
 */
import { count } from "../utils/collections.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { looseObject, E, string } from "../../vendor/zod/v4/classic/schemas.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { bridgeHostState } from "./bridgeHostState.js";
import { ownProcStartAsync, isSameProcessAsync, isProcessProvablyGone } from "../utils/processIdentity.js";
import { shortHash } from "../utils/shortHash.js";
import { saveGlobalConfig, getGlobalConfig } from "../utils/config.js";
import { logForDebugging } from "../utils/debug.js";
import { isProcessRunning } from "../utils/genericProcessUtils.js";
import { errorMessage } from "../utils/errors.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { parseIsoTimestamp } from "../utils/parseIsoTimestamp.js";
import { getBridgeSessionOrStatus } from "./createSession.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { sleep } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit } from "../services/analytics/safeMetadata.js";

//@ chunk-4cm44bmp.js:19536-19896 placement
/**
 * Remote Control 重连预算常量：每小时/每天的重连次数上限、窗口长度与耗尽时的说明文字。
 */
var MAX_RECONNECTS_PER_HOUR = 3;
var RECONNECT_HOURLY_WINDOW_MS = 3600000;
var MAX_RECONNECTS_PER_DAY = 24 * MAX_RECONNECTS_PER_HOUR;
var RECONNECT_DAILY_WINDOW_MS = 24 * RECONNECT_HOURLY_WINDOW_MS;
var HEALTHY_BEAT_RESET_MS = 600000;
var BRIDGE_REMINT_BACKOFF_BASE_MS = 30000;
var BRIDGE_REMINT_BACKOFF_CAP_MS = 300000;
var BRIDGE_REMINT_MIN_JITTER_MS = 5000;
var OWNER_REMINT_MAX_ATTEMPTS = 14;
var REINT_30MIN_UNREACHABLE_DETAIL = "could not reach the Remote Control server for about 30 minutes";
var HOURLY_EXHAUSTED_DETAIL =
  "the connection to the Remote Control server kept dropping after each reconnect";
var DAILY_EXHAUSTED_DETAIL = `the connection to the Remote Control server dropped more than ${MAX_RECONNECTS_PER_DAY} times in 24 hours`;
var OWNER_REMINT_CAP = {
  attempts: OWNER_REMINT_MAX_ATTEMPTS,
  exhaustedDetail: REINT_30MIN_UNREACHABLE_DETAIL,
};
//@ chunk-4cm44bmp.js:19896-20184 placement
/**
 * 桥接断线重连预算：charge(now, 计日上限) 按 24 小时与 1 小时滑动窗口计数，返回 daily_exhausted / hourly_exhausted / charged；noteHealthyBeat 在连接健康满 10 分钟后重置小时窗口的起点。
 */
function createReconnectBudget() {
  let n = [];
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  return {
    charge(w, C) {
      n = n.filter((x) => w - x < RECONNECT_DAILY_WINDOW_MS);
      if (C && n.length >= MAX_RECONNECTS_PER_DAY) return "daily_exhausted";
      if (
        count(n, (x) => w - x < RECONNECT_HOURLY_WINDOW_MS && (!C || x >= NEGATIVE_INFINITY)) >=
        MAX_RECONNECTS_PER_HOUR
      )
        return "hourly_exhausted";
      n.push(w);
      return "charged";
    },
    noteHealthyBeat(w) {
      let last = n.at(-1);
      if (last !== undefined && w - last >= HEALTHY_BEAT_RESET_MS) NEGATIVE_INFINITY = w;
    },
  };
}
//@ chunk-4cm44bmp.js:20184-20317 placement
var bridgePlaceholderRecordSchema = DoctorLazy(() =>
  looseObject({
    pid: E().int(),
    procStart: string().optional().catch(undefined),
    createdAt: E(),
    titleSha: string().optional(),
    usedAt: E().optional(),
  }),
);
//@ chunk-4cm44bmp.js:20317-20557 placement
function readBridgePlaceholders(replBridgePlaceholders) {
  if (
    typeof replBridgePlaceholders !== "object" ||
    replBridgePlaceholders === null ||
    Array.isArray(replBridgePlaceholders)
  )
    return [];
  return Object.entries(replBridgePlaceholders).flatMap(([key, value]) => {
    let C = bridgePlaceholderRecordSchema().safeParse(value);
    if (!C.success) return [];
    let { procStart, ...x } = C.data;
    return [
      [
        key,
        procStart === undefined
          ? x
          : {
              ...x,
              procStart,
            },
      ],
    ];
  });
}
//@ chunk-4cm44bmp.js:20557-20636 placement
var PLACEHOLDER_MIN_SESSION_AGE_MS = 300000;
var PLACEHOLDER_KEEP_MAX_AGE_MS = 2592000000;
var MAX_BRIDGE_PLACEHOLDERS = 20;
var PLACEHOLDER_SWEEP_START_DELAY_MS = 15000;
var BRIDGE_SESSION_ID_PATTERN = /^(session|cse)_[A-Za-z0-9_-]+$/;
//@ chunk-4cm44bmp.js:20636-20798 placement
async function isPlaceholderSweepEnabled() {
  if (isEssentialTrafficOnly()) return false;
  let { getFeatureValue_CACHED_MAY_BE_STALE } = await import("./chunk-6df1d6re.js");
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_placeholder_sweep", true);
}
//@ chunk-4cm44bmp.js:20798-20913 placement
function enqueuePlaceholderWrite(n) {
  let h = bridgeHostState();
  h.placeholderWriteChain = h.placeholderWriteChain.then(n, n);
  return h.placeholderWriteChain;
}
//@ chunk-4cm44bmp.js:20913-21561 placement
/**
 * 在全局配置 replBridgePlaceholders 里记录一个桥接占位会话（pid、进程启动时间、标题哈希），超过上限时淘汰最旧的。
 */
function recordBridgePlaceholder(sessionId, h, storageV5) {
  return enqueuePlaceholderWrite(async () => {
    if (!(await isPlaceholderSweepEnabled())) return;
    let procStart = await ownProcStartAsync();
    let N = {
      pid: process.pid,
      procStart,
      createdAt: Date.now(),
      ...(h !== undefined && {
        titleSha: shortHash(h),
      }),
    };
    await saveGlobalConfig((x) => {
      let bridgePlaceholders = readBridgePlaceholders(x.replBridgePlaceholders);
      let filtered = bridgePlaceholders.filter(([Y]) => !sameSessionBody(Y, sessionId));
      let A =
        h === undefined ? bridgePlaceholders.find(([Y]) => sameSessionBody(Y, sessionId))?.[1] : undefined;
      filtered.push([
        sessionId,
        {
          ...N,
          ...(A?.titleSha !== undefined && {
            titleSha: A.titleSha,
          }),
          ...(A?.usedAt !== undefined && {
            usedAt: A.usedAt,
          }),
        },
      ]);
      filtered.sort((Y, ie) => ie[1].createdAt - Y[1].createdAt);
      let sliced = filtered.slice(MAX_BRIDGE_PLACEHOLDERS);
      if (sliced.length > 0)
        logForDebugging(
          `[bridge:placeholder] evicting ${sliced.length} record(s) past cap: ${sliced.map(([Y]) => Y).join(", ")}`,
        );
      return {
        ...x,
        replBridgePlaceholders: Object.fromEntries(filtered.slice(0, MAX_BRIDGE_PLACEHOLDERS)),
      };
    }, storageV5);
  });
}
//@ chunk-4cm44bmp.js:21561-21830 placement
/**
 * 统计仍在运行的 REPL bridge 进程数（含自身）：按全局配置里的占位记录逐个核对进程存活与启动时间，出错返回 0。
 */
async function countLiveBridgeProcesses() {
  try {
    let mapped = readBridgePlaceholders(getGlobalConfig().replBridgePlaceholders).map(([, C]) => C);
    let h = 1;
    let w = new Set();
    for (let C of mapped) {
      if (C.pid === process.pid || w.has(C.pid)) continue;
      if (
        C.procStart !== undefined
          ? isProcessRunning(C.pid) && (await isSameProcessAsync(C.pid, C.procStart))
          : isProcessRunning(C.pid)
      ) {
        w.add(C.pid);
        h++;
      }
    }
    return h;
  } catch {
    return 0;
  }
}
//@ chunk-4cm44bmp.js:21830-22083 placement
function removeBridgePlaceholdersFor(sessionId, storageV5) {
  return enqueuePlaceholderWrite(async () => {
    await saveGlobalConfig((w) => {
      let filtered = Object.keys(w.replBridgePlaceholders ?? {}).filter((key) =>
        sameSessionBody(key, sessionId),
      );
      if (filtered.length === 0) return w;
      let N = {
        ...w.replBridgePlaceholders,
      };
      for (let x of filtered) delete N[x];
      return {
        ...w,
        replBridgePlaceholders: N,
      };
    }, storageV5);
  });
}
//@ chunk-4cm44bmp.js:22083-22448 placement
/**
 * 把属于当前会话的桥接占位记录标记为已使用（usedAt）。
 */
function markBridgePlaceholderUsed(sessionId, storageV5) {
  return enqueuePlaceholderWrite(async () => {
    await saveGlobalConfig((w) => {
      let filtered = readBridgePlaceholders(w.replBridgePlaceholders).filter(
        ([x, Q]) => sameSessionBody(x, sessionId) && Q.usedAt === undefined,
      );
      if (filtered.length === 0) return w;
      let N = {
        ...w.replBridgePlaceholders,
      };
      for (let [x, Q] of filtered)
        N[x] = {
          ...Q,
          usedAt: Date.now(),
        };
      return {
        ...w,
        replBridgePlaceholders: N,
      };
    }, storageV5);
  }).catch((error) => {
    logForDebugging(`[bridge:placeholder] use stamp failed: ${errorMessage(error)}`, {
      level: "error",
    });
  });
}
//@ chunk-4cm44bmp.js:22448-22486 placement
function sameSessionBody(n, h) {
  return sessionIdBody(n) === sessionIdBody(h);
}
//@ chunk-4cm44bmp.js:22486-22576 placement
async function isProcessGoneOrRestarted(n) {
  if (isProcessProvablyGone(n.pid)) return true;
  return isProcessRunning(n.pid) && !(await isSameProcessAsync(n.pid, n.procStart));
}
//@ chunk-4cm44bmp.js:22576-22733 placement
function isFinalArchiveOutcome(n) {
  if (n === "invalid" || n === "skipped_superseded" || n === "skipped_owner_changed") return true;
  return typeof n === "number" && n < 500 && n !== 401 && n !== 408 && n !== 429;
}
//@ chunk-4cm44bmp.js:22733-22889 placement
function toComparableTimestamp(n) {
  if (!n) return;
  let isoTimestamp = parseIsoTimestamp(n.replace(/\.\d+/, ""));
  if (Number.isNaN(isoTimestamp)) return;
  let w = /\.(\d+)/.exec(n)?.[1] ?? "";
  return `${isoTimestamp}.${w.replace(/0+$/, "")}`;
}
//@ chunk-4cm44bmp.js:22889-24085 placement
/**
 * 判断一个占位记录是否该删除：进程仍活着则保留，已使用或服务端会话不存在则删除。
 */
async function judgeBridgePlaceholder(n, h, w) {
  if (!(await isProcessGoneOrRestarted(h))) return "keep";
  if (h.usedAt !== undefined) return logPlaceholderUsedAndRemove("used_marker");
  let { session, notFound } = await getBridgeSessionOrStatus(n, {
    baseUrl: w.baseUrl,
    getAccessToken: w.getAccessToken,
  });
  if (notFound) return "remove";
  if (!session) return "keep";
  if (h.titleSha !== undefined) {
    if (typeof session.title !== "string") {
      logForDebugging(`[bridge:placeholder] session GET carried no title for ${n}; keeping`);
      return "keep";
    }
    if (shortHash(session.title) !== h.titleSha) return logPlaceholderUsedAndRemove("retitled");
  }
  let connectionStatus = session.connection_status;
  if (connectionStatus !== undefined && connectionStatus !== "disconnected")
    return connectionStatus === "connected" ? "keep_connected" : "keep_unreadable";
  let comparableTimestamp = toComparableTimestamp(session.created_at);
  let comparableTimestamp_2 = toComparableTimestamp(session.updated_at);
  if (comparableTimestamp === undefined || comparableTimestamp_2 === undefined) return "keep_unreadable";
  if (comparableTimestamp_2 !== comparableTimestamp) {
    logPlaceholderUsedAndRemove("updated_at");
    return connectionStatus === undefined
      ? "remove_active_no_connection_state"
      : "remove_active_disconnected";
  }
  let A = readBridgePlaceholders(getGlobalConfig().replBridgePlaceholders).find(([Y]) =>
    sameSessionBody(Y, n),
  )?.[1];
  if (A === undefined) return "remove";
  if (A.pid !== h.pid || A.procStart !== h.procStart || A.createdAt !== h.createdAt) return "keep";
  if (A.usedAt !== undefined) return logPlaceholderUsedAndRemove("used_marker");
  let Z = await w.archive(n);
  if (!isFinalArchiveOutcome(Z)) {
    logFeatureBad("bridge_placeholder_sweep", typeof Z === "number" ? `http_${Z}` : Z);
    return "keep";
  }
  logFeatureOk("bridge_placeholder_sweep");
  logForDebugging(`[bridge:placeholder] archived orphaned placeholder ${n} (status=${Z})`);
  return "remove";
}
//@ chunk-4cm44bmp.js:24085-25199 placement
/**
 * 延迟启动一次性的占位记录清理：逐条查询服务端会话状态，删除失效记录并上报 tengu_bridge_placeholder_sweep。
 */
function startBridgePlaceholderSweep(n) {
  let h = bridgeHostState();
  if (h.placeholderSweepStarted) return Promise.resolve();
  h.placeholderSweepStarted = true;
  return (async () => {
    await sleep(n.startDelayMs ?? PLACEHOLDER_SWEEP_START_DELAY_MS);
    if (!(await isPlaceholderSweepEnabled())) return;
    let replBridgePlaceholders = getGlobalConfig().replBridgePlaceholders;
    if (!replBridgePlaceholders) return;
    let C = n.skipSessionId ? sessionIdBody(n.skipSessionId) : undefined;
    let bridgePlaceholders = readBridgePlaceholders(replBridgePlaceholders);
    let x = new Set(bridgePlaceholders.map(([A]) => A));
    let filtered = Object.keys(replBridgePlaceholders).filter((key) => !x.has(key));
    let q = {
      keep_connected: 0,
      keep_unreadable: 0,
      remove_active_disconnected: 0,
      remove_active_no_connection_state: 0,
    };
    for (let [A, Z] of bridgePlaceholders) {
      let Y = Date.now() - Z.createdAt;
      if (Math.abs(Y) < PLACEHOLDER_MIN_SESSION_AGE_MS || sessionIdBody(A) === C) continue;
      if (!BRIDGE_SESSION_ID_PATTERN.test(A)) {
        filtered.push(A);
        continue;
      }
      let ie = await judgeBridgePlaceholder(A, Z, n);
      if (ie !== "remove" && ie !== "keep") {
        q[ie]++;
        logForDebugging(`[bridge:placeholder] ${A}: ${ie}`);
      }
      if (
        !(ie === "keep" || ie === "keep_connected" || ie === "keep_unreadable") ||
        Y > PLACEHOLDER_KEEP_MAX_AGE_MS
      )
        filtered.push(A);
    }
    if (Object.values(q).some((A) => A > 0))
      logFeatureSad("bridge_placeholder_sweep", "not_archived_on_server_state", q);
    if (filtered.length > 0)
      await saveGlobalConfig((A) => {
        if (!A.replBridgePlaceholders) return A;
        let Z = {
          ...A.replBridgePlaceholders,
        };
        for (let Y of filtered) delete Z[Y];
        return {
          ...A,
          replBridgePlaceholders: Z,
        };
      }, n.storageV5);
  })().catch((error) => {
    logForDebugging(`[bridge:placeholder] sweep failed: ${errorMessage(error)}`, {
      level: "error",
    });
  });
}
//@ chunk-4cm44bmp.js:25199-25287 placement
function logPlaceholderUsedAndRemove(n) {
  logEvent("tengu_bridge_placeholder_used_session", {
    signal: fromEnum(n),
  });
  return "remove";
}
//@ chunk-4cm44bmp.js:25287-25301 placement
var RECENT_USE_THRESHOLD_MS = 120000;
//@ chunk-4cm44bmp.js:25301-25351 placement
function bucketRecentUse(streakMs) {
  return streakMs <= RECENT_USE_THRESHOLD_MS ? lit("le_2m") : lit("gt_2m");
}
export {
  countLiveBridgeProcesses,
  removeBridgePlaceholdersFor,
  recordBridgePlaceholder,
  startBridgePlaceholderSweep,
  BRIDGE_REMINT_BACKOFF_CAP_MS,
  createReconnectBudget,
  bucketRecentUse,
  HOURLY_EXHAUSTED_DETAIL,
  DAILY_EXHAUSTED_DETAIL,
  BRIDGE_REMINT_BACKOFF_BASE_MS,
  BRIDGE_REMINT_MIN_JITTER_MS,
  OWNER_REMINT_CAP,
  markBridgePlaceholderUsed,
  isFinalArchiveOutcome,
};
