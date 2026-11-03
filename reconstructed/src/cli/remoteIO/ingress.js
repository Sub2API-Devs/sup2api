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
import { URL as Zn, URL as As } from "url";
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
import { findLastRowBeforeSpans, selectRowsToResend, fUr } from "../transports/ccrClient.js";
import { isTranscriptMessage } from "../../utils/sessionStorage.js";
import { isHiddenFromCatchUp, us, ls } from "./workerAuth.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { dropRetractedMessages_2 as dropRetractedMessages } from "../../utils/transcript/deserialize.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { normalizeMessage } from "../../utils/queryHelpers.js";
import { stripMemoryTagsFromBlocks } from "../../services/orgMemory/promptIndex.js";
import { stripSystemReminders } from "../../components/messageActions.js";
import {
  sanitizeTextBlocks,
  ost,
  awe,
  ydi,
  describeProjectsHumanOrigin,
  E9o,
  v9o,
  w9o,
  withScheduledTriggerFireReason,
  Zqt,
  nEn,
  isPeerOrigin,
  Vsr,
  getTeammateMessageSender,
  bdi,
  isHumanInboundMessage,
  refineInboundOrigin,
  Zwn,
  S9o,
  Die,
  Ksr,
  EMAIL_HUMAN,
} from "../../bridge/inboundMessageOrigin.js";
import { escapePluginTags } from "../../utils/messages/pluginTags.js";
import { VIA_SESSION_CHANNEL } from "./servedCalls.js";
import { isProjectsHumanOriginEnabled } from "../../utils/crossSessionMessagingGate.js";
import { LZn } from "../../utils/promptSubmissionOrigin.js";
import {
  isPeerOrSlackPing,
  isProjectsRelay,
  hasNonHumanOrigin,
  resolveIngressOrigin,
  isHumanOrAutoContinuation,
} from "../../utils/messageProvenance.js";
import { buildExternalEventRecord, externalEventRecordIfEnabled } from "../../utils/externalEventRecords.js";
import { aO } from "../../utils/historyFile.js";
import {
  Eis,
  parseRelayMessageIds,
  isRelayPrompt,
  parseRelayRows,
  HEARTH_AGENT,
  HEARTH_HUMAN,
} from "../../services/projectsRelay/relayConfig.js";
import { resolvedRowsMode, mKo } from "../../services/projects/threadRows.js";
import { sanitizeAddressPart } from "../../utils/swarm/teammateIds.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { cloudBrowserTurnId, t8n } from "../../services/mcp/ccrTurnId.js";
import { isCoworkWithRemote } from "../../utils/sessionShape.js";
import { getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { toScopedConfig, isRemoteBrowserModeFloorOn } from "../../utils/permissions/remoteBrowser.js";
import { ge } from "../../utils/identity.js";
import { resolveAndPrepend } from "../../bridge/inboundAttachments.js";
import { MOSSY_SQUID_GATE } from "../../services/api/withRetry.js";
import { isScheduledTriggerOrigin } from "../../utils/turnOrigin.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTextNotTyped } from "../../entrypoints/sdk/coreSchemas.js";
import { getTransportForUrl } from "../transports/transportUtils.js";
import { SSETransport } from "../transports/SSETransport.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, o, E, oe, pe, Ue } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-z4g2ta8k.js:48124-48136 placement
var fs = 2000;
/**
 * 构造入站消息的就绪检查对象：中继行已加载标志、带超时的特性开关加载，以及是否存在 MessageDisplay 钩子。
 */
//@ chunk-z4g2ta8k.js:48136-48291 placement
function createIngressReadiness(e, n, r) {
  return {
    rowsLoaded: r,
    flagsLoaded: () =>
      withDeadline(
        initializeGrowthBook().catch(() => null),
        fs,
      ),
    hasDisplayHooks: () =>
      hasSettingsHookForEvent("MessageDisplay", n, e.id) || dispatchClassicEvent("MessageDisplay"),
  };
}
//@ chunk-z4g2ta8k.js:48291-50891 placement
async function catchUpClientRows(
  e,
  { flagsLoaded: flagsLoaded, hasDisplayHooks: hasDisplayHooks, rowsLoaded: rowsLoaded },
) {
  try {
    let clientRowsOwedByEarlierWorkers = await e.clientRowsOwedByEarlierWorkers(flagsLoaded);
    if (clientRowsOwedByEarlierWorkers.length === 0) return;
    let y = findLastRowBeforeSpans(
        clientRowsOwedByEarlierWorkers,
        rowsLoaded,
        (A) => isTranscriptMessage(A) && !isHiddenFromCatchUp(A),
      ),
      S = await e.readInternalEventsForCatchUp(AbortSignal.timeout(us), y, ls).catch(logError);
    if (S?.anchorFallback)
      logFeatureSad(
        "ccr_client_rows_owed",
        S.anchorFallback === "rejected" ? "after_event_id_rejected" : "after_event_id_not_found",
      );
    if (S?.overBound) {
      let A = {
        page_count: S.stats.pageCount,
        ...(S.stats.bytesReceived !== null && { bytes_received: S.stats.bytesReceived }),
        spans: clientRowsOwedByEarlierWorkers.length,
      };
      if (S.anchorFallback || rowsLoaded.length === 0) {
        (logFeatureSad("ccr_client_rows_owed", "transcript_read_over_the_bound_will_retry", A),
          await e.tryClientRowsOwedByEarlierWorkers(void 0));
        return;
      }
      (logFeatureBad("ccr_client_rows_owed", "transcript_read_over_the_bound_gave_up", A),
        e.giveUpClientRowsOwedByEarlierWorkers());
      return;
    }
    if (!S || S.encodedBody) {
      (logFeatureSad("ccr_client_rows_owed", S ? "transcript_read_compressed" : "transcript_read_failed"),
        await e.tryClientRowsOwedByEarlierWorkers(void 0));
      return;
    }
    let flattened = S.events.flatMap((event) =>
        !event.session_agent_id && isTranscriptMessage(event.payload) ? [event.payload] : [],
      ),
      P = [];
    try {
      let A = new Set(dropRetractedMessages(flattened)),
        x = sessionIdBody(e.sessionId),
        U = new Set(rowsLoaded.map((G) => G.uuid)),
        flattened_2 = S.events.flatMap((event) => (event.session_agent_id ? [] : [event.payload])),
        T = new Set(
          flattened_2
            .slice(
              0,
              flattened_2.findLastIndex(
                (G) => U.has(G.uuid) || (G.type === "last-prompt" && G.rewound === !0),
              ) + 1,
            )
            .filter((G) => !U.has(G.uuid)),
        ),
        { rows: rows, leftOut: leftOut } = selectRowsToResend(
          clientRowsOwedByEarlierWorkers,
          flattened,
          (G) => {
            if (!A.has(G) || isHiddenFromCatchUp(G) || T.has(G)) return !1;
            return G.type === "assistant" && (x === "" || G.shownAsStoredIn !== x) ? "nor_any_after_it" : !0;
          },
        );
      if (rows.length === 0) {
        if (leftOut === "nothing")
          logFeatureOk("ccr_client_rows_owed", {
            rows: 0,
            event_count: S.events.length,
            after_event_id_sent: y !== void 0,
          });
        else logFeatureBad("ccr_client_rows_owed", leftOut);
        e.giveUpClientRowsOwedByEarlierWorkers();
        return;
      }
      if (leftOut !== "nothing") logFeatureSad("ccr_client_rows_owed", leftOut);
      for (let G of rows)
        for (let L of normalizeMessage(
          G.type === "assistant"
            ? { ...G, message: { ...G.message, content: stripMemoryTagsFromBlocks(G.message.content) } }
            : G,
        ))
          if (L.type === "assistant" || L.type === "user") P.push({ ...L, historical: !0 });
      if (P.length === 0) throw Error("the rows owed make no client row");
    } catch (error) {
      (logError(error),
        logFeatureBad("ccr_client_rows_owed", "rows_not_prepared"),
        e.giveUpClientRowsOwedByEarlierWorkers());
      return;
    }
    if (
      !(await e.tryClientRowsOwedByEarlierWorkers(flattened.at(-1)?.uuid).then(
        () => !0,
        (A) => (logError(A), !1),
      ))
    ) {
      logFeatureSad("ccr_client_rows_owed", "try_report_failed");
      return;
    }
    if (hasDisplayHooks()) {
      (logFeatureBad("ccr_client_rows_owed", "display_hooks_configured"),
        e.giveUpClientRowsOwedByEarlierWorkers());
      return;
    }
    if (P.length > fUr) logFeatureSad("ccr_client_rows_owed", "client_rows_over_the_limit");
    await e.sendOwedClientRowsAgain(P.slice(-fUr));
  } catch (error) {
    logError(
      Error("sending earlier workers' owed client rows again failed; the worker starts anyway", {
        cause: error,
      }),
    );
  } finally {
    e.setDisplayHooksProbe(hasDisplayHooks);
  }
}
/**
 * 判断入站消息类型是否不在本地直接处理的集合中（user、bash_command、control_response 等以外）。
 */
//@ chunk-z4g2ta8k.js:50891-51099 placement
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
/**
 * 内容是否含格式不对的文本块（非对象、text 不是字符串等）。
 */
//@ chunk-z4g2ta8k.js:51099-51290 placement = extractErrorTypeFromData (1)
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
/**
 * 取入站用户消息的内容：需要清理且非受信来源时去掉 system-reminder 并清理文本块，否则原样返回。
 */
//@ chunk-z4g2ta8k.js:51290-51412 placement
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
function zPr(e, n, r, s) {
  if (!n || r) return e;
  return escapePluginTags(e, s);
}
/**
 * 把会话通道上收到的用户帧转成外部事件记录：内容格式不对、来自对等方或不满足"会话通道真人输入"条件时返回 null；非对等/Slack 点名的消息还会附上粘贴内容。
 */
//@ chunk-z4g2ta8k.js:51467-52157 placement
function sessionChannelPromptRecord(event) {
  let content = event.message?.content;
  if ((typeof content !== "string" && !Array.isArray(content)) || hasMalformedTextBlocks(content))
    return null;
  let frame = { ...event, message: { content: content }, [VIA_SESSION_CHANNEL]: !0 },
    promptContent = ingressPromptContent(frame, !0, !1),
    {
      ingressOrigin: ingressOrigin,
      peerFrom: peerFrom,
      nonPeerOrigin: nonPeerOrigin,
      queuedOrigin: queuedOrigin,
    } = resolveIngressOrigins(frame, promptContent, !0, !1, void 0);
  if (peerFrom !== void 0) return null;
  let isRelayHuman = ingressOrigin
      ? ost(frame.inbound_origin, isProjectsHumanOriginEnabled({ flagsSettled: void 0 }))
      : awe(frame.client_platform, frame.inbound_origin),
    submission = ingressSubmitFlags({
      message: frame,
      isRemoteIO: !0,
      isRelayHuman: isRelayHuman,
      queuedOrigin: queuedOrigin,
      nonPeerOrigin: nonPeerOrigin,
    });
  if (
    !LZn({
      submittedBySessionChannelPerson: submission.sessionChannelPersonTyped === !0,
      dispatchedOverBridge: !1,
      submissionVerifiedSlackHumanTurn: isRelayHuman,
    })
  )
    return null;
  let record = zPr(promptContent, !0, !1, frame.inbound_origin);
  if (!isPeerOrSlackPing(ingressOrigin))
    record = buildExternalEventRecord(record, event.pasted_content, event.inline_pastes);
  return aO(record);
}
//@ chunk-z4g2ta8k.js:52157-52221 placement
function ZDs(e, n, r) {
  return zPr(ingressPromptContent(e, n, r), n, r, e.inbound_origin);
}
/**
 * 判断入站消息是否是会话收件箱的唤醒事件（开关开启时解析外部事件唤醒），是则返回唤醒对象。
 */
//@ chunk-z4g2ta8k.js:52221-52434 placement
function resolveInboxWakeFor(e, n, r) {
  if (!ydi(n)) return;
  let s = externalEventRecordIfEnabled(r);
  {
    if (typeof e !== "string") return;
    let {
        resolveExternalEventWake: resolveExternalEventWake,
        isSessionInboxWake: isSessionInboxWake,
      } = require("./chunk-7v894jnd.js"),
      S = resolveExternalEventWake(e, s);
    return S !== null && isSessionInboxWake(S) ? S : void 0;
  }
  return;
}
/**
 * 提取 Projects 中继消息的元数据：中继消息 id、校验过的中继行与线程时间戳。
 */
//@ chunk-z4g2ta8k.js:52434-52619 placement
function relayMessageMeta(e, n) {
  if (!isProjectsRelay(n)) return {};
  let r = Eis(e),
    s = parseRelayMessageIds(e);
  if (s === void 0) return r !== void 0 && isRelayPrompt(e) ? { threadTs: r } : {};
  let h = parseRelayRows(e, s);
  return { messageIds: s, ...(h && { rows: h }), ...(r && { threadTs: r }) };
}
/**
 * 记录 Projects 中继入站的特性状态：开关关闭或无中继 id、中继行被拒，或成功（id、行与附注数量）。
 */
//@ chunk-z4g2ta8k.js:52619-52956 placement
function logProjectsRelayAdmission(e, n, r) {
  let s = isRelayPrompt(e);
  if (!isProjectsRelay(n)) {
    logFeatureSad("bridge_projects_relay", resolvedRowsMode() === "off" || s ? "flag_off" : "no_relay_ids");
    return;
  }
  let h = parseRelayMessageIds(e);
  if (r === void 0 && e.relay_rows !== void 0) {
    logFeatureBad("bridge_projects_relay", "rows_rejected", { id_count: h?.length ?? 0 });
    return;
  }
  logFeatureOk("bridge_projects_relay", {
    id_count: h?.length ?? 0,
    row_count: r?.length ?? 0,
    note_count: s ? 1 : 0,
  });
}
//@ chunk-z4g2ta8k.js:52956-53223 placement
function describeIngressOrigin(e, n, r, s, h, y = !1) {
  if (r && !s) {
    let S = describeProjectsHumanOrigin(
      n,
      e.client_platform,
      e.inbound_origin,
      E9o(e),
      v9o(e),
      isProjectsHumanOriginEnabled({ flagsSettled: h }),
      resolvedRowsMode() !== "off" &&
        w9o({
          relayMessageIds: parseRelayMessageIds(e),
          isSynthetic: e.isSynthetic,
          coordinatorNote: isRelayPrompt(e) && mKo(),
        }),
      sanitizeAddressPart(e.from_plugin),
      y,
    );
    return withScheduledTriggerFireReason(S, e);
  }
  return;
}
//@ chunk-z4g2ta8k.js:53223-53235 placement
var pt = 2000;
/**
 * 等 GrowthBook 初始化（带截止时间），拿到的特性不新鲜时在剩余时间内再刷新一次；仍不新鲜时记诊断日志 cli_user_frame_flag_settle，返回是否已就绪。
 */
//@ chunk-z4g2ta8k.js:53235-53647 placement
async function awaitGrowthBookSettled(e) {
  let startTime = performance.now(),
    r = await withDeadline(
      initializeGrowthBook().then(
        () => "resolved",
        () => "failed",
      ),
      pt,
    ),
    s = r === "resolved" && hasFreshGrowthBookFeatures();
  if (r === "resolved" && !s) {
    let h = pt - (performance.now() - startTime);
    if (h > 0)
      (await withDeadline(
        refreshGrowthBookFeatures().catch(() => {
          return;
        }),
        h,
      ),
        (s = hasFreshGrowthBookFeatures()));
  }
  if (!s)
    logForDiagnosticsNoPII("warn", "cli_user_frame_flag_settle", () => ({
      ...e,
      ms: Math.round(performance.now() - startTime),
      deadline_ms: pt,
      timed_out: r === void 0,
      failed: r === "failed",
      no_payload: r === "resolved",
    }));
  return s;
}
//@ chunk-z4g2ta8k.js:53647-53705 placement
var ms = new Set(["scheduled", "retry", "catch_up", "manual"]);
//@ chunk-z4g2ta8k.js:53705-53808 placement
function isServerDeliveredOrigin(e) {
  return e.inbound_origin === void 0 || (e.inbound_origin === "trigger_fire" && ms.has(Zqt(e) ?? ""));
}
/**
 * 为云端浏览器回合准备入站消息：标记是否由服务器投递，以及会话是否持有云浏览器 MCP。
 */
//@ chunk-z4g2ta8k.js:53808-53939 placement
function prepareCloudBrowserTurn(e, { deliveredByServer: deliveredByServer }) {
  return cloudBrowserTurnId(e, {
    deliveredByServer: deliveredByServer && isServerDeliveredOrigin(e),
    holdsCloudBrowser: () => isCoworkWithRemote() && (getMcpClientsFromAccessor() ?? []).some(toScopedConfig),
  });
}
//@ chunk-z4g2ta8k.js:53939-53991 placement
var Je = ge({ running: void 0 }, (e) => {
  e.running = void 0;
});
/**
 * 判断是否给云浏览器回合发 turn id：下限开关已开直接放行；GrowthBook 未启用拒绝；否则等特性稳定后再判，仍未稳定时在后台刷新并记 flags_unsettled。
 */
//@ chunk-z4g2ta8k.js:53991-54619 placement
async function admitCloudBrowserTurnId(context) {
  if (isRemoteBrowserModeFloorOn()) return (logFeatureOk("ccr_cloud_browser_turn_id"), { admitted: !0 });
  if (!isGrowthBookEnabled())
    return (logFeatureSad("ccr_cloud_browser_turn_id", "flags_disabled"), { admitted: !1 });
  let startTime = performance.now();
  await gEo(() => awaitGrowthBookSettled(context));
  let rounded = Math.round(performance.now() - startTime);
  if (isRemoteBrowserModeFloorOn())
    return (
      logFeatureOk("ccr_cloud_browser_turn_id", { settled_first: !0 }),
      { admitted: !0, flagSettleMs: rounded }
    );
  if (hasFreshGrowthBookFeatures())
    return (logFeatureSad("ccr_cloud_browser_turn_id", "flag_off"), { admitted: !1, flagSettleMs: rounded });
  if (Je.running === void 0) {
    let s = refreshGrowthBookFeatures()
      .catch(() => {
        return;
      })
      .finally(() => {
        if (Je.running === s) Je.running = void 0;
      });
    Je.running = s;
  }
  return (
    logFeatureSad("ccr_cloud_browser_turn_id", "flags_unsettled"),
    { admitted: !1, flagSettleMs: rounded }
  );
}
//@ chunk-z4g2ta8k.js:54619-55433 placement
async function classifyInboundLane(e, n) {
  let r = nEn(n.inboundOrigin) ? await awaitGrowthBookSettled({ lane: "bridge" }) : void 0,
    s = "isSynthetic" in e && e.isSynthetic === !0,
    h = describeProjectsHumanOrigin(
      n.content,
      n.clientPlatform,
      n.inboundOrigin,
      n.receiverGroupingId,
      n.activityObservation,
      isProjectsHumanOriginEnabled({ flagsSettled: r }),
      resolvedRowsMode() !== "off" &&
        w9o({
          relayMessageIds: parseRelayMessageIds(e),
          isSynthetic: s,
          coordinatorNote: isRelayPrompt(e) && mKo(),
        }),
    ),
    y = h?.kind === "peer" || h?.kind === "slack-ping" ? void 0 : h,
    { messageIds: messageIds, rows: rows, threadTs: threadTs } = relayMessageMeta(e, y);
  if (n.inboundOrigin === HEARTH_AGENT) logProjectsRelayAdmission(e, y, rows);
  let O = ost(n.inboundOrigin, isProjectsHumanOriginEnabled({ flagsSettled: r })),
    A = isPeerOrigin({
      isRelayHuman: O,
      isSynthetic: s,
      ccrTurnId: t8n(e, { isRelayHuman: O }),
      isProjectsUser: Vsr(n.inboundOrigin),
    });
  return {
    ingressOrigin: h,
    isRelayHuman: O,
    isSynthetic: s,
    stamps: {
      ...A,
      ...(A.projectsUserTurn && { inboundOrigin: HEARTH_HUMAN }),
      ...(messageIds && { hearthRelayMessageIds: messageIds }),
      ...(rows && { hearthRelayRows: rows }),
      ...(threadTs && { hearthRelayThreadTs: threadTs }),
    },
  };
}
//@ chunk-z4g2ta8k.js:55433-55496 placement
function hs(e, n) {
  return e ? (e.kind === "peer" ? e.from : void 0) : getTeammateMessageSender(n);
}
/**
 * 判断入站帧是否来自人类用户（非对等会话转发，按入站来源、远程 IO 与客户端平台判断）。
 */
//@ chunk-z4g2ta8k.js:55496-55602 placement
function isHumanIngressFrame(e, n) {
  return !n.peerFrom && bdi(n.ingressOrigin, n.isRemoteIO, e.client_platform, e.inbound_origin);
}
/**
 * 人类用户入站帧中取出被撤回的文件 uuid 列表。
 */
//@ chunk-z4g2ta8k.js:55602-55776 placement
function withdrawnFileUuidsOf(e, n) {
  let r = "withdrawn_file_uuids" in e ? e.withdrawn_file_uuids : void 0;
  return Array.isArray(r) && isHumanIngressFrame(e, n)
    ? { withdrawnFileUuids: r.filter((s) => typeof s === "string") }
    : {};
}
/**
 * 判断一条入站用户消息是否算真人发起的新回合：排除本地前置、对等方、元消息、客户端合成、召唤种子、非 user 发起者，远程 IO 下还要求不是合成消息且来源可信。
 */
//@ chunk-z4g2ta8k.js:55776-56091 placement
function isUserTypedTurn(e, n) {
  return (
    !n.isLocallyPrepended &&
    !n.peerFrom &&
    !n.wasStartedBefore &&
    e.shouldQuery !== !1 &&
    e.is_meta !== !0 &&
    e.client_composed !== !0 &&
    e.seeded_summon !== !0 &&
    (e.initiator === void 0 || e.initiator === "user") &&
    (n.isRemoteIO
      ? !e.isSynthetic && isHumanInboundMessage(e, "remote-worker", n.projectsHumanEnabled)
      : !hasNonHumanOrigin(e.origin, e.isSynthetic))
  );
}
//@ chunk-z4g2ta8k.js:56091-56162 placement
function VPr(e, n, r, s, h, y, S, k = !1) {
  return resolveAndPrepend(e, n, isHumanIngressFrame(e, r), s, h, y, S, !1, k);
}
//@ chunk-z4g2ta8k.js:56162-56288 placement
function nonPeerOriginOf(e, n, r) {
  let s = refineInboundOrigin(e, n.client_platform, n.inbound_origin);
  if (!r && s?.kind === "human" && hasNonHumanOrigin(n.origin, !1)) return;
  return s;
}
//@ chunk-z4g2ta8k.js:56288-56311 placement
function jn() {
  return !1;
}
//@ chunk-z4g2ta8k.js:56311-56390 placement
function gs() {
  if (jn()) return getFeatureValue_CACHED_MAY_BE_STALE(MOSSY_SQUID_GATE, !1) === !0;
  return (
    hasFreshGrowthBookFeatures() &&
    !hasGrowthBookUsedNonDefaultHost() &&
    getAllGrowthBookFeatures()[MOSSY_SQUID_GATE] === !0
  );
}
//@ chunk-z4g2ta8k.js:56390-56472 placement
function sLs(e) {
  return Boolean(e.isSynthetic) && Zwn(e.inbound_origin) && isGrowthBookEnabled() && !jn();
}
//@ chunk-z4g2ta8k.js:56472-56520 placement
var Ss = ge({ taken: void 0 }, (e) => {
  e.taken = void 0;
});
//@ chunk-z4g2ta8k.js:56520-56578 placement
function gEo(e) {
  return (Ss.taken ??= e().catch(() => {
    return;
  }));
}
//@ chunk-z4g2ta8k.js:56578-56884 placement
var freeze = Object.freeze({ kind: "unclassified" }),
  freeze_2 = Object.freeze({ kind: "task-notification", subkind: "scheduled-trigger" }),
  Es = {
    "fired-prompt": freeze_2,
    "beside-a-fire": freeze,
    nobody: freeze,
    "projects-relay": "as classified",
    "unvouched-fire": void 0,
    person: void 0,
    "peer-send-message": void 0,
    "session-inbox": void 0,
    delivery: void 0,
  };
/**
 * 对合成消息的发送方分类：无、人、投递、其他子类型、未担保的定时触发、定时触发的提示或其旁带消息。
 */
//@ chunk-z4g2ta8k.js:56884-57186 placement
function classifySyntheticSender(e, n, r) {
  if (r === void 0) return "nobody";
  if (r.kind === "human") return "person";
  if (r.subkind === void 0) return "delivery";
  if (r.subkind !== "scheduled-trigger") return r.subkind;
  if (!isScheduledTriggerOrigin(n)) return "unvouched-fire";
  return Zqt(e) !== void 0 && e.shouldQuery !== !1 && e.priority !== "now" ? "fired-prompt" : "beside-a-fire";
}
//@ chunk-z4g2ta8k.js:57186-57424 placement
function syntheticFrameOrigin(e, n) {
  if (e === "fired-prompt" || e === "beside-a-fire") {
    let s = gs();
    if (
      (logForDebugging(
        `[ingress] synthetic trigger_fire frame: ${e}, ${s ? "labelled" : "left with no origin (the flag reads off)"}`,
      ),
      !s)
    )
      return;
  }
  let r = Es[e];
  return r === "as classified" ? n : r;
}
/**
 * 解析入站消息的各种来源：入站来源、对等发送方、非对等来源与排队命令的来源。
 */
//@ chunk-z4g2ta8k.js:57424-57655 placement
function resolveIngressOrigins(e, n, r, s, h, y = !1) {
  let S = describeIngressOrigin(e, n, r, s, h, y),
    k = nonPeerOriginOf(S, e, r),
    P = e.isSynthetic
      ? syntheticFrameOrigin(classifySyntheticSender(e, S, k), k)
      : (k ?? (r ? S9o(e.client_platform, e.inbound_origin) : resolveIngressOrigin(e.origin, !1)));
  return { ingressOrigin: S, peerFrom: hs(S, n), nonPeerOrigin: k, queuedOrigin: P };
}
//@ chunk-z4g2ta8k.js:57655-57745 placement
function iLs(e) {
  return typeof e.initiator === "string" && e.initiator !== "" ? e.initiator : void 0;
}
/**
 * 计算入站消息提交时的附加标志：客户端合成/召唤或非真人来源时跳过附件；本地真人键入标记 localStdinOrigin；真人消息带 requeueIfInterruptedWithinMs。
 */
//@ chunk-z4g2ta8k.js:57745-58301 placement
function ingressSubmitFlags({
  message: message,
  isRemoteIO: isRemoteIO,
  isRelayHuman: isRelayHuman,
  queuedOrigin: queuedOrigin,
  nonPeerOrigin: nonPeerOrigin,
}) {
  let skipAttachments =
      message.client_composed === !0 ||
      message.seeded_summon === !0 ||
      (queuedOrigin !== void 0 && !isHumanOrAutoContinuation(queuedOrigin)) ||
      (message.isSynthetic === !0 && nonPeerOrigin !== void 0 && !isHumanOrAutoContinuation(nonPeerOrigin)),
    typedByHuman =
      !hasNonHumanOrigin(message.origin, message.isSynthetic) &&
      message.is_meta !== !0 &&
      !isRelayHuman &&
      message.inbound_origin === void 0 &&
      (message.client_platform === void 0 || Die(message.client_platform) || Ksr(message.client_platform)) &&
      !skipAttachments &&
      !isTextNotTyped(message),
    localStdinOrigin = !isRemoteIO && typedByHuman,
    requeueWithinMs =
      typedByHuman && !message.isSynthetic ? bs(message.requeue_if_interrupted_within_ms) : void 0;
  return {
    ...(skipAttachments && { skipAttachments: !0 }),
    ...(localStdinOrigin && { localStdinOrigin: !0 }),
    ...!1,
    ...(requeueWithinMs !== void 0 && { requeueIfInterruptedWithinMs: requeueWithinMs }),
  };
}
//@ chunk-z4g2ta8k.js:58301-58393 placement
function aLs(e, n) {
  return Boolean(n) || e.client_composed === !0 || isTextNotTyped(e) || e.inbound_origin === EMAIL_HUMAN;
}
//@ chunk-z4g2ta8k.js:58393-58485 placement
function bs(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 1 ? Math.min(e, 1e4) : void 0;
}
//@ chunk-z4g2ta8k.js:58512-58649 placement
function createWorkerEventsTransport(e, n = {}, r = {}) {
  let s = getTransportForUrl(new As(e.href));
  return ((s.pathname = s.pathname.replace(/\/$/, "") + "/worker/events/stream"), new SSETransport(s, n, r));
}
//@ chunk-z4g2ta8k.js:58649-59551 placement
var WORKER_EVENT_STREAMS = /^(?:client|server)_(?:no_context_takeover|max_window_bits(?:=\d+)?)$/,
  Ts = 5000,
  Os = 2,
  Is = 5,
  Fs = 2,
  Gn = 5000,
  Ps = 3,
  Ms = 5000,
  Ds = new Set([409, 429]),
  Ns = 60000,
  Kn = 8388608,
  xs = 65536,
  Ls = new Map([
    ["/worker/events", "client_events"],
    ["/worker/internal-events", "worker_events"],
  ]),
  Ws = DoctorLazy(() =>
    u({
      hello: u({
        mode: o().optional(),
        server_time: o().optional(),
        keep_alive_interval_seconds: E().optional(),
        session_writers: o().optional(),
        attestation_policy: o().optional(),
        max_message_bytes: E()
          .int()
          .positive()
          .optional()
          .catch(void 0),
      }).optional(),
      ack: u({
        id: E(),
        error: u({
          status: E().optional(),
          type: o().optional(),
          retry_after_seconds: E().optional(),
          conflict_reason: o().optional(),
        }).optional(),
        client_events: oe().optional(),
        worker_events: oe().optional(),
        heartbeat: oe().optional(),
      }).optional(),
      event: pe(o(), oe()).optional(),
      keep_alive: u({}).optional(),
    }),
  ),
  Us = DoctorLazy(() => u({ sequence_num: Ue([E().int().positive(), o().regex(/^[1-9]\d*$/)]) }));

export {
  createIngressReadiness,
  isUnhandledIngressType,
  classifyInboundLane,
  resolveInboxWakeFor,
  ZDs,
  awaitGrowthBookSettled,
  ingressPromptContent,
  sLs,
  gEo,
  resolveIngressOrigins,
  isUserTypedTurn,
  relayMessageMeta,
  logProjectsRelayAdmission,
  iLs,
  aLs,
  prepareCloudBrowserTurn,
  admitCloudBrowserTurnId,
  zPr,
  withdrawnFileUuidsOf,
  ingressSubmitFlags,
  hasMalformedTextBlocks,
  isHumanIngressFrame,
  VPr,
  Kn,
  xs,
  Ls,
  Ms,
  Ds,
  Gn,
  Ts,
  WORKER_EVENT_STREAMS,
  Ps,
  Ns,
  Is,
  Os,
  Fs,
  Ws,
  Us,
  sessionChannelPromptRecord,
  catchUpClientRows,
  createWorkerEventsTransport,
};
