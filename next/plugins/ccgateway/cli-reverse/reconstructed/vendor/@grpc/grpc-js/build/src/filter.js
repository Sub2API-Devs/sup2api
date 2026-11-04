/**
 * @grpc/grpc-js/build/src/filter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:185806-186078 cjs-fingerprint
var So = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BaseFilter = undefined;
  class BaseFilter {
    async sendMetadata(metadata) {
      return metadata;
    }
    receiveMetadata(metadata) {
      return metadata;
    }
    async sendMessage(message) {
      return message;
    }
    async receiveMessage(message) {
      return message;
    }
    receiveTrailers(status) {
      return status;
    }
  }
  cjsExports.BaseFilter = BaseFilter;
});
export { So };
