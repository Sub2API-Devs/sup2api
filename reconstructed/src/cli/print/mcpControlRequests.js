/**
 * cli/print/mcpControlRequests.ts
 *
 * 2.1.316 新增：SDK 控制请求中 MCP 相关的处理（mcp_status、mcp_set_servers、mcp_reconnect、mcp_toggle、权限模式覆盖、mcp_read_resource）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nkdv7dw8.js (53)
 * attribution: placement 53
 */
import { CJt, Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { identityEpoch } from "../../services/mcp/identityChange.js";
import { CCs } from "../../services/mcp/mcpReconnect.js";
import { isRemoteMcpTransport } from "../../services/mcp/discoveryIdentity.js";
import { getMcpPrefix, isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { OPERATOR_SUPPLIED_IGNORED_TEXT } from "../../services/mcp/mcpConfigProvenance.js";
import { BLOCKED_BY_POLICY_REASON, hbn, gnr, r1 } from "../../services/mcp/redactMcpErrors.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isPrototypeKey } from "../../schemas/hookEntryValidation.js";
import {
  reservedServerNameMessage,
  emptyServerMap,
  mcpDialBlockCause,
  isMcpServerDisabled,
  setMcpServerEnabled,
  redactManagedMcpServerConfig,
  MCP_SETTINGS_SCOPE_SET,
  Kgt,
} from "../../services/mcp/config.js";
import { isFromBuiltinMarketplace } from "../../utils/plugins/pluginIdentifier.js";
import {
  WireSafeControlError,
  getErrnoCode,
  sanitizeErrorName,
  errorMessage,
  isFsInaccessible,
} from "../../utils/errors.js";
import { isClaudeInChromeMCPServer } from "../../utils/claudeInChrome/common.js";
import {
  mcpRefusalText,
  notApprovedText,
  disabledEnableBeforeText,
} from "../../services/mcp/mcpToggleMessages.js";
import { $Ae } from "../../services/mcp/officialPluginPromptOverrides.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { R7 } from "../../remote/wireFrameShape.js";
import { gNn } from "./rateLimitForwarding.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { Pz } from "../../services/queuedNotifications/queuedNotifications.js";
import { logForDebugging } from "../../utils/debug.js";
import { IM } from "../../services/mcp/mcpAccountKey.js";
import { flushDiscoveryCache } from "../../services/mcp/discoveryCache.js";
import { zj } from "../../../vendor/lodash-es/reject.js";
import { commandBelongsToServer, filterToolsByServer } from "../../services/mcp/utils.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { minimalStatuses, isBridgeOrTransport, mayTransportPersist } from "../transportState.js";
import { getVersionReport } from "../earlyArgs.js";
import { stripInitializeAgentPaths } from "../../bridge/controlRequests.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { collectContextData } from "../../commands/context/context-noninteractive.js";
import { toSdkModelInfos, mcpAuthErrorCode } from "../../entrypoints/sdk/coreSchemas.js";
import { buildModelPickerOptions } from "../../utils/model/modelOptions.js";
import { Yn } from "../../utils/stripAnsi.js";
import { formatTotalCost } from "../../cost-tracker.js";
import { Awt } from "../../outputStyles/loadOutputStylesDir.js";
import { clearOutputStylesCache, getAllOutputStylesCached } from "../../constants/outputStyles.js";
import { gl } from "../../utils/cwd.js";
import { projectModelScopedUsage } from "../../services/api/usage.js";
import { effortBelowMaxSaved } from "../../services/usageInsights/recommendations.js";
import { resolveEffortLevel } from "../../utils/effort.js";
import { isCcrInjectedMcpUrl, ccrPathPrefixIndex } from "../../services/mcp/ccrMcpUrls.js";
import { isClaudeAiProxyServer } from "../../components/mcp/MCPListPanel.js";
import { mcpServerSource } from "../../services/mcp/fileReference/fileReferencePolicy.js";
import { describeMcpServerOrigin } from "../../services/mcp/mcpServerOrigin.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { hasExperimentalCapability } from "../../services/mcp/channelPermissions.js";
import { isChannelsEnabled, isChannelAllowlisted } from "../../services/mcp/channelAllowlist.js";
import {
  parsePermissionMode,
  UNRECOGNIZED_PERMISSION_MODE_ERROR,
  MCP_ASK_FOR_TOOLS_MAX,
  MCP_ASK_FOR_TOOLS_NAME,
} from "../../types/permissions.js";
import { parseMcpModeOverride } from "../../utils/permissions/browserToolNames.js";
import {
  isAutoModeGateEnabled,
  getAutoModeUnavailableReason,
  getAutoModeUnavailableNotification,
} from "../../utils/permissions/permissionSetup.js";
import { getOwn } from "../../utils/objectSafety.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { judgeGate } from "../../services/analytics/growthbookGates.js";
import { hostedDesktopRefusal, readMcpResource } from "../../services/mcp/mcpWireUtils.js";
import { fromEnum, lit, fromNumber } from "../../services/analytics/safeMetadata.js";
import { getConnectionTimeoutMs } from "../../services/mcp/client.js";
import { rY } from "../../services/mcp/mcpResultErrors.js";
import { stripAnthropicMeta } from "../../services/mcp/anthropicMeta.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logPrefetchOutcome, prefetchInboundAttachments } from "../../bridge/inboundAttachments.js";
import { Vt } from "../../utils/agentId.js";
import { getSessionId } from "../../bootstrap/state.js";
import {
  getMaterializedSessionFile,
  saveAiGeneratedTitle,
  getCurrentSessionDisplayTitle,
  cacheAiTitle,
} from "../../utils/sessionStorage.js";
import {
  requestSessionTitle,
  nextTitleFallback,
  syncTitleToRemoteSession,
} from "../../utils/sessionTitle.js";
import { sanitizeSessionTitle } from "../../utils/stringUtils.js";
import { Ne } from "./sessionControlRequests.js";
import { getSdkHostedBridgeHandle } from "../../bridge/replBridgeHandle.js";

//@ chunk-nkdv7dw8.js:3284-3371 placement
function Yt(e, n) {
  return ((n = typeof n == "function" ? n : void 0), e && e.length ? CJt(e, void 0, n) : []);
}
//@ chunk-nkdv7dw8.js:3371-3381 placement
var Qe = Yt;
//@ chunk-nkdv7dw8.js:3381-3419 placement
var $e = require("./chunk-vtyyqz9q.js");
//@ chunk-nkdv7dw8.js:3419-3488 placement
function X() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-nkdv7dw8.js:3488-3584 placement
function Pe(e) {
  return e.type === "failed" ? (e.error ?? "Connection failed") : `Server status: ${e.type}`;
}
/**
 * 汇总 MCP 服务器状态供 mcp_status 返回。
 */
//@ chunk-nkdv7dw8.js:3584-5072 placement
function buildMcpStatusList(e, n, o) {
  let s = new Map(n.clients.map((client) => [client.name, client])),
    r = new Map((o ?? []).map((w) => [w.name, w])),
    u = new Set(n.names),
    S = identityEpoch(),
    y = new Set(),
    C = new Map(),
    E = new Set(),
    D = new Set(),
    x = (w, P) => {
      let G = r.get(w.name);
      if (!G) {
        D.add(w.name);
        return;
      }
      if (G !== P && G.type !== "pending" && X().areMcpConfigsEqual(G.config, w.config))
        return (E.add(w.name), G);
      return w;
    },
    flattened = e.clients.flatMap((client) => {
      if (client.type !== "pending") return [client];
      let P = s.get(client.name);
      if (!P) {
        if (!u.has(client.name) || o === void 0) return [client];
        return x(client, void 0) ?? [];
      }
      if (!X().areMcpConfigsEqual(client.config, P.config)) return [client];
      if (o !== void 0 && r.get(client.name) === P) {
        y.add(client.name);
        let G = CCs(P);
        if (G !== void 0) C.set(client.name, G);
        return [P];
      }
      if (n.dialEpochs[client.name] !== S && isRemoteMcpTransport(client.config))
        return o === void 0 ? [client] : (x(client, P) ?? []);
      if (o === void 0) return (y.add(client.name), [P]);
      return x(client, P) ?? [];
    });
  if (y.size === 0 && E.size === 0 && D.size === 0) return e;
  let mapped = [...y].map((w) => [w, getMcpPrefix(w)]),
    mapped_2 = n.clients.map((client) => [client.name, getMcpPrefix(client.name)]),
    B = (w, P) => P.some(([G, oe]) => isToolFromMcpServer(w, G, oe)),
    mapped_3 = [...D].map((w) => [w, getMcpPrefix(w)]),
    mapped_4 = [...C.keys()].map((w) => [w, getMcpPrefix(w)]),
    U = (w) => mapped_4.find(([P, G]) => isToolFromMcpServer(w, P, G))?.[0],
    z = new Map();
  for (let tool of n.tools) {
    let P = U(tool);
    if (P !== void 0) z.set(P, (z.get(P) ?? new Set()).add(tool.name));
  }
  let J = new Set(),
    flattened_2 = n.tools.flatMap((tool) => {
      let P = U(tool);
      if (P !== void 0) {
        if (J.has(P)) return [];
        J.add(P);
        let G = z.get(P);
        return (C.get(P) ?? []).filter((oe) => G?.has(oe.name));
      }
      return B(tool, mapped) || (y.size > 0 && !B(tool, mapped_2)) ? [tool] : [];
    }),
    flattened_3 = [...C].flatMap(([w, P]) => P.filter((G) => !z.get(w)?.has(G.name)));
  return {
    ...e,
    clients: flattened,
    tools: Ji([...e.tools.filter((tool) => !B(tool, mapped_3)), ...flattened_2, ...flattened_3], "name"),
  };
}
/**
 * 推送的 MCP 服务器被忽略/不接纳的原因文本。
 */
//@ chunk-nkdv7dw8.js:5072-7153 placement
var BUILTIN_SERVER_IGNORED_REASON = "Builtin server is CLI-owned; ignored",
  zNn = "Blocked by enterprise policy (allowedMcpServers/deniedMcpServers)",
  et = "Ignored in hermetic mode (not declared in user config)",
  ze =
    "Ignored: an enterprise MCP config (managed-mcp.json) is present and has exclusive control over MCP servers",
  Fe = "Ignored: managed setting disableSideloadFlags forbids server-delivered MCP servers on this machine",
  tt =
    "Ignored in a Remote Control session: MCP servers are loaded only from the verified startup config on this machine",
  nt = "Ignored: IDE transports are registered by the CLI itself, not mcp_set_servers",
  Xt =
    "Not admitted: a pushed server must be an http server on this session's MCP proxy route, with a URL of at most 4,096 characters (a non-ASCII character counts as its percent-encoded bytes)",
  Zt =
    "Not admitted: this name is reserved for a first-party server, and this entry cannot be added after session start",
  Jt =
    "Not connected: this worker could not take all of this server's per-tool limits; the next worker that the session moves to reads the entry again",
  en =
    "Not connected: this worker's start did not take this server, so the worker takes no push of it; the next worker that the session moves to reads the entry again",
  tn = "Change to a running server is applied at the next re-dispatch",
  nn =
    "Not applied: this session applies no per-tool permission_policy to a client-hosted MCP server, so no always_ask or always_deny in this entry takes effect; the server is otherwise unchanged",
  on = "Not applied: in this session, servers are turned on or off by changing the session's server set",
  rn =
    "The session's tool container did not confirm the change, so the server may be on or off. Check its status before trying again",
  sn =
    "Saved. The server stays off for now and will be connected the next time this session starts after being idle. There is nothing more to do",
  Ve = new Set([
    BUILTIN_SERVER_IGNORED_REASON,
    OPERATOR_SUPPLIED_IGNORED_TEXT,
    zNn,
    et,
    ze,
    Fe,
    tt,
    nt,
    Xt,
    Zt,
    Jt,
    en,
    tn,
    nn,
    on,
    rn,
    sn,
    BLOCKED_BY_POLICY_REASON,
    hbn,
    gnr,
  ]),
  an = new Set([
    "synced-file staging not supported on this runner kind",
    "CLAUDE_CODE_REMOTE_SESSION_ID unset",
    "list returned incomplete credential",
  ]);
/**
 * MCP 资源请求错误文字的白名单校验：只放行固定集合或符合 gated/failed/truncated/stalled 格式的文字，其他返回 undefined。
 */
//@ chunk-nkdv7dw8.js:7153-7450 placement
function sanitizeMcpResourceError(e) {
  if (an.has(e)) return e;
  if (
    /^(list|read) gated: [a-z-]{2,32}$/.test(e) ||
    /^(list|read|write|mkdir) failed: (http \d{3}|[A-Za-z_-]{2,24}|-?\d{1,5})$/.test(e) ||
    /^read truncated: got \d{1,16} of \d{1,16} bytes$/.test(e) ||
    /^read stalled: no bytes for \d{1,16}ms$/.test(e)
  )
    return e;
  return;
}
//@ chunk-nkdv7dw8.js:7450-7613 placement
function allowlistedStatusText(e) {
  if (e.match(/^Server status: ([a-z][a-z-]{0,31})$/) !== null) return e;
  if (e.match(/^Server not found: ([A-Za-z0-9 _.-]{1,64})$/) !== null) return e;
  return;
}
//@ chunk-nkdv7dw8.js:7613-7684 placement
var uCs = "mcp_set_servers: servers must be an object of config objects";
/**
 * 生成可上报的 MCP 服务器状态表：需要脱敏时清洗服务器名（重名加 #n），状态文本只保留白名单内的形状，否则记为 "connection failed"。
 */
//@ chunk-nkdv7dw8.js:7684-7945 placement
function sanitizeMcpStatusMap(e, n) {
  let o = e,
    create = Object.create(null);
  for (let [r, u] of Object.entries(n)) {
    let S = o ? sanitizeTelemetryString(r) : r;
    if (o && Object.hasOwn(create, S)) {
      let y = 2;
      while (Object.hasOwn(create, `${S}#${y}`)) y++;
      S = `${S}#${y}`;
    }
    create[S] =
      !e || Ve.has(u) || (isPrototypeKey(r) && u === reservedServerNameMessage(r))
        ? u
        : (allowlistedStatusText(u) ?? "connection failed");
  }
  return create;
}
//@ chunk-nkdv7dw8.js:7945-7997 placement
var Xe = "not dialed: a newer server set replaced it";
/**
 * 按范围筛选 MCP 服务器配置：严格配置模式返回空；configured 范围全部保留，否则只留内置市场来的服务器。
 */
//@ chunk-nkdv7dw8.js:7997-8143 placement
function filterServersForScope(e, { scope: scope, strictMcpConfig: strictMcpConfig }) {
  let s = emptyServerMap();
  if (strictMcpConfig) return s;
  for (let [r, u] of Object.entries(e)) if (scope === "configured" || isFromBuiltinMarketplace(u)) s[r] = u;
  return s;
}
//@ chunk-nkdv7dw8.js:8143-8230 placement
function mCs(e) {
  let n = emptyServerMap();
  for (let [o, s] of Object.entries(e)) if (!isFromBuiltinMarketplace(s)) n[o] = s;
  return n;
}
//@ chunk-nkdv7dw8.js:21884-21956 placement
var ln = require("./chunk-1d5behve.js"),
  pn = require("./chunk-1cnesc1e.js");
//@ chunk-nkdv7dw8.js:21956-22026 placement
function De() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-nkdv7dw8.js:22026-23645 placement
var handleMcpReconnect = (e, n) => {
    let o = ut(n);
    o.resolveDeferredPluginStartup();
    let { serverName: serverName } = e;
    if (typeof serverName !== "string")
      throw new WireSafeControlError("mcp_reconnect: serverName must be a string");
    let pendingManualExchange = o.pendingManualExchange(serverName);
    if (pendingManualExchange) return un(pendingManualExchange, n, o, serverName);
    return toggleMcpServer(n, o, serverName);
  },
  pt = (e, n) => {
    let o = ut(n);
    o.resolveDeferredPluginStartup();
    let engineState = n.engineState(),
      { serverName: serverName, enabled: enabled } = e;
    if (typeof serverName !== "string")
      throw new WireSafeControlError("mcp_toggle: serverName must be a string");
    if (typeof enabled !== "boolean") throw new WireSafeControlError("mcp_toggle: enabled must be a boolean");
    if (isClaudeInChromeMCPServer(serverName) && ln?.getTeleportRelayEnvConfig())
      pn?.noteChromeSwitch(enabled);
    let S =
        engineState.mcp.clients.find((client) => client.name === serverName) ??
        o.dynamicClients().find((h) => h.name === serverName),
      y = isUnadoptedSdkServer(o, engineState, serverName),
      C = y
        ? o.registeredSdkServer(serverName)
        : (o.ownerConfig(serverName) ??
          o.sdkClients().find((h) => h.name === serverName)?.config ??
          (enabled ? null : (S?.config ?? null))),
      E = C ? mcpDialBlockCause(serverName, C) : null;
    if (!C) {
      if (enabled && isClaudeInChromeMCPServer(serverName)) Ue(n, o, serverName, !0);
      throw new WireSafeControlError(`Server not found: ${sanitizeTelemetryString(serverName)}`);
    }
    if (!enabled)
      return y ? disableSdkServerControl(n, o, serverName, C) : fn(n, o, serverName, C, engineState);
    if (E)
      throw new WireSafeControlError(
        E === "managed-policy"
          ? mcpRefusalText(
              serverName,
              E,
              C,
              `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
            )
          : notApprovedText(serverName, "enabling"),
      );
    let filtered = [...engineState.mcp.clients, ...o.dynamicClients(), ...o.sdkClients()].filter(
        (h) => h.name === serverName,
      ),
      x =
        C.type !== "sdk" &&
        !isMcpServerDisabled(serverName) &&
        o.pendingManualExchange(serverName) === void 0 &&
        !o.postOAuthReconnectPending.has(serverName) &&
        filtered.length > 0 &&
        filtered.every(
          (h) =>
            h.type === "connected" &&
            !$Ae(h) &&
            (h.transportErrorState?.consecutiveErrors ?? 0) === 0 &&
            h.toolsListError === void 0 &&
            !h.discoveryBearerRejected &&
            !h.discoveryAuthFailure &&
            !h.capabilities?.prompts &&
            !h.capabilities?.resources &&
            De().areMcpConfigsEqual(h.config, C),
        );
    if ((Ue(n, o, serverName, !0), y)) return enableSdkServerControl(n, o, serverName, C);
    if (x) {
      logForDiagnosticsNoPII("info", "cli_mcp_toggle_unchanged");
      return;
    }
    return reconnectServerForControl(n, o, serverName, C, !1);
  };
/**
 * 判断 SDK 注册的 MCP 服务器是否尚未被接管：不是 Chrome 服务器、有 SDK 注册、无归属配置，且不在当前客户端或动态客户端中。
 */
//@ chunk-nkdv7dw8.js:23645-23816 placement
function isUnadoptedSdkServer(e, n, o) {
  return (
    !isClaudeInChromeMCPServer(o) &&
    e.registeredSdkServer(o) !== null &&
    e.ownerConfig(o) === null &&
    !n.mcp.clients.some((client) => client.name === o) &&
    !e.dynamicClients().some((s) => s.name === o)
  );
}
//@ chunk-nkdv7dw8.js:23816-23901 placement
function ut(e) {
  if (e.mcpControlLanes === null) throw new WireSafeControlError(R7);
  return e.mcpControlLanes;
}
//@ chunk-nkdv7dw8.js:23901-23962 placement
function Ue(e, n, o, s) {
  (setMcpServerEnabled(o, s, e.storageV5), n.switchSaved(o, s));
}
//@ chunk-nkdv7dw8.js:23962-24028 placement
async function un(e, n, o, s) {
  return (await e.catch(() => {}), toggleMcpServer(n, o, s));
}
//@ chunk-nkdv7dw8.js:24028-24596 placement
function toggleMcpServer(e, n, o) {
  let engineState = e.engineState(),
    r = n.ownerConfig(o) ?? n.sdkClients().find((C) => C.name === o)?.config ?? null,
    u = r ? mcpDialBlockCause(o, r) : null;
  if (!r) throw new WireSafeControlError(`Server not found: ${sanitizeTelemetryString(o)}`);
  if (u === "managed-policy")
    throw new WireSafeControlError(
      mcpRefusalText(
        o,
        u,
        r,
        `MCP server ${sanitizeTelemetryString(o)} is blocked by enterprise managed policy`,
      ),
    );
  if (isMcpServerDisabled(o)) throw new WireSafeControlError(disabledEnableBeforeText(o, "reconnecting"));
  if (u) throw new WireSafeControlError(notApprovedText(o, "reconnecting"));
  let S =
      engineState.mcp.clients.find((client) => client.name === o) ??
      n.dynamicClients().find((C) => C.name === o),
    y = !gNn(n.postOAuthReconnectPending, o) && S !== void 0 && S.type !== "cached" && S.type !== "pending";
  return reconnectServerForControl(e, n, o, r, y);
}
//@ chunk-nkdv7dw8.js:24596-24791 placement
async function reconnectServerForControl(e, n, o, s, r) {
  n.seedControlDialSlot(o, s);
  let reconnectForControlRequest = await n.reconnectForControlRequest(o, s, { distrust: r }),
    S = En(n.ownerConfig(o), s);
  Ae(
    e,
    reconnectMcpServer(
      e,
      n.landControlResult(o, S ? { ...reconnectForControlRequest, asked: !0 } : reconnectForControlRequest),
    ),
  );
}
//@ chunk-nkdv7dw8.js:24791-24888 placement
function Ae(e, n) {
  if (e.replyNow !== null) e.replyNow(n);
  if (n.subtype === "error") throw new Pz(n.error);
}
//@ chunk-nkdv7dw8.js:24888-25250 placement
function reconnectMcpServer(e, n) {
  if (n.type === "connected") return { subtype: "success" };
  if (n.type === "failed") {
    if (e.redactsPersistedLane())
      logForDebugging(`mcp reconnect/toggle failed: ${n.error ?? "(no detail)"}`, { level: "error" });
    let o = n.error ?? "Connection failed";
    return {
      subtype: "error",
      error: Ve.has(o)
        ? o
        : (allowlistedStatusText(o) ?? (e.redactsPersistedLane() ? "Connection failed" : o)),
    };
  }
  return { subtype: "error", error: Pe(n) };
}
//@ chunk-nkdv7dw8.js:25250-25308 placement
function fn(e, n, o, s, r) {
  return (Ue(e, n, o, !1), reconnectMcpServerByName(e, n, o, s, r));
}
/**
 * 处理 mcp_reconnect：找到同名的启动/SDK/动态/已连接客户端，清除已连接实例（按配置去重）的服务器缓存，再重连并回复。
 */
//@ chunk-nkdv7dw8.js:25308-25697 placement
function reconnectMcpServerByName(e, n, o, s, r, u) {
  let filtered = [...n.startupClients(), ...n.sdkClients(), ...n.dynamicClients(), ...r.mcp.clients].filter(
      (C) => C.name === o,
    ),
    filtered_2 = filtered.filter((C) => C.type === "connected");
  if (filtered_2.length > 0) {
    let C = De();
    return Qe([s, ...filtered_2.map((E) => E.config)], C.areMcpConfigsEqual)
      .reduce((E, D) => E.then(() => C.clearServerCache(o, D)), Promise.resolve())
      .then(() => finishMcpReconnect(e, n, o, s, filtered_2.at(-1), u));
  }
  return finishMcpReconnect(e, n, o, s, filtered[0], u);
}
//@ chunk-nkdv7dw8.js:25697-25802 placement
async function disableSdkServerControl(e, n, o, s) {
  (Ue(e, n, o, !1), await n.disableSdkServer(o), markServerDisabled(e, n, o), Ae(e, { subtype: "success" }));
}
//@ chunk-nkdv7dw8.js:25802-25944 placement
async function enableSdkServerControl(e, n, o, s) {
  let enableSdkServer = await n.enableSdkServer(o);
  Ae(
    e,
    reconnectMcpServer(
      e,
      enableSdkServer ?? {
        name: o,
        type: "failed",
        config: s,
        error: `Server not found: ${sanitizeTelemetryString(o)}`,
      },
    ),
  );
}
/**
 * MCP 重连控制请求的收尾：仍有效时找到该服务器的当前客户端；若是缓存/新连接则先刷新其工具再回复成功，否则直接清理并回复成功。
 */
//@ chunk-nkdv7dw8.js:25944-26281 placement
function finishMcpReconnect(e, n, o, s, r, u = () => !0) {
  if (!u()) return;
  let S =
    e.engineState().mcp.clients.find((client) => client.name === o) ??
    n.dynamicClients().find((C) => C.name === o) ??
    r;
  if (S?.type === "cached" || (S?.type === "connected" && S !== r) || IM())
    return dropServerCaches(o, S?.config ?? s, S, r).then(() => {
      if (!u()) return;
      (markServerDisabled(e, n, o), Ae(e, { subtype: "success" }));
    });
  (markServerDisabled(e, n, o), Ae(e, { subtype: "success" }));
}
//@ chunk-nkdv7dw8.js:26281-26511 placement
async function dropServerCaches(e, n, o, s) {
  if (o?.type === "cached") De().disposeServerConnectionDetached(e, o.config);
  else if (o?.type === "connected" && o !== s) await De().clearServerCache(e, o.config);
  if (!IM()) return;
  await flushDiscoveryCache(De().dropDiscoveryEntry(e, n));
}
/**
 * 把 MCP 服务器在引擎状态中标为 disabled：客户端条目改为 disabled，并移除其工具、命令、资源与资源模板。
 */
//@ chunk-nkdv7dw8.js:26511-26865 placement
function markServerDisabled(e, n, o) {
  n.markDynamicServerDisabled(o);
  let s = getMcpPrefix(o);
  e.setEngineState((r) => ({
    ...r,
    mcp: {
      ...r.mcp,
      clients: r.mcp.clients.map((client) =>
        client.name === o ? { name: o, type: "disabled", config: client.config } : client,
      ),
      tools: zj(r.mcp.tools, (u) => isToolFromMcpServer(u, o, s)),
      commands: zj(r.mcp.commands, (u) => commandBelongsToServer(u, o)),
      resources: omitKeys(r.mcp.resources, o),
      resourceTemplates: omitKeys(r.mcp.resourceTemplates, o),
    },
  }));
}
//@ chunk-nkdv7dw8.js:26865-26900 placement
var St = (e, n) => ({ mcpServers: mcpStatusForReply(n) });
//@ chunk-nkdv7dw8.js:26900-27000 placement
function mcpStatusForReply(e) {
  return e.redactsPersistedLane()
    ? minimalStatuses(describeMcpServerForStatus(e.mcpConnections()))
    : describeMcpServerForStatus(e.mcpConnections());
}
//@ chunk-nkdv7dw8.js:27000-27281 placement
var handleGetBinaryVersion = () => getVersionReport(),
  Ct = async (e, n) => {
    if (e.detail != null && e.detail !== "summary" && e.detail !== "full")
      throw new WireSafeControlError("get_context_usage: detail must be 'summary' or 'full'");
    let o = await collectContextUsage(n, e.detail, We(n));
    return {
      ...o,
      memoryFiles: n.redactsPersistedLane() ? [] : o.memoryFiles,
      ...(!We(n) && stripInitializeAgentPaths(o)),
    };
  };
//@ chunk-nkdv7dw8.js:27281-27566 placement
function collectContextUsage(e, n, o) {
  let {
    messages: messages,
    mainLoopModel: mainLoopModel = getMainLoopModel(),
    ...u
  } = e.contextUsageInputs();
  return collectContextData({
    session: e.session,
    messages: messages,
    getAppState: e.engineState,
    getMcp: () => e.engineState().mcp,
    storageV5: e.storageV5,
    credentials: e.credentials,
    options: { mainLoopModel: mainLoopModel, ...u },
    detail: n,
    localPaths: o,
  });
}
//@ chunk-nkdv7dw8.js:27566-28256 placement
var handleListModels = () => ({ models: toSdkModelInfos(buildModelPickerOptions()) }),
  _t = () => ({ text: Yn(formatTotalCost()) }),
  wt = async (e, n) => {
    (Awt(), clearOutputStylesCache());
    let o = await getAllOutputStylesCached(gl(), n.storageV5);
    return { available_output_styles: Object.keys(o) };
  },
  vt = async (e, n) => {
    if (e.skip_behaviors != null && typeof e.skip_behaviors !== "boolean")
      throw new WireSafeControlError("get_usage: skip_behaviors must be a boolean");
    let o = await projectModelScopedUsage({
        storageV5: n.storageV5,
        credentials: n.credentials,
        live: effortBelowMaxSaved(
          getMainLoopModel(),
          resolveEffortLevel(n.engineState()),
          n.engineState().ultracode,
        ),
        includeBehaviors: !n.redactsPersistedLane() && e.skip_behaviors !== !0,
      }),
      s = We(n);
    if (!o.behaviors || (s && !isBridgeOrTransport(n.session))) return o;
    let r = { fix: void 0, ...(!s && { recommendations: void 0 }) },
      { day: day, week: week } = o.behaviors;
    return { ...o, behaviors: { day: { ...day, ...r }, week: { ...week, ...r } } };
  };
//@ chunk-nkdv7dw8.js:28256-29878 placement
function describeMcpServerForStatus({ connections: connections, tools: tools }) {
  let o = Ji(tools, "name");
  return connections
    .filter((r) => !r1(r))
    .map((r) => {
      let u = isCcrInjectedMcpUrl(r.name, r.config) || isClaudeAiProxyServer(r.config),
        S = mcpServerSource(r.name, r.config),
        y,
        C,
        E = !1;
      if (r.config.type === "sse" || r.config.type === "http") {
        let parse = URL.parse(r.config.url);
        if (
          ((E = u && S === "dynamic" && parse !== null && ccrPathPrefixIndex(parse)),
          (y = redactManagedMcpServerConfig(
            { type: r.config.type, url: r.config.url, headers: r.config.headers, oauth: r.config.oauth },
            r.config.scope,
          )),
          !u && MCP_SETTINGS_SCOPE_SET.has(r.config.scope))
        ) {
          let L = describeMcpServerOrigin(r.name, r.config, { detail: "origin" });
          try {
            C = L === void 0 || L.includes("${") ? void 0 : new URL(L).host || void 0;
          } catch {
            C = void 0;
          }
        }
      } else if (r.config.type === "claudeai-proxy")
        y = { type: "claudeai-proxy", url: r.config.url, id: r.config.id };
      else if (r.config.type === "stdio" || r.config.type === void 0)
        y = { type: "stdio", command: r.config.command, args: r.config.args };
      let D = isConnectedOrCached(r)
          ? filterToolsByServer(o, r.name).map((h) => ({
              name: h.mcpInfo?.toolName ?? h.name,
              annotations: {
                readOnly: h.isReadOnly({}) || void 0,
                destructive: h.isDestructive?.({}) || void 0,
                openWorld: h.isOpenWorld?.({}) || void 0,
              },
              ...(h.mcpInfo?.uiMeta && { _meta: h.mcpInfo.uiMeta }),
            }))
          : void 0,
        x;
      if (isConnectedOrCached(r) && r.capabilities.experimental) {
        let h = { ...r.capabilities.experimental };
        if (
          "claude/channel" in h &&
          (!hasExperimentalCapability(r.capabilities, "claude/channel") ||
            !isChannelsEnabled() ||
            !isChannelAllowlisted(r.config.pluginSource) ||
            (r.type === "connected" && r.protocolEra === "modern"))
        )
          delete h["claude/channel"];
        if (Object.keys(h).length > 0) x = { experimental: h };
      }
      return {
        name: r.name,
        status: Kgt(r.type),
        serverInfo: isConnectedOrCached(r) ? r.serverInfo : void 0,
        error: r.type === "failed" ? r.error : void 0,
        error_code: mcpAuthErrorCode(r),
        config: y,
        transport: r.config.type ?? "stdio",
        ...(u ? { sessionProxied: u, ...(E && { cloudServiceProvided: E }) } : C && { urlHost: C }),
        scope: r.config.scope,
        source: S,
        tools: D,
        capabilities: x,
      };
    });
}
//@ chunk-nkdv7dw8.js:29878-29942 placement
function We(e) {
  return !e.redactsPersistedLane() && !mayTransportPersist(e.session);
}
//@ chunk-nkdv7dw8.js:29942-30609 placement
function handleSetMcpPermissionModeOverride(e) {
  let { serverName: serverName, mode: mode } = e;
  if (typeof serverName !== "string")
    throw new WireSafeControlError("set_mcp_permission_mode_override: serverName must be a string");
  let s = mode === null ? null : parsePermissionMode(mode);
  if (s === void 0) throw new WireSafeControlError(UNRECOGNIZED_PERMISSION_MODE_ERROR);
  let r = parseMcpModeOverride(s);
  if (!r.ok)
    throw (
      logForDebugging(
        `set_mcp_permission_mode_override: rejected mode='${r.rejected}' for ${sanitizeTelemetryString(serverName)} (tighten-only)`,
        { level: "warn" },
      ),
      new WireSafeControlError(
        `Permission mode override over the control channel is tighten-only ('default', 'auto', or null); rejected '${r.rejected}'`,
      )
    );
  if (r.override === "auto" && !isAutoModeGateEnabled()) {
    let u = getAutoModeUnavailableReason();
    throw new WireSafeControlError(
      u
        ? `Cannot pin MCP server '${sanitizeTelemetryString(serverName)}' to auto: ${getAutoModeUnavailableNotification(u)}`
        : `Cannot pin MCP server '${sanitizeTelemetryString(serverName)}' to auto`,
    );
  }
  return { serverName: serverName, override: r.override };
}
//@ chunk-nkdv7dw8.js:30609-30771 placement
var ASK_FOR_TOOLS_INVALID_MESSAGE = `set_mcp_permission_mode_override: askForTools must be a list of at most ${MCP_ASK_FOR_TOOLS_MAX} {name} entries, each name 1 to 64 letters, digits, underscores or hyphens`;
/**
 * 校验 set_mcp_permission_mode_override 的 askForTools：至多上限个 {name}、名字合法，去掉服务器前缀后去重返回，空则 undefined；不合法抛 WireSafeControlError。
 */
//@ chunk-nkdv7dw8.js:30771-31143 placement
function parseAskForTools(e, n) {
  let askForTools = e.askForTools;
  if (askForTools === void 0 || askForTools === null) return;
  if (!Array.isArray(askForTools) || askForTools.length > MCP_ASK_FOR_TOOLS_MAX)
    throw new WireSafeControlError(ASK_FOR_TOOLS_INVALID_MESSAGE);
  let s = getMcpPrefix(n),
    r = new Set();
  for (let u of askForTools) {
    let S = typeof u === "object" && u !== null && !Array.isArray(u) ? u.name : void 0;
    if (typeof S !== "string" || !MCP_ASK_FOR_TOOLS_NAME.test(S))
      throw new WireSafeControlError(ASK_FOR_TOOLS_INVALID_MESSAGE);
    let y = S.startsWith(s) ? S.slice(s.length) : S;
    if (y !== "") r.add(y);
  }
  return r.size > 0 ? [...r] : void 0;
}
//@ chunk-nkdv7dw8.js:31143-31938 placement
var clearUnknownServerOverride = (e, n) => {
  let { serverName: serverName, override: override } = handleSetMcpPermissionModeOverride(e),
    r = parseAskForTools(e, serverName),
    u = override === "default" ? r : void 0,
    S = !1;
  if (
    (n.setEngineState((y) => {
      let mcpPermissionModeOverrides = y.toolPermissionContext.mcpPermissionModeOverrides,
        E = y.toolPermissionContext.mcpAskForTools ?? {};
      if (
        ((S = Object.hasOwn(mcpPermissionModeOverrides, serverName)),
        (S ? mcpPermissionModeOverrides[serverName] === override : override === void 0) &&
          En(getOwn(E, serverName), u))
      )
        return y;
      let D = u === void 0 ? omitKeys(E, serverName) : { ...E, [serverName]: u };
      return {
        ...y,
        toolPermissionContext: {
          ...y.toolPermissionContext,
          mcpPermissionModeOverrides:
            override === void 0
              ? omitKeys(mcpPermissionModeOverrides, serverName)
              : { ...mcpPermissionModeOverrides, [serverName]: override },
          mcpAskForTools: D,
        },
      };
    }),
    n.isKnownMcpServer(serverName))
  )
    return;
  return {
    warning:
      override === void 0
        ? S
          ? `MCP server '${sanitizeTelemetryString(serverName)}' is not known; its stored override was cleared.`
          : `MCP server '${sanitizeTelemetryString(serverName)}' is not known; no override was present to clear.`
        : `MCP server '${sanitizeTelemetryString(serverName)}' is not yet known; override stored but will not apply until a server with that exact name connects.`,
  };
};
//@ chunk-nkdv7dw8.js:31938-31966 placement
var VNn = 10485760,
  UI = "ui://";
//@ chunk-nkdv7dw8.js:31966-32018 placement
function bt() {
  return require("./chunk-asne9cp8.js");
}
//@ chunk-nkdv7dw8.js:32018-32076 placement
function te(e, n) {
  throw (logFeatureBad("mcp_read_resource", e), new WireSafeControlError(n));
}
//@ chunk-nkdv7dw8.js:32076-34360 placement
var handleMcpReadResource = async (e, n) => {
  if (n.redactsPersistedLane()) te("redacting_lane", "mcp_read_resource is not available on this connection");
  let { serverName: serverName, uri: uri } = e;
  if (typeof serverName !== "string") te("bad_request", "mcp_read_resource: serverName must be a string");
  if (typeof uri !== "string") te("bad_request", "mcp_read_resource: uri must be a string");
  if (!uri.startsWith(UI)) te("not_ui_uri", "mcp_read_resource: uri must use the ui:// scheme");
  let found = n.mcpConnections().connections.find((connection) => connection.name === serverName);
  if (!found) {
    if (n.isKnownMcpServer(serverName))
      te("not_connected", `MCP server ${sanitizeTelemetryString(serverName)} is not connected`);
    te("server_not_found", `Server not found: ${sanitizeTelemetryString(serverName)}`);
  }
  let u = mcpDialBlockCause(found.name, found.config);
  if (u === "managed-policy")
    te(
      judgeGate(serverName, found.config) ? "reserved_address" : "policy_blocked",
      mcpRefusalText(
        serverName,
        u,
        found.config,
        `MCP server ${sanitizeTelemetryString(serverName)} is blocked by enterprise managed policy`,
      ),
    );
  if (found.type === "disabled" || isMcpServerDisabled(found.name))
    te("disabled", disabledEnableBeforeText(serverName, "reading"));
  if (u) te("approval_required", notApprovedText(serverName, "reading"));
  if (!isConnectedOrCached(found))
    te(
      "not_connected",
      `MCP server ${sanitizeTelemetryString(serverName)} is not connected (status: ${Kgt(found.type)})`,
    );
  if (found.config.type === "sdk")
    te(
      "sdk_server",
      "mcp_read_resource does not support SDK MCP servers: the caller hosts them and can read them directly",
    );
  let S = hostedDesktopRefusal(found);
  if (S) te("hosted_desktop", S.message);
  let y = { transport: fromEnum(found.config.type ?? "stdio"), row_type: fromEnum(found.type) },
    now = Date.now(),
    E = lit("connect"),
    D;
  try {
    let ensureConnectedClient = await bt()
      .mcpClientModule()
      .ensureConnectedClient(found, { context: "mcp_read_resource" });
    ((E = lit("read")),
      (D = await readMcpResource(ensureConnectedClient, uri, { timeout: getConnectionTimeoutMs() })));
  } catch (error) {
    let L = bt(),
      mcpErrorCode = L.mcpSdkErrorClassificationModule().getMcpErrorCode(error),
      B = getErrnoCode(error);
    throw (
      logFeatureBad("mcp_read_resource", "read_failed", {
        ...y,
        elapsed_ms: Date.now() - now,
        phase: E,
        error_source: fromEnum(rY(error)),
        ...(mcpErrorCode !== void 0 && { rpc_code: mcpErrorCode }),
        ...(B !== void 0 && { local_code: L.mcpClientModule().sanitizeConnectErrorCodeForTelemetry(B) }),
        ...(error instanceof Error &&
          "status" in error &&
          typeof error.status === "number" && { http_status: fromNumber(error.status) }),
      }),
      logForDebugging(
        `mcp_read_resource: resources/read on "${found.name}" failed (${sanitizeErrorName(error) ?? "unknown"})`,
        { level: "warn" },
      ),
      new Pz(sanitizeTelemetryString(`mcp_read_resource: ${errorMessage(error)}`))
    );
  }
  let mapped = D.contents.map((content) => ({
    uri: content.uri,
    mimeType: content.mimeType,
    text: "text" in content ? content.text : void 0,
    blob: "blob" in content ? content.blob : void 0,
    _meta: stripAnthropicMeta(content._meta),
  }));
  if (jsonStringify(mapped).length > VNn)
    te("too_large", `mcp_read_resource: the resource exceeds the ${VNn}-character limit`);
  return (logFeatureOk("mcp_read_resource", { ...y, elapsed_ms: Date.now() - now }), { contents: mapped });
};
//@ chunk-nkdv7dw8.js:34360-34374 placement
var Tt = () => {};
//@ chunk-nkdv7dw8.js:34374-35228 placement
var PREFETCH_MAX_FILES = 16,
  Ot =
    "prefetch_attachments: files must be a list of at most 16 { file_uuid: UUID, file_size?: number }, issued_at a number (epoch milliseconds), and only_these, if present, a boolean",
  Dt = (e, n) => {
    let { files: files, issued_at: issued_at, only_these: only_these } = e;
    if (
      !Array.isArray(files) ||
      files.length > PREFETCH_MAX_FILES ||
      typeof issued_at !== "number" ||
      (only_these !== void 0 && only_these !== null && typeof only_these !== "boolean")
    )
      throw (
        logFeatureSad("bridge_attachment_prefetch", "invalid_request"),
        logPrefetchOutcome("bridge_attachment_prefetch_invalid_request", {}),
        new Pz(Ot)
      );
    let u = [];
    for (let S of files) {
      let y = Vt(Et(S) ? S.file_uuid : void 0),
        C = Et(S) ? S.file_size : void 0;
      if (y === null || (C !== void 0 && typeof C !== "number"))
        throw (
          logFeatureSad("bridge_attachment_prefetch", "invalid_request"),
          logPrefetchOutcome("bridge_attachment_prefetch_invalid_request", {}),
          new Pz(Ot)
        );
      u.push(C === void 0 ? { file_uuid: y } : { file_uuid: y, file_size: C });
    }
    return {
      accepted: prefetchInboundAttachments(u, {
        issuedAt: issued_at,
        credentials: n.credentials,
        onlyThese: only_these === !0,
      }),
    };
  };
//@ chunk-nkdv7dw8.js:35228-35299 placement
function Et(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-nkdv7dw8.js:35299-35384 placement
function yCs(e) {
  return { latched: e, attempted: e, pending: void 0, fallback: void 0, owed: !1 };
}
//@ chunk-nkdv7dw8.js:35384-35428 placement
function _Cs(e, n) {
  ((e.latched = n), (e.attempted = n));
}
//@ chunk-nkdv7dw8.js:35428-36337 placement
function saveGeneratedTitle(e, n, o = n.turnAbortSignal()) {
  let { titles: titles } = n,
    r = getSessionId();
  if (titles.pending?.sessionId === r) return titles.pending.title;
  let u = getMaterializedSessionFile() !== null,
    S = { settled: !1, retracted: !1 },
    y = requestSessionTitle(e, o, n.credentials)
      .then((E) => {
        if (((S.settled = !0), S.retracted)) return null;
        let D = E;
        if (E.kind === "titled") {
          let L = sanitizeSessionTitle(E.title);
          D = L ? { kind: "titled", title: L } : { kind: "unusable" };
        }
        if (titles.fallback?.sessionId === r) {
          let L = nextTitleFallback(titles.fallback.fallback, D);
          titles.fallback = L ? { sessionId: r, fallback: L } : void 0;
        }
        if (D.kind !== "titled") return ((titles.attempted = titles.latched), null);
        titles.attempted = !0;
        let { title: title } = D,
          h = () => {
            try {
              saveAiGeneratedTitle(r, title, n.storageV5);
            } catch (error) {
              if (isFsInaccessible(error)) logForDebugging(`saveAiGeneratedTitle failed: ${error}`);
              else Ne(n, error);
            }
          };
        if (r !== getSessionId()) {
          if (u) h();
          return title;
        }
        if (!getCurrentSessionDisplayTitle(r)) {
          if (getMaterializedSessionFile()) h();
          else cacheAiTitle(title);
          (getSdkHostedBridgeHandle()?.adoptLocalAiTitle?.(), syncTitleToRemoteSession(title));
        }
        return title;
      })
      .catch((E) => ((S.settled = !0), (titles.attempted = titles.latched), Ne(n, E), null)),
    C = { sessionId: r, title: y, call: S };
  return (
    (titles.pending = C),
    y.then((E) => {
      if (E === null && titles.pending === C) titles.pending = void 0;
    }),
    y
  );
}

export {
  mCs,
  yCs,
  filterServersForScope,
  _Cs,
  sanitizeMcpResourceError,
  uCs,
  sanitizeMcpStatusMap,
  describeMcpServerForStatus,
  BUILTIN_SERVER_IGNORED_REASON,
  nt,
  zNn,
  et,
  ze,
  Fe,
  tt,
  $e,
  buildMcpStatusList,
  Xe,
  X,
  Pe,
  saveGeneratedTitle,
  St,
  Ct,
  vt,
  _t,
  handleListModels,
  handleGetBinaryVersion,
  wt,
  clearUnknownServerOverride,
  handleMcpReconnect,
  pt,
  handleMcpReadResource,
  Dt,
  Tt,
  isUnadoptedSdkServer,
  reconnectMcpServerByName,
  markServerDisabled,
  VNn,
};
