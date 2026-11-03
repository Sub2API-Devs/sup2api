/**
 * bridge/_new/runPersistenceBackfill.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cg2r2hy6.js (16)
 * attribution: sole-consumer-new 16
 */
import { stat } from "fs/promises";
import {
  sameOwnerAccount,
  isClaudeAIOAuthTokenHostInjected,
  getStoredOauthAccountInfo,
} from "../../utils/auth.js";
import { isBridgeOwnerCheckAttributionEnabled } from "../bridgeGates.js";
import { isBridgeFirstParty } from "../bridgeEnabled.js";
import { getBridgeTokenOverride, getBridgeAccessToken } from "../bridgeConfig.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { attributeTokenOwner, VNo } from "../ownerPin.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { withDeadline, Aa, sleep, fullJitterBackoffMs } from "../../utils/sleep.js";
import { getSecureStorage } from "../../utils/secureStorage/index.js";
import { readFreshOauthAccountFromDisk } from "../../utils/config.js";
import { READ_FAILED } from "../../utils/secureStorage/storageWriteLock.js";
import { sessionIdBody } from "../sessionIdCompat.js";
import { listRegisteredSessionRecords } from "../../utils/udsMessaging/udsClient.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { getProcessStartTimeAsync } from "../../utils/processIdentity.js";
import {
  isSessionHistorySuppressed,
  getMaterializedSessionFile,
  isOwnTranscriptFile,
  getDerivedTranscriptPathForSession,
  isPrecautionarySuppressionHeldFor,
  pinSessionId,
  holdPrecautionarySuppressionFor,
  markPrecautionClearResilientFor,
  markScanUncertaintyHoldFor,
  holdSessionHistorySuppressionFor,
  isRemoteEgressSuppressedFor,
  isScanUncertaintyHoldFor,
  getAgentTranscriptPath_2,
  SuppressionScanBudget,
  SUPPRESSION_SCAN_CHUNK_BYTES,
  matchesHistorySuppressionLine,
  isSyncedTranscriptEntry,
  isRowForeignToBridgeSession,
  SUPPRESSION_SCAN_MAX_LINES,
  suppressionScanFailure,
  logSuppressionScan,
  getAgentTranscriptPath,
} from "../../utils/sessionStorage.js";
import { getSessionId } from "../../bootstrap/state.js";
import { nt, isCompactBoundaryMessage, forwardTranscriptMessages } from "../workSecretRefresh.js";
import { getErrnoCode, isENOENT, errorMessage } from "../../utils/errors.js";
import { SKIP_PRECOMPACT_THRESHOLD } from "../../utils/sessionStoragePortable.js";
import { openTranscriptStream } from "../../utils/transcript/transcriptFiles.js";
import { readLinesReverse } from "../../utils/fsOperations.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_2 } from "../../services/projects/threadRows.js";
import { L1t } from "../../cli/transports/ccrClient.js";
import { createPageBudget, readAllPages } from "../../utils/pagedRead.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";

//@ chunk-cg2r2hy6.js:13644-13666 sole-consumer-new
var Zt = 5000,
  tr = 160000;
/**
 * 桥接所有者核对：身份文件的账号与记录的 owner 不一致、且会话跑在宿主注入的 bearer 上时，向服务端查询该 bearer 的归属。返回 source=file/server/unconfirmed，并记 tengu_bridge_owner_check_attributed。
 */
//@ chunk-cg2r2hy6.js:13666-14476 sole-consumer-new
async function resolveOwnerCheckIdentity({
  site: site,
  fileLogin: fileLogin,
  owner: owner,
  attributions: attributions,
  writerHonorsVouch: writerHonorsVouch,
}) {
  if (
    !writerHonorsVouch ||
    !owner.accountUuid ||
    !fileLogin?.accountUuid ||
    sameOwnerAccount(fileLogin, owner) ||
    !isBridgeOwnerCheckAttributionEnabled() ||
    !isBridgeFirstParty() ||
    getBridgeTokenOverride() !== void 0 ||
    !isClaudeAIOAuthTokenHostInjected()
  )
    return { source: "file", login: fileLogin };
  let bearer = getBridgeAccessToken(),
    canAskServer = bearer !== void 0 && !isEssentialTrafficOnly(),
    attributedLogin = canAskServer ? attributions.get(bearer) : void 0;
  if (canAskServer && attributedLogin === void 0) {
    if (((attributedLogin = await attributeTokenOwner(bearer)), attributedLogin !== void 0))
      attributions.set(bearer, attributedLogin);
  }
  let outcome =
    attributedLogin === void 0
      ? canAskServer
        ? "unattributed"
        : "not_asked"
      : sameOwnerAccount(attributedLogin, owner)
        ? "owner"
        : "other_account";
  return (
    logEvent("tengu_bridge_owner_check_attributed", { site: fromEnum(site), outcome: fromEnum(outcome) }),
    logForDebugging(
      `[bridge:owner-check] ${site}: the identity file names another account than the recorded owner, but this session runs on a host-injected bearer \u2014 server attribution: ${outcome}`,
    ),
    bearer !== void 0 && attributedLogin !== void 0 && outcome === "owner"
      ? { source: "server", login: attributedLogin, bearer: bearer }
      : {
          source: "unconfirmed",
          login: void 0,
          attributed: attributedLogin,
          bearer: bearer,
          mismatchAgainst: attributedLogin?.accountUuid ?? fileLogin.accountUuid,
        }
  );
}
/**
 * 返回一个同步判断函数：当前桥接 access token 是否已被服务端确认属于 login 账号。未确认时异步查询（指数退避，超过上限即判定失败）；token 变化或归属他人后永久返回 false。
 */
//@ chunk-cg2r2hy6.js:14476-15022 sole-consumer-new
function createBearerOwnerVouch({ login: login, bearer: bearer, attributions: attributions }) {
  let vouchedBearer = bearer,
    pendingBearer,
    inFlight = !1,
    nextAttemptAt = 0,
    backoffMs = Zt,
    revoked = !1;
  function checkVouch() {
    if (revoked) return !1;
    let E = getBridgeAccessToken();
    if (E === void 0) return !1;
    if (pendingBearer !== void 0 && E !== pendingBearer) return ((revoked = !0), !1);
    if (E === vouchedBearer) return !0;
    if (login === void 0 || isEssentialTrafficOnly() || !isBridgeOwnerCheckAttributionEnabled())
      return ((revoked = !0), !1);
    let A = attributions.get(E);
    if (A !== void 0 && !sameOwnerAccount(A, login)) return ((revoked = !0), !1);
    if (A !== void 0) return ((vouchedBearer = E), (pendingBearer = void 0), !0);
    if (((pendingBearer = E), !inFlight && Date.now() >= nextAttemptAt))
      ((inFlight = !0),
        attributeTokenOwner(E).then((T) => {
          if (((inFlight = !1), T !== void 0)) {
            if (
              (attributions.set(E, T),
              (pendingBearer = void 0),
              (backoffMs = Zt),
              !sameOwnerAccount(T, login))
            )
              revoked = !0;
          } else if (backoffMs > tr) revoked = !0;
          else ((nextAttemptAt = Date.now() + backoffMs), (backoffMs *= 2));
        }));
    return !1;
  }
  return () => {
    try {
      return checkVouch();
    } catch (error) {
      return ((revoked = !0), logError(error), !1);
    }
  };
}
//@ chunk-cg2r2hy6.js:15022-15034 sole-consumer-new
var nr = 3000;
//@ chunk-cg2r2hy6.js:15034-15122 sole-consumer-new
async function en(s, u) {
  if (!(await VNo(u)) || !getStoredOauthAccountInfo()?.accountUuid) return;
  return (p) => classifyBridgeTokenAbsence(p, s, u);
}
/**
 * 桥接拿不到 token 时判断原因（带超时），记录 tengu_bridge_token_absence_classified 并返回结论字符串。
 */
//@ chunk-cg2r2hy6.js:15122-15351 sole-consumer-new
async function classifyBridgeTokenAbsence(site, u, p) {
  let o = await withDeadline(readTokenAbsenceVerdict(u, p), nr).then(
    (y) => y ?? "unknown_timeout",
    () => "unknown_error",
  );
  return (
    logForDebugging(`[bridge:signed-out] site=${site} verdict=${o}`),
    logEvent("tengu_bridge_token_absence_classified", { site: fromEnum(site), verdict: fromEnum(o) }),
    o
  );
}
/**
 * 读磁盘 OAuth 账号与安全存储，区分 refresh_token_dead / unknown_identity_* / unknown_store_unreadable / signed_out 等情况。
 */
//@ chunk-cg2r2hy6.js:15351-15871 sole-consumer-new
async function readTokenAbsenceVerdict(s, u) {
  let secureStorage = getSecureStorage(),
    diskAccount = await readFreshOauthAccountFromDisk(s),
    y = !diskAccount?.accountUuid && Boolean(getStoredOauthAccountInfo()?.accountUuid);
  if (diskAccount?.accountUuid || y) {
    if ((await secureStorage.readAsync(u))?.claudeAiOauth?.refreshToken === "") return "refresh_token_dead";
    return y ? "unknown_identity_cached_only" : "unknown_identity_present";
  }
  let S = await secureStorage.readAsyncStrict?.(u);
  if (S === void 0 || S === READ_FAILED) return "unknown_store_unreadable";
  if (S?.claudeAiOauth?.refreshToken === "") return "refresh_token_dead";
  if (S?.claudeAiOauth !== void 0) return "unknown_identity_absent_token_present";
  return "signed_out";
}
/**
 * 在会话注册表里找另一个仍在运行、声明了同一桥接会话的进程（用进程启动时间核对 pid 未被复用），返回 {pid, startedAt}。
 */
//@ chunk-cg2r2hy6.js:15871-16424 sole-consumer-new
async function findLiveBridgeSessionHolder(s) {
  let sessionBody = sessionIdBody(s),
    records = await listRegisteredSessionRecords().catch(() => {
      return;
    });
  if (records === void 0) {
    logFeatureSad("bridge_resume_guard", "registry_read_failed");
    return;
  }
  for (let o of records) {
    if (
      o.pid === process.pid ||
      o.bridgeSessionId === void 0 ||
      sessionIdBody(o.bridgeSessionId) !== sessionBody
    )
      continue;
    let y = o.procStartFt ?? o.procStart;
    if (y === void 0 || !isProcessRunning(o.pid)) continue;
    let S = await getProcessStartTimeAsync(o.pid, { skipCache: !0 });
    if (S === void 0) {
      logForDebugging(
        `[bridge:repl] pid ${o.pid} advertises bridge session ${s} but its start token is unreadable \u2014 not treated as a holder`,
      );
      continue;
    }
    if (S === y) return { pid: o.pid, startedAt: o.startedAt };
  }
  return;
}
//@ chunk-cg2r2hy6.js:16488-16521 sole-consumer-new
var rn = 20,
  on = 4,
  sr = 2000,
  ar = 300000;
/**
 * [persistence-sync] 把本地主会话与子代理 transcript 中服务端缺少的条目补传：先检查历史抑制污点和会话是否切换，扫描主 transcript，再读服务端子代理事件并逐个补传；返回上传计数或 rows_owed/read_failed。
 */
//@ chunk-cg2r2hy6.js:16521-19033 sole-consumer-new
async function runPersistenceBackfill(
  uploadRows,
  serverReader,
  subagentIds,
  serverKnownEmpty,
  signal,
  storageBackend,
  bridgeSessionId,
  onLocalRow,
  budget,
) {
  if (isSessionHistorySuppressed())
    return (
      logForDebugging(
        "[persistence-sync] Refusing backfill: conversation carries a history-suppression taint",
      ),
      { uploadedMain: 0, uploadedSubagents: 0 }
    );
  let sessionId = getSessionId(),
    materializedFile = getMaterializedSessionFile(),
    mainTranscriptPath =
      materializedFile !== null && isOwnTranscriptFile(sessionId, materializedFile)
        ? materializedFile
        : getDerivedTranscriptPathForSession(sessionId),
    main = await serverReader.readMain(signal),
    serverUuids = new Set(nt(main?.events));
  logForDebugging(
    `[persistence-sync] Server has ${main === null ? "an unread number of" : serverUuids.size} main events since compaction`,
  );
  let anchorVerdict = recheckBackfillPreconditions(sessionId);
  if (anchorVerdict !== void 0) return anchorVerdict;
  let mainRows = await scanTranscriptForBackfill(
    mainTranscriptPath,
    serverUuids,
    !0,
    storageBackend,
    bridgeSessionId,
    onLocalRow,
    main === null && !serverKnownEmpty ? null : isCompactBoundaryMessage(main?.events ?? []),
    { signal: signal, budget: budget },
  );
  if (mainRows === "aborted" || mainRows === "too-many-rows") return "rows_owed";
  if (mainRows === "budget-exhausted") {
    let P = isPrecautionarySuppressionHeldFor(pinSessionId(sessionId));
    if (
      (holdPrecautionarySuppressionFor(pinSessionId(sessionId)),
      markPrecautionClearResilientFor(pinSessionId(sessionId)),
      !P)
    )
      markScanUncertaintyHoldFor(pinSessionId(sessionId));
    return (
      logForDebugging(
        "[persistence-sync] Taint sweep budget exhausted: refusing this backfill (precautionary hold, no durable stamp)",
      ),
      "rows_owed"
    );
  }
  if (mainRows === "tainted")
    return (
      holdSessionHistorySuppressionFor(pinSessionId(sessionId)),
      logForDebugging(
        "[persistence-sync] Main transcript tainted: aborting sync (subagents included), healing the in-memory flag",
      ),
      { uploadedMain: 0, uploadedSubagents: 0 }
    );
  if (main === null && !serverKnownEmpty)
    return (
      logForDebugging("[persistence-sync] Main server read failed: nothing uploaded, subagents included"),
      "read_failed"
    );
  let N = void 0;
  if (N !== void 0) return N;
  if ((forwardTranscriptMessages(uploadRows, mainRows, serverUuids), sessionId !== getSessionId()))
    return (
      logForDebugging(
        "[persistence-sync] Skipping subagent backfill: session id changed during the main read (mid-sync /resume)",
      ),
      "rows_owed"
    );
  let subagentFiles = await listSubagentTranscriptsForBackfill(subagentIds, storageBackend),
    [W, ...ke] = subagentFiles,
    se = W ? await serverReader.readSubagent(W.agentId, signal) : null;
  for (let P of nt(se?.events)) serverUuids.add(P);
  let failedSubagents = new Set(se === null ? subagentFiles.map(({ agentId: agentId }) => agentId) : []),
    subagentBoundaries = new Map();
  if (W && se?.events.every((P) => P.session_agent_id === W.agentId))
    (subagentBoundaries.set(W.agentId, isCompactBoundaryMessage(se.events)),
      await Promise.all(
        ke.map(async ({ agentId: agentId }) => {
          let subagent = await serverReader.readSubagent(agentId, signal);
          if (subagent === null) failedSubagents.add(agentId);
          else subagentBoundaries.set(agentId, isCompactBoundaryMessage(subagent.events));
          for (let Z of nt(subagent?.events)) serverUuids.add(Z);
        }),
      ));
  if (serverKnownEmpty) {
    for (let P of failedSubagents) subagentBoundaries.set(P, new Set());
    failedSubagents.clear();
  }
  if (sessionId !== getSessionId() || isRemoteEgressSuppressedFor(pinSessionId(sessionId)))
    return (
      logForDebugging(
        "[persistence-sync] Skipping subagent backfill: session id changed or egress was suppressed during the subagent server reads",
      ),
      sessionId !== getSessionId() || isScanUncertaintyHoldFor(pinSessionId(sessionId))
        ? "rows_owed"
        : { uploadedMain: mainRows.length, uploadedSubagents: 0 }
    );
  let uploadedSubagents = 0;
  for (let { agentId: agentId, path: path } of subagentFiles) {
    if (failedSubagents.has(agentId)) continue;
    let Z = await scanTranscriptForBackfill(
      path,
      serverUuids,
      !1,
      storageBackend,
      bridgeSessionId,
      onLocalRow,
      subagentBoundaries.get(agentId) ?? null,
      { signal: signal },
    );
    if (Z === "aborted" || Z === "too-many-rows") return "rows_owed";
    if (Z === "budget-exhausted") {
      let ve = isPrecautionarySuppressionHeldFor(pinSessionId(sessionId));
      if (
        (holdPrecautionarySuppressionFor(pinSessionId(sessionId)),
        markPrecautionClearResilientFor(pinSessionId(sessionId)),
        !ve)
      )
        markScanUncertaintyHoldFor(pinSessionId(sessionId));
      return "rows_owed";
    }
    if (Z === "tainted") {
      holdSessionHistorySuppressionFor(pinSessionId(sessionId));
      break;
    }
    (forwardTranscriptMessages(uploadRows, Z, serverUuids, agentId), (uploadedSubagents += Z.length));
  }
  return (
    logForDebugging(
      `[persistence-sync] Uploaded ${mainRows.length} main + ${uploadedSubagents} subagent entries; ${failedSubagents.size} subagent server reads failed`,
    ),
    failedSubagents.size > 0
      ? "read_failed"
      : { uploadedMain: mainRows.length, uploadedSubagents: uploadedSubagents }
  );
}
/**
 * 补传重试循环：attemptSync 返回 read_failed 时按指数退避加抖动重试，第 N 次仍落后时调用 onFallenBehind；返回 {outcome, runNow}，runNow 立即打断等待重试一次。
 */
//@ chunk-cg2r2hy6.js:19033-20019 sole-consumer-new
function createPersistenceCatchUp({
  writer: writer,
  attemptSync: attemptSync,
  onFallenBehind: onFallenBehind,
  signal: signal,
  clock: clock = Aa,
  random: random = Math.random,
}) {
  let writtenKeys = new Set(),
    dedupWriter = (T, v, F) => {
      let I = `${F?.agentId ?? ""}/${String(v.uuid)}`;
      if (signal.aborted || writtenKeys.has(I)) return Promise.resolve();
      return (writtenKeys.add(I), writer(T, v, F));
    },
    sleepAbort,
    withResolvers = Promise.withResolvers(),
    lastErrorCode,
    outcomePromise = (async () => {
      for (let T = 0; ; T++) {
        if (T > 0) {
          let min = Math.min(ar, sr * 2 ** (T - 1));
          ((sleepAbort = new AbortController()),
            await sleep(
              fullJitterBackoffMs({ baseMs: min, capMs: min, attempt: 0, floorMs: min / 2, random: random }),
              AbortSignal.any([signal, sleepAbort.signal]),
              { unref: !0, clock: clock },
            ));
        }
        if (signal.aborted) return "abandoned";
        try {
          if ((await attemptSync(dedupWriter)) !== "read_failed") {
            if (signal.aborted) return "abandoned";
            return T === 0 ? "caught_up" : T < on ? "caught_up_after_retry" : "caught_up_late";
          }
        } catch (error) {
          if (signal.aborted) return "abandoned";
          let F = getErrnoCode(error) ?? String(error);
          if (F === lastErrorCode) logForDebugging(`[persistence-sync] Catch-up threw again: ${F}`);
          else logError(error);
          lastErrorCode = F;
        }
        if (T + 1 === on && !signal.aborted) await Promise.resolve().then(onFallenBehind).catch(logError);
        (withResolvers.resolve(!1), (withResolvers = Promise.withResolvers()));
      }
    })();
  return {
    outcome: outcomePromise,
    runNow: () => (
      sleepAbort?.abort(),
      Promise.race([withResolvers.promise, outcomePromise.then((T) => T !== "abandoned")])
    ),
  };
}
/**
 * 列出要补传的子代理 transcript：过滤掉超过 SKIP_PRECOMPACT_THRESHOLD 的，按 mtime 取最新的若干个。
 */
//@ chunk-cg2r2hy6.js:20019-20397 sole-consumer-new
async function listSubagentTranscriptsForBackfill(s, u) {
  let filtered = (
      u !== void 0
        ? await statSubagentTranscriptsViaBackend(u, s)
        : await Promise.all(s.map((_) => statSubagentTranscript(_)))
    ).filter((_) => _ !== null),
    filtered_2 = filtered.filter((_) => _.size <= SKIP_PRECOMPACT_THRESHOLD),
    sliced = filtered_2.sort((_, b) => b.mtimeMs - _.mtimeMs).slice(0, rn),
    w = filtered.length - filtered_2.length,
    B = filtered_2.length - sliced.length;
  if (w > 0 || B > 0)
    logForDebugging(
      `[persistence-sync] Subagent backfill capped: ${w} over ${SKIP_PRECOMPACT_THRESHOLD}B, ${B} beyond ${rn}-agent limit (live stream unaffected)`,
    );
  return sliced;
}
/**
 * 从尾部倒序扫描一个 transcript（或经存储后端读取），收集服务端没有的同步条目直到压缩边界；遇到历史抑制条目返回 tainted，预算耗尽/行数过多返回相应状态；压缩保留的消息读不全时只上传边界之后的部分。
 */
//@ chunk-cg2r2hy6.js:20397-22079 sole-consumer-new
async function scanTranscriptForBackfill(
  transcriptPath,
  serverUuids,
  sweepTaint = !0,
  storageBackend,
  bridgeSessionId,
  onRow,
  boundaryUuids = null,
  { signal: B, budget: _ } = {},
) {
  let b = storageBackend ? getAgentTranscriptPath_2(transcriptPath) : null,
    scanBudget =
      _ ?? (storageBackend && b ? SuppressionScanBudget.forBackendRead() : new SuppressionScanBudget()),
    rows = [],
    seenUuids = new Set(),
    pastBoundary = !1,
    tooManyRows = !1,
    boundaryIndex = 0,
    neededUuids = new Set(),
    now = Date.now(),
    fileBytes,
    lineCount = 0,
    charsRead = 0,
    outcome = "clean",
    he;
  try {
    let ne =
      storageBackend && b
        ? openTranscriptStream(storageBackend, b)
        : readLinesReverse(transcriptPath, SUPPRESSION_SCAN_CHUNK_BYTES, {
            onOpen: (P) => {
              fileBytes = P;
            },
          });
    for await (let P of ne) {
      if (((he ??= P), lineCount++, (charsRead += P.length + 1), matchesHistorySuppressionLine(P)))
        return (
          logForDebugging("[persistence-sync] Refusing backfill: history-suppression entry in transcript"),
          (outcome = "found"),
          "tainted"
        );
      if (pastBoundary || tooManyRows) {
        if (sweepTaint && scanBudget.spend(P))
          return (
            logForDebugging(
              "[persistence-sync] Refusing backfill: pre-boundary taint sweep exhausted its budget without a verdict",
            ),
            (outcome = "budget-exhausted"),
            outcome
          );
        if (tooManyRows || neededUuids.size === 0) continue;
      }
      let L;
      try {
        L = jsonParse(P);
      } catch {
        continue;
      }
      if (!isSyncedTranscriptEntry(L)) continue;
      if (isRowForeignToBridgeSession(L, bridgeSessionId)) continue;
      if (!pastBoundary) seenUuids.add(L.uuid);
      else if (!neededUuids.delete(L.uuid)) continue;
      if ((onRow?.(L), !serverUuids.has(L.uuid))) rows.push(L);
      if (!pastBoundary && isCompactBoundaryMessage_2(L)) {
        ((pastBoundary = !0), (boundaryIndex = rows.length));
        let Z = L.compactMetadata?.preservedMessages?.uuids,
          filtered = (Array.isArray(Z) ? Z : []).slice(-L1t).filter((De) => !seenUuids.has(De));
        if (boundaryUuids !== null && !serverUuids.has(L.uuid) && filtered.some((De) => !serverUuids.has(De)))
          neededUuids = new Set([...filtered, ...boundaryUuids]);
      }
      if (pastBoundary && !sweepTaint && neededUuids.size === 0) break;
    }
    if (tooManyRows)
      return (
        logForDebugging(
          `[persistence-sync] Refusing backfill: ${SUPPRESSION_SCAN_MAX_LINES} lines or more since the last compaction boundary`,
        ),
        (outcome = "too-many-rows"),
        outcome
      );
  } catch (error) {
    if (((outcome = suppressionScanFailure(error)), isENOENT(error))) return [];
    throw error;
  } finally {
    if (sweepTaint)
      logSuppressionScan({
        leg: "backfill-read",
        throughBackend: Boolean(storageBackend && b),
        outcome: outcome,
        lines: lineCount,
        charsRead: charsRead,
        fileBytes: fileBytes,
        startMs: now,
      });
  }
  if (neededUuids.size > 0)
    (logForDebugging(
      `[persistence-sync] Not uploading the messages the last compaction kept: ${neededUuids.size} rows needed first (kept messages, or compaction boundaries the server returned) could not be read from the local transcript. The rest of the backfill goes on; a session resumed from the server may lack the kept messages.`,
    ),
      rows.splice(boundaryIndex));
  return rows.reverse();
}
/**
 * await 之后重新确认：会话 id 未变、远端出口未被抑制；否则返回 rows_owed 或空上传结果。
 */
//@ chunk-cg2r2hy6.js:22079-22498 sole-consumer-new
function recheckBackfillPreconditions(s) {
  if (s !== getSessionId())
    return (
      logForDebugging(
        "[persistence-sync] Refusing backfill: session id changed since the scan anchor was pinned (mid-scan /resume) \u2014 pinned content is not the current conversation",
      ),
      "rows_owed"
    );
  if (isRemoteEgressSuppressedFor(pinSessionId(s)))
    return (
      logForDebugging(
        "[persistence-sync] Refusing backfill: foreign binding or suppression carrier present at the post-await re-consult",
      ),
      isScanUncertaintyHoldFor(pinSessionId(s)) ? "rows_owed" : { uploadedMain: 0, uploadedSubagents: 0 }
    );
  return;
}
/**
 * stat 一个子代理 transcript，返回 {agentId, path, size, mtimeMs}，失败返回 null。
 */
//@ chunk-cg2r2hy6.js:22498-22623 sole-consumer-new
async function statSubagentTranscript(s, u = getAgentTranscriptPath(s)) {
  try {
    let p = await stat(u);
    return { agentId: s, path: u, size: p.size, mtimeMs: p.mtimeMs };
  } catch {
    return null;
  }
}
/**
 * 通过存储后端分页列出各会话目录下的子代理 transcript 大小与 mtime（列举失败的目录跳过），本地路径映射不到后端键的退回 fs.stat。
 */
//@ chunk-cg2r2hy6.js:22623-24194 sole-consumer-new
async function statSubagentTranscriptsViaBackend(storageBackend, agentIds) {
  let entries = agentIds.map((_) => {
      let b = getAgentTranscriptPath(_);
      return { agentId: _, path: b, key: getAgentTranscriptPath_2(b) };
    }),
    asTranscriptKey = (_) => (_ !== null && _.namespace === "transcript" && _.agentId !== void 0 ? _ : null),
    folderKeyOf = (_) => [_.projectKey, _.sessionId, ...(_.agentRelPath ?? [])].join("/"),
    folders = new Map();
  for (let { key: key } of entries) {
    let b = asTranscriptKey(key);
    if (b !== null)
      folders.set(folderKeyOf(b), {
        projectKey: b.projectKey,
        sessionId: b.sessionId,
        ...(b.agentRelPath !== void 0 && { agentRelPath: b.agentRelPath }),
      });
  }
  let listings = new Map(),
    B = createPageBudget();
  return (
    await Promise.all(
      [...folders].map(async ([_, { projectKey: b, sessionId: E, agentRelPath: A }]) => {
        let T = new Map();
        listings.set(_, T);
        let v = () => listings.delete(_),
          F = A === void 0 ? `session ${E}` : `session ${E} subtree ${A.join("/")}`;
        try {
          let I = await readAllPages(
            (N) =>
              storageBackend.listEntries(
                {
                  namespace: "transcript",
                  projectKey: b,
                  sessionId: E,
                  ...(A !== void 0 && { agentRelPath: A }),
                },
                { skipScopeStats: !0, ...(N !== void 0 && { cursor: N }) },
              ),
            (N) => {
              for (let x of N)
                if (
                  x.kind === "key" &&
                  x.key.namespace === "transcript" &&
                  x.key.agentId !== void 0 &&
                  folderKeyOf(x.key) === _ &&
                  x.size !== void 0 &&
                  x.mtimeMs !== void 0
                )
                  T.set(x.key.agentId, { size: x.size, mtimeMs: x.mtimeMs });
            },
            { budget: B },
          );
          if (I.status !== "done")
            (logForDebugging(
              `[persistence-sync] subagent listing for ${F} ${I.status === "error" ? `failed: ${formatStorageError(I.error)}` : "was capped"} \u2014 its subagents are skipped`,
            ),
              v());
        } catch (error) {
          (logForDebugging(
            `[persistence-sync] subagent listing for ${F} threw: ${errorMessage(error)} \u2014 its subagents are skipped`,
          ),
            v());
        }
      }),
    ),
    Promise.all(
      entries.map(async ({ agentId: agentId, path: path, key: key }) => {
        let A = asTranscriptKey(key);
        if (A === null) return statSubagentTranscript(agentId, path);
        let T = listings.get(folderKeyOf(A)),
          v = T?.get(A.agentId);
        if (v === void 0 && T !== void 0)
          logForDebugging(
            `[persistence-sync] subagent ${agentId} not in its folder's listing \u2014 skipped`,
          );
        return v === void 0 ? null : { agentId: agentId, path: path, ...v };
      }),
    )
  );
}

export {
  createPersistenceCatchUp,
  runPersistenceBackfill,
  resolveOwnerCheckIdentity,
  createBearerOwnerVouch,
  findLiveBridgeSessionHolder,
  en,
};
