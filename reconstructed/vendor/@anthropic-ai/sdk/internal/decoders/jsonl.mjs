/**
 * @anthropic-ai/sdk/internal/decoders/jsonl.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Vo } from "./line.mjs";
import { pr } from "../../core/error.mjs";
import { rr } from "../shims.mjs";

//@ chunk-hwmsct5x.js:88120-88799 esm-fingerprint
var Ps = (() => {
  class e {
    constructor(n, r) {
      ((this.iterator = n), (this.controller = r));
    }
    async *decoder() {
      let n = new Vo();
      for await (let r of this.iterator) for (let s of n.decode(r)) yield JSON.parse(s);
      for (let r of n.flush()) yield JSON.parse(r);
    }
    [Symbol.asyncIterator]() {
      return this.decoder();
    }
    static fromResponse(n, r) {
      if (!n.body) {
        if ((r.abort(), typeof globalThis.navigator < "u" && globalThis.navigator.product === "ReactNative"))
          throw new pr(
            "The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api",
          );
        throw new pr("Attempted to iterate over a response with no body");
      }
      return new e(rr(n.body), r);
    }
  }
  return e;
})();

export { Ps };
