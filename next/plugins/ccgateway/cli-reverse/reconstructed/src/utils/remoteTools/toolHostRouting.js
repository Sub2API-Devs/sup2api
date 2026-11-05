/**
 * utils/remoteTools/toolHostRouting.ts
 *
 * 2.1.316 新增：工具宿主路由
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import {
  HOST_TOOL_INPUT_FIELD,
  isReservedMachineName,
  splitHostField,
  machineNameMatches,
  machineLabelForMessage,
  hasHostField,
  hostFieldNotForwardedMessage,
  remoteToolCallsDisabledMessage,
  canRunToolsOnThisMachine,
  isRemoteToolsForwardEnabled2,
  requestedMachineLabel,
} from "../../bridge/deviceRegistration.js";
import { ToolHostRegistry } from "../../remote/tools/toolHostRegistry.js";
import { restartNoticeFor, ServedCallRegistry } from "./restartNotices.js";
import {
  isRemoteToolForwardingSwitchOn,
  isRemoteToolForwardingEnabledCached,
} from "../../services/remoteTools/servingGates.js";
import { isHostOnlyNativeTool } from "../../services/api/deferredToolsState.js";
import { isolationRuntimeService } from "../worktreeIsolation.js";
import { getToolRemoteExecution } from "../../Tool.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1406000-1406028 placement
var toolHostRoutingSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1406000", () => {
  toolHostRoutingSlot = new SessionRootSlot(() => new Map());
});
//@ chunk-5xgkngpb.js:1406028-1406100 placement
function logToolHostRefused(name, reason) {
  logEvent("tengu_tool_host_refused", {
    tool: sanitizeToolNameForAnalytics(name),
    reason: fromEnum(reason),
  });
}
//@ chunk-5xgkngpb.js:1406100-1406191 placement
function hostOnlyToolMessage(name, name_2) {
  return `${name_2} runs only in this session's ${name} environment; omit "${HOST_TOOL_INPUT_FIELD}".`;
}
//@ chunk-5xgkngpb.js:1406191-1406306 placement
/**
 * 在会话的宿主中找提供该工具的宿主。
 */
function findHostServingTool(session, name) {
  if (session === undefined) return;
  let hostsBySession = toolHostRoutingSlot.peek(session);
  return hostsBySession && [...hostsBySession.values()].find((host) => host.servedTools.has(name));
}
//@ chunk-5xgkngpb.js:1406306-1407140 placement
function resolveToolHost(tool, input, context) {
  let hostServingTool = findHostServingTool(context.session, tool.name);
  if (hostServingTool === undefined) return;
  let hostField = input[HOST_TOOL_INPUT_FIELD];
  if (typeof hostField === "string" && isReservedMachineName(hostField))
    return {
      kind: "refused",
      reason: "named_own_process",
      dispatch: {
        where: "refused",
        message: hostOnlyToolMessage(hostServingTool.name, tool.name),
      },
    };
  let { requested, input: input_2 } = splitHostField(input);
  if (requested === undefined || requested === hostServingTool.name)
    return {
      kind: "decided",
      dispatch: {
        where: "here",
        input: input_2,
      },
    };
  if (machineNameMatches(requested, hostServingTool.name))
    return context.toolState
      .get(ToolHostRegistry)
      .hosts()
      .some((host) => host.kind === "remote" && machineNameMatches(requested, host.name))
      ? {
          kind: "refused",
          reason: "ambiguous_spelling",
          dispatch: {
            where: "refused",
            message: `"${machineLabelForMessage(requested)}" could name ${hostServingTool.name} or an attached machine; the call did not run. Write the machine's name exactly as this session lists it.`,
          },
        }
      : {
          kind: "decided",
          dispatch: {
            where: "here",
            input: input_2,
          },
        };
  return {
    kind: "names_other",
    refusal: {
      where: "refused",
      message: `No machine named "${machineLabelForMessage(requested)}" is attached to this session. ${hostOnlyToolMessage(hostServingTool.name, tool.name)}`,
    },
  };
}
//@ chunk-5xgkngpb.js:1407140-1407512 placement
/**
 * 路由工具调用；接管的重启调用不能路由到别处时拒绝并记录。
 */
async function routeToolCallWithAdoption(tool, input, context, toolUseId, statusStream) {
  let registry = adoptedToolHost(context, toolUseId);
  let adoptedCall = toolUseId === undefined ? undefined : registry?.adopted(toolUseId);
  let dispatch = await routeToolCallToHost(
    tool,
    withToolHostField(tool, input, adoptedCall),
    context,
    statusStream,
  );
  if (
    dispatch.where === "elsewhere" ||
    toolUseId === undefined ||
    registry === undefined ||
    adoptedCall === undefined
  )
    return dispatch;
  registry.takeAdopted(toolUseId);
  registry.remove(toolUseId);
  logEvent("tengu_remote_tool_restart_adoption_unroutable", {
    where: lit_2("here"),
    parked_at_restart: adoptedCall.parkedAtRestart === true,
  });
  return {
    where: "refused",
    message: restartNoticeFor(
      {
        host: adoptedCall.host,
      },
      adoptedCall,
    ),
  };
}
//@ chunk-5xgkngpb.js:1407512-1407583 placement
function adoptedToolHost(context, toolUseId) {
  return toolUseId === undefined || !isRemoteToolForwardingSwitchOn()
    ? undefined
    : context.toolState.get(ServedCallRegistry);
}
//@ chunk-5xgkngpb.js:1407583-1407674 placement
function withToolHostField(tool, input, adoptedCall) {
  return adoptedCall !== undefined &&
    isHostOnlyNativeTool(tool) &&
    typeof input[HOST_TOOL_INPUT_FIELD] !== "string"
    ? {
        ...input,
        [HOST_TOOL_INPUT_FIELD]: adoptedCall.host,
      }
    : input;
}
//@ chunk-5xgkngpb.js:1407674-1408442 placement
async function routeToolCallToHost(tool, input, context, statusStream) {
  if (context.remoteCall !== undefined) {
    let hostServingTool = findHostServingTool(context.session, tool.name);
    if (hostServingTool !== undefined) {
      logToolHostRefused(tool.name, "serving_another_session");
      return {
        where: "refused",
        message: `${tool.name} was not run: this session runs it on ${hostServingTool.name}, and a call served for another session does not travel there.`,
      };
    }
  }
  let toolHost = resolveToolHost(tool, input, context);
  if (toolHost?.kind === "refused") {
    logToolHostRefused(tool.name, toolHost.reason);
    return toolHost.dispatch;
  }
  if (toolHost?.kind === "decided") return toolHost.dispatch;
  let remote = isolationRuntimeService().remote;
  if (toolHost?.kind === "names_other" && (remote === undefined || !remote.applies(tool))) {
    logToolHostRefused(tool.name, "machine_not_attached");
    return toolHost.refusal;
  }
  if (remote === undefined || !remote.applies(tool))
    return supportsRemoteExecution(tool) && hasHostField(input)
      ? {
          where: "refused",
          message: isRemoteToolForwardingEnabledCached()
            ? hostFieldNotForwardedMessage()
            : remoteToolCallsDisabledMessage(),
        }
      : {
          where: "here",
          input,
        };
  let route = await remote.route(tool, input, context, statusStream);
  return route.kind === "local"
    ? {
        where: "here",
        input: route.input,
      }
    : {
        where: "elsewhere",
        route,
        hosts: remote,
      };
}
//@ chunk-5xgkngpb.js:1408442-1408487 placement
/**
 * supportsRemoteExecution：工具支持远程执行。
 */
function supportsRemoteExecution(tool) {
  return canRunToolsOnThisMachine() && getToolRemoteExecution(tool).supported;
}
//@ chunk-5xgkngpb.js:1408487-1408563 placement
/**
 * shouldRouteToolToHost：该调用是否转给远程宿主。
 */
function shouldRouteToolToHost(tool, input, context, toolUseId) {
  return (
    supportsRemoteExecution(tool) &&
    (hasHostField(input) || adoptedToolHost(context, toolUseId)?.adopted(toolUseId) !== undefined)
  );
}
//@ chunk-5xgkngpb.js:1408563-1408609 placement
/**
 * remoteRoutingCandidate：远程路由候选。
 */
function remoteRoutingCandidate(input) {
  if (!isRemoteToolsForwardEnabled2()) return;
  return requestedMachineLabel(input);
}
export { remoteRoutingCandidate, shouldRouteToolToHost, routeToolCallWithAdoption, supportsRemoteExecution };
