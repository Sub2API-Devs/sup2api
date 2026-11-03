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
import { n5e, Br } from "../../utils/startupTiming.js";
import { logError, logMCPDebug } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { identityEpoch, isCurrentIdentityEpoch } from "./identityChange.js";
import { env } from "../../utils/env.js";
import { setMcpConnectNonBlocking } from "../../bootstrap/state.js";
import { profileCheckpoint } from "../../utils/startupProfiler.js";
import { vS } from "../../utils/remoteEnvironment.js";
import { filterObject } from "../analytics/metadata.js";
import { isPluginServerConfig } from "./types.js";
import { TB } from "./mcpTimeouts.js";
import { wrapHandedListingChecks } from "./handedListingCheck.js";
import { Pzs } from "./firstPartyDesignConsent.js";
import { R_t } from "./discoveryIdentity.js";
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
  Bfn,
  excludeCommandsByServer,
  $jt,
  commandBelongsToServer,
} from "./utils.js";
import { ht } from "./cliOwnedClients.js";
import { sleep } from "../../utils/sleep.js";
import { logEvent } from "../analytics/index.js";
import { A4e } from "./client.js";
import {
  clearClaudeAiConfigsFetch,
  resetClaudeAiSessionConnections,
  fetchClaudeAiConfigsOnce,
  printClaudeAiConnectorNotice,
} from "./claudeai.js";
import { isIneligibleClaudeAiProxy, isClaudeAiEligibilityCheckEnabled } from "./claudeAiEligibility.js";
import { setMcpOnClose } from "./mcpWireUtils.js";
import { getMcpPrefix, isToolFromMcpServer } from "./mcpStringUtils.js";
import { zj } from "../../../vendor/lodash-es/reject.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { fd } from "./mcpAccountKey.js";

//@ chunk-zdgk9dc6.js:5102-5171 placement
function O() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-zdgk9dc6.js:5171-5389 placement
function loadMcpClientModuleTimed(n) {
  let startTime = performance.now();
  try {
    let e = O();
    if (n5e("mcp_client_module_load_ms") === void 0)
      Br("mcp_client_module_load_ms", performance.now() - startTime, startTime);
    return e;
  } catch (error) {
    (logError(error), logForDebugging(`[MCP] ${n} connect error: ${error}`));
    return;
  }
}
//@ chunk-zdgk9dc6.js:5389-5450 placement
var PCs = 1000,
  Sen = [500, 1500, 4000],
  reduced = Sen.reduce((n, o) => n + o, 0);
//@ chunk-zdgk9dc6.js:5450-6321 placement
function MCP_CONNECT_PHASES(n) {
  let {
      regularMcpConfigs: regularMcpConfigs,
      claudeaiConfigPromise: claudeaiConfigPromise,
      state: state,
      storageV5: storageV5,
      credentials: credentials,
      dialInConnect: dialInConnect,
      onDialStart: onDialStart,
      dialFirst: dialFirst,
      dialOptions: dialOptions,
      leaveAlwaysLoadWaitTo: leaveAlwaysLoadWaitTo,
    } = n,
    S = n.knownListings && xr(n.knownListings, (b) => (Array.isArray(b) ? { tools: b } : b)),
    M = identityEpoch(),
    _ = env.MCP_CONNECTION_NONBLOCKING !== !1;
  setMcpConnectNonBlocking(_);
  let L = _;
  async function R() {
    (profileCheckpoint("before_mcp_connect_user"), profileCheckpoint("before_mcp_connect_connector"));
    let b = connectMcpConfigServers({
        configs: regularMcpConfigs,
        label: "regular",
        nonBlocking: _,
        dialInConnect: dialInConnect,
        onDialStart: onDialStart,
        dialFirst: dialFirst,
        dialOptions: dialOptions,
        state: state,
        storageV5: storageV5,
        credentials: credentials,
        knownListings: S,
        leaveAlwaysLoadWaitTo: leaveAlwaysLoadWaitTo,
      }).then(() => profileCheckpoint("after_mcp_connect_user")),
      T = awaitConnectBatch(
        _,
        () =>
          claudeaiConfigPromise
            .then((v) =>
              mountClaudeAiConnectors({
                claudeaiConfigs: v,
                regularMcpConfigs: regularMcpConfigs,
                state: state,
                deferConnect: L,
                storageV5: storageV5,
                epoch: M,
              }),
            )
            .then((v) => (v === "superseded" ? [] : v)),
        "claude.ai connectors",
      ).then(() => profileCheckpoint("after_mcp_connect_connector"));
    await Promise.all([b, T]);
  }
  return { connect: R };
}
//@ chunk-zdgk9dc6.js:6321-6416 placement
function OCs(n) {
  return env.CLAUDE_CODE_MCP_ALWAYS_LOAD_JOIN_BEFORE_INPUT === !0 && Boolean(n) && !vS();
}
/**
 * 连接 --mcp-config 指定的 MCP 服务器：alwaysLoad 或已有清单的视为必需并等待（动态 alwaysLoad 可交给调用方稍后等待），其余按 nonBlocking 决定是否后台连接。
 */
//@ chunk-zdgk9dc6.js:6416-7176 placement
function connectMcpConfigServers(options) {
  let {
      configs: configs,
      label: label,
      nonBlocking: nonBlocking,
      state: state,
      storageV5: storageV5,
      credentials: credentials,
      knownListings: knownListings,
      dialInConnect: dialInConnect,
      onDialStart: onDialStart,
      dialFirst: dialFirst,
      dialOptions: dialOptions,
      leaveAlwaysLoadWaitTo: isRequired,
    } = options,
    requiredLater = (v, w) =>
      v.alwaysLoad === !0 || (knownListings !== void 0 && Object.hasOwn(knownListings, w)),
    requiredNow =
      isRequired === void 0
        ? {}
        : filterObject(
            configs,
            (v, w) =>
              v.alwaysLoad === !0 &&
              v.scope === "dynamic" &&
              !isPluginServerConfig(v) &&
              !(knownListings !== void 0 && Object.hasOwn(knownListings, w)),
          ),
    optional = filterObject(configs, (v, w) => requiredLater(v, w) && !Object.hasOwn(requiredNow, w)),
    hasRequired = filterObject(configs, (v, w) => !requiredLater(v, w)),
    T = Object.keys(optional).length > 0;
  if (Object.keys(requiredNow).length > 0) {
    let v = connectMcpServerBatch(
      requiredNow,
      `${label}-required`,
      state,
      !1,
      storageV5,
      credentials,
      knownListings,
      onDialStart,
      dialFirst,
      dialOptions,
    );
    isRequired?.(() => awaitConnectBatch(!1, () => v, "--mcp-config alwaysLoad servers"));
  }
  return Promise.all([
    ...(T
      ? [
          awaitConnectBatch(
            !1,
            () =>
              connectMcpServerBatch(
                optional,
                `${label}-required`,
                state,
                !1,
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
function connectMcpServerBatch(n, o, e, y = !1, r, p, u, m, s, h) {
  let keys = Object.keys(n);
  if (keys.length === 0) return [];
  let S = u && xr(u, (v) => v.tools);
  e.applyMcpUpdate((v) => ({
    ...v,
    clients: [...v.clients, ...Object.entries(n).map(([w, k]) => ({ name: w, type: "pending", config: k }))],
  }));
  let M = new Map(),
    mapped = keys.map((v) => new Promise((w) => M.set(v, w))),
    withResolvers = Promise.withResolvers(),
    R = new Set(),
    b = (v) => {
      for (let w of Object.keys(v)) R.add(w);
      retryRemoteMcpServers(v, e, r, void 0, withResolvers.promise)
        .catch((w) => logForDebugging(`[MCP] ${o} retry error: ${w}`))
        .finally(() => {
          for (let w of Object.keys(v)) R.delete(w);
        });
    },
    T = () => {
      let v = loadMcpClientModuleTimed(o);
      if (!v) {
        for (let k of M.values()) k();
        return;
      }
      if (m !== void 0 && keys.some((k) => !Object.hasOwn(S ?? {}, k))) m();
      let w = s === void 0 ? n : { ...filterObject(n, (k, P) => s(P)), ...n };
      v.getMcpToolsCommandsAndResources(
        (k) => {
          let { client: client } = k,
            I = Object.hasOwn(u ?? {}, client.name) ? u?.[client.name] : void 0,
            A = I?.handshake;
          if (client.type === "cached" && I !== void 0) client.listedByHost = !0;
          if (client.type === "cached" && A !== void 0) {
            ((client.capabilities = A.capabilities),
              (client.serverInfo = { name: A.serverInfo.name, version: A.serverInfo.version }));
            let capMcpInstructions = v.capMcpInstructions(A.instructions, client.name, TB(client.config));
            if (capMcpInstructions !== void 0) client.instructions = capMcpInstructions;
          }
          if (client.type === "cached" && I?.comparedBeforeUse)
            wrapHandedListingChecks(client, k.tools, I.tools, v, A !== void 0);
          (applyConnectionResult(e, k), Pzs());
          let { name: E } = k.client;
          if ((M.get(E)?.(), !R.has(E))) {
            let j = filterObject(n, (le, X) => X === E);
            if (findReusableClients(j, e).length > 0) b(j);
          }
        },
        w,
        r,
        p,
        S,
        !0,
        void 0,
        h,
      )
        .catch((k) => logForDebugging(`[MCP] ${o} connect error: ${k}`))
        .finally(() => {
          for (let k of M.values()) k();
          (withResolvers.resolve(performance.now()), b(filterObject(n, (k, P) => !R.has(P))));
        });
    };
  if (y) setImmediate(T);
  else T();
  return mapped;
}
//@ chunk-zdgk9dc6.js:8638-10341 placement
function applyConnectionResult(n, o) {
  let { client: client, tools: tools, commands: commands, attemptEpoch: attemptEpoch } = o,
    u,
    m = "applied",
    s = R_t(client.config, attemptEpoch);
  return (
    n.applyMcpUpdate((h) => {
      ((m = "applied"), (u = void 0));
      let found = h.clients.find((client_2) => client_2.name === client.name);
      if (
        !found ||
        (found.config !== client.config && !O().areMcpConfigsEqual(found.config, client.config))
      ) {
        if (client.type === "connected")
          (logMCPDebug(
            client.name,
            found
              ? "applyConnectionResult: disposing orphaned connect (slot config changed mid-flight)"
              : "applyConnectionResult: disposing orphaned connect (slot removed mid-flight)",
          ),
            (u = () => discardClient(client)));
        return ((m = "dropped"), h);
      }
      if (s) {
        if (
          (logMCPDebug(
            client.name,
            "applyConnectionResult: settlement superseded by an account switch \u2014 closed, not installed (the identity boundary owns the row)",
          ),
          client.type === "connected")
        )
          u = () => {
            O()
              .detachAndCloseConnection(client)
              .catch(() => {});
          };
        return ((m = "superseded"), h);
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
        let M = client.type === "connected" && found.type === "connected" && found.client === client.client;
        if (client.type === "connected" && !M)
          (logMCPDebug(client.name, "applyConnectionResult: disposing connect that settled after a disable"),
            (u = () => discardClient(client)));
        if (
          ((m = "refused"),
          found.type === "disabled" || (found.type === "connected" && isConnectedOrCached(client)))
        )
          return h;
        return replaceClientInState(h, { name: client.name, type: "disabled", config: found.config });
      }
      if (S) {
        if (client.type === "connected")
          logMCPDebug(client.name, `applyConnectionResult: disposing connect that settled after a ${S} deny`);
        return (
          (u = () => {
            if (client.type === "connected") discardClient(client);
            O()
              .dropDiscoveryEntry(client.name, client.config)
              .catch(() => {});
          }),
          (m = "refused"),
          replaceClientInState(h, {
            name: client.name,
            type: "failed",
            config: found.config,
            ...mcpGateError(S, client.name, client.config),
          })
        );
      }
      if (!checkMcpServerHealth_2(found, client)) return ((m = "dropped"), h);
      return {
        ...h,
        clients: h.clients.map((client_2) => (client_2.name === client.name ? client : client_2)),
        tools: uniqBy([...h.tools, ...tools], (M) => M.name),
        commands: uniqBy([...h.commands, ...commands], (M) => M.name),
      };
    }),
    u?.(),
    m
  );
}
/**
 * 找出配置未变且客户端已连接（或可接受的失败状态）的服务器，可直接复用而无需重连。
 */
//@ chunk-zdgk9dc6.js:10341-10534 placement
function findReusableClients(n, o, e = !0) {
  let clients = o.getClients();
  return Object.entries(n).filter(([r, p]) => {
    let found = clients.find((m) => m.name === r);
    return (
      found !== void 0 &&
      (isRetryableRemoteFailure(found) || (e && isProxyForbiddenFailure(found))) &&
      O().areMcpConfigsEqual(found.config, p)
    );
  });
}
/**
 * 登记一组服务器正处于瞬时错误重试轮次中，返回可 dispose 的对象在结束时撤销。
 */
//@ chunk-zdgk9dc6.js:10534-10710 placement
function trackTransientRetryPass(n) {
  let o = (e) => {
    let transientRetryPasses = ht().transientRetryPasses;
    for (let r of n) {
      let p = (transientRetryPasses.get(r) ?? 0) + e;
      if (p > 0) transientRetryPasses.set(r, p);
      else transientRetryPasses.delete(r);
    }
  };
  return (o(1), { [Symbol.dispose]: () => o(-1) });
}
//@ chunk-zdgk9dc6.js:10710-12322 placement
async function retryRemoteMcpServers(n, o, e, y = (p) => applyConnectionResult(o, p), r) {
  let p = () => findReusableClients(n, o);
  if (p().length === 0) return;
  using u = trackTransientRetryPass(Object.keys(n));
  let m = identityEpoch(),
    { signal: signal } = o,
    startTime = performance.now(),
    c = 0;
  for (let [M, _] of Sen.entries()) {
    let L = M === Sen.length - 1;
    if ((await sleep(_, signal), r !== void 0 && L)) {
      let P = (await r) + reduced + c;
      await sleep(Math.max(0, P - performance.now()), signal);
    }
    if (signal?.aborted) return;
    if (identityEpoch() !== m) {
      logForDebugging(
        "[MCP] Retry: identity changed during backoff, stopping (these rows belong to the previous account)",
      );
      return;
    }
    let R = findReusableClients(n, o, L);
    if (R.length === 0) {
      if (p().length > 0) continue;
      logForDebugging("[MCP] Retry: all remote servers recovered, stopping");
      return;
    }
    logForDebugging(`[MCP] Retry attempt ${M + 1}: ${R.length} transiently-failed remote server(s)`);
    let b = [];
    for (let P of R) {
      if (!(await O().discardMemoizedConnectResult(...P))) continue;
      let [I, A] = P,
        E = mcpDialBlockCause(I, A);
      if (E) {
        y({
          client: { name: I, type: "failed", config: A, ...mcpGateError(E, I, A) },
          tools: [],
          commands: [],
          attemptEpoch: m,
        });
        continue;
      }
      b.push(P);
    }
    if (b.length === 0 || signal?.aborted) continue;
    let T = 0,
      v = 0,
      startTime_2 = performance.now(),
      rounded = Math.round(startTime_2 - startTime);
    if (
      (await O().getMcpToolsCommandsAndResources(
        (P) => {
          if (!signal?.aborted) {
            if ((y(P), P.client.type === "connected")) T++;
            else if (Bfn(P.client)) v++;
          } else if (P.client.type === "connected")
            O()
              .detachAndCloseConnection(P.client)
              .catch(() => {});
        },
        Object.fromEntries(b),
        e,
      ),
      (c += performance.now() - startTime_2),
      !signal?.aborted)
    )
      logEvent("tengu_mcp_connect_retry_attempt", {
        attempt: M + 1,
        delayMs: _,
        sincePassStartMs: rounded,
        retryable: R.length,
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
/**
 * 等待一批 MCP 连接：非阻塞时直接后台运行；否则在截止时间内等配置获取完成，再逐个等待拨号，超时只记日志、后台继续连接。
 */
//@ chunk-zdgk9dc6.js:12322-13112 placement
async function awaitConnectBatch(nonBlocking, startBatch, label) {
  if (nonBlocking) {
    (Promise.resolve(startBatch()).catch(() => {}),
      logForDebugging(`[MCP] ${label} running fully async (nonblocking)`));
    return;
  }
  let batch = startBatch(),
    now = Date.now(),
    deadlineMs = A4e(),
    dials;
  if (Array.isArray(batch)) dials = batch;
  else {
    let c,
      winner = await Promise.race([
        batch.catch((M) => (logError(M), "failed")),
        new Promise((M) => {
          c = setTimeout((_) => _("deadline"), deadlineMs, M);
        }),
      ]);
    if ((clearTimeout(c), winner === "deadline")) {
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
  let s = loadMcpClientModuleTimed(label);
  if (!s) return;
  let awaitEachWithDeadline = await s.awaitEachWithDeadline(dials, max);
  if (awaitEachWithDeadline > 0)
    logForDebugging(
      `[MCP] ${label}: ${awaitEachWithDeadline}/${dials.length} not ready after ${deadlineMs}ms \u2014 proceeding; background connection continues`,
    );
}
//@ chunk-zdgk9dc6.js:13112-13767 placement
function fetchClaudeAiConnectors(n, o, e) {
  (clearClaudeAiConfigsFetch(), resetClaudeAiSessionConnections());
  let y = identityEpoch(),
    r = (async () => {
      let p = await fetchClaudeAiConfigsOnce(e);
      if (!isCurrentIdentityEpoch(y)) return supersededByAccountSwitch("list fetch");
      let { allowed: allowed, blocked: blocked } = filterMcpServersByPolicy(p);
      if ((printClaudeAiConnectorNotice(), blocked.length > 0))
        logForDebugging(
          `[MCP] claude.ai connectors blocked by enterprise policy after account switch: ${blocked.join(", ")}`,
        );
      let s = await restorableSuppressedPlugins(n, o),
        fromEntries = Object.fromEntries([
          ...Object.entries(s),
          ...n
            .getClients()
            .filter((c) => c.config.scope !== "claudeai")
            .map((c) => [c.name, c.config]),
        ]);
      return mountClaudeAiConnectors({
        claudeaiConfigs: allowed,
        regularMcpConfigs: fromEntries,
        state: n,
        deferConnect: !1,
        storageV5: o,
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
  return (
    logForDebugging(
      `[MCP] claude.ai connector list superseded by an account switch (${n}) \u2014 not mounting`,
    ),
    "superseded"
  );
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
/**
 * 找出仍可恢复的被抑制插件服务器：插件仍安装启用的返回其配置，已不存在的从抑制列表中移除。
 */
//@ chunk-zdgk9dc6.js:14130-14612 placement
async function restorableSuppressedPlugins(n, o) {
  let suppressedPluginServers = n.getSuppressedPluginServers();
  if (suppressedPluginServers.length === 0) return {};
  let { servers: servers } = await getClaudeCodeMcpConfigs({}, { storageV5: o }),
    r = {},
    p = new Set();
  for (let u of suppressedPluginServers) {
    let m = servers[u];
    if (m && m.pluginSource !== void 0) r[u] = m;
    else p.add(u);
  }
  if (p.size > 0)
    (logForDebugging(
      `[MCP] Dropping ${p.size} suppressed plugin server(s) whose plugin is no longer installed/enabled: ${[...p].join(", ")}`,
    ),
      n.applyMcpUpdate((u) => ({
        ...u,
        suppressedPluginMcpServers: (u.suppressedPluginMcpServers ?? []).filter((m) => !p.has(m)),
      })));
  return r;
}
/**
 * 账号切换后不再与 claude.ai 连接器重复的插件服务器：从抑制列表移除并重新连接。
 */
//@ chunk-zdgk9dc6.js:14612-15123 placement
function restorePluginServers(restorable, stillSuppressed, mcpState, storageV5) {
  let connectedNames = new Set(mcpState.getClients().map((s) => s.name)),
    restoredNames = new Set(),
    toConnect = {};
  for (let [s, h] of Object.entries(restorable)) {
    if (stillSuppressed.has(s)) continue;
    if ((restoredNames.add(s), !connectedNames.has(s))) toConnect[s] = h;
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
  return connectMcpServerBatch(toConnect, "plugin-restore", mcpState, !1, storageV5);
}
//@ chunk-zdgk9dc6.js:15123-16567 placement
async function dedupPluginServersAgainstConnectors(n) {
  let { claudeaiConfigs: claudeaiConfigs, regularMcpConfigs: regularMcpConfigs, state: state } = n,
    r = new Set();
  if (Object.keys(claudeaiConfigs).length > 0) {
    let u = new Set(),
      m = new Set();
    for (let c of Object.values(claudeaiConfigs)) {
      let S = getMcpServerSignature(c);
      if (S) (isIneligibleClaudeAiProxy(c) ? m : u).add(S);
    }
    let s = [],
      h;
    for (let [c, S] of Object.entries(regularMcpConfigs)) {
      if (!c.startsWith("plugin:")) continue;
      let M = getMcpServerSignature(S);
      if (!M) continue;
      if (u.has(M)) r.add(c);
      else if (m.has(M)) {
        if ((s.push(c), (h ??= isClaudeAiEligibilityCheckEnabled()), !h)) r.add(c);
      }
    }
    if (s.length > 0)
      logEvent("tengu_mcp_plugin_beside_ineligible_connector", { plugin_server_count: s.length, kept: h });
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
        if (c.type === "connected")
          (setMcpOnClose(c, void 0),
            O()
              .clearServerCache(c.name, c.config)
              .catch(() => {}));
        else O().disposeServerConnectionDetached(c.name, c.config);
      }
      state.applyMcpUpdate((c) => {
        let { clients: clients, tools: tools, commands: commands, resources: resources } = c;
        ((clients = clients.filter((b) => !r.has(b.name))),
          (tools = tools.filter((b) => !b.mcpInfo || !r.has(b.mcpInfo.serverName))));
        for (let b of r) ((commands = excludeCommandsByServer(commands, b)), (resources = $jt(resources, b)));
        let R = [...(c.suppressedPluginMcpServers ?? []).filter((b) => !r.has(b)), ...r];
        return {
          ...c,
          clients: clients,
          tools: tools,
          commands: commands,
          resources: resources,
          suppressedPluginMcpServers: R,
        };
      });
    }
  }
  let p = filterObject(regularMcpConfigs, (u, m) => !m.startsWith("plugin:"));
  return { ...(await dedupClaudeAiMcpServers(claudeaiConfigs, p)), suppressedPlugins: r };
}
//@ chunk-zdgk9dc6.js:16567-16745 placement
function connectDedupedConnectors({ servers: servers, suppressed: suppressed }, e, y, r) {
  return (
    e.applyMcpUpdate((p) =>
      suppressedConnectorsEqual(p.suppressedClaudeAiConnectors ?? [], suppressed)
        ? p
        : { ...p, suppressedClaudeAiConnectors: suppressed },
    ),
    connectMcpServerBatch(servers, "claudeai", e, y, r)
  );
}
//@ chunk-zdgk9dc6.js:16745-17001 placement
function replaceClientInState(n, o) {
  let e = getMcpPrefix(o.name);
  return {
    ...n,
    clients: n.clients.map((client) => (client.name === o.name ? o : client)),
    tools: zj(n.tools, (y) => isToolFromMcpServer(y, o.name, e)),
    commands: zj(n.commands, (y) => commandBelongsToServer(y, o.name)),
    resources: omitKeys(n.resources, o.name),
    resourceTemplates: omitKeys(n.resourceTemplates, o.name),
  };
}
//@ chunk-zdgk9dc6.js:17001-17115 placement
function discardClient(n) {
  if (fd()) setMcpOnClose(n, void 0);
  (n.cleanup().catch(() => {}),
    O()
      .clearServerCache(n.name, n.config)
      .catch(() => {}));
}

export {
  MCP_CONNECT_PHASES,
  OCs,
  connectMcpConfigServers,
  PCs,
  applyConnectionResult,
  findReusableClients,
  retryRemoteMcpServers,
  fetchClaudeAiConnectors,
  trackTransientRetryPass,
  Sen,
};
