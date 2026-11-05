/**
 * bridge/replBridgeInbound.ts
 *
 * 2.1.316 新增。REPL 接收桥接入站消息（用户消息、附件、控制回应）并转入提示队列。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { init_react_production, useEffect } from "../../vendor/react/cjs/react.production.js";
import { recordEarlierToolsUnknown } from "../services/compact/keptTools.js";
import {
  extractInboundMetadata,
  classifyInboundOrigin,
  refineInboundOrigin,
  isChatPlatformHuman,
  humanHintOrPlatform,
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
import { stripPeerMessageBody } from "../utils/peerMessageHeaders.js";
import { hasVerifiedSlackHumanTurn, hasSlackLaterNotification } from "../cli/print/rewindStandIn.js";
import { textNotTypedFlags } from "../utils/messageQueueManager.js";
import { isUltrathinkPrompt } from "../utils/messages/ultrathinkPaste.js";
import { inheritedAttributionKey } from "../utils/turnAttributionKey.js";
import { mainAgentId, recordSubmitTime } from "../bootstrap/state.js";
import { noteHumanTakeover } from "../services/quotaAutoResume/quotaAutoResume.js";
import { lastTextBlockText } from "../utils/historyFile.js";
import { logBridgeAttachmentsMissing } from "../cli/print/resumeTurnBoundaries.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { extractInboundAttachments } from "./inboundAttachments.js";
import {
  guardPermissionModeChange,
  transitionPermissionMode,
  permissionModeSignal,
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
import { isBgSession } from "../utils/concurrentSessions.js";
import { registerRendezvousRunner } from "../services/daemon/rendezvous.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1610359-1610363 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1610359", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1655977-1658578 placement
async function handleBridgeInbound(
  queue,
  frame,
  runImmediateCommand,
  onInboundRefused,
  onInboundHandled,
  beforeEnqueue,
  storageV5,
  credentials,
) {
  let { prior, release } = queue.takeInboundEnqueueTurn();
  try {
    recordEarlierToolsUnknown(frame);
    let inboundMetadata = extractInboundMetadata(frame);
    if (!inboundMetadata) return;
    let { uuid } = inboundMetadata;
    recordRemoteSurfaceSeen(inboundMetadata.clientPlatform, storageV5);
    let origin = classifyInboundOrigin(
      inboundMetadata.content,
      inboundMetadata.clientPlatform,
      inboundMetadata.inboundOrigin,
      inboundMetadata.receiverGroupingId,
      inboundMetadata.slackOrigin,
      inboundMetadata.activityObservation,
      inboundMetadata.fromPlugin,
    );
    let canRunImmediate =
      classifyInboundOrigin_2(origin) === "ungated" && !isPeerOrSlackPing(origin) && !isTextNotTyped(frame);
    let refinedOrigin = refineInboundOrigin(
      origin,
      inboundMetadata.clientPlatform,
      inboundMetadata.inboundOrigin,
    );
    let content = escapePluginTags(inboundMetadata.content, inboundMetadata.inboundOrigin);
    if (
      canRunImmediate &&
      typeof content === "string" &&
      runImmediateCommand(
        content,
        refinedOrigin,
        isChatPlatformHuman(inboundMetadata.clientPlatform, inboundMetadata.inboundOrigin),
      )
    ) {
      logForDebugging(
        `[bridge:repl] Ran immediate command without enqueue: ${inboundMetadata.content.slice(0, 80)}${uuid ? ` uuid=${uuid}` : ""}`,
      );
      return;
    }
    using ingest = queue.beginInboundIngest(isPeerOrSlackPing(origin) ? undefined : uuid);
    await prior;
    await beforeEnqueue?.();
    let { resolveAndPrepend } = await import("./inboundAttachments.js");
    let text = content;
    let event;
    let inboundRefuseCause = getInboundRefuseCause(origin);
    if (inboundRefuseCause !== undefined) {
      logInboundRefused("bridge:repl: dropped before attachment materialization", inboundRefuseCause);
      return;
    }
    let promptOrigin = promptOriginKind(inboundMetadata.content);
    if (!isPeerOrSlackPing(origin))
      text = buildExternalEventRecord(text, inboundMetadata.pastedContent, inboundMetadata.inlinePastes);
    let hookResult = await dispatchSessionReceiveHooks({
      origin: originFromBridgeMetadata(
        origin ??
          refineInboundOrigin(undefined, inboundMetadata.clientPlatform, inboundMetadata.inboundOrigin),
      ),
      content: text,
      event,
    });
    if (hookResult.consumed !== undefined) return;
    text = hookResult.content;
    using queueing = hookResult.queueing;
    let resolved = await resolveAndPrepend(
      frame,
      text,
      humanHintOrPlatform(origin, inboundMetadata.clientPlatform, inboundMetadata.inboundOrigin),
      storageV5,
      credentials,
    );
    let { content: content_2, inlinedImagePaths, missingFiles } = resolved;
    let preview =
      typeof content_2 === "string" ? content_2.slice(0, 80) : `[${content_2.length} content blocks]`;
    logForDebugging(`[bridge:repl] Injecting inbound user message: ${preview}${uuid ? ` uuid=${uuid}` : ""}`);
    let extraFields;
    let isHumanTurn = false;
    if (origin?.kind === "peer")
      extraFields = {
        origin: stripPeerMessageBody(origin, content_2, inboundMetadata.content),
        isMeta: true,
        skipAttachments: true,
        ...(hasVerifiedSlackHumanTurn(queue) && {
          priority: "later",
        }),
      };
    else {
      isHumanTurn = isHumanOrAutoContinuation(refinedOrigin);
      extraFields = {
        bridgeOrigin: true,
        clientPlatform: inboundMetadata.clientPlatform,
        ...(refinedOrigin && {
          origin: refinedOrigin,
        }),
        ...textNotTypedFlags(frame, resolved),
        ...(isUltrathinkPrompt(frame) && {
          ultrathinkTyped: true,
        }),
        ...(refinedOrigin !== undefined &&
          !isHumanOrAutoContinuation(refinedOrigin) && {
            skipAttachments: true,
          }),
        ...(refinedOrigin?.kind === "task-notification" &&
          adjustInboundPriority(undefined, inboundMetadata.clientPlatform) === "later" && {
            priority: "later",
          }),
        ...(isChatPlatformHuman(inboundMetadata.clientPlatform, inboundMetadata.inboundOrigin) && {
          priority: resolveQueuePriority(undefined, content_2, hasSlackLaterNotification(queue)),
          verifiedSlackHumanTurn: true,
        }),
      };
    }
    let attributionKey = inheritedAttributionKey(uuid, {
      isCrossSession: isGatedInbound({
        ingressOrigin: origin,
        inboundOrigin: inboundMetadata.inboundOrigin,
        envelopePeer: hasTeammateMessageEnvelope(inboundMetadata.content),
      }),
    });
    let queueItem = {
      value: content_2,
      ...(promptOrigin !== undefined && {
        foreignWord: promptOrigin,
      }),
      mode: "prompt",
      agentId: mainAgentId(),
      uuid,
      ...(attributionKey && {
        turnAttributionKey: attributionKey,
      }),
      ...(inlinedImagePaths.length > 0 && {
        inlinedImagePaths,
      }),
      skipSlashCommands: true,
      ...extraFields,
    };
    if (gateInboundByOrigin(origin, queueItem) !== "accept") return;
    if (ingest.withdrawn()) {
      logForDebugging(`[bridge:repl] Inbound message withdrawn before enqueue${uuid ? ` uuid=${uuid}` : ""}`);
      return;
    }
    if (isHumanTurn) {
      queueItem.uuid ??= randomUUID();
      noteHumanTakeover(queueItem.uuid);
      if (!queueItem.verifiedSlackHumanTurn && !lastTextBlockText(content_2)?.startsWith("/"))
        recordSubmitTime();
    }
    queue.enqueue(queueItem);
    logBridgeAttachmentsMissing(
      normalizeUuidOrNull(uuid) ?? undefined,
      extractInboundAttachments(frame).length,
      missingFiles,
    );
    queueing.queued();
    if (!isPeerOrSlackPing(origin)) onInboundHandled?.();
  } catch (error) {
    logForDebugging(`[bridge:repl] handleInboundMessage failed: ${error}`, {
      level: "error",
    });
  } finally {
    prior.then(release, release);
  }
}
//@ chunk-czq1j3j2.js:1658578-1658886 placement
/**
 * 处理桥接端发来的权限模式切换：先 guardPermissionModeChange 校验，通过后用 transitionPermissionMode 更新 toolPermissionContext 并在下一轮事件循环通知订阅者。
 */
function applyBridgePermissionModeChange(requestedMode, store, setAppState) {
  let guard = guardPermissionModeChange(requestedMode, store.getState().toolPermissionContext);
  if (!guard.ok) return guard;
  let mode = guard.mode;
  setAppState((state) => {
    let mode_2 = state.toolPermissionContext.mode;
    if (mode_2 === mode) return state;
    let context = transitionPermissionMode(mode_2, mode, state.toolPermissionContext);
    return {
      ...state,
      toolPermissionContext: {
        ...context,
        mode,
      },
    };
  });
  setImmediate(() => {
    permissionModeSignal.emit();
  });
  return {
    ok: true,
  };
}
//@ chunk-czq1j3j2.js:1658886-1659562 placement
/**
 * 构造桥接的权限请求回调：sendRequest 发 can_use_tool 控制请求（附显示名、建议、阻塞路径等），sendResponse/cancelRequest/onResponse 管理控制响应与待决处理器。
 */
function createBridgePermissionCallbacks(bridge, pendingHandlers) {
  return {
    sendRequest(
      requestId,
      toolName,
      input,
      toolUseId,
      description,
      suggestions,
      blockedPath,
      requiresInteraction,
      toolKind,
      extraRequestFields,
      plugin,
      suppressAlwaysAllowRule,
    ) {
      bridge.sendControlRequest({
        type: "control_request",
        request_id: requestId,
        request: {
          subtype: "can_use_tool",
          tool_name: toolName,
          display_name: humanizeToolName(toolName),
          input,
          tool_use_id: toolUseId,
          description,
          ...(suggestions && {
            permission_suggestions: suggestions,
          }),
          ...(blockedPath && {
            blocked_path: blockedPath,
          }),
          requires_user_interaction: requiresInteraction || undefined,
          ...(toolKind && {
            tool_kind: toolKind,
          }),
          ...extraRequestFields,
          plugin,
          suppress_always_allow_rule: suppressAlwaysAllowRule,
        },
      });
    },
    sendResponse(requestId, response) {
      let response_2 = {
        ...response,
      };
      bridge.sendControlResponse({
        type: "control_response",
        response: {
          subtype: "success",
          request_id: requestId,
          response: response_2,
        },
      });
    },
    cancelRequest(requestId) {
      bridge.sendControlCancelRequest(requestId);
      pendingHandlers.delete(requestId);
    },
    onResponse(requestId, toolName, handler) {
      pendingHandlers.set(requestId, {
        toolName,
        handler,
      });
      return () => {
        pendingHandlers.delete(requestId);
      };
    },
  };
}
//@ chunk-czq1j3j2.js:1659562-1659941 placement
/**
 * 构造桥接的用户对话框回调：sendRequest 发 request_user_dialog 控制请求，supportsKind 判断对端支持的对话框种类。
 */
function createBridgeDialogCallbacks(bridge, pendingHandlers, supportedKinds) {
  return {
    supportsKind(kind) {
      return supportedKinds.has(kind);
    },
    sendRequest(requestId, dialogKind, payload, toolUseId) {
      return bridge.sendControlRequest({
        type: "control_request",
        request_id: requestId,
        request: {
          subtype: "request_user_dialog",
          dialog_kind: dialogKind,
          payload,
          ...(toolUseId && {
            tool_use_id: toolUseId,
          }),
        },
      });
    },
    cancelRequest(requestId) {
      bridge.sendControlCancelRequest(requestId);
      pendingHandlers.delete(requestId);
    },
    onResponse(requestId, kind, handler) {
      pendingHandlers.set(requestId, {
        kind,
        handler,
      });
      return () => {
        pendingHandlers.delete(requestId);
      };
    },
  };
}
//@ chunk-czq1j3j2.js:1659941-1660375 placement
/**
 * 有 CLAUDE_JOB_DIR 时，把作业状态文件里的 bridgeSession* 字段全部清掉（重新读一次再原子写回），出错只记日志。
 */
async function clearBridgeSessionFromJobState(fsOps) {
  let envClaudeJobDir = process.env.CLAUDE_JOB_DIR;
  if (!envClaudeJobDir) return;
  try {
    let jobState = await readJobState(envClaudeJobDir, fsOps);
    if (!jobState || jobState.bridgeSessionId === undefined) return;
    invalidateJobStateCache(envClaudeJobDir);
    let current = (await readJobState(envClaudeJobDir, fsOps)) ?? jobState;
    await writeStateAtomic(
      envClaudeJobDir,
      {
        ...current,
        bridgeSessionId: undefined,
        bridgeOutboundOnly: undefined,
        bridgeSessionSeq: undefined,
        bridgeSessionGroupingId: undefined,
        bridgeOwnerAccountUuid: undefined,
        bridgeOwnerOrganizationUuid: undefined,
        bridgeNoHistoryBackfill: undefined,
        updatedAt: new Date().toISOString(),
      },
      fsOps,
    );
  } catch (error) {
    logJobWriteError(error);
  }
}
//@ chunk-czq1j3j2.js:1660375-1661050 placement
/**
 * 把当前桥接会话信息（会话 id、仅出站、分组、归属账号/组织、禁止回填历史）写进作业状态文件；值未变化时不写，会话 id 不变时保留 bridgeSessionSeq。
 */
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
    let jobState = await readJobState(jobDir, fsOps);
    if (
      !jobState ||
      (jobState.bridgeSessionId === bridgeSessionId &&
        jobState.bridgeOutboundOnly === outboundOnly &&
        jobState.bridgeSessionGroupingId === groupingId &&
        jobState.bridgeOwnerAccountUuid === owner?.accountUuid &&
        jobState.bridgeOwnerOrganizationUuid === owner?.organizationUuid &&
        (jobState.bridgeNoHistoryBackfill ?? false) === noHistoryBackfill)
    )
      return;
    invalidateJobStateCache(jobDir);
    let current = (await readJobState(jobDir, fsOps)) ?? jobState;
    await writeStateAtomic(
      jobDir,
      {
        ...current,
        bridgeSessionId,
        bridgeOutboundOnly: outboundOnly,
        bridgeSessionGroupingId: groupingId,
        bridgeOwnerAccountUuid: owner?.accountUuid,
        bridgeOwnerOrganizationUuid: owner?.organizationUuid,
        bridgeNoHistoryBackfill: noHistoryBackfill || undefined,
        bridgeSessionSeq: current.bridgeSessionId === bridgeSessionId ? current.bridgeSessionSeq : undefined,
        updatedAt: new Date().toISOString(),
      },
      fsOps,
    );
  } catch (error) {
    logJobWriteError(error);
  }
}
//@ chunk-czq1j3j2.js:1661050-1661683 placement
/**
 * 为桥接端的 context usage 请求收集上下文占用数据：动态加载 collectContextData，带上当前会话、消息、工具、MCP 客户端和系统提示词设置。
 */
async function collectBridgeContextUsage(
  { getContextUsageInputs, store, transcript, storageV5, credentials, mainLoopModel },
  request,
) {
  let { collectContextData } = await import("../commands/context/context-noninteractive.js");
  let state = store.getState();
  let {
    session,
    tools,
    mcpClients,
    customSystemPrompt,
    appendSystemPrompt,
    systemPromptSnapshot,
    runningTurnModelOverride,
  } = getContextUsageInputs();
  return collectContextData({
    session,
    messages: transcript.getSnapshot(),
    getAppState: store.getState,
    getMcp: () => store.getState().mcp,
    storageV5,
    credentials,
    options: {
      mainLoopModel: runningTurnModelOverride ?? mainLoopModel,
      tools,
      mcpClients,
      agentDefinitions: state.agentDefinitions,
      customSystemPrompt,
      appendSystemPrompt,
      systemPromptSnapshot,
    },
    detail: request?.detail,
  });
}
//@ chunk-czq1j3j2.js:1661683-1661736 placement
var BRIDGE_IMMEDIATE_COMMAND_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1661683", () => {
  BRIDGE_IMMEDIATE_COMMAND_NAMES = new Set(["effort", "model", "rename", "usage"]);
});
//@ chunk-czq1j3j2.js:1661736-1661792 placement
function isBridgeImmediateCommandsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humming_locket", true) !== false;
}
//@ chunk-czq1j3j2.js:1661792-1662077 placement
/**
 * 判断桥接送来的文本是否是可立即执行的斜杠命令：命令必须存在、已启用、不被模型结束状态阻止，且在 BRIDGE_SAFE_COMMANDS 与即时命令白名单中。返回解析结果或 null。
 */
function resolveBridgeImmediateCommand(text, commands, renderMode, endedByModel) {
  if (!text.startsWith("/")) return null;
  let slashCommand = parseSlashCommand(text);
  let command = slashCommand && findCommand(slashCommand.commandName, commands);
  if (!command || !isCommandEnabled(command)) return null;
  if (isSlashCommandBlockedByEndedByModel(command, endedByModel)) return null;
  let bridgeImmediateCommand = resolveBridgeImmediateCommand_2(text, commands, renderMode, {
    origin: {
      kind: "human",
    },
    relayAuthored: false,
  });
  if (
    !bridgeImmediateCommand ||
    !BRIDGE_SAFE_COMMANDS.has(bridgeImmediateCommand.target) ||
    !BRIDGE_IMMEDIATE_COMMAND_NAMES.has(bridgeImmediateCommand.target.name)
  )
    return null;
  return bridgeImmediateCommand;
}
//@ chunk-czq1j3j2.js:1662077-1662425 placement
/**
 * 后台会话且有活动回合时，把桥接文本当作即时斜杠命令执行（记 tengu_immediate_command_executed），成功返回 true。
 */
function tryRunBridgeImmediateCommand(text, { turn, scope, store, transport }, renderMode) {
  if (!isBridgeImmediateCommandsEnabled() || !turn.guard.isActive) return false;
  let bridgeImmediateCommand = resolveBridgeImmediateCommand(
    text,
    scope.commands,
    renderMode,
    getEndedByModel(store.getState()),
  );
  if (!bridgeImmediateCommand) return false;
  logEvent("tengu_immediate_command_executed", {
    commandName: shippedCommandNameForAnalytics(bridgeImmediateCommand.displayName),
    fromKeybinding: false,
    peerReply: true,
  });
  transport.runBridgeImmediateCommand(
    bridgeImmediateCommand.target,
    bridgeImmediateCommand.args,
    bridgeImmediateCommand.displayName,
    {
      kind: "human",
    },
  );
  return true;
}
//@ chunk-czq1j3j2.js:1662425-1662623 placement
/**
 * React hook：后台会话中注册桥接即时命令处理器（每宿主一个），卸载时注销。
 */
function useBridgeImmediateCommands({ turn, scope, store, transport }) {
  let host = useHost();
  let renderMode = useRenderMode();
  useEffect(() => {
    if (!isBgSession()) return;
    registerRendezvousRunner(host, (text) =>
      tryRunBridgeImmediateCommand(
        text,
        {
          turn,
          scope,
          store,
          transport,
        },
        renderMode,
      ),
    );
    return () => registerRendezvousRunner(host, null);
  }, [host, turn, scope, store, transport, renderMode]);
}
export {
  clearBridgeSessionFromJobState,
  handleBridgeInbound,
  persistBridgeSessionToJobState,
  applyBridgePermissionModeChange,
  createBridgePermissionCallbacks,
  createBridgeDialogCallbacks,
  collectBridgeContextUsage,
  useBridgeImmediateCommands,
};
