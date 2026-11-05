/**
 * services/lsp/LSPClient.ts
 *
 * LSP 客户端：在工具 cgroup 中启动语言服务器子进程，用 vscode-jsonrpc 建立 stdio 连接，处理崩溃/协议违规与 shutdown。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/LSPClient.ts
 * pieces: chunk-mvgr3jmb.js (9)
 * attribution: sole-consumer 7, affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_vscode_jsonrpc } from "../../../vendor/vscode-jsonrpc/lib/node/main.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isFsInaccessible } from "../../utils/errors.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";
import {
  cgroupSpawnOptions,
  isToolCgroupPending,
  currentOomKillCount,
  isToolCgroupDirUsable,
  hasNewOomKills,
} from "../../utils/toolCgroup.js";
import { runWithPluginWriteScope, logPluginScopedError } from "../../utils/plugins/pluginScopedWrite.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { checkPluginBunOptions } from "../../utils/permissions/protectedSettingsPaths.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { registerChildMemory, markChildProcessDead } from "../../utils/telemetry/memorySummary.js";
import { withTimeout } from "../../utils/sleep.js";

//@ chunk-mvgr3jmb.js:59472-59490 sole-consumer
/**
 * 懒加载的 vscode-jsonrpc 消息协议模块。
 */
var messageProtocolModule = __toESM(require_vscode_jsonrpc(), 1);
//@ chunk-mvgr3jmb.js:59490-59508 sole-consumer
/**
 * 懒加载的 vscode-jsonrpc 协议模块（AbstractMessageReader）。
 */
var rpcProtocolModule = __toESM(require_vscode_jsonrpc(), 1);
//@ chunk-mvgr3jmb.js:59508-59577 sole-consumer
/**
 * LSP 消息体允许的最大字节数（32 MiB）。
 */
var MAX_HEADER_BYTES = 65536;
var MAX_BODY_BYTES = 33554432;
var buffer = Buffer.from(`\r
\r
`);
var EMPTY_BUFFER = Buffer.alloc(0);
//@ chunk-mvgr3jmb.js:59577-62275 sole-consumer
/**
 * LSP 基础协议的 stdio 消息读取器：分块解析 Content-Length 头与正文，头部过大或不合协议时报协议违规并停止，正文解析为 JSON 对象后回调。
 */
class LspMessageReader extends rpcProtocolModule.AbstractMessageReader {
  readable;
  onProtocolViolation;
  callback;
  stopped = false;
  headerChunks = [];
  headerBytes = 0;
  headerTail = EMPTY_BUFFER;
  expectedBodyLength;
  bodyChunks = [];
  bodyBytes = 0;
  onData = (chunk) => this.handleData(chunk);
  onStreamError = (error) => this.fireError(error);
  onStreamClose = () => this.fireClose();
  constructor(readable, onProtocolViolation) {
    super();
    this.readable = readable;
    this.onProtocolViolation = onProtocolViolation;
  }
  listen(callback) {
    this.callback = callback;
    this.readable.on("data", this.onData);
    this.readable.on("error", this.onStreamError);
    this.readable.on("close", this.onStreamClose);
    return rpcProtocolModule.Disposable.create(() => this.detach());
  }
  dispose() {
    this.detach();
    super.dispose();
  }
  detach() {
    this.stopped = true;
    this.readable.removeListener("data", this.onData);
    this.readable.removeListener("error", this.onStreamError);
    this.readable.removeListener("close", this.onStreamClose);
    this.resetHeader();
    this.bodyChunks = [];
    this.bodyBytes = 0;
    this.expectedBodyLength = undefined;
  }
  handleData(chunk) {
    if (this.stopped) return;
    let data = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
    while (data && data.length > 0 && !this.stopped) {
      let expectedBodyLength = this.expectedBodyLength;
      data =
        expectedBodyLength === undefined
          ? this.consumeHeader(data)
          : this.consumeBody(data, expectedBodyLength);
    }
  }
  consumeHeader(chunk) {
    let joined = this.headerTail.length === 0 ? chunk : Buffer.concat([this.headerTail, chunk]);
    let index = joined.indexOf(buffer);
    if (index === -1) {
      this.headerChunks.push(chunk);
      this.headerBytes += chunk.length;
      this.headerTail = joined.subarray(Math.max(0, joined.length - (buffer.length - 1)));
      if (this.headerBytes > MAX_HEADER_BYTES)
        this.protocolViolation(
          Error(
            "LSP server exceeded the header size limit without a message header \u2014 it is likely printing logs or other non-protocol output to stdout instead of stderr",
          ),
        );
      return;
    }
    let consumed = index - this.headerTail.length + buffer.length;
    let headerEnd = this.headerBytes - this.headerTail.length + index;
    this.headerChunks.push(chunk.subarray(0, consumed));
    let block = Buffer.concat(this.headerChunks).subarray(0, headerEnd).toString("latin1");
    let chunk_2 = chunk.subarray(consumed);
    this.resetHeader();
    let lspHeaderBlock = parseLspHeaderBlock(block);
    if (lspHeaderBlock instanceof Error) {
      this.protocolViolation(lspHeaderBlock);
      return;
    }
    this.expectedBodyLength = lspHeaderBlock;
    return chunk_2.length > 0 ? chunk_2 : undefined;
  }
  consumeBody(chunk, expected) {
    let needed = expected - this.bodyBytes;
    if (chunk.length < needed) {
      this.bodyChunks.push(chunk);
      this.bodyBytes += chunk.length;
      return;
    }
    this.bodyChunks.push(chunk.length === needed ? chunk : chunk.subarray(0, needed));
    let rest = chunk.length > needed ? chunk.subarray(needed) : undefined;
    let buffer = Buffer.concat(this.bodyChunks, expected);
    this.bodyChunks = [];
    this.bodyBytes = 0;
    this.expectedBodyLength = undefined;
    this.deliver(buffer);
    return rest;
  }
  deliver(body) {
    let message;
    try {
      message = jsonParseRaw(body.toString("utf8"));
    } catch (error) {
      logForDebugging(`LSP: dropped unparseable message body: ${error}`, {
        level: "warn",
      });
      return;
    }
    if (!isObjectLike(message)) {
      logForDebugging("LSP: dropped message body that is not an object", {
        level: "warn",
      });
      return;
    }
    try {
      this.callback?.(message);
    } catch (error) {
      this.fireError(error);
    }
  }
  resetHeader() {
    this.headerChunks = [];
    this.headerBytes = 0;
    this.headerTail = EMPTY_BUFFER;
  }
  protocolViolation(error) {
    if (this.stopped) return;
    this.stopped = true;
    this.detach();
    this.fireError(error);
    try {
      this.onProtocolViolation(error);
    } catch (error) {
      this.fireError(error);
    }
  }
}
//@ chunk-mvgr3jmb.js:62275-62327 sole-consumer
/**
 * 判断值是否为非 null 对象。
 */
function isObjectLike(value) {
  return typeof value === "object" && value !== null;
}
//@ chunk-mvgr3jmb.js:62327-62437 sole-consumer
var LSP_HEADER_LINE_RE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)[ \t]*:[ \t]*([^\r\n]*)$/;
var ALLOWED_LSP_HEADERS = new Set(["content-length", "content-type"]);
//@ chunk-mvgr3jmb.js:62437-63234 sole-consumer
/**
 * 解析 LSP 头块：只允许 content-length/content-type，要求 Content-Length 为数字且不超过大小上限，否则返回描述性错误。
 */
function parseLspHeaderBlock(block) {
  let contentLength;
  for (let line of block.split(`\r
`)) {
    let match = LSP_HEADER_LINE_RE.exec(line);
    let lower = match?.[1]?.toLowerCase();
    if (!match || lower === undefined || !ALLOWED_LSP_HEADERS.has(lower))
      return Error(
        "LSP server sent non-protocol output in the header block \u2014 its stdout is desynchronized from the base protocol (logs/banners on stdout instead of stderr?)",
      );
    if (lower === "content-length") contentLength = match[2]?.trim();
  }
  if (contentLength === undefined)
    return Error(
      "LSP server sent a header block without a Content-Length \u2014 its stdout is desynchronized from the base protocol (non-protocol output on stdout?)",
    );
  if (!/^\d+$/.test(contentLength))
    return Error(
      "LSP server sent a Content-Length that is not a number \u2014 its stdout is desynchronized from the base protocol",
    );
  let length = Number(contentLength);
  if (length > MAX_BODY_BYTES)
    return Error("LSP server declared a message larger than the size limit \u2014 refusing to buffer it");
  return length;
}
//@ chunk-mvgr3jmb.js:63234-63370 affinity
/**
 * LSP 服务器进程异常退出时抛出的错误；oomKilledInToolCgroup 标记是否被工具内存上限（CLAUDE_CODE_TOOL_MEMORY_LIMIT 的 cgroup）杀掉。
 */
class LSPServerCrashError extends Error {
  oomKilledInToolCgroup;
  constructor(message, oomKilledInToolCgroup = false) {
    super(message);
    this.oomKilledInToolCgroup = oomKilledInToolCgroup;
    this.name = "LSPServerCrashError";
  }
}
//@ chunk-mvgr3jmb.js:63370-68379 fingerprint (2.1.88 match: createLSPClient, 0.709)
/**
 * 创建一个 LSP 客户端：start() 在工具 cgroup（toolCgroupClass "lsp"）里用 stdio 管道启动语言服务器，用 vscode-jsonrpc 的 StreamMessageReader/Writer 建立连接并开 Verbose trace；initialize() 发 initialize 请求 + initialized 通知。进程崩溃、协议违规、连接错误都会置 startFailed 并回调 onCrash；连接就绪前注册的 onNotification/onRequest 会缓存后补挂。stop() 发 shutdown + exit，可带超时，最后杀进程（Windows 按 pid 强杀）。
 */
function createLSPClient(serverName, onCrash) {
  let serverProcess;
  let connection;
  let isInitialized = false;
  let startFailed = false;
  let startError;
  let isStopping = false;
  let processErrorListener;
  let processExitListener;
  let stdinErrorListener;
  let stderrListener;
  let pendingNotificationHandlers = new Map();
  let pendingRequestHandlers = new Map();
  function checkStartFailed() {
    if (startFailed) throw startError || Error(`LSP server ${serverName} failed to start`);
  }
  function disposeConnection(connection) {
    try {
      connection.dispose();
    } catch (error) {
      logForDebugging(`Connection disposal failed for ${serverName}: ${errorMessage(error)}`);
    }
  }
  function killServerProcess(proc, conn, { force }) {
    if (conn) disposeConnection(conn);
    if (proc === serverProcess) {
      if (processErrorListener) proc.removeListener("error", processErrorListener);
      if (processExitListener) proc.removeListener("exit", processExitListener);
      if (proc.stderr && stderrListener) proc.stderr.removeListener("data", stderrListener);
      processErrorListener = undefined;
      processExitListener = undefined;
      stdinErrorListener = undefined;
      stderrListener = undefined;
    }
    if (typeof proc.exitCode === "number" || typeof proc.signalCode === "string") return;
    try {
      if ((force || globalThis.process.platform === "win32") && proc.pid !== undefined)
        killProcessGroup(proc.pid);
      else proc.kill();
    } catch (error) {
      logForDebugging(`Process kill failed for ${serverName} (may already be dead): ${errorMessage(error)}`);
    }
  }
  return {
    get isInitialized() {
      return isInitialized;
    },
    async start(command, args, options) {
      startFailed = false;
      startError = undefined;
      isInitialized = false;
      isStopping = false;
      try {
        let memoryCgroupMode =
          cgroupSpawnOptions("lsp").cgroup !== undefined
            ? "capped"
            : isToolCgroupPending()
              ? "parked"
              : "uncapped";
        let cgroupHandle = memoryCgroupMode === "capped" ? currentOomKillCount() : undefined;
        serverProcess = runWithPluginWriteScope(
          {
            pluginSource: options?.pluginId,
          },
          () => {
            let baseEnv = subprocessEnv();
            let spawnEnv = {
              ...baseEnv,
              ...options?.env,
            };
            checkPluginBunOptions(options?.pluginId, spawnEnv, baseEnv);
            return safeSpawn(command, args, {
              stdio: ["pipe", "pipe", "pipe"],
              env: spawnEnv,
              extendEnv: false,
              cwd: options?.cwd,
              windowsHide: true,
              toolCgroupClass: "lsp",
            });
          },
        );
        if (!serverProcess.stdout || !serverProcess.stdin)
          throw Error("LSP server process stdio not available");
        let spawnedProcess = serverProcess;
        await new Promise((resolve, reject) => {
          let onSpawn = () => {
            cleanup();
            resolve();
          };
          let onError = (error) => {
            cleanup();
            reject(error);
          };
          let cleanup = () => {
            spawnedProcess.removeListener("spawn", onSpawn);
            spawnedProcess.removeListener("error", onError);
          };
          spawnedProcess.once("spawn", onSpawn);
          spawnedProcess.once("error", onError);
        });
        if (spawnedProcess.pid) {
          registerChildMemory("lsp", spawnedProcess.pid);
          spawnedProcess.once("close", () => {
            if (spawnedProcess.pid) markChildProcessDead(spawnedProcess.pid);
          });
        }
        if (serverProcess.stderr) {
          stderrListener = (data) => {
            let output = data.toString().trim();
            if (output) logForDebugging(`[LSP SERVER ${serverName}] ${output}`);
          };
          serverProcess.stderr.on("data", stderrListener);
        }
        processErrorListener = (error) => {
          if (serverProcess !== spawnedProcess) return;
          if (!isStopping) {
            startFailed = true;
            startError = error;
            logForDebugging(`LSP server ${serverName} failed to start: ${error.message}`, {
              level: "error",
            });
          }
        };
        serverProcess.on("error", processErrorListener);
        processExitListener = (code, signal) => {
          if (serverProcess !== spawnedProcess) return;
          if ((code === null ? signal !== null : code !== 0) && !isStopping) {
            isInitialized = false;
            let handle =
              memoryCgroupMode === "capped" ||
              (memoryCgroupMode === "parked" && isToolCgroupDirUsable("lsp"));
            let oomVerdict =
              (signal === "SIGKILL" || code === 137) && handle ? hasNewOomKills(cgroupHandle) : false;
            let oomKilled = oomVerdict === true;
            let exitDescription =
              (code === null ? `killed by signal ${signal}` : `exit code ${code}`) +
              (oomKilled
                ? " \u2014 killed at the tool memory limit (CLAUDE_CODE_TOOL_MEMORY_LIMIT)"
                : oomVerdict === undefined
                  ? " \u2014 likely killed at the tool memory limit (CLAUDE_CODE_TOOL_MEMORY_LIMIT)"
                  : "");
            let crashError = new LSPServerCrashError(
              `LSP server ${serverName} crashed with ${exitDescription}`,
              oomKilled,
            );
            logForDebugging(`LSP server ${serverName} crashed with ${exitDescription}`, {
              level: "error",
            });
            startFailed = true;
            startError = crashError;
            killServerProcess(spawnedProcess, connection, {
              force: false,
            });
            serverProcess = undefined;
            connection = undefined;
            onCrash?.(crashError);
          }
        };
        serverProcess.on("exit", processExitListener);
        stdinErrorListener = (error) => {
          if (!isStopping) logForDebugging(`LSP server ${serverName} stdin error: ${error.message}`);
        };
        serverProcess.stdin.on("error", stdinErrorListener);
        let messageReader = new LspMessageReader(serverProcess.stdout, (error) => {
          if (serverProcess !== spawnedProcess) {
            disposeConnection(messageConnection);
            return;
          }
          if (isStopping) {
            disposeConnection(messageConnection);
            return;
          }
          if (spawnedProcess.exitCode !== null || spawnedProcess.signalCode !== null) {
            disposeConnection(messageConnection);
            return;
          }
          startFailed = true;
          startError = error;
          isInitialized = false;
          logForDebugging(`LSP server ${serverName} protocol violation, stopping process: ${error.message}`, {
            level: "error",
          });
          killServerProcess(spawnedProcess, connection, {
            force: true,
          });
          serverProcess = undefined;
          connection = undefined;
          onCrash?.(error);
        });
        let messageWriter = new messageProtocolModule.StreamMessageWriter(serverProcess.stdin);
        let messageConnection = messageProtocolModule.createMessageConnection(messageReader, messageWriter);
        connection = messageConnection;
        connection.onError(([error, _message, _code]) => {
          if (!isStopping && serverProcess === spawnedProcess) {
            startFailed = true;
            startError = error;
            logForDebugging(`LSP server ${serverName} connection error: ${error.message}`, {
              level: "error",
            });
          }
        });
        connection.onClose(() => {
          if (!isStopping && serverProcess === spawnedProcess) {
            isInitialized = false;
            logForDebugging(`LSP server ${serverName} connection closed`);
          }
        });
        connection.listen();
        connection
          .trace(messageProtocolModule.Trace.Verbose, {
            log: (message) => {
              logForDebugging(`[LSP PROTOCOL ${serverName}] ${message}`);
            },
          })
          .catch((error) => {
            logForDebugging(`Failed to enable tracing for ${serverName}: ${error.message}`);
          });
        for (let [method, handler] of pendingNotificationHandlers) {
          connection.onNotification(method, handler);
          logForDebugging(`Applied notification handler for ${serverName}.${method}`);
        }
        for (let [method, handler] of pendingRequestHandlers) {
          connection.onRequest(method, handler);
          logForDebugging(`Applied request handler for ${serverName}.${method}`);
        }
        logForDebugging(`LSP client started for ${serverName}`);
      } catch (error) {
        if (isFsInaccessible(error))
          logForDebugging(`LSP server ${serverName} failed to start: ${errorMessage(error)}`, {
            level: "error",
          });
        else
          logPluginScopedError(
            Error(`LSP server ${serverName} failed to start: ${errorMessage(error)}`),
            "LSP server failed to start",
          );
        throw error;
      }
    },
    async initialize(params) {
      if (!connection) throw Error("LSP client not started");
      checkStartFailed();
      try {
        let result = await connection.sendRequest("initialize", params);
        await connection.sendNotification("initialized", {});
        checkStartFailed();
        if (!connection) throw Error("LSP server stopped during initialize");
        isInitialized = true;
        logForDebugging(`LSP server ${serverName} initialized`);
        return result;
      } catch (error) {
        logForDebugging(`LSP server ${serverName} initialize failed: ${error.message}`, {
          level: "error",
        });
        throw (startFailed && startError) || error;
      }
    },
    async sendRequest(method, params) {
      if (!connection) throw Error("LSP client not started");
      checkStartFailed();
      if (!isInitialized) throw Error("LSP server not initialized");
      try {
        return await connection.sendRequest(method, params);
      } catch (error) {
        logForDebugging(`LSP server ${serverName} request ${method} failed: ${error.message}`, {
          level: "error",
        });
        throw error;
      }
    },
    async sendNotification(method, params) {
      if (!connection) throw Error("LSP client not started");
      checkStartFailed();
      try {
        await connection.sendNotification(method, params);
      } catch (error) {
        logForDebugging(
          `LSP server ${serverName} notification ${method} failed (continuing): ${error.message}`,
          {
            level: "error",
          },
        );
      }
    },
    onNotification(method, handler) {
      pendingNotificationHandlers.set(method, handler);
      if (!connection) {
        logForDebugging(`Registered notification handler for ${serverName}.${method} (connection not ready)`);
        return;
      }
      checkStartFailed();
      connection.onNotification(method, handler);
    },
    onRequest(method, handler) {
      pendingRequestHandlers.set(method, handler);
      if (!connection) {
        logForDebugging(`Registered request handler for ${serverName}.${method} (connection not ready)`);
        return;
      }
      checkStartFailed();
      connection.onRequest(method, handler);
    },
    async stop(timeoutMs) {
      let stopError;
      isStopping = true;
      let procAtStop = serverProcess;
      let connAtStop = connection;
      try {
        if (connAtStop) {
          let connection = connAtStop;
          let shutdownPromise = (async () => {
            let shutdownError;
            try {
              await connection.sendRequest("shutdown");
            } catch (error) {
              shutdownError = error;
            }
            try {
              await connection.sendNotification("exit");
            } catch (error) {
              throw shutdownError ?? error;
            }
            if (shutdownError !== undefined) throw shutdownError;
          })();
          shutdownPromise.catch(() => {});
          if (timeoutMs !== undefined)
            await withTimeout(
              shutdownPromise,
              timeoutMs,
              `LSP server '${serverName}' timed out after ${timeoutMs}ms during shutdown`,
            );
          else await shutdownPromise;
        }
      } catch (error) {
        let err = error;
        logForDebugging(`LSP server ${serverName} stop failed: ${err.message}`, {
          level: "error",
        });
        stopError = err;
      } finally {
        let isOwnProcess = serverProcess === procAtStop;
        if (procAtStop)
          killServerProcess(procAtStop, connAtStop, {
            force: false,
          });
        else if (connAtStop) disposeConnection(connAtStop);
        if (serverProcess === procAtStop) serverProcess = undefined;
        if (connection === connAtStop) connection = undefined;
        if (isOwnProcess) {
          isInitialized = false;
          isStopping = false;
          if (stopError) {
            startFailed = true;
            startError = stopError;
          }
        }
        logForDebugging(`LSP client stopped for ${serverName}`);
      }
      if (stopError) throw stopError;
    },
  };
}
export { createLSPClient };
