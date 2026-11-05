/**
 * @anthropic-ai/sdk/internal/decoders/jsonl.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { LineDecoder } from "./line.mjs";
import { AnthropicError } from "../../core/error.mjs";
import { ReadableStreamToAsyncIterable } from "../shims.mjs";

//@ chunk-vn3g7zt8.js:88500-89179 esm-fingerprint
var JSONLDecoder = (() => {
  class JSONLDecoder {
    constructor(iterator, controller) {
      this.iterator = iterator;
      this.controller = controller;
    }
    async *decoder() {
      let lineDecoder = new LineDecoder();
      for await (let chunk of this.iterator)
        for (let line of lineDecoder.decode(chunk)) yield JSON.parse(line);
      for (let line of lineDecoder.flush()) yield JSON.parse(line);
    }
    [Symbol.asyncIterator]() {
      return this.decoder();
    }
    static fromResponse(response, controller) {
      if (!response.body) {
        controller.abort();
        if (typeof globalThis.navigator !== "undefined" && globalThis.navigator.product === "ReactNative")
          throw new AnthropicError(
            "The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api",
          );
        throw new AnthropicError("Attempted to iterate over a response with no body");
      }
      return new JSONLDecoder(ReadableStreamToAsyncIterable(response.body), controller);
    }
  }
  return JSONLDecoder;
})();
export { JSONLDecoder };
