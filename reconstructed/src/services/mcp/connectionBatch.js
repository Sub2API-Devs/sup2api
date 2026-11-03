/**
 * services/mcp/connectionBatch.ts
 *
 * MCP 批量连接、重试与插件/连接器去重（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zdgk9dc6.js (21)
 * attribution: placement 21
 */
import { getRecordedPhase, recordPhase } from "../../utils/startupTiming.js";
import { logError, logMCPDebug } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { identityEpoch, isCurrentIdentityEpoch } from "./identityChange.js";
import { env } from "../../utils/env.js";
import { setMcpConnectNonBlocking } from "../../bootstrap/state.js";
import { profileCheckpoint } from "../../utils/startupProfiler.js";
import { isBridgeEnvironment } from "../../utils/remoteEnvironment.js";
import { filterObject } from "../analytics/metadata.js";
import { isPluginServerConfig } from "./types.js";
import { toolTimeoutForServer } from "./mcpTimeouts.js";
import { wrapHandedListingChecks } from "./handedListingCheck.js";
import { printScopeExpansionNotice } from "./firstPartyDesignConsent.js";
import { identityChangedForRemote } from "./discoveryIdentity.js";
import {
  mcpDialBlockCause,
  isMcpServerDisabled,
  filterMcpServersByPolicy,
  getClaudeCodeMcpConfigs,
  getMcpServerSignature,
  dedupClaudeAiMcpServers,
  suppressedConnectorsEqual,
} from "./config.js";
import { isPolicyBlockedFailure, mcpGateError } from "./mcpToggleMessages.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { checkMcpServerHealth_2 } from "../../cli/handlers/mcp.js";
import { uniqBy } from "../../utils/collections.js";
import {
  isRetryableRemoteFailure,
  isProxyForbiddenFailure,
  isRetriableOrForbidden,
  excludeCommandsByServer,
  omitKey,
  commandBelongsToServer,
} from "./utils.js";
import { getCliOwnedState } from "./cliOwnedClients.js";
import { sleep } from "../../utils/sleep.js";
import { logEvent } from "../analytics/index.js";
import { getConnectTimeoutMs } from "./client.js";
import {
  clearClaudeAiConfigsFetch,
  resetClaudeAiSessionConnections,
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
} from "./claudeai.js";
import { isIneligibleClaudeAiProxy, isClaudeAiEligibilityCheckEnabled } from "./claudeAiEligibility.js";
import { setMcpOnClose } from "./mcpWireUtils.js";
import { getMcpPrefix, isToolFromMcpServer } from "./mcpStringUtils.js";
import { reject_default } from "../../../vendor/lodash-es/reject.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { isDiscoveryCacheOn } from "./mcpAccountKey.js";

//@ chunk-zdgk9dc6.js:5102-5171 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-zdgk9dc6.js:5171-5389 placement
function loadMcpClientModuleTimed(n) {
  let startTime = performance.now();
  try {
    let e = mcpClientModule();
    if (getRecordedPhase("mcp_client_module_load_ms") === undefined)
      recordPhase("mcp_client_module_load_ms", performance.now() - startTime, startTime);
    return e;
  } catch (error) {
    logError(error);
    logForDebugging(`[MCP] ${n} connect error: ${error}`);
    return;
  }
}
//@ chunk-zdgk9dc6.js:5389-5450 placement
/**
 * 连接重试的退避序列（500/1500/4000 毫秒）。
 */
var CONNECT_RETRY_BASE_MS = 1000;
var CONNECT_RETRY_DELAYS_MS = [500, 1500, 4000];
var reduced = CONNECT_RETRY_DELAYS_MS.reduce((acc, o) => acc + o, 0);
//@ chunk-zdgk9dc6.js:5450-6321 placement
function MCP_CONNECT_PHASES(n) {
  let {
    regularMcpConfigs,
    claudeaiConfigPromise,
    state,
    storageV5,
    credentials,
    dialInConnect,
    onDialStart,
    dialFirst,
    dialOptions,
    leaveAlwaysLoadWaitTo,
  } = n;
  let knownListings =
    n.knownListings &&
    xr(n.knownListings, (b) =>
      Array.isArray(b)
        ? {
            tools: b,
          }
        : b,
    );
  let epoch = identityEpoch();
  let nonBlocking = env.MCP_CONNECTION_NONBLOCKING !== false;
  setMcpConnectNonBlocking(nonBlocking);
  let deferConnect = nonBlocking;
  async function R() {
    profileCheckpoint("before_mcp_connect_user");
    profileCheckpoint("before_mcp_connect_connector");
    let b = connectMcpConfigServers({
      configs: regularMcpConfigs,
      label: "regular",
      nonBlocking,
      dialInConnect,
      onDialStart,
      dialFirst,
      dialOptions,
      state,
      storageV5,
      credentials,
      knownListings,
      leaveAlwaysLoadWaitTo,
    }).then(() => profileCheckpoint("after_mcp_connect_user"));
    let T = awaitConnectBatch(
      nonBlocking,
      () =>
        claudeaiConfigPromise
          .then((claudeaiConfigs) =>
            mountClaudeAiConnectors({
              claudeaiConfigs,
              regularMcpConfigs,
              state,
              deferConnect,
              storageV5,
              epoch,
            }),
          )
          .then((v) => (v === "superseded" ? [] : v)),
      "claude.ai connectors",
    ).then(() => profileCheckpoint("after_mcp_connect_connector"));
    await Promise.all([b, T]);
  }
  return {
    connect: R,
  };
}
//@ chunk-zdgk9dc6.js:6321-6416 placement
/**
 * 是否要先等 MCP 连接再进入输入（环境变量开启且有会话）。
 */
function shouldJoinBeforeInput(sdkUrl) {
  return (
    env.CLAUDE_CODE_MCP_ALWAYS_LOAD_JOIN_BEFORE_INPUT === true && Boolean(sdkUrl) && !isBridgeEnvironment()
  );
}
//@ chunk-zdgk9dc6.js:6416-7176 placement
/**
 * 连接 --mcp-config 指定的 MCP 服务器：alwaysLoad 或已有清单的视为必需并等待（动态 alwaysLoad 可交给调用方稍后等待），其余按 nonBlocking 决定是否后台连接。
 */
function connectMcpConfigServers(options) {
  let {
    configs,
    label,
    nonBlocking,
    state,
    storageV5,
    credentials,
    knownListings,
    dialInConnect,
    onDialStart,
    dialFirst,
    dialOptions,
    leaveAlwaysLoadWaitTo: isRequired,
  } = options;
  let requiredLater = (v, w) =>
    v.alwaysLoad === true || (knownListings !== undefined && Object.hasOwn(knownListings, w));
  let requiredNow =
    isRequired === undefined
      ? {}
      : filterObject(
          configs,
          (v, w) =>
            v.alwaysLoad === true &&
            v.scope === "dynamic" &&
            !isPluginServerConfig(v) &&
            !(knownListings !== undefined && Object.hasOwn(knownListings, w)),
        );
  let optional = filterObject(configs, (v, w) => requiredLater(v, w) && !Object.hasOwn(requiredNow, w));
  let hasRequired = filterObject(configs, (v, w) => !requiredLater(v, w));
  let T = Object.keys(optional).length > 0;
  if (Object.keys(requiredNow).length > 0) {
    let mcpServerBatch = connectMcpServerBatch(
      requiredNow,
      `${label}-required`,
      state,
      false,
      storageV5,
      credentials,
      knownListings,
      onDialStart,
      dialFirst,
      dialOptions,
    );
    isRequired?.(() => awaitConnectBatch(false, () => mcpServerBatch, "--mcp-config alwaysLoad servers"));
  }
  return Promise.all([
    ...(T
      ? [
          awaitConnectBatch(
            false,
            () =>
              connectMcpServerBatch(
                optional,
                `${label}-required`,
                state,
                false,
                storageV5,
                credentials,
                knownListings,
                onDialStart,
                dialFirst,
                dialOptions,
              ),
            "--mcp-config alwaysLoad servers",
          ),
        ]
      : []),
    awaitConnectBatch(
      nonBlocking,
      () =>
        connectMcpServerBatch(
          hasRequired,
          label,
          state,
          nonBlocking && !dialInConnect,
          storageV5,
          credentials,
          knownListings,
          onDialStart,
          dialFirst,
          dialOptions,
        ),
      "--mcp-config servers",
    ),
  ]).then(() => {});
}
//@ chunk-zdgk9dc6.js:7176-8638 placement
function connectMcpServerBatch(
  n,
  o,
  state,
  y = false,
  storageV5,
  credentials,
  knownListings,
  onDialStart,
  dialFirst,
  dialOptions,
) {
  let keys = Object.keys(n);
  if (keys.length === 0) return [];
  let S = knownListings && xr(knownListings, (v) => v.tools);
  state.applyMcpUpdate((v) => ({
    ...v,
    clients: [
      ...v.clients,
      ...Object.entries(n).map(([key, value]) => ({
        name: key,
        type: "pending",
        config: value,
      })),
    ],
  }));
  let M = new Map();
  let mapped = keys.map((v) => new Promise((resolve) => M.set(v, resolve)));
  let deferred = Promise.withResolvers();
  let R = new Set();
  let b = (v) => {
    for (let key of Object.keys(v)) R.add(key);
    retryRemoteMcpServers(v, state, storageV5, undefined, deferred.promise)
      .catch((error) => logForDebugging(`[MCP] ${o} retry error: ${error}`))
      .finally(() => {
        for (let key of Object.keys(v)) R.delete(key);
      });
  };
  let T = () => {
    let dialer = loadMcpClientModuleTimed(o);
    if (!dialer) {
      for (let k of M.values()) k();
      return;
    }
    if (onDialStart !== undefined && keys.some((k) => !Object.hasOwn(S ?? {}, k))) onDialStart();
    let w =
      dialFirst === undefined
        ? n
        : {
            ...filterObject(n, (k, P) => dialFirst(P)),
            ...n,
          };
    dialer
      .getMcpToolsCommandsAndResources(
        (k) => {
          let { client } = k;
          let I = Object.hasOwn(knownListings ?? {}, client.name) ? knownListings?.[client.name] : undefined;
          let handshake = I?.handshake;
          if (client.type === "cached" && I !== undefined) client.listedByHost = true;
          if (client.type === "cached" && handshake !== undefined) {
            client.capabilities = handshake.capabilities;
            client.serverInfo = {
              name: handshake.serverInfo.name,
              version: handshake.serverInfo.version,
            };
            let j = dialer.capMcpInstructions(
              handshake.instructions,
              client.name,
              toolTimeoutForServer(client.config),
            );
            if (j !== undefined) client.instructions = j;
          }
          if (client.type === "cached" && I?.comparedBeforeUse)
            wrapHandedListingChecks(client, k.tools, I.tools, dialer, handshake !== undefined);
          applyConnectionResult(state, k);
          printScopeExpansionNotice();
          let { name: E } = k.client;
          M.get(E)?.();
          if (!R.has(E)) {
            let j = filterObject(n, (le, X) => X === E);
            if (findReusableClients(j, state).length > 0) b(j);
          }
        },
        w,
        storageV5,
        credentials,
        S,
        true,
        undefined,
        dialOptions,
      )
      .catch((error) => logForDebugging(`[MCP] ${o} connect error: ${error}`))
      .finally(() => {
        for (let k of M.values()) k();
        deferred.resolve(performance.now());
        b(filterObject(n, (k, P) => !R.has(P)));
      });
  };
  if (y) setImmediate(T);
  else T();
  return mapped;
}
//@ chunk-zdgk9dc6.js:8638-10341 placement
function applyConnectionResult(n, o) {
  let { client, tools, commands, attemptEpoch } = o;
  let u;
  let m = "applied";
  let s = identityChangedForRemote(client.config, attemptEpoch);
  n.applyMcpUpdate((h) => {
    m = "applied";
    u = undefined;
    let name = h.clients.find((client_2) => client_2.name === client.name);
    if (
      !name ||
      (name.config !== client.config && !mcpClientModule().areMcpConfigsEqual(name.config, client.config))
    ) {
      if (client.type === "connected") {
        logMCPDebug(
          client.name,
          name
            ? "applyConnectionResult: disposing orphaned connect (slot config changed mid-flight)"
            : "applyConnectionResult: disposing orphaned connect (slot removed mid-flight)",
        );
        u = () => discardClient(client);
      }
      m = "dropped";
      return h;
    }
    if (s) {
      logMCPDebug(
        client.name,
        "applyConnectionResult: settlement superseded by an account switch \u2014 closed, not installed (the identity boundary owns the row)",
      );
      if (client.type === "connected")
        u = () => {
          mcpClientModule()
            .detachAndCloseConnection(client)
            .catch(() => {});
        };
      m = "superseded";
      return h;
    }
    let S =
      client.type !== "failed" && client.type !== "disabled"
        ? mcpDialBlockCause(client.name, client.config)
        : null;
    if (
      S !== "managed-policy" &&
      !isPolicyBlockedFailure(client) &&
      isMcpServerDisabled(client.name) &&
      client.type !== "disabled"
    ) {
      let M = client.type === "connected" && name.type === "connected" && name.client === client.client;
      if (client.type === "connected" && !M) {
        logMCPDebug(client.name, "applyConnectionResult: disposing connect that settled after a disable");
        u = () => discardClient(client);
      }
      m = "refused";
      if (name.type === "disabled" || (name.type === "connected" && isConnectedOrCached(client))) return h;
      return replaceClientInState(h, {
        name: client.name,
        type: "disabled",
        config: name.config,
      });
    }
    if (S) {
      if (client.type === "connected")
        logMCPDebug(client.name, `applyConnectionResult: disposing connect that settled after a ${S} deny`);
      u = () => {
        if (client.type === "connected") discardClient(client);
        mcpClientModule()
          .dropDiscoveryEntry(client.name, client.config)
          .catch(() => {});
      };
      m = "refused";
      return replaceClientInState(h, {
        name: client.name,
        type: "failed",
        config: name.config,
        ...mcpGateError(S, client.name, client.config),
      });
    }
    if (!checkMcpServerHealth_2(name, client)) {
      m = "dropped";
      return h;
    }
    return {
      ...h,
      clients: h.clients.map((client_2) => (client_2.name === client.name ? client : client_2)),
      tools: uniqBy([...h.tools, ...tools], (M) => M.name),
      commands: uniqBy([...h.commands, ...commands], (M) => M.name),
    };
  });
  u?.();
  return m;
}
//@ chunk-zdgk9dc6.js:10341-10534 placement
/**
 * 找出配置未变且客户端已连接（或可接受的失败状态）的服务器，可直接复用而无需重连。
 */
function findReusableClients(n, o, e = true) {
  let clients = o.getClients();
  return Object.entries(n).filter(([key, value]) => {
    let found = clients.find((m) => m.name === key);
    return (
      found !== undefined &&
      (isRetryableRemoteFailure(found) || (e && isProxyForbiddenFailure(found))) &&
      mcpClientModule().areMcpConfigsEqual(found.config, value)
    );
  });
}
//@ chunk-zdgk9dc6.js:10534-10710 placement
/**
 * 登记一组服务器正处于瞬时错误重试轮次中，返回可 dispose 的对象在结束时撤销。
 */
function trackTransientRetryPass(n) {
  let o = (e) => {
    let transientRetryPasses = getCliOwnedState().transientRetryPasses;
    for (let r of n) {
      let p = (transientRetryPasses.get(r) ?? 0) + e;
      if (p > 0) transientRetryPasses.set(r, p);
      else transientRetryPasses.delete(r);
    }
  };
  o(1);
  return {
    [Symbol.dispose]: () => o(-1),
  };
}
//@ chunk-zdgk9dc6.js:10710-12322 placement
async function retryRemoteMcpServers(n, o, e, y = (p) => applyConnectionResult(o, p), promise) {
  let p = () => findReusableClients(n, o);
  if (p().length === 0) return;
  using u = trackTransientRetryPass(Object.keys(n));
  let m = identityEpoch();
  let { signal } = o;
  let startTime = performance.now();
  let c = 0;
  for (let [M, _] of CONNECT_RETRY_DELAYS_MS.entries()) {
    let L = M === CONNECT_RETRY_DELAYS_MS.length - 1;
    await sleep(_, signal);
    if (promise !== undefined && L) {
      let P = (await promise) + reduced + c;
      await sleep(Math.max(0, P - performance.now()), signal);
    }
    if (signal?.aborted) return;
    if (identityEpoch() !== m) {
      logForDebugging(
        "[MCP] Retry: identity changed during backoff, stopping (these rows belong to the previous account)",
      );
      return;
    }
    let reusableClients = findReusableClients(n, o, L);
    if (reusableClients.length === 0) {
      if (p().length > 0) continue;
      logForDebugging("[MCP] Retry: all remote servers recovered, stopping");
      return;
    }
    logForDebugging(
      `[MCP] Retry attempt ${M + 1}: ${reusableClients.length} transiently-failed remote server(s)`,
    );
    let b = [];
    for (let reusableClient of reusableClients) {
      if (!(await mcpClientModule().discardMemoizedConnectResult(...reusableClient))) continue;
      let [I, A] = reusableClient;
      let E = mcpDialBlockCause(I, A);
      if (E) {
        y({
          client: {
            name: I,
            type: "failed",
            config: A,
            ...mcpGateError(E, I, A),
          },
          tools: [],
          commands: [],
          attemptEpoch: m,
        });
        continue;
      }
      b.push(reusableClient);
    }
    if (b.length === 0 || signal?.aborted) continue;
    let T = 0;
    let v = 0;
    let startTime_2 = performance.now();
    let sincePassStartMs = Math.round(startTime_2 - startTime);
    await mcpClientModule().getMcpToolsCommandsAndResources(
      (P) => {
        if (!signal?.aborted) {
          y(P);
          if (P.client.type === "connected") T++;
          else if (isRetriableOrForbidden(P.client)) v++;
        } else if (P.client.type === "connected")
          mcpClientModule()
            .detachAndCloseConnection(P.client)
            .catch(() => {});
      },
      Object.fromEntries(b),
      e,
    );
    c += performance.now() - startTime_2;
    if (!signal?.aborted)
      logEvent("tengu_mcp_connect_retry_attempt", {
        attempt: M + 1,
        delayMs: _,
        sincePassStartMs,
        retryable: reusableClients.length,
        dialed: b.length,
        recovered: T,
        stillRetryable: v,
      });
    if (p().length === 0) {
      logForDebugging("[MCP] Retry: all remote servers recovered, stopping");
      return;
    }
  }
  let S = p();
  if (S.length > 0)
    logForDebugging(
      `[MCP] Retry: ${S.length} remote server(s) still failed after all retries: ${S.map(([M]) => M).join(", ")}`,
    );
}
//@ chunk-zdgk9dc6.js:12322-13112 placement
/**
 * 等待一批 MCP 连接：非阻塞时直接后台运行；否则在截止时间内等配置获取完成，再逐个等待拨号，超时只记日志、后台继续连接。
 */
async function awaitConnectBatch(nonBlocking, startBatch, label) {
  if (nonBlocking) {
    Promise.resolve(startBatch()).catch(() => {});
    logForDebugging(`[MCP] ${label} running fully async (nonblocking)`);
    return;
  }
  let batch = startBatch();
  let now = Date.now();
  let deadlineMs = getConnectTimeoutMs();
  let dials;
  if (Array.isArray(batch)) dials = batch;
  else {
    let c;
    let winner = await Promise.race([
      batch.catch((error) => {
        logError(error);
        return "failed";
      }),
      new Promise((resolve) => {
        c = setTimeout((_) => _("deadline"), deadlineMs, resolve);
      }),
    ]);
    clearTimeout(c);
    if (winner === "deadline") {
      logForDebugging(
        `[MCP] ${label} config fetch not ready after ${deadlineMs}ms \u2014 proceeding; background connection continues`,
      );
      return;
    }
    if (winner === "failed") {
      logForDebugging(`[MCP] ${label} batch failed to start \u2014 proceeding without waiting on it`);
      return;
    }
    dials = winner;
  }
  let max = Math.max(0, deadlineMs - (Date.now() - now));
  if (dials.length === 0) return;
  let mcpClientModuleTimed = loadMcpClientModuleTimed(label);
  if (!mcpClientModuleTimed) return;
  let h = await mcpClientModuleTimed.awaitEachWithDeadline(dials, max);
  if (h > 0)
    logForDebugging(
      `[MCP] ${label}: ${h}/${dials.length} not ready after ${deadlineMs}ms \u2014 proceeding; background connection continues`,
    );
}
//@ chunk-zdgk9dc6.js:13112-13767 placement
function fetchClaudeAiConnectors(n, storageV5, credentials) {
  clearClaudeAiConfigsFetch();
  resetClaudeAiSessionConnections();
  let y = identityEpoch();
  let r = (async () => {
    let claudeAiConfigs = await fetchClaudeAiConfigsOnce(credentials);
    if (!isCurrentIdentityEpoch(y)) return supersededByAccountSwitch("list fetch");
    let { allowed, blocked } = filterMcpServersByPolicy(claudeAiConfigs);
    printClaudeAiConnectorNotice();
    if (blocked.length > 0)
      logForDebugging(
        `[MCP] claude.ai connectors blocked by enterprise policy after account switch: ${blocked.join(", ")}`,
      );
    let s = await restorableSuppressedPlugins(n, storageV5);
    let regularMcpConfigs = Object.fromEntries([
      ...Object.entries(s),
      ...n
        .getClients()
        .filter((c) => c.config.scope !== "claudeai")
        .map((c) => [c.name, c.config]),
    ]);
    return mountClaudeAiConnectors({
      claudeaiConfigs: allowed,
      regularMcpConfigs,
      state: n,
      deferConnect: false,
      storageV5,
      epoch: y,
      restorablePlugins: s,
    });
  })();
  return {
    mounted: r.then((p) => (p === "superseded" ? p : "mounted")),
    settled: r.then((p) => (p === "superseded" ? [] : Promise.all(p))).then(() => {}),
  };
}
//@ chunk-zdgk9dc6.js:13767-13896 placement
function supersededByAccountSwitch(n) {
  logForDebugging(
    `[MCP] claude.ai connector list superseded by an account switch (${n}) \u2014 not mounting`,
  );
  return "superseded";
}
//@ chunk-zdgk9dc6.js:13896-14130 placement
async function mountClaudeAiConnectors(n) {
  if (!isCurrentIdentityEpoch(n.epoch)) return supersededByAccountSwitch("list fetch");
  let o = await dedupPluginServersAgainstConnectors(n);
  if (!isCurrentIdentityEpoch(n.epoch)) return supersededByAccountSwitch("dedup");
  return [
    ...restorePluginServers(n.restorablePlugins ?? {}, o.suppressedPlugins, n.state, n.storageV5),
    ...connectDedupedConnectors(o, n.state, n.deferConnect, n.storageV5),
  ];
}
//@ chunk-zdgk9dc6.js:14130-14612 placement
/**
 * 找出仍可恢复的被抑制插件服务器：插件仍安装启用的返回其配置，已不存在的从抑制列表中移除。
 */
async function restorableSuppressedPlugins(n, storageV5) {
  let suppressedPluginServers = n.getSuppressedPluginServers();
  if (suppressedPluginServers.length === 0) return {};
  let { servers } = await getClaudeCodeMcpConfigs(
    {},
    {
      storageV5,
    },
  );
  let r = {};
  let p = new Set();
  for (let u of suppressedPluginServers) {
    let m = servers[u];
    if (m && m.pluginSource !== undefined) r[u] = m;
    else p.add(u);
  }
  if (p.size > 0) {
    logForDebugging(
      `[MCP] Dropping ${p.size} suppressed plugin server(s) whose plugin is no longer installed/enabled: ${[...p].join(", ")}`,
    );
    n.applyMcpUpdate((u) => ({
      ...u,
      suppressedPluginMcpServers: (u.suppressedPluginMcpServers ?? []).filter((m) => !p.has(m)),
    }));
  }
  return r;
}
//@ chunk-zdgk9dc6.js:14612-15123 placement
/**
 * 账号切换后不再与 claude.ai 连接器重复的插件服务器：从抑制列表移除并重新连接。
 */
function restorePluginServers(restorable, stillSuppressed, mcpState, storageV5) {
  let connectedNames = new Set(mcpState.getClients().map((s) => s.name));
  let restoredNames = new Set();
  let toConnect = {};
  for (let [key, value] of Object.entries(restorable)) {
    if (stillSuppressed.has(key)) continue;
    restoredNames.add(key);
    if (!connectedNames.has(key)) toConnect[key] = value;
  }
  if (restoredNames.size === 0) return [];
  mcpState.applyMcpUpdate((s) => ({
    ...s,
    suppressedPluginMcpServers: (s.suppressedPluginMcpServers ?? []).filter((h) => !restoredNames.has(h)),
  }));
  let keys = Object.keys(toConnect);
  if (keys.length > 0)
    logForDebugging(
      `[MCP] Restoring ${keys.length} plugin server(s) no longer duplicated by claude.ai connectors after account switch: ${keys.join(", ")}`,
    );
  return connectMcpServerBatch(toConnect, "plugin-restore", mcpState, false, storageV5);
}
//@ chunk-zdgk9dc6.js:15123-16567 placement
async function dedupPluginServersAgainstConnectors(n) {
  let { claudeaiConfigs, regularMcpConfigs, state } = n;
  let r = new Set();
  if (Object.keys(claudeaiConfigs).length > 0) {
    let u = new Set();
    let m = new Set();
    for (let c of Object.values(claudeaiConfigs)) {
      let mcpServerSignature = getMcpServerSignature(c);
      if (mcpServerSignature) (isIneligibleClaudeAiProxy(c) ? m : u).add(mcpServerSignature);
    }
    let s = [];
    let h;
    for (let [key, value] of Object.entries(regularMcpConfigs)) {
      if (!key.startsWith("plugin:")) continue;
      let mcpServerSignature = getMcpServerSignature(value);
      if (!mcpServerSignature) continue;
      if (u.has(mcpServerSignature)) r.add(key);
      else if (m.has(mcpServerSignature)) {
        s.push(key);
        h ??= isClaudeAiEligibilityCheckEnabled();
        if (!h) r.add(key);
      }
    }
    if (s.length > 0)
      logEvent("tengu_mcp_plugin_beside_ineligible_connector", {
        plugin_server_count: s.length,
        kept: h,
      });
    if (h)
      logForDebugging(
        `[MCP] Lazy dedup: keeping ${s.length} plugin server(s) whose only duplicate claude.ai connectors are ineligible: ${s.join(", ")}`,
      );
    if (r.size > 0) {
      logForDebugging(
        `[MCP] Lazy dedup: suppressing ${r.size} plugin server(s) that duplicate claude.ai connectors: ${[...r].join(", ")}`,
      );
      for (let c of state.getClients()) {
        if (!r.has(c.name) || !(isConnectedOrCached(c) || c.type === "pending")) continue;
        if (c.type === "connected") {
          setMcpOnClose(c, undefined);
          mcpClientModule()
            .clearServerCache(c.name, c.config)
            .catch(() => {});
        } else mcpClientModule().disposeServerConnectionDetached(c.name, c.config);
      }
      state.applyMcpUpdate((c) => {
        let { clients, tools, commands, resources } = c;
        clients = clients.filter((client) => !r.has(client.name));
        tools = tools.filter((tool) => !tool.mcpInfo || !r.has(tool.mcpInfo.serverName));
        for (let b of r) {
          commands = excludeCommandsByServer(commands, b);
          resources = omitKey(resources, b);
        }
        let suppressedPluginMcpServers = [
          ...(c.suppressedPluginMcpServers ?? []).filter((b) => !r.has(b)),
          ...r,
        ];
        return {
          ...c,
          clients,
          tools,
          commands,
          resources,
          suppressedPluginMcpServers,
        };
      });
    }
  }
  let manualServers = filterObject(regularMcpConfigs, (u, m) => !m.startsWith("plugin:"));
  return {
    ...(await dedupClaudeAiMcpServers(claudeaiConfigs, manualServers)),
    suppressedPlugins: r,
  };
}
//@ chunk-zdgk9dc6.js:16567-16745 placement
function connectDedupedConnectors({ servers, suppressed }, state, deferConnect, storageV5) {
  state.applyMcpUpdate((p) =>
    suppressedConnectorsEqual(p.suppressedClaudeAiConnectors ?? [], suppressed)
      ? p
      : {
          ...p,
          suppressedClaudeAiConnectors: suppressed,
        },
  );
  return connectMcpServerBatch(servers, "claudeai", state, deferConnect, storageV5);
}
//@ chunk-zdgk9dc6.js:16745-17001 placement
function replaceClientInState(n, o) {
  let mcpPrefix = getMcpPrefix(o.name);
  return {
    ...n,
    clients: n.clients.map((client) => (client.name === o.name ? o : client)),
    tools: reject_default(n.tools, (y) => isToolFromMcpServer(y, o.name, mcpPrefix)),
    commands: reject_default(n.commands, (y) => commandBelongsToServer(y, o.name)),
    resources: omitKeys(n.resources, o.name),
    resourceTemplates: omitKeys(n.resourceTemplates, o.name),
  };
}
//@ chunk-zdgk9dc6.js:17001-17115 placement
function discardClient(client) {
  if (isDiscoveryCacheOn()) setMcpOnClose(client, undefined);
  client.cleanup().catch(() => {});
  mcpClientModule()
    .clearServerCache(client.name, client.config)
    .catch(() => {});
}
export {
  MCP_CONNECT_PHASES,
  shouldJoinBeforeInput,
  connectMcpConfigServers,
  CONNECT_RETRY_BASE_MS,
  applyConnectionResult,
  findReusableClients,
  retryRemoteMcpServers,
  fetchClaudeAiConnectors,
  trackTransientRetryPass,
  CONNECT_RETRY_DELAYS_MS,
};
