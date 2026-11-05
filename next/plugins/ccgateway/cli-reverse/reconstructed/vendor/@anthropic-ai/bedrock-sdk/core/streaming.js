/**
 * @anthropic-ai/bedrock-sdk/core/streaming.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (1)
 * attribution: esm-fingerprint 1
 */
import { EventStreamMarshaller } from "../../../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { import_credential_provider_web_identity, import_fetch_http_handler_2 } from "../AWS_restJson1.js";

//@ chunk-b8zxeazh.js:6863-7144 esm-fingerprint
var toUtf8 = (input) => new TextDecoder("utf-8").decode(input);
var fromUtf8 = (input) => new TextEncoder().encode(input);
var getMinimalSerdeContext = () => {
  let marshaller = new EventStreamMarshaller({
    utf8Encoder: toUtf8,
    utf8Decoder: fromUtf8,
  });
  return {
    base64Decoder: import_credential_provider_web_identity.fromBase64,
    base64Encoder: import_credential_provider_web_identity.toBase64,
    utf8Decoder: fromUtf8,
    utf8Encoder: toUtf8,
    eventStreamMarshaller: marshaller,
    streamCollector: import_fetch_http_handler_2.streamCollector,
  };
};
export { getMinimalSerdeContext, toUtf8, fromUtf8 };
