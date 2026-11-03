/**
 * @anthropic-ai/sdk/internal/message-stream-utils.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-fingerprint 2
 */
import { sd } from "../_vendor/partial-json-parser/parser.mjs";

//@ chunk-hwmsct5x.js:94109-94129 esm-fingerprint
var Gt = "__json_buf";
//@ chunk-hwmsct5x.js:94129-94397 esm-fingerprint
function Is(e, n) {
  let r = {};
  for (let y of Object.keys(e)) if (y !== "input") r[y] = e[y];
  Object.defineProperty(r, Gt, { value: n, enumerable: !1, writable: !0 });
  let s,
    h = !1;
  return (
    Object.defineProperty(r, "input", {
      enumerable: !0,
      configurable: !0,
      get() {
        if (!h) ((s = n ? sd(n) : {}), (h = !0));
        return s;
      },
    }),
    r
  );
}

export { Gt, Is };
