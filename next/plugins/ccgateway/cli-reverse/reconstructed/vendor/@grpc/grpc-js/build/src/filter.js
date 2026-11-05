/**
 * @grpc/grpc-js/build/src/filter.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:185806-186078 cjs-fingerprint
var require_filter = __commonJS(function (cjsExports) {
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
export { require_filter };
