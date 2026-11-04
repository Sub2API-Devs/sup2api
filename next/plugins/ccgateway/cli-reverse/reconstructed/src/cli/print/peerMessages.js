/**
 * cli/print/peerMessages.ts
 *
 * 2.1.316 新增：同伴消息路由、回合交接与回合结束打印
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (21)
 * attribution: placement 21
 */
import { randomUUID } from "crypto";
import { bridgeMessageUuid } from "./hostTelemetryProxy.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { normalizeForDisplay } from "../../utils/resultError.js";
import { isPeerAddress } from "../../utils/peerMessageHeaders.js";
import { clipTeammateText } from "../../utils/swarm/teammateIds.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import {
  getSessionId,
  getMainThreadAgentType,
  getRefusalFallbackModelLatch,
  getMainLoopModelOverride,
  setMainLoopModelOverride,
  rewriteRefusalFallbackPreviousOverride,
  mainAgentId,
} from "../../bootstrap/state.js";
import {
  isInboundShuttingDown,
  getInboundRefuseCause,
  inboundRefuseCause,
  logInboundRefused,
  gatedPeerPolicy,
  gatedPolicyFor,
  gateInboundByOrigin,
  refreshAndReevaluateHeld,
  resolveHeldMessage,
  heldInboundMessages,
} from "../../utils/crossSessionInbound/inboundGate.js";
import {
  setOnPeerHoldReleased,
  setOnPeerHeld,
  announcedHeldMessage,
  setOnPeerHoldDropped,
  setInboundModeGetter,
  setInboundAvailabilityPublisher,
} from "../../utils/crossSessionInbound/inboundMode.js";
import { getUserDialogTimeoutMs } from "../../services/api/refusalFallback.js";
import { logForDebugging } from "../../utils/debug.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { findAgentExcludingWebFetch } from "../../tools/WebFetchTool/harnessNotes.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { isExemptDefaultResolvingPick } from "../../utils/model/defaultModel.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { getBaselineModelSetting } from "../../utils/model/smallFastModel.js";
import { restoreAgentFromSession } from "../../utils/sessionRestore.js";
import { saveAgentSetting } from "../../utils/sessionStorage.js";
import { isBuiltInAgent } from "../../tools/AgentTool/loadAgentsDir.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { writeToStdout } from "../../utils/process.js";
import { mcpInfoFromString } from "../../services/mcp/mcpStringUtils.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { getNonDeferrableBuiltins } from "../../utils/toolSearch.js";
import { getMcpServersReferencedByHooks } from "../../utils/hooks/sessionHooks.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { MODEL_SWITCH_STATE, cancelQueuedAutoInputs } from "./setModelControl.js";
import { applyTurnHandoff, isCarriedWritesEnabled } from "../remoteIO/turnHandoff.js";
import { getCwd } from "../../utils/cwd.js";
import { getHomeFilesRoot } from "../../utils/stageFileRoots.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { userAbortReason } from "../../utils/abortController.js";
import { uniq } from "../../utils/collections.js";
import { attributionKeyOrUndefined } from "../../utils/turnAttributionKey.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { controlHandlerError } from "./dispatchControlRequest.js";

//@ chunk-tyg7f3ek.js:540125-540247 placement
function reportPeerLifecycle(io, lanes, message) {
  let lane = lanes.laneOf(message);
  if (lane === undefined) return;
  let uuid = bridgeMessageUuid(message.uuid, lane);
  if (uuid !== undefined) io.onCommandLifecycle?.(uuid, refusedLifecycleState());
}
//@ chunk-tyg7f3ek.js:540247-540258 placement
var PEER_NAME_MAX = 200;
//@ chunk-tyg7f3ek.js:540258-540857 placement
function formatPeerMessage(output, hostIngressLanes, remoteTransport, message, state) {
  let origin = message.origin?.kind === "peer" ? message.origin : undefined;
  let lane = hostIngressLanes.laneOf(message) ?? "socket";
  let isStdinLocal = lane === "stdin" && !remoteTransport;
  let from =
    typeof origin?.from !== "string"
      ? ""
      : isStdinLocal
        ? truncateToLength(normalizeForDisplay(origin.from), PEER_NAME_MAX)
        : isPeerAddress(origin.from)
          ? normalizeForDisplay(origin.from)
          : "";
  let fromName =
    typeof origin?.name === "string" ? normalizeForDisplay(clipTeammateText(origin.name)) : undefined;
  let messageUuid =
    typeof message.uuid !== "string"
      ? undefined
      : lane === "socket" || (lane === "stdin" && !isStdinLocal)
        ? (normalizeUuidOrNull(message.uuid) ?? undefined)
        : bridgeMessageUuid(message.uuid, lane);
  let event = {
    type: "system",
    subtype: "peer_message_hold",
    state: state.state,
    ...(messageUuid !== undefined && {
      message_uuid: messageUuid,
    }),
    lane,
    from,
    ...(fromName !== undefined &&
      fromName !== "" && {
        from_name: fromName,
      }),
    ...(state.state === "held" && {
      cause: state.cause,
    }),
    ...(state.state === "dropped" && {
      outcome: state.outcome,
    }),
    uuid: randomUUID(),
    session_id: getSessionId(),
  };
  output.enqueue(event);
}
//@ chunk-tyg7f3ek.js:540857-540935 placement
function reportCommandRefused(io, uuid, lane) {
  let bridgeUuid = bridgeMessageUuid(uuid, lane);
  if (bridgeUuid !== undefined) io.onCommandLifecycle?.(bridgeUuid, refusedLifecycleState());
}
//@ chunk-tyg7f3ek.js:540935-540984 placement
function refusedLifecycleState() {
  return isInboundShuttingDown() ? "discarded" : "refused";
}
//@ chunk-tyg7f3ek.js:540984-541301 placement
function dropBeforeAttachments({ io, uuid, peerFrom, hostInjectedPeer, ingressOrigin }) {
  let refuseCause = peerFrom
    ? hostInjectedPeer
      ? getInboundRefuseCause({
          kind: "peer",
          hostInjected: true,
        })
      : inboundRefuseCause()
    : getInboundRefuseCause(ingressOrigin);
  if (refuseCause === undefined) return false;
  logInboundRefused(
    hostInjectedPeer
      ? "local stdin (host-injected): dropped before attachment materialization"
      : "remote-io: dropped before attachment materialization",
    refuseCause,
  );
  reportCommandRefused(io, uuid, "stdin");
  return true;
}
//@ chunk-tyg7f3ek.js:541301-541507 placement
function acceptStdinPeerMessage({
  io,
  hostIngressLanes,
  command,
  uuid,
  peerFrom,
  hostInjectedPeer,
  ingressOrigin,
}) {
  hostIngressLanes.mark(command, "stdin");
  let decision = peerFrom
    ? hostInjectedPeer
      ? gatedPeerPolicy(command)
      : gatedPolicyFor(command)
    : gateInboundByOrigin(ingressOrigin, command);
  if (decision === "refused") reportCommandRefused(io, uuid, "stdin");
  return decision === "accept";
}
//@ chunk-tyg7f3ek.js:541507-542913 placement
/**
 * 跨会话（peer）消息路由：区分 stdin/socket/bridge 来源，按权限模式接收、暂存或过期丢弃。
 */
function createPeerMessageRouter({
  output,
  io,
  hostIngressLanes,
  readMode,
  remoteTransport,
  publishesAvailability,
}) {
  let timers = new Map();
  let clearTimer = (uuid) => {
    let timer = timers.get(uuid);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.delete(uuid);
    }
  };
  let weakMap = new WeakMap();
  setOnPeerHoldReleased((uuids) => {
    for (let uuid of uuids) {
      clearTimer(uuid);
      if (weakMap.delete(uuid))
        formatPeerMessage(output, hostIngressLanes, remoteTransport, uuid, {
          state: "released",
        });
      let lane = hostIngressLanes.laneOf(uuid);
      let bridgeUuid = lane === undefined ? uuid.uuid : bridgeMessageUuid(uuid.uuid, lane);
      if (bridgeUuid !== undefined) io.onCommandLifecycle?.(bridgeUuid, "queued");
    }
  });
  setOnPeerHeld((uuid, cause, heldCause) => {
    clearTimer(uuid);
    if (weakMap.get(uuid) !== heldCause) {
      weakMap.set(uuid, heldCause);
      formatPeerMessage(output, hostIngressLanes, remoteTransport, uuid, {
        state: "held",
        cause: heldCause,
      });
    }
    if (heldCause !== "mode-mismatch" && heldCause !== "no-mode-asserted") return;
    let userDialogTimeoutMs = getUserDialogTimeoutMs();
    if (userDialogTimeoutMs <= 0) return;
    let timer = setTimeout(
      (uuid, timers, io, lanes, output, heldCause, remoteTransport) => {
        timers.delete(uuid);
        refreshAndReevaluateHeld("policy-accepts");
        let cause = announcedHeldMessage(uuid);
        if (
          (cause === "mode-mismatch" || cause === "no-mode-asserted") &&
          !timers.has(uuid) &&
          resolveHeldMessage(uuid, "cancelled") === "dropped"
        ) {
          logForDebugging(
            "[cross-session-inbound] headless: held peer message expired (no approval surface) \u2014 dropped with an expired receipt",
          );
          heldCause.delete(uuid);
          formatPeerMessage(output, lanes, remoteTransport, uuid, {
            state: "dropped",
            outcome: "expired",
          });
          reportPeerLifecycle(io, lanes, uuid);
        }
      },
      userDialogTimeoutMs,
      uuid,
      timers,
      io,
      hostIngressLanes,
      output,
      weakMap,
      remoteTransport,
    );
    timer.unref();
    timers.set(uuid, timer);
  });
  setOnPeerHoldDropped((uuid, outcome) => {
    clearTimer(uuid);
    if (weakMap.delete(uuid))
      formatPeerMessage(output, hostIngressLanes, remoteTransport, uuid, {
        state: "dropped",
        outcome: isInboundShuttingDown() ? "discarded" : outcome,
      });
    reportPeerLifecycle(io, hostIngressLanes, uuid);
  });
  for (let uuid of heldInboundMessages())
    if (!weakMap.has(uuid)) {
      let cause = announcedHeldMessage(uuid) ?? "mode-unknown";
      weakMap.set(uuid, cause);
      formatPeerMessage(output, hostIngressLanes, remoteTransport, uuid, {
        state: "held",
        cause,
      });
    }
  setInboundModeGetter(readMode);
  let unsubscribe = settingsChangeDetector.subscribe(() => {
    refreshAndReevaluateHeld("policy-accepts");
  });
  if (publishesAvailability) {
    let last;
    setInboundAvailabilityPublisher((available) => {
      let state = available ? "available" : "unavailable";
      if (state === last) return;
      last = state;
      io.sessionState.notifyMetadataChanged({
        cross_session_inbound: state,
      });
    });
  }
  return () => {
    unsubscribe();
    setInboundAvailabilityPublisher(null);
  };
}
//@ chunk-tyg7f3ek.js:542913-543610 placement
function resolveTurnAgent(agent, agents) {
  if (agent != null && typeof agent !== "string")
    return {
      now: undefined,
      later: undefined,
      laterOverride: undefined,
    };
  let foundAgent =
    typeof agent === "string" && agent !== "" ? findAgentExcludingWebFetch(agents, agent) : undefined;
  if (typeof agent === "string" && agent !== "" && !foundAgent)
    return {
      now: undefined,
      later: undefined,
      laterOverride: undefined,
    };
  let agentModel =
    foundAgent?.model && foundAgent.model !== "inherit"
      ? parseUserSpecifiedModel(foundAgent.model)
      : undefined;
  let nowModel =
    agentModel !== undefined && (isExemptDefaultResolvingPick(agentModel) || isModelAllowed(agentModel))
      ? agentModel
      : undefined;
  let mainThreadAgentType = getMainThreadAgentType();
  let mainThreadAgent = mainThreadAgentType
    ? agents.find((agent) => agent.agentType === mainThreadAgentType)
    : undefined;
  let mainThreadModel =
    mainThreadAgent?.model && mainThreadAgent.model !== "inherit"
      ? parseUserSpecifiedModel(mainThreadAgent.model)
      : undefined;
  let baselineModel = nowModel ?? getBaselineModelSetting() ?? null;
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  let laterModel =
    refusalFallbackModelLatch &&
    mainThreadModel !== undefined &&
    refusalFallbackModelLatch.previousOverride === mainThreadModel
      ? baselineModel
      : undefined;
  let laterOverride = laterModel !== undefined ? nowModel : undefined;
  let mainLoopModelOverride = getMainLoopModelOverride();
  if (mainLoopModelOverride !== undefined && mainLoopModelOverride !== null) {
    if (mainThreadModel === undefined || mainLoopModelOverride !== mainThreadModel)
      return {
        now: undefined,
        later: laterModel,
        laterOverride,
      };
    return {
      now: baselineModel,
      later: laterModel,
      laterOverride,
    };
  }
  return {
    now: nowModel,
    later: laterModel,
    laterOverride,
  };
}
//@ chunk-tyg7f3ek.js:543610-544552 placement
function applyRequestedAgent({ requestedAgent, agents, systemPrompt, preAgentSystemPrompt }) {
  if (requestedAgent != null && typeof requestedAgent !== "string")
    return {
      ok: false,
      error: "agent must be a string or null",
    };
  let agentName = typeof requestedAgent === "string" && requestedAgent !== "" ? requestedAgent : undefined;
  let agent = agentName ? findAgentExcludingWebFetch(agents, agentName) : undefined;
  if (agentName && !agent)
    return {
      ok: false,
      error: `Agent "${agentName}" not found`,
    };
  let mainThreadAgentType = getMainThreadAgentType();
  let mainThreadAgent = mainThreadAgentType
    ? agents.find((agent) => agent.agentType === mainThreadAgentType)
    : undefined;
  if (
    mainThreadAgent?.model &&
    mainThreadAgent.model !== "inherit" &&
    getMainLoopModelOverride() === parseUserSpecifiedModel(mainThreadAgent.model)
  )
    setMainLoopModelOverride(undefined);
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  if (
    refusalFallbackModelLatch &&
    mainThreadAgent?.model &&
    mainThreadAgent.model !== "inherit" &&
    refusalFallbackModelLatch.previousOverride === parseUserSpecifiedModel(mainThreadAgent.model)
  )
    rewriteRefusalFallbackPreviousOverride(resolveTurnAgent(requestedAgent, agents).laterOverride);
  restoreAgentFromSession(agentName, undefined, {
    activeAgents: agents,
    allAgents: agents,
  });
  if (agent) saveAgentSetting(agent.agentType);
  let promptIsAgentDefault =
    mainThreadAgent !== undefined &&
    !isBuiltInAgent(mainThreadAgent) &&
    systemPrompt === mainThreadAgent.getSystemPrompt();
  let hasPreviousPrompt = preAgentSystemPrompt !== undefined || promptIsAgentDefault;
  let agentPrompt = agent && !isBuiltInAgent(agent) ? agent.getSystemPrompt() : undefined;
  if (agentPrompt && (!systemPrompt || hasPreviousPrompt))
    return {
      ok: true,
      agentDefinition: agent,
      systemPrompt: agentPrompt,
      preAgentSystemPrompt: preAgentSystemPrompt ?? {
        value: promptIsAgentDefault ? undefined : systemPrompt,
      },
    };
  if (hasPreviousPrompt)
    return {
      ok: true,
      agentDefinition: agent,
      systemPrompt: preAgentSystemPrompt ? preAgentSystemPrompt.value : undefined,
      preAgentSystemPrompt: undefined,
    };
  return {
    ok: true,
    agentDefinition: agent,
    systemPrompt,
    preAgentSystemPrompt,
  };
}
//@ chunk-tyg7f3ek.js:544552-544649 placement
function createAssistantTextTracker() {
  return {
    lastAssistantText: undefined,
    priorAssistantText: undefined,
    partialForResult: undefined,
  };
}
//@ chunk-tyg7f3ek.js:544649-544696 placement
var INCOMPLETE_RESPONSE_NOTE = "The response above may be incomplete.";
//@ chunk-tyg7f3ek.js:544696-545199 placement
function trackAssistantText(tracker, frame) {
  if (frame.type === "system" && frame.subtype === "compact_boundary") {
    resetAssistantText(tracker);
    return;
  }
  if (frame.type === "assistant" && frame.parent_tool_use_id === null) {
    if (frame.supersedes?.length) resetAssistantText(tracker);
    let content = frame.message?.content;
    if (!Array.isArray(content)) return;
    let textContent = extractTextContent_2(
      content.filter((block) => block != null),
      `
`,
    );
    if (textContent) {
      tracker.priorAssistantText = tracker.lastAssistantText;
      tracker.lastAssistantText = textContent;
    }
    return;
  }
  if (frame.type !== "result") return;
  tracker.partialForResult =
    frame.subtype === "success" &&
    frame.is_error &&
    frame.result.endsWith(INCOMPLETE_RESPONSE_NOTE) &&
    tracker.lastAssistantText === frame.result
      ? tracker.priorAssistantText
      : undefined;
  resetAssistantText(tracker);
}
//@ chunk-tyg7f3ek.js:545199-545269 placement
function resetAssistantText(tracker) {
  tracker.lastAssistantText = undefined;
  tracker.priorAssistantText = undefined;
}
//@ chunk-tyg7f3ek.js:545269-546457 placement
class TurnEndPrinter {
  limits;
  lastPrinted = undefined;
  printedCount = 0;
  endsWithNewline = true;
  stopNotices = new WeakMap();
  constructor(limits) {
    this.limits = limits;
  }
  printAtTurnEnd(result, prefix, stderrText) {
    try {
      if (stderrText !== undefined) this.stopNotices.set(result, stderrText);
      if (
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_jazzy_puddle", true) &&
        !isEmptySuccessResult(result, prefix)
      )
        this.print(result, prefix);
    } catch (error) {
      logError(error);
      logFeatureBad("print_text_results", "print_failed");
    }
  }
  printAtExit(result, prefix) {
    if (result !== this.lastPrinted && (this.printedCount === 0 || !isEmptySuccessResult(result, prefix)))
      this.print(result, prefix);
    if (this.printedCount > 1)
      logFeatureOk("print_text_results", {
        results_printed: this.printedCount,
      });
  }
  print(result, prefix) {
    let text;
    switch (result.subtype) {
      case "success": {
        let body =
          prefix === undefined
            ? result.result
            : `${prefix}
${result.result}`;
        text = body.endsWith(`
`)
          ? body
          : body +
            `
`;
        break;
      }
      case "error_during_execution": {
        let stderrText = this.stopNotices.get(result);
        if (stderrText !== undefined)
          process.stderr.write(`${stderrText}
`);
        text = "Execution error";
        break;
      }
      case "error_max_turns":
        text = `Error: Reached max turns (${this.limits.maxTurns})`;
        break;
      case "error_max_budget_usd":
        text = `Error: Exceeded USD budget (${this.limits.maxBudgetUsd})`;
        break;
      case "error_max_structured_output_retries":
        text = `Error: ${result.errors[0] ?? "Failed to provide valid structured output after maximum retries"}`;
    }
    let separator =
      this.printedCount === 0
        ? ""
        : this.endsWithNewline
          ? `
`
          : `

`;
    writeToStdout(separator + text);
    this.lastPrinted = result;
    this.printedCount++;
    this.endsWithNewline = text.endsWith(`
`);
  }
}
//@ chunk-tyg7f3ek.js:546457-546537 placement = getRiskColor (1)
function isEmptySuccessResult(result, prefix) {
  return result.subtype === "success" && prefix === undefined && result.result.trim() === "";
}
//@ chunk-tyg7f3ek.js:546537-546601 placement
var ALLOW_RULE_SOURCES_FOR_MCP = ["cliArg", "flagSettings", "session", "mcpMount", "command"];
//@ chunk-tyg7f3ek.js:546601-546672 placement
function addMcpServerFromRule(servers, rule) {
  let mcpInfo = mcpInfoFromString(permissionRuleValueFromString(rule).toolName);
  if (mcpInfo) servers.add(normalizeNameForMCP(mcpInfo.serverName));
}
//@ chunk-tyg7f3ek.js:546672-546831 placement
function mcpServersNamedByRules(toolPermissionContext) {
  let servers = new Set();
  for (let source of ALLOW_RULE_SOURCES_FOR_MCP)
    for (let rule of toolPermissionContext.alwaysAllowRules[source] ?? [])
      addMcpServerFromRule(servers, rule);
  for (let rule of getNonDeferrableBuiltins()) addMcpServerFromRule(servers, rule);
  for (let serverName of getMcpServersReferencedByHooks()) servers.add(getPrefixServerKey(serverName));
  return servers;
}
//@ chunk-tyg7f3ek.js:546831-547249 placement
function mcpConnectionClosedMessage({ serverName, error, namesMcpCall, detail }) {
  let safeName = sanitizeTelemetryString(serverName);
  let callHint = namesMcpCall ? " mcp_call" : "";
  return `${error.mayHaveRun ? `MCP connection to ${safeName} closed during the call \u2014 send mcp_reconnect, and check whether the tool ran before retrying${callHint}` : `MCP ${error.expiryKind === "connection_closed_call_not_run" ? "connection closed before the call ran on" : "session expired for"} ${safeName} \u2014 send mcp_reconnect and retry${callHint}`}: ${sanitizeTelemetryString(detail)}`;
}
//@ chunk-tyg7f3ek.js:547249-550209 placement
/**
 * 处理 turn_handoff：在准入允许时把当前轮次交给新 worker，回报结果。
 */
function handleTurnHandoff(
  request,
  host,
  reply,
  requestAgeMs,
  requestedAtMs,
  intakePhases,
  uuid,
  disallowedToolsMetadata = [],
) {
  if (request.stopped) {
    host.personStopped();
    MODEL_SWITCH_STATE({
      turnGoesOn: true,
    });
  }
  if (!host.admission.admitted) {
    reply({
      subtype: "error",
      error: `turn_handoff_disabled: ${host.admission.reason}`,
    });
    return {
      kind: "not_queued",
      outcome: "not_admitted",
    };
  }
  try {
    let { messageQueue, drain } = host;
    let queued =
      messageQueue.getCommandQueue().find((queued) => queued.handedOffTurn !== undefined) ??
      (drain.drainingHandoff?.running === false ? drain.drainingHandoff.command : undefined);
    let carriedWrites = host.carriedWritesMode?.();
    let applied = applyTurnHandoff(request, {
      tools: host.tools(),
      acceptedTools: host.admission.tools,
      toolAliases: host.toolAliases(),
      mcpClients: host.mcpClients(),
      messages: host.messages(),
      handledToolUseIds: host.handledToolUseIds,
      recoveredToolUseIds: host.recoveredToolUseIds,
      requestAgeMs,
      pendingHandoff: queued?.handedOffTurn,
      runningHandoff: drain.drainingHandoff?.running
        ? drain.drainingHandoff.command.handedOffTurn
        : undefined,
      carriedWrites: carriedWrites && {
        cwd: getCwd(),
        home: getHomeFilesRoot(),
        permissionMode: carriedWrites,
        switchedOn: isCarriedWritesEnabled(),
      },
      refusalOfAppended: host.refusalOfAppended,
      appliedRewind: host.appliedRewind(),
      linesWaitingAhead: host.linesWaitingAhead(),
    });
    let annotation = (handedOffTurn, taken) => ({
      ...handedOffTurn,
      ...(requestedAtMs !== undefined && {
        requestedAtMs,
      }),
      ...(intakePhases !== undefined && {
        intakePhasesMs: intakePhases,
      }),
      release: () => {
        for (let toolUseId of taken) host.handledToolUseIds.delete(toolUseId);
      },
    });
    let needsRewind = request.requires_rewind_request_id !== undefined;
    switch (applied.kind) {
      case "error":
        if (applied.carriedWrites !== undefined) {
          logEvent("tengu_turn_handoff_carried_writes", {
            at: lit("admission"),
            outcome: lit("refused"),
            refusal: fromEnum(applied.carriedWrites),
          });
          logFeatureSad("ccr_turn_handoff_carried_writes", applied.carriedWrites);
        }
        if (applied.expiredAtAgeMs !== undefined)
          logEvent("tengu_turn_handoff_expired", {
            age_minutes: Math.round(applied.expiredAtAgeMs / 60000),
          });
        if (applied.requiredRewind !== undefined)
          logFeatureSad("ccr_turn_handoff_requires_rewind", applied.requiredRewind);
        reply({
          subtype: "error",
          error: applied.error,
        });
        return {
          kind: "not_queued",
          outcome: "refused",
        };
      case "duplicate":
        if (applied.stopRunning) {
          cancelQueuedAutoInputs();
          drain.abortController?.abort(userAbortReason("remote-cancel"));
          host.stopUnabortedWork();
        }
        reply({
          subtype: "success",
          response: {
            status: "duplicate",
          },
        });
        return {
          kind: "not_queued",
          outcome: "duplicate",
        };
      case "converted":
        queued.handedOffTurn = annotation(applied.handedOffTurn, applied.taken);
        queued.disallowedTools = uniq([...(queued.disallowedTools ?? []), ...disallowedToolsMetadata]);
        queued.turnAttributionKey = undefined;
        queued.handedOffTurnUserMessageUuids = undefined;
        reply({
          subtype: "success",
          response: {
            status: "accepted",
            tool_use_ids: [],
          },
        });
        if (needsRewind) logFeatureOk("ccr_turn_handoff_requires_rewind");
        return {
          kind: "not_queued",
          outcome: "converted",
        };
      case "accepted": {
        let attributionKey =
          applied.handedOffTurn.kind === "run" ? attributionKeyOrUndefined(uuid) : undefined;
        let firstMessage = applied.handedOffTurn.messages[0];
        if (
          applied.handedOffTurn.kind === "run" &&
          firstMessage?.type === "user" &&
          isHumanOrigin(firstMessage.origin)
        )
          host.personWrote?.();
        messageQueue.enqueue({
          mode: "orphaned-permission",
          agentId: mainAgentId(),
          value: [],
          handedOffTurn: annotation(applied.handedOffTurn, applied.taken),
          ...(attributionKey !== undefined && {
            turnAttributionKey: attributionKey,
            handedOffTurnUserMessageUuids:
              firstMessage?.type === "user" ? [firstMessage.uuid, attributionKey] : [attributionKey],
          }),
          ...(applied.clientPlatform !== undefined && {
            clientPlatform: applied.clientPlatform,
          }),
          disallowedTools: disallowedToolsMetadata,
          replacesDisallowedTools: true,
        });
        reply({
          subtype: "success",
          response: {
            status: "accepted",
            tool_use_ids: [...applied.handedOffTurn.toolUseIDs],
          },
        });
        if (needsRewind) logFeatureOk("ccr_turn_handoff_requires_rewind");
        host.kick();
        return {
          kind: "queued",
        };
      }
    }
  } catch (error) {
    reply(controlHandlerError(host.redactsPersistedLane(), "turn_handoff", error));
    return {
      kind: "not_queued",
      outcome: "handler_threw",
    };
  }
}
export {
  createAssistantTextTracker,
  TurnEndPrinter,
  trackAssistantText,
  createPeerMessageRouter,
  mcpServersNamedByRules,
  mcpConnectionClosedMessage,
  resolveTurnAgent,
  applyRequestedAgent,
  reportCommandRefused,
  handleTurnHandoff,
  dropBeforeAttachments,
  acceptStdinPeerMessage,
};
