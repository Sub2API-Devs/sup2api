/**
 * services/lsp/LSPClient.ts
 *
 * LSP 客户端：在工具 cgroup 中启动语言服务器子进程，用 vscode-jsonrpc 建立 stdio 连接，处理崩溃/协议违规与 shutdown。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/LSPClient.ts
 * pieces: chunk-t4ksmxzx.js (9)
 * attribution: sole-consumer 7, affinity 1, fingerprint 1
 */
import { Re } from "../../../runtime/bun-runtime.js";
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

//@ chunk-t4ksmxzx.js:59108-59126 sole-consumer
/**
 * 懒加载的 vscode-jsonrpc 消息协议模块。
 */
var messageProtocolModule = Re(require_vscode_jsonrpc(), 1);
//@ chunk-t4ksmxzx.js:59126-59144 sole-consumer
/**
 * 懒加载的 vscode-jsonrpc 协议模块（AbstractMessageReader）。
 */
var rpcProtocolModule = Re(require_vscode_jsonrpc(), 1);
//@ chunk-t4ksmxzx.js:59144-59213 sole-consumer
/**
 * LSP 消息体允许的最大字节数（32 MiB）。
 */
var MAX_HEADER_BYTES = 65536;
var MAX_BODY_BYTES = 33554432;
var buffer = Buffer.from(`\r
\r
`);
var Dn = Buffer.alloc(0);
//@ chunk-t4ksmxzx.js:59213-61911 sole-consumer
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
  headerTail = Dn;
  expectedBodyLength;
  bodyChunks = [];
  bodyBytes = 0;
  onData = (e) => this.handleData(e);
  onStreamError = (e) => this.fireError(e);
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
  handleData(e) {
    if (this.stopped) return;
    let r = typeof e === "string" ? Buffer.from(e, "utf8") : e;
    while (r && r.length > 0 && !this.stopped) {
      let expectedBodyLength = this.expectedBodyLength;
      r = expectedBodyLength === undefined ? this.consumeHeader(r) : this.consumeBody(r, expectedBodyLength);
    }
  }
  consumeHeader(e) {
    let r = this.headerTail.length === 0 ? e : Buffer.concat([this.headerTail, e]);
    let index = r.indexOf(buffer);
    if (index === -1) {
      this.headerChunks.push(e);
      this.headerBytes += e.length;
      this.headerTail = r.subarray(Math.max(0, r.length - (buffer.length - 1)));
      if (this.headerBytes > MAX_HEADER_BYTES)
        this.protocolViolation(
          Error(
            "LSP server exceeded the header size limit without a message header \u2014 it is likely printing logs or other non-protocol output to stdout instead of stderr",
          ),
        );
      return;
    }
    let s = index - this.headerTail.length + buffer.length;
    let c = this.headerBytes - this.headerTail.length + index;
    this.headerChunks.push(e.subarray(0, s));
    let str = Buffer.concat(this.headerChunks).subarray(0, c).toString("latin1");
    let chunk = e.subarray(s);
    this.resetHeader();
    let lspHeaderBlock = parseLspHeaderBlock(str);
    if (lspHeaderBlock instanceof Error) {
      this.protocolViolation(lspHeaderBlock);
      return;
    }
    this.expectedBodyLength = lspHeaderBlock;
    return chunk.length > 0 ? chunk : undefined;
  }
  consumeBody(e, r) {
    let n = r - this.bodyBytes;
    if (e.length < n) {
      this.bodyChunks.push(e);
      this.bodyBytes += e.length;
      return;
    }
    this.bodyChunks.push(e.length === n ? e : e.subarray(0, n));
    let s = e.length > n ? e.subarray(n) : undefined;
    let buffer = Buffer.concat(this.bodyChunks, r);
    this.bodyChunks = [];
    this.bodyBytes = 0;
    this.expectedBodyLength = undefined;
    this.deliver(buffer);
    return s;
  }
  deliver(e) {
    let r;
    try {
      r = jsonParseRaw(e.toString("utf8"));
    } catch (error) {
      logForDebugging(`LSP: dropped unparseable message body: ${error}`, {
        level: "warn",
      });
      return;
    }
    if (!isObjectLike(r)) {
      logForDebugging("LSP: dropped message body that is not an object", {
        level: "warn",
      });
      return;
    }
    try {
      this.callback?.(r);
    } catch (error) {
      this.fireError(error);
    }
  }
  resetHeader() {
    this.headerChunks = [];
    this.headerBytes = 0;
    this.headerTail = Dn;
  }
  protocolViolation(e) {
    if (this.stopped) return;
    this.stopped = true;
    this.detach();
    this.fireError(e);
    try {
      this.onProtocolViolation(e);
    } catch (error) {
      this.fireError(error);
    }
  }
}
//@ chunk-t4ksmxzx.js:61911-61963 sole-consumer
/**
 * 判断值是否为非 null 对象。
 */
function isObjectLike(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-t4ksmxzx.js:61963-62073 sole-consumer
var LSP_HEADER_LINE_RE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)[ \t]*:[ \t]*([^\r\n]*)$/;
var ALLOWED_LSP_HEADERS = new Set(["content-length", "content-type"]);
//@ chunk-t4ksmxzx.js:62073-62870 sole-consumer
/**
 * 解析 LSP 头块：只允许 content-length/content-type，要求 Content-Length 为数字且不超过大小上限，否则返回描述性错误。
 */
function parseLspHeaderBlock(e) {
  let r;
  for (let line of e.split(`\r
`)) {
    let match = LSP_HEADER_LINE_RE.exec(line);
    let lower = match?.[1]?.toLowerCase();
    if (!match || lower === undefined || !ALLOWED_LSP_HEADERS.has(lower))
      return Error(
        "LSP server sent non-protocol output in the header block \u2014 its stdout is desynchronized from the base protocol (logs/banners on stdout instead of stderr?)",
      );
    if (lower === "content-length") r = match[2]?.trim();
  }
  if (r === undefined)
    return Error(
      "LSP server sent a header block without a Content-Length \u2014 its stdout is desynchronized from the base protocol (non-protocol output on stdout?)",
    );
  if (!/^\d+$/.test(r))
    return Error(
      "LSP server sent a Content-Length that is not a number \u2014 its stdout is desynchronized from the base protocol",
    );
  let n = Number(r);
  if (n > MAX_BODY_BYTES)
    return Error("LSP server declared a message larger than the size limit \u2014 refusing to buffer it");
  return n;
}
//@ chunk-t4ksmxzx.js:62870-63006 affinity
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
//@ chunk-t4ksmxzx.js:63006-68015 fingerprint = createLSPClient (0.708)
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
  function disposeConnection(y) {
    try {
      y.dispose();
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
            let pe =
              memoryCgroupMode === "capped" ||
              (memoryCgroupMode === "parked" && isToolCgroupDirUsable("lsp"));
            let oomVerdict =
              (signal === "SIGKILL" || code === 137) && pe ? hasNewOomKills(cgroupHandle) : false;
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
        for (let [method, z] of pendingNotificationHandlers) {
          connection.onNotification(method, z);
          logForDebugging(`Applied notification handler for ${serverName}.${method}`);
        }
        for (let [method, z] of pendingRequestHandlers) {
          connection.onRequest(method, z);
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
          let k = connAtStop;
          let shutdownPromise = (async () => {
            let shutdownError;
            try {
              await k.sendRequest("shutdown");
            } catch (error) {
              shutdownError = error;
            }
            try {
              await k.sendNotification("exit");
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
        let k = serverProcess === procAtStop;
        if (procAtStop)
          killServerProcess(procAtStop, connAtStop, {
            force: false,
          });
        else if (connAtStop) disposeConnection(connAtStop);
        if (serverProcess === procAtStop) serverProcess = undefined;
        if (connection === connAtStop) connection = undefined;
        if (k) {
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
