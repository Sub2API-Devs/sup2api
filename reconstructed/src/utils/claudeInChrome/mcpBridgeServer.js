/**
 * utils/claudeInChrome/mcpBridgeServer.ts
 *
 * 2.1.316 新增：Chrome 桥接 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3ewc7v9f.js (4)
 * attribution: placement 4
 */
import { BROWSER_TOOLS, BRIDGE_EXCLUDED_TOOL_NAMES, browserSelectionNote } from "./browserToolSchemas.js";
import { createChromeBridgeClient, createLocalChromeBridgePool } from "./bridgeClient.js";
import { createChromeSocketClient as createChromeSocketClient_2, quoteTruncated } from "./socketClient.js";
import { Server } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { handleChromeToolCall, parseTabsContextResult } from "./chromeMcpServer.js";

//@ chunk-3ewc7v9f.js:534-625 placement
/**
 * 按会话 id 记住的标签组 id（用于权限询问的作用域）。
 */
var tabGroupIdBySessionId = new Map();
var FRONTLOADEDTABGROUPID = "frontLoadedTabGroupId";
var _ = [FRONTLOADEDTABGROUPID, "isBridgeTimeout", "isFrontLoadBoundExceeded"];
//@ chunk-3ewc7v9f.js:625-738 placement
function exposedChromeTools(e) {
  return BROWSER_TOOLS.filter(
    (n) =>
      (e.bridgeConfig !== undefined || !BRIDGE_EXCLUDED_TOOL_NAMES.has(n.name)) &&
      !e.excludedTools?.has(n.name),
  );
}
//@ chunk-3ewc7v9f.js:738-812 placement
/**
 * 按宿主能力创建 Chrome 桥接客户端、本机连接池或 socket 客户端。
 */
function createChromeSocketClient(e) {
  return e.bridgeConfig
    ? createChromeBridgeClient(e)
    : e.getSocketPaths
      ? createLocalChromeBridgePool(e)
      : createChromeSocketClient_2(e);
}
//@ chunk-3ewc7v9f.js:812-1922 placement
function createChromeBridgeMcpServer(host, n) {
  let { serverName, logger } = host;
  let bridge = n ?? createChromeSocketClient(host);
  let a = new Server(
    {
      name: serverName,
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {
          listChanged: true,
        },
        logging: {},
      },
    },
  );
  a.setRequestHandler(ListToolsRequestSchema, () => {
    if (host.isDisabled?.())
      return {
        tools: [],
      };
    let o = browserSelectionNote(host.askUserToolName);
    return {
      tools: [
        ...exposedChromeTools(host).map((t) =>
          t.name === "list_connected_browsers"
            ? {
                ...t,
                description: `${t.description} ${o}`,
              }
            : t,
        ),
        ...(host.hostTools?.() ?? []),
      ],
    };
  });
  a.setRequestHandler(CallToolRequestSchema, async (o) => {
    logger.info(`[${serverName}] Executing tool: ${quoteTruncated(o.params.name)}`);
    let rendererSessionScope = host.getRendererSessionScope?.(o.params._meta);
    let callOptions = rendererSessionScope
      ? {
          permissionMode: "ask",
          sessionScope: {
            ...rendererSessionScope,
            tabGroupId: tabGroupIdBySessionId.get(rendererSessionScope.sessionId),
          },
        }
      : undefined;
    let s = await handleChromeToolCall(host, bridge, o.params.name, o.params.arguments || {}, callOptions);
    if (rendererSessionScope && !s.isError) {
      let l = s._meta?.[FRONTLOADEDTABGROUPID];
      let c =
        typeof l === "number"
          ? l
          : o.params.name === "tabs_context_mcp"
            ? parseTabsContextResult({
                result: s,
              }).tabGroupId
            : undefined;
      if (c !== undefined) tabGroupIdBySessionId.set(rendererSessionScope.sessionId, c);
    }
    if (s._meta) for (let l of _) delete s._meta[l];
    return s;
  });
  bridge.setNotificationHandler((o) => {
    logger.info(`[${serverName}] Forwarding MCP notification: ${quoteTruncated(o.method)}`);
    a.notification({
      method: o.method,
      params: o.params,
    }).catch((error) => {
      logger.info(`[${serverName}] Failed to forward MCP notification: ${error.message}`);
    });
  });
  return a;
}
