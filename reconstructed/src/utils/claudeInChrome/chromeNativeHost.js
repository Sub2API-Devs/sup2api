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

/**
 * Chrome 原生消息宿主常量：版本 1.0.0、单条消息上限 1MB、计算机名最长 64、scutil 超时 2s；日志文件为空（只写 stderr）。
 */
//@ chunk-ncz9bgnh.js:1393-1438 fingerprint = VERSION (1)
var VERSION = "1.0.0",
  MAX_MESSAGE_SIZE = 1048576,
  MAX_COMPUTER_NAME_LENGTH = 64,
  COMPUTER_NAME_TIMEOUT_MS = 2000,
  LOG_FILE = void 0;
/**
 * 原生宿主日志：写 stderr，配置了日志文件时追加带时间戳的行。
 */
//@ chunk-ncz9bgnh.js:1438-1644 fingerprint = log (1)
function log(message, ...args) {
  if (LOG_FILE) {
    let timestamp = new Date().toISOString(),
      formattedArgs = args.length > 0 ? " " + jsonStringify(args) : "",
      logLine = `[${timestamp}] [Claude Chrome Native Host] ${message}${formattedArgs}
`;
    appendFile(LOG_FILE, logLine).catch(() => {});
  }
  console.error(`[Claude Chrome Native Host] ${message}`, ...args);
}
/**
 * 计算机名查询的缓存 Promise。
 */
//@ chunk-ncz9bgnh.js:1644-1650 layout
var computerNamePromise;
/**
 * 取本机显示名（带缓存），失败回退 os.hostname()；用于 status_response.computer_name。
 */
//@ chunk-ncz9bgnh.js:1650-1813 layout
async function getComputerName() {
  let pending = (computerNamePromise ??= lookupComputerName());
  try {
    let name = await pending;
    if (name !== void 0) return name;
  } catch {
    log("Computer name lookup failed");
  }
  if (computerNamePromise === pending) computerNamePromise = void 0;
  try {
    return sanitizeComputerName(hostname());
  } catch {
    return;
  }
}
/**
 * 清洗计算机名：去控制字符、去 .local 后缀、截断到 64。
 */
//@ chunk-ncz9bgnh.js:1813-1920 layout
function sanitizeComputerName(e) {
  let trimmed = e
    .replace(/\p{Cc}/gu, "")
    .trim()
    .replace(/\.local$/i, "")
    .trim();
  return trimmed ? truncateToLength(trimmed, MAX_COMPUTER_NAME_LENGTH) : void 0;
}
/**
 * 按平台查计算机名：macOS 用 scutil --get ComputerName，Windows 读 COMPUTERNAME，其他用 hostname。
 */
//@ chunk-ncz9bgnh.js:1920-2167 layout
async function lookupComputerName() {
  switch (platform()) {
    case "darwin": {
      let { stdout: stdout, code: code } = await execFileNoThrow(
        "/usr/sbin/scutil",
        ["--get", "ComputerName"],
        { timeout: COMPUTER_NAME_TIMEOUT_MS, useCwd: !1, stderr: "ignore" },
      );
      return code === 0 ? sanitizeComputerName(stdout) : void 0;
    }
    case "win32":
      return sanitizeComputerName(env.COMPUTERNAME ?? "");
    default:
      return sanitizeComputerName(hostname());
  }
}
/**
 * 按 Chrome native messaging 协议写 stdout：4 字节小端长度 + UTF-8 JSON。
 */
//@ chunk-ncz9bgnh.js:2167-2304 fingerprint = sendChromeMessage (1)
function sendChromeMessage(message) {
  let jsonBytes = Buffer.from(message, "utf-8"),
    lengthBuffer = Buffer.alloc(4);
  (lengthBuffer.writeUInt32LE(jsonBytes.length, 0),
    process.stdout.write(lengthBuffer),
    process.stdout.write(jsonBytes));
}
/**
 * `claude --chrome-native-host` 入口：启动 ChromeNativeHost 的 socket 服务，循环读 Chrome 发来的消息并处理，stdin 关闭后停止。
 */
//@ chunk-ncz9bgnh.js:2304-2517 fingerprint = runChromeNativeHost (0.779)
async function runChromeNativeHost() {
  return withFeatureTelemetry("chrome_native_host_run", async () => {
    log("Initializing...");
    let host = new ChromeNativeHost(),
      messageReader = new ChromeMessageReader();
    await host.start();
    while (!0) {
      let message = await messageReader.read();
      if (message === null) break;
      await host.handleMessage(message);
    }
    await host.stop();
  });
}
/**
 * 带 type 字段的 passthrough 对象 schema（Chrome native host 消息用）。
 */
//@ chunk-ncz9bgnh.js:2517-2560 placement = inputSchema (0.673)
var inputSchema = DoctorLazy(() => create({ type: create_2() }).passthrough());
/**
 * Chrome 原生消息宿主：在 /tmp/claude-mcp-browser-bridge-<user>/<pid>.sock（Windows 为命名管道）监听 MCP 客户端连接，清理过期 socket，权限 0700/0600。处理 Chrome 消息 ping/get_status/tool_response/notification（后两者转发给所有 MCP 客户端）；把 MCP 客户端发来的长度前缀 JSON 转成 tool_request 发给 Chrome，并通报 mcp_connected/mcp_disconnected。
 */
//@ chunk-ncz9bgnh.js:2560-6297 fingerprint = ChromeNativeHost (0.984)
class ChromeNativeHost {
  mcpClients = new Map();
  nextClientId = 1;
  server = null;
  running = !1;
  socketPath = null;
  async start() {
    if (this.running) return;
    if (((this.socketPath = getSecureSocketPath()), platform() !== "win32")) {
      let socketDir = getSocketDir();
      (await unlink(socketDir).catch(() => {}),
        await mkdir(socketDir, { recursive: !0, mode: 448 }),
        await chmod(socketDir, 448).catch(() => {}));
      try {
        let t = await readdir(socketDir);
        for (let fileName of t) {
          if (!fileName.endsWith(".sock")) continue;
          let pid = parseInt(fileName.replace(".sock", ""), 10);
          if (isNaN(pid)) continue;
          try {
            process.kill(pid, 0);
          } catch {
            (await unlink(join(socketDir, fileName)).catch(() => {}),
              log(`Removed stale socket for PID ${pid}`));
          }
        }
      } catch {}
    }
    if (
      (log(`Creating socket listener: ${this.socketPath}`),
      (this.server = createServer((e) => this.handleMcpClient(e))),
      await new Promise((e, t) => {
        (this.server.listen(this.socketPath, () => {
          (log("Socket server listening for connections"), (this.running = !0), e());
        }),
          this.server.on("error", (n) => {
            (log("Socket server error:", n), t(n));
          }));
      }),
      platform() !== "win32")
    )
      try {
        (await chmod(this.socketPath, 384), log("Socket permissions set to 0600"));
      } catch (error) {
        log("Failed to set socket permissions:", error);
      }
  }
  async stop() {
    if (!this.running) return;
    for (let [, e] of this.mcpClients) e.socket.destroy();
    if ((this.mcpClients.clear(), this.server))
      (await new Promise((e) => {
        this.server.close(() => e());
      }),
        (this.server = null));
    if (platform() !== "win32" && this.socketPath) {
      try {
        (await unlink(this.socketPath), log("Cleaned up socket file"));
      } catch {}
      try {
        let socketDir = getSocketDir();
        if ((await readdir(socketDir)).length === 0)
          (await rmdir(socketDir), log("Removed empty socket directory"));
      } catch {}
    }
    this.running = !1;
  }
  async isRunning() {
    return this.running;
  }
  async handleMessage(e) {
    let parsed;
    try {
      parsed = jsonParse(e);
    } catch (error) {
      (log("Invalid JSON from Chrome:", error.message),
        sendChromeMessage(jsonStringify({ type: "error", error: "Invalid message format" })));
      return;
    }
    let safeParse = inputSchema().safeParse(parsed);
    if (!safeParse.success) {
      (log("Invalid message from Chrome:", safeParse.error.message),
        sendChromeMessage(jsonStringify({ type: "error", error: "Invalid message format" })));
      return;
    }
    let message = safeParse.data;
    switch ((log(`Handling Chrome message type: ${message.type}`), message.type)) {
      case "ping":
        (log("Responding to ping"),
          sendChromeMessage(jsonStringify({ type: "pong", timestamp: Date.now() })));
        break;
      case "get_status":
        getComputerName()
          .then((o) =>
            sendChromeMessage(
              jsonStringify({ type: "status_response", native_host_version: VERSION, computer_name: o }),
            ),
          )
          .catch((o) => log("Failed to send status_response:", o));
        break;
      case "tool_response": {
        if (this.mcpClients.size > 0) {
          log(`Forwarding tool response to ${this.mcpClients.size} MCP clients`);
          let { type: o, ...l } = message,
            buffer = Buffer.from(jsonStringify(l), "utf-8"),
            alloc = Buffer.alloc(4);
          alloc.writeUInt32LE(buffer.length, 0);
          let buffer_2 = Buffer.concat([alloc, buffer]);
          for (let [m, g] of this.mcpClients)
            try {
              g.socket.write(buffer_2);
            } catch (error) {
              log(`Failed to send to MCP client ${m}:`, error);
            }
        }
        break;
      }
      case "notification": {
        if (this.mcpClients.size > 0) {
          log(`Forwarding notification to ${this.mcpClients.size} MCP clients`);
          let { type: o, ...l } = message,
            buffer = Buffer.from(jsonStringify(l), "utf-8"),
            alloc = Buffer.alloc(4);
          alloc.writeUInt32LE(buffer.length, 0);
          let buffer_2 = Buffer.concat([alloc, buffer]);
          for (let [m, g] of this.mcpClients)
            try {
              g.socket.write(buffer_2);
            } catch (error) {
              log(`Failed to send notification to MCP client ${m}:`, error);
            }
        }
        break;
      }
      default:
        (log(`Unknown message type: ${message.type}`),
          sendChromeMessage(
            jsonStringify({ type: "error", error: `Unknown message type: ${message.type}` }),
          ));
    }
  }
  handleMcpClient(socket) {
    let clientId = this.nextClientId++,
      client = { id: clientId, socket: socket, buffer: Buffer.alloc(0) };
    (this.mcpClients.set(clientId, client),
      log(`MCP client ${clientId} connected. Total clients: ${this.mcpClients.size}`),
      sendChromeMessage(jsonStringify({ type: "mcp_connected" })),
      socket.on("data", (r) => {
        client.buffer = Buffer.concat([client.buffer, r]);
        while (client.buffer.length >= 4) {
          let messageLength = client.buffer.readUInt32LE(0);
          if (messageLength === 0 || messageLength > MAX_MESSAGE_SIZE) {
            (log(`Invalid message length from MCP client ${clientId}: ${messageLength}`), socket.destroy());
            return;
          }
          if (client.buffer.length < 4 + messageLength) break;
          let sliced = client.buffer.slice(4, 4 + messageLength);
          client.buffer = client.buffer.slice(4 + messageLength);
          try {
            let request = jsonParse(sliced.toString("utf-8"));
            (log(`Forwarding tool request from MCP client ${clientId}: ${request.method}`),
              sendChromeMessage(
                jsonStringify({ type: "tool_request", method: request.method, params: request.params }),
              ));
          } catch (error) {
            log(`Failed to parse tool request from MCP client ${clientId}:`, error);
          }
        }
      }),
      socket.on("error", (r) => {
        log(`MCP client ${clientId} error: ${r}`);
      }),
      socket.on("close", () => {
        (log(`MCP client ${clientId} disconnected. Remaining clients: ${this.mcpClients.size - 1}`),
          this.mcpClients.delete(clientId),
          sendChromeMessage(jsonStringify({ type: "mcp_disconnected" })));
      }));
  }
}
/**
 * 从 stdin 读 Chrome native messaging 帧（4 字节小端长度 + JSON），长度为 0 或超过 1MB 视为结束。
 */
//@ chunk-ncz9bgnh.js:6297-7428 fingerprint = ChromeMessageReader (1)
class ChromeMessageReader {
  buffer = Buffer.alloc(0);
  pendingResolve = null;
  closed = !1;
  constructor() {
    (process.stdin.on("data", (e) => {
      ((this.buffer = Buffer.concat([this.buffer, e])), this.tryProcessMessage());
    }),
      process.stdin.on("end", () => {
        if (((this.closed = !0), this.pendingResolve))
          (this.pendingResolve(null), (this.pendingResolve = null));
      }),
      process.stdin.on("error", () => {
        if (((this.closed = !0), this.pendingResolve))
          (this.pendingResolve(null), (this.pendingResolve = null));
      }));
  }
  tryProcessMessage() {
    if (!this.pendingResolve) return;
    if (this.buffer.length < 4) return;
    let messageLength = this.buffer.readUInt32LE(0);
    if (messageLength === 0 || messageLength > MAX_MESSAGE_SIZE) {
      (log(`Invalid message length: ${messageLength}`),
        this.pendingResolve(null),
        (this.pendingResolve = null));
      return;
    }
    if (this.buffer.length < 4 + messageLength) return;
    let chunk = this.buffer.subarray(4, 4 + messageLength);
    this.buffer = this.buffer.subarray(4 + messageLength);
    let str = chunk.toString("utf-8");
    (this.pendingResolve(str), (this.pendingResolve = null));
  }
  async read() {
    if (this.closed) return null;
    if (this.buffer.length >= 4) {
      let messageLength = this.buffer.readUInt32LE(0);
      if (messageLength > 0 && messageLength <= MAX_MESSAGE_SIZE && this.buffer.length >= 4 + messageLength) {
        let chunk = this.buffer.subarray(4, 4 + messageLength);
        return ((this.buffer = this.buffer.subarray(4 + messageLength)), chunk.toString("utf-8"));
      }
    }
    return new Promise((e) => {
      ((this.pendingResolve = e), this.tryProcessMessage());
    });
  }
}
