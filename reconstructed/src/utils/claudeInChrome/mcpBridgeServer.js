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
import { sCe, S2s, browserSelectionNote } from "./browserToolSchemas.js";
import { Vsn, CGn } from "./bridgeClient.js";
import { createChromeSocketClient, quoteTruncated } from "./socketClient.js";
import { Server } from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { handleChromeToolCall, parseTabsContextResult } from "./chromeMcpServer.js";

//@ chunk-3ewc7v9f.js:534-625 placement
var p = new Map(),
  FRONTLOADEDTABGROUPID = "frontLoadedTabGroupId",
  _ = [FRONTLOADEDTABGROUPID, "isBridgeTimeout", "isFrontLoadBoundExceeded"];
//@ chunk-3ewc7v9f.js:625-738 placement
function exposedChromeTools(e) {
  return sCe.filter((n) => (e.bridgeConfig !== void 0 || !S2s.has(n.name)) && !e.excludedTools?.has(n.name));
}
//@ chunk-3ewc7v9f.js:738-812 placement
function T(e) {
  return e.bridgeConfig ? Vsn(e) : e.getSocketPaths ? CGn(e) : createChromeSocketClient(e);
}
//@ chunk-3ewc7v9f.js:812-1922 placement
function createChromeBridgeMcpServer(e, n) {
  let { serverName: serverName, logger: logger } = e,
    d = n ?? T(e),
    a = new Server(
      { name: serverName, version: "1.0.0" },
      { capabilities: { tools: { listChanged: !0 }, logging: {} } },
    );
  return (
    a.setRequestHandler(ListToolsRequestSchema, () => {
      if (e.isDisabled?.()) return { tools: [] };
      let o = browserSelectionNote(e.askUserToolName);
      return {
        tools: [
          ...exposedChromeTools(e).map((t) =>
            t.name === "list_connected_browsers" ? { ...t, description: `${t.description} ${o}` } : t,
          ),
          ...(e.hostTools?.() ?? []),
        ],
      };
    }),
    a.setRequestHandler(CallToolRequestSchema, async (o) => {
      logger.info(`[${serverName}] Executing tool: ${quoteTruncated(o.params.name)}`);
      let r = e.getRendererSessionScope?.(o.params._meta),
        t = r ? { permissionMode: "ask", sessionScope: { ...r, tabGroupId: p.get(r.sessionId) } } : void 0,
        s = await handleChromeToolCall(e, d, o.params.name, o.params.arguments || {}, t);
      if (r && !s.isError) {
        let l = s._meta?.[FRONTLOADEDTABGROUPID],
          c =
            typeof l === "number"
              ? l
              : o.params.name === "tabs_context_mcp"
                ? parseTabsContextResult({ result: s }).tabGroupId
                : void 0;
        if (c !== void 0) p.set(r.sessionId, c);
      }
      if (s._meta) for (let l of _) delete s._meta[l];
      return s;
    }),
    d.setNotificationHandler((o) => {
      (logger.info(`[${serverName}] Forwarding MCP notification: ${quoteTruncated(o.method)}`),
        a.notification({ method: o.method, params: o.params }).catch((r) => {
          logger.info(`[${serverName}] Failed to forward MCP notification: ${r.message}`);
        }));
    }),
    a
  );
}
