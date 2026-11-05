/**
 * utils/teleport/localSessionMove.ts
 *
 * 本地会话搬到云端前的检查与转录读取、导出与附件类型清单（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mzw6m19v.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import {
  sameOwnerAccount,
  isClaudeAISubscriber,
  readFreshOAuthCredentialSnapshot,
  getClaudeAIOAuthTokenOriginAsync,
} from "../auth.js";
import {
  WITHHELD_SUMMARY_NOTICE,
  WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER,
  WITHHELD_TOOL_RESULT_TEXT,
  WITHHELD_MESSAGE_TEXT,
  WITHHELD_COMMAND_OUTPUT_TEXT,
  createRemoteBridgeRedactor,
} from "../../bridge/remoteBridgeSettle.js";
import { LOCAL_COMMAND_STDOUT } from "../../constants/xml.js";
import { messagesSinceCompactBoundary } from "../../services/projects/threadRows.js";
import { isSystemLocalCommandMessage } from "../../bootstrap/sessionSlices.js";
import { createUserMessage, normalizeAttachmentOrEmpty, getUserMessageText } from "../messages.js";
import {
  isRowForeignToBridgeSession,
  isTranscriptPersistenceDisabled,
  flushSessionStorage,
  pinSessionId,
  getTranscriptStorageKey,
  SUPPRESSION_SCAN_CHUNK_BYTES,
  SuppressionScanBudget,
  matchesHistorySuppressionLine,
  wrapStorageSource,
  getTranscriptStorageContext,
  scanAppendedForSuppression,
  getCurrentSessionIsolationLatch,
  isRemoteEgressSuppressedFor,
  isSessionHistorySuppressed,
  isSessionHistorySuppressedFor,
} from "../sessionStorage.js";
import { countWhere } from "../collections.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isPlainObject } from "../isPlainObject.js";
import { TRANSCRIPT_TAIL_INLINE } from "../../services/compact/reactiveCompact.js";
import { normalizeFullWidthSpace } from "../stringUtils.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { isBridgeFirstParty } from "../../bridge/bridgeEnabled.js";
import { isEssentialTrafficOnly } from "../privacyLevel.js";
import { isRemoteControlHardDisabled } from "../../bridge/bridgeEntitlement.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
  initializeGrowthBook,
} from "../../services/analytics/growthbook.js";
import { waitForPolicyLimitsToLoad } from "../../services/policyLimits/PolicyLimitsClient.js";
import { policyDenyKind, isPolicyVerdictAbsent } from "../../services/policyLimits/policyEvidence.js";
import { ensurePolicyLimitsLoadedForDiagnostic } from "../../bridge/bridgeGates.js";
import { agentId, normalizeUuidOrNull } from "../agentId.js";
import { getSessionId, getMainThreadAgentType } from "../../bootstrap/state.js";
import { prepareApiRequest, CloudSessionAccessError } from "./api.js";
import { getLastSessionLog } from "../conversationRecovery.js";
import { isWebSearchIsolationOn } from "../../services/tools/webToolIsolation.js";
import { dropRetractedMessages_2 as dropRetractedMessages } from "../transcript/deserialize.js";
import { strayDropMode } from "../../bridge/remoteBridgeCloseCodes.js";
import { createMemoryServerVerifier } from "../../services/mcp/memoryServerVerification.js";
import { hasRecordedTextForHost } from "../transcriptWithholding.js";
import { tagAndManifestArtifactContent } from "../messages/untrustedArtifactContent.js";
import { openTranscriptStream } from "../transcript/transcriptFiles.js";
import { readLinesReverse } from "../fsOperations.js";
import { containsProviderId, hasProviderIdInMessage } from "../../services/api/providerIds.js";
import { jsonParse } from "../slowOperations.js";
import { isUuidShaped, findSoleTranscriptWithMessagesById } from "../sessionStoragePortable.js";
import { env } from "../env.js";

//@ chunk-mzw6m19v.js:1294-1432 placement
function ownerMatchKind(owner, localAccount) {
  if (!owner?.accountUuid) return "owner_unknown";
  if (!localAccount?.accountUuid) return "identity_unreadable";
  return sameOwnerAccount(localAccount, owner) ? "match" : "mismatch";
}
//@ chunk-mzw6m19v.js:1432-2677 placement
/**
 * 导出 attachment 时需要保留/重写的类型清单（移动文件、紧凑文件引用、@ 引用、PDF、MCP 资源、IDE 选中行等）。
 */
var CSE_MOVE = "cse_move";
var LEFT_BEHIND_ATTACHMENT_TYPES = new Set([
  "file",
  "directory",
  "compact_file_reference",
  "at_mention_reference",
  "pdf_reference",
  "mcp_resource",
  "agent_mention",
  "selected_lines_in_ide",
  "selected_lines_in_diff",
  "opened_file_in_ide",
  "edited_text_file",
  "edited_image_file",
  "queued_command",
  "hook_additional_context",
  "hook_success",
  "async_hook_response",
  "nested_memory",
  "plan_file_reference",
  "inlined_image_paths",
]);
var WITHHELD_TEXT_REPLACEMENTS = new Map([
  [
    WITHHELD_SUMMARY_NOTICE,
    "This session is being continued from a previous conversation that ran out of context. The summary of that conversation is not included here: it may include account memory, so it stayed on the computer where the conversation ran. If you need details from the earlier conversation, ask the user.",
  ],
  [
    WITHHELD_ACCOUNT_MEMORY_PLACEHOLDER,
    "[account memory left out of this copy of the conversation; it stayed on the computer where the conversation ran]",
  ],
  [
    WITHHELD_TOOL_RESULT_TEXT,
    "[tool result left out of this copy of the conversation; it stayed on the computer where the conversation ran]",
  ],
  [
    WITHHELD_MESSAGE_TEXT,
    "[message content left out of this copy of the conversation; it stayed on the computer where the conversation ran]",
  ],
  [
    `<${LOCAL_COMMAND_STDOUT}>${WITHHELD_COMMAND_OUTPUT_TEXT}</${LOCAL_COMMAND_STDOUT}>`,
    `<${LOCAL_COMMAND_STDOUT}>[command output left out of this copy of the conversation: it may repeat the conversation summary, which can include account memory]</${LOCAL_COMMAND_STDOUT}>`,
  ],
]);
//@ chunk-mzw6m19v.js:2677-3694 placement
/**
 * 把转录消息导出成纯文本：逐条渲染 content 块，附件渲染不了就记一条 left behind。
 */
function buildConversationCopy(messages, redactor) {
  let sinceBoundary = messagesSinceCompactBoundary([...messages]);
  let carriedRows = sinceBoundary.filter(
    (row) => row.type === "user" || row.type === "assistant" || isSystemLocalCommandMessage(row),
  );
  let convertedRows = carriedRows.map((nextRow) =>
    isSystemLocalCommandMessage(nextRow)
      ? createUserMessage({
          content: nextRow.content,
          uuid: nextRow.uuid,
          timestamp: nextRow.timestamp,
          isMeta: true,
        })
      : nextRow,
  );
  let foreignUuids = new Set(
    carriedRows.flatMap((candidateRow, rowIndex) =>
      isRowForeignToBridgeSession(
        {
          uuid: candidateRow.uuid,
          foreignToBridgeSession:
            "foreignToBridgeSession" in candidateRow &&
            typeof candidateRow.foreignToBridgeSession === "string"
              ? candidateRow.foreignToBridgeSession
              : undefined,
        },
        CSE_MOVE,
      )
        ? [convertedRows[rowIndex].uuid]
        : [],
    ),
  );
  redactor.note(messages);
  let redactedRows = redactor.redact(convertedRows, "transcript");
  return {
    messages: redactedRows
      .filter((redactedRow) => !foreignUuids.has(redactedRow.uuid))
      .map((copiedRow) => replaceWithheldText(substituteWithheldSummaryText(copiedRow))),
    attachmentRowsLeftBehind: countWhere(sinceBoundary, (attachmentRow) => {
      if (
        attachmentRow.type !== "attachment" ||
        !LEFT_BEHIND_ATTACHMENT_TYPES.has(String(attachmentRow.attachment?.type))
      )
        return false;
      try {
        return normalizeAttachmentOrEmpty(attachmentRow.attachment).length > 0;
      } catch (error) {
        logForDebugging(
          `[conversation-export] could not render a ${String(attachmentRow.attachment?.type)} attachment, so it counts as left behind: ${errorMessage(error)}`,
        );
        return true;
      }
    }),
    subagentsSkipped: new Set(
      convertedRows.flatMap((mappedRow) =>
        mappedRow.type === "user" &&
        isPlainObject(mappedRow.toolUseResult) &&
        typeof mappedRow.toolUseResult.agentId === "string"
          ? [mappedRow.toolUseResult.agentId]
          : [],
      ),
    ).size,
    summaryWithheld: redactedRows.some(
      (finalRow) =>
        finalRow.type === "user" &&
        finalRow.isCompactSummary === true &&
        WITHHELD_TEXT_REPLACEMENTS.has(getUserMessageText(finalRow) ?? ""),
    ),
  };
}
//@ chunk-mzw6m19v.js:3694-3887 placement
function substituteWithheldSummaryText(message) {
  if (message.type !== "user" || message.isCompactSummary !== true) return message;
  let { content } = message.message;
  let { modelOnlyText, ...rest } = message;
  return typeof content === "string"
    ? {
        ...rest,
        message: {
          ...message.message,
          content: TRANSCRIPT_TAIL_INLINE(content, modelOnlyText),
        },
      }
    : message;
}
//@ chunk-mzw6m19v.js:3887-4032 placement
function replaceWithheldText(value) {
  if (typeof value === "string")
    return normalizeFullWidthSpace(WITHHELD_TEXT_REPLACEMENTS.get(value) ?? value);
  if (Array.isArray(value)) return value.map(replaceWithheldText);
  if (isPlainObject(value))
    return import_mapValues(
      identityMap(value, (key, nestedValue) => normalizeFullWidthSpace(nestedValue)),
      replaceWithheldText,
    );
  return value;
}
//@ chunk-mzw6m19v.js:4032-4090 placement
var TENGU_WOOLLY_BLANKET = "tengu_woolly_blanket";
var MAX_FORKED_TRANSCRIPTS = 3;
var COMPLIANCE_TAINT_KINDS = ["zdr", "ldr", "hipaa"];
//@ chunk-mzw6m19v.js:4090-4144 placement
function isConversationMovePossibleHere() {
  return (
    isBridgeFirstParty() &&
    !isEssentialTrafficOnly() &&
    !isRemoteControlHardDisabled() &&
    !COMPLIANCE_TAINT_KINDS.some(hasComplianceTaint)
  );
}
//@ chunk-mzw6m19v.js:4144-4209 placement
function isConversationMoveServed() {
  let featureValue = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_WOOLLY_BLANKET, false);
  return featureValue.value === true && isServedFeatureSource(featureValue.source);
}
//@ chunk-mzw6m19v.js:4209-4364 placement
async function isConversationMoveAllowed() {
  await initializeGrowthBook().catch(() => null);
  if (!isConversationMoveServed() || !isConversationMovePossibleHere()) return false;
  await waitForPolicyLimitsToLoad();
  if (policyDenyKind("allow_remote_sessions") === "cache_miss") await ensurePolicyLimitsLoadedForDiagnostic();
  return !isConversationMoveBlockedByPolicy();
}
//@ chunk-mzw6m19v.js:4364-6974 placement
/**
 * 本地会话迁往云之前的检查：登录、账号与组织是否匹配、轮次是否在跑、转录是否保存，返回 refusal 码。
 */
async function checkConversationMove(context, deps) {
  if (!agentId(context.localSessionId)) return refuse("check_incomplete");
  let sessionId = getSessionId();
  let ownAccount = {
    accountUuid: context.account.accountUuid.toLowerCase(),
    organizationUuid: context.account.organizationUuid.toLowerCase(),
  };
  if (deps.turnBlocked()) return refuse("turn_running");
  if (!(await isConversationMoveAllowed())) return refuse("policy");
  if (!isClaudeAISubscriber()) return refuse("not_signed_in");
  let apiRequest = await prepareApiRequest(deps.credentials).catch((error) => {
    if (error instanceof CloudSessionAccessError) return;
    throw error;
  });
  if (apiRequest === undefined || apiRequest.profile) return refuse("not_signed_in");
  let credentialOwner = await readCredentialOwner(deps);
  if (credentialOwner === "no_login") return refuse("not_signed_in");
  let ownerMatch = ownerMatchKind(ownAccount, credentialOwner === "unreadable" ? undefined : credentialOwner);
  if (ownerMatch !== "match")
    return refuse(ownerMatch === "mismatch" ? "account_mismatch" : "check_incomplete");
  if (apiRequest.orgUUID.toLowerCase() !== ownAccount.organizationUuid) return refuse("account_mismatch");
  if (isTranscriptPersistenceDisabled()) return refuse("transcript_not_saved");
  await flushSessionStorage();
  let lastSessionLog = await getLastSessionLog(context.localSessionId, undefined, deps.storageV5);
  if (lastSessionLog === null || lastSessionLog.fullPath === undefined) return refuse("nothing_to_move");
  if (deps.turnBlocked()) return refuse("turn_running");
  let pinnedSessionId = pinSessionId(context.localSessionId);
  if (lastSessionLog.sessionHistorySuppressed === true) return refuse("conversation_marked");
  let withholdReason = withholdReasonFor(pinnedSessionId, lastSessionLog);
  if (withholdReason !== undefined) return refuse(withholdReason);
  let scanResult = await scanTranscriptForSuppression(
    lastSessionLog.fullPath,
    deps.storageV5,
    MAX_FORKED_TRANSCRIPTS,
  ).catch(() => "unread");
  if (scanResult === "unread" || scanResult === "budget-exhausted") return refuse("check_incomplete");
  if (scanResult.suppressed) return refuse("conversation_marked");
  if (scanResult.thirdParty) return refuse("third_party_turns");
  if (lastSessionLog.bridgeNoHistoryBackfill === true) return refuse("history_held_back");
  if (scanResult.records.some((agentType) => agentType.noBackfill)) return refuse("source_history_held_back");
  if (scanResult.locked && isWebSearchIsolationOn()) return refuse("policy");
  let mainThreadAgentType = context.localSessionId === sessionId ? getMainThreadAgentType() : undefined;
  let agentCandidates = [...scanResult.agents, ...(mainThreadAgentType ? [mainThreadAgentType] : [])].find(
    (agentType) => !deps.agentLeavesNoLimits(agentType),
  );
  if (agentCandidates !== undefined)
    return {
      outcome: "refused",
      reason: "agent_not_carried",
      agent: agentCandidates,
    };
  let ownerMatches = scanResult.records.map((record) =>
    ownerMatchKind(record.owner, credentialOwner === "unreadable" ? undefined : credentialOwner),
  );
  if (
    ownerMatches.includes("mismatch") ||
    scanResult.ledgerAccounts.some(
      (ledgerAccount) => credentialOwner === "unreadable" || ledgerAccount !== credentialOwner.accountUuid,
    ) ||
    scanResult.requestOrganizations.some(
      (requestOrganization) => requestOrganization !== apiRequest.orgUUID.toLowerCase(),
    )
  )
    return refuse("account_mismatch");
  if (
    scanResult.records.some((record, recordIndex) => record.named && ownerMatches[recordIndex] !== "match") ||
    (scanResult.records.length > 0 && !ownerMatches.includes("match"))
  )
    return refuse("check_incomplete");
  let retainedMessages = dropRetractedMessages(lastSessionLog.messages);
  let prepared = buildConversationCopy(
    retainedMessages,
    createRemoteBridgeRedactor({
      mode: strayDropMode,
      placeAccountMemoryTool: createMemoryServerVerifier(() => deps.tools),
      accountMemoryInPlay: () => hasRecordedTextForHost(deps.host),
    }),
  );
  if (!prepared.messages.some((end) => end.type === "user" || end.type === "assistant"))
    return refuse("nothing_to_move");
  if (
    (
      await Promise.all(
        scanResult.ends.map(async (end) => ({
          read: end,
          now: await readTranscriptEnd(end.path, deps.storageV5),
        })),
      )
    ).some(({ read: record, now: recordIndex }) => recordIndex !== record.end)
  )
    return refuse("check_incomplete");
  if (deps.turnBlocked()) return refuse("turn_running");
  if (getSessionId() !== sessionId) return refuse("conversation_changed");
  let recheckReason = withholdReasonFor(pinnedSessionId, lastSessionLog);
  if (recheckReason !== undefined) return refuse(recheckReason);
  return {
    outcome: "cleared",
    conversation: {
      ...prepared,
      historyHoldCleared: scanResult.records.some((record) => record.holdCleared),
      privacyLabels: tagAndManifestArtifactContent(retainedMessages, [], lastSessionLog.toolsUsed),
    },
  };
}
//@ chunk-mzw6m19v.js:6974-7024 placement
function isNonEmptyString(value) {
  return typeof value === "string" && value !== "";
}
//@ chunk-mzw6m19v.js:7024-9913 placement
/**
 * 读出并解析会话转录：处理损坏行、各类标记键（bridge-session、isolation-latch、credential_org 等）与开销。
 */
async function scanTranscriptForSuppression(path, storage, depth) {
  let transcriptStorageKey = getTranscriptStorageKey(path, storage);
  let openedSize;
  let lastSeq = await readLastTranscriptSeq(transcriptStorageKey);
  let lines =
    transcriptStorageKey !== undefined
      ? openTranscriptStream(transcriptStorageKey.backend, transcriptStorageKey.key)
      : readLinesReverse(path, SUPPRESSION_SCAN_CHUNK_BYTES, {
          onOpen: (size) => {
            openedSize = size;
          },
        });
  let records = [];
  let seenSessionIds = new Set();
  let folders = new Set();
  let ledgerAccounts = [];
  let requestOrganizations = [];
  let agentSettings = new Set();
  let forkedFromSessionIds = new Set();
  let budget =
    transcriptStorageKey !== undefined ? SuppressionScanBudget.forBackendRead() : new SuppressionScanBudget();
  let lastLine;
  let currentEnd = () => `${openedSize ?? lastSeq}
${lastLine}`;
  let thirdParty = false;
  let locked = false;
  for await (let line of lines) {
    lastLine ??= line;
    if (line !== "" && (!line.startsWith("{") || !line.endsWith("}") || line.includes("\x00")))
      throw Error("damaged transcript line");
    if (matchesHistorySuppressionLine(line))
      return {
        ends: [
          {
            path,
            end: currentEnd(),
          },
        ],
        suppressed: true,
        thirdParty,
        locked,
        records,
        ledgerAccounts,
        requestOrganizations,
        folders: [...folders],
        agents: [...agentSettings],
      };
    let providerIdMatched = containsProviderId(line);
    let parsedLine =
      providerIdMatched ||
      line.includes('"bridge-session"') ||
      line.includes('"isolation-latch"') ||
      line.includes('"artifact-autoreact-ledger"') ||
      line.includes('"credential_org"') ||
      line.includes('"forkedFrom"') ||
      line.includes('"agent-setting"') ||
      line.includes('"history-suppression"')
        ? jsonParse(line)
        : undefined;
    if (isPlainObject(parsedLine) && parsedLine.type === "artifact-autoreact-ledger")
      ledgerAccounts.push(assertTranscriptMark(parsedLine.accountUuid).toLowerCase());
    if (
      isPlainObject(parsedLine) &&
      isPlainObject(parsedLine.attachment) &&
      parsedLine.attachment.type === "credential_org"
    )
      requestOrganizations.push(assertTranscriptMark(parsedLine.attachment.organizationUuid).toLowerCase());
    if (isPlainObject(parsedLine)) {
      thirdParty ||= providerIdMatched && hasProviderIdInMessage(parsedLine);
      [parsedLine.cwd, parsedLine.relocatedCwd]
        .filter(isNonEmptyString)
        .forEach((folder) => folders.add(folder));
      locked ||= parsedLine.type === "isolation-latch";
      if (parsedLine.type === "agent-setting" && typeof parsedLine.agentSetting === "string")
        agentSettings.add(parsedLine.agentSetting);
      let forkedFrom = parsedLine.forkedFrom;
      if (forkedFrom !== undefined) {
        if (
          !isPlainObject(forkedFrom) ||
          typeof forkedFrom.sessionId !== "string" ||
          !isUuidShaped(forkedFrom.sessionId)
        )
          return "budget-exhausted";
        forkedFromSessionIds.add(forkedFrom.sessionId);
      }
    }
    if (isPlainObject(parsedLine) && parsedLine.type === "bridge-session") {
      let noHistoryBackfill = Boolean(parsedLine.noHistoryBackfill);
      let seenBefore = seenSessionIds.has(parsedLine.sessionId);
      let { ownerAccountUuid, ownerOrganizationUuid } = parsedLine;
      let ownerNamed =
        typeof ownerAccountUuid === "string" &&
        isUuidShaped(ownerAccountUuid) &&
        (ownerOrganizationUuid === undefined ||
          (typeof ownerOrganizationUuid === "string" && isUuidShaped(ownerOrganizationUuid)));
      records.push({
        owner: ownerNamed
          ? {
              accountUuid: ownerAccountUuid.toLowerCase(),
              organizationUuid:
                typeof ownerOrganizationUuid === "string" ? ownerOrganizationUuid.toLowerCase() : undefined,
            }
          : undefined,
        named: typeof parsedLine.bridgeSessionId === "string" && parsedLine.bridgeSessionId !== "",
        noBackfill: noHistoryBackfill && !seenBefore,
        holdCleared: noHistoryBackfill && seenBefore,
      });
      if (typeof parsedLine.sessionId === "string" && parsedLine.sessionId !== "")
        seenSessionIds.add(parsedLine.sessionId);
    }
    if (budget.spend(line)) return "budget-exhausted";
  }
  let ownBaseName = basename(path, ".jsonl");
  let forkedIds = [...forkedFromSessionIds].filter((forkedId) => forkedId !== ownBaseName);
  if (forkedIds.length > MAX_FORKED_TRANSCRIPTS || (forkedIds.length > 0 && depth === 0))
    return "budget-exhausted";
  let subScans = await Promise.all(
    forkedIds.map(async (forkedId) => {
      let soleTranscriptPath = await findSoleTranscriptWithMessagesById(
        forkedId,
        undefined,
        wrapStorageSource(getTranscriptStorageContext(storage)),
      );
      return soleTranscriptPath === null
        ? "budget-exhausted"
        : scanTranscriptForSuppression(soleTranscriptPath, storage, depth - 1);
    }),
  );
  let appendedScan =
    openedSize !== undefined
      ? await scanAppendedForSuppression(
          path,
          {
            size: openedSize,
            lastLine,
          },
          {},
          budget,
        )
      : "clean";
  if (appendedScan === "budget-exhausted") return "budget-exhausted";
  if (appendedScan === "clean" && (await readTranscriptEnd(path, storage)) !== currentEnd())
    return "budget-exhausted";
  return subScans.reduce(
    (accumulated, nextScan) =>
      accumulated === "budget-exhausted" || nextScan === "budget-exhausted"
        ? "budget-exhausted"
        : {
            ends: [...accumulated.ends, ...nextScan.ends],
            suppressed: accumulated.suppressed || nextScan.suppressed,
            thirdParty: accumulated.thirdParty || nextScan.thirdParty,
            locked: accumulated.locked || nextScan.locked,
            records: [...accumulated.records, ...nextScan.records],
            ledgerAccounts: [...accumulated.ledgerAccounts, ...nextScan.ledgerAccounts],
            requestOrganizations: [...accumulated.requestOrganizations, ...nextScan.requestOrganizations],
            folders: [...accumulated.folders, ...nextScan.folders],
            agents: [...accumulated.agents, ...nextScan.agents],
          },
    {
      ends: [
        {
          path,
          end: currentEnd(),
        },
      ],
      suppressed: appendedScan !== "clean",
      thirdParty,
      locked,
      records,
      ledgerAccounts,
      requestOrganizations,
      folders: [...folders],
      agents: [...agentSettings],
    },
  );
}
//@ chunk-mzw6m19v.js:9913-10075 placement
function withholdReasonFor(sessionId, lastSessionLog) {
  if (isTranscriptPersistenceDisabled()) return "transcript_not_saved";
  let withheld = withheldInThisProcess(sessionId);
  if (withheld !== undefined) return withheld;
  return (lastSessionLog.isolationLatch !== undefined || getCurrentSessionIsolationLatch() !== undefined) &&
    isWebSearchIsolationOn()
    ? "policy"
    : undefined;
}
//@ chunk-mzw6m19v.js:10075-10163 placement
function assertTranscriptMark(mark) {
  if (typeof mark !== "string") throw Error("unreadable transcript mark");
  return mark;
}
//@ chunk-mzw6m19v.js:10163-10506 placement
/**
 * 按顺序读回存的转录记录，读不出时带 code 报错，末端给 nextSeq。
 */
async function readLastTranscriptSeq(transcriptStorageKey) {
  let records = await transcriptStorageKey?.backend.readRecords(transcriptStorageKey.key, {
    order: "backward",
    limit: 1,
  });
  if (records?.ok === false && records.error.code !== "NotFound")
    throw Error("its saved transcript couldn't be read");
  let lastRecord = records?.ok === true ? records.value.items[0] : undefined;
  if (records?.ok === true && lastRecord === undefined && records.value.nextSeq !== undefined)
    throw Error("its saved transcript couldn't be read");
  return lastRecord?.seq;
}
//@ chunk-mzw6m19v.js:10506-10690 placement
async function readTranscriptEnd(path, storage) {
  let transcriptStorageKey = getTranscriptStorageKey(path, storage);
  let openedSize;
  let lastSeq = await readLastTranscriptSeq(transcriptStorageKey);
  let lines =
    transcriptStorageKey !== undefined
      ? openTranscriptStream(transcriptStorageKey.backend, transcriptStorageKey.key)
      : readLinesReverse(path, SUPPRESSION_SCAN_CHUNK_BYTES, {
          onOpen: (size) => {
            openedSize = size;
          },
        });
  for await (let line of lines)
    return `${openedSize ?? lastSeq}
${line}`;
  return `${openedSize ?? lastSeq}
undefined`;
}
//@ chunk-mzw6m19v.js:10690-11184 placement
/**
 * 取当前账号与组织 id：优先环境变量，其次存储凭证与配置，读不出返回 unreadable/no_login。
 */
async function readCredentialOwner(deps) {
  let credentialSnapshot = await readFreshOAuthCredentialSnapshot(deps.storageV5, deps.credentials).catch(
    () => {
      return;
    },
  );
  let tokenOrigin = await getClaudeAIOAuthTokenOriginAsync(deps.credentials).catch(() => {
    return;
  });
  if (tokenOrigin === "env" || tokenOrigin === "fd") {
    let accountUuid = normalizeUuidOrNull(env.CLAUDE_CODE_ACCOUNT_UUID)?.toLowerCase();
    let organizationUuid = normalizeUuidOrNull(env.CLAUDE_CODE_ORGANIZATION_UUID)?.toLowerCase();
    return accountUuid !== undefined && organizationUuid !== undefined
      ? {
          accountUuid,
          organizationUuid,
        }
      : "unreadable";
  }
  if (credentialSnapshot === undefined) return "no_login";
  return tokenOrigin === "store"
    ? {
        accountUuid: credentialSnapshot.accountUuid?.toLowerCase(),
        organizationUuid: credentialSnapshot.organizationUuid?.toLowerCase(),
      }
    : "unreadable";
}
//@ chunk-mzw6m19v.js:11184-11279 placement
function withheldInThisProcess(sessionId) {
  if (!isRemoteEgressSuppressedFor(sessionId)) return;
  return isSessionHistorySuppressed() || isSessionHistorySuppressedFor(sessionId)
    ? "conversation_marked"
    : "history_held_back";
}
//@ chunk-mzw6m19v.js:11279-11353 placement
function isConversationMoveBlockedByPolicy() {
  return (
    policyDenyKind("allow_remote_sessions") !== null ||
    isPolicyVerdictAbsent() ||
    COMPLIANCE_TAINT_KINDS.some(hasComplianceTaint)
  );
}
//@ chunk-mzw6m19v.js:11353-11402 placement
function refuse(reason) {
  return {
    outcome: "refused",
    reason,
  };
}
export {
  isConversationMoveAllowed,
  isConversationMoveServed,
  checkConversationMove,
  isConversationMovePossibleHere,
  withheldInThisProcess,
};
