/**
 * vscode-jsonrpc/lib/common/messageWriter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_ral } from "./ral.js";
import { require_is } from "./is.js";
import { require_semaphore } from "./semaphore.js";
import { require_events } from "./events.js";

//@ chunk-mvgr3jmb.js:23024-25155 cjs-fingerprint
var require_messageWriter = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.WriteableStreamMessageWriter =
    cjsExports.AbstractMessageWriter =
    cjsExports.MessageWriter =
      undefined;
  var ral_1 = require_ral();
  var Is = require_is();
  var semaphore_1 = require_semaphore();
  var events_1 = require_events();
  var ContentLength = "Content-Length: ";
  var CRLF = `\r
`;
  var MessageWriter;
  (function (MessageWriter) {
    function is(value) {
      let candidate = value;
      return (
        candidate &&
        Is.func(candidate.dispose) &&
        Is.func(candidate.onClose) &&
        Is.func(candidate.onError) &&
        Is.func(candidate.write)
      );
    }
    MessageWriter.is = is;
  })(MessageWriter || (cjsExports.MessageWriter = MessageWriter = {}));
  class AbstractMessageWriter {
    constructor() {
      this.errorEmitter = new events_1.Emitter();
      this.closeEmitter = new events_1.Emitter();
    }
    dispose() {
      this.errorEmitter.dispose();
      this.closeEmitter.dispose();
    }
    get onError() {
      return this.errorEmitter.event;
    }
    fireError(error, message, count) {
      this.errorEmitter.fire([this.asError(error), message, count]);
    }
    get onClose() {
      return this.closeEmitter.event;
    }
    fireClose() {
      this.closeEmitter.fire(undefined);
    }
    asError(error) {
      if (error instanceof Error) return error;
      else
        return Error(
          `Writer received error. Reason: ${Is.string(error.message) ? error.message : "unknown"}`,
        );
    }
  }
  cjsExports.AbstractMessageWriter = AbstractMessageWriter;
  var ResolvedMessageWriterOptions;
  (function (ResolvedMessageWriterOptions) {
    function fromOptions(options) {
      if (options === undefined || typeof options === "string")
        return {
          charset: options ?? "utf-8",
          contentTypeEncoder: (0, ral_1.default)().applicationJson.encoder,
        };
      else
        return {
          charset: options.charset ?? "utf-8",
          contentEncoder: options.contentEncoder,
          contentTypeEncoder: options.contentTypeEncoder ?? (0, ral_1.default)().applicationJson.encoder,
        };
    }
    ResolvedMessageWriterOptions.fromOptions = fromOptions;
  })(ResolvedMessageWriterOptions || (ResolvedMessageWriterOptions = {}));
  class WriteableStreamMessageWriter extends AbstractMessageWriter {
    constructor(writable, options) {
      super();
      this.writable = writable;
      this.options = ResolvedMessageWriterOptions.fromOptions(options);
      this.errorCount = 0;
      this.writeSemaphore = new semaphore_1.Semaphore(1);
      this.writable.onError((error) => this.fireError(error));
      this.writable.onClose(() => this.fireClose());
    }
    async write(msg) {
      return this.writeSemaphore.lock(async () =>
        this.options.contentTypeEncoder
          .encode(msg, this.options)
          .then((buffer) => {
            if (this.options.contentEncoder !== undefined) return this.options.contentEncoder.encode(buffer);
            else return buffer;
          })
          .then(
            (buffer) => {
              let headers = [];
              headers.push(ContentLength, buffer.byteLength.toString(), CRLF);
              headers.push(CRLF);
              return this.doWrite(msg, headers, buffer);
            },
            (error) => {
              this.fireError(error);
              throw error;
            },
          ),
      );
    }
    async doWrite(msg, headers, data) {
      try {
        await this.writable.write(headers.join(""), "ascii");
        return this.writable.write(data);
      } catch (error) {
        this.handleError(error, msg);
        return Promise.reject(error);
      }
    }
    handleError(error, msg) {
      this.errorCount++;
      this.fireError(error, msg, this.errorCount);
    }
    end() {
      this.writable.end();
    }
  }
  cjsExports.WriteableStreamMessageWriter = WriteableStreamMessageWriter;
});
export { require_messageWriter };
