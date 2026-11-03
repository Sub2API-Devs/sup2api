/**
 * @anthropic-ai/bedrock-sdk/core/streaming.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (1)
 * attribution: esm-fingerprint 1
 */
import { Gur } from "../../../@smithy/core/dist-cjs/submodules/event-streams/index.js";
import { k, J } from "../AWS_restJson1.js";

//@ chunk-h87x8cg3.js:6863-7144 esm-fingerprint
var B = (e) => new TextDecoder("utf-8").decode(e),
  _ = (e) => new TextEncoder().encode(e),
  Ce = () => {
    let e = new Gur({ utf8Encoder: B, utf8Decoder: _ });
    return {
      base64Decoder: k.fromBase64,
      base64Encoder: k.toBase64,
      utf8Decoder: _,
      utf8Encoder: B,
      eventStreamMarshaller: e,
      streamCollector: J.streamCollector,
    };
  };

export { Ce, B, _ };
