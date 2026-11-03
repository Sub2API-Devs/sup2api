/**
 * @anthropic-ai/sdk/internal/message-stream-utils.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-fingerprint 2
 */
import { partialParse } from "../_vendor/partial-json-parser/parser.mjs";

//@ chunk-hwmsct5x.js:94109-94129 esm-fingerprint
var JSON_BUF_PROPERTY = "__json_buf";
//@ chunk-hwmsct5x.js:94129-94397 esm-fingerprint
function withLazyInput(prev, jsonBuf) {
  let next = {};
  for (let key of Object.keys(prev)) if (key !== "input") next[key] = prev[key];
  Object.defineProperty(next, JSON_BUF_PROPERTY, {
    value: jsonBuf,
    enumerable: false,
    writable: true,
  });
  let input;
  let parsed = false;
  Object.defineProperty(next, "input", {
    enumerable: true,
    configurable: true,
    get() {
      if (!parsed) {
        input = jsonBuf ? partialParse(jsonBuf) : {};
        parsed = true;
      }
      return input;
    },
  });
  return next;
}
export { JSON_BUF_PROPERTY, withLazyInput };
