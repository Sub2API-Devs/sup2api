/**
 * services/mcp/connectionBatch.ts
 *
 * MCP 批量连接、重试与插件/连接器去重（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nkjcc801.js (21)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getRecordedPhase, recordPhase } from "../../utils/startupTiming.js";
import { logError, logMCPDebug } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nkjcc801.js:5134-5203 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-nkjcc801.js:5203-5421 placement
function loadMcpClientModuleTimed(phaseLabel) {
  let startTime = performance.now();
  try {
    let mcpClient = mcpClientModule();
    if (getRecordedPhase("mcp_client_module_load_ms") === undefined)
      recordPhase("mcp_client_module_load_ms", performance.now() - startTime, startTime);
    return mcpClient;
  } catch (error) {
    logError(error);
    logForDebugging(`[MCP] ${phaseLabel} connect error: ${error}`);
    return;
  }
}
//@ chunk-nkjcc801.js:5421-5482 placement
/**
 * 连接重试的退避序列（500/1500/4000 毫秒）。
 */
var CONNECT_RETRY_BASE_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CONNECT_RETRY_DELAYS_MS;
var reduced;
deferInit("chunk-nkjcc801.js:5421", () => {
  CONNECT_RETRY_BASE_MS = 1000;
  CONNECT_RETRY_DELAYS_MS = [500, 1500, 4000];
  reduced = CONNECT_RETRY_DELAYS_MS.reduce((acc, delayMs) => acc + delayMs, 0);
});
//@ chunk-nkjcc801.js:5482-6353 placement
function MCP_CONNECT_PHASES(options) {
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
  } = options;
  let knownListings =
    options.knownListings &&
    import_mapValues(options.knownListings, (listing) =>
      Array.isArray(listing)
        ? {
            tools: listing,
          }
        : listing,
    );
  let epoch = identityEpoch();
  let nonBlocking = env.MCP_CONNECTION_NONBLOCKING !== false;
  setMcpConnectNonBlocking(nonBlocking);
  let deferConnect = nonBlocking;
  async function connectAll() {
    profileCheckpoint("before_mcp_connect_user");
    profileCheckpoint("before_mcp_connect_connector");
    let regularPromise = connectMcpConfigServers({
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
    let connectorsPromise = awaitConnectBatch(
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
          .then((mounted) => (mounted === "superseded" ? [] : mounted)),
      "claude.ai connectors",
    ).then(() => profileCheckpoint("after_mcp_connect_connector"));
    await Promise.all([regularPromise, connectorsPromise]);
  }
  return {
    connect: connectAll,
  };
}
//@ chunk-nkjcc801.js:6353-6448 placement
/**
 * 是否要先等 MCP 连接再进入输入（环境变量开启且有会话）。
 */
function shouldJoinBeforeInput(sdkUrl) {
  return (
    env.CLAUDE_CODE_MCP_ALWAYS_LOAD_JOIN_BEFORE_INPUT === true && Boolean(sdkUrl) && !isBridgeEnvironment()
  );
}
//@ chunk-nkjcc801.js:6448-7208 placement
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
  let requiredLater = (config, name) =>
    config.alwaysLoad === true || (knownListings !== undefined && Object.hasOwn(knownListings, name));
  let requiredNow =
    isRequired === undefined
      ? {}
      : filterObject(
          configs,
          (config, name) =>
            config.alwaysLoad === true &&
            config.scope === "dynamic" &&
            !isPluginServerConfig(config) &&
            !(knownListings !== undefined && Object.hasOwn(knownListings, name)),
        );
  let optional = filterObject(
    configs,
    (config, name) => requiredLater(config, name) && !Object.hasOwn(requiredNow, name),
  );
  let hasRequired = filterObject(configs, (config, name) => !requiredLater(config, name));
  let hasOptional = Object.keys(optional).length > 0;
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
    ...(hasOptional
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
//@ chunk-nkjcc801.js:7208-8670 placement
function connectMcpServerBatch(
  configs,
  label,
  state,
  nonBlocking = false,
  storageV5,
  credentials,
  knownListings,
  onDialStart,
  dialFirst,
  dialOptions,
) {
  let keys = Object.keys(configs);
  if (keys.length === 0) return [];
  let knownTools = knownListings && import_mapValues(knownListings, (listing) => listing.tools);
  state.applyMcpUpdate((state) => ({
    ...state,
    clients: [
      ...state.clients,
      ...Object.entries(configs).map(([key, value]) => ({
        name: key,
        type: "pending",
        config: value,
      })),
    ],
  }));
  let resolvers = new Map();
  let mapped = keys.map((name) => new Promise((resolve) => resolvers.set(name, resolve)));
  let deferred = Promise.withResolvers();
  let retrying = new Set();
  let retrySlowServers = (slowConfigs) => {
    for (let key of Object.keys(slowConfigs)) retrying.add(key);
    retryRemoteMcpServers(slowConfigs, state, storageV5, undefined, deferred.promise)
      .catch((error) => logForDebugging(`[MCP] ${label} retry error: ${error}`))
      .finally(() => {
        for (let key of Object.keys(slowConfigs)) retrying.delete(key);
      });
  };
  let startDial = () => {
    let dialer = loadMcpClientModuleTimed(label);
    if (!dialer) {
      for (let resolve of resolvers.values()) resolve();
      return;
    }
    if (onDialStart !== undefined && keys.some((name) => !Object.hasOwn(knownTools ?? {}, name)))
      onDialStart();
    let orderedConfigs =
      dialFirst === undefined
        ? configs
        : {
            ...filterObject(configs, (config, name) => dialFirst(name)),
            ...configs,
          };
    dialer
      .getMcpToolsCommandsAndResources(
        (result) => {
          let { client } = result;
          let knownListing = Object.hasOwn(knownListings ?? {}, client.name)
            ? knownListings?.[client.name]
            : undefined;
          let handshake = knownListing?.handshake;
          if (client.type === "cached" && knownListing !== undefined) client.listedByHost = true;
          if (client.type === "cached" && handshake !== undefined) {
            client.capabilities = handshake.capabilities;
            client.serverInfo = {
              name: handshake.serverInfo.name,
              version: handshake.serverInfo.version,
            };
            let cappedInstructions = dialer.capMcpInstructions(
              handshake.instructions,
              client.name,
              toolTimeoutForServer(client.config),
            );
            if (cappedInstructions !== undefined) client.instructions = cappedInstructions;
          }
          if (client.type === "cached" && knownListing?.comparedBeforeUse)
            wrapHandedListingChecks(
              client,
              result.tools,
              knownListing.tools,
              dialer,
              handshake !== undefined,
            );
          applyConnectionResult(state, result);
          printScopeExpansionNotice();
          let { name } = result.client;
          resolvers.get(name)?.();
          if (!retrying.has(name)) {
            let thisServerConfigs = filterObject(configs, (key, configName) => configName === name);
            if (findReusableClients(thisServerConfigs, state).length > 0) retrySlowServers(thisServerConfigs);
          }
        },
        orderedConfigs,
        storageV5,
        credentials,
        knownTools,
        true,
        undefined,
        dialOptions,
      )
      .catch((error) => logForDebugging(`[MCP] ${label} connect error: ${error}`))
      .finally(() => {
        for (let resolve of resolvers.values()) resolve();
        deferred.resolve(performance.now());
        retrySlowServers(filterObject(configs, (key, name) => !retrying.has(name)));
      });
  };
  if (nonBlocking) setImmediate(startDial);
  else startDial();
  return mapped;
}
//@ chunk-nkjcc801.js:8670-10373 placement
function applyConnectionResult(state, update) {
  let { client, tools, commands, attemptEpoch } = update;
  let finalize;
  let outcome = "applied";
  let identityChanged = identityChangedForRemote(client.config, attemptEpoch);
  state.applyMcpUpdate((appState) => {
    outcome = "applied";
    finalize = undefined;
    let name = appState.clients.find((client_2) => client_2.name === client.name);
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
        finalize = () => discardClient(client);
      }
      outcome = "dropped";
      return appState;
    }
    if (identityChanged) {
      logMCPDebug(
        client.name,
        "applyConnectionResult: settlement superseded by an account switch \u2014 closed, not installed (the identity boundary owns the row)",
      );
      if (client.type === "connected")
        finalize = () => {
          mcpClientModule()
            .detachAndCloseConnection(client)
            .catch(() => {});
        };
      outcome = "superseded";
      return appState;
    }
    let blockCause =
      client.type !== "failed" && client.type !== "disabled"
        ? mcpDialBlockCause(client.name, client.config)
        : null;
    if (
      blockCause !== "managed-policy" &&
      !isPolicyBlockedFailure(client) &&
      isMcpServerDisabled(client.name) &&
      client.type !== "disabled"
    ) {
      let isSameConnection =
        client.type === "connected" && name.type === "connected" && name.client === client.client;
      if (client.type === "connected" && !isSameConnection) {
        logMCPDebug(client.name, "applyConnectionResult: disposing connect that settled after a disable");
        finalize = () => discardClient(client);
      }
      outcome = "refused";
      if (name.type === "disabled" || (name.type === "connected" && isConnectedOrCached(client)))
        return appState;
      return replaceClientInState(appState, {
        name: client.name,
        type: "disabled",
        config: name.config,
      });
    }
    if (blockCause) {
      if (client.type === "connected")
        logMCPDebug(
          client.name,
          `applyConnectionResult: disposing connect that settled after a ${blockCause} deny`,
        );
      finalize = () => {
        if (client.type === "connected") discardClient(client);
        mcpClientModule()
          .dropDiscoveryEntry(client.name, client.config)
          .catch(() => {});
      };
      outcome = "refused";
      return replaceClientInState(appState, {
        name: client.name,
        type: "failed",
        config: name.config,
        ...mcpGateError(blockCause, client.name, client.config),
      });
    }
    if (!checkMcpServerHealth_2(name, client)) {
      outcome = "dropped";
      return appState;
    }
    return {
      ...appState,
      clients: appState.clients.map((client_2) => (client_2.name === client.name ? client : client_2)),
      tools: uniqBy([...appState.tools, ...tools], (tool) => tool.name),
      commands: uniqBy([...appState.commands, ...commands], (command) => command.name),
    };
  });
  finalize?.();
  return outcome;
}
//@ chunk-nkjcc801.js:10373-10566 placement
/**
 * 找出配置未变且客户端已连接（或可接受的失败状态）的服务器，可直接复用而无需重连。
 */
function findReusableClients(configs, state, includeForbidden = true) {
  let clients = state.getClients();
  return Object.entries(configs).filter(([key, value]) => {
    let found = clients.find((client) => client.name === key);
    return (
      found !== undefined &&
      (isRetryableRemoteFailure(found) || (includeForbidden && isProxyForbiddenFailure(found))) &&
      mcpClientModule().areMcpConfigsEqual(found.config, value)
    );
  });
}
//@ chunk-nkjcc801.js:10566-10742 placement
/**
 * 登记一组服务器正处于瞬时错误重试轮次中，返回可 dispose 的对象在结束时撤销。
 */
function trackTransientRetryPass(names) {
  let bump = (delta) => {
    let transientRetryPasses = getCliOwnedState().transientRetryPasses;
    for (let name of names) {
      let nextCount = (transientRetryPasses.get(name) ?? 0) + delta;
      if (nextCount > 0) transientRetryPasses.set(name, nextCount);
      else transientRetryPasses.delete(name);
    }
  };
  bump(1);
  return {
    [Symbol.dispose]: () => bump(-1),
  };
}
//@ chunk-nkjcc801.js:10742-12354 placement
async function retryRemoteMcpServers(
  configs,
  state,
  storageV5,
  applyResult = (result) => applyConnectionResult(state, result),
  promise,
) {
  let failedPairs = () => findReusableClients(configs, state);
  if (failedPairs().length === 0) return;
  using retryPass = trackTransientRetryPass(Object.keys(configs));
  let epochAtStart = identityEpoch();
  let { signal } = state;
  let startTime = performance.now();
  let dialTimeMs = 0;
  for (let [attempt, delayMs] of CONNECT_RETRY_DELAYS_MS.entries()) {
    let isLastAttempt = attempt === CONNECT_RETRY_DELAYS_MS.length - 1;
    await sleep(delayMs, signal);
    if (promise !== undefined && isLastAttempt) {
      let targetTime = (await promise) + reduced + dialTimeMs;
      await sleep(Math.max(0, targetTime - performance.now()), signal);
    }
    if (signal?.aborted) return;
    if (identityEpoch() !== epochAtStart) {
      logForDebugging(
        "[MCP] Retry: identity changed during backoff, stopping (these rows belong to the previous account)",
      );
      return;
    }
    let reusableClients = findReusableClients(configs, state, isLastAttempt);
    if (reusableClients.length === 0) {
      if (failedPairs().length > 0) continue;
      logForDebugging("[MCP] Retry: all remote servers recovered, stopping");
      return;
    }
    logForDebugging(
      `[MCP] Retry attempt ${attempt + 1}: ${reusableClients.length} transiently-failed remote server(s)`,
    );
    let dialable = [];
    for (let reusableClient of reusableClients) {
      if (!(await mcpClientModule().discardMemoizedConnectResult(...reusableClient))) continue;
      let [name, config] = reusableClient;
      let blockCause = mcpDialBlockCause(name, config);
      if (blockCause) {
        applyResult({
          client: {
            name,
            type: "failed",
            config,
            ...mcpGateError(blockCause, name, config),
          },
          tools: [],
          commands: [],
          attemptEpoch: epochAtStart,
        });
        continue;
      }
      dialable.push(reusableClient);
    }
    if (dialable.length === 0 || signal?.aborted) continue;
    let recoveredCount = 0;
    let stillRetryableCount = 0;
    let startTime_2 = performance.now();
    let sincePassStartMs = Math.round(startTime_2 - startTime);
    await mcpClientModule().getMcpToolsCommandsAndResources(
      (result) => {
        if (!signal?.aborted) {
          applyResult(result);
          if (result.client.type === "connected") recoveredCount++;
          else if (isRetriableOrForbidden(result.client)) stillRetryableCount++;
        } else if (result.client.type === "connected")
          mcpClientModule()
            .detachAndCloseConnection(result.client)
            .catch(() => {});
      },
      Object.fromEntries(dialable),
      storageV5,
    );
    dialTimeMs += performance.now() - startTime_2;
    if (!signal?.aborted)
      logEvent("tengu_mcp_connect_retry_attempt", {
        attempt: attempt + 1,
        delayMs,
        sincePassStartMs,
        retryable: reusableClients.length,
        dialed: dialable.length,
        recovered: recoveredCount,
        stillRetryable: stillRetryableCount,
      });
    if (failedPairs().length === 0) {
      logForDebugging("[MCP] Retry: all remote servers recovered, stopping");
      return;
    }
  }
  let remaining = failedPairs();
  if (remaining.length > 0)
    logForDebugging(
      `[MCP] Retry: ${remaining.length} remote server(s) still failed after all retries: ${remaining.map(([name]) => name).join(", ")}`,
    );
}
//@ chunk-nkjcc801.js:12354-13144 placement
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
    let timer;
    let winner = await Promise.race([
      batch.catch((error) => {
        logError(error);
        return "failed";
      }),
      new Promise((resolve) => {
        timer = setTimeout((resolve) => resolve("deadline"), deadlineMs, resolve);
      }),
    ]);
    clearTimeout(timer);
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
  let unsettledCount = await mcpClientModuleTimed.awaitEachWithDeadline(dials, max);
  if (unsettledCount > 0)
    logForDebugging(
      `[MCP] ${label}: ${unsettledCount}/${dials.length} not ready after ${deadlineMs}ms \u2014 proceeding; background connection continues`,
    );
}
//@ chunk-nkjcc801.js:13144-13798 placement
function fetchClaudeAiConnectors(adapter, storageV5, credentials) {
  clearClaudeAiConfigsFetch();
  resetClaudeAiSessionConnections();
  let epochAtStart = identityEpoch();
  let mountPromise = (async () => {
    let claudeAiConfigs = await fetchClaudeAiConfigsOnce(credentials);
    if (!isCurrentIdentityEpoch(epochAtStart)) return supersededByAccountSwitch("list fetch");
    let { allowed, blocked } = filterMcpServersByPolicy(claudeAiConfigs);
    printClaudeAiConnectorNotice();
    if (blocked.length > 0)
      logForDebugging(
        `[MCP] claude.ai connectors blocked by enterprise policy after account switch: ${blocked.join(", ")}`,
      );
    let restorablePlugins = await restorableSuppressedPlugins(adapter, storageV5);
    let regularMcpConfigs = Object.fromEntries([
      ...Object.entries(restorablePlugins),
      ...adapter
        .getClients()
        .filter((client) => client.config.scope !== "claudeai")
        .map((client) => [client.name, client.config]),
    ]);
    return mountClaudeAiConnectors({
      claudeaiConfigs: allowed,
      regularMcpConfigs,
      state: adapter,
      deferConnect: false,
      storageV5,
      epoch: epochAtStart,
      restorablePlugins,
    });
  })();
  return {
    mounted: mountPromise.then((mountResult) => (mountResult === "superseded" ? mountResult : "mounted")),
    settled: mountPromise
      .then((mountResult) => (mountResult === "superseded" ? [] : Promise.all(mountResult)))
      .then(() => {}),
  };
}
//@ chunk-nkjcc801.js:13798-13927 placement
function supersededByAccountSwitch(stage) {
  logForDebugging(
    `[MCP] claude.ai connector list superseded by an account switch (${stage}) \u2014 not mounting`,
  );
  return "superseded";
}
//@ chunk-nkjcc801.js:13927-14161 placement
async function mountClaudeAiConnectors(params) {
  if (!isCurrentIdentityEpoch(params.epoch)) return supersededByAccountSwitch("list fetch");
  let dedup = await dedupPluginServersAgainstConnectors(params);
  if (!isCurrentIdentityEpoch(params.epoch)) return supersededByAccountSwitch("dedup");
  return [
    ...restorePluginServers(
      params.restorablePlugins ?? {},
      dedup.suppressedPlugins,
      params.state,
      params.storageV5,
    ),
    ...connectDedupedConnectors(dedup, params.state, params.deferConnect, params.storageV5),
  ];
}
//@ chunk-nkjcc801.js:14161-14643 placement
/**
 * 找出仍可恢复的被抑制插件服务器：插件仍安装启用的返回其配置，已不存在的从抑制列表中移除。
 */
async function restorableSuppressedPlugins(adapter, storageV5) {
  let suppressedPluginServers = adapter.getSuppressedPluginServers();
  if (suppressedPluginServers.length === 0) return {};
  let { servers } = await getClaudeCodeMcpConfigs(
    {},
    {
      storageV5,
    },
  );
  let restorable = {};
  let staleNames = new Set();
  for (let name of suppressedPluginServers) {
    let config = servers[name];
    if (config && config.pluginSource !== undefined) restorable[name] = config;
    else staleNames.add(name);
  }
  if (staleNames.size > 0) {
    logForDebugging(
      `[MCP] Dropping ${staleNames.size} suppressed plugin server(s) whose plugin is no longer installed/enabled: ${[...staleNames].join(", ")}`,
    );
    adapter.applyMcpUpdate((state) => ({
      ...state,
      suppressedPluginMcpServers: (state.suppressedPluginMcpServers ?? []).filter(
        (name) => !staleNames.has(name),
      ),
    }));
  }
  return restorable;
}
//@ chunk-nkjcc801.js:14643-15154 placement
/**
 * 账号切换后不再与 claude.ai 连接器重复的插件服务器：从抑制列表移除并重新连接。
 */
function restorePluginServers(restorable, stillSuppressed, mcpState, storageV5) {
  let connectedNames = new Set(mcpState.getClients().map((client) => client.name));
  let restoredNames = new Set();
  let toConnect = {};
  for (let [key, value] of Object.entries(restorable)) {
    if (stillSuppressed.has(key)) continue;
    restoredNames.add(key);
    if (!connectedNames.has(key)) toConnect[key] = value;
  }
  if (restoredNames.size === 0) return [];
  mcpState.applyMcpUpdate((state) => ({
    ...state,
    suppressedPluginMcpServers: (state.suppressedPluginMcpServers ?? []).filter(
      (name) => !restoredNames.has(name),
    ),
  }));
  let keys = Object.keys(toConnect);
  if (keys.length > 0)
    logForDebugging(
      `[MCP] Restoring ${keys.length} plugin server(s) no longer duplicated by claude.ai connectors after account switch: ${keys.join(", ")}`,
    );
  return connectMcpServerBatch(toConnect, "plugin-restore", mcpState, false, storageV5);
}
//@ chunk-nkjcc801.js:15154-16598 placement
async function dedupPluginServersAgainstConnectors(params) {
  let { claudeaiConfigs, regularMcpConfigs, state } = params;
  let suppressed = new Set();
  if (Object.keys(claudeaiConfigs).length > 0) {
    let eligibleSignatures = new Set();
    let ineligibleSignatures = new Set();
    for (let connectorConfig of Object.values(claudeaiConfigs)) {
      let mcpServerSignature = getMcpServerSignature(connectorConfig);
      if (mcpServerSignature)
        (isIneligibleClaudeAiProxy(connectorConfig) ? ineligibleSignatures : eligibleSignatures).add(
          mcpServerSignature,
        );
    }
    let besideIneligible = [];
    let eligibilityCheckOn;
    for (let [key, value] of Object.entries(regularMcpConfigs)) {
      if (!key.startsWith("plugin:")) continue;
      let mcpServerSignature = getMcpServerSignature(value);
      if (!mcpServerSignature) continue;
      if (eligibleSignatures.has(mcpServerSignature)) suppressed.add(key);
      else if (ineligibleSignatures.has(mcpServerSignature)) {
        besideIneligible.push(key);
        eligibilityCheckOn ??= isClaudeAiEligibilityCheckEnabled();
        if (!eligibilityCheckOn) suppressed.add(key);
      }
    }
    if (besideIneligible.length > 0)
      logEvent("tengu_mcp_plugin_beside_ineligible_connector", {
        plugin_server_count: besideIneligible.length,
        kept: eligibilityCheckOn,
      });
    if (eligibilityCheckOn)
      logForDebugging(
        `[MCP] Lazy dedup: keeping ${besideIneligible.length} plugin server(s) whose only duplicate claude.ai connectors are ineligible: ${besideIneligible.join(", ")}`,
      );
    if (suppressed.size > 0) {
      logForDebugging(
        `[MCP] Lazy dedup: suppressing ${suppressed.size} plugin server(s) that duplicate claude.ai connectors: ${[...suppressed].join(", ")}`,
      );
      for (let client of state.getClients()) {
        if (!suppressed.has(client.name) || !(isConnectedOrCached(client) || client.type === "pending"))
          continue;
        if (client.type === "connected") {
          setMcpOnClose(client, undefined);
          mcpClientModule()
            .clearServerCache(client.name, client.config)
            .catch(() => {});
        } else mcpClientModule().disposeServerConnectionDetached(client.name, client.config);
      }
      state.applyMcpUpdate((state) => {
        let { clients, tools, commands, resources } = state;
        clients = clients.filter((client) => !suppressed.has(client.name));
        tools = tools.filter((tool) => !tool.mcpInfo || !suppressed.has(tool.mcpInfo.serverName));
        for (let name of suppressed) {
          commands = excludeCommandsByServer(commands, name);
          resources = omitKey(resources, name);
        }
        let suppressedPluginMcpServers = [
          ...(state.suppressedPluginMcpServers ?? []).filter((name) => !suppressed.has(name)),
          ...suppressed,
        ];
        return {
          ...state,
          clients,
          tools,
          commands,
          resources,
          suppressedPluginMcpServers,
        };
      });
    }
  }
  let mcpServer = filterObject(regularMcpConfigs, (name, entryName) => !entryName.startsWith("plugin:"));
  return {
    ...(await dedupClaudeAiMcpServers(claudeaiConfigs, mcpServer)),
    suppressedPlugins: suppressed,
  };
}
//@ chunk-nkjcc801.js:16598-16776 placement
function connectDedupedConnectors({ servers, suppressed }, state, deferConnect, storageV5) {
  state.applyMcpUpdate((state) =>
    suppressedConnectorsEqual(state.suppressedClaudeAiConnectors ?? [], suppressed)
      ? state
      : {
          ...state,
          suppressedClaudeAiConnectors: suppressed,
        },
  );
  return connectMcpServerBatch(servers, "claudeai", state, deferConnect, storageV5);
}
//@ chunk-nkjcc801.js:16776-17032 placement
function replaceClientInState(state, client) {
  let mcpPrefix = getMcpPrefix(client.name);
  return {
    ...state,
    clients: state.clients.map((client_2) => (client_2.name === client.name ? client : client_2)),
    tools: reject_default(state.tools, (tool) => isToolFromMcpServer(tool, client.name, mcpPrefix)),
    commands: reject_default(state.commands, (command) => commandBelongsToServer(command, client.name)),
    resources: omitKeys(state.resources, client.name),
    resourceTemplates: omitKeys(state.resourceTemplates, client.name),
  };
}
//@ chunk-nkjcc801.js:17032-17146 placement
function discardClient(client) {
  if (isDiscoveryCacheOn()) setMcpOnClose(client, undefined);
  client.cleanup().catch(() => {});
  mcpClientModule()
    .clearServerCache(client.name, client.config)
    .catch(() => {});
}
export {
  applyConnectionResult,
  findReusableClients,
  retryRemoteMcpServers,
  CONNECT_RETRY_BASE_MS,
  trackTransientRetryPass,
  CONNECT_RETRY_DELAYS_MS,
  MCP_CONNECT_PHASES,
  shouldJoinBeforeInput,
  connectMcpConfigServers,
  fetchClaudeAiConnectors,
};
