/**
 * services/remoteTools/remoteToolRouting.ts
 *
 * 2.1.316 新增：远程工具路由：决定调用在本机还是远程机器执行、主机在线状态与设备桥通告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dtv8x2hx.js (27)
 * attribution: placement 27
 */
import { BridgeToolProvider } from "../../bridge/bridgePermissionResponse.js";
import { getToolRemoteExecution } from "../../Tool.js";
import {
  isRemoteToolForwardingSwitchOn,
  isRemoteToolForwardingEnabled,
  isSpeculativeClassifierOn,
} from "./servingGates.js";
import {
  splitHostField,
  $r,
  UFe,
  machineNameMatches,
  remoteToolCallsDisabledMessage,
  normalizeMachineName,
  _4,
  HT,
} from "../../bridge/deviceRegistration.js";
import {
  runningUnavailableMessage,
  cannotRunHereMessage,
  detachedNowhereMessage,
  notServedRightNowMessage,
  servedElsewhereMessage,
  protocolMismatchMessage,
  noSuchMachineMessage,
  computerUnreachableMessage,
  noLongerAttachedMessage,
  notAnsweringMessage,
  servedAlternativesMessage,
  mcpToolsUnavailableMessage,
  toolNotServedMessage,
  olderConnectionOfferMessage,
  unreachableCallMessage,
  unreadableAnnouncementMessage,
  runsOnlyThereMessage,
  cannotRunAnythingMessage,
  computerNotReadyMessage,
  linkedButNotConnectedMessage,
  alreadyWaitedMessage,
  waitedForReconnectMessage,
  notContactedMessage,
} from "./targetMessages.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { uniq } from "../../utils/collections.js";
import { logForDebugging } from "../../utils/debug.js";
import { waitingToReconnectStatus, waitedToReconnectNote } from "./transportMessages.js";
import { fr, pr, remoteStructuredOutput } from "./remoteToolResult.js";
import { RemoteBackgroundCommands, aie, RemoteBackgroundLedger } from "./backgroundCommands.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { mayBePassthroughTool } from "../deviceBridge/passthroughMarker.js";
import { AwayEpisodeTracker } from "../awayEpisodes.js";
import { isHostAwayRecheckable, machineIdentity } from "./resultConversion.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { qvn, clipText } from "../../remote/tools/protocolSchemas.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { AbortError, isAbortError } from "../../utils/errors.js";
import { FL } from "../../tools/shared/textSearchTools.js";
import { singlePrefixRuleFor } from "../../tools/PowerShellTool/PowerShellTool.js";
import { dNt } from "../../utils/sandbox/sandboxDefaultPolicy.js";
import { ASK_FIRST_REASON_TEXTS } from "../../utils/permissions/askFirstReasons.js";
import { normalizeWithdrawReason } from "../../remote/tools/protocolConstants.js";
import {
  remoteToolsContext,
  refreshRemoteToolTargets,
  nextListingInterval,
} from "../../remote/tools/sessionEventTransport.js";
import {
  executeRemoteToolUse,
  handleRemoteCancel,
  createEarlyCheckRunner,
  createRemoteApprover,
  eo,
} from "./remoteToolExecutor.js";
import { buildMachinesAttachment, remoteToolTargetsAttachment } from "./machinesPrompt.js";
import {
  isListingFailedWithoutHosts,
  remoteToolsConnectionState,
  requestReannounce,
  canReannounceMachine,
  targetsDeadlineMs,
  hasDeviceBridgeConnection,
  sessionChannelOffer,
} from "../../remote/tools/remoteToolTargets.js";
import { reconnectNotesFromState } from "./attachWait.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { logRemoteToolForward, waitForAskAnswer } from "./remoteToolCall.js";
import { isSessionTransport } from "./callProgress.js";
import { shouldAllowManagedPermissionRulesOnly } from "../../utils/permissions/permissionsLoader.js";
import { getMcpPrefix } from "../mcp/mcpStringUtils.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { d0e, denyChangedAnswerInput } from "../../utils/permissions/permissionAnswer.js";
import { getToolCallOutcomeCode } from "../../utils/permissions/yoloClassifier.js";
import { buildNoPromptAvailableDenial } from "../../utils/messages.js";
import { logError } from "../../utils/log.js";

//@ chunk-dtv8x2hx.js:68603-68891 placement
async function routeRemoteToolCall(e, n, o, r) {
  if (getToolNameForPermissionCheck(e)) return routeToolUse(e, n, o, r);
  let machineFor = o.toolState.get(BridgeToolProvider).machineFor(e);
  if (machineFor !== void 0 && e.isMcp !== !0) return resolveHostForCall(e, n, machineFor, o, r);
  if (!getToolRemoteExecution(e).supported || !isRemoteToolForwardingSwitchOn())
    return { kind: "local", input: n };
  let { requested: requested, input: input } = splitHostField(n);
  return requested === void 0 ? { kind: "local", input: input } : routeToolCall(e, requested, input, o, r);
}
//@ chunk-dtv8x2hx.js:68891-70012 placement
async function resolveHostForCall(e, n, o, r, s) {
  if (!(await isRemoteToolForwardingEnabled()))
    return {
      kind: "error",
      code: "not_served",
      message: runningUnavailableMessage({ name: o, toolName: e.name }),
    };
  let u = n[$r];
  if (typeof u === "string" && (u.trim() === "" || UFe(u)))
    return {
      kind: "error",
      code: "unknown_host",
      message: cannotRunHereMessage({ toolName: e.name, machines: [o, ...formatHostLabel(r, e.name, o)] }),
    };
  let { requested: requested, input: input } = splitHostField(Bt(n)),
    h = requested === void 0 ? describeHostState(r, e.name) : [];
  if (h.length > 1)
    return {
      kind: "error",
      code: "unknown_host",
      message: cannotRunHereMessage({ toolName: e.name, machines: [o, ...formatHostLabel(r, e.name, o)] }),
    };
  let w = requested ?? h[0] ?? o,
    k = await routeToolCall(e, w, input, r, s);
  if (k.kind !== "error") return k;
  let resolved = r.toolState.get(ToolHostRegistry).resolve(w),
    A = resolved.kind === "remote" ? resolved.host.name : machineNameMatches(w, o) ? o : w;
  switch (k.code) {
    case "unknown_host":
      return A === o ? { ...k, message: detachedNowhereMessage({ name: o, toolName: e.name }) } : k;
    case "not_served":
      return {
        ...k,
        message:
          A === o
            ? notServedRightNowMessage({ name: A, toolName: e.name })
            : servedElsewhereMessage({ name: A, toolName: e.name, servedBy: o }),
      };
    case "incompatible": {
      if (resolved.kind !== "remote" || resolved.host.protocol.kind !== "incompatible") return k;
      return {
        ...k,
        message:
          A === o
            ? protocolMismatchMessage({
                name: A,
                announced: resolved.host.protocol.announced,
                runsOnlyThere: e.name,
              })
            : protocolMismatchMessage({
                name: A,
                announced: resolved.host.protocol.announced,
                servedInsteadBy: { toolName: e.name, name: o },
              }),
      };
    }
    default:
      return k;
  }
}
//@ chunk-dtv8x2hx.js:70012-70188 placement
function describeHostState(e, n) {
  return uniq(
    e.toolState
      .get(ToolHostRegistry)
      .hosts()
      .flatMap((o) =>
        o.kind === "remote" &&
        o.status === "online" &&
        o.protocol.kind !== "incompatible" &&
        o.servedTools.has(n)
          ? [o.name]
          : [],
      ),
  );
}
//@ chunk-dtv8x2hx.js:70188-70426 placement
function formatHostLabel(e, n, o) {
  let flattened = e.toolState
    .get(ToolHostRegistry)
    .hosts()
    .flatMap((s) => (s.kind === "remote" && s.name !== o && s.servedTools.has(n) ? [s] : []));
  return [...new Map(flattened.map((s) => [s.name, s])).values()].map((s) =>
    s.status === "offline" ? `${s.name} (offline)` : s.name,
  );
}
/**
 * 按工具状态与主机可用性决定 local/remote/error（unknown_host、gate_off 等）。
 */
//@ chunk-dtv8x2hx.js:70426-72924 placement
async function routeToolCall(e, n, o, r, s) {
  if (r.remoteCall !== void 0)
    return {
      kind: "error",
      code: "unknown_host",
      message: noSuchMachineMessage({ requested: n, attached: [] }),
    };
  if (!(await isRemoteToolForwardingEnabled()))
    return { kind: "error", code: "gate_off", message: remoteToolCallsDisabledMessage() };
  let u = r.toolState.get(ToolHostRegistry);
  await refreshTargets(s, r.abortController.signal, u);
  let resolved = u.resolve(n);
  if (
    s.forget !== void 0 &&
    (resolved.kind === "unknown" ||
      (resolved.kind === "remote" &&
        resolved.host.source !== "session" &&
        (resolved.host.status === "offline" ||
          kr(r.toolState, resolved.host.name) ||
          !resolved.host.servedTools.has(e.name) ||
          resolved.host.protocol.kind === "incompatible"))) &&
    !s.listingUnavailable(u) &&
    s.forget()
  )
    (await refreshTargets(s, r.abortController.signal, u), (resolved = u.resolve(n)));
  let i,
    h = resolved.kind === "unknown" ? normalizeMachineName(n) : void 0,
    lower = n.trim().toLowerCase(),
    k = h === void 0 ? void 0 : _4(lower) ? lower : h,
    S = k !== void 0 && _4(k) ? s.reconnectWaitMs?.(k) : void 0,
    A = k !== void 0 && S !== void 0 ? { machine: k, waitMs: S } : void 0,
    R;
  if (
    resolved.kind === "unknown" &&
    s.awaitAnnounce !== void 0 &&
    (A !== void 0 || wr(s.listingProvisional?.(), u, n))
  ) {
    if (
      (logForDebugging(
        `[remote-tools] holding ${e.name} for "${HT(n)}" until its machine announces to this worker (bounded by the call's own deadline)`,
      ),
      A !== void 0)
    )
      s.status?.(waitingToReconnectStatus(A.machine, Math.round(A.waitMs / 1000)), A.waitMs + fr);
    let now = Date.now();
    if (
      ((i = await s.awaitAnnounce(
        r.abortController.signal,
        async () => (
          s.forget?.(),
          await refreshTargets(s, r.abortController.signal, u),
          u.resolve(n).kind === "remote"
        ),
        A,
      )),
      A !== void 0)
    ) {
      let O = Date.now() - now;
      R = O > pr ? O : void 0;
    }
    if (
      (logForDebugging(`[remote-tools] ${e.name} for "${HT(n)}": ${describeHostAnnounced(i)}`),
      i.kind !== "aborted")
    )
      (await refreshTargets(s, r.abortController.signal, u), (resolved = u.resolve(n)));
  }
  switch (resolved.kind) {
    case "local":
    case "unknown": {
      let T = k === void 0 ? void 0 : r.toolState.get(RemoteBackgroundCommands).withdrawnFor(k),
        O = k !== void 0 && T !== void 0 ? { name: k, reason: T } : void 0;
      return s.listingUnavailable(u)
        ? { kind: "error", code: "host_offline", message: computerUnreachableMessage() }
        : (waitForHostAnnouncement(
            s.listingProvisional?.(),
            u,
            A?.machine ?? n,
            i,
            A !== void 0 || (s.bridgeReached?.() ?? !0),
            A !== void 0,
            O,
          ) ??
            (O !== void 0
              ? { kind: "error", code: "host_offline", message: noLongerAttachedMessage(O.name, O.reason) }
              : {
                  kind: "error",
                  code: "unknown_host",
                  message: noSuchMachineMessage({
                    requested: n,
                    attached: u
                      .hosts()
                      .flatMap((x) =>
                        x.kind !== "remote" ? [] : [x.status === "offline" ? `${x.name} (offline)` : x.name],
                      ),
                  }),
                }));
    }
    case "remote": {
      let { host: host } = resolved;
      if (host.status === "offline" && host.source !== "session")
        return { kind: "error", code: "host_offline", message: notAnsweringMessage(host.name) };
      if (host.protocol.kind === "incompatible")
        return {
          kind: "error",
          code: "incompatible",
          message: protocolMismatchMessage({ name: host.name, announced: host.protocol.announced }),
        };
      if (!host.servedTools.has(e.name))
        return {
          kind: "error",
          code: "not_served",
          message: servedAlternativesMessage({
            name: host.name,
            toolName: e.name,
            served: [...host.servedTools],
          }),
        };
      return { kind: "remote", host: host, input: o, ...(R !== void 0 && { waitedMs: R }) };
    }
  }
}
//@ chunk-dtv8x2hx.js:72924-72973 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool) {
  return tool.mcpInfo?.serverName === REMOTE_DEVICES;
}
//@ chunk-dtv8x2hx.js:72973-73209 placement
function isSessionOrBridgeHost(e, n, o) {
  let r = o.mcpInfo?.toolName;
  if (r === void 0) return;
  if (n === void 0) return e.passthroughHost(r);
  let s = (u) => u.name === n && u.passthroughTools?.has(r) === !0;
  return e.sourceHosts("session").find(s) ?? e.sourceHosts("bridge").find(s);
}
/**
 * 为一次工具调用选择执行机器（已有远程调用直接本地；机器未服务时报 not_served）。
 */
//@ chunk-dtv8x2hx.js:73209-75600 placement
async function routeToolUse(e, n, o, r) {
  if (o.remoteCall !== void 0) return { kind: "local", input: n };
  let s = o.toolState.get(BridgeToolProvider),
    machineFor = s.machineFor(e),
    p = (R) => ({
      kind: "error",
      code: "not_served",
      message: mcpToolsUnavailableMessage({ name: R, toolName: e.name }),
    });
  if (!(await isRemoteToolForwardingEnabled()))
    return machineFor === void 0 ? { kind: "local", input: n } : p(machineFor);
  if (machineFor !== void 0 && !s.presentable()) return p(machineFor);
  let i = o.toolState.get(ToolHostRegistry);
  await refreshTargets(r, o.abortController.signal, i);
  let h = isSessionOrBridgeHost(i, machineFor, e);
  if (
    (h === void 0 ||
      (h.source !== "session" && (h.status === "offline" || h.protocol.kind === "incompatible"))) &&
    mayBePassthroughTool(e.mcpInfo?.toolName ?? "") &&
    r.forget !== void 0 &&
    !r.listingUnavailable(i) &&
    r.forget()
  )
    (await refreshTargets(r, o.abortController.signal, i), (h = isSessionOrBridgeHost(i, machineFor, e)));
  if (h === void 0) {
    if (machineFor !== void 0)
      return {
        kind: "error",
        code: "not_served",
        message: toolNotServedMessage({ name: machineFor, toolName: e.name }),
      };
    if (r.listingUnavailable(i))
      return { kind: "error", code: "host_offline", message: computerUnreachableMessage() };
    let R = findBridgeOrSessionHost(i),
      T = e.mcpInfo?.toolName ?? e.name;
    if (!mayBePassthroughTool(T)) return { kind: "local", input: n };
    if (R === void 0)
      switch (r.machineOffer()) {
        case "offered":
          return { kind: "error", code: "incompatible", message: olderConnectionOfferMessage() };
        case "unread":
          return { kind: "error", code: "host_offline", message: computerUnreachableMessage() };
        case "none":
          return { kind: "local", input: n };
      }
    if (R.status === "offline") {
      if (R.source === "session")
        o.toolState
          .get(AwayEpisodeTracker)
          .told(o.toolState.get(RemoteBackgroundCommands), o.agentId, R.name);
      return {
        kind: "error",
        code: "host_offline",
        message:
          R.source === "session"
            ? unreachableCallMessage(
                R.name,
                R.asleep === !0 ? "it said it was going to sleep" : "it did not answer a liveness check",
                "machine",
                isHostAwayRecheckable(R),
                {
                  cause: R.asleep === !0 ? "asleep" : R.busy === !0 ? "busy" : "silent",
                  lastHeardAt: R.lastHeardAt,
                },
              )
            : notAnsweringMessage(R.name),
      };
    }
    return {
      kind: "error",
      code: "not_served",
      message:
        R.rejectedPassthroughTools?.has(T) === !0
          ? unreadableAnnouncementMessage({ name: R.name, toolName: e.name })
          : toolNotServedMessage({ name: R.name, toolName: e.name }),
    };
  }
  if (h.source === "session" && !s.presentable()) return p(h.name);
  if (h.status === "offline" && h.source !== "session")
    return { kind: "error", code: "host_offline", message: notAnsweringMessage(h.name) };
  if (h.protocol.kind === "incompatible")
    return {
      kind: "error",
      code: "incompatible",
      message: protocolMismatchMessage({
        name: h.name,
        announced: h.protocol.announced,
        runsOnlyThere: e.name,
      }),
    };
  let w = n[$r];
  if (typeof w === "string" && (w.trim() === "" || UFe(w)))
    return {
      kind: "error",
      code: "unknown_host",
      message: runsOnlyThereMessage({ name: h.name, toolName: e.name }),
    };
  let { requested: requested, input: input } = splitHostField(Bt(n));
  if (requested === void 0) return { kind: "remote", host: h, input: input };
  let resolved = i.resolve(requested);
  return resolved.kind === "remote" && resolved.host.name === h.name
    ? { kind: "remote", host: h, input: input }
    : {
        kind: "error",
        code: "unknown_host",
        message: noSuchMachineMessage({ requested: requested, attached: [h.name] }),
      };
}
//@ chunk-dtv8x2hx.js:75600-75688 placement
function kr(e, n) {
  return e
    .get(RemoteBackgroundCommands)
    .entries()
    .some((o) => o.name === n && o.status === "offline");
}
//@ chunk-dtv8x2hx.js:75688-75794 placement
function findBridgeOrSessionHost(e) {
  return e.hosts().find((n) => n.kind === "remote" && (n.source === "bridge" || n.source === "session"));
}
//@ chunk-dtv8x2hx.js:75794-75876 placement
function Bt(e) {
  let n = Uo(e, qvn),
    o = e[$r];
  return typeof o === "string" ? { ...n, [$r]: o } : n;
}
//@ chunk-dtv8x2hx.js:75876-75974 placement
function wr(e, n, o) {
  return e === "not_reannounced" && !UFe(o) && !n.hosts().some((r) => r.kind === "remote");
}
//@ chunk-dtv8x2hx.js:75974-76341 placement
function describeHostAnnounced(e) {
  switch (e.kind) {
    case "announced":
      return "the machine announced";
    case "routable":
      return "the machine became routable over the device bridge";
    case "gave_up":
      return `gave up after ${e.waitedMs} ms`;
    case "gave_up_earlier":
      return `not waiting again (gave up after ${e.waitedMs} ms earlier this worker life)`;
    case "aborted":
      return "the turn was aborted while waiting";
  }
}
//@ chunk-dtv8x2hx.js:76341-76835 placement
function waitForHostAnnouncement(e, n, o, r, s, u, p) {
  if (UFe(o) || (!u && n.hosts().some((w) => w.kind === "remote"))) return;
  if (u && r?.kind === "announced")
    return {
      kind: "error",
      code: "host_offline",
      message: p === void 0 ? cannotRunAnythingMessage(o) : noLongerAttachedMessage(p.name, p.reason),
    };
  let h = r?.kind === "gave_up" || r?.kind === "gave_up_earlier" ? "not_reannounced" : e;
  if (p !== void 0 && h !== "connecting")
    return { kind: "error", code: "host_offline", message: noLongerAttachedMessage(p.name, p.reason) };
  if (h === void 0) return;
  return {
    kind: "error",
    code: h === "set_aside" ? "incompatible" : "host_offline",
    message: describeHostConnection(h, o, r, s),
  };
}
//@ chunk-dtv8x2hx.js:76835-77114 placement
function describeHostConnection(e, n, o, r) {
  switch (e) {
    case "connecting":
      return computerNotReadyMessage(n);
    case "not_connected":
      return linkedButNotConnectedMessage();
    case "serves_nothing":
      return cannotRunAnythingMessage(n);
    case "set_aside":
      return olderConnectionOfferMessage();
    case "not_reannounced":
      return o?.kind === "gave_up_earlier"
        ? alreadyWaitedMessage(n, o.waitedMs, r)
        : waitedForReconnectMessage(n, o?.kind === "gave_up" ? o.waitedMs : 0, r);
  }
}
//@ chunk-dtv8x2hx.js:77114-77219 placement
async function refreshTargets(e, n, o) {
  await raceWithAbortSignal(e.refresh(o), n, () => new AbortError()).catch((r) => {
    if (!(r instanceof AbortError)) throw r;
  });
}
//@ chunk-dtv8x2hx.js:77219-77262 placement
var Ar = 9000,
  br = 30000,
  REMOTE_TOOL_HOST = "remote-tool-host";
//@ chunk-dtv8x2hx.js:77262-77790 placement
function buildHostAllowRules(e, n) {
  let command = n.input.command;
  if (
    !n.keepsStandingApprovals ||
    n.suggestions.length === 0 ||
    !FL(e) ||
    e.suppressesAllPermissionUpdates?.({ ...n.input, [$r]: n.host.name }) !== !0 ||
    typeof command !== "string"
  )
    return;
  let r =
    clipText(command, command.length + 1) === command
      ? singlePrefixRuleFor(n.offeredStandingRules, e.name)
      : void 0;
  if (r !== void 0) return { type: "addRules", behavior: "allow", destination: "session", rules: [r] };
  let trimmed = command.trim();
  return trimmed === "" || trimmed.includes("*") || trimmed.length > dNt
    ? void 0
    : {
        type: "addRules",
        behavior: "allow",
        destination: "localSettings",
        rules: [{ toolName: e.name, ruleContent: trimmed }],
      };
}
//@ chunk-dtv8x2hx.js:77790-77913 placement
function withdrawnAskDecision(e) {
  return {
    decision: "unanswerable",
    message: ASK_FIRST_REASON_TEXTS.withdrawn({
      name: e.host.name,
      reason: normalizeWithdrawReason(String(e.ended.reason)),
    }),
  };
}
/**
 * 创建远程工具提供器：判断工具能否远程执行，并提供路由、执行、取消、机器附件与纠正附件等入口。
 */
//@ chunk-dtv8x2hx.js:77913-78106 placement
function createRemoteToolsProvider() {
  return {
    applies: (e) =>
      (getToolRemoteExecution(e).supported || getToolNameForPermissionCheck(e)) &&
      isRemoteToolForwardingSwitchOn(),
    route: (e, n, o, r) =>
      routeRemoteToolCall(e, n, o, resolveAfterReannounce(remoteToolsContext(o), o.messages, r)),
    runToolUse: executeRemoteToolUse,
    runInnerCall: handleRemoteCancel,
    noticeAttachment: buildMachinesAttachment,
    correctionAttachment: remoteToolTargetsAttachment,
  };
}
//@ chunk-dtv8x2hx.js:78106-78654 placement
function resolveAfterReannounce(e, n, o) {
  let r = e.toolState.get(ToolHostRegistry),
    s = "resolve";
  return {
    refresh: () => refreshRemoteToolTargets(e, r, "resolve"),
    listingUnavailable: () => isListingFailedWithoutHosts(e, r),
    listingProvisional: () => remoteToolsConnectionState(e),
    awaitAnnounce: (u, p, i) =>
      requestReannounce(e, u, {
        routableOtherwise: p,
        ...(i !== void 0 && { forMachine: i.machine, deadlineMs: i.waitMs }),
      }),
    reconnectWaitMs: (u) =>
      canReannounceMachine(e, reconnectNotesFromState(n), u)
        ? targetsDeadlineMs(
            remoteToolsConnectionState(e) === "not_reannounced" &&
              !r.hosts().some((p) => p.kind === "remote"),
          )
        : void 0,
    ...(o !== void 0 && {
      status: (u, p) => {
        if (e.toolState.get(RemoteBackgroundCommands).announceWaitExpired() === void 0) o(u, p);
      },
    }),
    forget: () => nextListingInterval(e),
    bridgeReached: () => hasDeviceBridgeConnection(e),
    machineOffer: () => sessionChannelOffer(e),
  };
}
/**
 * 远程调用无结果结束时抛出。
 */
//@ chunk-dtv8x2hx.js:78654-78797 placement
class RemoteToolCallEnded extends Error {
  outcome;
  constructor(e) {
    super("remote tool call ended without a result");
    this.outcome = e;
    this.name = "RemoteToolCallEnded";
  }
}
//@ chunk-dtv8x2hx.js:78797-80050 placement
async function handleRemoteBackgroundCommand(e, n, o, r, s, u, p, i, h) {
  let w = s.toolUseId ?? "",
    k = aie(s),
    S = s.toolState.get(RemoteBackgroundLedger),
    A = String(r.task_id ?? r.shell_id);
  if (e.name === TASKSTOP && k !== void 0 && S.find(A, k)?.hostName !== n.host.name)
    throw new RemoteToolCallEnded({
      kind: "error",
      code: "invalid_input",
      message: `No background command with that ID was started on ${n.host.name} by this agent.`,
      host: machineIdentity(n.host),
    });
  let R = s.requireCanUseTool === !0 && s.agentId !== void 0,
    T = R ? await logRejectedInSession(e, n.host, r, extractAllowedTools(e, s), u, p, w) : void 0;
  if (T !== void 0)
    throw (logRemoteToolForward(e, n.host, o, w, T.verdict), new RemoteToolCallEnded(T.outcome));
  let O = isSessionTransport(n.host),
    x = isSpeculativeClassifierOn(e.name)
      ? createEarlyCheckRunner({
          tool: e,
          host: n.host,
          toolUseContext: s,
          toolUseId: w,
          honourHostAllowRules: O,
        })
      : void 0,
    M = await waitForAskAnswer({
      tool: e,
      route: n,
      rawInput: r,
      toolUseContext: s,
      toolUseId: w,
      signal: s.abortController.signal,
      entry: o,
      callerGate: R ? "allowed" : void 0,
      approve: createRemoteApprover({
        tool: e,
        host: n.host,
        toolUseContext: s,
        canUseTool: u,
        parentMessage: p,
        toolUseId: w,
        honourHostAllowRules: O,
        speculation: x,
      }),
      speculation: x,
      onStatus: i,
      onNotice: h,
    });
  if (M.kind !== "completed") throw new RemoteToolCallEnded(M);
  if (M.backgroundTaskId !== void 0 && r.run_in_background === !0)
    S.started(M.backgroundTaskId, { hostName: n.host.name, callId: w, agentId: k });
  return {
    data: remoteStructuredOutput(e, M) ?? eo(M),
    remoteOrigin:
      n.waitedMs === void 0
        ? M
        : {
            ...M,
            sessionNotes: [
              ...(M.sessionNotes ?? []),
              { text: waitedToReconnectNote(n.host.name, Math.round(n.waitedMs / 1000)) },
            ],
          },
  };
}
//@ chunk-dtv8x2hx.js:80050-80397 placement
function extractAllowedTools(e, n) {
  if (
    !getToolNameForPermissionCheck(e) ||
    shouldAllowManagedPermissionRulesOnly() ||
    n.toolState.get(BridgeToolProvider).machineFor(e) === void 0
  )
    return n;
  let o = getMcpPrefix(REMOTE_DEVICES),
    {
      alwaysAllowRules: alwaysAllowRules,
      alwaysAskRules: alwaysAskRules,
      alwaysDenyRules: alwaysDenyRules,
    } = getToolPermissionContext(n);
  if (
    [alwaysAllowRules, alwaysAskRules, alwaysDenyRules].some((p) =>
      (p.mcpServerPolicy ?? []).some((i) => i.startsWith(o)),
    )
  )
    return n;
  return {
    ...n,
    permissionLayers: [...(n.permissionLayers ?? []), { kind: "allowed_tools", allowedTools: [e.name] }],
  };
}
//@ chunk-dtv8x2hx.js:80397-80636 placement
async function logRejectedInSession(e, n, o, r, s, u, p) {
  let i = await formatPermissionDenied(e, { ...o, [$r]: n.name }, r, s, u, p);
  return (
    i && {
      verdict: i.verdict,
      outcome: {
        kind: "error",
        code: "rejected_in_session",
        message: notContactedMessage({ name: n.name, ruleMessage: Ir(i.words) }),
        denialKind: i.kind,
        host: machineIdentity(n),
      },
    }
  );
}
//@ chunk-dtv8x2hx.js:80636-81335 placement
async function formatPermissionDenied(e, n, o, r, s, u) {
  let p = `Permission to use ${e.name} has been denied`;
  try {
    let i = await r(e, n, o, s, u);
    switch (i.behavior) {
      case "allow": {
        if (i.updatedInput === n || d0e(i.updatedInput, n)) return;
        let h = denyChangedAnswerInput(e.name, u);
        return { verdict: "changed_input", words: h.message, kind: getToolCallOutcomeCode(h) };
      }
      case "ask":
        return { verdict: "asked", words: buildNoPromptAvailableDenial(i.message), kind: "permission-rule" };
      case "deny":
        return { verdict: "denied", words: i.message || p, kind: getToolCallOutcomeCode(i) };
      default:
        return { verdict: "denied", words: p, kind: "permission-rule" };
    }
  } catch (error) {
    if (isAbortError(error) || o.abortController.signal.aborted) throw error;
    return (
      logError(error),
      {
        verdict: "threw",
        words: `The permission check for this ${e.name} call failed with an error, so the call was refused`,
        kind: "permission-rule",
      }
    );
  }
}
//@ chunk-dtv8x2hx.js:81335-81407 placement
function Ir(e) {
  let trimEnd = e.trimEnd();
  return /[.!?\u2026]$/.test(trimEnd) ? trimEnd : `${trimEnd}.`;
}

export {
  withdrawnAskDecision,
  buildHostAllowRules,
  getToolNameForPermissionCheck,
  REMOTE_TOOL_HOST,
  handleRemoteBackgroundCommand,
  Ar,
  br,
  RemoteToolCallEnded,
};
