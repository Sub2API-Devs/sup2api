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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fpvb8c85.js:1248-1317 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-fpvb8c85.js:1317-1427 placement
/**
 * 解析重连使用的服务器配置：显式给出的优先，非设置作用域的现有配置次之，否则调用回调查找。
 */
function resolveReconnectConfig(serverName, configs, config, getMcpConfigByName) {
  if (Object.hasOwn(configs, serverName)) return configs[serverName];
  if (config && !MCP_SETTINGS_SCOPE_SET.has(config.scope)) return config;
  return getMcpConfigByName ? getMcpConfigByName(serverName) : (config ?? null);
}
//@ chunk-fpvb8c85.js:1427-1605 placement
/**
 * 在 MCP 状态中把服务器标记为禁用并移除其工具。
 */
function markServerDisabled(dynamicMcpState, serverName) {
  if (!dynamicMcpState.clients.some((client) => client.name === serverName)) return dynamicMcpState;
  return {
    ...dynamicMcpState,
    clients: dynamicMcpState.clients.map((client) =>
      client.name === serverName
        ? {
            name: serverName,
            type: "disabled",
            config: client.config,
          }
        : client,
    ),
    tools: filterCommandsByServer(dynamicMcpState.tools, serverName),
  };
}
//@ chunk-fpvb8c85.js:1605-1787 placement
/**
 * 取出某服务器在 MCP 状态中的工具、命令、资源与资源模板。
 */
function serverItemsOf(state, serverName) {
  let mcpPrefix = getMcpPrefix(serverName);
  return {
    tools: state.tools.filter((tool) => isToolFromMcpServer(tool, serverName, mcpPrefix)),
    commands: state.commands.filter((command) => commandBelongsToServer(command, serverName)),
    resources: state.resources[serverName],
    resourceTemplates: state.resourceTemplates[serverName],
  };
}
//@ chunk-fpvb8c85.js:1787-1995 placement
/**
 * 计算重连结果应呈现的拒绝状态：托管策略拦截、用户禁用或其他拨号拦截原因。
 */
function refusalStateFor(serverName, client) {
  let blockCause = client.type !== "failed" ? mcpDialBlockCause(serverName, client.config) : undefined;
  if (blockCause === "managed-policy") return failedServerRefusal(serverName, client.config, blockCause);
  if (isMcpServerDisabled(serverName) && !isPolicyBlockedFailure(client))
    return {
      name: serverName,
      type: "disabled",
      config: client.config,
    };
  return blockCause ? failedServerRefusal(serverName, client.config, blockCause) : undefined;
}
//@ chunk-fpvb8c85.js:1995-2064 placement
/**
 * 构造一个“失败 + 拒绝原因”的服务器结果。
 */
function failedServerRefusal(serverName, config, blockCause) {
  return {
    name: serverName,
    type: "failed",
    config,
    ...mcpGateError(blockCause, serverName, config),
  };
}
//@ chunk-fpvb8c85.js:2064-2160 placement
/**
 * 用传入配置修正重连结果（被拒时保留原客户端）。
 */
function reconcileConfig(existingRow, incoming) {
  return incoming.asked ||
    existingRow === undefined ||
    withConfigScope(incoming.client, existingRow.config) === incoming.client
    ? incoming
    : applyMcpServerConfig(existingRow.config, incoming);
}
//@ chunk-fpvb8c85.js:2160-2487 placement
/**
 * 合并重连结果与传入配置（拒绝时保留原客户端）。
 */
function mergeReconnectResult(serverName, existingRow, params) {
  let { incoming, result, outcome } = params;
  if (outcome === "refused") {
    let reboundClient = incoming.asked ? result.client : withMcpConfig(result.client, existingRow.config);
    return reboundClient === result.client
      ? result
      : {
          ...result,
          client: reboundClient,
        };
  }
  if (withConfigScope(result.client, existingRow.config) === result.client) return result;
  let reconciled = reconcileConfig(existingRow, incoming);
  if (reconciled.client.type === "disabled") return reconciled;
  let refusal = refusalStateFor(serverName, reconciled.client);
  return refusal
    ? {
        ...reconciled,
        client: refusal,
        tools: [],
        commands: [],
      }
    : reconciled;
}
//@ chunk-fpvb8c85.js:2487-3946 placement
/**
 * 把重连结果写入 AppState/动态 MCP 状态，旧连接关闭。
 */
function applyMcpReconnect(handles, serverName, settlement) {
  let { getAppState, setAppState, getDynamicMcpState, setDynamicMcpState } = handles;
  let closeConnection = () => {
    if (settlement.client.type === "connected")
      mcpClientModule()
        .detachAndCloseConnection(settlement.client)
        .catch(() => {});
  };
  let row = getAppState().mcp.clients.find((client) => client.name === serverName);
  let found = getDynamicMcpState().clients.find((client) => client.name === serverName);
  if (!row && !found) {
    closeConnection();
    return "dropped";
  }
  let cacheKey = serverCacheKey(serverName, settlement.client.config);
  let configChanged = (row) => row !== undefined && serverCacheKey(serverName, row.config) !== cacheKey;
  if (configChanged(row) || configChanged(found)) {
    logForDebugging(`[MCP] ${serverName}: dropping a settlement whose slot config changed mid-flight`);
    closeConnection();
    return "dropped";
  }
  if (identityChangedForRemote(settlement.client.config, settlement.attemptEpoch)) {
    logForDebugging(
      `[MCP] ${serverName}: settlement superseded by an account switch \u2014 closed, not installed (the identity boundary owns the row)`,
    );
    closeConnection();
    return "superseded";
  }
  let reconciled = reconcileConfig(row ?? found, settlement);
  let toInstall = reconciled;
  let outcome = "applied";
  if (reconciled.client.type !== "disabled") {
    let refusal = refusalStateFor(serverName, reconciled.client);
    if (refusal) {
      closeConnection();
      if (refusal.type === "failed")
        mcpClientModule()
          .dropDiscoveryEntry(serverName, reconciled.client.config)
          .catch(() => {});
      toInstall = {
        client: refusal,
        tools: [],
        commands: [],
        resources: [],
        attemptEpoch: settlement.attemptEpoch,
      };
      outcome = "refused";
    }
  }
  setAppState((state) => {
    let applied = setMcpClientInAppState(state, serverName, toInstall, {
      appendIfAbsent: toInstall.client.config.type !== "sdk",
    });
    let hasResources = !!toInstall.resources && toInstall.resources.length > 0;
    let hasTemplates = !!toInstall.resourceTemplates && toInstall.resourceTemplates.length > 0;
    return hasResources && hasTemplates
      ? applied
      : {
          ...applied,
          mcp: {
            ...applied.mcp,
            resources: hasResources ? applied.mcp.resources : omitKeys(applied.mcp.resources, serverName),
            resourceTemplates: hasTemplates
              ? applied.mcp.resourceTemplates
              : omitKeys(applied.mcp.resourceTemplates, serverName),
          },
        };
  });
  if (!found) return outcome;
  let mcpPrefix = getMcpPrefix(serverName);
  let dynamicMcpState = getDynamicMcpState();
  let merged =
    row === undefined
      ? toInstall
      : mergeReconnectResult(serverName, found, {
          incoming: settlement,
          result: toInstall,
          outcome,
        });
  setDynamicMcpState({
    ...dynamicMcpState,
    clients: dynamicMcpState.clients.map((client) => (client.name === serverName ? merged.client : client)),
    tools: [
      ...dynamicMcpState.tools.filter((tool) => !isToolFromMcpServer(tool, serverName, mcpPrefix)),
      ...merged.tools,
    ],
  });
  return outcome;
}
//@ chunk-fpvb8c85.js:3946-7840 placement
/**
 * MCP 身份（账号/组织）变化后重连受影响的服务器。
 */
function reconnectMcpOnIdentityChange(options) {
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
  } = options;
  deleteNeedsAuthCache(storageV5);
  let clientModule = mcpClientModule();
  let cliOwnedState = getCliOwnedState();
  if (!clientModule.mcpIdentityChangedSinceLastCheck() && !force)
    return cliOwnedState.headlessConnectorMountInFlight;
  let identityResolved = !force || !isUnresolved(getMcpIdentitySnapshot());
  let dynamicMcpState = getDynamicMcpState();
  let rows = [...getAppState().mcp.clients, ...dynamicMcpState.clients];
  let redialNames = new Set();
  let claudeAiNames = new Set();
  let sparedKeys = new Set();
  let sparedNames = new Set();
  if (spareUnchangedFrom) {
    for (let row of rows) sparedNames.add(row.name);
    for (let row of rows)
      if (!spareUnchangedFrom.has(row) || row.type === "pending") sparedNames.delete(row.name);
  }
  for (let row of rows) {
    if (!isRemoteMcpTransport(row.config) || sparedNames.has(row.name)) {
      sparedKeys.add(serverCacheKey(row.name, row.config));
      continue;
    }
    clientModule.disposeServerConnectionDetached(row.name, row.config);
    if (row.config.scope === "claudeai") {
      claudeAiNames.add(row.name);
      continue;
    }
    if (row.type !== "disabled") redialNames.add(row.name);
  }
  clientModule.evictAllMcpMemosOnIdentityChange(sparedKeys, hasRemoteMcpServers(rows));
  deferredToolCache().clear();
  let configsToRedial = Object.create(null);
  let missingConfigNames = new Set();
  let configs = options.getHostOwnedConfigs?.() ?? dynamicMcpState.configs;
  for (let row of rows) {
    if (!redialNames.has(row.name) || !identityResolved) continue;
    let config =
      configsToRedial[row.name] ?? resolveReconnectConfig(row.name, configs, row.config, getMcpConfigByName);
    if (!config) {
      missingConfigNames.add(row.name);
      continue;
    }
    let chosenConfig = (configsToRedial[row.name] ??= config);
    if (
      chosenConfig !== row.config &&
      serverCacheKey(row.name, chosenConfig) !== serverCacheKey(row.name, row.config)
    )
      logForDebugging(
        `[MCP] ${row.name}: appState and dynamic-store rows disagree on config at the identity boundary \u2014 converging both under the ${Object.hasOwn(configs, row.name) ? "host's" : "appState row's"} config and re-dialing it`,
        {
          level: "warn",
        },
      );
  }
  let refusals = new Map();
  let syncsConnectors = headlessSyncsClaudeAiConnectors() && identityResolved;
  let connectorConfigs = Object.create(null);
  for (let [key, value] of Object.entries(configsToRedial)) {
    if (syncsConnectors && isJudgedOnClaudeAiConnectorList(value)) {
      connectorConfigs[key] = value;
      delete configsToRedial[key];
      continue;
    }
    let blockCause = mcpDialBlockCause(key, value);
    if (blockCause) {
      refusals.set(key, failedServerRefusal(key, value, blockCause));
      delete configsToRedial[key];
    }
  }
  let affectedNames = [...redialNames, ...claudeAiNames];
  if (affectedNames.length > 0) {
    let mapped = affectedNames.map((name) => [name, getMcpPrefix(name)]);
    let belongs = (tool) => mapped.some(([name, prefix]) => isToolFromMcpServer(tool, name, prefix));
    let replacementRows = (row) =>
      claudeAiNames.has(row.name)
        ? []
        : redialNames.has(row.name)
          ? [
              !identityResolved || missingConfigNames.has(row.name)
                ? identityChangedFailure(row.name, row.config)
                : (refusals.get(row.name) ?? {
                    name: row.name,
                    type: "pending",
                    config: configsToRedial[row.name] ?? connectorConfigs[row.name] ?? row.config,
                  }),
            ]
          : [row];
    setAppState((state) => ({
      ...state,
      mcp: {
        ...state.mcp,
        clients: state.mcp.clients.flatMap(replacementRows),
        tools: reject_default(state.mcp.tools, belongs),
        commands: reject_default(state.mcp.commands, (command) =>
          affectedNames.some((name) => commandBelongsToServer(command, name)),
        ),
        resources: omitKeys(state.mcp.resources, affectedNames),
        resourceTemplates: omitKeys(state.mcp.resourceTemplates, affectedNames),
      },
    }));
    setDynamicMcpState({
      ...dynamicMcpState,
      clients: dynamicMcpState.clients.flatMap(replacementRows),
      tools: dynamicMcpState.tools.filter((tool) => !belongs(tool)),
    });
  }
  let connectorMounts;
  let connectorPromise;
  if (syncsConnectors) {
    let claudeAiConnectors = fetchClaudeAiConnectors(
      {
        getClients: () => getAppState().mcp.clients,
        getSuppressedPluginServers: () => getAppState().mcp.suppressedPluginMcpServers ?? [],
        applyMcpUpdate: (update) => {
          let removedNames = new Set();
          setAppState((state) => {
            let nextMcp = update(state.mcp);
            let nextNames = new Set(nextMcp.clients.map((client) => client.name));
            removedNames = new Set(
              state.mcp.clients.filter((client) => !nextNames.has(client.name)).map((client) => client.name),
            );
            return {
              ...state,
              mcp: nextMcp,
            };
          });
          if (removedNames.size === 0) return;
          let dynamicMcpState = getDynamicMcpState();
          if (!dynamicMcpState.clients.some((client) => removedNames.has(client.name))) return;
          let mapped = [...removedNames].map((name) => [name, getMcpPrefix(name)]);
          setDynamicMcpState({
            ...dynamicMcpState,
            clients: dynamicMcpState.clients.filter((client) => !removedNames.has(client.name)),
            tools: dynamicMcpState.tools.filter(
              (tool) => !mapped.some(([name, prefix]) => isToolFromMcpServer(tool, name, prefix)),
            ),
          });
        },
      },
      storageV5,
      credentials,
    );
    claudeAiConnectors.settled.catch(() => {});
    connectorPromise = claudeAiConnectors.mounted.catch(() => "mounted");
    let connectorWork = claudeAiConnectors.mounted
      .then(
        () => {},
        (error) =>
          logForDebugging(`MCP connector refetch after account switch failed: ${errorMessage(error)}`, {
            level: "warn",
          }),
      )
      .finally(() => {
        if (cliOwnedState.headlessConnectorMountInFlight === connectorWork)
          cliOwnedState.headlessConnectorMountInFlight = undefined;
      });
    cliOwnedState.headlessConnectorMountInFlight = connectorMounts = connectorWork;
  }
  if (redialNames.size === 0 || !identityResolved) return connectorMounts;
  let applyResult = (result) => {
    applyMcpReconnect(options, result.client.name, result);
  };
  let adapter = {
    getClients: () => [...getAppState().mcp.clients, ...getDynamicMcpState().clients],
    getSuppressedPluginServers: () => getAppState().mcp.suppressedPluginMcpServers ?? [],
    applyMcpUpdate: (update) =>
      setAppState((state) => ({
        ...state,
        mcp: update(state.mcp),
      })),
  };
  let redial = (configs) => {
    clientModule
      .getMcpToolsCommandsAndResources(applyResult, configs, storageV5, credentials)
      .catch((error) =>
        logForDebugging(`MCP re-dial after account switch failed: ${errorMessage(error)}`, {
          level: "warn",
        }),
      )
      .finally(() => {
        retryRemoteMcpServers(configs, adapter, storageV5, applyResult).catch((error) =>
          logForDebugging(`MCP re-dial retry after account switch failed: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
      });
  };
  redial(configsToRedial);
  if (Object.keys(connectorConfigs).length === 0 || !connectorPromise) return connectorMounts;
  let epochAtWait = identityEpoch();
  let heldRedial = connectorPromise
    .then((mountResult) => {
      if (mountResult === "superseded" || !isCurrentIdentityEpoch(epochAtWait)) return;
      let allowed = Object.create(null);
      for (let [key, value] of Object.entries(connectorConfigs)) {
        let blockCause = mcpDialBlockCause(key, value);
        if (blockCause)
          applyResult({
            client: failedServerRefusal(key, value, blockCause),
            tools: [],
            commands: [],
            attemptEpoch: epochAtWait,
          });
        else allowed[key] = value;
      }
      if (Object.keys(allowed).length > 0) redial(allowed);
    })
    .catch((error) =>
      logForDebugging(
        `MCP re-dial of held claude.ai proxy entries after account switch failed: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      ),
    );
  let allWork = Promise.all([connectorMounts, heldRedial])
    .then(() => {})
    .finally(() => {
      if (cliOwnedState.headlessConnectorMountInFlight === allWork)
        cliOwnedState.headlessConnectorMountInFlight = undefined;
    });
  cliOwnedState.headlessConnectorMountInFlight = allWork;
  return allWork;
}
//@ chunk-fpvb8c85.js:7840-8000 placement
/**
 * 判断重连结果是否需要提交到状态：客户端没变时不提交，跳过相同配置时也不提交。
 */
function shouldCommitReconnect(client, config, currentRow, isRunEnding) {
  let isSameClient = currentRow?.type === "connected" && currentRow.client === client.client;
  let slotMatches =
    currentRow !== undefined &&
    currentRow.type !== "disabled" &&
    serverCacheKey(client.name, currentRow.config) === serverCacheKey(client.name, config);
  return !isSameClient && (!isRunEnding || !slotMatches);
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
function createReconnectBackoff(deps) {
  let { getAppState, getDynamicMcpState, now = Date.now } = deps;
  let weakSet = new WeakSet();
  let weakMap = new WeakMap();
  let weakMap_2 = new WeakMap();
  let holdOffDelay = (client, attempt, elapsedMs) => {
    let delayMs = attempt > 1 ? retryDelayMs(attempt - 1) - elapsedMs : 0;
    let any = [...getAppState().mcp.clients, ...getDynamicMcpState().clients].some(
      (row) => row.type === "connected" && row.client === client.client,
    );
    if (delayMs <= 0 || !any || deps.isControlReconnectInFlight(client.name)) return 0;
    try {
      deps.onHeldOff?.(attempt, delayMs);
    } catch (error) {
      logForDebugging(`MCP reconnect hold-off observer failed for ${client.name}: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
    logMCPDebug(
      client.name,
      `${client.config.type} transport closed again soon after it connected: reconnecting in ${delayMs}ms`,
    );
    return delayMs;
  };
  return (clients) => {
    for (let row of clients) {
      if (row.type === "connected") weakMap_2.set(row.client, row);
      if (row.type !== "connected" || weakSet.has(row.client) || !isLocalMcpServer(row.config)) continue;
      weakSet.add(row.client);
      let connectedAt = now();
      let onClose = (reason) => {
        if (isShuttingDown() || deps.isRunEnding()) return;
        row.cleanup().catch(() => {});
        let max = Math.max(0, now() - connectedAt);
        let closeCount = max < CALL_MARK_MAX_CHARS ? (weakMap.get(row.client) ?? 0) + 1 : 0;
        (async () => {
          let holdOffMs = holdOffDelay(row, closeCount, max);
          let sleep = deps.sleep ?? unrefSleep;
          if (holdOffMs > 0) await sleep(holdOffMs);
          let latestRow = () => weakMap_2.get(row.client) ?? row;
          for (
            let j = 0;
            holdOffMs > 0 &&
            j < MAX_UNSETTLED_DIALS &&
            (await mcpClientModule().hasUnsettledDial(latestRow().name, latestRow().config));
            j++
          )
            await sleep(UNSETTLED_DIAL_SLEEP_MS);
          await reconnectMcpServer(
            deps,
            latestRow(),
            reason,
            closeCount,
            holdOffMs > 0,
            (client, connection) => weakMap.set(client.client, connection),
          );
        })().catch((error) =>
          logForDebugging(`MCP reconnect after close failed for ${row.name}: ${errorMessage(error)}`, {
            level: "warn",
          }),
        );
      };
      addMcpOnClose(row, () => onClose(false));
      if (isClientWithoutTransport(row)) setImmediate(onClose, true);
    }
  };
}
//@ chunk-fpvb8c85.js:9190-9235 placement
/**
 * 不阻止进程退出的 sleep。
 */
function unrefSleep(ms) {
  return sleep(ms, undefined, {
    unref: true,
  });
}
//@ chunk-fpvb8c85.js:9235-9307 placement (2.1.88 match: isLocalMcpServer, 1)
function isLocalMcpServer(config) {
  return config.type !== undefined && config.type !== "stdio" && config.type !== "sdk";
}
//@ chunk-fpvb8c85.js:9307-12719 placement
/**
 * 带退避地重连单个 MCP 服务器（检查会话结束、配置变化）。
 */
async function reconnectMcpServer(
  handles,
  client,
  foundClosed,
  youngCloses,
  useKeptConnection,
  onReconnected,
) {
  let {
    getAppState,
    getDynamicMcpState,
    storageV5,
    credentials,
    isControlReconnectInFlight,
    isRunEnding,
    onReconnected: onReconnected_2,
    sleep = unrefSleep,
    random = Math.random,
  } = handles;
  let { name: serverName, config } = client;
  let epochAtStart = identityEpoch();
  let shouldStop = () =>
    isShuttingDown() || isRunEnding() || (identityEpoch() !== epochAtStart && isRemoteMcpTransport(config));
  let currentRow = () =>
    getAppState().mcp.clients.find((client) => client.name === serverName) ??
    getDynamicMcpState().clients.find((client) => client.name === serverName);
  let ourRow = client;
  let ownsRow = () => currentRow() === ourRow;
  let apply = (result) => {
    applyMcpReconnect(handles, serverName, result);
  };
  let clientModule = mcpClientModule();
  let totalAttempts = ANSWER_STREAM_GRACE_MS + MAX_REOPEN_ATTEMPTS;
  for (let idx = 1; idx <= totalAttempts; idx++) {
    let backgroundAttempt = idx - ANSWER_STREAM_GRACE_MS;
    if (idx > 1)
      await sleep(
        backgroundAttempt > 0
          ? fullJitterBackoffMs({
              baseMs: REOPEN_REFETCH_MS,
              capMs: MAX_REOPEN_REFETCH_MS,
              floorMs: REOPEN_REFETCH_MS / 2,
              attempt: backgroundAttempt - 1,
              random,
            })
          : retryDelayMs(idx - 1),
      );
    using retryPass = backgroundAttempt > 0 ? trackTransientRetryPass([serverName]) : undefined;
    if (shouldStop() || !ownsRow()) return;
    let attemptEpoch = identityEpoch();
    if (backgroundAttempt > 0) {
      let pendingRow = {
        name: serverName,
        type: "pending",
        config,
      };
      if (refusalStateFor(serverName, pendingRow)) {
        apply({
          client: pendingRow,
          tools: [],
          commands: [],
          attemptEpoch,
        });
        return;
      }
      if (await clientModule.hasUnsettledDial(serverName, config)) {
        if (idx < totalAttempts) {
          logMCPDebug(
            serverName,
            `Background reconnect attempt ${backgroundAttempt}/${MAX_REOPEN_ATTEMPTS} skipped: another reconnect to this server is in progress; will try again at the next attempt`,
          );
          continue;
        }
        if (!shouldStop() && ownsRow() && !isControlReconnectInFlight(serverName)) {
          logMCPDebug(
            serverName,
            `Reconnect gave up after ${idx} attempts: another reconnect to this server is still in progress; leaving it to finish`,
          );
          logFeatureBad("mcp_slow_reconnect", "gave_up", {
            attempts: idx,
            found_closed: foundClosed,
          });
        }
        return;
      }
      if (shouldStop() || !ownsRow()) return;
    } else {
      let pendingRow = {
        name: serverName,
        type: "pending",
        config,
        reconnectAttempt: idx,
        maxReconnectAttempts: ANSWER_STREAM_GRACE_MS,
      };
      apply({
        client: pendingRow,
        ...serverItemsOf(getAppState().mcp, serverName),
        attemptEpoch,
      });
      ourRow = pendingRow;
    }
    if (!ownsRow() || isControlReconnectInFlight(serverName)) return;
    logMCPDebug(
      serverName,
      idx === 1
        ? `${config.type} transport ${foundClosed ? "had already closed when wired" : "closed"} \u2014 reconnecting (attempt 1/${ANSWER_STREAM_GRACE_MS})`
        : backgroundAttempt > 0
          ? `Background reconnect attempt ${backgroundAttempt}/${MAX_REOPEN_ATTEMPTS}`
          : `Reconnect attempt ${idx}/${ANSWER_STREAM_GRACE_MS}`,
    );
    let settled =
      useKeptConnection && idx === 1
        ? await clientModule.peekSettledConnection(serverName, config)
        : undefined;
    let keptConnection =
      settled?.type === "connected" && !isClientWithoutTransport(settled)
        ? withConfigScope(settled, config)
        : undefined;
    let result = {
      ...(keptConnection !== undefined
        ? {
            client: keptConnection,
            ...serverItemsOf(getAppState().mcp, serverName),
          }
        : await clientModule
            .reconnectMcpServerImpl(serverName, config, storageV5, credentials, {
              keepConnectionInUse: true,
            })
            .catch((error) => ({
              client: {
                name: serverName,
                type: "failed",
                config,
                error: errorMessage(error),
              },
              tools: [],
              commands: [],
            }))),
      attemptEpoch,
    };
    let client = result.client.type === "connected" ? result.client : undefined;
    let isKeptClient =
      client !== undefined &&
      isSameConnectedClient(await clientModule.peekSettledConnection(serverName, config), client);
    let disposeIfUnused = () => {
      if (client && shouldCommitReconnect(client, config, currentRow(), isKeptClient && !isRunEnding()))
        clientModule.detachAndCloseConnection(client).catch(() => {});
    };
    if (shouldStop() || !ownsRow() || isControlReconnectInFlight(serverName)) {
      disposeIfUnused();
      return;
    }
    let keptWithToolError =
      result.keptConnectionInUse === true &&
      client?.toolsListError !== undefined &&
      refusalStateFor(serverName, client) === undefined;
    if (client && isKeptClient && !keptWithToolError) {
      onReconnected(client, youngCloses + idx - 1);
      apply(result);
      if (currentRow() === client) {
        if (client === keptConnection)
          refreshMcpServerTools(
            client,
            (tools, commands) => {
              commitMcpReconnect(handles, tools, commands, client.config);
            },
            storageV5,
          ).catch((error) =>
            logForDebugging(
              `MCP tools refresh over a kept connection failed for ${serverName}: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            ),
          );
        logMCPDebug(serverName, `Reconnected (attempt ${idx})`);
        logFeatureOk(backgroundAttempt > 0 ? "mcp_slow_reconnect" : "mcp_auto_reconnect", {
          attempts: idx,
          found_closed: foundClosed,
          young_closes: youngCloses,
        });
        onReconnected_2(client);
      }
      return;
    }
    disposeIfUnused();
    let closedFailure = client && {
      name: serverName,
      type: "failed",
      config,
      error: keptWithToolError
        ? "Its tools could not be listed"
        : "Connection closed again while reconnecting",
    };
    let failureRow = closedFailure ?? result.client;
    let failureWithCode = closedFailure
      ? {
          ...closedFailure,
          errorCode: "ConnectionClosed",
        }
      : failureRow;
    let retryable = isRetryableConnectionFailure(failureWithCode);
    if (idx === ANSWER_STREAM_GRACE_MS || (backgroundAttempt > 0 && (!retryable || idx === totalAttempts))) {
      logMCPDebug(
        serverName,
        backgroundAttempt <= 0 && retryable
          ? `Still failing after ${idx} attempts`
          : `Reconnect gave up after ${idx} attempts: ${failureRow.type}`,
      );
      apply({
        client: failureRow,
        tools: failureRow.type === "needs-auth" ? mcpAuthToolsFor(serverName, config) : [],
        commands: [],
        attemptEpoch,
      });
      if (currentRow() !== failureRow) return;
      if (failureRow.type === "needs-auth") {
        logFeatureSad(backgroundAttempt > 0 ? "mcp_slow_reconnect" : "mcp_auto_reconnect", "needs_auth", {
          attempts: idx,
          found_closed: foundClosed,
          young_closes: youngCloses,
        });
        return;
      }
      if (backgroundAttempt > 0) {
        logFeatureBad("mcp_slow_reconnect", retryable ? "gave_up" : "not_retryable", {
          attempts: idx,
          found_closed: foundClosed,
        });
        return;
      }
      logFeatureBad("mcp_auto_reconnect", "exhausted", {
        attempts: idx,
        found_closed: foundClosed,
        young_closes: youngCloses,
        goes_slow: retryable,
      });
      if (!retryable) return;
      ourRow = failureRow;
      logMCPDebug(
        serverName,
        `Reconnect attempts spent; retrying in the background, up to ${MAX_REOPEN_ATTEMPTS} more times`,
      );
      continue;
    }
    logMCPDebug(
      serverName,
      backgroundAttempt > 0
        ? `Background reconnect attempt ${backgroundAttempt} did not connect (${failureRow.type})`
        : `Reconnect attempt ${idx} did not connect (${failureRow.type}); next in ${retryDelayMs(idx)}ms`,
    );
  }
}
//@ chunk-fpvb8c85.js:12719-12738 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fpvb8c85.js:12719", () => {
  weakMap = new WeakMap();
});
//@ chunk-fpvb8c85.js:12738-12771 placement
/**
 * 取某客户端待提交的重连记录。
 */
function pendingReconnect(client) {
  return weakMap.get(client);
}
//@ chunk-fpvb8c85.js:12771-13469 placement
/**
 * 提交重连后的客户端（配置变化时放弃）。
 */
function commitMcpReconnect(handles, serverName, tools, config) {
  let { setAppState, getDynamicMcpState, setDynamicMcpState } = handles;
  let skipUnchanged = isUnchangedRelistSkipOn();
  let changed = false;
  let nameTaken = false;
  let pendingCommit;
  setAppState((state) => {
    let previous = state.mcp.clients.find((client) => client.name === serverName);
    let redecorated = redecorateTools(previous, tools, config);
    if (redecorated === undefined) {
      nameTaken = true;
      return state;
    }
    if (
      skipUnchanged &&
      previous?.type === "connected" &&
      sameServerTools(state.mcp.tools, serverName, redecorated)
    ) {
      changed = true;
      pendingCommit = {
        row: previous,
        tools: redecorated,
      };
      return state;
    }
    let nextState = replaceServerTools(state, serverName, redecorated);
    changed = nextState !== state;
    pendingCommit =
      changed && previous !== undefined
        ? {
            row: previous,
            tools: redecorated,
          }
        : undefined;
    return nextState;
  });
  let dynamicMcpState = getDynamicMcpState();
  let previous = dynamicMcpState.clients.find((client) => client.name === serverName);
  let redecoratedDynamic = redecorateTools(previous, tools, config);
  if (redecoratedDynamic === undefined) nameTaken = true;
  else if (
    skipUnchanged &&
    previous?.type === "connected" &&
    sameServerTools(dynamicMcpState.tools, serverName, redecoratedDynamic)
  )
    changed = true;
  else {
    let chromeClient = findChromeClient(dynamicMcpState, serverName, redecoratedDynamic);
    if (chromeClient !== dynamicMcpState) {
      setDynamicMcpState(chromeClient);
      changed = true;
    }
  }
  if (pendingCommit !== undefined)
    if (previous?.type === "pending") weakMap.set(pendingCommit.row, pendingCommit.tools);
    else weakMap.delete(pendingCommit.row);
  if (nameTaken)
    logMCPDebug(serverName, "A re-queried tool list was not applied: another server holds the name");
  return changed;
}
//@ chunk-fpvb8c85.js:13469-13512 placement
/**
 * 生成“提交重连”的回调。
 */
function makeCommitReconnect(handles) {
  return (serverName, tools, config) => commitMcpReconnect(handles, serverName, tools, config);
}
//@ chunk-fpvb8c85.js:13512-14736 placement
/**
 * 监视已连接客户端的断开并触发重连。
 */
function watchMcpDisconnects(deps) {
  let { getAppState, getDynamicMcpState } = deps.stores;
  let weakSet = new WeakSet();
  let weakMap = new WeakMap();
  return (clients) => {
    for (let row of clients) {
      if (row.type === "connected") weakMap.set(row.client, row);
      if (row.type !== "connected" || weakSet.has(row.client)) continue;
      weakSet.add(row.client);
      if (!row.capabilities?.tools?.listChanged) continue;
      let serverName = row.name;
      mcpClientModule().onMcpToolListChanged(row, async (cause) => {
        logMCPDebug(
          serverName,
          cause === REOPEN_REFETCH
            ? "Synthesized tools refetch after listen-stream reopen (no notification received)"
            : cause === BEFORE_HANDLER
              ? "Refreshing tools for a tools/list_changed notification received before this handler was registered"
              : "Received tools/list_changed notification, refreshing tools",
        );
        let currentRow =
          getAppState().mcp.clients.find((client) => client.name === serverName) ??
          getDynamicMcpState().clients.find((client) => client.name === serverName);
        let rowVersion = weakMap.get(row.client) ?? row;
        let target =
          currentRow !== undefined &&
          serverCacheKey(serverName, currentRow.config) === serverCacheKey(serverName, rowVersion.config)
            ? withConfigScope(rowVersion, currentRow.config)
            : rowVersion;
        weakMap.set(row.client, target);
        let result = await refreshMcpServerTools(
          target,
          (name, tools) => {
            commitMcpReconnect(deps.stores, name, tools, target.config);
          },
          deps.storageV5,
        );
        if (result.status === "kept-previous") {
          logMCPDebug(serverName, "tools/list failed after list_changed \u2014 keeping previous tool set");
          return;
        }
        let newCount = result.newTools.length;
        let verdict = toolListingVerdict(result.newTools);
        let logChange = (previousCount) =>
          logEvent("tengu_mcp_list_changed", {
            mcpServerKeyHash: toolNameForTelemetry(serverName),
            type: lit("tools"),
            cause: refetchReasonTelemetry(cause),
            previousCount,
            newCount,
            ...toolsListAheadTelemetry(row),
            ...verdict,
          });
        if (result.previousToolsPromise)
          result.previousToolsPromise.then(
            (previousTools) => logChange(previousTools.length),
            () => logChange(),
          );
        else logChange();
      });
    }
  };
}
export {
  refusalStateFor,
  applyMcpReconnect,
  resolveReconnectConfig,
  reconnectMcpOnIdentityChange,
  watchMcpDisconnects,
  createReconnectBackoff,
  makeCommitReconnect,
  markServerDisabled,
  pendingReconnect,
  serverItemsOf,
  shouldCommitReconnect,
};
