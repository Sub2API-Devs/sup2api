/**
 * remote/tools/remoteToolTargets.ts
 *
 * 2.1.316 新增：设备桥远程工具目标的列举、采纳与同步
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-25sm7c4g.js (29)
 * attribution: placement 29
 */
import { RemoteBackgroundCommands, iie, jX } from "../../services/remoteTools/backgroundCommands.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { detectTerminal } from "./protocolConstants.js";
import { count } from "../../utils/collections.js";
import {
  isRemoteToolForwardingEnabled,
  isSessionChannelDisabled,
  isRemoteToolForwardingEnabledCached,
} from "../../services/remoteTools/servingGates.js";
import {
  RemoteToolTargetsState,
  mn,
  REMOTE_TARGET_TIMINGS,
  fn,
  pn,
  SESSION_TRANSPORT_LIMITS,
  W,
  Y,
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
import { ir } from "../../services/mcp/client.js";
import { logForDebugging } from "../../utils/debug.js";
import { PASSTHROUGH_MARKER_KEY } from "../../services/deviceBridge/passthroughMarker.js";
import { listMcpTools } from "../../services/mcp/mcpWireUtils.js";
import { officeBridgeListingState, derivedServerId } from "../../services/mcp/firstPartyServerIds.js";
import { env } from "../../utils/env.js";
import { ReannounceRequester } from "./reannounceRequest.js";
import { waitForAnnounce } from "../../utils/remoteTools/folderTargets.js";
import { startupCcrEnv } from "../../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { isSameOriginAsCcr } from "../../services/mcp/ccrMcpUrls.js";
import { isKnownProxyEndpointUrl } from "../../tools/WebFetchTool/utils.js";

/**
 * 同步远程工具可用机器：从会话通道与设备桥列出机器，更新主机表并上报 tengu_remote_tool_targets。
 */
//@ chunk-25sm7c4g.js:25274-25894 placement
function syncRemoteToolTargets(e, n, r) {
  let sourceHosts = n.sourceHosts("session");
  n.replaceRemoteHosts("session", e.toolState.get(RemoteBackgroundCommands).hostsForTable());
  let sourceHosts_2 = n.sourceHosts("session");
  if (toolHostsFingerprint(sourceHosts) === toolHostsFingerprint(sourceHosts_2)) return;
  logEvent("tengu_remote_tool_targets", {
    event:
      e.toolState.get(RemoteBackgroundCommands).entries().length === 0
        ? lit("withdrawn")
        : fromEnum(classifyToolHostsChange(sourceHosts, sourceHosts_2)),
    source: lit("session"),
    trigger: fromEnum(r),
    target_count: sourceHosts_2.length,
    served_tool_count: sourceHosts_2.reduce((s, m) => s + m.servedTools.size, 0),
    passthrough_tool_count: sourceHosts_2.reduce((s, m) => s + (m.passthroughTools?.size ?? 0), 0),
    target_kind: fromEnumOpt(sourceHosts_2[0]?.description?.kind),
    target_platform: fromEnumOpt(detectTerminal(sourceHosts_2[0]?.description?.platform)),
    incompatible_count: count(sourceHosts_2, (s) => s.protocol.kind === "incompatible"),
  });
}
//@ chunk-25sm7c4g.js:25894-26064 placement
async function refreshDeviceBridgeTargets(e, n, r) {
  if (!(await isRemoteToolForwardingEnabled())) return;
  let o = e.toolState.get(RemoteToolTargetsState);
  return (
    (o.inFlight ??= listDeviceBridgeTargets(e, o, n, r)
      .catch((u) => {
        logError(toError(u));
      })
      .finally(() => {
        o.inFlight = void 0;
      })),
    o.inFlight
  );
}
//@ chunk-25sm7c4g.js:26064-26275 placement
function remoteToolsListingState(e) {
  let n = e.toolState.get(RemoteToolTargetsState),
    r = remoteToolsConnectionState(e);
  if (n.synced && !n.lastListingFailed && r !== void 0 && r !== "set_aside") return "unlisted";
  if (n.synced && !n.lastListingFailed) return "listed";
  return Q(e) ? "unlisted" : "absent";
}
//@ chunk-25sm7c4g.js:26275-26337 placement
function hasDeviceBridgeConnection(e) {
  return e.toolState.get(RemoteToolTargetsState).connection !== void 0;
}
//@ chunk-25sm7c4g.js:26337-26485 placement
function isListingFailedWithoutHosts(e, n) {
  return (
    e.toolState.get(RemoteToolTargetsState).lastListingFailed &&
    !n.hosts().some((o) => o.kind === "remote" && (o.source === "bridge" || o.source === "session"))
  );
}
/**
 * 调用设备桥 tools/list，按机器分组并采纳/拒绝，失败时保留上次已知机器。
 */
//@ chunk-25sm7c4g.js:26485-29763 placement
async function listDeviceBridgeTargets(e, n, r, o) {
  let mcpClients = e.mcpClients(),
    s = findChromeClient(mcpClients);
  if (s === void 0) {
    if (isNonMainSessionSubagent(e.agentContext)) return;
    if (
      (reportUnmatchedBridgeEntries(mcpClients, n, o),
      (n.failedAt = void 0),
      (n.lastListingFailed = !1),
      Q(e))
    )
      n.unconnectedSince ??= Date.now();
    else ((n.provisional = void 0), (n.unconnectedSince = void 0));
    if (n.connection !== void 0)
      ((n.connection = void 0),
        (n.listingMemo = void 0),
        (n.setAside = 0),
        adoptBridgeMachines(r, [], { invalid: void 0, unreadable: 0, unreadableMarkers: 0, trigger: o }));
    return;
  }
  let m = mcpClientModule().fetchToolsForClient.cache.get(ir(s.name, s.config)),
    any = e.toolState
      .get(RemoteBackgroundCommands)
      .entries()
      .some((M) => M.status === "online"),
    f = o !== "resolve" && n.provisional?.stub === !0 && !isSessionChannelDisabled();
  if (
    n.synced &&
    s === n.connection &&
    m === n.listingMemo &&
    (any || f || !isProvisionalListingStale(n.provisional))
  )
    return;
  if (n.failedAt?.connection === s && Date.now() - n.failedAt.time < mn) return;
  let now = Date.now(),
    g = await callWithSessionRecovery(
      s,
      { deadlineAt: now + REMOTE_TARGET_TIMINGS, recovery: n.recovery, idempotent: !0 },
      (M, y) => listTargetTools(M, Math.min(y, fn)),
    );
  if (g.kind !== "ok") {
    ((n.lastListingFailed = !0),
      (n.failedAt = Date.now() - now >= pn ? { connection: s, time: Date.now() } : void 0),
      logForDebugging(
        `[remote-tools] device-bridge tools/list failed (${g.kind}); keeping last known machines${"error" in g ? `: ${errorMessage(g.error)}` : ""}`,
        { level: "warn" },
      ),
      logEvent("tengu_remote_tool_targets", {
        event: lit("list_failed"),
        trigger: fromEnum(o),
        reason: "error" in g && yn(g.error) ? lit("timeout") : fromEnum(g.kind),
      }));
    return;
  }
  if (g.value.truncated)
    logForDebugging(
      "[remote-tools] device-bridge tools/list is paginated; only the first page is read for machine discovery",
      { level: "warn" },
    );
  let w = adoptBridgeTargets(s, g.value.tools, n.recovery),
    S = isSessionChannelDisabled() ? w : { ...w, hosts: [], invalid: void 0 },
    R = w.hosts.length - S.hosts.length;
  if (((n.offer = R > 0 ? "offered" : "none"), R !== n.setAside)) {
    if (((n.setAside = R), R > 0))
      (logEvent("tengu_remote_tool_targets", {
        event: lit("listing_set_aside"),
        trigger: fromEnum(o),
        host_count: R,
        tool_count: g.value.tools.length,
        stub: g.value.stub,
        invalid: fromEnumOpt(w.invalid),
      }),
        logForDebugging(
          "[remote-tools] device-bridge listing offered a machine; not adopted: machines are taken from the session channel alone",
          { level: "warn" },
        ));
  }
  let T = S.hosts.length === 0;
  if (T && (n.provisional === void 0 || n.provisional.stub !== g.value.stub))
    (logEvent("tengu_remote_tool_targets", {
      event: lit("listed_empty"),
      trigger: fromEnum(o),
      tool_count: g.value.tools.length,
      truncated: g.value.truncated,
      has_served_name: g.value.tools.some((tool) => iie.has(tool.name)),
      marker_count: count(g.value.tools, (M) => M._meta?.[PASSTHROUGH_MARKER_KEY] !== void 0),
      stub: g.value.stub,
    }),
      logForDebugging(
        `[remote-tools] device-bridge listing adopted no machine (${g.value.tools.length} tools${g.value.stub ? (any ? ", stub listing \u2014 the bound machine serves over the session channel instead" : ", stub listing \u2014 the bound machine has not announced yet") : ""})`,
      ));
  if (S.invalid !== void 0)
    logForDebugging(
      `[remote-tools] device-bridge listing rejected (${S.invalid}): one connection must announce exactly one machine \u2014 its first announced name stays attached but unreachable`,
      { level: "warn" },
    );
  adoptBridgeMachines(r, S.hosts, {
    invalid: S.invalid,
    unreadable: S.unreadable,
    unreadableMarkers: S.unreadableMarkers,
    trigger: o,
  });
  let A = !T && n.provisional !== void 0 && m !== void 0 && m === n.listingMemo;
  if (A) mcpClientModule().fetchToolsForClient.cache.delete(ir(s.name, s.config));
  ((n.connection = s),
    (n.listingMemo = A ? void 0 : m),
    (n.synced = !0),
    (n.lastListedAt = Date.now()),
    (n.unconnectedSince = void 0),
    (n.provisional = T
      ? { at: Date.now(), since: n.provisional?.since ?? Date.now(), stub: g.value.stub }
      : void 0),
    (n.reportedUnmatched = !1),
    (n.failedAt = void 0),
    (n.lastListingFailed = !1),
    logForDebugging(
      `[remote-tools] device bridge matched: ${s.name} (${g.value.tools.length} tools over ${g.value.pages} page(s))`,
    ));
}
//@ chunk-25sm7c4g.js:29763-29911 placement
async function listTargetTools(e, n) {
  let r = await listMcpTools(e, { timeout: n });
  return {
    tools: r.tools.filter(wn),
    pages: 1,
    truncated: Boolean(r.nextCursor),
    stub: officeBridgeListingState(r) === "stub",
  };
}
//@ chunk-25sm7c4g.js:29911-29989 placement
function wn(e) {
  return typeof e === "object" && e !== null && typeof e.name === "string";
}
//@ chunk-25sm7c4g.js:29989-30083 placement
function yn(e) {
  let lower = errorMessage(e).toLowerCase();
  return lower.includes("timed out") || lower.includes("timeout");
}
//@ chunk-25sm7c4g.js:30083-30179 placement
function Q(e) {
  return e.mcpClients().some((n) => getServerUrl(n) && n.type !== "disabled" && n.type !== "needs-auth");
}
//@ chunk-25sm7c4g.js:30179-30463 placement
function remoteToolsConnectionState(e) {
  let n = deviceBridgeState(e),
    r = n !== "connecting" && e.toolState.get(RemoteToolTargetsState).setAside > 0 ? "set_aside" : n;
  if (n === void 0 || isSessionChannelDisabled()) return r;
  let o = e.toolState.get(RemoteBackgroundCommands);
  if (o.hasAnnouncedThisLife()) return o.entries().length === 0 ? "serves_nothing" : r;
  return (env.CLAUDE_CODE_WORKER_EPOCH ?? 1) > 1 ? "not_reannounced" : r;
}
//@ chunk-25sm7c4g.js:30463-30664 placement
function sessionChannelOffer(e) {
  if (isSessionChannelDisabled()) return "none";
  let { offer: offer } = e.toolState.get(RemoteToolTargetsState);
  if (offer !== "unread") return offer;
  let filtered = e.mcpClients().filter((o) => o.name === jX);
  return filtered.length > 0 && !filtered.some((o) => getServerUrl(o) || isScopedMcpServerConfig(o))
    ? "none"
    : "unread";
}
//@ chunk-25sm7c4g.js:30664-30677 placement
var Se = 15000;
//@ chunk-25sm7c4g.js:30677-30740 placement
function targetsDeadlineMs(e) {
  return e ? Math.max(Se, SESSION_TRANSPORT_LIMITS.defaultDeadlineMs) : Se;
}
//@ chunk-25sm7c4g.js:30740-30925 placement
function shouldReannounce(e) {
  let n = e.toolState.get(RemoteBackgroundCommands);
  return (
    (env.CLAUDE_CODE_WORKER_EPOCH ?? 1) > 1 &&
    !isSessionChannelDisabled() &&
    !(n.hasAnnouncedThisLife() && n.entries().length === 0) &&
    e.toolState.get(ReannounceRequester).canAsk() &&
    isRemoteToolForwardingEnabledCached() &&
    isBridgePlumbingEnabled()
  );
}
//@ chunk-25sm7c4g.js:30925-31012 placement
function canReannounceMachine(e, n, r) {
  return n.has(r) && !e.toolState.get(RemoteBackgroundCommands).withdrawnThisLife(r) && shouldReannounce(e);
}
//@ chunk-25sm7c4g.js:31012-31979 placement
async function requestReannounce(
  e,
  n,
  {
    deadlineMs: r = SESSION_TRANSPORT_LIMITS.defaultDeadlineMs,
    sliceMs: o = W,
    routableOtherwise: u,
    forMachine: s,
  } = {},
) {
  let m = e.toolState.get(RemoteBackgroundCommands);
  if (s === void 0 && m.entries().length > 0) return { kind: "announced" };
  let announceWaitExpired = m.announceWaitExpired();
  if (announceWaitExpired !== void 0) return { kind: "gave_up_earlier", waitedMs: announceWaitExpired };
  if (
    s !== void 0 &&
    e.toolState
      .get(ReannounceRequester)
      .askOnce({ workerEpoch: env.CLAUDE_CODE_WORKER_EPOCH ?? 1, deadlineMs: r })
  )
    logForDebugging("[remote-tools] asked the attached client to announce to this replacement worker");
  let now = Date.now();
  for (;;) {
    if (n.aborted) return { kind: "aborted" };
    if (s === void 0 ? m.hasAnnouncedThisLife() : m.withdrawnThisLife(s)) return { kind: "announced" };
    let g = r - (Date.now() - now);
    if (g <= 0) break;
    let w = await waitForAnnounce(m, n, Math.min(o, g));
    if (w === "announced" && (s === void 0 || u === void 0)) return { kind: "announced" };
    if (w === "aborted") return { kind: "aborted" };
    if (u !== void 0 && (await u())) return w === "announced" ? { kind: "announced" } : { kind: "routable" };
  }
  let _ = Date.now() - now;
  return (m.markAnnounceWaitExpired(_), { kind: "gave_up", waitedMs: _ });
}
//@ chunk-25sm7c4g.js:31979-32267 placement
function deviceBridgeState(e) {
  let n = e.toolState.get(RemoteToolTargetsState);
  if (n.connection === void 0)
    return Q(e) && n.unconnectedSince !== void 0 && Date.now() - n.unconnectedSince < Y
      ? "connecting"
      : void 0;
  if (!n.provisional) return;
  if (Date.now() - n.provisional.since < Y) return "connecting";
  return n.provisional.stub ? "not_connected" : void 0;
}
//@ chunk-25sm7c4g.js:32267-32373 placement
function isProvisionalListingStale(e) {
  if (e === void 0) return !1;
  let now = Date.now();
  if (!e.stub && now - e.since >= Y) return !1;
  return now - e.at >= W;
}
//@ chunk-25sm7c4g.js:32373-32897 placement
function reportUnmatchedBridgeEntries(e, n, r) {
  let filtered = e.filter((s) => s.name === jX);
  if (filtered.length === 0 || n.reportedUnmatched) return;
  let mapped = filtered.map(classifyBridgeEntry);
  if (mapped.every((s) => s === "connecting")) return;
  ((n.reportedUnmatched = !0),
    logForDebugging(
      `[remote-tools] a '${jX}' MCP entry exists but was not adopted as the device bridge: ${filtered.map((s, m) => `${mapped[m]} (type=${s.type}, scope=${s.config.scope})`).join("; ")}`,
      { level: "warn" },
    ),
    logEvent("tengu_remote_tool_targets", {
      event: lit("no_bridge_connection"),
      trigger: fromEnum(r),
      servers_seen: filtered.length,
      reason: fromEnum(mapped[0] ?? "none"),
      ingress_base_unset: startupCcrEnv.atStartup === void 0,
    }));
}
//@ chunk-25sm7c4g.js:32897-33293 placement
function classifyBridgeEntry(e) {
  if (isScopedMcpServerConfig(e)) return "scoped_entry";
  if (!("url" in e.config) || typeof e.config.url !== "string") return "no_url";
  if (!isSameOriginAsCcr(e.config.url)) return "not_ccr_proxy_url";
  if (!isKnownProxyEndpointUrl(e.config.url)) return "not_devices_upstream";
  if (!parseCcrMcpUrl(e.config.url)) return "routing_shape";
  switch (e.type) {
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
//@ chunk-25sm7c4g.js:33293-33355 placement = findChromeClient (1)
function findChromeClient(clients) {
  return clients.find((client) => client.type === "connected" && getServerUrl(client));
}
//@ chunk-25sm7c4g.js:33355-33483 placement = getServerUrl (1)
function getServerUrl(config) {
  return (
    config.name === jX &&
    !isScopedMcpServerConfig(config) &&
    "url" in config.config &&
    typeof config.config.url === "string" &&
    isKnownProxyEndpointUrl(config.config.url) &&
    parseCcrMcpUrl(config.config.url)
  );
}
//@ chunk-25sm7c4g.js:33483-33620 placement
function isScopedMcpServerConfig(e) {
  let { scope: scope, pluginSource: pluginSource, agentSource: agentSource } = e.config;
  return (
    scope === "project" ||
    scope === "local" ||
    scope === "agent" ||
    pluginSource !== void 0 ||
    agentSource !== void 0
  );
}
//@ chunk-25sm7c4g.js:33620-33902 placement
function parseCcrMcpUrl(e) {
  try {
    let n = new URL(e),
      all = n.searchParams.getAll("toolbox_mcp_server_id"),
      o = /\/v2\/ccr-sessions\/([^/]+)\/mcp$/.exec(n.pathname)?.[1],
      u = all[0];
    return (
      n.searchParams.getAll("mcp_url").length === 1 &&
      (all.length === 0 || (all.length === 1 && (u === jX || (o !== void 0 && u === An(o)))))
    );
  } catch {
    return !1;
  }
}
//@ chunk-25sm7c4g.js:33902-33933 placement
function An(e) {
  return derivedServerId(e, jX);
}
//@ chunk-25sm7c4g.js:33933-34994 placement
function adoptBridgeMachines(
  e,
  n,
  { invalid: invalid, unreadable: unreadable, unreadableMarkers: unreadableMarkers, trigger: trigger },
) {
  let sourceHosts = e.sourceHosts("bridge"),
    { dropped: dropped } = e.replaceRemoteHosts("bridge", n);
  if (dropped.length > 0)
    logForDebugging(
      `[remote-tools] the bridge announced ${dropped.length} machine(s) under a name this session cannot adopt; not adopted: ${dropped.join(", ")}`,
      { level: "warn" },
    );
  let sourceHosts_2 = e.sourceHosts("bridge"),
    _ = toolHostsFingerprint(sourceHosts) !== toolHostsFingerprint(sourceHosts_2);
  if (invalid !== void 0)
    logEvent("tengu_remote_tool_targets", {
      event: lit("listing_invalid"),
      reason: fromEnum(invalid),
      trigger: fromEnum(trigger),
    });
  let g = _ ? classifyToolHostsChange(sourceHosts, sourceHosts_2) : void 0;
  if (g !== void 0)
    logEvent("tengu_remote_tool_targets", {
      event: fromEnum(g),
      trigger: fromEnum(trigger),
      target_count: sourceHosts_2.length,
      served_tool_count: sourceHosts_2.reduce((w, S) => w + S.servedTools.size, 0),
      passthrough_tool_count: sourceHosts_2.reduce((w, S) => w + (S.passthroughTools?.size ?? 0), 0),
      target_kind: fromEnumOpt(sourceHosts_2[0]?.description?.kind),
      target_platform: fromEnumOpt(detectTerminal(sourceHosts_2[0]?.description?.platform)),
      incompatible_count: count(sourceHosts_2, (w) => w.protocol.kind === "incompatible"),
      protocol_version:
        sourceHosts_2[0]?.protocol.kind === "compatible" ? sourceHosts_2[0].protocol.version : void 0,
    });
  if (unreadable > 0 || unreadableMarkers > 0)
    logEvent("tengu_remote_tool_targets", {
      event: lit("unreadable"),
      trigger: fromEnum(trigger),
      unreadable_count: unreadable,
      unreadable_marker_count: unreadableMarkers,
    });
}
//@ chunk-25sm7c4g.js:34994-35130 placement
function toolHostsFingerprint(e) {
  return e
    .map((n) => `${n.name}\x00${n.status}\x00${n.servedTools.size}\x00${n.passthroughTools?.size ?? 0}`)
    .sort().join(`
`);
}
//@ chunk-25sm7c4g.js:35130-35355 placement
function classifyToolHostsChange(e, n) {
  let any = e.some((u) => u.status === "online"),
    any_2 = n.some((u) => u.status === "online");
  if (e.length === 0) return n.length === 0 ? "changed" : "discovered";
  if (any && !any_2) return "went_offline";
  if (!any && any_2) return "came_online";
  return "changed";
}

export {
  syncRemoteToolTargets,
  refreshDeviceBridgeTargets,
  isListingFailedWithoutHosts,
  remoteToolsConnectionState,
  requestReannounce,
  canReannounceMachine,
  targetsDeadlineMs,
  hasDeviceBridgeConnection,
  sessionChannelOffer,
  remoteToolsListingState,
  shouldReannounce,
};
