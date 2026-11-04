/**
 * @opentelemetry/api/build/src/trace/NonRecordingSpan.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_invalid_span_constants } from "./invalid-span-constants.js";

//@ chunk-bwbq4xvm.js:39699-40179 cjs-fingerprint
var require_NonRecordingSpan = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NonRecordingSpan = undefined;
  var invalid_span_constants_1 = require_invalid_span_constants();
  class NonRecordingSpan {
    constructor(_spanContext = invalid_span_constants_1.INVALID_SPAN_CONTEXT) {
      this._spanContext = _spanContext;
    }
    spanContext() {
      return this._spanContext;
    }
    setAttribute(_key, _value) {
      return this;
    }
    setAttributes(_attributes) {
      return this;
    }
    addEvent(_name, _attributes) {
      return this;
    }
    addLink(_link) {
      return this;
    }
    addLinks(_links) {
      return this;
    }
    setStatus(_status) {
      return this;
    }
    updateName(_name) {
      return this;
    }
    end(_endTime) {}
    isRecording() {
      return false;
    }
    recordException(_exception, _time) {}
  }
  cjsExports.NonRecordingSpan = NonRecordingSpan;
});
export { require_NonRecordingSpan };
