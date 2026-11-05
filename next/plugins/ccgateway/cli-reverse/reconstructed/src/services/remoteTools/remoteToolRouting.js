/**
 * services/remoteTools/remoteToolRouting.ts
 *
 * 2.1.316 新增：远程工具路由：决定调用在本机还是远程机器执行、主机在线状态与设备桥通告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3tymqgex.js (16), chunk-yvhjwwtt.js (11)
 * attribution: placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
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
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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

//@ chunk-3tymqgex.js:876-1162 placement
async function routeRemoteToolCall(tool, input, toolUseContext, options) {
  if (getToolNameForPermissionCheck(tool)) return routeToolUse(tool, input, toolUseContext, options);
  let machineName = toolUseContext.toolState.get(BridgeToolProvider).machineFor(tool);
  if (machineName !== undefined && tool.isMcp !== true)
    return resolveHostForCall(tool, input, machineName, toolUseContext, options);
  if (!getToolRemoteExecution(tool).supported || !isRemoteToolForwardingSwitchOn())
    return {
      kind: "local",
      input,
    };
  let { requested, input: input_2 } = splitHostField(input);
  return requested === undefined
    ? {
        kind: "local",
        input: input_2,
      }
    : routeToolCall(tool, requested, input_2, toolUseContext, options);
}
//@ chunk-3tymqgex.js:1162-2277 placement
async function resolveHostForCall(tool, input, machineName, toolUseContext, options) {
  if (!(await isRemoteToolForwardingEnabled()))
    return {
      kind: "error",
      code: "not_served",
      message: runningUnavailableMessage({
        name: machineName,
        toolName: tool.name,
      }),
    };
  let requestedInput = input[HOST_TOOL_INPUT_FIELD];
  if (
    typeof requestedInput === "string" &&
    (requestedInput.trim() === "" || isReservedMachineName(requestedInput))
  )
    return {
      kind: "error",
      code: "unknown_host",
      message: cannotRunHereMessage({
        toolName: tool.name,
        machines: [machineName, ...formatHostLabel(toolUseContext, tool.name, machineName)],
      }),
    };
  let { requested, input: input_2 } = splitHostField(restoreTargetField(input));
  let servingHosts = requested === undefined ? describeHostState(toolUseContext, tool.name) : [];
  if (servingHosts.length > 1)
    return {
      kind: "error",
      code: "unknown_host",
      message: cannotRunHereMessage({
        toolName: tool.name,
        machines: [machineName, ...formatHostLabel(toolUseContext, tool.name, machineName)],
      }),
    };
  let target = requested ?? servingHosts[0] ?? machineName;
  let result = await routeToolCall(tool, target, input_2, toolUseContext, options);
  if (result.kind !== "error") return result;
  let resolved = toolUseContext.toolState.get(ToolHostRegistry).resolve(target);
  let failedTarget =
    resolved.kind === "remote"
      ? resolved.host.name
      : machineNameMatches(target, machineName)
        ? machineName
        : target;
  switch (result.code) {
    case "unknown_host":
      return failedTarget === machineName
        ? {
            ...result,
            message: detachedNowhereMessage({
              name: machineName,
              toolName: tool.name,
            }),
          }
        : result;
    case "not_served":
      return {
        ...result,
        message:
          failedTarget === machineName
            ? notServedRightNowMessage({
                name: failedTarget,
                toolName: tool.name,
              })
            : servedElsewhereMessage({
                name: failedTarget,
                toolName: tool.name,
                servedBy: machineName,
              }),
      };
    case "incompatible": {
      if (resolved.kind !== "remote" || resolved.host.protocol.kind !== "incompatible") return result;
      return {
        ...result,
        message:
          failedTarget === machineName
            ? protocolMismatchMessage({
                name: failedTarget,
                announced: resolved.host.protocol.announced,
                runsOnlyThere: tool.name,
              })
            : protocolMismatchMessage({
                name: failedTarget,
                announced: resolved.host.protocol.announced,
                servedInsteadBy: {
                  toolName: tool.name,
                  name: machineName,
                },
              }),
      };
    }
    default:
      return result;
  }
}
//@ chunk-3tymqgex.js:2277-2452 placement
function describeHostState(toolUseContext, name) {
  return normalizeCaseForComparison_2(
    toolUseContext.toolState
      .get(ToolHostRegistry)
      .hosts()
      .flatMap((host) =>
        host.kind === "remote" &&
        host.status === "online" &&
        host.protocol.kind !== "incompatible" &&
        host.servedTools.has(name)
          ? [host.name]
          : [],
      ),
  );
}
//@ chunk-3tymqgex.js:2452-2689 placement
function formatHostLabel(toolUseContext, name, excludeName) {
  let flattened = toolUseContext.toolState
    .get(ToolHostRegistry)
    .hosts()
    .flatMap((host) =>
      host.kind === "remote" && host.name !== excludeName && host.servedTools.has(name) ? [host] : [],
    );
  return [...new Map(flattened.map((host) => [host.name, host])).values()].map((host) =>
    host.status === "offline" ? `${host.name} (offline)` : host.name,
  );
}
//@ chunk-3tymqgex.js:2689-5177 placement
/**
 * 按工具状态与主机可用性决定 local/remote/error（unknown_host、gate_off 等）。
 */
async function routeToolCall(tool, requestedName, input, toolUseContext, options) {
  if (toolUseContext.remoteCall !== undefined)
    return {
      kind: "error",
      code: "unknown_host",
      message: noSuchMachineMessage({
        requested: requestedName,
        attached: [],
      }),
    };
  if (!(await isRemoteToolForwardingEnabled()))
    return {
      kind: "error",
      code: "gate_off",
      message: remoteToolCallsDisabledMessage(),
    };
  let registry = toolUseContext.toolState.get(ToolHostRegistry);
  await refreshTargets(options, toolUseContext.abortController.signal, registry);
  let resolved = registry.resolve(requestedName);
  if (
    options.forget !== undefined &&
    (resolved.kind === "unknown" ||
      (resolved.kind === "remote" &&
        resolved.host.source !== "session" &&
        (resolved.host.status === "offline" ||
          hostToolOffline(toolUseContext.toolState, resolved.host.name) ||
          !resolved.host.servedTools.has(tool.name) ||
          resolved.host.protocol.kind === "incompatible"))) &&
    !options.listingUnavailable(registry) &&
    options.forget()
  ) {
    await refreshTargets(options, toolUseContext.abortController.signal, registry);
    resolved = registry.resolve(requestedName);
  }
  let announce;
  let normalized = resolved.kind === "unknown" ? normalizeMachineName(requestedName) : undefined;
  let lower = requestedName.trim().toLowerCase();
  let machineSlug = normalized === undefined ? undefined : isValidMachineSlug(lower) ? lower : normalized;
  let waitMs =
    machineSlug !== undefined && isValidMachineSlug(machineSlug)
      ? options.reconnectWaitMs?.(machineSlug)
      : undefined;
  let waitTarget =
    machineSlug !== undefined && waitMs !== undefined
      ? {
          machine: machineSlug,
          waitMs,
        }
      : undefined;
  let waitedMs;
  if (
    resolved.kind === "unknown" &&
    options.awaitAnnounce !== undefined &&
    (waitTarget !== undefined || shouldAwaitAnnounce(options.listingProvisional?.(), registry, requestedName))
  ) {
    logForDebugging(
      `[remote-tools] holding ${tool.name} for "${machineLabelForMessage(requestedName)}" until its machine announces to this worker (bounded by the call's own deadline)`,
    );
    if (waitTarget !== undefined)
      options.status?.(
        waitingToReconnectStatus(waitTarget.machine, Math.round(waitTarget.waitMs / 1000)),
        waitTarget.waitMs + RECONNECT_STATUS_LEAD_MS,
      );
    let now = Date.now();
    announce = await options.awaitAnnounce(
      toolUseContext.abortController.signal,
      async () => {
        options.forget?.();
        await refreshTargets(options, toolUseContext.abortController.signal, registry);
        return registry.resolve(requestedName).kind === "remote";
      },
      waitTarget,
    );
    if (waitTarget !== undefined) {
      let elapsedMs = Date.now() - now;
      waitedMs = elapsedMs > RECONNECT_STATUS_SETTLE_MS ? elapsedMs : undefined;
    }
    logForDebugging(
      `[remote-tools] ${tool.name} for "${machineLabelForMessage(requestedName)}": ${describeHostAnnounced(announce)}`,
    );
    if (announce.kind !== "aborted") {
      await refreshTargets(options, toolUseContext.abortController.signal, registry);
      resolved = registry.resolve(requestedName);
    }
  }
  switch (resolved.kind) {
    case "local":
    case "unknown": {
      let withdrawnReason =
        machineSlug === undefined
          ? undefined
          : toolUseContext.toolState.get(RemoteBackgroundCommands).withdrawnFor(machineSlug);
      let withdrawn =
        machineSlug !== undefined && withdrawnReason !== undefined
          ? {
              name: machineSlug,
              reason: withdrawnReason,
            }
          : undefined;
      return options.listingUnavailable(registry)
        ? {
            kind: "error",
            code: "host_offline",
            message: computerUnreachableMessage(),
          }
        : (waitForHostAnnouncement(
            options.listingProvisional?.(),
            registry,
            waitTarget?.machine ?? requestedName,
            announce,
            waitTarget !== undefined || (options.bridgeReached?.() ?? true),
            waitTarget !== undefined,
            withdrawn,
          ) ??
            (withdrawn !== undefined
              ? {
                  kind: "error",
                  code: "host_offline",
                  message: noLongerAttachedMessage(withdrawn.name, withdrawn.reason),
                }
              : {
                  kind: "error",
                  code: "unknown_host",
                  message: noSuchMachineMessage({
                    requested: requestedName,
                    attached: registry
                      .hosts()
                      .flatMap((host) =>
                        host.kind !== "remote"
                          ? []
                          : [host.status === "offline" ? `${host.name} (offline)` : host.name],
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
      if (!host.servedTools.has(tool.name))
        return {
          kind: "error",
          code: "not_served",
          message: servedAlternativesMessage({
            name: host.name,
            toolName: tool.name,
            served: [...host.servedTools],
          }),
        };
      return {
        kind: "remote",
        host,
        input,
        ...(waitedMs !== undefined && {
          waitedMs,
        }),
      };
    }
  }
}
//@ chunk-3tymqgex.js:5177-5227 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck(tool) {
  return tool.mcpInfo?.serverName === REMOTE_DEVICES;
}
//@ chunk-3tymqgex.js:5227-5462 placement
function isSessionOrBridgeHost(registry, machineName, tool) {
  let toolName = tool.mcpInfo?.toolName;
  if (toolName === undefined) return;
  if (machineName === undefined) return registry.passthroughHost(toolName);
  let matches = (host) => host.name === machineName && host.passthroughTools?.has(toolName) === true;
  return registry.sourceHosts("session").find(matches) ?? registry.sourceHosts("bridge").find(matches);
}
//@ chunk-3tymqgex.js:5462-7846 placement
/**
 * 为一次工具调用选择执行机器（已有远程调用直接本地；机器未服务时报 not_served）。
 */
async function routeToolUse(tool, input, toolUseContext, options) {
  if (toolUseContext.remoteCall !== undefined)
    return {
      kind: "local",
      input,
    };
  let provider = toolUseContext.toolState.get(BridgeToolProvider);
  let machine = provider.machineFor(tool);
  let refuseNotServed = (name) => ({
    kind: "error",
    code: "not_served",
    message: mcpToolsUnavailableMessage({
      name,
      toolName: tool.name,
    }),
  });
  if (!(await isRemoteToolForwardingEnabled()))
    return machine === undefined
      ? {
          kind: "local",
          input,
        }
      : refuseNotServed(machine);
  if (machine !== undefined && !provider.presentable()) return refuseNotServed(machine);
  let registry = toolUseContext.toolState.get(ToolHostRegistry);
  await refreshTargets(options, toolUseContext.abortController.signal, registry);
  let host = isSessionOrBridgeHost(registry, machine, tool);
  if (
    (host === undefined ||
      (host.source !== "session" && (host.status === "offline" || host.protocol.kind === "incompatible"))) &&
    mayBePassthroughTool(tool.mcpInfo?.toolName ?? "") &&
    options.forget !== undefined &&
    !options.listingUnavailable(registry) &&
    options.forget()
  ) {
    await refreshTargets(options, toolUseContext.abortController.signal, registry);
    host = isSessionOrBridgeHost(registry, machine, tool);
  }
  if (host === undefined) {
    if (machine !== undefined)
      return {
        kind: "error",
        code: "not_served",
        message: toolNotServedMessage({
          name: machine,
          toolName: tool.name,
        }),
      };
    if (options.listingUnavailable(registry))
      return {
        kind: "error",
        code: "host_offline",
        message: computerUnreachableMessage(),
      };
    let bridgeOrSessionHost = findBridgeOrSessionHost(registry);
    let toolName = tool.mcpInfo?.toolName ?? tool.name;
    if (!mayBePassthroughTool(toolName))
      return {
        kind: "local",
        input,
      };
    if (bridgeOrSessionHost === undefined)
      switch (options.machineOffer()) {
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
            input,
          };
      }
    if (bridgeOrSessionHost.status === "offline") {
      if (bridgeOrSessionHost.source === "session")
        toolUseContext.toolState
          .get(AwayEpisodeTracker)
          .told(
            toolUseContext.toolState.get(RemoteBackgroundCommands),
            toolUseContext.agentId,
            bridgeOrSessionHost.name,
          );
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
        bridgeOrSessionHost.rejectedPassthroughTools?.has(toolName) === true
          ? unreadableAnnouncementMessage({
              name: bridgeOrSessionHost.name,
              toolName: tool.name,
            })
          : toolNotServedMessage({
              name: bridgeOrSessionHost.name,
              toolName: tool.name,
            }),
    };
  }
  if (host.source === "session" && !provider.presentable()) return refuseNotServed(host.name);
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
        runsOnlyThere: tool.name,
      }),
    };
  let targetField = input[HOST_TOOL_INPUT_FIELD];
  if (typeof targetField === "string" && (targetField.trim() === "" || isReservedMachineName(targetField)))
    return {
      kind: "error",
      code: "unknown_host",
      message: runsOnlyThereMessage({
        name: host.name,
        toolName: tool.name,
      }),
    };
  let { requested, input: input_2 } = splitHostField(restoreTargetField(input));
  if (requested === undefined)
    return {
      kind: "remote",
      host,
      input: input_2,
    };
  let resolved = registry.resolve(requested);
  return resolved.kind === "remote" && resolved.host.name === host.name
    ? {
        kind: "remote",
        host,
        input: input_2,
      }
    : {
        kind: "error",
        code: "unknown_host",
        message: noSuchMachineMessage({
          requested,
          attached: [host.name],
        }),
      };
}
//@ chunk-3tymqgex.js:7846-7933 placement
function hostToolOffline(toolState, name) {
  return toolState
    .get(RemoteBackgroundCommands)
    .entries()
    .some((entry) => entry.name === name && entry.status === "offline");
}
//@ chunk-3tymqgex.js:7933-8038 placement
function findBridgeOrSessionHost(registry) {
  return registry
    .hosts()
    .find((host) => host.kind === "remote" && (host.source === "bridge" || host.source === "session"));
}
//@ chunk-3tymqgex.js:8038-8119 placement
/**
 * 规范化调用输入：去掉目标字段，若目标名是字符串则原样放回。
 */
function restoreTargetField(input) {
  let rest = omitAlias(input, CALLER_FIELDS);
  let targetField = input[HOST_TOOL_INPUT_FIELD];
  return typeof targetField === "string"
    ? {
        ...rest,
        [HOST_TOOL_INPUT_FIELD]: targetField,
      }
    : rest;
}
//@ chunk-3tymqgex.js:8119-8216 placement
/**
 * 列表暂时不可用且无远程主机时，是否仍需等待机器通告。
 */
function shouldAwaitAnnounce(provisional, registry, requestedName) {
  return (
    provisional === "not_reannounced" &&
    !isReservedMachineName(requestedName) &&
    !registry.hosts().some((host) => host.kind === "remote")
  );
}
//@ chunk-3tymqgex.js:8216-8582 placement
function describeHostAnnounced(wait) {
  switch (wait.kind) {
    case "announced":
      return "the machine announced";
    case "routable":
      return "the machine became routable over the device bridge";
    case "gave_up":
      return `gave up after ${wait.waitedMs} ms`;
    case "gave_up_earlier":
      return `not waiting again (gave up after ${wait.waitedMs} ms earlier this worker life)`;
    case "aborted":
      return "the turn was aborted while waiting";
  }
}
//@ chunk-3tymqgex.js:8582-9074 placement
function waitForHostAnnouncement(
  provisional,
  registry,
  requestedName,
  wait,
  bridgeReached,
  waited,
  withdrawn,
) {
  if (
    isReservedMachineName(requestedName) ||
    (!waited && registry.hosts().some((host) => host.kind === "remote"))
  )
    return;
  if (waited && wait?.kind === "announced")
    return {
      kind: "error",
      code: "host_offline",
      message:
        withdrawn === undefined
          ? cannotRunAnythingMessage(requestedName)
          : noLongerAttachedMessage(withdrawn.name, withdrawn.reason),
    };
  let state = wait?.kind === "gave_up" || wait?.kind === "gave_up_earlier" ? "not_reannounced" : provisional;
  if (withdrawn !== undefined && state !== "connecting")
    return {
      kind: "error",
      code: "host_offline",
      message: noLongerAttachedMessage(withdrawn.name, withdrawn.reason),
    };
  if (state === undefined) return;
  return {
    kind: "error",
    code: state === "set_aside" ? "incompatible" : "host_offline",
    message: describeHostConnection(state, requestedName, wait, bridgeReached),
  };
}
//@ chunk-3tymqgex.js:9074-9352 placement
function describeHostConnection(state, requestedName, wait, bridgeReached) {
  switch (state) {
    case "connecting":
      return computerNotReadyMessage(requestedName);
    case "not_connected":
      return linkedButNotConnectedMessage();
    case "serves_nothing":
      return cannotRunAnythingMessage(requestedName);
    case "set_aside":
      return olderConnectionOfferMessage();
    case "not_reannounced":
      return wait?.kind === "gave_up_earlier"
        ? alreadyWaitedMessage(requestedName, wait.waitedMs, bridgeReached)
        : waitedForReconnectMessage(
            requestedName,
            wait?.kind === "gave_up" ? wait.waitedMs : 0,
            bridgeReached,
          );
  }
}
//@ chunk-3tymqgex.js:9352-9456 placement
async function refreshTargets(options, signal, registry) {
  await raceWithAbortSignal(options.refresh(registry), signal, () => new AbortError()).catch((error) => {
    if (!(error instanceof AbortError)) throw error;
  });
}
//@ chunk-yvhjwwtt.js:69840-69883 placement
var STATUS_NOTIFICATION_TIMEOUT_MS = 9000;
var NOTICE_NOTIFICATION_TIMEOUT_MS = 30000;
var REMOTE_TOOL_HOST = "remote-tool-host";
//@ chunk-yvhjwwtt.js:69883-70411 placement
function buildHostAllowRules(tool, request) {
  let command = request.input.command;
  if (
    !request.keepsStandingApprovals ||
    request.suggestions.length === 0 ||
    !isNonMcpShellTool(tool) ||
    tool.suppressesAllPermissionUpdates?.({
      ...request.input,
      [HOST_TOOL_INPUT_FIELD]: request.host.name,
    }) !== true ||
    typeof command !== "string"
  )
    return;
  let sessionRule =
    clipText(command, command.length + 1) === command
      ? singlePrefixRuleFor(request.offeredStandingRules, tool.name)
      : undefined;
  if (sessionRule !== undefined)
    return {
      type: "addRules",
      behavior: "allow",
      destination: "session",
      rules: [sessionRule],
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
//@ chunk-yvhjwwtt.js:70411-70534 placement
function withdrawnAskDecision(request) {
  return {
    decision: "unanswerable",
    message: ASK_FIRST_REASON_TEXTS.withdrawn({
      name: request.host.name,
      reason: normalizeWithdrawReason(String(request.ended.reason)),
    }),
  };
}
//@ chunk-yvhjwwtt.js:70534-70729 placement
/**
 * 创建远程工具提供器：判断工具能否远程执行，并提供路由、执行、取消、机器附件与纠正附件等入口。
 */
function createRemoteToolsProvider() {
  return {
    applies: (tool) =>
      (getToolRemoteExecution(tool).supported || getToolNameForPermissionCheck(tool)) &&
      isRemoteToolForwardingSwitchOn(),
    route: (tool, input, toolUseContext, afterReannounce) =>
      routeRemoteToolCall(
        tool,
        input,
        toolUseContext,
        resolveAfterReannounce(remoteToolsContext(toolUseContext), toolUseContext.messages, afterReannounce),
      ),
    runToolUse: executeRemoteToolUse,
    runInnerCall: handleRemoteCancel,
    noticeAttachment: buildMachinesAttachment,
    correctionAttachment: remoteToolTargetsAttachment,
  };
}
//@ chunk-yvhjwwtt.js:70729-71277 placement
function resolveAfterReannounce(toolsContext, appState, onStatus) {
  let registry = toolsContext.toolState.get(ToolHostRegistry);
  let reason = "resolve";
  return {
    refresh: () => refreshRemoteToolTargets(toolsContext, registry, "resolve"),
    listingUnavailable: () => isListingFailedWithoutHosts(toolsContext, registry),
    listingProvisional: () => remoteToolsConnectionState(toolsContext),
    awaitAnnounce: (signal, routableOtherwise, forMachine) =>
      requestReannounce(toolsContext, signal, {
        routableOtherwise,
        ...(forMachine !== undefined && {
          forMachine: forMachine.machine,
          deadlineMs: forMachine.waitMs,
        }),
      }),
    reconnectWaitMs: (machineName) =>
      canReannounceMachine(toolsContext, reconnectNotesFromState(appState), machineName)
        ? targetsDeadlineMs(
            remoteToolsConnectionState(toolsContext) === "not_reannounced" &&
              !registry.hosts().some((host) => host.kind === "remote"),
          )
        : undefined,
    ...(onStatus !== undefined && {
      status: (message, timeoutMs) => {
        if (toolsContext.toolState.get(RemoteBackgroundCommands).announceWaitExpired() === undefined)
          onStatus(message, timeoutMs);
      },
    }),
    forget: () => nextListingInterval(toolsContext),
    bridgeReached: () => hasDeviceBridgeConnection(toolsContext),
    machineOffer: () => sessionChannelOffer(toolsContext),
  };
}
//@ chunk-yvhjwwtt.js:71277-71420 placement
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
//@ chunk-yvhjwwtt.js:71420-72673 placement
async function handleRemoteBackgroundCommand(
  tool,
  route,
  entry,
  input,
  toolUseContext,
  canUseTool,
  assistantMessage,
  onStatus,
  onNotice,
) {
  let toolUseId = toolUseContext.toolUseId ?? "";
  let agentId = currentAgentId(toolUseContext);
  let ledger = toolUseContext.toolState.get(RemoteBackgroundLedger);
  let taskId = String(input.task_id ?? input.shell_id);
  if (
    tool.name === TASKSTOP &&
    agentId !== undefined &&
    ledger.find(taskId, agentId)?.hostName !== route.host.name
  )
    throw new RemoteToolCallEnded({
      kind: "error",
      code: "invalid_input",
      message: `No background command with that ID was started on ${route.host.name} by this agent.`,
      host: machineIdentity(route.host),
    });
  let checkSessionGate = toolUseContext.requireCanUseTool === true && toolUseContext.agentId !== undefined;
  let rejected = checkSessionGate
    ? await logRejectedInSession(
        tool,
        route.host,
        input,
        extractAllowedTools(tool, toolUseContext),
        canUseTool,
        assistantMessage,
        toolUseId,
      )
    : undefined;
  if (rejected !== undefined) {
    logRemoteToolForward(tool, route.host, entry, toolUseId, rejected.verdict);
    throw new RemoteToolCallEnded(rejected.outcome);
  }
  let honourHostAllowRules = isSessionTransport(route.host);
  let speculation = isSpeculativeClassifierOn(tool.name)
    ? createEarlyCheckRunner({
        tool,
        host: route.host,
        toolUseContext,
        toolUseId,
        honourHostAllowRules,
      })
    : undefined;
  let askOutcome = await waitForAskAnswer({
    tool,
    route,
    rawInput: input,
    toolUseContext,
    toolUseId,
    signal: toolUseContext.abortController.signal,
    entry,
    callerGate: checkSessionGate ? "allowed" : undefined,
    approve: createRemoteApprover({
      tool,
      host: route.host,
      toolUseContext,
      canUseTool,
      parentMessage: assistantMessage,
      toolUseId,
      honourHostAllowRules,
      speculation,
    }),
    speculation,
    onStatus,
    onNotice,
  });
  if (askOutcome.kind !== "completed") throw new RemoteToolCallEnded(askOutcome);
  if (askOutcome.backgroundTaskId !== undefined && input.run_in_background === true)
    ledger.started(askOutcome.backgroundTaskId, {
      hostName: route.host.name,
      callId: toolUseId,
      agentId,
    });
  return {
    data: remoteStructuredOutput(tool, askOutcome) ?? remoteResultTextOf(askOutcome),
    remoteOrigin:
      route.waitedMs === undefined
        ? askOutcome
        : {
            ...askOutcome,
            sessionNotes: [
              ...(askOutcome.sessionNotes ?? []),
              {
                text: waitedToReconnectNote(route.host.name, Math.round(route.waitedMs / 1000)),
              },
            ],
          },
  };
}
//@ chunk-yvhjwwtt.js:72673-73021 placement
function extractAllowedTools(tool, toolUseContext) {
  if (
    !getToolNameForPermissionCheck(tool) ||
    shouldAllowManagedPermissionRulesOnly() ||
    toolUseContext.toolState.get(BridgeToolProvider).machineFor(tool) === undefined
  )
    return toolUseContext;
  let mcpPrefix = getMcpPrefix(REMOTE_DEVICES);
  let { alwaysAllowRules, alwaysAskRules, alwaysDenyRules } = getToolPermissionContext(toolUseContext);
  if (
    [alwaysAllowRules, alwaysAskRules, alwaysDenyRules].some((layer) =>
      (layer.mcpServerPolicy ?? []).some((prefix) => prefix.startsWith(mcpPrefix)),
    )
  )
    return toolUseContext;
  return {
    ...toolUseContext,
    permissionLayers: [
      ...(toolUseContext.permissionLayers ?? []),
      {
        kind: "allowed_tools",
        allowedTools: [tool.name],
      },
    ],
  };
}
//@ chunk-yvhjwwtt.js:73021-73260 placement
async function logRejectedInSession(
  tool,
  host,
  input,
  toolUseContext,
  canUseTool,
  assistantMessage,
  toolUseId,
) {
  let denial = await formatPermissionDenied(
    tool,
    {
      ...input,
      [HOST_TOOL_INPUT_FIELD]: host.name,
    },
    toolUseContext,
    canUseTool,
    assistantMessage,
    toolUseId,
  );
  return (
    denial && {
      verdict: denial.verdict,
      outcome: {
        kind: "error",
        code: "rejected_in_session",
        message: notContactedMessage({
          name: host.name,
          ruleMessage: ensureSentenceEnd(denial.words),
        }),
        denialKind: denial.kind,
        host: machineIdentity(host),
      },
    }
  );
}
//@ chunk-yvhjwwtt.js:73260-73959 placement
async function formatPermissionDenied(tool, input, toolUseContext, canUseTool, assistantMessage, toolUseId) {
  let deniedText = `Permission to use ${tool.name} has been denied`;
  try {
    let decision = await canUseTool(tool, input, toolUseContext, assistantMessage, toolUseId);
    switch (decision.behavior) {
      case "allow": {
        if (decision.updatedInput === input || isUnchangedAnswerInput(decision.updatedInput, input)) return;
        let changedDenial = denyChangedAnswerInput(tool.name, toolUseId);
        return {
          verdict: "changed_input",
          words: changedDenial.message,
          kind: getToolCallOutcomeCode(changedDenial),
        };
      }
      case "ask":
        return {
          verdict: "asked",
          words: buildNoPromptAvailableDenial(decision.message),
          kind: "permission-rule",
        };
      case "deny":
        return {
          verdict: "denied",
          words: decision.message || deniedText,
          kind: getToolCallOutcomeCode(decision),
        };
      default:
        return {
          verdict: "denied",
          words: deniedText,
          kind: "permission-rule",
        };
    }
  } catch (error) {
    if (isAbortError(error) || toolUseContext.abortController.signal.aborted) throw error;
    logError(error);
    return {
      verdict: "threw",
      words: `The permission check for this ${tool.name} call failed with an error, so the call was refused`,
      kind: "permission-rule",
    };
  }
}
//@ chunk-yvhjwwtt.js:73959-74031 placement
/**
 * 用于「未联系到机器」提示的措辞：保证句子以标点结尾。
 */
function ensureSentenceEnd(words) {
  let trimmed = words.trimEnd();
  return /[.!?\u2026]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}
export {
  getToolNameForPermissionCheck,
  withdrawnAskDecision,
  buildHostAllowRules,
  REMOTE_TOOL_HOST,
  handleRemoteBackgroundCommand,
  STATUS_NOTIFICATION_TIMEOUT_MS,
  NOTICE_NOTIFICATION_TIMEOUT_MS,
  RemoteToolCallEnded,
  createRemoteToolsProvider,
};
