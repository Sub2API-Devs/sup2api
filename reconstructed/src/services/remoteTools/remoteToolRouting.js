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
  HOST_TOOL_INPUT_FIELD,
  isReservedMachineName,
  machineNameMatches,
  remoteToolCallsDisabledMessage,
  normalizeMachineName,
  isValidMachineSlug,
  machineLabelForMessage,
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
import {
  RECONNECT_STATUS_LEAD_MS,
  RECONNECT_STATUS_SETTLE_MS,
  remoteStructuredOutput,
} from "./remoteToolResult.js";
import { RemoteBackgroundCommands, currentAgentId, RemoteBackgroundLedger } from "./backgroundCommands.js";
import { REMOTE_DEVICES } from "../mcp/firstPartyServerIds.js";
import { mayBePassthroughTool } from "../deviceBridge/passthroughMarker.js";
import { AwayEpisodeTracker } from "../awayEpisodes.js";
import { isHostAwayRecheckable, machineIdentity } from "./resultConversion.js";
import { Uo } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { CALLER_FIELDS, clipText } from "../../remote/tools/protocolSchemas.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { AbortError, isAbortError } from "../../utils/errors.js";
import { isNonMcpShellTool } from "../../tools/shared/textSearchTools.js";
import { singlePrefixRuleFor } from "../../tools/PowerShellTool/PowerShellTool.js";
import { SANDBOX_MAX_PATH_LENGTH } from "../../utils/sandbox/sandboxDefaultPolicy.js";
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
  remoteResultTextOf,
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
import { isUnchangedAnswerInput, denyChangedAnswerInput } from "../../utils/permissions/permissionAnswer.js";
import { getToolCallOutcomeCode } from "../../utils/permissions/yoloClassifier.js";
import { buildNoPromptAvailableDenial } from "../../utils/messages.js";
import { logError } from "../../utils/log.js";

//@ chunk-dtv8x2hx.js:68603-68891 placement
async function routeRemoteToolCall(e, n, o, afterReannounce) {
  if (getToolNameForPermissionCheck(e)) return routeToolUse(e, n, o, afterReannounce);
  let s = o.toolState.get(BridgeToolProvider).machineFor(e);
  if (s !== undefined && e.isMcp !== true) return resolveHostForCall(e, n, s, o, afterReannounce);
  if (!getToolRemoteExecution(e).supported || !isRemoteToolForwardingSwitchOn())
    return {
      kind: "local",
      input: n,
    };
  let { requested, input } = splitHostField(n);
  return requested === undefined
    ? {
        kind: "local",
        input,
      }
    : routeToolCall(e, requested, input, o, afterReannounce);
}
//@ chunk-dtv8x2hx.js:68891-70012 placement
async function resolveHostForCall(e, n, o, r, s) {
  if (!(await isRemoteToolForwardingEnabled()))
    return {
      kind: "error",
      code: "not_served",
      message: runningUnavailableMessage({
        name: o,
        toolName: e.name,
      }),
    };
  let u = n[HOST_TOOL_INPUT_FIELD];
  if (typeof u === "string" && (u.trim() === "" || isReservedMachineName(u)))
    return {
      kind: "error",
      code: "unknown_host",
      message: cannotRunHereMessage({
        toolName: e.name,
        machines: [o, ...formatHostLabel(r, e.name, o)],
      }),
    };
  let { requested, input } = splitHostField(restoreTargetField(n));
  let h = requested === undefined ? describeHostState(r, e.name) : [];
  if (h.length > 1)
    return {
      kind: "error",
      code: "unknown_host",
      message: cannotRunHereMessage({
        toolName: e.name,
        machines: [o, ...formatHostLabel(r, e.name, o)],
      }),
    };
  let w = requested ?? h[0] ?? o;
  let k = await routeToolCall(e, w, input, r, s);
  if (k.kind !== "error") return k;
  let resolved = r.toolState.get(ToolHostRegistry).resolve(w);
  let A = resolved.kind === "remote" ? resolved.host.name : machineNameMatches(w, o) ? o : w;
  switch (k.code) {
    case "unknown_host":
      return A === o
        ? {
            ...k,
            message: detachedNowhereMessage({
              name: o,
              toolName: e.name,
            }),
          }
        : k;
    case "not_served":
      return {
        ...k,
        message:
          A === o
            ? notServedRightNowMessage({
                name: A,
                toolName: e.name,
              })
            : servedElsewhereMessage({
                name: A,
                toolName: e.name,
                servedBy: o,
              }),
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
                servedInsteadBy: {
                  toolName: e.name,
                  name: o,
                },
              }),
      };
    }
    default:
      return k;
  }
}
//@ chunk-dtv8x2hx.js:70012-70188 placement
function describeHostState(e, name) {
  return uniq(
    e.toolState
      .get(ToolHostRegistry)
      .hosts()
      .flatMap((o) =>
        o.kind === "remote" &&
        o.status === "online" &&
        o.protocol.kind !== "incompatible" &&
        o.servedTools.has(name)
          ? [o.name]
          : [],
      ),
  );
}
//@ chunk-dtv8x2hx.js:70188-70426 placement
function formatHostLabel(e, name, o) {
  let flattened = e.toolState
    .get(ToolHostRegistry)
    .hosts()
    .flatMap((s) => (s.kind === "remote" && s.name !== o && s.servedTools.has(name) ? [s] : []));
  return [...new Map(flattened.map((s) => [s.name, s])).values()].map((s) =>
    s.status === "offline" ? `${s.name} (offline)` : s.name,
  );
}
//@ chunk-dtv8x2hx.js:70426-72924 placement
/**
 * 按工具状态与主机可用性决定 local/remote/error（unknown_host、gate_off 等）。
 */
async function routeToolCall(e, n, input, r, s) {
  if (r.remoteCall !== undefined)
    return {
      kind: "error",
      code: "unknown_host",
      message: noSuchMachineMessage({
        requested: n,
        attached: [],
      }),
    };
  if (!(await isRemoteToolForwardingEnabled()))
    return {
      kind: "error",
      code: "gate_off",
      message: remoteToolCallsDisabledMessage(),
    };
  let u = r.toolState.get(ToolHostRegistry);
  await refreshTargets(s, r.abortController.signal, u);
  let resolved = u.resolve(n);
  if (
    s.forget !== undefined &&
    (resolved.kind === "unknown" ||
      (resolved.kind === "remote" &&
        resolved.host.source !== "session" &&
        (resolved.host.status === "offline" ||
          hostToolOffline(r.toolState, resolved.host.name) ||
          !resolved.host.servedTools.has(e.name) ||
          resolved.host.protocol.kind === "incompatible"))) &&
    !s.listingUnavailable(u) &&
    s.forget()
  ) {
    await refreshTargets(s, r.abortController.signal, u);
    resolved = u.resolve(n);
  }
  let i;
  let h = resolved.kind === "unknown" ? normalizeMachineName(n) : undefined;
  let lower = n.trim().toLowerCase();
  let k = h === undefined ? undefined : isValidMachineSlug(lower) ? lower : h;
  let S = k !== undefined && isValidMachineSlug(k) ? s.reconnectWaitMs?.(k) : undefined;
  let A =
    k !== undefined && S !== undefined
      ? {
          machine: k,
          waitMs: S,
        }
      : undefined;
  let R;
  if (
    resolved.kind === "unknown" &&
    s.awaitAnnounce !== undefined &&
    (A !== undefined || shouldAwaitAnnounce(s.listingProvisional?.(), u, n))
  ) {
    logForDebugging(
      `[remote-tools] holding ${e.name} for "${machineLabelForMessage(n)}" until its machine announces to this worker (bounded by the call's own deadline)`,
    );
    if (A !== undefined)
      s.status?.(
        waitingToReconnectStatus(A.machine, Math.round(A.waitMs / 1000)),
        A.waitMs + RECONNECT_STATUS_LEAD_MS,
      );
    let now = Date.now();
    i = await s.awaitAnnounce(
      r.abortController.signal,
      async () => {
        s.forget?.();
        await refreshTargets(s, r.abortController.signal, u);
        return u.resolve(n).kind === "remote";
      },
      A,
    );
    if (A !== undefined) {
      let O = Date.now() - now;
      R = O > RECONNECT_STATUS_SETTLE_MS ? O : undefined;
    }
    logForDebugging(
      `[remote-tools] ${e.name} for "${machineLabelForMessage(n)}": ${describeHostAnnounced(i)}`,
    );
    if (i.kind !== "aborted") {
      await refreshTargets(s, r.abortController.signal, u);
      resolved = u.resolve(n);
    }
  }
  switch (resolved.kind) {
    case "local":
    case "unknown": {
      let T = k === undefined ? undefined : r.toolState.get(RemoteBackgroundCommands).withdrawnFor(k);
      let O =
        k !== undefined && T !== undefined
          ? {
              name: k,
              reason: T,
            }
          : undefined;
      return s.listingUnavailable(u)
        ? {
            kind: "error",
            code: "host_offline",
            message: computerUnreachableMessage(),
          }
        : (waitForHostAnnouncement(
            s.listingProvisional?.(),
            u,
            A?.machine ?? n,
            i,
            A !== undefined || (s.bridgeReached?.() ?? true),
            A !== undefined,
            O,
          ) ??
            (O !== undefined
              ? {
                  kind: "error",
                  code: "host_offline",
                  message: noLongerAttachedMessage(O.name, O.reason),
                }
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
      let { host } = resolved;
      if (host.status === "offline" && host.source !== "session")
        return {
          kind: "error",
          code: "host_offline",
          message: notAnsweringMessage(host.name),
        };
      if (host.protocol.kind === "incompatible")
        return {
          kind: "error",
          code: "incompatible",
          message: protocolMismatchMessage({
            name: host.name,
            announced: host.protocol.announced,
          }),
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
      return {
        kind: "remote",
        host,
        input,
        ...(R !== undefined && {
          waitedMs: R,
        }),
      };
    }
  }
}
//@ chunk-dtv8x2hx.js:72924-72973 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool) {
  return tool.mcpInfo?.serverName === REMOTE_DEVICES;
}
//@ chunk-dtv8x2hx.js:72973-73209 placement
function isSessionOrBridgeHost(e, n, o) {
  let toolName = o.mcpInfo?.toolName;
  if (toolName === undefined) return;
  if (n === undefined) return e.passthroughHost(toolName);
  let s = (u) => u.name === n && u.passthroughTools?.has(toolName) === true;
  return e.sourceHosts("session").find(s) ?? e.sourceHosts("bridge").find(s);
}
//@ chunk-dtv8x2hx.js:73209-75600 placement
/**
 * 为一次工具调用选择执行机器（已有远程调用直接本地；机器未服务时报 not_served）。
 */
async function routeToolUse(e, n, o, r) {
  if (o.remoteCall !== undefined)
    return {
      kind: "local",
      input: n,
    };
  let s = o.toolState.get(BridgeToolProvider);
  let name = s.machineFor(e);
  let p = (name) => ({
    kind: "error",
    code: "not_served",
    message: mcpToolsUnavailableMessage({
      name,
      toolName: e.name,
    }),
  });
  if (!(await isRemoteToolForwardingEnabled()))
    return name === undefined
      ? {
          kind: "local",
          input: n,
        }
      : p(name);
  if (name !== undefined && !s.presentable()) return p(name);
  let i = o.toolState.get(ToolHostRegistry);
  await refreshTargets(r, o.abortController.signal, i);
  let h = isSessionOrBridgeHost(i, name, e);
  if (
    (h === undefined ||
      (h.source !== "session" && (h.status === "offline" || h.protocol.kind === "incompatible"))) &&
    mayBePassthroughTool(e.mcpInfo?.toolName ?? "") &&
    r.forget !== undefined &&
    !r.listingUnavailable(i) &&
    r.forget()
  ) {
    await refreshTargets(r, o.abortController.signal, i);
    h = isSessionOrBridgeHost(i, name, e);
  }
  if (h === undefined) {
    if (name !== undefined)
      return {
        kind: "error",
        code: "not_served",
        message: toolNotServedMessage({
          name,
          toolName: e.name,
        }),
      };
    if (r.listingUnavailable(i))
      return {
        kind: "error",
        code: "host_offline",
        message: computerUnreachableMessage(),
      };
    let bridgeOrSessionHost = findBridgeOrSessionHost(i);
    let T = e.mcpInfo?.toolName ?? e.name;
    if (!mayBePassthroughTool(T))
      return {
        kind: "local",
        input: n,
      };
    if (bridgeOrSessionHost === undefined)
      switch (r.machineOffer()) {
        case "offered":
          return {
            kind: "error",
            code: "incompatible",
            message: olderConnectionOfferMessage(),
          };
        case "unread":
          return {
            kind: "error",
            code: "host_offline",
            message: computerUnreachableMessage(),
          };
        case "none":
          return {
            kind: "local",
            input: n,
          };
      }
    if (bridgeOrSessionHost.status === "offline") {
      if (bridgeOrSessionHost.source === "session")
        o.toolState
          .get(AwayEpisodeTracker)
          .told(o.toolState.get(RemoteBackgroundCommands), o.agentId, bridgeOrSessionHost.name);
      return {
        kind: "error",
        code: "host_offline",
        message:
          bridgeOrSessionHost.source === "session"
            ? unreachableCallMessage(
                bridgeOrSessionHost.name,
                bridgeOrSessionHost.asleep === true
                  ? "it said it was going to sleep"
                  : "it did not answer a liveness check",
                "machine",
                isHostAwayRecheckable(bridgeOrSessionHost),
                {
                  cause:
                    bridgeOrSessionHost.asleep === true
                      ? "asleep"
                      : bridgeOrSessionHost.busy === true
                        ? "busy"
                        : "silent",
                  lastHeardAt: bridgeOrSessionHost.lastHeardAt,
                },
              )
            : notAnsweringMessage(bridgeOrSessionHost.name),
      };
    }
    return {
      kind: "error",
      code: "not_served",
      message:
        bridgeOrSessionHost.rejectedPassthroughTools?.has(T) === true
          ? unreadableAnnouncementMessage({
              name: bridgeOrSessionHost.name,
              toolName: e.name,
            })
          : toolNotServedMessage({
              name: bridgeOrSessionHost.name,
              toolName: e.name,
            }),
    };
  }
  if (h.source === "session" && !s.presentable()) return p(h.name);
  if (h.status === "offline" && h.source !== "session")
    return {
      kind: "error",
      code: "host_offline",
      message: notAnsweringMessage(h.name),
    };
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
  let w = n[HOST_TOOL_INPUT_FIELD];
  if (typeof w === "string" && (w.trim() === "" || isReservedMachineName(w)))
    return {
      kind: "error",
      code: "unknown_host",
      message: runsOnlyThereMessage({
        name: h.name,
        toolName: e.name,
      }),
    };
  let { requested, input } = splitHostField(restoreTargetField(n));
  if (requested === undefined)
    return {
      kind: "remote",
      host: h,
      input,
    };
  let resolved = i.resolve(requested);
  return resolved.kind === "remote" && resolved.host.name === h.name
    ? {
        kind: "remote",
        host: h,
        input,
      }
    : {
        kind: "error",
        code: "unknown_host",
        message: noSuchMachineMessage({
          requested,
          attached: [h.name],
        }),
      };
}
//@ chunk-dtv8x2hx.js:75600-75688 placement
function hostToolOffline(toolState, name) {
  return toolState
    .get(RemoteBackgroundCommands)
    .entries()
    .some((o) => o.name === name && o.status === "offline");
}
//@ chunk-dtv8x2hx.js:75688-75794 placement
function findBridgeOrSessionHost(e) {
  return e.hosts().find((n) => n.kind === "remote" && (n.source === "bridge" || n.source === "session"));
}
//@ chunk-dtv8x2hx.js:75794-75876 placement
/**
 * 规范化调用输入：去掉目标字段，若目标名是字符串则原样放回。
 */
function restoreTargetField(e) {
  let n = Uo(e, CALLER_FIELDS);
  let o = e[HOST_TOOL_INPUT_FIELD];
  return typeof o === "string"
    ? {
        ...n,
        [HOST_TOOL_INPUT_FIELD]: o,
      }
    : n;
}
//@ chunk-dtv8x2hx.js:75876-75974 placement
/**
 * 列表暂时不可用且无远程主机时，是否仍需等待机器通告。
 */
function shouldAwaitAnnounce(e, n, o) {
  return e === "not_reannounced" && !isReservedMachineName(o) && !n.hosts().some((r) => r.kind === "remote");
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
  if (isReservedMachineName(o) || (!u && n.hosts().some((w) => w.kind === "remote"))) return;
  if (u && r?.kind === "announced")
    return {
      kind: "error",
      code: "host_offline",
      message: p === undefined ? cannotRunAnythingMessage(o) : noLongerAttachedMessage(p.name, p.reason),
    };
  let h = r?.kind === "gave_up" || r?.kind === "gave_up_earlier" ? "not_reannounced" : e;
  if (p !== undefined && h !== "connecting")
    return {
      kind: "error",
      code: "host_offline",
      message: noLongerAttachedMessage(p.name, p.reason),
    };
  if (h === undefined) return;
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
async function refreshTargets(e, signal, o) {
  await raceWithAbortSignal(e.refresh(o), signal, () => new AbortError()).catch((error) => {
    if (!(error instanceof AbortError)) throw error;
  });
}
//@ chunk-dtv8x2hx.js:77219-77262 placement
var STATUS_NOTIFICATION_TIMEOUT_MS = 9000;
var NOTICE_NOTIFICATION_TIMEOUT_MS = 30000;
var REMOTE_TOOL_HOST = "remote-tool-host";
//@ chunk-dtv8x2hx.js:77262-77790 placement
function buildHostAllowRules(tool, n) {
  let command = n.input.command;
  if (
    !n.keepsStandingApprovals ||
    n.suggestions.length === 0 ||
    !isNonMcpShellTool(tool) ||
    tool.suppressesAllPermissionUpdates?.({
      ...n.input,
      [HOST_TOOL_INPUT_FIELD]: n.host.name,
    }) !== true ||
    typeof command !== "string"
  )
    return;
  let r =
    clipText(command, command.length + 1) === command
      ? singlePrefixRuleFor(n.offeredStandingRules, tool.name)
      : undefined;
  if (r !== undefined)
    return {
      type: "addRules",
      behavior: "allow",
      destination: "session",
      rules: [r],
    };
  let trimmed = command.trim();
  return trimmed === "" || trimmed.includes("*") || trimmed.length > SANDBOX_MAX_PATH_LENGTH
    ? undefined
    : {
        type: "addRules",
        behavior: "allow",
        destination: "localSettings",
        rules: [
          {
            toolName: tool.name,
            ruleContent: trimmed,
          },
        ],
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
//@ chunk-dtv8x2hx.js:77913-78106 placement
/**
 * 创建远程工具提供器：判断工具能否远程执行，并提供路由、执行、取消、机器附件与纠正附件等入口。
 */
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
function resolveAfterReannounce(e, messages, o) {
  let r = e.toolState.get(ToolHostRegistry);
  let s = "resolve";
  return {
    refresh: () => refreshRemoteToolTargets(e, r, "resolve"),
    listingUnavailable: () => isListingFailedWithoutHosts(e, r),
    listingProvisional: () => remoteToolsConnectionState(e),
    awaitAnnounce: (u, routableOtherwise, i) =>
      requestReannounce(e, u, {
        routableOtherwise,
        ...(i !== undefined && {
          forMachine: i.machine,
          deadlineMs: i.waitMs,
        }),
      }),
    reconnectWaitMs: (u) =>
      canReannounceMachine(e, reconnectNotesFromState(messages), u)
        ? targetsDeadlineMs(
            remoteToolsConnectionState(e) === "not_reannounced" &&
              !r.hosts().some((p) => p.kind === "remote"),
          )
        : undefined,
    ...(o !== undefined && {
      status: (u, p) => {
        if (e.toolState.get(RemoteBackgroundCommands).announceWaitExpired() === undefined) o(u, p);
      },
    }),
    forget: () => nextListingInterval(e),
    bridgeReached: () => hasDeviceBridgeConnection(e),
    machineOffer: () => sessionChannelOffer(e),
  };
}
//@ chunk-dtv8x2hx.js:78654-78797 placement
/**
 * 远程调用无结果结束时抛出。
 */
class RemoteToolCallEnded extends Error {
  outcome;
  constructor(outcome) {
    super("remote tool call ended without a result");
    this.outcome = outcome;
    this.name = "RemoteToolCallEnded";
  }
}
//@ chunk-dtv8x2hx.js:78797-80050 placement
async function handleRemoteBackgroundCommand(tool, route, o, r, s, canUseTool, p, onStatus, onNotice) {
  let toolUseId = s.toolUseId ?? "";
  let k = currentAgentId(s);
  let S = s.toolState.get(RemoteBackgroundLedger);
  let A = String(r.task_id ?? r.shell_id);
  if (tool.name === TASKSTOP && k !== undefined && S.find(A, k)?.hostName !== route.host.name)
    throw new RemoteToolCallEnded({
      kind: "error",
      code: "invalid_input",
      message: `No background command with that ID was started on ${route.host.name} by this agent.`,
      host: machineIdentity(route.host),
    });
  let R = s.requireCanUseTool === true && s.agentId !== undefined;
  let T = R
    ? await logRejectedInSession(tool, route.host, r, extractAllowedTools(tool, s), canUseTool, p, toolUseId)
    : undefined;
  if (T !== undefined) {
    logRemoteToolForward(tool, route.host, o, toolUseId, T.verdict);
    throw new RemoteToolCallEnded(T.outcome);
  }
  let honourHostAllowRules = isSessionTransport(route.host);
  let speculation = isSpeculativeClassifierOn(tool.name)
    ? createEarlyCheckRunner({
        tool,
        host: route.host,
        toolUseContext: s,
        toolUseId,
        honourHostAllowRules,
      })
    : undefined;
  let outcome = await waitForAskAnswer({
    tool,
    route,
    rawInput: r,
    toolUseContext: s,
    toolUseId,
    signal: s.abortController.signal,
    entry: o,
    callerGate: R ? "allowed" : undefined,
    approve: createRemoteApprover({
      tool,
      host: route.host,
      toolUseContext: s,
      canUseTool,
      parentMessage: p,
      toolUseId,
      honourHostAllowRules,
      speculation,
    }),
    speculation,
    onStatus,
    onNotice,
  });
  if (outcome.kind !== "completed") throw new RemoteToolCallEnded(outcome);
  if (outcome.backgroundTaskId !== undefined && r.run_in_background === true)
    S.started(outcome.backgroundTaskId, {
      hostName: route.host.name,
      callId: toolUseId,
      agentId: k,
    });
  return {
    data: remoteStructuredOutput(tool, outcome) ?? remoteResultTextOf(outcome),
    remoteOrigin:
      route.waitedMs === undefined
        ? outcome
        : {
            ...outcome,
            sessionNotes: [
              ...(outcome.sessionNotes ?? []),
              {
                text: waitedToReconnectNote(route.host.name, Math.round(route.waitedMs / 1000)),
              },
            ],
          },
  };
}
//@ chunk-dtv8x2hx.js:80050-80397 placement
function extractAllowedTools(e, n) {
  if (
    !getToolNameForPermissionCheck(e) ||
    shouldAllowManagedPermissionRulesOnly() ||
    n.toolState.get(BridgeToolProvider).machineFor(e) === undefined
  )
    return n;
  let mcpPrefix = getMcpPrefix(REMOTE_DEVICES);
  let { alwaysAllowRules, alwaysAskRules, alwaysDenyRules } = getToolPermissionContext(n);
  if (
    [alwaysAllowRules, alwaysAskRules, alwaysDenyRules].some((p) =>
      (p.mcpServerPolicy ?? []).some((i) => i.startsWith(mcpPrefix)),
    )
  )
    return n;
  return {
    ...n,
    permissionLayers: [
      ...(n.permissionLayers ?? []),
      {
        kind: "allowed_tools",
        allowedTools: [e.name],
      },
    ],
  };
}
//@ chunk-dtv8x2hx.js:80397-80636 placement
async function logRejectedInSession(e, host, o, allowedTools, s, u, toolUseId) {
  let i = await formatPermissionDenied(
    e,
    {
      ...o,
      [HOST_TOOL_INPUT_FIELD]: host.name,
    },
    allowedTools,
    s,
    u,
    toolUseId,
  );
  return (
    i && {
      verdict: i.verdict,
      outcome: {
        kind: "error",
        code: "rejected_in_session",
        message: notContactedMessage({
          name: host.name,
          ruleMessage: ensureSentenceEnd(i.words),
        }),
        denialKind: i.kind,
        host: machineIdentity(host),
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
        if (i.updatedInput === n || isUnchangedAnswerInput(i.updatedInput, n)) return;
        let h = denyChangedAnswerInput(e.name, u);
        return {
          verdict: "changed_input",
          words: h.message,
          kind: getToolCallOutcomeCode(h),
        };
      }
      case "ask":
        return {
          verdict: "asked",
          words: buildNoPromptAvailableDenial(i.message),
          kind: "permission-rule",
        };
      case "deny":
        return {
          verdict: "denied",
          words: i.message || p,
          kind: getToolCallOutcomeCode(i),
        };
      default:
        return {
          verdict: "denied",
          words: p,
          kind: "permission-rule",
        };
    }
  } catch (error) {
    if (isAbortError(error) || o.abortController.signal.aborted) throw error;
    logError(error);
    return {
      verdict: "threw",
      words: `The permission check for this ${e.name} call failed with an error, so the call was refused`,
      kind: "permission-rule",
    };
  }
}
//@ chunk-dtv8x2hx.js:81335-81407 placement
/**
 * 用于「未联系到机器」提示的措辞：保证句子以标点结尾。
 */
function ensureSentenceEnd(words) {
  let n = words.trimEnd();
  return /[.!?\u2026]$/.test(n) ? n : `${n}.`;
}
export {
  withdrawnAskDecision,
  buildHostAllowRules,
  getToolNameForPermissionCheck,
  REMOTE_TOOL_HOST,
  handleRemoteBackgroundCommand,
  STATUS_NOTIFICATION_TIMEOUT_MS,
  NOTICE_NOTIFICATION_TIMEOUT_MS,
  RemoteToolCallEnded,
};
