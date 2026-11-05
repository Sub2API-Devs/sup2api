/**
 * remote/tools/remoteToolTargets.ts
 *
 * 2.1.316 新增：设备桥远程工具目标的列举、采纳与同步
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sjeyntvz.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  RemoteBackgroundCommands,
  DEVICE_PASSTHROUGH_TOOL_NAMES,
  REMOTE_DEVICES_SERVER_NAME,
} from "../../services/remoteTools/backgroundCommands.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { detectTerminal } from "./protocolConstants.js";
import { countWhere } from "../../utils/collections.js";
import {
  isRemoteToolForwardingEnabled,
  isSessionChannelDisabled,
  isRemoteToolForwardingEnabledCached,
} from "../../services/remoteTools/servingGates.js";
import {
  RemoteToolTargetsState,
  FAILED_LIST_RETRY_MS,
  REMOTE_TARGET_TIMINGS,
  MAX_LIST_PAGE_SIZE,
  FAILED_LIST_WINDOW_MS,
  SESSION_TRANSPORT_LIMITS,
  MIN_RELIST_INTERVAL_MS,
  PROVISIONAL_FRESH_MS,
} from "./sessionEventTransport.js";
import { logError } from "../../utils/log.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { isNonMainSessionSubagent } from "../../utils/agentContext.js";
import {
  mcpClientModule,
  callWithSessionRecovery,
  adoptBridgeTargets,
  isBridgePlumbingEnabled,
} from "./callPlumbing.js";
import { serverCacheKey } from "../../services/mcp/client.js";
import { logForDebugging } from "../../utils/debug.js";
import { PASSTHROUGH_MARKER_KEY } from "../../services/deviceBridge/passthroughMarker.js";
import { listMcpTools } from "../../services/mcp/mcpWireUtils.js";
import { officeBridgeListingState, derivedServerId } from "../../services/mcp/firstPartyServerIds.js";
import { env } from "../../utils/env.js";
import { ReannounceRequester } from "./reannounceRequest.js";
import { waitForAnnounce } from "../../utils/remoteTools/folderTargets.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isSameOriginAsCcr, isKnownProxyEndpointUrl } from "../../services/mcp/ccrMcpUrls.js";

//@ chunk-sjeyntvz.js:25418-26038 placement
/**
 * 同步远程工具可用机器：从会话通道与设备桥列出机器，更新主机表并上报 tengu_remote_tool_targets。
 */
function syncRemoteToolTargets(context, hosts, trigger) {
  let before = hosts.sourceHosts("session");
  hosts.replaceRemoteHosts("session", context.toolState.get(RemoteBackgroundCommands).hostsForTable());
  let after = hosts.sourceHosts("session");
  if (toolHostsFingerprint(before) === toolHostsFingerprint(after)) return;
  logEvent("tengu_remote_tool_targets", {
    event:
      context.toolState.get(RemoteBackgroundCommands).entries().length === 0
        ? lit("withdrawn")
        : fromEnum(classifyToolHostsChange(before, after)),
    source: lit("session"),
    trigger: fromEnum(trigger),
    target_count: after.length,
    served_tool_count: after.reduce((acc, host) => acc + host.servedTools.size, 0),
    passthrough_tool_count: after.reduce((acc, host) => acc + (host.passthroughTools?.size ?? 0), 0),
    target_kind: fromEnumOpt(after[0]?.description?.kind),
    target_platform: fromEnumOpt(detectTerminal(after[0]?.description?.platform)),
    incompatible_count: countWhere(after, (host) => host.protocol.kind === "incompatible"),
  });
}
//@ chunk-sjeyntvz.js:26038-26209 placement
async function refreshDeviceBridgeTargets(context, state, trigger) {
  if (!(await isRemoteToolForwardingEnabled())) return;
  let toolState = context.toolState.get(RemoteToolTargetsState);
  toolState.inFlight ??= listDeviceBridgeTargets(context, toolState, state, trigger)
    .catch((error) => {
      logError(toError(error));
    })
    .finally(() => {
      toolState.inFlight = undefined;
    });
  return toolState.inFlight;
}
//@ chunk-sjeyntvz.js:26209-26420 placement
function remoteToolsListingState(context) {
  let state = context.toolState.get(RemoteToolTargetsState);
  let connectionState = remoteToolsConnectionState(context);
  if (
    state.synced &&
    !state.lastListingFailed &&
    connectionState !== undefined &&
    connectionState !== "set_aside"
  )
    return "unlisted";
  if (state.synced && !state.lastListingFailed) return "listed";
  return hasConnectedMcpServers(context) ? "unlisted" : "absent";
}
//@ chunk-sjeyntvz.js:26420-26482 placement
function hasDeviceBridgeConnection(context) {
  return context.toolState.get(RemoteToolTargetsState).connection !== undefined;
}
//@ chunk-sjeyntvz.js:26482-26630 placement
function isListingFailedWithoutHosts(context, registry) {
  return (
    context.toolState.get(RemoteToolTargetsState).lastListingFailed &&
    !registry
      .hosts()
      .some((host) => host.kind === "remote" && (host.source === "bridge" || host.source === "session"))
  );
}
//@ chunk-sjeyntvz.js:26630-29908 placement
/**
 * 调用设备桥 tools/list，按机器分组并采纳/拒绝，失败时保留上次已知机器。
 */
async function listDeviceBridgeTargets(context, state, registry, trigger) {
  let clients = context.mcpClients();
  let connection = findChromeClient(clients);
  if (connection === undefined) {
    if (isNonMainSessionSubagent(context.agentContext)) return;
    reportUnmatchedBridgeEntries(clients, state, trigger);
    state.failedAt = undefined;
    state.lastListingFailed = false;
    if (hasConnectedMcpServers(context)) state.unconnectedSince ??= Date.now();
    else {
      state.provisional = undefined;
      state.unconnectedSince = undefined;
    }
    if (state.connection !== undefined) {
      state.connection = undefined;
      state.listingMemo = undefined;
      state.setAside = 0;
      adoptBridgeMachines(registry, [], {
        invalid: undefined,
        unreadable: 0,
        unreadableMarkers: 0,
        trigger,
      });
    }
    return;
  }
  let cachedListing = mcpClientModule().fetchToolsForClient.cache.get(
    serverCacheKey(connection.name, connection.config),
  );
  let any = context.toolState
    .get(RemoteBackgroundCommands)
    .entries()
    .some((entry) => entry.status === "online");
  let stubRefreshable =
    trigger !== "resolve" && state.provisional?.stub === true && !isSessionChannelDisabled();
  if (
    state.synced &&
    connection === state.connection &&
    cachedListing === state.listingMemo &&
    (any || stubRefreshable || !isProvisionalListingStale(state.provisional))
  )
    return;
  if (state.failedAt?.connection === connection && Date.now() - state.failedAt.time < FAILED_LIST_RETRY_MS)
    return;
  let now = Date.now();
  let listResult = await callWithSessionRecovery(
    connection,
    {
      deadlineAt: now + REMOTE_TARGET_TIMINGS,
      recovery: state.recovery,
      idempotent: true,
    },
    (client, timeoutMs) => listTargetTools(client, Math.min(timeoutMs, MAX_LIST_PAGE_SIZE)),
  );
  if (listResult.kind !== "ok") {
    state.lastListingFailed = true;
    state.failedAt =
      Date.now() - now >= FAILED_LIST_WINDOW_MS
        ? {
            connection,
            time: Date.now(),
          }
        : undefined;
    logForDebugging(
      `[remote-tools] device-bridge tools/list failed (${listResult.kind}); keeping last known machines${"error" in listResult ? `: ${errorMessage(listResult.error)}` : ""}`,
      {
        level: "warn",
      },
    );
    logEvent("tengu_remote_tool_targets", {
      event: lit("list_failed"),
      trigger: fromEnum(trigger),
      reason:
        "error" in listResult && isTimeoutError(listResult.error)
          ? lit("timeout")
          : fromEnum(listResult.kind),
    });
    return;
  }
  if (listResult.value.truncated)
    logForDebugging(
      "[remote-tools] device-bridge tools/list is paginated; only the first page is read for machine discovery",
      {
        level: "warn",
      },
    );
  let adopted = adoptBridgeTargets(connection, listResult.value.tools, state.recovery);
  let channelOnly = isSessionChannelDisabled()
    ? adopted
    : {
        ...adopted,
        hosts: [],
        invalid: undefined,
      };
  let setAsideCount = adopted.hosts.length - channelOnly.hosts.length;
  state.offer = setAsideCount > 0 ? "offered" : "none";
  if (setAsideCount !== state.setAside) {
    state.setAside = setAsideCount;
    if (setAsideCount > 0) {
      logEvent("tengu_remote_tool_targets", {
        event: lit("listing_set_aside"),
        trigger: fromEnum(trigger),
        host_count: setAsideCount,
        tool_count: listResult.value.tools.length,
        stub: listResult.value.stub,
        invalid: fromEnumOpt(adopted.invalid),
      });
      logForDebugging(
        "[remote-tools] device-bridge listing offered a machine; not adopted: machines are taken from the session channel alone",
        {
          level: "warn",
        },
      );
    }
  }
  let listedEmpty = channelOnly.hosts.length === 0;
  if (listedEmpty && (state.provisional === undefined || state.provisional.stub !== listResult.value.stub)) {
    logEvent("tengu_remote_tool_targets", {
      event: lit("listed_empty"),
      trigger: fromEnum(trigger),
      tool_count: listResult.value.tools.length,
      truncated: listResult.value.truncated,
      has_served_name: listResult.value.tools.some((tool) => DEVICE_PASSTHROUGH_TOOL_NAMES.has(tool.name)),
      marker_count: countWhere(
        listResult.value.tools,
        (tool) => tool._meta?.[PASSTHROUGH_MARKER_KEY] !== undefined,
      ),
      stub: listResult.value.stub,
    });
    logForDebugging(
      `[remote-tools] device-bridge listing adopted no machine (${listResult.value.tools.length} tools${listResult.value.stub ? (any ? ", stub listing \u2014 the bound machine serves over the session channel instead" : ", stub listing \u2014 the bound machine has not announced yet") : ""})`,
    );
  }
  if (channelOnly.invalid !== undefined)
    logForDebugging(
      `[remote-tools] device-bridge listing rejected (${channelOnly.invalid}): one connection must announce exactly one machine \u2014 its first announced name stays attached but unreachable`,
      {
        level: "warn",
      },
    );
  adoptBridgeMachines(registry, channelOnly.hosts, {
    invalid: channelOnly.invalid,
    unreadable: channelOnly.unreadable,
    unreadableMarkers: channelOnly.unreadableMarkers,
    trigger,
  });
  let dropCache =
    !listedEmpty &&
    state.provisional !== undefined &&
    cachedListing !== undefined &&
    cachedListing === state.listingMemo;
  if (dropCache)
    mcpClientModule().fetchToolsForClient.cache.delete(serverCacheKey(connection.name, connection.config));
  state.connection = connection;
  state.listingMemo = dropCache ? undefined : cachedListing;
  state.synced = true;
  state.lastListedAt = Date.now();
  state.unconnectedSince = undefined;
  state.provisional = listedEmpty
    ? {
        at: Date.now(),
        since: state.provisional?.since ?? Date.now(),
        stub: listResult.value.stub,
      }
    : undefined;
  state.reportedUnmatched = false;
  state.failedAt = undefined;
  state.lastListingFailed = false;
  logForDebugging(
    `[remote-tools] device bridge matched: ${connection.name} (${listResult.value.tools.length} tools over ${listResult.value.pages} page(s))`,
  );
}
//@ chunk-sjeyntvz.js:29908-30056 placement
async function listTargetTools(client, timeout) {
  let result = await listMcpTools(client, {
    timeout,
  });
  return {
    tools: result.tools.filter(isNamedToolEntry),
    pages: 1,
    truncated: Boolean(result.nextCursor),
    stub: officeBridgeListingState(result) === "stub",
  };
}
//@ chunk-sjeyntvz.js:30056-30134 placement
function isNamedToolEntry(tool) {
  return typeof tool === "object" && tool !== null && typeof tool.name === "string";
}
//@ chunk-sjeyntvz.js:30134-30228 placement
function isTimeoutError(error) {
  let lower = errorMessage(error).toLowerCase();
  return lower.includes("timed out") || lower.includes("timeout");
}
//@ chunk-sjeyntvz.js:30228-30324 placement
function hasConnectedMcpServers(context) {
  return context
    .mcpClients()
    .some((client) => getServerUrl(client) && client.type !== "disabled" && client.type !== "needs-auth");
}
//@ chunk-sjeyntvz.js:30324-30608 placement
function remoteToolsConnectionState(context) {
  let bridgeState = deviceBridgeState(context);
  let state =
    bridgeState !== "connecting" && context.toolState.get(RemoteToolTargetsState).setAside > 0
      ? "set_aside"
      : bridgeState;
  if (bridgeState === undefined || isSessionChannelDisabled()) return state;
  let commands = context.toolState.get(RemoteBackgroundCommands);
  if (commands.hasAnnouncedThisLife()) return commands.entries().length === 0 ? "serves_nothing" : state;
  return (env.CLAUDE_CODE_WORKER_EPOCH ?? 1) > 1 ? "not_reannounced" : state;
}
//@ chunk-sjeyntvz.js:30608-30809 placement
function sessionChannelOffer(context) {
  if (isSessionChannelDisabled()) return "none";
  let { offer } = context.toolState.get(RemoteToolTargetsState);
  if (offer !== "unread") return offer;
  let filtered = context.mcpClients().filter((client) => client.name === REMOTE_DEVICES_SERVER_NAME);
  return filtered.length > 0 &&
    !filtered.some((client) => getServerUrl(client) || isScopedMcpServerConfig(client))
    ? "none"
    : "unread";
}
//@ chunk-sjeyntvz.js:30809-30822 placement
var MIN_TRANSPORT_DEADLINE_MS = 15000;
//@ chunk-sjeyntvz.js:30822-30885 placement
function targetsDeadlineMs(longLived) {
  return longLived
    ? Math.max(MIN_TRANSPORT_DEADLINE_MS, SESSION_TRANSPORT_LIMITS.defaultDeadlineMs)
    : MIN_TRANSPORT_DEADLINE_MS;
}
//@ chunk-sjeyntvz.js:30885-31070 placement
function shouldReannounce(context) {
  let commands = context.toolState.get(RemoteBackgroundCommands);
  return (
    (env.CLAUDE_CODE_WORKER_EPOCH ?? 1) > 1 &&
    !isSessionChannelDisabled() &&
    !(commands.hasAnnouncedThisLife() && commands.entries().length === 0) &&
    context.toolState.get(ReannounceRequester).canAsk() &&
    isRemoteToolForwardingEnabledCached() &&
    isBridgePlumbingEnabled()
  );
}
//@ chunk-sjeyntvz.js:31070-31157 placement
function canReannounceMachine(context, machines, machine) {
  return (
    machines.has(machine) &&
    !context.toolState.get(RemoteBackgroundCommands).withdrawnThisLife(machine) &&
    shouldReannounce(context)
  );
}
//@ chunk-sjeyntvz.js:31157-32124 placement
async function requestReannounce(
  context,
  signal,
  {
    deadlineMs = SESSION_TRANSPORT_LIMITS.defaultDeadlineMs,
    sliceMs = MIN_RELIST_INTERVAL_MS,
    routableOtherwise: isRoutableOtherwise,
    forMachine: machine,
  } = {},
) {
  let commands = context.toolState.get(RemoteBackgroundCommands);
  if (machine === undefined && commands.entries().length > 0)
    return {
      kind: "announced",
    };
  let earlierWaitMs = commands.announceWaitExpired();
  if (earlierWaitMs !== undefined)
    return {
      kind: "gave_up_earlier",
      waitedMs: earlierWaitMs,
    };
  if (
    machine !== undefined &&
    context.toolState.get(ReannounceRequester).askOnce({
      workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH ?? 1,
      deadlineMs,
    })
  )
    logForDebugging("[remote-tools] asked the attached client to announce to this replacement worker");
  let now = Date.now();
  for (;;) {
    if (signal.aborted)
      return {
        kind: "aborted",
      };
    if (machine === undefined ? commands.hasAnnouncedThisLife() : commands.withdrawnThisLife(machine))
      return {
        kind: "announced",
      };
    let remainingMs = deadlineMs - (Date.now() - now);
    if (remainingMs <= 0) break;
    let waited = await waitForAnnounce(commands, signal, Math.min(sliceMs, remainingMs));
    if (waited === "announced" && (machine === undefined || isRoutableOtherwise === undefined))
      return {
        kind: "announced",
      };
    if (waited === "aborted")
      return {
        kind: "aborted",
      };
    if (isRoutableOtherwise !== undefined && (await isRoutableOtherwise()))
      return waited === "announced"
        ? {
            kind: "announced",
          }
        : {
            kind: "routable",
          };
  }
  let waitedMs = Date.now() - now;
  commands.markAnnounceWaitExpired(waitedMs);
  return {
    kind: "gave_up",
    waitedMs,
  };
}
//@ chunk-sjeyntvz.js:32124-32412 placement
function deviceBridgeState(context) {
  let state = context.toolState.get(RemoteToolTargetsState);
  if (state.connection === undefined)
    return hasConnectedMcpServers(context) &&
      state.unconnectedSince !== undefined &&
      Date.now() - state.unconnectedSince < PROVISIONAL_FRESH_MS
      ? "connecting"
      : undefined;
  if (!state.provisional) return;
  if (Date.now() - state.provisional.since < PROVISIONAL_FRESH_MS) return "connecting";
  return state.provisional.stub ? "not_connected" : undefined;
}
//@ chunk-sjeyntvz.js:32412-32518 placement
function isProvisionalListingStale(provisional) {
  if (provisional === undefined) return false;
  let now = Date.now();
  if (!provisional.stub && now - provisional.since >= PROVISIONAL_FRESH_MS) return false;
  return now - provisional.at >= MIN_RELIST_INTERVAL_MS;
}
//@ chunk-sjeyntvz.js:32518-33042 placement
function reportUnmatchedBridgeEntries(clients, state, trigger) {
  let filtered = clients.filter((client) => client.name === REMOTE_DEVICES_SERVER_NAME);
  if (filtered.length === 0 || state.reportedUnmatched) return;
  let mapped = filtered.map(classifyBridgeEntry);
  if (mapped.every((reason) => reason === "connecting")) return;
  state.reportedUnmatched = true;
  logForDebugging(
    `[remote-tools] a '${REMOTE_DEVICES_SERVER_NAME}' MCP entry exists but was not adopted as the device bridge: ${filtered.map((client, index) => `${mapped[index]} (type=${client.type}, scope=${client.config.scope})`).join("; ")}`,
    {
      level: "warn",
    },
  );
  logEvent("tengu_remote_tool_targets", {
    event: lit("no_bridge_connection"),
    trigger: fromEnum(trigger),
    servers_seen: filtered.length,
    reason: fromEnum(mapped[0] ?? "none"),
    ingress_base_unset: startupCcrEnv.atStartup === undefined,
  });
}
//@ chunk-sjeyntvz.js:33042-33438 placement
function classifyBridgeEntry(client) {
  if (isScopedMcpServerConfig(client)) return "scoped_entry";
  if (!("url" in client.config) || typeof client.config.url !== "string") return "no_url";
  if (!isSameOriginAsCcr(client.config.url)) return "not_ccr_proxy_url";
  if (!isKnownProxyEndpointUrl(client.config.url)) return "not_devices_upstream";
  if (!parseCcrMcpUrl(client.config.url)) return "routing_shape";
  switch (client.type) {
    case "connected":
      return "none";
    case "disabled":
      return "disabled";
    case "needs-auth":
      return "needs_auth";
    default:
      return "connecting";
  }
}
//@ chunk-sjeyntvz.js:33438-33500 placement (2.1.88 match: findChromeClient, 1)
function findChromeClient(clients) {
  return clients.find((client) => client.type === "connected" && getServerUrl(client));
}
//@ chunk-sjeyntvz.js:33500-33628 placement (2.1.88 match: getServerUrl, 1)
function getServerUrl(config) {
  return (
    config.name === REMOTE_DEVICES_SERVER_NAME &&
    !isScopedMcpServerConfig(config) &&
    "url" in config.config &&
    typeof config.config.url === "string" &&
    isKnownProxyEndpointUrl(config.config.url) &&
    parseCcrMcpUrl(config.config.url)
  );
}
//@ chunk-sjeyntvz.js:33628-33765 placement
function isScopedMcpServerConfig(client) {
  let { scope, pluginSource, agentSource } = client.config;
  return (
    scope === "project" ||
    scope === "local" ||
    scope === "agent" ||
    pluginSource !== undefined ||
    agentSource !== undefined
  );
}
//@ chunk-sjeyntvz.js:33765-34047 placement
function parseCcrMcpUrl(url) {
  try {
    let parsed = new URL(url);
    let all = parsed.searchParams.getAll("toolbox_mcp_server_id");
    let sessionId = /\/v2\/ccr-sessions\/([^/]+)\/mcp$/.exec(parsed.pathname)?.[1];
    let serverId = all[0];
    return (
      parsed.searchParams.getAll("mcp_url").length === 1 &&
      (all.length === 0 ||
        (all.length === 1 &&
          (serverId === REMOTE_DEVICES_SERVER_NAME ||
            (sessionId !== undefined && serverId === derivedServerIdForTool(sessionId)))))
    );
  } catch {
    return false;
  }
}
//@ chunk-sjeyntvz.js:34047-34078 placement
function derivedServerIdForTool(sessionId) {
  return derivedServerId(sessionId, REMOTE_DEVICES_SERVER_NAME);
}
//@ chunk-sjeyntvz.js:34078-35139 placement
function adoptBridgeMachines(registry, hosts, { invalid, unreadable, unreadableMarkers, trigger }) {
  let before = registry.sourceHosts("bridge");
  let { dropped } = registry.replaceRemoteHosts("bridge", hosts);
  if (dropped.length > 0)
    logForDebugging(
      `[remote-tools] the bridge announced ${dropped.length} machine(s) under a name this session cannot adopt; not adopted: ${dropped.join(", ")}`,
      {
        level: "warn",
      },
    );
  let after = registry.sourceHosts("bridge");
  let changed = toolHostsFingerprint(before) !== toolHostsFingerprint(after);
  if (invalid !== undefined)
    logEvent("tengu_remote_tool_targets", {
      event: lit("listing_invalid"),
      reason: fromEnum(invalid),
      trigger: fromEnum(trigger),
    });
  let changeKind = changed ? classifyToolHostsChange(before, after) : undefined;
  if (changeKind !== undefined)
    logEvent("tengu_remote_tool_targets", {
      event: fromEnum(changeKind),
      trigger: fromEnum(trigger),
      target_count: after.length,
      served_tool_count: after.reduce((acc, host) => acc + host.servedTools.size, 0),
      passthrough_tool_count: after.reduce((acc, host) => acc + (host.passthroughTools?.size ?? 0), 0),
      target_kind: fromEnumOpt(after[0]?.description?.kind),
      target_platform: fromEnumOpt(detectTerminal(after[0]?.description?.platform)),
      incompatible_count: countWhere(after, (host) => host.protocol.kind === "incompatible"),
      protocol_version: after[0]?.protocol.kind === "compatible" ? after[0].protocol.version : undefined,
    });
  if (unreadable > 0 || unreadableMarkers > 0)
    logEvent("tengu_remote_tool_targets", {
      event: lit("unreadable"),
      trigger: fromEnum(trigger),
      unreadable_count: unreadable,
      unreadable_marker_count: unreadableMarkers,
    });
}
//@ chunk-sjeyntvz.js:35139-35275 placement
function toolHostsFingerprint(hosts) {
  return hosts
    .map(
      (host) =>
        `${host.name}\x00${host.status}\x00${host.servedTools.size}\x00${host.passthroughTools?.size ?? 0}`,
    )
    .sort().join(`
`);
}
//@ chunk-sjeyntvz.js:35275-35500 placement
function classifyToolHostsChange(before, after) {
  let any = before.some((host) => host.status === "online");
  let any_2 = after.some((host) => host.status === "online");
  if (before.length === 0) return after.length === 0 ? "changed" : "discovered";
  if (any && !any_2) return "went_offline";
  if (!any && any_2) return "came_online";
  return "changed";
}
export {
  isListingFailedWithoutHosts,
  remoteToolsConnectionState,
  requestReannounce,
  canReannounceMachine,
  targetsDeadlineMs,
  hasDeviceBridgeConnection,
  sessionChannelOffer,
  syncRemoteToolTargets,
  remoteToolsListingState,
  shouldReannounce,
  refreshDeviceBridgeTargets,
};
