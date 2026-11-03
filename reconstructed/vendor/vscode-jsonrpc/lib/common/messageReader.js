/**
 * vscode-jsonrpc/lib/common/messageReader.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { de } from "./ral.js";
import { we } from "./is.js";
import { _e } from "./events.js";
import { vt } from "./semaphore.js";

//@ chunk-t4ksmxzx.js:18920-22660 cjs-fingerprint
var en = x(function (Xr) {
  Object.defineProperty(Xr, "__esModule", { value: !0 });
  Xr.ReadableStreamMessageReader = Xr.AbstractMessageReader = Xr.MessageReader = void 0;
  var wt = de(),
    ee = we(),
    Pe = _e(),
    Gr = vt(),
    Qr;
  (function (e) {
    function r(n) {
      let s = n;
      return (
        s &&
        ee.func(s.listen) &&
        ee.func(s.dispose) &&
        ee.func(s.onError) &&
        ee.func(s.onClose) &&
        ee.func(s.onPartialMessage)
      );
    }
    e.is = r;
  })(Qr || (Xr.MessageReader = Qr = {}));
  class St {
    constructor() {
      ((this.errorEmitter = new Pe.Emitter()),
        (this.closeEmitter = new Pe.Emitter()),
        (this.partialMessageEmitter = new Pe.Emitter()));
    }
    dispose() {
      (this.errorEmitter.dispose(), this.closeEmitter.dispose());
    }
    get onError() {
      return this.errorEmitter.event;
    }
    fireError(e) {
      this.errorEmitter.fire(this.asError(e));
    }
    get onClose() {
      return this.closeEmitter.event;
    }
    fireClose() {
      this.closeEmitter.fire(void 0);
    }
    get onPartialMessage() {
      return this.partialMessageEmitter.event;
    }
    firePartialMessage(e) {
      this.partialMessageEmitter.fire(e);
    }
    asError(e) {
      if (e instanceof Error) return e;
      else return Error(`Reader received error. Reason: ${ee.string(e.message) ? e.message : "unknown"}`);
    }
  }
  Xr.AbstractMessageReader = St;
  var _t;
  (function (e) {
    function r(n) {
      let s,
        c,
        h,
        P = new Map(),
        _,
        j = new Map();
      if (n === void 0 || typeof n === "string") s = n ?? "utf-8";
      else {
        if (((s = n.charset ?? "utf-8"), n.contentDecoder !== void 0))
          ((h = n.contentDecoder), P.set(h.name, h));
        if (n.contentDecoders !== void 0)
          for (let contentDecoder of n.contentDecoders) P.set(contentDecoder.name, contentDecoder);
        if (n.contentTypeDecoder !== void 0) ((_ = n.contentTypeDecoder), j.set(_.name, _));
        if (n.contentTypeDecoders !== void 0)
          for (let contentTypeDecoder of n.contentTypeDecoders)
            j.set(contentTypeDecoder.name, contentTypeDecoder);
      }
      if (_ === void 0) ((_ = (0, wt.default)().applicationJson.decoder), j.set(_.name, _));
      return {
        charset: s,
        contentDecoder: h,
        contentDecoders: P,
        contentTypeDecoder: _,
        contentTypeDecoders: j,
      };
    }
    e.fromOptions = r;
  })(_t || (_t = {}));
  class Yr extends St {
    constructor(e, r) {
      super();
      ((this.readable = e),
        (this.options = _t.fromOptions(r)),
        (this.buffer = (0, wt.default)().messageBuffer.create(this.options.charset)),
        (this._partialMessageTimeout = 1e4),
        (this.nextMessageLength = -1),
        (this.messageToken = 0),
        (this.readSemaphore = new Gr.Semaphore(1)));
    }
    set partialMessageTimeout(e) {
      this._partialMessageTimeout = e;
    }
    get partialMessageTimeout() {
      return this._partialMessageTimeout;
    }
    listen(e) {
      ((this.nextMessageLength = -1),
        (this.messageToken = 0),
        (this.partialMessageTimer = void 0),
        (this.callback = e));
      let onData = this.readable.onData((n) => {
        this.onData(n);
      });
      return (
        this.readable.onError((n) => this.fireError(n)),
        this.readable.onClose(() => this.fireClose()),
        onData
      );
    }
    onData(e) {
      try {
        this.buffer.append(e);
        while (!0) {
          if (this.nextMessageLength === -1) {
            let tryReadHeaders = this.buffer.tryReadHeaders(!0);
            if (!tryReadHeaders) return;
            let s = tryReadHeaders.get("content-length");
            if (!s) {
              this.fireError(
                Error(`Header must provide a Content-Length property.
${JSON.stringify(Object.fromEntries(tryReadHeaders))}`),
              );
              return;
            }
            let c = parseInt(s);
            if (isNaN(c)) {
              this.fireError(Error(`Content-Length value must be a number. Got ${s}`));
              return;
            }
            this.nextMessageLength = c;
          }
          let tryReadBody = this.buffer.tryReadBody(this.nextMessageLength);
          if (tryReadBody === void 0) {
            this.setPartialMessageTimer();
            return;
          }
          (this.clearPartialMessageTimer(),
            (this.nextMessageLength = -1),
            this.readSemaphore
              .lock(async () => {
                let n =
                    this.options.contentDecoder !== void 0
                      ? await this.options.contentDecoder.decode(tryReadBody)
                      : tryReadBody,
                  decode = await this.options.contentTypeDecoder.decode(n, this.options);
                this.callback(decode);
              })
              .catch((n) => {
                this.fireError(n);
              }));
        }
      } catch (error) {
        this.fireError(error);
      }
    }
    clearPartialMessageTimer() {
      if (this.partialMessageTimer) (this.partialMessageTimer.dispose(), (this.partialMessageTimer = void 0));
    }
    setPartialMessageTimer() {
      if ((this.clearPartialMessageTimer(), this._partialMessageTimeout <= 0)) return;
      this.partialMessageTimer = (0, wt.default)().timer.setTimeout(
        (e, r) => {
          if (((this.partialMessageTimer = void 0), e === this.messageToken))
            (this.firePartialMessage({ messageToken: e, waitingTime: r }), this.setPartialMessageTimer());
        },
        this._partialMessageTimeout,
        this.messageToken,
        this._partialMessageTimeout,
      );
    }
  }
  Xr.ReadableStreamMessageReader = Yr;
});

export { en };
