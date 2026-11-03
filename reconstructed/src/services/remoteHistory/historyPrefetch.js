/**
 * services/remoteHistory/historyPrefetch.ts
 *
 * 2.1.316 新增：远程会话历史预取与缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pmgfyvx7.js (6)
 * attribution: placement 6
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

//@ chunk-pmgfyvx7.js:12911-12929 placement
/**
 * 远程会话历史的两个宿主注入钩子：PREFETCH_STATE 提供回复通道判定，G 判定事件是否来自项目成员（均为 null 表示未注入）。
 */
var PREFETCH_STATE = null;
var projectPersonEventFilter = null;
//@ chunk-pmgfyvx7.js:12929-12979 placement
var HISTORY_PAGE_SIZE = PREFETCH_EVENT_PAGE_SIZE;
var MAX_HISTORY_EXTRA_PAGES = 4;
var HISTORY_WALK_BUDGET_MS = 500;
var MAX_SPOOL_BYTES = 16000000;
var PREVIOUS_SPOOL_CLEANUP_DELAY_MS = 30000;
var SETTLED_PREFETCH_TTL_MS = 3000;
//@ chunk-pmgfyvx7.js:12979-13348 placement
function historySpoolDir() {
  let e = bridgeHostState();
  if (e.historySpoolDir !== null) return e.historySpoolDir;
  let r = join(tmpdir(), "cc-history-prefetch-");
  let i = mkdtemp(r).catch((error) =>
    isENOENT(error)
      ? mkdir(dirname(r), {
          recursive: true,
          mode: 448,
        }).then(() => mkdtemp(r))
      : Promise.reject(error),
  );
  let m = registerCleanup(() =>
    i
      .then((s) =>
        rm(s, {
          recursive: true,
          force: true,
        }),
      )
      .catch(() => {}),
  );
  e.historySpoolDir = i;
  i.catch(() => {
    m();
    if (e.historySpoolDir === i) e.historySpoolDir = null;
  });
  return i;
}
//@ chunk-pmgfyvx7.js:13348-15125 placement
/**
 * 为云端会话预取历史事件并写入本地缓存目录（仅第一方）。
 */
function startHistoryPrefetch(e, credentials, i) {
  if (getAPIProvider() !== "firstParty") return;
  if (!CCR_SESSION_ID_RE.test(e)) {
    logForDebugging(`[historyPrefetch] ${e} fails CCR_SESSION_ID_RE \u2014 refusing`, {
      level: "warn",
    });
    return;
  }
  let historyPrefetchEntries = bridgeHostState().historyPrefetchEntries;
  let s = historyPrefetchEntries.get(e);
  if (s && !s.settled) return;
  if (
    i?.force !== true &&
    s?.settledOk === true &&
    s.settledAt !== undefined &&
    Date.now() - s.settledAt < SETTLED_PREFETCH_TTL_MS
  )
    return;
  let l = historySpoolDir();
  let n = l.then((y) => join(y, `${e}.${randomUUID()}.json`));
  let startTime = performance.now();
  let S = {
    written: Promise.resolve(null),
    settled: false,
    pageSize: HISTORY_PAGE_SIZE,
  };
  let w = (async () => {
    let y = await n;
    let R = async (E) =>
      apiClient.get(`/v1/code/sessions/${e}/events?limit=${E}&sort_order=desc`, {
        auth: "teleport-org",
        credentials,
        headers: await trustedDeviceHeaders(),
        responseType: "stream",
        timeout: 15000,
        validateStatus: () => true,
      });
    let _ = await R(HISTORY_PAGE_SIZE);
    if (_.ok && _.status === 400) {
      logForDebugging(
        `[historyPrefetch] ${e} limit=${HISTORY_PAGE_SIZE} rejected (400) \u2014 retrying at ${DEFAULT_EVENT_PAGE_SIZE}`,
      );
      _.data.resume();
      S.pageSize = DEFAULT_EVENT_PAGE_SIZE;
      _ = await R(DEFAULT_EVENT_PAGE_SIZE);
    }
    if (!_.ok) {
      logForDebugging(`[historyPrefetch] ${e} gate=${_.reason} ${"detail" in _ ? _.detail : ""}`);
      return null;
    }
    if (_.status !== 200) {
      logForDebugging(`[historyPrefetch] ${e} HTTP ${_.status}`);
      _.data.resume();
      return null;
    }
    let hash = createHash("sha256");
    await pipeline(
      _.data,
      async function* (E) {
        for await (let P of E) {
          hash.update(P);
          yield P;
        }
      },
      createWriteStream(y, {
        mode: 384,
        flags: "wx",
      }),
    );
    return {
      path: y,
      digest: hash.digest("hex"),
    };
  })().catch((error) => {
    logForDebugging(`[historyPrefetch] ${e} failed: ${errorMessage(error)}`);
    if (getErrnoCode(error) === "EEXIST") {
      logEvent("tengu_remote_history_spool_altered", {});
      return null;
    }
    if (isENOENT(error) && bridgeHostState().historySpoolDir === l) bridgeHostState().historySpoolDir = null;
    n.then(unlink).catch(() => {});
    return null;
  });
  S.written = w;
  historyPrefetchEntries.set(e, S);
  if (s)
    setTimeout(
      (y) => {
        y.then((R) => (R === null ? undefined : unlink(R.path))).catch(() => {});
      },
      PREVIOUS_SPOOL_CLEANUP_DELAY_MS,
      s.written,
    ).unref();
  w.then((y) => {
    S.settled = true;
    S.settledAt = Date.now();
    S.settledOk = y !== null;
    if (y === null && s?.settled === true && historyPrefetchEntries.get(e) === S)
      historyPrefetchEntries.set(e, {
        ...s,
        settledAt: Date.now(),
      });
    logForDebugging(
      `[historyPrefetch] ${e} ${y ? `\u2192 ${y.path}` : "null"} +${(performance.now() - startTime).toFixed(0)}ms`,
    );
  });
}
//@ chunk-pmgfyvx7.js:15125-15785 placement
async function readSpooledHistory(e, { path, digest }) {
  try {
    let m = await lstat(path);
    let size = m.size;
    if (size > MAX_SPOOL_BYTES) {
      logForDebugging(`[historyPrefetch] ${e} spool ${size}B exceeds cap \u2014 skipping`);
      return {
        skip: "oversize",
      };
    }
    if (m.isFile()) {
      let l = await open(path, readOnlyNoFollowFlags());
      try {
        if ((await l.stat()).isFile()) {
          let { buffer } = await l.read(Buffer.alloc(size), 0, size, 0);
          if (computeContentHash(buffer) === digest)
            return {
              body: buffer.toString("utf8"),
            };
        }
      } finally {
        await l.close();
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
    `[historyPrefetch] ${e} spool failed the check against what the fetch wrote \u2014 skipping`,
    {
      level: "warn",
    },
  );
  return {
    skip: "altered",
  };
}
//@ chunk-pmgfyvx7.js:15785-16650 placement
async function takePrefetchedHistory(e, credentials) {
  let historyPrefetchEntries = bridgeHostState().historyPrefetchEntries;
  if (!historyPrefetchEntries.has(e)) startHistoryPrefetch(e, credentials);
  let m = historyPrefetchEntries.get(e);
  historyPrefetchEntries.delete(e);
  if (!m) return null;
  let written = await m.written;
  if (written === null) return null;
  let spooledHistory = await readSpooledHistory(e, written);
  await unlink(written.path).catch(() => {});
  if ("skip" in spooledHistory) return null;
  let body = spooledHistory.body;
  let historyLine = parseHistoryLine(body);
  if (historyLine === null) {
    logForDebugging(`[historyPrefetch] ${e} parse failed`);
    return null;
  }
  if (!historyLine.hasMore) return filterHistoryEvents(historyLine);
  let ctx = await getSessionRequestConfig(e, credentials).catch(() => null);
  if (ctx === null) return filterHistoryEvents(historyLine);
  let events = historyLine.events;
  let firstId = historyLine.firstId;
  let R = 1;
  let _ = Date.now() + HISTORY_WALK_BUDGET_MS;
  while (
    firstId !== null &&
    R < MAX_HISTORY_EXTRA_PAGES &&
    Date.now() < _ &&
    !(hasBackgroundEvents(events) && events.some(isWorkerBackgroundEvent))
  ) {
    let E = _ - Date.now();
    let winner = await Promise.race([
      fetchOlderEvents(ctx, firstId, m.pageSize, MAX_SPOOL_BYTES),
      sleep(E).then(() => "budget"),
    ]);
    if (winner === "budget" || winner === null) break;
    R++;
    events.unshift(...winner.events);
    firstId = winner.hasMore ? winner.firstId : null;
    historyLine = winner;
  }
  let b = firstId !== null && hasBackgroundEvents(events);
  logForDebugging(
    `[historyPrefetch] ${e} walked ${R} pages, ${events.length} events, complete=${firstId === null || b}`,
  );
  return filterHistoryEvents({
    events,
    firstId,
    hasMore: firstId !== null && !b,
  });
}
export { PREFETCH_STATE, projectPersonEventFilter };
