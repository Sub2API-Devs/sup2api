/**
 * vscode-jsonrpc/lib/common/messageWriter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { de } from "./ral.js";
import { we } from "./is.js";
import { vt } from "./semaphore.js";
import { _e } from "./events.js";

//@ chunk-t4ksmxzx.js:22660-24791 cjs-fingerprint
var un = x(function (an) {
  Object.defineProperty(an, "__esModule", { value: !0 });
  an.WriteableStreamMessageWriter = an.AbstractMessageWriter = an.MessageWriter = void 0;
  var tn = de(),
    ie = we(),
    sn = vt(),
    Je = _e(),
    Gi = "Content-Length: ",
    rn = `\r
`,
    nn;
  (function (e) {
    function r(n) {
      let s = n;
      return s && ie.func(s.dispose) && ie.func(s.onClose) && ie.func(s.onError) && ie.func(s.write);
    }
    e.is = r;
  })(nn || (an.MessageWriter = nn = {}));
  class Pt {
    constructor() {
      ((this.errorEmitter = new Je.Emitter()), (this.closeEmitter = new Je.Emitter()));
    }
    dispose() {
      (this.errorEmitter.dispose(), this.closeEmitter.dispose());
    }
    get onError() {
      return this.errorEmitter.event;
    }
    fireError(e, r, n) {
      this.errorEmitter.fire([this.asError(e), r, n]);
    }
    get onClose() {
      return this.closeEmitter.event;
    }
    fireClose() {
      this.closeEmitter.fire(void 0);
    }
    asError(e) {
      if (e instanceof Error) return e;
      else return Error(`Writer received error. Reason: ${ie.string(e.message) ? e.message : "unknown"}`);
    }
  }
  an.AbstractMessageWriter = Pt;
  var Rt;
  (function (e) {
    function r(n) {
      if (n === void 0 || typeof n === "string")
        return { charset: n ?? "utf-8", contentTypeEncoder: (0, tn.default)().applicationJson.encoder };
      else
        return {
          charset: n.charset ?? "utf-8",
          contentEncoder: n.contentEncoder,
          contentTypeEncoder: n.contentTypeEncoder ?? (0, tn.default)().applicationJson.encoder,
        };
    }
    e.fromOptions = r;
  })(Rt || (Rt = {}));
  class on extends Pt {
    constructor(e, r) {
      super();
      ((this.writable = e),
        (this.options = Rt.fromOptions(r)),
        (this.errorCount = 0),
        (this.writeSemaphore = new sn.Semaphore(1)),
        this.writable.onError((n) => this.fireError(n)),
        this.writable.onClose(() => this.fireClose()));
    }
    async write(e) {
      return this.writeSemaphore.lock(async () =>
        this.options.contentTypeEncoder
          .encode(e, this.options)
          .then((n) => {
            if (this.options.contentEncoder !== void 0) return this.options.contentEncoder.encode(n);
            else return n;
          })
          .then(
            (n) => {
              let s = [];
              return (s.push(Gi, n.byteLength.toString(), rn), s.push(rn), this.doWrite(e, s, n));
            },
            (n) => {
              throw (this.fireError(n), n);
            },
          ),
      );
    }
    async doWrite(e, r, n) {
      try {
        return (await this.writable.write(r.join(""), "ascii"), this.writable.write(n));
      } catch (error) {
        return (this.handleError(error, e), Promise.reject(error));
      }
    }
    handleError(e, r) {
      (this.errorCount++, this.fireError(e, r, this.errorCount));
    }
    end() {
      this.writable.end();
    }
  }
  an.WriteableStreamMessageWriter = on;
});

export { un };
