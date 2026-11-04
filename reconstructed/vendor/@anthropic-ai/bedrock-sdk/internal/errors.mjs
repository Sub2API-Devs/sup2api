/**
 * @anthropic-ai/bedrock-sdk/internal/errors.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (3), chunk-qhhcfyds.js (3), chunk-xa96axyz.js (2)
 * attribution: esm-layout 4, esm-fingerprint 4
 */
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_fetch_http_handler } from "../../../@smithy/fetch-http-handler/dist-cjs/index.js";
import { require_protocol_http } from "../../../@smithy/protocol-http/dist-cjs/index.js";
import { require_signature_v4 } from "../../../@smithy/signature-v4/dist-cjs/index.js";
import { require_node_config_provider } from "../../../@smithy/node-config-provider/dist-cjs/index.js";
import { require_index_native } from "../../../@smithy/core/dist-cjs/submodules/config/index.native.js";
import { require_google_auth_library } from "../../../google-auth-library/build/src/index.js";

//@ chunk-h87x8cg3.js:937-982 esm-layout
var import_fetch_http_handler = __toESM(require_fetch_http_handler(), 1);
var import_protocol_http = __toESM(require_protocol_http(), 1);
var import_signature_v4 = __toESM(require_signature_v4(), 1);
//@ chunk-h87x8cg3.js:1005-1173 esm-fingerprint
function isAbortError(err) {
  return (
    typeof err === "object" &&
    err !== null &&
    (("name" in err && err.name === "AbortError") ||
      ("message" in err && String(err.message).includes("FetchRequestCanceledException")))
  );
}
//@ chunk-h87x8cg3.js:1173-1564 esm-fingerprint
var castToError = (err) => {
  if (err instanceof Error) return err;
  if (typeof err === "object" && err !== null) {
    try {
      let tag = Object.prototype.toString.call(err);
      if (tag === "[object Error]" || tag === "[object DOMException]") {
        let error = Error(
          err.message,
          err.cause
            ? {
                cause: err.cause,
              }
            : {},
        );
        if (err.stack) error.stack = err.stack;
        if (err.cause && !error.cause) error.cause = err.cause;
        if (err.name) error.name = err.name;
        return error;
      }
    } catch {}
    try {
      return Error(JSON.stringify(err));
    } catch {}
  }
  return Error(err);
};
//@ chunk-qhhcfyds.js:2410-2440 esm-layout
var import_node_config_provider = __toESM(require_node_config_provider(), 1);
var import_index_native = __toESM(require_index_native(), 1);
//@ chunk-qhhcfyds.js:2440-2485 esm-layout
var import_fetch_http_handler_2 = __toESM(require_fetch_http_handler(), 1);
var import_protocol_http_2_2 = __toESM(require_protocol_http(), 1);
var import_signature_v4_2_2 = __toESM(require_signature_v4(), 1);
//@ chunk-qhhcfyds.js:2508-2899 esm-fingerprint
var castToError_3 = (err) => {
  if (err instanceof Error) return err;
  if (typeof err === "object" && err !== null) {
    try {
      let tag = Object.prototype.toString.call(err);
      if (tag === "[object Error]" || tag === "[object DOMException]") {
        let error = Error(
          err.message,
          err.cause
            ? {
                cause: err.cause,
              }
            : {},
        );
        if (err.stack) error.stack = err.stack;
        if (err.cause && !error.cause) error.cause = err.cause;
        if (err.name) error.name = err.name;
        return error;
      }
    } catch {}
    try {
      return Error(JSON.stringify(err));
    } catch {}
  }
  return Error(err);
};
//@ chunk-xa96axyz.js:381-399 esm-layout
var import_google_auth_library = __toESM(require_google_auth_library(), 1);
//@ chunk-xa96axyz.js:399-790 esm-fingerprint
var castToError_2 = (err) => {
  if (err instanceof Error) return err;
  if (typeof err === "object" && err !== null) {
    try {
      let tag = Object.prototype.toString.call(err);
      if (tag === "[object Error]" || tag === "[object DOMException]") {
        let error = Error(
          err.message,
          err.cause
            ? {
                cause: err.cause,
              }
            : {},
        );
        if (err.stack) error.stack = err.stack;
        if (err.cause && !error.cause) error.cause = err.cause;
        if (err.name) error.name = err.name;
        return error;
      }
    } catch {}
    try {
      return Error(JSON.stringify(err));
    } catch {}
  }
  return Error(err);
};
export {
  import_fetch_http_handler,
  castToError,
  import_signature_v4,
  import_protocol_http,
  isAbortError,
  import_fetch_http_handler_2,
  castToError_3,
  import_signature_v4_2_2,
  import_protocol_http_2_2,
  import_node_config_provider,
  import_index_native,
  import_google_auth_library,
  castToError_2,
};
