/**
 * services/remoteHistory/historyPrefetch.ts
 *
 * 2.1.316 新增：远程会话历史预取与缓存
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bwxq9hmx.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, dirname } from "path";
import { tmpdir } from "os";
import { mkdtemp, mkdir, rm, unlink, lstat, open } from "fs/promises";
import { randomUUID, createHash } from "crypto";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import {
  PREFETCH_EVENT_PAGE_SIZE,
  DEFAULT_EVENT_PAGE_SIZE,
  getSessionRequestConfig,
} from "../../remote/RemoteSessionManager.js";
import { bridgeHostState } from "../../bridge/bridgeHostState.js";
import { isENOENT, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { CCR_SESSION_ID_RE } from "../cloudSessions/ccrSessionList.js";
import { logForDebugging } from "../../utils/debug.js";
import { apiClient } from "../routines/routinesApi.js";
import { trustedDeviceHeaders } from "../../utils/teleport/api.js";
import { logEvent } from "../analytics/index.js";
import { readOnlyNoFollowFlags } from "../../utils/platformTargets.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isUnavailableErrorCode } from "../../utils/settings/managedEnvKeys.js";
import {
  parseHistoryLine,
  filterHistoryEvents,
  hasBackgroundEvents,
  isWorkerBackgroundEvent,
} from "./historyEventFilter.js";
import { fetchOlderEvents } from "../../assistant/sessionHistory.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-bwxq9hmx.js:14087-14105 placement
/**
 * 远程会话历史的两个宿主注入钩子：PREFETCH_STATE 提供回复通道判定，G 判定事件是否来自项目成员（均为 null 表示未注入）。
 */
var PREFETCH_STATE = null;
var projectPersonEventFilter = null;
//@ chunk-bwxq9hmx.js:14105-14155 placement
var HISTORY_PAGE_SIZE = PREFETCH_EVENT_PAGE_SIZE;
var MAX_HISTORY_EXTRA_PAGES = 4;
var HISTORY_WALK_BUDGET_MS = 500;
var MAX_SPOOL_BYTES = 16000000;
var PREVIOUS_SPOOL_CLEANUP_DELAY_MS = 30000;
var SETTLED_PREFETCH_TTL_MS = 3000;
//@ chunk-bwxq9hmx.js:14155-14524 placement
function historySpoolDir() {
  let state = bridgeHostState();
  if (state.historySpoolDir !== null) return state.historySpoolDir;
  let template = join(tmpdir(), "cc-history-prefetch-");
  let pendingDir = mkdtemp(template).catch((error) =>
    isENOENT(error)
      ? mkdir(dirname(template), {
          recursive: true,
          mode: 448,
        }).then(() => mkdtemp(template))
      : Promise.reject(error),
  );
  let unregister = registerCleanup(() =>
    pendingDir
      .then((dir) =>
        rm(dir, {
          recursive: true,
          force: true,
        }),
      )
      .catch(() => {}),
  );
  state.historySpoolDir = pendingDir;
  pendingDir.catch(() => {
    unregister();
    if (state.historySpoolDir === pendingDir) state.historySpoolDir = null;
  });
  return pendingDir;
}
//@ chunk-bwxq9hmx.js:14524-16301 placement
/**
 * 为云端会话预取历史事件并写入本地缓存目录（仅第一方）。
 */
function startHistoryPrefetch(sessionId, credentials, options) {
  if (getAPIProvider() !== "firstParty") return;
  if (!CCR_SESSION_ID_RE.test(sessionId)) {
    logForDebugging(`[historyPrefetch] ${sessionId} fails CCR_SESSION_ID_RE \u2014 refusing`, {
      level: "warn",
    });
    return;
  }
  let historyPrefetchEntries = bridgeHostState().historyPrefetchEntries;
  let previousEntry = historyPrefetchEntries.get(sessionId);
  if (previousEntry && !previousEntry.settled) return;
  if (
    options?.force !== true &&
    previousEntry?.settledOk === true &&
    previousEntry.settledAt !== undefined &&
    Date.now() - previousEntry.settledAt < SETTLED_PREFETCH_TTL_MS
  )
    return;
  let dirPromise = historySpoolDir();
  let pathPromise = dirPromise.then((dir) => join(dir, `${sessionId}.${randomUUID()}.json`));
  let startTime = performance.now();
  let entry = {
    written: Promise.resolve(null),
    settled: false,
    pageSize: HISTORY_PAGE_SIZE,
  };
  let writePromise = (async () => {
    let spoolPath = await pathPromise;
    let fetchPage = async (limit) =>
      apiClient.get(`/v1/code/sessions/${sessionId}/events?limit=${limit}&sort_order=desc`, {
        auth: "teleport-org",
        credentials,
        headers: await trustedDeviceHeaders(),
        responseType: "stream",
        timeout: 15000,
        validateStatus: () => true,
      });
    let response = await fetchPage(HISTORY_PAGE_SIZE);
    if (response.ok && response.status === 400) {
      logForDebugging(
        `[historyPrefetch] ${sessionId} limit=${HISTORY_PAGE_SIZE} rejected (400) \u2014 retrying at ${DEFAULT_EVENT_PAGE_SIZE}`,
      );
      response.data.resume();
      entry.pageSize = DEFAULT_EVENT_PAGE_SIZE;
      response = await fetchPage(DEFAULT_EVENT_PAGE_SIZE);
    }
    if (!response.ok) {
      logForDebugging(
        `[historyPrefetch] ${sessionId} gate=${response.reason} ${"detail" in response ? response.detail : ""}`,
      );
      return null;
    }
    if (response.status !== 200) {
      logForDebugging(`[historyPrefetch] ${sessionId} HTTP ${response.status}`);
      response.data.resume();
      return null;
    }
    let hash = createHash("sha256");
    await pipeline(
      response.data,
      async function* (source) {
        for await (let chunk of source) {
          hash.update(chunk);
          yield chunk;
        }
      },
      createWriteStream(spoolPath, {
        mode: 384,
        flags: "wx",
      }),
    );
    return {
      path: spoolPath,
      digest: hash.digest("hex"),
    };
  })().catch((error) => {
    logForDebugging(`[historyPrefetch] ${sessionId} failed: ${errorMessage(error)}`);
    if (getErrnoCode(error) === "EEXIST") {
      logEvent("tengu_remote_history_spool_altered", {});
      return null;
    }
    if (isENOENT(error) && bridgeHostState().historySpoolDir === dirPromise)
      bridgeHostState().historySpoolDir = null;
    pathPromise.then(unlink).catch(() => {});
    return null;
  });
  entry.written = writePromise;
  historyPrefetchEntries.set(sessionId, entry);
  if (previousEntry)
    setTimeout(
      (previousWritten) => {
        previousWritten
          .then((previousResult) => (previousResult === null ? undefined : unlink(previousResult.path)))
          .catch(() => {});
      },
      PREVIOUS_SPOOL_CLEANUP_DELAY_MS,
      previousEntry.written,
    ).unref();
  writePromise.then((written) => {
    entry.settled = true;
    entry.settledAt = Date.now();
    entry.settledOk = written !== null;
    if (
      written === null &&
      previousEntry?.settled === true &&
      historyPrefetchEntries.get(sessionId) === entry
    )
      historyPrefetchEntries.set(sessionId, {
        ...previousEntry,
        settledAt: Date.now(),
      });
    logForDebugging(
      `[historyPrefetch] ${sessionId} ${written ? `\u2192 ${written.path}` : "null"} +${(performance.now() - startTime).toFixed(0)}ms`,
    );
  });
}
//@ chunk-bwxq9hmx.js:16301-16961 placement
async function readSpooledHistory(sessionId, { path, digest }) {
  try {
    let stats = await lstat(path);
    let size = stats.size;
    if (size > MAX_SPOOL_BYTES) {
      logForDebugging(`[historyPrefetch] ${sessionId} spool ${size}B exceeds cap \u2014 skipping`);
      return {
        skip: "oversize",
      };
    }
    if (stats.isFile()) {
      let handle = await open(path, readOnlyNoFollowFlags());
      try {
        if ((await handle.stat()).isFile()) {
          let { buffer } = await handle.read(Buffer.alloc(size), 0, size, 0);
          if (computeContentHash(buffer) === digest)
            return {
              body: buffer.toString("utf8"),
            };
        }
      } finally {
        await handle.close();
      }
    }
  } catch (error) {
    if (isENOENT(error))
      return {
        skip: "gone",
      };
    logForDebugging(`[historyPrefetch] read ${path} failed: ${errorMessage(error)}`);
    if (isUnavailableErrorCode(getErrnoCode(error)))
      return {
        skip: "gone",
      };
  }
  logEvent("tengu_remote_history_spool_altered", {});
  logForDebugging(
    `[historyPrefetch] ${sessionId} spool failed the check against what the fetch wrote \u2014 skipping`,
    {
      level: "warn",
    },
  );
  return {
    skip: "altered",
  };
}
//@ chunk-bwxq9hmx.js:16961-17826 placement
async function takePrefetchedHistory(sessionId, credentials) {
  let historyPrefetchEntries = bridgeHostState().historyPrefetchEntries;
  if (!historyPrefetchEntries.has(sessionId)) startHistoryPrefetch(sessionId, credentials);
  let entry = historyPrefetchEntries.get(sessionId);
  historyPrefetchEntries.delete(sessionId);
  if (!entry) return null;
  let written = await entry.written;
  if (written === null) return null;
  let spooledHistory = await readSpooledHistory(sessionId, written);
  await unlink(written.path).catch(() => {});
  if ("skip" in spooledHistory) return null;
  let body = spooledHistory.body;
  let historyLine = parseHistoryLine(body);
  if (historyLine === null) {
    logForDebugging(`[historyPrefetch] ${sessionId} parse failed`);
    return null;
  }
  if (!historyLine.hasMore) return filterHistoryEvents(historyLine);
  let ctx = await getSessionRequestConfig(sessionId, credentials).catch(() => null);
  if (ctx === null) return filterHistoryEvents(historyLine);
  let events = historyLine.events;
  let firstId = historyLine.firstId;
  let pageCount = 1;
  let deadlineMs = Date.now() + HISTORY_WALK_BUDGET_MS;
  while (
    firstId !== null &&
    pageCount < MAX_HISTORY_EXTRA_PAGES &&
    Date.now() < deadlineMs &&
    !(hasBackgroundEvents(events) && events.some(isWorkerBackgroundEvent))
  ) {
    let remainingMs = deadlineMs - Date.now();
    let winner = await Promise.race([
      fetchOlderEvents(ctx, firstId, entry.pageSize, MAX_SPOOL_BYTES),
      sleep(remainingMs).then(() => "budget"),
    ]);
    if (winner === "budget" || winner === null) break;
    pageCount++;
    events.unshift(...winner.events);
    firstId = winner.hasMore ? winner.firstId : null;
    historyLine = winner;
  }
  let complete = firstId !== null && hasBackgroundEvents(events);
  logForDebugging(
    `[historyPrefetch] ${sessionId} walked ${pageCount} pages, ${events.length} events, complete=${firstId === null || complete}`,
  );
  return filterHistoryEvents({
    events,
    firstId,
    hasMore: firstId !== null && !complete,
  });
}
export { PREFETCH_STATE, projectPersonEventFilter, takePrefetchedHistory };
