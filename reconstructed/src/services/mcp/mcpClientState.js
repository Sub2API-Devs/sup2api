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
import { SS, En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { serverCacheKey } from "./client.js";
import { decorateMcpTools } from "./mcpToolDecoration.js";

//@ chunk-efym3dq7.js:347-614 placement
/**
 * 在 AppState 中把指定 MCP 客户端标记为需要认证。
 */
function markClientNeedsAuth(e, t) {
  let index = e.clients.findIndex((client) => client.name === t);
  if (index === -1) return e;
  let i = e.clients[index];
  if (!i || (!isConnectedOrCached(i) && i.type !== "needs-auth")) return e;
  let c = [...e.clients];
  c[index] =
    i.type === "needs-auth"
      ? {
          ...i,
        }
      : {
          name: t,
          type: "needs-auth",
          config: i.config,
        };
  return {
    ...e,
    clients: c,
  };
}
//@ chunk-efym3dq7.js:614-1154 placement
/**
 * 在 AppState 中替换或追加一个 MCP 客户端及其工具/命令/资源。
 */
function setMcpClientInAppState(e, t, n, i) {
  let any = e.mcp.clients.some((client) => client.name === t);
  if (!any && i?.appendIfAbsent === false) return e;
  let mcpPrefix = getMcpPrefix(t);
  return {
    ...e,
    mcp: {
      ...e.mcp,
      clients: any
        ? e.mcp.clients.map((client) => (client.name === t ? n.client : client))
        : [...e.mcp.clients, n.client],
      tools: [...e.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, t, mcpPrefix)), ...n.tools],
      commands: [...e.mcp.commands.filter((command) => !commandBelongsToServer(command, t)), ...n.commands],
      resources: n.resources
        ? {
            ...e.mcp.resources,
            [t]: n.resources,
          }
        : e.mcp.resources,
      resourceTemplates: n.resourceTemplates
        ? {
            ...e.mcp.resourceTemplates,
            [t]: n.resourceTemplates,
          }
        : e.mcp.resourceTemplates,
    },
  };
}
//@ chunk-efym3dq7.js:1154-1314 placement = findChromeClient (0.769)
function findChromeClient(dynamicMcpState, t, n) {
  if (!dynamicMcpState.clients.some((client) => client.name === t && client.type === "connected"))
    return dynamicMcpState;
  let mcpPrefix = getMcpPrefix(t);
  return {
    ...dynamicMcpState,
    tools: [...dynamicMcpState.tools.filter((tool) => !isToolFromMcpServer(tool, t, mcpPrefix)), ...n],
  };
}
//@ chunk-efym3dq7.js:1314-1497 placement
/**
 * 替换 AppState 中某个已连接服务器的工具列表。
 */
function replaceServerTools(e, t, n) {
  if (!e.mcp.clients.some((client) => client.name === t && client.type === "connected")) return e;
  let mcpPrefix = getMcpPrefix(t);
  return {
    ...e,
    mcp: {
      ...e.mcp,
      tools: [...e.mcp.tools.filter((tool) => !isToolFromMcpServer(tool, t, mcpPrefix)), ...n],
    },
  };
}
//@ chunk-efym3dq7.js:1497-1668 placement
/**
 * 判断服务器的工具列表是否与新列表完全相同且无同名冲突。
 */
function sameServerTools(tools, t, n) {
  let mcpPrefix = getMcpPrefix(t);
  let [c, o] = SS(tools, (m) => isToolFromMcpServer(m, t, mcpPrefix));
  let r = new Set(n.map((m) => m.name));
  return c.length === n.length && c.every((m, a) => m === n[a]) && !o.some((m) => r.has(m.name));
}
//@ chunk-efym3dq7.js:1668-2478 placement
/**
 * 按新的客户端列表调和动态 MCP 状态（移除、更新工具前缀）。
 */
function reconcileMcpClients(e, dynamicMcpState, newDynamicState) {
  let i = new Set(e.clients);
  let c = new Map(dynamicMcpState.clients.map((client) => [client.name, client]));
  let o = newDynamicState;
  for (let client of newDynamicState.clients) {
    if (!i.has(client)) continue;
    let p = c.get(client.name);
    let mcpPrefix = getMcpPrefix(client.name);
    let f = (tool) => isToolFromMcpServer(tool, client.name, mcpPrefix);
    if (p === undefined) {
      o = {
        ...o,
        clients: o.clients.filter((client_2) => client_2 !== client),
        tools: o.tools.filter((tool) => !f(tool)),
      };
      continue;
    }
    if (p !== client)
      o = {
        ...o,
        clients: o.clients.map((client_2) => (client_2 === client ? p : client_2)),
      };
    let filtered = dynamicMcpState.tools.filter(f);
    let filtered_2 = o.tools.filter(f);
    if (filtered.length === filtered_2.length && filtered.every((l, y) => l === filtered_2[y])) continue;
    o = {
      ...o,
      tools: [...o.tools.filter((tool) => !f(tool)), ...filtered],
    };
  }
  let r = new Set(e.clients.map((client) => client.name));
  let m = new Set(newDynamicState.clients.map((client) => client.name));
  let filtered = dynamicMcpState.clients.filter((client) => !r.has(client.name) && !m.has(client.name));
  if (filtered.length > 0) {
    let mapped = filtered.map((p) => [p.name, getMcpPrefix(p.name)]);
    o = {
      ...o,
      clients: [...o.clients, ...filtered],
      tools: [
        ...o.tools,
        ...dynamicMcpState.tools.filter((tool) => mapped.some(([S, f]) => isToolFromMcpServer(tool, S, f))),
      ],
    };
  }
  return o;
}
//@ chunk-efym3dq7.js:2478-2536 placement
/**
 * 配置不同时替换客户端的 config。
 */
function withMcpConfig(client, config) {
  return En(client.config, config)
    ? client
    : {
        ...client,
        config,
      };
}
//@ chunk-efym3dq7.js:2536-2664 placement
/**
 * 配置未变时为工具重新附加服务器装饰，配置已变返回 undefined。
 */
function redecorateTools(e, t, n) {
  if (e === undefined) return t;
  return serverCacheKey(e.name, e.config) !== serverCacheKey(e.name, n)
    ? undefined
    : decorateMcpTools(
        {
          name: e.name,
          config: e.config,
        },
        t,
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
