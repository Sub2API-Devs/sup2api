/**
 * vscode-jsonrpc/lib/node/ril.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { it } from "../common/api.js";

//@ chunk-t4ksmxzx.js:51933-54469 cjs-fingerprint
var Ln = x(function (kn) {
  Object.defineProperty(kn, "__esModule", { value: !0 });
  var st = importMetaRequire("util"),
    F = it();
  class ot extends F.AbstractMessageBuffer {
    constructor(e = "utf-8") {
      super(e);
    }
    emptyBuffer() {
      return ot.emptyBuffer;
    }
    fromString(e, r) {
      return Buffer.from(e, r);
    }
    toString(e, r) {
      if (e instanceof Buffer) return e.toString(r);
      else return new st.TextDecoder(r).decode(e);
    }
    asNative(e, r) {
      if (r === void 0) return e instanceof Buffer ? e : Buffer.from(e);
      else return e instanceof Buffer ? e.slice(0, r) : Buffer.from(e, 0, r);
    }
    allocNative(e) {
      return Buffer.allocUnsafe(e);
    }
  }
  ot.emptyBuffer = Buffer.allocUnsafe(0);
  class En {
    constructor(e) {
      this.stream = e;
    }
    onClose(e) {
      return (this.stream.on("close", e), F.Disposable.create(() => this.stream.off("close", e)));
    }
    onError(e) {
      return (this.stream.on("error", e), F.Disposable.create(() => this.stream.off("error", e)));
    }
    onEnd(e) {
      return (this.stream.on("end", e), F.Disposable.create(() => this.stream.off("end", e)));
    }
    onData(e) {
      return (this.stream.on("data", e), F.Disposable.create(() => this.stream.off("data", e)));
    }
  }
  class Cn {
    constructor(e) {
      this.stream = e;
    }
    onClose(e) {
      return (this.stream.on("close", e), F.Disposable.create(() => this.stream.off("close", e)));
    }
    onError(e) {
      return (this.stream.on("error", e), F.Disposable.create(() => this.stream.off("error", e)));
    }
    onEnd(e) {
      return (this.stream.on("end", e), F.Disposable.create(() => this.stream.off("end", e)));
    }
    write(e, r) {
      return new Promise((n, s) => {
        let c = (h) => {
          if (h === void 0 || h === null) n();
          else s(h);
        };
        if (typeof e === "string") this.stream.write(e, r, c);
        else this.stream.write(e, c);
      });
    }
    end() {
      this.stream.end();
    }
  }
  var freeze = Object.freeze({
    messageBuffer: Object.freeze({ create: (e) => new ot(e) }),
    applicationJson: Object.freeze({
      encoder: Object.freeze({
        name: "application/json",
        encode: (e, r) => {
          try {
            return Promise.resolve(Buffer.from(JSON.stringify(e, void 0, 0), r.charset));
          } catch (error) {
            return Promise.reject(error);
          }
        },
      }),
      decoder: Object.freeze({
        name: "application/json",
        decode: (e, r) => {
          try {
            if (e instanceof Buffer) return Promise.resolve(JSON.parse(e.toString(r.charset)));
            else return Promise.resolve(JSON.parse(new st.TextDecoder(r.charset).decode(e)));
          } catch (error) {
            return Promise.reject(error);
          }
        },
      }),
    }),
    stream: Object.freeze({ asReadableStream: (e) => new En(e), asWritableStream: (e) => new Cn(e) }),
    console,
    timer: Object.freeze({
      setTimeout(e, r, ...n) {
        let s = setTimeout(e, r, ...n);
        return { dispose: () => clearTimeout(s) };
      },
      setImmediate(e, ...r) {
        let n = setImmediate(e, ...r);
        return { dispose: () => clearImmediate(n) };
      },
      setInterval(e, r, ...n) {
        let s = setInterval(e, r, ...n);
        return { dispose: () => clearInterval(s) };
      },
    }),
  });
  function Lt() {
    return freeze;
  }
  (function (e) {
    function r() {
      F.RAL.install(freeze);
    }
    e.install = r;
  })(Lt || (Lt = {}));
  kn.default = Lt;
});

export { Ln };
