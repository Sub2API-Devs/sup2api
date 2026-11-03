/**
 * @anthropic-ai/sdk/lib/parser.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-fingerprint 4
 */
import { pr } from "../core/error.mjs";

//@ chunk-hwmsct5x.js:146814-146861 esm-fingerprint
function yd(e) {
  return e?.output_config?.format;
}
//@ chunk-hwmsct5x.js:146861-147106 esm-fingerprint
function La(e, n, r) {
  let s = yd(n);
  if (!n || !("parse" in (s ?? {})))
    return {
      ...e,
      content: e.content.map((h) => {
        if (h.type === "text")
          return Object.defineProperty({ ...h }, "parsed_output", { value: null, enumerable: !1 });
        return h;
      }),
      parsed_output: null,
    };
  return Fa(e, n, r);
}
//@ chunk-hwmsct5x.js:147106-147340 esm-fingerprint
function Fa(e, n, r) {
  let s = null,
    mapped = e.content.map((y) => {
      if (y.type === "text") {
        let w = Fg(n, y.text);
        if (s === null) s = w;
        return Object.defineProperty({ ...y }, "parsed_output", { value: w, enumerable: !1 });
      }
      return y;
    });
  return { ...e, content: mapped, parsed_output: s };
}
//@ chunk-hwmsct5x.js:147340-147532 esm-fingerprint
function Fg(e, n) {
  let r = yd(e);
  if (r?.type !== "json_schema") return null;
  try {
    if ("parse" in r) return r.parse(n);
    return JSON.parse(n);
  } catch (error) {
    throw new pr(`Failed to parse structured output: ${error}`);
  }
}

export { La, Fa };
