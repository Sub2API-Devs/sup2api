/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/body-substitution.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (4)
 * attribution: esm-fingerprint 4
 */
import { Transform } from "stream";
import { gE } from "./request-filter.js";
import { At } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:664164-664239 esm-fingerprint
function N5(e) {
  return e.every((n) => n.sentinel.length === n.realValue.length);
}
//@ chunk-fq0cr76a.js:664239-664775 esm-fingerprint
function Lm(e, n, r, s) {
  if (e === void 0) return;
  let h = n.headers["content-length"] !== void 0 || n.headers["transfer-encoding"] !== void 0;
  if (gE.has(n.method ?? "GET") && !h) return;
  let y = e(s);
  if (!y?.length) return;
  if (n.headers["content-encoding"] !== void 0) {
    At(
      `[body-substitution] ${s}: request body has Content-Encoding "${String(n.headers["content-encoding"])}"; masked-credential ` +
        "substitution skipped \u2014 a sentinel in this body reaches the " +
        "upstream as the fake value",
      { level: "warn" },
    );
    return;
  }
  if (!N5(y)) delete r["content-length"];
  return k5(y);
}
//@ chunk-fq0cr76a.js:664775-665031 esm-fingerprint
function k5(e) {
  let max = Math.max(...e.map((s) => s.sentinel.length)),
    r;
  return new Transform({
    transform(s, h, y) {
      let b = Buffer.isBuffer(s) ? s : Buffer.from(s, h),
        S = r?.length ? Buffer.concat([r, b]) : b,
        { out: out, tail: tail } = D5(S, e, max);
      ((r = tail), y(null, out));
    },
    flush(s) {
      s(null, r?.length ? r : void 0);
    },
  });
}
//@ chunk-fq0cr76a.js:665031-665358 esm-fingerprint
function D5(e, n, r) {
  let s = [],
    h = 0;
  for (;;) {
    let b = -1,
      S;
    for (let w of n) {
      let index = e.indexOf(w.sentinel, h);
      if (index !== -1 && (b === -1 || index < b)) ((b = index), (S = w));
    }
    if (S === void 0) break;
    (s.push(e.subarray(h, b), S.realValue), (h = b + S.sentinel.length));
  }
  let max = Math.max(h, e.length - (r - 1));
  return (s.push(e.subarray(h, max)), { out: Buffer.concat(s), tail: Buffer.from(e.subarray(max)) });
}

export { Lm };
