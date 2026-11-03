/**
 * vscode-jsonrpc/lib/node/main.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Ln } from "./ril.js";
import { it } from "../common/api.js";

//@ chunk-t4ksmxzx.js:54469-59108 cjs-fingerprint
var Mt = x(function (w) {
  var Rs =
      (w && w.__createBinding) ||
      (Object.create
        ? function (e, r, n, s) {
            if (s === void 0) s = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !r.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return r[n];
                },
              };
            Object.defineProperty(e, s, ownPropertyDescriptor);
          }
        : function (e, r, n, s) {
            if (s === void 0) s = n;
            e[s] = r[n];
          }),
    Ps =
      (w && w.__exportStar) ||
      function (e, r) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(r, key)) Rs(r, e, key);
      };
  Object.defineProperty(w, "__esModule", { value: !0 });
  w.createMessageConnection =
    w.createServerSocketTransport =
    w.createClientSocketTransport =
    w.createServerPipeTransport =
    w.createClientPipeTransport =
    w.generateRandomPipeName =
    w.StreamMessageWriter =
    w.StreamMessageReader =
    w.SocketMessageWriter =
    w.SocketMessageReader =
    w.PortMessageWriter =
    w.PortMessageReader =
    w.IPCMessageWriter =
    w.IPCMessageReader =
      void 0;
  var Le = Ln();
  Le.default.install();
  var at = importMetaRequire("path"),
    On = importMetaRequire("os"),
    Mn = importMetaRequire("crypto"),
    le = importMetaRequire("net"),
    O = it();
  Ps(it(), w);
  class jn extends O.AbstractMessageReader {
    constructor(e) {
      super();
      this.process = e;
      let r = this.process;
      (r.on("error", (n) => this.fireError(n)), r.on("close", () => this.fireClose()));
    }
    listen(e) {
      return (this.process.on("message", e), O.Disposable.create(() => this.process.off("message", e)));
    }
  }
  w.IPCMessageReader = jn;
  class $n extends O.AbstractMessageWriter {
    constructor(e) {
      super();
      ((this.process = e), (this.errorCount = 0));
      let r = this.process;
      (r.on("error", (n) => this.fireError(n)), r.on("close", () => this.fireClose));
    }
    write(e) {
      try {
        if (typeof this.process.send === "function")
          this.process.send(e, void 0, void 0, (r) => {
            if (r) (this.errorCount++, this.handleError(r, e));
            else this.errorCount = 0;
          });
        return Promise.resolve();
      } catch (error) {
        return (this.handleError(error, e), Promise.reject(error));
      }
    }
    handleError(e, r) {
      (this.errorCount++, this.fireError(e, r, this.errorCount));
    }
    end() {}
  }
  w.IPCMessageWriter = $n;
  class qn extends O.AbstractMessageReader {
    constructor(e) {
      super();
      ((this.onData = new O.Emitter()),
        e.on("close", () => this.fireClose),
        e.on("error", (r) => this.fireError(r)),
        e.on("message", (r) => {
          this.onData.fire(r);
        }));
    }
    listen(e) {
      return this.onData.event(e);
    }
  }
  w.PortMessageReader = qn;
  class In extends O.AbstractMessageWriter {
    constructor(e) {
      super();
      ((this.port = e),
        (this.errorCount = 0),
        e.on("close", () => this.fireClose()),
        e.on("error", (r) => this.fireError(r)));
    }
    write(e) {
      try {
        return (this.port.postMessage(e), Promise.resolve());
      } catch (error) {
        return (this.handleError(error, e), Promise.reject(error));
      }
    }
    handleError(e, r) {
      (this.errorCount++, this.fireError(e, r, this.errorCount));
    }
    end() {}
  }
  w.PortMessageWriter = In;
  class Ne extends O.ReadableStreamMessageReader {
    constructor(e, r = "utf-8") {
      super((0, Le.default)().stream.asReadableStream(e), r);
    }
  }
  w.SocketMessageReader = Ne;
  class Oe extends O.WriteableStreamMessageWriter {
    constructor(e, r) {
      super((0, Le.default)().stream.asWritableStream(e), r);
      this.socket = e;
    }
    dispose() {
      (super.dispose(), this.socket.destroy());
    }
  }
  w.SocketMessageWriter = Oe;
  class Nt extends O.ReadableStreamMessageReader {
    constructor(e, r) {
      super((0, Le.default)().stream.asReadableStream(e), r);
    }
  }
  w.StreamMessageReader = Nt;
  class Ot extends O.WriteableStreamMessageWriter {
    constructor(e, r) {
      super((0, Le.default)().stream.asWritableStream(e), r);
    }
  }
  w.StreamMessageWriter = Ot;
  var envXdgRuntimeDir = process.env.XDG_RUNTIME_DIR,
    Ts = new Map([
      ["linux", 107],
      ["darwin", 103],
    ]);
  function Es() {
    let str = Mn.randomBytes(21).toString("hex"),
      r;
    if (envXdgRuntimeDir) r = at.join(envXdgRuntimeDir, `vscode-ipc-${str}.sock`);
    else r = at.join(On.tmpdir(), `vscode-${str}.sock`);
    let n = Ts.get("linux");
    if (n !== void 0 && r.length > n)
      (0, Le.default)().console.warn(`WARNING: IPC handle "${r}" is longer than ${n} characters.`);
    return r;
  }
  w.generateRandomPipeName = Es;
  function Cs(e, r = "utf-8") {
    let n,
      promise = new Promise((c, h) => {
        n = c;
      });
    return new Promise((c, h) => {
      let server = le.createServer((_) => {
        (server.close(), n([new Ne(_, r), new Oe(_, r)]));
      });
      (server.on("error", h),
        server.listen(e, () => {
          (server.removeListener("error", h), c({ onConnected: () => promise }));
        }));
    });
  }
  w.createClientPipeTransport = Cs;
  function xs(e, r = "utf-8") {
    let connection = le.createConnection(e);
    return [new Ne(connection, r), new Oe(connection, r)];
  }
  w.createServerPipeTransport = xs;
  function ks(e, r = "utf-8") {
    let n,
      promise = new Promise((c, h) => {
        n = c;
      });
    return new Promise((c, h) => {
      let server = le.createServer((_) => {
        (server.close(), n([new Ne(_, r), new Oe(_, r)]));
      });
      (server.on("error", h),
        server.listen(e, "127.0.0.1", () => {
          (server.removeListener("error", h), c({ onConnected: () => promise }));
        }));
    });
  }
  w.createClientSocketTransport = ks;
  function Ls(e, r = "utf-8") {
    let connection = le.createConnection(e, "127.0.0.1");
    return [new Ne(connection, r), new Oe(connection, r)];
  }
  w.createServerSocketTransport = Ls;
  function Ns(e) {
    let r = e;
    return r.read !== void 0 && r.addListener !== void 0;
  }
  function Os(e) {
    let r = e;
    return r.write !== void 0 && r.addListener !== void 0;
  }
  function Ms(e, r, n, s) {
    if (!n) n = O.NullLogger;
    let c = Ns(e) ? new Nt(e) : e,
      h = Os(r) ? new Ot(r) : r;
    if (O.ConnectionStrategy.is(s)) s = { connectionStrategy: s };
    return O.createMessageConnection(c, h, n, s);
  }
  w.createMessageConnection = Ms;
});

export { Mt };
