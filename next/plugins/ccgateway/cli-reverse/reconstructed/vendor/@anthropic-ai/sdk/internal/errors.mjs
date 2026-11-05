/**
 * @anthropic-ai/sdk/internal/errors.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-63094ahz.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-63094ahz.js:229-399 esm-fingerprint
function isAbortError_2(err) {
  return (
    typeof err === "object" &&
    err !== null &&
    (("name" in err && err.name === "AbortError") ||
      ("message" in err && String(err.message).includes("FetchRequestCanceledException")))
  );
}
//@ chunk-63094ahz.js:399-792 esm-fingerprint
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
export { castToError, isAbortError_2 };
