/**
 * @typespec/ts-http-runtime/dist/esm/util/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-mrx6y2r5.js:34734-34851 esm-layout
function isErrorLike(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof RegExp) &&
    !(value instanceof Date)
  );
}
//@ chunk-mrx6y2r5.js:34851-34958 esm-fingerprint
function isError(error) {
  if (isErrorLike(error)) {
    let hasName = typeof error.name === "string";
    let hasMessage = typeof error.message === "string";
    return hasName && hasMessage;
  }
  return false;
}
export { isErrorLike, isError };
