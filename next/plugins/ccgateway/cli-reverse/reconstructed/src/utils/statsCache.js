/**
 * utils/statsCache.ts
 *
 * /stats 缓存 <配置目录>/stats-cache.json 的读取、合并与原子写入。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/statsCache.ts
 * pieces: chunk-j6tt9nsa.js (9), chunk-mhn0amzz.js (1)
 * attribution: fingerprint 6, layout 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomBytes } from "crypto";
import { open, rm } from "fs/promises";
import { constants } from "fs";
import { join } from "path";
import { READ_LIMITS } from "./fsBoundRead.js";
import { retryFsOp } from "./atomicPublishWrite.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { isDiskless } from "../bootstrap/state.js";
import { getFileReader } from "./fileStore.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { mergeCacheWithNewStats_2 } from "./stats.js";
import { errorMessage } from "./errors.js";

//@ chunk-mhn0amzz.js:77485-77738 fingerprint (2.1.88 match: saveStatsCache, 0.461)
async function saveStatsCache(path, content) {
  let tempPath = `${path}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    let handle = await open(
      tempPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | READ_LIMITS,
      384,
    );
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await retryFsOp(tempPath, path);
  } catch (error) {
    await rm(tempPath, {
      force: true,
    });
    throw error;
  }
}
//@ chunk-j6tt9nsa.js:72732-72781 fingerprint (2.1.88 match: STATS_CACHE_FILENAME, 1)
var STATS_CACHE_VERSION = 5;
var MIN_STATS_CACHE_VERSION = 1;
var DAILY_MODEL_TOKENS_VERSION = 5;
var STATS_CACHE_JSON = "stats-cache.json";
var statsCacheWriteLock = null;
//@ chunk-j6tt9nsa.js:72781-72897 layout
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
//@ chunk-j6tt9nsa.js:72897-72930 layout
/**
 * stats 缓存文件路径 <配置目录>/stats-cache.json。
 */
function getStatsCachePath() {
  return join(getClaudeConfigDir(), STATS_CACHE_JSON);
}
//@ chunk-j6tt9nsa.js:72930-73171 layout (2.1.88 match: getEmptyCache, 0.949)
function getEmptyCache_2() {
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
//@ chunk-j6tt9nsa.js:73171-73819 fingerprint (2.1.88 match: getEmptyCache, 0.949)
function getEmptyCache(parsed) {
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
//@ chunk-j6tt9nsa.js:73819-74700 fingerprint (2.1.88 match: loadStatsCache, 0.809)
/**
 * 读取 /stats 用的缓存 <配置目录>/stats-cache.json（或 storage state/stats-cache），版本不符时重算。
 */
async function loadStatsCache(storage) {
  try {
    let text;
    if (storage !== undefined) {
      let readResult = await storage.read([STORAGE_SPACES.state("stats-cache")]);
      if (!readResult.ok) {
        logForDebugging(`Failed to load stats cache: ${formatStorageError(readResult.error)}`);
        return getEmptyCache_2();
      }
      if (!readResult.value.items[0].found) {
        logForDebugging("Failed to load stats cache: not found");
        return getEmptyCache_2();
      }
      text = Buffer.from(readResult.value.items[0].value).toString("utf8");
    } else {
      if (isDiskless()) return getEmptyCache_2();
      text = await getFileReader().read(getStatsCachePath());
    }
    let parsed = jsonParse(text);
    if (parsed.version !== STATS_CACHE_VERSION) {
      let migrated = getEmptyCache(parsed);
      if (!migrated) {
        logForDebugging(
          `Stats cache version ${parsed.version} not migratable (expected ${STATS_CACHE_VERSION}), returning empty cache`,
        );
        return getEmptyCache_2();
      }
      logForDebugging(`Migrated stats cache from v${parsed.version} to v${STATS_CACHE_VERSION}`);
      let migrated_2 = mergeCacheWithNewStats_2(migrated);
      await writeStatsCache(migrated_2, storage);
      return migrated_2;
    }
    if (
      !Array.isArray(parsed.dailyActivity) ||
      !Array.isArray(parsed.dailyModelTokens) ||
      typeof parsed.totalSessions !== "number" ||
      typeof parsed.totalMessages !== "number"
    ) {
      logForDebugging("Stats cache has invalid structure, returning empty cache");
      return getEmptyCache_2();
    }
    return mergeCacheWithNewStats_2(parsed);
  } catch (error) {
    logForDebugging(`Failed to load stats cache: ${errorMessage(error)}`);
    return getEmptyCache_2();
  }
}
//@ chunk-j6tt9nsa.js:74700-75236 layout
async function writeStatsCache(cache, storage) {
  try {
    let text = jsonStringify(cache, null, 2);
    if (storage !== undefined) {
      let writeResult = await storage.write(STORAGE_SPACES.state("stats-cache"), text, {
        mode: 384,
        publishDiscipline: "atomic",
      });
      if (!writeResult.ok) {
        logForDebugging(`Failed to save stats cache: ${formatStorageError(writeResult.error)}`, {
          level: "error",
        });
        return;
      }
      logForDebugging(`Stats cache saved successfully (lastComputedDate: ${cache.lastComputedDate})`);
      return;
    }
    if (isDiskless()) return;
    let claudeConfigDir = getClaudeConfigDir();
    await getFileReader().mkdir(claudeConfigDir);
    await getFileReader().atomicWrite(getStatsCachePath(), text, 384);
    logForDebugging(`Stats cache saved successfully (lastComputedDate: ${cache.lastComputedDate})`);
  } catch (error) {
    logForDebugging(`Failed to save stats cache: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-j6tt9nsa.js:75236-77033 fingerprint (2.1.88 match: mergeCacheWithNewStats, 0.956)
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
    dailyActivity: Array.from(dailyActivityMap.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    ),
    dailyModelTokens: Array.from(dailyModelTokensMap.entries())
      .map(([date, tokensByModel]) => ({
        date,
        tokensByModel,
      }))
      .sort((left, right) => left.date.localeCompare(right.date)),
    dailyModelTokensVersion: existingCache.dailyModelTokensVersion,
    modelUsage,
    totalSessions,
    totalMessages,
    longestSession,
    firstSessionDate,
    hourCounts,
  };
}
//@ chunk-j6tt9nsa.js:77033-77138 fingerprint (2.1.88 match: toDateString, 1)
function toDateString(date) {
  let dateStr = date.toISOString().split("T")[0];
  if (!dateStr) throw Error("Invalid ISO date string");
  return dateStr;
}
export {
  toDateString,
  getEmptyCache_2,
  withStatsCacheLock,
  loadStatsCache,
  DAILY_MODEL_TOKENS_VERSION,
  writeStatsCache,
  mergeCacheWithNewStats,
  saveStatsCache,
};
