/**
 * @grpc/grpc-js/build/src/call-interface.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_metadata } from "./metadata.js";

//@ chunk-3k21nfa0.js:55095-56650 cjs-fingerprint
var require_call_interface = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.InterceptingListenerImpl = undefined;
  cjsExports.statusOrFromValue = statusOrFromValue;
  cjsExports.statusOrFromError = statusOrFromError;
  cjsExports.isInterceptingListener = isInterceptingListener;
  var metadata_1 = require_metadata();
  function statusOrFromValue(value) {
    return {
      ok: true,
      value,
    };
  }
  function statusOrFromError(error) {
    var _a;
    return {
      ok: false,
      error: Object.assign(Object.assign({}, error), {
        metadata: (_a = error.metadata) !== null && _a !== undefined ? _a : new metadata_1.Metadata(),
      }),
    };
  }
  function isInterceptingListener(listener) {
    return listener.onReceiveMetadata !== undefined && listener.onReceiveMetadata.length === 1;
  }
  class InterceptingListenerImpl {
    constructor(listener, nextListener) {
      this.listener = listener;
      this.nextListener = nextListener;
      this.processingMetadata = false;
      this.hasPendingMessage = false;
      this.processingMessage = false;
      this.pendingStatus = null;
    }
    processPendingMessage() {
      if (this.hasPendingMessage) {
        this.nextListener.onReceiveMessage(this.pendingMessage);
        this.pendingMessage = null;
        this.hasPendingMessage = false;
      }
    }
    processPendingStatus() {
      if (this.pendingStatus) this.nextListener.onReceiveStatus(this.pendingStatus);
    }
    onReceiveMetadata(metadata) {
      this.processingMetadata = true;
      this.listener.onReceiveMetadata(metadata, (metadata) => {
        this.processingMetadata = false;
        this.nextListener.onReceiveMetadata(metadata);
        this.processPendingMessage();
        this.processPendingStatus();
      });
    }
    onReceiveMessage(message) {
      this.processingMessage = true;
      this.listener.onReceiveMessage(message, (msg) => {
        this.processingMessage = false;
        if (this.processingMetadata) {
          this.pendingMessage = msg;
          this.hasPendingMessage = true;
        } else {
          this.nextListener.onReceiveMessage(msg);
          this.processPendingStatus();
        }
      });
    }
    onReceiveStatus(status) {
      this.listener.onReceiveStatus(status, (processedStatus) => {
        if (this.processingMetadata || this.processingMessage) this.pendingStatus = processedStatus;
        else this.nextListener.onReceiveStatus(processedStatus);
      });
    }
  }
  cjsExports.InterceptingListenerImpl = InterceptingListenerImpl;
});
export { require_call_interface };
