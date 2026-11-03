/**
 * @bufbuild/cel/dist/cjs/registry.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { li } from "../../../protobuf/dist/commonjs/index.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-fq0cr76a.js:477725-478036 cjs-fingerprint
var VL = x(function ($L) {
  Object.defineProperty($L, "__esModule", { value: !0 });
  $L.createRegistryWithWKT = YQ;
  var Iy = li(),
    Vo = Os(),
    registry = Iy.createRegistry(
      Vo.TimestampSchema,
      Vo.DurationSchema,
      Vo.AnySchema,
      Vo.file_google_protobuf_wrappers,
      Vo.file_google_protobuf_struct,
    );
  function YQ(...e) {
    return Iy.createRegistry(registry, ...e);
  }
});

export { VL };
