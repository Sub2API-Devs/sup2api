/**
 * bridge/persistenceBackfill.ts
 *
 * 2.1.316 新增：桥接会话的磁盘补录（persistence backfill）：所有者核对、宿主注入 bearer 的归属查询、游标分页与失败降级，把本地转录补到服务端。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cg2r2hy6.js (16)
 * attribution: placement 16
 */
import { stat } from "fs/promises";
import {
  sameOwnerAccount,
  isClaudeAIOAuthTokenHostInjected,
  getStoredOauthAccountInfo,
} from "../utils/auth.js";
import { isBridgeOwnerCheckAttributionEnabled } from "./bridgeGates.js";
import { isBridgeFirstParty } from "./bridgeEnabled.js";
import { getBridgeTokenOverride, getBridgeAccessToken } from "./bridgeConfig.js";
import { isEssentialTrafficOnly } from "../utils/privacyLevel.js";
import { attributeTokenOwner, isStoreBackedFirstPartyLogin } from "./ownerPin.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { withDeadline, systemClock, sleep, fullJitterBackoffMs } from "../utils/sleep.js";
import { getSecureStorage } from "../utils/secureStorage/index.js";
import { readFreshOauthAccountFromDisk } from "../utils/config.js";
import { READ_FAILED } from "../utils/secureStorage/storageWriteLock.js";
import { sessionIdBody } from "./sessionIdCompat.js";
import { listRegisteredSessionRecords } from "../utils/udsMessaging/udsClient.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { isProcessRunning } from "../utils/genericProcessUtils.js";
import { getProcessStartTimeAsync } from "../utils/processIdentity.js";
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
} from "../utils/sessionStorage.js";
import { getSessionId } from "../bootstrap/state.js";
import {
  compactBoundaryUuids,
  isCompactBoundaryMessage,
  forwardTranscriptMessages,
} from "./workSecretRefresh.js";
import { getErrnoCode, isENOENT, errorMessage } from "../utils/errors.js";
import { SKIP_PRECOMPACT_THRESHOLD } from "../utils/sessionStoragePortable.js";
import { openTranscriptStream } from "../utils/transcript/transcriptFiles.js";
import { readLinesReverse } from "../utils/fsOperations.js";
import { jsonParse } from "../utils/slowOperations.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_2 } from "../services/projects/threadRows.js";
import { MAX_PRESERVED_MESSAGE_UUIDS } from "../cli/transports/ccrClient.js";
import { createPageBudget, readAllPages } from "../utils/pagedRead.js";
import { formatStorageError } from "../utils/storage/storageErrors.js";

//@ chunk-cg2r2hy6.js:13644-13666 placement
var OWNER_VOUCH_INITIAL_BACKOFF_MS = 5000;
var OWNER_VOUCH_MAX_BACKOFF_MS = 160000;
//@ chunk-cg2r2hy6.js:13666-14476 placement
/**
 * 桥接所有者核对：身份文件的账号与记录的 owner 不一致、且会话跑在宿主注入的 bearer 上时，向服务端查询该 bearer 的归属。返回 source=file/server/unconfirmed，并记 tengu_bridge_owner_check_attributed。
 */
async function resolveOwnerCheckIdentity({ site, fileLogin, owner, attributions, writerHonorsVouch }) {
  if (
    !writerHonorsVouch ||
    !owner.accountUuid ||
    !fileLogin?.accountUuid ||
    sameOwnerAccount(fileLogin, owner) ||
    !isBridgeOwnerCheckAttributionEnabled() ||
    !isBridgeFirstParty() ||
    getBridgeTokenOverride() !== undefined ||
    !isClaudeAIOAuthTokenHostInjected()
  )
    return {
      source: "file",
      login: fileLogin,
    };
  let bearer = getBridgeAccessToken();
  let canAskServer = bearer !== undefined && !isEssentialTrafficOnly();
  let attributedLogin = canAskServer ? attributions.get(bearer) : undefined;
  if (canAskServer && attributedLogin === undefined) {
    attributedLogin = await attributeTokenOwner(bearer);
    if (attributedLogin !== undefined) attributions.set(bearer, attributedLogin);
  }
  let outcome =
    attributedLogin === undefined
      ? canAskServer
        ? "unattributed"
        : "not_asked"
      : sameOwnerAccount(attributedLogin, owner)
        ? "owner"
        : "other_account";
  logEvent("tengu_bridge_owner_check_attributed", {
    site: fromEnum(site),
    outcome: fromEnum(outcome),
  });
  logForDebugging(
    `[bridge:owner-check] ${site}: the identity file names another account than the recorded owner, but this session runs on a host-injected bearer \u2014 server attribution: ${outcome}`,
  );
  return bearer !== undefined && attributedLogin !== undefined && outcome === "owner"
    ? {
        source: "server",
        login: attributedLogin,
        bearer,
      }
    : {
        source: "unconfirmed",
        login: undefined,
        attributed: attributedLogin,
        bearer,
        mismatchAgainst: attributedLogin?.accountUuid ?? fileLogin.accountUuid,
      };
}
//@ chunk-cg2r2hy6.js:14476-15022 placement
/**
 * 返回一个同步判断函数：当前桥接 access token 是否已被服务端确认属于 login 账号。未确认时异步查询（指数退避，超过上限即判定失败）；token 变化或归属他人后永久返回 false。
 */
function createBearerOwnerVouch({ login, bearer, attributions }) {
  let vouchedBearer = bearer;
  let pendingBearer;
  let inFlight = false;
  let nextAttemptAt = 0;
  let backoffMs = OWNER_VOUCH_INITIAL_BACKOFF_MS;
  let revoked = false;
  function checkVouch() {
    if (revoked) return false;
    let bridgeAccessToken = getBridgeAccessToken();
    if (bridgeAccessToken === undefined) return false;
    if (pendingBearer !== undefined && bridgeAccessToken !== pendingBearer) {
      revoked = true;
      return false;
    }
    if (bridgeAccessToken === vouchedBearer) return true;
    if (login === undefined || isEssentialTrafficOnly() || !isBridgeOwnerCheckAttributionEnabled()) {
      revoked = true;
      return false;
    }
    let A = attributions.get(bridgeAccessToken);
    if (A !== undefined && !sameOwnerAccount(A, login)) {
      revoked = true;
      return false;
    }
    if (A !== undefined) {
      vouchedBearer = bridgeAccessToken;
      pendingBearer = undefined;
      return true;
    }
    pendingBearer = bridgeAccessToken;
    if (!inFlight && Date.now() >= nextAttemptAt) {
      inFlight = true;
      attributeTokenOwner(bridgeAccessToken).then((T) => {
        inFlight = false;
        if (T !== undefined) {
          attributions.set(bridgeAccessToken, T);
          pendingBearer = undefined;
          backoffMs = OWNER_VOUCH_INITIAL_BACKOFF_MS;
          if (!sameOwnerAccount(T, login)) revoked = true;
        } else if (backoffMs > OWNER_VOUCH_MAX_BACKOFF_MS) revoked = true;
        else {
          nextAttemptAt = Date.now() + backoffMs;
          backoffMs *= 2;
        }
      });
    }
    return false;
  }
  return () => {
    try {
      return checkVouch();
    } catch (error) {
      revoked = true;
      logError(error);
      return false;
    }
  };
}
//@ chunk-cg2r2hy6.js:15022-15034 placement
var TOKEN_ABSENCE_VERDICT_TIMEOUT_MS = 3000;
//@ chunk-cg2r2hy6.js:15034-15122 placement
async function createTokenAbsenceClassifier(storageV5, credentials) {
  if (!(await isStoreBackedFirstPartyLogin(credentials)) || !getStoredOauthAccountInfo()?.accountUuid) return;
  return (site) => classifyBridgeTokenAbsence(site, storageV5, credentials);
}
//@ chunk-cg2r2hy6.js:15122-15351 placement
/**
 * 桥接拿不到 token 时判断原因（带超时），记录 tengu_bridge_token_absence_classified 并返回结论字符串。
 */
async function classifyBridgeTokenAbsence(site, u, p) {
  let o = await withDeadline(readTokenAbsenceVerdict(u, p), TOKEN_ABSENCE_VERDICT_TIMEOUT_MS).then(
    (y) => y ?? "unknown_timeout",
    () => "unknown_error",
  );
  logForDebugging(`[bridge:signed-out] site=${site} verdict=${o}`);
  logEvent("tengu_bridge_token_absence_classified", {
    site: fromEnum(site),
    verdict: fromEnum(o),
  });
  return o;
}
//@ chunk-cg2r2hy6.js:15351-15871 placement
/**
 * 读磁盘 OAuth 账号与安全存储，区分 refresh_token_dead / unknown_identity_* / unknown_store_unreadable / signed_out 等情况。
 */
async function readTokenAbsenceVerdict(s, u) {
  let secureStorage = getSecureStorage();
  let diskAccount = await readFreshOauthAccountFromDisk(s);
  let y = !diskAccount?.accountUuid && Boolean(getStoredOauthAccountInfo()?.accountUuid);
  if (diskAccount?.accountUuid || y) {
    if ((await secureStorage.readAsync(u))?.claudeAiOauth?.refreshToken === "") return "refresh_token_dead";
    return y ? "unknown_identity_cached_only" : "unknown_identity_present";
  }
  let asyncStrict = await secureStorage.readAsyncStrict?.(u);
  if (asyncStrict === undefined || asyncStrict === READ_FAILED) return "unknown_store_unreadable";
  if (asyncStrict?.claudeAiOauth?.refreshToken === "") return "refresh_token_dead";
  if (asyncStrict?.claudeAiOauth !== undefined) return "unknown_identity_absent_token_present";
  return "signed_out";
}
//@ chunk-cg2r2hy6.js:15871-16424 placement
/**
 * 在会话注册表里找另一个仍在运行、声明了同一桥接会话的进程（用进程启动时间核对 pid 未被复用），返回 {pid, startedAt}。
 */
async function findLiveBridgeSessionHolder(reattachTarget) {
  let sessionBody = sessionIdBody(reattachTarget);
  let records = await listRegisteredSessionRecords().catch(() => {
    return;
  });
  if (records === undefined) {
    logFeatureSad("bridge_resume_guard", "registry_read_failed");
    return;
  }
  for (let record of records) {
    if (
      record.pid === process.pid ||
      record.bridgeSessionId === undefined ||
      sessionIdBody(record.bridgeSessionId) !== sessionBody
    )
      continue;
    let y = record.procStartFt ?? record.procStart;
    if (y === undefined || !isProcessRunning(record.pid)) continue;
    let processStartTime = await getProcessStartTimeAsync(record.pid, {
      skipCache: true,
    });
    if (processStartTime === undefined) {
      logForDebugging(
        `[bridge:repl] pid ${record.pid} advertises bridge session ${reattachTarget} but its start token is unreadable \u2014 not treated as a holder`,
      );
      continue;
    }
    if (processStartTime === y)
      return {
        pid: record.pid,
        startedAt: record.startedAt,
      };
  }
  return;
}
//@ chunk-cg2r2hy6.js:16488-16521 placement
var MAX_BACKFILL_SUBAGENT_TRANSCRIPTS = 20;
var CAUGHT_UP_AFTER_RETRY_MAX_ATTEMPTS = 4;
var BACKFILL_POLL_BASE_BACKOFF_MS = 2000;
var BACKFILL_POLL_MAX_BACKOFF_MS = 300000;
//@ chunk-cg2r2hy6.js:16521-19033 placement
/**
 * [persistence-sync] 把本地主会话与子代理 transcript 中服务端缺少的条目补传：先检查历史抑制污点和会话是否切换，扫描主 transcript，再读服务端子代理事件并逐个补传；返回上传计数或 rows_owed/read_failed。
 */
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
  if (isSessionHistorySuppressed()) {
    logForDebugging("[persistence-sync] Refusing backfill: conversation carries a history-suppression taint");
    return {
      uploadedMain: 0,
      uploadedSubagents: 0,
    };
  }
  let sessionId = getSessionId();
  let materializedFile = getMaterializedSessionFile();
  let mainTranscriptPath =
    materializedFile !== null && isOwnTranscriptFile(sessionId, materializedFile)
      ? materializedFile
      : getDerivedTranscriptPathForSession(sessionId);
  let main = await serverReader.readMain(signal);
  let serverUuids = new Set(compactBoundaryUuids(main?.events));
  logForDebugging(
    `[persistence-sync] Server has ${main === null ? "an unread number of" : serverUuids.size} main events since compaction`,
  );
  let anchorVerdict = recheckBackfillPreconditions(sessionId);
  if (anchorVerdict !== undefined) return anchorVerdict;
  let mainRows = await scanTranscriptForBackfill(
    mainTranscriptPath,
    serverUuids,
    true,
    storageBackend,
    bridgeSessionId,
    onLocalRow,
    main === null && !serverKnownEmpty ? null : isCompactBoundaryMessage(main?.events ?? []),
    {
      signal,
      budget,
    },
  );
  if (mainRows === "aborted" || mainRows === "too-many-rows") return "rows_owed";
  if (mainRows === "budget-exhausted") {
    let P = isPrecautionarySuppressionHeldFor(pinSessionId(sessionId));
    holdPrecautionarySuppressionFor(pinSessionId(sessionId));
    markPrecautionClearResilientFor(pinSessionId(sessionId));
    if (!P) markScanUncertaintyHoldFor(pinSessionId(sessionId));
    logForDebugging(
      "[persistence-sync] Taint sweep budget exhausted: refusing this backfill (precautionary hold, no durable stamp)",
    );
    return "rows_owed";
  }
  if (mainRows === "tainted") {
    holdSessionHistorySuppressionFor(pinSessionId(sessionId));
    logForDebugging(
      "[persistence-sync] Main transcript tainted: aborting sync (subagents included), healing the in-memory flag",
    );
    return {
      uploadedMain: 0,
      uploadedSubagents: 0,
    };
  }
  if (main === null && !serverKnownEmpty) {
    logForDebugging("[persistence-sync] Main server read failed: nothing uploaded, subagents included");
    return "read_failed";
  }
  let N = undefined;
  if (N !== undefined) return N;
  forwardTranscriptMessages(uploadRows, mainRows, serverUuids);
  if (sessionId !== getSessionId()) {
    logForDebugging(
      "[persistence-sync] Skipping subagent backfill: session id changed during the main read (mid-sync /resume)",
    );
    return "rows_owed";
  }
  let subagentFiles = await listSubagentTranscriptsForBackfill(subagentIds, storageBackend);
  let [W, ...ke] = subagentFiles;
  let se = W ? await serverReader.readSubagent(W.agentId, signal) : null;
  for (let P of compactBoundaryUuids(se?.events)) serverUuids.add(P);
  let failedSubagents = new Set(se === null ? subagentFiles.map(({ agentId }) => agentId) : []);
  let subagentBoundaries = new Map();
  if (W && se?.events.every((event) => event.session_agent_id === W.agentId)) {
    subagentBoundaries.set(W.agentId, isCompactBoundaryMessage(se.events));
    await Promise.all(
      ke.map(async ({ agentId }) => {
        let subagent = await serverReader.readSubagent(agentId, signal);
        if (subagent === null) failedSubagents.add(agentId);
        else subagentBoundaries.set(agentId, isCompactBoundaryMessage(subagent.events));
        for (let Z of compactBoundaryUuids(subagent?.events)) serverUuids.add(Z);
      }),
    );
  }
  if (serverKnownEmpty) {
    for (let failedSubagent of failedSubagents) subagentBoundaries.set(failedSubagent, new Set());
    failedSubagents.clear();
  }
  if (sessionId !== getSessionId() || isRemoteEgressSuppressedFor(pinSessionId(sessionId))) {
    logForDebugging(
      "[persistence-sync] Skipping subagent backfill: session id changed or egress was suppressed during the subagent server reads",
    );
    return sessionId !== getSessionId() || isScanUncertaintyHoldFor(pinSessionId(sessionId))
      ? "rows_owed"
      : {
          uploadedMain: mainRows.length,
          uploadedSubagents: 0,
        };
  }
  let uploadedSubagents = 0;
  for (let { agentId, path } of subagentFiles) {
    if (failedSubagents.has(agentId)) continue;
    let Z = await scanTranscriptForBackfill(
      path,
      serverUuids,
      false,
      storageBackend,
      bridgeSessionId,
      onLocalRow,
      subagentBoundaries.get(agentId) ?? null,
      {
        signal,
      },
    );
    if (Z === "aborted" || Z === "too-many-rows") return "rows_owed";
    if (Z === "budget-exhausted") {
      let ve = isPrecautionarySuppressionHeldFor(pinSessionId(sessionId));
      holdPrecautionarySuppressionFor(pinSessionId(sessionId));
      markPrecautionClearResilientFor(pinSessionId(sessionId));
      if (!ve) markScanUncertaintyHoldFor(pinSessionId(sessionId));
      return "rows_owed";
    }
    if (Z === "tainted") {
      holdSessionHistorySuppressionFor(pinSessionId(sessionId));
      break;
    }
    forwardTranscriptMessages(uploadRows, Z, serverUuids, agentId);
    uploadedSubagents += Z.length;
  }
  logForDebugging(
    `[persistence-sync] Uploaded ${mainRows.length} main + ${uploadedSubagents} subagent entries; ${failedSubagents.size} subagent server reads failed`,
  );
  return failedSubagents.size > 0
    ? "read_failed"
    : {
        uploadedMain: mainRows.length,
        uploadedSubagents,
      };
}
//@ chunk-cg2r2hy6.js:19033-20019 placement
/**
 * 补传重试循环：attemptSync 返回 read_failed 时按指数退避加抖动重试，第 N 次仍落后时调用 onFallenBehind；返回 {outcome, runNow}，runNow 立即打断等待重试一次。
 */
function createPersistenceCatchUp({
  writer,
  attemptSync,
  onFallenBehind,
  signal,
  clock = systemClock,
  random = Math.random,
}) {
  let writtenKeys = new Set();
  let dedupWriter = (T, v, F) => {
    let I = `${F?.agentId ?? ""}/${String(v.uuid)}`;
    if (signal.aborted || writtenKeys.has(I)) return Promise.resolve();
    writtenKeys.add(I);
    return writer(T, v, F);
  };
  let sleepAbort;
  let deferred = Promise.withResolvers();
  let lastErrorCode;
  let outcomePromise = (async () => {
    for (let j = 0; ; j++) {
      if (j > 0) {
        let min = Math.min(BACKFILL_POLL_MAX_BACKOFF_MS, BACKFILL_POLL_BASE_BACKOFF_MS * 2 ** (j - 1));
        sleepAbort = new AbortController();
        await sleep(
          fullJitterBackoffMs({
            baseMs: min,
            capMs: min,
            attempt: 0,
            floorMs: min / 2,
            random,
          }),
          AbortSignal.any([signal, sleepAbort.signal]),
          {
            unref: true,
            clock,
          },
        );
      }
      if (signal.aborted) return "abandoned";
      try {
        if ((await attemptSync(dedupWriter)) !== "read_failed") {
          if (signal.aborted) return "abandoned";
          return j === 0
            ? "caught_up"
            : j < CAUGHT_UP_AFTER_RETRY_MAX_ATTEMPTS
              ? "caught_up_after_retry"
              : "caught_up_late";
        }
      } catch (error) {
        if (signal.aborted) return "abandoned";
        let F = getErrnoCode(error) ?? String(error);
        if (F === lastErrorCode) logForDebugging(`[persistence-sync] Catch-up threw again: ${F}`);
        else logError(error);
        lastErrorCode = F;
      }
      if (j + 1 === CAUGHT_UP_AFTER_RETRY_MAX_ATTEMPTS && !signal.aborted)
        await Promise.resolve().then(onFallenBehind).catch(logError);
      deferred.resolve(false);
      deferred = Promise.withResolvers();
    }
  })();
  return {
    outcome: outcomePromise,
    runNow: () => {
      sleepAbort?.abort();
      return Promise.race([deferred.promise, outcomePromise.then((T) => T !== "abandoned")]);
    },
  };
}
//@ chunk-cg2r2hy6.js:20019-20397 placement
/**
 * 列出要补传的子代理 transcript：过滤掉超过 SKIP_PRECOMPACT_THRESHOLD 的，按 mtime 取最新的若干个。
 */
async function listSubagentTranscriptsForBackfill(agentIds, storageBackend) {
  let filtered = (
    storageBackend !== undefined
      ? await statSubagentTranscriptsViaBackend(storageBackend, agentIds)
      : await Promise.all(agentIds.map((_) => statSubagentTranscript(_)))
  ).filter((_) => _ !== null);
  let filtered_2 = filtered.filter((_) => _.size <= SKIP_PRECOMPACT_THRESHOLD);
  let sliced = filtered_2.sort((_, b) => b.mtimeMs - _.mtimeMs).slice(0, MAX_BACKFILL_SUBAGENT_TRANSCRIPTS);
  let w = filtered.length - filtered_2.length;
  let B = filtered_2.length - sliced.length;
  if (w > 0 || B > 0)
    logForDebugging(
      `[persistence-sync] Subagent backfill capped: ${w} over ${SKIP_PRECOMPACT_THRESHOLD}B, ${B} beyond ${MAX_BACKFILL_SUBAGENT_TRANSCRIPTS}-agent limit (live stream unaffected)`,
    );
  return sliced;
}
//@ chunk-cg2r2hy6.js:20397-22079 placement
/**
 * 从尾部倒序扫描一个 transcript（或经存储后端读取），收集服务端没有的同步条目直到压缩边界；遇到历史抑制条目返回 tainted，预算耗尽/行数过多返回相应状态；压缩保留的消息读不全时只上传边界之后的部分。
 */
async function scanTranscriptForBackfill(
  transcriptPath,
  serverUuids,
  sweepTaint = true,
  storageBackend,
  bridgeSessionId,
  onRow,
  boundaryUuids = null,
  { signal: B, budget: _ } = {},
) {
  let b = storageBackend ? getAgentTranscriptPath_2(transcriptPath) : null;
  let scanBudget =
    _ ?? (storageBackend && b ? SuppressionScanBudget.forBackendRead() : new SuppressionScanBudget());
  let rows = [];
  let seenUuids = new Set();
  let pastBoundary = false;
  let tooManyRows = false;
  let boundaryIndex = 0;
  let neededUuids = new Set();
  let startMs = Date.now();
  let fileBytes;
  let lineCount = 0;
  let charsRead = 0;
  let outcome = "clean";
  let he;
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
      he ??= P;
      lineCount++;
      charsRead += P.length + 1;
      if (matchesHistorySuppressionLine(P)) {
        logForDebugging("[persistence-sync] Refusing backfill: history-suppression entry in transcript");
        outcome = "found";
        return "tainted";
      }
      if (pastBoundary || tooManyRows) {
        if (sweepTaint && scanBudget.spend(P)) {
          logForDebugging(
            "[persistence-sync] Refusing backfill: pre-boundary taint sweep exhausted its budget without a verdict",
          );
          outcome = "budget-exhausted";
          return outcome;
        }
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
      onRow?.(L);
      if (!serverUuids.has(L.uuid)) rows.push(L);
      if (!pastBoundary && isCompactBoundaryMessage_2(L)) {
        pastBoundary = true;
        boundaryIndex = rows.length;
        let uuids = L.compactMetadata?.preservedMessages?.uuids;
        let filtered = (Array.isArray(uuids) ? uuids : [])
          .slice(-MAX_PRESERVED_MESSAGE_UUIDS)
          .filter((De) => !seenUuids.has(De));
        if (boundaryUuids !== null && !serverUuids.has(L.uuid) && filtered.some((De) => !serverUuids.has(De)))
          neededUuids = new Set([...filtered, ...boundaryUuids]);
      }
      if (pastBoundary && !sweepTaint && neededUuids.size === 0) break;
    }
    if (tooManyRows) {
      logForDebugging(
        `[persistence-sync] Refusing backfill: ${SUPPRESSION_SCAN_MAX_LINES} lines or more since the last compaction boundary`,
      );
      outcome = "too-many-rows";
      return outcome;
    }
  } catch (error) {
    outcome = suppressionScanFailure(error);
    if (isENOENT(error)) return [];
    throw error;
  } finally {
    if (sweepTaint)
      logSuppressionScan({
        leg: "backfill-read",
        throughBackend: Boolean(storageBackend && b),
        outcome,
        lines: lineCount,
        charsRead,
        fileBytes,
        startMs,
      });
  }
  if (neededUuids.size > 0) {
    logForDebugging(
      `[persistence-sync] Not uploading the messages the last compaction kept: ${neededUuids.size} rows needed first (kept messages, or compaction boundaries the server returned) could not be read from the local transcript. The rest of the backfill goes on; a session resumed from the server may lack the kept messages.`,
    );
    rows.splice(boundaryIndex);
  }
  return rows.reverse();
}
//@ chunk-cg2r2hy6.js:22079-22498 placement
/**
 * await 之后重新确认：会话 id 未变、远端出口未被抑制；否则返回 rows_owed 或空上传结果。
 */
function recheckBackfillPreconditions(sessionId) {
  if (sessionId !== getSessionId()) {
    logForDebugging(
      "[persistence-sync] Refusing backfill: session id changed since the scan anchor was pinned (mid-scan /resume) \u2014 pinned content is not the current conversation",
    );
    return "rows_owed";
  }
  if (isRemoteEgressSuppressedFor(pinSessionId(sessionId))) {
    logForDebugging(
      "[persistence-sync] Refusing backfill: foreign binding or suppression carrier present at the post-await re-consult",
    );
    return isScanUncertaintyHoldFor(pinSessionId(sessionId))
      ? "rows_owed"
      : {
          uploadedMain: 0,
          uploadedSubagents: 0,
        };
  }
  return;
}
//@ chunk-cg2r2hy6.js:22498-22623 placement
/**
 * stat 一个子代理 transcript，返回 {agentId, path, size, mtimeMs}，失败返回 null。
 */
async function statSubagentTranscript(s, path = getAgentTranscriptPath(s)) {
  try {
    let p = await stat(path);
    return {
      agentId: s,
      path,
      size: p.size,
      mtimeMs: p.mtimeMs,
    };
  } catch {
    return null;
  }
}
//@ chunk-cg2r2hy6.js:22623-24194 placement
/**
 * 通过存储后端分页列出各会话目录下的子代理 transcript 大小与 mtime（列举失败的目录跳过），本地路径映射不到后端键的退回 fs.stat。
 */
async function statSubagentTranscriptsViaBackend(storageBackend, agentIds) {
  let entries = agentIds.map((agentId) => {
    let agentId_2 = getAgentTranscriptPath(agentId);
    return {
      agentId,
      path: agentId_2,
      key: getAgentTranscriptPath_2(agentId_2),
    };
  });
  let asTranscriptKey = (key) =>
    key !== null && key.namespace === "transcript" && key.agentId !== undefined ? key : null;
  let folderKeyOf = (_) => [_.projectKey, _.sessionId, ...(_.agentRelPath ?? [])].join("/");
  let folders = new Map();
  for (let { key } of entries) {
    let b = asTranscriptKey(key);
    if (b !== null)
      folders.set(folderKeyOf(b), {
        projectKey: b.projectKey,
        sessionId: b.sessionId,
        ...(b.agentRelPath !== undefined && {
          agentRelPath: b.agentRelPath,
        }),
      });
  }
  let listings = new Map();
  let budget = createPageBudget();
  await Promise.all(
    [...folders].map(async ([_, { projectKey: b, sessionId: E, agentRelPath: A }]) => {
      let T = new Map();
      listings.set(_, T);
      let v = () => listings.delete(_);
      let F = A === undefined ? `session ${E}` : `session ${E} subtree ${A.join("/")}`;
      try {
        let allPages = await readAllPages(
          (N) =>
            storageBackend.listEntries(
              {
                namespace: "transcript",
                projectKey: b,
                sessionId: E,
                ...(A !== undefined && {
                  agentRelPath: A,
                }),
              },
              {
                skipScopeStats: true,
                ...(N !== undefined && {
                  cursor: N,
                }),
              },
            ),
          (N) => {
            for (let x of N)
              if (
                x.kind === "key" &&
                x.key.namespace === "transcript" &&
                x.key.agentId !== undefined &&
                folderKeyOf(x.key) === _ &&
                x.size !== undefined &&
                x.mtimeMs !== undefined
              )
                T.set(x.key.agentId, {
                  size: x.size,
                  mtimeMs: x.mtimeMs,
                });
          },
          {
            budget,
          },
        );
        if (allPages.status !== "done") {
          logForDebugging(
            `[persistence-sync] subagent listing for ${F} ${allPages.status === "error" ? `failed: ${formatStorageError(allPages.error)}` : "was capped"} \u2014 its subagents are skipped`,
          );
          v();
        }
      } catch (error) {
        logForDebugging(
          `[persistence-sync] subagent listing for ${F} threw: ${errorMessage(error)} \u2014 its subagents are skipped`,
        );
        v();
      }
    }),
  );
  return Promise.all(
    entries.map(async ({ agentId, path, key }) => {
      let A = asTranscriptKey(key);
      if (A === null) return statSubagentTranscript(agentId, path);
      let T = listings.get(folderKeyOf(A));
      let v = T?.get(A.agentId);
      if (v === undefined && T !== undefined)
        logForDebugging(`[persistence-sync] subagent ${agentId} not in its folder's listing \u2014 skipped`);
      return v === undefined
        ? null
        : {
            agentId,
            path,
            ...v,
          };
    }),
  );
}
export {
  createPersistenceCatchUp,
  runPersistenceBackfill,
  resolveOwnerCheckIdentity,
  createBearerOwnerVouch,
  findLiveBridgeSessionHolder,
  createTokenAbsenceClassifier,
};
