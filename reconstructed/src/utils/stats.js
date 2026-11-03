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
import { basename, sep, join, join as join_2 } from "path";
import {
  toDateString,
  getEmptyCache,
  withStatsCacheLock,
  loadStatsCache,
  Xo,
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
  return (date.setDate(date.getDate() - 1), toDateString(date));
}
//@ chunk-9h8dr0qb.js:77280-77308 layout
function Vt(o, u) {
  return o < u;
}
//@ chunk-9h8dr0qb.js:77308-77379 layout
function Ke(o) {
  return typeof o === "number" && Number.isFinite(o) ? o : void 0;
}
//@ chunk-9h8dr0qb.js:77379-77450 placement
function xn(o) {
  return typeof o === "object" && o !== null && !Array.isArray(o);
}
//@ chunk-9h8dr0qb.js:77450-77494 placement
function Qo(o) {
  return o in Object.prototype;
}
/**
 * 合并统计缓存与新统计（缓存日期不可用时重置为全量重扫）。
 */
//@ chunk-9h8dr0qb.js:77795-79905 placement = mergeCacheWithNewStats (0.85)
function mergeCacheWithNewStats_2(o) {
  let u = {};
  for (let [v, F] of Object.entries(xn(o.modelUsage) ? o.modelUsage : {})) {
    if (Qo(v)) continue;
    let U = xn(F) ? F : void 0;
    u[v] = {
      ...U,
      inputTokens: Ke(U?.inputTokens) ?? 0,
      outputTokens: Ke(U?.outputTokens) ?? 0,
      cacheReadInputTokens: Ke(U?.cacheReadInputTokens) ?? 0,
      cacheCreationInputTokens: Ke(U?.cacheCreationInputTokens) ?? 0,
      webSearchRequests: Ke(U?.webSearchRequests) ?? 0,
      costUSD: Ke(U?.costUSD) ?? 0,
      contextWindow: Ke(U?.contextWindow) ?? 0,
      maxOutputTokens: Ke(U?.maxOutputTokens) ?? 0,
    };
  }
  let p = {};
  for (let [v, F] of Object.entries(xn(o.hourCounts) ? o.hourCounts : {})) {
    let U = parseInt(v, 10);
    if (Number.isNaN(U)) continue;
    p[U] = Ke(F) ?? 0;
  }
  let h = [];
  for (let dailyModelToken of o.dailyModelTokens) {
    let F = parseIsoDate(dailyModelToken?.date);
    if (F === null) continue;
    let U = {};
    for (let [W, M] of Object.entries(
      xn(dailyModelToken.tokensByModel) ? dailyModelToken.tokensByModel : {},
    )) {
      if (Qo(W)) continue;
      U[W] = Ke(M) ?? 0;
    }
    h.push({ date: F, tokensByModel: U });
  }
  let D = [];
  for (let day of o.dailyActivity) {
    let F = parseIsoDate(day?.date);
    if (F === null) continue;
    D.push({
      date: F,
      messageCount: Ke(day.messageCount) ?? 0,
      sessionCount: Ke(day.sessionCount) ?? 0,
      toolCallCount: Ke(day.toolCallCount) ?? 0,
    });
  }
  let E;
  if (xn(o.shotDistribution)) {
    E = {};
    for (let [v, F] of Object.entries(o.shotDistribution)) {
      let hourNum = parseInt(v, 10);
      if (Number.isNaN(hourNum)) continue;
      E[hourNum] = Ke(F) ?? 0;
    }
  }
  let T = xn(o.longestSession)
      ? {
          sessionId: typeof o.longestSession.sessionId === "string" ? o.longestSession.sessionId : "",
          timestamp: parseIsoDateTimePrefix(o.longestSession.timestamp) ?? "",
          duration: Ke(o.longestSession.duration) ?? 0,
          messageCount: Ke(o.longestSession.messageCount) ?? 0,
        }
      : null,
    A = parseIsoDate(o.lastComputedDate);
  if (A === null) {
    for (let v of [D, h]) for (let F of v) if (A === null || A < F.date) A = F.date;
  }
  if (A === null)
    return (
      logForDebugging(
        `Stats cache has no usable date (lastComputedDate: ${String(o.lastComputedDate)}); resetting aggregates for a full rescan`,
      ),
      {
        ...getEmptyCache(),
        version: o.version,
        dailyModelTokensVersion: Ke(o.dailyModelTokensVersion),
        shotDistribution: E && {},
      }
    );
  return {
    version: o.version,
    lastComputedDate: A,
    firstSessionDate: parseIsoDateTimePrefix(o.firstSessionDate),
    dailyModelTokensVersion: Ke(o.dailyModelTokensVersion),
    dailyModelTokens: h,
    dailyActivity: D,
    modelUsage: u,
    hourCounts: p,
    shotDistribution: E,
    totalSessions: Ke(o.totalSessions) ?? 0,
    totalMessages: Ke(o.totalMessages) ?? 0,
    longestSession: T,
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
async function processSessionFiles(o, u = {}, p, h) {
  let { fromDate: fromDate, toDate: toDate } = u,
    fs = getFsImplementation(),
    dailyActivityMap = new Map(),
    dailyModelTokensMap = new Map(),
    F = [],
    hourCounts = new Map(),
    W = 0,
    modelUsageAgg = {},
    B = void 0,
    sessionsWithShotCount = new Set(),
    BATCH_SIZE = 20;
  for (let ee = 0; ee < o.length; ee += BATCH_SIZE) {
    let batch = o.slice(ee, ee + BATCH_SIZE),
      results = await Promise.all(
        batch.map(async (sessionFile) => {
          try {
            if (fromDate)
              try {
                let ae = isStorageV5Enabled() && p !== void 0 ? h?.get(sessionFile) : void 0,
                  fileModifiedDate = toDateString(
                    ae !== void 0 ? new Date(ae) : (await fs.stat(sessionFile)).mtime,
                  );
                if (Vt(fileModifiedDate, fromDate))
                  return { sessionFile: sessionFile, entries: null, error: null, skipped: !0 };
              } catch {}
            let startDate = await readJSONLFile_2(sessionFile);
            return { sessionFile: sessionFile, entries: startDate, error: null, skipped: !1 };
          } catch (error) {
            return { sessionFile: sessionFile, entries: null, error: error, skipped: !1 };
          }
        }),
      );
    for (let { sessionFile: sessionFile, entries: entries, error: error, skipped: skipped } of results) {
      if (skipped) continue;
      if (error || !entries) {
        logForDebugging(`Failed to read session file ${sessionFile}: ${errorMessage(error)}`);
        continue;
      }
      let sessionId = basename(sessionFile, ".jsonl"),
        De = [];
      for (let entry of entries) if (isTranscriptMessage(entry)) De.push(entry);
      if (De.length === 0) continue;
      let isSubagentFile = sessionFile.includes(`${sep}subagents${sep}`),
        ve = isSubagentFile ? De : De.filter((ke) => !ke.isSidechain);
      if (ve.length === 0) continue;
      let pe = ve[0],
        lastMessage = ve.at(-1),
        firstTimestamp = new Date(pe.timestamp),
        lastTimestamp = new Date(lastMessage.timestamp);
      if (isNaN(firstTimestamp.getTime()) || isNaN(lastTimestamp.getTime())) {
        logForDebugging(`Skipping session with invalid timestamp: ${sessionFile}`);
        continue;
      }
      let dateKey = toDateString(firstTimestamp);
      if (toDate && Vt(toDate, dateKey)) continue;
      let Ve = !fromDate || !Vt(dateKey, fromDate);
      if (!isSubagentFile && Ve) {
        let ke = lastTimestamp.getTime() - firstTimestamp.getTime();
        F.push({ sessionId: sessionId, duration: ke, messageCount: ve.length, timestamp: pe.timestamp });
        let Ue = dailyActivityMap.get(dateKey);
        if (!Ue)
          ((Ue = { date: dateKey, messageCount: 0, sessionCount: 0, toolCallCount: 0 }),
            dailyActivityMap.set(dateKey, Ue));
        Ue.sessionCount++;
        let hour = firstTimestamp.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
      for (let message of ve) {
        let date = new Date(message.timestamp);
        if (isNaN(date.getTime())) continue;
        let Ie = toDateString(date);
        if (fromDate && Vt(Ie, fromDate)) continue;
        if (toDate && Vt(toDate, Ie)) continue;
        let ye = dailyActivityMap.get(Ie);
        if (!ye && !isSubagentFile)
          ((ye = { date: Ie, messageCount: 0, sessionCount: 0, toolCallCount: 0 }),
            dailyActivityMap.set(Ie, ye));
        if (!isSubagentFile) {
          if ((W++, ye)) ye.messageCount++;
        }
        if (message.type === "assistant") {
          let content = message.message?.content;
          if (Array.isArray(content)) {
            for (let block of content) if (block.type === "tool_use" && ye) ye.toolCallCount++;
          }
          if (message.message?.usage) {
            let usage = message.message.usage,
              Ne = message.message.model || "unknown";
            if (Ne === SYNTHETIC_MODEL || Qo(Ne)) continue;
            if (!modelUsageAgg[Ne])
              modelUsageAgg[Ne] = {
                inputTokens: 0,
                outputTokens: 0,
                cacheReadInputTokens: 0,
                cacheCreationInputTokens: 0,
                webSearchRequests: 0,
                costUSD: 0,
                contextWindow: 0,
                maxOutputTokens: 0,
              };
            let at = Ke(usage.input_tokens) ?? 0,
              ot = Ke(usage.output_tokens) ?? 0,
              st = Ke(usage.cache_read_input_tokens) ?? 0,
              et = Ke(usage.cache_creation_input_tokens) ?? 0,
              Ge = modelUsageAgg[Ne];
            ((Ge.inputTokens += at),
              (Ge.outputTokens += ot),
              (Ge.cacheReadInputTokens += st),
              (Ge.cacheCreationInputTokens += et));
            let Qe = at + ot + st + et;
            if (Qe > 0) {
              let ze = dailyModelTokensMap.get(Ie) || {};
              ((ze[Ne] = (ze[Ne] || 0) + Qe), dailyModelTokensMap.set(Ie, ze));
            }
          }
        }
      }
    }
  }
  return {
    dailyActivity: Array.from(dailyActivityMap.values()).sort((ee, ne) => ee.date.localeCompare(ne.date)),
    dailyModelTokens: Array.from(dailyModelTokensMap.entries())
      .map(([ee, ne]) => ({ date: ee, tokensByModel: ne }))
      .sort((ee, ne) => ee.date.localeCompare(ne.date)),
    modelUsage: modelUsageAgg,
    sessionStats: F,
    hourCounts: Object.fromEntries(hourCounts),
    totalMessages: W,
    ...{},
  };
}
//@ chunk-9h8dr0qb.js:82770-83495 fingerprint = getAllSessionFiles (1)
async function getAllSessionFiles(o) {
  let projectsDir = getProjectsDir();
  if (isStorageV5Enabled() && o !== void 0) return collectStatsFromTranscripts(o, projectsDir);
  let fs = getFsImplementation(),
    allEntries;
  try {
    allEntries = await fs.readdir(projectsDir);
  } catch (error) {
    if (isENOENT(error)) return { files: [] };
    throw error;
  }
  let projectDirs = allEntries
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => join(projectsDir, dirent.name));
  return {
    files: (
      await Promise.all(
        projectDirs.map(async (projectDir) => {
          try {
            let entries = await fs.readdir(projectDir),
              mainFiles = entries
                .filter((dirent) => dirent.isFile() && dirent.name.endsWith(".jsonl"))
                .map((dirent) => join(projectDir, dirent.name)),
              sessionDirs = entries.filter((dirent) => dirent.isDirectory()),
              subagentResults = await Promise.all(
                sessionDirs.map(async (sessionDir) => {
                  let subagentsDir = join(projectDir, sessionDir.name, "subagents");
                  try {
                    return (await fs.readdir(subagentsDir))
                      .filter(
                        (dirent) =>
                          dirent.isFile() &&
                          dirent.name.endsWith(".jsonl") &&
                          dirent.name.startsWith("agent-"),
                      )
                      .map((dirent) => join(subagentsDir, dirent.name));
                  } catch {
                    return [];
                  }
                }),
              );
            return [...mainFiles, ...subagentResults.flat()];
          } catch (error) {
            return (
              logForDebugging(`Failed to read project directory ${projectDir}: ${errorMessage(error)}`),
              []
            );
          }
        }),
      )
    ).flat(),
  };
}
//@ chunk-9h8dr0qb.js:83495-85174 layout
async function collectStatsFromTranscripts(o, u) {
  let p = new Map(),
    h = new Set(),
    D = (U) => {
      if (isValidKeySegment(U)) return !0;
      if (!h.has(U))
        (h.add(U),
          logForDebugging(
            `stats: skipped listed transcript name ${jsonStringify(U)}: not a single path segment`,
          ));
      return !1;
    },
    E = (U, W, M) =>
      readAllPages((B) => o.listEntries(U, { skipScopeStats: !0, ...(B !== void 0 && { cursor: B }) }), W, {
        ...(M !== void 0 && { budget: M }),
      }),
    T = new Set(),
    A = await E({ namespace: "transcript" }, (U) => {
      for (let W of U) {
        let M = listedProjectKey(W, D);
        if (M !== void 0) T.add(M);
      }
    });
  if (A.status === "error") throw Error("stats: transcript project listing failed");
  if (A.status === "capped") throw Error("stats: transcript project listing unfinished at the page cap");
  let v = { pagesLeft: DEFAULT_MAX_PAGES + T.size };
  return {
    files: (
      await Promise.all(
        [...T].map(async (U) => {
          let W = join(u, U),
            M = [],
            B = new Set(),
            H = new Set(),
            K = await E(
              { namespace: "transcript", projectKey: U },
              (V) => {
                for (let L of V)
                  if (
                    L.kind === "key" &&
                    L.key.namespace === "transcript" &&
                    L.key.agentId === void 0 &&
                    L.key.journal !== !0 &&
                    !B.has(L.key.sessionId) &&
                    D(L.key.sessionId)
                  ) {
                    B.add(L.key.sessionId);
                    let J = join(W, `${L.key.sessionId}.jsonl`);
                    if ((M.push(J), L.mtimeMs !== void 0)) p.set(J, L.mtimeMs);
                  } else if (
                    L.kind === "scope" &&
                    L.scope.namespace === "transcript" &&
                    L.scope.sessionId !== void 0 &&
                    D(L.scope.sessionId)
                  )
                    H.add(L.scope.sessionId);
              },
              v,
            );
          if (K.status === "error")
            return (logForDebugging(`Failed to read project directory ${W}: storage listing failed`), []);
          if (K.status === "capped")
            logForDebugging(
              `stats: transcript listing of ${W} cut short at the page cap or budget; keeping what was listed`,
            );
          let ee = getFsImplementation(),
            results = await Promise.all(
              [...H].map(async (V) => {
                let L = join(W, V, "subagents");
                try {
                  return (await ee.readdir(L))
                    .filter((ae) => ae.isFile() && ae.name.endsWith(".jsonl") && ae.name.startsWith("agent-"))
                    .map((ae) => join(L, ae.name));
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
  for (let day of cache.dailyActivity) dailyActivityMap.set(day.date, { ...day });
  if (todayStats)
    for (let day of todayStats.dailyActivity) {
      let existing = dailyActivityMap.get(day.date);
      if (existing)
        ((existing.messageCount += day.messageCount),
          (existing.sessionCount += day.sessionCount),
          (existing.toolCallCount += day.toolCallCount));
      else dailyActivityMap.set(day.date, { ...day });
    }
  let dailyModelTokensMap = new Map();
  for (let day of cache.dailyModelTokens) dailyModelTokensMap.set(day.date, { ...day.tokensByModel });
  if (todayStats)
    for (let day of todayStats.dailyModelTokens) {
      let existing = dailyModelTokensMap.get(day.date);
      if (existing)
        for (let [J, ae] of Object.entries(day.tokensByModel)) existing[J] = (existing[J] || 0) + ae;
      else dailyModelTokensMap.set(day.date, { ...day.tokensByModel });
    }
  let modelUsage = { ...cache.modelUsage };
  if (todayStats)
    for (let [V, L] of Object.entries(todayStats.modelUsage))
      if (modelUsage[V])
        modelUsage[V] = {
          inputTokens: modelUsage[V].inputTokens + L.inputTokens,
          outputTokens: modelUsage[V].outputTokens + L.outputTokens,
          cacheReadInputTokens: modelUsage[V].cacheReadInputTokens + L.cacheReadInputTokens,
          cacheCreationInputTokens: modelUsage[V].cacheCreationInputTokens + L.cacheCreationInputTokens,
          webSearchRequests: modelUsage[V].webSearchRequests + L.webSearchRequests,
          costUSD: modelUsage[V].costUSD + L.costUSD,
          contextWindow: Math.max(modelUsage[V].contextWindow, L.contextWindow),
          maxOutputTokens: Math.max(modelUsage[V].maxOutputTokens, L.maxOutputTokens),
        };
      else modelUsage[V] = { ...L };
  let hourCountsMap = new Map();
  for (let [V, L] of Object.entries(cache.hourCounts)) hourCountsMap.set(parseInt(V, 10), L);
  if (todayStats)
    for (let [V, L] of Object.entries(todayStats.hourCounts)) {
      let hourNum = parseInt(V, 10);
      hourCountsMap.set(hourNum, (hourCountsMap.get(hourNum) || 0) + L);
    }
  let dailyActivityArray = Array.from(dailyActivityMap.values()).sort((V, L) => V.date.localeCompare(L.date)),
    streaks = calculateStreaks(dailyActivityArray),
    dailyModelTokens = Array.from(dailyModelTokensMap.entries())
      .map(([V, L]) => ({ date: V, tokensByModel: L }))
      .sort((V, L) => V.date.localeCompare(L.date)),
    F = cache.totalSessions + (todayStats?.sessionStats.length || 0),
    U = cache.totalMessages + (todayStats?.totalMessages || 0),
    longestSession = cache.longestSession;
  if (todayStats) {
    for (let session of todayStats.sessionStats)
      if (!longestSession || session.duration > longestSession.duration) longestSession = session;
  }
  let firstSessionDate = cache.firstSessionDate,
    lastSessionDate = null;
  if (todayStats)
    for (let session of todayStats.sessionStats) {
      if (!firstSessionDate || session.timestamp < firstSessionDate) firstSessionDate = session.timestamp;
      if (!lastSessionDate || session.timestamp > lastSessionDate) lastSessionDate = session.timestamp;
    }
  if (!lastSessionDate && dailyActivityArray.length > 0) lastSessionDate = dailyActivityArray.at(-1).date;
  let H =
      dailyActivityArray.length > 0
        ? dailyActivityArray.reduce((max, L) => (L.messageCount > max.messageCount ? L : max)).date
        : null,
    K =
      hourCountsMap.size > 0
        ? Array.from(hourCountsMap.entries()).reduce((max, [L, J]) => (J > max[1] ? [L, J] : max))[0]
        : null,
    ee =
      firstSessionDate && lastSessionDate
        ? Math.ceil((new Date(lastSessionDate).getTime() - new Date(firstSessionDate).getTime()) / 86400000) +
          1
        : 0;
  return {
    totalSessions: F,
    totalMessages: U,
    totalDays: ee,
    activeDays: dailyActivityMap.size,
    streaks: streaks,
    dailyActivity: dailyActivityArray,
    dailyModelTokens: dailyModelTokens,
    longestSession: longestSession,
    modelUsage: modelUsage,
    firstSessionDate: firstSessionDate,
    lastSessionDate: lastSessionDate,
    peakActivityDay: H,
    peakActivityHour: K,
  };
}
//@ chunk-9h8dr0qb.js:87409-87418 layout
var Cm = 7;
//@ chunk-9h8dr0qb.js:87418-88578 fingerprint = aggregateClaudeCodeStats (0.582)
async function aggregateClaudeCodeStats(o) {
  let { files: files, mtimeMsByFile: mtimeMsByFile } = await getAllSessionFiles(o);
  if (files.length === 0) return getEmptyStats();
  let h = await withStatsCacheLock(async () => {
      let updatedCache = await loadStatsCache(o),
        A = todayDateString(),
        yesterday = getNextDay(),
        F =
          updatedCache.lastComputedDate !== null &&
          updatedCache.lastComputedDate >= A &&
          updatedCache.lastComputedDate <= addDaysToDateString(A, Cm);
      if (F)
        logForDebugging(
          `Stats watermark ${updatedCache.lastComputedDate} is ahead of ${A}; skipping the dailyModelTokens rebuild until the clock catches up`,
        );
      if ((updatedCache.dailyModelTokensVersion ?? 0) < Xo && !F) {
        let W =
            updatedCache.lastComputedDate && Vt(yesterday, updatedCache.lastComputedDate)
              ? yesterday
              : updatedCache.lastComputedDate,
          M = [];
        if (W)
          (logForDebugging(`Rebuilding stats dailyModelTokens through ${W}`),
            (M = (await processSessionFiles(files, { toDate: W }, o, mtimeMsByFile)).dailyModelTokens));
        ((updatedCache = {
          ...updatedCache,
          lastComputedDate: W,
          dailyModelTokens: M,
          dailyModelTokensVersion: Xo,
        }),
          await writeStatsCache(updatedCache, o));
      }
      let result = updatedCache;
      if (!updatedCache.lastComputedDate) {
        logForDebugging("Stats cache empty, processing all historical data");
        let W = await processSessionFiles(files, { toDate: yesterday }, o, mtimeMsByFile);
        if (hasAnyStats(W))
          ((result = mergeCacheWithNewStats(updatedCache, W, yesterday)), await writeStatsCache(result, o));
      } else if (Vt(updatedCache.lastComputedDate, yesterday)) {
        let nextDay = nextDateString(updatedCache.lastComputedDate);
        logForDebugging(
          `Stats cache stale (${updatedCache.lastComputedDate}), processing ${nextDay} to ${yesterday}`,
        );
        let M = await processSessionFiles(files, { fromDate: nextDay, toDate: yesterday }, o, mtimeMsByFile);
        if (hasAnyStats(M))
          ((result = mergeCacheWithNewStats(updatedCache, M, yesterday)), await writeStatsCache(result, o));
        else ((result = { ...updatedCache, lastComputedDate: yesterday }), await writeStatsCache(result, o));
      }
      return result;
    }),
    today = todayDateString(),
    E = await processSessionFiles(files, { fromDate: today, toDate: today }, o, mtimeMsByFile);
  return cacheToStats(h, E);
}
//@ chunk-9h8dr0qb.js:88578-88824 fingerprint = aggregateClaudeCodeStatsForRange (0.885)
async function aggregateClaudeCodeStatsForRange(o, u) {
  if (o === "all") return aggregateClaudeCodeStats(u);
  let { files: files, mtimeMsByFile: mtimeMsByFile } = await getAllSessionFiles(u);
  if (files.length === 0) return getEmptyStats();
  let today = new Date(),
    daysBack = o === "7d" ? 7 : 30,
    fromDate = new Date(today);
  fromDate.setDate(today.getDate() - daysBack + 1);
  let fromDateStr = toDateString(fromDate),
    v = await processSessionFiles(files, { fromDate: fromDateStr }, u, mtimeMsByFile);
  return processedStatsToClaudeCodeStats(v);
}
//@ chunk-9h8dr0qb.js:88824-89732 fingerprint = processedStatsToClaudeCodeStats (0.973)
function processedStatsToClaudeCodeStats(stats) {
  let dailyActivitySorted = stats.dailyActivity.slice().sort((M, B) => M.date.localeCompare(B.date)),
    dailyModelTokensSorted = stats.dailyModelTokens.slice().sort((M, B) => M.date.localeCompare(B.date)),
    streaks = calculateStreaks(dailyActivitySorted),
    longestSession = null;
  for (let session of stats.sessionStats)
    if (!longestSession || session.duration > longestSession.duration) longestSession = session;
  let firstSessionDate = null,
    lastSessionDate = null;
  for (let session of stats.sessionStats) {
    if (!firstSessionDate || session.timestamp < firstSessionDate) firstSessionDate = session.timestamp;
    if (!lastSessionDate || session.timestamp > lastSessionDate) lastSessionDate = session.timestamp;
  }
  let A =
      dailyActivitySorted.length > 0
        ? dailyActivitySorted.reduce((max, B) => (B.messageCount > max.messageCount ? B : max)).date
        : null,
    hourEntries = Object.entries(stats.hourCounts),
    F =
      hourEntries.length > 0
        ? parseInt(
            hourEntries.reduce((max, [B, H]) => (H > parseInt(max[1].toString()) ? [B, H] : max))[0],
            10,
          )
        : null,
    U =
      firstSessionDate && lastSessionDate
        ? Math.ceil((new Date(lastSessionDate).getTime() - new Date(firstSessionDate).getTime()) / 86400000) +
          1
        : 0;
  return {
    totalSessions: stats.sessionStats.length,
    totalMessages: stats.totalMessages,
    totalDays: U,
    activeDays: stats.dailyActivity.length,
    streaks: streaks,
    dailyActivity: dailyActivitySorted,
    dailyModelTokens: dailyModelTokensSorted,
    longestSession: longestSession,
    modelUsage: stats.modelUsage,
    firstSessionDate: firstSessionDate,
    lastSessionDate: lastSessionDate,
    peakActivityDay: A,
    peakActivityHour: F,
  };
}
//@ chunk-9h8dr0qb.js:89732-89811 layout
function addDaysToDateString(o, u) {
  let date = new Date(o);
  return (date.setUTCDate(date.getUTCDate() + u), toDateString(date));
}
//@ chunk-9h8dr0qb.js:89811-89841 layout
function nextDateString(o) {
  return addDaysToDateString(o, 1);
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
  let u = 0,
    currentStreakStart = null,
    h = todayDateString(),
    checkDate = new Set(dailyActivity.map((F) => F.date));
  while (checkDate.has(h)) (u++, (currentStreakStart = h), (h = addDaysToDateString(h, -1)));
  let E = 0,
    longestStreakStart = null,
    longestStreakEnd = null,
    sortedDates = Array.from(checkDate).sort();
  if (sortedDates.length > 0) {
    let F = 1,
      tempStart = sortedDates[0];
    for (let W = 1; W < sortedDates.length; W++) {
      let prevDate = new Date(sortedDates[W - 1]),
        currDate = new Date(sortedDates[W]);
      if (Math.round((currDate.getTime() - prevDate.getTime()) / 86400000) === 1) F++;
      else {
        if (F > E) ((E = F), (longestStreakStart = tempStart), (longestStreakEnd = sortedDates[W - 1]));
        ((F = 1), (tempStart = sortedDates[W]));
      }
    }
    if (F > E) ((E = F), (longestStreakStart = tempStart), (longestStreakEnd = sortedDates.at(-1)));
  }
  return {
    currentStreak: u,
    longestStreak: E,
    currentStreakStart: currentStreakStart,
    longestStreakStart: longestStreakStart,
    longestStreakEnd: longestStreakEnd,
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
var pfo = 5000;
//@ chunk-e6aww6q8.js:302788-303694 fingerprint = readSessionStartDate (0.359)
function readSessionStartDate(e, n, r, s) {
  let time = new Date(r.timestamp).getTime();
  if (Number.isNaN(time)) return;
  let y = e.timedSides.get(r.isSidechain);
  if (!y) {
    e.entriesBySide ??= Map.groupBy(n.values(), (Se) => Se.isSidechain);
    let Z = [];
    for (let Se of e.entriesBySide.get(r.isSidechain) ?? []) {
      if (s.has(Se.uuid)) continue;
      let time = new Date(Se.timestamp).getTime();
      if (!Number.isNaN(time)) Z.push({ time: time, entry: Se });
    }
    (Z.reverse().sort((Se, ke) => Se.time - ke.time),
      (y = { timedEntries: Z, previousCandidate: Int32Array.from(Z.keys()) }),
      e.timedSides.set(r.isSidechain, y));
  }
  let S = y.timedEntries.length,
    w = 0;
  while (w < S) {
    let Z = (w + S) >>> 1;
    if (y.timedEntries[Z].time <= time) w = Z + 1;
    else S = Z;
  }
  let L = S - 1;
  while (L >= 0) {
    let Z = y.previousCandidate[L];
    if (Z !== L) L = Z;
    else if (s.has(y.timedEntries[L].entry.uuid)) ((y.previousCandidate[L] = L - 1), (L -= 1));
    else break;
  }
  let G = S - 1;
  while (G > L) {
    let Z = y.previousCandidate[G];
    ((y.previousCandidate[G] = L), (G = Z));
  }
  let q = y.timedEntries[L];
  return q && time - q.time <= pfo ? q.entry : void 0;
}

export { readSessionStartDate, aggregateClaudeCodeStatsForRange, totalUsageTokens, mergeCacheWithNewStats_2 };
