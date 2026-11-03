/**
 * cli/remoteIO/ingress.ts
 *
 * 2.1.316 新增。云 worker 入站事件：客户端行追赶、入站通道分类、事件流定义。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (42)
 * attribution: placement 42
 */
import { URL as As } from "url";
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
import { cloudBrowserTurnId, pickTurnIdForRelay } from "../../services/mcp/ccrTurnId.js";
import { isCoworkWithRemote } from "../../utils/sessionShape.js";
import { getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { toScopedConfig, isRemoteBrowserModeFloorOn } from "../../utils/permissions/remoteBrowser.js";
import { identity } from "../../utils/identity.js";
import { resolveAndPrepend } from "../../bridge/inboundAttachments.js";
import { MOSSY_SQUID_GATE } from "../../services/api/withRetry.js";
import { isScheduledTriggerOrigin } from "../../utils/turnOrigin.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTextNotTyped } from "../../entrypoints/sdk/coreSchemas.js";
import { getTransportForUrl } from "../transports/transportUtils.js";
import { SSETransport } from "../transports/SSETransport.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, string, E, unknown, record, union } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-z4g2ta8k.js:48124-48136 placement
var INGRESS_READINESS_TIMEOUT_MS = 2000;
//@ chunk-z4g2ta8k.js:48136-48291 placement
/**
 * 构造入站消息的就绪检查对象：中继行已加载标志、带超时的特性开关加载，以及是否存在 MessageDisplay 钩子。
 */
function createIngressReadiness(e, appState, rowsLoaded) {
  return {
    rowsLoaded,
    flagsLoaded: () =>
      withDeadline(
        initializeGrowthBook().catch(() => null),
        INGRESS_READINESS_TIMEOUT_MS,
      ),
    hasDisplayHooks: () =>
      hasSettingsHookForEvent("MessageDisplay", appState, e.id) || dispatchClassicEvent("MessageDisplay"),
  };
}
//@ chunk-z4g2ta8k.js:48291-50891 placement
async function catchUpClientRows(ccrClient, { flagsLoaded, hasDisplayHooks, rowsLoaded }) {
  try {
    let h = await ccrClient.clientRowsOwedByEarlierWorkers(flagsLoaded);
    if (h.length === 0) return;
    let lastRowBeforeSpans = findLastRowBeforeSpans(
      h,
      rowsLoaded,
      (A) => isTranscriptMessage(A) && !isHiddenFromCatchUp(A),
    );
    let S = await ccrClient
      .readInternalEventsForCatchUp(
        AbortSignal.timeout(AUTH_REFRESH_DEBOUNCE_MS),
        lastRowBeforeSpans,
        TRANSCRIPT_COPY_LIMITS,
      )
      .catch(logError);
    if (S?.anchorFallback)
      logFeatureSad(
        "ccr_client_rows_owed",
        S.anchorFallback === "rejected" ? "after_event_id_rejected" : "after_event_id_not_found",
      );
    if (S?.overBound) {
      let A = {
        page_count: S.stats.pageCount,
        ...(S.stats.bytesReceived !== null && {
          bytes_received: S.stats.bytesReceived,
        }),
        spans: h.length,
      };
      if (S.anchorFallback || rowsLoaded.length === 0) {
        logFeatureSad("ccr_client_rows_owed", "transcript_read_over_the_bound_will_retry", A);
        await ccrClient.tryClientRowsOwedByEarlierWorkers(undefined);
        return;
      }
      logFeatureBad("ccr_client_rows_owed", "transcript_read_over_the_bound_gave_up", A);
      ccrClient.giveUpClientRowsOwedByEarlierWorkers();
      return;
    }
    if (!S || S.encodedBody) {
      logFeatureSad("ccr_client_rows_owed", S ? "transcript_read_compressed" : "transcript_read_failed");
      await ccrClient.tryClientRowsOwedByEarlierWorkers(undefined);
      return;
    }
    let flattened = S.events.flatMap((event) =>
      !event.session_agent_id && isTranscriptMessage(event.payload) ? [event.payload] : [],
    );
    let P = [];
    try {
      let A = new Set(dropRetractedMessages(flattened));
      let x = sessionIdBody(ccrClient.sessionId);
      let U = new Set(rowsLoaded.map((G) => G.uuid));
      let flattened_2 = S.events.flatMap((event) => (event.session_agent_id ? [] : [event.payload]));
      let T = new Set(
        flattened_2
          .slice(
            0,
            flattened_2.findLastIndex(
              (G) => U.has(G.uuid) || (G.type === "last-prompt" && G.rewound === true),
            ) + 1,
          )
          .filter((G) => !U.has(G.uuid)),
      );
      let { rows, leftOut } = selectRowsToResend(h, flattened, (G) => {
        if (!A.has(G) || isHiddenFromCatchUp(G) || T.has(G)) return false;
        return G.type === "assistant" && (x === "" || G.shownAsStoredIn !== x) ? "nor_any_after_it" : true;
      });
      if (rows.length === 0) {
        if (leftOut === "nothing")
          logFeatureOk("ccr_client_rows_owed", {
            rows: 0,
            event_count: S.events.length,
            after_event_id_sent: lastRowBeforeSpans !== undefined,
          });
        else logFeatureBad("ccr_client_rows_owed", leftOut);
        ccrClient.giveUpClientRowsOwedByEarlierWorkers();
        return;
      }
      if (leftOut !== "nothing") logFeatureSad("ccr_client_rows_owed", leftOut);
      for (let G of rows)
        for (let L of normalizeMessage(
          G.type === "assistant"
            ? {
                ...G,
                message: {
                  ...G.message,
                  content: stripMemoryTagsFromBlocks(G.message.content),
                },
              }
            : G,
        ))
          if (L.type === "assistant" || L.type === "user")
            P.push({
              ...L,
              historical: true,
            });
      if (P.length === 0) throw Error("the rows owed make no client row");
    } catch (error) {
      logError(error);
      logFeatureBad("ccr_client_rows_owed", "rows_not_prepared");
      ccrClient.giveUpClientRowsOwedByEarlierWorkers();
      return;
    }
    if (
      !(await ccrClient.tryClientRowsOwedByEarlierWorkers(flattened.at(-1)?.uuid).then(
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
    if (P.length > MAX_ROW_AGE_MS) logFeatureSad("ccr_client_rows_owed", "client_rows_over_the_limit");
    await ccrClient.sendOwedClientRowsAgain(P.slice(-MAX_ROW_AGE_MS));
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
//@ chunk-z4g2ta8k.js:50891-51099 placement
/**
 * 判断入站消息类型是否不在本地直接处理的集合中（user、bash_command、control_response 等以外）。
 */
function isUnhandledIngressType(e) {
  return (
    e.type !== "user" &&
    e.type !== "bash_command" &&
    e.type !== "control_response" &&
    e.type !== "queued_notification" &&
    e.type !== "workflow_launch" &&
    e.type !== "session_notice" &&
    e.type !== "control_request"
  );
}
//@ chunk-z4g2ta8k.js:51099-51290 placement = extractErrorTypeFromData (1)
/**
 * 内容是否含格式不对的文本块（非对象、text 不是字符串等）。
 */
function hasMalformedTextBlocks(data) {
  return (
    data != null &&
    typeof data !== "string" &&
    (!Array.isArray(data) ||
      data.some(
        (n) =>
          n === null ||
          typeof n !== "object" ||
          ("type" in n && n.type === "text" && (!("text" in n) || typeof n.text !== "string")),
      ))
  );
}
//@ chunk-z4g2ta8k.js:51290-51412 placement
/**
 * 取入站用户消息的内容：需要清理且非受信来源时去掉 system-reminder 并清理文本块，否则原样返回。
 */
function ingressPromptContent(e, n, r) {
  let content = e.message.content;
  if (!n || r) return content;
  return typeof content === "string"
    ? stripSystemReminders(content)
    : Array.isArray(content)
      ? sanitizeTextBlocks(content)
      : content;
}
//@ chunk-z4g2ta8k.js:51412-51467 placement
/**
 * 入站提示内容转义：未开启或已转义时原样返回，否则按来源转义插件标签。
 */
function escapePromptUnlessDisabled(e, n, r, inboundOrigin) {
  if (!n || r) return e;
  return escapePluginTags(e, inboundOrigin);
}
//@ chunk-z4g2ta8k.js:51467-52157 placement
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
//@ chunk-z4g2ta8k.js:52157-52221 placement
/**
 * 先取入站提示内容再做插件标签转义的组合入口。
 */
function escapedIngressPrompt(e, n, r) {
  return escapePromptUnlessDisabled(ingressPromptContent(e, n, r), n, r, e.inbound_origin);
}
//@ chunk-z4g2ta8k.js:52221-52434 placement
/**
 * 判断入站消息是否是会话收件箱的唤醒事件（开关开启时解析外部事件唤醒），是则返回唤醒对象。
 */
function resolveInboxWakeFor(e, n, wakeEnvelope) {
  if (!isNotificationOrigin(n)) return;
  let s = externalEventRecordIfEnabled(wakeEnvelope);
  {
    if (typeof e !== "string") return;
    let { resolveExternalEventWake, isSessionInboxWake } = require("./chunk-7v894jnd.js");
    let externalEventWake = resolveExternalEventWake(e, s);
    return externalEventWake !== null && isSessionInboxWake(externalEventWake)
      ? externalEventWake
      : undefined;
  }
  return;
}
//@ chunk-z4g2ta8k.js:52434-52619 placement
/**
 * 提取 Projects 中继消息的元数据：中继消息 id、校验过的中继行与线程时间戳。
 */
function relayMessageMeta(e, n) {
  if (!isProjectsRelay(n)) return {};
  let r = relayThreadTsOf(e);
  let relayMessageIds = parseRelayMessageIds(e);
  if (relayMessageIds === undefined)
    return r !== undefined && isRelayPrompt(e)
      ? {
          threadTs: r,
        }
      : {};
  let relayRows = parseRelayRows(e, relayMessageIds);
  return {
    messageIds: relayMessageIds,
    ...(relayRows && {
      rows: relayRows,
    }),
    ...(r && {
      threadTs: r,
    }),
  };
}
//@ chunk-z4g2ta8k.js:52619-52956 placement
/**
 * 记录 Projects 中继入站的特性状态：开关关闭或无中继 id、中继行被拒，或成功（id、行与附注数量）。
 */
function logProjectsRelayAdmission(e, n, rows) {
  let s = isRelayPrompt(e);
  if (!isProjectsRelay(n)) {
    logFeatureSad("bridge_projects_relay", resolvedRowsMode() === "off" || s ? "flag_off" : "no_relay_ids");
    return;
  }
  let relayMessageIds = parseRelayMessageIds(e);
  if (rows === undefined && e.relay_rows !== undefined) {
    logFeatureBad("bridge_projects_relay", "rows_rejected", {
      id_count: relayMessageIds?.length ?? 0,
    });
    return;
  }
  logFeatureOk("bridge_projects_relay", {
    id_count: relayMessageIds?.length ?? 0,
    row_count: rows?.length ?? 0,
    note_count: s ? 1 : 0,
  });
}
//@ chunk-z4g2ta8k.js:52956-53223 placement
function describeIngressOrigin(e, n, r, s, flagsSettled, y = false) {
  if (r && !s) {
    let S = describeProjectsHumanOrigin(
      n,
      e.client_platform,
      e.inbound_origin,
      receiverGroupingIdOf(e),
      activityObservationOf(e),
      isProjectsHumanOriginEnabled({
        flagsSettled,
      }),
      resolvedRowsMode() !== "off" &&
        isNonHumanRelayMessage({
          relayMessageIds: parseRelayMessageIds(e),
          isSynthetic: e.isSynthetic,
          coordinatorNote: isRelayPrompt(e) && isSunnyAnchorOff(),
        }),
      sanitizeAddressPart(e.from_plugin),
      y,
    );
    return withScheduledTriggerFireReason(S, e);
  }
  return;
}
//@ chunk-z4g2ta8k.js:53223-53235 placement
var GROWTHBOOK_SETTLE_BUDGET_MS = 2000;
//@ chunk-z4g2ta8k.js:53235-53647 placement
/**
 * 等 GrowthBook 初始化（带截止时间），拿到的特性不新鲜时在剩余时间内再刷新一次；仍不新鲜时记诊断日志 cli_user_frame_flag_settle，返回是否已就绪。
 */
async function awaitGrowthBookSettled(context) {
  let startTime = performance.now();
  let r = await withDeadline(
    initializeGrowthBook().then(
      () => "resolved",
      () => "failed",
    ),
    GROWTHBOOK_SETTLE_BUDGET_MS,
  );
  let s = r === "resolved" && hasFreshGrowthBookFeatures();
  if (r === "resolved" && !s) {
    let h = GROWTHBOOK_SETTLE_BUDGET_MS - (performance.now() - startTime);
    if (h > 0) {
      await withDeadline(
        refreshGrowthBookFeatures().catch(() => {
          return;
        }),
        h,
      );
      s = hasFreshGrowthBookFeatures();
    }
  }
  if (!s)
    logForDiagnosticsNoPII("warn", "cli_user_frame_flag_settle", () => ({
      ...context,
      ms: Math.round(performance.now() - startTime),
      deadline_ms: GROWTHBOOK_SETTLE_BUDGET_MS,
      timed_out: r === undefined,
      failed: r === "failed",
      no_payload: r === "resolved",
    }));
  return s;
}
//@ chunk-z4g2ta8k.js:53647-53705 placement
var TRIGGER_FIRE_REASONS = new Set(["scheduled", "retry", "catch_up", "manual"]);
//@ chunk-z4g2ta8k.js:53705-53808 placement
function isServerDeliveredOrigin(e) {
  return (
    e.inbound_origin === undefined ||
    (e.inbound_origin === "trigger_fire" && TRIGGER_FIRE_REASONS.has(triggerFireReasonOf(e) ?? ""))
  );
}
//@ chunk-z4g2ta8k.js:53808-53939 placement
/**
 * 为云端浏览器回合准备入站消息：标记是否由服务器投递，以及会话是否持有云浏览器 MCP。
 */
function prepareCloudBrowserTurn(e, { deliveredByServer }) {
  return cloudBrowserTurnId(e, {
    deliveredByServer: deliveredByServer && isServerDeliveredOrigin(e),
    holdsCloudBrowser: () => isCoworkWithRemote() && (getMcpClientsFromAccessor() ?? []).some(toScopedConfig),
  });
}
//@ chunk-z4g2ta8k.js:53939-53991 placement
var TURN_RUNNING_STATE = identity(
  {
    running: undefined,
  },
  (e) => {
    e.running = undefined;
  },
);
//@ chunk-z4g2ta8k.js:53991-54619 placement
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
  if (TURN_RUNNING_STATE.running === undefined) {
    let s = refreshGrowthBookFeatures()
      .catch(() => {
        return;
      })
      .finally(() => {
        if (TURN_RUNNING_STATE.running === s) TURN_RUNNING_STATE.running = undefined;
      });
    TURN_RUNNING_STATE.running = s;
  }
  logFeatureSad("ccr_cloud_browser_turn_id", "flags_unsettled");
  return {
    admitted: false,
    flagSettleMs,
  };
}
//@ chunk-z4g2ta8k.js:54619-55433 placement
async function classifyInboundLane(e, fields) {
  let flagsSettled = isHearthOrigin(fields.inboundOrigin)
    ? await awaitGrowthBookSettled({
        lane: "bridge",
      })
    : undefined;
  let isSynthetic = "isSynthetic" in e && e.isSynthetic === true;
  let h = describeProjectsHumanOrigin(
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
        relayMessageIds: parseRelayMessageIds(e),
        isSynthetic,
        coordinatorNote: isRelayPrompt(e) && isSunnyAnchorOff(),
      }),
  );
  let y = h?.kind === "peer" || h?.kind === "slack-ping" ? undefined : h;
  let { messageIds, rows, threadTs } = relayMessageMeta(e, y);
  if (fields.inboundOrigin === HEARTH_AGENT) logProjectsRelayAdmission(e, y, rows);
  let isRelayHuman = isKnownHumanOrigin(
    fields.inboundOrigin,
    isProjectsHumanOriginEnabled({
      flagsSettled,
    }),
  );
  let A = isPeerOrigin({
    isRelayHuman,
    isSynthetic,
    ccrTurnId: pickTurnIdForRelay(e, {
      isRelayHuman,
    }),
    isProjectsUser: isHearthHuman(fields.inboundOrigin),
  });
  return {
    ingressOrigin: h,
    isRelayHuman,
    isSynthetic,
    stamps: {
      ...A,
      ...(A.projectsUserTurn && {
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
//@ chunk-z4g2ta8k.js:55433-55496 placement
function teammateSenderOf(e, n) {
  return e ? (e.kind === "peer" ? e.from : undefined) : getTeammateMessageSender(n);
}
//@ chunk-z4g2ta8k.js:55496-55602 placement
/**
 * 判断入站帧是否来自人类用户（非对等会话转发，按入站来源、远程 IO 与客户端平台判断）。
 */
function isHumanIngressFrame(e, n) {
  return (
    !n.peerFrom &&
    shouldTreatInboundAsHuman(n.ingressOrigin, n.isRemoteIO, e.client_platform, e.inbound_origin)
  );
}
//@ chunk-z4g2ta8k.js:55602-55776 placement
/**
 * 人类用户入站帧中取出被撤回的文件 uuid 列表。
 */
function withdrawnFileUuidsOf(e, n) {
  let withdrawnFileUuids = "withdrawn_file_uuids" in e ? e.withdrawn_file_uuids : undefined;
  return Array.isArray(withdrawnFileUuids) && isHumanIngressFrame(e, n)
    ? {
        withdrawnFileUuids: withdrawnFileUuids.filter(
          (withdrawnFileUuid) => typeof withdrawnFileUuid === "string",
        ),
      }
    : {};
}
//@ chunk-z4g2ta8k.js:55776-56091 placement
/**
 * 判断一条入站用户消息是否算真人发起的新回合：排除本地前置、对等方、元消息、客户端合成、召唤种子、非 user 发起者，远程 IO 下还要求不是合成消息且来源可信。
 */
function isUserTypedTurn(e, n) {
  return (
    !n.isLocallyPrepended &&
    !n.peerFrom &&
    !n.wasStartedBefore &&
    e.shouldQuery !== false &&
    e.is_meta !== true &&
    e.client_composed !== true &&
    e.seeded_summon !== true &&
    (e.initiator === undefined || e.initiator === "user") &&
    (n.isRemoteIO
      ? !e.isSynthetic && isHumanInboundMessage(e, "remote-worker", n.projectsHumanEnabled)
      : !hasNonHumanOrigin(e.origin, e.isSynthetic))
  );
}
//@ chunk-z4g2ta8k.js:56091-56162 placement
/**
 * 把入站附件与文件解析后前置到用户帧（isHumanIngressFrame 决定是否需要人工提示）。
 */
function prependIngressFiles(e, n, r, s, h, y, S, namedByIdHash = false) {
  return resolveAndPrepend(e, n, isHumanIngressFrame(e, r), s, h, y, S, false, namedByIdHash);
}
//@ chunk-z4g2ta8k.js:56162-56288 placement
function nonPeerOriginOf(e, n, r) {
  let s = refineInboundOrigin(e, n.client_platform, n.inbound_origin);
  if (!r && s?.kind === "human" && hasNonHumanOrigin(n.origin, false)) return;
  return s;
}
//@ chunk-z4g2ta8k.js:56288-56311 placement
function isMossySquidGateForceOff() {
  return false;
}
//@ chunk-z4g2ta8k.js:56311-56390 placement
function isSyntheticTriggerReleaseEnabled() {
  if (isMossySquidGateForceOff())
    return getFeatureValue_CACHED_MAY_BE_STALE(MOSSY_SQUID_GATE, false) === true;
  return (
    hasFreshGrowthBookFeatures() &&
    !hasGrowthBookUsedNonDefaultHost() &&
    getAllGrowthBookFeatures()[MOSSY_SQUID_GATE] === true
  );
}
//@ chunk-z4g2ta8k.js:56390-56472 placement
/**
 * 判断是否为合成请求帧且 origin 属于触发器来源（且 GrowthBook 可用、未强制关）。
 */
function isSyntheticTriggerFrame(e) {
  return (
    Boolean(e.isSynthetic) &&
    isTriggerFireOrigin(e.inbound_origin) &&
    isGrowthBookEnabled() &&
    !isMossySquidGateForceOff()
  );
}
//@ chunk-z4g2ta8k.js:56472-56520 placement
var TAKEN_PROMISE_HOLDER = identity(
  {
    taken: undefined,
  },
  (e) => {
    e.taken = undefined;
  },
);
//@ chunk-z4g2ta8k.js:56520-56578 placement
/**
 * 一次性取 promise：第一次调用时执行并缓存，之后返回同一 promise（失败归一为 undefined）。
 */
function takeOnce(e) {
  return (TAKEN_PROMISE_HOLDER.taken ??= e().catch(() => {
    return;
  }));
}
//@ chunk-z4g2ta8k.js:56578-56884 placement
/**
 * 触发器 origin 到任务通知类型的映射表。
 */
var Un = Object.freeze({
  kind: "unclassified",
});
var ws = Object.freeze({
  kind: "task-notification",
  subkind: "scheduled-trigger",
});
var TRIGGER_ORIGIN_KINDS = {
  "fired-prompt": ws,
  "beside-a-fire": Un,
  nobody: Un,
  "projects-relay": "as classified",
  "unvouched-fire": undefined,
  person: undefined,
  "peer-send-message": undefined,
  "session-inbox": undefined,
  delivery: undefined,
};
//@ chunk-z4g2ta8k.js:56884-57186 placement
/**
 * 对合成消息的发送方分类：无、人、投递、其他子类型、未担保的定时触发、定时触发的提示或其旁带消息。
 */
function classifySyntheticSender(e, n, r) {
  if (r === undefined) return "nobody";
  if (r.kind === "human") return "person";
  if (r.subkind === undefined) return "delivery";
  if (r.subkind !== "scheduled-trigger") return r.subkind;
  if (!isScheduledTriggerOrigin(n)) return "unvouched-fire";
  return triggerFireReasonOf(e) !== undefined && e.shouldQuery !== false && e.priority !== "now"
    ? "fired-prompt"
    : "beside-a-fire";
}
//@ chunk-z4g2ta8k.js:57186-57424 placement
function syntheticFrameOrigin(e, n) {
  if (e === "fired-prompt" || e === "beside-a-fire") {
    let s = isSyntheticTriggerReleaseEnabled();
    logForDebugging(
      `[ingress] synthetic trigger_fire frame: ${e}, ${s ? "labelled" : "left with no origin (the flag reads off)"}`,
    );
    if (!s) return;
  }
  let r = TRIGGER_ORIGIN_KINDS[e];
  return r === "as classified" ? n : r;
}
//@ chunk-z4g2ta8k.js:57424-57655 placement
/**
 * 解析入站消息的各种来源：入站来源、对等发送方、非对等来源与排队命令的来源。
 */
function resolveIngressOrigins(e, n, r, s, flagsSettled, y = false) {
  let S = describeIngressOrigin(e, n, r, s, flagsSettled, y);
  let k = nonPeerOriginOf(S, e, r);
  let queuedOrigin = e.isSynthetic
    ? syntheticFrameOrigin(classifySyntheticSender(e, S, k), k)
    : (k ??
      (r
        ? humanOriginWhenNotSynthetic(e.client_platform, e.inbound_origin)
        : resolveIngressOrigin(e.origin, false)));
  return {
    ingressOrigin: S,
    peerFrom: teammateSenderOf(S, n),
    nonPeerOrigin: k,
    queuedOrigin,
  };
}
//@ chunk-z4g2ta8k.js:57655-57745 placement
/**
 * 取入站帧的 initiator（非空字符串时返回，否则 undefined）。
 */
function initiatorOfFrame(e) {
  return typeof e.initiator === "string" && e.initiator !== "" ? e.initiator : undefined;
}
//@ chunk-z4g2ta8k.js:57745-58301 placement
/**
 * 计算入站消息提交时的附加标志：客户端合成/召唤或非真人来源时跳过附件；本地真人键入标记 localStdinOrigin；真人消息带 requeueIfInterruptedWithinMs。
 */
function ingressSubmitFlags({ message, isRemoteIO, isRelayHuman, queuedOrigin, nonPeerOrigin }) {
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
  };
}
//@ chunk-z4g2ta8k.js:58301-58393 placement
/**
 * 判断入站帧是否由人类撰写：已标记、client_composed 或非键入文本、邮件人类来源。
 */
function isHumanComposedFrame(e, peerFrom) {
  return (
    Boolean(peerFrom) || e.client_composed === true || isTextNotTyped(e) || e.inbound_origin === EMAIL_HUMAN
  );
}
//@ chunk-z4g2ta8k.js:58393-58485 placement
function clampRequeueWindowMs(requeueIfInterruptedWithinMs) {
  return typeof requeueIfInterruptedWithinMs === "number" &&
    Number.isInteger(requeueIfInterruptedWithinMs) &&
    requeueIfInterruptedWithinMs >= 1
    ? Math.min(requeueIfInterruptedWithinMs, 1e4)
    : undefined;
}
//@ chunk-z4g2ta8k.js:58512-58649 placement
function createWorkerEventsTransport(url, headers = {}, r = {}) {
  let transportForUrl = getTransportForUrl(new As(url.href));
  transportForUrl.pathname = transportForUrl.pathname.replace(/\/$/, "") + "/worker/events/stream";
  return new SSETransport(transportForUrl, headers, r);
}
//@ chunk-z4g2ta8k.js:58649-59551 placement
/**
 * worker 事件流常量：hello 超时与重拨上限、续期/批处理/心跳节奏、心跳被拒状态、socket 超时、消息体上限与预留、事件路径种类，以及 hello/ack/event 帧的 zod schema。
 */
var WORKER_EVENT_STREAMS = /^(?:client|server)_(?:no_context_takeover|max_window_bits(?:=\d+)?)$/;
var HELLO_TIMEOUT_MS = 5000;
var MAX_DIALS_WITHOUT_HELLO = 2;
var MAX_REDIALS_WITHOUT_HELLO = 5;
var MAX_UNACCEPTED_ENDS = 2;
var RENEWAL_INTERVAL_MS = 5000;
var MAX_BATCH_SERVER_ERRORS = 3;
var HEARTBEAT_INTERVAL_MS = 5000;
var HEARTBEAT_REFUSED_STATUSES = new Set([409, 429]);
var SOCKET_UNSERVED_TIMEOUT_MS = 60000;
var DEFAULT_MAX_MESSAGE_BYTES = 8388608;
var MESSAGE_BYTES_RESERVE = 65536;
var WORKER_EVENT_PATH_KINDS = new Map([
  ["/worker/events", "client_events"],
  ["/worker/internal-events", "worker_events"],
]);
var workerEventFrameSchema = DoctorLazy(() =>
  u({
    hello: u({
      mode: string().optional(),
      server_time: string().optional(),
      keep_alive_interval_seconds: E().optional(),
      session_writers: string().optional(),
      attestation_policy: string().optional(),
      max_message_bytes: E().int().positive().optional().catch(undefined),
    }).optional(),
    ack: u({
      id: E(),
      error: u({
        status: E().optional(),
        type: string().optional(),
        retry_after_seconds: E().optional(),
        conflict_reason: string().optional(),
      }).optional(),
      client_events: unknown().optional(),
      worker_events: unknown().optional(),
      heartbeat: unknown().optional(),
    }).optional(),
    event: record(string(), unknown()).optional(),
    keep_alive: u({}).optional(),
  }),
);
var sequenceNumReplySchema = DoctorLazy(() =>
  u({
    sequence_num: union([E().int().positive(), string().regex(/^[1-9]\d*$/)]),
  }),
);
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
  prepareCloudBrowserTurn,
  admitCloudBrowserTurnId,
  escapePromptUnlessDisabled,
  withdrawnFileUuidsOf,
  ingressSubmitFlags,
  hasMalformedTextBlocks,
  isHumanIngressFrame,
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
