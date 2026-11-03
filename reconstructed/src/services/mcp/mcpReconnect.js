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
import {
  filterCommandsByServer,
  commandBelongsToServer,
  isRetryableConnectionFailure,
  refetchReasonTelemetry,
} from "./utils.js";
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
import { serverCacheKey, refreshMcpServerTools } from "./client.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  identityChangedForRemote,
  isRemoteMcpTransport,
  hasRemoteMcpServers,
  identityChangedFailure,
} from "./discoveryIdentity.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { isDiscoveryCacheOn, isUnresolved } from "./mcpAccountKey.js";
import { deleteNeedsAuthCache, mcpAuthToolsFor } from "./needsAuthCache.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { getMcpIdentitySnapshot, identityEpoch, isCurrentIdentityEpoch } from "./identityChange.js";
import { deferredToolCache } from "../api/deferredToolsState.js";
import { reject_default } from "../../../vendor/lodash-es/reject.js";
import {
  fetchClaudeAiConnectors,
  retryRemoteMcpServers,
  trackTransientRetryPass,
} from "./connectionBatch.js";
import { errorMessage } from "../../utils/errors.js";
import {
  retryDelayMs,
  CALL_MARK_MAX_CHARS,
  ANSWER_STREAM_GRACE_MS,
  MAX_REOPEN_ATTEMPTS,
  REOPEN_REFETCH_MS,
  MAX_REOPEN_REFETCH_MS,
  REOPEN_REFETCH,
  BEFORE_HANDLER,
} from "./mcpCallConstants.js";
import { logMCPDebug } from "../../utils/log.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { addMcpOnClose } from "./mcpWireUtils.js";
import { isClientWithoutTransport } from "./officialPluginPromptOverrides.js";
import { sleep, fullJitterBackoffMs } from "../../utils/sleep.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  isSameConnectedClient,
  isUnchangedRelistSkipOn,
  toolListingVerdict,
} from "./toolSchemaValidation.js";
import { logEvent } from "../analytics/index.js";
import { toolNameForTelemetry } from "../analytics/metadata.js";
import { lit } from "../analytics/safeMetadata.js";
import { toolsListAheadTelemetry } from "./toolsListAhead.js";

//@ chunk-fpvb8c85.js:1248-1317 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-fpvb8c85.js:1317-1427 placement
/**
 * 解析重连使用的服务器配置：显式给出的优先，非设置作用域的现有配置次之，否则调用回调查找。
 */
function resolveReconnectConfig(n, e, config, getMcpConfigByName) {
  if (Object.hasOwn(e, n)) return e[n];
  if (config && !MCP_SETTINGS_SCOPE_SET.has(config.scope)) return config;
  return getMcpConfigByName ? getMcpConfigByName(n) : (config ?? null);
}
//@ chunk-fpvb8c85.js:1427-1605 placement
/**
 * 在 MCP 状态中把服务器标记为禁用并移除其工具。
 */
function markServerDisabled(dynamicMcpState, e) {
  if (!dynamicMcpState.clients.some((client) => client.name === e)) return dynamicMcpState;
  return {
    ...dynamicMcpState,
    clients: dynamicMcpState.clients.map((client) =>
      client.name === e
        ? {
            name: e,
            type: "disabled",
            config: client.config,
          }
        : client,
    ),
    tools: filterCommandsByServer(dynamicMcpState.tools, e),
  };
}
//@ chunk-fpvb8c85.js:1605-1787 placement
/**
 * 取出某服务器在 MCP 状态中的工具、命令、资源与资源模板。
 */
function serverItemsOf(n, e) {
  let mcpPrefix = getMcpPrefix(e);
  return {
    tools: n.tools.filter((tool) => isToolFromMcpServer(tool, e, mcpPrefix)),
    commands: n.commands.filter((command) => commandBelongsToServer(command, e)),
    resources: n.resources[e],
    resourceTemplates: n.resourceTemplates[e],
  };
}
//@ chunk-fpvb8c85.js:1787-1995 placement
/**
 * 计算重连结果应呈现的拒绝状态：托管策略拦截、用户禁用或其他拨号拦截原因。
 */
function refusalStateFor(n, client) {
  let o = client.type !== "failed" ? mcpDialBlockCause(n, client.config) : undefined;
  if (o === "managed-policy") return failedServerRefusal(n, client.config, o);
  if (isMcpServerDisabled(n) && !isPolicyBlockedFailure(client))
    return {
      name: n,
      type: "disabled",
      config: client.config,
    };
  return o ? failedServerRefusal(n, client.config, o) : undefined;
}
//@ chunk-fpvb8c85.js:1995-2064 placement
/**
 * 构造一个“失败 + 拒绝原因”的服务器结果。
 */
function failedServerRefusal(n, config, o) {
  return {
    name: n,
    type: "failed",
    config,
    ...mcpGateError(o, n, config),
  };
}
//@ chunk-fpvb8c85.js:2064-2160 placement
/**
 * 用传入配置修正重连结果（被拒时保留原客户端）。
 */
function reconcileConfig(n, e) {
  return e.asked || n === undefined || withConfigScope(e.client, n.config) === e.client
    ? e
    : applyMcpServerConfig(n.config, e);
}
//@ chunk-fpvb8c85.js:2160-2487 placement
/**
 * 合并重连结果与传入配置（拒绝时保留原客户端）。
 */
function mergeReconnectResult(n, e, o) {
  let { incoming, result: P, outcome } = o;
  if (outcome === "refused") {
    let M = incoming.asked ? P.client : withMcpConfig(P.client, e.config);
    return M === P.client
      ? P
      : {
          ...P,
          client: M,
        };
  }
  if (withConfigScope(P.client, e.config) === P.client) return P;
  let C = reconcileConfig(e, incoming);
  if (C.client.type === "disabled") return C;
  let _ = refusalStateFor(n, C.client);
  return _
    ? {
        ...C,
        client: _,
        tools: [],
        commands: [],
      }
    : C;
}
//@ chunk-fpvb8c85.js:2487-3946 placement
/**
 * 把重连结果写入 AppState/动态 MCP 状态，旧连接关闭。
 */
function applyMcpReconnect(n, e, o) {
  let { getAppState, setAppState, getDynamicMcpState, setDynamicMcpState } = n;
  let _ = () => {
    if (o.client.type === "connected")
      mcpClientModule()
        .detachAndCloseConnection(o.client)
        .catch(() => {});
  };
  let found = getAppState().mcp.clients.find((client) => client.name === e);
  let found_2 = getDynamicMcpState().clients.find((client) => client.name === e);
  if (!found && !found_2) {
    _();
    return "dropped";
  }
  let v = serverCacheKey(e, o.client.config);
  let R = (p) => p !== undefined && serverCacheKey(e, p.config) !== v;
  if (R(found) || R(found_2)) {
    logForDebugging(`[MCP] ${e}: dropping a settlement whose slot config changed mid-flight`);
    _();
    return "dropped";
  }
  if (identityChangedForRemote(o.client.config, o.attemptEpoch)) {
    logForDebugging(
      `[MCP] ${e}: settlement superseded by an account switch \u2014 closed, not installed (the identity boundary owns the row)`,
    );
    _();
    return "superseded";
  }
  let T = reconcileConfig(found ?? found_2, o);
  let h = T;
  let y = "applied";
  if (T.client.type !== "disabled") {
    let p = refusalStateFor(e, T.client);
    if (p) {
      _();
      if (p.type === "failed")
        mcpClientModule()
          .dropDiscoveryEntry(e, T.client.config)
          .catch(() => {});
      h = {
        client: p,
        tools: [],
        commands: [],
        resources: [],
        attemptEpoch: o.attemptEpoch,
      };
      y = "refused";
    }
  }
  setAppState((p) => {
    let I = setMcpClientInAppState(p, e, h, {
      appendIfAbsent: h.client.config.type !== "sdk",
    });
    let j = !!h.resources && h.resources.length > 0;
    let B = !!h.resourceTemplates && h.resourceTemplates.length > 0;
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
  });
  if (!found_2) return y;
  let mcpPrefix = getMcpPrefix(e);
  let dynamicMcpState = getDynamicMcpState();
  let x =
    found === undefined
      ? h
      : mergeReconnectResult(e, found_2, {
          incoming: o,
          result: h,
          outcome: y,
        });
  setDynamicMcpState({
    ...dynamicMcpState,
    clients: dynamicMcpState.clients.map((client) => (client.name === e ? x.client : client)),
    tools: [...dynamicMcpState.tools.filter((tool) => !isToolFromMcpServer(tool, e, mcpPrefix)), ...x.tools],
  });
  return y;
}
//@ chunk-fpvb8c85.js:3946-7840 placement
/**
 * MCP 身份（账号/组织）变化后重连受影响的服务器。
 */
function reconnectMcpOnIdentityChange(n) {
  if (!isDiscoveryCacheOn()) return;
  let {
    getAppState,
    setAppState,
    getDynamicMcpState,
    setDynamicMcpState,
    storageV5,
    credentials,
    force = false,
    spareUnchangedFrom,
  } = n;
  deleteNeedsAuthCache(storageV5);
  let r = mcpClientModule();
  let cliOwnedState = getCliOwnedState();
  if (!r.mcpIdentityChangedSinceLastCheck() && !force) return cliOwnedState.headlessConnectorMountInFlight;
  let R = !force || !isUnresolved(getMcpIdentitySnapshot());
  let dynamicMcpState = getDynamicMcpState();
  let h = [...getAppState().mcp.clients, ...dynamicMcpState.clients];
  let y = new Set();
  let s = new Set();
  let i = new Set();
  let x = new Set();
  if (spareUnchangedFrom) {
    for (let c of h) x.add(c.name);
    for (let c of h) if (!spareUnchangedFrom.has(c) || c.type === "pending") x.delete(c.name);
  }
  for (let c of h) {
    if (!isRemoteMcpTransport(c.config) || x.has(c.name)) {
      i.add(serverCacheKey(c.name, c.config));
      continue;
    }
    r.disposeServerConnectionDetached(c.name, c.config);
    if (c.config.scope === "claudeai") {
      s.add(c.name);
      continue;
    }
    if (c.type !== "disabled") y.add(c.name);
  }
  r.evictAllMcpMemosOnIdentityChange(i, hasRemoteMcpServers(h));
  deferredToolCache().clear();
  let p = Object.create(null);
  let I = new Set();
  let j = n.getHostOwnedConfigs?.() ?? dynamicMcpState.configs;
  for (let c of h) {
    if (!y.has(c.name) || !R) continue;
    let w = p[c.name] ?? resolveReconnectConfig(c.name, j, c.config, getMcpConfigByName);
    if (!w) {
      I.add(c.name);
      continue;
    }
    let H = (p[c.name] ??= w);
    if (H !== c.config && serverCacheKey(c.name, H) !== serverCacheKey(c.name, c.config))
      logForDebugging(
        `[MCP] ${c.name}: appState and dynamic-store rows disagree on config at the identity boundary \u2014 converging both under the ${Object.hasOwn(j, c.name) ? "host's" : "appState row's"} config and re-dialing it`,
        {
          level: "warn",
        },
      );
  }
  let B = new Map();
  let W = headlessSyncsClaudeAiConnectors() && R;
  let F = Object.create(null);
  for (let [key, value] of Object.entries(p)) {
    if (W && isJudgedOnClaudeAiConnectorList(value)) {
      F[key] = value;
      delete p[key];
      continue;
    }
    let H = mcpDialBlockCause(key, value);
    if (H) {
      B.set(key, failedServerRefusal(key, value, H));
      delete p[key];
    }
  }
  let U = [...y, ...s];
  if (U.length > 0) {
    let mapped = U.map((l) => [l, getMcpPrefix(l)]);
    let w = (tool) => mapped.some(([k, L]) => isToolFromMcpServer(tool, k, L));
    let H = (l) =>
      s.has(l.name)
        ? []
        : y.has(l.name)
          ? [
              !R || I.has(l.name)
                ? identityChangedFailure(l.name, l.config)
                : (B.get(l.name) ?? {
                    name: l.name,
                    type: "pending",
                    config: p[l.name] ?? F[l.name] ?? l.config,
                  }),
            ]
          : [l];
    setAppState((l) => ({
      ...l,
      mcp: {
        ...l.mcp,
        clients: l.mcp.clients.flatMap(H),
        tools: reject_default(l.mcp.tools, w),
        commands: reject_default(l.mcp.commands, (k) => U.some((L) => commandBelongsToServer(k, L))),
        resources: omitKeys(l.mcp.resources, U),
        resourceTemplates: omitKeys(l.mcp.resourceTemplates, U),
      },
    }));
    setDynamicMcpState({
      ...dynamicMcpState,
      clients: dynamicMcpState.clients.flatMap(H),
      tools: dynamicMcpState.tools.filter((tool) => !w(tool)),
    });
  }
  let u;
  let D;
  if (W) {
    let claudeAiConnectors = fetchClaudeAiConnectors(
      {
        getClients: () => getAppState().mcp.clients,
        getSuppressedPluginServers: () => getAppState().mcp.suppressedPluginMcpServers ?? [],
        applyMcpUpdate: (l) => {
          let k = new Set();
          setAppState((A) => {
            let X = l(A.mcp);
            let ee = new Set(X.clients.map((client) => client.name));
            k = new Set(A.mcp.clients.filter((client) => !ee.has(client.name)).map((client) => client.name));
            return {
              ...A,
              mcp: X,
            };
          });
          if (k.size === 0) return;
          let dynamicMcpState = getDynamicMcpState();
          if (!dynamicMcpState.clients.some((client) => k.has(client.name))) return;
          let mapped = [...k].map((A) => [A, getMcpPrefix(A)]);
          setDynamicMcpState({
            ...dynamicMcpState,
            clients: dynamicMcpState.clients.filter((client) => !k.has(client.name)),
            tools: dynamicMcpState.tools.filter(
              (tool) => !mapped.some(([X, ee]) => isToolFromMcpServer(tool, X, ee)),
            ),
          });
        },
      },
      storageV5,
      credentials,
    );
    claudeAiConnectors.settled.catch(() => {});
    D = claudeAiConnectors.mounted.catch(() => "mounted");
    let H = claudeAiConnectors.mounted
      .then(
        () => {},
        (error) =>
          logForDebugging(`MCP connector refetch after account switch failed: ${errorMessage(error)}`, {
            level: "warn",
          }),
      )
      .finally(() => {
        if (cliOwnedState.headlessConnectorMountInFlight === H)
          cliOwnedState.headlessConnectorMountInFlight = undefined;
      });
    cliOwnedState.headlessConnectorMountInFlight = u = H;
  }
  if (y.size === 0 || !R) return u;
  let Z = (c) => {
    applyMcpReconnect(n, c.client.name, c);
  };
  let z = {
    getClients: () => [...getAppState().mcp.clients, ...getDynamicMcpState().clients],
    getSuppressedPluginServers: () => getAppState().mcp.suppressedPluginMcpServers ?? [],
    applyMcpUpdate: (c) =>
      setAppState((w) => ({
        ...w,
        mcp: c(w.mcp),
      })),
  };
  let q = (c) => {
    r.getMcpToolsCommandsAndResources(Z, c, storageV5, credentials)
      .catch((error) =>
        logForDebugging(`MCP re-dial after account switch failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
      )
      .finally(() => {
        retryRemoteMcpServers(c, z, storageV5, Z).catch((error) =>
          logForDebugging(`MCP re-dial retry after account switch failed: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
      });
  };
  q(p);
  if (Object.keys(F).length === 0 || !D) return u;
  let G = identityEpoch();
  let K = D.then((c) => {
    if (c === "superseded" || !isCurrentIdentityEpoch(G)) return;
    let w = Object.create(null);
    for (let [key, value] of Object.entries(F)) {
      let k = mcpDialBlockCause(key, value);
      if (k)
        Z({
          client: failedServerRefusal(key, value, k),
          tools: [],
          commands: [],
          attemptEpoch: G,
        });
      else w[key] = value;
    }
    if (Object.keys(w).length > 0) q(w);
  }).catch((error) =>
    logForDebugging(
      `MCP re-dial of held claude.ai proxy entries after account switch failed: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    ),
  );
  let O = Promise.all([u, K])
    .then(() => {})
    .finally(() => {
      if (cliOwnedState.headlessConnectorMountInFlight === O)
        cliOwnedState.headlessConnectorMountInFlight = undefined;
    });
  cliOwnedState.headlessConnectorMountInFlight = O;
  return O;
}
//@ chunk-fpvb8c85.js:7840-8000 placement
/**
 * 判断重连结果是否需要提交到状态：客户端没变时不提交，跳过相同配置时也不提交。
 */
function shouldCommitReconnect(client, e, o, S) {
  let P = o?.type === "connected" && o.client === client.client;
  let E =
    o !== undefined &&
    o.type !== "disabled" &&
    serverCacheKey(client.name, o.config) === serverCacheKey(client.name, e);
  return !P && (!S || !E);
}
//@ chunk-fpvb8c85.js:8000-8017 placement
/**
 * 每轮等待时长（1000 毫秒）。
 */
var MAX_UNSETTLED_DIALS = 5;
var UNSETTLED_DIAL_SLEEP_MS = 1000;
//@ chunk-fpvb8c85.js:8017-9190 placement
/**
 * 创建 MCP 断线重连的退避计算器。
 */
function createReconnectBackoff(n) {
  let { getAppState, getDynamicMcpState, now = Date.now } = n;
  let weakSet = new WeakSet();
  let weakMap = new WeakMap();
  let weakMap_2 = new WeakMap();
  let _ = (M, r, v) => {
    let R = r > 1 ? retryDelayMs(r - 1) - v : 0;
    let any = [...getAppState().mcp.clients, ...getDynamicMcpState().clients].some(
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
    logMCPDebug(
      M.name,
      `${M.config.type} transport closed again soon after it connected: reconnecting in ${R}ms`,
    );
    return R;
  };
  return (M) => {
    for (let r of M) {
      if (r.type === "connected") weakMap_2.set(r.client, r);
      if (r.type !== "connected" || weakSet.has(r.client) || !isLocalMcpServer(r.config)) continue;
      weakSet.add(r.client);
      let v = now();
      let R = (T) => {
        if (isShuttingDown() || n.isRunEnding()) return;
        r.cleanup().catch(() => {});
        let max = Math.max(0, now() - v);
        let y = max < CALL_MARK_MAX_CHARS ? (weakMap.get(r.client) ?? 0) + 1 : 0;
        (async () => {
          let s = _(r, y, max);
          let sleep = n.sleep ?? unrefSleep;
          if (s > 0) await sleep(s);
          let x = () => weakMap_2.get(r.client) ?? r;
          for (
            let j = 0;
            s > 0 &&
            j < MAX_UNSETTLED_DIALS &&
            (await mcpClientModule().hasUnsettledDial(x().name, x().config));
            j++
          )
            await sleep(UNSETTLED_DIAL_SLEEP_MS);
          await reconnectMcpServer(n, x(), T, y, s > 0, (p, I) => weakMap.set(p.client, I));
        })().catch((error) =>
          logForDebugging(`MCP reconnect after close failed for ${r.name}: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
      };
      addMcpOnClose(r, () => R(false));
      if (isClientWithoutTransport(r)) setImmediate(R, true);
    }
  };
}
//@ chunk-fpvb8c85.js:9190-9235 placement
/**
 * 不阻止进程退出的 sleep。
 */
function unrefSleep(n) {
  return sleep(n, undefined, {
    unref: true,
  });
}
//@ chunk-fpvb8c85.js:9235-9307 placement = isLocalMcpServer (1)
function isLocalMcpServer(config) {
  return config.type !== undefined && config.type !== "stdio" && config.type !== "sdk";
}
//@ chunk-fpvb8c85.js:9307-12719 placement
/**
 * 带退避地重连单个 MCP 服务器（检查会话结束、配置变化）。
 */
async function reconnectMcpServer(n, e, o, S, P, E) {
  let {
    getAppState,
    getDynamicMcpState,
    storageV5,
    credentials,
    isControlReconnectInFlight,
    isRunEnding,
    onReconnected,
    sleep = unrefSleep,
    random = Math.random,
  } = n;
  let { name: s, config } = e;
  let x = identityEpoch();
  let p = () => isShuttingDown() || isRunEnding() || (identityEpoch() !== x && isRemoteMcpTransport(config));
  let I = () =>
    getAppState().mcp.clients.find((client) => client.name === s) ??
    getDynamicMcpState().clients.find((client) => client.name === s);
  let j = e;
  let B = () => I() === j;
  let W = (u) => {
    applyMcpReconnect(n, s, u);
  };
  let F = mcpClientModule();
  let U = ANSWER_STREAM_GRACE_MS + MAX_REOPEN_ATTEMPTS;
  for (let idx = 1; idx <= U; idx++) {
    let D = idx - ANSWER_STREAM_GRACE_MS;
    if (idx > 1)
      await sleep(
        D > 0
          ? fullJitterBackoffMs({
              baseMs: REOPEN_REFETCH_MS,
              capMs: MAX_REOPEN_REFETCH_MS,
              floorMs: REOPEN_REFETCH_MS / 2,
              attempt: D - 1,
              random,
            })
          : retryDelayMs(idx - 1),
      );
    using Z = D > 0 ? trackTransientRetryPass([s]) : undefined;
    if (p() || !B()) return;
    let attemptEpoch = identityEpoch();
    if (D > 0) {
      let A = {
        name: s,
        type: "pending",
        config,
      };
      if (refusalStateFor(s, A)) {
        W({
          client: A,
          tools: [],
          commands: [],
          attemptEpoch,
        });
        return;
      }
      if (await F.hasUnsettledDial(s, config)) {
        if (idx < U) {
          logMCPDebug(
            s,
            `Background reconnect attempt ${D}/${MAX_REOPEN_ATTEMPTS} skipped: another reconnect to this server is in progress; will try again at the next attempt`,
          );
          continue;
        }
        if (!p() && B() && !isControlReconnectInFlight(s)) {
          logMCPDebug(
            s,
            `Reconnect gave up after ${idx} attempts: another reconnect to this server is still in progress; leaving it to finish`,
          );
          logFeatureBad("mcp_slow_reconnect", "gave_up", {
            attempts: idx,
            found_closed: o,
          });
        }
        return;
      }
      if (p() || !B()) return;
    } else {
      let A = {
        name: s,
        type: "pending",
        config,
        reconnectAttempt: idx,
        maxReconnectAttempts: ANSWER_STREAM_GRACE_MS,
      };
      W({
        client: A,
        ...serverItemsOf(getAppState().mcp, s),
        attemptEpoch,
      });
      j = A;
    }
    if (!B() || isControlReconnectInFlight(s)) return;
    logMCPDebug(
      s,
      idx === 1
        ? `${config.type} transport ${o ? "had already closed when wired" : "closed"} \u2014 reconnecting (attempt 1/${ANSWER_STREAM_GRACE_MS})`
        : D > 0
          ? `Background reconnect attempt ${D}/${MAX_REOPEN_ATTEMPTS}`
          : `Reconnect attempt ${idx}/${ANSWER_STREAM_GRACE_MS}`,
    );
    let q = P && idx === 1 ? await F.peekSettledConnection(s, config) : undefined;
    let G = q?.type === "connected" && !isClientWithoutTransport(q) ? withConfigScope(q, config) : undefined;
    let K = {
      ...(G !== undefined
        ? {
            client: G,
            ...serverItemsOf(getAppState().mcp, s),
          }
        : await F.reconnectMcpServerImpl(s, config, storageV5, credentials, {
            keepConnectionInUse: true,
          }).catch((error) => ({
            client: {
              name: s,
              type: "failed",
              config,
              error: errorMessage(error),
            },
            tools: [],
            commands: [],
          }))),
      attemptEpoch,
    };
    let client = K.client.type === "connected" ? K.client : undefined;
    let c = client !== undefined && isSameConnectedClient(await F.peekSettledConnection(s, config), client);
    let w = () => {
      if (client && shouldCommitReconnect(client, config, I(), c && !isRunEnding()))
        F.detachAndCloseConnection(client).catch(() => {});
    };
    if (p() || !B() || isControlReconnectInFlight(s)) {
      w();
      return;
    }
    let H =
      K.keptConnectionInUse === true &&
      client?.toolsListError !== undefined &&
      refusalStateFor(s, client) === undefined;
    if (client && c && !H) {
      E(client, S + idx - 1);
      W(K);
      if (I() === client) {
        if (client === G)
          refreshMcpServerTools(
            client,
            (A, X) => {
              commitMcpReconnect(n, A, X, client.config);
            },
            storageV5,
          ).catch((error) =>
            logForDebugging(
              `MCP tools refresh over a kept connection failed for ${s}: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            ),
          );
        logMCPDebug(s, `Reconnected (attempt ${idx})`);
        logFeatureOk(D > 0 ? "mcp_slow_reconnect" : "mcp_auto_reconnect", {
          attempts: idx,
          found_closed: o,
          young_closes: S,
        });
        onReconnected(client);
      }
      return;
    }
    w();
    let l = client && {
      name: s,
      type: "failed",
      config,
      error: H ? "Its tools could not be listed" : "Connection closed again while reconnecting",
    };
    let k = l ?? K.client;
    let L = l
      ? {
          ...l,
          errorCode: "ConnectionClosed",
        }
      : k;
    let V = isRetryableConnectionFailure(L);
    if (idx === ANSWER_STREAM_GRACE_MS || (D > 0 && (!V || idx === U))) {
      logMCPDebug(
        s,
        D <= 0 && V
          ? `Still failing after ${idx} attempts`
          : `Reconnect gave up after ${idx} attempts: ${k.type}`,
      );
      W({
        client: k,
        tools: k.type === "needs-auth" ? mcpAuthToolsFor(s, config) : [],
        commands: [],
        attemptEpoch,
      });
      if (I() !== k) return;
      if (k.type === "needs-auth") {
        logFeatureSad(D > 0 ? "mcp_slow_reconnect" : "mcp_auto_reconnect", "needs_auth", {
          attempts: idx,
          found_closed: o,
          young_closes: S,
        });
        return;
      }
      if (D > 0) {
        logFeatureBad("mcp_slow_reconnect", V ? "gave_up" : "not_retryable", {
          attempts: idx,
          found_closed: o,
        });
        return;
      }
      logFeatureBad("mcp_auto_reconnect", "exhausted", {
        attempts: idx,
        found_closed: o,
        young_closes: S,
        goes_slow: V,
      });
      if (!V) return;
      j = k;
      logMCPDebug(
        s,
        `Reconnect attempts spent; retrying in the background, up to ${MAX_REOPEN_ATTEMPTS} more times`,
      );
      continue;
    }
    logMCPDebug(
      s,
      D > 0
        ? `Background reconnect attempt ${D} did not connect (${k.type})`
        : `Reconnect attempt ${idx} did not connect (${k.type}); next in ${retryDelayMs(idx)}ms`,
    );
  }
}
//@ chunk-fpvb8c85.js:12719-12738 placement
var weakMap = new WeakMap();
//@ chunk-fpvb8c85.js:12738-12771 placement
/**
 * 取某客户端待提交的重连记录。
 */
function pendingReconnect(n) {
  return weakMap.get(n);
}
//@ chunk-fpvb8c85.js:12771-13469 placement
/**
 * 提交重连后的客户端（配置变化时放弃）。
 */
function commitMcpReconnect(n, e, o, config) {
  let { setAppState, getDynamicMcpState, setDynamicMcpState } = n;
  let _ = isUnchangedRelistSkipOn();
  let M = false;
  let r = false;
  let v;
  setAppState((y) => {
    let found = y.mcp.clients.find((client) => client.name === e);
    let i = redecorateTools(found, o, config);
    if (i === undefined) {
      r = true;
      return y;
    }
    if (_ && found?.type === "connected" && sameServerTools(y.mcp.tools, e, i)) {
      M = true;
      v = {
        row: found,
        tools: i,
      };
      return y;
    }
    let x = replaceServerTools(y, e, i);
    M = x !== y;
    v =
      M && found !== undefined
        ? {
            row: found,
            tools: i,
          }
        : undefined;
    return x;
  });
  let dynamicMcpState = getDynamicMcpState();
  let found = dynamicMcpState.clients.find((client) => client.name === e);
  let h = redecorateTools(found, o, config);
  if (h === undefined) r = true;
  else if (_ && found?.type === "connected" && sameServerTools(dynamicMcpState.tools, e, h)) M = true;
  else {
    let chromeClient = findChromeClient(dynamicMcpState, e, h);
    if (chromeClient !== dynamicMcpState) {
      setDynamicMcpState(chromeClient);
      M = true;
    }
  }
  if (v !== undefined)
    if (found?.type === "pending") weakMap.set(v.row, v.tools);
    else weakMap.delete(v.row);
  if (r) logMCPDebug(e, "A re-queried tool list was not applied: another server holds the name");
  return M;
}
//@ chunk-fpvb8c85.js:13469-13512 placement
/**
 * 生成“提交重连”的回调。
 */
function makeCommitReconnect(n) {
  return (e, o, S) => commitMcpReconnect(n, e, o, S);
}
//@ chunk-fpvb8c85.js:13512-14736 placement
/**
 * 监视已连接客户端的断开并触发重连。
 */
function watchMcpDisconnects(n) {
  let { getAppState, getDynamicMcpState } = n.stores;
  let weakSet = new WeakSet();
  let weakMap = new WeakMap();
  return (E) => {
    for (let C of E) {
      if (C.type === "connected") weakMap.set(C.client, C);
      if (C.type !== "connected" || weakSet.has(C.client)) continue;
      weakSet.add(C.client);
      if (!C.capabilities?.tools?.listChanged) continue;
      let _ = C.name;
      mcpClientModule().onMcpToolListChanged(C, async (M) => {
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
          getDynamicMcpState().clients.find((client) => client.name === _);
        let v = weakMap.get(C.client) ?? C;
        let R =
          r !== undefined && serverCacheKey(_, r.config) === serverCacheKey(_, v.config)
            ? withConfigScope(v, r.config)
            : v;
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
        let newCount = T.newTools.length;
        let y = toolListingVerdict(T.newTools);
        let s = (previousCount) =>
          logEvent("tengu_mcp_list_changed", {
            mcpServerKeyHash: toolNameForTelemetry(_),
            type: lit("tools"),
            cause: refetchReasonTelemetry(M),
            previousCount,
            newCount,
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
  makeCommitReconnect,
  markServerDisabled,
  refusalStateFor,
  pendingReconnect,
  serverItemsOf,
  shouldCommitReconnect,
};
