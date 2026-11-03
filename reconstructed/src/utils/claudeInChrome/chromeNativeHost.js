/**
 * utils/claudeInChrome/chromeNativeHost.ts
 *
 * Chrome 原生消息宿主（--chrome-native-host）：stdio 长度前缀协议与浏览器扩展通信，并通过本地 socket 把工具请求/响应在 MCP 客户端与扩展间转发。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeInChrome/chromeNativeHost.ts
 * pieces: chunk-ncz9bgnh.js (11)
 * attribution: fingerprint 6, layout 4, placement 1
 */
import { appendFile, unlink, mkdir, chmod, readdir, rmdir } from "fs/promises";
import { hostname, platform } from "os";
import { join } from "path";
import { createServer } from "net";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { truncateToLength } from "../stringUtils.js";
import { execFileNoThrow } from "../execFileNoThrow.js";
import { env } from "../env.js";
import { withFeatureTelemetry } from "../../services/analytics/featureTelemetry.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { getSecureSocketPath, getSocketDir } from "./common.js";

//@ chunk-ncz9bgnh.js:1393-1438 fingerprint = VERSION (1)
/**
 * Chrome 原生消息宿主常量：版本 1.0.0、单条消息上限 1MB、计算机名最长 64、scutil 超时 2s；日志文件为空（只写 stderr）。
 */
var VERSION = "1.0.0";
var MAX_MESSAGE_SIZE = 1048576;
var MAX_COMPUTER_NAME_LENGTH = 64;
var COMPUTER_NAME_TIMEOUT_MS = 2000;
var LOG_FILE = undefined;
//@ chunk-ncz9bgnh.js:1438-1644 fingerprint = log (1)
/**
 * 原生宿主日志：写 stderr，配置了日志文件时追加带时间戳的行。
 */
function log(message, ...args) {
  if (LOG_FILE) {
    let timestamp = new Date().toISOString();
    let formattedArgs = args.length > 0 ? " " + jsonStringify(args) : "";
    let logLine = `[${timestamp}] [Claude Chrome Native Host] ${message}${formattedArgs}
`;
    appendFile(LOG_FILE, logLine).catch(() => {});
  }
  console.error(`[Claude Chrome Native Host] ${message}`, ...args);
}
//@ chunk-ncz9bgnh.js:1644-1650 layout
/**
 * 计算机名查询的缓存 Promise。
 */
var computerNamePromise;
//@ chunk-ncz9bgnh.js:1650-1813 layout
/**
 * 取本机显示名（带缓存），失败回退 os.hostname()；用于 status_response.computer_name。
 */
async function getComputerName() {
  let pending = (computerNamePromise ??= lookupComputerName());
  try {
    let name = await pending;
    if (name !== undefined) return name;
  } catch {
    log("Computer name lookup failed");
  }
  if (computerNamePromise === pending) computerNamePromise = undefined;
  try {
    return sanitizeComputerName(hostname());
  } catch {
    return;
  }
}
//@ chunk-ncz9bgnh.js:1813-1920 layout
/**
 * 清洗计算机名：去控制字符、去 .local 后缀、截断到 64。
 */
function sanitizeComputerName(e) {
  let trimmed = e
    .replace(/\p{Cc}/gu, "")
    .trim()
    .replace(/\.local$/i, "")
    .trim();
  return trimmed ? truncateToLength(trimmed, MAX_COMPUTER_NAME_LENGTH) : undefined;
}
//@ chunk-ncz9bgnh.js:1920-2167 layout
/**
 * 按平台查计算机名：macOS 用 scutil --get ComputerName，Windows 读 COMPUTERNAME，其他用 hostname。
 */
async function lookupComputerName() {
  switch (platform()) {
    case "darwin": {
      let { stdout, code } = await execFileNoThrow("/usr/sbin/scutil", ["--get", "ComputerName"], {
        timeout: COMPUTER_NAME_TIMEOUT_MS,
        useCwd: false,
        stderr: "ignore",
      });
      return code === 0 ? sanitizeComputerName(stdout) : undefined;
    }
    case "win32":
      return sanitizeComputerName(env.COMPUTERNAME ?? "");
    default:
      return sanitizeComputerName(hostname());
  }
}
//@ chunk-ncz9bgnh.js:2167-2304 fingerprint = sendChromeMessage (1)
/**
 * 按 Chrome native messaging 协议写 stdout：4 字节小端长度 + UTF-8 JSON。
 */
function sendChromeMessage(message) {
  let jsonBytes = Buffer.from(message, "utf-8");
  let lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(jsonBytes.length, 0);
  process.stdout.write(lengthBuffer);
  process.stdout.write(jsonBytes);
}
//@ chunk-ncz9bgnh.js:2304-2517 fingerprint = runChromeNativeHost (0.779)
/**
 * `claude --chrome-native-host` 入口：启动 ChromeNativeHost 的 socket 服务，循环读 Chrome 发来的消息并处理，stdin 关闭后停止。
 */
async function runChromeNativeHost() {
  return withFeatureTelemetry("chrome_native_host_run", async () => {
    log("Initializing...");
    let host = new ChromeNativeHost();
    let messageReader = new ChromeMessageReader();
    await host.start();
    while (true) {
      let message = await messageReader.read();
      if (message === null) break;
      await host.handleMessage(message);
    }
    await host.stop();
  });
}
//@ chunk-ncz9bgnh.js:2517-2560 placement = inputSchema (0.673)
/**
 * 带 type 字段的 passthrough 对象 schema（Chrome native host 消息用）。
 */
var inputSchema = DoctorLazy(() =>
  create({
    type: create_2(),
  }).passthrough(),
);
//@ chunk-ncz9bgnh.js:2560-6297 fingerprint = ChromeNativeHost (0.984)
/**
 * Chrome 原生消息宿主：在 /tmp/claude-mcp-browser-bridge-<user>/<pid>.sock（Windows 为命名管道）监听 MCP 客户端连接，清理过期 socket，权限 0700/0600。处理 Chrome 消息 ping/get_status/tool_response/notification（后两者转发给所有 MCP 客户端）；把 MCP 客户端发来的长度前缀 JSON 转成 tool_request 发给 Chrome，并通报 mcp_connected/mcp_disconnected。
 */
class ChromeNativeHost {
  mcpClients = new Map();
  nextClientId = 1;
  server = null;
  running = false;
  socketPath = null;
  async start() {
    if (this.running) return;
    this.socketPath = getSecureSocketPath();
    if (platform() !== "win32") {
      let socketDir = getSocketDir();
      await unlink(socketDir).catch(() => {});
      await mkdir(socketDir, {
        recursive: true,
        mode: 448,
      });
      await chmod(socketDir, 448).catch(() => {});
      try {
        let files = await readdir(socketDir);
        for (let fileName of files) {
          if (!fileName.endsWith(".sock")) continue;
          let pid = parseInt(fileName.replace(".sock", ""), 10);
          if (isNaN(pid)) continue;
          try {
            process.kill(pid, 0);
          } catch {
            await unlink(join(socketDir, fileName)).catch(() => {});
            log(`Removed stale socket for PID ${pid}`);
          }
        }
      } catch {}
    }
    log(`Creating socket listener: ${this.socketPath}`);
    this.server = createServer((socket) => this.handleMcpClient(socket));
    await new Promise((resolve, reject) => {
      this.server.listen(this.socketPath, () => {
        log("Socket server listening for connections");
        this.running = true;
        resolve();
      });
      this.server.on("error", (err) => {
        log("Socket server error:", err);
        reject(err);
      });
    });
    if (platform() !== "win32")
      try {
        await chmod(this.socketPath, 384);
        log("Socket permissions set to 0600");
      } catch (error) {
        log("Failed to set socket permissions:", error);
      }
  }
  async stop() {
    if (!this.running) return;
    for (let [, client] of this.mcpClients) client.socket.destroy();
    this.mcpClients.clear();
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(() => resolve());
      });
      this.server = null;
    }
    if (platform() !== "win32" && this.socketPath) {
      try {
        await unlink(this.socketPath);
        log("Cleaned up socket file");
      } catch {}
      try {
        let socketDir = getSocketDir();
        if ((await readdir(socketDir)).length === 0) {
          await rmdir(socketDir);
          log("Removed empty socket directory");
        }
      } catch {}
    }
    this.running = false;
  }
  async isRunning() {
    return this.running;
  }
  async handleMessage(messageJson) {
    let parsed;
    try {
      parsed = jsonParse(messageJson);
    } catch (e) {
      log("Invalid JSON from Chrome:", e.message);
      sendChromeMessage(
        jsonStringify({
          type: "error",
          error: "Invalid message format",
        }),
      );
      return;
    }
    let parsed_2 = inputSchema().safeParse(parsed);
    if (!parsed_2.success) {
      log("Invalid message from Chrome:", parsed_2.error.message);
      sendChromeMessage(
        jsonStringify({
          type: "error",
          error: "Invalid message format",
        }),
      );
      return;
    }
    let message = parsed_2.data;
    switch ((log(`Handling Chrome message type: ${message.type}`), message.type)) {
      case "ping":
        log("Responding to ping");
        sendChromeMessage(
          jsonStringify({
            type: "pong",
            timestamp: Date.now(),
          }),
        );
        break;
      case "get_status":
        getComputerName()
          .then((computerName) =>
            sendChromeMessage(
              jsonStringify({
                type: "status_response",
                native_host_version: VERSION,
                computer_name: computerName,
              }),
            ),
          )
          .catch((error) => log("Failed to send status_response:", error));
        break;
      case "tool_response": {
        if (this.mcpClients.size > 0) {
          log(`Forwarding tool response to ${this.mcpClients.size} MCP clients`);
          let { type: o, ...data } = message;
          let responseData = Buffer.from(jsonStringify(data), "utf-8");
          let lengthBuffer = Buffer.alloc(4);
          lengthBuffer.writeUInt32LE(responseData.length, 0);
          let responseMsg = Buffer.concat([lengthBuffer, responseData]);
          for (let [id, client] of this.mcpClients)
            try {
              client.socket.write(responseMsg);
            } catch (e) {
              log(`Failed to send to MCP client ${id}:`, e);
            }
        }
        break;
      }
      case "notification": {
        if (this.mcpClients.size > 0) {
          log(`Forwarding notification to ${this.mcpClients.size} MCP clients`);
          let { type: o, ...data } = message;
          let notificationData = Buffer.from(jsonStringify(data), "utf-8");
          let lengthBuffer = Buffer.alloc(4);
          lengthBuffer.writeUInt32LE(notificationData.length, 0);
          let notificationMsg = Buffer.concat([lengthBuffer, notificationData]);
          for (let [id, client] of this.mcpClients)
            try {
              client.socket.write(notificationMsg);
            } catch (e) {
              log(`Failed to send notification to MCP client ${id}:`, e);
            }
        }
        break;
      }
      default:
        log(`Unknown message type: ${message.type}`);
        sendChromeMessage(
          jsonStringify({
            type: "error",
            error: `Unknown message type: ${message.type}`,
          }),
        );
    }
  }
  handleMcpClient(socket) {
    let clientId = this.nextClientId++;
    let client = {
      id: clientId,
      socket,
      buffer: Buffer.alloc(0),
    };
    this.mcpClients.set(clientId, client);
    log(`MCP client ${clientId} connected. Total clients: ${this.mcpClients.size}`);
    sendChromeMessage(
      jsonStringify({
        type: "mcp_connected",
      }),
    );
    socket.on("data", (data) => {
      client.buffer = Buffer.concat([client.buffer, data]);
      while (client.buffer.length >= 4) {
        let messageLength = client.buffer.readUInt32LE(0);
        if (messageLength === 0 || messageLength > MAX_MESSAGE_SIZE) {
          log(`Invalid message length from MCP client ${clientId}: ${messageLength}`);
          socket.destroy();
          return;
        }
        if (client.buffer.length < 4 + messageLength) break;
        let messageBytes = client.buffer.slice(4, 4 + messageLength);
        client.buffer = client.buffer.slice(4 + messageLength);
        try {
          let request = jsonParse(messageBytes.toString("utf-8"));
          log(`Forwarding tool request from MCP client ${clientId}: ${request.method}`);
          sendChromeMessage(
            jsonStringify({
              type: "tool_request",
              method: request.method,
              params: request.params,
            }),
          );
        } catch (e) {
          log(`Failed to parse tool request from MCP client ${clientId}:`, e);
        }
      }
    });
    socket.on("error", (err) => {
      log(`MCP client ${clientId} error: ${err}`);
    });
    socket.on("close", () => {
      log(`MCP client ${clientId} disconnected. Remaining clients: ${this.mcpClients.size - 1}`);
      this.mcpClients.delete(clientId);
      sendChromeMessage(
        jsonStringify({
          type: "mcp_disconnected",
        }),
      );
    });
  }
}
//@ chunk-ncz9bgnh.js:6297-7428 fingerprint = ChromeMessageReader (1)
/**
 * 从 stdin 读 Chrome native messaging 帧（4 字节小端长度 + JSON），长度为 0 或超过 1MB 视为结束。
 */
class ChromeMessageReader {
  buffer = Buffer.alloc(0);
  pendingResolve = null;
  closed = false;
  constructor() {
    process.stdin.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.tryProcessMessage();
    });
    process.stdin.on("end", () => {
      this.closed = true;
      if (this.pendingResolve) {
        this.pendingResolve(null);
        this.pendingResolve = null;
      }
    });
    process.stdin.on("error", () => {
      this.closed = true;
      if (this.pendingResolve) {
        this.pendingResolve(null);
        this.pendingResolve = null;
      }
    });
  }
  tryProcessMessage() {
    if (!this.pendingResolve) return;
    if (this.buffer.length < 4) return;
    let messageLength = this.buffer.readUInt32LE(0);
    if (messageLength === 0 || messageLength > MAX_MESSAGE_SIZE) {
      log(`Invalid message length: ${messageLength}`);
      this.pendingResolve(null);
      this.pendingResolve = null;
      return;
    }
    if (this.buffer.length < 4 + messageLength) return;
    let messageBytes = this.buffer.subarray(4, 4 + messageLength);
    this.buffer = this.buffer.subarray(4 + messageLength);
    let message = messageBytes.toString("utf-8");
    this.pendingResolve(message);
    this.pendingResolve = null;
  }
  async read() {
    if (this.closed) return null;
    if (this.buffer.length >= 4) {
      let messageLength = this.buffer.readUInt32LE(0);
      if (messageLength > 0 && messageLength <= MAX_MESSAGE_SIZE && this.buffer.length >= 4 + messageLength) {
        let messageBytes = this.buffer.subarray(4, 4 + messageLength);
        this.buffer = this.buffer.subarray(4 + messageLength);
        return messageBytes.toString("utf-8");
      }
    }
    return new Promise((resolve) => {
      this.pendingResolve = resolve;
      this.tryProcessMessage();
    });
  }
}
