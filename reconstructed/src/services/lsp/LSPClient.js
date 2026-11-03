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
import { Mt } from "../../../vendor/vscode-jsonrpc/lib/node/main.js";
import { jsonParseRaw } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, isFsInaccessible } from "../../utils/errors.js";
import { killProcessGroup } from "../../utils/auth/lockHolderLiveness.js";
import { Nd, GMt, gDn, nMi, hasNewOomKills } from "../../utils/toolCgroup.js";
import { runWithPluginWriteScope, Wee } from "../../utils/plugins/pluginScopedWrite.js";
import { subprocessEnv } from "../../utils/subprocessEnv.js";
import { checkPluginBunOptions } from "../../utils/permissions/protectedSettingsPaths.js";
import { safeSpawn } from "../../utils/safeSpawn.js";
import { registerChildMemory, Lki } from "../../utils/telemetry/memorySummary.js";
import { withTimeout } from "../../utils/sleep.js";

//@ chunk-t4ksmxzx.js:59108-59126 sole-consumer
var Me = Re(Mt(), 1);
//@ chunk-t4ksmxzx.js:59126-59144 sole-consumer
var ct = Re(Mt(), 1);
//@ chunk-t4ksmxzx.js:59144-59213 sole-consumer
var js = 65536,
  $s = 33554432,
  buffer = Buffer.from(`\r
\r
`),
  alloc = Buffer.alloc(0);
/**
 * LSP 基础协议的 stdio 消息读取器：分块解析 Content-Length 头与正文，头部过大或不合协议时报协议违规并停止，正文解析为 JSON 对象后回调。
 */
//@ chunk-t4ksmxzx.js:59213-61911 sole-consumer
class LspMessageReader extends ct.AbstractMessageReader {
  readable;
  onProtocolViolation;
  callback;
  stopped = !1;
  headerChunks = [];
  headerBytes = 0;
  headerTail = alloc;
  expectedBodyLength;
  bodyChunks = [];
  bodyBytes = 0;
  onData = (e) => this.handleData(e);
  onStreamError = (e) => this.fireError(e);
  onStreamClose = () => this.fireClose();
  constructor(e, r) {
    super();
    this.readable = e;
    this.onProtocolViolation = r;
  }
  listen(e) {
    return (
      (this.callback = e),
      this.readable.on("data", this.onData),
      this.readable.on("error", this.onStreamError),
      this.readable.on("close", this.onStreamClose),
      ct.Disposable.create(() => this.detach())
    );
  }
  dispose() {
    (this.detach(), super.dispose());
  }
  detach() {
    ((this.stopped = !0),
      this.readable.removeListener("data", this.onData),
      this.readable.removeListener("error", this.onStreamError),
      this.readable.removeListener("close", this.onStreamClose),
      this.resetHeader(),
      (this.bodyChunks = []),
      (this.bodyBytes = 0),
      (this.expectedBodyLength = void 0));
  }
  handleData(e) {
    if (this.stopped) return;
    let r = typeof e === "string" ? Buffer.from(e, "utf8") : e;
    while (r && r.length > 0 && !this.stopped) {
      let expectedBodyLength = this.expectedBodyLength;
      r = expectedBodyLength === void 0 ? this.consumeHeader(r) : this.consumeBody(r, expectedBodyLength);
    }
  }
  consumeHeader(e) {
    let r = this.headerTail.length === 0 ? e : Buffer.concat([this.headerTail, e]),
      index = r.indexOf(buffer);
    if (index === -1) {
      if (
        (this.headerChunks.push(e),
        (this.headerBytes += e.length),
        (this.headerTail = r.subarray(Math.max(0, r.length - (buffer.length - 1)))),
        this.headerBytes > js)
      )
        this.protocolViolation(
          Error(
            "LSP server exceeded the header size limit without a message header \u2014 it is likely printing logs or other non-protocol output to stdout instead of stderr",
          ),
        );
      return;
    }
    let s = index - this.headerTail.length + buffer.length,
      c = this.headerBytes - this.headerTail.length + index;
    this.headerChunks.push(e.subarray(0, s));
    let str = Buffer.concat(this.headerChunks).subarray(0, c).toString("latin1"),
      chunk = e.subarray(s);
    this.resetHeader();
    let _ = parseLspHeaderBlock(str);
    if (_ instanceof Error) {
      this.protocolViolation(_);
      return;
    }
    return ((this.expectedBodyLength = _), chunk.length > 0 ? chunk : void 0);
  }
  consumeBody(e, r) {
    let n = r - this.bodyBytes;
    if (e.length < n) {
      (this.bodyChunks.push(e), (this.bodyBytes += e.length));
      return;
    }
    this.bodyChunks.push(e.length === n ? e : e.subarray(0, n));
    let s = e.length > n ? e.subarray(n) : void 0,
      buffer = Buffer.concat(this.bodyChunks, r);
    return (
      (this.bodyChunks = []),
      (this.bodyBytes = 0),
      (this.expectedBodyLength = void 0),
      this.deliver(buffer),
      s
    );
  }
  deliver(e) {
    let r;
    try {
      r = jsonParseRaw(e.toString("utf8"));
    } catch (error) {
      logForDebugging(`LSP: dropped unparseable message body: ${error}`, { level: "warn" });
      return;
    }
    if (!qs(r)) {
      logForDebugging("LSP: dropped message body that is not an object", { level: "warn" });
      return;
    }
    try {
      this.callback?.(r);
    } catch (error) {
      this.fireError(error);
    }
  }
  resetHeader() {
    ((this.headerChunks = []), (this.headerBytes = 0), (this.headerTail = alloc));
  }
  protocolViolation(e) {
    if (this.stopped) return;
    ((this.stopped = !0), this.detach(), this.fireError(e));
    try {
      this.onProtocolViolation(e);
    } catch (error) {
      this.fireError(error);
    }
  }
}
//@ chunk-t4ksmxzx.js:61911-61963 sole-consumer
function qs(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-t4ksmxzx.js:61963-62073 sole-consumer
var LSP_HEADER_LINE_RE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+)[ \t]*:[ \t]*([^\r\n]*)$/,
  ALLOWED_LSP_HEADERS = new Set(["content-length", "content-type"]);
/**
 * 解析 LSP 头块：只允许 content-length/content-type，要求 Content-Length 为数字且不超过大小上限，否则返回描述性错误。
 */
//@ chunk-t4ksmxzx.js:62073-62870 sole-consumer
function parseLspHeaderBlock(e) {
  let r;
  for (let s of e.split(`\r
`)) {
    let match = LSP_HEADER_LINE_RE.exec(s),
      h = match?.[1]?.toLowerCase();
    if (!match || h === void 0 || !ALLOWED_LSP_HEADERS.has(h))
      return Error(
        "LSP server sent non-protocol output in the header block \u2014 its stdout is desynchronized from the base protocol (logs/banners on stdout instead of stderr?)",
      );
    if (h === "content-length") r = match[2]?.trim();
  }
  if (r === void 0)
    return Error(
      "LSP server sent a header block without a Content-Length \u2014 its stdout is desynchronized from the base protocol (non-protocol output on stdout?)",
    );
  if (!/^\d+$/.test(r))
    return Error(
      "LSP server sent a Content-Length that is not a number \u2014 its stdout is desynchronized from the base protocol",
    );
  let n = Number(r);
  if (n > $s)
    return Error("LSP server declared a message larger than the size limit \u2014 refusing to buffer it");
  return n;
}
/**
 * LSP 服务器进程异常退出时抛出的错误；oomKilledInToolCgroup 标记是否被工具内存上限（CLAUDE_CODE_TOOL_MEMORY_LIMIT 的 cgroup）杀掉。
 */
//@ chunk-t4ksmxzx.js:62870-63006 affinity
class LSPServerCrashError extends Error {
  oomKilledInToolCgroup;
  constructor(e, r = !1) {
    super(e);
    this.oomKilledInToolCgroup = r;
    this.name = "LSPServerCrashError";
  }
}
/**
 * 创建一个 LSP 客户端：start() 在工具 cgroup（toolCgroupClass "lsp"）里用 stdio 管道启动语言服务器，用 vscode-jsonrpc 的 StreamMessageReader/Writer 建立连接并开 Verbose trace；initialize() 发 initialize 请求 + initialized 通知。进程崩溃、协议违规、连接错误都会置 startFailed 并回调 onCrash；连接就绪前注册的 onNotification/onRequest 会缓存后补挂。stop() 发 shutdown + exit，可带超时，最后杀进程（Windows 按 pid 强杀）。
 */
//@ chunk-t4ksmxzx.js:63006-68015 fingerprint = createLSPClient (0.708)
function createLSPClient(serverName, onCrash) {
  let serverProcess,
    connection,
    isInitialized = !1,
    startFailed = !1,
    startError,
    isStopping = !1,
    processErrorListener,
    processExitListener,
    stdinErrorListener,
    stderrListener,
    pendingNotificationHandlers = new Map(),
    pendingRequestHandlers = new Map();
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
  function killServerProcess(proc, conn, { force: force }) {
    if (conn) disposeConnection(conn);
    if (proc === serverProcess) {
      if (processErrorListener) proc.removeListener("error", processErrorListener);
      if (processExitListener) proc.removeListener("exit", processExitListener);
      if (proc.stderr && stderrListener) proc.stderr.removeListener("data", stderrListener);
      ((processErrorListener = void 0),
        (processExitListener = void 0),
        (stdinErrorListener = void 0),
        (stderrListener = void 0));
    }
    if (typeof proc.exitCode === "number" || typeof proc.signalCode === "string") return;
    try {
      if ((force || globalThis.process.platform === "win32") && proc.pid !== void 0)
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
      ((startFailed = !1), (startError = void 0), (isInitialized = !1), (isStopping = !1));
      try {
        let memoryCgroupMode = Nd("lsp").cgroup !== void 0 ? "capped" : GMt() ? "parked" : "uncapped",
          cgroupHandle = memoryCgroupMode === "capped" ? gDn() : void 0;
        if (
          ((serverProcess = runWithPluginWriteScope({ pluginSource: options?.pluginId }, () => {
            let baseEnv = subprocessEnv(),
              spawnEnv = { ...baseEnv, ...options?.env };
            return (
              checkPluginBunOptions(options?.pluginId, spawnEnv, baseEnv),
              safeSpawn(command, args, {
                stdio: ["pipe", "pipe", "pipe"],
                env: spawnEnv,
                extendEnv: !1,
                cwd: options?.cwd,
                windowsHide: !0,
                toolCgroupClass: "lsp",
              })
            );
          })),
          !serverProcess.stdout || !serverProcess.stdin)
        )
          throw Error("LSP server process stdio not available");
        let spawnedProcess = serverProcess;
        if (
          (await new Promise((resolve, reject) => {
            let onSpawn = () => {
                (cleanup(), resolve());
              },
              onError = (error) => {
                (cleanup(), reject(error));
              },
              cleanup = () => {
                (spawnedProcess.removeListener("spawn", onSpawn),
                  spawnedProcess.removeListener("error", onError));
              };
            (spawnedProcess.once("spawn", onSpawn), spawnedProcess.once("error", onError));
          }),
          spawnedProcess.pid)
        )
          (registerChildMemory("lsp", spawnedProcess.pid),
            spawnedProcess.once("close", () => {
              if (spawnedProcess.pid) Lki(spawnedProcess.pid);
            }));
        if (serverProcess.stderr)
          ((stderrListener = (data) => {
            let output = data.toString().trim();
            if (output) logForDebugging(`[LSP SERVER ${serverName}] ${output}`);
          }),
            serverProcess.stderr.on("data", stderrListener));
        ((processErrorListener = (error) => {
          if (serverProcess !== spawnedProcess) return;
          if (!isStopping)
            ((startFailed = !0),
              (startError = error),
              logForDebugging(`LSP server ${serverName} failed to start: ${error.message}`, {
                level: "error",
              }));
        }),
          serverProcess.on("error", processErrorListener),
          (processExitListener = (code, signal) => {
            if (serverProcess !== spawnedProcess) return;
            if ((code === null ? signal !== null : code !== 0) && !isStopping) {
              isInitialized = !1;
              let pe = memoryCgroupMode === "capped" || (memoryCgroupMode === "parked" && nMi("lsp")),
                oomVerdict = (signal === "SIGKILL" || code === 137) && pe ? hasNewOomKills(cgroupHandle) : !1,
                oomKilled = oomVerdict === !0,
                exitDescription =
                  (code === null ? `killed by signal ${signal}` : `exit code ${code}`) +
                  (oomKilled
                    ? " \u2014 killed at the tool memory limit (CLAUDE_CODE_TOOL_MEMORY_LIMIT)"
                    : oomVerdict === void 0
                      ? " \u2014 likely killed at the tool memory limit (CLAUDE_CODE_TOOL_MEMORY_LIMIT)"
                      : ""),
                crashError = new LSPServerCrashError(
                  `LSP server ${serverName} crashed with ${exitDescription}`,
                  oomKilled,
                );
              (logForDebugging(`LSP server ${serverName} crashed with ${exitDescription}`, {
                level: "error",
              }),
                (startFailed = !0),
                (startError = crashError),
                killServerProcess(spawnedProcess, connection, { force: !1 }),
                (serverProcess = void 0),
                (connection = void 0),
                onCrash?.(crashError));
            }
          }),
          serverProcess.on("exit", processExitListener),
          (stdinErrorListener = (v) => {
            if (!isStopping) logForDebugging(`LSP server ${serverName} stdin error: ${v.message}`);
          }),
          serverProcess.stdin.on("error", stdinErrorListener));
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
            ((startFailed = !0),
              (startError = error),
              (isInitialized = !1),
              logForDebugging(
                `LSP server ${serverName} protocol violation, stopping process: ${error.message}`,
                { level: "error" },
              ),
              killServerProcess(spawnedProcess, connection, { force: !0 }),
              (serverProcess = void 0),
              (connection = void 0),
              onCrash?.(error));
          }),
          messageWriter = new Me.StreamMessageWriter(serverProcess.stdin),
          messageConnection = Me.createMessageConnection(messageReader, messageWriter);
        ((connection = messageConnection),
          connection.onError(([v, z, G]) => {
            if (!isStopping && serverProcess === spawnedProcess)
              ((startFailed = !0),
                (startError = v),
                logForDebugging(`LSP server ${serverName} connection error: ${v.message}`, {
                  level: "error",
                }));
          }),
          connection.onClose(() => {
            if (!isStopping && serverProcess === spawnedProcess)
              ((isInitialized = !1), logForDebugging(`LSP server ${serverName} connection closed`));
          }),
          connection.listen(),
          connection
            .trace(Me.Trace.Verbose, {
              log: (message) => {
                logForDebugging(`[LSP PROTOCOL ${serverName}] ${message}`);
              },
            })
            .catch((error) => {
              logForDebugging(`Failed to enable tracing for ${serverName}: ${error.message}`);
            }));
        for (let [v, z] of pendingNotificationHandlers)
          (connection.onNotification(v, z),
            logForDebugging(`Applied notification handler for ${serverName}.${v}`));
        for (let [v, z] of pendingRequestHandlers)
          (connection.onRequest(v, z), logForDebugging(`Applied request handler for ${serverName}.${v}`));
        logForDebugging(`LSP client started for ${serverName}`);
      } catch (error) {
        if (isFsInaccessible(error))
          logForDebugging(`LSP server ${serverName} failed to start: ${errorMessage(error)}`, {
            level: "error",
          });
        else
          Wee(
            Error(`LSP server ${serverName} failed to start: ${errorMessage(error)}`),
            "LSP server failed to start",
          );
        throw error;
      }
    },
    async initialize(y) {
      if (!connection) throw Error("LSP client not started");
      checkStartFailed();
      try {
        let result = await connection.sendRequest("initialize", y);
        if ((await connection.sendNotification("initialized", {}), checkStartFailed(), !connection))
          throw Error("LSP server stopped during initialize");
        return ((isInitialized = !0), logForDebugging(`LSP server ${serverName} initialized`), result);
      } catch (error) {
        throw (
          logForDebugging(`LSP server ${serverName} initialize failed: ${error.message}`, { level: "error" }),
          (startFailed && startError) || error
        );
      }
    },
    async sendRequest(method, params) {
      if (!connection) throw Error("LSP client not started");
      if ((checkStartFailed(), !isInitialized)) throw Error("LSP server not initialized");
      try {
        return await connection.sendRequest(method, params);
      } catch (error) {
        throw (
          logForDebugging(`LSP server ${serverName} request ${method} failed: ${error.message}`, {
            level: "error",
          }),
          error
        );
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
          { level: "error" },
        );
      }
    },
    onNotification(method, handler) {
      if ((pendingNotificationHandlers.set(method, handler), !connection)) {
        logForDebugging(`Registered notification handler for ${serverName}.${method} (connection not ready)`);
        return;
      }
      (checkStartFailed(), connection.onNotification(method, handler));
    },
    onRequest(method, handler) {
      if ((pendingRequestHandlers.set(method, handler), !connection)) {
        logForDebugging(`Registered request handler for ${serverName}.${method} (connection not ready)`);
        return;
      }
      (checkStartFailed(), connection.onRequest(method, handler));
    },
    async stop(timeoutMs) {
      let stopError;
      isStopping = !0;
      let procAtStop = serverProcess,
        connAtStop = connection;
      try {
        if (connAtStop) {
          let k = connAtStop,
            shutdownPromise = (async () => {
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
              if (shutdownError !== void 0) throw shutdownError;
            })();
          if ((shutdownPromise.catch(() => {}), timeoutMs !== void 0))
            await withTimeout(
              shutdownPromise,
              timeoutMs,
              `LSP server '${serverName}' timed out after ${timeoutMs}ms during shutdown`,
            );
          else await shutdownPromise;
        }
      } catch (error) {
        let S = error;
        (logForDebugging(`LSP server ${serverName} stop failed: ${S.message}`, { level: "error" }),
          (stopError = S));
      } finally {
        let k = serverProcess === procAtStop;
        if (procAtStop) killServerProcess(procAtStop, connAtStop, { force: !1 });
        else if (connAtStop) disposeConnection(connAtStop);
        if (serverProcess === procAtStop) serverProcess = void 0;
        if (connection === connAtStop) connection = void 0;
        if (k) {
          if (((isInitialized = !1), (isStopping = !1), stopError))
            ((startFailed = !0), (startError = stopError));
        }
        logForDebugging(`LSP client stopped for ${serverName}`);
      }
      if (stopError) throw stopError;
    },
  };
}
