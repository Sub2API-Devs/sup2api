/**
 * utils/stats.ts
 *
 * /stats 统计：遍历会话转录汇总每日活跃、模型 token、会话数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/stats.ts
 * pieces: chunk-9h8dr0qb.js (21), chunk-e6aww6q8.js (2)
 * attribution: affinity 3, fingerprint 10, layout 6, placement 4
 */
import { basename, sep, join } from "path";
import {
  toDateString,
  getEmptyCache,
  withStatsCacheLock,
  loadStatsCache,
  DAILY_MODEL_TOKENS_VERSION,
  writeStatsCache,
  mergeCacheWithNewStats,
} from "./statsCache.js";
import { parseIsoDate, parseIsoDateTimePrefix } from "../components/Stats.js";
import { logForDebugging } from "./debug.js";
import { getFsImplementation } from "./fsOperations.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { readJSONLFile_2 } from "./json.js";
import { errorMessage, isENOENT } from "./errors.js";
import { isTranscriptMessage, getProjectsDir } from "./sessionStorage.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { isValidKeySegment } from "./storage/storageSpaces.js";
import { jsonStringify } from "./slowOperations.js";
import { readAllPages, DEFAULT_MAX_PAGES } from "./pagedRead.js";
import { listedProjectKey } from "./sessionStoragePortable.js";

//@ chunk-e6aww6q8.js:302775-302788 affinity
var SESSION_START_ENTRY_WINDOW_MS = 5000;
//@ chunk-e6aww6q8.js:302788-303694 fingerprint = readSessionStartDate (0.359)
function readSessionStartDate(cache, entries, currentMsg, seen) {
  let time = new Date(currentMsg.timestamp).getTime();
  if (Number.isNaN(time)) return;
  let side = cache.timedSides.get(currentMsg.isSidechain);
  if (!side) {
    cache.entriesBySide ??= Map.groupBy(entries.values(), (entry) => entry.isSidechain);
    let timedEntries = [];
    for (let entry of cache.entriesBySide.get(currentMsg.isSidechain) ?? []) {
      if (seen.has(entry.uuid)) continue;
      let time = new Date(entry.timestamp).getTime();
      if (!Number.isNaN(time))
        timedEntries.push({
          time,
          entry,
        });
    }
    timedEntries.reverse().sort((left, right) => left.time - right.time);
    side = {
      timedEntries,
      previousCandidate: Int32Array.from(timedEntries.keys()),
    };
    cache.timedSides.set(currentMsg.isSidechain, side);
  }
  let high = side.timedEntries.length;
  let low = 0;
  while (low < high) {
    let middle = (low + high) >>> 1;
    if (side.timedEntries[middle].time <= time) low = middle + 1;
    else high = middle;
  }
  let candidateIndex = high - 1;
  while (candidateIndex >= 0) {
    let previous = side.previousCandidate[candidateIndex];
    if (previous !== candidateIndex) candidateIndex = previous;
    else if (seen.has(side.timedEntries[candidateIndex].entry.uuid)) {
      side.previousCandidate[candidateIndex] = candidateIndex - 1;
      candidateIndex -= 1;
    } else break;
  }
  let cursor = high - 1;
  while (cursor > candidateIndex) {
    let previous = side.previousCandidate[cursor];
    side.previousCandidate[cursor] = candidateIndex;
    cursor = previous;
  }
  let timedEntry = side.timedEntries[candidateIndex];
  return timedEntry && time - timedEntry.time <= SESSION_START_ENTRY_WINDOW_MS ? timedEntry.entry : undefined;
}
//@ chunk-9h8dr0qb.js:77179-77213 affinity
function todayDateString() {
  return toDateString(new Date());
}
//@ chunk-9h8dr0qb.js:77213-77280 fingerprint = getNextDay (1)
function getNextDay() {
  let date = new Date();
  date.setDate(date.getDate() - 1);
  return toDateString(date);
}
//@ chunk-9h8dr0qb.js:77280-77308 layout
function dateBefore(left, right) {
  return left < right;
}
//@ chunk-9h8dr0qb.js:77308-77379 layout
function finiteOrUndefined(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
//@ chunk-9h8dr0qb.js:77379-77450 placement
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-9h8dr0qb.js:77450-77494 placement
function isPrototypeKey(key) {
  return key in Object.prototype;
}
//@ chunk-9h8dr0qb.js:77795-79905 placement = mergeCacheWithNewStats (0.85)
/**
 * 合并统计缓存与新统计（缓存日期不可用时重置为全量重扫）。
 */
function mergeCacheWithNewStats_2(parsed) {
  let modelUsage = {};
  for (let [key, value] of Object.entries(isPlainRecord(parsed.modelUsage) ? parsed.modelUsage : {})) {
    if (isPrototypeKey(key)) continue;
    let record = isPlainRecord(value) ? value : undefined;
    modelUsage[key] = {
      ...record,
      inputTokens: finiteOrUndefined(record?.inputTokens) ?? 0,
      outputTokens: finiteOrUndefined(record?.outputTokens) ?? 0,
      cacheReadInputTokens: finiteOrUndefined(record?.cacheReadInputTokens) ?? 0,
      cacheCreationInputTokens: finiteOrUndefined(record?.cacheCreationInputTokens) ?? 0,
      webSearchRequests: finiteOrUndefined(record?.webSearchRequests) ?? 0,
      costUSD: finiteOrUndefined(record?.costUSD) ?? 0,
      contextWindow: finiteOrUndefined(record?.contextWindow) ?? 0,
      maxOutputTokens: finiteOrUndefined(record?.maxOutputTokens) ?? 0,
    };
  }
  let hourCounts = {};
  for (let [key, value] of Object.entries(isPlainRecord(parsed.hourCounts) ? parsed.hourCounts : {})) {
    let hour = parseInt(key, 10);
    if (Number.isNaN(hour)) continue;
    hourCounts[hour] = finiteOrUndefined(value) ?? 0;
  }
  let dailyModelTokens = [];
  for (let dailyModelToken of parsed.dailyModelTokens) {
    let isoDate = parseIsoDate(dailyModelToken?.date);
    if (isoDate === null) continue;
    let tokensByModel = {};
    for (let [key, value] of Object.entries(
      isPlainRecord(dailyModelToken.tokensByModel) ? dailyModelToken.tokensByModel : {},
    )) {
      if (isPrototypeKey(key)) continue;
      tokensByModel[key] = finiteOrUndefined(value) ?? 0;
    }
    dailyModelTokens.push({
      date: isoDate,
      tokensByModel,
    });
  }
  let dailyActivity = [];
  for (let day of parsed.dailyActivity) {
    let isoDate = parseIsoDate(day?.date);
    if (isoDate === null) continue;
    dailyActivity.push({
      date: isoDate,
      messageCount: finiteOrUndefined(day.messageCount) ?? 0,
      sessionCount: finiteOrUndefined(day.sessionCount) ?? 0,
      toolCallCount: finiteOrUndefined(day.toolCallCount) ?? 0,
    });
  }
  let shotDistribution;
  if (isPlainRecord(parsed.shotDistribution)) {
    shotDistribution = {};
    for (let [key, value] of Object.entries(parsed.shotDistribution)) {
      let hourNum = parseInt(key, 10);
      if (Number.isNaN(hourNum)) continue;
      shotDistribution[hourNum] = finiteOrUndefined(value) ?? 0;
    }
  }
  let longestSession = isPlainRecord(parsed.longestSession)
    ? {
        sessionId: typeof parsed.longestSession.sessionId === "string" ? parsed.longestSession.sessionId : "",
        timestamp: parseIsoDateTimePrefix(parsed.longestSession.timestamp) ?? "",
        duration: finiteOrUndefined(parsed.longestSession.duration) ?? 0,
        messageCount: finiteOrUndefined(parsed.longestSession.messageCount) ?? 0,
      }
    : null;
  let isoDate = parseIsoDate(parsed.lastComputedDate);
  if (isoDate === null) {
    for (let days of [dailyActivity, dailyModelTokens])
      for (let day of days) if (isoDate === null || isoDate < day.date) isoDate = day.date;
  }
  if (isoDate === null) {
    logForDebugging(
      `Stats cache has no usable date (lastComputedDate: ${String(parsed.lastComputedDate)}); resetting aggregates for a full rescan`,
    );
    return {
      ...getEmptyCache(),
      version: parsed.version,
      dailyModelTokensVersion: finiteOrUndefined(parsed.dailyModelTokensVersion),
      shotDistribution: shotDistribution && {},
    };
  }
  return {
    version: parsed.version,
    lastComputedDate: isoDate,
    firstSessionDate: parseIsoDateTimePrefix(parsed.firstSessionDate),
    dailyModelTokensVersion: finiteOrUndefined(parsed.dailyModelTokensVersion),
    dailyModelTokens,
    dailyActivity,
    modelUsage,
    hourCounts,
    shotDistribution,
    totalSessions: finiteOrUndefined(parsed.totalSessions) ?? 0,
    totalMessages: finiteOrUndefined(parsed.totalMessages) ?? 0,
    longestSession,
  };
}
//@ chunk-9h8dr0qb.js:79905-80025 placement = combineUsage (1)
function totalUsageTokens(usage) {
  return (
    (usage.inputTokens || 0) +
    (usage.outputTokens || 0) +
    (usage.cacheReadInputTokens || 0) +
    (usage.cacheCreationInputTokens || 0)
  );
}
//@ chunk-9h8dr0qb.js:80025-82770 fingerprint = processSessionFiles (0.986)
async function processSessionFiles(sessionFiles, options = {}, firstMessageByFile, mtimeMsByFile) {
  let { fromDate, toDate } = options;
  let fs = getFsImplementation();
  let dailyActivityMap = new Map();
  let dailyModelTokensMap = new Map();
  let sessions = [];
  let hourCounts = new Map();
  let totalMessages = 0;
  let modelUsageAgg = {};
  let shotDistributionMap = undefined;
  let sessionsWithShotCount = new Set();
  let BATCH_SIZE = 20;
  for (let i = 0; i < sessionFiles.length; i += BATCH_SIZE) {
    let batch = sessionFiles.slice(i, i + BATCH_SIZE);
    let results = await Promise.all(
      batch.map(async (sessionFile) => {
        try {
          if (fromDate)
            try {
              let cachedMtimeMs =
                isStorageV5Enabled() && firstMessageByFile !== undefined
                  ? mtimeMsByFile?.get(sessionFile)
                  : undefined;
              let fileModifiedDate = toDateString(
                cachedMtimeMs !== undefined ? new Date(cachedMtimeMs) : (await fs.stat(sessionFile)).mtime,
              );
              if (dateBefore(fileModifiedDate, fromDate))
                return {
                  sessionFile,
                  entries: null,
                  error: null,
                  skipped: true,
                };
            } catch {}
          let entries = await readJSONLFile_2(sessionFile);
          return {
            sessionFile,
            entries,
            error: null,
            skipped: false,
          };
        } catch (error) {
          return {
            sessionFile,
            entries: null,
            error,
            skipped: false,
          };
        }
      }),
    );
    for (let { sessionFile, entries, error, skipped } of results) {
      if (skipped) continue;
      if (error || !entries) {
        logForDebugging(`Failed to read session file ${sessionFile}: ${errorMessage(error)}`);
        continue;
      }
      let sessionId = basename(sessionFile, ".jsonl");
      let messages = [];
      for (let entry of entries) if (isTranscriptMessage(entry)) messages.push(entry);
      if (messages.length === 0) continue;
      let isSubagentFile = sessionFile.includes(`${sep}subagents${sep}`);
      let mainMessages = isSubagentFile ? messages : messages.filter((m) => !m.isSidechain);
      if (mainMessages.length === 0) continue;
      let firstMessage = mainMessages[0];
      let lastMessage = mainMessages.at(-1);
      let firstTimestamp = new Date(firstMessage.timestamp);
      let lastTimestamp = new Date(lastMessage.timestamp);
      if (isNaN(firstTimestamp.getTime()) || isNaN(lastTimestamp.getTime())) {
        logForDebugging(`Skipping session with invalid timestamp: ${sessionFile}`);
        continue;
      }
      let dateKey = toDateString(firstTimestamp);
      if (toDate && dateBefore(toDate, dateKey)) continue;
      let inRange = !fromDate || !dateBefore(dateKey, fromDate);
      if (!isSubagentFile && inRange) {
        let duration = lastTimestamp.getTime() - firstTimestamp.getTime();
        sessions.push({
          sessionId,
          duration,
          messageCount: mainMessages.length,
          timestamp: firstMessage.timestamp,
        });
        let activityDay = dailyActivityMap.get(dateKey);
        if (!activityDay) {
          activityDay = {
            date: dateKey,
            messageCount: 0,
            sessionCount: 0,
            toolCallCount: 0,
          };
          dailyActivityMap.set(dateKey, activityDay);
        }
        activityDay.sessionCount++;
        let hour = firstTimestamp.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      for (let message of mainMessages) {
        let date = new Date(message.timestamp);
        if (isNaN(date.getTime())) continue;
        let dateString = toDateString(date);
        if (fromDate && dateBefore(dateString, fromDate)) continue;
        if (toDate && dateBefore(toDate, dateString)) continue;
        let activityDay = dailyActivityMap.get(dateString);
        if (!activityDay && !isSubagentFile) {
          activityDay = {
            date: dateString,
            messageCount: 0,
            sessionCount: 0,
            toolCallCount: 0,
          };
          dailyActivityMap.set(dateString, activityDay);
        }
        if (!isSubagentFile) {
          totalMessages++;
          if (activityDay) activityDay.messageCount++;
        }
        if (message.type === "assistant") {
          let content = message.message?.content;
          if (Array.isArray(content)) {
            for (let block of content)
              if (block.type === "tool_use" && activityDay) activityDay.toolCallCount++;
          }
          if (message.message?.usage) {
            let usage = message.message.usage;
            let model = message.message.model || "unknown";
            if (model === SYNTHETIC_MODEL || isPrototypeKey(model)) continue;
            if (!modelUsageAgg[model])
              modelUsageAgg[model] = {
                inputTokens: 0,
                outputTokens: 0,
                cacheReadInputTokens: 0,
                cacheCreationInputTokens: 0,
                webSearchRequests: 0,
                costUSD: 0,
                contextWindow: 0,
                maxOutputTokens: 0,
              };
            let inputTokens = finiteOrUndefined(usage.input_tokens) ?? 0;
            let outputTokens = finiteOrUndefined(usage.output_tokens) ?? 0;
            let cacheReadTokens = finiteOrUndefined(usage.cache_read_input_tokens) ?? 0;
            let cacheCreationTokens = finiteOrUndefined(usage.cache_creation_input_tokens) ?? 0;
            let modelUsage = modelUsageAgg[model];
            modelUsage.inputTokens += inputTokens;
            modelUsage.outputTokens += outputTokens;
            modelUsage.cacheReadInputTokens += cacheReadTokens;
            modelUsage.cacheCreationInputTokens += cacheCreationTokens;
            let totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheCreationTokens;
            if (totalTokens > 0) {
              let dayTokens = dailyModelTokensMap.get(dateString) || {};
              dayTokens[model] = (dayTokens[model] || 0) + totalTokens;
              dailyModelTokensMap.set(dateString, dayTokens);
            }
          }
        }
      }
    }
  }
  return {
    dailyActivity: Array.from(dailyActivityMap.values()).sort((leftDay, rightDay) =>
      leftDay.date.localeCompare(rightDay.date),
    ),
    dailyModelTokens: Array.from(dailyModelTokensMap.entries())
      .map(([date, tokensByModel]) => ({
        date,
        tokensByModel,
      }))
      .sort((leftDay, rightDay) => leftDay.date.localeCompare(rightDay.date)),
    modelUsage: modelUsageAgg,
    sessionStats: sessions,
    hourCounts: Object.fromEntries(hourCounts),
    totalMessages,
    ...{},
  };
}
//@ chunk-9h8dr0qb.js:82770-83495 fingerprint = getAllSessionFiles (1)
async function getAllSessionFiles(storage) {
  let projectsDir = getProjectsDir();
  if (isStorageV5Enabled() && storage !== undefined) return collectStatsFromTranscripts(storage, projectsDir);
  let fs = getFsImplementation();
  let allEntries;
  try {
    allEntries = await fs.readdir(projectsDir);
  } catch (e) {
    if (isENOENT(e))
      return {
        files: [],
      };
    throw e;
  }
  let projectDirs = allEntries
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join(projectsDir, dirent.name));
  return {
    files: (
      await Promise.all(
        projectDirs.map(async (projectDir) => {
          try {
            let entries = await fs.readdir(projectDir);
            let mainFiles = entries
              .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".jsonl"))
              .map((dirent) => join(projectDir, dirent.name));
            let sessionDirs = entries.filter((dirent) => dirent.isDirectory());
            let subagentResults = await Promise.all(
              sessionDirs.map(async (sessionDir) => {
                let subagentsDir = join(projectDir, sessionDir.name, "subagents");
                try {
                  return (await fs.readdir(subagentsDir))
                    .filter(
                      (dirent) =>
                        dirent.isFile() && dirent.name.endsWith(".jsonl") && dirent.name.startsWith("agent-"),
                    )
                    .map((dirent) => join(subagentsDir, dirent.name));
                } catch {
                  return [];
                }
              }),
            );
            return [...mainFiles, ...subagentResults.flat()];
          } catch (error) {
            logForDebugging(`Failed to read project directory ${projectDir}: ${errorMessage(error)}`);
            return [];
          }
        }),
      )
    ).flat(),
  };
}
//@ chunk-9h8dr0qb.js:83495-85174 layout
async function collectStatsFromTranscripts(storage, projectsDir) {
  let mtimeMsByFile = new Map();
  let warnedNames = new Set();
  let isSafeName = (sessionId) => {
    if (isValidKeySegment(sessionId)) return true;
    if (!warnedNames.has(sessionId)) {
      warnedNames.add(sessionId);
      logForDebugging(
        `stats: skipped listed transcript name ${jsonStringify(sessionId)}: not a single path segment`,
      );
    }
    return false;
  };
  let readPages = (scope, onEntries, options) =>
    readAllPages(
      (cursor) =>
        storage.listEntries(scope, {
          skipScopeStats: true,
          ...(cursor !== undefined && {
            cursor,
          }),
        }),
      onEntries,
      {
        ...(options !== undefined && {
          budget: options,
        }),
      },
    );
  let projectKeys = new Set();
  let listing = await readPages(
    {
      namespace: "transcript",
    },
    (entries) => {
      for (let entry of entries) {
        let projectKey = listedProjectKey(entry, isSafeName);
        if (projectKey !== undefined) projectKeys.add(projectKey);
      }
    },
  );
  if (listing.status === "error") throw Error("stats: transcript project listing failed");
  if (listing.status === "capped")
    throw Error("stats: transcript project listing unfinished at the page cap");
  let budget = {
    pagesLeft: DEFAULT_MAX_PAGES + projectKeys.size,
  };
  return {
    files: (
      await Promise.all(
        [...projectKeys].map(async (projectKey) => {
          let projectDir = join(projectsDir, projectKey);
          let filePaths = [];
          let seenSessionIds = new Set();
          let scopeSessionIds = new Set();
          let projectListing = await readPages(
            {
              namespace: "transcript",
              projectKey,
            },
            (pageEntries) => {
              for (let entry of pageEntries)
                if (
                  entry.kind === "key" &&
                  entry.key.namespace === "transcript" &&
                  entry.key.agentId === undefined &&
                  entry.key.journal !== true &&
                  !seenSessionIds.has(entry.key.sessionId) &&
                  isSafeName(entry.key.sessionId)
                ) {
                  seenSessionIds.add(entry.key.sessionId);
                  let filePath = join(projectDir, `${entry.key.sessionId}.jsonl`);
                  filePaths.push(filePath);
                  if (entry.mtimeMs !== undefined) mtimeMsByFile.set(filePath, entry.mtimeMs);
                } else if (
                  entry.kind === "scope" &&
                  entry.scope.namespace === "transcript" &&
                  entry.scope.sessionId !== undefined &&
                  isSafeName(entry.scope.sessionId)
                )
                  scopeSessionIds.add(entry.scope.sessionId);
            },
            budget,
          );
          if (projectListing.status === "error") {
            logForDebugging(`Failed to read project directory ${projectDir}: storage listing failed`);
            return [];
          }
          if (projectListing.status === "capped")
            logForDebugging(
              `stats: transcript listing of ${projectDir} cut short at the page cap or budget; keeping what was listed`,
            );
          let fsImplementation = getFsImplementation();
          let results = await Promise.all(
            [...scopeSessionIds].map(async (sessionDir) => {
              let subagentsDir = join(projectDir, sessionDir, "subagents");
              try {
                return (await fsImplementation.readdir(subagentsDir))
                  .filter(
                    (dirent) =>
                      dirent.isFile() && dirent.name.endsWith(".jsonl") && dirent.name.startsWith("agent-"),
                  )
                  .map((dirent) => join(subagentsDir, dirent.name));
              } catch {
                return [];
              }
            }),
          );
          return [...filePaths, ...results.flat()];
        }),
      )
    ).flat(),
    mtimeMsByFile,
  };
}
//@ chunk-9h8dr0qb.js:85174-87409 fingerprint = cacheToStats (0.982)
function cacheToStats(cache, todayStats) {
  let dailyActivityMap = new Map();
  for (let day of cache.dailyActivity)
    dailyActivityMap.set(day.date, {
      ...day,
    });
  if (todayStats)
    for (let day of todayStats.dailyActivity) {
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
  for (let day of cache.dailyModelTokens)
    dailyModelTokensMap.set(day.date, {
      ...day.tokensByModel,
    });
  if (todayStats)
    for (let day of todayStats.dailyModelTokens) {
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
    ...cache.modelUsage,
  };
  if (todayStats)
    for (let [model, usage] of Object.entries(todayStats.modelUsage))
      if (modelUsage[model])
        modelUsage[model] = {
          inputTokens: modelUsage[model].inputTokens + usage.inputTokens,
          outputTokens: modelUsage[model].outputTokens + usage.outputTokens,
          cacheReadInputTokens: modelUsage[model].cacheReadInputTokens + usage.cacheReadInputTokens,
          cacheCreationInputTokens:
            modelUsage[model].cacheCreationInputTokens + usage.cacheCreationInputTokens,
          webSearchRequests: modelUsage[model].webSearchRequests + usage.webSearchRequests,
          costUSD: modelUsage[model].costUSD + usage.costUSD,
          contextWindow: Math.max(modelUsage[model].contextWindow, usage.contextWindow),
          maxOutputTokens: Math.max(modelUsage[model].maxOutputTokens, usage.maxOutputTokens),
        };
      else
        modelUsage[model] = {
          ...usage,
        };
  let hourCountsMap = new Map();
  for (let [hour, count] of Object.entries(cache.hourCounts)) hourCountsMap.set(parseInt(hour, 10), count);
  if (todayStats)
    for (let [hour, count] of Object.entries(todayStats.hourCounts)) {
      let hourNum = parseInt(hour, 10);
      hourCountsMap.set(hourNum, (hourCountsMap.get(hourNum) || 0) + count);
    }
  let dailyActivityArray = Array.from(dailyActivityMap.values()).sort((left, right) =>
    left.date.localeCompare(right.date),
  );
  let streaks = calculateStreaks(dailyActivityArray);
  let dailyModelTokens = Array.from(dailyModelTokensMap.entries())
    .map(([date, tokensByModel]) => ({
      date,
      tokensByModel,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
  let totalSessions = cache.totalSessions + (todayStats?.sessionStats.length || 0);
  let totalMessages = cache.totalMessages + (todayStats?.totalMessages || 0);
  let longestSession = cache.longestSession;
  if (todayStats) {
    for (let session of todayStats.sessionStats)
      if (!longestSession || session.duration > longestSession.duration) longestSession = session;
  }
  let firstSessionDate = cache.firstSessionDate;
  let lastSessionDate = null;
  if (todayStats)
    for (let session of todayStats.sessionStats) {
      if (!firstSessionDate || session.timestamp < firstSessionDate) firstSessionDate = session.timestamp;
      if (!lastSessionDate || session.timestamp > lastSessionDate) lastSessionDate = session.timestamp;
    }
  if (!lastSessionDate && dailyActivityArray.length > 0) lastSessionDate = dailyActivityArray.at(-1).date;
  let peakActivityDay =
    dailyActivityArray.length > 0
      ? dailyActivityArray.reduce((max, dailyActivity) =>
          dailyActivity.messageCount > max.messageCount ? dailyActivity : max,
        ).date
      : null;
  let peakActivityHour =
    hourCountsMap.size > 0
      ? Array.from(hourCountsMap.entries()).reduce((max, [hour, count]) =>
          count > max[1] ? [hour, count] : max,
        )[0]
      : null;
  let totalDays =
    firstSessionDate && lastSessionDate
      ? Math.ceil((new Date(lastSessionDate).getTime() - new Date(firstSessionDate).getTime()) / 86400000) + 1
      : 0;
  return {
    totalSessions,
    totalMessages,
    totalDays,
    activeDays: dailyActivityMap.size,
    streaks,
    dailyActivity: dailyActivityArray,
    dailyModelTokens,
    longestSession,
    modelUsage,
    firstSessionDate,
    lastSessionDate,
    peakActivityDay,
    peakActivityHour,
  };
}
//@ chunk-9h8dr0qb.js:87409-87418 layout
var CACHE_MAX_STALENESS_DAYS = 7;
//@ chunk-9h8dr0qb.js:87418-88578 fingerprint = aggregateClaudeCodeStats (0.582)
async function aggregateClaudeCodeStats(storage) {
  let { files: allSessionFiles, mtimeMsByFile } = await getAllSessionFiles(storage);
  if (allSessionFiles.length === 0) return getEmptyStats();
  let updatedCache = await withStatsCacheLock(async () => {
    let updatedCache = await loadStatsCache(storage);
    let dateStr = todayDateString();
    let yesterday = getNextDay();
    let watermarkAhead =
      updatedCache.lastComputedDate !== null &&
      updatedCache.lastComputedDate >= dateStr &&
      updatedCache.lastComputedDate <= addDaysToDateString(dateStr, CACHE_MAX_STALENESS_DAYS);
    if (watermarkAhead)
      logForDebugging(
        `Stats watermark ${updatedCache.lastComputedDate} is ahead of ${dateStr}; skipping the dailyModelTokens rebuild until the clock catches up`,
      );
    if ((updatedCache.dailyModelTokensVersion ?? 0) < DAILY_MODEL_TOKENS_VERSION && !watermarkAhead) {
      let rebuildThrough =
        updatedCache.lastComputedDate && dateBefore(yesterday, updatedCache.lastComputedDate)
          ? yesterday
          : updatedCache.lastComputedDate;
      let dailyModelTokens = [];
      if (rebuildThrough) {
        logForDebugging(`Rebuilding stats dailyModelTokens through ${rebuildThrough}`);
        dailyModelTokens = (
          await processSessionFiles(
            allSessionFiles,
            {
              toDate: rebuildThrough,
            },
            storage,
            mtimeMsByFile,
          )
        ).dailyModelTokens;
      }
      updatedCache = {
        ...updatedCache,
        lastComputedDate: rebuildThrough,
        dailyModelTokens,
        dailyModelTokensVersion: DAILY_MODEL_TOKENS_VERSION,
      };
      await writeStatsCache(updatedCache, storage);
    }
    let result = updatedCache;
    if (!updatedCache.lastComputedDate) {
      logForDebugging("Stats cache empty, processing all historical data");
      let historicalStats = await processSessionFiles(
        allSessionFiles,
        {
          toDate: yesterday,
        },
        storage,
        mtimeMsByFile,
      );
      if (hasAnyStats(historicalStats)) {
        result = mergeCacheWithNewStats(updatedCache, historicalStats, yesterday);
        await writeStatsCache(result, storage);
      }
    } else if (dateBefore(updatedCache.lastComputedDate, yesterday)) {
      let nextDay = nextDateString(updatedCache.lastComputedDate);
      logForDebugging(
        `Stats cache stale (${updatedCache.lastComputedDate}), processing ${nextDay} to ${yesterday}`,
      );
      let newStats = await processSessionFiles(
        allSessionFiles,
        {
          fromDate: nextDay,
          toDate: yesterday,
        },
        storage,
        mtimeMsByFile,
      );
      if (hasAnyStats(newStats)) {
        result = mergeCacheWithNewStats(updatedCache, newStats, yesterday);
        await writeStatsCache(result, storage);
      } else {
        result = {
          ...updatedCache,
          lastComputedDate: yesterday,
        };
        await writeStatsCache(result, storage);
      }
    }
    return result;
  });
  let today = todayDateString();
  let todayStats = await processSessionFiles(
    allSessionFiles,
    {
      fromDate: today,
      toDate: today,
    },
    storage,
    mtimeMsByFile,
  );
  return cacheToStats(updatedCache, todayStats);
}
//@ chunk-9h8dr0qb.js:88578-88824 fingerprint = aggregateClaudeCodeStatsForRange (0.885)
async function aggregateClaudeCodeStatsForRange(range, storage) {
  if (range === "all") return aggregateClaudeCodeStats(storage);
  let { files: allSessionFiles, mtimeMsByFile } = await getAllSessionFiles(storage);
  if (allSessionFiles.length === 0) return getEmptyStats();
  let today = new Date();
  let daysBack = range === "7d" ? 7 : 30;
  let fromDate = new Date(today);
  fromDate.setDate(today.getDate() - daysBack + 1);
  let fromDateStr = toDateString(fromDate);
  let stats = await processSessionFiles(
    allSessionFiles,
    {
      fromDate: fromDateStr,
    },
    storage,
    mtimeMsByFile,
  );
  return processedStatsToClaudeCodeStats(stats);
}
//@ chunk-9h8dr0qb.js:88824-89732 fingerprint = processedStatsToClaudeCodeStats (0.973)
function processedStatsToClaudeCodeStats(stats) {
  let dailyActivitySorted = stats.dailyActivity
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  let dailyModelTokensSorted = stats.dailyModelTokens
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date));
  let streaks = calculateStreaks(dailyActivitySorted);
  let longestSession = null;
  for (let session of stats.sessionStats)
    if (!longestSession || session.duration > longestSession.duration) longestSession = session;
  let firstSessionDate = null;
  let lastSessionDate = null;
  for (let session of stats.sessionStats) {
    if (!firstSessionDate || session.timestamp < firstSessionDate) firstSessionDate = session.timestamp;
    if (!lastSessionDate || session.timestamp > lastSessionDate) lastSessionDate = session.timestamp;
  }
  let peakActivityDay =
    dailyActivitySorted.length > 0
      ? dailyActivitySorted.reduce((max, day) => (day.messageCount > max.messageCount ? day : max)).date
      : null;
  let hourEntries = Object.entries(stats.hourCounts);
  let peakActivityHour =
    hourEntries.length > 0
      ? parseInt(
          hourEntries.reduce((max, [hour, count]) =>
            count > parseInt(max[1].toString()) ? [hour, count] : max,
          )[0],
          10,
        )
      : null;
  let totalDays =
    firstSessionDate && lastSessionDate
      ? Math.ceil((new Date(lastSessionDate).getTime() - new Date(firstSessionDate).getTime()) / 86400000) + 1
      : 0;
  return {
    totalSessions: stats.sessionStats.length,
    totalMessages: stats.totalMessages,
    totalDays,
    activeDays: stats.dailyActivity.length,
    streaks,
    dailyActivity: dailyActivitySorted,
    dailyModelTokens: dailyModelTokensSorted,
    longestSession,
    modelUsage: stats.modelUsage,
    firstSessionDate,
    lastSessionDate,
    peakActivityDay,
    peakActivityHour,
  };
}
//@ chunk-9h8dr0qb.js:89732-89811 layout
function addDaysToDateString(dateStr, days) {
  let date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateString(date);
}
//@ chunk-9h8dr0qb.js:89811-89841 layout
function nextDateString(dateStr) {
  return addDaysToDateString(dateStr, 1);
}
//@ chunk-9h8dr0qb.js:89841-90437 fingerprint = calculateStreaks (0.822)
function calculateStreaks(dailyActivity) {
  if (dailyActivity.length === 0)
    return {
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStart: null,
      longestStreakStart: null,
      longestStreakEnd: null,
    };
  let currentStreak = 0;
  let currentStreakStart = null;
  let dateStr = todayDateString();
  let activeDates = new Set(dailyActivity.map((day) => day.date));
  while (activeDates.has(dateStr)) {
    currentStreak++;
    currentStreakStart = dateStr;
    dateStr = addDaysToDateString(dateStr, -1);
  }
  let longestStreak = 0;
  let longestStreakStart = null;
  let longestStreakEnd = null;
  let sortedDates = Array.from(activeDates).sort();
  if (sortedDates.length > 0) {
    let tempStreak = 1;
    let tempStart = sortedDates[0];
    for (let i = 1; i < sortedDates.length; i++) {
      let prevDate = new Date(sortedDates[i - 1]);
      let currDate = new Date(sortedDates[i]);
      if (Math.round((currDate.getTime() - prevDate.getTime()) / 86400000) === 1) tempStreak++;
      else {
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
          longestStreakStart = tempStart;
          longestStreakEnd = sortedDates[i - 1];
        }
        tempStreak = 1;
        tempStart = sortedDates[i];
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
      longestStreakStart = tempStart;
      longestStreakEnd = sortedDates.at(-1);
    }
  }
  return {
    currentStreak,
    longestStreak,
    currentStreakStart,
    longestStreakStart,
    longestStreakEnd,
  };
}
//@ chunk-9h8dr0qb.js:90437-90785 fingerprint = getEmptyStats (1)
function getEmptyStats() {
  return {
    totalSessions: 0,
    totalMessages: 0,
    totalDays: 0,
    activeDays: 0,
    streaks: {
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStart: null,
      longestStreakStart: null,
      longestStreakEnd: null,
    },
    dailyActivity: [],
    dailyModelTokens: [],
    longestSession: null,
    modelUsage: {},
    firstSessionDate: null,
    lastSessionDate: null,
    peakActivityDay: null,
    peakActivityHour: null,
  };
}
//@ chunk-9h8dr0qb.js:90785-90886 affinity
function hasAnyStats(stats) {
  return stats.sessionStats.length > 0 || stats.dailyActivity.length > 0 || stats.dailyModelTokens.length > 0;
}
export { readSessionStartDate, aggregateClaudeCodeStatsForRange, totalUsageTokens, mergeCacheWithNewStats_2 };
