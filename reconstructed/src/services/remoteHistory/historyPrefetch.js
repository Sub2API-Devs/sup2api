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
import { nCs, _en, getSessionRequestConfig } from "../../remote/RemoteSessionManager.js";
import { ao } from "../../bridge/bridgeHostState.js";
import { isENOENT, errorMessage, getErrnoCode } from "../../utils/errors.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { CCR_SESSION_ID_RE } from "../cloudSessions/ccrSessionList.js";
import { logForDebugging } from "../../utils/debug.js";
import { apiClient } from "../routines/routinesApi.js";
import { trustedDeviceHeaders } from "../../utils/teleport/api.js";
import { logEvent } from "../analytics/index.js";
import { $c } from "../../utils/platformTargets.js";
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
var PREFETCH_STATE = null,
  G = null;
//@ chunk-pmgfyvx7.js:12929-12979 placement
var j = nCs,
  ue = 4,
  ce = 500,
  Z = 16000000,
  de = 30000,
  fe = 3000;
//@ chunk-pmgfyvx7.js:12979-13348 placement
function historySpoolDir() {
  let e = ao();
  if (e.historySpoolDir !== null) return e.historySpoolDir;
  let r = join(tmpdir(), "cc-history-prefetch-"),
    i = mkdtemp(r).catch((s) =>
      isENOENT(s)
        ? mkdir(dirname(r), { recursive: !0, mode: 448 }).then(() => mkdtemp(r))
        : Promise.reject(s),
    ),
    m = registerCleanup(() => i.then((s) => rm(s, { recursive: !0, force: !0 })).catch(() => {}));
  return (
    (e.historySpoolDir = i),
    i.catch(() => {
      if ((m(), e.historySpoolDir === i)) e.historySpoolDir = null;
    }),
    i
  );
}
/**
 * 为云端会话预取历史事件并写入本地缓存目录（仅第一方）。
 */
//@ chunk-pmgfyvx7.js:13348-15125 placement
function startHistoryPrefetch(e, r, i) {
  if (getAPIProvider() !== "firstParty") return;
  if (!CCR_SESSION_ID_RE.test(e)) {
    logForDebugging(`[historyPrefetch] ${e} fails CCR_SESSION_ID_RE \u2014 refusing`, { level: "warn" });
    return;
  }
  let historyPrefetchEntries = ao().historyPrefetchEntries,
    s = historyPrefetchEntries.get(e);
  if (s && !s.settled) return;
  if (i?.force !== !0 && s?.settledOk === !0 && s.settledAt !== void 0 && Date.now() - s.settledAt < fe)
    return;
  let l = historySpoolDir(),
    n = l.then((y) => join(y, `${e}.${randomUUID()}.json`)),
    startTime = performance.now(),
    S = { written: Promise.resolve(null), settled: !1, pageSize: j },
    w = (async () => {
      let y = await n,
        R = async (E) =>
          apiClient.get(`/v1/code/sessions/${e}/events?limit=${E}&sort_order=desc`, {
            auth: "teleport-org",
            credentials: r,
            headers: await trustedDeviceHeaders(),
            responseType: "stream",
            timeout: 15000,
            validateStatus: () => !0,
          }),
        _ = await R(j);
      if (_.ok && _.status === 400)
        (logForDebugging(`[historyPrefetch] ${e} limit=${j} rejected (400) \u2014 retrying at ${_en}`),
          _.data.resume(),
          (S.pageSize = _en),
          (_ = await R(_en)));
      if (!_.ok)
        return (
          logForDebugging(`[historyPrefetch] ${e} gate=${_.reason} ${"detail" in _ ? _.detail : ""}`),
          null
        );
      if (_.status !== 200)
        return (logForDebugging(`[historyPrefetch] ${e} HTTP ${_.status}`), _.data.resume(), null);
      let b = createHash("sha256");
      return (
        await pipeline(
          _.data,
          async function* (E) {
            for await (let P of E) (b.update(P), yield P);
          },
          createWriteStream(y, { mode: 384, flags: "wx" }),
        ),
        { path: y, digest: b.digest("hex") }
      );
    })().catch((y) => {
      if (
        (logForDebugging(`[historyPrefetch] ${e} failed: ${errorMessage(y)}`), getErrnoCode(y) === "EEXIST")
      )
        return (logEvent("tengu_remote_history_spool_altered", {}), null);
      if (isENOENT(y) && ao().historySpoolDir === l) ao().historySpoolDir = null;
      return (n.then(unlink).catch(() => {}), null);
    });
  if (((S.written = w), historyPrefetchEntries.set(e, S), s))
    setTimeout(
      (y) => {
        y.then((R) => (R === null ? void 0 : unlink(R.path))).catch(() => {});
      },
      de,
      s.written,
    ).unref();
  w.then((y) => {
    if (
      ((S.settled = !0),
      (S.settledAt = Date.now()),
      (S.settledOk = y !== null),
      y === null && s?.settled === !0 && historyPrefetchEntries.get(e) === S)
    )
      historyPrefetchEntries.set(e, { ...s, settledAt: Date.now() });
    logForDebugging(
      `[historyPrefetch] ${e} ${y ? `\u2192 ${y.path}` : "null"} +${(performance.now() - startTime).toFixed(0)}ms`,
    );
  });
}
//@ chunk-pmgfyvx7.js:15125-15785 placement
async function readSpooledHistory(e, { path: path, digest: digest }) {
  try {
    let m = await lstat(path),
      size = m.size;
    if (size > Z)
      return (
        logForDebugging(`[historyPrefetch] ${e} spool ${size}B exceeds cap \u2014 skipping`),
        { skip: "oversize" }
      );
    if (m.isFile()) {
      let l = await open(path, $c());
      try {
        if ((await l.stat()).isFile()) {
          let { buffer: buffer } = await l.read(Buffer.alloc(size), 0, size, 0);
          if (computeContentHash(buffer) === digest) return { body: buffer.toString("utf8") };
        }
      } finally {
        await l.close();
      }
    }
  } catch (error) {
    if (isENOENT(error)) return { skip: "gone" };
    if (
      (logForDebugging(`[historyPrefetch] read ${path} failed: ${errorMessage(error)}`),
      isUnavailableErrorCode(getErrnoCode(error)))
    )
      return { skip: "gone" };
  }
  return (
    logEvent("tengu_remote_history_spool_altered", {}),
    logForDebugging(
      `[historyPrefetch] ${e} spool failed the check against what the fetch wrote \u2014 skipping`,
      { level: "warn" },
    ),
    { skip: "altered" }
  );
}
//@ chunk-pmgfyvx7.js:15785-16650 placement
async function takePrefetchedHistory(e, r) {
  let historyPrefetchEntries = ao().historyPrefetchEntries;
  if (!historyPrefetchEntries.has(e)) startHistoryPrefetch(e, r);
  let m = historyPrefetchEntries.get(e);
  if ((historyPrefetchEntries.delete(e), !m)) return null;
  let written = await m.written;
  if (written === null) return null;
  let l = await readSpooledHistory(e, written);
  if ((await unlink(written.path).catch(() => {}), "skip" in l)) return null;
  let body = l.body,
    h = parseHistoryLine(body);
  if (h === null) return (logForDebugging(`[historyPrefetch] ${e} parse failed`), null);
  if (!h.hasMore) return filterHistoryEvents(h);
  let S = await getSessionRequestConfig(e, r).catch(() => null);
  if (S === null) return filterHistoryEvents(h);
  let events = h.events,
    firstId = h.firstId,
    R = 1,
    _ = Date.now() + ce;
  while (
    firstId !== null &&
    R < ue &&
    Date.now() < _ &&
    !(hasBackgroundEvents(events) && events.some(isWorkerBackgroundEvent))
  ) {
    let E = _ - Date.now(),
      winner = await Promise.race([
        fetchOlderEvents(S, firstId, m.pageSize, Z),
        sleep(E).then(() => "budget"),
      ]);
    if (winner === "budget" || winner === null) break;
    (R++, events.unshift(...winner.events), (firstId = winner.hasMore ? winner.firstId : null), (h = winner));
  }
  let b = firstId !== null && hasBackgroundEvents(events);
  return (
    logForDebugging(
      `[historyPrefetch] ${e} walked ${R} pages, ${events.length} events, complete=${firstId === null || b}`,
    ),
    filterHistoryEvents({ events: events, firstId: firstId, hasMore: firstId !== null && !b })
  );
}

export { PREFETCH_STATE, G };
