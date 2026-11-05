/**
 * @bufbuild/cel/dist/cjs/registry.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-qg41pqt6.js:478299-478610 cjs-fingerprint
var require_registry_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createRegistryWithWKT = createRegistryWithWKT;
  var protobuf_1 = require_protobuf();
  var wkt_1 = require_error_4();
  var wktRegistry = protobuf_1.createRegistry(
    wkt_1.TimestampSchema,
    wkt_1.DurationSchema,
    wkt_1.AnySchema,
    wkt_1.file_google_protobuf_wrappers,
    wkt_1.file_google_protobuf_struct,
  );
  function createRegistryWithWKT(...inputs) {
    return protobuf_1.createRegistry(wktRegistry, ...inputs);
  }
});
export { require_registry_2 };
