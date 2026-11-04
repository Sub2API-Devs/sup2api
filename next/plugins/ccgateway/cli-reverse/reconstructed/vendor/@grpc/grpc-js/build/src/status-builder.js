/**
 * @grpc/grpc-js/build/src/status-builder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:336716-337190 cjs-fingerprint
var require_status_builder = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.StatusBuilder = undefined;
  class StatusBuilder {
    constructor() {
      this.code = null;
      this.details = null;
      this.metadata = null;
    }
    withCode(code) {
      this.code = code;
      return this;
    }
    withDetails(details) {
      this.details = details;
      return this;
    }
    withMetadata(metadata) {
      this.metadata = metadata;
      return this;
    }
    build() {
      let status = {};
      if (this.code !== null) status.code = this.code;
      if (this.details !== null) status.details = this.details;
      if (this.metadata !== null) status.metadata = this.metadata;
      return status;
    }
  }
  cjsExports.StatusBuilder = StatusBuilder;
});
export { require_status_builder };
