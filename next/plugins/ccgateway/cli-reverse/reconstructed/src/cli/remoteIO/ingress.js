/**
 * cli/remoteIO/ingress.ts
 *
 * 2.1.316 新增。云 worker 入站事件：客户端行追赶、入站通道分类、事件流定义。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (42)
 * attribution: placement 40, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { URL as Ls } from "url";
import { withDeadline } from "../../utils/sleep.js";
import {
  initializeGrowthBook,
  hasFreshGrowthBookFeatures,
  refreshGrowthBookFeatures,
  isGrowthBookEnabled,
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasGrowthBookUsedNonDefaultHost,
  getAllGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { hasSettingsHookForEvent } from "../../utils/hooks.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { findLastRowBeforeSpans, selectRowsToResend, MAX_ROW_AGE_MS } from "../transports/ccrClient.js";
import { isTranscriptMessage } from "../../utils/sessionStorage.js";
import { isHiddenFromCatchUp, AUTH_REFRESH_DEBOUNCE_MS, TRANSCRIPT_COPY_LIMITS } from "./workerAuth.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { dropRetractedMessages_2 as dropRetractedMessages } from "../../utils/transcript/deserialize.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isNotEmptyMessage } from "../../utils/messages.js";
import { normalizeMessage } from "../../utils/queryHelpers.js";
import { stripMemoryTagsFromBlocks } from "../../services/orgMemory/promptIndex.js";
import { stripSystemReminders } from "../../components/messageActions.js";
import {
  sanitizeTextBlocks,
  isKnownHumanOrigin,
  isChatPlatformHuman,
  isNotificationOrigin,
  describeProjectsHumanOrigin,
  receiverGroupingIdOf,
  activityObservationOf,
  isNonHumanRelayMessage,
  withScheduledTriggerFireReason,
  triggerFireReasonOf,
  isHearthOrigin,
  isPeerOrigin,
  isHearthHuman,
  getTeammateMessageSender,
  shouldTreatInboundAsHuman,
  isHumanInboundMessage,
  refineInboundOrigin,
  isTriggerFireOrigin,
  humanOriginWhenNotSynthetic,
  isDefinedHumanClientPlatform,
  isClaudeCodeCliPlatform,
  EMAIL_HUMAN,
} from "../../bridge/inboundMessageOrigin.js";
import { escapePluginTags } from "../../utils/messages/pluginTags.js";
import { VIA_SESSION_CHANNEL } from "./servedCalls.js";
import { isProjectsHumanOriginEnabled } from "../../utils/crossSessionMessagingGate.js";
import { isSessionChannelPerson } from "../../utils/promptSubmissionOrigin.js";
import {
  isPeerOrSlackPing,
  isProjectsRelay,
  hasNonHumanOrigin,
  resolveIngressOrigin,
  isHumanOrAutoContinuation,
} from "../../utils/messageProvenance.js";
import { buildExternalEventRecord, externalEventRecordIfEnabled } from "../../utils/externalEventRecords.js";
import { lastTextBlockText } from "../../utils/historyFile.js";
import {
  relayThreadTsOf,
  parseRelayMessageIds,
  isRelayPrompt,
  parseRelayRows,
  HEARTH_AGENT,
  HEARTH_HUMAN,
} from "../../services/projectsRelay/relayConfig.js";
import { resolvedRowsMode, isSunnyAnchorOff } from "../../services/projects/threadRows.js";
import { sanitizeAddressPart } from "../../utils/swarm/teammateIds.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import {
  cloudBrowserTurnId,
  pickTurnIdForRelay,
  commonProgramUseCaseId,
} from "../../services/mcp/ccrTurnId.js";
import { isCoworkWithRemote } from "../../utils/sessionShape.js";
import { getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { toScopedConfig, isRemoteBrowserModeFloorOn } from "../../utils/permissions/remoteBrowser.js";
import { ensureFreshGrowthBook } from "./turnHandoff.js";
import { resolveAndPrepend } from "../../bridge/inboundAttachments.js";
import { MOSSY_SQUID_GATE } from "../../services/api/withRetry.js";
import { identity } from "../../utils/identity.js";
import { isScheduledTriggerOrigin } from "../../utils/turnOrigin.js";
import { logForDebugging } from "../../utils/debug.js";
import { DESKTOP_APP } from "../../services/artifacts/comments/commentNotifications.js";
import { peerOriginHeader } from "../../utils/peerMessageHeaders.js";
import { isTextNotTyped } from "../../entrypoints/sdk/coreSchemas.js";
import { httpUrlFromWs } from "../transports/transportUtils.js";
import { SSETransport } from "../transports/SSETransport.js";
import { DoctorLazy } from "../handlers/util.js";
import {
  objectSchema,
  stringSchema,
  numberSchema,
  unknown,
  record,
  union,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1kk50rk6.js:51083-51095 placement
var INGRESS_READINESS_TIMEOUT_MS = 2000;
//@ chunk-1kk50rk6.js:51095-51250 placement
/**
 * 构造入站消息的就绪检查对象：中继行已加载标志、带超时的特性开关加载，以及是否存在 MessageDisplay 钩子。
 */
function createIngressReadiness(session, appState, rowsLoaded) {
  return {
    rowsLoaded,
    flagsLoaded: () =>
      withDeadline(
        initializeGrowthBook().catch(() => null),
        INGRESS_READINESS_TIMEOUT_MS,
      ),
    hasDisplayHooks: () =>
      hasSettingsHookForEvent("MessageDisplay", appState, session.id) ||
      dispatchClassicEvent("MessageDisplay"),
  };
}
//@ chunk-1kk50rk6.js:51250-53858 placement
async function catchUpClientRows(ccrClient, { flagsLoaded, hasDisplayHooks, rowsLoaded }) {
  try {
    let spans = await ccrClient.clientRowsOwedByEarlierWorkers(flagsLoaded);
    if (spans.length === 0) return;
    let lastRowBeforeSpans = findLastRowBeforeSpans(
      spans,
      rowsLoaded,
      (row) => isTranscriptMessage(row) && !isHiddenFromCatchUp(row),
    );
    let read = await ccrClient
      .readInternalEventsForCatchUp(
        AbortSignal.timeout(AUTH_REFRESH_DEBOUNCE_MS),
        lastRowBeforeSpans,
        TRANSCRIPT_COPY_LIMITS,
      )
      .catch(logError);
    if (read?.anchorFallback)
      logFeatureSad(
        "ccr_client_rows_owed",
        read.anchorFallback === "rejected" ? "after_event_id_rejected" : "after_event_id_not_found",
      );
    if (read?.overBound) {
      let fields = {
        page_count: read.stats.pageCount,
        ...(read.stats.bytesReceived !== null && {
          bytes_received: read.stats.bytesReceived,
        }),
        spans: spans.length,
      };
      if (read.anchorFallback || rowsLoaded.length === 0) {
        logFeatureSad("ccr_client_rows_owed", "transcript_read_over_the_bound_will_retry", fields);
        await ccrClient.tryClientRowsOwedByEarlierWorkers(undefined);
        return;
      }
      logFeatureBad("ccr_client_rows_owed", "transcript_read_over_the_bound_gave_up", fields);
      ccrClient.giveUpClientRowsOwedByEarlierWorkers();
      return;
    }
    if (!read || read.encodedBody) {
      logFeatureSad("ccr_client_rows_owed", read ? "transcript_read_compressed" : "transcript_read_failed");
      await ccrClient.tryClientRowsOwedByEarlierWorkers(undefined);
      return;
    }
    let rows = read.events.flatMap((event) =>
      !event.session_agent_id && isTranscriptMessage(event.payload) ? [event.payload] : [],
    );
    let rows_2 = [];
    try {
      let retracted = new Set(dropRetractedMessages(rows));
      let shownAsStored = sessionIdBody(ccrClient.sessionId);
      let loaded = new Set(rowsLoaded.map((row) => row.uuid));
      let flattened = read.events.flatMap((event) => (event.session_agent_id ? [] : [event.payload]));
      let seen = new Set(
        flattened
          .slice(
            0,
            flattened.findLastIndex(
              (row) => loaded.has(row.uuid) || (row.type === "last-prompt" && row.rewound === true),
            ) + 1,
          )
          .filter((row) => !loaded.has(row.uuid)),
      );
      let { rows: rows_3, leftOut } = selectRowsToResend(spans, rows, (row) => {
        if (!retracted.has(row) || isHiddenFromCatchUp(row) || seen.has(row) || !isNotEmptyMessage(row))
          return false;
        return row.type === "assistant" && (shownAsStored === "" || row.shownAsStoredIn !== shownAsStored)
          ? "nor_any_after_it"
          : true;
      });
      if (rows_3.length === 0) {
        if (leftOut === "nothing")
          logFeatureOk("ccr_client_rows_owed", {
            rows: 0,
            event_count: read.events.length,
            after_event_id_sent: lastRowBeforeSpans !== undefined,
          });
        else logFeatureBad("ccr_client_rows_owed", leftOut);
        ccrClient.giveUpClientRowsOwedByEarlierWorkers();
        return;
      }
      if (leftOut !== "nothing") logFeatureSad("ccr_client_rows_owed", leftOut);
      for (let row of rows_3)
        for (let clientRow of normalizeMessage(
          row.type === "assistant"
            ? {
                ...row,
                message: {
                  ...row.message,
                  content: stripMemoryTagsFromBlocks(row.message.content),
                },
              }
            : row,
        ))
          if (clientRow.type === "assistant" || clientRow.type === "user")
            rows_2.push({
              ...clientRow,
              historical: true,
            });
      if (rows_2.length === 0) throw Error("the rows owed make no client row");
    } catch (error) {
      logError(error);
      logFeatureBad("ccr_client_rows_owed", "rows_not_prepared");
      ccrClient.giveUpClientRowsOwedByEarlierWorkers();
      return;
    }
    if (
      !(await ccrClient.tryClientRowsOwedByEarlierWorkers(rows.at(-1)?.uuid).then(
        () => true,
        (error) => {
          logError(error);
          return false;
        },
      ))
    ) {
      logFeatureSad("ccr_client_rows_owed", "try_report_failed");
      return;
    }
    if (hasDisplayHooks()) {
      logFeatureBad("ccr_client_rows_owed", "display_hooks_configured");
      ccrClient.giveUpClientRowsOwedByEarlierWorkers();
      return;
    }
    if (rows_2.length > MAX_ROW_AGE_MS) logFeatureSad("ccr_client_rows_owed", "client_rows_over_the_limit");
    await ccrClient.sendOwedClientRowsAgain(rows_2.slice(-MAX_ROW_AGE_MS));
  } catch (error) {
    logError(
      Error("sending earlier workers' owed client rows again failed; the worker starts anyway", {
        cause: error,
      }),
    );
  } finally {
    ccrClient.setDisplayHooksProbe(hasDisplayHooks);
  }
}
//@ chunk-1kk50rk6.js:53858-54066 placement
/**
 * 判断入站消息类型是否不在本地直接处理的集合中（user、bash_command、control_response 等以外）。
 */
function isUnhandledIngressType(frame) {
  return (
    frame.type !== "user" &&
    frame.type !== "bash_command" &&
    frame.type !== "control_response" &&
    frame.type !== "queued_notification" &&
    frame.type !== "workflow_launch" &&
    frame.type !== "session_notice" &&
    frame.type !== "control_request"
  );
}
//@ chunk-1kk50rk6.js:54066-54257 placement (2.1.88 match: extractErrorTypeFromData, 1)
/**
 * 内容是否含格式不对的文本块（非对象、text 不是字符串等）。
 */
function hasMalformedTextBlocks(data) {
  return (
    data != null &&
    typeof data !== "string" &&
    (!Array.isArray(data) ||
      data.some(
        (block) =>
          block === null ||
          typeof block !== "object" ||
          ("type" in block &&
            block.type === "text" &&
            (!("text" in block) || typeof block.text !== "string")),
      ))
  );
}
//@ chunk-1kk50rk6.js:54257-54379 placement
/**
 * 取入站用户消息的内容：需要清理且非受信来源时去掉 system-reminder 并清理文本块，否则原样返回。
 */
function ingressPromptContent(frame, shouldEscape, skip) {
  let content = frame.message.content;
  if (!shouldEscape || skip) return content;
  return typeof content === "string"
    ? stripSystemReminders(content)
    : Array.isArray(content)
      ? sanitizeTextBlocks(content)
      : content;
}
//@ chunk-1kk50rk6.js:54379-54434 placement
/**
 * 入站提示内容转义：未开启或已转义时原样返回，否则按来源转义插件标签。
 */
function escapePromptUnlessDisabled(content, shouldEscape, skip, inboundOrigin) {
  if (!shouldEscape || skip) return content;
  return escapePluginTags(content, inboundOrigin);
}
//@ chunk-1kk50rk6.js:54434-55124 placement
/**
 * 把会话通道上收到的用户帧转成外部事件记录：内容格式不对、来自对等方或不满足"会话通道真人输入"条件时返回 null；非对等/Slack 点名的消息还会附上粘贴内容。
 */
function sessionChannelPromptRecord(event) {
  let content = event.message?.content;
  if ((typeof content !== "string" && !Array.isArray(content)) || hasMalformedTextBlocks(content))
    return null;
  let frame = {
    ...event,
    message: {
      content,
    },
    [VIA_SESSION_CHANNEL]: true,
  };
  let promptContent = ingressPromptContent(frame, true, false);
  let { ingressOrigin, peerFrom, nonPeerOrigin, queuedOrigin } = resolveIngressOrigins(
    frame,
    promptContent,
    true,
    false,
    undefined,
  );
  if (peerFrom !== undefined) return null;
  let isRelayHuman = ingressOrigin
    ? isKnownHumanOrigin(
        frame.inbound_origin,
        isProjectsHumanOriginEnabled({
          flagsSettled: undefined,
        }),
      )
    : isChatPlatformHuman(frame.client_platform, frame.inbound_origin);
  let submission = ingressSubmitFlags({
    message: frame,
    isRemoteIO: true,
    isRelayHuman,
    queuedOrigin,
    nonPeerOrigin,
  });
  if (
    !isSessionChannelPerson({
      submittedBySessionChannelPerson: submission.sessionChannelPersonTyped === true,
      dispatchedOverBridge: false,
      submissionVerifiedSlackHumanTurn: isRelayHuman,
    })
  )
    return null;
  let record = escapePromptUnlessDisabled(promptContent, true, false, frame.inbound_origin);
  if (!isPeerOrSlackPing(ingressOrigin))
    record = buildExternalEventRecord(record, event.pasted_content, event.inline_pastes);
  return lastTextBlockText(record);
}
//@ chunk-1kk50rk6.js:55124-55188 placement
/**
 * 先取入站提示内容再做插件标签转义的组合入口。
 */
function escapedIngressPrompt(frame, shouldEscape, skip) {
  return escapePromptUnlessDisabled(
    ingressPromptContent(frame, shouldEscape, skip),
    shouldEscape,
    skip,
    frame.inbound_origin,
  );
}
//@ chunk-1kk50rk6.js:55188-55401 placement
/**
 * 判断入站消息是否是会话收件箱的唤醒事件（开关开启时解析外部事件唤醒），是则返回唤醒对象。
 */
function resolveInboxWakeFor(sessionId, kind, record) {
  if (!isNotificationOrigin(kind)) return;
  let record_2 = externalEventRecordIfEnabled(record);
  {
    if (typeof sessionId !== "string") return;
    let { resolveExternalEventWake, isSessionInboxWake } = require("../../utils/externalEventWake.js");
    let externalEventWake = resolveExternalEventWake(sessionId, record_2);
    return externalEventWake !== null && isSessionInboxWake(externalEventWake)
      ? externalEventWake
      : undefined;
  }
  return;
}
//@ chunk-1kk50rk6.js:55401-55586 placement
/**
 * 提取 Projects 中继消息的元数据：中继消息 id、校验过的中继行与线程时间戳。
 */
function relayMessageMeta(frame, origin) {
  if (!isProjectsRelay(origin)) return {};
  let threadTs = relayThreadTsOf(frame);
  let relayMessageIds = parseRelayMessageIds(frame);
  if (relayMessageIds === undefined)
    return threadTs !== undefined && isRelayPrompt(frame)
      ? {
          threadTs,
        }
      : {};
  let relayRows = parseRelayRows(frame, relayMessageIds);
  return {
    messageIds: relayMessageIds,
    ...(relayRows && {
      rows: relayRows,
    }),
    ...(threadTs && {
      threadTs,
    }),
  };
}
//@ chunk-1kk50rk6.js:55586-55923 placement
/**
 * 记录 Projects 中继入站的特性状态：开关关闭或无中继 id、中继行被拒，或成功（id、行与附注数量）。
 */
function logProjectsRelayAdmission(frame, origin, rows) {
  let relayPrompt = isRelayPrompt(frame);
  if (!isProjectsRelay(origin)) {
    logFeatureSad(
      "bridge_projects_relay",
      resolvedRowsMode() === "off" || relayPrompt ? "flag_off" : "no_relay_ids",
    );
    return;
  }
  let relayMessageIds = parseRelayMessageIds(frame);
  if (rows === undefined && frame.relay_rows !== undefined) {
    logFeatureBad("bridge_projects_relay", "rows_rejected", {
      id_count: relayMessageIds?.length ?? 0,
    });
    return;
  }
  logFeatureOk("bridge_projects_relay", {
    id_count: relayMessageIds?.length ?? 0,
    row_count: rows?.length ?? 0,
    note_count: relayPrompt ? 1 : 0,
  });
}
//@ chunk-1kk50rk6.js:55923-56190 placement
function describeIngressOrigin(
  frame,
  clientPlatform,
  isRemoteIO,
  peerFrom,
  flagsSettled,
  deliveredByServer = false,
) {
  if (isRemoteIO && !peerFrom) {
    let origin = describeProjectsHumanOrigin(
      clientPlatform,
      frame.client_platform,
      frame.inbound_origin,
      receiverGroupingIdOf(frame),
      activityObservationOf(frame),
      isProjectsHumanOriginEnabled({
        flagsSettled,
      }),
      resolvedRowsMode() !== "off" &&
        isNonHumanRelayMessage({
          relayMessageIds: parseRelayMessageIds(frame),
          isSynthetic: frame.isSynthetic,
          coordinatorNote: isRelayPrompt(frame) && isSunnyAnchorOff(),
        }),
      sanitizeAddressPart(frame.from_plugin),
      deliveredByServer,
    );
    return withScheduledTriggerFireReason(origin, frame);
  }
  return;
}
//@ chunk-1kk50rk6.js:56190-56202 placement
var GROWTHBOOK_SETTLE_BUDGET_MS = 2000;
//@ chunk-1kk50rk6.js:56202-56614 placement
/**
 * 等 GrowthBook 初始化（带截止时间），拿到的特性不新鲜时在剩余时间内再刷新一次；仍不新鲜时记诊断日志 cli_user_frame_flag_settle，返回是否已就绪。
 */
async function awaitGrowthBookSettled(context) {
  let startTime = performance.now();
  let outcome = await withDeadline(
    initializeGrowthBook().then(
      () => "resolved",
      () => "failed",
    ),
    GROWTHBOOK_SETTLE_BUDGET_MS,
  );
  let fresh = outcome === "resolved" && hasFreshGrowthBookFeatures();
  if (outcome === "resolved" && !fresh) {
    let left = GROWTHBOOK_SETTLE_BUDGET_MS - (performance.now() - startTime);
    if (left > 0) {
      await withDeadline(
        refreshGrowthBookFeatures().catch(() => {
          return;
        }),
        left,
      );
      fresh = hasFreshGrowthBookFeatures();
    }
  }
  if (!fresh)
    logForDiagnosticsNoPII("warn", "cli_user_frame_flag_settle", () => ({
      ...context,
      ms: Math.round(performance.now() - startTime),
      deadline_ms: GROWTHBOOK_SETTLE_BUDGET_MS,
      timed_out: outcome === undefined,
      failed: outcome === "failed",
      no_payload: outcome === "resolved",
    }));
  return fresh;
}
//@ chunk-1kk50rk6.js:56614-56672 placement
var TRIGGER_FIRE_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1kk50rk6.js:56614", () => {
  TRIGGER_FIRE_REASONS = new Set(["scheduled", "retry", "catch_up", "manual"]);
});
//@ chunk-1kk50rk6.js:56672-56775 placement
function isServerDeliveredOrigin(frame) {
  return (
    frame.inbound_origin === undefined ||
    (frame.inbound_origin === "trigger_fire" && TRIGGER_FIRE_REASONS.has(triggerFireReasonOf(frame) ?? ""))
  );
}
//@ chunk-1kk50rk6.js:56775-56977 layout
function withCloudBrowserTurnId(message, isServerDelivered) {
  return cloudBrowserTurnId(message, {
    deliveredByServer:
      isServerDelivered.isRemoteIO &&
      !isServerDelivered.isLocallyPrepended &&
      !isServerDelivered.isRelayHuman &&
      isServerDelivered.peerFrom === undefined &&
      !isServerDelivered.isCrossSession &&
      isServerDeliveredOrigin(message),
    holdsCloudBrowser: () => isCoworkWithRemote() && (getMcpClientsFromAccessor() ?? []).some(toScopedConfig),
  });
}
//@ chunk-1kk50rk6.js:56977-57506 placement
/**
 * 判断是否给云浏览器回合发 turn id：下限开关已开直接放行；GrowthBook 未启用拒绝；否则等特性稳定后再判，仍未稳定时在后台刷新并记 flags_unsettled。
 */
async function admitCloudBrowserTurnId(context) {
  if (isRemoteBrowserModeFloorOn()) {
    logFeatureOk("ccr_cloud_browser_turn_id");
    return {
      admitted: true,
    };
  }
  if (!isGrowthBookEnabled()) {
    logFeatureSad("ccr_cloud_browser_turn_id", "flags_disabled");
    return {
      admitted: false,
    };
  }
  let startTime = performance.now();
  await takeOnce(() => awaitGrowthBookSettled(context));
  let flagSettleMs = Math.round(performance.now() - startTime);
  if (isRemoteBrowserModeFloorOn()) {
    logFeatureOk("ccr_cloud_browser_turn_id", {
      settled_first: true,
    });
    return {
      admitted: true,
      flagSettleMs,
    };
  }
  if (hasFreshGrowthBookFeatures()) {
    logFeatureSad("ccr_cloud_browser_turn_id", "flag_off");
    return {
      admitted: false,
      flagSettleMs,
    };
  }
  ensureFreshGrowthBook().catch(() => {});
  logFeatureSad("ccr_cloud_browser_turn_id", "flags_unsettled");
  return {
    admitted: false,
    flagSettleMs,
  };
}
//@ chunk-1kk50rk6.js:57506-58320 placement
async function classifyInboundLane(frame, fields) {
  let flagsSettled = isHearthOrigin(fields.inboundOrigin)
    ? await awaitGrowthBookSettled({
        lane: "bridge",
      })
    : undefined;
  let isSynthetic = "isSynthetic" in frame && frame.isSynthetic === true;
  let origin = describeProjectsHumanOrigin(
    fields.content,
    fields.clientPlatform,
    fields.inboundOrigin,
    fields.receiverGroupingId,
    fields.activityObservation,
    isProjectsHumanOriginEnabled({
      flagsSettled,
    }),
    resolvedRowsMode() !== "off" &&
      isNonHumanRelayMessage({
        relayMessageIds: parseRelayMessageIds(frame),
        isSynthetic,
        coordinatorNote: isRelayPrompt(frame) && isSunnyAnchorOff(),
      }),
  );
  let nonPeer = origin?.kind === "peer" || origin?.kind === "slack-ping" ? undefined : origin;
  let { messageIds, rows, threadTs } = relayMessageMeta(frame, nonPeer);
  if (fields.inboundOrigin === HEARTH_AGENT) logProjectsRelayAdmission(frame, nonPeer, rows);
  let isRelayHuman = isKnownHumanOrigin(
    fields.inboundOrigin,
    isProjectsHumanOriginEnabled({
      flagsSettled,
    }),
  );
  let stamps = isPeerOrigin({
    isRelayHuman,
    isSynthetic,
    ccrTurnId: pickTurnIdForRelay(frame, {
      isRelayHuman,
    }),
    isProjectsUser: isHearthHuman(fields.inboundOrigin),
  });
  return {
    ingressOrigin: origin,
    isRelayHuman,
    isSynthetic,
    stamps: {
      ...stamps,
      ...(stamps.projectsUserTurn && {
        inboundOrigin: HEARTH_HUMAN,
      }),
      ...(messageIds && {
        hearthRelayMessageIds: messageIds,
      }),
      ...(rows && {
        hearthRelayRows: rows,
      }),
      ...(threadTs && {
        hearthRelayThreadTs: threadTs,
      }),
    },
  };
}
//@ chunk-1kk50rk6.js:58320-58383 placement
function teammateSenderOf(origin, meta) {
  return origin ? (origin.kind === "peer" ? origin.from : undefined) : getTeammateMessageSender(meta);
}
//@ chunk-1kk50rk6.js:58383-58489 placement
/**
 * 判断入站帧是否来自人类用户（非对等会话转发，按入站来源、远程 IO 与客户端平台判断）。
 */
function isHumanIngressFrame(frame, fields) {
  return (
    !fields.peerFrom &&
    shouldTreatInboundAsHuman(
      fields.ingressOrigin,
      fields.isRemoteIO,
      frame.client_platform,
      frame.inbound_origin,
    )
  );
}
//@ chunk-1kk50rk6.js:58489-58851 placement
/**
 * 人类用户入站帧中取出被撤回的文件 uuid 列表。
 */
function withdrawnFileUuidsOf(frame, fields) {
  let withdrawnFileUuids = "withdrawn_file_uuids" in frame ? frame.withdrawn_file_uuids : undefined;
  return Array.isArray(withdrawnFileUuids) && isHumanIngressFrame(frame, fields)
    ? {
        withdrawnFileUuids: withdrawnFileUuids.filter(
          (withdrawnFileUuid) => typeof withdrawnFileUuid === "string",
        ),
        hidePicturesWithNoFileIdBefore:
          "hide_pictures_with_no_file_id_before" in frame &&
          typeof frame.hide_pictures_with_no_file_id_before === "string"
            ? Date.parse(frame.hide_pictures_with_no_file_id_before) || 0
            : 0,
      }
    : {};
}
//@ chunk-1kk50rk6.js:58851-59166 placement
/**
 * 判断一条入站用户消息是否算真人发起的新回合：排除本地前置、对等方、元消息、客户端合成、召唤种子、非 user 发起者，远程 IO 下还要求不是合成消息且来源可信。
 */
function isUserTypedTurn(frame, fields) {
  return (
    !fields.isLocallyPrepended &&
    !fields.peerFrom &&
    !fields.wasStartedBefore &&
    frame.shouldQuery !== false &&
    frame.is_meta !== true &&
    frame.client_composed !== true &&
    frame.seeded_summon !== true &&
    (frame.initiator === undefined || frame.initiator === "user") &&
    (fields.isRemoteIO
      ? !frame.isSynthetic && isHumanInboundMessage(frame, "remote-worker", fields.projectsHumanEnabled)
      : !hasNonHumanOrigin(frame.origin, frame.isSynthetic))
  );
}
//@ chunk-1kk50rk6.js:59166-59237 placement
/**
 * 把入站附件与文件解析后前置到用户帧（isHumanIngressFrame 决定是否需要人工提示）。
 */
function prependIngressFiles(frame, second, third, fourth, fifth, sixth, seventh, namedByIdHash = false) {
  return resolveAndPrepend(
    frame,
    second,
    isHumanIngressFrame(frame, third),
    fourth,
    fifth,
    sixth,
    seventh,
    false,
    namedByIdHash,
  );
}
//@ chunk-1kk50rk6.js:59237-59363 placement
function nonPeerOriginOf(origin, frame, peerFrom) {
  let refined = refineInboundOrigin(origin, frame.client_platform, frame.inbound_origin);
  if (!peerFrom && refined?.kind === "human" && hasNonHumanOrigin(frame.origin, false)) return;
  return refined;
}
//@ chunk-1kk50rk6.js:59363-59386 placement
function isMossySquidGateForceOff() {
  return false;
}
//@ chunk-1kk50rk6.js:59386-59465 placement
function isSyntheticTriggerReleaseEnabled() {
  if (isMossySquidGateForceOff())
    return getFeatureValue_CACHED_MAY_BE_STALE(MOSSY_SQUID_GATE, false) === true;
  return (
    hasFreshGrowthBookFeatures() &&
    !hasGrowthBookUsedNonDefaultHost() &&
    getAllGrowthBookFeatures()[MOSSY_SQUID_GATE] === true
  );
}
//@ chunk-1kk50rk6.js:59465-59547 placement
/**
 * 判断是否为合成请求帧且 origin 属于触发器来源（且 GrowthBook 可用、未强制关）。
 */
function isSyntheticTriggerFrame(frame) {
  return (
    Boolean(frame.isSynthetic) &&
    isTriggerFireOrigin(frame.inbound_origin) &&
    isGrowthBookEnabled() &&
    !isMossySquidGateForceOff()
  );
}
//@ chunk-1kk50rk6.js:59547-59595 placement
var TAKEN_PROMISE_HOLDER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1kk50rk6.js:59547", () => {
  TAKEN_PROMISE_HOLDER = identity(
    {
      taken: undefined,
    },
    (holder) => {
      holder.taken = undefined;
    },
  );
});
//@ chunk-1kk50rk6.js:59595-59653 placement
/**
 * 一次性取 promise：第一次调用时执行并缓存，之后返回同一 promise（失败归一为 undefined）。
 */
function takeOnce(start) {
  return (TAKEN_PROMISE_HOLDER.taken ??= start().catch(() => {
    return;
  }));
}
//@ chunk-1kk50rk6.js:59653-59959 placement
/**
 * 触发器 origin 到任务通知类型的映射表。
 */
var UNCLASSIFIED_ORIGIN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SCHEDULED_TRIGGER_ORIGIN;
var TRIGGER_ORIGIN_KINDS;
deferInit("chunk-1kk50rk6.js:59653", () => {
  UNCLASSIFIED_ORIGIN = Object.freeze({
    kind: "unclassified",
  });
  SCHEDULED_TRIGGER_ORIGIN = Object.freeze({
    kind: "task-notification",
    subkind: "scheduled-trigger",
  });
  TRIGGER_ORIGIN_KINDS = {
    "fired-prompt": SCHEDULED_TRIGGER_ORIGIN,
    "beside-a-fire": UNCLASSIFIED_ORIGIN,
    nobody: UNCLASSIFIED_ORIGIN,
    "projects-relay": "as classified",
    "unvouched-fire": undefined,
    person: undefined,
    "peer-send-message": undefined,
    "session-inbox": undefined,
    delivery: undefined,
  };
});
//@ chunk-1kk50rk6.js:59959-60261 placement
/**
 * 对合成消息的发送方分类：无、人、投递、其他子类型、未担保的定时触发、定时触发的提示或其旁带消息。
 */
function classifySyntheticSender(frame, origin, peerFrom) {
  if (peerFrom === undefined) return "nobody";
  if (peerFrom.kind === "human") return "person";
  if (peerFrom.subkind === undefined) return "delivery";
  if (peerFrom.subkind !== "scheduled-trigger") return peerFrom.subkind;
  if (!isScheduledTriggerOrigin(origin)) return "unvouched-fire";
  return triggerFireReasonOf(frame) !== undefined && frame.shouldQuery !== false && frame.priority !== "now"
    ? "fired-prompt"
    : "beside-a-fire";
}
//@ chunk-1kk50rk6.js:60261-60499 placement
function syntheticFrameOrigin(kind, origin) {
  if (kind === "fired-prompt" || kind === "beside-a-fire") {
    let releaseOn = isSyntheticTriggerReleaseEnabled();
    logForDebugging(
      `[ingress] synthetic trigger_fire frame: ${kind}, ${releaseOn ? "labelled" : "left with no origin (the flag reads off)"}`,
    );
    if (!releaseOn) return;
  }
  let mapped = TRIGGER_ORIGIN_KINDS[kind];
  return mapped === "as classified" ? origin : mapped;
}
//@ chunk-1kk50rk6.js:60499-60802 placement
/**
 * 解析入站消息的各种来源：入站来源、对等发送方、非对等来源与排队命令的来源。
 */
function resolveIngressOrigins(frame, meta, isRemoteIO, peerFrom, flagsSettled, delivered = false) {
  let ingressOrigin = describeIngressOrigin(frame, meta, isRemoteIO, peerFrom, flagsSettled, delivered);
  let nonPeer = nonPeerOriginOf(ingressOrigin, frame, isRemoteIO);
  let queuedOrigin = frame.isSynthetic
    ? syntheticFrameOrigin(classifySyntheticSender(frame, ingressOrigin, nonPeer), nonPeer)
    : (nonPeer ??
      (isRemoteIO
        ? humanOriginWhenNotSynthetic(frame.client_platform, frame.inbound_origin)
        : resolveIngressOrigin(frame.origin, false)));
  let originFields =
    isRemoteIO || frame.client_platform !== DESKTOP_APP ? undefined : peerOriginHeader(frame.origin, meta);
  return {
    ingressOrigin,
    peerFrom: teammateSenderOf(ingressOrigin, meta) ?? originFields?.from,
    hostPeer: originFields,
    nonPeerOrigin: nonPeer,
    queuedOrigin,
  };
}
//@ chunk-1kk50rk6.js:60802-60892 placement
/**
 * 取入站帧的 initiator（非空字符串时返回，否则 undefined）。
 */
function initiatorOfFrame(frame) {
  return typeof frame.initiator === "string" && frame.initiator !== "" ? frame.initiator : undefined;
}
//@ chunk-1kk50rk6.js:60892-61196 layout
function isPlainUserMessageEnvelope(message) {
  return (
    [message.origin, message.inbound_origin, message.client_platform].every(
      (field) => field === undefined || field === null,
    ) &&
    [
      message.isSynthetic,
      message.is_meta,
      message.client_composed,
      message.seeded_summon,
      message.text_not_typed,
    ].every((field) => field === undefined || field === null || field === false) &&
    (message.initiator === undefined ||
      message.initiator === null ||
      message.initiator === "" ||
      message.initiator === "user")
  );
}
//@ chunk-1kk50rk6.js:61196-61946 placement
/**
 * 计算入站消息提交时的附加标志：客户端合成/召唤或非真人来源时跳过附件；本地真人键入标记 localStdinOrigin；真人消息带 requeueIfInterruptedWithinMs。
 */
function ingressSubmitFlags({ message, isRemoteIO, isRelayHuman, queuedOrigin, nonPeerOrigin, foreignWord }) {
  let skipAttachments =
    message.client_composed === true ||
    message.seeded_summon === true ||
    (queuedOrigin !== undefined && !isHumanOrAutoContinuation(queuedOrigin)) ||
    (message.isSynthetic === true &&
      nonPeerOrigin !== undefined &&
      !isHumanOrAutoContinuation(nonPeerOrigin));
  let typedByHuman =
    !hasNonHumanOrigin(message.origin, message.isSynthetic) &&
    message.is_meta !== true &&
    !isRelayHuman &&
    message.inbound_origin === undefined &&
    (message.client_platform === undefined ||
      isDefinedHumanClientPlatform(message.client_platform) ||
      isClaudeCodeCliPlatform(message.client_platform)) &&
    !skipAttachments &&
    !isTextNotTyped(message);
  let localStdinOrigin = !isRemoteIO && typedByHuman;
  let requeueWithinMs =
    typedByHuman && !message.isSynthetic
      ? clampRequeueWindowMs(message.requeue_if_interrupted_within_ms)
      : undefined;
  let programUseCaseId = commonProgramUseCaseId(message, {
    ownerTyped:
      isRemoteIO &&
      typedByHuman &&
      !message.isSynthetic &&
      message.historical !== true &&
      !isClaudeCodeCliPlatform(message.client_platform) &&
      foreignWord === undefined,
  });
  return {
    ...(skipAttachments && {
      skipAttachments: true,
    }),
    ...(localStdinOrigin && {
      localStdinOrigin: true,
    }),
    ...false,
    ...(requeueWithinMs !== undefined && {
      requeueIfInterruptedWithinMs: requeueWithinMs,
    }),
    ...(programUseCaseId !== undefined && {
      ccrProgramUseCaseId: programUseCaseId,
    }),
    ...(message.seeded_summon === true && {
      quotesOthers: true,
    }),
  };
}
//@ chunk-1kk50rk6.js:61946-62038 placement
/**
 * 判断入站帧是否由人类撰写：已标记、client_composed 或非键入文本、邮件人类来源。
 */
function isHumanComposedFrame(frame, peerFrom) {
  return (
    Boolean(peerFrom) ||
    frame.client_composed === true ||
    isTextNotTyped(frame) ||
    frame.inbound_origin === EMAIL_HUMAN
  );
}
//@ chunk-1kk50rk6.js:62038-62130 placement
function clampRequeueWindowMs(requeueIfInterruptedWithinMs) {
  return typeof requeueIfInterruptedWithinMs === "number" &&
    Number.isInteger(requeueIfInterruptedWithinMs) &&
    requeueIfInterruptedWithinMs >= 1
    ? Math.min(requeueIfInterruptedWithinMs, 1e4)
    : undefined;
}
//@ chunk-1kk50rk6.js:62157-62294 placement
function createWorkerEventsTransport(url, headers = {}, options = {}) {
  let timeoutMs = httpUrlFromWs(new Ls(url.href));
  timeoutMs.pathname = timeoutMs.pathname.replace(/\/$/, "") + "/worker/events/stream";
  return new SSETransport(timeoutMs, headers, options);
}
//@ chunk-1kk50rk6.js:62294-63196 placement
/**
 * worker 事件流常量：hello 超时与重拨上限、续期/批处理/心跳节奏、心跳被拒状态、socket 超时、消息体上限与预留、事件路径种类，以及 hello/ack/event 帧的 zod schema。
 */
var WORKER_EVENT_STREAMS; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HELLO_TIMEOUT_MS;
var MAX_DIALS_WITHOUT_HELLO;
var MAX_REDIALS_WITHOUT_HELLO;
var MAX_UNACCEPTED_ENDS;
var RENEWAL_INTERVAL_MS;
var MAX_BATCH_SERVER_ERRORS;
var HEARTBEAT_INTERVAL_MS;
var HEARTBEAT_REFUSED_STATUSES;
var SOCKET_UNSERVED_TIMEOUT_MS;
var DEFAULT_MAX_MESSAGE_BYTES;
var MESSAGE_BYTES_RESERVE;
var WORKER_EVENT_PATH_KINDS;
var workerEventFrameSchema;
var sequenceNumReplySchema;
deferInit("chunk-1kk50rk6.js:62294", () => {
  WORKER_EVENT_STREAMS = /^(?:client|server)_(?:no_context_takeover|max_window_bits(?:=\d+)?)$/;
  HELLO_TIMEOUT_MS = 5000;
  MAX_DIALS_WITHOUT_HELLO = 2;
  MAX_REDIALS_WITHOUT_HELLO = 5;
  MAX_UNACCEPTED_ENDS = 2;
  RENEWAL_INTERVAL_MS = 5000;
  MAX_BATCH_SERVER_ERRORS = 3;
  HEARTBEAT_INTERVAL_MS = 5000;
  HEARTBEAT_REFUSED_STATUSES = new Set([409, 429]);
  SOCKET_UNSERVED_TIMEOUT_MS = 60000;
  DEFAULT_MAX_MESSAGE_BYTES = 8388608;
  MESSAGE_BYTES_RESERVE = 65536;
  WORKER_EVENT_PATH_KINDS = new Map([
    ["/worker/events", "client_events"],
    ["/worker/internal-events", "worker_events"],
  ]);
  workerEventFrameSchema = DoctorLazy(() =>
    objectSchema({
      hello: objectSchema({
        mode: stringSchema().optional(),
        server_time: stringSchema().optional(),
        keep_alive_interval_seconds: numberSchema().optional(),
        session_writers: stringSchema().optional(),
        attestation_policy: stringSchema().optional(),
        max_message_bytes: numberSchema().int().positive().optional().catch(undefined),
      }).optional(),
      ack: objectSchema({
        id: numberSchema(),
        error: objectSchema({
          status: numberSchema().optional(),
          type: stringSchema().optional(),
          retry_after_seconds: numberSchema().optional(),
          conflict_reason: stringSchema().optional(),
        }).optional(),
        client_events: unknown().optional(),
        worker_events: unknown().optional(),
        heartbeat: unknown().optional(),
      }).optional(),
      event: record(stringSchema(), unknown()).optional(),
      keep_alive: objectSchema({}).optional(),
    }),
  );
  sequenceNumReplySchema = DoctorLazy(() =>
    objectSchema({
      sequence_num: union([numberSchema().int().positive(), stringSchema().regex(/^[1-9]\d*$/)]),
    }),
  );
});
export {
  createIngressReadiness,
  isUnhandledIngressType,
  classifyInboundLane,
  resolveInboxWakeFor,
  escapedIngressPrompt,
  awaitGrowthBookSettled,
  ingressPromptContent,
  isSyntheticTriggerFrame,
  takeOnce,
  resolveIngressOrigins,
  isUserTypedTurn,
  relayMessageMeta,
  logProjectsRelayAdmission,
  initiatorOfFrame,
  isHumanComposedFrame,
  isHumanIngressFrame,
  withCloudBrowserTurnId,
  admitCloudBrowserTurnId,
  escapePromptUnlessDisabled,
  withdrawnFileUuidsOf,
  isPlainUserMessageEnvelope,
  ingressSubmitFlags,
  hasMalformedTextBlocks,
  prependIngressFiles,
  DEFAULT_MAX_MESSAGE_BYTES,
  MESSAGE_BYTES_RESERVE,
  WORKER_EVENT_PATH_KINDS,
  HEARTBEAT_INTERVAL_MS,
  HEARTBEAT_REFUSED_STATUSES,
  RENEWAL_INTERVAL_MS,
  HELLO_TIMEOUT_MS,
  WORKER_EVENT_STREAMS,
  MAX_BATCH_SERVER_ERRORS,
  SOCKET_UNSERVED_TIMEOUT_MS,
  MAX_REDIALS_WITHOUT_HELLO,
  MAX_DIALS_WITHOUT_HELLO,
  MAX_UNACCEPTED_ENDS,
  workerEventFrameSchema,
  sequenceNumReplySchema,
  sessionChannelPromptRecord,
  catchUpClientRows,
  createWorkerEventsTransport,
};
