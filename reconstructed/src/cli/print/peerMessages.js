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
function reportPeerLifecycle(e, n, r) {
  let s = n.laneOf(r);
  if (s === undefined) return;
  let h = bridgeMessageUuid(r.uuid, s);
  if (h !== undefined) e.onCommandLifecycle?.(h, refusedLifecycleState());
}
//@ chunk-tyg7f3ek.js:540247-540258 placement
var PEER_NAME_MAX = 200;
//@ chunk-tyg7f3ek.js:540258-540857 placement
function formatPeerMessage(output, hostIngressLanes, remoteTransport, s, h) {
  let origin = s.origin?.kind === "peer" ? s.origin : undefined;
  let S = hostIngressLanes.laneOf(s) ?? "socket";
  let R = S === "stdin" && !remoteTransport;
  let from =
    typeof origin?.from !== "string"
      ? ""
      : R
        ? truncateToLength(normalizeForDisplay(origin.from), PEER_NAME_MAX)
        : isPeerAddress(origin.from)
          ? normalizeForDisplay(origin.from)
          : "";
  let P = typeof origin?.name === "string" ? normalizeForDisplay(clipTeammateText(origin.name)) : undefined;
  let L =
    typeof s.uuid !== "string"
      ? undefined
      : S === "socket" || (S === "stdin" && !R)
        ? (normalizeUuidOrNull(s.uuid) ?? undefined)
        : bridgeMessageUuid(s.uuid, S);
  let q = {
    type: "system",
    subtype: "peer_message_hold",
    state: h.state,
    ...(L !== undefined && {
      message_uuid: L,
    }),
    lane: S,
    from,
    ...(P !== undefined &&
      P !== "" && {
        from_name: P,
      }),
    ...(h.state === "held" && {
      cause: h.cause,
    }),
    ...(h.state === "dropped" && {
      outcome: h.outcome,
    }),
    uuid: randomUUID(),
    session_id: getSessionId(),
  };
  output.enqueue(q);
}
//@ chunk-tyg7f3ek.js:540857-540935 placement
function reportCommandRefused(e, uuid, r) {
  let s = bridgeMessageUuid(uuid, r);
  if (s !== undefined) e.onCommandLifecycle?.(s, refusedLifecycleState());
}
//@ chunk-tyg7f3ek.js:540935-540984 placement
function refusedLifecycleState() {
  return isInboundShuttingDown() ? "discarded" : "refused";
}
//@ chunk-tyg7f3ek.js:540984-541301 placement
function dropBeforeAttachments({ io, uuid, peerFrom, hostInjectedPeer, ingressOrigin }) {
  let y = peerFrom
    ? hostInjectedPeer
      ? getInboundRefuseCause({
          kind: "peer",
          hostInjected: true,
        })
      : inboundRefuseCause()
    : getInboundRefuseCause(ingressOrigin);
  if (y === undefined) return false;
  logInboundRefused(
    hostInjectedPeer
      ? "local stdin (host-injected): dropped before attachment materialization"
      : "remote-io: dropped before attachment materialization",
    y,
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
  let R = peerFrom
    ? hostInjectedPeer
      ? gatedPeerPolicy(command)
      : gatedPolicyFor(command)
    : gateInboundByOrigin(ingressOrigin, command);
  if (R === "refused") reportCommandRefused(io, uuid, "stdin");
  return R === "accept";
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
  let S = new Map();
  let R = (L) => {
    let q = S.get(L);
    if (q !== undefined) {
      clearTimeout(q);
      S.delete(L);
    }
  };
  let weakMap = new WeakMap();
  setOnPeerHoldReleased((L) => {
    for (let q of L) {
      R(q);
      if (weakMap.delete(q))
        formatPeerMessage(output, hostIngressLanes, remoteTransport, q, {
          state: "released",
        });
      let x = hostIngressLanes.laneOf(q);
      let G = x === undefined ? q.uuid : bridgeMessageUuid(q.uuid, x);
      if (G !== undefined) io.onCommandLifecycle?.(G, "queued");
    }
  });
  setOnPeerHeld((L, q, x) => {
    R(L);
    if (weakMap.get(L) !== x) {
      weakMap.set(L, x);
      formatPeerMessage(output, hostIngressLanes, remoteTransport, L, {
        state: "held",
        cause: x,
      });
    }
    if (x !== "mode-mismatch" && x !== "no-mode-asserted") return;
    let userDialogTimeoutMs = getUserDialogTimeoutMs();
    if (userDialogTimeoutMs <= 0) return;
    let timer = setTimeout(
      (re, Ae, Ue, ce, nt, ie, Se) => {
        Ae.delete(re);
        refreshAndReevaluateHeld("policy-accepts");
        let me = announcedHeldMessage(re);
        if (
          (me === "mode-mismatch" || me === "no-mode-asserted") &&
          !Ae.has(re) &&
          resolveHeldMessage(re, "cancelled") === "dropped"
        ) {
          logForDebugging(
            "[cross-session-inbound] headless: held peer message expired (no approval surface) \u2014 dropped with an expired receipt",
          );
          ie.delete(re);
          formatPeerMessage(nt, ce, Se, re, {
            state: "dropped",
            outcome: "expired",
          });
          reportPeerLifecycle(Ue, ce, re);
        }
      },
      userDialogTimeoutMs,
      L,
      S,
      io,
      hostIngressLanes,
      output,
      weakMap,
      remoteTransport,
    );
    timer.unref();
    S.set(L, timer);
  });
  setOnPeerHoldDropped((L, q) => {
    R(L);
    if (weakMap.delete(L))
      formatPeerMessage(output, hostIngressLanes, remoteTransport, L, {
        state: "dropped",
        outcome: isInboundShuttingDown() ? "discarded" : q,
      });
    reportPeerLifecycle(io, hostIngressLanes, L);
  });
  for (let L of heldInboundMessages())
    if (!weakMap.has(L)) {
      let q = announcedHeldMessage(L) ?? "mode-unknown";
      weakMap.set(L, q);
      formatPeerMessage(output, hostIngressLanes, remoteTransport, L, {
        state: "held",
        cause: q,
      });
    }
  setInboundModeGetter(readMode);
  let P = settingsChangeDetector.subscribe(() => {
    refreshAndReevaluateHeld("policy-accepts");
  });
  if (publishesAvailability) {
    let L;
    setInboundAvailabilityPublisher((q) => {
      let x = q ? "available" : "unavailable";
      if (x === L) return;
      L = x;
      io.sessionState.notifyMetadataChanged({
        cross_session_inbound: x,
      });
    });
  }
  return () => {
    P();
    setInboundAvailabilityPublisher(null);
  };
}
//@ chunk-tyg7f3ek.js:542913-543610 placement
function resolveTurnAgent(agent, n) {
  if (agent != null && typeof agent !== "string")
    return {
      now: undefined,
      later: undefined,
      laterOverride: undefined,
    };
  let r = typeof agent === "string" && agent !== "" ? findAgentExcludingWebFetch(n, agent) : undefined;
  if (typeof agent === "string" && agent !== "" && !r)
    return {
      now: undefined,
      later: undefined,
      laterOverride: undefined,
    };
  let s = r?.model && r.model !== "inherit" ? parseUserSpecifiedModel(r.model) : undefined;
  let h = s !== undefined && (isExemptDefaultResolvingPick(s) || isModelAllowed(s)) ? s : undefined;
  let mainThreadAgentType = getMainThreadAgentType();
  let S = mainThreadAgentType ? n.find((G) => G.agentType === mainThreadAgentType) : undefined;
  let R = S?.model && S.model !== "inherit" ? parseUserSpecifiedModel(S.model) : undefined;
  let w = h ?? getBaselineModelSetting() ?? null;
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  let L =
    refusalFallbackModelLatch && R !== undefined && refusalFallbackModelLatch.previousOverride === R
      ? w
      : undefined;
  let laterOverride = L !== undefined ? h : undefined;
  let mainLoopModelOverride = getMainLoopModelOverride();
  if (mainLoopModelOverride !== undefined && mainLoopModelOverride !== null) {
    if (R === undefined || mainLoopModelOverride !== R)
      return {
        now: undefined,
        later: L,
        laterOverride,
      };
    return {
      now: w,
      later: L,
      laterOverride,
    };
  }
  return {
    now: h,
    later: L,
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
  let h = typeof requestedAgent === "string" && requestedAgent !== "" ? requestedAgent : undefined;
  let y = h ? findAgentExcludingWebFetch(agents, h) : undefined;
  if (h && !y)
    return {
      ok: false,
      error: `Agent "${h}" not found`,
    };
  let mainThreadAgentType = getMainThreadAgentType();
  let R = mainThreadAgentType ? agents.find((agent) => agent.agentType === mainThreadAgentType) : undefined;
  if (R?.model && R.model !== "inherit" && getMainLoopModelOverride() === parseUserSpecifiedModel(R.model))
    setMainLoopModelOverride(undefined);
  let refusalFallbackModelLatch = getRefusalFallbackModelLatch();
  if (
    refusalFallbackModelLatch &&
    R?.model &&
    R.model !== "inherit" &&
    refusalFallbackModelLatch.previousOverride === parseUserSpecifiedModel(R.model)
  )
    rewriteRefusalFallbackPreviousOverride(resolveTurnAgent(requestedAgent, agents).laterOverride);
  restoreAgentFromSession(h, undefined, {
    activeAgents: agents,
    allAgents: agents,
  });
  if (y) saveAgentSetting(y.agentType);
  let P = R !== undefined && !isBuiltInAgent(R) && systemPrompt === R.getSystemPrompt();
  let L = preAgentSystemPrompt !== undefined || P;
  let q = y && !isBuiltInAgent(y) ? y.getSystemPrompt() : undefined;
  if (q && (!systemPrompt || L))
    return {
      ok: true,
      agentDefinition: y,
      systemPrompt: q,
      preAgentSystemPrompt: preAgentSystemPrompt ?? {
        value: P ? undefined : systemPrompt,
      },
    };
  if (L)
    return {
      ok: true,
      agentDefinition: y,
      systemPrompt: preAgentSystemPrompt ? preAgentSystemPrompt.value : undefined,
      preAgentSystemPrompt: undefined,
    };
  return {
    ok: true,
    agentDefinition: y,
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
function trackAssistantText(assistantTextTracker, n) {
  if (n.type === "system" && n.subtype === "compact_boundary") {
    resetAssistantText(assistantTextTracker);
    return;
  }
  if (n.type === "assistant" && n.parent_tool_use_id === null) {
    if (n.supersedes?.length) resetAssistantText(assistantTextTracker);
    let content = n.message?.content;
    if (!Array.isArray(content)) return;
    let textContent = extractTextContent_2(
      content.filter((h) => h != null),
      `
`,
    );
    if (textContent) {
      assistantTextTracker.priorAssistantText = assistantTextTracker.lastAssistantText;
      assistantTextTracker.lastAssistantText = textContent;
    }
    return;
  }
  if (n.type !== "result") return;
  assistantTextTracker.partialForResult =
    n.subtype === "success" &&
    n.is_error &&
    n.result.endsWith(INCOMPLETE_RESPONSE_NOTE) &&
    assistantTextTracker.lastAssistantText === n.result
      ? assistantTextTracker.priorAssistantText
      : undefined;
  resetAssistantText(assistantTextTracker);
}
//@ chunk-tyg7f3ek.js:545199-545269 placement
function resetAssistantText(e) {
  e.lastAssistantText = undefined;
  e.priorAssistantText = undefined;
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
  printAtTurnEnd(e, n, r) {
    try {
      if (r !== undefined) this.stopNotices.set(e, r);
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_jazzy_puddle", true) && !isEmptySuccessResult(e, n))
        this.print(e, n);
    } catch (error) {
      logError(error);
      logFeatureBad("print_text_results", "print_failed");
    }
  }
  printAtExit(e, n) {
    if (e !== this.lastPrinted && (this.printedCount === 0 || !isEmptySuccessResult(e, n))) this.print(e, n);
    if (this.printedCount > 1)
      logFeatureOk("print_text_results", {
        results_printed: this.printedCount,
      });
  }
  print(e, n) {
    let r;
    switch (e.subtype) {
      case "success": {
        let h =
          n === undefined
            ? e.result
            : `${n}
${e.result}`;
        r = h.endsWith(`
`)
          ? h
          : h +
            `
`;
        break;
      }
      case "error_during_execution": {
        let h = this.stopNotices.get(e);
        if (h !== undefined)
          process.stderr.write(`${h}
`);
        r = "Execution error";
        break;
      }
      case "error_max_turns":
        r = `Error: Reached max turns (${this.limits.maxTurns})`;
        break;
      case "error_max_budget_usd":
        r = `Error: Exceeded USD budget (${this.limits.maxBudgetUsd})`;
        break;
      case "error_max_structured_output_retries":
        r = `Error: ${e.errors[0] ?? "Failed to provide valid structured output after maximum retries"}`;
    }
    let s =
      this.printedCount === 0
        ? ""
        : this.endsWithNewline
          ? `
`
          : `

`;
    writeToStdout(s + r);
    this.lastPrinted = e;
    this.printedCount++;
    this.endsWithNewline = r.endsWith(`
`);
  }
}
//@ chunk-tyg7f3ek.js:546457-546537 placement = getRiskColor (1)
function isEmptySuccessResult(e, n) {
  return e.subtype === "success" && n === undefined && e.result.trim() === "";
}
//@ chunk-tyg7f3ek.js:546537-546601 placement
var ALLOW_RULE_SOURCES_FOR_MCP = ["cliArg", "flagSettings", "session", "mcpMount", "command"];
//@ chunk-tyg7f3ek.js:546601-546672 placement
function addMcpServerFromRule(e, n) {
  let r = mcpInfoFromString(permissionRuleValueFromString(n).toolName);
  if (r) e.add(normalizeNameForMCP(r.serverName));
}
//@ chunk-tyg7f3ek.js:546672-546831 placement
function mcpServersNamedByRules(toolPermissionContext) {
  let n = new Set();
  for (let r of ALLOW_RULE_SOURCES_FOR_MCP)
    for (let s of toolPermissionContext.alwaysAllowRules[r] ?? []) addMcpServerFromRule(n, s);
  for (let r of getNonDeferrableBuiltins()) addMcpServerFromRule(n, r);
  for (let r of getMcpServersReferencedByHooks()) n.add(getPrefixServerKey(r));
  return n;
}
//@ chunk-tyg7f3ek.js:546831-547249 placement
function mcpConnectionClosedMessage({ serverName, error, namesMcpCall, detail }) {
  let h = sanitizeTelemetryString(serverName);
  let y = namesMcpCall ? " mcp_call" : "";
  return `${error.mayHaveRun ? `MCP connection to ${h} closed during the call \u2014 send mcp_reconnect, and check whether the tool ran before retrying${y}` : `MCP ${error.expiryKind === "connection_closed_call_not_run" ? "connection closed before the call ran on" : "session expired for"} ${h} \u2014 send mcp_reconnect and retry${y}`}: ${sanitizeTelemetryString(detail)}`;
}
//@ chunk-tyg7f3ek.js:547249-550209 placement
/**
 * 处理 turn_handoff：在准入允许时把当前轮次交给新 worker，回报结果。
 */
function handleTurnHandoff(request, n, r, requestAgeMs, h, y, uuid, disallowedToolsMetadata = []) {
  if (request.stopped) {
    n.personStopped();
    MODEL_SWITCH_STATE({
      turnGoesOn: true,
    });
  }
  if (!n.admission.admitted) {
    r({
      subtype: "error",
      error: `turn_handoff_disabled: ${n.admission.reason}`,
    });
    return {
      kind: "not_queued",
      outcome: "not_admitted",
    };
  }
  try {
    let { messageQueue, drain } = n;
    let L =
      messageQueue.getCommandQueue().find((re) => re.handedOffTurn !== undefined) ??
      (drain.drainingHandoff?.running === false ? drain.drainingHandoff.command : undefined);
    let q = n.carriedWritesMode?.();
    let x = applyTurnHandoff(request, {
      tools: n.tools(),
      acceptedTools: n.admission.tools,
      toolAliases: n.toolAliases(),
      mcpClients: n.mcpClients(),
      messages: n.messages(),
      handledToolUseIds: n.handledToolUseIds,
      recoveredToolUseIds: n.recoveredToolUseIds,
      requestAgeMs,
      pendingHandoff: L?.handedOffTurn,
      runningHandoff: drain.drainingHandoff?.running
        ? drain.drainingHandoff.command.handedOffTurn
        : undefined,
      carriedWrites: q && {
        cwd: getCwd(),
        home: getHomeFilesRoot(),
        permissionMode: q,
        switchedOn: isCarriedWritesEnabled(),
      },
      refusalOfAppended: n.refusalOfAppended,
      appliedRewind: n.appliedRewind(),
      linesWaitingAhead: n.linesWaitingAhead(),
    });
    let G = (handedOffTurn, taken) => ({
      ...handedOffTurn,
      ...(h !== undefined && {
        requestedAtMs: h,
      }),
      ...(y !== undefined && {
        intakePhasesMs: y,
      }),
      release: () => {
        for (let Ue of taken) n.handledToolUseIds.delete(Ue);
      },
    });
    let Z = request.requires_rewind_request_id !== undefined;
    switch (x.kind) {
      case "error":
        if (x.carriedWrites !== undefined) {
          logEvent("tengu_turn_handoff_carried_writes", {
            at: lit("admission"),
            outcome: lit("refused"),
            refusal: fromEnum(x.carriedWrites),
          });
          logFeatureSad("ccr_turn_handoff_carried_writes", x.carriedWrites);
        }
        if (x.expiredAtAgeMs !== undefined)
          logEvent("tengu_turn_handoff_expired", {
            age_minutes: Math.round(x.expiredAtAgeMs / 60000),
          });
        if (x.requiredRewind !== undefined)
          logFeatureSad("ccr_turn_handoff_requires_rewind", x.requiredRewind);
        r({
          subtype: "error",
          error: x.error,
        });
        return {
          kind: "not_queued",
          outcome: "refused",
        };
      case "duplicate":
        if (x.stopRunning) {
          cancelQueuedAutoInputs();
          drain.abortController?.abort(userAbortReason("remote-cancel"));
          n.stopUnabortedWork();
        }
        r({
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
        L.handedOffTurn = G(x.handedOffTurn, x.taken);
        L.disallowedTools = uniq([...(L.disallowedTools ?? []), ...disallowedToolsMetadata]);
        L.turnAttributionKey = undefined;
        L.handedOffTurnUserMessageUuids = undefined;
        r({
          subtype: "success",
          response: {
            status: "accepted",
            tool_use_ids: [],
          },
        });
        if (Z) logFeatureOk("ccr_turn_handoff_requires_rewind");
        return {
          kind: "not_queued",
          outcome: "converted",
        };
      case "accepted": {
        let re = x.handedOffTurn.kind === "run" ? attributionKeyOrUndefined(uuid) : undefined;
        let Ae = x.handedOffTurn.messages[0];
        if (x.handedOffTurn.kind === "run" && Ae?.type === "user" && isHumanOrigin(Ae.origin))
          n.personWrote?.();
        messageQueue.enqueue({
          mode: "orphaned-permission",
          agentId: mainAgentId(),
          value: [],
          handedOffTurn: G(x.handedOffTurn, x.taken),
          ...(re !== undefined && {
            turnAttributionKey: re,
            handedOffTurnUserMessageUuids: Ae?.type === "user" ? [Ae.uuid, re] : [re],
          }),
          ...(x.clientPlatform !== undefined && {
            clientPlatform: x.clientPlatform,
          }),
          disallowedTools: disallowedToolsMetadata,
          replacesDisallowedTools: true,
        });
        r({
          subtype: "success",
          response: {
            status: "accepted",
            tool_use_ids: [...x.handedOffTurn.toolUseIDs],
          },
        });
        if (Z) logFeatureOk("ccr_turn_handoff_requires_rewind");
        n.kick();
        return {
          kind: "queued",
        };
      }
    }
  } catch (error) {
    r(controlHandlerError(n.redactsPersistedLane(), "turn_handoff", error));
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
