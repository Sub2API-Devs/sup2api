/**
 * services/mcp/mcpReconnect.ts
 *
 * 2.1.316 新增：MCP 身份（账号/组织）变化后重连受影响的服务器；带退避地重连单个 MCP 服务器（检查会话结束、配置变化）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fpvb8c85.js (21)
 * attribution: placement 21
 */
import {
  MCP_SETTINGS_SCOPE_SET,
  mcpDialBlockCause,
  isMcpServerDisabled,
  getMcpConfigByName,
  headlessSyncsClaudeAiConnectors,
  isJudgedOnClaudeAiConnectorList,
} from "./config.js";
import { filterCommandsByServer, commandBelongsToServer, Njt, Y2e } from "./utils.js";
import { getMcpPrefix, isToolFromMcpServer } from "./mcpStringUtils.js";
import { isPolicyBlockedFailure, mcpGateError } from "./mcpToggleMessages.js";
import { withConfigScope } from "./mcpToolDecoration.js";
import { applyMcpServerConfig } from "../../components/mcp/MCPListPanel.js";
import {
  withMcpConfig,
  setMcpClientInAppState,
  redecorateTools,
  sameServerTools,
  replaceServerTools,
  findChromeClient,
} from "./mcpClientState.js";
import { ir, refreshMcpServerTools } from "./client.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  R_t,
  isRemoteMcpTransport,
  hasRemoteMcpServers,
  identityChangedFailure,
} from "./discoveryIdentity.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { fd, isUnresolved } from "./mcpAccountKey.js";
import { deleteNeedsAuthCache, mcpAuthToolsFor } from "./needsAuthCache.js";
import { ht } from "./cliOwnedClients.js";
import { getMcpIdentitySnapshot, identityEpoch, isCurrentIdentityEpoch } from "./identityChange.js";
import { jW } from "../api/deferredToolsState.js";
import { zj } from "../../../vendor/lodash-es/reject.js";
import {
  fetchClaudeAiConnectors,
  retryRemoteMcpServers,
  trackTransientRetryPass,
} from "./connectionBatch.js";
import { errorMessage } from "../../utils/errors.js";
import { cCt, wfi, eae, ilr, WQo, Efi, REOPEN_REFETCH, BEFORE_HANDLER } from "./mcpCallConstants.js";
import { logMCPDebug } from "../../utils/log.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { addMcpOnClose } from "./mcpWireUtils.js";
import { $Ae } from "./officialPluginPromptOverrides.js";
import { sleep, fullJitterBackoffMs } from "../../utils/sleep.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isSameConnectedClient, S4n, tzs } from "./toolSchemaValidation.js";
import { logEvent } from "../analytics/index.js";
import { toolNameForTelemetry } from "../analytics/metadata.js";
import { lit } from "../analytics/safeMetadata.js";
import { toolsListAheadTelemetry } from "./toolsListAhead.js";

//@ chunk-fpvb8c85.js:1248-1317 placement
function Q() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
/**
 * 解析重连使用的服务器配置：显式给出的优先，非设置作用域的现有配置次之，否则调用回调查找。
 */
//@ chunk-fpvb8c85.js:1317-1427 placement
function resolveReconnectConfig(n, e, o, S) {
  if (Object.hasOwn(e, n)) return e[n];
  if (o && !MCP_SETTINGS_SCOPE_SET.has(o.scope)) return o;
  return S ? S(n) : (o ?? null);
}
/**
 * 在 MCP 状态中把服务器标记为禁用并移除其工具。
 */
//@ chunk-fpvb8c85.js:1427-1605 placement
function markServerDisabled(n, e) {
  if (!n.clients.some((client) => client.name === e)) return n;
  return {
    ...n,
    clients: n.clients.map((client) =>
      client.name === e ? { name: e, type: "disabled", config: client.config } : client,
    ),
    tools: filterCommandsByServer(n.tools, e),
  };
}
/**
 * 取出某服务器在 MCP 状态中的工具、命令、资源与资源模板。
 */
//@ chunk-fpvb8c85.js:1605-1787 placement
function serverItemsOf(n, e) {
  let o = getMcpPrefix(e);
  return {
    tools: n.tools.filter((tool) => isToolFromMcpServer(tool, e, o)),
    commands: n.commands.filter((command) => commandBelongsToServer(command, e)),
    resources: n.resources[e],
    resourceTemplates: n.resourceTemplates[e],
  };
}
/**
 * 计算重连结果应呈现的拒绝状态：托管策略拦截、用户禁用或其他拨号拦截原因。
 */
//@ chunk-fpvb8c85.js:1787-1995 placement
function refusalStateFor(n, e) {
  let o = e.type !== "failed" ? mcpDialBlockCause(n, e.config) : void 0;
  if (o === "managed-policy") return N(n, e.config, o);
  if (isMcpServerDisabled(n) && !isPolicyBlockedFailure(e))
    return { name: n, type: "disabled", config: e.config };
  return o ? N(n, e.config, o) : void 0;
}
//@ chunk-fpvb8c85.js:1995-2064 placement
function N(n, e, o) {
  return { name: n, type: "failed", config: e, ...mcpGateError(o, n, e) };
}
//@ chunk-fpvb8c85.js:2064-2160 placement
function oe(n, e) {
  return e.asked || n === void 0 || withConfigScope(e.client, n.config) === e.client
    ? e
    : applyMcpServerConfig(n.config, e);
}
/**
 * 合并重连结果与传入配置（拒绝时保留原客户端）。
 */
//@ chunk-fpvb8c85.js:2160-2487 placement
function mergeReconnectResult(n, e, o) {
  let { incoming: incoming, result: P, outcome: outcome } = o;
  if (outcome === "refused") {
    let M = incoming.asked ? P.client : withMcpConfig(P.client, e.config);
    return M === P.client ? P : { ...P, client: M };
  }
  if (withConfigScope(P.client, e.config) === P.client) return P;
  let C = oe(e, incoming);
  if (C.client.type === "disabled") return C;
  let _ = refusalStateFor(n, C.client);
  return _ ? { ...C, client: _, tools: [], commands: [] } : C;
}
/**
 * 把重连结果写入 AppState/动态 MCP 状态，旧连接关闭。
 */
//@ chunk-fpvb8c85.js:2487-3946 placement
function applyMcpReconnect(n, e, o) {
  let {
      getAppState: getAppState,
      setAppState: setAppState,
      getDynamicMcpState: getDynamicMcpState,
      setDynamicMcpState: setDynamicMcpState,
    } = n,
    _ = () => {
      if (o.client.type === "connected")
        Q()
          .detachAndCloseConnection(o.client)
          .catch(() => {});
    },
    found = getAppState().mcp.clients.find((client) => client.name === e),
    found_2 = getDynamicMcpState().clients.find((client) => client.name === e);
  if (!found && !found_2) return (_(), "dropped");
  let v = ir(e, o.client.config),
    R = (p) => p !== void 0 && ir(e, p.config) !== v;
  if (R(found) || R(found_2))
    return (
      logForDebugging(`[MCP] ${e}: dropping a settlement whose slot config changed mid-flight`),
      _(),
      "dropped"
    );
  if (R_t(o.client.config, o.attemptEpoch))
    return (
      logForDebugging(
        `[MCP] ${e}: settlement superseded by an account switch \u2014 closed, not installed (the identity boundary owns the row)`,
      ),
      _(),
      "superseded"
    );
  let T = oe(found ?? found_2, o),
    h = T,
    y = "applied";
  if (T.client.type !== "disabled") {
    let p = refusalStateFor(e, T.client);
    if (p) {
      if ((_(), p.type === "failed"))
        Q()
          .dropDiscoveryEntry(e, T.client.config)
          .catch(() => {});
      ((h = { client: p, tools: [], commands: [], resources: [], attemptEpoch: o.attemptEpoch }),
        (y = "refused"));
    }
  }
  if (
    (setAppState((p) => {
      let I = setMcpClientInAppState(p, e, h, { appendIfAbsent: h.client.config.type !== "sdk" }),
        j = !!h.resources && h.resources.length > 0,
        B = !!h.resourceTemplates && h.resourceTemplates.length > 0;
      return j && B
        ? I
        : {
            ...I,
            mcp: {
              ...I.mcp,
              resources: j ? I.mcp.resources : omitKeys(I.mcp.resources, e),
              resourceTemplates: B ? I.mcp.resourceTemplates : omitKeys(I.mcp.resourceTemplates, e),
            },
          };
    }),
    !found_2)
  )
    return y;
  let s = getMcpPrefix(e),
    i = getDynamicMcpState(),
    x = found === void 0 ? h : mergeReconnectResult(e, found_2, { incoming: o, result: h, outcome: y });
  return (
    setDynamicMcpState({
      ...i,
      clients: i.clients.map((client) => (client.name === e ? x.client : client)),
      tools: [...i.tools.filter((tool) => !isToolFromMcpServer(tool, e, s)), ...x.tools],
    }),
    y
  );
}
/**
 * MCP 身份（账号/组织）变化后重连受影响的服务器。
 */
//@ chunk-fpvb8c85.js:3946-7840 placement
function reconnectMcpOnIdentityChange(n) {
  if (!fd()) return;
  let {
    getAppState: getAppState,
    setAppState: setAppState,
    getDynamicMcpState: getDynamicMcpState,
    setDynamicMcpState: setDynamicMcpState,
    storageV5: storageV5,
    credentials: credentials,
    force: force = !1,
    spareUnchangedFrom: spareUnchangedFrom,
  } = n;
  deleteNeedsAuthCache(storageV5);
  let r = Q(),
    v = ht();
  if (!r.mcpIdentityChangedSinceLastCheck() && !force) return v.headlessConnectorMountInFlight;
  let R = !force || !isUnresolved(getMcpIdentitySnapshot()),
    T = getDynamicMcpState(),
    h = [...getAppState().mcp.clients, ...T.clients],
    y = new Set(),
    s = new Set(),
    i = new Set(),
    x = new Set();
  if (spareUnchangedFrom) {
    for (let c of h) x.add(c.name);
    for (let c of h) if (!spareUnchangedFrom.has(c) || c.type === "pending") x.delete(c.name);
  }
  for (let c of h) {
    if (!isRemoteMcpTransport(c.config) || x.has(c.name)) {
      i.add(ir(c.name, c.config));
      continue;
    }
    if ((r.disposeServerConnectionDetached(c.name, c.config), c.config.scope === "claudeai")) {
      s.add(c.name);
      continue;
    }
    if (c.type !== "disabled") y.add(c.name);
  }
  (r.evictAllMcpMemosOnIdentityChange(i, hasRemoteMcpServers(h)), jW().clear());
  let create = Object.create(null),
    I = new Set(),
    j = n.getHostOwnedConfigs?.() ?? T.configs;
  for (let c of h) {
    if (!y.has(c.name) || !R) continue;
    let w = create[c.name] ?? resolveReconnectConfig(c.name, j, c.config, getMcpConfigByName);
    if (!w) {
      I.add(c.name);
      continue;
    }
    let H = (create[c.name] ??= w);
    if (H !== c.config && ir(c.name, H) !== ir(c.name, c.config))
      logForDebugging(
        `[MCP] ${c.name}: appState and dynamic-store rows disagree on config at the identity boundary \u2014 converging both under the ${Object.hasOwn(j, c.name) ? "host's" : "appState row's"} config and re-dialing it`,
        { level: "warn" },
      );
  }
  let B = new Map(),
    W = headlessSyncsClaudeAiConnectors() && R,
    create_2 = Object.create(null);
  for (let [c, w] of Object.entries(create)) {
    if (W && isJudgedOnClaudeAiConnectorList(w)) {
      ((create_2[c] = w), delete create[c]);
      continue;
    }
    let H = mcpDialBlockCause(c, w);
    if (H) (B.set(c, N(c, w, H)), delete create[c]);
  }
  let U = [...y, ...s];
  if (U.length > 0) {
    let mapped = U.map((l) => [l, getMcpPrefix(l)]),
      w = (l) => mapped.some(([k, L]) => isToolFromMcpServer(l, k, L)),
      H = (l) =>
        s.has(l.name)
          ? []
          : y.has(l.name)
            ? [
                !R || I.has(l.name)
                  ? identityChangedFailure(l.name, l.config)
                  : (B.get(l.name) ?? {
                      name: l.name,
                      type: "pending",
                      config: create[l.name] ?? create_2[l.name] ?? l.config,
                    }),
              ]
            : [l];
    (setAppState((l) => ({
      ...l,
      mcp: {
        ...l.mcp,
        clients: l.mcp.clients.flatMap(H),
        tools: zj(l.mcp.tools, w),
        commands: zj(l.mcp.commands, (k) => U.some((L) => commandBelongsToServer(k, L))),
        resources: omitKeys(l.mcp.resources, U),
        resourceTemplates: omitKeys(l.mcp.resourceTemplates, U),
      },
    })),
      setDynamicMcpState({ ...T, clients: T.clients.flatMap(H), tools: T.tools.filter((tool) => !w(tool)) }));
  }
  let u, D;
  if (W) {
    let w = fetchClaudeAiConnectors(
      {
        getClients: () => getAppState().mcp.clients,
        getSuppressedPluginServers: () => getAppState().mcp.suppressedPluginMcpServers ?? [],
        applyMcpUpdate: (l) => {
          let k = new Set();
          if (
            (setAppState((A) => {
              let X = l(A.mcp),
                ee = new Set(X.clients.map((client) => client.name));
              return (
                (k = new Set(A.mcp.clients.filter((client) => !ee.has(client.name)).map((Y) => Y.name))),
                { ...A, mcp: X }
              );
            }),
            k.size === 0)
          )
            return;
          let L = getDynamicMcpState();
          if (!L.clients.some((client) => k.has(client.name))) return;
          let mapped = [...k].map((A) => [A, getMcpPrefix(A)]);
          setDynamicMcpState({
            ...L,
            clients: L.clients.filter((client) => !k.has(client.name)),
            tools: L.tools.filter((tool) => !mapped.some(([X, ee]) => isToolFromMcpServer(tool, X, ee))),
          });
        },
      },
      storageV5,
      credentials,
    );
    (w.settled.catch(() => {}), (D = w.mounted.catch(() => "mounted")));
    let H = w.mounted
      .then(
        () => {},
        (l) =>
          logForDebugging(`MCP connector refetch after account switch failed: ${errorMessage(l)}`, {
            level: "warn",
          }),
      )
      .finally(() => {
        if (v.headlessConnectorMountInFlight === H) v.headlessConnectorMountInFlight = void 0;
      });
    v.headlessConnectorMountInFlight = u = H;
  }
  if (y.size === 0 || !R) return u;
  let Z = (c) => {
      applyMcpReconnect(n, c.client.name, c);
    },
    z = {
      getClients: () => [...getAppState().mcp.clients, ...getDynamicMcpState().clients],
      getSuppressedPluginServers: () => getAppState().mcp.suppressedPluginMcpServers ?? [],
      applyMcpUpdate: (c) => setAppState((w) => ({ ...w, mcp: c(w.mcp) })),
    },
    q = (c) => {
      r.getMcpToolsCommandsAndResources(Z, c, storageV5, credentials)
        .catch((w) =>
          logForDebugging(`MCP re-dial after account switch failed: ${errorMessage(w)}`, { level: "warn" }),
        )
        .finally(() => {
          retryRemoteMcpServers(c, z, storageV5, Z).catch((w) =>
            logForDebugging(`MCP re-dial retry after account switch failed: ${errorMessage(w)}`, {
              level: "warn",
            }),
          );
        });
    };
  if ((q(create), Object.keys(create_2).length === 0 || !D)) return u;
  let G = identityEpoch(),
    K = D.then((c) => {
      if (c === "superseded" || !isCurrentIdentityEpoch(G)) return;
      let create = Object.create(null);
      for (let [H, l] of Object.entries(create_2)) {
        let k = mcpDialBlockCause(H, l);
        if (k) Z({ client: N(H, l, k), tools: [], commands: [], attemptEpoch: G });
        else create[H] = l;
      }
      if (Object.keys(create).length > 0) q(create);
    }).catch((c) =>
      logForDebugging(
        `MCP re-dial of held claude.ai proxy entries after account switch failed: ${errorMessage(c)}`,
        { level: "warn" },
      ),
    ),
    O = Promise.all([u, K])
      .then(() => {})
      .finally(() => {
        if (v.headlessConnectorMountInFlight === O) v.headlessConnectorMountInFlight = void 0;
      });
  return ((v.headlessConnectorMountInFlight = O), O);
}
/**
 * 判断重连结果是否需要提交到状态：客户端没变时不提交，跳过相同配置时也不提交。
 */
//@ chunk-fpvb8c85.js:7840-8000 placement
function shouldCommitReconnect(n, e, o, S) {
  let P = o?.type === "connected" && o.client === n.client,
    E = o !== void 0 && o.type !== "disabled" && ir(n.name, o.config) === ir(n.name, e);
  return !P && (!S || !E);
}
//@ chunk-fpvb8c85.js:8000-8017 placement
var ie = 5,
  ae = 1000;
/**
 * 创建 MCP 断线重连的退避计算器。
 */
//@ chunk-fpvb8c85.js:8017-9190 placement
function createReconnectBackoff(n) {
  let { getAppState: getAppState, getDynamicMcpState: getDynamicMcpState, now: now = Date.now } = n,
    weakSet = new WeakSet(),
    weakMap = new WeakMap(),
    weakMap_2 = new WeakMap(),
    _ = (M, r, v) => {
      let R = r > 1 ? cCt(r - 1) - v : 0,
        any = [...getAppState().mcp.clients, ...getDynamicMcpState().clients].some(
          (h) => h.type === "connected" && h.client === M.client,
        );
      if (R <= 0 || !any || n.isControlReconnectInFlight(M.name)) return 0;
      try {
        n.onHeldOff?.(r, R);
      } catch (error) {
        logForDebugging(`MCP reconnect hold-off observer failed for ${M.name}: ${errorMessage(error)}`, {
          level: "warn",
        });
      }
      return (
        logMCPDebug(
          M.name,
          `${M.config.type} transport closed again soon after it connected: reconnecting in ${R}ms`,
        ),
        R
      );
    };
  return (M) => {
    for (let r of M) {
      if (r.type === "connected") weakMap_2.set(r.client, r);
      if (r.type !== "connected" || weakSet.has(r.client) || !isLocalMcpServer(r.config)) continue;
      weakSet.add(r.client);
      let v = now(),
        R = (T) => {
          if (isShuttingDown() || n.isRunEnding()) return;
          r.cleanup().catch(() => {});
          let max = Math.max(0, now() - v),
            y = max < wfi ? (weakMap.get(r.client) ?? 0) + 1 : 0;
          (async () => {
            let s = _(r, y, max),
              i = n.sleep ?? ce;
            if (s > 0) await i(s);
            let x = () => weakMap_2.get(r.client) ?? r;
            for (let p = 0; s > 0 && p < ie && (await Q().hasUnsettledDial(x().name, x().config)); p++)
              await i(ae);
            await reconnectMcpServer(n, x(), T, y, s > 0, (p, I) => weakMap.set(p.client, I));
          })().catch((s) =>
            logForDebugging(`MCP reconnect after close failed for ${r.name}: ${errorMessage(s)}`, {
              level: "warn",
            }),
          );
        };
      if ((addMcpOnClose(r, () => R(!1)), $Ae(r))) setImmediate(R, !0);
    }
  };
}
//@ chunk-fpvb8c85.js:9190-9235 placement
function ce(n) {
  return sleep(n, void 0, { unref: !0 });
}
//@ chunk-fpvb8c85.js:9235-9307 placement = isLocalMcpServer (1)
function isLocalMcpServer(config) {
  return config.type !== void 0 && config.type !== "stdio" && config.type !== "sdk";
}
/**
 * 带退避地重连单个 MCP 服务器（检查会话结束、配置变化）。
 */
//@ chunk-fpvb8c85.js:9307-12719 placement
async function reconnectMcpServer(n, e, o, S, P, E) {
  let {
      getAppState: getAppState,
      getDynamicMcpState: getDynamicMcpState,
      storageV5: storageV5,
      credentials: credentials,
      isControlReconnectInFlight: isControlReconnectInFlight,
      isRunEnding: isRunEnding,
      onReconnected: onReconnected,
      sleep: sleep = ce,
      random: random = Math.random,
    } = n,
    { name: s, config: config } = e,
    x = identityEpoch(),
    p = () => isShuttingDown() || isRunEnding() || (identityEpoch() !== x && isRemoteMcpTransport(config)),
    I = () =>
      getAppState().mcp.clients.find((client) => client.name === s) ??
      getDynamicMcpState().clients.find((client) => client.name === s),
    j = e,
    B = () => I() === j,
    W = (u) => {
      applyMcpReconnect(n, s, u);
    },
    F = Q(),
    U = eae + ilr;
  for (let u = 1; u <= U; u++) {
    let D = u - eae;
    if (u > 1)
      await sleep(
        D > 0
          ? fullJitterBackoffMs({ baseMs: WQo, capMs: Efi, floorMs: WQo / 2, attempt: D - 1, random: random })
          : cCt(u - 1),
      );
    using Z = D > 0 ? trackTransientRetryPass([s]) : void 0;
    if (p() || !B()) return;
    let z = identityEpoch();
    if (D > 0) {
      let A = { name: s, type: "pending", config: config };
      if (refusalStateFor(s, A)) {
        W({ client: A, tools: [], commands: [], attemptEpoch: z });
        return;
      }
      if (await F.hasUnsettledDial(s, config)) {
        if (u < U) {
          logMCPDebug(
            s,
            `Background reconnect attempt ${D}/${ilr} skipped: another reconnect to this server is in progress; will try again at the next attempt`,
          );
          continue;
        }
        if (!p() && B() && !isControlReconnectInFlight(s))
          (logMCPDebug(
            s,
            `Reconnect gave up after ${u} attempts: another reconnect to this server is still in progress; leaving it to finish`,
          ),
            logFeatureBad("mcp_slow_reconnect", "gave_up", { attempts: u, found_closed: o }));
        return;
      }
      if (p() || !B()) return;
    } else {
      let A = { name: s, type: "pending", config: config, reconnectAttempt: u, maxReconnectAttempts: eae };
      (W({ client: A, ...serverItemsOf(getAppState().mcp, s), attemptEpoch: z }), (j = A));
    }
    if (!B() || isControlReconnectInFlight(s)) return;
    logMCPDebug(
      s,
      u === 1
        ? `${config.type} transport ${o ? "had already closed when wired" : "closed"} \u2014 reconnecting (attempt 1/${eae})`
        : D > 0
          ? `Background reconnect attempt ${D}/${ilr}`
          : `Reconnect attempt ${u}/${eae}`,
    );
    let q = P && u === 1 ? await F.peekSettledConnection(s, config) : void 0,
      G = q?.type === "connected" && !$Ae(q) ? withConfigScope(q, config) : void 0,
      K = {
        ...(G !== void 0
          ? { client: G, ...serverItemsOf(getAppState().mcp, s) }
          : await F.reconnectMcpServerImpl(s, config, storageV5, credentials, {
              keepConnectionInUse: !0,
            }).catch((A) => ({
              client: { name: s, type: "failed", config: config, error: errorMessage(A) },
              tools: [],
              commands: [],
            }))),
        attemptEpoch: z,
      },
      O = K.client.type === "connected" ? K.client : void 0,
      c = O !== void 0 && isSameConnectedClient(await F.peekSettledConnection(s, config), O),
      w = () => {
        if (O && shouldCommitReconnect(O, config, I(), c && !isRunEnding()))
          F.detachAndCloseConnection(O).catch(() => {});
      };
    if (p() || !B() || isControlReconnectInFlight(s)) {
      w();
      return;
    }
    let H = K.keptConnectionInUse === !0 && O?.toolsListError !== void 0 && refusalStateFor(s, O) === void 0;
    if (O && c && !H) {
      if ((E(O, S + u - 1), W(K), I() === O)) {
        if (O === G)
          refreshMcpServerTools(
            O,
            (A, X) => {
              commitMcpReconnect(n, A, X, O.config);
            },
            storageV5,
          ).catch((A) =>
            logForDebugging(`MCP tools refresh over a kept connection failed for ${s}: ${errorMessage(A)}`, {
              level: "warn",
            }),
          );
        (logMCPDebug(s, `Reconnected (attempt ${u})`),
          logFeatureOk(D > 0 ? "mcp_slow_reconnect" : "mcp_auto_reconnect", {
            attempts: u,
            found_closed: o,
            young_closes: S,
          }),
          onReconnected(O));
      }
      return;
    }
    w();
    let l = O && {
        name: s,
        type: "failed",
        config: config,
        error: H ? "Its tools could not be listed" : "Connection closed again while reconnecting",
      },
      k = l ?? K.client,
      L = l ? { ...l, errorCode: "ConnectionClosed" } : k,
      V = Njt(L);
    if (u === eae || (D > 0 && (!V || u === U))) {
      if (
        (logMCPDebug(
          s,
          D <= 0 && V
            ? `Still failing after ${u} attempts`
            : `Reconnect gave up after ${u} attempts: ${k.type}`,
        ),
        W({
          client: k,
          tools: k.type === "needs-auth" ? mcpAuthToolsFor(s, config) : [],
          commands: [],
          attemptEpoch: z,
        }),
        I() !== k)
      )
        return;
      if (k.type === "needs-auth") {
        logFeatureSad(D > 0 ? "mcp_slow_reconnect" : "mcp_auto_reconnect", "needs_auth", {
          attempts: u,
          found_closed: o,
          young_closes: S,
        });
        return;
      }
      if (D > 0) {
        logFeatureBad("mcp_slow_reconnect", V ? "gave_up" : "not_retryable", {
          attempts: u,
          found_closed: o,
        });
        return;
      }
      if (
        (logFeatureBad("mcp_auto_reconnect", "exhausted", {
          attempts: u,
          found_closed: o,
          young_closes: S,
          goes_slow: V,
        }),
        !V)
      )
        return;
      ((j = k),
        logMCPDebug(s, `Reconnect attempts spent; retrying in the background, up to ${ilr} more times`));
      continue;
    }
    logMCPDebug(
      s,
      D > 0
        ? `Background reconnect attempt ${D} did not connect (${k.type})`
        : `Reconnect attempt ${u} did not connect (${k.type}); next in ${cCt(u)}ms`,
    );
  }
}
//@ chunk-fpvb8c85.js:12719-12738 placement
var weakMap = new WeakMap();
//@ chunk-fpvb8c85.js:12738-12771 placement
function CCs(n) {
  return weakMap.get(n);
}
/**
 * 提交重连后的客户端（配置变化时放弃）。
 */
//@ chunk-fpvb8c85.js:12771-13469 placement
function commitMcpReconnect(n, e, o, S) {
  let {
      setAppState: setAppState,
      getDynamicMcpState: getDynamicMcpState,
      setDynamicMcpState: setDynamicMcpState,
    } = n,
    _ = S4n(),
    M = !1,
    r = !1,
    v;
  setAppState((y) => {
    let found = y.mcp.clients.find((client) => client.name === e),
      i = redecorateTools(found, o, S);
    if (i === void 0) return ((r = !0), y);
    if (_ && found?.type === "connected" && sameServerTools(y.mcp.tools, e, i))
      return ((M = !0), (v = { row: found, tools: i }), y);
    let x = replaceServerTools(y, e, i);
    return ((M = x !== y), (v = M && found !== void 0 ? { row: found, tools: i } : void 0), x);
  });
  let R = getDynamicMcpState(),
    found = R.clients.find((client) => client.name === e),
    h = redecorateTools(found, o, S);
  if (h === void 0) r = !0;
  else if (_ && found?.type === "connected" && sameServerTools(R.tools, e, h)) M = !0;
  else {
    let y = findChromeClient(R, e, h);
    if (y !== R) (setDynamicMcpState(y), (M = !0));
  }
  if (v !== void 0)
    if (found?.type === "pending") weakMap.set(v.row, v.tools);
    else weakMap.delete(v.row);
  if (r) logMCPDebug(e, "A re-queried tool list was not applied: another server holds the name");
  return M;
}
//@ chunk-fpvb8c85.js:13469-13512 placement
function RCs(n) {
  return (e, o, S) => commitMcpReconnect(n, e, o, S);
}
/**
 * 监视已连接客户端的断开并触发重连。
 */
//@ chunk-fpvb8c85.js:13512-14736 placement
function watchMcpDisconnects(n) {
  let { getAppState: getAppState, getDynamicMcpState: getDynamicMcpState } = n.stores,
    weakSet = new WeakSet(),
    weakMap = new WeakMap();
  return (E) => {
    for (let C of E) {
      if (C.type === "connected") weakMap.set(C.client, C);
      if (C.type !== "connected" || weakSet.has(C.client)) continue;
      if ((weakSet.add(C.client), !C.capabilities?.tools?.listChanged)) continue;
      let _ = C.name;
      Q().onMcpToolListChanged(C, async (M) => {
        logMCPDebug(
          _,
          M === REOPEN_REFETCH
            ? "Synthesized tools refetch after listen-stream reopen (no notification received)"
            : M === BEFORE_HANDLER
              ? "Refreshing tools for a tools/list_changed notification received before this handler was registered"
              : "Received tools/list_changed notification, refreshing tools",
        );
        let r =
            getAppState().mcp.clients.find((client) => client.name === _) ??
            getDynamicMcpState().clients.find((client) => client.name === _),
          v = weakMap.get(C.client) ?? C,
          R = r !== void 0 && ir(_, r.config) === ir(_, v.config) ? withConfigScope(v, r.config) : v;
        weakMap.set(C.client, R);
        let T = await refreshMcpServerTools(
          R,
          (i, x) => {
            commitMcpReconnect(n.stores, i, x, R.config);
          },
          n.storageV5,
        );
        if (T.status === "kept-previous") {
          logMCPDebug(_, "tools/list failed after list_changed \u2014 keeping previous tool set");
          return;
        }
        let h = T.newTools.length,
          y = tzs(T.newTools),
          s = (i) =>
            logEvent("tengu_mcp_list_changed", {
              mcpServerKeyHash: toolNameForTelemetry(_),
              type: lit("tools"),
              cause: Y2e(M),
              previousCount: i,
              newCount: h,
              ...toolsListAheadTelemetry(C),
              ...y,
            });
        if (T.previousToolsPromise)
          T.previousToolsPromise.then(
            (i) => s(i.length),
            () => s(),
          );
        else s();
      });
    }
  };
}

export {
  applyMcpReconnect,
  resolveReconnectConfig,
  reconnectMcpOnIdentityChange,
  watchMcpDisconnects,
  createReconnectBackoff,
  RCs,
  markServerDisabled,
  refusalStateFor,
  CCs,
  serverItemsOf,
  shouldCommitReconnect,
};
