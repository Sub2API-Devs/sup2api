/**
 * utils/claudeInChrome/chromeSocketMcpServer.ts
 *
 * 2.1.316 新增：Claude in Chrome 的 socket 客户端与 MCP 服务器创建。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t8hkp4g3.js (4)
 * attribution: placement 4
 */
import { Vsn, CGn } from "./bridgeClient.js";
import { createChromeSocketClient as createChromeSocketClient_2, quoteTruncated } from "./socketClient.js";
import { errorMessage } from "../errors.js";
import { logError } from "../log.js";
import { isPlainObject } from "../isPlainObject.js";
import { sCe, browserSelectionNote } from "./browserToolSchemas.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { createLinkedTransportPair } from "../../services/mcp/InProcessTransport.js";

//@ chunk-t8hkp4g3.js:912-959 placement
var c = ["2025-11-25", "2025-06-18", "2025-03-26"];
//@ chunk-t8hkp4g3.js:959-1033 placement
function createChromeSocketClient(e) {
  return e.bridgeConfig ? Vsn(e) : e.getSocketPaths ? CGn(e) : createChromeSocketClient_2(e);
}
//@ chunk-t8hkp4g3.js:1033-1067 placement
function createClaudeForChromeMcpServer(e, r) {
  return new ChromeSocketMcpBridge(e, r);
}
/**
 * 本地 MCP 客户端与 Chrome 扩展 socket 之间的桥：自行处理 initialize 握手等少数请求，其余转交按需创建的包内 MCP 服务器；把扩展的通知转发给客户端，关闭时一并关闭包服务器。
 */
//@ chunk-t8hkp4g3.js:1067-3861 placement
class ChromeSocketMcpBridge {
  context;
  socketClient;
  client;
  handshake = [];
  packageServer;
  isClosed = !1;
  constructor(e, r) {
    this.context = e;
    this.socketClient = r;
  }
  async connect(e) {
    ((this.client = e),
      (e.onmessage = (o) => this.receive(o)),
      (e.onclose = () => void this.closePackageServer()));
    let { logger: logger, serverName: serverName } = this.context;
    this.socketClient.setNotificationHandler(({ method: method, params: params }) => {
      (logger.info(`[${serverName}] Forwarding MCP notification: ${quoteTruncated(method)}`),
        this.handToPackageServer(({ server: server }) =>
          server.notification({ method: method, params: params }).catch((s) => {
            logger.info(`[${serverName}] Failed to forward MCP notification: ${errorMessage(s)}`);
          }),
        ));
    });
  }
  async close() {
    (await this.client?.close(), await this.closePackageServer());
  }
  async closePackageServer() {
    ((this.isClosed = !0),
      await (
        await this.packageServer?.catch(() => {
          return;
        })
      )?.server.close());
  }
  sendToClient(e) {
    if (!this.isClosed) this.client?.send(e).catch(logError);
  }
  receive(e) {
    let r = this.packageServer === void 0 ? this.ownResultFor(e) : void 0;
    if (r === void 0) this.handToPackageServer(({ transport: transport }) => transport.send(e));
    else if ("id" in e && e.id !== void 0) this.sendToClient({ result: r, jsonrpc: "2.0", id: e.id });
  }
  ownResultFor(e) {
    if (
      !("method" in e) ||
      ("id" in e && typeof e.id !== "string" && !Number.isInteger(e.id)) ||
      (e.params !== void 0 && !isPlainObject(e.params)) ||
      (e.params?._meta !== void 0 && !isPlainObject(e.params._meta))
    )
      return;
    switch (e.method) {
      case "initialize": {
        let {
          protocolVersion: protocolVersion,
          capabilities: capabilities,
          clientInfo: clientInfo,
        } = e.params ?? {};
        if (
          this.handshake.length > 0 ||
          typeof protocolVersion !== "string" ||
          !c.includes(protocolVersion) ||
          !isPlainObject(capabilities) ||
          !isPlainObject(clientInfo) ||
          typeof clientInfo.name !== "string" ||
          typeof clientInfo.version !== "string"
        )
          return;
        return (
          this.handshake.push(e),
          {
            protocolVersion: protocolVersion,
            capabilities: { tools: { listChanged: !0 }, logging: {} },
            serverInfo: { name: this.context.serverName, version: "1.0.0" },
          }
        );
      }
      case "notifications/initialized":
        return (this.handshake.push(e), {});
      case "ping":
        return {};
      case "notifications/roots/list_changed":
      case "notifications/cancelled":
      case "notifications/progress":
        return {};
      case "tools/list":
        if (
          e.params?.cursor !== void 0 ||
          this.context.bridgeConfig === void 0 ||
          this.context.excludedTools !== void 0 ||
          this.context.isDisabled !== void 0 ||
          this.context.hostTools !== void 0
        )
          return;
        return {
          tools: sCe.map((r) =>
            r.name === "list_connected_browsers"
              ? {
                  ...r,
                  description: `${r.description} ${browserSelectionNote(this.context.askUserToolName)}`,
                }
              : r,
          ),
        };
      default:
        return;
    }
  }
  handToPackageServer(e) {
    if (this.isClosed) return;
    ((this.packageServer ??= this.startPackageServer()),
      this.packageServer.then(e).catch((r) => (logError(r), this.close())));
  }
  startPackageServer() {
    return withFeatureTelemetry("chrome_late_mcp_server", () => this.packageServerGivenTheHandshake());
  }
  async packageServerGivenTheHandshake() {
    let { createClaudeForChromeMcpServer: createClaudeForChromeMcpServer } =
        await import("./chunk-3ewc7v9f.js"),
      r = createClaudeForChromeMcpServer(this.context, this.socketClient),
      [i, o] = createLinkedTransportPair(),
      n = new Set(this.handshake.flatMap((t) => ("id" in t ? [t.id] : [])));
    ((i.onmessage = (t) => {
      if ("method" in t || !("id" in t) || !n.delete(t.id)) this.sendToClient(t);
    }),
      await r.connect(o));
    for (let t of this.handshake) await i.send(t);
    return { server: r, transport: i };
  }
}
