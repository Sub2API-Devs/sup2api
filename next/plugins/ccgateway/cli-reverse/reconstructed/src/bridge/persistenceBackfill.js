/**
 * bridge/persistenceBackfill.ts
 *
 * 2.1.316 新增：桥接会话的磁盘补录（persistence backfill）：所有者核对、宿主注入 bearer 的归属查询、游标分页与失败降级，把本地转录补到服务端。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-66b9fbd5.js (16)
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

//@ chunk-66b9fbd5.js:14858-14880 placement
var OWNER_VOUCH_INITIAL_BACKOFF_MS = 5000;
var OWNER_VOUCH_MAX_BACKOFF_MS = 160000;
//@ chunk-66b9fbd5.js:14880-15690 placement
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
//@ chunk-66b9fbd5.js:15690-16236 placement
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
    let attribution = attributions.get(bridgeAccessToken);
    if (attribution !== undefined && !sameOwnerAccount(attribution, login)) {
      revoked = true;
      return false;
    }
    if (attribution !== undefined) {
      vouchedBearer = bridgeAccessToken;
      pendingBearer = undefined;
      return true;
    }
    pendingBearer = bridgeAccessToken;
    if (!inFlight && Date.now() >= nextAttemptAt) {
      inFlight = true;
      attributeTokenOwner(bridgeAccessToken).then((attribution) => {
        inFlight = false;
        if (attribution !== undefined) {
          attributions.set(bridgeAccessToken, attribution);
          pendingBearer = undefined;
          backoffMs = OWNER_VOUCH_INITIAL_BACKOFF_MS;
          if (!sameOwnerAccount(attribution, login)) revoked = true;
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
//@ chunk-66b9fbd5.js:16236-16248 placement
var TOKEN_ABSENCE_VERDICT_TIMEOUT_MS = 3000;
//@ chunk-66b9fbd5.js:16248-16336 placement
async function createTokenAbsenceClassifier(credentials, credentials_2) {
  if (!(await isStoreBackedFirstPartyLogin(credentials_2)) || !getStoredOauthAccountInfo()?.accountUuid)
    return;
  return (site) => classifyBridgeTokenAbsence(site, credentials, credentials_2);
}
//@ chunk-66b9fbd5.js:16336-16565 placement
/**
 * 桥接拿不到 token 时判断原因（带超时），记录 tengu_bridge_token_absence_classified 并返回结论字符串。
 */
async function classifyBridgeTokenAbsence(site, credentials, storageV5) {
  let verdict = await withDeadline(
    readTokenAbsenceVerdict(credentials, storageV5),
    TOKEN_ABSENCE_VERDICT_TIMEOUT_MS,
  ).then(
    (result) => result ?? "unknown_timeout",
    () => "unknown_error",
  );
  logForDebugging(`[bridge:signed-out] site=${site} verdict=${verdict}`);
  logEvent("tengu_bridge_token_absence_classified", {
    site: fromEnum(site),
    verdict: fromEnum(verdict),
  });
  return verdict;
}
//@ chunk-66b9fbd5.js:16565-17085 placement
/**
 * 读磁盘 OAuth 账号与安全存储，区分 refresh_token_dead / unknown_identity_* / unknown_store_unreadable / signed_out 等情况。
 */
async function readTokenAbsenceVerdict(storageV5, credentials) {
  let secureStorage = getSecureStorage();
  let diskAccount = await readFreshOauthAccountFromDisk(storageV5);
  let cachedOnly = !diskAccount?.accountUuid && Boolean(getStoredOauthAccountInfo()?.accountUuid);
  if (diskAccount?.accountUuid || cachedOnly) {
    if ((await secureStorage.readAsync(credentials))?.claudeAiOauth?.refreshToken === "")
      return "refresh_token_dead";
    return cachedOnly ? "unknown_identity_cached_only" : "unknown_identity_present";
  }
  let asyncStrict = await secureStorage.readAsyncStrict?.(credentials);
  if (asyncStrict === undefined || asyncStrict === READ_FAILED) return "unknown_store_unreadable";
  if (asyncStrict?.claudeAiOauth?.refreshToken === "") return "refresh_token_dead";
  if (asyncStrict?.claudeAiOauth !== undefined) return "unknown_identity_absent_token_present";
  return "signed_out";
}
//@ chunk-66b9fbd5.js:17085-17638 placement
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
    let procStart = record.procStartFt ?? record.procStart;
    if (procStart === undefined || !isProcessRunning(record.pid)) continue;
    let processStartTime = await getProcessStartTimeAsync(record.pid, {
      skipCache: true,
    });
    if (processStartTime === undefined) {
      logForDebugging(
        `[bridge:repl] pid ${record.pid} advertises bridge session ${reattachTarget} but its start token is unreadable \u2014 not treated as a holder`,
      );
      continue;
    }
    if (processStartTime === procStart)
      return {
        pid: record.pid,
        startedAt: record.startedAt,
      };
  }
  return;
}
//@ chunk-66b9fbd5.js:17702-17735 placement
var MAX_BACKFILL_SUBAGENT_TRANSCRIPTS = 20;
var CAUGHT_UP_AFTER_RETRY_MAX_ATTEMPTS = 4;
var BACKFILL_POLL_BASE_BACKOFF_MS = 2000;
var BACKFILL_POLL_MAX_BACKOFF_MS = 300000;
//@ chunk-66b9fbd5.js:17735-20244 placement
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
    let alreadyHeld = isPrecautionarySuppressionHeldFor(pinSessionId(sessionId));
    holdPrecautionarySuppressionFor(pinSessionId(sessionId));
    markPrecautionClearResilientFor(pinSessionId(sessionId));
    if (!alreadyHeld) markScanUncertaintyHoldFor(pinSessionId(sessionId));
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
  let unreachable = undefined;
  if (unreachable !== undefined) return unreachable;
  forwardTranscriptMessages(uploadRows, mainRows, serverUuids);
  if (sessionId !== getSessionId()) {
    logForDebugging(
      "[persistence-sync] Skipping subagent backfill: session id changed during the main read (mid-sync /resume)",
    );
    return "rows_owed";
  }
  let subagentFiles = await listSubagentTranscriptsForBackfill(subagentIds, storageBackend);
  let [firstSubagent, ...otherSubagents] = subagentFiles;
  let firstServerRead = firstSubagent ? await serverReader.readSubagent(firstSubagent.agentId, signal) : null;
  for (let uuid of compactBoundaryUuids(firstServerRead?.events)) serverUuids.add(uuid);
  let failedSubagents = new Set(firstServerRead === null ? subagentFiles.map(({ agentId }) => agentId) : []);
  let subagentBoundaries = new Map();
  if (
    firstSubagent &&
    firstServerRead?.events.every((event) => event.session_agent_id === firstSubagent.agentId)
  ) {
    subagentBoundaries.set(firstSubagent.agentId, isCompactBoundaryMessage(firstServerRead.events));
    await Promise.all(
      otherSubagents.map(async ({ agentId }) => {
        let subagent = await serverReader.readSubagent(agentId, signal);
        if (subagent === null) failedSubagents.add(agentId);
        else subagentBoundaries.set(agentId, isCompactBoundaryMessage(subagent.events));
        for (let uuid of compactBoundaryUuids(subagent?.events)) serverUuids.add(uuid);
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
    let subagentRows = await scanTranscriptForBackfill(
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
    if (subagentRows === "aborted" || subagentRows === "too-many-rows") return "rows_owed";
    if (subagentRows === "budget-exhausted") {
      let alreadyHeld = isPrecautionarySuppressionHeldFor(pinSessionId(sessionId));
      holdPrecautionarySuppressionFor(pinSessionId(sessionId));
      markPrecautionClearResilientFor(pinSessionId(sessionId));
      if (!alreadyHeld) markScanUncertaintyHoldFor(pinSessionId(sessionId));
      return "rows_owed";
    }
    if (subagentRows === "tainted") {
      holdSessionHistorySuppressionFor(pinSessionId(sessionId));
      break;
    }
    forwardTranscriptMessages(uploadRows, subagentRows, serverUuids, agentId);
    uploadedSubagents += subagentRows.length;
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
//@ chunk-66b9fbd5.js:20244-21230 placement
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
  let dedupWriter = (session, message, options) => {
    let key = `${options?.agentId ?? ""}/${String(message.uuid)}`;
    if (signal.aborted || writtenKeys.has(key)) return Promise.resolve();
    writtenKeys.add(key);
    return writer(session, message, options);
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
        let errorCode = getErrnoCode(error) ?? String(error);
        if (errorCode === lastErrorCode)
          logForDebugging(`[persistence-sync] Catch-up threw again: ${errorCode}`);
        else logError(error);
        lastErrorCode = errorCode;
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
      return Promise.race([deferred.promise, outcomePromise.then((outcome) => outcome !== "abandoned")]);
    },
  };
}
//@ chunk-66b9fbd5.js:21230-21608 placement
/**
 * 列出要补传的子代理 transcript：过滤掉超过 SKIP_PRECOMPACT_THRESHOLD 的，按 mtime 取最新的若干个。
 */
async function listSubagentTranscriptsForBackfill(agentIds, storageBackend) {
  let filtered = (
    storageBackend !== undefined
      ? await statSubagentTranscriptsViaBackend(storageBackend, agentIds)
      : await Promise.all(agentIds.map((agentId) => statSubagentTranscript(agentId)))
  ).filter((entry) => entry !== null);
  let filtered_2 = filtered.filter((entry) => entry.size <= SKIP_PRECOMPACT_THRESHOLD);
  let sliced = filtered_2
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, MAX_BACKFILL_SUBAGENT_TRANSCRIPTS);
  let overSize = filtered.length - filtered_2.length;
  let overCount = filtered_2.length - sliced.length;
  if (overSize > 0 || overCount > 0)
    logForDebugging(
      `[persistence-sync] Subagent backfill capped: ${overSize} over ${SKIP_PRECOMPACT_THRESHOLD}B, ${overCount} beyond ${MAX_BACKFILL_SUBAGENT_TRANSCRIPTS}-agent limit (live stream unaffected)`,
    );
  return sliced;
}
//@ chunk-66b9fbd5.js:21608-23290 placement
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
  { signal, budget } = {},
) {
  let backendKey = storageBackend ? getAgentTranscriptPath_2(transcriptPath) : null;
  let scanBudget =
    budget ??
    (storageBackend && backendKey ? SuppressionScanBudget.forBackendRead() : new SuppressionScanBudget());
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
  let firstLine;
  try {
    let lines =
      storageBackend && backendKey
        ? openTranscriptStream(storageBackend, backendKey)
        : readLinesReverse(transcriptPath, SUPPRESSION_SCAN_CHUNK_BYTES, {
            onOpen: (handle) => {
              fileBytes = handle;
            },
          });
    for await (let line of lines) {
      firstLine ??= line;
      lineCount++;
      charsRead += line.length + 1;
      if (matchesHistorySuppressionLine(line)) {
        logForDebugging("[persistence-sync] Refusing backfill: history-suppression entry in transcript");
        outcome = "found";
        return "tainted";
      }
      if (pastBoundary || tooManyRows) {
        if (sweepTaint && scanBudget.spend(line)) {
          logForDebugging(
            "[persistence-sync] Refusing backfill: pre-boundary taint sweep exhausted its budget without a verdict",
          );
          outcome = "budget-exhausted";
          return outcome;
        }
        if (tooManyRows || neededUuids.size === 0) continue;
      }
      let parsed;
      try {
        parsed = jsonParse(line);
      } catch {
        continue;
      }
      if (!isSyncedTranscriptEntry(parsed)) continue;
      if (isRowForeignToBridgeSession(parsed, bridgeSessionId)) continue;
      if (!pastBoundary) seenUuids.add(parsed.uuid);
      else if (!neededUuids.delete(parsed.uuid)) continue;
      onRow?.(parsed);
      if (!serverUuids.has(parsed.uuid)) rows.push(parsed);
      if (!pastBoundary && isCompactBoundaryMessage_2(parsed)) {
        pastBoundary = true;
        boundaryIndex = rows.length;
        let uuids = parsed.compactMetadata?.preservedMessages?.uuids;
        let filtered = (Array.isArray(uuids) ? uuids : [])
          .slice(-MAX_PRESERVED_MESSAGE_UUIDS)
          .filter((uuid) => !seenUuids.has(uuid));
        if (
          boundaryUuids !== null &&
          !serverUuids.has(parsed.uuid) &&
          filtered.some((uuid) => !serverUuids.has(uuid))
        )
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
        throughBackend: Boolean(storageBackend && backendKey),
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
//@ chunk-66b9fbd5.js:23290-23709 placement
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
//@ chunk-66b9fbd5.js:23709-23834 placement
/**
 * stat 一个子代理 transcript，返回 {agentId, path, size, mtimeMs}，失败返回 null。
 */
async function statSubagentTranscript(agentId, path = getAgentTranscriptPath(agentId)) {
  try {
    let fileStat = await stat(path);
    return {
      agentId,
      path,
      size: fileStat.size,
      mtimeMs: fileStat.mtimeMs,
    };
  } catch {
    return null;
  }
}
//@ chunk-66b9fbd5.js:23834-25405 placement
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
  let folderKeyOf = (key) => [key.projectKey, key.sessionId, ...(key.agentRelPath ?? [])].join("/");
  let folders = new Map();
  for (let { key } of entries) {
    let transcriptKey = asTranscriptKey(key);
    if (transcriptKey !== null)
      folders.set(folderKeyOf(transcriptKey), {
        projectKey: transcriptKey.projectKey,
        sessionId: transcriptKey.sessionId,
        ...(transcriptKey.agentRelPath !== undefined && {
          agentRelPath: transcriptKey.agentRelPath,
        }),
      });
  }
  let listings = new Map();
  let budget = createPageBudget();
  await Promise.all(
    [...folders].map(async ([folderKey, { projectKey, sessionId, agentRelPath }]) => {
      let listing = new Map();
      listings.set(folderKey, listing);
      let dropListing = () => listings.delete(folderKey);
      let folderLabel =
        agentRelPath === undefined
          ? `session ${sessionId}`
          : `session ${sessionId} subtree ${agentRelPath.join("/")}`;
      try {
        let allPages = await readAllPages(
          (cursor) =>
            storageBackend.listEntries(
              {
                namespace: "transcript",
                projectKey,
                sessionId,
                ...(agentRelPath !== undefined && {
                  agentRelPath,
                }),
              },
              {
                skipScopeStats: true,
                ...(cursor !== undefined && {
                  cursor,
                }),
              },
            ),
          (items) => {
            for (let item of items)
              if (
                item.kind === "key" &&
                item.key.namespace === "transcript" &&
                item.key.agentId !== undefined &&
                folderKeyOf(item.key) === folderKey &&
                item.size !== undefined &&
                item.mtimeMs !== undefined
              )
                listing.set(item.key.agentId, {
                  size: item.size,
                  mtimeMs: item.mtimeMs,
                });
          },
          {
            budget,
          },
        );
        if (allPages.status !== "done") {
          logForDebugging(
            `[persistence-sync] subagent listing for ${folderLabel} ${allPages.status === "error" ? `failed: ${formatStorageError(allPages.error)}` : "was capped"} \u2014 its subagents are skipped`,
          );
          dropListing();
        }
      } catch (error) {
        logForDebugging(
          `[persistence-sync] subagent listing for ${folderLabel} threw: ${errorMessage(error)} \u2014 its subagents are skipped`,
        );
        dropListing();
      }
    }),
  );
  return Promise.all(
    entries.map(async ({ agentId, path, key }) => {
      let transcriptKey = asTranscriptKey(key);
      if (transcriptKey === null) return statSubagentTranscript(agentId, path);
      let listing = listings.get(folderKeyOf(transcriptKey));
      let entry = listing?.get(transcriptKey.agentId);
      if (entry === undefined && listing !== undefined)
        logForDebugging(`[persistence-sync] subagent ${agentId} not in its folder's listing \u2014 skipped`);
      return entry === undefined
        ? null
        : {
            agentId,
            path,
            ...entry,
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
