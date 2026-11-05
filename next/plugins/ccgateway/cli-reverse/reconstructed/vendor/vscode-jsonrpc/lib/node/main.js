/**
 * vscode-jsonrpc/lib/node/main.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_ril } from "./ril.js";
import { require_api } from "../common/api.js";

//@ chunk-mvgr3jmb.js:54833-59472 cjs-fingerprint
var require_vscode_jsonrpc = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, target) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(target, p))
          __createBinding(target, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createMessageConnection =
    cjsExports.createServerSocketTransport =
    cjsExports.createClientSocketTransport =
    cjsExports.createServerPipeTransport =
    cjsExports.createClientPipeTransport =
    cjsExports.generateRandomPipeName =
    cjsExports.StreamMessageWriter =
    cjsExports.StreamMessageReader =
    cjsExports.SocketMessageWriter =
    cjsExports.SocketMessageReader =
    cjsExports.PortMessageWriter =
    cjsExports.PortMessageReader =
    cjsExports.IPCMessageWriter =
    cjsExports.IPCMessageReader =
      undefined;
  var ril_1 = require_ril();
  ril_1.default.install();
  var path = importMetaRequire("path");
  var os = importMetaRequire("os");
  var crypto_1 = importMetaRequire("crypto");
  var net_1 = importMetaRequire("net");
  var api_1 = require_api();
  __exportStar(require_api(), cjsExports);
  class IPCMessageReader extends api_1.AbstractMessageReader {
    constructor(childProcess) {
      super();
      this.process = childProcess;
      let eventEmitter = this.process;
      eventEmitter.on("error", (error) => this.fireError(error));
      eventEmitter.on("close", () => this.fireClose());
    }
    listen(callback) {
      this.process.on("message", callback);
      return api_1.Disposable.create(() => this.process.off("message", callback));
    }
  }
  cjsExports.IPCMessageReader = IPCMessageReader;
  class IPCMessageWriter extends api_1.AbstractMessageWriter {
    constructor(childProcess) {
      super();
      this.process = childProcess;
      this.errorCount = 0;
      let eventEmitter = this.process;
      eventEmitter.on("error", (error) => this.fireError(error));
      eventEmitter.on("close", () => this.fireClose);
    }
    write(msg) {
      try {
        if (typeof this.process.send === "function")
          this.process.send(msg, undefined, undefined, (error) => {
            if (error) {
              this.errorCount++;
              this.handleError(error, msg);
            } else this.errorCount = 0;
          });
        return Promise.resolve();
      } catch (error) {
        this.handleError(error, msg);
        return Promise.reject(error);
      }
    }
    handleError(error, msg) {
      this.errorCount++;
      this.fireError(error, msg, this.errorCount);
    }
    end() {}
  }
  cjsExports.IPCMessageWriter = IPCMessageWriter;
  class PortMessageReader extends api_1.AbstractMessageReader {
    constructor(port) {
      super();
      this.onData = new api_1.Emitter();
      port.on("close", () => this.fireClose);
      port.on("error", (error) => this.fireError(error));
      port.on("message", (message) => {
        this.onData.fire(message);
      });
    }
    listen(callback) {
      return this.onData.event(callback);
    }
  }
  cjsExports.PortMessageReader = PortMessageReader;
  class PortMessageWriter extends api_1.AbstractMessageWriter {
    constructor(port) {
      super();
      this.port = port;
      this.errorCount = 0;
      port.on("close", () => this.fireClose());
      port.on("error", (error) => this.fireError(error));
    }
    write(msg) {
      try {
        this.port.postMessage(msg);
        return Promise.resolve();
      } catch (error) {
        this.handleError(error, msg);
        return Promise.reject(error);
      }
    }
    handleError(error, msg) {
      this.errorCount++;
      this.fireError(error, msg, this.errorCount);
    }
    end() {}
  }
  cjsExports.PortMessageWriter = PortMessageWriter;
  class SocketMessageReader extends api_1.ReadableStreamMessageReader {
    constructor(socket, encoding = "utf-8") {
      super((0, ril_1.default)().stream.asReadableStream(socket), encoding);
    }
  }
  cjsExports.SocketMessageReader = SocketMessageReader;
  class SocketMessageWriter extends api_1.WriteableStreamMessageWriter {
    constructor(socket, options) {
      super((0, ril_1.default)().stream.asWritableStream(socket), options);
      this.socket = socket;
    }
    dispose() {
      super.dispose();
      this.socket.destroy();
    }
  }
  cjsExports.SocketMessageWriter = SocketMessageWriter;
  class StreamMessageReader extends api_1.ReadableStreamMessageReader {
    constructor(readable, encoding) {
      super((0, ril_1.default)().stream.asReadableStream(readable), encoding);
    }
  }
  cjsExports.StreamMessageReader = StreamMessageReader;
  class StreamMessageWriter extends api_1.WriteableStreamMessageWriter {
    constructor(writable, options) {
      super((0, ril_1.default)().stream.asWritableStream(writable), options);
    }
  }
  cjsExports.StreamMessageWriter = StreamMessageWriter;
  var envXdgRuntimeDir = process.env.XDG_RUNTIME_DIR;
  var safeIpcPathLengths = new Map([
    ["linux", 107],
    ["darwin", 103],
  ]);
  function generateRandomPipeName() {
    let randomSuffix = crypto_1.randomBytes(21).toString("hex");
    let result;
    if (envXdgRuntimeDir) result = path.join(envXdgRuntimeDir, `vscode-ipc-${randomSuffix}.sock`);
    else result = path.join(os.tmpdir(), `vscode-${randomSuffix}.sock`);
    let limit = safeIpcPathLengths.get("linux");
    if (limit !== undefined && result.length > limit)
      (0, ril_1.default)().console.warn(
        `WARNING: IPC handle "${result}" is longer than ${limit} characters.`,
      );
    return result;
  }
  cjsExports.generateRandomPipeName = generateRandomPipeName;
  function createClientPipeTransport(pipeName, encoding = "utf-8") {
    let connectResolve;
    let connected = new Promise((resolve, _reject) => {
      connectResolve = resolve;
    });
    return new Promise((resolve, reject) => {
      let server = net_1.createServer((socket) => {
        server.close();
        connectResolve([
          new SocketMessageReader(socket, encoding),
          new SocketMessageWriter(socket, encoding),
        ]);
      });
      server.on("error", reject);
      server.listen(pipeName, () => {
        server.removeListener("error", reject);
        resolve({
          onConnected: () => connected,
        });
      });
    });
  }
  cjsExports.createClientPipeTransport = createClientPipeTransport;
  function createServerPipeTransport(pipeName, encoding = "utf-8") {
    let socket = net_1.createConnection(pipeName);
    return [new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding)];
  }
  cjsExports.createServerPipeTransport = createServerPipeTransport;
  function createClientSocketTransport(port, encoding = "utf-8") {
    let connectResolve;
    let connected = new Promise((resolve, _reject) => {
      connectResolve = resolve;
    });
    return new Promise((resolve, reject) => {
      let server = net_1.createServer((socket) => {
        server.close();
        connectResolve([
          new SocketMessageReader(socket, encoding),
          new SocketMessageWriter(socket, encoding),
        ]);
      });
      server.on("error", reject);
      server.listen(port, "127.0.0.1", () => {
        server.removeListener("error", reject);
        resolve({
          onConnected: () => connected,
        });
      });
    });
  }
  cjsExports.createClientSocketTransport = createClientSocketTransport;
  function createServerSocketTransport(port, encoding = "utf-8") {
    let socket = net_1.createConnection(port, "127.0.0.1");
    return [new SocketMessageReader(socket, encoding), new SocketMessageWriter(socket, encoding)];
  }
  cjsExports.createServerSocketTransport = createServerSocketTransport;
  function isReadableStream(value) {
    let candidate = value;
    return candidate.read !== undefined && candidate.addListener !== undefined;
  }
  function isWritableStream(value) {
    let candidate = value;
    return candidate.write !== undefined && candidate.addListener !== undefined;
  }
  function createMessageConnection(input, output, logger, options) {
    if (!logger) logger = api_1.NullLogger;
    let reader = isReadableStream(input) ? new StreamMessageReader(input) : input;
    let writer = isWritableStream(output) ? new StreamMessageWriter(output) : output;
    if (api_1.ConnectionStrategy.is(options))
      options = {
        connectionStrategy: options,
      };
    return api_1.createMessageConnection(reader, writer, logger, options);
  }
  cjsExports.createMessageConnection = createMessageConnection;
});
export { require_vscode_jsonrpc };
