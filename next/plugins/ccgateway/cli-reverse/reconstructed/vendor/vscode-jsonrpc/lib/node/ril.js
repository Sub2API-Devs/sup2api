/**
 * vscode-jsonrpc/lib/node/ril.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_api } from "../common/api.js";

//@ chunk-mvgr3jmb.js:52297-54833 cjs-fingerprint
var require_ril = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var util_1 = importMetaRequire("util");
  var api_1 = require_api();
  class MessageBuffer extends api_1.AbstractMessageBuffer {
    constructor(encoding = "utf-8") {
      super(encoding);
    }
    emptyBuffer() {
      return MessageBuffer.emptyBuffer;
    }
    fromString(value, encoding) {
      return Buffer.from(value, encoding);
    }
    toString(value, encoding) {
      if (value instanceof Buffer) return value.toString(encoding);
      else return new util_1.TextDecoder(encoding).decode(value);
    }
    asNative(buffer, length) {
      if (length === undefined) return buffer instanceof Buffer ? buffer : Buffer.from(buffer);
      else return buffer instanceof Buffer ? buffer.slice(0, length) : Buffer.from(buffer, 0, length);
    }
    allocNative(length) {
      return Buffer.allocUnsafe(length);
    }
  }
  MessageBuffer.emptyBuffer = Buffer.allocUnsafe(0);
  class ReadableStreamWrapper {
    constructor(stream) {
      this.stream = stream;
    }
    onClose(listener) {
      this.stream.on("close", listener);
      return api_1.Disposable.create(() => this.stream.off("close", listener));
    }
    onError(listener) {
      this.stream.on("error", listener);
      return api_1.Disposable.create(() => this.stream.off("error", listener));
    }
    onEnd(listener) {
      this.stream.on("end", listener);
      return api_1.Disposable.create(() => this.stream.off("end", listener));
    }
    onData(listener) {
      this.stream.on("data", listener);
      return api_1.Disposable.create(() => this.stream.off("data", listener));
    }
  }
  class WritableStreamWrapper {
    constructor(stream) {
      this.stream = stream;
    }
    onClose(listener) {
      this.stream.on("close", listener);
      return api_1.Disposable.create(() => this.stream.off("close", listener));
    }
    onError(listener) {
      this.stream.on("error", listener);
      return api_1.Disposable.create(() => this.stream.off("error", listener));
    }
    onEnd(listener) {
      this.stream.on("end", listener);
      return api_1.Disposable.create(() => this.stream.off("end", listener));
    }
    write(data, encoding) {
      return new Promise((resolve, reject) => {
        let callback = (error) => {
          if (error === undefined || error === null) resolve();
          else reject(error);
        };
        if (typeof data === "string") this.stream.write(data, encoding, callback);
        else this.stream.write(data, callback);
      });
    }
    end() {
      this.stream.end();
    }
  }
  var _ril = Object.freeze({
    messageBuffer: Object.freeze({
      create: (encoding) => new MessageBuffer(encoding),
    }),
    applicationJson: Object.freeze({
      encoder: Object.freeze({
        name: "application/json",
        encode: (msg, options) => {
          try {
            return Promise.resolve(Buffer.from(JSON.stringify(msg, undefined, 0), options.charset));
          } catch (err) {
            return Promise.reject(err);
          }
        },
      }),
      decoder: Object.freeze({
        name: "application/json",
        decode: (buffer, options) => {
          try {
            if (buffer instanceof Buffer)
              return Promise.resolve(JSON.parse(buffer.toString(options.charset)));
            else return Promise.resolve(JSON.parse(new util_1.TextDecoder(options.charset).decode(buffer)));
          } catch (err) {
            return Promise.reject(err);
          }
        },
      }),
    }),
    stream: Object.freeze({
      asReadableStream: (stream) => new ReadableStreamWrapper(stream),
      asWritableStream: (stream) => new WritableStreamWrapper(stream),
    }),
    console,
    timer: Object.freeze({
      setTimeout(callback, ms, ...args) {
        let handle = setTimeout(callback, ms, ...args);
        return {
          dispose: () => clearTimeout(handle),
        };
      },
      setImmediate(callback, ...args) {
        let handle = setImmediate(callback, ...args);
        return {
          dispose: () => clearImmediate(handle),
        };
      },
      setInterval(callback, ms, ...args) {
        let handle = setInterval(callback, ms, ...args);
        return {
          dispose: () => clearInterval(handle),
        };
      },
    }),
  });
  function RIL() {
    return _ril;
  }
  (function (RIL) {
    function install() {
      api_1.RAL.install(_ril);
    }
    RIL.install = install;
  })(RIL || (RIL = {}));
  cjsExports.default = RIL;
});
export { require_ril };
