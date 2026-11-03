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
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
} from "crypto";
import { bridgeMessageUuid } from "./hostTelemetryProxy.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { normalizeForDisplay } from "../../utils/resultError.js";
import { $ge } from "../../utils/peerMessageHeaders.js";
import { Hb } from "../../utils/swarm/teammateIds.js";
import { Vt } from "../../utils/agentId.js";
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
  Cvo,
  getInboundRefuseCause,
  a$t,
  logInboundRefused,
  Avo,
  Mon,
  gateInboundByOrigin,
  _Le,
  resolveHeldMessage,
  wHs,
} from "../../utils/crossSessionInbound/inboundGate.js";
import {
  Oon,
  xon,
  vvo,
  Ion,
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
import { applyTurnHandoff, aQe } from "../remoteIO/turnHandoff.js";
import { getCwd } from "../../utils/cwd.js";
import { getHomeFilesRoot } from "../../utils/stageFileRoots.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { userAbortReason } from "../../utils/abortController.js";
import { uniq } from "../../utils/collections.js";
import { Rlt } from "../../utils/turnAttributionKey.js";
import { isHumanOrigin } from "../../utils/turnOrigin.js";
import { controlHandlerError } from "./dispatchControlRequest.js";

//@ chunk-tyg7f3ek.js:540125-540247 placement
function reportPeerLifecycle(e, n, r) {
  let laneOf = n.laneOf(r);
  if (laneOf === void 0) return;
  let h = bridgeMessageUuid(r.uuid, laneOf);
  if (h !== void 0) e.onCommandLifecycle?.(h, refusedLifecycleState());
}
//@ chunk-tyg7f3ek.js:540247-540258 placement
var PEER_NAME_MAX = 200;
//@ chunk-tyg7f3ek.js:540258-540857 placement
function formatPeerMessage(e, n, r, s, h) {
  let y = s.origin?.kind === "peer" ? s.origin : void 0,
    S = n.laneOf(s) ?? "socket",
    R = S === "stdin" && !r,
    w =
      typeof y?.from !== "string"
        ? ""
        : R
          ? truncateToLength(normalizeForDisplay(y.from), PEER_NAME_MAX)
          : $ge(y.from)
            ? normalizeForDisplay(y.from)
            : "",
    P = typeof y?.name === "string" ? normalizeForDisplay(Hb(y.name)) : void 0,
    L =
      typeof s.uuid !== "string"
        ? void 0
        : S === "socket" || (S === "stdin" && !R)
          ? (Vt(s.uuid) ?? void 0)
          : bridgeMessageUuid(s.uuid, S),
    q = {
      type: "system",
      subtype: "peer_message_hold",
      state: h.state,
      ...(L !== void 0 && { message_uuid: L }),
      lane: S,
      from: w,
      ...(P !== void 0 && P !== "" && { from_name: P }),
      ...(h.state === "held" && { cause: h.cause }),
      ...(h.state === "dropped" && { outcome: h.outcome }),
      uuid: randomUUID_20(),
      session_id: getSessionId(),
    };
  e.enqueue(q);
}
//@ chunk-tyg7f3ek.js:540857-540935 placement
function reportCommandRefused(e, n, r) {
  let s = bridgeMessageUuid(n, r);
  if (s !== void 0) e.onCommandLifecycle?.(s, refusedLifecycleState());
}
//@ chunk-tyg7f3ek.js:540935-540984 placement
function refusedLifecycleState() {
  return Cvo() ? "discarded" : "refused";
}
//@ chunk-tyg7f3ek.js:540984-541301 placement
function dropBeforeAttachments({
  io: io,
  uuid: uuid,
  peerFrom: peerFrom,
  hostInjectedPeer: hostInjectedPeer,
  ingressOrigin: ingressOrigin,
}) {
  let y = peerFrom
    ? hostInjectedPeer
      ? getInboundRefuseCause({ kind: "peer", hostInjected: !0 })
      : a$t()
    : getInboundRefuseCause(ingressOrigin);
  if (y === void 0) return !1;
  return (
    logInboundRefused(
      hostInjectedPeer
        ? "local stdin (host-injected): dropped before attachment materialization"
        : "remote-io: dropped before attachment materialization",
      y,
    ),
    reportCommandRefused(io, uuid, "stdin"),
    !0
  );
}
//@ chunk-tyg7f3ek.js:541301-541507 placement
function acceptStdinPeerMessage({
  io: io,
  hostIngressLanes: hostIngressLanes,
  command: command,
  uuid: uuid,
  peerFrom: peerFrom,
  hostInjectedPeer: hostInjectedPeer,
  ingressOrigin: ingressOrigin,
}) {
  hostIngressLanes.mark(command, "stdin");
  let R = peerFrom
    ? hostInjectedPeer
      ? Avo(command)
      : Mon(command)
    : gateInboundByOrigin(ingressOrigin, command);
  if (R === "refused") reportCommandRefused(io, uuid, "stdin");
  return R === "accept";
}
/**
 * 跨会话（peer）消息路由：区分 stdin/socket/bridge 来源，按权限模式接收、暂存或过期丢弃。
 */
//@ chunk-tyg7f3ek.js:541507-542913 placement
function createPeerMessageRouter({
  output: output,
  io: io,
  hostIngressLanes: hostIngressLanes,
  readMode: readMode,
  remoteTransport: remoteTransport,
  publishesAvailability: publishesAvailability,
}) {
  let S = new Map(),
    R = (L) => {
      let q = S.get(L);
      if (q !== void 0) (clearTimeout(q), S.delete(L));
    },
    weakMap = new WeakMap();
  (Oon((L) => {
    for (let q of L) {
      if ((R(q), weakMap.delete(q)))
        formatPeerMessage(output, hostIngressLanes, remoteTransport, q, { state: "released" });
      let laneOf = hostIngressLanes.laneOf(q),
        G = laneOf === void 0 ? q.uuid : bridgeMessageUuid(q.uuid, laneOf);
      if (G !== void 0) io.onCommandLifecycle?.(G, "queued");
    }
  }),
    xon((L, q, x) => {
      if ((R(L), weakMap.get(L) !== x))
        (weakMap.set(L, x),
          formatPeerMessage(output, hostIngressLanes, remoteTransport, L, { state: "held", cause: x }));
      if (x !== "mode-mismatch" && x !== "no-mode-asserted") return;
      let G = getUserDialogTimeoutMs();
      if (G <= 0) return;
      let Z = setTimeout(
        (re, Ae, Ue, ce, nt, ie, Se) => {
          (Ae.delete(re), _Le("policy-accepts"));
          let me = vvo(re);
          if (
            (me === "mode-mismatch" || me === "no-mode-asserted") &&
            !Ae.has(re) &&
            resolveHeldMessage(re, "cancelled") === "dropped"
          )
            (logForDebugging(
              "[cross-session-inbound] headless: held peer message expired (no approval surface) \u2014 dropped with an expired receipt",
            ),
              ie.delete(re),
              formatPeerMessage(nt, ce, Se, re, { state: "dropped", outcome: "expired" }),
              reportPeerLifecycle(Ue, ce, re));
        },
        G,
        L,
        S,
        io,
        hostIngressLanes,
        output,
        weakMap,
        remoteTransport,
      );
      (Z.unref(), S.set(L, Z));
    }),
    Ion((L, q) => {
      if ((R(L), weakMap.delete(L)))
        formatPeerMessage(output, hostIngressLanes, remoteTransport, L, {
          state: "dropped",
          outcome: Cvo() ? "discarded" : q,
        });
      reportPeerLifecycle(io, hostIngressLanes, L);
    }));
  for (let L of wHs())
    if (!weakMap.has(L)) {
      let q = vvo(L) ?? "mode-unknown";
      (weakMap.set(L, q),
        formatPeerMessage(output, hostIngressLanes, remoteTransport, L, { state: "held", cause: q }));
    }
  setInboundModeGetter(readMode);
  let subscribe = settingsChangeDetector.subscribe(() => {
    _Le("policy-accepts");
  });
  if (publishesAvailability) {
    let L;
    setInboundAvailabilityPublisher((q) => {
      let x = q ? "available" : "unavailable";
      if (x === L) return;
      ((L = x), io.sessionState.notifyMetadataChanged({ cross_session_inbound: x }));
    });
  }
  return () => {
    (subscribe(), setInboundAvailabilityPublisher(null));
  };
}
//@ chunk-tyg7f3ek.js:542913-543610 placement
function resolveTurnAgent(e, n) {
  if (e != null && typeof e !== "string") return { now: void 0, later: void 0, laterOverride: void 0 };
  let r = typeof e === "string" && e !== "" ? findAgentExcludingWebFetch(n, e) : void 0;
  if (typeof e === "string" && e !== "" && !r) return { now: void 0, later: void 0, laterOverride: void 0 };
  let s = r?.model && r.model !== "inherit" ? parseUserSpecifiedModel(r.model) : void 0,
    h = s !== void 0 && (isExemptDefaultResolvingPick(s) || isModelAllowed(s)) ? s : void 0,
    y = getMainThreadAgentType(),
    S = y ? n.find((G) => G.agentType === y) : void 0,
    R = S?.model && S.model !== "inherit" ? parseUserSpecifiedModel(S.model) : void 0,
    w = h ?? getBaselineModelSetting() ?? null,
    P = getRefusalFallbackModelLatch(),
    L = P && R !== void 0 && P.previousOverride === R ? w : void 0,
    q = L !== void 0 ? h : void 0,
    x = getMainLoopModelOverride();
  if (x !== void 0 && x !== null) {
    if (R === void 0 || x !== R) return { now: void 0, later: L, laterOverride: q };
    return { now: w, later: L, laterOverride: q };
  }
  return { now: h, later: L, laterOverride: q };
}
//@ chunk-tyg7f3ek.js:543610-544552 placement
function applyRequestedAgent({
  requestedAgent: requestedAgent,
  agents: agents,
  systemPrompt: systemPrompt,
  preAgentSystemPrompt: preAgentSystemPrompt,
}) {
  if (requestedAgent != null && typeof requestedAgent !== "string")
    return { ok: !1, error: "agent must be a string or null" };
  let h = typeof requestedAgent === "string" && requestedAgent !== "" ? requestedAgent : void 0,
    y = h ? findAgentExcludingWebFetch(agents, h) : void 0;
  if (h && !y) return { ok: !1, error: `Agent "${h}" not found` };
  let S = getMainThreadAgentType(),
    R = S ? agents.find((x) => x.agentType === S) : void 0;
  if (R?.model && R.model !== "inherit" && getMainLoopModelOverride() === parseUserSpecifiedModel(R.model))
    setMainLoopModelOverride(void 0);
  let w = getRefusalFallbackModelLatch();
  if (w && R?.model && R.model !== "inherit" && w.previousOverride === parseUserSpecifiedModel(R.model))
    rewriteRefusalFallbackPreviousOverride(resolveTurnAgent(requestedAgent, agents).laterOverride);
  if ((restoreAgentFromSession(h, void 0, { activeAgents: agents, allAgents: agents }), y))
    saveAgentSetting(y.agentType);
  let P = R !== void 0 && !isBuiltInAgent(R) && systemPrompt === R.getSystemPrompt(),
    L = preAgentSystemPrompt !== void 0 || P,
    q = y && !isBuiltInAgent(y) ? y.getSystemPrompt() : void 0;
  if (q && (!systemPrompt || L))
    return {
      ok: !0,
      agentDefinition: y,
      systemPrompt: q,
      preAgentSystemPrompt: preAgentSystemPrompt ?? { value: P ? void 0 : systemPrompt },
    };
  if (L)
    return {
      ok: !0,
      agentDefinition: y,
      systemPrompt: preAgentSystemPrompt ? preAgentSystemPrompt.value : void 0,
      preAgentSystemPrompt: void 0,
    };
  return {
    ok: !0,
    agentDefinition: y,
    systemPrompt: systemPrompt,
    preAgentSystemPrompt: preAgentSystemPrompt,
  };
}
//@ chunk-tyg7f3ek.js:544552-544649 placement
function createAssistantTextTracker() {
  return { lastAssistantText: void 0, priorAssistantText: void 0, partialForResult: void 0 };
}
//@ chunk-tyg7f3ek.js:544649-544696 placement
var INCOMPLETE_RESPONSE_NOTE = "The response above may be incomplete.";
//@ chunk-tyg7f3ek.js:544696-545199 placement
function trackAssistantText(e, n) {
  if (n.type === "system" && n.subtype === "compact_boundary") {
    resetAssistantText(e);
    return;
  }
  if (n.type === "assistant" && n.parent_tool_use_id === null) {
    if (n.supersedes?.length) resetAssistantText(e);
    let r = n.message?.content;
    if (!Array.isArray(r)) return;
    let s = extractTextContent_2(
      r.filter((h) => h != null),
      `
`,
    );
    if (s) ((e.priorAssistantText = e.lastAssistantText), (e.lastAssistantText = s));
    return;
  }
  if (n.type !== "result") return;
  ((e.partialForResult =
    n.subtype === "success" &&
    n.is_error &&
    n.result.endsWith(INCOMPLETE_RESPONSE_NOTE) &&
    e.lastAssistantText === n.result
      ? e.priorAssistantText
      : void 0),
    resetAssistantText(e));
}
//@ chunk-tyg7f3ek.js:545199-545269 placement
function resetAssistantText(e) {
  ((e.lastAssistantText = void 0), (e.priorAssistantText = void 0));
}
//@ chunk-tyg7f3ek.js:545269-546457 placement
class TurnEndPrinter {
  limits;
  lastPrinted = void 0;
  printedCount = 0;
  endsWithNewline = !0;
  stopNotices = new WeakMap();
  constructor(e) {
    this.limits = e;
  }
  printAtTurnEnd(e, n, r) {
    try {
      if (r !== void 0) this.stopNotices.set(e, r);
      if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_jazzy_puddle", !0) && !isEmptySuccessResult(e, n))
        this.print(e, n);
    } catch (error) {
      (logError(error), logFeatureBad("print_text_results", "print_failed"));
    }
  }
  printAtExit(e, n) {
    if (e !== this.lastPrinted && (this.printedCount === 0 || !isEmptySuccessResult(e, n))) this.print(e, n);
    if (this.printedCount > 1) logFeatureOk("print_text_results", { results_printed: this.printedCount });
  }
  print(e, n) {
    let r;
    switch (e.subtype) {
      case "success": {
        let h =
          n === void 0
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
        if (h !== void 0)
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
    (writeToStdout(s + r),
      (this.lastPrinted = e),
      this.printedCount++,
      (this.endsWithNewline = r.endsWith(`
`)));
  }
}
//@ chunk-tyg7f3ek.js:546457-546537 placement = getRiskColor (1)
function isEmptySuccessResult(e, n) {
  return e.subtype === "success" && n === void 0 && e.result.trim() === "";
}
//@ chunk-tyg7f3ek.js:546537-546601 placement
var ALLOW_RULE_SOURCES_FOR_MCP = ["cliArg", "flagSettings", "session", "mcpMount", "command"];
//@ chunk-tyg7f3ek.js:546601-546672 placement
function addMcpServerFromRule(e, n) {
  let r = mcpInfoFromString(permissionRuleValueFromString(n).toolName);
  if (r) e.add(normalizeNameForMCP(r.serverName));
}
//@ chunk-tyg7f3ek.js:546672-546831 placement
function mcpServersNamedByRules(e) {
  let n = new Set();
  for (let r of ALLOW_RULE_SOURCES_FOR_MCP)
    for (let s of e.alwaysAllowRules[r] ?? []) addMcpServerFromRule(n, s);
  for (let r of getNonDeferrableBuiltins()) addMcpServerFromRule(n, r);
  for (let r of getMcpServersReferencedByHooks()) n.add(getPrefixServerKey(r));
  return n;
}
//@ chunk-tyg7f3ek.js:546831-547249 placement
function mcpConnectionClosedMessage({
  serverName: serverName,
  error: error,
  namesMcpCall: namesMcpCall,
  detail: detail,
}) {
  let h = sanitizeTelemetryString(serverName),
    y = namesMcpCall ? " mcp_call" : "";
  return `${error.mayHaveRun ? `MCP connection to ${h} closed during the call \u2014 send mcp_reconnect, and check whether the tool ran before retrying${y}` : `MCP ${error.expiryKind === "connection_closed_call_not_run" ? "connection closed before the call ran on" : "session expired for"} ${h} \u2014 send mcp_reconnect and retry${y}`}: ${sanitizeTelemetryString(detail)}`;
}
/**
 * 处理 turn_handoff：在准入允许时把当前轮次交给新 worker，回报结果。
 */
//@ chunk-tyg7f3ek.js:547249-550209 placement
function handleTurnHandoff(e, n, r, s, h, y, S, R = []) {
  if (e.stopped) (n.personStopped(), MODEL_SWITCH_STATE({ turnGoesOn: !0 }));
  if (!n.admission.admitted)
    return (
      r({ subtype: "error", error: `turn_handoff_disabled: ${n.admission.reason}` }),
      { kind: "not_queued", outcome: "not_admitted" }
    );
  try {
    let { messageQueue: messageQueue, drain: drain } = n,
      L =
        messageQueue.getCommandQueue().find((re) => re.handedOffTurn !== void 0) ??
        (drain.drainingHandoff?.running === !1 ? drain.drainingHandoff.command : void 0),
      q = n.carriedWritesMode?.(),
      x = applyTurnHandoff(e, {
        tools: n.tools(),
        acceptedTools: n.admission.tools,
        toolAliases: n.toolAliases(),
        mcpClients: n.mcpClients(),
        messages: n.messages(),
        handledToolUseIds: n.handledToolUseIds,
        recoveredToolUseIds: n.recoveredToolUseIds,
        requestAgeMs: s,
        pendingHandoff: L?.handedOffTurn,
        runningHandoff: drain.drainingHandoff?.running ? drain.drainingHandoff.command.handedOffTurn : void 0,
        carriedWrites: q && { cwd: getCwd(), home: getHomeFilesRoot(), permissionMode: q, switchedOn: aQe() },
        refusalOfAppended: n.refusalOfAppended,
        appliedRewind: n.appliedRewind(),
        linesWaitingAhead: n.linesWaitingAhead(),
      }),
      G = (re, Ae) => ({
        ...re,
        ...(h !== void 0 && { requestedAtMs: h }),
        ...(y !== void 0 && { intakePhasesMs: y }),
        release: () => {
          for (let Ue of Ae) n.handledToolUseIds.delete(Ue);
        },
      }),
      Z = e.requires_rewind_request_id !== void 0;
    switch (x.kind) {
      case "error":
        if (x.carriedWrites !== void 0)
          (logEvent("tengu_turn_handoff_carried_writes", {
            at: lit("admission"),
            outcome: lit("refused"),
            refusal: fromEnum(x.carriedWrites),
          }),
            logFeatureSad("ccr_turn_handoff_carried_writes", x.carriedWrites));
        if (x.expiredAtAgeMs !== void 0)
          logEvent("tengu_turn_handoff_expired", { age_minutes: Math.round(x.expiredAtAgeMs / 60000) });
        if (x.requiredRewind !== void 0) logFeatureSad("ccr_turn_handoff_requires_rewind", x.requiredRewind);
        return (r({ subtype: "error", error: x.error }), { kind: "not_queued", outcome: "refused" });
      case "duplicate":
        if (x.stopRunning)
          (cancelQueuedAutoInputs(),
            drain.abortController?.abort(userAbortReason("remote-cancel")),
            n.stopUnabortedWork());
        return (
          r({ subtype: "success", response: { status: "duplicate" } }),
          { kind: "not_queued", outcome: "duplicate" }
        );
      case "converted":
        if (
          ((L.handedOffTurn = G(x.handedOffTurn, x.taken)),
          (L.disallowedTools = uniq([...(L.disallowedTools ?? []), ...R])),
          (L.turnAttributionKey = void 0),
          (L.handedOffTurnUserMessageUuids = void 0),
          r({ subtype: "success", response: { status: "accepted", tool_use_ids: [] } }),
          Z)
        )
          logFeatureOk("ccr_turn_handoff_requires_rewind");
        return { kind: "not_queued", outcome: "converted" };
      case "accepted": {
        let re = x.handedOffTurn.kind === "run" ? Rlt(S) : void 0,
          Ae = x.handedOffTurn.messages[0];
        if (x.handedOffTurn.kind === "run" && Ae?.type === "user" && isHumanOrigin(Ae.origin))
          n.personWrote?.();
        if (
          (messageQueue.enqueue({
            mode: "orphaned-permission",
            agentId: mainAgentId(),
            value: [],
            handedOffTurn: G(x.handedOffTurn, x.taken),
            ...(re !== void 0 && {
              turnAttributionKey: re,
              handedOffTurnUserMessageUuids: Ae?.type === "user" ? [Ae.uuid, re] : [re],
            }),
            ...(x.clientPlatform !== void 0 && { clientPlatform: x.clientPlatform }),
            disallowedTools: R,
            replacesDisallowedTools: !0,
          }),
          r({
            subtype: "success",
            response: { status: "accepted", tool_use_ids: [...x.handedOffTurn.toolUseIDs] },
          }),
          Z)
        )
          logFeatureOk("ccr_turn_handoff_requires_rewind");
        return (n.kick(), { kind: "queued" });
      }
    }
  } catch (error) {
    return (
      r(controlHandlerError(n.redactsPersistedLane(), "turn_handoff", error)),
      { kind: "not_queued", outcome: "handler_threw" }
    );
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
