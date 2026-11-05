/**
 * bridge/bridgeReconnectBudget.ts
 *
 * 2.1.316 新增：判断一个占位记录是否该删除：进程仍活着则保留，已使用或服务端会话不存在则删除；延迟启动一次性的占位记录清理：逐条查询服务端会话状态，删除失效记录并上报 tengu_bridge_placeholder_sweep等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-56msakfz.js (20)
 * attribution: placement 20
 */
import { countWhere } from "../utils/collections.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { looseObject, numberSchema, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-56msakfz.js:19721-20081 placement
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
//@ chunk-56msakfz.js:20081-20369 placement
/**
 * 桥接断线重连预算：charge(now, 计日上限) 按 24 小时与 1 小时滑动窗口计数，返回 daily_exhausted / hourly_exhausted / charged；noteHealthyBeat 在连接健康满 10 分钟后重置小时窗口的起点。
 */
function createReconnectBudget() {
  let chargeTimestamps = [];
  let NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;
  return {
    charge(now, countsTowardDaily) {
      chargeTimestamps = chargeTimestamps.filter((chargedAt) => now - chargedAt < RECONNECT_DAILY_WINDOW_MS);
      if (countsTowardDaily && chargeTimestamps.length >= MAX_RECONNECTS_PER_DAY) return "daily_exhausted";
      if (
        countWhere(
          chargeTimestamps,
          (chargedAt) =>
            now - chargedAt < RECONNECT_HOURLY_WINDOW_MS &&
            (!countsTowardDaily || chargedAt >= NEGATIVE_INFINITY),
        ) >= MAX_RECONNECTS_PER_HOUR
      )
        return "hourly_exhausted";
      chargeTimestamps.push(now);
      return "charged";
    },
    noteHealthyBeat(now) {
      let last = chargeTimestamps.at(-1);
      if (last !== undefined && now - last >= HEALTHY_BEAT_RESET_MS) NEGATIVE_INFINITY = now;
    },
  };
}
//@ chunk-56msakfz.js:20369-20502 placement
var bridgePlaceholderRecordSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-56msakfz.js:20369", () => {
  bridgePlaceholderRecordSchema = DoctorLazy(() =>
    looseObject({
      pid: numberSchema().int(),
      procStart: stringSchema().optional().catch(undefined),
      createdAt: numberSchema(),
      titleSha: stringSchema().optional(),
      usedAt: numberSchema().optional(),
    }),
  );
});
//@ chunk-56msakfz.js:20502-20742 placement
function readBridgePlaceholders(replBridgePlaceholders) {
  if (
    typeof replBridgePlaceholders !== "object" ||
    replBridgePlaceholders === null ||
    Array.isArray(replBridgePlaceholders)
  )
    return [];
  return Object.entries(replBridgePlaceholders).flatMap(([key, value]) => {
    let parsed = bridgePlaceholderRecordSchema().safeParse(value);
    if (!parsed.success) return [];
    let { procStart, ...recordWithoutProcStart } = parsed.data;
    return [
      [
        key,
        procStart === undefined
          ? recordWithoutProcStart
          : {
              ...recordWithoutProcStart,
              procStart,
            },
      ],
    ];
  });
}
//@ chunk-56msakfz.js:20742-20821 placement
var PLACEHOLDER_MIN_SESSION_AGE_MS = 300000;
var PLACEHOLDER_KEEP_MAX_AGE_MS = 2592000000;
var MAX_BRIDGE_PLACEHOLDERS = 20;
var PLACEHOLDER_SWEEP_START_DELAY_MS = 15000;
var BRIDGE_SESSION_ID_PATTERN = /^(session|cse)_[A-Za-z0-9_-]+$/;
//@ chunk-56msakfz.js:20821-20983 placement
async function isPlaceholderSweepEnabled() {
  if (isEssentialTrafficOnly()) return false;
  let { getFeatureValue_CACHED_MAY_BE_STALE } =
    await import("../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_placeholder_sweep", true);
}
//@ chunk-56msakfz.js:20983-21098 placement
function enqueuePlaceholderWrite(writeOp) {
  let state = bridgeHostState();
  state.placeholderWriteChain = state.placeholderWriteChain.then(writeOp, writeOp);
  return state.placeholderWriteChain;
}
//@ chunk-56msakfz.js:21098-21746 placement
/**
 * 在全局配置 replBridgePlaceholders 里记录一个桥接占位会话（pid、进程启动时间、标题哈希），超过上限时淘汰最旧的。
 */
function recordBridgePlaceholder(sessionId, title, storageV5) {
  return enqueuePlaceholderWrite(async () => {
    if (!(await isPlaceholderSweepEnabled())) return;
    let procStart = await ownProcStartAsync();
    let record = {
      pid: process.pid,
      procStart,
      createdAt: Date.now(),
      ...(title !== undefined && {
        titleSha: shortHash(title),
      }),
    };
    await saveGlobalConfig((config) => {
      let bridgePlaceholders = readBridgePlaceholders(config.replBridgePlaceholders);
      let filtered = bridgePlaceholders.filter(([key]) => !sameSessionBody(key, sessionId));
      let existing =
        title === undefined
          ? bridgePlaceholders.find(([key]) => sameSessionBody(key, sessionId))?.[1]
          : undefined;
      filtered.push([
        sessionId,
        {
          ...record,
          ...(existing?.titleSha !== undefined && {
            titleSha: existing.titleSha,
          }),
          ...(existing?.usedAt !== undefined && {
            usedAt: existing.usedAt,
          }),
        },
      ]);
      filtered.sort((leftEntry, rightEntry) => rightEntry[1].createdAt - leftEntry[1].createdAt);
      let sliced = filtered.slice(MAX_BRIDGE_PLACEHOLDERS);
      if (sliced.length > 0)
        logForDebugging(
          `[bridge:placeholder] evicting ${sliced.length} record(s) past cap: ${sliced.map(([key]) => key).join(", ")}`,
        );
      return {
        ...config,
        replBridgePlaceholders: Object.fromEntries(filtered.slice(0, MAX_BRIDGE_PLACEHOLDERS)),
      };
    }, storageV5);
  });
}
//@ chunk-56msakfz.js:21746-22015 placement
/**
 * 统计仍在运行的 REPL bridge 进程数（含自身）：按全局配置里的占位记录逐个核对进程存活与启动时间，出错返回 0。
 */
async function countLiveBridgeProcesses() {
  try {
    let mapped = readBridgePlaceholders(getGlobalConfig().replBridgePlaceholders).map(([, record]) => record);
    let liveCount = 1;
    let seenPids = new Set();
    for (let record of mapped) {
      if (record.pid === process.pid || seenPids.has(record.pid)) continue;
      if (
        record.procStart !== undefined
          ? isProcessRunning(record.pid) && (await isSameProcessAsync(record.pid, record.procStart))
          : isProcessRunning(record.pid)
      ) {
        seenPids.add(record.pid);
        liveCount++;
      }
    }
    return liveCount;
  } catch {
    return 0;
  }
}
//@ chunk-56msakfz.js:22015-22268 placement
function removeBridgePlaceholdersFor(sessionId, storageV5) {
  return enqueuePlaceholderWrite(async () => {
    await saveGlobalConfig((config) => {
      let filtered = Object.keys(config.replBridgePlaceholders ?? {}).filter((key) =>
        sameSessionBody(key, sessionId),
      );
      if (filtered.length === 0) return config;
      let nextPlaceholders = {
        ...config.replBridgePlaceholders,
      };
      for (let key of filtered) delete nextPlaceholders[key];
      return {
        ...config,
        replBridgePlaceholders: nextPlaceholders,
      };
    }, storageV5);
  });
}
//@ chunk-56msakfz.js:22268-22633 placement
/**
 * 把属于当前会话的桥接占位记录标记为已使用（usedAt）。
 */
function markBridgePlaceholderUsed(sessionId, storageV5) {
  return enqueuePlaceholderWrite(async () => {
    await saveGlobalConfig((config) => {
      let filtered = readBridgePlaceholders(config.replBridgePlaceholders).filter(
        ([key, record]) => sameSessionBody(key, sessionId) && record.usedAt === undefined,
      );
      if (filtered.length === 0) return config;
      let nextPlaceholders = {
        ...config.replBridgePlaceholders,
      };
      for (let [key, record] of filtered)
        nextPlaceholders[key] = {
          ...record,
          usedAt: Date.now(),
        };
      return {
        ...config,
        replBridgePlaceholders: nextPlaceholders,
      };
    }, storageV5);
  }).catch((error) => {
    logForDebugging(`[bridge:placeholder] use stamp failed: ${errorMessage(error)}`, {
      level: "error",
    });
  });
}
//@ chunk-56msakfz.js:22633-22671 placement
function sameSessionBody(leftId, rightId) {
  return sessionIdBody(leftId) === sessionIdBody(rightId);
}
//@ chunk-56msakfz.js:22671-22761 placement
async function isProcessGoneOrRestarted(placeholder) {
  if (isProcessProvablyGone(placeholder.pid)) return true;
  return (
    isProcessRunning(placeholder.pid) && !(await isSameProcessAsync(placeholder.pid, placeholder.procStart))
  );
}
//@ chunk-56msakfz.js:22761-22918 placement
function isFinalArchiveOutcome(outcome) {
  if (outcome === "invalid" || outcome === "skipped_superseded" || outcome === "skipped_owner_changed")
    return true;
  return (
    typeof outcome === "number" && outcome < 500 && outcome !== 401 && outcome !== 408 && outcome !== 429
  );
}
//@ chunk-56msakfz.js:22918-23074 placement
function toComparableTimestamp(timestamp) {
  if (!timestamp) return;
  let isoTimestamp = parseIsoTimestamp(timestamp.replace(/\.\d+/, ""));
  if (Number.isNaN(isoTimestamp)) return;
  let fraction = /\.(\d+)/.exec(timestamp)?.[1] ?? "";
  return `${isoTimestamp}.${fraction.replace(/0+$/, "")}`;
}
//@ chunk-56msakfz.js:23074-24270 placement
/**
 * 判断一个占位记录是否该删除：进程仍活着则保留，已使用或服务端会话不存在则删除。
 */
async function judgeBridgePlaceholder(sessionId, placeholder, options) {
  if (!(await isProcessGoneOrRestarted(placeholder))) return "keep";
  if (placeholder.usedAt !== undefined) return logPlaceholderUsedAndRemove("used_marker");
  let { session, notFound } = await getBridgeSessionOrStatus(sessionId, {
    baseUrl: options.baseUrl,
    getAccessToken: options.getAccessToken,
  });
  if (notFound) return "remove";
  if (!session) return "keep";
  if (placeholder.titleSha !== undefined) {
    if (typeof session.title !== "string") {
      logForDebugging(`[bridge:placeholder] session GET carried no title for ${sessionId}; keeping`);
      return "keep";
    }
    if (shortHash(session.title) !== placeholder.titleSha) return logPlaceholderUsedAndRemove("retitled");
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
  let current = readBridgePlaceholders(getGlobalConfig().replBridgePlaceholders).find(([key]) =>
    sameSessionBody(key, sessionId),
  )?.[1];
  if (current === undefined) return "remove";
  if (
    current.pid !== placeholder.pid ||
    current.procStart !== placeholder.procStart ||
    current.createdAt !== placeholder.createdAt
  )
    return "keep";
  if (current.usedAt !== undefined) return logPlaceholderUsedAndRemove("used_marker");
  let archiveOutcome = await options.archive(sessionId);
  if (!isFinalArchiveOutcome(archiveOutcome)) {
    logFeatureBad(
      "bridge_placeholder_sweep",
      typeof archiveOutcome === "number" ? `http_${archiveOutcome}` : archiveOutcome,
    );
    return "keep";
  }
  logFeatureOk("bridge_placeholder_sweep");
  logForDebugging(
    `[bridge:placeholder] archived orphaned placeholder ${sessionId} (status=${archiveOutcome})`,
  );
  return "remove";
}
//@ chunk-56msakfz.js:24270-25384 placement
/**
 * 延迟启动一次性的占位记录清理：逐条查询服务端会话状态，删除失效记录并上报 tengu_bridge_placeholder_sweep。
 */
function startBridgePlaceholderSweep(options) {
  let hostState = bridgeHostState();
  if (hostState.placeholderSweepStarted) return Promise.resolve();
  hostState.placeholderSweepStarted = true;
  return (async () => {
    await sleep(options.startDelayMs ?? PLACEHOLDER_SWEEP_START_DELAY_MS);
    if (!(await isPlaceholderSweepEnabled())) return;
    let replBridgePlaceholders = getGlobalConfig().replBridgePlaceholders;
    if (!replBridgePlaceholders) return;
    let skipBody = options.skipSessionId ? sessionIdBody(options.skipSessionId) : undefined;
    let bridgePlaceholders = readBridgePlaceholders(replBridgePlaceholders);
    let knownKeys = new Set(bridgePlaceholders.map(([key]) => key));
    let filtered = Object.keys(replBridgePlaceholders).filter((key) => !knownKeys.has(key));
    let counts = {
      keep_connected: 0,
      keep_unreadable: 0,
      remove_active_disconnected: 0,
      remove_active_no_connection_state: 0,
    };
    for (let [sessionId, placeholder] of bridgePlaceholders) {
      let ageMs = Date.now() - placeholder.createdAt;
      if (Math.abs(ageMs) < PLACEHOLDER_MIN_SESSION_AGE_MS || sessionIdBody(sessionId) === skipBody) continue;
      if (!BRIDGE_SESSION_ID_PATTERN.test(sessionId)) {
        filtered.push(sessionId);
        continue;
      }
      let verdict = await judgeBridgePlaceholder(sessionId, placeholder, options);
      if (verdict !== "remove" && verdict !== "keep") {
        counts[verdict]++;
        logForDebugging(`[bridge:placeholder] ${sessionId}: ${verdict}`);
      }
      if (
        !(verdict === "keep" || verdict === "keep_connected" || verdict === "keep_unreadable") ||
        ageMs > PLACEHOLDER_KEEP_MAX_AGE_MS
      )
        filtered.push(sessionId);
    }
    if (Object.values(counts).some((total) => total > 0))
      logFeatureSad("bridge_placeholder_sweep", "not_archived_on_server_state", counts);
    if (filtered.length > 0)
      await saveGlobalConfig((config) => {
        if (!config.replBridgePlaceholders) return config;
        let nextPlaceholders = {
          ...config.replBridgePlaceholders,
        };
        for (let key of filtered) delete nextPlaceholders[key];
        return {
          ...config,
          replBridgePlaceholders: nextPlaceholders,
        };
      }, options.storageV5);
  })().catch((error) => {
    logForDebugging(`[bridge:placeholder] sweep failed: ${errorMessage(error)}`, {
      level: "error",
    });
  });
}
//@ chunk-56msakfz.js:25384-25472 placement
function logPlaceholderUsedAndRemove(signal) {
  logEvent("tengu_bridge_placeholder_used_session", {
    signal: fromEnum(signal),
  });
  return "remove";
}
//@ chunk-56msakfz.js:25472-25486 placement
var RECENT_USE_THRESHOLD_MS = 120000;
//@ chunk-56msakfz.js:25486-25536 placement
function bucketRecentUse(streakMs) {
  return streakMs <= RECENT_USE_THRESHOLD_MS ? lit("le_2m") : lit("gt_2m");
}
export {
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
  countLiveBridgeProcesses,
};
