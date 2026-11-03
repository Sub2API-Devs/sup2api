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
import { join } from "path";
import { randomBytes } from "crypto";
import { open, rm } from "fs/promises";
import { constants } from "fs";
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
var STATS_CACHE_VERSION = 5;
var MIN_STATS_CACHE_VERSION = 1;
var DAILY_MODEL_TOKENS_VERSION = 5;
var STATS_CACHE_JSON = "stats-cache.json";
var statsCacheWriteLock = null;
//@ chunk-9h8dr0qb.js:72822-72938 layout
async function withStatsCacheLock(fn) {
  while (statsCacheWriteLock) await statsCacheWriteLock;
  let releaseLock;
  statsCacheWriteLock = new Promise((resolve) => {
    releaseLock = resolve;
  });
  try {
    return await fn();
  } finally {
    statsCacheWriteLock = null;
    releaseLock?.();
  }
}
//@ chunk-9h8dr0qb.js:72938-72971 layout
/**
 * stats 缓存文件路径 <配置目录>/stats-cache.json。
 */
function getStatsCachePath() {
  return join(getClaudeConfigDir(), STATS_CACHE_JSON);
}
//@ chunk-9h8dr0qb.js:72971-73212 fingerprint = getEmptyCache (0.949)
function getEmptyCache() {
  return {
    version: STATS_CACHE_VERSION,
    lastComputedDate: null,
    dailyActivity: [],
    dailyModelTokens: [],
    dailyModelTokensVersion: DAILY_MODEL_TOKENS_VERSION,
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
function getEmptyCache_2(parsed) {
  if (
    typeof parsed.version !== "number" ||
    parsed.version < MIN_STATS_CACHE_VERSION ||
    parsed.version > STATS_CACHE_VERSION
  )
    return null;
  if (
    !Array.isArray(parsed.dailyActivity) ||
    !Array.isArray(parsed.dailyModelTokens) ||
    typeof parsed.totalSessions !== "number" ||
    typeof parsed.totalMessages !== "number"
  )
    return null;
  return {
    version: STATS_CACHE_VERSION,
    lastComputedDate: parsed.lastComputedDate ?? null,
    dailyActivity: parsed.dailyActivity,
    dailyModelTokens: parsed.dailyModelTokens,
    dailyModelTokensVersion: parsed.dailyModelTokensVersion,
    modelUsage: parsed.modelUsage ?? {},
    totalSessions: parsed.totalSessions,
    totalMessages: parsed.totalMessages,
    longestSession: parsed.longestSession ?? null,
    firstSessionDate: parsed.firstSessionDate ?? null,
    hourCounts: parsed.hourCounts ?? {},
    shotDistribution: parsed.shotDistribution,
  };
}
//@ chunk-9h8dr0qb.js:73860-74741 fingerprint = loadStatsCache (0.809)
/**
 * 读取 /stats 用的缓存 <配置目录>/stats-cache.json（或 storage state/stats-cache），版本不符时重算。
 */
async function loadStatsCache(o) {
  try {
    let u;
    if (o !== undefined) {
      let D = await o.read([STORAGE_SPACES.state("stats-cache")]);
      if (!D.ok) {
        logForDebugging(`Failed to load stats cache: ${formatStorageError(D.error)}`);
        return getEmptyCache();
      }
      if (!D.value.items[0].found) {
        logForDebugging("Failed to load stats cache: not found");
        return getEmptyCache();
      }
      u = Buffer.from(D.value.items[0].value).toString("utf8");
    } else {
      if (isDiskless()) return getEmptyCache();
      u = await getFileReader().read(getStatsCachePath());
    }
    let parsed = jsonParse(u);
    if (parsed.version !== STATS_CACHE_VERSION) {
      let migrated = getEmptyCache_2(parsed);
      if (!migrated) {
        logForDebugging(
          `Stats cache version ${parsed.version} not migratable (expected ${STATS_CACHE_VERSION}), returning empty cache`,
        );
        return getEmptyCache();
      }
      logForDebugging(`Migrated stats cache from v${parsed.version} to v${STATS_CACHE_VERSION}`);
      let migrated_2 = mergeCacheWithNewStats_2(migrated);
      await writeStatsCache(migrated_2, o);
      return migrated_2;
    }
    if (
      !Array.isArray(parsed.dailyActivity) ||
      !Array.isArray(parsed.dailyModelTokens) ||
      typeof parsed.totalSessions !== "number" ||
      typeof parsed.totalMessages !== "number"
    ) {
      logForDebugging("Stats cache has invalid structure, returning empty cache");
      return getEmptyCache();
    }
    return mergeCacheWithNewStats_2(parsed);
  } catch (error) {
    logForDebugging(`Failed to load stats cache: ${errorMessage(error)}`);
    return getEmptyCache();
  }
}
//@ chunk-9h8dr0qb.js:74741-75277 layout
async function writeStatsCache(o, u) {
  try {
    let p = jsonStringify(o, null, 2);
    if (u !== undefined) {
      let D = await u.write(STORAGE_SPACES.state("stats-cache"), p, {
        mode: 384,
        publishDiscipline: "atomic",
      });
      if (!D.ok) {
        logForDebugging(`Failed to save stats cache: ${formatStorageError(D.error)}`, {
          level: "error",
        });
        return;
      }
      logForDebugging(`Stats cache saved successfully (lastComputedDate: ${o.lastComputedDate})`);
      return;
    }
    if (isDiskless()) return;
    let claudeConfigDir = getClaudeConfigDir();
    await getFileReader().mkdir(claudeConfigDir);
    await getFileReader().atomicWrite(getStatsCachePath(), p, 384);
    logForDebugging(`Stats cache saved successfully (lastComputedDate: ${o.lastComputedDate})`);
  } catch (error) {
    logForDebugging(`Failed to save stats cache: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-9h8dr0qb.js:75277-77074 fingerprint = mergeCacheWithNewStats (0.956)
function mergeCacheWithNewStats(existingCache, newStats, newLastComputedDate) {
  let dailyActivityMap = new Map();
  for (let day of existingCache.dailyActivity)
    dailyActivityMap.set(day.date, {
      ...day,
    });
  for (let day of newStats.dailyActivity) {
    let existing = dailyActivityMap.get(day.date);
    if (existing) {
      existing.messageCount += day.messageCount;
      existing.sessionCount += day.sessionCount;
      existing.toolCallCount += day.toolCallCount;
    } else
      dailyActivityMap.set(day.date, {
        ...day,
      });
  }
  let dailyModelTokensMap = new Map();
  for (let day of existingCache.dailyModelTokens)
    dailyModelTokensMap.set(day.date, {
      ...day.tokensByModel,
    });
  for (let day of newStats.dailyModelTokens) {
    let existing = dailyModelTokensMap.get(day.date);
    if (existing)
      for (let [model, tokens] of Object.entries(day.tokensByModel))
        existing[model] = (existing[model] || 0) + tokens;
    else
      dailyModelTokensMap.set(day.date, {
        ...day.tokensByModel,
      });
  }
  let modelUsage = {
    ...existingCache.modelUsage,
  };
  for (let [model, usage] of Object.entries(newStats.modelUsage))
    if (modelUsage[model])
      modelUsage[model] = {
        inputTokens: modelUsage[model].inputTokens + usage.inputTokens,
        outputTokens: modelUsage[model].outputTokens + usage.outputTokens,
        cacheReadInputTokens: modelUsage[model].cacheReadInputTokens + usage.cacheReadInputTokens,
        cacheCreationInputTokens: modelUsage[model].cacheCreationInputTokens + usage.cacheCreationInputTokens,
        webSearchRequests: modelUsage[model].webSearchRequests + usage.webSearchRequests,
        costUSD: modelUsage[model].costUSD + usage.costUSD,
        contextWindow: Math.max(modelUsage[model].contextWindow, usage.contextWindow),
        maxOutputTokens: Math.max(modelUsage[model].maxOutputTokens, usage.maxOutputTokens),
      };
    else
      modelUsage[model] = {
        ...usage,
      };
  let hourCounts = {
    ...existingCache.hourCounts,
  };
  for (let [hour, count] of Object.entries(newStats.hourCounts)) {
    let hourNum = parseInt(hour, 10);
    hourCounts[hourNum] = (hourCounts[hourNum] || 0) + count;
  }
  let totalSessions = existingCache.totalSessions + newStats.sessionStats.length;
  let totalMessages = existingCache.totalMessages + newStats.totalMessages;
  let longestSession = existingCache.longestSession;
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
      .map(([date, tokensByModel]) => ({
        date,
        tokensByModel,
      }))
      .sort((M, B) => M.date.localeCompare(B.date)),
    dailyModelTokensVersion: existingCache.dailyModelTokensVersion,
    modelUsage,
    totalSessions,
    totalMessages,
    longestSession,
    firstSessionDate,
    hourCounts,
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
  let tempPath = `${e}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    let o = await open(
      tempPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
      384,
    );
    try {
      await o.writeFile(n, "utf8");
      await o.sync();
    } finally {
      await o.close();
    }
    await retryFsOp(tempPath, e);
  } catch (error) {
    await rm(tempPath, {
      force: true,
    });
    throw error;
  }
}
export {
  toDateString,
  getEmptyCache,
  withStatsCacheLock,
  loadStatsCache,
  DAILY_MODEL_TOKENS_VERSION,
  writeStatsCache,
  mergeCacheWithNewStats,
  saveStatsCache,
};
