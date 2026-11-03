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
function dateBefore(o, u) {
  return o < u;
}
//@ chunk-9h8dr0qb.js:77308-77379 layout
function finiteOrUndefined(o) {
  return typeof o === "number" && Number.isFinite(o) ? o : undefined;
}
//@ chunk-9h8dr0qb.js:77379-77450 placement
function isPlainRecord(o) {
  return typeof o === "object" && o !== null && !Array.isArray(o);
}
//@ chunk-9h8dr0qb.js:77450-77494 placement
function isPrototypeKey(o) {
  return o in Object.prototype;
}
//@ chunk-9h8dr0qb.js:77795-79905 placement = mergeCacheWithNewStats (0.85)
/**
 * 合并统计缓存与新统计（缓存日期不可用时重置为全量重扫）。
 */
function mergeCacheWithNewStats_2(parsed) {
  let u = {};
  for (let [key, value] of Object.entries(isPlainRecord(parsed.modelUsage) ? parsed.modelUsage : {})) {
    if (isPrototypeKey(key)) continue;
    let U = isPlainRecord(value) ? value : undefined;
    u[key] = {
      ...U,
      inputTokens: finiteOrUndefined(U?.inputTokens) ?? 0,
      outputTokens: finiteOrUndefined(U?.outputTokens) ?? 0,
      cacheReadInputTokens: finiteOrUndefined(U?.cacheReadInputTokens) ?? 0,
      cacheCreationInputTokens: finiteOrUndefined(U?.cacheCreationInputTokens) ?? 0,
      webSearchRequests: finiteOrUndefined(U?.webSearchRequests) ?? 0,
      costUSD: finiteOrUndefined(U?.costUSD) ?? 0,
      contextWindow: finiteOrUndefined(U?.contextWindow) ?? 0,
      maxOutputTokens: finiteOrUndefined(U?.maxOutputTokens) ?? 0,
    };
  }
  let p = {};
  for (let [key, value] of Object.entries(isPlainRecord(parsed.hourCounts) ? parsed.hourCounts : {})) {
    let U = parseInt(key, 10);
    if (Number.isNaN(U)) continue;
    p[U] = finiteOrUndefined(value) ?? 0;
  }
  let h = [];
  for (let dailyModelToken of parsed.dailyModelTokens) {
    let isoDate = parseIsoDate(dailyModelToken?.date);
    if (isoDate === null) continue;
    let U = {};
    for (let [key, value] of Object.entries(
      isPlainRecord(dailyModelToken.tokensByModel) ? dailyModelToken.tokensByModel : {},
    )) {
      if (isPrototypeKey(key)) continue;
      U[key] = finiteOrUndefined(value) ?? 0;
    }
    h.push({
      date: isoDate,
      tokensByModel: U,
    });
  }
  let D = [];
  for (let day of parsed.dailyActivity) {
    let isoDate = parseIsoDate(day?.date);
    if (isoDate === null) continue;
    D.push({
      date: isoDate,
      messageCount: finiteOrUndefined(day.messageCount) ?? 0,
      sessionCount: finiteOrUndefined(day.sessionCount) ?? 0,
      toolCallCount: finiteOrUndefined(day.toolCallCount) ?? 0,
    });
  }
  let E;
  if (isPlainRecord(parsed.shotDistribution)) {
    E = {};
    for (let [key, value] of Object.entries(parsed.shotDistribution)) {
      let hourNum = parseInt(key, 10);
      if (Number.isNaN(hourNum)) continue;
      E[hourNum] = finiteOrUndefined(value) ?? 0;
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
    for (let v of [D, h]) for (let F of v) if (isoDate === null || isoDate < F.date) isoDate = F.date;
  }
  if (isoDate === null) {
    logForDebugging(
      `Stats cache has no usable date (lastComputedDate: ${String(parsed.lastComputedDate)}); resetting aggregates for a full rescan`,
    );
    return {
      ...getEmptyCache(),
      version: parsed.version,
      dailyModelTokensVersion: finiteOrUndefined(parsed.dailyModelTokensVersion),
      shotDistribution: E && {},
    };
  }
  return {
    version: parsed.version,
    lastComputedDate: isoDate,
    firstSessionDate: parseIsoDateTimePrefix(parsed.firstSessionDate),
    dailyModelTokensVersion: finiteOrUndefined(parsed.dailyModelTokensVersion),
    dailyModelTokens: h,
    dailyActivity: D,
    modelUsage: u,
    hourCounts: p,
    shotDistribution: E,
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
async function processSessionFiles(sessionFiles, options = {}, p, mtimeMsByFile) {
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
              let ae = isStorageV5Enabled() && p !== undefined ? mtimeMsByFile?.get(sessionFile) : undefined;
              let fileModifiedDate = toDateString(
                ae !== undefined ? new Date(ae) : (await fs.stat(sessionFile)).mtime,
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
      let Ve = !fromDate || !dateBefore(dateKey, fromDate);
      if (!isSubagentFile && Ve) {
        let duration = lastTimestamp.getTime() - firstTimestamp.getTime();
        sessions.push({
          sessionId,
          duration,
          messageCount: mainMessages.length,
          timestamp: firstMessage.timestamp,
        });
        let Ue = dailyActivityMap.get(dateKey);
        if (!Ue) {
          Ue = {
            date: dateKey,
            messageCount: 0,
            sessionCount: 0,
            toolCallCount: 0,
          };
          dailyActivityMap.set(dateKey, Ue);
        }
        Ue.sessionCount++;
        let hour = firstTimestamp.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      for (let message of mainMessages) {
        let date = new Date(message.timestamp);
        if (isNaN(date.getTime())) continue;
        let dateString = toDateString(date);
        if (fromDate && dateBefore(dateString, fromDate)) continue;
        if (toDate && dateBefore(toDate, dateString)) continue;
        let ye = dailyActivityMap.get(dateString);
        if (!ye && !isSubagentFile) {
          ye = {
            date: dateString,
            messageCount: 0,
            sessionCount: 0,
            toolCallCount: 0,
          };
          dailyActivityMap.set(dateString, ye);
        }
        if (!isSubagentFile) {
          totalMessages++;
          if (ye) ye.messageCount++;
        }
        if (message.type === "assistant") {
          let content = message.message?.content;
          if (Array.isArray(content)) {
            for (let block of content) if (block.type === "tool_use" && ye) ye.toolCallCount++;
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
            let at = finiteOrUndefined(usage.input_tokens) ?? 0;
            let ot = finiteOrUndefined(usage.output_tokens) ?? 0;
            let st = finiteOrUndefined(usage.cache_read_input_tokens) ?? 0;
            let et = finiteOrUndefined(usage.cache_creation_input_tokens) ?? 0;
            let Ge = modelUsageAgg[model];
            Ge.inputTokens += at;
            Ge.outputTokens += ot;
            Ge.cacheReadInputTokens += st;
            Ge.cacheCreationInputTokens += et;
            let totalTokens = at + ot + st + et;
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
    dailyActivity: Array.from(dailyActivityMap.values()).sort((ee, ne) => ee.date.localeCompare(ne.date)),
    dailyModelTokens: Array.from(dailyModelTokensMap.entries())
      .map(([date, tokensByModel]) => ({
        date,
        tokensByModel,
      }))
      .sort((ee, ne) => ee.date.localeCompare(ne.date)),
    modelUsage: modelUsageAgg,
    sessionStats: sessions,
    hourCounts: Object.fromEntries(hourCounts),
    totalMessages,
    ...{},
  };
}
//@ chunk-9h8dr0qb.js:82770-83495 fingerprint = getAllSessionFiles (1)
async function getAllSessionFiles(o) {
  let projectsDir = getProjectsDir();
  if (isStorageV5Enabled() && o !== undefined) return collectStatsFromTranscripts(o, projectsDir);
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
async function collectStatsFromTranscripts(o, projectsDir) {
  let p = new Map();
  let h = new Set();
  let D = (sessionId) => {
    if (isValidKeySegment(sessionId)) return true;
    if (!h.has(sessionId)) {
      h.add(sessionId);
      logForDebugging(
        `stats: skipped listed transcript name ${jsonStringify(sessionId)}: not a single path segment`,
      );
    }
    return false;
  };
  let E = (U, W, M) =>
    readAllPages(
      (B) =>
        o.listEntries(U, {
          skipScopeStats: true,
          ...(B !== undefined && {
            cursor: B,
          }),
        }),
      W,
      {
        ...(M !== undefined && {
          budget: M,
        }),
      },
    );
  let T = new Set();
  let A = await E(
    {
      namespace: "transcript",
    },
    (U) => {
      for (let W of U) {
        let M = listedProjectKey(W, D);
        if (M !== undefined) T.add(M);
      }
    },
  );
  if (A.status === "error") throw Error("stats: transcript project listing failed");
  if (A.status === "capped") throw Error("stats: transcript project listing unfinished at the page cap");
  let v = {
    pagesLeft: DEFAULT_MAX_PAGES + T.size,
  };
  return {
    files: (
      await Promise.all(
        [...T].map(async (U) => {
          let W = join(projectsDir, U);
          let M = [];
          let B = new Set();
          let H = new Set();
          let K = await E(
            {
              namespace: "transcript",
              projectKey: U,
            },
            (V) => {
              for (let L of V)
                if (
                  L.kind === "key" &&
                  L.key.namespace === "transcript" &&
                  L.key.agentId === undefined &&
                  L.key.journal !== true &&
                  !B.has(L.key.sessionId) &&
                  D(L.key.sessionId)
                ) {
                  B.add(L.key.sessionId);
                  let J = join(W, `${L.key.sessionId}.jsonl`);
                  M.push(J);
                  if (L.mtimeMs !== undefined) p.set(J, L.mtimeMs);
                } else if (
                  L.kind === "scope" &&
                  L.scope.namespace === "transcript" &&
                  L.scope.sessionId !== undefined &&
                  D(L.scope.sessionId)
                )
                  H.add(L.scope.sessionId);
            },
            v,
          );
          if (K.status === "error") {
            logForDebugging(`Failed to read project directory ${W}: storage listing failed`);
            return [];
          }
          if (K.status === "capped")
            logForDebugging(
              `stats: transcript listing of ${W} cut short at the page cap or budget; keeping what was listed`,
            );
          let fsImplementation = getFsImplementation();
          let results = await Promise.all(
            [...H].map(async (sessionDir) => {
              let subagentsDir = join(W, sessionDir, "subagents");
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
          return [...M, ...results.flat()];
        }),
      )
    ).flat(),
    mtimeMsByFile: p,
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
  let dailyActivityArray = Array.from(dailyActivityMap.values()).sort((V, L) => V.date.localeCompare(L.date));
  let streaks = calculateStreaks(dailyActivityArray);
  let dailyModelTokens = Array.from(dailyModelTokensMap.entries())
    .map(([date, tokensByModel]) => ({
      date,
      tokensByModel,
    }))
    .sort((V, L) => V.date.localeCompare(L.date));
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
async function aggregateClaudeCodeStats(o) {
  let { files: allSessionFiles, mtimeMsByFile } = await getAllSessionFiles(o);
  if (allSessionFiles.length === 0) return getEmptyStats();
  let updatedCache = await withStatsCacheLock(async () => {
    let updatedCache = await loadStatsCache(o);
    let dateStr = todayDateString();
    let yesterday = getNextDay();
    let F =
      updatedCache.lastComputedDate !== null &&
      updatedCache.lastComputedDate >= dateStr &&
      updatedCache.lastComputedDate <= addDaysToDateString(dateStr, CACHE_MAX_STALENESS_DAYS);
    if (F)
      logForDebugging(
        `Stats watermark ${updatedCache.lastComputedDate} is ahead of ${dateStr}; skipping the dailyModelTokens rebuild until the clock catches up`,
      );
    if ((updatedCache.dailyModelTokensVersion ?? 0) < DAILY_MODEL_TOKENS_VERSION && !F) {
      let W =
        updatedCache.lastComputedDate && dateBefore(yesterday, updatedCache.lastComputedDate)
          ? yesterday
          : updatedCache.lastComputedDate;
      let dailyModelTokens = [];
      if (W) {
        logForDebugging(`Rebuilding stats dailyModelTokens through ${W}`);
        dailyModelTokens = (
          await processSessionFiles(
            allSessionFiles,
            {
              toDate: W,
            },
            o,
            mtimeMsByFile,
          )
        ).dailyModelTokens;
      }
      updatedCache = {
        ...updatedCache,
        lastComputedDate: W,
        dailyModelTokens,
        dailyModelTokensVersion: DAILY_MODEL_TOKENS_VERSION,
      };
      await writeStatsCache(updatedCache, o);
    }
    let result = updatedCache;
    if (!updatedCache.lastComputedDate) {
      logForDebugging("Stats cache empty, processing all historical data");
      let historicalStats = await processSessionFiles(
        allSessionFiles,
        {
          toDate: yesterday,
        },
        o,
        mtimeMsByFile,
      );
      if (hasAnyStats(historicalStats)) {
        result = mergeCacheWithNewStats(updatedCache, historicalStats, yesterday);
        await writeStatsCache(result, o);
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
        o,
        mtimeMsByFile,
      );
      if (hasAnyStats(newStats)) {
        result = mergeCacheWithNewStats(updatedCache, newStats, yesterday);
        await writeStatsCache(result, o);
      } else {
        result = {
          ...updatedCache,
          lastComputedDate: yesterday,
        };
        await writeStatsCache(result, o);
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
    o,
    mtimeMsByFile,
  );
  return cacheToStats(updatedCache, todayStats);
}
//@ chunk-9h8dr0qb.js:88578-88824 fingerprint = aggregateClaudeCodeStatsForRange (0.885)
async function aggregateClaudeCodeStatsForRange(range, u) {
  if (range === "all") return aggregateClaudeCodeStats(u);
  let { files: allSessionFiles, mtimeMsByFile } = await getAllSessionFiles(u);
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
    u,
    mtimeMsByFile,
  );
  return processedStatsToClaudeCodeStats(stats);
}
//@ chunk-9h8dr0qb.js:88824-89732 fingerprint = processedStatsToClaudeCodeStats (0.973)
function processedStatsToClaudeCodeStats(stats) {
  let dailyActivitySorted = stats.dailyActivity.slice().sort((M, B) => M.date.localeCompare(B.date));
  let dailyModelTokensSorted = stats.dailyModelTokens.slice().sort((M, B) => M.date.localeCompare(B.date));
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
      ? dailyActivitySorted.reduce((max, B) => (B.messageCount > max.messageCount ? B : max)).date
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
function addDaysToDateString(dateStr, u) {
  let date = new Date(dateStr);
  date.setUTCDate(date.getUTCDate() + u);
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
  let u = 0;
  let currentStreakStart = null;
  let dateStr = todayDateString();
  let activeDates = new Set(dailyActivity.map((F) => F.date));
  while (activeDates.has(dateStr)) {
    u++;
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
    currentStreak: u,
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
function hasAnyStats(o) {
  return o.sessionStats.length > 0 || o.dailyActivity.length > 0 || o.dailyModelTokens.length > 0;
}
//@ chunk-e6aww6q8.js:302775-302788 affinity
var SESSION_START_ENTRY_WINDOW_MS = 5000;
//@ chunk-e6aww6q8.js:302788-303694 fingerprint = readSessionStartDate (0.359)
function readSessionStartDate(e, n, currentMsg, seen) {
  let time = new Date(currentMsg.timestamp).getTime();
  if (Number.isNaN(time)) return;
  let y = e.timedSides.get(currentMsg.isSidechain);
  if (!y) {
    e.entriesBySide ??= Map.groupBy(n.values(), (Se) => Se.isSidechain);
    let Z = [];
    for (let Se of e.entriesBySide.get(currentMsg.isSidechain) ?? []) {
      if (seen.has(Se.uuid)) continue;
      let time = new Date(Se.timestamp).getTime();
      if (!Number.isNaN(time))
        Z.push({
          time,
          entry: Se,
        });
    }
    Z.reverse().sort((Se, ke) => Se.time - ke.time);
    y = {
      timedEntries: Z,
      previousCandidate: Int32Array.from(Z.keys()),
    };
    e.timedSides.set(currentMsg.isSidechain, y);
  }
  let S = y.timedEntries.length;
  let w = 0;
  while (w < S) {
    let Z = (w + S) >>> 1;
    if (y.timedEntries[Z].time <= time) w = Z + 1;
    else S = Z;
  }
  let L = S - 1;
  while (L >= 0) {
    let Z = y.previousCandidate[L];
    if (Z !== L) L = Z;
    else if (seen.has(y.timedEntries[L].entry.uuid)) {
      y.previousCandidate[L] = L - 1;
      L -= 1;
    } else break;
  }
  let G = S - 1;
  while (G > L) {
    let Z = y.previousCandidate[G];
    y.previousCandidate[G] = L;
    G = Z;
  }
  let q = y.timedEntries[L];
  return q && time - q.time <= SESSION_START_ENTRY_WINDOW_MS ? q.entry : undefined;
}
export { readSessionStartDate, aggregateClaudeCodeStatsForRange, totalUsageTokens, mergeCacheWithNewStats_2 };
