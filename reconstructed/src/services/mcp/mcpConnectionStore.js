/**
 * services/mcp/mcpConnectionStore.ts
 *
 * 2.1.316 新增：MCP 连接状态存储。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kvr3v8w9.js (13)
 * attribution: placement 13
 */
import { identityId2 } from "../../types/ids.js";
import { reject_default } from "../../../vendor/lodash-es/reject.js";
import { commandBelongsToServer, excludeStalePluginClients } from "./utils.js";
import { omitKeys } from "../../utils/hooks/hookCommandResolution.js";
import { fieldAccessor } from "../../state/sliceHelpers.js";
import {
  markClientNeedsAuth,
  setMcpClientInAppState,
  redecorateTools,
  replaceServerTools,
  withMcpConfig,
} from "./mcpClientState.js";
import { withConfigScope, decorateMcpTools, stampToolScope } from "./mcpToolDecoration.js";
import { serverCacheKey } from "./client.js";
import { isMcpServerDisabled, mcpDialBlockCause, suppressedConnectorsEqual } from "./config.js";
import { logMCPDebug } from "../../utils/log.js";
import { getMcpPrefix, isToolFromMcpServer } from "./mcpStringUtils.js";
import { isRemoteMcpTransport } from "./discoveryIdentity.js";
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { mcpGateError } from "./mcpToggleMessages.js";
import { isDiscoveryCacheOn } from "./mcpAccountKey.js";
import { checkMcpServerHealth_2 } from "../../cli/handlers/mcp.js";
import { partitionAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-kvr3v8w9.js:646-715 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./emitTripwireEvent.lazy.js").mcpClientModule();
}
//@ chunk-kvr3v8w9.js:715-809 placement
/**
 * 关闭连接并清理服务器缓存。
 */
function closeAndClearServer(row) {
  identityId2(row.client).onclose = undefined;
  mcpClientModule()
    .clearServerCache(row.name, row.config)
    .catch(() => {});
}
//@ chunk-kvr3v8w9.js:809-989 placement
function withoutServerEntries(state, name, mcpPrefix) {
  return {
    tools: reject_default(state.tools, (tool) => tool.name?.startsWith(mcpPrefix)),
    commands: reject_default(state.commands, (command) => commandBelongsToServer(command, name)),
    resources: omitKeys(state.resources, name),
    resourceTemplates: omitKeys(state.resourceTemplates, name),
  };
}
//@ chunk-kvr3v8w9.js:989-6346 placement
/**
 * AppState.mcp 的连接状态存储：标记/清除 needs-auth、收编连接结果（检查同名配置、禁用、策略阻止）、替换工具列表、维护被抑制的连接器与保留名拒绝、加入待连接服务器、按配置调和、身份边界时重置受影响服务器，以及批量应用排队的连接结果。
 */
class McpConnectionStore {
  #e;
  constructor(accessor) {
    this.#e = accessor;
  }
  static over(store) {
    return new McpConnectionStore(fieldAccessor(store.getState, store.setState, "mcp"));
  }
  get() {
    return this.#e.get();
  }
  markNeedsAuth(serverName) {
    this.#e.set((state) => markClientNeedsAuth(state, serverName));
  }
  async clearNeedsAuth(serverName) {
    let found = this.get().clients.find((client) => client.name === serverName);
    if (found?.type !== "needs-auth") return;
    let connection = await mcpClientModule().peekSettledConnection(serverName, found.config);
    if (connection?.type !== "connected") return;
    this.#e.set((state) => ({
      ...state,
      clients: state.clients.map((client) =>
        client === found ? withConfigScope(connection, found.config) : client,
      ),
    }));
  }
  adoptServer(serverName, result, options) {
    let outcome = "adopted";
    this.#e.set((mcpState) => {
      if (options?.asked === true)
        return setMcpClientInAppState(
          {
            mcp: mcpState,
          },
          serverName,
          result,
        ).mcp;
      let found = mcpState.clients.find((client) => client.name === serverName);
      outcome = adoptRefusal(found, result) ?? "adopted";
      if (found === undefined) return mcpState;
      if (outcome !== "adopted") return applyRefusalToRow(mcpState, found, outcome);
      return setMcpClientInAppState(
        {
          mcp: mcpState,
        },
        serverName,
        rebindAdoption(found, result),
        {
          appendIfAbsent: false,
        },
      ).mcp;
    });
    return outcome;
  }
  markReconnectDiscarded(serverName, config) {
    this.#e.set((state) => {
      let row = state.clients.find((client) => client.name === serverName);
      if (row === undefined || serverCacheKey(serverName, row.config) !== serverCacheKey(serverName, config))
        return state;
      if (isMcpServerDisabled(serverName)) return applyRefusalToRow(state, row, "disabled");
      if (mcpDialBlockCause(serverName, row.config) !== null)
        return applyRefusalToRow(state, row, "policy-blocked");
      if (row.type !== "connected") return state;
      return {
        ...state,
        clients: state.clients.map((client) =>
          client === row
            ? {
                name: serverName,
                type: "failed",
                config: row.config,
                error: "Its connection was closed while signing in again",
              }
            : client,
        ),
        ...withoutServerItems(state, serverName),
      };
    });
  }
  swapServerTools(serverName, tools, config) {
    let changed = false;
    this.#e.set((state) => {
      let redecorated = redecorateTools(
        state.clients.find((client) => client.name === serverName),
        tools,
        config,
      );
      if (redecorated === undefined) {
        logMCPDebug(serverName, "A re-queried tool list was not applied: another server holds the name");
        return state;
      }
      let nextState = replaceServerTools(
        {
          mcp: state,
        },
        serverName,
        redecorated,
      );
      changed = nextState.mcp !== state;
      return nextState.mcp;
    });
    return changed;
  }
  setSuppressedClaudeAiConnectors(connectors) {
    this.#e.set((state) =>
      suppressedConnectorsEqual(state.suppressedClaudeAiConnectors ?? [], connectors)
        ? state
        : {
            ...state,
            suppressedClaudeAiConnectors: connectors,
          },
    );
  }
  setReservedNameRefusals(refusals) {
    this.#e.set((state) => {
      let reservedNameRefusals = state.reservedNameRefusals ?? [];
      return reservedNameRefusals.length === refusals.length &&
        reservedNameRefusals.every(
          (reservedNameRefusal, index) =>
            reservedNameRefusal.scope === refusals[index]?.scope &&
            reservedNameRefusal.name === refusals[index]?.name,
        )
        ? state
        : {
            ...state,
            reservedNameRefusals: refusals,
          };
    });
  }
  addPendingServers(configs) {
    this.#e.set((state) => {
      let pendingRows = pendingRowsFor(state, configs);
      if (pendingRows.length === 0) return state;
      return {
        ...state,
        clients: [...state.clients, ...pendingRows],
      };
    });
  }
  reconcileConfiguredServers(configs, workspaceRoot, onStale) {
    this.#e.set((state) => {
      let { stale, ...rest } = excludeStalePluginClients(state, configs, workspaceRoot);
      onStale(stale);
      let pendingRows = pendingRowsFor(rest, configs);
      if (pendingRows.length === 0 && stale.length === 0) {
        if (state.clientsInitialized) return state;
        return {
          ...state,
          clientsInitialized: true,
        };
      }
      return {
        ...state,
        ...rest,
        clientsInitialized: true,
        clients: [...rest.clients, ...pendingRows],
      };
    });
  }
  applyIdentityBoundary(pickupNames, dropNames) {
    let affectedNames = [...pickupNames, ...dropNames];
    if (affectedNames.length === 0) return;
    this.#e.set((state) => {
      let mapped = affectedNames.map((name) => [name, getMcpPrefix(name)]);
      let belongs = (tool) => mapped.some(([name, prefix]) => isToolFromMcpServer(tool, name, prefix));
      return {
        ...state,
        clients: state.clients.flatMap((client) =>
          dropNames.has(client.name)
            ? []
            : pickupNames.has(client.name)
              ? [
                  {
                    name: client.name,
                    type: "pending",
                    config: client.config,
                  },
                ]
              : [client],
        ),
        tools: reject_default(state.tools, belongs),
        commands: reject_default(state.commands, (command) =>
          affectedNames.some((name) => commandBelongsToServer(command, name)),
        ),
        resources: omitKeys(state.resources, affectedNames),
        resourceTemplates: omitKeys(state.resourceTemplates, affectedNames),
      };
    });
  }
  applyQueuedUpdates(updates, hooks) {
    this.#e.set((state) => {
      let nextState = state;
      for (let update of updates) {
        if (update.epoch !== hooks.currentEpoch && isRemoteMcpTransport(update.config)) {
          if (update.type === "connected") mcpClientModule().detachAndCloseConnection(update);
          continue;
        }
        let found = nextState.clients.find((client) => client.name === update.name);
        let relation = rowRelation(found, update);
        let rebound =
          relation === "stands" && found !== undefined ? rebindToRowConfig(found, update) : update;
        let {
          tools,
          commands,
          resources,
          resourceTemplates,
          replaceOnly,
          epoch,
          asked,
          superseded,
          ...rest
        } = rebound;
        let row = rest;
        let isRefusalRow = row.type === "disabled" || row.type === "failed";
        let nextTools = isRefusalRow ? (tools ?? []) : tools;
        let nextCommands = isRefusalRow ? (commands ?? []) : commands;
        let nextResources = isRefusalRow ? (resources ?? []) : resources;
        let nextTemplates = isRefusalRow ? (resourceTemplates ?? []) : resourceTemplates;
        let mcpPrefix = getMcpPrefix(row.name);
        let index = nextState.clients.findIndex((client) => client.name === row.name);
        let currentClient = index !== -1 ? nextState.clients[index] : undefined;
        let isSameConnection =
          row.type === "connected" &&
          currentClient?.type === "connected" &&
          currentClient.client === row.client;
        let isPolicyBlocked =
          isConnectedOrCached(row) && mcpDialBlockCause(row.name, row.config) === "managed-policy";
        if (
          row.type !== "disabled" &&
          !isSameConnection &&
          isMcpServerDisabled(row.name) &&
          !(isPolicyBlocked && currentClient?.type !== "disabled")
        ) {
          if (isPolicyBlocked) hooks.onDoorDenied(row.name);
          if (row.type === "connected") closeAndClearServer(row);
          hooks.onOrphanedDisable(row.name);
          if (
            currentClient &&
            currentClient.type !== "disabled" &&
            (currentClient.type !== "connected" || !isConnectedOrCached(row))
          )
            nextState = {
              ...nextState,
              clients: nextState.clients.map((client) =>
                client.name === row.name
                  ? {
                      name: row.name,
                      type: "disabled",
                      config: relation === "elsewhere" ? client.config : row.config,
                    }
                  : client,
              ),
              ...withoutServerEntries(nextState, row.name, mcpPrefix),
            };
          continue;
        }
        if (relation === "elsewhere" && currentClient !== undefined) {
          if (row.type !== "disabled") {
            if (row.type === "connected") closeAndClearServer(row);
            logMCPDebug(row.name, `A late ${row.type} result was dropped: another server holds the name`);
            continue;
          }
          if (currentClient.type === "connected") closeAndClearServer(currentClient);
          row = {
            name: row.name,
            type: "disabled",
            config: currentClient.config,
          };
        }
        let blockCause = isConnectedOrCached(row) ? mcpDialBlockCause(row.name, row.config) : null;
        if (blockCause) {
          hooks.onDoorDenied(row.name);
          let config = row.config;
          if (row.type === "connected") identityId2(row.client).onclose = undefined;
          else if (currentClient?.type === "connected") {
            identityId2(currentClient.client).onclose = undefined;
            config = currentClient.config;
          }
          mcpClientModule()
            .clearServerCache(row.name, config)
            .catch(() => {});
          if (index === -1) continue;
          nextState = {
            ...nextState,
            clients: nextState.clients.map((client) =>
              client.name === row.name
                ? {
                    name: row.name,
                    type: "failed",
                    config: row.config,
                    ...mcpGateError(blockCause, row.name, row.config),
                  }
                : client,
            ),
            ...withoutServerEntries(nextState, row.name, mcpPrefix),
          };
          continue;
        }
        if (
          replaceOnly &&
          index !== -1 &&
          (nextState.clients[index]?.type === "needs-auth" || nextState.clients[index]?.type === "disabled")
        ) {
          if (row.type === "connected") {
            identityId2(row.client).onclose = undefined;
            mcpClientModule()
              .clearServerCache(row.name, row.config)
              .catch(() => {});
          }
          continue;
        }
        if (index === -1 && (replaceOnly || (relation === "nowhere" && !superseded))) {
          if (row.type === "connected") {
            identityId2(row.client).onclose = undefined;
            mcpClientModule()
              .clearServerCache(row.name, row.config)
              .catch(() => {});
          }
          if (!replaceOnly) {
            hooks.onOrphanedDisable(row.name);
            logMCPDebug(row.name, `A late ${row.type} result was dropped: no row holds the name`);
          }
          continue;
        }
        if (
          replaceOnly &&
          isDiscoveryCacheOn() &&
          index !== -1 &&
          serverCacheKey(row.name, nextState.clients[index].config) !== serverCacheKey(row.name, row.config)
        ) {
          if (row.type === "connected") mcpClientModule().detachAndCloseConnection(row);
          continue;
        }
        if (index !== -1 && !checkMcpServerHealth_2(nextState.clients[index], row)) {
          if (relation === "asked") nextState = refreshRowConfig(nextState, row);
          continue;
        }
        let clients =
          index === -1
            ? [...nextState.clients, row]
            : nextState.clients.map((client) => (client.name === row.name ? row : client));
        let tools_2 =
          nextTools === undefined
            ? nextState.tools
            : [...reject_default(nextState.tools, (tool) => tool.name?.startsWith(mcpPrefix)), ...nextTools];
        let commands_2 =
          nextCommands === undefined
            ? nextState.commands
            : [
                ...reject_default(nextState.commands, (command) => commandBelongsToServer(command, row.name)),
                ...nextCommands,
              ];
        let resources_2 =
          nextResources === undefined
            ? nextState.resources
            : nextResources.length > 0
              ? {
                  ...nextState.resources,
                  [row.name]: nextResources,
                }
              : omitKeys(nextState.resources, row.name);
        let resourceTemplates_2 =
          nextTemplates === undefined
            ? nextState.resourceTemplates
            : nextTemplates.length > 0
              ? {
                  ...nextState.resourceTemplates,
                  [row.name]: nextTemplates,
                }
              : omitKeys(nextState.resourceTemplates, row.name);
        nextState = {
          ...nextState,
          clients,
          tools: tools_2,
          commands: commands_2,
          resources: resources_2,
          resourceTemplates: resourceTemplates_2,
        };
      }
      return nextState;
    });
  }
}
//@ chunk-kvr3v8w9.js:6346-6520 placement
function pendingRowsFor(state, configs) {
  let existingNames = new Set(state.clients.map((client) => client.name));
  return Object.entries(configs)
    .filter(([key]) => !existingNames.has(key))
    .map(([key, value]) => ({
      name: key,
      type: isMcpServerDisabled(key) ? "disabled" : "pending",
      config: value,
    }));
}
//@ chunk-kvr3v8w9.js:6520-6609 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool, serverName) {
  return tool.mcpInfo?.serverName === undefined
    ? commandBelongsToServer(tool, serverName)
    : tool.mcpInfo.serverName === serverName;
}
//@ chunk-kvr3v8w9.js:6609-6788 placement
function withoutServerItems(mcpState, serverName) {
  let mcpPrefix = getMcpPrefix(serverName);
  return {
    tools: reject_default(mcpState.tools, (tool) => isToolFromMcpServer(tool, serverName, mcpPrefix)),
    commands: reject_default(mcpState.commands, (tool) => getToolNameForPermissionCheck(tool, serverName)),
    resources: omitKeys(mcpState.resources, serverName),
    resourceTemplates: omitKeys(mcpState.resourceTemplates, serverName),
  };
}
//@ chunk-kvr3v8w9.js:6788-6934 placement
function rowRelation(currentRow, update) {
  if (update.asked === true) return "asked";
  if (currentRow === undefined) return "nowhere";
  return serverCacheKey(update.name, currentRow.config) === serverCacheKey(update.name, update.config)
    ? "stands"
    : "elsewhere";
}
//@ chunk-kvr3v8w9.js:6934-7109 placement
function rebindToRowConfig(row, update) {
  let connection = {
    name: update.name,
    config: row.config,
  };
  return {
    ...withMcpConfig(update, row.config),
    ...(update.tools !== undefined && {
      tools: decorateMcpTools(connection, update.tools),
    }),
    ...(update.commands !== undefined && {
      commands: stampToolScope(connection, update.commands),
    }),
  };
}
//@ chunk-kvr3v8w9.js:7109-7504 placement
/**
 * 配置的非身份字段变化时，更新连接行的配置并重新装饰其工具与命令。
 */
function refreshRowConfig(state, input) {
  let found = state.clients.find((client) => client.name === input.name);
  if (
    found === undefined ||
    serverCacheKey(input.name, found.config) !== serverCacheKey(input.name, input.config)
  )
    return state;
  let reboundClient = withMcpConfig(found, input.config);
  if (reboundClient === found) return state;
  let connection = {
    name: input.name,
    config: input.config,
  };
  let mcpPrefix = getMcpPrefix(input.name);
  let [serverTools, otherTools] = partitionAlias(state.tools, (tool) =>
    isToolFromMcpServer(tool, input.name, mcpPrefix),
  );
  let [serverCommands, otherCommands] = partitionAlias(state.commands, (tool) =>
    getToolNameForPermissionCheck(tool, input.name),
  );
  return {
    ...state,
    clients: state.clients.map((client) => (client === found ? reboundClient : client)),
    tools: [...otherTools, ...decorateMcpTools(connection, serverTools)],
    commands: [...otherCommands, ...stampToolScope(connection, serverCommands)],
  };
}
//@ chunk-kvr3v8w9.js:7504-7716 placement
function adoptRefusal(existingRow, result) {
  let { name: serverName } = result.client;
  if (existingRow === undefined) return "no-row";
  if (serverCacheKey(serverName, existingRow.config) !== serverCacheKey(serverName, result.client.config))
    return "another-server";
  if (isMcpServerDisabled(serverName)) return "disabled";
  if (mcpDialBlockCause(serverName, existingRow.config) !== null) return "policy-blocked";
  return;
}
//@ chunk-kvr3v8w9.js:7716-8039 placement
/**
 * 把禁用或策略拦截的结果应用到连接行：标记为 disabled，或为策略拦截生成带原因的 failed 状态，并移除其条目。
 */
function applyRefusalToRow(mcpState, row, reason) {
  if (reason !== "disabled" && reason !== "policy-blocked") return mcpState;
  let { name, config } = row;
  let blockCause = reason === "policy-blocked" ? mcpDialBlockCause(name, config) : null;
  if (blockCause === null && row.type === "disabled") return mcpState;
  let nextRow =
    blockCause === null
      ? {
          name,
          type: "disabled",
          config,
        }
      : {
          name,
          type: "failed",
          config,
          ...mcpGateError(blockCause, name, config),
        };
  return {
    ...mcpState,
    clients: mcpState.clients.map((client) => (client === row ? nextRow : client)),
    ...withoutServerItems(mcpState, name),
  };
}
//@ chunk-kvr3v8w9.js:8039-8181 placement
function rebindAdoption(row, adopted) {
  let connection = {
    name: row.name,
    config: row.config,
  };
  return {
    ...adopted,
    client: withMcpConfig(adopted.client, row.config),
    tools: decorateMcpTools(connection, adopted.tools),
    commands: stampToolScope(connection, adopted.commands),
  };
}
export { McpConnectionStore, getToolNameForPermissionCheck };
