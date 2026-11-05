/**
 * utils/claudeInChrome/mcpBridgeServer.ts
 *
 * 2.1.316 新增：Chrome 桥接 MCP 服务器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-akxtr9vf.js (4)
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

//@ chunk-akxtr9vf.js:535-626 placement
/**
 * 按会话 id 记住的标签组 id（用于权限询问的作用域）。
 */
var tabGroupIdBySessionId = new Map();
var FRONTLOADEDTABGROUPID = "frontLoadedTabGroupId";
var _ = [FRONTLOADEDTABGROUPID, "isBridgeTimeout", "isFrontLoadBoundExceeded"];
//@ chunk-akxtr9vf.js:626-739 placement
function exposedChromeTools(host) {
  return BROWSER_TOOLS.filter(
    (tool) =>
      (host.bridgeConfig !== undefined || !BRIDGE_EXCLUDED_TOOL_NAMES.has(tool.name)) &&
      !host.excludedTools?.has(tool.name),
  );
}
//@ chunk-akxtr9vf.js:739-813 placement
/**
 * 按宿主能力创建 Chrome 桥接客户端、本机连接池或 socket 客户端。
 */
function createChromeSocketClient(host) {
  return host.bridgeConfig
    ? createChromeBridgeClient(host)
    : host.getSocketPaths
      ? createLocalChromeBridgePool(host)
      : createChromeSocketClient_2(host);
}
//@ chunk-akxtr9vf.js:813-1924 placement
function createChromeBridgeMcpServer(host, bridge) {
  let { serverName, logger } = host;
  let bridge_2 = bridge ?? createChromeSocketClient(host);
  let server = new Server(
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
  server.setRequestHandler(ListToolsRequestSchema, () => {
    if (host.isDisabled?.())
      return {
        tools: [],
      };
    let selectionNote = browserSelectionNote(host.askUserToolName);
    return {
      tools: [
        ...exposedChromeTools(host).map((tool) =>
          tool.name === "list_connected_browsers"
            ? {
                ...tool,
                description: `${tool.description} ${selectionNote}`,
              }
            : tool,
        ),
        ...(host.hostTools?.() ?? []),
      ],
    };
  });
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    logger.info(`[${serverName}] Executing tool: ${quoteTruncated(request.params.name)}`);
    let rendererSessionScope = host.getRendererSessionScope?.(request.params._meta);
    let callOptions = rendererSessionScope
      ? {
          permissionMode: "ask",
          sessionScope: {
            ...rendererSessionScope,
            tabGroupId: tabGroupIdBySessionId.get(rendererSessionScope.sessionId),
          },
        }
      : undefined;
    let result = await handleChromeToolCall(
      host,
      bridge_2,
      request.params.name,
      request.params.arguments || {},
      callOptions,
    );
    if (rendererSessionScope && !result.isError) {
      let frontloadedTabGroupId = result._meta?.[FRONTLOADEDTABGROUPID];
      let tabGroupId =
        typeof frontloadedTabGroupId === "number"
          ? frontloadedTabGroupId
          : request.params.name === "tabs_context_mcp"
            ? parseTabsContextResult({
                result,
              }).tabGroupId
            : undefined;
      if (tabGroupId !== undefined) tabGroupIdBySessionId.set(rendererSessionScope.sessionId, tabGroupId);
    }
    if (result._meta) for (let metaKey of _) delete result._meta[metaKey];
    return result;
  });
  bridge_2.setNotificationHandler((notification) => {
    logger.info(`[${serverName}] Forwarding MCP notification: ${quoteTruncated(notification.method)}`);
    server
      .notification({
        method: notification.method,
        params: notification.params,
      })
      .catch((error) => {
        logger.info(`[${serverName}] Failed to forward MCP notification: ${error.message}`);
      });
  });
  return server;
}
export { exposedChromeTools, createChromeSocketClient, createChromeBridgeMcpServer };
