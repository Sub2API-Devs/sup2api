/**
 * utils/statsCache.ts
 *
 * /stats 缓存 <配置目录>/stats-cache.json 的读取、合并与原子写入。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/statsCache.ts
 * pieces: chunk-9h8dr0qb.js (9), chunk-ae5g0zb5.js (1)
 * attribution: fingerprint 6, layout 4
 */
import { join, join as join_2 } from "path";
import { randomBytes, randomBytes as randomBytes_2 } from "crypto";
import { open, open as open_2, rm, rm as rm_2 } from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { isDiskless } from "../bootstrap/state.js";
import { getFileReader } from "./fileStore.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { mergeCacheWithNewStats_2 } from "./stats.js";
import { errorMessage } from "./errors.js";
import { READ_LIMITS } from "./fsBoundRead.js";
import { retryFsOp } from "./atomicPublishWrite.js";

//@ chunk-9h8dr0qb.js:72773-72822 fingerprint = STATS_CACHE_FILENAME (1)
var STATS_CACHE_VERSION = 5,
  mm = 1,
  Xo = 5,
  STATS_CACHE_JSON = "stats-cache.json",
  qo = null;
//@ chunk-9h8dr0qb.js:72822-72938 layout
async function withStatsCacheLock(o) {
  while (qo) await qo;
  let u;
  qo = new Promise((p) => {
    u = p;
  });
  try {
    return await o();
  } finally {
    ((qo = null), u?.());
  }
}
/**
 * stats 缓存文件路径 <配置目录>/stats-cache.json。
 */
//@ chunk-9h8dr0qb.js:72938-72971 layout
function getStatsCachePath() {
  return join_2(getClaudeConfigDir(), STATS_CACHE_JSON);
}
//@ chunk-9h8dr0qb.js:72971-73212 fingerprint = getEmptyCache (0.949)
function getEmptyCache() {
  return {
    version: STATS_CACHE_VERSION,
    lastComputedDate: null,
    dailyActivity: [],
    dailyModelTokens: [],
    dailyModelTokensVersion: Xo,
    modelUsage: {},
    totalSessions: 0,
    totalMessages: 0,
    longestSession: null,
    firstSessionDate: null,
    hourCounts: {},
    shotDistribution: {},
  };
}
//@ chunk-9h8dr0qb.js:73212-73860 layout = getEmptyCache (0.949)
function getEmptyCache_2(o) {
  if (typeof o.version !== "number" || o.version < mm || o.version > STATS_CACHE_VERSION) return null;
  if (
    !Array.isArray(o.dailyActivity) ||
    !Array.isArray(o.dailyModelTokens) ||
    typeof o.totalSessions !== "number" ||
    typeof o.totalMessages !== "number"
  )
    return null;
  return {
    version: STATS_CACHE_VERSION,
    lastComputedDate: o.lastComputedDate ?? null,
    dailyActivity: o.dailyActivity,
    dailyModelTokens: o.dailyModelTokens,
    dailyModelTokensVersion: o.dailyModelTokensVersion,
    modelUsage: o.modelUsage ?? {},
    totalSessions: o.totalSessions,
    totalMessages: o.totalMessages,
    longestSession: o.longestSession ?? null,
    firstSessionDate: o.firstSessionDate ?? null,
    hourCounts: o.hourCounts ?? {},
    shotDistribution: o.shotDistribution,
  };
}
/**
 * 读取 /stats 用的缓存 <配置目录>/stats-cache.json（或 storage state/stats-cache），版本不符时重算。
 */
//@ chunk-9h8dr0qb.js:73860-74741 fingerprint = loadStatsCache (0.809)
async function loadStatsCache(o) {
  try {
    let u;
    if (o !== void 0) {
      let read = await o.read([STORAGE_SPACES.state("stats-cache")]);
      if (!read.ok)
        return (
          logForDebugging(`Failed to load stats cache: ${formatStorageError(read.error)}`),
          getEmptyCache()
        );
      if (!read.value.items[0].found)
        return (logForDebugging("Failed to load stats cache: not found"), getEmptyCache());
      u = Buffer.from(read.value.items[0].value).toString("utf8");
    } else {
      if (isDiskless()) return getEmptyCache();
      u = await getFileReader().read(getStatsCachePath());
    }
    let p = jsonParse(u);
    if (p.version !== STATS_CACHE_VERSION) {
      let parsed = getEmptyCache_2(p);
      if (!parsed)
        return (
          logForDebugging(
            `Stats cache version ${p.version} not migratable (expected ${STATS_CACHE_VERSION}), returning empty cache`,
          ),
          getEmptyCache()
        );
      logForDebugging(`Migrated stats cache from v${p.version} to v${STATS_CACHE_VERSION}`);
      let migrated = mergeCacheWithNewStats_2(parsed);
      return (await writeStatsCache(migrated, o), migrated);
    }
    if (
      !Array.isArray(p.dailyActivity) ||
      !Array.isArray(p.dailyModelTokens) ||
      typeof p.totalSessions !== "number" ||
      typeof p.totalMessages !== "number"
    )
      return (logForDebugging("Stats cache has invalid structure, returning empty cache"), getEmptyCache());
    return mergeCacheWithNewStats_2(p);
  } catch (error) {
    return (logForDebugging(`Failed to load stats cache: ${errorMessage(error)}`), getEmptyCache());
  }
}
//@ chunk-9h8dr0qb.js:74741-75277 layout
async function writeStatsCache(o, u) {
  try {
    let p = jsonStringify(o, null, 2);
    if (u !== void 0) {
      let write = await u.write(STORAGE_SPACES.state("stats-cache"), p, {
        mode: 384,
        publishDiscipline: "atomic",
      });
      if (!write.ok) {
        logForDebugging(`Failed to save stats cache: ${formatStorageError(write.error)}`, { level: "error" });
        return;
      }
      logForDebugging(`Stats cache saved successfully (lastComputedDate: ${o.lastComputedDate})`);
      return;
    }
    if (isDiskless()) return;
    let h = getClaudeConfigDir();
    (await getFileReader().mkdir(h),
      await getFileReader().atomicWrite(getStatsCachePath(), p, 384),
      logForDebugging(`Stats cache saved successfully (lastComputedDate: ${o.lastComputedDate})`));
  } catch (error) {
    logForDebugging(`Failed to save stats cache: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-9h8dr0qb.js:75277-77074 fingerprint = mergeCacheWithNewStats (0.956)
function mergeCacheWithNewStats(existingCache, newStats, newLastComputedDate) {
  let dailyActivityMap = new Map();
  for (let day of existingCache.dailyActivity) dailyActivityMap.set(day.date, { ...day });
  for (let day of newStats.dailyActivity) {
    let existing = dailyActivityMap.get(day.date);
    if (existing)
      ((existing.messageCount += day.messageCount),
        (existing.sessionCount += day.sessionCount),
        (existing.toolCallCount += day.toolCallCount));
    else dailyActivityMap.set(day.date, { ...day });
  }
  let dailyModelTokensMap = new Map();
  for (let day of existingCache.dailyModelTokens) dailyModelTokensMap.set(day.date, { ...day.tokensByModel });
  for (let day of newStats.dailyModelTokens) {
    let existing = dailyModelTokensMap.get(day.date);
    if (existing) for (let [H, K] of Object.entries(day.tokensByModel)) existing[H] = (existing[H] || 0) + K;
    else dailyModelTokensMap.set(day.date, { ...day.tokensByModel });
  }
  let modelUsage = { ...existingCache.modelUsage };
  for (let [M, B] of Object.entries(newStats.modelUsage))
    if (modelUsage[M])
      modelUsage[M] = {
        inputTokens: modelUsage[M].inputTokens + B.inputTokens,
        outputTokens: modelUsage[M].outputTokens + B.outputTokens,
        cacheReadInputTokens: modelUsage[M].cacheReadInputTokens + B.cacheReadInputTokens,
        cacheCreationInputTokens: modelUsage[M].cacheCreationInputTokens + B.cacheCreationInputTokens,
        webSearchRequests: modelUsage[M].webSearchRequests + B.webSearchRequests,
        costUSD: modelUsage[M].costUSD + B.costUSD,
        contextWindow: Math.max(modelUsage[M].contextWindow, B.contextWindow),
        maxOutputTokens: Math.max(modelUsage[M].maxOutputTokens, B.maxOutputTokens),
      };
    else modelUsage[M] = { ...B };
  let hourCounts = { ...existingCache.hourCounts };
  for (let [M, B] of Object.entries(newStats.hourCounts)) {
    let hourNum = parseInt(M, 10);
    hourCounts[hourNum] = (hourCounts[hourNum] || 0) + B;
  }
  let A = existingCache.totalSessions + newStats.sessionStats.length,
    v = existingCache.totalMessages + newStats.totalMessages,
    longestSession = existingCache.longestSession;
  for (let session of newStats.sessionStats)
    if (!longestSession || session.duration > longestSession.duration) longestSession = session;
  let firstSessionDate = existingCache.firstSessionDate;
  for (let session of newStats.sessionStats)
    if (!firstSessionDate || session.timestamp < firstSessionDate) firstSessionDate = session.timestamp;
  return {
    version: STATS_CACHE_VERSION,
    lastComputedDate: newLastComputedDate,
    dailyActivity: Array.from(dailyActivityMap.values()).sort((M, B) => M.date.localeCompare(B.date)),
    dailyModelTokens: Array.from(dailyModelTokensMap.entries())
      .map(([M, B]) => ({ date: M, tokensByModel: B }))
      .sort((M, B) => M.date.localeCompare(B.date)),
    dailyModelTokensVersion: existingCache.dailyModelTokensVersion,
    modelUsage: modelUsage,
    totalSessions: A,
    totalMessages: v,
    longestSession: longestSession,
    firstSessionDate: firstSessionDate,
    hourCounts: hourCounts,
  };
}
//@ chunk-9h8dr0qb.js:77074-77179 fingerprint = toDateString (1)
function toDateString(date) {
  let dateStr = date.toISOString().split("T")[0];
  if (!dateStr) throw Error("Invalid ISO date string");
  return dateStr;
}
//@ chunk-ae5g0zb5.js:76247-76500 fingerprint = saveStatsCache (0.461)
async function saveStatsCache(e, n) {
  let tempPath = `${e}.${randomBytes_2(6).toString("hex")}.tmp`;
  try {
    let o = await open_2(
      tempPath,
      constants_2.O_WRONLY | constants_2.O_CREAT | constants_2.O_EXCL | READ_LIMITS,
      384,
    );
    try {
      (await o.writeFile(n, "utf8"), await o.sync());
    } finally {
      await o.close();
    }
    await retryFsOp(tempPath, e);
  } catch (error) {
    throw (await rm(tempPath, { force: !0 }), error);
  }
}

export {
  toDateString,
  getEmptyCache,
  withStatsCacheLock,
  loadStatsCache,
  Xo,
  writeStatsCache,
  mergeCacheWithNewStats,
  saveStatsCache,
};
