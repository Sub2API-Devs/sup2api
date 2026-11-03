/**
 * bridge/replBridgeInbound.ts
 *
 * 2.1.316 新增。REPL 接收桥接入站消息（用户消息、附件、控制回应）并转入提示队列。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (13)
 * attribution: placement 13
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import {
  extractInboundMetadata,
  classifyInboundOrigin,
  refineInboundOrigin,
  awe,
  qsr,
  adjustInboundPriority,
  hasTeammateMessageEnvelope,
} from "./inboundMessageOrigin.js";
import { recordRemoteSurfaceSeen } from "../services/tips/remoteControlNudges.js";
import {
  classifyInboundOrigin as classifyInboundOrigin_2,
  getInboundRefuseCause,
  logInboundRefused,
  isGatedInbound,
  gateInboundByOrigin,
} from "../utils/crossSessionInbound/inboundGate.js";
import { isPeerOrSlackPing, isHumanOrAutoContinuation } from "../utils/messageProvenance.js";
import { isTextNotTyped, resolveQueuePriority } from "../entrypoints/sdk/coreSchemas.js";
import { escapePluginTags } from "../utils/messages/pluginTags.js";
import { logForDebugging } from "../utils/debug.js";
import { promptOriginKind } from "../utils/processUserInput/promptOrigin.js";
import { buildExternalEventRecord } from "../utils/externalEventRecords.js";
import { dispatchSessionReceiveHooks } from "../plugins/functionHooks/sessionReceive.js";
import { originFromBridgeMetadata } from "../utils/messageOrigin.js";
import { SQ } from "../utils/peerMessageHeaders.js";
import { den, $Lt } from "../cli/print/rewindStandIn.js";
import { textNotTypedFlags } from "../utils/messageQueueManager.js";
import { GRn } from "../utils/turnAttributionKey.js";
import { mainAgentId, recordSubmitTime } from "../bootstrap/state.js";
import { noteHumanTakeover } from "../services/quotaAutoResume/quotaAutoResume.js";
import { aO } from "../utils/historyFile.js";
import { logBridgeAttachmentsMissing } from "../cli/print/resumeTurnBoundaries.js";
import { Vt } from "../utils/agentId.js";
import { extractInboundAttachments } from "./inboundAttachments.js";
import {
  guardPermissionModeChange,
  transitionPermissionMode,
  aF,
} from "../utils/permissions/permissionSetup.js";
import { humanizeToolName } from "./bridgePermissionResponse.js";
import {
  readJobState,
  invalidateJobStateCache,
  writeStateAtomic,
  logJobWriteError,
} from "../services/daemon/jobState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { parseSlashCommand } from "../utils/slashCommandParsing.js";
import {
  findCommand,
  isCommandEnabled,
  BRIDGE_SAFE_COMMANDS,
  shippedCommandNameForAnalytics,
} from "../commands.js";
import { isSlashCommandBlockedByEndedByModel } from "../utils/processUserInput/processSlashCommand.js";
import { resolveBridgeImmediateCommand_2 } from "../hooks/useReplBridge.js";
import { getEndedByModel } from "../tasks/endedByModel.js";
import { logEvent } from "../services/analytics/index.js";
import { useHost } from "../context/session.js";
import { useRenderMode } from "../ink/renderModeContext.js";
import { P, j } from "../../vendor/react/cjs/react.production.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { Jwo } from "../services/daemon/rendezvous.js";

//@ chunk-18hwfzwa.js:1611905-1614466 placement
async function handleBridgeInbound(h, x, D, L, ee, ke, Re, Be) {
  let { prior: prior, release: release } = h.takeInboundEnqueueTurn();
  try {
    let ze = extractInboundMetadata(x);
    if (!ze) return;
    let { uuid: uuid } = ze;
    recordRemoteSurfaceSeen(ze.clientPlatform, Re);
    let rt = classifyInboundOrigin(
        ze.content,
        ze.clientPlatform,
        ze.inboundOrigin,
        ze.receiverGroupingId,
        ze.slackOrigin,
        ze.activityObservation,
        ze.fromPlugin,
      ),
      kt = classifyInboundOrigin_2(rt) === "ungated" && !isPeerOrSlackPing(rt) && !isTextNotTyped(x),
      At = refineInboundOrigin(rt, ze.clientPlatform, ze.inboundOrigin),
      It = escapePluginTags(ze.content, ze.inboundOrigin);
    if (kt && typeof It === "string" && D(It, At, awe(ze.clientPlatform, ze.inboundOrigin))) {
      logForDebugging(
        `[bridge:repl] Ran immediate command without enqueue: ${ze.content.slice(0, 80)}${uuid ? ` uuid=${uuid}` : ""}`,
      );
      return;
    }
    using beginInboundIngest = h.beginInboundIngest(isPeerOrSlackPing(rt) ? void 0 : uuid);
    (await prior, await ke?.());
    let { resolveAndPrepend: resolveAndPrepend } = await import("./chunk-xth3wpgt.js"),
      Dt = It,
      Lt,
      oo = getInboundRefuseCause(rt);
    if (oo !== void 0) {
      logInboundRefused("bridge:repl: dropped before attachment materialization", oo);
      return;
    }
    let Xt = promptOriginKind(ze.content);
    if (!isPeerOrSlackPing(rt)) Dt = buildExternalEventRecord(Dt, ze.pastedContent, ze.inlinePastes);
    let io = await dispatchSessionReceiveHooks({
      origin: originFromBridgeMetadata(
        rt ?? refineInboundOrigin(void 0, ze.clientPlatform, ze.inboundOrigin),
      ),
      content: Dt,
      event: Lt,
    });
    if (io.consumed !== void 0) return;
    Dt = io.content;
    using queueing = io.queueing;
    let po = await resolveAndPrepend(x, Dt, qsr(rt, ze.clientPlatform, ze.inboundOrigin), Re, Be),
      { content: content, inlinedImagePaths: inlinedImagePaths, missingFiles: missingFiles } = po,
      Ao = typeof content === "string" ? content.slice(0, 80) : `[${content.length} content blocks]`;
    logForDebugging(`[bridge:repl] Injecting inbound user message: ${Ao}${uuid ? ` uuid=${uuid}` : ""}`);
    let Bo,
      Ro = !1;
    if (rt?.kind === "peer")
      Bo = {
        origin: SQ(rt, content, ze.content),
        isMeta: !0,
        skipAttachments: !0,
        ...(den(h) && { priority: "later" }),
      };
    else
      ((Ro = isHumanOrAutoContinuation(At)),
        (Bo = {
          bridgeOrigin: !0,
          clientPlatform: ze.clientPlatform,
          ...(At && { origin: At }),
          ...textNotTypedFlags(x, po),
          ...(At !== void 0 && !isHumanOrAutoContinuation(At) && { skipAttachments: !0 }),
          ...(At?.kind === "task-notification" &&
            adjustInboundPriority(void 0, ze.clientPlatform) === "later" && { priority: "later" }),
          ...(awe(ze.clientPlatform, ze.inboundOrigin) && {
            priority: resolveQueuePriority(void 0, content, $Lt(h)),
            verifiedSlackHumanTurn: !0,
          }),
        }));
    let Ho = GRn(uuid, {
        isCrossSession: isGatedInbound({
          ingressOrigin: rt,
          inboundOrigin: ze.inboundOrigin,
          envelopePeer: hasTeammateMessageEnvelope(ze.content),
        }),
      }),
      Io = {
        value: content,
        ...(Xt !== void 0 && { foreignWord: Xt }),
        mode: "prompt",
        agentId: mainAgentId(),
        uuid: uuid,
        ...(Ho && { turnAttributionKey: Ho }),
        ...(inlinedImagePaths.length > 0 && { inlinedImagePaths: inlinedImagePaths }),
        skipSlashCommands: !0,
        ...Bo,
      };
    if (gateInboundByOrigin(rt, Io) !== "accept") return;
    if (beginInboundIngest.withdrawn()) {
      logForDebugging(`[bridge:repl] Inbound message withdrawn before enqueue${uuid ? ` uuid=${uuid}` : ""}`);
      return;
    }
    if (Ro) {
      if (
        ((Io.uuid ??= randomUUID_14()),
        noteHumanTakeover(Io.uuid),
        !Io.verifiedSlackHumanTurn && !aO(content)?.startsWith("/"))
      )
        recordSubmitTime();
    }
    if (
      (h.enqueue(Io),
      logBridgeAttachmentsMissing(Vt(uuid) ?? void 0, extractInboundAttachments(x).length, missingFiles),
      queueing.queued(),
      !isPeerOrSlackPing(rt))
    )
      ee?.();
  } catch (error) {
    logForDebugging(`[bridge:repl] handleInboundMessage failed: ${error}`, { level: "error" });
  } finally {
    prior.then(release, release);
  }
}
/**
 * 处理桥接端发来的权限模式切换：先 guardPermissionModeChange 校验，通过后用 transitionPermissionMode 更新 toolPermissionContext 并在下一轮事件循环通知订阅者。
 */
//@ chunk-18hwfzwa.js:1614466-1614774 placement
function applyBridgePermissionModeChange(requestedMode, store, setAppState) {
  let L = guardPermissionModeChange(requestedMode, store.getState().toolPermissionContext);
  if (!L.ok) return L;
  let mode = L.mode;
  return (
    setAppState((ke) => {
      let mode_2 = ke.toolPermissionContext.mode;
      if (mode_2 === mode) return ke;
      let Be = transitionPermissionMode(mode_2, mode, ke.toolPermissionContext);
      return { ...ke, toolPermissionContext: { ...Be, mode: mode } };
    }),
    setImmediate(() => {
      aF.emit();
    }),
    { ok: !0 }
  );
}
/**
 * 构造桥接的权限请求回调：sendRequest 发 can_use_tool 控制请求（附显示名、建议、阻塞路径等），sendResponse/cancelRequest/onResponse 管理控制响应与待决处理器。
 */
//@ chunk-18hwfzwa.js:1614774-1615404 placement
function createBridgePermissionCallbacks(bridge, pendingHandlers) {
  return {
    sendRequest(D, L, ee, ke, Re, Be, He, We, ze, Xe) {
      bridge.sendControlRequest({
        type: "control_request",
        request_id: D,
        request: {
          subtype: "can_use_tool",
          tool_name: L,
          display_name: humanizeToolName(L),
          input: ee,
          tool_use_id: ke,
          description: Re,
          ...(Be && { permission_suggestions: Be }),
          ...(He && { blocked_path: He }),
          requires_user_interaction: We || void 0,
          ...(ze && { tool_kind: ze }),
          ...Xe,
        },
      });
    },
    sendResponse(D, L) {
      let ee = { ...L };
      bridge.sendControlResponse({
        type: "control_response",
        response: { subtype: "success", request_id: D, response: ee },
      });
    },
    cancelRequest(D) {
      (bridge.sendControlCancelRequest(D), pendingHandlers.delete(D));
    },
    onResponse(D, L, ee) {
      return (
        pendingHandlers.set(D, { toolName: L, handler: ee }),
        () => {
          pendingHandlers.delete(D);
        }
      );
    },
  };
}
/**
 * 构造桥接的用户对话框回调：sendRequest 发 request_user_dialog 控制请求，supportsKind 判断对端支持的对话框种类。
 */
//@ chunk-18hwfzwa.js:1615404-1615783 placement
function createBridgeDialogCallbacks(bridge, pendingHandlers, supportedKinds) {
  return {
    supportsKind(L) {
      return supportedKinds.has(L);
    },
    sendRequest(L, ee, ke, Re) {
      return bridge.sendControlRequest({
        type: "control_request",
        request_id: L,
        request: {
          subtype: "request_user_dialog",
          dialog_kind: ee,
          payload: ke,
          ...(Re && { tool_use_id: Re }),
        },
      });
    },
    cancelRequest(L) {
      (bridge.sendControlCancelRequest(L), pendingHandlers.delete(L));
    },
    onResponse(L, ee, ke) {
      return (
        pendingHandlers.set(L, { kind: ee, handler: ke }),
        () => {
          pendingHandlers.delete(L);
        }
      );
    },
  };
}
/**
 * 有 CLAUDE_JOB_DIR 时，把作业状态文件里的 bridgeSession* 字段全部清掉（重新读一次再原子写回），出错只记日志。
 */
//@ chunk-18hwfzwa.js:1615783-1616217 placement
async function clearBridgeSessionFromJobState(fsOps) {
  let envClaudeJobDir = process.env.CLAUDE_JOB_DIR;
  if (!envClaudeJobDir) return;
  try {
    let D = await readJobState(envClaudeJobDir, fsOps);
    if (!D || D.bridgeSessionId === void 0) return;
    invalidateJobStateCache(envClaudeJobDir);
    let L = (await readJobState(envClaudeJobDir, fsOps)) ?? D;
    await writeStateAtomic(
      envClaudeJobDir,
      {
        ...L,
        bridgeSessionId: void 0,
        bridgeOutboundOnly: void 0,
        bridgeSessionSeq: void 0,
        bridgeSessionGroupingId: void 0,
        bridgeOwnerAccountUuid: void 0,
        bridgeOwnerOrganizationUuid: void 0,
        bridgeNoHistoryBackfill: void 0,
        updatedAt: new Date().toISOString(),
      },
      fsOps,
    );
  } catch (error) {
    logJobWriteError(error);
  }
}
/**
 * 把当前桥接会话信息（会话 id、仅出站、分组、归属账号/组织、禁止回填历史）写进作业状态文件；值未变化时不写，会话 id 不变时保留 bridgeSessionSeq。
 */
//@ chunk-18hwfzwa.js:1616217-1616892 placement
async function persistBridgeSessionToJobState(
  jobDir,
  bridgeSessionId,
  outboundOnly,
  groupingId,
  owner,
  noHistoryBackfill,
  fsOps,
) {
  if (!jobDir) return;
  try {
    let Be = await readJobState(jobDir, fsOps);
    if (
      !Be ||
      (Be.bridgeSessionId === bridgeSessionId &&
        Be.bridgeOutboundOnly === outboundOnly &&
        Be.bridgeSessionGroupingId === groupingId &&
        Be.bridgeOwnerAccountUuid === owner?.accountUuid &&
        Be.bridgeOwnerOrganizationUuid === owner?.organizationUuid &&
        (Be.bridgeNoHistoryBackfill ?? !1) === noHistoryBackfill)
    )
      return;
    invalidateJobStateCache(jobDir);
    let He = (await readJobState(jobDir, fsOps)) ?? Be;
    await writeStateAtomic(
      jobDir,
      {
        ...He,
        bridgeSessionId: bridgeSessionId,
        bridgeOutboundOnly: outboundOnly,
        bridgeSessionGroupingId: groupingId,
        bridgeOwnerAccountUuid: owner?.accountUuid,
        bridgeOwnerOrganizationUuid: owner?.organizationUuid,
        bridgeNoHistoryBackfill: noHistoryBackfill || void 0,
        bridgeSessionSeq: He.bridgeSessionId === bridgeSessionId ? He.bridgeSessionSeq : void 0,
        updatedAt: new Date().toISOString(),
      },
      fsOps,
    );
  } catch (error) {
    logJobWriteError(error);
  }
}
/**
 * 为桥接端的 context usage 请求收集上下文占用数据：动态加载 collectContextData，带上当前会话、消息、工具、MCP 客户端和系统提示词设置。
 */
//@ chunk-18hwfzwa.js:1616892-1617525 placement
async function collectBridgeContextUsage(
  {
    getContextUsageInputs: getContextUsageInputs,
    store: store,
    transcript: transcript,
    storageV5: storageV5,
    credentials: credentials,
    mainLoopModel: mainLoopModel,
  },
  request,
) {
  let { collectContextData: collectContextData } = await import("./chunk-mszdds2y.js"),
    state = store.getState(),
    {
      session: session,
      tools: tools,
      mcpClients: mcpClients,
      customSystemPrompt: customSystemPrompt,
      appendSystemPrompt: appendSystemPrompt,
      systemPromptSnapshot: systemPromptSnapshot,
      runningTurnModelOverride: runningTurnModelOverride,
    } = getContextUsageInputs();
  return collectContextData({
    session: session,
    messages: transcript.getSnapshot(),
    getAppState: store.getState,
    getMcp: () => store.getState().mcp,
    storageV5: storageV5,
    credentials: credentials,
    options: {
      mainLoopModel: runningTurnModelOverride ?? mainLoopModel,
      tools: tools,
      mcpClients: mcpClients,
      agentDefinitions: state.agentDefinitions,
      customSystemPrompt: customSystemPrompt,
      appendSystemPrompt: appendSystemPrompt,
      systemPromptSnapshot: systemPromptSnapshot,
    },
    detail: request?.detail,
  });
}
//@ chunk-18hwfzwa.js:1617525-1617578 placement
var C$o = new Set(["effort", "model", "rename", "usage"]);
//@ chunk-18hwfzwa.js:1617578-1617634 placement
function _$o() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humming_locket", !0) !== !1;
}
/**
 * 判断桥接送来的文本是否是可立即执行的斜杠命令：命令必须存在、已启用、不被模型结束状态阻止，且在 BRIDGE_SAFE_COMMANDS 与即时命令白名单中。返回解析结果或 null。
 */
//@ chunk-18hwfzwa.js:1617634-1617919 placement
function resolveBridgeImmediateCommand(text, commands, renderMode, endedByModel) {
  if (!text.startsWith("/")) return null;
  let ee = parseSlashCommand(text),
    ke = ee && findCommand(ee.commandName, commands);
  if (!ke || !isCommandEnabled(ke)) return null;
  if (isSlashCommandBlockedByEndedByModel(ke, endedByModel)) return null;
  let Re = resolveBridgeImmediateCommand_2(text, commands, renderMode, {
    origin: { kind: "human" },
    relayAuthored: !1,
  });
  if (!Re || !BRIDGE_SAFE_COMMANDS.has(Re.target) || !C$o.has(Re.target.name)) return null;
  return Re;
}
/**
 * 后台会话且有活动回合时，把桥接文本当作即时斜杠命令执行（记 tengu_immediate_command_executed），成功返回 true。
 */
//@ chunk-18hwfzwa.js:1617919-1618267 placement
function tryRunBridgeImmediateCommand(
  text,
  { turn: turn, scope: scope, store: store, transport: transport },
  renderMode,
) {
  if (!_$o() || !turn.guard.isActive) return !1;
  let Re = resolveBridgeImmediateCommand(text, scope.commands, renderMode, getEndedByModel(store.getState()));
  if (!Re) return !1;
  return (
    logEvent("tengu_immediate_command_executed", {
      commandName: shippedCommandNameForAnalytics(Re.displayName),
      fromKeybinding: !1,
      peerReply: !0,
    }),
    transport.runBridgeImmediateCommand(Re.target, Re.args, Re.displayName, { kind: "human" }),
    !0
  );
}
/**
 * React hook：后台会话中注册桥接即时命令处理器（每宿主一个），卸载时注销。
 */
//@ chunk-18hwfzwa.js:1618267-1618465 placement
function useBridgeImmediateCommands({ turn: turn, scope: scope, store: store, transport: transport }) {
  let ee = useHost(),
    ke = useRenderMode();
  P(() => {
    if (!isBgSession()) return;
    return (
      Jwo(ee, (Re) =>
        tryRunBridgeImmediateCommand(
          Re,
          { turn: turn, scope: scope, store: store, transport: transport },
          ke,
        ),
      ),
      () => Jwo(ee, null)
    );
  }, [ee, turn, scope, store, transport, ke]);
}
//@ chunk-18hwfzwa.js:1618465-1618469 placement
j();

export {
  useBridgeImmediateCommands,
  clearBridgeSessionFromJobState,
  handleBridgeInbound,
  persistBridgeSessionToJobState,
  applyBridgePermissionModeChange,
  createBridgePermissionCallbacks,
  createBridgeDialogCallbacks,
  collectBridgeContextUsage,
};
