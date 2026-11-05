/**
 * utils/claudeInChrome/chromeSocketMcpServer.ts
 *
 * 2.1.316 新增：Claude in Chrome 的 socket 客户端与 MCP 服务器创建。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rw68crcf.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createChromeBridgeClient, createLocalChromeBridgePool } from "./bridgeClient.js";
import { createChromeSocketClient as createChromeSocketClient_2, quoteTruncated } from "./socketClient.js";
import { errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { isPlainObject } from "../isPlainObject.js";
import { BROWSER_TOOLS, browserSelectionNote } from "./browserToolSchemas.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { createLinkedTransportPair } from "../../services/mcp/InProcessTransport.js";

//@ chunk-rw68crcf.js:996-1043 placement
/**
 * 回显给客户端的 MCP 协议版本列表（新到旧）。
 */
var ECHOED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];
//@ chunk-rw68crcf.js:1043-1117 placement
function createChromeSocketClient(options) {
  return options.bridgeConfig
    ? createChromeBridgeClient(options)
    : options.getSocketPaths
      ? createLocalChromeBridgePool(options)
      : createChromeSocketClient_2(options);
}
//@ chunk-rw68crcf.js:1117-1151 placement
function createClaudeForChromeMcpServer(context, socketClient) {
  return new ChromeSocketMcpBridge(context, socketClient);
}
//@ chunk-rw68crcf.js:1151-3945 placement
/**
 * 本地 MCP 客户端与 Chrome 扩展 socket 之间的桥：自行处理 initialize 握手等少数请求，其余转交按需创建的包内 MCP 服务器；把扩展的通知转发给客户端，关闭时一并关闭包服务器。
 */
class ChromeSocketMcpBridge {
  context;
  socketClient;
  client;
  handshake = [];
  packageServer;
  isClosed = false;
  constructor(context, socketClient) {
    this.context = context;
    this.socketClient = socketClient;
  }
  async connect(client) {
    this.client = client;
    client.onmessage = (event) => this.receive(event);
    client.onclose = () => void this.closePackageServer();
    let { logger, serverName } = this.context;
    this.socketClient.setNotificationHandler(({ method, params }) => {
      logger.info(`[${serverName}] Forwarding MCP notification: ${quoteTruncated(method)}`);
      this.handToPackageServer(({ server }) =>
        server
          .notification({
            method,
            params,
          })
          .catch((error) => {
            logger.info(`[${serverName}] Failed to forward MCP notification: ${errorMessage(error)}`);
          }),
      );
    });
  }
  async close() {
    await this.client?.close();
    await this.closePackageServer();
  }
  async closePackageServer() {
    this.isClosed = true;
    await (
      await this.packageServer?.catch(() => {
        return;
      })
    )?.server.close();
  }
  sendToClient(message) {
    if (!this.isClosed) this.client?.send(message).catch(logError);
  }
  receive(message) {
    let ownResult = this.packageServer === undefined ? this.ownResultFor(message) : undefined;
    if (ownResult === undefined) this.handToPackageServer(({ transport }) => transport.send(message));
    else if ("id" in message && message.id !== undefined)
      this.sendToClient({
        result: ownResult,
        jsonrpc: "2.0",
        id: message.id,
      });
  }
  ownResultFor(message) {
    if (
      !("method" in message) ||
      ("id" in message && typeof message.id !== "string" && !Number.isInteger(message.id)) ||
      (message.params !== undefined && !isPlainObject(message.params)) ||
      (message.params?._meta !== undefined && !isPlainObject(message.params._meta))
    )
      return;
    switch (message.method) {
      case "initialize": {
        let { protocolVersion, capabilities, clientInfo } = message.params ?? {};
        if (
          this.handshake.length > 0 ||
          typeof protocolVersion !== "string" ||
          !ECHOED_PROTOCOL_VERSIONS.includes(protocolVersion) ||
          !isPlainObject(capabilities) ||
          !isPlainObject(clientInfo) ||
          typeof clientInfo.name !== "string" ||
          typeof clientInfo.version !== "string"
        )
          return;
        this.handshake.push(message);
        return {
          protocolVersion,
          capabilities: {
            tools: {
              listChanged: true,
            },
            logging: {},
          },
          serverInfo: {
            name: this.context.serverName,
            version: "1.0.0",
          },
        };
      }
      case "notifications/initialized":
        this.handshake.push(message);
        return {};
      case "ping":
        return {};
      case "notifications/roots/list_changed":
      case "notifications/cancelled":
      case "notifications/progress":
        return {};
      case "tools/list":
        if (
          message.params?.cursor !== undefined ||
          this.context.bridgeConfig === undefined ||
          this.context.excludedTools !== undefined ||
          this.context.isDisabled !== undefined ||
          this.context.hostTools !== undefined
        )
          return;
        return {
          tools: BROWSER_TOOLS.map((tool) =>
            tool.name === "list_connected_browsers"
              ? {
                  ...tool,
                  description: `${tool.description} ${browserSelectionNote(this.context.askUserToolName)}`,
                }
              : tool,
          ),
        };
      default:
        return;
    }
  }
  handToPackageServer(handler) {
    if (this.isClosed) return;
    this.packageServer ??= this.startPackageServer();
    this.packageServer.then(handler).catch((error) => {
      logError(error);
      return this.close();
    });
  }
  startPackageServer() {
    return withFeatureTelemetry("chrome_late_mcp_server", () => this.packageServerGivenTheHandshake());
  }
  async packageServerGivenTheHandshake() {
    let { createClaudeForChromeMcpServer } = await import("./BROWSER_TOOLS.lazy.js");
    let claudeForChromeMcpServer = createClaudeForChromeMcpServer(this.context, this.socketClient);
    let [bridgeTransport, packageTransport] = createLinkedTransportPair();
    let answeredIds = new Set(this.handshake.flatMap((message) => ("id" in message ? [message.id] : [])));
    bridgeTransport.onmessage = (event) => {
      if ("method" in event || !("id" in event) || !answeredIds.delete(event.id)) this.sendToClient(event);
    };
    await claudeForChromeMcpServer.connect(packageTransport);
    for (let message of this.handshake) await bridgeTransport.send(message);
    return {
      server: claudeForChromeMcpServer,
      transport: bridgeTransport,
    };
  }
}
export { ECHOED_PROTOCOL_VERSIONS, createChromeSocketClient, createClaudeForChromeMcpServer };
