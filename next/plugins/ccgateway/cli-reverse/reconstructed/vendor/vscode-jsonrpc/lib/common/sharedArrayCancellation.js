/**
 * vscode-jsonrpc/lib/common/sharedArrayCancellation.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_cancellation } from "./cancellation.js";

//@ chunk-mvgr3jmb.js:17147-18323 cjs-fingerprint
var require_sharedArrayCancellation = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SharedArrayReceiverStrategy = cjsExports.SharedArraySenderStrategy = undefined;
  var cancellation_1 = require_cancellation();
  var CancellationState;
  (function (CancellationState) {
    CancellationState.Continue = 0;
    CancellationState.Cancelled = 1;
  })(CancellationState || (CancellationState = {}));
  class SharedArraySenderStrategy {
    constructor() {
      this.buffers = new Map();
    }
    enableCancellation(request) {
      if (request.id === null) return;
      let buffer = new SharedArrayBuffer(4);
      let data = new Int32Array(buffer, 0, 1);
      data[0] = CancellationState.Continue;
      this.buffers.set(request.id, buffer);
      request.$cancellationData = buffer;
    }
    async sendCancellation(_conn, id) {
      let buffer = this.buffers.get(id);
      if (buffer === undefined) return;
      let data = new Int32Array(buffer, 0, 1);
      Atomics.store(data, 0, CancellationState.Cancelled);
    }
    cleanup(id) {
      this.buffers.delete(id);
    }
    dispose() {
      this.buffers.clear();
    }
  }
  cjsExports.SharedArraySenderStrategy = SharedArraySenderStrategy;
  class SharedArrayBufferCancellationToken {
    constructor(buffer) {
      this.data = new Int32Array(buffer, 0, 1);
    }
    get isCancellationRequested() {
      return Atomics.load(this.data, 0) === CancellationState.Cancelled;
    }
    get onCancellationRequested() {
      throw Error("Cancellation over SharedArrayBuffer doesn't support cancellation events");
    }
  }
  class SharedArrayBufferCancellationTokenSource {
    constructor(buffer) {
      this.token = new SharedArrayBufferCancellationToken(buffer);
    }
    cancel() {}
    dispose() {}
  }
  class SharedArrayReceiverStrategy {
    constructor() {
      this.kind = "request";
    }
    createCancellationTokenSource(request) {
      let buffer = request.$cancellationData;
      if (buffer === undefined) return new cancellation_1.CancellationTokenSource();
      return new SharedArrayBufferCancellationTokenSource(buffer);
    }
  }
  cjsExports.SharedArrayReceiverStrategy = SharedArrayReceiverStrategy;
});
export { require_sharedArrayCancellation };
