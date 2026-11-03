/**
 * @bufbuild/cel/dist/cjs/registry.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-fq0cr76a.js:477725-478036 cjs-fingerprint
var require_registry_2 = x(function (cjsExports) {
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
