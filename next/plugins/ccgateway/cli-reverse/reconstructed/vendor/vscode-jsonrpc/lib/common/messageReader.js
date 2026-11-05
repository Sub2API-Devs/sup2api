/**
 * vscode-jsonrpc/lib/common/messageReader.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_ral } from "./ral.js";
import { require_is } from "./is.js";
import { require_events } from "./events.js";
import { require_semaphore } from "./semaphore.js";

//@ chunk-mvgr3jmb.js:19284-23024 cjs-fingerprint
var require_messageReader = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ReadableStreamMessageReader =
    cjsExports.AbstractMessageReader =
    cjsExports.MessageReader =
      undefined;
  var ral_1 = require_ral();
  var Is = require_is();
  var events_1 = require_events();
  var semaphore_1 = require_semaphore();
  var MessageReader;
  (function (MessageReader) {
    function is(value) {
      let candidate = value;
      return (
        candidate &&
        Is.func(candidate.listen) &&
        Is.func(candidate.dispose) &&
        Is.func(candidate.onError) &&
        Is.func(candidate.onClose) &&
        Is.func(candidate.onPartialMessage)
      );
    }
    MessageReader.is = is;
  })(MessageReader || (cjsExports.MessageReader = MessageReader = {}));
  class AbstractMessageReader {
    constructor() {
      this.errorEmitter = new events_1.Emitter();
      this.closeEmitter = new events_1.Emitter();
      this.partialMessageEmitter = new events_1.Emitter();
    }
    dispose() {
      this.errorEmitter.dispose();
      this.closeEmitter.dispose();
    }
    get onError() {
      return this.errorEmitter.event;
    }
    fireError(error) {
      this.errorEmitter.fire(this.asError(error));
    }
    get onClose() {
      return this.closeEmitter.event;
    }
    fireClose() {
      this.closeEmitter.fire(undefined);
    }
    get onPartialMessage() {
      return this.partialMessageEmitter.event;
    }
    firePartialMessage(info) {
      this.partialMessageEmitter.fire(info);
    }
    asError(error) {
      if (error instanceof Error) return error;
      else
        return Error(
          `Reader received error. Reason: ${Is.string(error.message) ? error.message : "unknown"}`,
        );
    }
  }
  cjsExports.AbstractMessageReader = AbstractMessageReader;
  var ResolvedMessageReaderOptions;
  (function (ResolvedMessageReaderOptions) {
    function fromOptions(options) {
      let charset;
      let result;
      let contentDecoder;
      let contentDecoders = new Map();
      let contentTypeDecoder;
      let contentTypeDecoders = new Map();
      if (options === undefined || typeof options === "string") charset = options ?? "utf-8";
      else {
        charset = options.charset ?? "utf-8";
        if (options.contentDecoder !== undefined) {
          contentDecoder = options.contentDecoder;
          contentDecoders.set(contentDecoder.name, contentDecoder);
        }
        if (options.contentDecoders !== undefined)
          for (let decoder of options.contentDecoders) contentDecoders.set(decoder.name, decoder);
        if (options.contentTypeDecoder !== undefined) {
          contentTypeDecoder = options.contentTypeDecoder;
          contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
        }
        if (options.contentTypeDecoders !== undefined)
          for (let decoder of options.contentTypeDecoders) contentTypeDecoders.set(decoder.name, decoder);
      }
      if (contentTypeDecoder === undefined) {
        contentTypeDecoder = (0, ral_1.default)().applicationJson.decoder;
        contentTypeDecoders.set(contentTypeDecoder.name, contentTypeDecoder);
      }
      return {
        charset,
        contentDecoder,
        contentDecoders,
        contentTypeDecoder,
        contentTypeDecoders,
      };
    }
    ResolvedMessageReaderOptions.fromOptions = fromOptions;
  })(ResolvedMessageReaderOptions || (ResolvedMessageReaderOptions = {}));
  class ReadableStreamMessageReader extends AbstractMessageReader {
    constructor(readable, options) {
      super();
      this.readable = readable;
      this.options = ResolvedMessageReaderOptions.fromOptions(options);
      this.buffer = (0, ral_1.default)().messageBuffer.create(this.options.charset);
      this._partialMessageTimeout = 1e4;
      this.nextMessageLength = -1;
      this.messageToken = 0;
      this.readSemaphore = new semaphore_1.Semaphore(1);
    }
    set partialMessageTimeout(timeout) {
      this._partialMessageTimeout = timeout;
    }
    get partialMessageTimeout() {
      return this._partialMessageTimeout;
    }
    listen(callback) {
      this.nextMessageLength = -1;
      this.messageToken = 0;
      this.partialMessageTimer = undefined;
      this.callback = callback;
      let result = this.readable.onData((data) => {
        this.onData(data);
      });
      this.readable.onError((error) => this.fireError(error));
      this.readable.onClose(() => this.fireClose());
      return result;
    }
    onData(data) {
      try {
        this.buffer.append(data);
        while (true) {
          if (this.nextMessageLength === -1) {
            let headers = this.buffer.tryReadHeaders(true);
            if (!headers) return;
            let contentLength = headers.get("content-length");
            if (!contentLength) {
              this.fireError(
                Error(`Header must provide a Content-Length property.
${JSON.stringify(Object.fromEntries(headers))}`),
              );
              return;
            }
            let length = parseInt(contentLength);
            if (isNaN(length)) {
              this.fireError(Error(`Content-Length value must be a number. Got ${contentLength}`));
              return;
            }
            this.nextMessageLength = length;
          }
          let body = this.buffer.tryReadBody(this.nextMessageLength);
          if (body === undefined) {
            this.setPartialMessageTimer();
            return;
          }
          this.clearPartialMessageTimer();
          this.nextMessageLength = -1;
          this.readSemaphore
            .lock(async () => {
              let bytes =
                this.options.contentDecoder !== undefined
                  ? await this.options.contentDecoder.decode(body)
                  : body;
              let message = await this.options.contentTypeDecoder.decode(bytes, this.options);
              this.callback(message);
            })
            .catch((error) => {
              this.fireError(error);
            });
        }
      } catch (error) {
        this.fireError(error);
      }
    }
    clearPartialMessageTimer() {
      if (this.partialMessageTimer) {
        this.partialMessageTimer.dispose();
        this.partialMessageTimer = undefined;
      }
    }
    setPartialMessageTimer() {
      this.clearPartialMessageTimer();
      if (this._partialMessageTimeout <= 0) return;
      this.partialMessageTimer = (0, ral_1.default)().timer.setTimeout(
        (token, timeout) => {
          this.partialMessageTimer = undefined;
          if (token === this.messageToken) {
            this.firePartialMessage({
              messageToken: token,
              waitingTime: timeout,
            });
            this.setPartialMessageTimer();
          }
        },
        this._partialMessageTimeout,
        this.messageToken,
        this._partialMessageTimeout,
      );
    }
  }
  cjsExports.ReadableStreamMessageReader = ReadableStreamMessageReader;
});
export { require_messageReader };
