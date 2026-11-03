/**
 * utils/remoteTools/toolHostRouting.ts
 *
 * 2.1.316 新增：工具宿主路由
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
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

//@ chunk-e6aww6q8.js:1406520-1406548 placement
var toolHostRoutingSlot = new SessionRootSlot(() => new Map());
//@ chunk-e6aww6q8.js:1406548-1406620 placement
function logToolHostRefused(name, n) {
  logEvent("tengu_tool_host_refused", {
    tool: sanitizeToolNameForAnalytics(name),
    reason: fromEnum(n),
  });
}
//@ chunk-e6aww6q8.js:1406620-1406711 placement
function hostOnlyToolMessage(name, name_2) {
  return `${name_2} runs only in this session's ${name} environment; omit "${HOST_TOOL_INPUT_FIELD}".`;
}
//@ chunk-e6aww6q8.js:1406711-1406826 placement
/**
 * 在会话的宿主中找提供该工具的宿主。
 */
function findHostServingTool(session, name) {
  if (session === undefined) return;
  let r = toolHostRoutingSlot.peek(session);
  return r && [...r.values()].find((s) => s.servedTools.has(name));
}
//@ chunk-e6aww6q8.js:1406826-1407661 placement
function resolveToolHost(e, n, r) {
  let hostServingTool = findHostServingTool(r.session, e.name);
  if (hostServingTool === undefined) return;
  let h = n[HOST_TOOL_INPUT_FIELD];
  if (typeof h === "string" && isReservedMachineName(h))
    return {
      kind: "refused",
      reason: "named_own_process",
      dispatch: {
        where: "refused",
        message: hostOnlyToolMessage(hostServingTool.name, e.name),
      },
    };
  let { requested, input } = splitHostField(n);
  if (requested === undefined || requested === hostServingTool.name)
    return {
      kind: "decided",
      dispatch: {
        where: "here",
        input,
      },
    };
  if (machineNameMatches(requested, hostServingTool.name))
    return r.toolState
      .get(ToolHostRegistry)
      .hosts()
      .some((w) => w.kind === "remote" && machineNameMatches(requested, w.name))
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
            input,
          },
        };
  return {
    kind: "names_other",
    refusal: {
      where: "refused",
      message: `No machine named "${machineLabelForMessage(requested)}" is attached to this session. ${hostOnlyToolMessage(hostServingTool.name, e.name)}`,
    },
  };
}
//@ chunk-e6aww6q8.js:1407661-1408033 placement
/**
 * 路由工具调用；接管的重启调用不能路由到别处时拒绝并记录。
 */
async function routeToolCallWithAdoption(e, n, toolUseContext, id, h) {
  let y = adoptedToolHost(toolUseContext, id);
  let S = id === undefined ? undefined : y?.adopted(id);
  let w = await routeToolCallToHost(e, withToolHostField(e, n, S), toolUseContext, h);
  if (w.where === "elsewhere" || id === undefined || y === undefined || S === undefined) return w;
  y.takeAdopted(id);
  y.remove(id);
  logEvent("tengu_remote_tool_restart_adoption_unroutable", {
    where: lit_2("here"),
    parked_at_restart: S.parkedAtRestart === true,
  });
  return {
    where: "refused",
    message: restartNoticeFor(
      {
        host: S.host,
      },
      S,
    ),
  };
}
//@ chunk-e6aww6q8.js:1408033-1408104 placement
function adoptedToolHost(e, n) {
  return n === undefined || !isRemoteToolForwardingSwitchOn()
    ? undefined
    : e.toolState.get(ServedCallRegistry);
}
//@ chunk-e6aww6q8.js:1408104-1408195 placement
function withToolHostField(e, n, r) {
  return r !== undefined && isHostOnlyNativeTool(e) && typeof n[HOST_TOOL_INPUT_FIELD] !== "string"
    ? {
        ...n,
        [HOST_TOOL_INPUT_FIELD]: r.host,
      }
    : n;
}
//@ chunk-e6aww6q8.js:1408195-1408963 placement
async function routeToolCallToHost(e, n, r, s) {
  if (r.remoteCall !== undefined) {
    let hostServingTool = findHostServingTool(r.session, e.name);
    if (hostServingTool !== undefined) {
      logToolHostRefused(e.name, "serving_another_session");
      return {
        where: "refused",
        message: `${e.name} was not run: this session runs it on ${hostServingTool.name}, and a call served for another session does not travel there.`,
      };
    }
  }
  let toolHost = resolveToolHost(e, n, r);
  if (toolHost?.kind === "refused") {
    logToolHostRefused(e.name, toolHost.reason);
    return toolHost.dispatch;
  }
  if (toolHost?.kind === "decided") return toolHost.dispatch;
  let remote = isolationRuntimeService().remote;
  if (toolHost?.kind === "names_other" && (remote === undefined || !remote.applies(e))) {
    logToolHostRefused(e.name, "machine_not_attached");
    return toolHost.refusal;
  }
  if (remote === undefined || !remote.applies(e))
    return supportsRemoteExecution(e) && hasHostField(n)
      ? {
          where: "refused",
          message: isRemoteToolForwardingEnabledCached()
            ? hostFieldNotForwardedMessage()
            : remoteToolCallsDisabledMessage(),
        }
      : {
          where: "here",
          input: n,
        };
  let S = await remote.route(e, n, r, s);
  return S.kind === "local"
    ? {
        where: "here",
        input: S.input,
      }
    : {
        where: "elsewhere",
        route: S,
        hosts: remote,
      };
}
//@ chunk-e6aww6q8.js:1408963-1409008 placement
/**
 * supportsRemoteExecution：工具支持远程执行。
 */
function supportsRemoteExecution(e) {
  return canRunToolsOnThisMachine() && getToolRemoteExecution(e).supported;
}
//@ chunk-e6aww6q8.js:1409008-1409084 placement
/**
 * shouldRouteToolToHost：该调用是否转给远程宿主。
 */
function shouldRouteToolToHost(e, n, toolUseContext, id) {
  return (
    supportsRemoteExecution(e) &&
    (hasHostField(n) || adoptedToolHost(toolUseContext, id)?.adopted(id) !== undefined)
  );
}
//@ chunk-e6aww6q8.js:1409084-1409130 placement
/**
 * remoteRoutingCandidate：远程路由候选。
 */
function remoteRoutingCandidate(e) {
  if (!isRemoteToolForwardingSwitchOn()) return;
  return requestedMachineLabel(e);
}
export { remoteRoutingCandidate, shouldRouteToolToHost, routeToolCallWithAdoption, supportsRemoteExecution };
