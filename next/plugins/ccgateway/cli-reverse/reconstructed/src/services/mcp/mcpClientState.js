/**
 * services/mcp/mcpClientState.ts
 *
 * 2.1.316 新增：按新的客户端列表调和动态 MCP 状态（移除、更新工具前缀）；在 AppState 中替换或追加一个 MCP 客户端及其工具/命令/资源等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-efym3dq7.js (8)
 * attribution: placement 8
 */
import { isConnectedOrCached } from "../../skills/bundled/scheduleRemoteAgents.js";
import { getMcpPrefix, isToolFromMcpServer } from "./mcpStringUtils.js";
import { commandBelongsToServer } from "./utils.js";
import { partitionAlias, import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { serverCacheKey } from "./client.js";
import { decorateMcpTools } from "./mcpToolDecoration.js";

//@ chunk-efym3dq7.js:347-614 placement
/**
 * 在 AppState 中把指定 MCP 客户端标记为需要认证。
 */
function markClientNeedsAuth(state, serverName) {
  let index = state.clients.findIndex((client) => client.name === serverName);
  if (index === -1) return state;
  let existing = state.clients[index];
  if (!existing || (!isConnectedOrCached(existing) && existing.type !== "needs-auth")) return state;
  let clients = [...state.clients];
  clients[index] =
    existing.type === "needs-auth"
      ? {
          ...existing,
        }
      : {
          name: serverName,
          type: "needs-auth",
          config: existing.config,
        };
  return {
    ...state,
    clients,
  };
}
//@ chunk-efym3dq7.js:614-1154 placement
/**
 * 在 AppState 中替换或追加一个 MCP 客户端及其工具/命令/资源。
 */
function setMcpClientInAppState(state, serverName, result, options) {
  let any = state.mcp.clients.some((client) => client.name === serverName);
  if (!any && options?.appendIfAbsent === false) return state;
  let mcpPrefix = getMcpPrefix(serverName);
  return {
    ...state,
    mcp: {
      ...state.mcp,
      clients: any
        ? state.mcp.clients.map((client) => (client.name === serverName ? result.client : client))
        : [...state.mcp.clients, result.client],
      tools: [
        ...state.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, serverName, mcpPrefix)),
        ...result.tools,
      ],
      commands: [
        ...state.mcp.commands.filter((command) => !commandBelongsToServer(command, serverName)),
        ...result.commands,
      ],
      resources: result.resources
        ? {
            ...state.mcp.resources,
            [serverName]: result.resources,
          }
        : state.mcp.resources,
      resourceTemplates: result.resourceTemplates
        ? {
            ...state.mcp.resourceTemplates,
            [serverName]: result.resourceTemplates,
          }
        : state.mcp.resourceTemplates,
    },
  };
}
//@ chunk-efym3dq7.js:1154-1314 placement = findChromeClient (0.769)
function findChromeClient(dynamicMcpState, serverName, tools) {
  if (!dynamicMcpState.clients.some((client) => client.name === serverName && client.type === "connected"))
    return dynamicMcpState;
  let mcpPrefix = getMcpPrefix(serverName);
  return {
    ...dynamicMcpState,
    tools: [
      ...dynamicMcpState.tools.filter((tool) => !isToolFromMcpServer(tool, serverName, mcpPrefix)),
      ...tools,
    ],
  };
}
//@ chunk-efym3dq7.js:1314-1497 placement
/**
 * 替换 AppState 中某个已连接服务器的工具列表。
 */
function replaceServerTools(state, serverName, tools) {
  if (!state.mcp.clients.some((client) => client.name === serverName && client.type === "connected"))
    return state;
  let mcpPrefix = getMcpPrefix(serverName);
  return {
    ...state,
    mcp: {
      ...state.mcp,
      tools: [
        ...state.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, serverName, mcpPrefix)),
        ...tools,
      ],
    },
  };
}
//@ chunk-efym3dq7.js:1497-1668 placement
/**
 * 判断服务器的工具列表是否与新列表完全相同且无同名冲突。
 */
function sameServerTools(tools, serverName, nextTools) {
  let mcpPrefix = getMcpPrefix(serverName);
  let [current, rest] = partitionAlias(tools, (tool) => isToolFromMcpServer(tool, serverName, mcpPrefix));
  let nextNames = new Set(nextTools.map((tool) => tool.name));
  return (
    current.length === nextTools.length &&
    current.every((tool, index) => tool === nextTools[index]) &&
    !rest.some((tool) => nextNames.has(tool.name))
  );
}
//@ chunk-efym3dq7.js:1668-2478 placement
/**
 * 按新的客户端列表调和动态 MCP 状态（移除、更新工具前缀）。
 */
function reconcileMcpClients(previous, dynamicMcpState, newDynamicState) {
  let previousClients = new Set(previous.clients);
  let previousByName = new Map(dynamicMcpState.clients.map((client) => [client.name, client]));
  let next = newDynamicState;
  for (let client of newDynamicState.clients) {
    if (!previousClients.has(client)) continue;
    let previousClient = previousByName.get(client.name);
    let mcpPrefix = getMcpPrefix(client.name);
    let belongs = (tool) => isToolFromMcpServer(tool, client.name, mcpPrefix);
    if (previousClient === undefined) {
      next = {
        ...next,
        clients: next.clients.filter((client_2) => client_2 !== client),
        tools: next.tools.filter((tool) => !belongs(tool)),
      };
      continue;
    }
    if (previousClient !== client)
      next = {
        ...next,
        clients: next.clients.map((client_2) => (client_2 === client ? previousClient : client_2)),
      };
    let filtered = dynamicMcpState.tools.filter(belongs);
    let filtered_2 = next.tools.filter(belongs);
    if (filtered.length === filtered_2.length && filtered.every((tool, index) => tool === filtered_2[index]))
      continue;
    next = {
      ...next,
      tools: [...next.tools.filter((tool) => !belongs(tool)), ...filtered],
    };
  }
  let previousNames = new Set(previous.clients.map((client) => client.name));
  let nextNames = new Set(newDynamicState.clients.map((client) => client.name));
  let filtered = dynamicMcpState.clients.filter(
    (client) => !previousNames.has(client.name) && !nextNames.has(client.name),
  );
  if (filtered.length > 0) {
    let mapped = filtered.map((client) => [client.name, getMcpPrefix(client.name)]);
    next = {
      ...next,
      clients: [...next.clients, ...filtered],
      tools: [
        ...next.tools,
        ...dynamicMcpState.tools.filter((tool) =>
          mapped.some(([name, prefix]) => isToolFromMcpServer(tool, name, prefix)),
        ),
      ],
    };
  }
  return next;
}
//@ chunk-efym3dq7.js:2478-2536 placement
/**
 * 配置不同时替换客户端的 config。
 */
function withMcpConfig(clientRow, config) {
  return import_sortedIndex_2(clientRow.config, config)
    ? clientRow
    : {
        ...clientRow,
        config,
      };
}
//@ chunk-efym3dq7.js:2536-2664 placement
/**
 * 配置未变时为工具重新附加服务器装饰，配置已变返回 undefined。
 */
function redecorateTools(previous, tools, config) {
  if (previous === undefined) return tools;
  return serverCacheKey(previous.name, previous.config) !== serverCacheKey(previous.name, config)
    ? undefined
    : decorateMcpTools(
        {
          name: previous.name,
          config: previous.config,
        },
        tools,
      );
}
export {
  reconcileMcpClients,
  withMcpConfig,
  setMcpClientInAppState,
  redecorateTools,
  sameServerTools,
  replaceServerTools,
  findChromeClient,
  markClientNeedsAuth,
};
