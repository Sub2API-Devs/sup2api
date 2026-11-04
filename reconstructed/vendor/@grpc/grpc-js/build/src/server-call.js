/**
 * @grpc/grpc-js/build/src/server-call.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../runtime/bun-runtime.js";
import { k } from "./constants.js";
import { ue } from "./metadata.js";

//@ chunk-pwh5dx3n.js:278508-281874 cjs-fingerprint
var Og = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ServerDuplexStreamImpl =
    cjsExports.ServerWritableStreamImpl =
    cjsExports.ServerReadableStreamImpl =
    cjsExports.ServerUnaryCallImpl =
      undefined;
  cjsExports.serverErrorToStatus = serverErrorToStatus;
  var events_1 = Be("events");
  var stream_1 = Be("stream");
  var constants_1 = k();
  var metadata_1 = ue();
  function serverErrorToStatus(error, overrideTrailers) {
    var _a;
    let status = {
      code: constants_1.Status.UNKNOWN,
      details: "message" in error ? error.message : "Unknown Error",
      metadata:
        (_a =
          overrideTrailers !== null && overrideTrailers !== undefined ? overrideTrailers : error.metadata) !==
          null && _a !== undefined
          ? _a
          : null,
    };
    if ("code" in error && typeof error.code === "number" && Number.isInteger(error.code)) {
      status.code = error.code;
      if ("details" in error && typeof error.details === "string") status.details = error.details;
    }
    return status;
  }
  class ServerUnaryCallImpl extends events_1.EventEmitter {
    constructor(path, call, metadata, request) {
      super();
      this.path = path;
      this.call = call;
      this.metadata = metadata;
      this.request = request;
      this.cancelled = false;
    }
    getPeer() {
      return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
      this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
      return this.call.getDeadline();
    }
    getPath() {
      return this.path;
    }
    getHost() {
      return this.call.getHost();
    }
    getAuthContext() {
      return this.call.getAuthContext();
    }
    getMetricsRecorder() {
      return this.call.getMetricsRecorder();
    }
  }
  cjsExports.ServerUnaryCallImpl = ServerUnaryCallImpl;
  class ServerReadableStreamImpl extends stream_1.Readable {
    constructor(path, call, metadata) {
      super({
        objectMode: true,
      });
      this.path = path;
      this.call = call;
      this.metadata = metadata;
      this.cancelled = false;
    }
    _read(size) {
      this.call.startRead();
    }
    getPeer() {
      return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
      this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
      return this.call.getDeadline();
    }
    getPath() {
      return this.path;
    }
    getHost() {
      return this.call.getHost();
    }
    getAuthContext() {
      return this.call.getAuthContext();
    }
    getMetricsRecorder() {
      return this.call.getMetricsRecorder();
    }
  }
  cjsExports.ServerReadableStreamImpl = ServerReadableStreamImpl;
  class ServerWritableStreamImpl extends stream_1.Writable {
    constructor(path, call, metadata, request) {
      super({
        objectMode: true,
      });
      this.path = path;
      this.call = call;
      this.metadata = metadata;
      this.request = request;
      this.pendingStatus = {
        code: constants_1.Status.OK,
        details: "OK",
      };
      this.cancelled = false;
      this.trailingMetadata = new metadata_1.Metadata();
      this.on("error", (err) => {
        this.pendingStatus = serverErrorToStatus(err);
        this.end();
      });
    }
    getPeer() {
      return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
      this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
      return this.call.getDeadline();
    }
    getPath() {
      return this.path;
    }
    getHost() {
      return this.call.getHost();
    }
    getAuthContext() {
      return this.call.getAuthContext();
    }
    getMetricsRecorder() {
      return this.call.getMetricsRecorder();
    }
    _write(chunk, encoding, callback) {
      this.call.sendMessage(chunk, callback);
    }
    _final(callback) {
      var _a;
      callback(null);
      this.call.sendStatus(
        Object.assign(Object.assign({}, this.pendingStatus), {
          metadata:
            (_a = this.pendingStatus.metadata) !== null && _a !== undefined ? _a : this.trailingMetadata,
        }),
      );
    }
    end(metadata) {
      if (metadata) this.trailingMetadata = metadata;
      return super.end();
    }
  }
  cjsExports.ServerWritableStreamImpl = ServerWritableStreamImpl;
  class ServerDuplexStreamImpl extends stream_1.Duplex {
    constructor(path, call, metadata) {
      super({
        objectMode: true,
      });
      this.path = path;
      this.call = call;
      this.metadata = metadata;
      this.pendingStatus = {
        code: constants_1.Status.OK,
        details: "OK",
      };
      this.cancelled = false;
      this.trailingMetadata = new metadata_1.Metadata();
      this.on("error", (err) => {
        this.pendingStatus = serverErrorToStatus(err);
        this.end();
      });
    }
    getPeer() {
      return this.call.getPeer();
    }
    sendMetadata(responseMetadata) {
      this.call.sendMetadata(responseMetadata);
    }
    getDeadline() {
      return this.call.getDeadline();
    }
    getPath() {
      return this.path;
    }
    getHost() {
      return this.call.getHost();
    }
    getAuthContext() {
      return this.call.getAuthContext();
    }
    getMetricsRecorder() {
      return this.call.getMetricsRecorder();
    }
    _read(size) {
      this.call.startRead();
    }
    _write(chunk, encoding, callback) {
      this.call.sendMessage(chunk, callback);
    }
    _final(callback) {
      var _a;
      callback(null);
      this.call.sendStatus(
        Object.assign(Object.assign({}, this.pendingStatus), {
          metadata:
            (_a = this.pendingStatus.metadata) !== null && _a !== undefined ? _a : this.trailingMetadata,
        }),
      );
    }
    end(metadata) {
      if (metadata) this.trailingMetadata = metadata;
      return super.end();
    }
  }
  cjsExports.ServerDuplexStreamImpl = ServerDuplexStreamImpl;
});
export { Og };
