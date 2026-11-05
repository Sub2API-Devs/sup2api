/**
 * @grpc/grpc-js/build/src/call.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";

//@ chunk-3k21nfa0.js:52319-55095 cjs-fingerprint
var require_call = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ClientDuplexStreamImpl =
    cjsExports.ClientWritableStreamImpl =
    cjsExports.ClientReadableStreamImpl =
    cjsExports.ClientUnaryCallImpl =
      undefined;
  cjsExports.callErrorFromStatus = callErrorFromStatus;
  var events_1 = importMetaRequire("events");
  var stream_1 = importMetaRequire("stream");
  var constants_1 = require_constants();
  function callErrorFromStatus(status, callerStack) {
    let message = `${status.code} ${constants_1.Status[status.code]}: ${status.details}`;
    let stack = `${Error(message).stack}
for call at
${callerStack}`;
    return Object.assign(Error(message), status, {
      stack,
    });
  }
  class ClientUnaryCallImpl extends events_1.EventEmitter {
    constructor() {
      super();
    }
    cancel() {
      var _a;
      if (!((_a = this.call) === null || _a === undefined))
        _a.cancelWithStatus(constants_1.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getPeer()) !== null &&
        _b !== undefined
        ? _b
        : "unknown";
    }
    getAuthContext() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getAuthContext()) !==
        null && _b !== undefined
        ? _b
        : null;
    }
  }
  cjsExports.ClientUnaryCallImpl = ClientUnaryCallImpl;
  class ClientReadableStreamImpl extends stream_1.Readable {
    constructor(deserialize) {
      super({
        objectMode: true,
      });
      this.deserialize = deserialize;
    }
    cancel() {
      var _a;
      if (!((_a = this.call) === null || _a === undefined))
        _a.cancelWithStatus(constants_1.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getPeer()) !== null &&
        _b !== undefined
        ? _b
        : "unknown";
    }
    getAuthContext() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getAuthContext()) !==
        null && _b !== undefined
        ? _b
        : null;
    }
    _read(_size) {
      var _a;
      if (!((_a = this.call) === null || _a === undefined)) _a.startRead();
    }
  }
  cjsExports.ClientReadableStreamImpl = ClientReadableStreamImpl;
  class ClientWritableStreamImpl extends stream_1.Writable {
    constructor(serialize) {
      super({
        objectMode: true,
      });
      this.serialize = serialize;
    }
    cancel() {
      var _a;
      if (!((_a = this.call) === null || _a === undefined))
        _a.cancelWithStatus(constants_1.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getPeer()) !== null &&
        _b !== undefined
        ? _b
        : "unknown";
    }
    getAuthContext() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getAuthContext()) !==
        null && _b !== undefined
        ? _b
        : null;
    }
    _write(chunk, encoding, cb) {
      var _a;
      let context = {
        callback: cb,
      };
      let flags = Number(encoding);
      if (!Number.isNaN(flags)) context.flags = flags;
      if (!((_a = this.call) === null || _a === undefined)) _a.sendMessageWithContext(context, chunk);
    }
    _final(cb) {
      var _a;
      if (!((_a = this.call) === null || _a === undefined)) _a.halfClose();
      cb();
    }
  }
  cjsExports.ClientWritableStreamImpl = ClientWritableStreamImpl;
  class ClientDuplexStreamImpl extends stream_1.Duplex {
    constructor(serialize, deserialize) {
      super({
        objectMode: true,
      });
      this.serialize = serialize;
      this.deserialize = deserialize;
    }
    cancel() {
      var _a;
      if (!((_a = this.call) === null || _a === undefined))
        _a.cancelWithStatus(constants_1.Status.CANCELLED, "Cancelled on client");
    }
    getPeer() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getPeer()) !== null &&
        _b !== undefined
        ? _b
        : "unknown";
    }
    getAuthContext() {
      var _a;
      var _b;
      return (_b = (_a = this.call) === null || _a === undefined ? undefined : _a.getAuthContext()) !==
        null && _b !== undefined
        ? _b
        : null;
    }
    _read(_size) {
      var _a;
      if (!((_a = this.call) === null || _a === undefined)) _a.startRead();
    }
    _write(chunk, encoding, cb) {
      var _a;
      let context = {
        callback: cb,
      };
      let flags = Number(encoding);
      if (!Number.isNaN(flags)) context.flags = flags;
      if (!((_a = this.call) === null || _a === undefined)) _a.sendMessageWithContext(context, chunk);
    }
    _final(cb) {
      var _a;
      if (!((_a = this.call) === null || _a === undefined)) _a.halfClose();
      cb();
    }
  }
  cjsExports.ClientDuplexStreamImpl = ClientDuplexStreamImpl;
});
export { require_call };
