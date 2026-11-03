/**
 * @anthropic-ai/sdk/internal/errors.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2g090z7k.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-2g090z7k.js:229-399 esm-fingerprint
function Kje(n) {
  return (
    typeof n === "object" &&
    n !== null &&
    (("name" in n && n.name === "AbortError") ||
      ("message" in n && String(n.message).includes("FetchRequestCanceledException")))
  );
}
//@ chunk-2g090z7k.js:399-792 esm-fingerprint
var V7t = (n) => {
  if (n instanceof Error) return n;
  if (typeof n === "object" && n !== null) {
    try {
      let e = Object.prototype.toString.call(n);
      if (e === "[object Error]" || e === "[object DOMException]") {
        let t = Error(n.message, n.cause ? { cause: n.cause } : {});
        if (n.stack) t.stack = n.stack;
        if (n.cause && !t.cause) t.cause = n.cause;
        if (n.name) t.name = n.name;
        return t;
      }
    } catch {}
    try {
      return Error(JSON.stringify(n));
    } catch {}
  }
  return Error(n);
};

export { V7t, Kje };
