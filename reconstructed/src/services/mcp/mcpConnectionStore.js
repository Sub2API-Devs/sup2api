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
import { SS } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-kvr3v8w9.js:646-715 placement
/**
 * 懒加载 MCP 客户端模块。
 */
function mcpClientModule() {
  return require("./chunk-asne9cp8.js").mcpClientModule();
}
//@ chunk-kvr3v8w9.js:715-809 placement
/**
 * 关闭连接并清理服务器缓存。
 */
function closeAndClearServer(n) {
  identityId2(n.client).onclose = undefined;
  mcpClientModule()
    .clearServerCache(n.name, n.config)
    .catch(() => {});
}
//@ chunk-kvr3v8w9.js:809-989 placement
function withoutServerEntries(n, name, mcpPrefix) {
  return {
    tools: reject_default(n.tools, (e) => e.name?.startsWith(mcpPrefix)),
    commands: reject_default(n.commands, (e) => commandBelongsToServer(e, name)),
    resources: omitKeys(n.resources, name),
    resourceTemplates: omitKeys(n.resourceTemplates, name),
  };
}
//@ chunk-kvr3v8w9.js:989-6346 placement
/**
 * AppState.mcp 的连接状态存储：标记/清除 needs-auth、收编连接结果（检查同名配置、禁用、策略阻止）、替换工具列表、维护被抑制的连接器与保留名拒绝、加入待连接服务器、按配置调和、身份边界时重置受影响服务器，以及批量应用排队的连接结果。
 */
class McpConnectionStore {
  #e;
  constructor(n) {
    this.#e = n;
  }
  static over(n) {
    return new McpConnectionStore(fieldAccessor(n.getState, n.setState, "mcp"));
  }
  get() {
    return this.#e.get();
  }
  markNeedsAuth(n) {
    this.#e.set((t) => markClientNeedsAuth(t, n));
  }
  async clearNeedsAuth(n) {
    let found = this.get().clients.find((client) => client.name === n);
    if (found?.type !== "needs-auth") return;
    let i = await mcpClientModule().peekSettledConnection(n, found.config);
    if (i?.type !== "connected") return;
    this.#e.set((e) => ({
      ...e,
      clients: e.clients.map((client) => (client === found ? withConfigScope(i, found.config) : client)),
    }));
  }
  adoptServer(n, t, i) {
    let e = "adopted";
    this.#e.set((s) => {
      if (i?.asked === true)
        return setMcpClientInAppState(
          {
            mcp: s,
          },
          n,
          t,
        ).mcp;
      let found = s.clients.find((client) => client.name === n);
      e = adoptRefusal(found, t) ?? "adopted";
      if (found === undefined) return s;
      if (e !== "adopted") return applyRefusalToRow(s, found, e);
      return setMcpClientInAppState(
        {
          mcp: s,
        },
        n,
        rebindAdoption(found, t),
        {
          appendIfAbsent: false,
        },
      ).mcp;
    });
    return e;
  }
  markReconnectDiscarded(n, t) {
    this.#e.set((i) => {
      let found = i.clients.find((client) => client.name === n);
      if (found === undefined || serverCacheKey(n, found.config) !== serverCacheKey(n, t)) return i;
      if (isMcpServerDisabled(n)) return applyRefusalToRow(i, found, "disabled");
      if (mcpDialBlockCause(n, found.config) !== null) return applyRefusalToRow(i, found, "policy-blocked");
      if (found.type !== "connected") return i;
      return {
        ...i,
        clients: i.clients.map((client) =>
          client === found
            ? {
                name: n,
                type: "failed",
                config: found.config,
                error: "Its connection was closed while signing in again",
              }
            : client,
        ),
        ...withoutServerItems(i, n),
      };
    });
  }
  swapServerTools(n, t, i) {
    let e = false;
    this.#e.set((s) => {
      let r = redecorateTools(
        s.clients.find((client) => client.name === n),
        t,
        i,
      );
      if (r === undefined) {
        logMCPDebug(n, "A re-queried tool list was not applied: another server holds the name");
        return s;
      }
      let c = replaceServerTools(
        {
          mcp: s,
        },
        n,
        r,
      );
      e = c.mcp !== s;
      return c.mcp;
    });
    return e;
  }
  setSuppressedClaudeAiConnectors(n) {
    this.#e.set((t) =>
      suppressedConnectorsEqual(t.suppressedClaudeAiConnectors ?? [], n)
        ? t
        : {
            ...t,
            suppressedClaudeAiConnectors: n,
          },
    );
  }
  setReservedNameRefusals(n) {
    this.#e.set((t) => {
      let reservedNameRefusals = t.reservedNameRefusals ?? [];
      return reservedNameRefusals.length === n.length &&
        reservedNameRefusals.every(
          (reservedNameRefusal, r) =>
            reservedNameRefusal.scope === n[r]?.scope && reservedNameRefusal.name === n[r]?.name,
        )
        ? t
        : {
            ...t,
            reservedNameRefusals: n,
          };
    });
  }
  addPendingServers(n) {
    this.#e.set((t) => {
      let i = pendingRowsFor(t, n);
      if (i.length === 0) return t;
      return {
        ...t,
        clients: [...t.clients, ...i],
      };
    });
  }
  reconcileConfiguredServers(configs, workspaceRoot, i) {
    this.#e.set((e) => {
      let { stale, ...r } = excludeStalePluginClients(e, configs, workspaceRoot);
      i(stale);
      let c = pendingRowsFor(r, configs);
      if (c.length === 0 && stale.length === 0) {
        if (e.clientsInitialized) return e;
        return {
          ...e,
          clientsInitialized: true,
        };
      }
      return {
        ...e,
        ...r,
        clientsInitialized: true,
        clients: [...r.clients, ...c],
      };
    });
  }
  applyIdentityBoundary(n, t) {
    let i = [...n, ...t];
    if (i.length === 0) return;
    this.#e.set((e) => {
      let mapped = i.map((c) => [c, getMcpPrefix(c)]);
      let r = (c) => mapped.some(([l, u]) => isToolFromMcpServer(c, l, u));
      return {
        ...e,
        clients: e.clients.flatMap((client) =>
          t.has(client.name)
            ? []
            : n.has(client.name)
              ? [
                  {
                    name: client.name,
                    type: "pending",
                    config: client.config,
                  },
                ]
              : [client],
        ),
        tools: reject_default(e.tools, r),
        commands: reject_default(e.commands, (c) => i.some((l) => commandBelongsToServer(c, l))),
        resources: omitKeys(e.resources, i),
        resourceTemplates: omitKeys(e.resourceTemplates, i),
      };
    });
  }
  applyQueuedUpdates(n, t) {
    this.#e.set((i) => {
      let e = i;
      for (let s of n) {
        if (s.epoch !== t.currentEpoch && isRemoteMcpTransport(s.config)) {
          if (s.type === "connected") mcpClientModule().detachAndCloseConnection(s);
          continue;
        }
        let found = e.clients.find((client) => client.name === s.name);
        let c = rowRelation(found, s);
        let l = c === "stands" && found !== undefined ? rebindToRowConfig(found, s) : s;
        let { tools, commands, resources, resourceTemplates, replaceOnly, epoch, asked, superseded, ...U } =
          l;
        let server = U;
        let h = server.type === "disabled" || server.type === "failed";
        let b = h ? (tools ?? []) : tools;
        let T = h ? (commands ?? []) : commands;
        let C = h ? (resources ?? []) : resources;
        let y = h ? (resourceTemplates ?? []) : resourceTemplates;
        let mcpPrefix = getMcpPrefix(server.name);
        let index = e.clients.findIndex((client) => client.name === server.name);
        let a = index !== -1 ? e.clients[index] : undefined;
        let Q = server.type === "connected" && a?.type === "connected" && a.client === server.client;
        let R =
          isConnectedOrCached(server) && mcpDialBlockCause(server.name, server.config) === "managed-policy";
        if (
          server.type !== "disabled" &&
          !Q &&
          isMcpServerDisabled(server.name) &&
          !(R && a?.type !== "disabled")
        ) {
          if (R) t.onDoorDenied(server.name);
          if (server.type === "connected") closeAndClearServer(server);
          t.onOrphanedDisable(server.name);
          if (a && a.type !== "disabled" && (a.type !== "connected" || !isConnectedOrCached(server)))
            e = {
              ...e,
              clients: e.clients.map((client) =>
                client.name === server.name
                  ? {
                      name: server.name,
                      type: "disabled",
                      config: c === "elsewhere" ? client.config : server.config,
                    }
                  : client,
              ),
              ...withoutServerEntries(e, server.name, mcpPrefix),
            };
          continue;
        }
        if (c === "elsewhere" && a !== undefined) {
          if (server.type !== "disabled") {
            if (server.type === "connected") closeAndClearServer(server);
            logMCPDebug(
              server.name,
              `A late ${server.type} result was dropped: another server holds the name`,
            );
            continue;
          }
          if (a.type === "connected") closeAndClearServer(a);
          server = {
            name: server.name,
            type: "disabled",
            config: a.config,
          };
        }
        let k = isConnectedOrCached(server) ? mcpDialBlockCause(server.name, server.config) : null;
        if (k) {
          t.onDoorDenied(server.name);
          let config = server.config;
          if (server.type === "connected") identityId2(server.client).onclose = undefined;
          else if (a?.type === "connected") {
            identityId2(a.client).onclose = undefined;
            config = a.config;
          }
          mcpClientModule()
            .clearServerCache(server.name, config)
            .catch(() => {});
          if (index === -1) continue;
          e = {
            ...e,
            clients: e.clients.map((client) =>
              client.name === server.name
                ? {
                    name: server.name,
                    type: "failed",
                    config: server.config,
                    ...mcpGateError(k, server.name, server.config),
                  }
                : client,
            ),
            ...withoutServerEntries(e, server.name, mcpPrefix),
          };
          continue;
        }
        if (
          replaceOnly &&
          index !== -1 &&
          (e.clients[index]?.type === "needs-auth" || e.clients[index]?.type === "disabled")
        ) {
          if (server.type === "connected") {
            identityId2(server.client).onclose = undefined;
            mcpClientModule()
              .clearServerCache(server.name, server.config)
              .catch(() => {});
          }
          continue;
        }
        if (index === -1 && (replaceOnly || (c === "nowhere" && !superseded))) {
          if (server.type === "connected") {
            identityId2(server.client).onclose = undefined;
            mcpClientModule()
              .clearServerCache(server.name, server.config)
              .catch(() => {});
          }
          if (!replaceOnly) {
            t.onOrphanedDisable(server.name);
            logMCPDebug(server.name, `A late ${server.type} result was dropped: no row holds the name`);
          }
          continue;
        }
        if (
          replaceOnly &&
          isDiscoveryCacheOn() &&
          index !== -1 &&
          serverCacheKey(server.name, e.clients[index].config) !== serverCacheKey(server.name, server.config)
        ) {
          if (server.type === "connected") mcpClientModule().detachAndCloseConnection(server);
          continue;
        }
        if (index !== -1 && !checkMcpServerHealth_2(e.clients[index], server)) {
          if (c === "asked") e = refreshRowConfig(e, server);
          continue;
        }
        let clients =
          index === -1
            ? [...e.clients, server]
            : e.clients.map((client) => (client.name === server.name ? server : client));
        let tools_2 =
          b === undefined
            ? e.tools
            : [...reject_default(e.tools, (d) => d.name?.startsWith(mcpPrefix)), ...b];
        let commands_2 =
          T === undefined
            ? e.commands
            : [...reject_default(e.commands, (d) => commandBelongsToServer(d, server.name)), ...T];
        let resources_2 =
          C === undefined
            ? e.resources
            : C.length > 0
              ? {
                  ...e.resources,
                  [server.name]: C,
                }
              : omitKeys(e.resources, server.name);
        let resourceTemplates_2 =
          y === undefined
            ? e.resourceTemplates
            : y.length > 0
              ? {
                  ...e.resourceTemplates,
                  [server.name]: y,
                }
              : omitKeys(e.resourceTemplates, server.name);
        e = {
          ...e,
          clients,
          tools: tools_2,
          commands: commands_2,
          resources: resources_2,
          resourceTemplates: resourceTemplates_2,
        };
      }
      return e;
    });
  }
}
//@ chunk-kvr3v8w9.js:6346-6520 placement
function pendingRowsFor(n, t) {
  let i = new Set(n.clients.map((client) => client.name));
  return Object.entries(t)
    .filter(([key]) => !i.has(key))
    .map(([key, value]) => ({
      name: key,
      type: isMcpServerDisabled(key) ? "disabled" : "pending",
      config: value,
    }));
}
//@ chunk-kvr3v8w9.js:6520-6609 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool, t) {
  return tool.mcpInfo?.serverName === undefined
    ? commandBelongsToServer(tool, t)
    : tool.mcpInfo.serverName === t;
}
//@ chunk-kvr3v8w9.js:6609-6788 placement
function withoutServerItems(n, t) {
  let mcpPrefix = getMcpPrefix(t);
  return {
    tools: reject_default(n.tools, (e) => isToolFromMcpServer(e, t, mcpPrefix)),
    commands: reject_default(n.commands, (tool) => getToolNameForPermissionCheck(tool, t)),
    resources: omitKeys(n.resources, t),
    resourceTemplates: omitKeys(n.resourceTemplates, t),
  };
}
//@ chunk-kvr3v8w9.js:6788-6934 placement
function rowRelation(n, t) {
  if (t.asked === true) return "asked";
  if (n === undefined) return "nowhere";
  return serverCacheKey(t.name, n.config) === serverCacheKey(t.name, t.config) ? "stands" : "elsewhere";
}
//@ chunk-kvr3v8w9.js:6934-7109 placement
function rebindToRowConfig(n, t) {
  let i = {
    name: t.name,
    config: n.config,
  };
  return {
    ...withMcpConfig(t, n.config),
    ...(t.tools !== undefined && {
      tools: decorateMcpTools(i, t.tools),
    }),
    ...(t.commands !== undefined && {
      commands: stampToolScope(i, t.commands),
    }),
  };
}
//@ chunk-kvr3v8w9.js:7109-7504 placement
/**
 * 配置的非身份字段变化时，更新连接行的配置并重新装饰其工具与命令。
 */
function refreshRowConfig(n, t) {
  let found = n.clients.find((client) => client.name === t.name);
  if (found === undefined || serverCacheKey(t.name, found.config) !== serverCacheKey(t.name, t.config))
    return n;
  let e = withMcpConfig(found, t.config);
  if (e === found) return n;
  let s = {
    name: t.name,
    config: t.config,
  };
  let mcpPrefix = getMcpPrefix(t.name);
  let [c, l] = SS(n.tools, (m) => isToolFromMcpServer(m, t.name, mcpPrefix));
  let [u, S] = SS(n.commands, (tool) => getToolNameForPermissionCheck(tool, t.name));
  return {
    ...n,
    clients: n.clients.map((client) => (client === found ? e : client)),
    tools: [...l, ...decorateMcpTools(s, c)],
    commands: [...S, ...stampToolScope(s, u)],
  };
}
//@ chunk-kvr3v8w9.js:7504-7716 placement
function adoptRefusal(n, t) {
  let { name: i } = t.client;
  if (n === undefined) return "no-row";
  if (serverCacheKey(i, n.config) !== serverCacheKey(i, t.client.config)) return "another-server";
  if (isMcpServerDisabled(i)) return "disabled";
  if (mcpDialBlockCause(i, n.config) !== null) return "policy-blocked";
  return;
}
//@ chunk-kvr3v8w9.js:7716-8039 placement
/**
 * 把禁用或策略拦截的结果应用到连接行：标记为 disabled，或为策略拦截生成带原因的 failed 状态，并移除其条目。
 */
function applyRefusalToRow(n, t, i) {
  if (i !== "disabled" && i !== "policy-blocked") return n;
  let { name: e, config } = t;
  let r = i === "policy-blocked" ? mcpDialBlockCause(e, config) : null;
  if (r === null && t.type === "disabled") return n;
  let c =
    r === null
      ? {
          name: e,
          type: "disabled",
          config,
        }
      : {
          name: e,
          type: "failed",
          config,
          ...mcpGateError(r, e, config),
        };
  return {
    ...n,
    clients: n.clients.map((client) => (client === t ? c : client)),
    ...withoutServerItems(n, e),
  };
}
//@ chunk-kvr3v8w9.js:8039-8181 placement
function rebindAdoption(n, t) {
  let i = {
    name: n.name,
    config: n.config,
  };
  return {
    ...t,
    client: withMcpConfig(t.client, n.config),
    tools: decorateMcpTools(i, t.tools),
    commands: stampToolScope(i, t.commands),
  };
}
export { McpConnectionStore, getToolNameForPermissionCheck };
