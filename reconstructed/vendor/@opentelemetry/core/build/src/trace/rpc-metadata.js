/**
 * @opentelemetry/core/build/src/trace/rpc-metadata.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";

//@ chunk-bwbq4xvm.js:124394-124872 cjs-fingerprint
var require_rpc_metadata = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getRPCMetadata =
    cjsExports.deleteRPCMetadata =
    cjsExports.setRPCMetadata =
    cjsExports.RPCType =
      undefined;
  var api_1 = require_api();
  var RPC_METADATA_KEY = api_1.createContextKey("OpenTelemetry SDK Context Key RPC_METADATA");
  var RPCType;
  (function (RPCType) {
    RPCType.HTTP = "http";
  })((RPCType = cjsExports.RPCType || (cjsExports.RPCType = {})));
  function setRPCMetadata(context, meta) {
    return context.setValue(RPC_METADATA_KEY, meta);
  }
  cjsExports.setRPCMetadata = setRPCMetadata;
  function deleteRPCMetadata(context) {
    return context.deleteValue(RPC_METADATA_KEY);
  }
  cjsExports.deleteRPCMetadata = deleteRPCMetadata;
  function getRPCMetadata(context) {
    return context.getValue(RPC_METADATA_KEY);
  }
  cjsExports.getRPCMetadata = getRPCMetadata;
});
export { require_rpc_metadata };
